import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Smartphone, Check, AlertTriangle, Shield, ArrowRight } from 'lucide-react';

export const WorkerAccessPage: React.FC = () => {
  const [workerCode, setWorkerCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [registered, setRegistered] = useState(false);

  const { registerWorkerDevice, worker, sessionError } = useAuth();
  const navigate = useNavigate();

  const handleQuickDemo = (code: string) => {
    setWorkerCode(code);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!workerCode.trim()) return;

    setError(null);
    setLoading(true);

    try {
      await registerWorkerDevice(workerCode);
      setRegistered(true);
    } catch (err: any) {
      console.error('Worker code verification failed:', err);
      if (err.response?.data?.detail) {
        setError(typeof err.response.data.detail === 'string' ? err.response.data.detail : 'INVALID WORKER CODE — Please check your Worker Code and try again.');
      } else {
        setError('INVALID WORKER CODE — Please check your Worker Code and try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  if (registered) {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-6 text-center font-sans">
        <div className="max-w-md w-full bg-slate-800/90 border border-slate-700/80 rounded-3xl p-8 space-y-6 shadow-2xl backdrop-blur-sm animate-fade-in">
          <div className="w-16 h-16 rounded-full bg-teal-500/20 border-2 border-teal-400 text-teal-400 flex items-center justify-center mx-auto">
            <Check className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <h2 className="text-2xl font-black text-white tracking-wide">DEVICE REGISTERED ✓</h2>
            <h3 className="text-lg font-bold text-teal-300">Welcome, {worker?.name || 'Worker'}</h3>
            <p className="text-xs text-slate-300 font-medium leading-relaxed">
              This device is now linked to your SentriDose worker account.
            </p>
          </div>

          <button
            onClick={() => navigate('/home')}
            className="w-full bg-teal-500 hover:bg-teal-400 text-slate-950 font-black text-base py-4 px-6 rounded-2xl shadow-xl shadow-teal-500/20 transition flex items-center justify-center space-x-2"
          >
            <span>START SCANNING</span>
            <ArrowRight className="w-5 h-5" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 text-white flex flex-col justify-between p-6 font-sans">
      <div className="max-w-md mx-auto w-full text-center pt-4">
        <div className="flex items-center justify-center space-x-2.5">
          <div className="w-9 h-9 rounded-xl bg-teal-500/20 border border-teal-500/40 flex items-center justify-center text-teal-400">
            <Shield className="w-5 h-5" />
          </div>
          <span className="font-extrabold text-xl tracking-wider text-white">SENTRIDOSE</span>
        </div>
        <p className="text-[10px] font-mono text-teal-400 tracking-widest uppercase mt-1">
          PASSIVE EXPOSURE • INTELLIGENT READING
        </p>
      </div>

      <div className="max-w-md mx-auto w-full my-auto space-y-6">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-teal-500/20 border border-teal-500/40 flex items-center justify-center text-teal-400 mx-auto">
            <Smartphone className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-black text-white tracking-wider">WORKER ACCESS</h1>
          <p className="text-xs text-slate-400 leading-relaxed font-medium max-w-xs mx-auto">
            Enter your Worker Code to register this device.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="bg-slate-800/80 border border-slate-700/80 rounded-3xl p-6 sm:p-8 space-y-5 shadow-2xl backdrop-blur-sm">
          {(error || sessionError) && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-semibold p-3.5 rounded-xl flex items-center space-x-2 text-left">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              <span>{error || sessionError}</span>
            </div>
          )}

          <div className="space-y-1.5 text-left">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-300">Worker Code</label>
            <input
              type="text"
              required
              value={workerCode}
              onChange={(e) => setWorkerCode(e.target.value.toUpperCase())}
              placeholder="Enter Worker Code (e.g. WRK001)"
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-teal-500 transition font-mono uppercase font-bold tracking-wider text-center"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-teal-500 hover:bg-teal-400 text-slate-950 font-black text-base py-4 px-6 rounded-xl shadow-lg transition disabled:opacity-50"
          >
            {loading ? 'VERIFYING CODE...' : 'CONTINUE'}
          </button>

          <p className="text-[11px] text-slate-400 text-center font-mono">
            Your device will be remembered after registration.
          </p>

          {/* Quick Demo Pre-fill */}
          <div className="pt-3 border-t border-slate-700/60 text-left space-y-1.5">
            <span className="text-[10px] font-mono text-slate-400 block">Demo Worker Codes:</span>
            <div className="flex flex-wrap gap-2 text-[11px] font-mono">
              <button
                type="button"
                onClick={() => handleQuickDemo('WRK001')}
                className="px-2.5 py-1 bg-slate-900 hover:bg-slate-700 rounded-lg text-teal-300 border border-slate-700"
              >
                WRK001 (Arun)
              </button>
              <button
                type="button"
                onClick={() => handleQuickDemo('WRK002')}
                className="px-2.5 py-1 bg-slate-900 hover:bg-slate-700 rounded-lg text-teal-300 border border-slate-700"
              >
                WRK002 (Priya)
              </button>
              <button
                type="button"
                onClick={() => handleQuickDemo('WRK003')}
                className="px-2.5 py-1 bg-slate-900 hover:bg-slate-700 rounded-lg text-teal-300 border border-slate-700"
              >
                WRK003 (Ganthi)
              </button>
            </div>
          </div>
        </form>
      </div>

      <div className="text-center text-xs font-mono text-slate-500 py-4">
        SENTRIDOSE — Code-Based Device Registration
      </div>
    </div>
  );
};
