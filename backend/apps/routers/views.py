from datetime import timedelta
from decimal import Decimal
from django.conf import settings
from django.db import transaction as db_transaction
from django.utils import timezone
from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from apps.billing.models import PlatformSetting, Transaction, Wallet
from apps.instances.models import MikhmonInstance
from apps.instances.services import MikhmonProvisioningService
from .models import Router, VpnCredential
from .serializers import CreateRouterSerializer, RouterSerializer


class RouterListView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        routers = Router.objects.filter(user=request.user).select_related("mikhmon_instance", "vpn_credential")
        return Response(RouterSerializer(routers, many=True).data)


class CreateRouterView(APIView):
    """Création d'un routeur avec validation stricte en backend (unicité, solde, allocation VPN)."""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        serializer = CreateRouterSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        instance_id = serializer.validated_data["mikhmon_instance_id"]
        router_name = serializer.validated_data["name"].strip()
        auto_renew = serializer.validated_data.get("auto_renew", True)

        try:
            mikhmon_instance = MikhmonInstance.objects.get(id=instance_id, user=request.user)
        except MikhmonInstance.DoesNotExist:
            return Response(
                {"detail": "Instance Mikhmon introuvable ou non autorisée."},
                status=status.HTTP_404_NOT_FOUND,
            )

        # CONTRÔLE DE SÉCURITÉ BACKEND STRICT : Unicité du nom de routeur par espace
        if Router.objects.filter(mikhmon_instance=mikhmon_instance, name__iexact=router_name).exists():
            return Response(
                {"detail": f"Un routeur nommé '{router_name}' existe déjà dans cet espace Mikhmon. Veuillez choisir un autre nom."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        pricing = PlatformSetting.get_settings()
        price = pricing.router_monthly_price
        wallet, _ = Wallet.objects.get_or_create(user=request.user)

        # CONTRÔLE DE SÉCURITÉ BACKEND STRICT : Solde suffisant
        if not wallet.can_afford(price):
            return Response(
                {
                    "detail": f"Solde insuffisant ({wallet.balance} FCFA). L'ajout d'un routeur coûte {price} FCFA / mois.",
                    "required": price,
                    "balance": wallet.balance,
                },
                status=status.HTTP_402_PAYMENT_REQUIRED,
            )

        with db_transaction.atomic():
            wallet.debit(price)
            expires_at = timezone.now() + timedelta(days=30)

            router = Router.objects.create(
                user=request.user,
                mikhmon_instance=mikhmon_instance,
                name=router_name,
                price_per_month=price,
                auto_renew=auto_renew,
                expires_at=expires_at,
                status=Router.Status.ACTIVE,
            )

            # Allocation VPN séquentielle (Port API 41xxx, Port Winbox 51xxx, IP VPN)
            vpn_cred = VpnCredential.allocate_next_credentials(router)

            Transaction.objects.create(
                wallet=wallet,
                amount=price,
                type=Transaction.Type.BUY_ROUTER,
                status=Transaction.Status.COMPLETED,
                payment_method=Transaction.PaymentMethod.WALLET,
                description=f"Abonnement 30 jours pour le routeur '{router.name}'",
            )

            # Provisionnement automatique dans Mikhmon-Next Engine
            MikhmonProvisioningService.provision_router(router)

        return Response(
            {
                "detail": f"Routeur '{router.name}' créé avec succès !",
                "router": RouterSerializer(router).data,
                "script": vpn_cred.generate_mikrotik_script(),
                "new_balance": float(wallet.balance),
            },
            status=status.HTTP_201_CREATED,
        )


class RouterDetailView(APIView):
    """Détail et suppression d'un routeur avec libération des identifiants VPN."""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, router_id):
        try:
            router = Router.objects.get(id=router_id, user=request.user)
        except Router.DoesNotExist:
            return Response({"detail": "Routeur introuvable."}, status=status.HTTP_404_NOT_FOUND)
        return Response(RouterSerializer(router).data)

    def patch(self, request, router_id):
        try:
            router = Router.objects.get(id=router_id, user=request.user)
        except Router.DoesNotExist:
            return Response({"detail": "Routeur introuvable."}, status=status.HTTP_404_NOT_FOUND)

        new_name = request.data.get("name")
        if new_name is not None:
            new_name = new_name.strip()
            if new_name and new_name.lower() != router.name.lower():
                # Vérifier l'unicité
                if Router.objects.filter(mikhmon_instance=router.mikhmon_instance, name__iexact=new_name).exclude(id=router.id).exists():
                    return Response(
                        {"detail": f"Un routeur nommé '{new_name}' existe déjà dans cet espace."},
                        status=status.HTTP_400_BAD_REQUEST,
                    )
                router.name = new_name

        new_hotspot_name = request.data.get("hotspot_name")
        if new_hotspot_name is not None:
            router.hotspot_name = new_hotspot_name.strip()

        router.save()
        return Response({
            "detail": "Paramètres du routeur mis à jour avec succès !",
            "router": RouterSerializer(router).data,
        })

    def delete(self, request, router_id):
        try:
            router = Router.objects.get(id=router_id, user=request.user)
        except Router.DoesNotExist:
            return Response({"detail": "Routeur introuvable."}, status=status.HTTP_404_NOT_FOUND)

        router_name = router.name
        # Déprovisionnement automatique de Mikhmon-Next
        MikhmonProvisioningService.deprovision_router(str(router.id))
        router.delete()
        return Response(
            {"detail": f"Le routeur '{router_name}' a été supprimé et ses accès VPN libérés."},
            status=status.HTTP_200_OK,
        )


class RenewRouterView(APIView):
    """Renouvellement manuel d'un routeur pour 30 jours supplémentaires."""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, router_id):
        try:
            router = Router.objects.get(id=router_id, user=request.user)
        except Router.DoesNotExist:
            return Response({"detail": "Routeur introuvable."}, status=status.HTTP_404_NOT_FOUND)

        pricing = PlatformSetting.get_settings()
        price = pricing.router_monthly_price
        wallet, _ = Wallet.objects.get_or_create(user=request.user)

        if not wallet.can_afford(price):
            return Response(
                {
                    "detail": f"Solde insuffisant ({wallet.balance} FCFA). Le renouvellement coûte {price} FCFA.",
                    "required": price,
                    "balance": wallet.balance,
                },
                status=status.HTTP_402_PAYMENT_REQUIRED,
            )

        with db_transaction.atomic():
            wallet.debit(price)
            base_date = router.expires_at if router.expires_at > timezone.now() else timezone.now()
            router.expires_at = base_date + timedelta(days=30)
            router.status = Router.Status.ACTIVE
            router.save(update_fields=["expires_at", "status"])

            Transaction.objects.create(
                wallet=wallet,
                amount=price,
                type=Transaction.Type.BUY_ROUTER,
                status=Transaction.Status.COMPLETED,
                payment_method=Transaction.PaymentMethod.WALLET,
                description=f"Renouvellement 30 jours pour le routeur '{router.name}'",
            )

        return Response({
            "detail": f"Routeur '{router.name}' renouvelé avec succès pour 30 jours supplémentaires !",
            "router": RouterSerializer(router).data,
            "new_balance": float(wallet.balance),
        })


class PingRouterView(APIView):
    """Exécute un véritable test de ping ICMP vers l'IP VPN du routeur MikroTik."""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, router_id):
        import platform
        import re
        import subprocess

        try:
            router = Router.objects.select_related("vpn_credential").get(id=router_id, user=request.user)
        except Router.DoesNotExist:
            return Response({"detail": "Routeur introuvable."}, status=status.HTTP_404_NOT_FOUND)

        vpn = getattr(router, "vpn_credential", None)
        target_ip = vpn.assigned_ip if vpn else None

        if not target_ip:
            return Response({"detail": "Aucune IP VPN n'est allouée à ce routeur.", "status": "OFFLINE"}, status=status.HTTP_400_BAD_REQUEST)

        is_win = platform.system().lower() == "windows"
        param = "-n" if is_win else "-c"
        timeout_flag = "-w" if is_win else "-W"
        timeout_val = "1000" if is_win else "2"
        cmd = ["ping", param, "1", timeout_flag, timeout_val, target_ip]

        is_online = False
        latency = "Inconnue"

        try:
            res = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, timeout=3)
            if res.returncode == 0:
                is_online = True
                match = re.search(r"time[=<]([\d\.]+)\s?ms", res.stdout, re.IGNORECASE)
                if match:
                    latency = f"{match.group(1)} ms"
                else:
                    latency = "< 150 ms"
        except Exception:
            is_online = False

        if is_online:
            router.last_ping = timezone.now()
            router.save(update_fields=["last_ping"])
            return Response({
                "detail": f"Routeur '{router.name}' en ligne ! Latence: {latency}.",
                "last_ping": router.last_ping,
                "status": "ONLINE",
                "online": True,
                "latency": latency,
            })
        else:
            return Response(
                {
                    "detail": f"Le routeur '{router.name}' ({target_ip}) ne répond pas au ping. Vérifiez son alimentation et sa connexion internet.",
                    "status": "OFFLINE",
                    "online": False,
                },
                status=status.HTTP_200_OK,
            )


class VpnSyncListView(APIView):
    """Endpoint sécurisé pour la synchronisation automatique du serveur VPN Linux."""
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        secret = request.headers.get("X-VPN-Secret") or request.query_params.get("secret")
        expected_secret = getattr(settings, "VPN_SYNC_SECRET", "mikroot-vpn-sync-secret-token-2026")

        if not secret or secret != expected_secret:
            return Response({"detail": "Non autorisé."}, status=status.HTTP_403_FORBIDDEN)

        active_routers = Router.objects.filter(
            status=Router.Status.ACTIVE,
            expires_at__gt=timezone.now(),
        ).select_related("mikhmon_instance", "vpn_credential")

        peers = []
        for r in active_routers:
            vpn = getattr(r, "vpn_credential", None)
            if vpn:
                peers.append({
                    "id": str(r.id),
                    "name": r.name,
                    "instance_name": r.mikhmon_instance.name,
                    "routeros_version": r.mikhmon_instance.routeros_version,
                    "assigned_ip": vpn.assigned_ip,
                    "api_port": vpn.api_port,
                    "winbox_port": vpn.winbox_port,
                    "wireguard_public_key": vpn.wireguard_public_key,
                    "l2tp_user": vpn.vpn_user,
                    "l2tp_password": vpn.vpn_password,
                })

        return Response({
            "count": len(peers),
            "peers": peers,
        })


class RouterSystemInfoView(APIView):
    """Récupère la télémétrie matérielle et système en direct du routeur MikroTik."""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, router_id):
        from .services.mikrotik import MikrotikService
        try:
            router = Router.objects.select_related("vpn_credential", "mikhmon_instance").get(
                id=router_id, user=request.user
            )
        except Router.DoesNotExist:
            return Response({"detail": "Routeur introuvable."}, status=status.HTTP_404_NOT_FOUND)

        info = MikrotikService.get_system_info(router)
        return Response(info)


class RouterHotspotOverviewView(APIView):
    """Récupère les KPIs Hotspot (actifs, utilisateurs, profils) pour l'espace dédié."""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, router_id):
        from .services.mikrotik import MikrotikService
        try:
            router = Router.objects.select_related("vpn_credential", "mikhmon_instance").get(
                id=router_id, user=request.user
            )
        except Router.DoesNotExist:
            return Response({"detail": "Routeur introuvable."}, status=status.HTTP_404_NOT_FOUND)

        overview = MikrotikService.get_hotspot_overview(router)
        return Response(overview)


class RouterHotspotUsersView(APIView):
    """Liste et création d'utilisateurs Hotspot individuels sur le routeur."""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, router_id):
        from .services.mikrotik import MikrotikService
        try:
            router = Router.objects.select_related("vpn_credential", "mikhmon_instance").get(
                id=router_id, user=request.user
            )
        except Router.DoesNotExist:
            return Response({"detail": "Routeur introuvable."}, status=status.HTTP_404_NOT_FOUND)

        users = MikrotikService.get_hotspot_users(router)
        return Response({"count": len(users), "results": users})

    def post(self, request, router_id):
        from .services.mikrotik import MikrotikService
        try:
            router = Router.objects.select_related("vpn_credential", "mikhmon_instance").get(
                id=router_id, user=request.user
            )
        except Router.DoesNotExist:
            return Response({"detail": "Routeur introuvable."}, status=status.HTTP_404_NOT_FOUND)

        name = request.data.get("name", "").strip()
        password = request.data.get("password", "").strip() or name
        profile = request.data.get("profile", "default")
        time_limit = request.data.get("time_limit", "")
        comment = request.data.get("comment", "TikZone Ticket")

        if not name:
            return Response({"detail": "Le nom ou code ticket est requis."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            res = MikrotikService.add_user(router, name, password, profile, time_limit, comment)
            return Response(res, status=status.HTTP_201_CREATED)
        except Exception as e:
            return Response({"detail": f"Erreur lors de la création : {e}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class RouterGenerateTicketsView(APIView):
    """Génération par lot de vouchers Hotspot personnalisés en 1-clic."""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, router_id):
        from .services.mikrotik import MikrotikService
        try:
            router = Router.objects.select_related("vpn_credential", "mikhmon_instance").get(
                id=router_id, user=request.user
            )
        except Router.DoesNotExist:
            return Response({"detail": "Routeur introuvable."}, status=status.HTTP_404_NOT_FOUND)

        try:
            count = min(int(request.data.get("count", 10)), 500)
            profile = request.data.get("profile", "default")
            time_limit = request.data.get("time_limit", "1h")
            prefix = request.data.get("prefix", "")
            code_length = int(request.data.get("code_length", 6))
            price = int(request.data.get("price", 100))

            tickets = MikrotikService.generate_batch_tickets(
                router,
                count=count,
                profile=profile,
                time_limit=time_limit,
                prefix=prefix,
                code_length=code_length,
                price=price,
            )
            return Response({
                "detail": f"{len(tickets)} tickets générés avec succès pour '{router.name}' !",
                "count": len(tickets),
                "tickets": tickets,
            }, status=status.HTTP_201_CREATED)
        except Exception as e:
            return Response({"detail": f"Erreur de génération : {e}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class RouterHotspotProfilesView(APIView):
    """Liste des profils de bande passante et de durée du Hotspot."""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, router_id):
        from .services.mikrotik import MikrotikService
        try:
            router = Router.objects.select_related("vpn_credential", "mikhmon_instance").get(
                id=router_id, user=request.user
            )
        except Router.DoesNotExist:
            return Response({"detail": "Routeur introuvable."}, status=status.HTTP_404_NOT_FOUND)

        profiles = MikrotikService.get_profiles(router)
        return Response({"count": len(profiles), "results": profiles})


class RouterLogsView(APIView):
    """Récupère le journal d'activité (Hotspot Log & System Log) en temps réel."""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, router_id):
        from .services.mikrotik import MikrotikService
        try:
            router = Router.objects.select_related("vpn_credential", "mikhmon_instance").get(
                id=router_id, user=request.user
            )
        except Router.DoesNotExist:
            return Response({"detail": "Routeur introuvable."}, status=status.HTTP_404_NOT_FOUND)

        limit = int(request.query_params.get("limit", 50))
        logs = MikrotikService.get_logs(router, limit=limit)
        return Response({"count": len(logs), "results": logs})


class RouterDisconnectActiveView(APIView):
    """Déconnexion forcée d'une session Hotspot active."""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, router_id, active_id):
        from .services.mikrotik import MikrotikService
        try:
            router = Router.objects.select_related("vpn_credential", "mikhmon_instance").get(
                id=router_id, user=request.user
            )
        except Router.DoesNotExist:
            return Response({"detail": "Routeur introuvable."}, status=status.HTTP_404_NOT_FOUND)

        try:
            MikrotikService.disconnect_active_user(router, active_id)
            return Response({"detail": "Utilisateur déconnecté avec succès."})
        except Exception as e:
            return Response({"detail": f"Erreur : {e}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class RouterRebootView(APIView):
    """Redémarrage à distance sécurisé du routeur MikroTik."""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, router_id):
        from .services.mikrotik import MikrotikService
        try:
            router = Router.objects.select_related("vpn_credential", "mikhmon_instance").get(
                id=router_id, user=request.user
            )
        except Router.DoesNotExist:
            return Response({"detail": "Routeur introuvable."}, status=status.HTTP_404_NOT_FOUND)

        MikrotikService.reboot_router(router)
        return Response({"detail": f"Ordre de redémarrage envoyé avec succès au routeur '{router.name}'."})

