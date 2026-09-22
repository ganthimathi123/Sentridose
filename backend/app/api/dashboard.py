from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.core.auth import get_current_supervisor
from app.models.domain import Scan, Worker


router = APIRouter(
    prefix="/dashboard",
    tags=["Dashboard"],
    dependencies=[Depends(get_current_supervisor)]
)


@router.get("/summary")
def get_dashboard_summary(
    db: Session = Depends(get_db),
):
    """
    Supervisor dashboard summary.

    This endpoint is protected by the supervisor JWT dependency.
    """

    total_workers = db.query(Worker).count()

    active_workers = (
        db.query(Worker)
        .filter(Worker.status == "ACTIVE")
        .count()
    )

    total_scans = db.query(Scan).count()

    base_count = (
        db.query(Scan)
        .filter(Scan.exposure_class == "BASE")
        .count()
    )

    low_count = (
        db.query(Scan)
        .filter(Scan.exposure_class == "LOW")
        .count()
    )

    medium_count = (
        db.query(Scan)
        .filter(Scan.exposure_class == "MEDIUM")
        .count()
    )

    high_count = (
        db.query(Scan)
        .filter(Scan.exposure_class == "HIGH")
        .count()
    )

    attention_required = (
        medium_count + high_count
    )

    return {
        "total_workers": total_workers,
        "active_workers": active_workers,
        "total_scans": total_scans,
        "base": base_count,
        "low": low_count,
        "medium": medium_count,
        "high": high_count,
        "attention_required": attention_required,
    }


@router.get("/exposure-distribution")
def get_exposure_distribution(
    range: str = Query(
        default="today",
        pattern="^(today|week|month)$"
    ),
    db: Session = Depends(get_db),
):
    """
    Return BASE / LOW / MEDIUM / HIGH scan distribution.

    Supported ranges:
    - today
    - week
    - month
    """

    from datetime import datetime, timedelta

    now = datetime.utcnow()

    if range == "today":
        start_time = now.replace(
            hour=0,
            minute=0,
            second=0,
            microsecond=0,
        )

    elif range == "week":
        start_time = now - timedelta(days=7)

    else:
        start_time = now - timedelta(days=30)

    scans = (
        db.query(Scan)
        .filter(Scan.timestamp >= start_time)
        .all()
    )

    counts = {
        "BASE": 0,
        "LOW": 0,
        "MEDIUM": 0,
        "HIGH": 0,
    }

    for scan in scans:
        exposure = (scan.exposure_class or "").upper()

        if exposure in counts:
            counts[exposure] += 1

    return {
        "range": range,
        "BASE": counts["BASE"],
        "LOW": counts["LOW"],
        "MEDIUM": counts["MEDIUM"],
        "HIGH": counts["HIGH"],
        "total_scans": len(scans),
    }
