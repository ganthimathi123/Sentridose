import datetime
from sqlalchemy import Column, Integer, String, Float, DateTime, Boolean, ForeignKey, Text
from sqlalchemy.orm import relationship
from app.database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    email = Column(String(255), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    role = Column(String(50), default="SUPERVISOR", nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    is_active = Column(Boolean, default=True)

class Worker(Base):
    __tablename__ = "workers"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    worker_code = Column(String(50), unique=True, index=True, nullable=False)
    department = Column(String(100), default="Production")
    phone = Column(String(50), nullable=True)
    status = Column(String(20), default="ACTIVE")  # ACTIVE, INACTIVE
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    
    devices = relationship("WorkerDevice", back_populates="worker", cascade="all, delete-orphan")
    scans = relationship("Scan", back_populates="worker", cascade="all, delete-orphan")
    assignments = relationship("WorkerAssignment", back_populates="worker", cascade="all, delete-orphan")

class Department(Base):
    __tablename__ = "departments"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), unique=True, nullable=False)
    description = Column(Text, nullable=True)
    status = Column(String(20), default="ACTIVE")  # ACTIVE, INACTIVE
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    zones = relationship("Zone", back_populates="department")
    assignments = relationship("WorkerAssignment", back_populates="department")
    scans = relationship("Scan", back_populates="department")

class Zone(Base):
    __tablename__ = "zones"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    zone_code = Column(String(50), unique=True, nullable=False)
    department_id = Column(Integer, ForeignKey("departments.id"), nullable=False)
    description = Column(Text, nullable=True)
    status = Column(String(20), default="ACTIVE")  # ACTIVE, INACTIVE
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    department = relationship("Department", back_populates="zones")
    assignments = relationship("WorkerAssignment", back_populates="zone")
    scans = relationship("Scan", back_populates="zone")

class Shift(Base):
    __tablename__ = "shifts"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    start_time = Column(String(20), nullable=False)  # e.g., "06:00 AM"
    end_time = Column(String(20), nullable=False)    # e.g., "02:00 PM"
    status = Column(String(20), default="ACTIVE")  # ACTIVE, INACTIVE
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    assignments = relationship("WorkerAssignment", back_populates="shift")
    scans = relationship("Scan", back_populates="shift")

class WorkerAssignment(Base):
    __tablename__ = "worker_assignments"

    id = Column(Integer, primary_key=True, index=True)
    worker_id = Column(Integer, ForeignKey("workers.id"), nullable=False)
    department_id = Column(Integer, ForeignKey("departments.id"), nullable=False)
    zone_id = Column(Integer, ForeignKey("zones.id"), nullable=False)
    shift_id = Column(Integer, ForeignKey("shifts.id"), nullable=False)
    start_date = Column(DateTime, default=datetime.datetime.utcnow)
    end_date = Column(DateTime, nullable=True)
    status = Column(String(20), default="ACTIVE")  # ACTIVE, INACTIVE
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    worker = relationship("Worker", back_populates="assignments")
    department = relationship("Department", back_populates="assignments")
    zone = relationship("Zone", back_populates="assignments")
    shift = relationship("Shift", back_populates="assignments")

class WorkerDevice(Base):
    __tablename__ = "worker_devices"
    
    id = Column(Integer, primary_key=True, index=True)
    worker_id = Column(Integer, ForeignKey("workers.id"), nullable=False)
    device_id = Column(String(255), index=True, nullable=False)
    device_token_hash = Column(String(255), unique=True, index=True, nullable=False)
    platform = Column(String(50), default="web")
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    last_seen = Column(DateTime, default=datetime.datetime.utcnow)
    is_active = Column(Boolean, default=True)
    
    worker = relationship("Worker", back_populates="devices")
    scans = relationship("Scan", back_populates="device")

class Scan(Base):
    __tablename__ = "scans"
    
    id = Column(Integer, primary_key=True, index=True)
    worker_id = Column(Integer, ForeignKey("workers.id"), nullable=False)
    worker_code = Column(String(50), nullable=True)
    device_id = Column(Integer, ForeignKey("worker_devices.id"), nullable=True)
    department_id = Column(Integer, ForeignKey("departments.id"), nullable=True)
    zone_id = Column(Integer, ForeignKey("zones.id"), nullable=True)
    shift_id = Column(Integer, ForeignKey("shifts.id"), nullable=True)
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)
    exposure_class = Column(String(50), nullable=False)  # BASE, LOW, MEDIUM, HIGH
    nearest_shade = Column(String(50), nullable=False)   # LIGHT, ORIGINAL, DARK
    scanned_hex = Column(String(10), nullable=False)
    reference_hex = Column(String(10), nullable=False)
    confidence = Column(Float, nullable=False)
    ml_confidence = Column(Float, nullable=False)
    delta_e = Column(Float, nullable=False)
    model_used = Column(String(100), default="RandomForest")
    message = Column(String(100), default="MATCH")       # MATCH or MOVE TO SAFER PLACE
    scientific_notice = Column(Text, default="SIMULATED OPTICAL REFERENCE — NOT A GAS CONCENTRATION STANDARD.")
    image_path = Column(String(500), nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    
    worker = relationship("Worker", back_populates="scans")
    device = relationship("WorkerDevice", back_populates="scans")
    department = relationship("Department", back_populates="scans")
    zone = relationship("Zone", back_populates="scans")
    shift = relationship("Shift", back_populates="scans")

class SupervisorAccess(Base):
    __tablename__ = "supervisor_access"

    id = Column(Integer, primary_key=True, index=True)
    access_code = Column(String(100), nullable=False, default="SUP2026")
    session_token = Column(String(255), unique=True, index=True, nullable=True)
    last_active_at = Column(DateTime, default=datetime.datetime.utcnow)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

class Notification(Base):
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True, index=True)
    scan_id = Column(Integer, ForeignKey("scans.id"), nullable=False, index=True)
    worker_id = Column(Integer, ForeignKey("workers.id"), nullable=False, index=True)
    worker_name = Column(String(255), nullable=False)
    worker_code = Column(String(50), nullable=False)
    department_name = Column(String(100), nullable=True)
    zone_name = Column(String(100), nullable=True)
    shift_name = Column(String(100), nullable=True)
    severity = Column(String(20), nullable=False)  # MEDIUM, HIGH
    title = Column(String(255), nullable=False)
    message = Column(Text, nullable=False)
    is_read = Column(Boolean, default=False, index=True)
    is_acknowledged = Column(Boolean, default=False, index=True)
    acknowledged_at = Column(DateTime, nullable=True)
    acknowledged_by = Column(String(255), nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow, index=True)

class SupervisorDevice(Base):
    __tablename__ = "supervisor_devices"

    id = Column(Integer, primary_key=True, index=True)
    supervisor_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    fcm_token = Column(String(255), unique=True, index=True, nullable=False)
    platform = Column(String(50), default="web")
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    last_used_at = Column(DateTime, default=datetime.datetime.utcnow)

class ReportHistory(Base):
    __tablename__ = "report_history"

    id = Column(Integer, primary_key=True, index=True)
    report_id = Column(String(50), unique=True, index=True, nullable=False)  # e.g., RPT-000125
    report_type = Column(String(100), nullable=False)                       # e.g., Daily Exposure Report, Risk Report
    generated_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    generated_by_name = Column(String(255), default="Supervisor")
    start_date = Column(DateTime, nullable=True)
    end_date = Column(DateTime, nullable=True)
    filters_json = Column(Text, nullable=True)
    format = Column(String(20), nullable=False)                              # PDF, CSV, EXCEL
    scan_count = Column(Integer, default=0)
    generated_at = Column(DateTime, default=datetime.datetime.utcnow, index=True)

