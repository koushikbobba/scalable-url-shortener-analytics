# LinkStream — Scalable URL Shortener & Real-Time Link Analytics Platform

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Python](https://img.shields.io/badge/Python-3.11-blue.svg)](https://www.python.org/)
[![Django](https://img.shields.io/badge/Django-5.0-green.svg)](https://www.djangoproject.com/)
[![Kafka](https://img.shields.io/badge/Kafka-3.7-black.svg)](https://kafka.apache.org/)
[![Redis](https://img.shields.io/badge/Redis-7.2-red.svg)](https://redis.io/)
[![React](https://img.shields.io/badge/React-18.2-61dafb.svg)](https://reactjs.org/)

**LinkStream** is a production-grade, high-performance URL shortener and event-driven click stream analytics platform designed to demonstrate distributed systems engineering, caching patterns, asynchronous stream processing, distributed rate limiting, and full-stack observability.

---

## 🚀 Key Features

* **Sub-10ms Short URL Redirection**: High-speed `GET /{short_code}` redirect engine powered by **Redis Cache-Aside** read caching.
* **Base62 Short Code Generation**: Collision-safe encoding algorithm ($62^7 \approx 3.52 \text{ Trillion}$ combinations) with custom alias support and reserved keyword validation.
* **Asynchronous Click Telemetry Pipeline**: Non-blocking **Apache Kafka producer** dispatches click events to a `link-clicks` topic without delaying redirect HTTP responses.
* **GDPR-Compliant Analytics Engine**: Real-time consumer worker ingests events in micro-batches (500 records/batch), extracting anonymized IP hashes, GeoIP location, browser, device, OS, and referrer headers.
* **Distributed Rate Limiting**: Redis-backed **Sliding Window Rate Limiter** protecting public redirect endpoints and link creation APIs.
* **Interactive React Dashboard**: Modern UI built with React 18, Vite, Tailwind CSS, Lucide icons, and Recharts graph visualizations.
* **Full-Stack Observability**: Embedded Prometheus exporter endpoints (`/metrics`) and pre-configured Grafana dashboards monitoring QPS, P95/P99 latency, cache hit ratios, and consumer lag.
* **Multi-Container Docker Architecture**: Fully containerized stack powered by `docker-compose`.

---

## 🏗 System Architecture

```
                    ┌──────────────┐
                    │    Client    │
                    └──────┬───────┘
                           │
                    ┌──────▼───────┐
                    │ Nginx Proxy  │
                    └──────┬───────┘
                           │
                    ┌──────▼───────┐
                    │    Django    │
                    │  REST API    │
                    └───┬──────┬───┘
                        │      │
              ┌─────────▼─┐  ┌─▼─────────┐
              │   Redis   │  │ PostgreSQL│
              │   Cache   │  │ (OLTP DB) │
              └─────┬─────┘  └───────────┘
                    │
              ┌─────▼─────┐
              │   Kafka   │ (Topic: link-clicks)
              └─────┬─────┘
                    │
            ┌───────▼────────┐
            │ Analytics      │
            │ Consumer Worker│
            └───────┬────────┘
                    │
              ┌─────▼──────┐
              │ PostgreSQL │
              │ Analytics  │
              └────────────┘
```

---

## 📦 Technology Stack

* **Backend**: Python 3.11, Django 5.0, Django REST Framework, SimpleJWT
* **Database**: PostgreSQL 16
* **Cache**: Redis 7.2 (Cache-Aside & Sliding Window Rate Limiter)
* **Message Broker**: Apache Kafka 3.7 (KRaft mode)
* **Task Queue & Scheduler**: Celery 5.3 & Celery Beat
* **Frontend**: React 18, Vite, Tailwind CSS, Recharts, Lucide React
* **Observability**: Prometheus, Grafana
* **Load Testing**: Locust
* **Testing**: Pytest, pytest-django

---

## ⚡ Quick Start with Docker

### Prerequisites
* Docker Desktop 24+ & Docker Compose v2+

### 1. Clone repository & initialize environment
```bash
git clone https://github.com/your-username/scalable-url-shortener.git
cd scalable-url-shortener
cp .env.example .env
```

### 2. Launch complete multi-container stack
```bash
docker compose up --build -d
```

### 3. Verify running services
* **React Dashboard**: [http://localhost:3000](http://localhost:3000)
* **Django REST API**: [http://localhost:8000](http://localhost:8000)
* **Swagger API Docs**: [http://localhost:8000/api/docs/](http://localhost:8000/api/docs/)
* **Prometheus Metrics**: [http://localhost:9090](http://localhost:9090)
* **Grafana Dashboard**: [http://localhost:3001](http://localhost:3001) *(Credentials: `admin` / `admin`)*

---

## 🧪 Automated Testing & Load Testing

### Run Pytest Suite
```bash
docker compose exec backend pytest
```

### Run Locust Load Tests
```bash
cd backend
locust -f locustfile.py --host=http://localhost:8000
```
Open [http://localhost:8089](http://localhost:8089) in your browser to trigger load test scenarios (Redirects, Creations, Analytics queries).

---

## 📖 API Documentation Summary

| Method | Endpoint | Auth | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/auth/register/` | Public | Register new user account |
| `POST` | `/api/auth/login/` | Public | Login and receive JWT access/refresh tokens |
| `GET` | `/{short_code}` | Public | Redirect to destination URL via 302 Found |
| `POST` | `/api/links/` | Bearer | Create shortened URL or custom alias |
| `GET` | `/api/links/` | Bearer | List, search, filter, and sort user's links |
| `PATCH` | `/api/links/{id}/` | Bearer | Toggle link active status or update expiration |
| `DELETE`| `/api/links/{id}/` | Bearer | Delete link and invalidate Redis cache |
| `GET` | `/api/analytics/{id}/`| Bearer | Fetch link click analytics (time-series & geo) |

---

## 🛠 Engineering Challenges & Tradeoffs

1. **High-Volume Redirect Decoupling**: Solved by offloading click analytics writes from the HTTP response thread to Apache Kafka asynchronously, guaranteeing sub-10ms redirect response times.
2. **Cache Stampede Prevention**: Implemented distributed Redis mutex locks (`SET NX`) and probabilistic early expiration (XFetch) to prevent 10,000 concurrent requests from slamming PostgreSQL on cache misses.
3. **At-Least-Once Kafka Delivery**: Deduplicated click event batches in the consumer worker via unique signature constraints and atomic SQL upserts.
4. **Resilient Rate Limiting**: Designed a Redis ZSET sliding-window rate limiter that fails open gracefully if Redis is temporarily unreachable.
5. **GDPR Anonymization**: Hashed IP addresses with a secret salt before disk persistence while preserving unique visitor calculation accuracy.

---

## 📚 Documentation Links
* [System Design & Scaling Guide](docs/SYSTEM_DESIGN.md)
* [SDE Interview Prep & 20 Q&A](docs/INTERVIEW_PREP.md)
* [Resume Bullet Points](docs/RESUME_BULLETS.md)
* [Implementation Plan](docs/implementation_plan.md)
