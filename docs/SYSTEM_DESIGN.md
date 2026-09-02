# High-Scale System Design — URL Shortener & Link Analytics Platform

This document outlines the architectural roadmap for scaling the URL shortener platform from 1,000 requests/day to **Billions of redirects/day**.

---

## 1. Scale Transition Matrix

| Scale | QPS (Redirects) | Database Strategy | Cache Strategy | Event Processing |
| :--- | :--- | :--- | :--- | :--- |
| **1,000 / day** | ~0.01 QPS | Single PostgreSQL node | Redis single instance | Direct DB writes or Async Celery |
| **1 Million / day** | ~12 QPS | Single PostgreSQL node | Redis Cluster (Cache-Aside) | Single Kafka topic partition |
| **100 Million / day**| ~1,150 QPS | Primary DB + 3 Read Replicas | Multi-Region Redis Cluster | Kafka (16 partitions) + Consumer Group |
| **1 Billion / day** | ~11,500 QPS | Sharded PostgreSQL + TimescaleDB | Global CDN Edge (Cloudflare/CloudFront) | Distributed Kafka Stream Workers |

---

## 2. Architectural Blueprint for 100M+ Requests/Day

```
                                  ┌───────────────────────────┐
                                  │      Cloudflare CDN       │
                                  │  (Edge Cache 301/302s)    │
                                  └─────────────┬─────────────┘
                                                │ (Cache Miss)
                                                ▼
                                  ┌───────────────────────────┐
                                  │   AWS ALB / Nginx Mesh    │
                                  └─────────────┬─────────────┘
                                                │
                                ┌───────────────┴───────────────┐
                                ▼                               ▼
                     ┌────────────────────┐          ┌────────────────────┐
                     │ Django API Pod #1  │  ...     │ Django API Pod #N  │
                     └─────────┬──────────┘          └─────────┬──────────┘
                               │                               │
                ┌──────────────┼───────────────────────────────┘
                │              │
                ▼              ▼
         ┌─────────────┐┌─────────────┐
         │ Redis Cluster││ Apache Kafka│
         │ (Memory L1) ││ (Partitions)│
         └──────┬──────┘└──────┬──────┘
                │              │
                ▼              ▼
         ┌─────────────┐┌─────────────┐
         │ PostgreSQL  ││ Analytics   │
         │ Read Replica││ Consumers   │
         └─────────────┘└──────┬──────┘
                               │
                               ▼
                        ┌─────────────┐
                        │ Partitioned │
                        │ TimescaleDB │
                        └─────────────┘
```

---

## 3. Core Scale Engineering Techniques

### 3.1 CDN Edge Redirection (Sub-5ms Latency)
* **Strategy**: Cache static short link mappings (`short_code -> original_url`) at CDN Edge Workers (Cloudflare Workers / AWS CloudFront KeyValueStore).
* **Benefit**: Eliminates origin server roundtrips for 95%+ of global redirect traffic.
* **Cache Invalidation**: On link deletion or status disable, send Purge API request to CDN tag.

### 3.2 Database Sharding & Partitioning
* **Link Key Sharding**: Hash partition `links` table across multiple PostgreSQL database nodes using `hash(short_code) % N_shards`.
* **Click Event Partitioning**: Range-partition `link_click_events` table by month (`clicked_at`). Detach and archive historical partitions older than 1 year to S3/Cold storage.

### 3.3 Cache Stampede (Thundering Herd) Prevention
* **Probabilistic Early Expiration (XFetch)**:
  $$\text{Compute } \delta = -\beta \cdot \log(\text{random}()) \cdot \text{compute\_time}$$
  If `now - delta > expiry`, recompute cache before it expires in background thread.
* **Redis Distributed Mutex (`SET key val NX EX 10`)**: Ensures only 1 worker queries DB on cache miss while other threads wait 50ms and retry Redis.

---

## 4. Bottleneck & Tradeoff Summary

1. **Write Contention on `click_count`**:
   * *Problem*: Concurrent SQL `UPDATE links SET click_count = click_count + 1` locks rows.
   * *Solution*: Remove synchronous DB updates. Rely exclusively on Kafka consumer batch aggregation into `DailyLinkMetrics` rollups.
2. **Duplicate Kafka Events**:
   * *Problem*: Network retries cause duplicate event processing (*At-least-once delivery*).
   * *Solution*: Deduplicate events in consumer using Redis HyperLogLog or SQL `ON CONFLICT (link_id, event_uuid) DO NOTHING`.
