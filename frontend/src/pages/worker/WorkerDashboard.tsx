import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { workerDeviceService } from '../../services/api';
import { ScanResult } from '../../types/auth';
import { Camera, Check, AlertTriangle, ArrowRight, History, Smartphone, LogOut } from 'lucide-react';

export const WorkerDashboard: React.FC = () => {
  const { worker, unregisterWorkerDevice } = useAuth();
  const navigate = useNavigate();

  const [recentScans, setRecentScans] = useState<ScanResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [showUnregisterConfirm, setShowUnregisterConfirm] = useState(false);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const data = await workerDeviceService.getOwnHistory();
        setRecentScans(data);
      } catch (err) {
        console.error('Failed to load worker scan history:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchHistory();
  }, []);

  const handleConfirmUnregister = async () => {
    await unregisterWorkerDevice();
    navigate('/worker/register');
  };

  const lastScan = recentScans.length > 0 ? recentScans[0] : null;
  const todayStatus = lastScan ? lastScan.exposure_class : 'BASE';
  const isSafe = todayStatus === 'BASE' || todayStatus === 'LOW';

  const formatTime = (ts?: string) => {
    if (!ts) return 'N/A';
    const d = new Date(ts);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (ts?: string) => {
    if (!ts) return '';
    const d = new Date(ts);
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans p-4 sm:p-8 flex flex-col justify-between">
      <div className="max-w-xl mx-auto w-full space-y-6">
        {/* Header Greeting */}
        <div className="flex items-center justify-between pt-2 border-b border-slate-200/80 pb-4">
          <div className="space-y-0.5">
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">SENTRIDOSE</h1>
            <p className="text-sm text-slate-600 font-semibold">
              Welcome, <span className="text-teal-700 font-extrabold">{worker?.name || 'Worker'}</span>
            </p>
          </div>
          <div className="text-right">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400 bg-slate-200/70 px-2.5 py-1 rounded-lg">
              ID: {worker?.worker_code || 'WRK'}
            </span>
          </div>
        </div>

        {/* Main Large CTA Button */}
        <div className="bg-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl text-center space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-teal-500/20 border border-teal-500/40 text-teal-400 flex items-center justify-center mx-auto">
            <Camera className="w-7 h-7" />
          </div>

          <div className="space-y-1">
            <h2 className="text-xl font-black tracking-wide">READY TO SCAN DOSIMETER</h2>
            <p className="text-xs text-slate-400">
              Align dosimeter color strip within camera viewfinder to record optical exposure reading.
            </p>
          </div>

          <button
            onClick={() => navigate('/worker/scan')}
            className="w-full bg-teal-500 hover:bg-teal-400 text-slate-950 font-black text-lg py-4 px-6 rounded-2xl shadow-xl shadow-teal-500/20 transition transform hover:-translate-y-0.5 active:translate-y-0 flex items-center justify-center space-x-2"
          >
            <Camera className="w-6 h-6" />
            <span>SCAN DOSIMETER</span>
          </button>
        </div>

        {/* Compact Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Today's Status */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-2">
            <div className="text-xs font-bold font-mono text-slate-400 uppercase tracking-wider">
              TODAY'S STATUS
            </div>
            <div className="flex items-center space-x-3">
              <span className={`text-3xl font-black ${isSafe ? 'text-emerald-600' : 'text-red-600'}`}>
                {todayStatus}
              </span>
              <span className={`px-2.5 py-1 rounded-full text-xs font-mono font-bold uppercase tracking-wider ${
                isSafe ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'
              }`}>
                {isSafe ? 'SAFE' : 'ATTENTION'}
              </span>
            </div>
          </div>

          {/* Last Scan */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-2 flex flex-col justify-between">
            <div className="text-xs font-bold font-mono text-slate-400 uppercase tracking-wider">
              LAST SCAN
            </div>

            {lastScan ? (
              <div className="space-y-2">
                <div className="flex justify-between items-baseline text-xs font-mono">
                  <span className="text-slate-500">Exposure: <strong className="text-slate-900">{lastScan.exposure_class}</strong></span>
                  <span className="text-slate-400">{formatTime(lastScan.timestamp || lastScan.created_at)}</span>
                </div>
                <div className="text-[11px] font-mono text-slate-500">
                  Confidence: <strong className="text-slate-900">{lastScan.confidence}%</strong>
                </div>
                <button
                  onClick={() => navigate('/worker/result', { state: { result: lastScan } })}
                  className="w-full bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-extrabold py-2 px-3 rounded-xl border border-slate-300 transition flex items-center justify-center space-x-1"
                >
                  <span>VIEW RESULT</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <p className="text-xs text-slate-400 italic">No scans recorded yet.</p>
            )}
          </div>
        </div>

        {/* View History Button (Section 5) */}
        <button
          onClick={() => navigate('/worker/history')}
          className="w-full bg-white hover:bg-slate-100 text-slate-800 font-bold py-3.5 px-6 rounded-2xl border border-slate-200 shadow-sm transition flex items-center justify-between text-xs"
        >
          <div className="flex items-center space-x-2">
            <History className="w-4 h-4 text-teal-600" />
            <span className="uppercase tracking-wider">MY HISTORY</span>
          </div>
          <span className="text-slate-400 font-mono">({recentScans.length} Scans) →</span>
        </button>

        {/* Device Reset Option (Section 12) */}
        <div className="pt-4 border-t border-slate-200/80 text-center space-y-2">
          <div className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">Device Settings</div>

          {!showUnregisterConfirm ? (
            <button
              onClick={() => setShowUnregisterConfirm(true)}
              className="text-xs font-semibold text-slate-400 hover:text-red-500 transition underline"
            >
              Register this device to another worker
            </button>
          ) : (
            <div className="bg-red-50 border border-red-200 rounded-2xl p-4 text-center space-y-3 max-w-sm mx-auto">
              <p className="text-xs font-bold text-red-900">Are you sure you want to unregister this device?</p>
              <div className="flex justify-center space-x-3">
                <button
                  onClick={handleConfirmUnregister}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-xl shadow"
                >
                  Yes, Unregister
                </button>
                <button
                  onClick={() => setShowUnregisterConfirm(false)}
                  className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs rounded-xl"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <footer className="text-center text-[11px] font-mono text-slate-400 py-4 max-w-xl mx-auto w-full">
        SENTRIDOSE — Persistent Device Session ({worker?.worker_code})
      </footer>
    </div>
  );
};
