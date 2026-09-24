import uuid
from django.contrib.auth.models import AbstractBaseUser, BaseUserManager, PermissionsMixin
from django.db import models


class UserManager(BaseUserManager):
    """Manager personnalisé pour l'authentification par email."""

    def create_user(self, email, password=None, **extra_fields):
        if not email:
            raise ValueError("L'adresse email est obligatoire.")
        email = self.normalize_email(email)
        user = self.model(email=email, **extra_fields)
        if password:
            user.set_password(password)
        else:
            user.set_unusable_password()
        user.save(using=self._db)
        return user

    def create_superuser(self, email, password=None, **extra_fields):
        extra_fields.setdefault("is_staff", True)
        extra_fields.setdefault("is_superuser", True)
        extra_fields.setdefault("role", User.Role.SUPERADMIN)

        if extra_fields.get("is_staff") is not True:
            raise ValueError("Le superuser doit avoir is_staff=True.")
        if extra_fields.get("is_superuser") is not True:
            raise ValueError("Le superuser doit avoir is_superuser=True.")

        return self.create_user(email, password, **extra_fields)


class User(AbstractBaseUser, PermissionsMixin):
    """Modèle utilisateur personnalisé pour la plateforme Mikroot SaaS."""

    class Role(models.TextChoices):
        SUPERADMIN = "SUPERADMIN", "Super Administrateur"
        TECHNICIAN = "TECHNICIAN", "Technicien / Installateur"
        OWNER = "OWNER", "Propriétaire WiFi Zone"
        CLIENT_MANAGER = "CLIENT_MANAGER", "Gérant de Point de Vente / Client"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    email = models.EmailField("Adresse Email", unique=True, db_index=True)
    username = models.CharField("Nom d'utilisateur / Pseudo", max_length=50, blank=True, null=True, unique=True, db_index=True)
    full_name = models.CharField("Nom complet ou Entreprise", max_length=255, blank=True)
    phone_number = models.CharField("Numéro de téléphone (WhatsApp)", max_length=30, blank=True)
    country = models.CharField("Pays", max_length=50, default="Mali")

    role = models.CharField(
        "Rôle",
        max_length=20,
        choices=Role.choices,
        default=Role.OWNER,
    )

    managed_instance = models.ForeignKey(
        "instances.MikhmonInstance",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="managers",
        help_text="Espace assigné à ce gérant (confinement strict).",
    )

    is_active = models.BooleanField("Actif", default=True)
    is_staff = models.BooleanField("Accès Staff / Admin", default=False)
    created_at = models.DateTimeField("Date d'inscription", auto_now_add=True)
    updated_at = models.DateTimeField("Dernière mise à jour", auto_now=True)

    objects = UserManager()

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = []

    class Meta:
        verbose_name = "Utilisateur"
        verbose_name_plural = "Utilisateurs"
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.email} ({self.get_role_display()})"


class RegistrationOTP(models.Model):
    """Stocke les codes OTP temporaires pour la validation des inscriptions."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    phone_number = models.CharField("Numéro de téléphone", max_length=30, db_index=True)
    email = models.EmailField("Adresse Email", db_index=True)
    otp_code = models.CharField("Code OTP", max_length=10)
    registration_data = models.JSONField("Données d'inscription temporaires", default=dict)
    attempts = models.PositiveSmallIntegerField("Nombre de tentatives", default=0)
    is_verified = models.BooleanField("Est validé", default=False)
    expires_at = models.DateTimeField("Date d'expiration")
    created_at = models.DateTimeField("Créé le", auto_now_add=True)

    class Meta:
        verbose_name = "OTP d'inscription"
        verbose_name_plural = "OTPs d'inscription"
        ordering = ["-created_at"]

    def is_expired(self) -> bool:
        from django.utils import timezone
        return timezone.now() > self.expires_at

    def __str__(self):
        return f"OTP pour {self.phone_number} ({self.email}) - Expire: {self.expires_at}"

