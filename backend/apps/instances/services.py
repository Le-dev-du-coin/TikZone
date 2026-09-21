"""Service de provisionnement des espaces TikZone.

Les routeurs et profils sont désormais gérés directement via la base relationnelle
PostgreSQL et le Moteur Cloud RADIUS, rendant obsolète l'écriture de fichiers JSON locaux.
Ce service conserve les méthodes d'interface pour assurer la rétrocompatibilité.
"""

import logging

logger = logging.getLogger(__name__)


class MikhmonProvisioningService:
    """Service de gestion des espaces (anciennement Mikhmon Engine)."""

    @classmethod
    def provision_router(cls, router) -> None:
        """Provisionnement d'un routeur dans son espace."""
        logger.debug(f"[Espace] Routeur '{router.name}' associé à l'espace '{getattr(router.mikhmon_instance, 'name', 'N/A')}'")

    @classmethod
    def deprovision_router(cls, router_id: str) -> None:
        """Déprovisionnement d'un routeur."""
        logger.debug(f"[Espace] Routeur {router_id} déprovisionné")

    @classmethod
    def sync_all(cls) -> int:
        """Synchronise l'ensemble des espaces (no-op en mode Cloud)."""
        return 0

