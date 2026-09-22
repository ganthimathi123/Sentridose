export interface WorkerSummary {
  id: number;
  name: string;
  worker_code: string;
  department: string;
  department_name?: string;
  zone_name?: string;
  shift_name?: string;
  phone?: string;
  status?: string;
}

export interface WorkerRegisterDeviceResponse {
  status: string;
  worker: WorkerSummary;
  device_token: string;
}

export interface DeviceValidateResponse {
  status: string;
  worker: WorkerSummary;
}

export interface ColorFeatures {
  mean_r: number;
  mean_g: number;
  mean_b: number;
  scanned_hex: string;
  h_val: number;
  s_val: number;
  v_val: number;
  lab_l: number;
  lab_a: number;
  lab_b: number;
}

export interface ScanResult {
  status: string;
  scan_id?: number;
  id?: number;
  worker_id?: number;
  worker_name?: string;
  exposure_class: 'BASE' | 'LOW' | 'MEDIUM' | 'HIGH';
  nearest_shade: 'LIGHT' | 'ORIGINAL' | 'DARK';
  closest_hex: string;
  scanned_hex: string;
  reference_hex?: string;
  confidence: number;
  ml_confidence: number;
  model_used: string;
  delta_e: number;
  message: string;
  scientific_notice: string;
  color_features?: ColorFeatures;
  timestamp?: string;
  created_at?: string;
  image_path?: string;
}
