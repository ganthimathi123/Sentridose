import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

from app.config import settings
from app.database import engine, Base, SessionLocal
from app.models.domain import User
from app.core.auth import hash_password

from app.api.worker import router as worker_router
from app.api.scan import router as scan_router
from app.api.supervisor import router as supervisor_router
from app.api.auth import router as auth_router
from app.api.reports import router as reports_router
from app.api.ws_manager import ws_manager
from fastapi import WebSocket, WebSocketDisconnect

# Ensure Database Tables Exist & Single Supervisor User is Seeded
Base.metadata.create_all(bind=engine)

def seed_supervisor_account():
    db = SessionLocal()
    try:
        sup = db.query(User).filter(User.role == "SUPERVISOR").first()
        if not sup:
            print("Seeding default single Supervisor account...")
            new_sup = User(
                name="Supervisor",
                email="supervisor@sentridose.com",
                password_hash=hash_password("Supervisor2026!"),
                role="SUPERVISOR",
                is_active=True
            )
            db.add(new_sup)
            db.commit()
            print("Supervisor account seeded: supervisor@sentridose.com / Supervisor2026!")
    except Exception as e:
        print("Error seeding supervisor account:", e)
        db.rollback()
    finally:
        db.close()

seed_supervisor_account()

app = FastAPI(
    title="SentriDose Exposure Dosimeter System API",
    version="1.0.0",
    description="Intelligent Colorimetric H2S Exposure Dosimeter Worker & Supervisor API"
)

# CORS Middleware Configuration
cors_origins = [o.strip() for o in settings.CORS_ORIGINS.split(",") if o.strip()]
if not cors_origins or "*" in cors_origins:
    cors_origins = ["*"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Health Check Endpoint
@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "environment": settings.ENVIRONMENT,
        "service": "SentriDose System API",
        "version": "1.0.0"
    }

# Include Routers under /api/v1
app.include_router(auth_router, prefix=settings.API_V1_STR)
app.include_router(worker_router, prefix=settings.API_V1_STR)
app.include_router(scan_router, prefix=settings.API_V1_STR)
app.include_router(supervisor_router, prefix=settings.API_V1_STR)
app.include_router(reports_router, prefix=settings.API_V1_STR)

# Real-Time Supervisor WebSocket Channel
@app.websocket("/ws/supervisor")
async def websocket_supervisor_endpoint(websocket: WebSocket):
    await ws_manager.connect(websocket)
    try:
        while True:
            data = await websocket.receive_text()
    except WebSocketDisconnect:
        ws_manager.disconnect(websocket)


# Mount Uploads Directory
os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=settings.UPLOAD_DIR), name="uploads")

# SPA Static Files Serving
FRONTEND_DIST_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "frontend", "dist"))
FRONTEND_ASSETS_DIR = os.path.join(FRONTEND_DIST_DIR, "assets")

if os.path.exists(FRONTEND_ASSETS_DIR):
    app.mount("/assets", StaticFiles(directory=FRONTEND_ASSETS_DIR), name="assets")

@app.get("/{full_path:path}", include_in_schema=False)
async def serve_spa(full_path: str):
    if full_path.startswith("api/"):
        return {"error": "API route not found", "path": full_path}
    
    file_in_dist = os.path.join(FRONTEND_DIST_DIR, full_path)
    if full_path and os.path.isfile(file_in_dist):
        return FileResponse(file_in_dist)
    
    index_file = os.path.join(FRONTEND_DIST_DIR, "index.html")
    if os.path.exists(index_file):
        return FileResponse(index_file)
    
    return {"message": "SentriDose Worker API running. Build missing."}
