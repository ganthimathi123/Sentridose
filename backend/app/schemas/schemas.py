import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, ConfigDict, EmailStr

# --- Auth Schemas ---
class SupervisorRegisterRequest(BaseModel):
    name: str
    email: str
    password: str
    confirm_password: str

class LoginRequest(BaseModel):
    email: str
    password: str

class UserResponse(BaseModel):
    id: int
    name: str
    role: str

    model_config = ConfigDict(from_attributes=True)

class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse

# --- Worker & Device Schemas ---
class WorkerRegisterDeviceRequest(BaseModel):
    worker_code: str
    device_id: Optional[str] = "web-client-device"

class WorkerSummary(BaseModel):
    id: int
    name: str
    worker_code: str
    department: Optional[str] = "Production"
    department_name: Optional[str] = "Production"
    zone_name: Optional[str] = "Zone A"
    shift_name: Optional[str] = "Morning"
    phone: Optional[str] = None
    status: Optional[str] = "ACTIVE"

    model_config = ConfigDict(from_attributes=True)

class WorkerRegisterDeviceResponse(BaseModel):
    status: str = "SUCCESS"
    worker: WorkerSummary
    device_token: str

class DeviceValidateRequest(BaseModel):
    device_token: str

class DeviceValidateResponse(BaseModel):
    status: str = "VALID"
    worker: WorkerSummary

class WorkerCreateRequest(BaseModel):
    name: str
    worker_code: str
    department_id: Optional[int] = None
    zone_id: Optional[int] = None
    shift_id: Optional[int] = None
    phone: Optional[str] = None
    status: Optional[str] = "ACTIVE"

class WorkerUpdateRequest(BaseModel):
    name: Optional[str] = None
    department_id: Optional[int] = None
    zone_id: Optional[int] = None
    shift_id: Optional[int] = None
    phone: Optional[str] = None
    status: Optional[str] = None

# --- Supervisor Auth Schemas ---
class SupervisorVerifyRequest(BaseModel):
    supervisor_code: str

class SupervisorVerifyResponse(BaseModel):
    status: str = "SUCCESS"
    token: str
    message: str = "Supervisor authenticated successfully."

# --- Department Schemas ---
class DepartmentCreate(BaseModel):
    name: str
    description: Optional[str] = None
    status: Optional[str] = "ACTIVE"

class DepartmentOut(BaseModel):
    id: int
    name: str
    description: Optional[str] = None
    status: str = "ACTIVE"
    employee_count: Optional[int] = 0
    active_worker_count: Optional[int] = 0
    today_scan_count: Optional[int] = 0
    attention_count: Optional[int] = 0
    created_at: datetime.datetime

    model_config = ConfigDict(from_attributes=True)

# --- Zone Schemas ---
class ZoneCreate(BaseModel):
    name: str
    zone_code: str
    department_id: int
    description: Optional[str] = None
    status: Optional[str] = "ACTIVE"

class ZoneOut(BaseModel):
    id: int
    name: str
    zone_code: str
    department_id: int
    department_name: Optional[str] = None
    description: Optional[str] = None
    status: str = "ACTIVE"
    active_worker_count: Optional[int] = 0
    today_scan_count: Optional[int] = 0
    attention_count: Optional[int] = 0
    created_at: datetime.datetime

    model_config = ConfigDict(from_attributes=True)

# --- Shift Schemas ---
class ShiftCreate(BaseModel):
    name: str
    start_time: str
    end_time: str
    status: Optional[str] = "ACTIVE"

class ShiftOut(BaseModel):
    id: int
    name: str
    start_time: str
    end_time: str
    status: str = "ACTIVE"
    active_worker_count: Optional[int] = 0
    today_scan_count: Optional[int] = 0
    attention_count: Optional[int] = 0
    created_at: datetime.datetime

    model_config = ConfigDict(from_attributes=True)

# --- Worker Assignment Schemas ---
class AssignmentCreate(BaseModel):
    worker_id: int
    department_id: int
    zone_id: int
    shift_id: int

class AssignmentOut(BaseModel):
    id: int
    worker_id: int
    worker_name: str
    worker_code: str
    department_id: int
    department_name: str
    zone_id: int
    zone_name: str
    shift_id: int
    shift_name: str
    status: str = "ACTIVE"
    start_date: datetime.datetime
    created_at: datetime.datetime

    model_config = ConfigDict(from_attributes=True)

# --- Color Features & Scan Schemas ---
class ColorFeatures(BaseModel):
    mean_r: float
    mean_g: float
    mean_b: float
    scanned_hex: str
    h_val: float
    s_val: float
    v_val: float
    lab_l: float
    lab_a: float
    lab_b: float

class ScanAnalyzeResponse(BaseModel):
    status: str = "SUCCESS"
    scan_id: Optional[int] = None
    worker_id: Optional[int] = None
    worker_name: Optional[str] = None
    exposure_class: str
    nearest_shade: str
    closest_hex: str
    scanned_hex: str
    confidence: float
    ml_confidence: float
    model_used: str = "RandomForest"
    delta_e: float
    message: str
    scientific_notice: str = "SIMULATED OPTICAL REFERENCE — NOT A GAS CONCENTRATION STANDARD."
    color_features: Optional[ColorFeatures] = None
    timestamp: Optional[datetime.datetime] = None

class ScanOut(BaseModel):
    id: int
    scan_id: Optional[int] = None
    worker_id: int
    worker_code: Optional[str] = None
    worker_name: Optional[str] = None
    device_id: Optional[int] = None
    department_id: Optional[int] = None
    department_name: Optional[str] = None
    zone_id: Optional[int] = None
    zone_name: Optional[str] = None
    shift_id: Optional[int] = None
    shift_name: Optional[str] = None
    timestamp: datetime.datetime
    exposure_class: str
    nearest_shade: str
    scanned_hex: str
    reference_hex: str
    confidence: float
    ml_confidence: float
    delta_e: float
    model_used: str
    message: str
    scientific_notice: str
    image_path: Optional[str] = None
    created_at: datetime.datetime

    model_config = ConfigDict(from_attributes=True)

# --- Dashboard Schemas ---
class LatestScanSummary(BaseModel):
    scan_id: int
    worker_name: str
    worker_code: str
    exposure_class: str
    timestamp: datetime.datetime

class DashboardSummaryResponse(BaseModel):
    total_employees: int
    active_employees: int
    todays_scans: int
    attention_required: int
    total_workers: Optional[int] = 0
    active_workers: Optional[int] = 0
    total_scans: Optional[int] = 0
    base: Optional[int] = 0
    low: Optional[int] = 0
    medium: Optional[int] = 0
    high: Optional[int] = 0
    latest_scan: Optional[LatestScanSummary] = None

class ExposureDistributionResponse(BaseModel):
    range: str
    BASE: int
    LOW: int
    MEDIUM: int
    HIGH: int
    total_scans: int

class WorkerDetailResponse(BaseModel):
    id: int
    name: str
    worker_code: str
    phone: Optional[str] = None
    status: str
    department_name: Optional[str] = None
    zone_name: Optional[str] = None
    shift_name: Optional[str] = None
    latest_exposure: Optional[str] = "NONE"
    last_scan_time: Optional[datetime.datetime] = None
    confidence: Optional[float] = None
    exposure_history: List[ScanOut] = []

# --- Notification Schemas ---
class NotificationOut(BaseModel):
    id: int
    scan_id: int
    worker_id: int
    worker_name: str
    worker_code: str
    department_name: Optional[str] = None
    zone_name: Optional[str] = None
    shift_name: Optional[str] = None
    severity: str
    title: str
    message: str
    is_read: bool
    is_acknowledged: bool
    acknowledged_at: Optional[datetime.datetime] = None
    acknowledged_by: Optional[str] = None
    created_at: datetime.datetime

    model_config = ConfigDict(from_attributes=True)

class NotificationAcknowledgeRequest(BaseModel):
    acknowledged_by: Optional[str] = "Supervisor"

class SupervisorDeviceRegisterRequest(BaseModel):
    fcm_token: str
    platform: Optional[str] = "android"

# --- Report Schemas ---
class ExposureDistributionDetail(BaseModel):
    BASE: int = 0
    LOW: int = 0
    MEDIUM: int = 0
    HIGH: int = 0
    base_pct: float = 0.0
    low_pct: float = 0.0
    medium_pct: float = 0.0
    high_pct: float = 0.0

class ReportSummaryResponse(BaseModel):
    report_id: str
    report_type: str
    period: str
    generated_at: str
    generated_by: str
    total_workers: int
    total_scans: int
    base_count: int
    low_count: int
    medium_count: int
    high_count: int
    attention_required: int
    base_pct: float
    low_pct: float
    medium_pct: float
    high_pct: float
    applied_filters: Dict[str, Any] = {}

class ReportHistoryOut(BaseModel):
    id: int
    report_id: str
    report_type: str
    generated_by_name: str
    period: str
    format: str
    scan_count: int
    generated_at: datetime.datetime

    model_config = ConfigDict(from_attributes=True)

