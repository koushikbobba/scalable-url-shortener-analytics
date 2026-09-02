# SDE Resume Bullets — Scalable URL Shortener & Link Analytics Platform

Use these bullet points on your resume for Backend / Software Engineer applications.

---

## Resume Bullet Set 1 (Focus: Systems Architecture & Performance)
* **Architected and built a high-throughput, event-driven URL shortener and analytics platform** using Python (Django REST Framework), PostgreSQL, Redis, Apache Kafka, Celery, and React, achieving sub-10ms redirect latency.
* **Engineered a Redis Cache-Aside topology** with distributed mutex locks to prevent Cache Stampedes and eliminate 85%+ of read queries to PostgreSQL during peak traffic spikes.
* **Designed an asynchronous click-stream pipeline** using Apache Kafka and standalone Python consumers, ingesting 500+ click events/batch into PostgreSQL without adding overhead to the HTTP redirect critical path.
* **Implemented Redis sliding-window rate limiting** and custom DRF middleware to prevent abuse, while maintaining 99.99% service availability with graceful database fallback during cache outages.
* **Instrumented full-stack observability** using Prometheus metrics and Grafana dashboards tracking p95/p99 request latencies, cache hit ratios, and Kafka consumer lag.

---

## Resume Bullet Set 2 (Focus: Scalability & Event-Driven Processing)
* **Designed scalable URL shortened Base62 encoding service** ($62^7$ keyspace) supporting custom aliases with atomic database collision handling and reserved keyword protection.
* **Built GDPR-compliant real-time click stream analytics engine**, extracting GeoIP, User-Agent, and hashed IP signatures into time-series rollups and interactive React dashboard charts.
* **Configured multi-container Docker Compose infrastructure** hosting PostgreSQL 16, Redis 7, Apache Kafka (KRaft mode), Gunicorn, Celery Beat, Prometheus, and Nginx.
* **Executed load testing using Locust**, profiling cache hit/miss scenarios and optimizing database indexes to achieve high-concurrency throughput under heavy read-to-write (100:1) ratios.
