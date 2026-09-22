# 🚀 SentriDose Production Deployment Guide

This guide provides comprehensive instructions for deploying the **SentriDose Industrial Safety & Exposure Monitoring Platform** to production using cloud infrastructure with a production **PostgreSQL** database.

---

## 🏗️ 1. Production Architecture Overview

```
                      INTERNET
                         │
          ┌──────────────┴──────────────┐
          │                             │
   Worker Website                 Supervisor Website
  (https://worker.domain.com)     (https://supervisor.domain.com)
          │                             │
          └──────────────┬──────────────┘
                         │
                         ▼
                DEPLOYED BACKEND API
          (https://api.sentridose.com)
                      FastAPI
                         │
                         ▼
               PRODUCTION DATABASE
                    PostgreSQL
                         │
                ┌────────┴────────┐
                │                 │
             Workers           Scans
             Users          Assignments
             Devices        Departments
             Zones             Shifts
```

Both the **Worker Website** and **Supervisor Website** communicate with the **same deployed FastAPI backend** over HTTPS, reading and writing to the **same central PostgreSQL production database**.

---

## 🔑 2. Environment Variables Configuration

### A. Backend Environment Variables (`backend/.env`)

Never commit `.env` files to source control. Use `backend/.env.example` as a template when setting up production environment variables on your cloud provider (Render, Railway, Fly.io, AWS, Heroku, or VPS):

| Environment Variable | Description | Example / Recommended Production Value |
| :--- | :--- | :--- |
| `ENVIRONMENT` | Deployment environment | `production` |
| `DATABASE_URL` | Cloud PostgreSQL connection string | `postgresql://user:password@pg-host:5432/sentridose_db` |
| `JWT_SECRET` | Secret key for signing JWT tokens | `<Secure 64-character random hex string>` |
| `CORS_ORIGINS` | Comma-separated allowed frontend origins | `https://worker.domain.com,https://supervisor.domain.com` |
| `API_V1_STR` | API prefix string | `/api/v1` |

### B. Frontend Environment Variables (`frontend/.env`)

Set the production backend API URL in your build environment prior to running `npm run build`:

| Environment Variable | Description | Example Production Value |
| :--- | :--- | :--- |
| `VITE_API_BASE_URL` | Base URL of deployed backend API | `https://api.sentridose.com` |

---

## 🗄️ 3. Production PostgreSQL Setup & Migrations

### A. Database Provisioning
1. Provision a managed PostgreSQL instance (e.g., Supabase, AWS RDS, Render Postgres, Railway Postgres).
2. Obtain the full database connection string (`DATABASE_URL`).
3. Set `DATABASE_URL` in your backend environment variables.

### B. Alembic Database Schema Initialization
To initialize database tables automatically on deployment, the backend executes `Base.metadata.create_all(bind=engine)` upon application startup.

To manage versioned migrations:
```powershell
# Execute database migrations
cd backend
python -m alembic upgrade head
```

---

## 🔒 4. Production Security & HTTPS Requirements

1. **HTTPS Enforcement**: Camera access (`navigator.mediaDevices.getUserMedia`) requires a **Secure Context (HTTPS)**. Both frontend apps and the backend API MUST be served over HTTPS in production.
2. **CORS Hardening**: Ensure `CORS_ORIGINS` strictly contains your deployed frontend domains. Avoid `allow_origins=["*"]` in production.
3. **Single Supervisor Account**: The backend automatically enforces a single Supervisor account constraint (`supervisor@sentridose.com`).

---

## 🚀 5. Deployment Options

### Option A: Render / Railway Deployment (Recommended)

1. **Backend Service (Web Service)**:
   - Build Command: `pip install -r requirements.txt`
   - Start Command: `gunicorn app.main:app -w 4 -k uvicorn.workers.UvicornWorker -b 0.0.0.0:$PORT`
   - Health Check Path: `/health`
   - Environment Variables: Set `DATABASE_URL`, `JWT_SECRET`, `CORS_ORIGINS`, `ENVIRONMENT=production`.

2. **Frontend Service (Static Site)**:
   - Build Command: `npm install && npm run build`
   - Publish Directory: `dist`
   - Environment Variables: Set `VITE_API_BASE_URL=https://your-backend-api.onrender.com`.

---

### Option B: Unified Single-Server Deployment (VPS / Docker)

You can serve both the single-page application (SPA) frontend and the API from the same FastAPI backend process:

1. Build the frontend into `frontend/dist`:
   ```powershell
   cd frontend
   npm run build
   ```
2. The FastAPI backend automatically serves `frontend/dist` as static files and handles SPA client-side routing fallback for non-API requests.
3. Run the backend with Gunicorn/Uvicorn behind Nginx reverse proxy with Certbot SSL:
   ```powershell
   gunicorn app.main:app -w 4 -k uvicorn.workers.UvicornWorker -b 127.0.0.1:8000
   ```

---

## ✅ 6. Production Readiness Health Verification

Run the health check endpoint to verify backend operational health:
```bash
curl https://api.sentridose.com/health
```
**Expected Response:**
```json
{
  "status": "healthy",
  "environment": "production",
  "service": "SentriDose System API",
  "version": "1.0.0"
}
```

---

## 📱 7. Cross-Device Verification Test Scenario

1. Open Supervisor Website on Laptop: `https://supervisor.sentridose.com`
2. Log in using `supervisor@sentridose.com` / `Supervisor2026!`.
3. Click `[ + REGISTER WORKER ]` and register worker `Arun Kumar` (`WRK-A001`).
4. Open Worker Website on Mobile phone: `https://worker.sentridose.com/access`
5. Enter Worker Code `WRK-A001` and submit.
6. Capture/upload dosimeter photo and submit scan.
7. Observe immediate **"NEW SCAN RECEIVED"** real-time toast alert on the Supervisor Laptop Dashboard without manually refreshing the browser.
