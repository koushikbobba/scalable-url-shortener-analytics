from prometheus_client import Counter, Histogram

REDIRECT_REQUESTS_TOTAL = Counter(
    'shortener_redirect_requests_total',
    'Total count of redirection requests handled',
    ['status', 'cache_hit']
)

REDIRECT_LATENCY_SECONDS = Histogram(
    'shortener_redirect_latency_seconds',
    'Latency histogram for short URL redirection path',
    buckets=[0.001, 0.002, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1.0]
)

LINK_CREATIONS_TOTAL = Counter(
    'shortener_link_creations_total',
    'Total number of links created',
    ['custom_alias']
)

KAFKA_EVENTS_PUBLISHED_TOTAL = Counter(
    'shortener_kafka_events_published_total',
    'Kafka click stream events published',
    ['status']
)

KAFKA_EVENTS_CONSUMED_TOTAL = Counter(
    'shortener_kafka_events_consumed_total',
    'Kafka click stream events consumed and processed',
    ['status']
)

RATE_LIMIT_EXCEEDED_TOTAL = Counter(
    'shortener_rate_limit_exceeded_total',
    'Number of requests throttled by rate limiter',
    ['action']
)
