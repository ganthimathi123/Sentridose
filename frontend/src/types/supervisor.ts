import { ScanResult, WorkerSummary } from './auth';
export type { WorkerSummary };

export interface User {
  id: number;
  name: string;
  role: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  access_token: string;
  token_type: string;
  user: User;
}

export interface SupervisorVerifyResponse {
  status: string;
  token: string;
  message: string;
}

export interface DashboardSummary {
  total_employees: number;
  active_employees: number;
  todays_scans: number;
  attention_required: number;
}

export interface ExposureDistribution {
  range: 'today' | 'week' | 'month';
  BASE: number;
  LOW: number;
  MEDIUM: number;
  HIGH: number;
  total_scans: number;
}

export interface Department {
  id: number;
  name: string;
  description?: string;
  status: 'ACTIVE' | 'INACTIVE';
  employee_count?: number;
  active_worker_count?: number;
  today_scan_count?: number;
  attention_count?: number;
  created_at: string;
}

export interface WorkZone {
  id: number;
  name: string;
  zone_code: string;
  department_id: number;
  department_name?: string;
  description?: string;
  status: 'ACTIVE' | 'INACTIVE';
  active_worker_count?: number;
  today_scan_count?: number;
  attention_count?: number;
  created_at: string;
}

export interface Shift {
  id: number;
  name: string;
  start_time: string;
  end_time: string;
  status: 'ACTIVE' | 'INACTIVE';
  active_worker_count?: number;
  today_scan_count?: number;
  attention_count?: number;
  created_at: string;
}

export interface WorkerAssignment {
  id: number;
  worker_id: number;
  worker_name: string;
  worker_code: string;
  department_id: number;
  department_name: string;
  zone_id: number;
  zone_name: string;
  shift_id: number;
  shift_name: string;
  status: 'ACTIVE' | 'INACTIVE';
  start_date: string;
  created_at: string;
}

export interface WorkerDetail {
  id: number;
  name: string;
  worker_code: string;
  phone?: string;
  status: 'ACTIVE' | 'INACTIVE';
  department_name?: string;
  zone_name?: string;
  shift_name?: string;
  latest_exposure?: string;
  last_scan_time?: string;
  confidence?: number;
  exposure_history: EnrichedScan[];
}

export interface EnrichedScan extends ScanResult {
  worker_code?: string;
  department_id?: number;
  department_name?: string;
  zone_id?: number;
  zone_name?: string;
  shift_id?: number;
  shift_name?: string;
}
