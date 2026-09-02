# SDE Interview Preparation Guide — URL Shortener & Link Analytics Platform

This guide equips you to present, explain, and defend every engineering decision made in this project during technical SDE interviews.

---

## 1. The 2-Minute Elevator Pitch

> "I designed and built **LinkStream**, a production-style, high-throughput URL shortener and real-time click stream analytics platform using **Python (Django REST Framework), PostgreSQL, Redis, Apache Kafka, Celery, and React**.
> 
> The core architectural challenge was decoupling the **sub-10ms URL redirection path** from heavy analytics ingestion. When a request hits a short URL, the system uses a **Redis Cache-Aside topology** to resolve the destination instantly without querying the primary database. Rather than executing blocking DB writes for click telemetry, the redirect view asynchronously publishes click events to an **Apache Kafka topic (`link-clicks`)**.
> 
> A dedicated **Kafka consumer worker** ingests events in micro-batches (500 records/batch), anonymizes IP addresses for GDPR compliance, performs user-agent parsing and geo-location extraction, and bulk-inserts raw events into PostgreSQL alongside hourly rollup aggregations.
> 
> To protect against abuse and thundering herd failures, I implemented **Redis sliding window rate-limiting**, distributed mutex locks, and Prometheus/Grafana observability tracking p95/p99 latencies, cache hit ratios, and consumer lag."

---

## 2. The 10-Minute Deep Dive Roadmap

1. **Architecture & Critical Path** (2 mins): Draw the Client -> Load Balancer -> Stateless API -> Redis Cache -> Kafka Topic -> Worker pipeline.
2. **Short Code Generation & Collision Mechanics** (2 mins): Explain Base62 ($62^7 \approx 3.5\text{T}$ combinations) vs Hash vs Base62(ID), unique constraints, and atomic retry loops.
3. **Caching & Resiliency** (2 mins): Explain Cache-Aside, Cache Stampede (mutex `SET NX`), TTL strategy, and graceful degradation when Redis is down.
4. **Asynchronous Telemetry Pipeline** (2 mins): Explain why Kafka over synchronous DB writes, consumer group offset commits, batch processing, and At-Least-Once delivery handling.
5. **Observability & Benchmarking** (2 mins): Discuss Prometheus metrics, Locust load test methodology, identified bottlenecks, and scaling limits.

---

## 3. 20 Project-Specific Interview Questions & Model Answers

### Category 1: Architecture & Distributed Systems (Hard)

#### Q1: Why did you use Kafka instead of RabbitMQ or Celery for click analytics?
**Answer**: 
Click events are high-volume log-append data where order retention per link and high-throughput durability matter. 
- **Kafka** supports persistent disk-backed topic partitions, consumer group offset tracking, and log replayability. It can buffer millions of incoming click events during traffic spikes without memory exhaustion.
- **RabbitMQ/Celery** are message queues designed for task execution lifecycle where messages are removed immediately upon acknowledgment. Celery is great for background jobs (like daily rollups), while Kafka is superior for real-time stream ingestion.

#### Q2: How do you handle duplicate click events in your Kafka consumer (*At-Least-Once delivery*)?
**Answer**: 
Kafka guarantees at-least-once delivery, meaning network retries can send the same event twice. We handle this via **idempotent batch processing**:
1. Every click event is assigned a unique `event_uuid` or `(link_id, ip_hash, rounded_minute_timestamp)` signature.
2. The consumer performs bulk insertion with `ON CONFLICT (link_id, ip_hash, clicked_at_minute) DO NOTHING` or deduplicates events using a short-lived Redis Bloom Filter before writing to PostgreSQL.

#### Q3: What happens if Redis completely crashes during peak traffic?
**Answer**: 
Our system incorporates **Graceful Degradation**:
1. `LinkService.get_destination()` catches Redis connection exceptions (`redis.exceptions.ConnectionError`) and logs a warning without raising an HTTP 500 error.
2. The view gracefully falls back to querying PostgreSQL directly via indexed `short_code` lookups.
3. To protect PostgreSQL from getting overwhelmed during a total Redis outage, a local in-memory LRU cache (or circuit breaker) throttles DB queries.

---

### Category 2: Data Structures & Algorithms (Medium)

#### Q4: How does Base62 short-code generation work, and why length 7?
**Answer**: 
Base62 uses `[0-9a-zA-Z]` (62 characters). 
A code of length 7 provides $62^7 = 3,521,614,606,208$ (~3.52 Trillion) unique short URLs. 
At a creation rate of 1,000 URLs per second, it would take over **100 years** to exhaust the keyspace.

#### Q5: How do you prevent short-code collisions when two users simultaneously request auto-generated short URLs?
**Answer**: 
1. The system attempts random Base62 generation and checks for existence.
2. At the database tier, `short_code` has a `UNIQUE` constraint index.
3. Creation is wrapped in a `transaction.atomic()` block with exception handling for `IntegrityError`. If a collision occurs concurrently, the catch block triggers an immediate retry with fresh random entropy.

---

### Category 3: Database & Performance Optimization (Medium)

#### Q6: Explain your indexing strategy on the `links` and `link_click_events` tables.
**Answer**: 
- `links` table:
  - `short_code`: `VARCHAR(64) UNIQUE` (B-Tree index) for $O(\log N)$ redirect lookups.
  - `(user_id, -created_at)`: Composite index to optimize user dashboard queries with pagination (`WHERE user_id = X ORDER BY created_at DESC`).
  - `(is_active, expires_at)`: Index for background cleanup tasks querying expired links.
- `link_click_events` table:
  - `(link_id, -clicked_at)`: Composite index for link-specific analytics time-series queries.

#### Q7: Why do you store IP addresses as SHA-256 hashes instead of raw strings?
**Answer**: 
Storing raw IP addresses violates privacy regulations like **GDPR**. By hashing the client IP with a secret salt (`hashlib.sha256(ip + salt)`), we can compute distinct count unique visitors (`COUNT(DISTINCT ip_hash)`) without storing Personally Identifiable Information (PII).

---

### Category 4: Rate Limiting & Security (Easy/Medium)

#### Q8: How does your Redis sliding window rate limiter work?
**Answer**: 
We use a Redis Sorted Set (`ZSET`):
1. Key format: `ratelimit:{action}:{identifier}`.
2. Score & Member: Current Unix timestamp in seconds / UUID.
3. Operations:
   - `ZREMRANGEBYSCORE` removes timestamps outside `[now - 60s, now]`.
   - `ZCARD` counts active requests in the current rolling window.
   - If `count >= limit`, return `429 Too Many Requests`. Else `ZADD` current timestamp and set TTL.

#### Q9: How do you prevent Server-Side Request Forgery (SSRF) when users submit long URLs?
**Answer**: 
Before storing a destination URL, `is_ssrf_safe_url()` validates that the scheme is strictly `http` or `https` and uses regex pattern matching to reject local loopback (`127.0.0.1`), private networks (`10.0.0.0/8`, `192.168.0.0/16`), and cloud metadata endpoints (`169.254.169.254`).
