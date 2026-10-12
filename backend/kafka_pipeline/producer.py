import json
import logging
import threading
from collections import deque
from django.conf import settings
from apps.common.metrics import KAFKA_EVENTS_PUBLISHED_TOTAL

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Thread-safe local spool for recoverable event publication
# ---------------------------------------------------------------------------
_spool_lock = threading.Lock()
_spool_buffer: deque = deque(maxlen=10_000)   # ring buffer capped at 10k events


def spool_event(event_data: dict):
    """Append an event to the thread-safe in-memory spool."""
    with _spool_lock:
        _spool_buffer.append(event_data)
    logger.debug(f"Event spooled locally. Spool depth: {len(_spool_buffer)}")


def drain_spool() -> list[dict]:
    """Pop all events from the spool in FIFO order (called when Kafka reconnects)."""
    with _spool_lock:
        events = list(_spool_buffer)
        _spool_buffer.clear()
    return events


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

                # Flush any previously spooled events on reconnection
                cls._flush_spool()

            except Exception as e:
                logger.warning(f"Kafka unavailable. Falling back to non-blocking local buffer: {e}")
                cls._producer = None
        return cls._producer

    @classmethod
    def _flush_spool(cls):
        """Re-publish any locally spooled events once Kafka reconnects."""
        spooled = drain_spool()
        if not spooled:
            return
        topic = getattr(settings, 'KAFKA_TOPIC_LINK_CLICKS', 'link-clicks')
        published = 0
        for evt in spooled:
            try:
                key_bytes = str(evt.get('link_id', '')).encode('utf-8')
                cls._producer.send(topic, key=key_bytes, value=evt)
                published += 1
            except Exception as e:
                logger.error(f"Failed to re-publish spooled event: {e}")
                spool_event(evt)  # put it back
                break
        if published:
            logger.info(f"Flushed {published} spooled events to Kafka on reconnect.")

    @classmethod
    def publish_click_event(cls, event_data: dict):
        """
        Publishes click event asynchronously.
        Guarantees that redirect request path NEVER crashes or blocks if Kafka is down.
        Falls back to a thread-safe local spool when Kafka is unreachable.
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
                # Spool locally so it can be retried later
                spool_event(event_data)
        else:
            # High Availability Fallback
            logger.warning(f"Kafka producer offline. Event spooled: {event_data.get('short_code')}")
            KAFKA_EVENTS_PUBLISHED_TOTAL.labels(status='buffered').inc()
            spool_event(event_data)

            # Celery fallback only if Redis broker is available
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
