import asyncio
import hashlib
import hmac
import logging
import struct
from datetime import datetime
from typing import Dict, Tuple
from asgiref.sync import sync_to_async
from django.conf import settings
from .radius_engine import (
    ATTR_ACCT_INPUT_OCTETS,
    ATTR_ACCT_OUTPUT_OCTETS,
    ATTR_ACCT_SESSION_TIME,
    ATTR_ACCT_STATUS_TYPE,
    ATTR_CALLING_STATION_ID,
    ATTR_CHAP_PASSWORD,
    ATTR_FRAMED_IP_ADDRESS,
    ATTR_MESSAGE_AUTHENTICATOR,
    ATTR_NAS_IP_ADDRESS,
    ATTR_SESSION_TIMEOUT,
    ATTR_USER_NAME,
    ATTR_USER_PASSWORD,
    ATTR_VENDOR_SPECIFIC,
    MIKROTIK_ATTR_RATE_LIMIT,
    MIKROTIK_VENDOR_ID,
    RADIUS_CODE_ACCESS_ACCEPT,
    RADIUS_CODE_ACCESS_REJECT,
    RADIUS_CODE_ACCESS_REQUEST,
    RADIUS_CODE_ACCOUNTING_REQUEST,
    RADIUS_CODE_ACCOUNTING_RESPONSE,
    RadiusEngineService,
    decrypt_radius_password,
)

logger = logging.getLogger("radius_server")


def parse_radius_attributes(payload: bytes) -> Dict[int, list]:
    """Extrait les TLVs (Type-Length-Value) d'un paquet RADIUS."""
    attrs: Dict[int, list] = {}
    pos = 0
    while pos + 2 <= len(payload):
        attr_type = payload[pos]
        attr_len = payload[pos + 1]
        if attr_len < 2 or pos + attr_len > len(payload):
            break
        val = payload[pos + 2 : pos + attr_len]
        if attr_type not in attrs:
            attrs[attr_type] = []
        attrs[attr_type].append(val)
        pos += attr_len
    return attrs


def build_radius_response(
    code: int,
    identifier: int,
    request_authenticator: bytes,
    attributes: bytes,
    secret: bytes,
    include_message_auth: bool = False,
) -> bytes:
    """
    Construit un paquet RADIUS de réponse selon la RFC 2865 / 2866.
    Supporte également l'attribut Message-Authenticator (RFC 2869 / RFC 3579).
    """
    final_attrs = bytearray(attributes)

    if include_message_auth:
        # Message-Authenticator (Type 80, Len 18, 16 octets HMAC-MD5 initialisés à 0)
        msg_auth_placeholder = struct.pack("!BB", ATTR_MESSAGE_AUTHENTICATOR, 18) + (b"\x00" * 16)
        final_attrs.extend(msg_auth_placeholder)

    length = 20 + len(final_attrs)
    header_base = struct.pack("!BBH", code, identifier, length)

    if include_message_auth:
        # Calcul HMAC-MD5 sur (Code + ID + Length + Request-Auth + Attributes + Secret)
        packet_for_hmac = header_base + request_authenticator + bytes(final_attrs)
        calc_hmac = hmac.new(secret, packet_for_hmac, hashlib.md5).digest()
        # Remplacement des 16 octets zéros par le HMAC calculé
        final_attrs[-16:] = calc_hmac

    # Authenticator de réponse = MD5(Header + Request-Auth + Final-Attributes + Secret)
    response_auth = hashlib.md5(header_base + request_authenticator + bytes(final_attrs) + secret).digest()
    return header_base + response_auth + bytes(final_attrs)


class RadiusAuthProtocol(asyncio.DatagramProtocol):
    """Serveur UDP pour l'authentification RADIUS (Port 1812)."""

    def __init__(self, secret: str = "tikzone-radius-secret-2026"):
        self.secret = secret.encode("ascii")
        self.transport = None

    def connection_made(self, transport):
        self.transport = transport
        now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        print(f"[{now_str}] [RADIUS AUTH] Serveur UDP prêt et à l'écoute sur le port 1812.", flush=True)

    def datagram_received(self, data: bytes, addr: Tuple[str, int]):
        asyncio.create_task(self.handle_packet(data, addr))

    async def handle_packet(self, data: bytes, addr: Tuple[str, int]):
        identifier = 0
        request_authenticator = b"\x00" * 16
        now_str = datetime.now().strftime("%H:%M:%S")

        try:
            if len(data) < 20:
                print(f"[{now_str}] [RADIUS AUTH] Paquet rejeté de {addr[0]}:{addr[1]} (taille < 20 octets)", flush=True)
                return

            code, identifier, length = struct.unpack("!BBH", data[:4])
            if code != RADIUS_CODE_ACCESS_REQUEST:
                return

            request_authenticator = data[4:20]
            attributes_raw = data[20:length]
            attrs = parse_radius_attributes(attributes_raw)

            # Détection de l'exigence Message-Authenticator
            has_message_auth = ATTR_MESSAGE_AUTHENTICATOR in attrs

            # Extraction des attributs
            username_bytes = attrs.get(ATTR_USER_NAME, [b""])[0]
            username = username_bytes.decode("utf-8", errors="ignore").strip()

            encrypted_pass = attrs.get(ATTR_USER_PASSWORD, [b""])[0]
            password = decrypt_radius_password(encrypted_pass, request_authenticator, self.secret)

            # Détection éventuelle de tentative CHAP
            is_chap = ATTR_CHAP_PASSWORD in attrs

            calling_station = attrs.get(ATTR_CALLING_STATION_ID, [b""])[0]
            mac_address = calling_station.decode("ascii", errors="ignore").strip()
            nas_ip = addr[0]

            # Extraction Framed-IP-Address (RFC 2865 Type 8)
            ip_raw = attrs.get(ATTR_FRAMED_IP_ADDRESS, [b""])[0]
            client_ip = ""
            if len(ip_raw) == 4:
                import socket
                try:
                    client_ip = socket.inet_ntoa(ip_raw)
                except Exception:
                    client_ip = ""

            print(
                f"[{now_str}] [RADIUS REQ] Id={identifier} From={nas_ip}:{addr[1]} User='{username}' IP='{client_ip}' MAC='{mac_address}' CHAP={is_chap} MsgAuth={has_message_auth}",
                flush=True,
            )

            # Appel asynchrone du service d'authentification métier
            is_accepted, resp_attrs, reason = await sync_to_async(RadiusEngineService.authenticate)(
                username=username,
                password=password,
                nas_ip=nas_ip,
                mac_address=mac_address,
                ip_address=client_ip,
            )

            resp_code = RADIUS_CODE_ACCESS_ACCEPT if is_accepted else RADIUS_CODE_ACCESS_REJECT

            # Construction des attributs de retour
            out_attrs_bytes = bytearray()
            if is_accepted:
                # Session-Timeout (RFC 2865 Type 27)
                timeout = resp_attrs.get("Session-Timeout", 3600)
                out_attrs_bytes.extend(struct.pack("!BBI", ATTR_SESSION_TIMEOUT, 6, timeout))

                # Mikrotik-Rate-Limit (Vendor ID 14988, Sub-type 8)
                rate_limit = resp_attrs.get("Mikrotik-Rate-Limit")
                if rate_limit:
                    rl_bytes = rate_limit.encode("ascii")
                    sub_tlv = struct.pack("!BB", MIKROTIK_ATTR_RATE_LIMIT, len(rl_bytes) + 2) + rl_bytes
                    vsa_val = struct.pack("!I", MIKROTIK_VENDOR_ID) + sub_tlv
                    vsa_tlv = struct.pack("!BB", ATTR_VENDOR_SPECIFIC, len(vsa_val) + 2) + vsa_val
                    out_attrs_bytes.extend(vsa_tlv)

            response_packet = build_radius_response(
                code=resp_code,
                identifier=identifier,
                request_authenticator=request_authenticator,
                attributes=bytes(out_attrs_bytes),
                secret=self.secret,
                include_message_auth=has_message_auth,
            )

            if self.transport:
                self.transport.sendto(response_packet, addr)

            status_label = "ACCEPT" if is_accepted else "REJECT"
            print(
                f"[{now_str}] [RADIUS RESP] Id={identifier} To={nas_ip}:{addr[1]} Status={status_label} ({reason})",
                flush=True,
            )

        except Exception as exc:
            logger.exception(f"RADIUS AUTH EXCEPTION: {exc}")
            print(f"[{now_str}] [RADIUS ERROR] Id={identifier} Error: {exc}", flush=True)
            # Envoi d'un Access-Reject immédiat en cas d'erreur inattendue
            try:
                if self.transport and identifier:
                    reject_packet = build_radius_response(
                        code=RADIUS_CODE_ACCESS_REJECT,
                        identifier=identifier,
                        request_authenticator=request_authenticator,
                        attributes=b"",
                        secret=self.secret,
                    )
                    self.transport.sendto(reject_packet, addr)
            except Exception:
                pass


class RadiusAcctProtocol(asyncio.DatagramProtocol):
    """Serveur UDP pour l'Accounting RADIUS (Port 1813)."""

    def __init__(self, secret: str = "tikzone-radius-secret-2026"):
        self.secret = secret.encode("ascii")
        self.transport = None

    def connection_made(self, transport):
        self.transport = transport
        now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        print(f"[{now_str}] [RADIUS ACCT] Serveur UDP prêt et à l'écoute sur le port 1813.", flush=True)

    def datagram_received(self, data: bytes, addr: Tuple[str, int]):
        asyncio.create_task(self.handle_packet(data, addr))

    async def handle_packet(self, data: bytes, addr: Tuple[str, int]):
        identifier = 0
        now_str = datetime.now().strftime("%H:%M:%S")

        try:
            if len(data) < 20:
                return

            code, identifier, length = struct.unpack("!BBH", data[:4])
            if code != RADIUS_CODE_ACCOUNTING_REQUEST:
                return

            request_authenticator = data[4:20]
            attributes_raw = data[20:length]
            attrs = parse_radius_attributes(attributes_raw)

            username = attrs.get(ATTR_USER_NAME, [b""])[0].decode("utf-8", errors="ignore").strip()

            # Statut de la session
            status_raw = attrs.get(ATTR_ACCT_STATUS_TYPE, [b"\x00\x00\x00\x00"])[0]
            status_type = struct.unpack("!I", status_raw)[0] if len(status_raw) == 4 else 0

            # Données de consommation
            time_raw = attrs.get(ATTR_ACCT_SESSION_TIME, [b"\x00\x00\x00\x00"])[0]
            session_time = struct.unpack("!I", time_raw)[0] if len(time_raw) == 4 else 0

            in_raw = attrs.get(ATTR_ACCT_INPUT_OCTETS, [b"\x00\x00\x00\x00"])[0]
            in_octets = struct.unpack("!I", in_raw)[0] if len(in_raw) == 4 else 0

            out_raw = attrs.get(ATTR_ACCT_OUTPUT_OCTETS, [b"\x00\x00\x00\x00"])[0]
            out_octets = struct.unpack("!I", out_raw)[0] if len(out_raw) == 4 else 0

            calling_station = attrs.get(ATTR_CALLING_STATION_ID, [b""])[0]
            mac_address = calling_station.decode("ascii", errors="ignore").strip()

            # Extraction Framed-IP-Address (RFC 2866 Type 8)
            ip_raw = attrs.get(ATTR_FRAMED_IP_ADDRESS, [b""])[0]
            client_ip = ""
            if len(ip_raw) == 4:
                import socket
                try:
                    client_ip = socket.inet_ntoa(ip_raw)
                except Exception:
                    client_ip = ""

            print(
                f"[{now_str}] [RADIUS ACCT] Id={identifier} User='{username}' IP='{client_ip}' StatusType={status_type} Uptime={session_time}s In={in_octets}B Out={out_octets}B MAC={mac_address}",
                flush=True,
            )

            # Mise à jour en base de données
            await sync_to_async(RadiusEngineService.accounting)(
                username=username,
                status_type=status_type,
                session_time=session_time,
                input_octets=in_octets,
                output_octets=out_octets,
                mac_address=mac_address,
                ip_address=client_ip,
            )

            # Réponse Accounting-Response (Code 5)
            response_packet = build_radius_response(
                code=RADIUS_CODE_ACCOUNTING_RESPONSE,
                identifier=identifier,
                request_authenticator=request_authenticator,
                attributes=b"",
                secret=self.secret,
            )

            if self.transport:
                self.transport.sendto(response_packet, addr)

        except Exception as exc:
            logger.exception(f"RADIUS ACCT EXCEPTION: {exc}")
            print(f"[{now_str}] [RADIUS ACCT ERROR] Id={identifier} Error: {exc}", flush=True)


async def start_radius_services(host: str = "0.0.0.0", auth_port: int = 1812, acct_port: int = 1813, secret: str = "tikzone-radius-secret-2026"):
    """Lance les serveurs UDP d'authentification et d'accounting."""
    loop = asyncio.get_running_loop()

    auth_transport, _ = await loop.create_datagram_endpoint(
        lambda: RadiusAuthProtocol(secret=secret),
        local_addr=(host, auth_port),
    )

    acct_transport, _ = await loop.create_datagram_endpoint(
        lambda: RadiusAcctProtocol(secret=secret),
        local_addr=(host, acct_port),
    )

    logger.info(f"Serveur RADIUS opérationnel sur {host}:{auth_port} (Auth) et {host}:{acct_port} (Acct)")

    try:
        while True:
            await asyncio.sleep(3600)
    finally:
        auth_transport.close()
        acct_transport.close()
