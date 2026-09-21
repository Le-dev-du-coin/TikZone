from rest_framework import serializers
from apps.routers.serializers import RouterSerializer
from .models import MikhmonInstance


class MikhmonInstanceSerializer(serializers.ModelSerializer):
    subdomain_url = serializers.CharField(read_only=True)
    routers_count = serializers.IntegerField(source="routers.count", read_only=True)
    routers = RouterSerializer(many=True, read_only=True)

    class Meta:
        model = MikhmonInstance
        fields = [
            "id",
            "name",
            "client_name",
            "client_phone",
            "subdomain_url",
            "routeros_version",
            "admin_user",
            "admin_password",
            "is_active",
            "routers_count",
            "routers",
            "created_at",
        ]
        read_only_fields = ["id", "is_active", "routers_count", "routers", "created_at"]


class PurchaseInstanceSerializer(serializers.ModelSerializer):
    admin_user = serializers.CharField(max_length=50, required=False, default="admin")
    admin_password = serializers.CharField(max_length=100, required=False, default="mikroot2026")
    client_name = serializers.CharField(max_length=150, required=False, allow_blank=True, default="")
    client_phone = serializers.CharField(max_length=30, required=False, allow_blank=True, default="")

    class Meta:
        model = MikhmonInstance
        fields = ["name", "routeros_version", "admin_user", "admin_password", "client_name", "client_phone"]
