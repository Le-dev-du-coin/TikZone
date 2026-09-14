import re
import uuid
from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models


def validate_subdomain_name(value):
    if not re.match(r"^[a-z0-9-]+$", value):
        raise ValidationError("Le nom ne doit contenir que des lettres minuscules, chiffres et tirets.")


class MikhmonInstance(models.Model):
    """Instance Mikhmon en ligne rattachée à un utilisateur."""

    class RouterOSVersion(models.TextChoices):
        V6 = "V6", "RouterOS v6 (6.1 - 6.49)"
        V7 = "V7", "RouterOS v7 (7.10 - 7.16+ Recommandé)"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="mikhmon_instances",
    )
    name = models.CharField(
        "Nom du Mikhmon (Sous-domaine)",
        max_length=63,
        unique=True,
        validators=[validate_subdomain_name],
        help_text="Ex: siramanass (donnera siramanass.wifizonevpn.net ou votre domaine)",
    )
    routeros_version = models.CharField(
        "Version RouterOS",
        max_length=10,
        choices=RouterOSVersion.choices,
        default=RouterOSVersion.V7,
    )
    admin_user = models.CharField("Nom d'utilisateur Mikhmon", max_length=50, default="admin")
    admin_password = models.CharField("Mot de passe Mikhmon", max_length=100, default="mikroot2026")
    is_active = models.BooleanField("Actif", default=True)
    created_at = models.DateTimeField("Date d'achat", auto_now_add=True)
    updated_at = models.DateTimeField("Dernière mise à jour", auto_now=True)

    class Meta:
        verbose_name = "Instance Mikhmon"
        verbose_name_plural = "Instances Mikhmon"
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.name} ({self.get_routeros_version_display()})"

    @property
    def subdomain_url(self):
        base_domain = getattr(settings, "BASE_DOMAIN", "tikzone.net")
        try:
            from apps.billing.models import PlatformSetting
            s = PlatformSetting.get_settings()
            if s.mikhmon_base_domain:
                base_domain = s.mikhmon_base_domain
        except Exception:
            pass
        return f"https://{self.name}.{base_domain}"

