import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ScanResult } from '../../types/auth';
import { Check, AlertTriangle, RefreshCw, ArrowLeft, Shield } from 'lucide-react';

export const WorkerResultPage: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const result: ScanResult | undefined = location.state?.result;

  if (!result) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 text-center">
        <div className="bg-white border border-slate-200 rounded-3xl p-8 max-w-sm w-full space-y-4 shadow-xl">
          <p className="text-sm font-semibold text-slate-600">No scan result available.</p>
          <button
            onClick={() => navigate('/worker/scan')}
            className="w-full bg-slate-900 text-white font-bold py-3 rounded-xl text-xs"
          >
            GO TO SCANNER
          </button>
        </div>
      </div>
    );
  }

  const isSafe = result.exposure_class === 'BASE' || result.exposure_class === 'LOW';

  const getClassBadgeStyle = (exp: string) => {
    switch (exp) {
      case 'HIGH':
        return 'bg-red-50 text-red-950 border-red-300';
      case 'MEDIUM':
        return 'bg-amber-50 text-amber-950 border-amber-300';
      case 'LOW':
        return 'bg-emerald-50 text-emerald-950 border-emerald-300';
      default:
        return 'bg-emerald-50 text-emerald-950 border-emerald-300';
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans p-4 sm:p-6 flex flex-col justify-between">
      <div className="max-w-md mx-auto w-full space-y-6">
        {/* Navigation Link */}
        <div>
          <button
            onClick={() => navigate('/worker/dashboard')}
            className="inline-flex items-center space-x-2 text-xs font-bold text-slate-600 hover:text-slate-900 transition"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>BACK TO DASHBOARD</span>
          </button>
        </div>

        {/* Main Result Card */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
          <div className="text-center space-y-1">
            <div className="text-[11px] font-mono font-bold uppercase tracking-widest text-slate-400">
              ANALYSIS RESULT
            </div>
            <h1 className="text-xl font-black text-slate-900">SENTRIDOSE QUANTIFICATION</h1>
          </div>

          {/* Top Status Banner: GREEN for BASE/LOW, RED for MEDIUM/HIGH */}
          {isSafe ? (
            <div className="bg-emerald-600 text-white font-extrabold p-5 rounded-2xl shadow-xl border-2 border-emerald-400 flex flex-col items-center justify-center space-y-2 text-center">
              <div className="flex items-center justify-center space-x-2.5">
                <div className="p-1.5 bg-emerald-700 rounded-full flex-shrink-0">
                  <Check className="w-6 h-6 text-white" />
                </div>
                <span className="text-base sm:text-lg font-black tracking-wide uppercase">
                  ACCEPTABLE LOW EXPOSURE LEVEL — MATCH
                </span>
              </div>
              <div className="inline-flex items-center space-x-2 px-3 py-1 bg-emerald-800/80 rounded-xl text-xs font-mono font-bold tracking-wider text-emerald-100 uppercase border border-emerald-400/30">
                <span>STATUS: {result.message}</span>
                <span>•</span>
                <span>{result.confidence}% MATCH</span>
              </div>
            </div>
          ) : (
            <div className="bg-red-600 text-white font-extrabold p-5 rounded-2xl shadow-2xl border-2 border-red-400 flex flex-col items-center justify-center space-y-2 text-center animate-pulse">
              <div className="flex items-center justify-center space-x-2.5">
                <div className="p-1.5 bg-red-700 rounded-full flex-shrink-0 animate-bounce">
                  <AlertTriangle className="w-6 h-6 text-yellow-300" />
                </div>
                <span className="text-base sm:text-lg font-black tracking-wide uppercase text-yellow-200">
                  MOVE TO A SAFER PLACE IMMEDIATELY!
                </span>
              </div>
              <div className="inline-flex items-center space-x-2 px-3 py-1 bg-red-800/90 rounded-xl text-xs font-mono font-black tracking-wider text-white uppercase border border-red-400/50">
                <span>WARNING: {result.message}</span>
                <span>•</span>
                <span>EXPOSURE: {result.exposure_class}</span>
              </div>
            </div>
          )}

          {/* Exposure Classification */}
          <div className={`p-6 rounded-2xl border text-center space-y-2 ${getClassBadgeStyle(result.exposure_class)}`}>
            <div className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Exposure Classification
            </div>
            <div className="text-4xl font-black tracking-tight">
              {result.exposure_class}
            </div>
            <div className="text-xs font-mono font-bold pt-1 text-slate-700">
              Nearest shade: <span className="text-slate-900 font-black">{result.nearest_shade}</span>
            </div>
            <div className="text-xs font-mono text-slate-600">
              Color match: <span className="font-bold text-slate-900">{result.confidence}%</span>
            </div>
          </div>

          {/* Technical Color Analysis Parameters */}
          <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl space-y-3 text-xs font-mono">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider text-left">
              Color Readout & Delta E Comparison
            </div>

            <div className="grid grid-cols-2 gap-3 text-left">
              {/* Scanned Color */}
              <div className="bg-white border border-slate-200 p-3 rounded-xl space-y-1.5 shadow-sm">
                <div className="text-[10px] text-slate-400 font-sans font-bold uppercase">Scanned Color</div>
                <div className="flex items-center space-x-2">
                  <div
                    className="w-6 h-6 rounded-md border border-slate-300 shadow-sm flex-shrink-0"
                    style={{ backgroundColor: result.scanned_hex }}
                  />
                  <span className="font-bold text-slate-900 font-mono text-xs">{result.scanned_hex}</span>
                </div>
              </div>

              {/* Reference Color */}
              <div className="bg-white border border-slate-200 p-3 rounded-xl space-y-1.5 shadow-sm">
                <div className="text-[10px] text-slate-400 font-sans font-bold uppercase">Reference Color</div>
                <div className="flex items-center space-x-2">
                  <div
                    className="w-6 h-6 rounded-md border border-slate-300 shadow-sm flex-shrink-0"
                    style={{ backgroundColor: result.closest_hex || result.reference_hex }}
                  />
                  <span className="font-bold text-slate-900 font-mono text-xs">{result.closest_hex || result.reference_hex}</span>
                </div>
              </div>
            </div>

            <div className="flex justify-between items-center pt-1 px-1 border-t border-slate-200 text-[11px]">
              <span className="text-slate-500">CIELAB ΔE Metric: <strong className="text-slate-900">{result.delta_e}</strong></span>
              <span className="text-slate-500">Model: <strong className="text-slate-900">{result.model_used}</strong></span>
            </div>
          </div>

          {/* Mandatory Scientific Limitations Notice */}
          <div className="bg-amber-50 border border-amber-200 p-3.5 rounded-xl text-left space-y-1 text-amber-900">
            <div className="text-[10px] font-extrabold uppercase tracking-wider font-mono flex items-center space-x-1 text-amber-800">
              <Shield className="w-3.5 h-3.5" />
              <span>SCIENTIFIC NOTICE</span>
            </div>
            <p className="text-[11px] font-medium leading-relaxed text-amber-900">
              SIMULATED OPTICAL REFERENCE — NOT A GAS CONCENTRATION STANDARD.
            </p>
            <p className="text-[10px] italic text-amber-800/80">
              Prototype optical classification — not a certified occupational measurement.
            </p>
          </div>

          {/* Action Button */}
          <button
            onClick={() => navigate('/worker/scan')}
            className="w-full bg-slate-900 hover:bg-slate-800 text-white font-black py-4 px-6 rounded-xl shadow-xl transition text-sm flex items-center justify-center space-x-2"
          >
            <RefreshCw className="w-4 h-4" />
            <span>SCAN AGAIN</span>
          </button>
        </div>
      </div>

      <footer className="text-center text-[11px] font-mono text-slate-400 py-4 max-w-md mx-auto w-full">
        SENTRIDOSE — Passive Colorimetric System
      </footer>
    </div>
  );
};
