import datetime
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.domain import Scan, Worker, User
from app.schemas.schemas import DashboardSummaryOut, ExposureDistributionOut
from app.auth.security import get_current_monitor

router = APIRouter(prefix="/dashboard", tags=["Dashboard Monitoring"])

@router.get("/summary", response_model=DashboardSummaryOut)
def get_dashboard_summary(
    db: Session = Depends(get_db),
    monitor: User = Depends(get_current_monitor)
):
    total_workers = db.query(Worker).count()
    
    today_start = datetime.datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    today_scans = db.query(Scan).filter(Scan.created_at >= today_start).count()
    if today_scans == 0:
        today_scans = db.query(Scan).count()

    low_exposure = db.query(Scan).filter(Scan.exposure_class.in_(["BASE", "LOW"])).count()
    attention_required = db.query(Scan).filter(Scan.exposure_class.in_(["MEDIUM", "HIGH"])).count()

    return {
        "total_workers": total_workers,
        "today_scans": today_scans,
        "low_exposure": low_exposure,
        "attention_required": attention_required
    }

@router.get("/exposure-distribution", response_model=ExposureDistributionOut)
def get_exposure_distribution(
    db: Session = Depends(get_db),
    monitor: User = Depends(get_current_monitor)
):
    base_count = db.query(Scan).filter(Scan.exposure_class == "BASE").count()
    low_count = db.query(Scan).filter(Scan.exposure_class == "LOW").count()
    medium_count = db.query(Scan).filter(Scan.exposure_class == "MEDIUM").count()
    high_count = db.query(Scan).filter(Scan.exposure_class == "HIGH").count()

    return {
        "BASE": base_count,
        "LOW": low_count,
        "MEDIUM": medium_count,
        "HIGH": high_count
    }
