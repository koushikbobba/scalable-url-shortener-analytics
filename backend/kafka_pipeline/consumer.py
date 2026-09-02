import os
import sys
import json
import time
import signal
import logging
from pathlib import Path

# Setup Django environment for standalone script execution
BASE_DIR = Path(__file__).resolve().parent.parent
sys.path.append(str(BASE_DIR))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')

import django
django.setup()

from django.conf import settings
from kafka import KafkaConsumer
from apps.analytics.services import AnalyticsIngestionService

logging.basicConfig(
    level=logging.INFO,
    format='[%(asctime)s] %(levelname)s [%(name)s] %(message)s'
)
logger = logging.getLogger("KafkaAnalyticsConsumer")

RUNNING = True


def handle_shutdown(signum, frame):
    global RUNNING
    logger.info(f"Received termination signal ({signum}). Initiating graceful shutdown...")
    RUNNING = False


signal.signal(signal.SIGINT, handle_shutdown)
signal.signal(signal.SIGTERM, handle_shutdown)


def run_consumer():
    topic = getattr(settings, 'KAFKA_TOPIC_LINK_CLICKS', 'link-clicks')
    bootstrap_servers = getattr(settings, 'KAFKA_BOOTSTRAP_SERVERS', ['localhost:9092'])
    group_id = getattr(settings, 'KAFKA_CONSUMER_GROUP', 'analytics-processor-group')

    logger.info(f"Connecting to Kafka at {bootstrap_servers}, topic: {topic}, group: {group_id}")

    consumer = None
    while RUNNING and consumer is None:
        try:
            consumer = KafkaConsumer(
                topic,
                bootstrap_servers=bootstrap_servers,
                group_id=group_id,
                auto_offset_reset='earliest',
                enable_auto_commit=False,  # Manual offset commit for At-Least-Once delivery guarantee
                value_deserializer=lambda x: json.loads(x.decode('utf-8')),
                max_poll_records=500,      # High-throughput batch size
                max_poll_interval_ms=300000,
                consumer_timeout_ms=1000
            )
            logger.info("Kafka consumer connected successfully.")
        except Exception as e:
            logger.warning(f"Kafka connection attempt failed: {e}. Retrying in 5 seconds...")
            time.sleep(5)

    if not RUNNING or consumer is None:
        return

    logger.info("Starting Kafka message consumption loop...")

    try:
        while RUNNING:
            try:
                msg_pack = consumer.poll(timeout_ms=1000, max_records=500)
                if not msg_pack:
                    continue

                events_batch = []
                for tp, messages in msg_pack.items():
                    for msg in messages:
                        events_batch.append(msg.value)

                if events_batch:
                    start_t = time.time()
                    processed_count = AnalyticsIngestionService.process_batch(events_batch)
                    duration = time.time() - start_t
                    logger.info(f"Processed batch of {processed_count} events in {duration*1000:.2f}ms.")

                    # Manually commit offsets after verified PostgreSQL transaction
                    consumer.commit()
                    logger.debug("Committed Kafka consumer offsets successfully.")

            except Exception as loop_err:
                logger.error(f"Error during consumer poll/processing loop: {loop_err}", exc_info=True)
                time.sleep(2)

    finally:
        logger.info("Closing Kafka consumer connection...")
        if consumer:
            consumer.close()
        logger.info("Kafka consumer shut down cleanly.")


if __name__ == '__main__':
    run_consumer()
