import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';

// Worker Pages
import { WorkerAccessPage } from './pages/worker/WorkerAccessPage';
import { WorkerHomePage } from './pages/worker/WorkerHomePage';
import { ScanPage } from './pages/worker/ScanPage';
import { ResultPage } from './pages/worker/ResultPage';
import { HistoryPage } from './pages/worker/HistoryPage';
import { ScanDetailPage } from './pages/worker/ScanDetailPage';

// Supervisor Pages & Layout
import { SupervisorAccessPage } from './pages/supervisor/SupervisorAccessPage';
import { SupervisorLayout } from './components/supervisor/SupervisorLayout';
import { SupervisorDashboardPage } from './pages/supervisor/SupervisorDashboardPage';
import { EmployeesPage } from './pages/supervisor/EmployeesPage';
import { DepartmentsPage } from './pages/supervisor/DepartmentsPage';
import { WorkZonesPage } from './pages/supervisor/WorkZonesPage';
import { ShiftsPage } from './pages/supervisor/ShiftsPage';
import { AssignmentsPage } from './pages/supervisor/AssignmentsPage';
import { ScansPage } from './pages/supervisor/ScansPage';
import { ReportsPage } from './pages/supervisor/ReportsPage';

// Protected Route for Worker Device Session
const WorkerProtectedRoute: React.FC = () => {
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

// Protected Route for Supervisor Session Token
const SupervisorProtectedRoute: React.FC = () => {
  const token = localStorage.getItem('sentridose_supervisor_token');
  if (!token) {
    return <Navigate to="/supervisor" replace />;
  }
  return <Outlet />;
};

// Root entry routing: Redirect directly to Supervisor Website
const RootIndexRedirect: React.FC = () => {
  return <Navigate to="/supervisor" replace />;
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Automatic Root Entry */}
          <Route path="/" element={<RootIndexRedirect />} />

          {/* Worker Website */}
          <Route path="/access" element={<WorkerAccessPage />} />
          <Route element={<WorkerProtectedRoute />}>
            <Route path="/home" element={<WorkerHomePage />} />
            <Route path="/scan" element={<ScanPage />} />
            <Route path="/result" element={<ResultPage />} />
            <Route path="/history" element={<HistoryPage />} />
            <Route path="/history/:id" element={<ScanDetailPage />} />
          </Route>

          {/* Supervisor Application */}
          <Route path="/supervisor" element={<SupervisorAccessPage />} />
          <Route element={<SupervisorProtectedRoute />}>
            <Route element={<SupervisorLayout />}>
              <Route path="/supervisor/dashboard" element={<SupervisorDashboardPage />} />
              <Route path="/supervisor/employees" element={<EmployeesPage />} />
              <Route path="/supervisor/departments" element={<DepartmentsPage />} />
              <Route path="/supervisor/zones" element={<WorkZonesPage />} />
              <Route path="/supervisor/shifts" element={<ShiftsPage />} />
              <Route path="/supervisor/assignments" element={<AssignmentsPage />} />
              <Route path="/supervisor/scans" element={<ScansPage />} />
              <Route path="/supervisor/scans/:scanId" element={<ScansPage />} />
              <Route path="/supervisor/reports" element={<ReportsPage />} />
            </Route>
          </Route>

          {/* Fallback */}
          <Route path="*" element={<RootIndexRedirect />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
};

export default App;
