from rest_framework import serializers


class DimensionMetricSerializer(serializers.Serializer):
    name = serializers.CharField()
    count = serializers.IntegerField()
    percentage = serializers.FloatField()


class TimeSeriesPointSerializer(serializers.Serializer):
    timestamp = serializers.CharField()
    clicks = serializers.IntegerField()
    unique_visitors = serializers.IntegerField()


class LinkAnalyticsSummarySerializer(serializers.Serializer):
    link_id = serializers.UUIDField()
    short_code = serializers.CharField()
    original_url = serializers.CharField()
    total_clicks = serializers.IntegerField()
    unique_visitors = serializers.IntegerField()
    clicks_today = serializers.IntegerField()
    clicks_this_week = serializers.IntegerField()
    clicks_this_month = serializers.IntegerField()
    clicks_over_time = TimeSeriesPointSerializer(many=True)
    top_countries = DimensionMetricSerializer(many=True)
    top_devices = DimensionMetricSerializer(many=True)
    top_browsers = DimensionMetricSerializer(many=True)
    top_referrers = DimensionMetricSerializer(many=True)


class OverviewAnalyticsSummarySerializer(serializers.Serializer):
    total_links = serializers.IntegerField()
    total_clicks = serializers.IntegerField()
    unique_visitors = serializers.IntegerField()
    clicks_today = serializers.IntegerField()
    clicks_over_time = TimeSeriesPointSerializer(many=True)
    top_countries = DimensionMetricSerializer(many=True)
    top_devices = DimensionMetricSerializer(many=True)
    top_browsers = DimensionMetricSerializer(many=True)
