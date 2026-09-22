from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from app.database import get_db
from app.models.domain import Worker, Scan, User
from app.schemas.schemas import WorkerOut, WorkerDetailOut
from app.auth.security import get_current_monitor

router = APIRouter(prefix="/workers", tags=["Workers Management"])

@router.get("", response_model=List[WorkerOut])
def list_workers(
    db: Session = Depends(get_db),
    monitor: User = Depends(get_current_monitor)
):
    workers = db.query(Worker).all()
    result = []
    
    for w in workers:
        latest_scan = db.query(Scan).filter(Scan.worker_id == w.id).order_by(Scan.created_at.desc()).first()
        latest_exp = latest_scan.exposure_class if latest_scan else "N/A"
        last_scan_time = latest_scan.timestamp if latest_scan else None
        status_val = "ATTENTION" if latest_exp in ["MEDIUM", "HIGH"] else "NORMAL"

        result.append({
            "id": w.id,
            "name": w.name,
            "worker_code": w.worker_code,
            "department": w.department,
            "phone": w.phone,
            "latest_exposure": latest_exp,
            "last_scan": last_scan_time,
            "status": status_val,
            "created_at": w.created_at
        })

    return result

@router.get("/{worker_id}", response_model=WorkerDetailOut)
def get_worker_detail(
    worker_id: int,
    db: Session = Depends(get_db),
    monitor: User = Depends(get_current_monitor)
):
    worker = db.query(Worker).filter(Worker.id == worker_id).first()
    if not worker:
        raise HTTPException(status_code=404, detail="Worker record not found.")

    scans = db.query(Scan).filter(Scan.worker_id == worker.id).order_by(Scan.created_at.desc()).all()
    
    for s in scans:
        s.worker_name = worker.name

    latest_exp = scans[0].exposure_class if scans else "N/A"
    last_scan_time = scans[0].timestamp if scans else None
    status_val = "ATTENTION" if latest_exp in ["MEDIUM", "HIGH"] else "NORMAL"

    return {
        "id": worker.id,
        "name": worker.name,
        "worker_code": worker.worker_code,
        "department": worker.department,
        "phone": worker.phone,
        "latest_exposure": latest_exp,
        "last_scan": last_scan_time,
        "status": status_val,
        "created_at": worker.created_at,
        "scans": scans
    }
