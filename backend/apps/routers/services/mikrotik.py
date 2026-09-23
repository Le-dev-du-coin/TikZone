import logging
import socket
from typing import Any, Dict, List, Optional
import routeros_api
from django.conf import settings
from django.core.cache import cache
from apps.routers.models import Router

import re
from typing import Any, Dict, List, Optional, Tuple, Union

logger = logging.getLogger(__name__)


def parse_ros_duration(val: Any) -> int:
    """Convertit n'importe quelle durée MikroTik (ex: '01:23:45', '45m', '3h20m', '1d2h', '32s') en secondes entières."""
    if not val:
        return 0
    if isinstance(val, (int, float)):
        return int(val)
    val = str(val).strip()
    if not val or val == "-":
        return 0
    # Format hh:mm:ss ou mm:ss
    if ":" in val:
        parts = val.split(":")
        try:
            if len(parts) == 3:
                return int(parts[0]) * 3600 + int(parts[1]) * 60 + int(parts[2])
            elif len(parts) == 2:
                return int(parts[0]) * 60 + int(parts[1])
        except (ValueError, TypeError):
            pass
    # Format RouterOS standard : '1w2d3h4m5s'
    seconds = 0
    matches = re.findall(r"(\d+)\s*([wdhmsj])", val, re.IGNORECASE)
    if matches:
        unit_map = {"w": 604800, "d": 86400, "j": 86400, "h": 3600, "m": 60, "s": 1}
        for num, unit in matches:
            seconds += int(num) * unit_map.get(unit.lower(), 1)
        return seconds
    if val.isdigit():
        return int(val)
    return 0


def format_duration(seconds: Union[int, float, None]) -> str:
    """Formate des secondes de manière ergonomique et naturelle (ex: '5h 59m', '6h', '45m', '30s')."""
    if seconds is None or seconds <= 0:
        return "0s"
    seconds = int(seconds)
    days = seconds // 86400
    rem = seconds % 86400
    hours = rem // 3600
    rem = rem % 3600
    minutes = rem // 60
    secs = rem % 60

    if days > 0:
        return f"{days}j {hours}h" if hours > 0 else f"{days}j"
    if hours > 0:
        return f"{hours}h {minutes}m" if minutes > 0 else f"{hours}h"
    if minutes > 0:
        return f"{minutes}m {secs}s" if (secs > 0 and minutes < 5) else f"{minutes}m"
    return f"{secs}s"


def format_bytes_human(bytes_val: Any) -> str:
    """Formate une quantité d'octets en unité adaptée (B, Ko, Mo, Go)."""
    try:
        val = float(bytes_val or 0)
        if val <= 0:
            return "0 Mo"
        if val >= 1024 * 1024 * 1024:
            return f"{val / (1024 * 1024 * 1024):.2f} Go"
        elif val >= 1024 * 1024:
            return f"{val / (1024 * 1024):.1f} Mo"
        elif val >= 1024:
            return f"{val / 1024:.0f} Ko"
        return f"{int(val)} B"
    except (ValueError, TypeError):
        return "0 Mo"


class MikrotikService:
    """Service pour interagir directement avec l'API MikroTik RouterOS via le tunnel VPN."""

    @staticmethod
    def _format_bytes(bytes_str: Any) -> str:
        """Convertit un nombre d'octets en unité lisible."""
        return format_bytes_human(bytes_str)

    @classmethod
    def get_api_connection(cls, router: Router, timeout: float = 3.5):
        """Établit une connexion API RouterOS vers le routeur via son tunnel VPN avec Circuit Breaker tolérant."""
        vpn = getattr(router, "vpn_credential", None)
        if not vpn:
            raise ValueError(f"Le routeur '{router.name}' n'a pas d'identifiants VPN alloués.")

        # Circuit Breaker : Ne bloque que si 3 échecs consécutifs ont été enregistrés
        circuit_key = f"mikrotik_offline_cb_{router.id}"
        fail_count_key = f"mikrotik_fail_count_{router.id}"
        if cache.get(circuit_key):
            raise ConnectionError(
                f"Circuit breaker actif: Le routeur '{router.name}' est temporairement hors-ligne."
            )

        # Identifiants API RouterOS spécifiques au routeur (ou fallback instance/défaut)
        username = getattr(router, "api_user", "") or "admin"
        admin_password = getattr(router, "api_password", "")
        if admin_password is None:
            admin_password = getattr(router.mikhmon_instance, "admin_password", "") or ""

        target_host = vpn.assigned_ip
        target_port = 8728

        # Test d'ouverture de socket rapide
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        sock.settimeout(timeout)
        is_connected = False
        try:
            sock.connect((target_host, target_port))
            sock.close()
            is_connected = True
        except Exception:
            # Essai de secours sur le port public distant si configuré et différent
            if vpn.vpn_server and vpn.api_port and (vpn.vpn_server != target_host or vpn.api_port != target_port):
                target_host = vpn.vpn_server
                target_port = vpn.api_port
                try:
                    sock2 = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
                    sock2.settimeout(timeout)
                    sock2.connect((target_host, target_port))
                    sock2.close()
                    is_connected = True
                except Exception:
                    is_connected = False

        if not is_connected:
            # Incrémente le compteur d'échecs consécutifs
            fails = cache.get(fail_count_key, 0) + 1
            cache.set(fail_count_key, fails, timeout=30)
            if fails >= 3:
                cache.set(circuit_key, True, timeout=8)
            raise ConnectionError(
                f"Impossible de joindre le port API du routeur '{router.name}' ({target_host}:{target_port}) : Hôte injoignable."
            )

        # Si joignable, réinitialiser immédiatement les compteurs d'échec
        cache.delete(fail_count_key)
        cache.delete(circuit_key)

        api_pool = routeros_api.RouterOsApiPool(
            target_host,
            username=username,
            password=admin_password,
            port=target_port,
            plaintext_login=True,
        )
        return api_pool

    @classmethod
    def get_system_info(cls, router: Router) -> Dict[str, Any]:
        """Récupère les informations matérielles, charge CPU, mémoire et uptime (avec cache court 8s)."""
        cache_key = f"router_sysinfo_{router.id}"
        cached = cache.get(cache_key)
        if cached:
            return cached

        try:
            pool = cls.get_api_connection(router)
            api = pool.get_api()

            resource_res = api.get_resource("/system/resource").get()
            resource = resource_res[0] if resource_res else {}

            clock_res = api.get_resource("/system/clock").get()
            clock = clock_res[0] if clock_res else {}

            routerboard_res = api.get_resource("/system/routerboard").get()
            routerboard = routerboard_res[0] if routerboard_res else {}

            pool.disconnect()

            free_mem = int(resource.get("free-memory", 0))
            total_mem = int(resource.get("total-memory", 0))
            free_hdd = int(resource.get("free-hdd-space", 0))
            total_hdd = int(resource.get("total-hdd-space", 0))

            data = {
                "online": True,
                "system_date": clock.get("date", ""),
                "system_time": clock.get("time", ""),
                "time_zone": clock.get("time-zone-name", ""),
                "uptime": resource.get("uptime", ""),
                "board_name": resource.get("board-name", routerboard.get("model", "MikroTik")),
                "model": routerboard.get("model", resource.get("board-name", "RouterBOARD")),
                "routeros_version": resource.get("version", ""),
                "cpu_load": int(resource.get("cpu-load", 0)),
                "cpu_count": resource.get("cpu-count", 1),
                "free_memory": f"{free_mem / (1024 * 1024):.2f} Mio",
                "total_memory": f"{total_mem / (1024 * 1024):.2f} Mio",
                "memory_usage_pct": round((1 - (free_mem / total_mem)) * 100, 1) if total_mem else 0,
                "free_hdd": f"{free_hdd / (1024 * 1024):.2f} Mio",
                "total_hdd": f"{total_hdd / (1024 * 1024):.2f} Mio",
            }
            cache.set(cache_key, data, timeout=8)
            return data
        except Exception as e:
            logger.warning(f"Erreur télémétrie routeur {router.name}: {e}")
            return {
                "online": False,
                "error": str(e),
                "system_date": "-",
                "system_time": "-",
                "uptime": "-",
                "board_name": router.name,
                "model": "MikroTik",
                "routeros_version": "-",
                "cpu_load": 0,
                "free_memory": "-",
                "total_memory": "-",
                "free_hdd": "-",
                "total_hdd": "-",
            }

    @classmethod
    def get_hotspot_overview(cls, router: Router) -> Dict[str, Any]:
        """Récupère les indicateurs clés Hotspot (actifs, utilisateurs totaux, profils)."""
        overview_cache_key = f"router_hs_overview_{router.id}"
        cached_overview = cache.get(overview_cache_key)
        if cached_overview:
            return cached_overview

        try:
            pool = cls.get_api_connection(router)
            api = pool.get_api()

            active_users = api.get_resource("/ip/hotspot/active").get()

            # Compteur total des utilisateurs avec cache de 120s pour éviter d'extraire 3000+ users à chaque appel
            user_count_key = f"router_user_count_{router.id}"
            user_count = cache.get(user_count_key)
            if user_count is None:
                try:
                    users = api.get_resource("/ip/hotspot/user").get()
                    user_count = len(users)
                    cache.set(user_count_key, user_count, timeout=120)
                except Exception:
                    user_count = 0

            # Profils mis en cache 60s
            profiles_cache_key = f"router_profiles_{router.id}"
            profiles = cache.get(profiles_cache_key)
            if profiles is None:
                try:
                    profiles_res = api.get_resource("/ip/hotspot/user/profile").get()
                    profiles = [
                        {
                            "id": p.get("id"),
                            "name": p.get("name", ""),
                            "rate_limit": p.get("rate-limit", "Illimité"),
                            "shared_users": p.get("shared-users", "1"),
                            "session_timeout": cls._extract_profile_expiration(p),
                            "price": cls._extract_profile_price(p),
                            "status_autorefresh": p.get("status-autorefresh", "-"),
                        }
                        for p in profiles_res
                    ]
                    cache.set(profiles_cache_key, profiles, timeout=60)
                except Exception:
                    profiles = []

            # Mapping des utilisateurs vers profil et limite-uptime
            user_prof_map = cache.get(f"router_user_prof_map_{router.id}")
            if user_prof_map is None:
                try:
                    raw_users_sample = api.get_resource("/ip/hotspot/user").get()
                    user_prof_map = {
                        u.get("name"): {
                            "profile": u.get("profile", "default"),
                            "limit_uptime": u.get("limit-uptime", ""),
                            "comment": u.get("comment", ""),
                        }
                        for u in raw_users_sample
                    }
                    cache.set(f"router_user_prof_map_{router.id}", user_prof_map, timeout=60)
                except Exception:
                    user_prof_map = {}

            pool.disconnect()

            prof_prices_map = {p.get("name"): p.get("price", "100 FCFA") for p in profiles}

            active_list = []
            for u in active_users[:100]:
                b_in = int(u.get("bytes-in", 0) or 0)
                b_out = int(u.get("bytes-out", 0) or 0)
                total_bytes = b_in + b_out
                s_left = u.get("session-time-left", "").strip()
                if not s_left or s_left in ["0s", "none", ""]:
                    s_left = "Illimité"

                username = u.get("user", "")
                user_info = (user_prof_map or {}).get(username, {})
                assigned_profile = u.get("profile") or user_info.get("profile", "default")
                limit_uptime = user_info.get("limit_uptime") or "-"
                price_tag = prof_prices_map.get(assigned_profile, "100 FCFA")

                active_list.append({
                    "id": u.get("id"),
                    "user": username,
                    "profile": assigned_profile,
                    "price": price_tag,
                    "limit_uptime": limit_uptime,
                    "address": u.get("address", ""),
                    "mac_address": u.get("mac-address", ""),
                    "uptime": u.get("uptime", "0s"),
                    "session_time_left": s_left,
                    "idle_time": u.get("idle-time", "-"),
                    "bytes_in": cls._format_bytes(b_in),
                    "bytes_out": cls._format_bytes(b_out),
                    "total_traffic": cls._format_bytes(total_bytes),
                    "total_bytes_raw": total_bytes,
                    "login_by": u.get("login-by", "http-chap"),
                })

            res = {
                "online": True,
                "active_count": len(active_users),
                "total_users_count": user_count,
                "profiles_count": len(profiles),
                "active_users": active_list,
            }
            cache.set(overview_cache_key, res, timeout=6)
            return res
        except Exception as e:
            return {
                "online": False,
                "active_count": 0,
                "total_users_count": 0,
                "profiles_count": 0,
                "active_users": [],
                "error": str(e),
            }

    @staticmethod
    def _parse_log_user_and_ip(msg: str, topics: str) -> tuple:
        """Extrait intelligemment l'utilisateur et l'adresse IP depuis un message de log RouterOS."""
        import re
        user = "-"
        ip = "-"

        # Motif 1: 'user admin logged in from 172.29.88.1 via api'
        m = re.search(r"user\s+([^\s]+)\s+logged\s+in\s+from\s+([0-9\.]+)", msg, re.IGNORECASE)
        if m:
            return m.group(1), m.group(2)

        # Motif 2: '25847856 (10.20.10.2): logged in' ou '37575942 (10.20.10.7): logged out'
        m = re.search(r"^([^\s\(]+)\s*\(([0-9\.]+)\)", msg)
        if m:
            return m.group(1), m.group(2)

        # Motif 3: Extraction d'une adresse IP dans le message
        m_ip = re.search(r"\b([0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3})\b", msg)
        if m_ip:
            ip = m_ip.group(1)

        # Motif 4: RADIUS user extraction (ex: '<radius-172.29.88.1>: ...' or 'user <81060427>' or 'user 81060427')
        m_rad = re.search(r"user\s+<([^>]+)>", msg, re.IGNORECASE) or re.search(r"user\s+([0-9a-zA-Z_-]{4,20})", msg, re.IGNORECASE)
        if m_rad:
            user = m_rad.group(1)

        # Extraction de l'utilisateur si présent
        words = msg.strip().split()
        if words and not user:
            candidate = words[0].rstrip(":")
            if candidate.lower() not in ["user", "system", "hotspot", "error", "warning", "info", "login", "radius"]:
                user = candidate
            elif "system" in topics:
                user = "system"

        return user, ip

    @classmethod
    def get_logs(cls, router: Router, limit: int = 50) -> List[Dict[str, Any]]:
        """Récupère les entrées du journal Hotspot, RADIUS et système (avec cache 10s et extraction d'IP/User)."""
        cache_key = f"router_logs_{router.id}_{limit}"
        cached = cache.get(cache_key)
        if cached is not None:
            return cached

        try:
            pool = cls.get_api_connection(router)
            api = pool.get_api()

            log_resource = api.get_resource("/log")
            raw_logs = log_resource.get()

            pool.disconnect()

            filtered = []
            for item in reversed(raw_logs):
                topics = item.get("topics", "")
                msg = item.get("message", "")
                time_str = item.get("time", "")

                if any(t in topics for t in ["hotspot", "account", "system", "user", "radius"]):
                    msg_lower = msg.lower()
                    status_type = "info"
                    if any(w in msg_lower for w in ["failed", "invalid", "error", "reject", "denied"]):
                        status_type = "error"
                    elif any(w in msg_lower for w in ["logged out", "timeout", "disconnected"]):
                        status_type = "warning"
                    elif any(w in msg_lower for w in ["logged in", "log in", "accepted", "success"]):
                        status_type = "success"

                    user, ip = cls._parse_log_user_and_ip(msg, topics)

                    category = "general"
                    if "radius" in topics:
                        category = "radius"
                    elif "hotspot" in topics:
                        category = "hotspot"
                    elif "system" in topics:
                        category = "system"
                    elif "account" in topics:
                        category = "account"

                    filtered.append({
                        "id": item.get("id"),
                        "time": time_str,
                        "topics": topics,
                        "category": category,
                        "message": msg,
                        "user": user,
                        "ip": ip,
                        "status_type": status_type,
                    })
                    if len(filtered) >= limit:
                        break

            cache.set(cache_key, filtered, timeout=10)
            return filtered
        except Exception as e:
            logger.warning(f"Erreur logs routeur {router.name}: {e}")
            return []

    @classmethod
    def update_user_limits(
        cls,
        router: Router,
        username: str,
        time_limit: str = "",
        byte_limit: str = "",
        comment: str = "",
    ) -> bool:
        """Modifie les limitations d'un ticket / utilisateur Hotspot (durée ou quota de données)."""
        pool = cls.get_api_connection(router)
        api = pool.get_api()
        user_res = api.get_resource("/ip/hotspot/user")

        found = user_res.get(name=username)
        if not found:
            pool.disconnect()
            raise ValueError(f"Utilisateur ou ticket '{username}' introuvable.")

        target_id = found[0].get("id")
        params = {}
        if time_limit:
            params["limit-uptime"] = time_limit
        if byte_limit:
            params["limit-bytes-total"] = byte_limit
        if comment:
            params["comment"] = comment

        if params:
            user_res.set(id=target_id, **params)

        pool.disconnect()
        cache.delete(f"router_users_list_{router.id}")
        cache.delete(f"router_hs_overview_{router.id}")
        return True

    @staticmethod
    def _extract_profile_expiration(p: Dict[str, Any]) -> str:
        """Extrait intelligemment le temps de validité / expiration d'un profil Hotspot."""
        session_to = p.get("session-timeout", "").strip()
        if session_to and session_to not in ["-", "0s", "none", ""]:
            return session_to

        idle_to = p.get("idle-timeout", "").strip()
        if idle_to and idle_to not in ["-", "0s", "none", ""]:
            return f"{idle_to} (Inactivité)"

        name = p.get("name", "")
        comment = p.get("comment", "")
        combined = f"{name} {comment}"
        import re

        # Chercher des durées types : 1h, 2h, 3h, 24h, 1d, 7d, 30d, 1 jour, 2 heures, 30m
        match = re.search(r"\b(\d+\s*(?:h|d|j|semaine|mois|min|heure|jour|journee|sem|m))\b", combined, re.IGNORECASE)
        if match:
            return match.group(1).strip()

        on_login = p.get("on-login", "")
        if on_login:
            match_login = re.search(r"(\d+[hmdw])", on_login)
            if match_login:
                return match_login.group(1)

        return "Illimitée (Session continue)"

    @classmethod
    def get_hotspot_users(cls, router: Router, limit: int = 300) -> List[Dict[str, Any]]:
        """Liste les tickets / utilisateurs Hotspot du routeur avec mise en cache et limitation sécurisée."""
        users_cache_key = f"router_users_list_{router.id}"
        cached = cache.get(users_cache_key)
        if cached is not None:
            return cached

        try:
            # Timeout adapté de 10s pour absorber les routeurs à fort volume (3000+ tickets)
            pool = cls.get_api_connection(router, timeout=10.0)
            api = pool.get_api()

            raw_users = api.get_resource("/ip/hotspot/user").get()
            pool.disconnect()

            recent_users = raw_users[-limit:] if len(raw_users) > limit else raw_users

            result = [
                {
                    "id": u.get("id"),
                    "name": u.get("name", ""),
                    "profile": u.get("profile", "default"),
                    "uptime": u.get("uptime", "0s"),
                    "bytes_in": cls._format_bytes(u.get("bytes-in", 0)),
                    "bytes_out": cls._format_bytes(u.get("bytes-out", 0)),
                    "limit_uptime": u.get("limit-uptime") or "Illimité",
                    "comment": u.get("comment", ""),
                    "disabled": u.get("disabled") == "true",
                }
                for u in reversed(recent_users)
            ]
            cache.set(users_cache_key, result, timeout=30)
            return result
        except Exception as e:
            logger.warning(f"Erreur users routeur {router.name}: {e}")
            return []

    @staticmethod
    def _extract_profile_price(p: Dict[str, Any]) -> str:
        """Extrait le prix du forfait depuis le nom, le commentaire ou les attributs du profil."""
        name = p.get("name", "")
        comment = p.get("comment", "")
        combined = f"{name} {comment}"
        import re

        # 1. Chercher un prix explicite : 100 FCFA, 500F, 200 CFA, price=500
        m = re.search(r"(?:price\s*[:=]\s*|[\b_])(\d{2,6})\s*(?:fcfa|cfa|f|\$)\b", combined, re.IGNORECASE)
        if m:
            return f"{m.group(1)} FCFA"

        # 2. Chercher un nombre avec F à la fin : ex "100F", "500F", "2000F"
        m2 = re.search(r"(\d{2,6})\s*f\b", combined, re.IGNORECASE)
        if m2:
            return f"{m2.group(1)} FCFA"

        # 3. Chercher dans le commentaire "XXX FCFA"
        m3 = re.search(r"(\d{2,6})\s*(?:fcfa|cfa)", comment, re.IGNORECASE)
        if m3:
            return f"{m3.group(1)} FCFA"

        # 4. Si le nom contient un nombre isolé entre 2 et 5 chiffres (ex: "Forfait 200")
        m4 = re.search(r"\b(\d{2,5})\b", name)
        if m4:
            return f"{m4.group(1)} FCFA"

        return "100 FCFA"

    @classmethod
    def _extract_price_int(cls, p: Dict[str, Any]) -> int:
        """Retourne le prix numérique en FCFA d'un profil."""
        price_str = cls._extract_profile_price(p)
        try:
            return int(price_str.replace("FCFA", "").strip())
        except (ValueError, AttributeError):
            return 100

    @classmethod
    def get_profiles(cls, router: Router) -> List[Dict[str, Any]]:
        """Récupère la liste des profils de bande passante/durée (avec cache 60s)."""
        profiles_cache_key = f"router_profiles_{router.id}"
        cached = cache.get(profiles_cache_key)
        if cached is not None:
            return cached

        try:
            pool = cls.get_api_connection(router)
            api = pool.get_api()

            profiles_res = api.get_resource("/ip/hotspot/user/profile").get()
            pool.disconnect()

            profiles = [
                {
                    "id": p.get("id"),
                    "name": p.get("name", ""),
                    "rate_limit": p.get("rate-limit") or "Illimité",
                    "shared_users": p.get("shared-users", "1"),
                    "session_timeout": cls._extract_profile_expiration(p),
                    "raw_session_timeout": p.get("session-timeout", "-"),
                    "idle_timeout": p.get("idle-timeout", "-"),
                    "status_autorefresh": p.get("status-autorefresh", "1m"),
                    "price": cls._extract_profile_price(p),
                    "comment": p.get("comment", ""),
                }
                for p in profiles_res
                if p.get("name", "").strip().lower() != "default"
            ]
            cache.set(profiles_cache_key, profiles, timeout=60)
            return profiles
        except Exception as e:
            logger.warning(f"Erreur profiles routeur {router.name}: {e}")
            return []

    @classmethod
    def add_profile(
        cls,
        router: Router,
        name: str,
        rate_limit: str = "",
        shared_users: int = 1,
        session_timeout: str = "",
        price: int = 100,
        comment: str = "",
    ) -> Dict[str, Any]:
        """Crée un nouveau profil Hotspot sur le MikroTik."""
        pool = cls.get_api_connection(router)
        api = pool.get_api()
        prof_res = api.get_resource("/ip/hotspot/user/profile")

        comment_str = comment or f"{price} FCFA"
        if f"{price}" not in comment_str:
            comment_str = f"{comment_str} | {price} FCFA"

        params = {
            "name": name,
            "shared-users": str(shared_users),
            "comment": comment_str,
        }
        if rate_limit and rate_limit != "Illimité":
            params["rate-limit"] = rate_limit
        if session_timeout and session_timeout != "-":
            params["session-timeout"] = session_timeout

        prof_res.add(**params)
        pool.disconnect()
        cache.delete(f"router_profiles_{router.id}")
        cache.delete(f"router_hs_overview_{router.id}")
        return {"name": name, "success": True}

    @classmethod
    def update_profile(
        cls,
        router: Router,
        profile_id: str,
        name: str = "",
        rate_limit: str = "",
        shared_users: int = None,
        session_timeout: str = "",
        price: int = None,
        comment: str = "",
    ) -> bool:
        """Met à jour un profil Hotspot existant."""
        pool = cls.get_api_connection(router)
        api = pool.get_api()
        prof_res = api.get_resource("/ip/hotspot/user/profile")

        params = {}
        if name:
            params["name"] = name
        if rate_limit:
            params["rate-limit"] = rate_limit
        if shared_users is not None:
            params["shared-users"] = str(shared_users)
        if session_timeout:
            params["session-timeout"] = session_timeout
        comment_val = None
        if price is not None:
            comment_val = comment or f"{price} FCFA"
        elif comment:
            comment_val = comment

        if params:
            prof_res.set(id=profile_id, **params)

        if comment_val is not None:
            try:
                prof_res.call("comment", {"numbers": profile_id, "comment": comment_val})
            except Exception as comment_err:
                logger.debug(f"RouterOS profile comment set ignored: {comment_err}")

        pool.disconnect()
        cache.delete(f"router_profiles_{router.id}")
        cache.delete(f"router_hs_overview_{router.id}")
        return True

    @classmethod
    def delete_profile(cls, router: Router, profile_id: str) -> bool:
        """Supprime un profil Hotspot sur le MikroTik."""
        pool = cls.get_api_connection(router)
        api = pool.get_api()
        api.get_resource("/ip/hotspot/user/profile").remove(id=profile_id)
        pool.disconnect()
        cache.delete(f"router_profiles_{router.id}")
        cache.delete(f"router_hs_overview_{router.id}")
        return True

    @classmethod
    def get_sales_report(cls, router: Router) -> Dict[str, Any]:
        """Génère le rapport de ventes Hotspot (CA jour, hier, mois, tickets vendus)."""
        cache_key = f"router_sales_report_{router.id}"
        cached = cache.get(cache_key)
        if cached is not None:
            return cached

        try:
            import datetime
            import re

            pool = cls.get_api_connection(router, timeout=8.0)
            api = pool.get_api()

            raw_users = api.get_resource("/ip/hotspot/user").get()
            active_users = api.get_resource("/ip/hotspot/active").get()
            profiles_res = api.get_resource("/ip/hotspot/user/profile").get()
            pool.disconnect()

            # 1. Indexation des profils pour calcul précis du prix
            profile_prices: Dict[str, int] = {}
            for p in profiles_res:
                profile_prices[p.get("name", "")] = cls._extract_price_int(p)

            now = datetime.datetime.now()
            today_str = now.strftime("%Y-%m-%d")
            yesterday_str = (now - datetime.timedelta(days=1)).strftime("%Y-%m-%d")
            month_str = now.strftime("%Y-%m")

            active_user_set = {u.get("user") for u in active_users if u.get("user")}

            today_revenue = 0
            yesterday_revenue = 0
            month_revenue = 0
            total_revenue = 0

            today_count = 0
            yesterday_count = 0
            month_count = 0

            sales_history = []

            # Analyse des tickets (utilisateurs Hotspot)
            for u in reversed(raw_users):
                comment = u.get("comment", "")
                username = u.get("name", "")
                u_profile = u.get("profile", "default")

                # Extraction du prix : priorité au profil, puis au commentaire si mention explicite
                price = profile_prices.get(u_profile)
                if price is None or price <= 0:
                    # Chercher explicitement un montant avec FCFA / CFA
                    m_price = re.search(r"(\d{2,6})\s*(?:fcfa|cfa)", comment, re.IGNORECASE)
                    if m_price:
                        try:
                            price = int(m_price.group(1))
                        except ValueError:
                            price = 100
                    else:
                        price = 100

                # Extraction du lot
                m_batch = re.search(r"(TZ-\d{4})", comment)
                batch_id = m_batch.group(1) if m_batch else (comment[:25] if comment else "Vente Directe")

                # Détection de la date
                m_date = re.search(r"(\d{4}-\d{2}-\d{2})", comment)
                is_currently_active = username in active_user_set
                has_traffic = u.get("bytes-in", "0") not in ["0", ""] or u.get("uptime", "0s") not in ["0s", ""]

                if m_date:
                    item_date = m_date.group(1)
                elif is_currently_active:
                    item_date = today_str
                else:
                    # Tickets historiques sans date : ne pas les forcer à today_str
                    item_date = f"{month_str}-01"

                if item_date == today_str:
                    today_revenue += price
                    today_count += 1
                elif item_date == yesterday_str:
                    yesterday_revenue += price
                    yesterday_count += 1

                if item_date.startswith(month_str):
                    month_revenue += price
                    month_count += 1

                total_revenue += price

                if len(sales_history) < 60:
                    sales_history.append({
                        "id": u.get("id"),
                        "code": username,
                        "profile": u_profile,
                        "price": price,
                        "batch_id": batch_id,
                        "date": item_date,
                        "uptime": u.get("uptime", "0s"),
                        "consumed": has_traffic or is_currently_active,
                    })

            # Si aucun ticket n'a de date d'aujourd'hui explicite dans le commentaire,
            # baser les ventes du jour sur les sessions actives réelles
            if today_count == 0 and len(active_users) > 0:
                today_count = len(active_users)
                today_revenue = sum(profile_prices.get(u.get("profile", "default"), 100) for u in active_users)

            report_data = {
                "today_revenue": today_revenue,
                "today_count": today_count,
                "yesterday_revenue": yesterday_revenue,
                "yesterday_count": yesterday_count,
                "month_revenue": month_revenue if month_revenue > 0 else total_revenue,
                "month_count": month_count if month_count > 0 else len(raw_users),
                "total_users": len(raw_users),
                "active_sessions": len(active_users),
                "sales_history": sales_history,
            }
            cache.set(cache_key, report_data, timeout=30)
            return report_data
        except Exception as e:
            logger.warning(f"Erreur rapport ventes {router.name}: {e}")
            return {
                "today_revenue": 0,
                "today_count": 0,
                "yesterday_revenue": 0,
                "yesterday_count": 0,
                "month_revenue": 0,
                "month_count": 0,
                "total_users": 0,
                "active_sessions": 0,
                "sales_history": [],
            }

    @classmethod
    def add_user(
        cls,
        router: Router,
        name: str,
        password: str = "",
        profile: str = "default",
        time_limit: str = "",
        comment: str = "TikZone Ticket",
    ) -> Dict[str, Any]:
        """Crée un utilisateur ou ticket dans /ip/hotspot/user."""
        pool = cls.get_api_connection(router)
        api = pool.get_api()
        user_res = api.get_resource("/ip/hotspot/user")

        params = {
            "name": name,
            "password": password or name,
            "profile": profile,
            "comment": comment,
        }
        if time_limit:
            params["limit-uptime"] = time_limit

        user_res.add(**params)
        pool.disconnect()
        cache.delete(f"router_user_count_{router.id}")
        cache.delete(f"router_hs_overview_{router.id}")
        return {"name": name, "profile": profile, "success": True}

    @classmethod
    def generate_batch_tickets(
        cls,
        router: Router,
        count: int = 10,
        auth_mode: str = "single",
        profile: str = "default",
        time_limit: str = "1h",
        prefix: str = "",
        code_length: int = 6,
        code_format: str = "numeric",
        price: int = 100,
        comment: str = "",
    ) -> List[Dict[str, Any]]:
        """Génère un lot de tickets avec code unique (longueur 4, 6 ou 8, PIN unique ou User/Pass séparé)."""
        import random
        import datetime

        # Validation stricte du volume (1 à 1000 tickets par lot)
        count = min(max(int(count), 1), 1000)

        # Validation stricte de la longueur demandée (4, 6 ou 8)
        valid_length = code_length if code_length in [4, 6, 8] else 6

        # Sélection du jeu de caractères (en excluant les caractères ambigus)
        if code_format == "alpha_lower":
            chars = "23456789abcdefghkmnpqrstuvwxyz"
            pass_chars = "23456789abcdefghkmnpqrstuvwxyz"
        elif code_format == "alpha_upper":
            chars = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ"
            pass_chars = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ"
        else:  # "numeric" par défaut
            chars = "0123456789"
            pass_chars = "0123456789"

        # Timeout allongé pour absorber les gros volumes jusqu'à 1000 tickets sans coupure
        timeout_val = 15.0 if count > 200 else 8.0
        pool = cls.get_api_connection(router, timeout=timeout_val)
        api = pool.get_api()
        user_res = api.get_resource("/ip/hotspot/user")

        generated = []
        today_str = datetime.date.today().strftime("%Y-%m-%d")
        wifi_zone = (router.hotspot_name or router.name).strip()
        duration_label = (time_limit or "Illimitée").strip()

        # Construction du commentaire automatique ou personnalisé sans 'TZ'
        has_custom_comment = bool(comment and comment.strip())
        custom_base = comment.strip() if has_custom_comment else ""

        for idx in range(1, count + 1):
            random_code = "".join(random.choices(chars, k=valid_length))
            code = f"{prefix}{random_code}" if prefix else random_code

            # Gestion du mode d'authentification : 1 champ (User=Pass) vs 2 champs (User!=Pass)
            if auth_mode == "dual":
                password = "".join(random.choices(pass_chars, k=valid_length if valid_length <= 6 else 4))
            else:
                password = code

            if has_custom_comment:
                ticket_comment = f"{custom_base} | {today_str} | {price} FCFA"
            else:
                seq_str = f"{idx:05d}"
                ticket_comment = f"ticket : {wifi_zone} : {today_str} : {duration_label} : {seq_str}"

            params = {
                "name": code,
                "password": password,
                "profile": profile,
                "comment": ticket_comment,
            }
            if time_limit and time_limit != "Illimité":
                params["limit-uptime"] = time_limit

            user_res.add(**params)
            generated.append({
                "code": code,
                "password": password,
                "auth_mode": auth_mode,
                "profile": profile,
                "time_limit": time_limit,
                "price": price,
                "comment": ticket_comment,
            })

        pool.disconnect()
        cache.delete(f"router_user_count_{router.id}")
        cache.delete(f"router_hs_overview_{router.id}")
        cache.delete(f"router_users_list_{router.id}")
        cache.delete(f"router_sales_report_{router.id}")
        return generated

    @classmethod
    def delete_hotspot_users(cls, router: Router, user_ids: List[str]) -> int:
        """Supprime une liste de tickets/utilisateurs Hotspot du MikroTik en une seule passe."""
        if not user_ids:
            return 0

        pool = cls.get_api_connection(router)
        api = pool.get_api()
        user_res = api.get_resource("/ip/hotspot/user")

        deleted = 0
        for uid in user_ids:
            try:
                user_res.remove(id=uid)
                deleted += 1
            except Exception as e:
                logger.warning(f"Erreur suppression ticket {uid} sur {router.name}: {e}")

        pool.disconnect()
        cache.delete(f"router_user_count_{router.id}")
        cache.delete(f"router_hs_overview_{router.id}")
        cache.delete(f"router_users_list_{router.id}")
        cache.delete(f"router_sales_report_{router.id}")
        cache.delete(f"router_user_prof_map_{router.id}")
        return deleted

    @classmethod
    def disconnect_active_user(cls, router: Router, active_id: str) -> bool:
        """Déconnecte immédiatement un utilisateur actif."""
        pool = cls.get_api_connection(router)
        api = pool.get_api()
        api.get_resource("/ip/hotspot/active").remove(id=active_id)
        pool.disconnect()
        return True

    @classmethod
    def reboot_router(cls, router: Router) -> bool:
        """Redémarre le routeur MikroTik à distance."""
        pool = cls.get_api_connection(router)
        api = pool.get_api()
        try:
            api.get_binary_resource("/system/reboot").call()
        except Exception:
            pass
        finally:
            try:
                pool.disconnect()
            except Exception:
                pass
        return True
