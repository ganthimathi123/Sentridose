import axios from 'axios';
import {
  WorkerRegisterDeviceResponse,
  DeviceValidateResponse,
  WorkerSummary,
  ScanResult,
} from '../types/auth';
import {
  LoginRequest,
  LoginResponse,
  SupervisorVerifyResponse,
  DashboardSummary,
  ExposureDistribution,
  Department,
  WorkZone,
  Shift,
  WorkerAssignment,
  WorkerDetail,
  EnrichedScan,
} from '../types/supervisor';
import { API_BASE_URL } from '../config/api';

export const api = axios.create({
  baseURL: API_BASE_URL,
});

api.interceptors.request.use((config) => {
  const deviceToken = localStorage.getItem('sentridose_device_token');
  if (deviceToken) {
    config.headers['X-Device-Token'] = deviceToken;
  }
  const supervisorToken = localStorage.getItem('sentridose_supervisor_token');
  if (supervisorToken) {
    config.headers['X-Supervisor-Token'] = supervisorToken;
    config.headers['Authorization'] = `Bearer ${supervisorToken}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      if (window.location.pathname.startsWith('/supervisor') && window.location.pathname !== '/supervisor') {
        localStorage.removeItem('sentridose_supervisor_token');
        window.location.href = '/supervisor';
      }
    }
    return Promise.reject(error);
  }
);

export const workerDeviceService = {
  registerDevice: async (worker_code: string): Promise<WorkerRegisterDeviceResponse> => {
    const response = await api.post<WorkerRegisterDeviceResponse>('/worker/register-device', {
      worker_code,
      device_id: `web-${window.location.hostname}`,
    });
    return response.data;
  },

  validateDevice: async (deviceToken: string): Promise<DeviceValidateResponse> => {
    const response = await api.post<DeviceValidateResponse>(
      '/worker/device/validate',
      { device_token: deviceToken },
      { headers: { 'X-Device-Token': deviceToken } }
    );
    return response.data;
  },

  getMe: async (): Promise<WorkerSummary> => {
    const response = await api.get<WorkerSummary>('/worker/me');
    return response.data;
  },

  getOwnHistory: async (): Promise<ScanResult[]> => {
    const response = await api.get<ScanResult[]>('/worker/history');
    return response.data;
  },

  getScanById: async (scanId: number): Promise<ScanResult> => {
    const response = await api.get<ScanResult>(`/worker/scans/${scanId}`);
    return response.data;
  },

  unregister: async (): Promise<void> => {
    await api.post('/worker/device/unregister');
  },
};

export const scanService = {
  analyzeScan: async (file: File): Promise<ScanResult> => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await api.post<ScanResult>('/scan/analyze', formData);
    return response.data;
  },
};

export const supervisorService = {
  checkHasSupervisor: async (): Promise<{ has_supervisor: boolean }> => {
    const response = await api.get<{ has_supervisor: boolean }>('/auth/has-supervisor');
    return response.data;
  },

  register: async (data: { name: string; email: string; password: string; confirm_password: string }): Promise<LoginResponse> => {
    const response = await api.post<LoginResponse>('/auth/register', data);
    return response.data;
  },

  login: async (credentials: LoginRequest): Promise<LoginResponse> => {
    const response = await api.post<LoginResponse>('/auth/login', credentials);
    return response.data;
  },

  verifyCode: async (supervisor_code: string): Promise<SupervisorVerifyResponse> => {
    const response = await api.post<SupervisorVerifyResponse>('/supervisor/verify', {
      supervisor_code,
    });
    return response.data;
  },

  getDashboardSummary: async (): Promise<DashboardSummary> => {
    const response = await api.get<DashboardSummary>('/dashboard/summary');
    return response.data;
  },

  getExposureDistribution: async (range: 'today' | 'week' | 'month' = 'today'): Promise<ExposureDistribution> => {
    const response = await api.get<ExposureDistribution>(`/dashboard/exposure-distribution?range=${range}`);
    return response.data;
  },

  getWorkers: async (status?: string): Promise<WorkerSummary[]> => {
    const url = status ? `/workers?status=${status}` : '/workers';
    const response = await api.get<WorkerSummary[]>(url);
    return response.data;
  },

  createWorker: async (data: { name: string; worker_code: string; department_id?: number; zone_id?: number; shift_id?: number; phone?: string; status?: string }): Promise<WorkerSummary> => {
    const response = await api.post<WorkerSummary>('/workers', data);
    return response.data;
  },

  getWorkerById: async (id: number): Promise<WorkerDetail> => {
    const response = await api.get<WorkerDetail>(`/workers/${id}`);
    return response.data;
  },

  updateWorker: async (id: number, data: { name?: string; department_id?: number; zone_id?: number; shift_id?: number; phone?: string; status?: string }): Promise<WorkerSummary> => {
    const response = await api.patch<WorkerSummary>(`/workers/${id}`, data);
    return response.data;
  },

  getDepartments: async (): Promise<Department[]> => {
    const response = await api.get<Department[]>('/departments');
    return response.data;
  },

  createDepartment: async (data: { name: string; description?: string; status?: string }): Promise<Department> => {
    const response = await api.post<Department>('/departments', data);
    return response.data;
  },

  getDepartmentById: async (id: number): Promise<Department> => {
    const response = await api.get<Department>(`/departments/${id}`);
    return response.data;
  },

  getZones: async (): Promise<WorkZone[]> => {
    const response = await api.get<WorkZone[]>('/zones');
    return response.data;
  },

  createZone: async (data: { name: string; zone_code: string; department_id: number; description?: string; status?: string }): Promise<WorkZone> => {
    const response = await api.post<WorkZone>('/zones', data);
    return response.data;
  },

  getZoneById: async (id: number): Promise<WorkZone> => {
    const response = await api.get<WorkZone>(`/zones/${id}`);
    return response.data;
  },

  getShifts: async (): Promise<Shift[]> => {
    const response = await api.get<Shift[]>('/shifts');
    return response.data;
  },

  createShift: async (data: { name: string; start_time: string; end_time: string; status?: string }): Promise<Shift> => {
    const response = await api.post<Shift>('/shifts', data);
    return response.data;
  },

  getAssignments: async (status: string = 'ACTIVE'): Promise<WorkerAssignment[]> => {
    const response = await api.get<WorkerAssignment[]>(`/assignments?status=${status}`);
    return response.data;
  },

  createAssignment: async (data: { worker_id: number; department_id: number; zone_id: number; shift_id: number }): Promise<WorkerAssignment> => {
    const response = await api.post<WorkerAssignment>('/assignments', data);
    return response.data;
  },

  getAllScans: async (params?: {
    department_id?: number;
    zone_id?: number;
    shift_id?: number;
    worker_id?: number;
    exposure_class?: string;
    limit?: number;
  }): Promise<EnrichedScan[]> => {
    const response = await api.get<EnrichedScan[]>('/scans', { params });
    return response.data;
  },

  getScanById: async (id: number): Promise<EnrichedScan> => {
    const response = await api.get<EnrichedScan>(`/scans/${id}`);
    return response.data;
  },
};
