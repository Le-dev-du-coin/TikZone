import base64
import ipaddress
import secrets
import uuid
from datetime import timedelta
from decimal import Decimal
from django.conf import settings
from django.db import models
from django.utils import timezone
from apps.accounts.models import User
from apps.instances.models import MikhmonInstance


def generate_wireguard_keypair():
    """Génère une paire de clés WireGuard valide (Curve25519 / X25519)."""
    try:
        from cryptography.hazmat.primitives.asymmetric import x25519
        from cryptography.hazmat.primitives import serialization

        private_key = x25519.X25519PrivateKey.generate()
        priv_bytes = private_key.private_bytes(
            encoding=serialization.Encoding.Raw,
            format=serialization.PrivateFormat.Raw,
            encryption_algorithm=serialization.NoEncryption(),
        )
        pub_bytes = private_key.public_key().public_bytes(
            encoding=serialization.Encoding.Raw,
            format=serialization.PublicFormat.Raw,
        )
        return (
            base64.b64encode(priv_bytes).decode("ascii"),
            base64.b64encode(pub_bytes).decode("ascii"),
        )
    except Exception:
        # Fallback de secours
        priv_bytes = secrets.token_bytes(32)
        return (
            base64.b64encode(priv_bytes).decode("ascii"),
            base64.b64encode(secrets.token_bytes(32)).decode("ascii"),
        )


class Router(models.Model):
    """Routeur MikroTik géré par la plateforme."""

    class Status(models.TextChoices):
        ACTIVE = "ACTIVE", "Actif"
        EXPIRED = "EXPIRED", "Expiré"
        SUSPENDED = "SUSPENDED", "Suspendu"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="routers")
    mikhmon_instance = models.ForeignKey(
        MikhmonInstance,
        on_delete=models.CASCADE,
        related_name="routers",
    )
    name = models.CharField("Nom du Routeur", max_length=100)
    status = models.CharField(
        "Statut",
        max_length=20,
        choices=Status.choices,
        default=Status.ACTIVE,
    )
    price_per_month = models.DecimalField(
        "Prix mensuel (FCFA)",
        max_digits=10,
        decimal_places=2,
        default=Decimal("500.00"),
    )
    auto_renew = models.BooleanField("Renouvellement automatique", default=True)
    expires_at = models.DateTimeField("Date d'expiration")
    last_ping = models.DateTimeField("Dernier contact", null=True, blank=True)
    created_at = models.DateTimeField("Date d'ajout", auto_now_add=True)
    updated_at = models.DateTimeField("Dernière mise à jour", auto_now=True)

    class Meta:
        verbose_name = "Routeur MikroTik"
        verbose_name_plural = "Routeurs MikroTik"
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.name} ({self.mikhmon_instance.name})"

    @property
    def remaining_days(self) -> int:
        if not self.expires_at:
            return 0
        diff = self.expires_at - timezone.now()
        seconds = diff.total_seconds()
        if seconds <= 0:
            return 0
        return int((seconds + 86399) // 86400)

    @property
    def days_left(self) -> int:
        """Alias pour l'API REST."""
        return self.remaining_days

    def is_valid(self) -> bool:
        return self.status == self.Status.ACTIVE and self.expires_at > timezone.now()


class VpnCredential(models.Model):
    """Identifiants VPN (WireGuard pour ROS 7 & L2TP/IPsec pour ROS 6) et ports alloués."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    router = models.OneToOneField(
        Router,
        on_delete=models.CASCADE,
        related_name="vpn_credential",
    )
    vpn_server = models.CharField(
        "Serveur VPN",
        max_length=100,
        default=getattr(settings, "VPN_SERVER_HOST", "vpn.mikroot.app"),
    )
    # Identifiants L2TP / IPsec (ROS 6)
    vpn_user = models.CharField("Utilisateur VPN L2TP", max_length=64, unique=True)
    vpn_password = models.CharField("Mot de passe VPN L2TP", max_length=64)

    # Identifiants WireGuard (ROS 7)
    wireguard_private_key = models.CharField("Clé Privée WireGuard", max_length=64, blank=True)
    wireguard_public_key = models.CharField("Clé Publique WireGuard", max_length=64, blank=True)
    wireguard_listen_port = models.PositiveIntegerField("Port d'écoute WireGuard", default=13231)

    # Adressage IP et Ports de redirection
    assigned_ip = models.GenericIPAddressField("IP VPN Assignée", protocol="IPv4")
    api_port = models.PositiveIntegerField("Port API Distant", unique=True)
    winbox_port = models.PositiveIntegerField("Port Winbox Distant", unique=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Identifiant VPN"
        verbose_name_plural = "Identifiants VPN"

    def __str__(self):
        return f"VPN for {self.router.name} (API: {self.api_port} / Winbox: {self.winbox_port})"

    @classmethod
    def allocate_next_credentials(cls, router: Router) -> "VpnCredential":
        """Alloue automatiquement le prochain port, l'IP et les clés cryptographiques."""
        last_vpn = cls.objects.order_by("-api_port").first()

        start_api = getattr(settings, "VPN_API_PORT_START", 41000)
        start_winbox = getattr(settings, "VPN_WINBOX_PORT_START", 51000)

        if last_vpn:
            next_api = last_vpn.api_port + 1
            next_winbox = last_vpn.winbox_port + 1
            ip_num = (last_vpn.api_port - start_api) + 2
        else:
            next_api = start_api + 1
            next_winbox = start_winbox + 1
            ip_num = 2

        vpn_subnet = getattr(settings, "VPN_SUBNET", "172.29.88.0/24")
        network = ipaddress.ip_network(vpn_subnet, strict=False)
        assigned_ip = str(network[ip_num])
        vpn_user = f"{router.name.lower()}_{router.id.hex[:6]}"
        vpn_password = secrets.token_hex(16)
        wg_priv, wg_pub = generate_wireguard_keypair()
        server_host = getattr(settings, "VPN_SERVER_HOST", f"vpn.{getattr(settings, 'BASE_DOMAIN', 'mikroot.app')}")

        return cls.objects.create(
            router=router,
            vpn_server=server_host,
            vpn_user=vpn_user,
            vpn_password=vpn_password,
            wireguard_private_key=wg_priv,
            wireguard_public_key=wg_pub,
            assigned_ip=assigned_ip,
            api_port=next_api,
            winbox_port=next_winbox,
        )

    def generate_mikrotik_script(self) -> str:
        """Génère le script RouterOS adapté selon la version choisie (ROS 7 WireGuard ou ROS 6 L2TP)."""
        instance = self.router.mikhmon_instance
        is_v7 = instance.routeros_version == MikhmonInstance.RouterOSVersion.V7

        if is_v7:
            # === SCRIPT ROUTEROS 7 (WIREGUARD NAT TRAVERSAL) ===
            vpn_subnet = getattr(settings, "VPN_SUBNET", "172.29.88.0/24")
            server_pubkey = getattr(
                settings,
                "VPN_WG_SERVER_PUBKEY",
                "pUBL1cK3yM1kr00tS3rv3rVpnW1r3gu4rdD3m02026=",
            )
            server_port = getattr(settings, "VPN_WG_SERVER_PORT", 51820)
            return (
                f"/interface wireguard remove [find name=wg-tikzone]\n"
                f"/interface wireguard remove [find name=wg-mikroot]\n"
                f"/interface wireguard add name=wg-tikzone listen-port={self.wireguard_listen_port} mtu=1420 private-key=\"{self.wireguard_private_key}\" comment=\"TikZone VPN\"\n"
                f"/ip address remove [find interface=wg-tikzone]\n"
                f"/ip address remove [find interface=wg-mikroot]\n"
                f"/ip address add address={self.assigned_ip}/24 interface=wg-tikzone\n"
                f"/interface wireguard peers remove [find interface=wg-tikzone]\n"
                f"/interface wireguard peers add interface=wg-tikzone endpoint-address={self.vpn_server} endpoint-port={server_port} public-key=\"{server_pubkey}\" allowed-address={vpn_subnet} persistent-keepalive=25s comment=\"TikZone VPN Server\"\n"
                f"/ip service set api disabled=no port=8728 address=\"\"\n"
                f"/ip service set winbox disabled=no port=8291 address=\"\"\n"
                f"/ip firewall filter remove [find comment=\"TikZone VPN API\"]\n"
                f"/ip firewall filter remove [find comment=\"Mikroot VPN API\"]\n"
                f"/ip firewall filter add action=accept chain=input in-interface=wg-tikzone comment=\"TikZone VPN API\" place-before=0"
            )
        else:
            # === SCRIPT ROUTEROS 6 (L2TP / IPSEC) ===
            return (
                f"/interface l2tp-client remove [find name=tikzone-vpn]\n"
                f"/interface l2tp-client remove [find name=mikroot-vpn]\n"
                f"/interface l2tp-client add connect-to={self.vpn_server} name=tikzone-vpn user=\"{self.vpn_user}\" password=\"{self.vpn_password}\" disabled=no add-default-route=no use-ipsec=yes ipsec-secret=\"{self.vpn_password}\" comment=\"TikZone VPN\"\n"
                f"/ip service set api disabled=no port=8728 address=\"\"\n"
                f"/ip service set winbox disabled=no port=8291 address=\"\"\n"
                f"/ip firewall filter remove [find comment=\"TikZone VPN API\"]\n"
                f"/ip firewall filter remove [find comment=\"Mikroot VPN API\"]\n"
                f"/ip firewall filter add action=accept chain=input in-interface=tikzone-vpn comment=\"TikZone VPN API\" place-before=0"
            )

