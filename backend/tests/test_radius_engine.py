import pytest
from datetime import timedelta
from decimal import Decimal
from django.utils import timezone
from apps.accounts.models import User
from apps.instances.models import MikhmonInstance
from apps.routers.models import Router, HotspotBatch, HotspotTicket
from apps.routers.services.radius_engine import RadiusEngineService


@pytest.mark.django_db
def test_radius_batch_generation_and_auth():
    user = User.objects.create_user(email="radius_test@tikzone.com", password="password123")
    instance = MikhmonInstance.objects.create(
        user=user,
        name="radiustestzone",
        admin_user="admin",
        admin_password="password",
        is_active=True,
    )
    router = Router.objects.create(
        user=user,
        mikhmon_instance=instance,
        name="MikroTik Principal",
        hotspot_name="Wi-Fi Zone Lousain",
        expires_at=timezone.now() + timedelta(days=30),
    )

    # 1. Test génération de lot en mode Single (PIN)
    batch_single, tickets_single = RadiusEngineService.generate_batch_in_db(
        router=router,
        count=50,
        auth_mode="single",
        profile_name="Forfait 3h",
        time_limit="3h",
        code_length=6,
        code_format="numeric",
        price=150,
    )

    assert batch_single.count == 50
    assert len(tickets_single) == 50
    t1 = tickets_single[0]
    assert len(t1.code) == 6
    assert t1.code.isdigit()
    assert t1.password == t1.code  # Mode PIN
    assert t1.time_limit_seconds == 3 * 3600
    assert t1.status == HotspotTicket.Status.NEW

    # 2. Test Authentification Single (PIN)
    ok, attrs, msg = RadiusEngineService.authenticate(
        username=t1.code,
        password=t1.code,
        nas_ip="172.29.88.2",
        mac_address="AA:BB:CC:DD:EE:FF",
    )
    assert ok is True
    assert 10790 <= attrs["Session-Timeout"] <= 10800

    # Vérification que le ticket passe en ACTIVE avec date de début
    t1.refresh_from_db()
    assert t1.status == HotspotTicket.Status.ACTIVE
    assert t1.first_login_at is not None
    assert t1.mac_address == "AA:BB:CC:DD:EE:FF"

    # 3. Test Accounting : consommation de 30 minutes (1800 secondes)
    acct_ok = RadiusEngineService.accounting(
        username=t1.code,
        status_type=3,  # Interim-Update
        session_time=1800,
        input_octets=10485760,  # 10 Mo
        output_octets=5242880,  # 5 Mo
    )
    assert acct_ok is True
    t1.refresh_from_db()
    assert t1.uptime_used_seconds == 1800
    assert t1.remaining_seconds == 9000  # 10800 - 1800

    # 4. Test Accounting : consommation totale et expiration
    RadiusEngineService.accounting(
        username=t1.code,
        status_type=2,  # Stop
        session_time=10800,
        input_octets=1000,
        output_octets=1000,
    )
    t1.refresh_from_db()
    assert t1.status == HotspotTicket.Status.EXPIRED

    # 5. Tentative de reconnexion sur ticket expiré
    ok_expired, _, msg_expired = RadiusEngineService.authenticate(
        username=t1.code,
        password=t1.code,
        nas_ip="172.29.88.2",
    )
    assert ok_expired is False

    # 6. Test Génération en mode Dual (User != Pass)
    batch_dual, tickets_dual = RadiusEngineService.generate_batch_in_db(
        router=router,
        count=10,
        auth_mode="dual",
        profile_name="Forfait VIP",
        time_limit="24h",
        code_length=4,
    )
    t_dual = tickets_dual[0]
    assert t_dual.password != t_dual.code  # Mots de passe distincts
    assert t_dual.time_limit_seconds == 24 * 3600
