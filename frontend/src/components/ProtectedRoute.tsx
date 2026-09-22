import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export const ProtectedRoute: React.FC = () => {
  const { isDeviceRegistered, isCheckingSession } = useAuth();

  if (isCheckingSession) {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center font-mono text-xs">
        Checking device session...
      </div>
    );
  }

  if (!isDeviceRegistered) {
    return <Navigate to="/access" replace />;
  }

  return <Outlet />;
};
