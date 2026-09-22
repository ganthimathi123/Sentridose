import datetime
import hashlib
from typing import Optional
from fastapi import Depends, HTTPException, Header, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.domain import Worker, WorkerDevice

def hash_device_token(token: str) -> str:
    return hashlib.sha256(token.encode('utf-8')).hexdigest()

def get_current_worker_device(
    x_device_token: Optional[str] = Header(None, alias="X-Device-Token"),
    authorization: Optional[str] = Header(None, alias="Authorization"),
    db: Session = Depends(get_db)
) -> tuple[Worker, WorkerDevice]:
    token = x_device_token
    if not token and authorization and authorization.startswith("Bearer "):
        token = authorization.split(" ")[1]

    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing device token. Please verify your Worker Code."
        )

    token_hash = hash_device_token(token)
    device = db.query(WorkerDevice).filter(
        WorkerDevice.device_token_hash == token_hash,
        WorkerDevice.is_active == True
    ).first()

    if not device:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or unregistered device token."
        )

    worker = db.query(Worker).filter(Worker.id == device.worker_id).first()
    if not worker:
        raise HTTPException(status_code=404, detail="Worker profile not found.")

    if not worker.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="ACCESS REVOKED — Please contact your supervisor."
        )

    device.last_seen = datetime.datetime.utcnow()
    db.commit()

    return worker, device
