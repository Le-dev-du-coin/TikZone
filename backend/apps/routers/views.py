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


def get_user_router_or_404(user, router_id, select_related=None):
    """Récupère un routeur de manière étanche selon le rôle (Technicien vs Gérant)."""
    qs = Router.objects.all()
    if select_related:
        qs = qs.select_related(*select_related)
    if getattr(user, "role", None) == "CLIENT_MANAGER":
        if not getattr(user, "managed_instance_id", None):
            raise Router.DoesNotExist("Aucun espace assigné à ce compte.")
        return qs.get(id=router_id, mikhmon_instance_id=user.managed_instance_id)
    return qs.get(id=router_id, user=user)


class RouterListView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        if getattr(request.user, "role", None) == "CLIENT_MANAGER":
            if request.user.managed_instance_id:
                routers = Router.objects.filter(mikhmon_instance_id=request.user.managed_instance_id).select_related("mikhmon_instance", "vpn_credential")
            else:
                routers = Router.objects.none()
        else:
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
        api_user = serializer.validated_data.get("api_user", "admin") or "admin"
        api_password = serializer.validated_data.get("api_password", "") or ""
        auto_renew = serializer.validated_data.get("auto_renew", True)
        hotspot_type = serializer.validated_data.get("hotspot_type", Router.HotspotType.RADIUS)

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
                hotspot_type=hotspot_type,
                api_user=api_user,
                api_password=api_password,
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
            router = get_user_router_or_404(request.user, router_id)
        except Router.DoesNotExist:
            return Response({"detail": "Routeur introuvable."}, status=status.HTTP_404_NOT_FOUND)
        return Response(RouterSerializer(router).data)

    def patch(self, request, router_id):
        try:
            router = get_user_router_or_404(request.user, router_id)
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

        new_api_user = request.data.get("api_user")
        if new_api_user is not None:
            router.api_user = new_api_user.strip() or "admin"

        new_api_password = request.data.get("api_password")
        if new_api_password is not None:
            router.api_password = new_api_password.strip()
            # Nettoyer le circuit breaker pour permettre un test de connexion immédiat
            cache.delete(f"mikrotik_offline_cb_{router.id}")

        router.save()
        return Response({
            "detail": "Paramètres du routeur mis à jour avec succès !",
            "router": RouterSerializer(router).data,
        })

    def delete(self, request, router_id):
        if getattr(request.user, "role", None) == "CLIENT_MANAGER":
            return Response(
                {"detail": "Seul le technicien/administrateur peut supprimer ce routeur."},
                status=status.HTTP_403_FORBIDDEN,
            )
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
            router = get_user_router_or_404(
                request.user, router_id, select_related=["vpn_credential", "mikhmon_instance"]
            )
        except Router.DoesNotExist:
            return Response({"detail": "Routeur introuvable."}, status=status.HTTP_404_NOT_FOUND)

        info = MikrotikService.get_system_info(router)
        return Response(info)


class RouterHotspotOverviewView(APIView):
    """
    Récupère les KPIs Hotspot (actifs, utilisateurs totaux, profils)
    directement depuis la base de données PostgreSQL Cloud.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, router_id):
        from .models import CloudHotspotProfile, HotspotTicket
        try:
            router = get_user_router_or_404(
                request.user, router_id, select_related=["vpn_credential", "mikhmon_instance"]
            )
        except Router.DoesNotExist:
            return Response({"detail": "Routeur introuvable."}, status=status.HTTP_404_NOT_FOUND)

        total_users_count = HotspotTicket.objects.filter(router=router).count()
        profiles_count = CloudHotspotProfile.objects.filter(router=router, is_active=True).count()

        # Sessions actives en base
        active_tickets = HotspotTicket.objects.filter(
            router=router, status=HotspotTicket.Status.ACTIVE
        ).select_related("batch")[:100]

        active_count = HotspotTicket.objects.filter(
            router=router, status=HotspotTicket.Status.ACTIVE
        ).count()

        active_list = [
            {
                "id": str(t.id),
                "user": t.code,
                "profile": t.profile_name,
                "price": f"{int(t.price)} FCFA",
                "limit_uptime": t.batch.time_limit if t.batch else "1h",
                "address": str(t.ip_address or "-"),
                "mac_address": t.mac_address or "-",
                "uptime": f"{t.uptime_used_seconds // 60}m",
                "session_time_left": f"{t.remaining_seconds // 60}m" if t.remaining_seconds > 0 else "Expiré",
                "idle_time": "-",
                "bytes_in": f"{round(t.bytes_in / (1024 * 1024), 1)} MB" if t.bytes_in else "0 MB",
                "bytes_out": f"{round(t.bytes_out / (1024 * 1024), 1)} MB" if t.bytes_out else "0 MB",
                "total_traffic": f"{round((t.bytes_in + t.bytes_out) / (1024 * 1024), 1)} MB",
                "total_bytes_raw": t.bytes_in + t.bytes_out,
                "login_by": "cloud",
            }
            for t in active_tickets
        ]

        # Enrichissement temps réel si MikroTik est en ligne
        try:
            from .services.mikrotik import MikrotikService
            pool = MikrotikService.get_api_connection(router, timeout=2.5)
            api = pool.get_api()
            ros_active = api.get_resource("/ip/hotspot/active").get()
            pool.disconnect()
            ros_map = {a.get("user"): a for a in ros_active if a.get("user")}
            for item in active_list:
                m_info = ros_map.get(item["user"])
                if m_info:
                    if m_info.get("address"):
                        item["address"] = m_info.get("address")
                    if m_info.get("mac-address"):
                        item["mac_address"] = m_info.get("mac-address")
                    if m_info.get("id"):
                        item["ros_active_id"] = m_info.get("id")
        except Exception:
            pass

        return Response({
            "online": True,
            "active_count": active_count,
            "total_users_count": total_users_count,
            "profiles_count": profiles_count,
            "active_users": active_list,
        })


class RouterHotspotUsersView(APIView):
    """Liste et création d'utilisateurs Hotspot individuels sur le routeur."""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, router_id):
        from .services.mikrotik import MikrotikService
        try:
            router = get_user_router_or_404(
                request.user, router_id, select_related=["vpn_credential", "mikhmon_instance"]
            )
        except Router.DoesNotExist:
            return Response({"detail": "Routeur introuvable."}, status=status.HTTP_404_NOT_FOUND)

        limit = int(request.query_params.get("limit", 300))
        users = MikrotikService.get_hotspot_users(router, limit=limit)
        return Response({"count": len(users), "results": users})

    def post(self, request, router_id):
        from .services.mikrotik import MikrotikService
        try:
            router = get_user_router_or_404(
                request.user, router_id, select_related=["vpn_credential", "mikhmon_instance"]
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

    def delete(self, request, router_id):
        from .services.mikrotik import MikrotikService
        try:
            router = get_user_router_or_404(
                request.user, router_id, select_related=["vpn_credential", "mikhmon_instance"]
            )
        except Router.DoesNotExist:
            return Response({"detail": "Routeur introuvable."}, status=status.HTTP_404_NOT_FOUND)

        user_ids = request.data.get("user_ids", [])
        if not user_ids:
            return Response({"detail": "Aucun identifiant de ticket fourni."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            deleted_count = MikrotikService.delete_hotspot_users(router, user_ids)
            return Response({
                "detail": f"{deleted_count} ticket(s) supprimé(s) avec succès.",
                "deleted_count": deleted_count,
            }, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({"detail": f"Erreur lors de la suppression : {e}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class RouterGenerateTicketsView(APIView):
    """Génération par lot de vouchers Hotspot personnalisés en 1-clic."""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, router_id):
        from .services.mikrotik import MikrotikService
        try:
            router = get_user_router_or_404(
                request.user, router_id, select_related=["vpn_credential", "mikhmon_instance"]
            )
        except Router.DoesNotExist:
            return Response({"detail": "Routeur introuvable."}, status=status.HTTP_404_NOT_FOUND)

        try:
            raw_count = int(request.data.get("count", 10))
            count = min(max(raw_count, 1), 1000)
            auth_mode = request.data.get("auth_mode", "single")
            if auth_mode not in ["single", "dual"]:
                auth_mode = "single"
            profile = request.data.get("profile", "default")
            time_limit = request.data.get("time_limit", "1h")
            prefix = request.data.get("prefix", "")
            raw_length = int(request.data.get("code_length", 6))
            code_length = raw_length if raw_length in [4, 6, 8] else 6
            code_format = request.data.get("code_format", "numeric")
            price = int(request.data.get("price", 100))
            custom_comment = request.data.get("comment", "").strip()

            tickets = MikrotikService.generate_batch_tickets(
                router,
                count=count,
                auth_mode=auth_mode,
                profile=profile,
                time_limit=time_limit,
                prefix=prefix,
                code_length=code_length,
                code_format=code_format,
                price=price,
                comment=custom_comment,
            )
            return Response({
                "detail": f"{len(tickets)} tickets générés avec succès pour '{router.name}' !",
                "count": len(tickets),
                "tickets": tickets,
            }, status=status.HTTP_201_CREATED)
        except Exception as e:
            return Response({"detail": f"Erreur de génération : {e}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class RouterHotspotProfilesView(APIView):
    """
    Gestion centralisée des forfaits Hotspot Cloud (100% Cloud RADIUS natif).
    Permet de créer, éditer, désactiver (is_active) et supprimer des forfaits.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, router_id):
        from .models import CloudHotspotProfile
        try:
            router = get_user_router_or_404(
                request.user, router_id, select_related=["vpn_credential", "mikhmon_instance"]
            )
        except Router.DoesNotExist:
            return Response({"detail": "Routeur introuvable."}, status=status.HTTP_404_NOT_FOUND)

        qs = CloudHotspotProfile.objects.filter(router=router)

        active_only = request.query_params.get("active_only")
        if active_only == "true":
            qs = qs.filter(is_active=True)

        results = [
            {
                "id": str(p.id),
                "name": p.name,
                "price": int(p.price),
                "rate_limit": p.rate_limit or "Illimité",
                "session_timeout": p.session_timeout,
                "session_timeout_seconds": p.session_timeout_seconds,
                "shared_users": p.shared_users,
                "is_active": p.is_active,
                "enabled": p.is_active,  # Alias pour compatibilité
                "comment": p.comment,
                "created_at": p.created_at,
            }
            for p in qs
        ]

        return Response({"count": len(results), "results": results})

    def post(self, request, router_id):
        from .models import CloudHotspotProfile
        try:
            router = get_user_router_or_404(
                request.user, router_id, select_related=["vpn_credential", "mikhmon_instance"]
            )
        except Router.DoesNotExist:
            return Response({"detail": "Routeur introuvable."}, status=status.HTTP_404_NOT_FOUND)

        name = request.data.get("name", "").strip()
        if not name:
            return Response({"detail": "Le nom du forfait est obligatoire."}, status=status.HTTP_400_BAD_REQUEST)

        if CloudHotspotProfile.objects.filter(router=router, name__iexact=name).exists():
            return Response({"detail": f"Un forfait nommé '{name}' existe déjà."}, status=status.HTTP_400_BAD_REQUEST)

        price = int(request.data.get("price", 100))
        rate_limit = request.data.get("rate_limit", "2M/2M")
        session_timeout = request.data.get("session_timeout", "1h")
        shared_users = int(request.data.get("shared_users", 1))
        raw_active = request.data.get("is_active", request.data.get("enabled", True))
        is_active = raw_active if isinstance(raw_active, bool) else str(raw_active).lower() in ("true", "1", "yes")
        comment = request.data.get("comment", "")

        profile = CloudHotspotProfile.objects.create(
            router=router,
            name=name,
            price=price,
            rate_limit=rate_limit,
            session_timeout=session_timeout,
            shared_users=shared_users,
            is_active=is_active,
            comment=comment,
        )

        return Response({
            "id": str(profile.id),
            "name": profile.name,
            "price": int(profile.price),
            "rate_limit": profile.rate_limit,
            "session_timeout": profile.session_timeout,
            "session_timeout_seconds": profile.session_timeout_seconds,
            "shared_users": profile.shared_users,
            "is_active": profile.is_active,
            "enabled": profile.is_active,
            "comment": profile.comment,
        }, status=status.HTTP_201_CREATED)

    def patch(self, request, router_id):
        from .models import CloudHotspotProfile
        try:
            router = get_user_router_or_404(
                request.user, router_id, select_related=["vpn_credential", "mikhmon_instance"]
            )
        except Router.DoesNotExist:
            return Response({"detail": "Routeur introuvable."}, status=status.HTTP_404_NOT_FOUND)

        profile_id = request.data.get("id") or request.data.get("profile_id")
        if not profile_id:
            return Response({"detail": "L'identifiant du forfait est obligatoire."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            profile = CloudHotspotProfile.objects.get(id=profile_id, router=router)
        except (CloudHotspotProfile.DoesNotExist, ValueError):
            return Response({"detail": "Forfait Cloud introuvable."}, status=status.HTTP_404_NOT_FOUND)

        if "name" in request.data:
            new_name = request.data["name"].strip()
            if new_name and new_name.lower() != profile.name.lower():
                if CloudHotspotProfile.objects.filter(router=router, name__iexact=new_name).exclude(id=profile.id).exists():
                    return Response({"detail": f"Un forfait nommé '{new_name}' existe déjà."}, status=status.HTTP_400_BAD_REQUEST)
                profile.name = new_name

        if "price" in request.data:
            profile.price = int(request.data["price"])

        if "rate_limit" in request.data:
            profile.rate_limit = request.data["rate_limit"]

        if "session_timeout" in request.data:
            profile.session_timeout = request.data["session_timeout"]

        if "shared_users" in request.data:
            profile.shared_users = int(request.data["shared_users"])

        if "is_active" in request.data or "enabled" in request.data:
            raw_val = request.data.get("is_active", request.data.get("enabled"))
            profile.is_active = raw_val if isinstance(raw_val, bool) else str(raw_val).lower() in ("true", "1", "yes")

        if "comment" in request.data:
            profile.comment = request.data["comment"]

        profile.save()

        return Response({
            "id": str(profile.id),
            "name": profile.name,
            "price": int(profile.price),
            "rate_limit": profile.rate_limit,
            "session_timeout": profile.session_timeout,
            "session_timeout_seconds": profile.session_timeout_seconds,
            "shared_users": profile.shared_users,
            "is_active": profile.is_active,
            "enabled": profile.is_active,
            "comment": profile.comment,
            "detail": "Forfait mis à jour avec succès.",
        })

    def delete(self, request, router_id):
        from .models import CloudHotspotProfile
        try:
            router = get_user_router_or_404(
                request.user, router_id, select_related=["vpn_credential", "mikhmon_instance"]
            )
        except Router.DoesNotExist:
            return Response({"detail": "Routeur introuvable."}, status=status.HTTP_404_NOT_FOUND)

        profile_id = request.query_params.get("id") or request.data.get("id")
        if not profile_id:
            return Response({"detail": "L'identifiant du forfait à supprimer est requis."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            profile = CloudHotspotProfile.objects.get(id=profile_id, router=router)
            name = profile.name
            profile.delete()
            return Response({"detail": f"Forfait '{name}' supprimé avec succès."})
        except (CloudHotspotProfile.DoesNotExist, ValueError):
            return Response({"detail": "Forfait introuvable."}, status=status.HTTP_404_NOT_FOUND)


def get_saas_sales_report_data(router):
    """Calcule le rapport financier Hotspot (CA encaissé, tickets actifs/expirés) 100% base Cloud."""
    from .models import HotspotTicket
    from django.db.models import Q, Sum
    from django.utils import timezone
    import datetime

    now = timezone.now()
    today = now.date()
    yesterday = today - datetime.timedelta(days=1)

    qs = HotspotTicket.objects.filter(router=router).select_related("batch")

    # Seuls les tickets activés ou consommés par les clients constituent des ventes encaissées
    sold_filter = Q(status__in=[HotspotTicket.Status.ACTIVE, HotspotTicket.Status.EXPIRED]) | Q(first_login_at__isnull=False)
    sold_qs = qs.filter(sold_filter)

    # Date de vente basée sur first_login_at (ou fallback sur created_at pour tickets actifs)
    today_qs = sold_qs.filter(Q(first_login_at__date=today) | (Q(first_login_at__isnull=True) & Q(created_at__date=today)))
    yesterday_qs = sold_qs.filter(first_login_at__date=yesterday)
    month_qs = sold_qs.filter(Q(first_login_at__year=now.year, first_login_at__month=now.month) | (Q(first_login_at__isnull=True) & Q(created_at__year=now.year, created_at__month=now.month)))

    today_revenue = int(today_qs.aggregate(s=Sum("price"))["s"] or 0)
    today_count = today_qs.count()

    yesterday_revenue = int(yesterday_qs.aggregate(s=Sum("price"))["s"] or 0)
    yesterday_count = yesterday_qs.count()

    month_revenue = int(month_qs.aggregate(s=Sum("price"))["s"] or 0)
    month_count = month_qs.count()

    total_revenue = int(sold_qs.aggregate(s=Sum("price"))["s"] or 0)
    total_count = sold_qs.count()

    recent_tickets = qs.order_by("-created_at")[:100]
    sales_history = [
        {
            "id": str(t.id),
            "code": t.code,
            "profile": t.profile_name,
            "price": int(t.price),
            "batch_id": t.batch.name if t.batch and t.batch.name else "Vente Directe",
            "date": (t.first_login_at or t.created_at).strftime("%Y-%m-%d"),
            "time": (t.first_login_at or t.created_at).strftime("%H:%M"),
            "status": t.status,
            "consumed": t.status in [HotspotTicket.Status.ACTIVE, HotspotTicket.Status.EXPIRED] or t.first_login_at is not None,
        }
        for t in recent_tickets
    ]

    return {
        "today_revenue": today_revenue,
        "today_count": today_count,
        "yesterday_revenue": yesterday_revenue,
        "yesterday_count": yesterday_count,
        "month_revenue": month_revenue,
        "month_count": month_count,
        "total_revenue": total_revenue,
        "total_count": total_count,
        "total_generated_tickets": qs.count(),
        "sales_history": sales_history,
    }


class RouterSalesReportView(APIView):
    """Rapport de ventes Hotspot et réinitialisation de la caisse/tickets."""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, router_id):
        try:
            router = get_user_router_or_404(
                request.user, router_id, select_related=["vpn_credential", "mikhmon_instance"]
            )
        except Router.DoesNotExist:
            return Response({"detail": "Routeur introuvable."}, status=status.HTTP_404_NOT_FOUND)

        data = get_saas_sales_report_data(router)
        return Response(data)

    def delete(self, request, router_id):
        """Purger les tickets et réinitialiser l'historique financier selon la période choisie."""
        from .models import HotspotBatch, HotspotTicket
        from django.utils import timezone
        import datetime

        try:
            router = get_user_router_or_404(
                request.user, router_id, select_related=["vpn_credential", "mikhmon_instance"]
            )
        except Router.DoesNotExist:
            return Response({"detail": "Routeur introuvable."}, status=status.HTTP_404_NOT_FOUND)

        period = request.query_params.get("period") or request.data.get("period", "all")
        now = timezone.now()
        today = now.date()

        ticket_qs = HotspotTicket.objects.filter(router=router)

        if period == "today":
            ticket_qs = ticket_qs.filter(created_at__date=today)
            label = "d'aujourd'hui"
        elif period == "yesterday":
            yesterday = today - datetime.timedelta(days=1)
            ticket_qs = ticket_qs.filter(created_at__date=yesterday)
            label = "d'hier"
        elif period == "month":
            ticket_qs = ticket_qs.filter(created_at__year=now.year, created_at__month=now.month)
            label = "du mois en cours"
        elif period == "year":
            ticket_qs = ticket_qs.filter(created_at__year=now.year)
            label = f"de l'année {now.year}"
        else:
            # "all" : tout vider pour ce routeur
            HotspotBatch.objects.filter(router=router).delete()
            label = "complet"

        deleted_tickets = ticket_qs.delete()[0]

        return Response({
            "detail": f"Rapport et tickets ({label}) réinitialisés avec succès ({deleted_tickets} ticket(s) supprimé(s)).",
            "deleted_tickets": deleted_tickets,
            "period": period,
        })


class RouterSalesReportPdfView(APIView):
    """Génération du rapport financier PDF vectoriel haute fidélité via Chromium (Playwright)."""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, router_id):
        from django.http import HttpResponse
        from .services.pdf_service import generate_sales_report_pdf
        import datetime

        try:
            router = get_user_router_or_404(
                request.user, router_id, select_related=["vpn_credential", "mikhmon_instance"]
            )
        except Router.DoesNotExist:
            return Response({"detail": "Routeur introuvable."}, status=status.HTTP_404_NOT_FOUND)

        data = get_saas_sales_report_data(router)
        pdf_bytes = generate_sales_report_pdf(router, data)

        today_slug = datetime.date.today().strftime("%Y-%m-%d")
        content_type = "application/pdf" if pdf_bytes.startswith(b"%PDF") else "text/html"
        filename = f"rapport_ventes_{router.name}_{today_slug}.pdf"

        response = HttpResponse(pdf_bytes, content_type=content_type)
        response["Content-Disposition"] = f'inline; filename="{filename}"'
        return response


class RouterLogsView(APIView):
    """Récupère le journal d'activité (Hotspot Log & System Log) en temps réel."""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, router_id):
        from .services.mikrotik import MikrotikService
        try:
            router = get_user_router_or_404(
                request.user, router_id, select_related=["vpn_credential", "mikhmon_instance"]
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
            router = get_user_router_or_404(
                request.user, router_id, select_related=["vpn_credential", "mikhmon_instance"]
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
            router = get_user_router_or_404(
                request.user, router_id, select_related=["vpn_credential", "mikhmon_instance"]
            )
        except Router.DoesNotExist:
            return Response({"detail": "Routeur introuvable."}, status=status.HTTP_404_NOT_FOUND)

        MikrotikService.reboot_router(router)
        return Response({"detail": f"Ordre de redémarrage envoyé avec succès au routeur '{router.name}'."})


class RouterUpdateUserLimitsView(APIView):
    """Ajustement des quotas (durée, volume Mo/Go) d'un utilisateur / ticket."""
    permission_classes = [permissions.IsAuthenticated]

    def patch(self, request, router_id, username):
        from .services.mikrotik import MikrotikService
        try:
            router = get_user_router_or_404(
                request.user, router_id, select_related=["vpn_credential", "mikhmon_instance"]
            )
        except Router.DoesNotExist:
            return Response({"detail": "Routeur introuvable."}, status=status.HTTP_404_NOT_FOUND)

        time_limit = request.data.get("time_limit", "")
        byte_limit = request.data.get("byte_limit", "")
        comment = request.data.get("comment", "")

        try:
            MikrotikService.update_user_limits(
                router, username=username, time_limit=time_limit, byte_limit=byte_limit, comment=comment
            )
            return Response({"detail": f"Limites de '{username}' mises à jour avec succès."})
        except Exception as e:
            return Response({"detail": f"Erreur : {e}"}, status=status.HTTP_400_BAD_REQUEST)


class RouterSaaSTicketsView(APIView):
    """Gestion native SaaS des tickets Hotspot (Stockage PostgreSQL & Moteur RADIUS)."""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, router_id):
        from .models import HotspotTicket
        try:
            router = get_user_router_or_404(
                request.user, router_id, select_related=["vpn_credential", "mikhmon_instance"]
            )
        except Router.DoesNotExist:
            return Response({"detail": "Routeur introuvable."}, status=status.HTTP_404_NOT_FOUND)

        qs = HotspotTicket.objects.filter(router=router).select_related("batch")

        # Filtre par profil
        profile = request.query_params.get("profile")
        if profile and profile != "ALL":
            qs = qs.filter(profile_name=profile)

        # Filtre par statut
        ticket_status = request.query_params.get("status")
        if ticket_status:
            qs = qs.filter(status=ticket_status)

        # Recherche texte
        search = request.query_params.get("search", "").strip()
        if search:
            qs = qs.filter(code__icontains=search)

        total_count = qs.count()
        tickets_list = [
            {
                "id": str(t.id),
                "code": t.code,
                "password": t.password,
                "profile": t.profile_name,
                "status": t.status,
                "time_limit": t.batch.time_limit if t.batch else "3h",
                "uptime_used_seconds": t.uptime_used_seconds,
                "remaining_seconds": t.remaining_seconds,
                "price": int(t.price),
                "comment": t.comment,
                "first_login_at": t.first_login_at,
                "mac_address": t.mac_address,
                "bytes_in": t.bytes_in,
                "bytes_out": t.bytes_out,
                "created_at": t.created_at,
            }
            for t in qs[:500]
        ]

        return Response({
            "count": total_count,
            "results": tickets_list,
        })

    def post(self, request, router_id):
        from .services.radius_engine import RadiusEngineService
        try:
            router = get_user_router_or_404(
                request.user, router_id, select_related=["vpn_credential", "mikhmon_instance"]
            )
        except Router.DoesNotExist:
            return Response({"detail": "Routeur introuvable."}, status=status.HTTP_404_NOT_FOUND)

        try:
            raw_count = int(request.data.get("count", 20))
            count = min(max(raw_count, 1), 1000)
            auth_mode = request.data.get("auth_mode", "single")
            profile_name = request.data.get("profile", "default")
            time_limit = request.data.get("time_limit", "3h")
            prefix = request.data.get("prefix", "")
            raw_length = int(request.data.get("code_length", 6))
            code_length = raw_length if raw_length in [4, 6, 8] else 6
            code_format = request.data.get("code_format", "numeric")
            raw_price = request.data.get("price")
            comment = request.data.get("comment", "").strip()

            from .models import CloudHotspotProfile
            cloud_profile = CloudHotspotProfile.objects.filter(router=router, name__iexact=profile_name).first()
            if cloud_profile:
                if raw_price is None:
                    price = int(cloud_profile.price)
                else:
                    price = int(raw_price)
                if "time_limit" not in request.data:
                    time_limit = cloud_profile.session_timeout
            else:
                price = int(raw_price) if raw_price is not None else 100

            batch, created_tickets = RadiusEngineService.generate_batch_in_db(
                router=router,
                count=count,
                auth_mode=auth_mode,
                profile_name=profile_name,
                time_limit=time_limit,
                prefix=prefix,
                code_length=code_length,
                code_format=code_format,
                price=price,
                comment=comment,
            )

            return Response({
                "detail": f"{len(created_tickets)} tickets SaaS générés avec succès pour '{router.name}' !",
                "batch_id": str(batch.id),
                "count": len(created_tickets),
                "tickets": [
                    {
                        "code": t.code,
                        "password": t.password,
                        "auth_mode": auth_mode,
                        "profile": t.profile_name,
                        "time_limit": time_limit,
                        "price": int(t.price),
                    }
                    for t in created_tickets
                ],
            }, status=status.HTTP_201_CREATED)
        except Exception as e:
            return Response({"detail": f"Erreur génération SaaS : {e}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    def delete(self, request, router_id):
        from .models import HotspotTicket
        try:
            router = get_user_router_or_404(
                request.user, router_id, select_related=["vpn_credential", "mikhmon_instance"]
            )
        except Router.DoesNotExist:
            return Response({"detail": "Routeur introuvable."}, status=status.HTTP_404_NOT_FOUND)

        ticket_ids = request.data.get("ticket_ids", [])
        if not ticket_ids:
            return Response({"detail": "Aucun identifiant de ticket fourni."}, status=status.HTTP_400_BAD_REQUEST)

        deleted_count, _ = HotspotTicket.objects.filter(router=router, id__in=ticket_ids).delete()
        return Response({
            "detail": f"{deleted_count} ticket(s) SaaS supprimé(s) avec succès.",
            "deleted_count": deleted_count,
        })


class RouterRadiusSetupScriptView(APIView):
    """Fournit le script RouterOS 1-clic pour raccorder le routeur au serveur RADIUS TikZone."""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, router_id):
        from .services.radius_engine import RadiusEngineService
        try:
            router = get_user_router_or_404(
                request.user, router_id, select_related=["vpn_credential", "mikhmon_instance"]
            )
        except Router.DoesNotExist:
            return Response({"detail": "Routeur introuvable."}, status=status.HTTP_404_NOT_FOUND)

        secret = getattr(settings, "RADIUS_SECRET", "tikzone-radius-secret")
        script = RadiusEngineService.generate_mikrotik_radius_setup_script(router, secret=secret)
        return Response({
            "router_id": str(router.id),
            "router_name": router.name,
            "radius_server_ip": "172.29.88.1",
            "radius_auth_port": 1812,
            "radius_acct_port": 1813,
            "script": script,
        })

