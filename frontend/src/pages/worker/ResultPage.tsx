import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ScanResult } from '../../types/auth';
import { Check, AlertTriangle, RefreshCw, ArrowLeft, Shield } from 'lucide-react';

export const ResultPage: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const result: ScanResult | undefined = location.state?.result;

  if (!result) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 text-center font-sans">
        <div className="bg-white border border-slate-200 rounded-3xl p-8 max-w-sm w-full space-y-4 shadow-xl">
          <p className="text-xs font-semibold text-slate-600">No scan result available.</p>
          <button
            onClick={() => navigate('/scan')}
            className="w-full bg-slate-900 text-white font-bold py-3 rounded-xl text-xs"
          >
            GO TO SCANNER
          </button>
        </div>
      </div>
    );
  }

  const isSafe = result.exposure_class === 'BASE' || result.exposure_class === 'LOW';

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans p-4 sm:p-6 flex flex-col justify-between">
      <div className="max-w-md mx-auto w-full space-y-5">
        {/* Navigation Header */}
        <div>
          <button
            onClick={() => navigate('/home')}
            className="inline-flex items-center space-x-2 text-xs font-bold text-slate-600 hover:text-slate-900 transition"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>BACK TO HOME</span>
          </button>
        </div>

        {/* Result Card */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
          <div className="text-center space-y-1">
            <div className="text-[11px] font-mono font-bold uppercase tracking-widest text-slate-400">
              ANALYSIS RESULT
            </div>
            <h1 className="text-4xl font-black tracking-tight text-slate-900">
              {result.exposure_class}
            </h1>
          </div>

          {/* Safety Status Banner (Section 18) */}
          {isSafe ? (
            <div className="bg-emerald-600 text-white font-extrabold p-4.5 rounded-2xl shadow-xl border-2 border-emerald-400 flex flex-col items-center justify-center space-y-2 text-center">
              <div className="flex items-center justify-center space-x-2">
                <div className="p-1.5 bg-emerald-700 rounded-full flex-shrink-0">
                  <Check className="w-5 h-5 text-white" />
                </div>
                <span className="text-xs sm:text-sm font-black tracking-wide uppercase">
                  ACCEPTABLE LOW EXPOSURE LEVEL — MATCH
                </span>
              </div>
            </div>
          ) : (
            <div className="bg-red-600 text-white font-extrabold p-4.5 rounded-2xl shadow-2xl border-2 border-red-400 flex flex-col items-center justify-center space-y-2 text-center animate-pulse">
              <div className="flex items-center justify-center space-x-2">
                <div className="p-1.5 bg-red-700 rounded-full flex-shrink-0">
                  <AlertTriangle className="w-5 h-5 text-yellow-300" />
                </div>
                <span className="text-xs sm:text-sm font-black tracking-wide uppercase text-yellow-200">
                  MOVE TO A SAFER PLACE IMMEDIATELY!
                </span>
              </div>
            </div>
          )}

          {/* Parameters List */}
          <div className="space-y-3 text-xs font-mono">
            {/* Nearest Shade */}
            <div className="flex justify-between items-center bg-slate-50 p-3 rounded-xl border border-slate-100">
              <span className="text-slate-400 uppercase font-sans font-bold">Nearest Shade</span>
              <span className="font-black text-slate-900 text-sm">{result.nearest_shade}</span>
            </div>

            {/* Color Match Confidence */}
            <div className="flex justify-between items-center bg-slate-50 p-3 rounded-xl border border-slate-100">
              <span className="text-slate-400 uppercase font-sans font-bold">Color Match</span>
              <span className="font-black text-slate-900 text-sm">{result.confidence}%</span>
            </div>

            {/* Color Swatch Comparison (Section 35) */}
            <div className="grid grid-cols-2 gap-3 pt-1">
              <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl space-y-1.5 text-center">
                <span className="text-[10px] text-slate-400 font-sans font-bold uppercase block">Scanned Color</span>
                <div
                  className="w-10 h-10 rounded-lg border border-slate-300 mx-auto shadow-sm"
                  style={{ backgroundColor: result.scanned_hex }}
                />
                <span className="font-bold text-slate-900 font-mono text-xs block">{result.scanned_hex}</span>
              </div>

              <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl space-y-1.5 text-center">
                <span className="text-[10px] text-slate-400 font-sans font-bold uppercase block">Reference Color</span>
                <div
                  className="w-10 h-10 rounded-lg border border-slate-300 mx-auto shadow-sm"
                  style={{ backgroundColor: result.closest_hex || result.reference_hex }}
                />
                <span className="font-bold text-slate-900 font-mono text-xs block">{result.closest_hex || result.reference_hex}</span>
              </div>
            </div>

            {/* Delta E & Model */}
            <div className="flex justify-between items-center pt-2 px-1 text-[11px] text-slate-500">
              <span>ΔE: <strong className="text-slate-900 font-bold">{result.delta_e}</strong></span>
              <span>Model: <strong className="text-slate-900 font-bold">{result.model_used || 'RandomForest'}</strong></span>
            </div>
          </div>

          {/* Scientific Notice (Section 19) */}
          <div className="bg-amber-50 border border-amber-200 p-3.5 rounded-xl text-left space-y-1 text-amber-900">
            <div className="text-[10px] font-extrabold uppercase tracking-wider font-mono flex items-center space-x-1 text-amber-800">
              <Shield className="w-3.5 h-3.5" />
              <span>SCIENTIFIC NOTICE</span>
            </div>
            <p className="text-[11px] font-medium leading-relaxed text-amber-900">
              SIMULATED OPTICAL REFERENCE — NOT A GAS CONCENTRATION STANDARD.
            </p>
            <p className="text-[10px] italic text-amber-800/80">
              Prototype estimates are not certified occupational measurements.
            </p>
          </div>

          {/* Action Button: SCAN AGAIN (Section 20) */}
          <button
            onClick={() => navigate('/scan')}
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
