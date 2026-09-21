import asyncio
import hashlib
import logging
import struct
from typing import Dict, Tuple
from asgiref.sync import sync_to_async
from django.conf import settings
from .radius_engine import (
    ATTR_ACCT_INPUT_OCTETS,
    ATTR_ACCT_OUTPUT_OCTETS,
    ATTR_ACCT_SESSION_TIME,
    ATTR_ACCT_STATUS_TYPE,
    ATTR_CALLING_STATION_ID,
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
) -> bytes:
    """Construit un paquet RADIUS de réponse selon la RFC 2865 / 2866."""
    length = 20 + len(attributes)
    # Header sans authenticator (20 octets avec 16 zéros)
    header_base = struct.pack("!BBH", code, identifier, length)
    # Authenticator de réponse = MD5(Code + ID + Length + Request-Auth + Attributes + Secret)
    response_auth = hashlib.md5(header_base + request_authenticator + attributes + secret).digest()
    return header_base + response_auth + attributes


class RadiusAuthProtocol(asyncio.DatagramProtocol):
    """Serveur UDP pour l'authentification RADIUS (Port 1812)."""

    def __init__(self, secret: str = "tikzone-radius-secret"):
        self.secret = secret.encode("ascii")
        self.transport = None

    def connection_made(self, transport):
        self.transport = transport
        logger.info("Serveur RADIUS Authentification démarré sur le port 1812 UDP.")

    def datagram_received(self, data: bytes, addr: Tuple[str, int]):
        asyncio.create_task(self.handle_packet(data, addr))

    async def handle_packet(self, data: bytes, addr: Tuple[str, int]):
        if len(data) < 20:
            return

        code, identifier, length = struct.unpack("!BBH", data[:4])
        if code != RADIUS_CODE_ACCESS_REQUEST:
            return

        request_authenticator = data[4:20]
        attributes_raw = data[20:length]
        attrs = parse_radius_attributes(attributes_raw)

        # Extraction des attributs
        username_bytes = attrs.get(ATTR_USER_NAME, [b""])[0]
        username = username_bytes.decode("utf-8", errors="ignore")

        encrypted_pass = attrs.get(ATTR_USER_PASSWORD, [b""])[0]
        password = decrypt_radius_password(encrypted_pass, request_authenticator, self.secret)

        calling_station = attrs.get(ATTR_CALLING_STATION_ID, [b""])[0]
        mac_address = calling_station.decode("ascii", errors="ignore")

        nas_ip = addr[0]

        # Appel asynchrone du service d'authentification
        is_accepted, resp_attrs, reason = await sync_to_async(RadiusEngineService.authenticate)(
            username=username,
            password=password,
            nas_ip=nas_ip,
            mac_address=mac_address,
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
                # Sub-TLV : type(1) + len(1) + value
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
        )

        if self.transport:
            self.transport.sendto(response_packet, addr)


class RadiusAcctProtocol(asyncio.DatagramProtocol):
    """Serveur UDP pour l'Accounting RADIUS (Port 1813)."""

    def __init__(self, secret: str = "tikzone-radius-secret"):
        self.secret = secret.encode("ascii")
        self.transport = None

    def connection_made(self, transport):
        self.transport = transport
        logger.info("Serveur RADIUS Accounting démarré sur le port 1813 UDP.")

    def datagram_received(self, data: bytes, addr: Tuple[str, int]):
        asyncio.create_task(self.handle_packet(data, addr))

    async def handle_packet(self, data: bytes, addr: Tuple[str, int]):
        if len(data) < 20:
            return

        code, identifier, length = struct.unpack("!BBH", data[:4])
        if code != RADIUS_CODE_ACCOUNTING_REQUEST:
            return

        request_authenticator = data[4:20]
        attributes_raw = data[20:length]
        attrs = parse_radius_attributes(attributes_raw)

        username = attrs.get(ATTR_USER_NAME, [b""])[0].decode("utf-8", errors="ignore")

        status_type = 0
        if ATTR_ACCT_STATUS_TYPE in attrs:
            val = attrs[ATTR_ACCT_STATUS_TYPE][0]
            if len(val) == 4:
                status_type = struct.unpack("!I", val)[0]

        session_time = 0
        if ATTR_ACCT_SESSION_TIME in attrs:
            val = attrs[ATTR_ACCT_SESSION_TIME][0]
            if len(val) == 4:
                session_time = struct.unpack("!I", val)[0]

        in_octets = 0
        if ATTR_ACCT_INPUT_OCTETS in attrs:
            val = attrs[ATTR_ACCT_INPUT_OCTETS][0]
            if len(val) == 4:
                in_octets = struct.unpack("!I", val)[0]

        out_octets = 0
        if ATTR_ACCT_OUTPUT_OCTETS in attrs:
            val = attrs[ATTR_ACCT_OUTPUT_OCTETS][0]
            if len(val) == 4:
                out_octets = struct.unpack("!I", val)[0]

        calling_station = attrs.get(ATTR_CALLING_STATION_ID, [b""])[0]
        mac_address = calling_station.decode("ascii", errors="ignore")

        # Mise à jour en tâche de fond
        await sync_to_async(RadiusEngineService.accounting)(
            username=username,
            status_type=status_type,
            session_time=session_time,
            input_octets=in_octets,
            output_octets=out_octets,
            mac_address=mac_address,
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


async def start_radius_services(host: str = "0.0.0.0", auth_port: int = 1812, acct_port: int = 1813, secret: str = "tikzone-radius-secret"):
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
