# 🛡️ API Sentinel — API Monitoring & Uptime SaaS Platform

[![CI Pipeline](https://github.com/ajaykumar-21/api-monitoring-platform/actions/workflows/ci.yml/badge.svg)](https://github.com/ajaykumar-21/api-monitoring-platform/actions/workflows/ci.yml)
![Next.js](https://img.shields.io/badge/Next.js-15-black?logo=next.js)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Neon-blue?logo=postgresql)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?logo=typescript)

> **A full-stack, production-grade API Monitoring & Uptime SaaS platform (Mini UptimeRobot + Postman + Statuspage).**  
> Automatically monitors APIs, measures response latency, validates JSON payloads & SSL certificates, manages incident lifecycles with live public timeline steppers, sends multi-channel alerts (Email & Webhooks), and publishes public status pages.

---

## 📖 1. Project Description (In Simple Words)

When companies build software, their backend APIs, microservices, and SSL certificates can fail, expire, or return corrupted payloads without warning.

**API Sentinel** is your 24/7 automated observability platform:

1. **Configurable Endpoints**: Provide any HTTP/HTTPS URL, expected status code, custom headers, request payloads, assertions, and check intervals (1m, 5m, 15m).
2. **Deep Health Inspection**: Automatically measures response latency (ms), tests TLS/SSL certificate expiration days & CA issuers, and evaluates multi-field JSON assertions (`data.user.id`, regex, status).
3. **Smart Outage Detection & Multi-Channel Alerts**: Requires consecutive failures to eliminate false positives. When down, logs an incident and sends instant **Email (SMTP)** & **Webhook (Slack/Discord)** alerts.
4. **Live Incident Updates & Public Status Pages**: Provides a public status portal with 90-day uptime bars, a 4-stage live incident timeline stepper (`INVESTIGATING` → `IDENTIFIED` → `MONITORING` → `RESOLVED`), and historical incident archives.
5. **Dashboard Incident Hub**: Manage active incidents, manually declare outages, and post timestamped progress updates directly to subscribers and status page viewers.

---

## ✨ 2. Key Features

- **⏱️ Automated Periodic Pings**: High-precision HTTP/HTTPS health checks on customizable intervals (1m, 5m, 15m).
- **⚡ Advanced JSON & Response Assertions Engine**:
  - Assert on HTTP status codes, latency thresholds, response headers, or response bodies.
  - JSONPath / dot-notation evaluation (e.g. `data.status`, `items[0].id`).
  - Supports 10 condition operators: `EQUALS`, `NOT_EQUALS`, `GREATER_THAN`, `LESS_THAN`, `CONTAINS`, `NOT_CONTAINS`, `EXISTS`, `NOT_EXISTS`, `IS_NULL`, `MATCHES_REGEX`.
- **🔒 SSL / TLS Certificate Expiry Monitoring**:
  - Live SNI TLS handshake probing.
  - Days-remaining countdown with color-coded warning badges (`SSL: 85d`, `SSL: Expiring in 5d`, `SSL Expired`).
  - Automatic Certificate Authority / Issuer identification (`Let's Encrypt`, `Google Trust Services`, `DigiCert`, `Cloudflare`, etc.).
  - Protocol version badge (`TLS 1.3`) & dedicated Certificate Health card.
- **📢 Live Incident Management & Public Timeline**:
  - 4-stage visual timeline stepper (`Investigating` → `Identified` → `Monitoring` → `Resolved`).
  - Real-time timestamped progress notes stream on public status pages.
  - 7-day past incidents archive.
  - **Admin Incident Hub** (`/dashboard/incidents`) to declare outages and post status updates.
- **📈 Real-Time Latency Charts**: Interactive visual latency trends and response time distribution using **Recharts**.
- **🛡️ Smart Failure Thresholds**: Prevents false alarms by requiring consecutive failed pings before declaring an outage.
- **📬 Multi-Channel Alerting**: Instant notifications via **Email (SMTP / Nodemailer)** and **Webhooks (Discord / Slack)**.
- **🌐 Public Status Pages**: External-facing status board with 90-day visual health history bars.
- **✏️ Full Management Controls**: Create, edit, pause, resume, or delete monitors anytime with instant configuration reload.

---

## 🛠️ 3. Tech Stack & Architecture

| Technology                  | Role                   | Why We Used It                                                                                                   |
| :-------------------------- | :--------------------- | :--------------------------------------------------------------------------------------------------------------- |
| **Next.js 15 (App Router)** | Full-Stack Framework   | Unifies React frontend UI and backend REST API server in a single high-performance project.                      |
| **TypeScript**              | Language               | End-to-end type safety across database queries, assertion evaluations, and UI components.                        |
| **PostgreSQL (`pg`)**       | Database               | Enterprise relational database with connection pooling and automated schema migrations.                          |
| **Redis & BullMQ**          | Task Queue & Scheduler | Distributed job queues and recurring cron scheduling for background workers with in-memory dev fallback.         |
| **Tailwind CSS**            | Styling                | Modern, responsive dark-mode SaaS dashboard design with custom badge styling.                                    |
| **Recharts**                | Data Visualization     | Smooth, interactive latency line charts and response-time distribution graphs.                                   |
| **Axios**                   | HTTP Client            | Precise HTTP health checks and millisecond-level latency benchmarking.                                           |
| **TLS / Node.js `tls`**     | SSL Inspector          | Low-level socket handshake inspection for certificate authority details, valid dates, and TLS protocol versions. |
| **Nodemailer**              | Email Delivery         | Styled HTML alert emails when monitors trigger outages or recover.                                               |

---

## 🧠 4. Architectural Data Flow

```
 ┌────────────────────────────────────────────────────────┐
 │                    User Interface                      │
 │   Dashboard UI  •  Incident Hub  •  Public Status Page │
 └─────────────────────────┬──────────────────────────────┘
                           │ (REST API)
 ┌─────────────────────────▼──────────────────────────────┐
 │               Next.js Backend API Server               │
 │  (/api/monitors, /api/alerts, /api/incidents, /status) │
 └─────────────────────────┬──────────────────────────────┘
                           │
 ┌─────────────────────────▼──────────────────────────────┐
 │               PostgreSQL Database (pg)                 │
 │   monitors • ping_logs • incidents • incident_updates  │
 └─────────────────────────┬──────────────────────────────┘
                           │
 ┌─────────────────────────▼──────────────────────────────┐
 │               Background Worker Engine                 │
 │  1. Pings target URL & records latency (ms)            │
 │  2. Evaluates JSON assertions & regex rules            │
 │  3. Probes SSL handshake & days to expiry              │
 │  4. Increments failure count on assertion/ping fail    │
 │  5. If counter >= threshold -> Set DOWN & Open Incident│
 │  6. If service recovers -> Set UP & Send Alerts        │
 └────────────────────────────────────────────────────────┘
```

---

## 📂 5. Database Schema Breakdown

1. **`users`**: Developer profile and account credentials.
2. **`monitors`**: Target API endpoint configuration (URL, method, headers, JSON body, expected status, timeout limit, interval, status `UP`/`DOWN`, `assertions` JSON, `ssl_valid`, `ssl_days_remaining`, `ssl_issuer`, `ssl_valid_to`, `ssl_checked_at`).
3. **`ping_logs`**: Time-series log for every health check (status code, latency ms, success state, error reason, timestamp).
4. **`incidents`**: Tracks downtime events (`title`, `severity`, `status`, outage start time, recovery time, cause).
5. **`incident_updates`**: Multi-stage progress update notes (`incident_id`, `status`, `message`, `created_at`).
6. **`alert_channels`**: Notification channels (`EMAIL` or `WEBHOOK` URL).
7. **`status_pages`**: Public status page configuration and slug settings.

---

## 🐳 Quickstart with Docker (Recommended)

Run the entire platform (Web Dashboard + Background Worker + PostgreSQL Database + Redis Queue) with a single command:

### 1. Clone the repository

```bash
git clone https://github.com/ajaykumar-21/api-monitoring-platform.git
cd api-monitoring-platform
```

### 2. Copy environment file

```bash
cp .env.example .env
```

### 3. Start all services

```bash
docker compose up --build -d
```

That's it!

- **Web Dashboard & REST API**: [http://localhost:3000/dashboard](http://localhost:3000/dashboard)
- **PostgreSQL Database**: Port `5432`
- **Redis Queue**: Port `6379`
- **Background Monitoring Worker**: Automatically running and pinging endpoints!

To view logs or stop services:

```bash
# View live logs
docker compose logs -f

# Stop all services
docker compose down
```

---

## 🚀 6. Manual Installation & Setup (Without Docker)

### Prerequisites

- **Node.js** (v18 or higher)
- **PostgreSQL** (Local or Cloud instance e.g. Neon, Supabase)
- **Redis** _(Optional for local development; in-memory fallback included)_

---

### Step 1: Clone the Repository

```bash
git clone https://github.com/ajaykumar-21/api-monitoring-platform.git
cd api-monitoring-platform
```

### Step 2: Install Dependencies

```bash
npm install
```

### Step 3: Setup Environment Variables

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

Configure your connection credentials:

```env
DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@localhost:5432/api_sentinel"
REDIS_URL="redis://localhost:6379"

# (Optional) For real email inbox delivery:
SMTP_HOST="smtp.gmail.com"
SMTP_PORT="587"
SMTP_USER="your-email@gmail.com"
SMTP_PASS="your-app-password"
SMTP_FROM="alerts@api-sentinel.com"
```

### Step 4: Initialize Database Tables

Run the database initialization script:

```bash
npm run db:init
```

_(This automatically creates all tables and runs non-breaking column migrations in PostgreSQL!)_

### Step 5: Start the Full-Stack App

```bash
# Terminal 1: Start Next.js App (Dashboard, REST API & Public Status Pages)
npm run dev
```

Open **[http://localhost:3000/dashboard](http://localhost:3000/dashboard)** in your browser!

### Step 6: (Optional) Start the Background Worker

To run continuous background pings and SSL checks:

```bash
# Terminal 2: Start Background Worker
npm run worker
```

---

## 🧪 7. Verification & Testing Commands

```bash
# Run TypeScript static type check
npm run type-check

# Run JSON Assertions Engine test suite (17 test cases)
npm run test:assertions

# Run SSL / TLS Certificate Checker test suite
npm run test:ssl

# Run Incident Timeline & Lifecycle test suite
npm run test:incidents

# Test Production Build Compilation
npm run build

# Start Production Server
npm run start
```

---

## 🔄 8. CI/CD Pipeline Architecture

This project includes an automated **GitHub Actions CI/CD Pipeline** (`.github/workflows/ci.yml`):

```
 ┌────────────────────────────────────────────────────────┐
 │           Developer pushes code (git push)             │
 └─────────────────────────┬──────────────────────────────┘
                           │ (Triggers GitHub Actions)
 ┌─────────────────────────▼──────────────────────────────┐
 │             Continuous Integration (CI)                │
 │  1. Checkout code & Setup Node.js 20 environment       │
 │  2. Install dependencies with `npm ci`                 │
 │  3. Run TypeScript static type check (`npm type-check`)│
 │  4. Verify production build compilation (`npm build`)  │
 └─────────────────────────┬──────────────────────────────┘
                           │ (If all checks pass 🟢)
 ┌─────────────────────────▼──────────────────────────────┐
 │             Continuous Deployment (CD)                 │
 │  • Automatically deploys live build to Vercel          │
 │  • Automated health check cron trigger via cron-job.org│
 └────────────────────────────────────────────────────────┘
```

---

## 📄 License

This project is open-source and available under the **MIT License**.
