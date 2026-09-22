from django.contrib import admin
from .models import Router, VpnCredential


class VpnCredentialInline(admin.StackedInline):
    model = VpnCredential
    can_delete = False
    readonly_fields = ("id", "assigned_ip", "api_port", "winbox_port", "vpn_user", "vpn_password", "created_at")


@admin.register(Router)
class RouterAdmin(admin.ModelAdmin):
    list_display = ("name", "user", "mikhmon_instance", "hotspot_type", "status", "remaining_days", "expires_at", "created_at")
    list_filter = ("hotspot_type", "status", "auto_renew", "created_at")
    search_fields = ("name", "user__email", "mikhmon_instance__name")
    inlines = [VpnCredentialInline]
    readonly_fields = ("id", "created_at", "updated_at")


@admin.register(VpnCredential)
class VpnCredentialAdmin(admin.ModelAdmin):
    list_display = ("router", "assigned_ip", "api_port", "winbox_port", "vpn_user", "vpn_server")
    search_fields = ("vpn_user", "router__name", "assigned_ip")
    readonly_fields = ("id", "created_at")


from .models import HotspotBatch, HotspotTicket, CloudHotspotProfile


@admin.register(CloudHotspotProfile)
class CloudHotspotProfileAdmin(admin.ModelAdmin):
    list_display = ("name", "router", "price", "session_timeout", "rate_limit", "shared_users", "is_active", "created_at")
    list_filter = ("is_active", "created_at")
    search_fields = ("name", "router__name", "comment")
    readonly_fields = ("id", "session_timeout_seconds", "created_at", "updated_at")


@admin.register(HotspotBatch)
class HotspotBatchAdmin(admin.ModelAdmin):
    list_display = ("name", "router", "profile_name", "auth_mode", "price", "count", "created_at")
    list_filter = ("auth_mode", "created_at")
    search_fields = ("name", "router__name", "profile_name")
    readonly_fields = ("id", "created_at")


@admin.register(HotspotTicket)
class HotspotTicketAdmin(admin.ModelAdmin):
    list_display = ("code", "router", "profile_name", "status", "price", "uptime_used_seconds", "first_login_at", "created_at")
    list_filter = ("status", "profile_name", "created_at")
    search_fields = ("code", "mac_address", "router__name")
    readonly_fields = ("id", "created_at", "updated_at")
