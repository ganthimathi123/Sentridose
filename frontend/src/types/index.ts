export interface User {
  id: number;
  email: string;
  full_name: string;
  role: 'admin' | 'safety_officer' | 'worker';
  is_active: boolean;
}

export interface Worker {
  id: number;
  worker_code: string;
  name: string;
  department: string;
  role: string;
  shift: string;
  created_at: string;
}

export interface Dosimeter {
  id: number;
  dosimeter_code: string;
  batch_id?: number;
  assigned_worker_id?: number;
  status: 'VALID' | 'WARNING' | 'EXPIRED' | 'INACTIVE';
  manufacture_date: string;
  expiry_date: string;
}

export interface ColorFeatures {
  mean_r: number;
  mean_g: number;
  mean_b: number;
  std_r: number;
  std_g: number;
  std_b: number;
  h_val: number;
  s_val: number;
  v_val: number;
  lab_l: number;
  lab_a: number;
  lab_b: number;
  rg_ratio: number;
  gb_ratio: number;
  rb_ratio: number;
  delta_e: number;
  corrected_rgb?: { r: number; g: number; b: number };
}

export interface ImageAnalysis {
  blur_score: number;
  brightness_score: number;
  contrast_score: number;
  exposure_status: string;
  qr_detected: boolean;
  ref_scale_detected: boolean;
  sensor_strip_detected: boolean;
  validity_indicator_detected: boolean;
  validity_patch_status: 'VALID' | 'WARNING' | 'INVALID' | 'UNKNOWN';
  perspective_corrected: boolean;
  calibration_method: string;
  rejection_reasons?: string[];
}

export interface Prediction {
  predicted_class: string;
  probabilities?: Record<string, number>;
  confidence: number;
  estimated_exposure?: number | null;
  uncertainty?: number | null;
  calibration_status: string;
  model_version: string;
}

export interface ScanResponse {
  id: number;
  worker_id: number;
  worker_name?: string;
  dosimeter_id?: number;
  dosimeter_code?: string;
  image_path: string;
  timestamp: string;
  quality_score: number;
  quality_status: 'GOOD' | 'WARNING' | 'REJECT';
  mode: 'DEMO' | 'VALIDATED';
  image_analysis?: ImageAnalysis;
  color_features?: ColorFeatures;
  prediction?: Prediction;
}

export interface DashboardSummary {
  total_workers: number;
  active_dosimeters: number;
  scans_today: number;
  valid_dosimeters: number;
  invalid_dosimeters: number;
  exposure_warnings: number;
  system_mode: 'DEMO' | 'VALIDATED';
  active_model_version: string;
  model_validated: boolean;
}

export interface DashboardTrendPoint {
  date: string;
  scans_count: number;
  baseline_count: number;
  low_count: number;
  moderate_count: number;
  high_count: number;
}

export interface ModelVersion {
  id: number;
  version_name: string;
  model_type: string;
  algorithm: string;
  is_active: boolean;
  mode: 'DEMO' | 'VALIDATED';
  metrics: Record<string, any>;
  features_list: string[];
  created_at: string;
}
