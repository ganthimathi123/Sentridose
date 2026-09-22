import uuid
import json
import datetime
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy.orm import Session
from sqlalchemy import func, desc, and_

from app.database import get_db
from app.models.domain import Worker, Scan, Department, Zone, Shift, Notification, ReportHistory, User
from app.core.auth import get_current_user
from app.services.report_generator import generate_pdf_report, generate_csv_report, generate_excel_report

router = APIRouter(prefix="/reports", tags=["Downloadable Reports Module"])


def parse_date_filters(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    quick_filter: Optional[str] = None
):
    now = datetime.datetime.utcnow()
    start_dt = None
    end_dt = None

    if quick_filter:
        q = quick_filter.lower().strip()
        if q == "today":
            start_dt = now.replace(hour=0, minute=0, second=0, microsecond=0)
            end_dt = now.replace(hour=23, minute=59, second=59, microsecond=999999)
        elif q == "yesterday":
            y = now - datetime.timedelta(days=1)
            start_dt = y.replace(hour=0, minute=0, second=0, microsecond=0)
            end_dt = y.replace(hour=23, minute=59, second=59, microsecond=999999)
        elif q in ["last 7 days", "last_7_days", "7days"]:
            start_dt = (now - datetime.timedelta(days=7)).replace(hour=0, minute=0, second=0, microsecond=0)
            end_dt = now
        elif q in ["last 30 days", "last_30_days", "30days"]:
            start_dt = (now - datetime.timedelta(days=30)).replace(hour=0, minute=0, second=0, microsecond=0)
            end_dt = now
        elif q in ["this month", "this_month", "month"]:
            start_dt = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
            end_dt = now

    if not start_dt and start_date:
        try:
            start_dt = datetime.datetime.fromisoformat(start_date.replace("Z", "+00:00"))
        except Exception:
            start_dt = datetime.datetime.strptime(start_date, "%Y-%m-%d")

    if not end_dt and end_date:
        try:
            end_dt = datetime.datetime.fromisoformat(end_date.replace("Z", "+00:00"))
            if len(end_date) == 10:
                end_dt = end_dt.replace(hour=23, minute=59, second=59, microsecond=999999)
        except Exception:
            end_dt = datetime.datetime.strptime(end_date, "%Y-%m-%d").replace(hour=23, minute=59, second=59, microsecond=999999)

    if not start_dt:
        start_dt = (now - datetime.timedelta(days=30)).replace(hour=0, minute=0, second=0, microsecond=0)
    if not end_dt:
        end_dt = now

    return start_dt, end_dt


def build_scans_query(
    db: Session,
    start_dt: datetime.datetime,
    end_dt: datetime.datetime,
    worker_id: Optional[int] = None,
    worker_code: Optional[str] = None,
    department_id: Optional[int] = None,
    zone_id: Optional[int] = None,
    shift_id: Optional[int] = None,
    exposure_class: Optional[str] = None,
    risk_only: bool = False
):
    query = db.query(Scan).filter(
        and_(Scan.timestamp >= start_dt, Scan.timestamp <= end_dt)
    )

    if worker_id:
        query = query.filter(Scan.worker_id == worker_id)
    if worker_code:
        query = query.filter(func.lower(Scan.worker_code) == worker_code.strip().lower())
    if department_id:
        query = query.filter(Scan.department_id == department_id)
    if zone_id:
        query = query.filter(Scan.zone_id == zone_id)
    if shift_id:
        query = query.filter(Scan.shift_id == shift_id)

    if risk_only:
        query = query.filter(Scan.exposure_class.in_(["MEDIUM", "HIGH"]))
    elif exposure_class and exposure_class.upper() != "ALL":
        query = query.filter(Scan.exposure_class == exposure_class.upper())

    return query


def format_scan_item(s: Scan, db: Session) -> dict:
    w = s.worker
    d = s.department
    z = s.zone
    sh = s.shift

    # Check notification / acknowledgement status
    notif = db.query(Notification).filter(Notification.scan_id == s.id).first()
    risk_status = "NORMAL"
    if s.exposure_class in ["MEDIUM", "HIGH"]:
        if notif and notif.is_acknowledged:
            risk_status = "ACKNOWLEDGED"
        else:
            risk_status = "OPEN RISK"

    return {
        "id": s.id,
        "scan_id": s.id,
        "worker_id": s.worker_id,
        "worker_name": w.name if w else "Unknown Worker",
        "worker_code": w.worker_code if w else (s.worker_code or "WRK-000"),
        "department_id": s.department_id,
        "department_name": d.name if d else "Production",
        "zone_id": s.zone_id,
        "zone_name": z.name if z else "Zone A",
        "shift_id": s.shift_id,
        "shift_name": sh.name if sh else "Morning",
        "timestamp": s.timestamp.isoformat(),
        "timestamp_fmt": s.timestamp.strftime("%d/%m/%Y %H:%M"),
        "date_str": s.timestamp.strftime("%Y-%m-%d"),
        "time_str": s.timestamp.strftime("%H:%M:%S"),
        "exposure_class": s.exposure_class,
        "nearest_shade": s.nearest_shade,
        "scanned_hex": s.scanned_hex,
        "reference_hex": s.reference_hex,
        "confidence": s.confidence,
        "ml_confidence": s.ml_confidence,
        "delta_e": s.delta_e,
        "model_used": s.model_used,
        "message": s.message,
        "scientific_notice": s.scientific_notice,
        "risk_status": risk_status,
        "is_acknowledged": notif.is_acknowledged if notif else False,
        "acknowledged_at": notif.acknowledged_at.isoformat() if notif and notif.acknowledged_at else None,
        "acknowledged_by": notif.acknowledged_by if notif else None
    }


def compute_summary_stats(scans: List[Scan], db: Session):
    total_scans = len(scans)
    if total_scans == 0:
        return {
            "total_workers": 0,
            "total_scans": 0,
            "base_count": 0,
            "low_count": 0,
            "medium_count": 0,
            "high_count": 0,
            "attention_required": 0,
            "base_pct": 0.0,
            "low_pct": 0.0,
            "medium_pct": 0.0,
            "high_pct": 0.0
        }

    worker_ids = set(s.worker_id for s in scans if s.worker_id)
    base_cnt = sum(1 for s in scans if s.exposure_class == "BASE")
    low_cnt = sum(1 for s in scans if s.exposure_class == "LOW")
    med_cnt = sum(1 for s in scans if s.exposure_class == "MEDIUM")
    high_cnt = sum(1 for s in scans if s.exposure_class == "HIGH")

    return {
        "total_workers": len(worker_ids),
        "total_scans": total_scans,
        "base_count": base_cnt,
        "low_count": low_cnt,
        "medium_count": med_cnt,
        "high_count": high_cnt,
        "attention_required": med_cnt + high_cnt,
        "base_pct": round((base_cnt / total_scans) * 100, 1),
        "low_pct": round((low_cnt / total_scans) * 100, 1),
        "medium_pct": round((med_cnt / total_scans) * 100, 1),
        "high_pct": round((high_cnt / total_scans) * 100, 1)
    }


# 1. GET /api/v1/reports/summary (Preview Summary API)
@router.get("/summary")
def get_report_summary(
    report_type: str = Query("Complete Scan Report"),
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    quick_filter: Optional[str] = None,
    worker_id: Optional[int] = None,
    worker_code: Optional[str] = None,
    department_id: Optional[int] = None,
    zone_id: Optional[int] = None,
    shift_id: Optional[int] = None,
    exposure_class: Optional[str] = None,
    risk_only: bool = False,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    start_dt, end_dt = parse_date_filters(start_date, end_date, quick_filter)
    query = build_scans_query(
        db, start_dt, end_dt, worker_id, worker_code,
        department_id, zone_id, shift_id, exposure_class,
        risk_only=(risk_only or "risk" in report_type.lower())
    )
    scans = query.order_by(desc(Scan.timestamp)).all()
    summary = compute_summary_stats(scans, db)

    report_id = f"RPT-{datetime.datetime.utcnow().strftime('%m%d%H%M')}"
    period_str = f"{start_dt.strftime('%d %b %Y')} – {end_dt.strftime('%d %b %Y')}"
    gen_at = datetime.datetime.utcnow().strftime("%d %b %Y, %I:%M %p UTC")

    # Resolved names for applied filters
    dept_obj = db.query(Department).filter(Department.id == department_id).first() if department_id else None
    zone_obj = db.query(Zone).filter(Zone.id == zone_id).first() if zone_id else None
    shift_obj = db.query(Shift).filter(Shift.id == shift_id).first() if shift_id else None
    worker_obj = db.query(Worker).filter(Worker.id == worker_id).first() if worker_id else None

    return {
        "report_id": report_id,
        "report_type": report_type,
        "period": period_str,
        "generated_at": gen_at,
        "generated_by": current_user.name or "Supervisor",
        "summary": summary,
        "applied_filters": {
            "start_date": start_dt.strftime("%Y-%m-%d"),
            "end_date": end_dt.strftime("%Y-%m-%d"),
            "department_id": department_id,
            "department_name": dept_obj.name if dept_obj else None,
            "zone_id": zone_id,
            "zone_name": zone_obj.name if zone_obj else None,
            "shift_id": shift_id,
            "shift_name": shift_obj.name if shift_obj else None,
            "worker_id": worker_id,
            "worker_name": worker_obj.name if worker_obj else None,
            "worker_code": worker_obj.worker_code if worker_obj else worker_code,
            "exposure_class": exposure_class or "ALL"
        }
    }


# 2. GET /api/v1/reports/scans (Paginated Scans Preview)
@router.get("/scans")
def get_report_scans(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    quick_filter: Optional[str] = None,
    worker_id: Optional[int] = None,
    worker_code: Optional[str] = None,
    department_id: Optional[int] = None,
    zone_id: Optional[int] = None,
    shift_id: Optional[int] = None,
    exposure_class: Optional[str] = None,
    risk_only: bool = False,
    page: int = 1,
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    start_dt, end_dt = parse_date_filters(start_date, end_date, quick_filter)
    query = build_scans_query(
        db, start_dt, end_dt, worker_id, worker_code,
        department_id, zone_id, shift_id, exposure_class, risk_only
    )
    total_count = query.count()
    offset = (page - 1) * limit
    scans = query.order_by(desc(Scan.timestamp)).offset(offset).limit(limit).all()

    items = [format_scan_item(s, db) for s in scans]

    return {
        "total_count": total_count,
        "page": page,
        "limit": limit,
        "total_pages": max(1, (total_count + limit - 1) // limit),
        "scans": items
    }


# 3. GET /api/v1/reports/worker/{worker_id}
@router.get("/worker/{worker_id}")
def get_worker_report(
    worker_id: int,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    w = db.query(Worker).filter(Worker.id == worker_id).first()
    if not w:
        raise HTTPException(status_code=404, detail="Worker not found")

    start_dt, end_dt = parse_date_filters(start_date, end_date)
    query = build_scans_query(db, start_dt, end_dt, worker_id=worker_id)
    scans = query.order_by(desc(Scan.timestamp)).all()
    summary = compute_summary_stats(scans, db)

    items = [format_scan_item(s, db) for s in scans]

    return {
        "report_type": "Worker Exposure Report",
        "worker": {
            "id": w.id,
            "name": w.name,
            "worker_code": w.worker_code,
            "department": w.department,
            "status": w.status
        },
        "period": f"{start_dt.strftime('%d %b %Y')} – {end_dt.strftime('%d %b %Y')}",
        "summary": summary,
        "scans": items
    }


# 4. GET /api/v1/reports/department/{department_id}
@router.get("/department/{department_id}")
def get_department_report(
    department_id: int,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    d = db.query(Department).filter(Department.id == department_id).first()
    if not d:
        raise HTTPException(status_code=404, detail="Department not found")

    start_dt, end_dt = parse_date_filters(start_date, end_date)
    query = build_scans_query(db, start_dt, end_dt, department_id=department_id)
    scans = query.order_by(desc(Scan.timestamp)).all()
    summary = compute_summary_stats(scans, db)

    items = [format_scan_item(s, db) for s in scans]

    return {
        "report_type": "Department Exposure Report",
        "department": {"id": d.id, "name": d.name, "description": d.description},
        "period": f"{start_dt.strftime('%d %b %Y')} – {end_dt.strftime('%d %b %Y')}",
        "summary": summary,
        "scans": items
    }


# 5. GET /api/v1/reports/zone/{zone_id}
@router.get("/zone/{zone_id}")
def get_zone_report(
    zone_id: int,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    z = db.query(Zone).filter(Zone.id == zone_id).first()
    if not z:
        raise HTTPException(status_code=404, detail="Zone not found")

    start_dt, end_dt = parse_date_filters(start_date, end_date)
    query = build_scans_query(db, start_dt, end_dt, zone_id=zone_id)
    scans = query.order_by(desc(Scan.timestamp)).all()
    summary = compute_summary_stats(scans, db)

    items = [format_scan_item(s, db) for s in scans]

    return {
        "report_type": "Zone Exposure Report",
        "zone": {"id": z.id, "name": z.name, "zone_code": z.zone_code, "department_id": z.department_id},
        "period": f"{start_dt.strftime('%d %b %Y')} – {end_dt.strftime('%d %b %Y')}",
        "summary": summary,
        "scans": items
    }


# 6. GET /api/v1/reports/shift/{shift_id}
@router.get("/shift/{shift_id}")
def get_shift_report(
    shift_id: int,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    sh = db.query(Shift).filter(Shift.id == shift_id).first()
    if not sh:
        raise HTTPException(status_code=404, detail="Shift not found")

    start_dt, end_dt = parse_date_filters(start_date, end_date)
    query = build_scans_query(db, start_dt, end_dt, shift_id=shift_id)
    scans = query.order_by(desc(Scan.timestamp)).all()
    summary = compute_summary_stats(scans, db)

    items = [format_scan_item(s, db) for s in scans]

    return {
        "report_type": "Shift Exposure Report",
        "shift": {"id": sh.id, "name": sh.name, "start_time": sh.start_time, "end_time": sh.end_time},
        "period": f"{start_dt.strftime('%d %b %Y')} – {end_dt.strftime('%d %b %Y')}",
        "summary": summary,
        "scans": items
    }


# 7. GET /api/v1/reports/risk (Risk / Attention Report)
@router.get("/risk")
def get_risk_report(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    quick_filter: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    start_dt, end_dt = parse_date_filters(start_date, end_date, quick_filter)
    query = build_scans_query(db, start_dt, end_dt, risk_only=True)
    scans = query.order_by(desc(Scan.timestamp)).all()
    summary = compute_summary_stats(scans, db)

    items = [format_scan_item(s, db) for s in scans]

    return {
        "report_type": "Risk / Attention Report",
        "period": f"{start_dt.strftime('%d %b %Y')} – {end_dt.strftime('%d %b %Y')}",
        "summary": summary,
        "risk_events": items
    }


# 8. POST /api/v1/reports/pdf (Download PDF)
@router.post("/pdf")
@router.get("/pdf")
def download_pdf_report(
    report_type: str = Query("Complete Scan Report"),
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    quick_filter: Optional[str] = None,
    worker_id: Optional[int] = None,
    worker_code: Optional[str] = None,
    department_id: Optional[int] = None,
    zone_id: Optional[int] = None,
    shift_id: Optional[int] = None,
    exposure_class: Optional[str] = None,
    risk_only: bool = False,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    start_dt, end_dt = parse_date_filters(start_date, end_date, quick_filter)
    query = build_scans_query(
        db, start_dt, end_dt, worker_id, worker_code,
        department_id, zone_id, shift_id, exposure_class,
        risk_only=(risk_only or "risk" in report_type.lower())
    )
    scans = query.order_by(desc(Scan.timestamp)).all()

    if not scans:
        raise HTTPException(status_code=404, detail="NO DATA FOUND — No scan records match the selected filters.")

    summary = compute_summary_stats(scans, db)
    formatted_scans = [format_scan_item(s, db) for s in scans]

    report_id = f"RPT-{datetime.datetime.utcnow().strftime('%m%d%H%M%S')}-{uuid.uuid4().hex[:4].upper()}"
    period_str = f"{start_dt.strftime('%d %b %Y')} to {end_dt.strftime('%d %b %Y')}"
    gen_at = datetime.datetime.utcnow().strftime("%d %b %Y, %I:%M %p UTC")

    dept_obj = db.query(Department).filter(Department.id == department_id).first() if department_id else None
    zone_obj = db.query(Zone).filter(Zone.id == zone_id).first() if zone_id else None
    shift_obj = db.query(Shift).filter(Shift.id == shift_id).first() if shift_id else None
    worker_obj = db.query(Worker).filter(Worker.id == worker_id).first() if worker_id else None

    filters_dict = {
        "start_date": start_dt.strftime("%Y-%m-%d"),
        "end_date": end_dt.strftime("%Y-%m-%d"),
        "department_name": dept_obj.name if dept_obj else None,
        "zone_name": zone_obj.name if zone_obj else None,
        "shift_name": shift_obj.name if shift_obj else None,
        "worker_name": worker_obj.name if worker_obj else None,
        "worker_code": worker_obj.worker_code if worker_obj else worker_code,
        "exposure_class": exposure_class or "ALL"
    }

    report_metadata = {
        "report_id": report_id,
        "report_type": report_type,
        "period": period_str,
        "generated_by": current_user.name or "Supervisor",
        "generated_at": gen_at
    }

    pdf_bytes = generate_pdf_report(report_metadata, summary, formatted_scans, filters_dict)

    # Save to report history
    hist = ReportHistory(
        report_id=report_id,
        report_type=report_type,
        generated_by_id=current_user.id,
        generated_by_name=current_user.name or "Supervisor",
        start_date=start_dt,
        end_date=end_dt,
        filters_json=json.dumps(filters_dict),
        format="PDF",
        scan_count=len(scans)
    )
    db.add(hist)
    db.commit()

    # Filename generation
    safe_type = report_type.replace(" ", "_")
    filename = f"SentriDose_{safe_type}_{start_dt.strftime('%Y-%m-%d')}_to_{end_dt.strftime('%Y-%m-%d')}.pdf"

    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )


# 9. GET /api/v1/reports/csv (Download CSV)
@router.get("/csv")
def download_csv_report(
    report_type: str = Query("Complete Scan Report"),
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    quick_filter: Optional[str] = None,
    worker_id: Optional[int] = None,
    worker_code: Optional[str] = None,
    department_id: Optional[int] = None,
    zone_id: Optional[int] = None,
    shift_id: Optional[int] = None,
    exposure_class: Optional[str] = None,
    risk_only: bool = False,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    start_dt, end_dt = parse_date_filters(start_date, end_date, quick_filter)
    query = build_scans_query(
        db, start_dt, end_dt, worker_id, worker_code,
        department_id, zone_id, shift_id, exposure_class,
        risk_only=(risk_only or "risk" in report_type.lower())
    )
    scans = query.order_by(desc(Scan.timestamp)).all()

    if not scans:
        raise HTTPException(status_code=404, detail="NO DATA FOUND — No scan records match the selected filters.")

    formatted_scans = [format_scan_item(s, db) for s in scans]
    csv_str = generate_csv_report(formatted_scans)

    report_id = f"RPT-{datetime.datetime.utcnow().strftime('%m%d%H%M%S')}-{uuid.uuid4().hex[:4].upper()}"
    hist = ReportHistory(
        report_id=report_id,
        report_type=report_type,
        generated_by_id=current_user.id,
        generated_by_name=current_user.name or "Supervisor",
        start_date=start_dt,
        end_date=end_dt,
        filters_json=json.dumps({"exposure_class": exposure_class or "ALL"}),
        format="CSV",
        scan_count=len(scans)
    )
    db.add(hist)
    db.commit()

    safe_type = report_type.replace(" ", "_")
    filename = f"SentriDose_{safe_type}_{start_dt.strftime('%Y-%m-%d')}_to_{end_dt.strftime('%Y-%m-%d')}.csv"

    return Response(
        content=csv_str,
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )


# 10. GET /api/v1/reports/excel (Download Excel .xlsx)
@router.get("/excel")
def download_excel_report(
    report_type: str = Query("Complete Scan Report"),
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    quick_filter: Optional[str] = None,
    worker_id: Optional[int] = None,
    worker_code: Optional[str] = None,
    department_id: Optional[int] = None,
    zone_id: Optional[int] = None,
    shift_id: Optional[int] = None,
    exposure_class: Optional[str] = None,
    risk_only: bool = False,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    start_dt, end_dt = parse_date_filters(start_date, end_date, quick_filter)
    query = build_scans_query(
        db, start_dt, end_dt, worker_id, worker_code,
        department_id, zone_id, shift_id, exposure_class,
        risk_only=(risk_only or "risk" in report_type.lower())
    )
    scans = query.order_by(desc(Scan.timestamp)).all()

    if not scans:
        raise HTTPException(status_code=404, detail="NO DATA FOUND — No scan records match the selected filters.")

    summary = compute_summary_stats(scans, db)
    formatted_scans = [format_scan_item(s, db) for s in scans]

    # Worker Summary Aggregation
    worker_summary_map = {}
    for s in scans:
        wid = s.worker_id
        if wid not in worker_summary_map:
            worker_summary_map[wid] = {
                "name": s.worker.name if s.worker else "Unknown",
                "worker_code": s.worker.worker_code if s.worker else (s.worker_code or "WRK-000"),
                "department": s.department.name if s.department else "Production",
                "zone": s.zone.name if s.zone else "Zone A",
                "total_scans": 0,
                "base_count": 0,
                "low_count": 0,
                "medium_count": 0,
                "high_count": 0,
                "risk_count": 0
            }
        m = worker_summary_map[wid]
        m["total_scans"] += 1
        exp = s.exposure_class
        if exp == "BASE": m["base_count"] += 1
        elif exp == "LOW": m["low_count"] += 1
        elif exp == "MEDIUM":
            m["medium_count"] += 1
            m["risk_count"] += 1
        elif exp == "HIGH":
            m["high_count"] += 1
            m["risk_count"] += 1

    # Zone Summary Aggregation
    zone_summary_map = {}
    for s in scans:
        zid = s.zone_id or 1
        if zid not in zone_summary_map:
            zone_summary_map[zid] = {
                "department_name": s.department.name if s.department else "Production",
                "zone_name": s.zone.name if s.zone else "Zone A",
                "zone_code": s.zone.zone_code if s.zone else "Z-A",
                "worker_ids": set(),
                "total_scans": 0,
                "base_count": 0,
                "low_count": 0,
                "medium_count": 0,
                "high_count": 0,
                "attention_count": 0
            }
        zm = zone_summary_map[zid]
        zm["worker_ids"].add(s.worker_id)
        zm["total_scans"] += 1
        exp = s.exposure_class
        if exp == "BASE": zm["base_count"] += 1
        elif exp == "LOW": zm["low_count"] += 1
        elif exp == "MEDIUM":
            zm["medium_count"] += 1
            zm["attention_count"] += 1
        elif exp == "HIGH":
            zm["high_count"] += 1
            zm["attention_count"] += 1

    zone_list = []
    for zm in zone_summary_map.values():
        zm["total_workers"] = len(zm["worker_ids"])
        zone_list.append(zm)

    # Risk Events Aggregation
    notifs = db.query(Notification).filter(
        Notification.created_at >= start_dt,
        Notification.created_at <= end_dt
    ).all()
    risk_events_data = []
    for n in notifs:
        risk_events_data.append({
            "scan_id": n.scan_id,
            "date_str": n.created_at.strftime("%Y-%m-%d"),
            "time_str": n.created_at.strftime("%H:%M:%S"),
            "worker_name": n.worker_name,
            "worker_code": n.worker_code,
            "department_name": n.department_name,
            "zone_name": n.zone_name,
            "shift_name": n.shift_name,
            "severity": n.severity,
            "confidence": "98.5%",
            "is_acknowledged": n.is_acknowledged,
            "acknowledged_at_fmt": n.acknowledged_at.strftime("%d/%m/%Y %H:%M") if n.acknowledged_at else "N/A",
            "acknowledged_by": n.acknowledged_by or "N/A"
        })

    report_id = f"RPT-{datetime.datetime.utcnow().strftime('%m%d%H%M%S')}-{uuid.uuid4().hex[:4].upper()}"
    period_str = f"{start_dt.strftime('%d %b %Y')} to {end_dt.strftime('%d %b %Y')}"
    gen_at = datetime.datetime.utcnow().strftime("%d %b %Y, %I:%M %p UTC")

    report_metadata = {
        "report_id": report_id,
        "report_type": report_type,
        "period": period_str,
        "generated_by": current_user.name or "Supervisor",
        "generated_at": gen_at
    }

    excel_bytes = generate_excel_report(
        report_metadata, summary, formatted_scans,
        list(worker_summary_map.values()), zone_list, risk_events_data
    )

    hist = ReportHistory(
        report_id=report_id,
        report_type=report_type,
        generated_by_id=current_user.id,
        generated_by_name=current_user.name or "Supervisor",
        start_date=start_dt,
        end_date=end_dt,
        filters_json=json.dumps({"exposure_class": exposure_class or "ALL"}),
        format="EXCEL",
        scan_count=len(scans)
    )
    db.add(hist)
    db.commit()

    safe_type = report_type.replace(" ", "_")
    filename = f"SentriDose_{safe_type}_{start_dt.strftime('%Y-%m-%d')}_to_{end_dt.strftime('%Y-%m-%d')}.xlsx"

    return Response(
        content=excel_bytes,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )


# 11. GET /api/v1/reports/history (Retrieve Log of Generated Reports)
@router.get("/history")
def get_report_history(limit: int = 50, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    history_records = db.query(ReportHistory).order_by(desc(ReportHistory.generated_at)).limit(limit).all()
    res = []
    for h in history_records:
        period_str = "All Time"
        if h.start_date and h.end_date:
            period_str = f"{h.start_date.strftime('%d %b %Y')} - {h.end_date.strftime('%d %b %Y')}"
        res.append({
            "id": h.id,
            "report_id": h.report_id,
            "report_type": h.report_type,
            "generated_by_name": h.generated_by_name,
            "period": period_str,
            "format": h.format,
            "scan_count": h.scan_count,
            "generated_at": h.generated_at.isoformat()
        })
    return res
