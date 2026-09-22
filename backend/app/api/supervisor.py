import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import func, desc

from app.database import get_db
from app.models.domain import (
    Worker, WorkerDevice, Department, Zone, Shift, WorkerAssignment, Scan, SupervisorAccess
)
from app.schemas.schemas import (
    SupervisorVerifyRequest, SupervisorVerifyResponse,
    DashboardSummaryResponse, ExposureDistributionResponse,
    WorkerSummary, WorkerCreateRequest, WorkerUpdateRequest, WorkerDetailResponse,
    DepartmentCreate, DepartmentOut,
    ZoneCreate, ZoneOut,
    ShiftCreate, ShiftOut,
    AssignmentCreate, AssignmentOut,
    ScanOut
)

router = APIRouter(tags=["Supervisor Web API"])

# --- Supervisor Access Code Verification ---
@router.post("/supervisor/verify", response_model=SupervisorVerifyResponse)
def verify_supervisor_code(request: SupervisorVerifyRequest, db: Session = Depends(get_db)):
    code = request.supervisor_code.strip()
    if code != "SUP2026":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="INVALID SUPERVISOR CODE — Access denied."
        )
    
    # Store or update supervisor session
    token = f"sup_sess_{datetime.datetime.utcnow().strftime('%Y%m%d%H%M%S')}"
    sup_access = SupervisorAccess(access_code="SUP2026", session_token=token)
    db.add(sup_access)
    db.commit()

    return SupervisorVerifyResponse(
        status="SUCCESS",
        token=token,
        message="Supervisor authenticated successfully."
    )

# --- Dashboard Summary Metrics ---
@router.get("/dashboard/summary", response_model=DashboardSummaryResponse)
def get_dashboard_summary(db: Session = Depends(get_db)):
    total_emp = db.query(Worker).count()
    active_emp = db.query(Worker).filter(Worker.status == "ACTIVE").count()

    today_start = datetime.datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    todays_scans = db.query(Scan).filter(Scan.timestamp >= today_start).count()

    attention_required = db.query(Scan).filter(
        Scan.timestamp >= today_start,
        Scan.exposure_class.in_(["MEDIUM", "HIGH"])
    ).count()

    total_scans = db.query(Scan).count()
    base_cnt = db.query(Scan).filter(Scan.exposure_class == "BASE").count()
    low_cnt = db.query(Scan).filter(Scan.exposure_class == "LOW").count()
    medium_cnt = db.query(Scan).filter(Scan.exposure_class == "MEDIUM").count()
    high_cnt = db.query(Scan).filter(Scan.exposure_class == "HIGH").count()

    latest_s = db.query(Scan).order_by(desc(Scan.timestamp)).first()
    latest_scan_obj = None
    if latest_s:
        latest_scan_obj = {
            "scan_id": latest_s.id,
            "worker_name": latest_s.worker.name if latest_s.worker else "Worker",
            "worker_code": latest_s.worker.worker_code if latest_s.worker else latest_s.worker_code,
            "exposure_class": latest_s.exposure_class,
            "timestamp": latest_s.timestamp
        }

    return DashboardSummaryResponse(
        total_employees=total_emp,
        active_employees=active_emp,
        todays_scans=todays_scans,
        attention_required=attention_required,
        total_workers=total_emp,
        active_workers=active_emp,
        total_scans=total_scans,
        base=base_cnt,
        low=low_cnt,
        medium=medium_cnt,
        high=high_cnt,
        latest_scan=latest_scan_obj
    )

# --- Exposure Overview Distribution ---
@router.get("/dashboard/exposure-distribution", response_model=ExposureDistributionResponse)
def get_exposure_distribution(range: str = Query("today", enum=["today", "week", "month"]), db: Session = Depends(get_db)):
    now = datetime.datetime.utcnow()
    if range == "today":
        start_time = now.replace(hour=0, minute=0, second=0, microsecond=0)
    elif range == "week":
        start_time = now - datetime.timedelta(days=7)
    else:
        start_time = now - datetime.timedelta(days=30)

    scans = db.query(Scan).filter(Scan.timestamp >= start_time).all()

    counts = {"BASE": 0, "LOW": 0, "MEDIUM": 0, "HIGH": 0}
    for s in scans:
        if s.exposure_class in counts:
            counts[s.exposure_class] += 1

    return ExposureDistributionResponse(
        range=range,
        BASE=counts["BASE"],
        LOW=counts["LOW"],
        MEDIUM=counts["MEDIUM"],
        HIGH=counts["HIGH"],
        total_scans=len(scans)
    )

# --- Employee Management ---
@router.get("/workers", response_model=List[WorkerSummary])
def get_workers(status: Optional[str] = None, db: Session = Depends(get_db)):
    query = db.query(Worker)
    if status:
        query = query.filter(Worker.status == status.upper())
    workers = query.order_by(Worker.name).all()
    
    result = []
    for w in workers:
        assign = db.query(WorkerAssignment).filter(
            WorkerAssignment.worker_id == w.id,
            WorkerAssignment.status == "ACTIVE"
        ).order_by(WorkerAssignment.created_at.desc()).first()
        
        dept_name = assign.department.name if assign and assign.department else w.department
        zone_name = assign.zone.name if assign and assign.zone else "Unassigned"
        shift_name = assign.shift.name if assign and assign.shift else "Unassigned"
        
        result.append({
            "id": w.id,
            "name": w.name,
            "worker_code": w.worker_code,
            "department": dept_name,
            "department_name": dept_name,
            "zone_name": zone_name,
            "shift_name": shift_name,
            "phone": w.phone,
            "status": w.status or "ACTIVE"
        })
    return result

@router.post("/workers", response_model=WorkerSummary)
def create_worker(
    request: WorkerCreateRequest,
    db: Session = Depends(get_db)
):
    code = request.worker_code.strip().upper()

    # Check duplicate Worker Code
    existing = db.query(Worker).filter(
        func.lower(Worker.worker_code) == code.lower()
    ).first()

    if existing:
        raise HTTPException(
            status_code=400,
            detail="Worker Code already exists."
        )

    # Department is required
    if not request.department_id:
        raise HTTPException(
            status_code=400,
            detail="Department is required."
        )

    dept = db.query(Department).filter(
        Department.id == request.department_id
    ).first()

    if not dept:
        raise HTTPException(
            status_code=404,
            detail="Department not found."
        )

    if dept.status != "ACTIVE":
        raise HTTPException(
            status_code=400,
            detail="Cannot assign worker to an INACTIVE department."
        )

    # Zone is required
    if not request.zone_id:
        raise HTTPException(
            status_code=400,
            detail="Zone is required."
        )

    zone = db.query(Zone).filter(
        Zone.id == request.zone_id
    ).first()

    if not zone:
        raise HTTPException(
            status_code=404,
            detail="Zone not found."
        )

    if zone.status != "ACTIVE":
        raise HTTPException(
            status_code=400,
            detail="Cannot assign worker to an INACTIVE zone."
        )

    # Make sure zone belongs to selected department
    if zone.department_id != dept.id:
        raise HTTPException(
            status_code=400,
            detail="Selected zone does not belong to the selected department."
        )

    # Shift is required
    if not request.shift_id:
        raise HTTPException(
            status_code=400,
            detail="Shift is required."
        )

    shift = db.query(Shift).filter(
        Shift.id == request.shift_id
    ).first()

    if not shift:
        raise HTTPException(
            status_code=404,
            detail="Shift not found."
        )

    if shift.status != "ACTIVE":
        raise HTTPException(
            status_code=400,
            detail="Cannot assign worker to an INACTIVE shift."
        )

    try:
        # Create worker
        new_worker = Worker(
            name=request.name.strip(),
            worker_code=code,
            department=dept.name,
            status=request.status.upper() if request.status else "ACTIVE",
            is_active=(
                request.status.upper() != "INACTIVE"
                if request.status
                else True
            )
        )

        db.add(new_worker)
        db.flush()

        # Create initial active assignment
        assignment = WorkerAssignment(
            worker_id=new_worker.id,
            department_id=dept.id,
            zone_id=zone.id,
            shift_id=shift.id,
            status="ACTIVE",
            start_date=datetime.datetime.utcnow()
        )

        db.add(assignment)
        db.commit()

        db.refresh(new_worker)

    except Exception:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail="Unable to create worker and assignment."
        )

    return {
        "id": new_worker.id,
        "name": new_worker.name,
        "worker_code": new_worker.worker_code,
        "department": dept.name,
        "department_name": dept.name,
        "zone_name": zone.name,
        "shift_name": shift.name,
        "status": new_worker.status
    }

@router.get("/workers/{worker_id}", response_model=WorkerDetailResponse)
def get_worker_detail(worker_id: int, db: Session = Depends(get_db)):
    worker = db.query(Worker).filter(Worker.id == worker_id).first()
    if not worker:
        raise HTTPException(status_code=404, detail="Worker not found")

    # Get active assignment
    active_assign = db.query(WorkerAssignment).filter(
        WorkerAssignment.worker_id == worker_id,
        WorkerAssignment.status == "ACTIVE"
    ).first()

    dept_name = active_assign.department.name if active_assign and active_assign.department else worker.department
    zone_name = active_assign.zone.name if active_assign and active_assign.zone else "Unassigned"
    shift_name = active_assign.shift.name if active_assign and active_assign.shift else "Unassigned"

    # Get worker scans
    scans = db.query(Scan).filter(Scan.worker_id == worker_id).order_by(desc(Scan.timestamp)).all()
    
    latest_exp = scans[0].exposure_class if scans else "NONE"
    last_time = scans[0].timestamp if scans else None
    conf = scans[0].confidence if scans else None

    formatted_scans = []
    for s in scans:
        formatted_scans.append(ScanOut(
            id=s.id,
            worker_id=s.worker_id,
            worker_code=worker.worker_code,
            worker_name=worker.name,
            device_id=s.device_id,
            department_id=s.department_id,
            department_name=s.department.name if s.department else dept_name,
            zone_id=s.zone_id,
            zone_name=s.zone.name if s.zone else None,
            shift_id=s.shift_id,
            shift_name=s.shift.name if s.shift else None,
            timestamp=s.timestamp,
            exposure_class=s.exposure_class,
            nearest_shade=s.nearest_shade,
            scanned_hex=s.scanned_hex,
            reference_hex=s.reference_hex,
            confidence=s.confidence,
            ml_confidence=s.ml_confidence,
            delta_e=s.delta_e,
            model_used=s.model_used,
            message=s.message,
            scientific_notice=s.scientific_notice,
            image_path=s.image_path,
            created_at=s.created_at
        ))

    return WorkerDetailResponse(
        id=worker.id,
        name=worker.name,
        worker_code=worker.worker_code,
        phone=worker.phone,
        status=worker.status,
        department_name=dept_name,
        zone_name=zone_name,
        shift_name=shift_name,
        latest_exposure=latest_exp,
        last_scan_time=last_time,
        confidence=conf,
        exposure_history=formatted_scans
    )

@router.patch("/workers/{worker_id}", response_model=WorkerSummary)
def update_worker(worker_id: int, request: WorkerUpdateRequest, db: Session = Depends(get_db)):
    worker = db.query(Worker).filter(Worker.id == worker_id).first()
    if not worker:
        raise HTTPException(status_code=404, detail="Worker not found")

    if request.name:
        worker.name = request.name.strip()
    if request.phone:
        worker.phone = request.phone.strip()
    if request.status:
        st = request.status.upper()
        worker.status = st
        worker.is_active = st == "ACTIVE"
    
    if request.department_id:
        dept = db.query(Department).filter(Department.id == request.department_id).first()
        if dept:
            worker.department = dept.name

    db.commit()
    db.refresh(worker)
    return worker

# --- Department Management ---
@router.get("/departments", response_model=List[DepartmentOut])
def get_departments(db: Session = Depends(get_db)):
    depts = db.query(Department).order_by(Department.name).all()
    today_start = datetime.datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)

    res = []
    for d in depts:
        emp_count = db.query(Worker).filter(Worker.department == d.name).count()
        active_cnt = db.query(Worker).filter(Worker.department == d.name, Worker.status == "ACTIVE").count()
        
        today_scans = db.query(Scan).filter(Scan.department_id == d.id, Scan.timestamp >= today_start).count()
        att_cnt = db.query(Scan).filter(
            Scan.department_id == d.id,
            Scan.timestamp >= today_start,
            Scan.exposure_class.in_(["MEDIUM", "HIGH"])
        ).count()

        res.append(DepartmentOut(
            id=d.id,
            name=d.name,
            description=d.description,
            status=d.status,
            employee_count=emp_count,
            active_worker_count=active_cnt,
            today_scan_count=today_scans,
            attention_count=att_cnt,
            created_at=d.created_at
        ))
    return res

@router.post("/departments", response_model=DepartmentOut)
def create_department(request: DepartmentCreate, db: Session = Depends(get_db)):
    name = request.name.strip()
    existing = db.query(Department).filter(Department.name == name).first()
    if existing:
        raise HTTPException(status_code=400, detail="Department already exists.")

    d = Department(
        name=name,
        description=request.description,
        status=request.status.upper() if request.status else "ACTIVE"
    )
    db.add(d)
    db.commit()
    db.refresh(d)

    return DepartmentOut(
        id=d.id,
        name=d.name,
        description=d.description,
        status=d.status,
        employee_count=0,
        active_worker_count=0,
        today_scan_count=0,
        attention_count=0,
        created_at=d.created_at
    )

@router.get("/departments/{dept_id}", response_model=DepartmentOut)
def get_department_by_id(dept_id: int, db: Session = Depends(get_db)):
    d = db.query(Department).filter(Department.id == dept_id).first()
    if not d:
        raise HTTPException(status_code=404, detail="Department not found")

    today_start = datetime.datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    emp_count = db.query(Worker).filter(Worker.department == d.name).count()
    active_cnt = db.query(Worker).filter(Worker.department == d.name, Worker.status == "ACTIVE").count()
    today_scans = db.query(Scan).filter(Scan.department_id == d.id, Scan.timestamp >= today_start).count()
    att_cnt = db.query(Scan).filter(
        Scan.department_id == d.id,
        Scan.timestamp >= today_start,
        Scan.exposure_class.in_(["MEDIUM", "HIGH"])
    ).count()

    return DepartmentOut(
        id=d.id,
        name=d.name,
        description=d.description,
        status=d.status,
        employee_count=emp_count,
        active_worker_count=active_cnt,
        today_scan_count=today_scans,
        attention_count=att_cnt,
        created_at=d.created_at
    )

# --- Work Zone Management ---
@router.get("/zones", response_model=List[ZoneOut])
def get_zones(db: Session = Depends(get_db)):
    zones = db.query(Zone).order_by(Zone.name).all()
    today_start = datetime.datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)

    res = []
    for z in zones:
        active_assigned = db.query(WorkerAssignment).filter(
            WorkerAssignment.zone_id == z.id,
            WorkerAssignment.status == "ACTIVE"
        ).count()

        today_scans = db.query(Scan).filter(Scan.zone_id == z.id, Scan.timestamp >= today_start).count()
        att_cnt = db.query(Scan).filter(
            Scan.zone_id == z.id,
            Scan.timestamp >= today_start,
            Scan.exposure_class.in_(["MEDIUM", "HIGH"])
        ).count()

        res.append(ZoneOut(
            id=z.id,
            name=z.name,
            zone_code=z.zone_code,
            department_id=z.department_id,
            department_name=z.department.name if z.department else None,
            description=z.description,
            status=z.status,
            active_worker_count=active_assigned,
            today_scan_count=today_scans,
            attention_count=att_cnt,
            created_at=z.created_at
        ))
    return res

@router.post("/zones", response_model=ZoneOut)
def create_zone(request: ZoneCreate, db: Session = Depends(get_db)):
    code = request.zone_code.strip()
    existing = db.query(Zone).filter(Zone.zone_code == code).first()
    if existing:
        raise HTTPException(status_code=400, detail="Zone Code already exists.")

    dept = db.query(Department).filter(Department.id == request.department_id).first()
    if not dept:
        raise HTTPException(status_code=400, detail="Department not found.")

    if dept.status == "INACTIVE":
        raise HTTPException(status_code=400, detail="Cannot create zone under an INACTIVE department.")

    z = Zone(
        name=request.name.strip(),
        zone_code=code,
        department_id=request.department_id,
        description=request.description,
        status=request.status.upper() if request.status else "ACTIVE"
    )
    db.add(z)
    db.commit()
    db.refresh(z)

    return ZoneOut(
        id=z.id,
        name=z.name,
        zone_code=z.zone_code,
        department_id=z.department_id,
        department_name=dept.name,
        description=z.description,
        status=z.status,
        active_worker_count=0,
        today_scan_count=0,
        attention_count=0,
        created_at=z.created_at
    )

@router.get("/zones/{zone_id}", response_model=ZoneOut)
def get_zone_by_id(zone_id: int, db: Session = Depends(get_db)):
    z = db.query(Zone).filter(Zone.id == zone_id).first()
    if not z:
        raise HTTPException(status_code=404, detail="Zone not found")

    today_start = datetime.datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    active_assigned = db.query(WorkerAssignment).filter(
        WorkerAssignment.zone_id == z.id,
        WorkerAssignment.status == "ACTIVE"
    ).count()

    today_scans = db.query(Scan).filter(Scan.zone_id == z.id, Scan.timestamp >= today_start).count()
    att_cnt = db.query(Scan).filter(
        Scan.zone_id == z.id,
        Scan.timestamp >= today_start,
        Scan.exposure_class.in_(["MEDIUM", "HIGH"])
    ).count()

    return ZoneOut(
        id=z.id,
        name=z.name,
        zone_code=z.zone_code,
        department_id=z.department_id,
        department_name=z.department.name if z.department else None,
        description=z.description,
        status=z.status,
        active_worker_count=active_assigned,
        today_scan_count=today_scans,
        attention_count=att_cnt,
        created_at=z.created_at
    )

# --- Shift Management ---
@router.get("/shifts", response_model=List[ShiftOut])
def get_shifts(db: Session = Depends(get_db)):
    shifts = db.query(Shift).order_by(Shift.name).all()
    today_start = datetime.datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)

    res = []
    for s in shifts:
        active_cnt = db.query(WorkerAssignment).filter(
            WorkerAssignment.shift_id == s.id,
            WorkerAssignment.status == "ACTIVE"
        ).count()
        today_scans = db.query(Scan).filter(Scan.shift_id == s.id, Scan.timestamp >= today_start).count()
        att_cnt = db.query(Scan).filter(
            Scan.shift_id == s.id,
            Scan.timestamp >= today_start,
            Scan.exposure_class.in_(["MEDIUM", "HIGH"])
        ).count()

        res.append(ShiftOut(
            id=s.id,
            name=s.name,
            start_time=s.start_time,
            end_time=s.end_time,
            status=s.status,
            active_worker_count=active_cnt,
            today_scan_count=today_scans,
            attention_count=att_cnt,
            created_at=s.created_at
        ))
    return res

@router.post("/shifts", response_model=ShiftOut)
def create_shift(request: ShiftCreate, db: Session = Depends(get_db)):
    s = Shift(
        name=request.name.strip(),
        start_time=request.start_time.strip(),
        end_time=request.end_time.strip(),
        status=request.status.upper() if request.status else "ACTIVE"
    )
    db.add(s)
    db.commit()
    db.refresh(s)

    return ShiftOut(
        id=s.id,
        name=s.name,
        start_time=s.start_time,
        end_time=s.end_time,
        status=s.status,
        active_worker_count=0,
        today_scan_count=0,
        attention_count=0,
        created_at=s.created_at
    )

# --- Worker Assignment Engine ---
@router.get("/assignments", response_model=List[AssignmentOut])
def get_assignments(status: Optional[str] = "ACTIVE", db: Session = Depends(get_db)):
    query = db.query(WorkerAssignment)
    if status:
        query = query.filter(WorkerAssignment.status == status.upper())
    assignments = query.order_by(desc(WorkerAssignment.created_at)).all()

    res = []
    for a in assignments:
        res.append(AssignmentOut(
            id=a.id,
            worker_id=a.worker_id,
            worker_name=a.worker.name,
            worker_code=a.worker.worker_code,
            department_id=a.department_id,
            department_name=a.department.name,
            zone_id=a.zone_id,
            zone_name=a.zone.name,
            shift_id=a.shift_id,
            shift_name=a.shift.name,
            status=a.status,
            start_date=a.start_date,
            created_at=a.created_at
        ))
    return res

@router.post("/assignments", response_model=AssignmentOut)
def create_assignment(request: AssignmentCreate, db: Session = Depends(get_db)):
    worker = db.query(Worker).filter(Worker.id == request.worker_id).first()
    if not worker:
        raise HTTPException(status_code=404, detail="Worker not found.")
    if worker.status == "INACTIVE":
        raise HTTPException(status_code=400, detail="Cannot assign an INACTIVE worker.")

    dept = db.query(Department).filter(Department.id == request.department_id).first()
    if not dept or dept.status == "INACTIVE":
        raise HTTPException(status_code=400, detail="Invalid or INACTIVE department.")

    zone = db.query(Zone).filter(Zone.id == request.zone_id).first()
    if not zone or zone.status == "INACTIVE":
        raise HTTPException(status_code=400, detail="Invalid or INACTIVE work zone.")

    shift = db.query(Shift).filter(Shift.id == request.shift_id).first()
    if not shift or shift.status == "INACTIVE":
        raise HTTPException(status_code=400, detail="Invalid or INACTIVE shift.")

    # Deactivate previous active assignments for this worker
    previous_active = db.query(WorkerAssignment).filter(
        WorkerAssignment.worker_id == request.worker_id,
        WorkerAssignment.status == "ACTIVE"
    ).all()
    for prev in previous_active:
        prev.status = "INACTIVE"
        prev.end_date = datetime.datetime.utcnow()

    # Update worker's primary department string
    worker.department = dept.name

    new_assignment = WorkerAssignment(
        worker_id=request.worker_id,
        department_id=request.department_id,
        zone_id=request.zone_id,
        shift_id=request.shift_id,
        status="ACTIVE",
        start_date=datetime.datetime.utcnow()
    )
    db.add(new_assignment)
    db.commit()
    db.refresh(new_assignment)

    return AssignmentOut(
        id=new_assignment.id,
        worker_id=worker.id,
        worker_name=worker.name,
        worker_code=worker.worker_code,
        department_id=dept.id,
        department_name=dept.name,
        zone_id=zone.id,
        zone_name=zone.name,
        shift_id=shift.id,
        shift_name=shift.name,
        status=new_assignment.status,
        start_date=new_assignment.start_date,
        created_at=new_assignment.created_at
    )

# --- Filterable All Scans Monitoring ---
@router.get("/scans", response_model=List[ScanOut])
def get_all_scans(
    department_id: Optional[int] = None,
    zone_id: Optional[int] = None,
    shift_id: Optional[int] = None,
    worker_id: Optional[int] = None,
    worker_code: Optional[str] = None,
    exposure_class: Optional[str] = None,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    query = db.query(Scan)

    if department_id:
        query = query.filter(Scan.department_id == department_id)
    if zone_id:
        query = query.filter(Scan.zone_id == zone_id)
    if shift_id:
        query = query.filter(Scan.shift_id == shift_id)
    if worker_id:
        query = query.filter(Scan.worker_id == worker_id)
    if worker_code:
        query = query.filter(func.lower(Scan.worker_code) == worker_code.strip().lower())
    if exposure_class:
        query = query.filter(Scan.exposure_class == exposure_class.upper())

    scans = query.order_by(desc(Scan.timestamp)).limit(limit).all()

    res = []
    for s in scans:
        res.append(ScanOut(
            id=s.id,
            scan_id=s.id,
            worker_id=s.worker_id,
            worker_code=s.worker.worker_code if s.worker else s.worker_code,
            worker_name=s.worker.name if s.worker else "Unknown",
            device_id=s.device_id,
            department_id=s.department_id,
            department_name=s.department.name if s.department else None,
            zone_id=s.zone_id,
            zone_name=s.zone.name if s.zone else None,
            shift_id=s.shift_id,
            shift_name=s.shift.name if s.shift else None,
            timestamp=s.timestamp,
            exposure_class=s.exposure_class,
            nearest_shade=s.nearest_shade,
            scanned_hex=s.scanned_hex,
            reference_hex=s.reference_hex,
            confidence=s.confidence,
            ml_confidence=s.ml_confidence,
            delta_e=s.delta_e,
            model_used=s.model_used,
            message=s.message,
            scientific_notice=s.scientific_notice,
            image_path=s.image_path,
            created_at=s.created_at
        ))
    return res

@router.get("/scans/{scan_id}", response_model=ScanOut)
def get_scan_by_id(scan_id: int, db: Session = Depends(get_db)):
    s = db.query(Scan).filter(Scan.id == scan_id).first()
    if not s:
        raise HTTPException(status_code=404, detail="Scan record not found")

    return ScanOut(
        id=s.id,
        scan_id=s.id,
        worker_id=s.worker_id,
        worker_code=s.worker.worker_code if s.worker else s.worker_code,
        worker_name=s.worker.name if s.worker else "Unknown",
        device_id=s.device_id,
        department_id=s.department_id,
        department_name=s.department.name if s.department else None,
        zone_id=s.zone_id,
        zone_name=s.zone.name if s.zone else None,
        shift_id=s.shift_id,
        shift_name=s.shift.name if s.shift else None,
        timestamp=s.timestamp,
        exposure_class=s.exposure_class,
        nearest_shade=s.nearest_shade,
        scanned_hex=s.scanned_hex,
        reference_hex=s.reference_hex,
        confidence=s.confidence,
        ml_confidence=s.ml_confidence,
        delta_e=s.delta_e,
        model_used=s.model_used,
        message=s.message,
        scientific_notice=s.scientific_notice,
        image_path=s.image_path,
        created_at=s.created_at
    )

# --- Real-Time Risk Notification Endpoints ---
@router.get("/notifications", response_model=List[dict])
def get_supervisor_notifications(unread_only: bool = False, limit: int = 50, db: Session = Depends(get_db)):
    from app.models.domain import Notification
    query = db.query(Notification)
    if unread_only:
        query = query.filter(Notification.is_read == False)
    notifications = query.order_by(desc(Notification.created_at)).limit(limit).all()

    res = []
    for n in notifications:
        res.append({
            "id": n.id,
            "scan_id": n.scan_id,
            "worker_id": n.worker_id,
            "worker_name": n.worker_name,
            "worker_code": n.worker_code,
            "department_name": n.department_name,
            "zone_name": n.zone_name,
            "shift_name": n.shift_name,
            "severity": n.severity,
            "title": n.title,
            "message": n.message,
            "is_read": n.is_read,
            "is_acknowledged": n.is_acknowledged,
            "acknowledged_at": n.acknowledged_at.isoformat() if n.acknowledged_at else None,
            "acknowledged_by": n.acknowledged_by,
            "created_at": n.created_at.isoformat() if n.created_at else None
        })
    return res

@router.get("/notifications/unread")
def get_unread_notification_count(db: Session = Depends(get_db)):
    from app.models.domain import Notification
    count = db.query(Notification).filter(Notification.is_read == False).count()
    return {"unread_count": count}

@router.patch("/notifications/{notification_id}/read")
def mark_notification_as_read(notification_id: int, db: Session = Depends(get_db)):
    from app.models.domain import Notification
    n = db.query(Notification).filter(Notification.id == notification_id).first()
    if not n:
        raise HTTPException(status_code=404, detail="Notification not found")
    n.is_read = True
    db.commit()
    return {"status": "SUCCESS", "message": "Notification marked as read."}

@router.post("/notifications/mark-all-read")
def mark_all_notifications_read(db: Session = Depends(get_db)):
    from app.models.domain import Notification
    db.query(Notification).filter(Notification.is_read == False).update({"is_read": True})
    db.commit()
    return {"status": "SUCCESS", "message": "All notifications marked as read."}

@router.post("/notifications/{notification_id}/acknowledge")
def acknowledge_notification(notification_id: int, db: Session = Depends(get_db)):
    from app.models.domain import Notification
    n = db.query(Notification).filter(Notification.id == notification_id).first()
    if not n:
        raise HTTPException(status_code=404, detail="Notification not found")
    
    n.is_acknowledged = True
    n.is_read = True
    n.acknowledged_at = datetime.datetime.utcnow()
    n.acknowledged_by = "Supervisor"
    db.commit()
    return {
        "status": "SUCCESS",
        "message": "Notification acknowledged by supervisor.",
        "acknowledged_at": n.acknowledged_at.isoformat()
    }

@router.post("/supervisor/device/register")
def register_supervisor_device(fcm_token: str = Query(...), platform: str = Query("android"), db: Session = Depends(get_db)):
    from app.models.domain import SupervisorDevice, User
    sup = db.query(User).filter(User.role == "SUPERVISOR").first()
    sup_id = sup.id if sup else 1

    existing = db.query(SupervisorDevice).filter(SupervisorDevice.fcm_token == fcm_token).first()
    if existing:
        existing.last_used_at = datetime.datetime.utcnow()
        db.commit()
        return {"status": "SUCCESS", "message": "Device token updated."}

    dev = SupervisorDevice(
        supervisor_id=sup_id,
        fcm_token=fcm_token,
        platform=platform
    )
    db.add(dev)
    db.commit()
    return {"status": "SUCCESS", "message": "Supervisor device registered successfully."}

