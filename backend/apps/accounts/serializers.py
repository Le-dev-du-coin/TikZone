from rest_framework import serializers
from .models import User


class UserSerializer(serializers.ModelSerializer):
    managed_instance_id = serializers.UUIDField(source="managed_instance.id", read_only=True)
    managed_instance_name = serializers.CharField(source="managed_instance.name", read_only=True)
    managed_router_id = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            "id",
            "email",
            "username",
            "full_name",
            "phone_number",
            "country",
            "role",
            "managed_instance_id",
            "managed_instance_name",
            "managed_router_id",
            "created_at",
        ]
        read_only_fields = ["id", "role", "created_at"]

    def get_managed_router_id(self, obj):
        if obj.managed_instance:
            first_router = obj.managed_instance.routers.first()
            return str(first_router.id) if first_router else None
        return None


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=6)

    class Meta:
        model = User
        fields = ["email", "password", "full_name", "phone_number", "country"]

    def create(self, validated_data):
        return User.objects.create_user(**validated_data)
