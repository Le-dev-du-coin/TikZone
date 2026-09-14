import uuid
from decimal import Decimal
from django.conf import settings
from django.db import models


class Wallet(models.Model):
    """Portefeuille de l'utilisateur (Solde en Francs CFA)."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="wallet",
    )
    balance = models.DecimalField(
        "Solde (FCFA)",
        max_digits=12,
        decimal_places=2,
        default=Decimal("0.00"),
    )
    created_at = models.DateTimeField("Créé le", auto_now_add=True)
    updated_at = models.DateTimeField("Dernière mise à jour", auto_now=True)

    class Meta:
        verbose_name = "Portefeuille"
        verbose_name_plural = "Portefeuilles"

    def __str__(self):
        return f"Wallet de {self.user.email} - Solde: {self.balance} FCFA"

    def can_afford(self, amount: Decimal) -> bool:
        return self.balance >= amount

    def debit(self, amount: Decimal) -> bool:
        if self.can_afford(amount):
            self.balance -= Decimal(amount)
            self.save(update_fields=["balance", "updated_at"])
            return True
        return False

    def credit(self, amount: Decimal):
        self.balance += Decimal(amount)
        self.save(update_fields=["balance", "updated_at"])


class Transaction(models.Model):
    """Historique des transactions financières."""

    class Type(models.TextChoices):
        DEPOSIT = "DEPOSIT", "Recharge de compte"
        BUY_INSTANCE = "BUY_INSTANCE", "Achat instance Mikhmon"
        BUY_ROUTER = "BUY_ROUTER", "Abonnement routeur"
        AUTO_RENEW = "AUTO_RENEW", "Renouvellement automatique"

    class Status(models.TextChoices):
        PENDING = "PENDING", "En attente"
        COMPLETED = "COMPLETED", "Complété"
        FAILED = "FAILED", "Échoué"
        CANCELLED = "CANCELLED", "Annulé"

    class PaymentMethod(models.TextChoices):
        ORANGE_MONEY = "ORANGE_MONEY", "Orange Money"
        WAVE = "WAVE", "Wave"
        MOOV = "MOOV", "Moov Money"
        CARD = "CARD", "Carte Bancaire"
        OFFLINE = "OFFLINE", "Paiement hors-ligne / Reçu"
        WALLET = "WALLET", "Débit direct du Wallet"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    wallet = models.ForeignKey(
        Wallet,
        on_delete=models.CASCADE,
        related_name="transactions",
    )
    amount = models.DecimalField("Montant (FCFA)", max_digits=12, decimal_places=2)
    type = models.CharField("Type", max_length=20, choices=Type.choices)
    status = models.CharField(
        "Statut",
        max_length=20,
        choices=Status.choices,
        default=Status.PENDING,
    )
    payment_method = models.CharField(
        "Moyen de paiement",
        max_length=20,
        choices=PaymentMethod.choices,
        default=PaymentMethod.WALLET,
    )
    reference = models.CharField("Référence de paiement", max_length=100, blank=True)
    description = models.TextField("Description", blank=True)
    created_at = models.DateTimeField("Date de création", auto_now_add=True)

    class Meta:
        verbose_name = "Transaction"
        verbose_name_plural = "Transactions"
        ordering = ["-created_at"]

class PlatformSetting(models.Model):
    """Paramètres dynamiques de la plateforme configurables par le SuperAdmin."""

    mikhmon_instance_price = models.DecimalField(
        "Prix d'une instance Mikhmon (FCFA)",
        max_digits=10,
        decimal_places=2,
        default=Decimal("1000.00"),
    )
    router_monthly_price = models.DecimalField(
        "Prix mensuel par routeur (FCFA)",
        max_digits=10,
        decimal_places=2,
        default=Decimal("500.00"),
    )
    mikhmon_base_domain = models.CharField(
        "Domaine de base Mikhmon",
        max_length=100,
        default="tikzone.net",
        help_text="Ex: tikzone.net (les sous-domaines seront https://espace.tikzone.net)",
    )

    updated_at = models.DateTimeField("Dernière modification", auto_now=True)

    class Meta:
        verbose_name = "Configuration Tarifaire"
        verbose_name_plural = "Configuration Tarifaire"

    def __str__(self):
        return f"Tarifs : Instance={self.mikhmon_instance_price} FCFA | Routeur={self.router_monthly_price} FCFA/mois"

    @classmethod
    def get_settings(cls) -> "PlatformSetting":
        setting, _ = cls.objects.get_or_create(id=1)
        return setting
