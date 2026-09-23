import hashlib
import hmac
import logging
import struct
from datetime import timedelta
from typing import Any, Dict, Optional, Tuple
from django.conf import settings
from django.core.cache import cache
from django.utils import timezone
from apps.routers.models import HotspotBatch, HotspotTicket, Router

logger = logging.getLogger("radius_engine")


def record_radius_log(
    router_id: Any,
    message: str,
    status_type: str = "info",
    user: str = "",
    ip: str = "",
    mac: str = "",
) -> None:
    """Enregistre un événement RADIUS temps réel dans un buffer glissant (50 logs) accessible par l'API /logs/."""
    if not router_id:
        return
    cache_key = f"router_radius_logs_{router_id}"
    logs = cache.get(cache_key) or []
    entry = {
        "id": f"rad-{int(timezone.now().timestamp() * 1000)}",
        "time": timezone.now().strftime("%H:%M:%S"),
        "topics": "radius,cloud",
        "category": "radius",
        "message": f"[Cloud RADIUS] {message}",
        "user": user or "-",
        "ip": ip or "-",
        "mac": mac or "-",
        "status_type": status_type,
    }
    logs.insert(0, entry)
    if len(logs) > 50:
        logs = logs[:50]
    cache.set(cache_key, logs, timeout=86400)

# Constantes RFC 2865 & 2866
RADIUS_CODE_ACCESS_REQUEST = 1
RADIUS_CODE_ACCESS_ACCEPT = 2
RADIUS_CODE_ACCESS_REJECT = 3
RADIUS_CODE_ACCOUNTING_REQUEST = 4
RADIUS_CODE_ACCOUNTING_RESPONSE = 5

# Types d'attributs standards
ATTR_USER_NAME = 1
ATTR_USER_PASSWORD = 2
ATTR_CHAP_PASSWORD = 3
ATTR_NAS_IP_ADDRESS = 4
ATTR_NAS_PORT = 5
ATTR_SESSION_TIMEOUT = 27
ATTR_CALLING_STATION_ID = 31
ATTR_NAS_IDENTIFIER = 32
ATTR_ACCT_STATUS_TYPE = 40
ATTR_ACCT_INPUT_OCTETS = 42
ATTR_ACCT_OUTPUT_OCTETS = 43
ATTR_ACCT_SESSION_ID = 44
ATTR_ACCT_SESSION_TIME = 46
ATTR_CHAP_CHALLENGE = 60
ATTR_MESSAGE_AUTHENTICATOR = 80
ATTR_VENDOR_SPECIFIC = 26

# MikroTik Vendor ID
MIKROTIK_VENDOR_ID = 14988
MIKROTIK_ATTR_RATE_LIMIT = 8


def decrypt_radius_password(encrypted_pw: bytes, request_authenticator: bytes, shared_secret: bytes) -> str:
    """Déchiffre le mot de passe RADIUS selon la RFC 2865 Section 5.2."""
    if len(encrypted_pw) < 16 or len(encrypted_pw) % 16 != 0:
        return ""

    plain_bytes = bytearray()
    last_chunk = request_authenticator

    for i in range(0, len(encrypted_pw), 16):
        cipher_chunk = encrypted_pw[i : i + 16]
        b = hashlib.md5(shared_secret + last_chunk).digest()
        p = bytes(c ^ k for c, k in zip(cipher_chunk, b))
        plain_bytes.extend(p)
        last_chunk = cipher_chunk

    # Élimine le padding null byte à la fin
    return plain_bytes.split(b"\x00")[0].decode("utf-8", errors="ignore")


class RadiusEngineService:
    """Moteur de logique métier pour l'authentification et l'accounting RADIUS."""

    @classmethod
    def authenticate(
        cls,
        username: str,
        password: str,
        nas_ip: str,
        mac_address: str = "",
    ) -> Tuple[bool, Dict[str, Any], str]:
        """
        Authentifie un ticket pour le portail captif MikroTik.
        Retourne (is_accepted, attributes, message).
        """
        username = username.strip()
        password = password.strip()

        if not username:
            return False, {}, "Identifiant manquant"

        # Recherche rapide en base indexée
        ticket = (
            HotspotTicket.objects.select_related("batch", "router")
            .filter(code__iexact=username)
            .first()
        )

        if not ticket:
            logger.info(f"RADIUS: Ticket inconnu '{username}' depuis NAS {nas_ip}")
            # Log global si NAS IP correspond à un routeur
            record_radius_log(None, f"Tentative d'accès avec ticket inconnu '{username}' depuis NAS {nas_ip}", "error", user=username, ip=nas_ip)
            return False, {}, "Code ticket inexistant"

        if ticket.status == HotspotTicket.Status.REVOKED:
            record_radius_log(str(ticket.router_id), f"Accès refusé: Ticket '{username}' révoqué", "error", user=username, ip=nas_ip, mac=mac_address)
            return False, {}, "Ticket révoqué"

        if ticket.status == HotspotTicket.Status.EXPIRED or ticket.remaining_seconds <= 0:
            if ticket.status != HotspotTicket.Status.EXPIRED:
                ticket.status = HotspotTicket.Status.EXPIRED
                ticket.save(update_fields=["status", "updated_at"])
            record_radius_log(str(ticket.router_id), f"Accès refusé: Forfait épuisé pour le ticket '{username}'", "error", user=username, ip=nas_ip, mac=mac_address)
            return False, {}, "Durée du forfait épuisée"

        # Vérification du mot de passe
        batch = ticket.batch
        is_valid_pass = False

        if batch.auth_mode == HotspotBatch.AuthMode.SINGLE:
            # Mode PIN / 1 champ : Le code fait office de mot de passe
            is_valid_pass = (password == username) or (password == ticket.password) or (not password)
        else:
            # Mode Dual : Mot de passe strict requis
            is_valid_pass = password == ticket.password

        if not is_valid_pass:
            logger.warning(f"RADIUS: Échec mot de passe pour le ticket '{username}'")
            record_radius_log(str(ticket.router_id), f"Échec de mot de passe pour le ticket '{username}'", "error", user=username, ip=nas_ip, mac=mac_address)
            return False, {}, "Mot de passe incorrect"

        # Première connexion : activation du ticket
        now = timezone.now()
        fields_to_update = ["last_login_at", "updated_at"]

        if ticket.status == HotspotTicket.Status.NEW:
            ticket.status = HotspotTicket.Status.ACTIVE
            ticket.first_login_at = now
            if not ticket.expires_at:
                ticket.expires_at = now + timedelta(seconds=ticket.time_limit_seconds)
            fields_to_update.extend(["status", "first_login_at", "expires_at"])

        if mac_address:
            ticket.mac_address = mac_address
            fields_to_update.append("mac_address")

        ticket.last_login_at = now
        ticket.save(update_fields=list(set(fields_to_update)))

        # Préparation des attributs RADIUS de session
        remaining_timeout = ticket.remaining_seconds
        attributes = {
            "Session-Timeout": remaining_timeout,
        }

        # Débit selon le forfait Cloud Hotspot (dynamique)
        from apps.routers.models import CloudHotspotProfile
        cloud_prof = CloudHotspotProfile.objects.filter(
            router=ticket.router, name__iexact=ticket.profile_name
        ).first()
        if cloud_prof and cloud_prof.rate_limit and cloud_prof.rate_limit.lower() != "illimité":
            attributes["Mikrotik-Rate-Limit"] = cloud_prof.rate_limit
        else:
            attributes["Mikrotik-Rate-Limit"] = "5M/10M"

        logger.info(
            f"RADIUS ACCEPT: Ticket '{username}' ({ticket.profile_name}) validé pour {remaining_timeout}s sur NAS {nas_ip}"
        )
        record_radius_log(
            str(ticket.router_id),
            f"Authentification réussie pour le ticket '{username}' (Profil: {ticket.profile_name}, Durée restante: {remaining_timeout}s)",
            "success",
            user=username,
            ip=nas_ip,
            mac=mac_address,
        )
        return True, attributes, "Accès accordé"

    @classmethod
    def accounting(
        cls,
        username: str,
        status_type: int,
        session_time: int,
        input_octets: int,
        output_octets: int,
        mac_address: str = "",
    ) -> bool:
        """
        Traite un paquet d'accounting (Start=1, Stop=2, Interim=3).
        Actualise le temps consommé et la data en direct dans PostgreSQL.
        """
        username = username.strip()
        if not username:
            return False

        ticket = HotspotTicket.objects.select_related("router").filter(code__iexact=username).first()
        if not ticket:
            return False

        # Mise à jour de la consommation (RFC 2866 : les octets de session sont cumulatifs)
        ticket.uptime_used_seconds = min(ticket.time_limit_seconds, max(ticket.uptime_used_seconds, session_time))
        if input_octets > 0:
            ticket.bytes_in = max(ticket.bytes_in, input_octets)
        if output_octets > 0:
            ticket.bytes_out = max(ticket.bytes_out, output_octets)
        ticket.last_login_at = timezone.now()

        fields_to_update = ["uptime_used_seconds", "bytes_in", "bytes_out", "last_login_at", "updated_at"]

        if mac_address and not ticket.mac_address:
            ticket.mac_address = mac_address
            fields_to_update.append("mac_address")

        # Si le temps est complètement épuisé
        if ticket.remaining_seconds <= 0:
            ticket.status = HotspotTicket.Status.EXPIRED
            fields_to_update.append("status")

        ticket.save(update_fields=fields_to_update)

        # Journalisation temps réel selon le type d'accounting
        router_id_str = str(ticket.router_id)
        if status_type == 1:
            record_radius_log(router_id_str, f"Session client démarrée pour le ticket '{username}'", "info", user=username, mac=mac_address)
        elif status_type == 2:
            record_radius_log(
                router_id_str,
                f"Session client fermée pour le ticket '{username}' (Uptime: {session_time}s, In: {ticket.bytes_in} B, Out: {ticket.bytes_out} B)",
                "warning",
                user=username,
                mac=mac_address,
            )
        elif status_type == 3:
            record_radius_log(
                router_id_str,
                f"Actualisation de session pour '{username}' (Uptime: {session_time}s, Trafic: {ticket.bytes_in + ticket.bytes_out} B)",
                "info",
                user=username,
                mac=mac_address,
            )

        return True

    @classmethod
    def generate_batch_in_db(
        cls,
        router: Router,
        count: int = 10,
        auth_mode: str = "single",
        profile_name: str = "default",
        time_limit: str = "3h",
        prefix: str = "",
        code_length: int = 6,
        code_format: str = "numeric",
        price: int = 100,
        comment: str = "",
    ) -> Tuple[HotspotBatch, list]:
        """
        Génère un lot massif de tickets directement dans PostgreSQL via bulk_create.
        Performance : < 50ms pour 1000 tickets, sans latence API RouterOS.
        """
        import random
        import datetime
        from django.db import transaction

        count = min(max(int(count), 1), 1000)
        valid_length = code_length if code_length in [4, 6, 8] else 6

        if code_format == "alpha_lower":
            chars = "23456789abcdefghkmnpqrstuvwxyz"
            pass_chars = "23456789abcdefghkmnpqrstuvwxyz"
        elif code_format == "alpha_upper":
            chars = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ"
            pass_chars = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ"
        else:  # "numeric" par défaut
            chars = "0123456789"
            pass_chars = "0123456789"

        time_limit_secs = HotspotTicket.parse_time_limit_to_seconds(time_limit)
        today_str = datetime.date.today().strftime("%Y-%m-%d")
        wifi_zone = (router.hotspot_name or router.name).strip()
        duration_label = (time_limit or "Illimitée").strip()

        has_custom_comment = bool(comment and comment.strip())
        custom_base = comment.strip() if has_custom_comment else ""

        with transaction.atomic():
            batch = HotspotBatch.objects.create(
                router=router,
                name=f"Lot {today_str} ({profile_name})",
                profile_name=profile_name,
                auth_mode=auth_mode,
                code_length=valid_length,
                time_limit=duration_label,
                price=price,
                count=count,
                comment=custom_base or f"ticket : {wifi_zone} : {today_str} : {duration_label}",
            )

            # Ensemble pour garantir l'unicité stricte au sein du lot
            existing_codes = set(HotspotTicket.objects.values_list("code", flat=True))
            tickets_to_create = []

            for idx in range(1, count + 1):
                # Génération de code non collisionnel
                while True:
                    rand_str = "".join(random.choices(chars, k=valid_length))
                    code = f"{prefix}{rand_str}" if prefix else rand_str
                    if code not in existing_codes:
                        existing_codes.add(code)
                        break

                if auth_mode == "dual":
                    password = "".join(random.choices(pass_chars, k=valid_length if valid_length <= 6 else 4))
                else:
                    password = code

                if has_custom_comment:
                    t_comment = f"{custom_base} | {today_str} | {price} FCFA"
                else:
                    seq_str = f"{idx:05d}"
                    t_comment = f"ticket : {wifi_zone} : {today_str} : {duration_label} : {seq_str}"

                tickets_to_create.append(
                    HotspotTicket(
                        batch=batch,
                        router=router,
                        code=code,
                        password=password,
                        profile_name=profile_name,
                        status=HotspotTicket.Status.NEW,
                        time_limit_seconds=time_limit_secs,
                        uptime_used_seconds=0,
                        price=price,
                        comment=t_comment,
                    )
                )

            # Insertion vectorielle groupée ultra-performante
            created = HotspotTicket.objects.bulk_create(tickets_to_create, batch_size=1000)

        logger.info(f"RADIUS ENGINE: {len(created)} tickets générés en base pour le routeur '{router.name}'")
        return batch, created

    @staticmethod
    def generate_mikrotik_radius_setup_script(router: Router, secret: str = "tikzone-radius-secret-2026") -> str:
        """Génère la commande RouterOS pour raccorder le routeur au moteur RADIUS Cloud TikZone."""
        endpoint_host = getattr(settings, "RADIUS_SERVER_IP", "172.29.88.1")
        return (
            f"/radius remove [find comment=\"TikZone RADIUS\"]\n"
            f"/radius remove [find comment=\"Mikroot RADIUS\"]\n"
            f"/radius add service=hotspot address={endpoint_host} secret=\"{secret}\" authentication-port=1812 accounting-port=1813 timeout=3000ms require-message-auth=no comment=\"TikZone RADIUS\"\n"
            f"/ip hotspot profile set [find] use-radius=yes radius-accounting=yes radius-interim-update=1m login-by=http-pap,mac-cookie\n"
            f"/radius incoming set accept=yes port=3799\n"
            f"/system logging remove [find comment=\"TikZone RADIUS Logs\"]\n"
            f"/system logging add topics=radius action=memory comment=\"TikZone RADIUS Logs\" disabled=no\n"
        )
