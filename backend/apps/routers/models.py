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

    class HotspotType(models.TextChoices):
        RADIUS = "RADIUS", "Moteur Cloud RADIUS (Recommandé)"
        STANDALONE = "STANDALONE", "Moteur Local RouterOS"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="routers")
    mikhmon_instance = models.ForeignKey(
        MikhmonInstance,
        on_delete=models.CASCADE,
        related_name="routers",
    )
    name = models.CharField("Nom du Routeur", max_length=100)
    hotspot_name = models.CharField("Nom Commercial Hotspot", max_length=100, blank=True, default="")
    hotspot_type = models.CharField(
        "Type de Moteur Hotspot",
        max_length=20,
        choices=HotspotType.choices,
        default=HotspotType.RADIUS,
    )
    api_user = models.CharField("Nom d'utilisateur API RouterOS", max_length=50, default="admin")
    api_password = models.CharField("Mot de passe API RouterOS", max_length=128, blank=True, default="")
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
        default="187.7.20.53",
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
        server_host = getattr(settings, "VPN_SERVER_HOST", "187.7.20.53")
        # Sécurité Senior : Si une IPv6 brute a été configurée par mégarde (présence de ':'),
        # on bascule impérativement sur l'adresse IPv4 directe pour éliminer tout risque DNS sur MikroTik
        if not server_host or ":" in server_host:
            server_host = "187.7.20.53"

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

        # Assainissement de l'endpoint : Toujours une IPv4 valide ou un domaine
        endpoint_host = self.vpn_server
        if not endpoint_host or ":" in endpoint_host:
            endpoint_host = getattr(settings, "VPN_SERVER_HOST", "187.7.20.53")
            if not endpoint_host or ":" in endpoint_host:
                endpoint_host = "187.7.20.53"

        if is_v7:
            # === SCRIPT ROUTEROS 7 (WIREGUARD NAT TRAVERSAL) ===
            vpn_subnet = getattr(settings, "VPN_SUBNET", "172.29.88.0/24")
            server_pubkey = getattr(
                settings,
                "VPN_WG_SERVER_PUBKEY",
                "pUBL1cK3yM1kr00tS3rv3rVpnW1r3gu4rdD3m02026=",
            )
            server_port = getattr(settings, "VPN_WG_SERVER_PORT", 51820)
            script = (
                f"/interface wireguard remove [find name=wg-tikzone]\n"
                f"/interface wireguard remove [find name=wg-mikroot]\n"
                f"/interface wireguard add name=wg-tikzone listen-port={self.wireguard_listen_port} mtu=1420 private-key=\"{self.wireguard_private_key}\" comment=\"TikZone VPN\"\n"
                f"/ip address remove [find interface=wg-tikzone]\n"
                f"/ip address remove [find interface=wg-mikroot]\n"
                f"/ip address add address={self.assigned_ip}/24 interface=wg-tikzone\n"
                f"/interface wireguard peers remove [find interface=wg-tikzone]\n"
                f"/interface wireguard peers add interface=wg-tikzone endpoint-address={endpoint_host} endpoint-port={server_port} public-key=\"{server_pubkey}\" allowed-address={vpn_subnet} persistent-keepalive=25s comment=\"TikZone VPN Server\"\n"
                f"/ip service set api disabled=no port=8728\n"
                f"/ip service set winbox disabled=no port=8291\n"
                f"/ip firewall filter remove [find comment=\"TikZone VPN API\"]\n"
                f"/ip firewall filter remove [find comment=\"Mikroot VPN API\"]\n"
                f"/ip firewall filter add action=accept chain=input in-interface=wg-tikzone comment=\"TikZone VPN API\" place-before=0"
            )
        else:
            # === SCRIPT ROUTEROS 6 (L2TP / IPSEC) ===
            script = (
                f"/interface l2tp-client remove [find name=tikzone-vpn]\n"
                f"/interface l2tp-client remove [find name=mikroot-vpn]\n"
                f"/interface l2tp-client add connect-to={endpoint_host} name=tikzone-vpn user=\"{self.vpn_user}\" password=\"{self.vpn_password}\" disabled=no add-default-route=no use-ipsec=yes ipsec-secret=\"{self.vpn_password}\" comment=\"TikZone VPN\"\n"
                f"/ip service set api disabled=no port=8728\n"
                f"/ip service set winbox disabled=no port=8291\n"
                f"/ip firewall filter remove [find comment=\"TikZone VPN API\"]\n"
                f"/ip firewall filter remove [find comment=\"Mikroot VPN API\"]\n"
                f"/ip firewall filter add action=accept chain=input in-interface=tikzone-vpn comment=\"TikZone VPN API\" place-before=0"
            )

        # Configuration Cloud RADIUS TikZone (100% Automatisé Zéro-Clic)
        router_hotspot_type = getattr(self.router, "hotspot_type", Router.HotspotType.RADIUS)
        if router_hotspot_type == Router.HotspotType.RADIUS:
            secret = getattr(settings, "RADIUS_SECRET", "tikzone-radius-secret-2026")
            radius_host = getattr(settings, "RADIUS_SERVER_IP", "172.29.88.1")
            radius_block = (
                f"\n\n# === MOTEUR CLOUD RADIUS TIKZONE (ZÉRO-CLIC) ===\n"
                f"/radius remove [find comment=\"TikZone RADIUS\"]\n"
                f"/radius remove [find comment=\"Mikroot RADIUS\"]\n"
                f"/radius add service=hotspot address={radius_host} secret=\"{secret}\" authentication-port=1812 accounting-port=1813 timeout=3000ms require-message-auth=no comment=\"TikZone RADIUS\"\n"
                f"/ip hotspot profile set [find] use-radius=yes radius-accounting=yes radius-interim-update=3m login-by=http-pap,mac-cookie\n"
                f"/radius incoming set accept=yes port=3799"
            )
            script += radius_block

        return script


class HotspotBatch(models.Model):
    """Représente un lot d'émission de tickets Hotspot SaaS centralisé."""

    class AuthMode(models.TextChoices):
        SINGLE = "single", "Code unique / PIN (1 champ)"
        DUAL = "dual", "Utilisateur & Mot de passe distincts (2 champs)"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    router = models.ForeignKey(Router, on_delete=models.CASCADE, related_name="hotspot_batches")
    name = models.CharField("Nom ou Référence du Lot", max_length=120, blank=True)
    profile_name = models.CharField("Nom du Profil", max_length=100, default="default")
    auth_mode = models.CharField(
        "Mode d'Authentification",
        max_length=20,
        choices=AuthMode.choices,
        default=AuthMode.SINGLE,
    )
    code_length = models.PositiveSmallIntegerField("Longueur des codes", default=6)
    time_limit = models.CharField("Limite de Durée", max_length=50, default="3h")
    price = models.DecimalField("Prix Unitaire (FCFA)", max_digits=10, decimal_places=2, default=Decimal("100.00"))
    count = models.PositiveIntegerField("Nombre de Tickets", default=1)
    comment = models.CharField("Commentaire / Libellé", max_length=200, blank=True)
    created_at = models.DateTimeField("Date de Génération", auto_now_add=True)

    class Meta:
        verbose_name = "Lot de Tickets Hotspot"
        verbose_name_plural = "Lots de Tickets Hotspot"
        ordering = ["-created_at"]

    def __str__(self):
        return f"Lot {self.name or self.id.hex[:8]} - {self.router.name} ({self.count} tickets)"


class HotspotTicket(models.Model):
    """Ticket Hotspot SaaS unitaire validé via le moteur RADIUS."""

    class Status(models.TextChoices):
        NEW = "NEW", "Disponible (Non utilisé)"
        ACTIVE = "ACTIVE", "Actif (En cours d'utilisation)"
        EXPIRED = "EXPIRED", "Expiré (Temps écoulé)"
        REVOKED = "REVOKED", "Révoqué (Désactivé)"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    batch = models.ForeignKey(HotspotBatch, on_delete=models.CASCADE, related_name="tickets")
    router = models.ForeignKey(Router, on_delete=models.CASCADE, related_name="hotspot_tickets")

    code = models.CharField("Code Ticket / Identifiant", max_length=64, db_index=True)
    password = models.CharField("Mot de Passe", max_length=64)
    profile_name = models.CharField("Profil Associé", max_length=100, default="default")

    status = models.CharField("Statut", max_length=20, choices=Status.choices, default=Status.NEW, db_index=True)
    time_limit_seconds = models.PositiveIntegerField("Limite de Temps Totale (secondes)", default=10800)
    uptime_used_seconds = models.PositiveIntegerField("Temps Déjà Consommé (secondes)", default=0)

    price = models.DecimalField("Prix de Vente (FCFA)", max_digits=10, decimal_places=2, default=Decimal("100.00"))
    comment = models.CharField("Commentaire", max_length=200, blank=True)

    first_login_at = models.DateTimeField("Première Connexion", null=True, blank=True)
    last_login_at = models.DateTimeField("Dernière Activité", null=True, blank=True)
    expires_at = models.DateTimeField("Date d'Expiration Finale", null=True, blank=True)

    mac_address = models.CharField("Adresse MAC Client", max_length=32, blank=True, default="")
    ip_address = models.GenericIPAddressField("Dernière IP Assignée", null=True, blank=True)
    bytes_in = models.BigIntegerField("Octets Téléchargés (Download)", default=0)
    bytes_out = models.BigIntegerField("Octets Envoyés (Upload)", default=0)

    created_at = models.DateTimeField("Date de Création", auto_now_add=True)
    updated_at = models.DateTimeField("Dernière Mise à Jour", auto_now=True)

    class Meta:
        verbose_name = "Ticket Hotspot SaaS"
        verbose_name_plural = "Tickets Hotspot SaaS"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["code", "status"]),
            models.Index(fields=["router", "status"]),
        ]

    def __str__(self):
        return f"Ticket {self.code} ({self.status})"

    @property
    def remaining_seconds(self) -> int:
        if self.time_limit_seconds <= 0:
            return 0
        rem = self.time_limit_seconds - self.uptime_used_seconds
        # Validité calendaire continue absolue : le compte à rebours expire irrévocablement à expires_at
        if self.expires_at:
            now = timezone.now()
            if now >= self.expires_at:
                return 0
            time_until_expiry = int((self.expires_at - now).total_seconds())
            return max(0, min(rem, time_until_expiry))
        return max(0, rem)

    @classmethod
    def parse_time_limit_to_seconds(cls, time_str: str) -> int:
        """Convertit '3h', '24h', '7d', '30m' en secondes."""
        if not time_str:
            return 3600
        import re
        total = 0
        matches = re.findall(r"(\d+)\s*([dhms])", time_str.lower())
        if not matches:
            try:
                return int(time_str) * 3600
            except ValueError:
                return 3600
        for val, unit in matches:
            num = int(val)
            if unit == "d":
                total += num * 86400
            elif unit == "h":
                total += num * 3600
            elif unit == "m":
                total += num * 60
            elif unit == "s":
                total += num
        return total if total > 0 else 3600


class CloudHotspotProfile(models.Model):
    """
    Profil de connexion / forfait Hotspot Cloud centralisé.
    Pilote les attributs RADIUS (Mikrotik-Rate-Limit, Session-Timeout) et les prix de vente en FCFA.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    router = models.ForeignKey(Router, on_delete=models.CASCADE, related_name="cloud_profiles")
    name = models.CharField("Nom du Forfait", max_length=100)
    price = models.DecimalField("Prix de Vente (FCFA)", max_digits=10, decimal_places=0, default=100)
    rate_limit = models.CharField("Limite de Débit", max_length=50, blank=True, default="2M/2M")
    session_timeout = models.CharField("Durée de Connexion", max_length=50, default="1h")
    session_timeout_seconds = models.PositiveIntegerField("Durée en Secondes", default=3600)
    shared_users = models.PositiveIntegerField("Appareils en Simultané", default=1)
    is_active = models.BooleanField("Actif (Disponible à la vente)", default=True)
    comment = models.CharField("Description / Libellé", max_length=200, blank=True, default="")
    created_at = models.DateTimeField("Date de Création", auto_now_add=True)
    updated_at = models.DateTimeField("Dernière Mise à Jour", auto_now=True)

    class Meta:
        verbose_name = "Profil Hotspot Cloud"
        verbose_name_plural = "Profils Hotspot Cloud"
        unique_together = [("router", "name")]
        ordering = ["price", "created_at"]

    def __str__(self):
        return f"{self.name} - {self.price} FCFA ({self.session_timeout})"

    def save(self, *args, **kwargs):
        if self.session_timeout:
            self.session_timeout_seconds = HotspotTicket.parse_time_limit_to_seconds(self.session_timeout)
        super().save(*args, **kwargs)

