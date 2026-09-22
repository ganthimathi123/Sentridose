import os
import uuid
import datetime
import numpy as np
import cv2
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Header, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.config import settings
from app.models.domain import Scan, Worker, WorkerDevice, WorkerAssignment
from app.schemas.schemas import ScanAnalyzeResponse
from app.cv.processor import ImageCVProcessor
from app.ml.inference import MLInferenceEngine
from app.auth.security import get_current_worker_device

router = APIRouter(tags=["Dosimeter Scanning"])

@router.post("/scan/analyze", response_model=ScanAnalyzeResponse)
@router.post("/scans/analyze", response_model=ScanAnalyzeResponse)
@router.post("/analyze", response_model=ScanAnalyzeResponse)
async def analyze_dosimeter_image(
    file: UploadFile = File(...),
    worker_and_device: tuple[Worker, WorkerDevice] = Depends(get_current_worker_device),
    db: Session = Depends(get_db)
):
    """
    Core Worker Scan Analysis Pipeline: Device Token Auth -> Quality Gate -> Color Extraction -> CIELAB & ML -> DB Save
    """
    worker, device = worker_and_device

    # Check worker status
    if worker.status == "INACTIVE" or not worker.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="ACCESS INACTIVE — Please contact your supervisor."
        )

    # Fetch active worker assignment
    active_assignment = db.query(WorkerAssignment).filter(
        WorkerAssignment.worker_id == worker.id,
        WorkerAssignment.status == "ACTIVE"
    ).first()

    department_id = active_assignment.department_id if active_assignment else None
    zone_id = active_assignment.zone_id if active_assignment else None
    shift_id = active_assignment.shift_id if active_assignment else None

    contents = await file.read()
    if not contents:
        raise HTTPException(
            status_code=422,
            detail={
                "status": "UNREADABLE",
                "message": "Unable to read the dosimeter.",
                "subtext": "Please place the strip inside the scanning area and capture again."
            }
        )

    # Save uploaded file
    file_ext = os.path.splitext(file.filename)[1] if file.filename else ".jpg"
    unique_filename = f"scan_{uuid.uuid4().hex[:12]}{file_ext}"
    file_path = os.path.join(settings.UPLOAD_DIR, unique_filename)
    
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    with open(file_path, "wb") as f:
        f.write(contents)

    nparr = np.frombuffer(contents, np.uint8)
    img_np = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    
    if img_np is None:
        raise HTTPException(
            status_code=422,
            detail={
                "status": "UNREADABLE",
                "message": "Unable to read the dosimeter.",
                "subtext": "Please place the strip inside the scanning area and capture again."
            }
        )

    # 1. Human Detection Check
    human_detected = ImageCVProcessor.detect_human(img_np)
    if human_detected:
        raise HTTPException(
            status_code=422,
            detail={
                "status": "HUMAN_DETECTED",
                "message": "Human Detected",
                "subtext": "Please place only the color strip dosimeter inside the scanning area."
            }
        )

    # 2. Quality Assessment & ROI Detection
    quality_res = ImageCVProcessor.assess_quality(img_np)
    roi_res = ImageCVProcessor.detect_rois_and_qr(img_np)

    if quality_res["quality_status"] == "REJECT" or not roi_res["sensor_strip_detected"]:
        raise HTTPException(
            status_code=422,
            detail={
                "status": "UNREADABLE",
                "message": "Unable to read the dosimeter.",
                "subtext": "Please place the strip inside the scanning area and capture again."
            }
        )

    # 3. Color Feature Extraction & Calibration
    color_res = ImageCVProcessor.calibrate_and_extract_features(
        sensor_crop=roi_res["sensor_crop"],
        ref_crop=roi_res["ref_crop"]
    )

    # 4. CIELAB Distance Classification
    cielab_res = ImageCVProcessor.classify_color_cielab(
        scanned_r=color_res["mean_r"],
        scanned_g=color_res["mean_g"],
        scanned_b=color_res["mean_b"]
    )

    # 5. ML Inference Engine
    ml_res = MLInferenceEngine.predict_optical_class(color_res)

    exposure_class = cielab_res["exposure_class"]
    is_safe = exposure_class in ["BASE", "LOW"]
    status_msg = "MATCH" if is_safe else "MOVE TO SAFER PLACE"

    # 6. Save Scan Record Linked Strictly to Authenticated Worker & Active Assignment
    scan_record = Scan(
        worker_id=worker.id,
        worker_code=worker.worker_code,
        device_id=device.id,
        department_id=department_id,
        zone_id=zone_id,
        shift_id=shift_id,
        timestamp=datetime.datetime.utcnow(),
        exposure_class=exposure_class,
        nearest_shade=cielab_res["nearest_shade"],
        scanned_hex=color_res["scanned_hex"],
        reference_hex=cielab_res["closest_hex"],
        confidence=cielab_res["confidence"],
        ml_confidence=ml_res["confidence"],
        delta_e=cielab_res["delta_e"],
        model_used=ml_res["model_used"],
        message=status_msg,
        scientific_notice="SIMULATED OPTICAL REFERENCE — NOT A GAS CONCENTRATION STANDARD.",
        image_path=f"/uploads/{unique_filename}"
    )
    db.add(scan_record)
    db.commit()
    db.refresh(scan_record)

    # 7. Real-Time Risk Notification Trigger (MEDIUM & HIGH exposure)
    if exposure_class in ["MEDIUM", "HIGH"]:
        try:
            from app.models.domain import Notification, Department, Zone, Shift, SupervisorDevice
            from app.api.ws_manager import ws_manager
            from app.services.fcm import send_fcm_risk_notification

            dept_obj = db.query(Department).filter(Department.id == department_id).first() if department_id else None
            zone_obj = db.query(Zone).filter(Zone.id == zone_id).first() if zone_id else None
            shift_obj = db.query(Shift).filter(Shift.id == shift_id).first() if shift_id else None

            dept_name = dept_obj.name if dept_obj else "Production"
            zone_name = zone_obj.name if zone_obj else "Zone A"
            shift_name = shift_obj.name if shift_obj else "Morning"

            title = "CRITICAL DOSIMETER EXPOSURE ALERT" if exposure_class == "HIGH" else "Dosimeter Exposure Risk Alert"
            message = (
                f"Worker {worker.name} ({worker.worker_code}) recorded a {exposure_class} risk reading "
                f"in {dept_name} / {zone_name}."
            )

            notif = Notification(
                scan_id=scan_record.id,
                worker_id=worker.id,
                worker_name=worker.name,
                worker_code=worker.worker_code,
                department_name=dept_name,
                zone_name=zone_name,
                shift_name=shift_name,
                severity=exposure_class,
                title=title,
                message=message,
                is_read=False,
                is_acknowledged=False,
                created_at=datetime.datetime.utcnow()
            )
            db.add(notif)
            db.commit()
            db.refresh(notif)

            # Broadcast WebSocket event
            notif_payload = {
                "type": "risk.alert",
                "notification": {
                    "id": notif.id,
                    "scan_id": notif.scan_id,
                    "worker_id": notif.worker_id,
                    "worker_name": notif.worker_name,
                    "worker_code": notif.worker_code,
                    "department_name": notif.department_name,
                    "zone_name": notif.zone_name,
                    "shift_name": notif.shift_name,
                    "severity": notif.severity,
                    "title": notif.title,
                    "message": notif.message,
                    "is_read": False,
                    "is_acknowledged": False,
                    "created_at": notif.created_at.isoformat()
                }
            }
            
            # Fire and forget async broadcast
            import asyncio
            try:
                loop = asyncio.get_running_loop()
                loop.create_task(ws_manager.broadcast(notif_payload))
            except RuntimeError:
                pass

            # FCM Push Alert to registered Supervisor devices
            fcm_tokens = [d.fcm_token for d in db.query(SupervisorDevice.fcm_token).all()]
            send_fcm_risk_notification(fcm_tokens, title, message, notif_payload)

        except Exception as e:
            print("Error generating supervisor risk notification:", e)
            db.rollback()


    return {
        "status": "SUCCESS",
        "scan_id": scan_record.id,
        "worker_id": worker.id,
        "worker_name": worker.name,
        "exposure_class": exposure_class,
        "nearest_shade": cielab_res["nearest_shade"],
        "closest_hex": cielab_res["closest_hex"],
        "scanned_hex": color_res["scanned_hex"],
        "confidence": cielab_res["confidence"],
        "ml_confidence": ml_res["confidence"],
        "model_used": ml_res["model_used"],
        "delta_e": cielab_res["delta_e"],
        "message": status_msg,
        "scientific_notice": "SIMULATED OPTICAL REFERENCE — NOT A GAS CONCENTRATION STANDARD.",
        "color_features": {
            "mean_r": color_res["mean_r"],
            "mean_g": color_res["mean_g"],
            "mean_b": color_res["mean_b"],
            "scanned_hex": color_res["scanned_hex"],
            "h_val": color_res["h_val"],
            "s_val": color_res["s_val"],
            "v_val": color_res["v_val"],
            "lab_l": color_res["lab_l"],
            "lab_a": color_res["lab_a"],
            "lab_b": color_res["lab_b"]
        },
        "timestamp": scan_record.timestamp
    }
