from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import permissions, status
from django.shortcuts import get_object_or_404
from drf_spectacular.utils import extend_schema, OpenApiParameter
from apps.links.models import Link
from .services import AnalyticsQueryService
from .serializers import LinkAnalyticsSummarySerializer, OverviewAnalyticsSummarySerializer


class LinkAnalyticsDetailView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    @extend_schema(
        summary="Get comprehensive click analytics for a specific link",
        parameters=[
            OpenApiParameter('range', str, description="Time range: 24h, 7d, 30d, all", default='7d'),
            OpenApiParameter('start_date', str, description="ISO format start date"),
            OpenApiParameter('end_date', str, description="ISO format end date"),
        ],
        responses={200: LinkAnalyticsSummarySerializer}
    )
    def get(self, request, link_id):
        link = get_object_or_404(Link, id=link_id, user=request.user)
        time_range = request.query_params.get('range', '7d')
        start_date = request.query_params.get('start_date')
        end_date = request.query_params.get('end_date')

        analytics_data = AnalyticsQueryService.get_link_analytics(
            link=link,
            time_range=time_range,
            start_date=start_date,
            end_date=end_date
        )
        return Response(analytics_data, status=status.HTTP_200_OK)


class OverviewAnalyticsView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    @extend_schema(
        summary="Get aggregate analytics overview across all user links",
        parameters=[
            OpenApiParameter('range', str, description="Time range: 24h, 7d, 30d", default='7d')
        ],
        responses={200: OverviewAnalyticsSummarySerializer}
    )
    def get(self, request):
        time_range = request.query_params.get('range', '7d')
        overview_data = AnalyticsQueryService.get_overview_analytics(
            user=request.user,
            time_range=time_range
        )
        return Response(overview_data, status=status.HTTP_200_OK)
