import re
from rest_framework import serializers
from django.conf import settings
from django.utils import timezone
from .models import Link
from apps.common.base62 import is_reserved_alias
from apps.common.utils import is_valid_url, is_ssrf_safe_url

ALIAS_REGEX = re.compile(r'^[a-zA-Z0-9_-]+$')


class LinkSerializer(serializers.ModelSerializer):
    short_url = serializers.SerializerMethodField()
    is_expired = serializers.BooleanField(read_only=True)

    class Meta:
        model = Link
        fields = (
            'id',
            'short_code',
            'custom_alias',
            'short_url',
            'original_url',
            'is_active',
            'expires_at',
            'click_count',
            'is_expired',
            'created_at',
            'updated_at'
        )
        read_only_fields = ('id', 'short_code', 'short_url', 'click_count', 'created_at', 'updated_at')

    def get_short_url(self, obj) -> str:
        base = getattr(settings, 'SHORT_DOMAIN_BASE', 'http://127.0.0.1:8000').rstrip('/')
        base = base.replace('localhost', '127.0.0.1')
        return f"{base}/{obj.short_code}"



class LinkCreateSerializer(serializers.Serializer):
    original_url = serializers.CharField(max_length=2048, required=True)
    custom_alias = serializers.CharField(max_length=64, required=False, allow_blank=True, allow_null=True)
    expires_at = serializers.DateTimeField(required=False, allow_null=True)

    def validate_original_url(self, value):
        if not is_valid_url(value):
            raise serializers.ValidationError("Invalid URL format. Must start with http:// or https://")
        if not is_ssrf_safe_url(value):
            raise serializers.ValidationError("This destination address is disallowed for security reasons.")
        return value

    def validate_custom_alias(self, value):
        if not value:
            return None
        value = value.strip()
        if len(value) < 3 or len(value) > 64:
            raise serializers.ValidationError("Custom alias must be between 3 and 64 characters.")
        if not ALIAS_REGEX.match(value):
            raise serializers.ValidationError("Custom alias can only contain alphanumeric characters, hyphens, and underscores.")
        if is_reserved_alias(value):
            raise serializers.ValidationError(f"The alias '{value}' is a reserved system keyword.")
        if Link.objects.filter(short_code=value).exists():
            raise serializers.ValidationError(f"The alias '{value}' is already taken.")
        return value

    def validate_expires_at(self, value):
        if value and value <= timezone.now():
            raise serializers.ValidationError("Expiration date must be in the future.")
        return value


class LinkUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Link
        fields = ('is_active', 'expires_at')

    def validate_expires_at(self, value):
        if value and value <= timezone.now():
            raise serializers.ValidationError("Expiration date must be in the future.")
        return value
