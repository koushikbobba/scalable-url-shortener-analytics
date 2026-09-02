import time
import logging
from django.http import HttpResponseRedirect, JsonResponse, HttpResponse
from django.utils import timezone
from rest_framework import viewsets, permissions, status, filters
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.decorators import action
from django_filters.rest_framework import DjangoFilterBackend
from drf_spectacular.utils import extend_schema, OpenApiParameter

from .models import Link
from .serializers import LinkSerializer, LinkCreateSerializer, LinkUpdateSerializer
from .services import LinkService
from apps.common.permissions import IsOwner
from apps.common.utils import get_client_ip, hash_ip, parse_user_agent_details, extract_geo_location
from apps.common.metrics import REDIRECT_REQUESTS_TOTAL, REDIRECT_LATENCY_SECONDS
from kafka_pipeline.producer import ClickEventProducer

logger = logging.getLogger(__name__)


class LinkViewSet(viewsets.ModelViewSet):
    """
    CRUD API for authenticated users to manage their shortened links.
    """
    serializer_class = LinkSerializer
    permission_classes = [permissions.IsAuthenticated, IsOwner]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['is_active']
    search_fields = ['short_code', 'custom_alias', 'original_url']
    ordering_fields = ['created_at', 'click_count', 'expires_at']
    ordering = ['-created_at']

    def get_queryset(self):
        return Link.objects.filter(user=self.request.user)

    @extend_schema(
        request=LinkCreateSerializer,
        responses={201: LinkSerializer},
        summary="Create a shortened URL or custom alias"
    )
    def create(self, request, *args, **kwargs):
        serializer = LinkCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            link = LinkService.create_link(
                user=request.user,
                original_url=serializer.validated_data['original_url'],
                custom_alias=serializer.validated_data.get('custom_alias'),
                expires_at=serializer.validated_data.get('expires_at')
            )
            return Response(LinkSerializer(link).data, status=status.HTTP_201_CREATED)
        except ValueError as e:
            return Response({"error": {"message": str(e)}}, status=status.HTTP_400_BAD_REQUEST)

    @extend_schema(
        request=LinkUpdateSerializer,
        responses={200: LinkSerializer},
        summary="Update link status or expiration date"
    )
    def update(self, request, *args, **kwargs):
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        serializer = LinkUpdateSerializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        serializer.save()

        # Update cache or invalidate
        LinkService.set_link_cache(instance)
        return Response(LinkSerializer(instance).data)

    def perform_destroy(self, instance):
        short_code = instance.short_code
        instance.delete()
        LinkService.invalidate_link_cache(short_code)


class RedirectShortCodeView(APIView):
    """
    High-Performance Redirection Critical Path: GET /{short_code}
    Designed for sub-10ms latency via Redis Cache-Aside & asynchronous Kafka event streaming.
    """
    permission_classes = [permissions.AllowAny]

    def get(self, request, short_code):
        start_time = time.time()
        
        # 1. Retrieve link from Redis (or DB fallback)
        destination_data = LinkService.get_destination(short_code)

        if not destination_data:
            REDIRECT_REQUESTS_TOTAL.labels(status='not_found', cache_hit='false').inc()
            return JsonResponse({
                "error": {
                    "code": "not_found",
                    "message": f"Short link '{short_code}' does not exist.",
                    "status_code": 404
                }
            }, status=404)

        is_from_cache = destination_data.get('from_cache', False)

        # 2. Validate Link Active Status
        if not destination_data.get('is_active', True):
            REDIRECT_REQUESTS_TOTAL.labels(status='disabled', cache_hit=str(is_from_cache)).inc()
            return JsonResponse({
                "error": {
                    "code": "link_disabled",
                    "message": "This short link has been disabled by the owner.",
                    "status_code": 404
                }
            }, status=404)

        # 3. Validate Link Expiration
        expires_at_str = destination_data.get('expires_at')
        if expires_at_str:
            expires_at = timezone.datetime.fromisoformat(expires_at_str)
            if timezone.now() > expires_at:
                REDIRECT_REQUESTS_TOTAL.labels(status='expired', cache_hit=str(is_from_cache)).inc()
                return JsonResponse({
                    "error": {
                        "code": "link_expired",
                        "message": "This short link has expired.",
                        "status_code": 410
                    }
                }, status=410)

        # 4. Asynchronous Click Event Dispatch (Fire & Forget to Kafka)
        client_ip = get_client_ip(request)
        user_agent_str = request.META.get('HTTP_USER_AGENT', '')
        ua_parsed = parse_user_agent_details(user_agent_str)
        geo = extract_geo_location(request)

        event_payload = {
            "event_type": "link_clicked",
            "link_id": destination_data["id"],
            "short_code": short_code,
            "timestamp": timezone.now().isoformat(),
            "ip_hash": hash_ip(client_ip),
            "referrer": request.META.get('HTTP_REFERER', 'Direct'),
            "browser": ua_parsed["browser"],
            "os": ua_parsed["os"],
            "device_type": ua_parsed["device_type"],
            "is_bot": ua_parsed["is_bot"],
            "country_code": geo["country_code"],
            "city": geo["city"]
        }

        # Non-blocking async event publish to Kafka (with synchronous fallback if offline)
        published = ClickEventProducer.publish_click_event(event_payload)
        if not published:
            try:
                from apps.analytics.services import AnalyticsIngestionService
                AnalyticsIngestionService.process_single_event(event_payload)
            except Exception as fallback_err:
                logger.error(f"Synchronous analytics fallback failed: {fallback_err}")


        # Metrics recording
        latency = time.time() - start_time
        REDIRECT_LATENCY_SECONDS.observe(latency)
        REDIRECT_REQUESTS_TOTAL.labels(status='redirect_302', cache_hit=str(is_from_cache)).inc()

        # 5. Immediate HTTP 302 Redirect
        response = HttpResponseRedirect(destination_data['original_url'])
        response['Cache-Control'] = 'no-cache, no-store, must-revalidate'
        return response
