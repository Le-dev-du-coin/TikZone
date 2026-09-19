from django.conf import settings
from django.core.management.base import BaseCommand
from apps.routers.models import VpnCredential


class Command(BaseCommand):
    help = "Normalise les serveurs VPN existants en base (remplace les adresses IPv6 brutes par le domaine vpn.tikzone.net)"

    def handle(self, *args, **options):
        target_host = getattr(settings, "VPN_SERVER_HOST", "187.7.20.53")
        if not target_host or ":" in target_host or target_host == "vpn.tikzone.net":
            target_host = "187.7.20.53"

        # 1. Mise à jour des routeurs ayant une adresse IPv6 (contenant ':') ou l'ancien domaine vpn.tikzone.net
        invalid_qs = VpnCredential.objects.exclude(vpn_server=target_host)
        count_invalid = invalid_qs.count()
        if count_invalid > 0:
            invalid_qs.update(vpn_server=target_host)
            self.stdout.write(self.style.SUCCESS(f"[+] {count_invalid} routeur(s) mis à jour vers l'IPv4 directe '{target_host}'."))
        else:
            self.stdout.write(self.style.SUCCESS(f"[ok] Tous les routeurs utilisent déjà l'IPv4 directe '{target_host}'."))

        # 2. Mise à jour des routeurs sans vpn_server
        empty_qs = VpnCredential.objects.filter(vpn_server="")
        count_empty = empty_qs.count()
        if count_empty > 0:
            empty_qs.update(vpn_server=target_host)
            self.stdout.write(self.style.SUCCESS(f"[+] {count_empty} routeur(s) sans vpn_server mis à jour vers '{target_host}'."))
