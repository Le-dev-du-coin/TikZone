import asyncio
import logging
from django.conf import settings
from django.core.management.base import BaseCommand
from apps.routers.services.radius_server import start_radius_services

logger = logging.getLogger("radius_server")


class Command(BaseCommand):
    help = "Lance le serveur RADIUS asynchrone TikZone (Ports UDP 1812 et 1813)"

    def add_arguments(self, parser):
        parser.add_argument("--host", type=str, default="0.0.0.0", help="Adresse IP d'écoute (défaut: 0.0.0.0)")
        parser.add_argument("--auth-port", type=int, default=1812, help="Port UDP Authentification (défaut: 1812)")
        parser.add_argument("--acct-port", type=int, default=1813, help="Port UDP Accounting (défaut: 1813)")
        parser.add_argument(
            "--secret",
            type=str,
            default=getattr(settings, "RADIUS_SECRET", "tikzone-radius-secret-2026"),
            help="Secret partagé RADIUS",
        )

    def handle(self, *args, **options):
        host = options["host"]
        auth_port = options["auth_port"]
        acct_port = options["acct_port"]
        secret = options["secret"]

        self.stdout.write(self.style.SUCCESS(f"=== TikZone RADIUS Engine v2.0 ==="))
        self.stdout.write(f"Écoute sur {host}:{auth_port} (Auth) et {host}:{acct_port} (Accounting)...")

        try:
            asyncio.run(
                start_radius_services(
                    host=host,
                    auth_port=auth_port,
                    acct_port=acct_port,
                    secret=secret,
                )
            )
        except KeyboardInterrupt:
            self.stdout.write(self.style.WARNING("Arrêt du serveur RADIUS."))
