import React, { createContext, useContext, useState, useEffect } from 'react';
import { WorkerSummary } from '../types/auth';
import { workerDeviceService } from '../services/api';

interface AuthContextType {
  worker: WorkerSummary | null;
  deviceToken: string | null;
  isDeviceRegistered: boolean;
  isCheckingSession: boolean;
  sessionError: string | null;
  registerWorkerDevice: (workerCode: string) => Promise<void>;
  unregisterWorkerDevice: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [worker, setWorker] = useState<WorkerSummary | null>(() => {
    const saved = localStorage.getItem('sentridose_worker');
    return saved ? JSON.parse(saved) : null;
  });

  const [deviceToken, setDeviceToken] = useState<string | null>(() => {
    return localStorage.getItem('sentridose_device_token');
  });

  const [isCheckingSession, setIsCheckingSession] = useState(true);
  const [sessionError, setSessionError] = useState<string | null>(null);

  // Validate Worker Device session on app load
  useEffect(() => {
    const validateExistingSession = async () => {
      const storedToken = localStorage.getItem('sentridose_device_token');
      if (storedToken) {
        try {
          const res = await workerDeviceService.validateDevice(storedToken);
          setWorker(res.worker);
          setDeviceToken(storedToken);
          localStorage.setItem('sentridose_worker', JSON.stringify(res.worker));
          setSessionError(null);
        } catch (err: any) {
          console.warn('Worker device session invalid:', err);
          if (err.response?.status === 403) {
            setSessionError('ACCESS REVOKED — Please contact your supervisor.');
          } else {
            setSessionError(null);
          }
          setDeviceToken(null);
          setWorker(null);
          localStorage.removeItem('sentridose_device_token');
          localStorage.removeItem('sentridose_worker');
        }
      }
      setIsCheckingSession(false);
    };

    validateExistingSession();
  }, []);

  const registerWorkerDevice = async (workerCode: string) => {
    const data = await workerDeviceService.registerDevice(workerCode);
    setDeviceToken(data.device_token);
    setWorker(data.worker);
    localStorage.setItem('sentridose_device_token', data.device_token);
    localStorage.setItem('sentridose_worker', JSON.stringify(data.worker));
    setSessionError(null);
  };

  const unregisterWorkerDevice = async () => {
    try {
      await workerDeviceService.unregister();
    } catch (err) {
      console.warn('Unregister error ignored:', err);
    } finally {
      setDeviceToken(null);
      setWorker(null);
      setSessionError(null);
      localStorage.removeItem('sentridose_device_token');
      localStorage.removeItem('sentridose_worker');
    }
  };

  return (
    <AuthContext.Provider
      value={{
        worker,
        deviceToken,
        isDeviceRegistered: !!deviceToken && !!worker,
        isCheckingSession,
        sessionError,
        registerWorkerDevice,
        unregisterWorkerDevice,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
