from rest_framework import serializers
from apps.instances.models import MikhmonInstance
from .models import Router, VpnCredential


class VpnCredentialSerializer(serializers.ModelSerializer):
    mikrotik_script = serializers.SerializerMethodField()

    class Meta:
        model = VpnCredential
        fields = [
            "vpn_server",
            "vpn_user",
            "assigned_ip",
            "api_port",
            "winbox_port",
            "mikrotik_script",
        ]

    def get_mikrotik_script(self, obj) -> str:
        return obj.generate_mikrotik_script()


class RouterSerializer(serializers.ModelSerializer):
    vpn = VpnCredentialSerializer(source="vpn_credential", read_only=True)
    mikhmon_name = serializers.CharField(source="mikhmon_instance.name", read_only=True)
    mikhmon_url = serializers.CharField(source="mikhmon_instance.subdomain_url", read_only=True)
    days_left = serializers.IntegerField(source="remaining_days", read_only=True)

    class Meta:
        model = Router
        fields = [
            "id",
            "name",
            "hotspot_name",
            "hotspot_type",
            "api_user",
            "api_password",
            "status",
            "mikhmon_instance",
            "mikhmon_name",
            "mikhmon_url",
            "days_left",
            "price_per_month",
            "auto_renew",
            "expires_at",
            "last_ping",
            "vpn",
            "created_at",
        ]
        read_only_fields = ["id", "status", "days_left", "expires_at", "last_ping", "created_at"]


class CreateRouterSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=50)
    mikhmon_instance_id = serializers.UUIDField()
    hotspot_type = serializers.ChoiceField(
        choices=Router.HotspotType.choices,
        default=Router.HotspotType.RADIUS,
        required=False,
    )
    api_user = serializers.CharField(max_length=50, default="admin", required=False)
    api_password = serializers.CharField(max_length=128, required=False, allow_blank=True, default="")
    auto_renew = serializers.BooleanField(default=True)
