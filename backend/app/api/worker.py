import uuid
import secrets
import datetime
from fastapi import APIRouter, Depends, HTTPException, Header, status
from sqlalchemy.orm import Session
from typing import List, Optional

from app.database import get_db
from app.models.domain import Worker, WorkerDevice, WorkerAssignment, Department, Zone, Shift, Scan
from app.schemas.schemas import (
    WorkerRegisterDeviceRequest, WorkerRegisterDeviceResponse,
    DeviceValidateRequest, DeviceValidateResponse,
    WorkerSummary, ScanOut
)
from app.auth.security import hash_device_token, get_current_worker_device

router = APIRouter(prefix="/worker", tags=["Worker Web API"])

def get_worker_active_assignment_info(worker_id: int, db: Session):
    assign = db.query(WorkerAssignment).filter(
        WorkerAssignment.worker_id == worker_id,
        WorkerAssignment.status == "ACTIVE"
    ).order_by(WorkerAssignment.created_at.desc()).first()
    
    dept_name = "Production"
    zone_name = "Zone A"
    shift_name = "Morning"
    
    if assign:
        if assign.department:
            dept_name = assign.department.name
        if assign.zone:
            zone_name = assign.zone.name
        if assign.shift:
            shift_name = assign.shift.name
            
    return dept_name, zone_name, shift_name

@router.post("/register-device", response_model=WorkerRegisterDeviceResponse)
def register_worker_device(
    request: WorkerRegisterDeviceRequest,
    db: Session = Depends(get_db)
):
    """
    Worker Code Verification & One-Time Device Registration.
    Checks worker status and returns authenticated session with assignment details.
    """
    code_clean = request.worker_code.strip().upper()
    worker = db.query(Worker).filter(Worker.worker_code == code_clean).first()
    
    if not worker or not worker.is_active or worker.status != "ACTIVE":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="INVALID OR INACTIVE WORKER CODE — Please check your Worker Code with your supervisor."
        )

    # Fetch active assignment
    dept_name, zone_name, shift_name = get_worker_active_assignment_info(worker.id, db)

    # Generate secure random device token
    raw_device_token = f"wrk_tok_{uuid.uuid4().hex}_{secrets.token_hex(16)}"
    token_hash = hash_device_token(raw_device_token)

    # Deactivate existing active device sessions for this device_id
    existing_devices = db.query(WorkerDevice).filter(
        WorkerDevice.worker_id == worker.id,
        WorkerDevice.device_id == (request.device_id or "web-client-device")
    ).all()
    for d in existing_devices:
        d.is_active = False

    device_record = WorkerDevice(
        worker_id=worker.id,
        device_id=request.device_id or "web-client-device",
        device_token_hash=token_hash,
        platform="web",
        is_active=True
    )
    db.add(device_record)
    db.commit()

    return {
        "status": "SUCCESS",
        "worker": {
            "id": worker.id,
            "name": worker.name,
            "worker_code": worker.worker_code,
            "department": dept_name,
            "department_name": dept_name,
            "zone_name": zone_name,
            "shift_name": shift_name,
            "phone": worker.phone,
            "status": worker.status or "ACTIVE"
        },
        "device_token": raw_device_token
    }

@router.post("/device/validate", response_model=DeviceValidateResponse)
def validate_device(
    request: Optional[DeviceValidateRequest] = None,
    x_device_token: Optional[str] = Header(None, alias="X-Device-Token"),
    db: Session = Depends(get_db)
):
    token = x_device_token or (request.device_token if request else None)
    if not token:
        raise HTTPException(status_code=401, detail="No device token provided.")

    token_hash = hash_device_token(token)
    device = db.query(WorkerDevice).filter(
        WorkerDevice.device_token_hash == token_hash,
        WorkerDevice.is_active == True
    ).first()

    if not device:
        raise HTTPException(status_code=401, detail="Device token invalid or expired.")

    worker = db.query(Worker).filter(Worker.id == device.worker_id).first()
    if not worker or not worker.is_active or worker.status != "ACTIVE":
        raise HTTPException(status_code=403, detail="ACCESS REVOKED OR WORKER INACTIVE — Please contact your supervisor.")

    dept_name, zone_name, shift_name = get_worker_active_assignment_info(worker.id, db)

    device.last_seen = datetime.datetime.utcnow()
    db.commit()

    return {
        "status": "VALID",
        "worker": {
            "id": worker.id,
            "name": worker.name,
            "worker_code": worker.worker_code,
            "department": dept_name,
            "department_name": dept_name,
            "zone_name": zone_name,
            "shift_name": shift_name,
            "phone": worker.phone,
            "status": worker.status or "ACTIVE"
        }
    }

@router.get("/me", response_model=WorkerSummary)
def get_worker_me(
    worker_and_device: tuple[Worker, WorkerDevice] = Depends(get_current_worker_device),
    db: Session = Depends(get_db)
):
    worker, _ = worker_and_device
    if worker.status != "ACTIVE":
        raise HTTPException(status_code=403, detail="WORKER ACCOUNT INACTIVE")
        
    dept_name, zone_name, shift_name = get_worker_active_assignment_info(worker.id, db)
    return {
        "id": worker.id,
        "name": worker.name,
        "worker_code": worker.worker_code,
        "department": dept_name,
        "department_name": dept_name,
        "zone_name": zone_name,
        "shift_name": shift_name,
        "phone": worker.phone,
        "status": worker.status or "ACTIVE"
    }

@router.get("/history", response_model=List[ScanOut])
def get_worker_history(
    worker_and_device: tuple[Worker, WorkerDevice] = Depends(get_current_worker_device),
    db: Session = Depends(get_db)
):
    worker, _ = worker_and_device
    scans = db.query(Scan).filter(Scan.worker_id == worker.id).order_by(Scan.created_at.desc()).all()
    
    for s in scans:
        s.worker_name = worker.name
        if s.department:
            s.department_name = s.department.name
        if s.zone:
            s.zone_name = s.zone.name
        if s.shift:
            s.shift_name = s.shift.name

    return scans

@router.get("/scans/{scan_id}", response_model=ScanOut)
def get_worker_scan_detail(
    scan_id: int,
    worker_and_device: tuple[Worker, WorkerDevice] = Depends(get_current_worker_device),
    db: Session = Depends(get_db)
):
    worker, _ = worker_and_device
    scan = db.query(Scan).filter(Scan.id == scan_id).first()
    if not scan:
        raise HTTPException(status_code=404, detail="Scan record not found.")

    if scan.worker_id != worker.id:
        raise HTTPException(status_code=403, detail="Access denied to this scan record.")

    scan.worker_name = worker.name
    if scan.department:
        scan.department_name = scan.department.name
    if scan.zone:
        scan.zone_name = scan.zone.name
    if scan.shift:
        scan.shift_name = scan.shift.name
    return scan

@router.post("/device/unregister")
def unregister_device(
    worker_and_device: tuple[Worker, WorkerDevice] = Depends(get_current_worker_device),
    db: Session = Depends(get_db)
):
    _, device = worker_and_device
    device.is_active = False
    db.commit()
    return {"status": "UNREGISTERED", "message": "Device session successfully cleared."}
