# 🛡️ API Sentinel — API Monitoring & Uptime SaaS Platform

[![CI Pipeline](https://github.com/ajaykumar-21/api-monitoring-platform/actions/workflows/ci.yml/badge.svg)](https://github.com/ajaykumar-21/api-monitoring-platform/actions/workflows/ci.yml)
![Next.js](https://img.shields.io/badge/Next.js-15-black?logo=next.js)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Neon-blue?logo=postgresql)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?logo=typescript)

> **A full-stack, production-grade API Monitoring & Uptime SaaS platform (Mini UptimeRobot + Postman).**  
> Automatically monitors APIs, measures response latency, tracks incidents, sends multi-channel alerts (Email & Webhooks), and publishes live public status pages.

---

## 📖 1. Project Description (In Simple Words)

When companies build software, their backend APIs and microservices can crash, slow down, or return errors without notice.

**API Sentinel** is a tool that acts as your 24/7 automated watcher:

1. You give it an API URL (e.g. `https://api.example.com/users`), expected HTTP status (e.g. `200`), and check interval (e.g. `Every 1 minute`).
2. The system periodically pings your API in the background and measures response time in milliseconds (ms).
3. If the API fails consecutively or takes too long to respond, it marks the service as **`DOWN 🔴`**, logs an incident, and immediately sends an **Email & Webhook alert**!
4. When the API recovers, it marks it back as **`UP 🟢`** and sends a recovery notification.
5. It also provides a **Public Status Page** (like `status.github.com`) that anyone can view to check system health.

---

## ✨ 2. Key Features

- **⏱️ Automated Periodic Pings**: Checks API health on customizable intervals (1 minute, 5 minutes, 15 minutes).
- **📈 Real-Time Latency Charts**: Interactive visual charts showing response time trends over time using **Recharts**.
- **🎯 Postman-Style Request Options**: Custom HTTP methods (`GET`, `POST`, `PUT`, `DELETE`), custom headers, JSON body, timeout limits, and expected status codes.
- **🛡️ Smart Failure Thresholds**: Prevents false alarms by requiring consecutive failures (e.g. 2 failed checks) before triggering a downtime alert.
- **📬 Multi-Channel Alerting**: Instant notifications via **Email (SMTP/Nodemailer)** and **Webhooks (Discord / Slack)**.
- **🌐 Public Status Pages**: External-facing status board with 90-day visual health history bars.
- **✏️ Full Edit & Management Controls**: Edit endpoint settings, adjust timeouts, pause/resume monitoring, or delete monitors anytime.

---

## 🛠️ 3. Tech Stack & Why We Used Each Tool

| Technology                  | Role                   | Why We Used It (In Simple Words)                                                                                                         |
| :-------------------------- | :--------------------- | :--------------------------------------------------------------------------------------------------------------------------------------- |
| **Next.js 15 (App Router)** | Full-Stack Framework   | Acts as **both** the React frontend UI and the backend REST API server in a single project. No need to run a separate backend server!    |
| **TypeScript**              | Language               | Provides strict type safety, prevents runtime bugs, and makes code maintainable and easy to understand.                                  |
| **PostgreSQL (`pg`)**       | Database               | Industry-standard relational database. We use the native `pg` (`node-postgres`) connection pool for high-performance SQL queries.        |
| **Redis & BullMQ**          | Task Queue & Scheduler | Handles distributed job queues and repeating cron schedules for background workers (with an automatic in-memory fallback for local dev). |
| **Tailwind CSS**            | Styling                | Provides a modern, responsive, dark-mode SaaS dashboard design out of the box.                                                           |
| **Recharts**                | Data Visualization     | Renders smooth, interactive latency graphs and response-time distribution charts.                                                        |
| **Axios**                   | HTTP Client            | Performs high-precision HTTP health checks and accurately measures latency in milliseconds.                                              |
| **Nodemailer**              | Email Delivery         | Delivers styled HTML alert emails to user inboxes when an API goes DOWN or RECOVERED.                                                    |

---

## 🧠 4. How It Works (The Architectural Approach)

```
 ┌────────────────────────────────────────────────────────┐
 │                    User Interface                      │
 │    Dashboard UI  •  Analytics Charts  •  Status Page   │
 └─────────────────────────┬──────────────────────────────┘
                           │ (REST API)
 ┌─────────────────────────▼──────────────────────────────┐
 │               Next.js Backend API Server               │
 │       (/api/monitors, /api/alerts, /api/status)        │
 └─────────────────────────┬──────────────────────────────┘
                           │
 ┌─────────────────────────▼──────────────────────────────┐
 │               PostgreSQL Database (pg)                 │
 │  (monitors, ping_logs, incidents, alert_channels)      │
 └─────────────────────────┬──────────────────────────────┘
                           │
 ┌─────────────────────────▼──────────────────────────────┐
 │               Background Worker Engine                 │
 │  1. Pings target URL & records latency (ms)            │
 │  2. Validates Expected Status (e.g. 200) vs Actual     │
 │  3. Checks Timeout Threshold (e.g. 10,000ms)           │
 │  4. Increments failure counter if check fails          │
 │  5. If counter >= threshold -> Set DOWN & Send Alert   │
 │  6. If service recovers -> Set UP & Send Recovery      │
 └────────────────────────────────────────────────────────┘
```

---

## 📂 5. Database Tables Breakdown

1. **`users`**: Developer profile and account details.
2. **`monitors`**: Target API endpoint configuration (URL, method, headers, expected status, timeout limit, check interval, status `UP`/`DOWN`).
3. **`ping_logs`**: Time-series log for every health check (status code, latency ms, success state, error reason, timestamp).
4. **`incidents`**: Tracks downtime events (`OPEN` vs `RESOLVED`, outage start time, recovery time, cause).
5. **`alert_channels`**: Destinations to notify on outage (`EMAIL` address or `WEBHOOK` URL).
6. **`status_pages`**: Public status page configuration.

---

## 🚀 6. Step-by-Step Installation & Setup

### Prerequisites

- **Node.js** (v18 or higher)
- **PostgreSQL** (Installed locally or via pgAdmin / Cloud PostgreSQL)

---

### Step 1: Clone the Repository

```bash
git clone https://github.com/YOUR_USERNAME/api-monitoring-platform.git
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

Open `.env` and set your PostgreSQL connection string:

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

_(This automatically creates the database and all 6 tables in PostgreSQL!)_

### Step 5: Start the Application

```bash
# Terminal 1: Start Next.js Full-Stack App (Dashboard & REST API)
npm run dev
```

Open **[http://localhost:3000/dashboard](http://localhost:3000/dashboard)** in your browser!

### Step 6: (Optional) Start the Background Worker

To execute automatic periodic checks in the background:

```bash
# Terminal 2: Start Background Worker
npm run worker
```

---

## 🧪 7. Verification & Build Commands

```bash
# Type-check TypeScript code
npx tsc --noEmit

# Test Production Build
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
 │  3. Run TypeScript static type check (`npx tsc`)       │
 │  4. Verify production build compilation (`npm build`)  │
 └─────────────────────────┬──────────────────────────────┘
                           │ (If all checks pass 🟢)
 ┌─────────────────────────▼──────────────────────────────┐
 │             Continuous Deployment (CD)                 │
 │  • Automatically deploys live build to Vercel          │
 │  • Automated 1-minute health cron worker (cron-job.org)│
 └────────────────────────────────────────────────────────┘
```

---

## 📄 License

This project is open-source and available under the **MIT License**.
