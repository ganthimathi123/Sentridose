# SentriDose

> **Passive Colorimetric H₂S Exposure-Dosimeter with AI-Based Quantitative Reading**

SentriDose is a unified industrial safety platform that combines passive colorimetric chemical dosimeters with computer vision and machine learning for post-exposure quantification using smartphones.

---

## 🏗️ System Architecture

```
                       INTERNET
                          │
       ┌──────────────────┴──────────────────┐
       │                                     │
Worker Web / Mobile App              Supervisor Web / Mobile App
 (Dosimeter Camera Scan)             (Dashboard, Risk Alerts, Reports)
       │                                     │
       └──────────────────┬──────────────────┘
                          │ HTTPS / WebSockets
                          v
                Unified FastAPI Backend
                          │
                          v
             PostgreSQL / SQLite Database
               (Single Source of Truth)
```

---

## 🌟 Key Features

1. **Single Source of Truth Database**:
   - Shared database schema for workers, assignments, scans, notifications, and reports.
2. **Worker Access & Session Management**:
   - One-time Worker Code verification (e.g. `WRK-A001`).
   - Secure persistent device token header (`X-Device-Token`).
3. **Computer Vision & ML Classification Engine**:
   - Automated quality check (blur, brightness, contrast, exposure angle).
   - Sensor & reference color calibration in CIELAB space.
   - Machine learning classifier predicting `BASE`, `LOW`, `MEDIUM`, and `HIGH` exposure states.
4. **Real-Time Risk Notifications**:
   - Automatic notification generation on `MEDIUM` or `HIGH` risk scans.
   - Real-time WebSocket event broadcasting (`/ws/supervisor`) and polling fallback.
   - Supervisor Web UI Bell badge counter, notification drawer, audio siren/beep alert, and native browser notifications.
   - FCM (Firebase Cloud Messaging) mobile push support with deep-linking to scan details.
   - Supervisor `[ ACKNOWLEDGE ]` workflow.
5. **Complete Downloadable Reports Module**:
   - Interactive report preview with real database aggregation.
   - Quick date presets: `Today`, `Yesterday`, `Last 7 Days`, `Last 30 Days`, `This Month`, `Custom Range`.
   - Multi-parameter filtering: Department, Zone, Shift, Worker, Exposure Class.
   - Server-Side **PDF Export** using ReportLab (Header, Metadata, Summary Cards, Distribution Breakdown, Multi-page Detailed Table with Canvas Page Numbers).
   - Server-Side **CSV Export** containing all matching raw scan records.
   - Server-Side **Excel Export (.xlsx)** using OpenPyXL with 5 formatted worksheets (`Summary`, `Scan Records`, `Risk Events`, `Worker Summary`, `Zone Summary`).
   - Report generation history tracking (`report_history` table).
   - Mobile & Android Native Web Share API integration (`[ SHARE REPORT ]`).

---

## 💻 Tech Stack

- **Frontend**: React 18, TypeScript, Vite, Tailwind CSS, Lucide Icons, Recharts.
- **Backend**: Python 3.10+, FastAPI, Pydantic v2, SQLAlchemy, Uvicorn.
- **Database**: PostgreSQL (Production) / SQLite (Local Development).
- **Report Generation**: ReportLab (PDF), OpenPyXL (Excel), CSV.
- **Computer Vision & ML**: OpenCV, NumPy, Pillow, scikit-learn, XGBoost, joblib.
- **Real-Time Protocol**: WebSockets (`/ws/supervisor`) + FCM Push.

---

## 🚀 Quickstart & Local Development

### 1. Prerequisites
- Python 3.10+
- Node.js 18+ and npm

### 2. Backend Setup
```bash
cd backend
python -m venv venv

# Windows:
.\venv\Scripts\activate
# Linux/macOS:
source venv/bin/activate

pip install -r requirements.txt
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```
Interactive OpenAPI documentation is available at `http://127.0.0.1:8000/docs`.

### 3. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```
Open your browser at `http://localhost:5173`.

---

## ⚙️ Environment Variables

See `.env.example` for reference:

```env
# Backend
ENVIRONMENT=production
DATABASE_URL=postgresql://user:password@localhost:5432/sentridose_db
JWT_SECRET=your_production_jwt_secret
CORS_ORIGINS=http://localhost:5173,https://your-supervisor-domain.com

# Frontend
VITE_API_BASE_URL=/api/v1
```

---

## 📄 License & Safety Disclaimer

SentriDose chemical dosimeter readings use colorimetric relative exposure classifications (`BASE`, `LOW`, `MEDIUM`, `HIGH`). DEMO mode readings represent relative colorimetric shifts and do not invent uncalibrated numerical gas concentration (ppm) values unless validated against a certified calibration curve.
