from django.conf import settings
from django.core.management.base import BaseCommand
from apps.routers.models import VpnCredential


class Command(BaseCommand):
    help = "Normalise les serveurs VPN existants en base (remplace les adresses IPv6 brutes par le domaine vpn.tikzone.net)"

    def handle(self, *args, **options):
        base_domain = getattr(settings, "BASE_DOMAIN", "tikzone.net")
        target_host = getattr(settings, "VPN_SERVER_HOST", f"vpn.{base_domain}")
        if not target_host or ":" in target_host:
            target_host = f"vpn.{base_domain}"

        # 1. Mise à jour des routeurs ayant une adresse IPv6 (contenant ':')
        ipv6_qs = VpnCredential.objects.filter(vpn_server__contains=":")
        count_ipv6 = ipv6_qs.count()
        if count_ipv6 > 0:
            ipv6_qs.update(vpn_server=target_host)
            self.stdout.write(self.style.SUCCESS(f"[+] {count_ipv6} routeur(s) avec IPv6 brute mis à jour vers '{target_host}'."))
        else:
            self.stdout.write(self.style.SUCCESS("[ok] Aucun routeur n'utilise d'adresse IPv6 brute."))

        # 2. Mise à jour des routeurs sans vpn_server
        empty_qs = VpnCredential.objects.filter(vpn_server="")
        count_empty = empty_qs.count()
        if count_empty > 0:
            empty_qs.update(vpn_server=target_host)
            self.stdout.write(self.style.SUCCESS(f"[+] {count_empty} routeur(s) sans vpn_server mis à jour vers '{target_host}'."))
