import pytest
from datetime import timedelta
from decimal import Decimal
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from apps.billing.models import PlatformSetting, Transaction, Wallet
from apps.instances.models import MikhmonInstance
from apps.routers.models import Router, VpnCredential

User = get_user_model()


@pytest.mark.django_db
class TestMikrootSaaSWorkflow:
    def setup_method(self):
        self.client = APIClient()
        self.technician = User.objects.create_user(
            email="tech@mikroot.net",
            password="StrongPassword123!",
            full_name="Technicien Alpha",
            phone_number="+22370000001",
            country="Mali",
            role=User.Role.TECHNICIAN,
        )
        self.superadmin = User.objects.create_superuser(
            email="admin@mikroot.net",
            password="SuperPassword123!",
            full_name="Super Admin",
        )

    def test_wallet_auto_created_on_registration(self):
        """Vérifie que le wallet est automatiquement créé avec solde 0."""
        wallet = Wallet.objects.get(user=self.technician)
        assert wallet.balance == Decimal("0.00")

    def test_deposit_wallet(self):
        """Vérifie la recharge de compte."""
        self.client.force_authenticate(user=self.technician)
        response = self.client.post(
            "/api/billing/deposit/",
            {
                "amount": "10000.00",
                "payment_method": "ORANGE_MONEY",
                "reference": "OM-123456",
            },
        )
        assert response.status_code == 201
        wallet = Wallet.objects.get(user=self.technician)
        assert wallet.balance == Decimal("10000.00")
        assert Transaction.objects.filter(wallet=wallet, type="DEPOSIT").count() == 1

    def test_technician_multi_mikhmon_and_routers_workflow(self):
        """Le technicien achète 2 Mikhmon distincts et y ajoute des routeurs."""
        self.client.force_authenticate(user=self.technician)
        wallet = Wallet.objects.get(user=self.technician)
        wallet.credit(Decimal("5000.00"))

        # 1. Achat du Mikhmon Client 1
        inst1_resp = self.client.post("/api/instances/purchase/", {"name": "hotel-etoile", "routeros_version": "V7"})
        assert inst1_resp.status_code == 201
        inst1_id = inst1_resp.data["instance"]["id"]

        # 2. Achat du Mikhmon Client 2
        inst2_resp = self.client.post("/api/instances/purchase/", {"name": "cyber-nord", "routeros_version": "V7"})
        assert inst2_resp.status_code == 201
        inst2_id = inst2_resp.data["instance"]["id"]

        # 3. Ajout de 2 routeurs pour le Client 1
        r1_resp = self.client.post(
            "/api/routers/create/",
            {"name": "hotel-r1", "mikhmon_instance_id": inst1_id},
        )
        assert r1_resp.status_code == 201
        r1_id = r1_resp.data["router"]["id"]

        r2_resp = self.client.post(
            "/api/routers/create/",
            {"name": "hotel-r2", "mikhmon_instance_id": inst1_id},
        )
        assert r2_resp.status_code == 201

        # RÈGLE MÉTIER : Suppression impossible de l'espace 1 tant qu'il a des routeurs
        del_inst1_fail = self.client.delete(f"/api/instances/{inst1_id}/")
        assert del_inst1_fail.status_code == 400
        assert "Impossible de supprimer cet espace" in del_inst1_fail.data["detail"]

        # 4. Renouvellement du routeur 1 (+30 jours)
        renew_resp = self.client.post(f"/api/routers/{r1_id}/renew/")
        assert renew_resp.status_code == 200
        assert "renouvelé avec succès" in renew_resp.data["detail"]

        # 5. Suppression des 2 routeurs de l'espace 1
        del_r1 = self.client.delete(f"/api/routers/{r1_id}/")
        assert del_r1.status_code == 200
        r2_id = r2_resp.data["router"]["id"]
        del_r2 = self.client.delete(f"/api/routers/{r2_id}/")
        assert del_r2.status_code == 200

        # 6. Maintenant que l'espace 1 est vide, la suppression réussit
        del_inst1_success = self.client.delete(f"/api/instances/{inst1_id}/")
        assert del_inst1_success.status_code == 200
        assert MikhmonInstance.objects.filter(id=inst1_id).count() == 0

    def test_superadmin_custom_panel_and_dynamic_pricing(self):
        """Le SuperAdmin consulte les stats globales et modifie les tarifs dynamiquement."""
        self.client.force_authenticate(user=self.superadmin)

        # 1. Vérification des stats
        stats_resp = self.client.get("/api/billing/superadmin/stats/")
        assert stats_resp.status_code == 200
        assert "kpi" in stats_resp.data

        # 2. Modification des tarifs
        pricing_resp = self.client.put(
            "/api/billing/superadmin/pricing/",
            {
                "mikhmon_instance_price": "1500.00",
                "router_monthly_price": "750.00",
            },
        )
        assert pricing_resp.status_code == 200
        assert Decimal(pricing_resp.data["mikhmon_instance_price"]) == Decimal("1500.00")

    def test_cloud_hotspot_profiles_and_pricing(self):
        """Vérifie la gestion des forfaits Cloud Hotspot avec prix FCFA exacts et toggle is_active."""
        self.client.force_authenticate(user=self.technician)
        wallet = Wallet.objects.get(user=self.technician)
        wallet.credit(Decimal("5000.00"))

        inst_resp = self.client.post("/api/instances/purchase/", {"name": "cloud-zone", "routeros_version": "V7"})
        inst_id = inst_resp.data["instance"]["id"]

        r_resp = self.client.post("/api/routers/create/", {"name": "routeur-cloud", "mikhmon_instance_id": inst_id})
        router_id = r_resp.data["router"]["id"]

        # 1. GET initial : auto-initialisation de l'unique profil par défaut 'default'
        list_resp = self.client.get(f"/api/routers/{router_id}/hotspot/profiles/")
        assert list_resp.status_code == 200
        assert list_resp.data["count"] == 1
        assert list_resp.data["results"][0]["name"] == "default"
        assert list_resp.data["results"][0]["price"] == 100

        # 2. POST : Ajout d'un nouveau profil sur mesure
        create_resp = self.client.post(
            f"/api/routers/{router_id}/hotspot/profiles/",
            {
                "name": "Pass Nuit Illimité",
                "price": 300,
                "rate_limit": "4M/4M",
                "session_timeout": "8h",
                "is_active": True,
            },
        )
        assert create_resp.status_code == 201
        profile_id = create_resp.data["id"]
        assert create_resp.data["price"] == 300
        assert create_resp.data["is_active"] is True

        # 3. PATCH : Désactivation du profil (toggle enabled=False)
        patch_resp = self.client.patch(
            f"/api/routers/{router_id}/hotspot/profiles/",
            {"id": profile_id, "is_active": False},
        )
        assert patch_resp.status_code == 200
        assert patch_resp.data["is_active"] is False

        # 4. Génération de tickets SaaS utilisant ce forfait : prend automatiquement le bon prix
        ticket_gen_resp = self.client.post(
            f"/api/routers/{router_id}/saas-tickets/",
            {
                "count": 5,
                "profile": "Pass Nuit Illimité",
                "auth_mode": "single",
            },
        )
        assert ticket_gen_resp.status_code == 201
        assert ticket_gen_resp.data["count"] == 5
        assert ticket_gen_resp.data["tickets"][0]["price"] == 300
        assert ticket_gen_resp.data["tickets"][0]["time_limit"] == "8h"

        # 5. Vérification du rapport de ventes 100% PostgreSQL
        sales_resp = self.client.get(f"/api/routers/{router_id}/reports/")
        assert sales_resp.status_code == 200
        assert sales_resp.data["today_revenue"] == 1500  # 5 tickets * 300 FCFA
        assert sales_resp.data["today_count"] == 5
        assert len(sales_resp.data["sales_history"]) == 5

    def test_ticket_continuous_calendar_validity(self):
        """Vérifie que le compte à rebours calendaire absolu (expires_at) empêche le partage différé."""
        from django.utils import timezone
        from datetime import timedelta
        from apps.routers.models import HotspotBatch, HotspotTicket, Router
        from apps.instances.models import MikhmonInstance

        inst = MikhmonInstance.objects.create(user=self.technician, name="test-hotspot-zone")
        now = timezone.now()
        router = Router.objects.create(
            user=self.technician,
            mikhmon_instance=inst,
            name="Routeur Test Calendrier",
            expires_at=now + timedelta(days=30),
        )
        batch = HotspotBatch.objects.create(
            router=router,
            name="Lot Test Calendrier",
            time_limit="1h",
            price=Decimal("100.00"),
            count=1,
        )
        now = timezone.now()
        ticket = HotspotTicket.objects.create(
            batch=batch,
            router=router,
            code="TESTCAL01",
            password="pass",
            time_limit_seconds=3600,
            first_login_at=now - timedelta(minutes=70),
            expires_at=now - timedelta(minutes=10),  # Expiré il y a 10 min
            status=HotspotTicket.Status.ACTIVE,
        )
        assert ticket.remaining_seconds == 0

        # Ticket actif avec 15 minutes restantes
        ticket_active = HotspotTicket.objects.create(
            batch=batch,
            router=router,
            code="TESTCAL02",
            password="pass",
            time_limit_seconds=3600,
            first_login_at=now - timedelta(minutes=45),
            expires_at=now + timedelta(minutes=15),
            status=HotspotTicket.Status.ACTIVE,
        )
        assert 800 <= ticket_active.remaining_seconds <= 900

