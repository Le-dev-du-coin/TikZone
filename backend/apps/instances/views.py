from decimal import Decimal
from django.conf import settings
from django.db import transaction as db_transaction
from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from apps.billing.models import PlatformSetting, Transaction, Wallet
from .models import MikhmonInstance
from .serializers import MikhmonInstanceSerializer, PurchaseInstanceSerializer


def sync_manager_user(instance):
    """Synchronise un compte User Django (CLIENT_MANAGER) pour cet espace."""
    from apps.accounts.models import User
    username = instance.admin_user.strip() if instance.admin_user else f"gerant_{instance.name}"
    email = f"{username}_{instance.name}@tikzone.local"

    user = User.objects.filter(managed_instance=instance).first()
    if not user:
        user = User.objects.filter(username__iexact=username).first()

    if not user:
        user = User(
            email=email,
            username=username,
            full_name=instance.client_name or f"Gérant {instance.name}",
            phone_number=instance.client_phone or "",
            role=User.Role.CLIENT_MANAGER,
            managed_instance=instance,
        )
    else:
        user.username = username
        user.managed_instance = instance
        if instance.client_name:
            user.full_name = instance.client_name
        if instance.client_phone:
            user.phone_number = instance.client_phone
        user.role = User.Role.CLIENT_MANAGER

    if instance.admin_password:
        user.set_password(instance.admin_password)
    user.save()
    return user


class InstanceListView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        if getattr(request.user, "role", None) == "CLIENT_MANAGER":
            if request.user.managed_instance:
                instances = MikhmonInstance.objects.filter(id=request.user.managed_instance_id).prefetch_related("routers__vpn_credential")
            else:
                instances = MikhmonInstance.objects.none()
        else:
            instances = MikhmonInstance.objects.filter(user=request.user).prefetch_related("routers__vpn_credential")
        return Response(MikhmonInstanceSerializer(instances, many=True).data)


class PurchaseInstanceView(APIView):
    """Achat d'une instance Mikhmon (Tarif dynamique configurable par SuperAdmin)."""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        serializer = PurchaseInstanceSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        pricing = PlatformSetting.get_settings()
        price = pricing.mikhmon_instance_price
        wallet, _ = Wallet.objects.get_or_create(user=request.user)

        if not wallet.can_afford(price):
            return Response(
                {
                    "detail": f"Solde insuffisant ({wallet.balance} FCFA). L'achat d'une instance coûte {price} FCFA.",
                    "required": price,
                    "balance": wallet.balance,
                },
                status=status.HTTP_402_PAYMENT_REQUIRED,
            )

        with db_transaction.atomic():
            wallet.debit(price)
            instance = serializer.save(user=request.user)

            Transaction.objects.create(
                wallet=wallet,
                amount=price,
                type=Transaction.Type.BUY_INSTANCE,
                status=Transaction.Status.COMPLETED,
                payment_method=Transaction.PaymentMethod.WALLET,
                description=f"Achat de l'espace '{instance.name}'",
            )
            # Synchronisation immédiate du compte gérant
            sync_manager_user(instance)

        return Response(
            {
                "detail": f"Espace '{instance.name}' créé avec succès !",
                "instance": MikhmonInstanceSerializer(instance).data,
                "new_balance": wallet.balance,
            },
            status=status.HTTP_201_CREATED,
        )


class InstanceDetailView(APIView):
    """Détail, mise à jour et suppression d'un espace."""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, instance_id):
        try:
            if getattr(request.user, "role", None) == "CLIENT_MANAGER":
                if str(instance_id) != str(getattr(request.user, "managed_instance_id", "")):
                    return Response({"detail": "Accès non autorisé à cet espace."}, status=status.HTTP_403_FORBIDDEN)
                instance = MikhmonInstance.objects.get(id=instance_id)
            else:
                instance = MikhmonInstance.objects.get(id=instance_id, user=request.user)
        except MikhmonInstance.DoesNotExist:
            return Response({"detail": "Instance introuvable."}, status=status.HTTP_404_NOT_FOUND)
        return Response(MikhmonInstanceSerializer(instance).data)

    def patch(self, request, instance_id):
        try:
            instance = MikhmonInstance.objects.get(id=instance_id, user=request.user)
        except MikhmonInstance.DoesNotExist:
            return Response({"detail": "Instance introuvable."}, status=status.HTTP_404_NOT_FOUND)

        for field in ["client_name", "client_phone", "admin_user", "admin_password"]:
            if field in request.data:
                setattr(instance, field, request.data[field])

        instance.save()
        sync_manager_user(instance)

        return Response(MikhmonInstanceSerializer(instance).data)

    def delete(self, request, instance_id):
        try:
            instance = MikhmonInstance.objects.get(id=instance_id, user=request.user)
        except MikhmonInstance.DoesNotExist:
            return Response({"detail": "Instance introuvable."}, status=status.HTTP_404_NOT_FOUND)

        # RÈGLE MÉTIER STRICTE : Impossible de supprimer un espace avec des routeurs
        router_count = instance.routers.count()
        if router_count > 0:
            return Response(
                {
                    "detail": f"Impossible de supprimer cet espace : il contient encore {router_count} routeur(s) associé(s). Veuillez d'abord supprimer ou déplacer ces routeurs.",
                    "routers_count": router_count,
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        instance_name = instance.name
        instance.delete()
        return Response(
            {"detail": f"L'espace '{instance_name}' a été supprimé avec succès."},
            status=status.HTTP_200_OK,
        )
