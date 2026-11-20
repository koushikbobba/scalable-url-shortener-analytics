# LinkStream — Scalable URL Shortener & Link Analytics Platform (MERN Stack)

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/Node.js-20.x-green.svg)](https://nodejs.org/)
[![Express](https://img.shields.io/badge/Express-4.19-black.svg)](https://expressjs.com/)
[![MongoDB](https://img.shields.io/badge/MongoDB-7.0-brightgreen.svg)](https://www.mongodb.com/)
[![Redis](https://img.shields.io/badge/Redis-7.2-red.svg)](https://redis.io/)
[![React](https://img.shields.io/badge/React-18.2-61dafb.svg)](https://reactjs.org/)

**LinkStream** is a production-grade, high-performance URL shortener and real-time click stream analytics platform built on the **MERN stack** (MongoDB, Express, React, Node.js) with **Redis caching & rate limiting**, **Prometheus observability**, and automated **cron jobs**.

---

## 🚀 Key Features

* **Sub-10ms Short URL Redirection**: High-speed `GET /{short_code}` redirect engine powered by **Redis Cache-Aside** read caching (with negative 404 caching to protect the database).
* **Base62 Short Code Generation**: Collision-safe encoding algorithm ($62^7 \approx 3.52 \text{ Trillion}$ combinations) with custom alias support and reserved keyword validation.
* **Non-Blocking Click Telemetry Pipeline**: Asynchronously ingests click events using Node.js event-loop workers without delaying redirect HTTP 302 responses.
* **GDPR-Compliant Analytics Engine**: Anonymized IP SHA-256 hashing, User-Agent device/browser/OS parsing, referrer tracking, and multi-dimensional MongoDB aggregation pipelines.
* **Distributed Rate Limiting**: Redis-backed **Sliding Window Rate Limiter** protecting public redirect endpoints (30 req/min), authenticated endpoints (60 req/min), and link creation APIs (20 links/min).
* **Interactive React Dashboard**: Modern UI built with React 18, Vite, Tailwind CSS, Lucide icons, and Recharts graph visualizations.
* **Full-Stack Observability**: Embedded Prometheus exporter endpoint (`/metrics`) and pre-configured Grafana dashboards monitoring QPS, P95/P99 latency, and cache hit ratios.
* **Automated Cron Scheduling**: `node-cron` workers aggregating hourly rollups into `DailyMetrics` and weekly pruning of click records past the 90-day retention window.
* **Multi-Container Docker Architecture**: Containerized stack powered by `docker-compose`.

---

## 🏗 System Architecture

```
                    ┌──────────────┐
                    │    Client    │
                    └──────┬───────┘
                           │
                    ┌──────▼───────┐
                    │  React UI    │ (Port 3000 / Vite)
                    └──────┬───────┘
                           │
                    ┌──────▼───────┐
                    │  Express.js  │ (Port 5000)
                    │  Node.js API │
                    └───┬──────┬───┘
                        │      │
              ┌─────────▼─┐  ┌─▼─────────┐
              │   Redis   │  │  MongoDB  │
              │Cache & RL │  │ (Cluster) │
              └─────┬─────┘  └───────────┘
                    │
            ┌───────▼────────┐
            │ node-cron Jobs │
            │ (Rollup/Prune) │
            └────────────────┘
```

---

## 📂 Project Structure

```
├── backend/                  # Node.js + Express + MongoDB Backend
│   ├── src/
│   │   ├── config/           # Database (Mongoose) & Redis connections
│   │   ├── middleware/       # JWT Auth, Sliding-Window Rate Limiter, Prometheus
│   │   ├── models/           # User, Link, ClickEvent, DailyMetrics
│   │   ├── routes/           # Auth, Links, Analytics, Redirect, Health
│   │   ├── scheduler/        # node-cron recurring tasks
│   │   ├── services/         # LinkService, AnalyticsService
│   │   ├── utils/            # Base62 encoder, IP hashing, User-Agent parser
│   │   └── server.js         # Main Express entry point
│   ├── tests/                # Jest + Supertest integration tests
│   ├── Dockerfile
│   └── package.json
├── frontend/                 # React 18 + Vite + Tailwind CSS Dashboard
│   ├── src/
│   │   ├── api/              # Axios client (configured to backend port 5000)
│   │   ├── components/       # UI components, modals, charts
│   │   └── pages/            # Dashboard, Link details, Auth pages
│   └── vite.config.js
├── monitoring/               # Prometheus & Grafana configurations
│   ├── prometheus/
│   └── grafana/
└── docker-compose.yml        # Orchestration for MongoDB, Redis, Backend, Frontend
```

---

## ⚡ Quick Start (Local Development)

### 1. Prerequisites
- **Node.js** ≥ 18
- **MongoDB** (running on `mongodb://127.0.0.1:27017` or MongoDB Atlas)
- **Redis** (running on `redis://127.0.0.1:6379`, optional — automatically degrades to memory fallback)

### 2. Start the Backend
```bash
cd backend
npm install
npm run dev
```
*Backend runs on: `http://127.0.0.1:5000`*

### 3. Start the Frontend
```bash
cd frontend
npm install
npm run dev
```
*Frontend runs on: `http://127.0.0.1:3000`*

---

## 🐳 Docker Deployment

To spin up the entire cluster with a single command:

```bash
docker-compose up --build -d
```

| Service | Port | Description |
|---|---|---|
| **Frontend** | `3000` | React Dashboard UI |
| **Backend** | `5000` | Express REST API |
| **MongoDB** | `27017` | Document Database |
| **Redis** | `6379` | In-Memory Cache & Limiter |
| **Prometheus** | `9090` | Metrics Scraper |
| **Grafana** | `3001` | Observability Dashboards |

---

## 🧪 Testing

```bash
cd backend
npm test
```

---

## 📄 License
This project is licensed under the MIT License.
