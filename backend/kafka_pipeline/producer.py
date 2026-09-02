import json
import logging
from django.conf import settings
from apps.common.metrics import KAFKA_EVENTS_PUBLISHED_TOTAL

logger = logging.getLogger(__name__)


class ClickEventProducer:
    _instance = None
    _producer = None

    @classmethod
    def get_producer(cls):
        if getattr(settings, 'IS_TESTING', False) or getattr(settings, 'USE_SQLITE', False):
            return None
        if cls._producer is None:
            try:
                from kafka import KafkaProducer
                bootstrap_servers = getattr(settings, 'KAFKA_BOOTSTRAP_SERVERS', ['localhost:9092'])
                cls._producer = KafkaProducer(
                    bootstrap_servers=bootstrap_servers,
                    value_serializer=lambda v: json.dumps(v).encode('utf-8'),
                    acks=1,                     # Leader acknowledgment for high throughput
                    retries=3,                  # Automatic retries on transient errors
                    max_block_ms=500,           # Max wait time before non-blocking fallback
                    linger_ms=10,               # Batch messages slightly to reduce network I/O
                    batch_size=16384            # 16KB batch size
                )
                logger.info("KafkaProducer initialized successfully.")
            except Exception as e:
                logger.warning(f"Kafka unavailable. Falling back to non-blocking local buffer: {e}")
                cls._producer = None
        return cls._producer

    @classmethod
    def publish_click_event(cls, event_data: dict):
        """
        Publishes click event asynchronously.
        Guarantees that redirect request path NEVER crashes or blocks if Kafka is down.
        """
        topic = getattr(settings, 'KAFKA_TOPIC_LINK_CLICKS', 'link-clicks')
        producer = cls.get_producer()

        if producer is not None:
            try:
                # Key partitioned by link_id to guarantee per-link click ordering
                key_bytes = str(event_data.get('link_id', '')).encode('utf-8')
                future = producer.send(topic, key=key_bytes, value=event_data)
                future.add_callback(cls._on_send_success)
                future.add_errback(cls._on_send_error)
                KAFKA_EVENTS_PUBLISHED_TOTAL.labels(status='success').inc()
                return True
            except Exception as e:
                logger.error(f"Failed to publish click event to Kafka: {e}")
                KAFKA_EVENTS_PUBLISHED_TOTAL.labels(status='error').inc()
        else:
            # High Availability Fallback: Process via Celery or log if Kafka is unreachable
            logger.warning(f"Kafka producer offline. Event buffered: {event_data.get('short_code')}")
            KAFKA_EVENTS_PUBLISHED_TOTAL.labels(status='buffered').inc()
            
            # Optional async Celery task fallback only if Redis broker is available
            has_redis = getattr(settings, 'HAS_REDIS', False)
            if has_redis and not getattr(settings, 'IS_TESTING', False) and not getattr(settings, 'USE_SQLITE', False):
                try:
                    from apps.analytics.tasks import process_single_click_event_fallback
                    process_single_click_event_fallback.delay(event_data)
                except Exception as celery_err:
                    logger.error(f"Fallback Celery dispatch failed: {celery_err}")


                
        return False

    @staticmethod
    def _on_send_success(record_metadata):
        logger.debug(f"Event published to topic={record_metadata.topic}, partition={record_metadata.partition}, offset={record_metadata.offset}")

    @staticmethod
    def _on_send_error(exc):
        logger.error(f"Kafka send error callback: {exc}")
        KAFKA_EVENTS_PUBLISHED_TOTAL.labels(status='error').inc()


click_producer = ClickEventProducer()
