import React, { useEffect, useState } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { workerDeviceService } from '../../services/api';
import { ScanResult } from '../../types/auth';
import { ArrowLeft, Check, AlertTriangle, Shield } from 'lucide-react';

export const ScanDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const navigate = useNavigate();

  const [scan, setScan] = useState<ScanResult | null>(location.state?.result || null);
  const [loading, setLoading] = useState(!location.state?.result);

  useEffect(() => {
    if (!scan && id) {
      const fetchScan = async () => {
        try {
          const data = await workerDeviceService.getScanById(parseInt(id, 10));
          setScan(data);
        } catch (err) {
          console.error('Failed to fetch scan detail:', err);
        } finally {
          setLoading(false);
        }
      };
      fetchScan();
    }
  }, [id, scan]);

  if (loading) {
    return <div className="py-12 text-center text-xs font-mono text-slate-400">Loading scan detail...</div>;
  }

  if (!scan) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 text-center">
        <div className="bg-white border border-slate-200 rounded-3xl p-8 max-w-sm w-full space-y-4 shadow-xl">
          <p className="text-xs text-slate-500 font-medium">Scan record not found or access denied.</p>
          <button
            onClick={() => navigate('/history')}
            className="w-full bg-slate-900 text-white font-bold py-3 rounded-xl text-xs"
          >
            BACK TO HISTORY
          </button>
        </div>
      </div>
    );
  }

  const isSafe = scan.exposure_class === 'BASE' || scan.exposure_class === 'LOW';

  const formatDate = (ts?: string) => {
    if (!ts) return 'N/A';
    const d = new Date(ts);
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
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
            onClick={() => navigate('/history')}
            className="inline-flex items-center space-x-2 text-xs font-bold text-slate-600 hover:text-slate-900 transition"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>BACK TO HISTORY</span>
          </button>
        </div>

        <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
          <div className="text-center space-y-1">
            <div className="text-[11px] font-mono font-bold uppercase tracking-widest text-slate-400">
              SCAN RECORD #{scan.id}
            </div>
            <h1 className="text-3xl font-black text-slate-900">{scan.exposure_class} EXPOSURE</h1>
          </div>

          {/* Safety Status */}
          {isSafe ? (
            <div className="bg-emerald-600 text-white font-extrabold p-4 rounded-2xl shadow-xl border-2 border-emerald-400 text-center text-xs uppercase tracking-wider">
              ACCEPTABLE LOW EXPOSURE LEVEL — MATCH
            </div>
          ) : (
            <div className="bg-red-600 text-white font-extrabold p-4 rounded-2xl shadow-2xl border-2 border-red-400 text-center text-xs uppercase tracking-wider animate-pulse">
              MOVE TO A SAFER PLACE IMMEDIATELY!
            </div>
          )}

          <div className="space-y-2.5 text-xs font-mono">
            <div className="flex justify-between items-center bg-slate-50 p-3 rounded-xl">
              <span className="text-slate-400 uppercase font-sans font-bold">Exposure</span>
              <strong className="text-slate-900 text-sm font-black">{scan.exposure_class}</strong>
            </div>

            <div className="flex justify-between items-center bg-slate-50 p-3 rounded-xl">
              <span className="text-slate-400 uppercase font-sans font-bold">Nearest Shade</span>
              <strong className="text-slate-900 text-sm font-black">{scan.nearest_shade}</strong>
            </div>

            <div className="flex justify-between items-center bg-slate-50 p-3 rounded-xl">
              <span className="text-slate-400 uppercase font-sans font-bold">Confidence</span>
              <strong className="text-slate-900 text-sm font-black">{scan.confidence}%</strong>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-1 font-mono">
              <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl text-center space-y-1">
                <span className="text-[10px] text-slate-400 font-sans font-bold uppercase block">Scanned Color</span>
                <div className="w-8 h-8 rounded border mx-auto shadow-sm" style={{ backgroundColor: scan.scanned_hex }} />
                <span className="font-bold text-slate-900 text-xs block">{scan.scanned_hex}</span>
              </div>

              <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl text-center space-y-1">
                <span className="text-[10px] text-slate-400 font-sans font-bold uppercase block">Reference Color</span>
                <div className="w-8 h-8 rounded border mx-auto shadow-sm" style={{ backgroundColor: scan.closest_hex || scan.reference_hex }} />
                <span className="font-bold text-slate-900 text-xs block">{scan.closest_hex || scan.reference_hex}</span>
              </div>
            </div>

            <div className="flex justify-between items-center bg-slate-50 p-3 rounded-xl text-slate-600">
              <span>ΔE: <strong className="text-slate-900">{scan.delta_e}</strong></span>
              <span>Model: <strong className="text-slate-900">{scan.model_used || 'RandomForest'}</strong></span>
            </div>

            <div className="flex justify-between items-center bg-slate-50 p-3 rounded-xl text-slate-600">
              <span>Date: <strong className="text-slate-900">{formatDate(scan.timestamp || scan.created_at)}</strong></span>
              <span>Time: <strong className="text-slate-900">{formatTime(scan.timestamp || scan.created_at)}</strong></span>
            </div>
          </div>

          <div className="bg-amber-50 border border-amber-200 p-3.5 rounded-xl text-left space-y-1 text-amber-900">
            <span className="text-[10px] font-extrabold uppercase font-mono tracking-wider block">SCIENTIFIC NOTICE</span>
            <p className="text-[11px] leading-relaxed">
              SIMULATED OPTICAL REFERENCE — NOT A GAS CONCENTRATION STANDARD.
            </p>
          </div>
        </div>
      </div>

      <footer className="text-center text-[11px] font-mono text-slate-400 py-4 max-w-md mx-auto w-full">
        SENTRIDOSE — Worker Audit Record
      </footer>
    </div>
  );
};
