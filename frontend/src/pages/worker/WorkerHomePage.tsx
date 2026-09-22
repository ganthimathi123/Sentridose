import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { workerDeviceService } from '../../services/api';
import { ScanResult } from '../../types/auth';
import { Camera, Check, AlertTriangle, ArrowRight, History, Shield, Smartphone } from 'lucide-react';

export const WorkerHomePage: React.FC = () => {
  const { worker, unregisterWorkerDevice } = useAuth();
  const navigate = useNavigate();

  const [recentScans, setRecentScans] = useState<ScanResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [showUnregisterModal, setShowUnregisterModal] = useState(false);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const data = await workerDeviceService.getOwnHistory();
        setRecentScans(data);
      } catch (err) {
        console.error('Failed to load worker history:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchHistory();
  }, []);

  const handleConfirmUnregister = async () => {
    await unregisterWorkerDevice();
    navigate('/access');
  };

  const lastScan = recentScans.length > 0 ? recentScans[0] : null;

  const formatTime = (ts?: string) => {
    if (!ts) return 'N/A';
    const d = new Date(ts);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans p-4 sm:p-6 flex flex-col justify-between">
      <div className="max-w-md mx-auto w-full space-y-6">
        {/* Header */}
        <div className="text-center pt-2 space-y-1">
          <div className="flex items-center justify-center space-x-2">
            <Shield className="w-5 h-5 text-teal-600" />
            <h1 className="text-2xl font-black text-slate-900 tracking-wider">SENTRIDOSE</h1>
          </div>
          <p className="text-[10px] font-mono text-teal-700 tracking-widest uppercase font-bold">
            PASSIVE EXPOSURE • INTELLIGENT READING
          </p>
        </div>

        {/* Worker Info Banner */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-3 text-xs">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <div>
              <span className="text-slate-400 font-bold uppercase text-[9px] tracking-wider block">Worker Identity</span>
              <div className="text-lg font-black text-slate-900">{worker?.name || 'Worker'}</div>
            </div>
            <span className="text-xs font-mono font-black uppercase tracking-wider text-teal-700 bg-teal-50 border border-teal-200 px-3 py-1.5 rounded-xl">
              {worker?.worker_code || 'WRK-A001'}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-center text-xs font-mono">
            <div className="p-2 bg-slate-50 rounded-xl border border-slate-200">
              <span className="text-[9px] text-slate-400 uppercase block font-bold">Department</span>
              <span className="font-extrabold text-slate-800">{worker?.department_name || worker?.department || 'Production'}</span>
            </div>
            <div className="p-2 bg-slate-50 rounded-xl border border-slate-200">
              <span className="text-[9px] text-slate-400 uppercase block font-bold">Zone</span>
              <span className="font-extrabold text-slate-800">{worker?.zone_name || 'Zone A'}</span>
            </div>
          </div>
        </div>

        {/* Main Action: SCAN DOSIMETER (Largest Button) */}
        <div className="bg-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-2xl text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-teal-500/20 border border-teal-500/40 text-teal-400 flex items-center justify-center mx-auto">
            <Camera className="w-8 h-8" />
          </div>

          <button
            onClick={() => navigate('/scan')}
            className="w-full bg-teal-500 hover:bg-teal-400 text-slate-950 font-black text-xl py-5 px-6 rounded-2xl shadow-xl shadow-teal-500/20 transition transform hover:-translate-y-0.5 active:translate-y-0 flex items-center justify-center space-x-3"
          >
            <Camera className="w-7 h-7" />
            <span>SCAN DOSIMETER</span>
          </button>
        </div>

        {/* LAST SCAN Summary (Section 8) */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-3">
          <div className="text-[11px] font-bold font-mono text-slate-400 uppercase tracking-wider">
            LAST SCAN
          </div>

          {lastScan ? (
            <div className="space-y-2">
              <div className="flex justify-between items-baseline">
                <span className="text-xs text-slate-500 font-medium">Exposure:</span>
                <span className={`text-lg font-black uppercase ${
                  lastScan.exposure_class === 'BASE' || lastScan.exposure_class === 'LOW' ? 'text-emerald-600' : 'text-red-600'
                }`}>
                  {lastScan.exposure_class}
                </span>
              </div>

              <div className="flex justify-between items-center text-xs font-mono text-slate-600 pt-1 border-t border-slate-100">
                <span>Time: <strong>{formatTime(lastScan.timestamp || lastScan.created_at)}</strong></span>
                <span>Confidence: <strong>{lastScan.confidence}%</strong></span>
              </div>

              <button
                onClick={() => navigate('/result', { state: { result: lastScan } })}
                className="w-full mt-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold py-2.5 px-3 rounded-xl border border-slate-300 transition flex items-center justify-center space-x-1"
              >
                <span>VIEW RESULT</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <p className="text-xs text-slate-400 italic">No scans recorded yet. Press SCAN DOSIMETER above.</p>
          )}
        </div>

        {/* MY HISTORY Button (Section 8) */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-3">
          <div className="text-[11px] font-bold font-mono text-slate-400 uppercase tracking-wider">
            MY HISTORY
          </div>

          <button
            onClick={() => navigate('/history')}
            className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-3.5 px-5 rounded-xl shadow transition text-xs flex items-center justify-between"
          >
            <div className="flex items-center space-x-2">
              <History className="w-4 h-4 text-teal-400" />
              <span>VIEW HISTORY</span>
            </div>
            <span className="font-mono text-slate-400">({recentScans.length} Scans) →</span>
          </button>
        </div>

        {/* DEVICE Section (Section 24 & 25) */}
        <div className="bg-slate-100 border border-slate-200 rounded-2xl p-4 space-y-2 text-xs">
          <div className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider flex items-center space-x-1.5">
            <Smartphone className="w-3.5 h-3.5" />
            <span>DEVICE</span>
          </div>

          <div className="flex justify-between items-center font-mono text-[11px] text-slate-600">
            <span>Code: <strong>{worker?.worker_code}</strong></span>
            <span>Status: <strong className="text-emerald-700">REGISTERED</strong></span>
          </div>

          <div className="pt-2 border-t border-slate-200 text-center">
            <button
              onClick={() => setShowUnregisterModal(true)}
              className="text-[11px] font-bold text-slate-500 hover:text-red-600 transition underline"
            >
              UNREGISTER DEVICE
            </button>
          </div>
        </div>
      </div>

      {/* Confirmation Modal for Unregistering Device (Section 25) */}
      {showUnregisterModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 max-w-sm w-full space-y-4 shadow-2xl text-center animate-fade-in">
            <div className="w-12 h-12 rounded-2xl bg-red-50 text-red-600 border border-red-200 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div className="space-y-1">
              <h3 className="text-base font-black text-slate-900">UNREGISTER THIS DEVICE?</h3>
              <p className="text-xs text-slate-500 leading-relaxed font-medium">
                After unregistering, you will need your Worker Code to register this device again.
              </p>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setShowUnregisterModal(false)}
                className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-3 rounded-xl text-xs"
              >
                CANCEL
              </button>
              <button
                onClick={handleConfirmUnregister}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold py-3 rounded-xl text-xs shadow"
              >
                UNREGISTER
              </button>
            </div>
          </div>
        </div>
      )}

      <footer className="text-center text-[11px] font-mono text-slate-400 py-4 max-w-md mx-auto w-full">
        SENTRIDOSE — Worker Web Application
      </footer>
    </div>
  );
};
