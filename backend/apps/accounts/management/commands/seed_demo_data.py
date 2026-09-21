from datetime import timedelta
from decimal import Decimal
from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework.authtoken.models import Token
from apps.billing.models import PlatformSetting, Wallet, Transaction
from apps.instances.models import MikhmonInstance
from apps.routers.models import Router, VpnCredential

User = get_user_model()

class Command(BaseCommand):
    help = "Seed demo data with credited wallet and valid auth token for testing"

    def handle(self, *args, **options):
        # 1. Ensure SuperAdmin exists
        superadmin, _ = User.objects.get_or_create(
            email="admin@mikroot.net",
            defaults={
                "full_name": "Super Admin",
                "role": User.Role.SUPERADMIN,
                "is_staff": True,
                "is_superuser": True,
            }
        )
        superadmin.set_password("Admin12345!")
        superadmin.save()

        # 2. Ensure Main Demo Technician exists
        demo_user, created = User.objects.get_or_create(
            email="siramanass@mikroot.net",
            defaults={
                "full_name": "Siriman Ass",
                "phone_number": "+223 70 00 00 00",
                "country": "Mali",
                "role": User.Role.TECHNICIAN,
            }
        )
        demo_user.set_password("Password123!")
        demo_user.save()

        # 3. Create or update known DRF Token for immediate authentication
        Token.objects.filter(user=demo_user).delete()
        Token.objects.create(user=demo_user, key="demo-token-active-50k")

        # 4. Credit Wallet with 50 000 FCFA for testing
        wallet, _ = Wallet.objects.get_or_create(user=demo_user)
        wallet.balance = Decimal("50000.00")
        wallet.save()

        Transaction.objects.get_or_create(
            wallet=wallet,
            reference="DEMO-CREDIT-50K",
            defaults={
                "amount": Decimal("50000.00"),
                "type": Transaction.Type.DEPOSIT,
                "status": Transaction.Status.COMPLETED,
                "payment_method": Transaction.PaymentMethod.ORANGE_MONEY,
                "description": "Crédit de démonstration & tests (50 000 FCFA)",
            }
        )

        # 5. Create Demo Instance if not exists
        instance, _ = MikhmonInstance.objects.get_or_create(
            user=demo_user,
            name="siramanass",
            defaults={
                "routeros_version": MikhmonInstance.RouterOSVersion.V7,
            }
        )

        # 6. Create Demo Router if not exists
        if not Router.objects.filter(name="siramanass", user=demo_user).exists():
            router = Router.objects.create(
                user=demo_user,
                mikhmon_instance=instance,
                name="siramanass",
                price_per_month=Decimal("500.00"),
                auto_renew=True,
                expires_at=timezone.now() + timedelta(days=30),
                status=Router.Status.ACTIVE,
            )
            VpnCredential.allocate_next_credentials(router)

        # 7. Provisionnement automatique dans Mikhmon-Next Engine
        from apps.instances.services import MikhmonProvisioningService
        count = MikhmonProvisioningService.sync_all()
        self.stdout.write(self.style.SUCCESS(f"[OK] {count} routeur(s) provisionne(s) avec succes sur TikZone Cloud"))

        self.stdout.write(self.style.SUCCESS("[OK] Donnees de demonstration, token 'demo-token-active-50k' et credit de 50 000 FCFA initialises pour siramanass@mikroot.net"))
