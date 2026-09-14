"""Mikroot Core URL Configuration."""
from django.conf import settings
from django.contrib import admin
from django.urls import include, path, re_path

admin_path = f"{settings.DJANGO_ADMIN_URL.strip('/')}/"

urlpatterns = [
    path(admin_path, admin.site.urls),
    re_path(r"^api/accounts/?", include("apps.accounts.urls")),
    re_path(r"^api/billing/?", include("apps.billing.urls")),
    re_path(r"^api/instances/?", include("apps.instances.urls")),
    re_path(r"^api/routers/?", include("apps.routers.urls")),
]

admin.site.site_header = "TikZone SaaS - SuperAdmin"
admin.site.site_title = "TikZone Admin Portal"
admin.site.index_title = "Gestion Globale de la Plateforme"

