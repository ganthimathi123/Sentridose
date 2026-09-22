import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { workerDeviceService } from '../../services/api';
import { ScanResult } from '../../types/auth';
import { History, ArrowLeft } from 'lucide-react';

export const HistoryPage: React.FC = () => {
  const [scans, setScans] = useState<ScanResult[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const data = await workerDeviceService.getOwnHistory();
        setScans(data);
      } catch (err) {
        console.error('Failed to load scan history:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchHistory();
  }, []);

  const formatDate = (ts?: string) => {
    if (!ts) return 'N/A';
    const d = new Date(ts);
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase();
  };

  const formatTime = (ts?: string) => {
    if (!ts) return 'N/A';
    const d = new Date(ts);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans p-4 sm:p-6 flex flex-col justify-between">
      <div className="max-w-md mx-auto w-full space-y-5">
        <div>
          <button
            onClick={() => navigate('/home')}
            className="inline-flex items-center space-x-2 text-xs font-bold text-slate-600 hover:text-slate-900 transition"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>BACK TO HOME</span>
          </button>
        </div>

        <div className="space-y-1 text-center sm:text-left">
          <div className="flex items-center justify-center sm:justify-start space-x-2">
            <History className="w-5 h-5 text-teal-600" />
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">MY HISTORY</h1>
          </div>
          <p className="text-xs text-slate-500 font-medium">Your optical colorimetric scan audit log.</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-3xl p-4 sm:p-6 shadow-xl space-y-3">
          {loading ? (
            <div className="py-12 text-center text-xs font-mono text-slate-400">Loading scan history...</div>
          ) : scans.length === 0 ? (
            <div className="py-12 text-center space-y-3">
              <p className="text-xs text-slate-500 font-medium">No scan history recorded yet.</p>
              <button
                onClick={() => navigate('/scan')}
                className="px-4 py-2 bg-teal-500 text-slate-950 font-bold text-xs rounded-xl shadow"
              >
                Scan Dosimeter Now
              </button>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {scans.map((scan) => {
                const isSafe = scan.exposure_class === 'BASE' || scan.exposure_class === 'LOW';
                return (
                  <div
                    key={scan.id}
                    onClick={() => navigate(`/history/${scan.id}`, { state: { result: scan } })}
                    className="py-3.5 flex items-center justify-between text-xs hover:bg-slate-50 px-2 rounded-xl cursor-pointer transition"
                  >
                    <div className="space-y-0.5">
                      <div className="font-mono text-[11px] text-slate-400 font-bold">
                        {formatDate(scan.timestamp || scan.created_at)} • {formatTime(scan.timestamp || scan.created_at)}
                      </div>
                      <div className={`font-black text-sm uppercase ${isSafe ? 'text-emerald-600' : 'text-red-600'}`}>
                        {scan.exposure_class}
                      </div>
                    </div>

                    <div className="text-right space-y-0.5">
                      <div className="font-mono font-bold text-slate-900 text-sm">{scan.confidence}%</div>
                      <div className="text-[10px] font-mono text-slate-400 uppercase font-bold">{scan.nearest_shade}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <footer className="text-center text-[11px] font-mono text-slate-400 py-4 max-w-md mx-auto w-full">
        SENTRIDOSE — Personal Worker Scan Ledger
      </footer>
    </div>
  );
};
