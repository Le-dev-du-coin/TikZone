import logging
import socket
from typing import Any, Dict, List, Optional
import routeros_api
from django.conf import settings
from django.core.cache import cache
from apps.routers.models import Router

logger = logging.getLogger(__name__)


class MikrotikService:
    """Service pour interagir directement avec l'API MikroTik RouterOS via le tunnel VPN."""

    @staticmethod
    def _format_bytes(bytes_str: Any) -> str:
        """Convertit un nombre d'octets en unité lisible (Kio, Mio, Gio)."""
        try:
            val = float(bytes_str)
            if val >= 1024 * 1024 * 1024:
                return f"{val / (1024 * 1024 * 1024):.2f} Gio"
            elif val >= 1024 * 1024:
                return f"{val / (1024 * 1024):.2f} Mio"
            elif val >= 1024:
                return f"{val / 1024:.2f} Kio"
            return f"{val:.0f} octets"
        except (ValueError, TypeError):
            return str(bytes_str)

    @classmethod
    def get_api_connection(cls, router: Router, timeout: float = 1.0):
        """Établit une connexion API RouterOS vers le routeur via son tunnel VPN avec Circuit Breaker."""
        vpn = getattr(router, "vpn_credential", None)
        if not vpn:
            raise ValueError(f"Le routeur '{router.name}' n'a pas d'identifiants VPN alloués.")

        # Circuit Breaker : Si le routeur a été détecté injoignable il y a moins de 10s, fail fast en 0ms
        circuit_key = f"mikrotik_offline_cb_{router.id}"
        if cache.get(circuit_key):
            raise ConnectionError(
                f"Circuit breaker actif: Le routeur '{router.name}' est actuellement hors-ligne."
            )

        # Mot de passe admin hérité de l'instance ou '123' par défaut
        admin_password = getattr(router.mikhmon_instance, "admin_password", "") or "123"
        username = "admin"

        target_host = vpn.assigned_ip
        target_port = 8728

        # Test d'ouverture de socket rapide (liveness probe ultra-rapide)
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
            # Positionne le circuit breaker pendant 10 secondes pour libérer les workers
            cache.set(circuit_key, True, timeout=10)
            raise ConnectionError(
                f"Impossible de joindre le port API du routeur '{router.name}' ({target_host}:{target_port}) : Hôte injoignable."
            )

        # Si joignable, on s'assure que le circuit breaker est réinitialisé
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
        """Récupère les informations matérielles, charge CPU, mémoire et uptime."""
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

            return {
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
        try:
            pool = cls.get_api_connection(router)
            api = pool.get_api()

            active_users = api.get_resource("/ip/hotspot/active").get()
            users = api.get_resource("/ip/hotspot/user").get()
            profiles = api.get_resource("/ip/hotspot/user/profile").get()

            pool.disconnect()

            return {
                "online": True,
                "active_count": len(active_users),
                "total_users_count": len(users),
                "profiles_count": len(profiles),
                "active_users": [
                    {
                        "id": u.get("id"),
                        "user": u.get("user", ""),
                        "address": u.get("address", ""),
                        "mac_address": u.get("mac-address", ""),
                        "uptime": u.get("uptime", ""),
                        "bytes_in": cls._format_bytes(u.get("bytes-in", 0)),
                        "bytes_out": cls._format_bytes(u.get("bytes-out", 0)),
                        "login_by": u.get("login-by", ""),
                    }
                    for u in active_users[:50]
                ],
            }
        except Exception as e:
            return {
                "online": False,
                "active_count": 0,
                "total_users_count": 0,
                "profiles_count": 0,
                "active_users": [],
                "error": str(e),
            }

    @classmethod
    def get_logs(cls, router: Router, limit: int = 50) -> List[Dict[str, Any]]:
        """Récupère les entrées du journal Hotspot et système."""
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

                if "hotspot" in topics or "account" in topics or "system" in topics:
                    msg_lower = msg.lower()
                    status_type = "info"
                    if "failed" in msg_lower or "invalid" in msg_lower or "error" in msg_lower:
                        status_type = "error"
                    elif "logged out" in msg_lower or "timeout" in msg_lower:
                        status_type = "warning"
                    elif "logged in" in msg_lower or "log in" in msg_lower:
                        status_type = "success"

                    filtered.append({
                        "id": item.get("id"),
                        "time": time_str,
                        "topics": topics,
                        "message": msg,
                        "status_type": status_type,
                    })
                    if len(filtered) >= limit:
                        break

            return filtered
        except Exception as e:
            logger.warning(f"Erreur logs routeur {router.name}: {e}")
            return []

    @classmethod
    def get_hotspot_users(cls, router: Router) -> List[Dict[str, Any]]:
        """Liste tous les tickets / utilisateurs Hotspot du routeur."""
        try:
            pool = cls.get_api_connection(router)
            api = pool.get_api()

            users = api.get_resource("/ip/hotspot/user").get()
            pool.disconnect()

            return [
                {
                    "id": u.get("id"),
                    "name": u.get("name", ""),
                    "profile": u.get("profile", "default"),
                    "uptime": u.get("uptime", "0s"),
                    "bytes_in": cls._format_bytes(u.get("bytes-in", 0)),
                    "bytes_out": cls._format_bytes(u.get("bytes-out", 0)),
                    "limit_uptime": u.get("limit-uptime", "Illimité"),
                    "comment": u.get("comment", ""),
                    "disabled": u.get("disabled") == "true",
                }
                for u in reversed(users)
            ]
        except Exception as e:
            logger.warning(f"Erreur users routeur {router.name}: {e}")
            return []

    @classmethod
    def get_profiles(cls, router: Router) -> List[Dict[str, Any]]:
        """Récupère la liste des profils de bande passante/durée."""
        try:
            pool = cls.get_api_connection(router)
            api = pool.get_api()

            profiles = api.get_resource("/ip/hotspot/user/profile").get()
            pool.disconnect()

            return [
                {
                    "id": p.get("id"),
                    "name": p.get("name", ""),
                    "rate_limit": p.get("rate-limit", "Illimité"),
                    "shared_users": p.get("shared-users", "1"),
                    "session_timeout": p.get("session-timeout", "-"),
                    "status_autorefresh": p.get("status-autorefresh", "-"),
                }
                for p in profiles
            ]
        except Exception as e:
            logger.warning(f"Erreur profiles routeur {router.name}: {e}")
            return []

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
        return {"name": name, "profile": profile, "success": True}

    @classmethod
    def generate_batch_tickets(
        cls,
        router: Router,
        count: int = 10,
        profile: str = "default",
        time_limit: str = "1h",
        prefix: str = "",
        code_length: int = 6,
        price: int = 100,
    ) -> List[Dict[str, Any]]:
        """Génère un lot de tickets avec code unique en 1 clic."""
        import random

        pool = cls.get_api_connection(router)
        api = pool.get_api()
        user_res = api.get_resource("/ip/hotspot/user")

        chars = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ"
        generated = []
        batch_id = f"TZ-{random.randint(1000, 9999)}"

        for _ in range(count):
            random_code = "".join(random.choices(chars, k=code_length))
            code = f"{prefix}{random_code}" if prefix else random_code
            comment = f"Lot {batch_id} | {price} FCFA"

            params = {
                "name": code,
                "password": code,
                "profile": profile,
                "comment": comment,
            }
            if time_limit:
                params["limit-uptime"] = time_limit

            user_res.add(**params)
            generated.append({
                "code": code,
                "profile": profile,
                "time_limit": time_limit,
                "price": price,
                "batch_id": batch_id,
            })

        pool.disconnect()
        return generated

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
