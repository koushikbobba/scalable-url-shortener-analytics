from django.urls import path
from .views import LinkAnalyticsDetailView, OverviewAnalyticsView

urlpatterns = [
    path('overview/', OverviewAnalyticsView.as_view(), name='analytics_overview'),
    path('<uuid:link_id>/', LinkAnalyticsDetailView.as_view(), name='link_analytics_detail'),
]
