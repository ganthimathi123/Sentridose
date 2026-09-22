import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supervisorService } from '../../services/api';
import { EnrichedScan, Department, WorkZone, Shift, WorkerSummary } from '../../types/supervisor';
import { Activity, Filter, Eye, X, AlertTriangle, ShieldCheck } from 'lucide-react';

export const ScansPage: React.FC = () => {
  const { scanId } = useParams<{ scanId?: string }>();
  const [scans, setScans] = useState<EnrichedScan[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [zones, setZones] = useState<WorkZone[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [workers, setWorkers] = useState<WorkerSummary[]>([]);

  // Filter States
  const [filterDepartment, setFilterDepartment] = useState<string>('');
  const [filterZone, setFilterZone] = useState<string>('');
  const [filterShift, setFilterShift] = useState<string>('');
  const [filterWorker, setFilterWorker] = useState<string>('');
  const [filterExposure, setFilterExposure] = useState<string>('');

  const [selectedScan, setSelectedScan] = useState<EnrichedScan | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchScansAndFilters = async () => {
    try {
      const [sList, dList, zList, shList, wList] = await Promise.all([
        supervisorService.getAllScans({
          department_id: filterDepartment ? Number(filterDepartment) : undefined,
          zone_id: filterZone ? Number(filterZone) : undefined,
          shift_id: filterShift ? Number(filterShift) : undefined,
          worker_id: filterWorker ? Number(filterWorker) : undefined,
          exposure_class: filterExposure || undefined,
          limit: 100,
        }),
        supervisorService.getDepartments(),
        supervisorService.getZones(),
        supervisorService.getShifts(),
        supervisorService.getWorkers(),
      ]);
      setScans(sList);
      setDepartments(dList);
      setZones(zList);
      setShifts(shList);
      setWorkers(wList);

      if (scanId) {
        const target = sList.find((s) => s.id === Number(scanId) || (s as any).scan_id === Number(scanId));
        if (target) {
          setSelectedScan(target);
        }
      }
    } catch (err) {
      console.error('Failed to load scans:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchScansAndFilters();
  }, [filterDepartment, filterZone, filterShift, filterWorker, filterExposure, scanId]);

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white tracking-wide">ALL WORKPLACE SCANS</h1>
          <p className="text-xs text-slate-400">
            Comprehensive audit log of all optical dosimeter readings captured across departments, zones, and shifts.
          </p>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-4 sm:p-5 shadow-xl space-y-3">
        <div className="flex items-center space-x-2 text-xs font-mono font-bold text-teal-400 uppercase tracking-wider">
          <Filter className="w-4 h-4" />
          <span>FILTER MONITORING LOGS</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs font-medium">
          {/* Department Filter */}
          <select
            value={filterDepartment}
            onChange={(e) => setFilterDepartment(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white outline-none focus:border-teal-500"
          >
            <option value="">All Departments</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>

          {/* Zone Filter */}
          <select
            value={filterZone}
            onChange={(e) => setFilterZone(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white outline-none focus:border-teal-500"
          >
            <option value="">All Zones</option>
            {zones.map((z) => (
              <option key={z.id} value={z.id}>
                {z.name} ({z.zone_code})
              </option>
            ))}
          </select>

          {/* Shift Filter */}
          <select
            value={filterShift}
            onChange={(e) => setFilterShift(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white outline-none focus:border-teal-500"
          >
            <option value="">All Shifts</option>
            {shifts.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>

          {/* Employee Filter */}
          <select
            value={filterWorker}
            onChange={(e) => setFilterWorker(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white outline-none focus:border-teal-500"
          >
            <option value="">All Employees</option>
            {workers.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name} ({w.worker_code})
              </option>
            ))}
          </select>

          {/* Exposure Filter */}
          <select
            value={filterExposure}
            onChange={(e) => setFilterExposure(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white outline-none focus:border-teal-500 font-mono font-bold"
          >
            <option value="">All Exposures</option>
            <option value="BASE">BASE</option>
            <option value="LOW">LOW</option>
            <option value="MEDIUM">MEDIUM</option>
            <option value="HIGH">HIGH</option>
          </select>
        </div>
      </div>

      {/* All Scans Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-black text-white">SCAN RECORDS ({scans.length})</h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-medium">
            <thead>
              <tr className="border-b border-slate-800 text-[10px] font-mono text-slate-400 uppercase tracking-wider">
                <th className="py-3 px-3">Date</th>
                <th className="py-3 px-3">Time</th>
                <th className="py-3 px-3">Employee</th>
                <th className="py-3 px-3">Worker Code</th>
                <th className="py-3 px-3">Department</th>
                <th className="py-3 px-3">Zone</th>
                <th className="py-3 px-3">Shift</th>
                <th className="py-3 px-3">Exposure</th>
                <th className="py-3 px-3 text-right">Confidence</th>
                <th className="py-3 px-3 text-center">Status</th>
                <th className="py-3 px-3 text-right">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-200">
              {scans.map((scan) => {
                const isAlert = ['MEDIUM', 'HIGH'].includes(scan.exposure_class);
                return (
                  <tr
                    key={scan.id}
                    onClick={() => setSelectedScan(scan)}
                    className="hover:bg-slate-800/40 transition cursor-pointer"
                  >
                    <td className="py-3.5 px-3 font-mono text-slate-400 text-[11px]">
                      {scan.timestamp ? new Date(scan.timestamp).toLocaleDateString([], { month: 'short', day: 'numeric' }) : '—'}
                    </td>
                    <td className="py-3.5 px-3 font-mono text-slate-400 text-[11px]">
                      {scan.timestamp ? new Date(scan.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}
                    </td>
                    <td className="py-3.5 px-3 font-bold text-white">{scan.worker_name || 'Worker'}</td>
                    <td className="py-3.5 px-3 font-mono text-teal-400 font-bold">{scan.worker_code || '—'}</td>
                    <td className="py-3.5 px-3 text-slate-300">{scan.department_name || 'Production'}</td>
                    <td className="py-3.5 px-3 text-slate-300 font-bold">{scan.zone_name || 'Zone A'}</td>
                    <td className="py-3.5 px-3 text-slate-400 font-mono text-[11px]">{scan.shift_name || 'Morning'}</td>
                    <td className="py-3.5 px-3">
                      <span className={`px-2 py-0.5 rounded-md font-mono font-bold text-[10px] ${
                        isAlert ? 'bg-rose-950 text-rose-300 border border-rose-500/40' : 'bg-emerald-950 text-emerald-300 border border-emerald-500/40'
                      }`}>
                        {scan.exposure_class}
                      </span>
                    </td>
                    <td className="py-3.5 px-3 text-right font-mono text-slate-300">{scan.confidence}%</td>
                    <td className="py-3.5 px-3 text-center">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                        isAlert ? 'bg-rose-600 text-white' : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                      }`}>
                        {scan.message || (isAlert ? 'ATTENTION' : 'MATCH')}
                      </span>
                    </td>
                    <td className="py-3.5 px-3 text-right text-slate-500 hover:text-white">
                      <Eye className="w-4 h-4 inline" />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: SCAN DETAILS */}
      {selectedScan && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 max-w-lg w-full space-y-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setSelectedScan(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-2 rounded-xl bg-slate-800"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="space-y-1">
              <span className="text-[10px] font-mono text-teal-400 uppercase font-bold tracking-widest block">
                SCAN DETAILS #{selectedScan.id}
              </span>
              <h2 className="text-xl font-black text-white">{selectedScan.worker_name} ({selectedScan.worker_code})</h2>
            </div>

            {/* Assignment Specs */}
            <div className="grid grid-cols-3 gap-2 text-center text-xs bg-slate-950 p-3 rounded-2xl border border-slate-800">
              <div>
                <span className="text-[9px] font-mono text-slate-500 block uppercase">DEPARTMENT</span>
                <span className="font-bold text-slate-200">{selectedScan.department_name || 'Production'}</span>
              </div>
              <div>
                <span className="text-[9px] font-mono text-slate-500 block uppercase">ZONE</span>
                <span className="font-bold text-slate-200">{selectedScan.zone_name || 'Zone A'}</span>
              </div>
              <div>
                <span className="text-[9px] font-mono text-slate-500 block uppercase">SHIFT</span>
                <span className="font-bold text-slate-200">{selectedScan.shift_name || 'Morning'}</span>
              </div>
            </div>

            {/* Exposure Status Banner */}
            <div className={`p-4 rounded-2xl border text-center space-y-1 ${
              ['MEDIUM', 'HIGH'].includes(selectedScan.exposure_class)
                ? 'bg-rose-950/80 border-rose-500/50 text-rose-200'
                : 'bg-emerald-950/80 border-emerald-500/50 text-emerald-200'
            }`}>
              <div className="flex items-center justify-center space-x-2">
                {['MEDIUM', 'HIGH'].includes(selectedScan.exposure_class) ? (
                  <AlertTriangle className="w-5 h-5 text-rose-400" />
                ) : (
                  <ShieldCheck className="w-5 h-5 text-emerald-400" />
                )}
                <span className="text-xs font-black uppercase tracking-wider">{selectedScan.message}</span>
              </div>
              <div className="text-2xl font-black">{selectedScan.exposure_class}</div>
              <p className="text-[11px] font-mono text-slate-300">Nearest Shade: {selectedScan.nearest_shade}</p>
            </div>

            {/* Color Swatch Comparison & Features */}
            <div className="space-y-3 bg-slate-950 p-4 rounded-2xl border border-slate-800">
              <span className="text-[10px] font-mono text-slate-400 font-bold uppercase tracking-wider block">
                COLORIMETRIC SWATCH COMPARISON
              </span>
              <div className="flex items-center justify-around">
                <div className="text-center space-y-1">
                  <div
                    className="w-16 h-16 rounded-2xl border-2 border-slate-700 shadow-md mx-auto"
                    style={{ backgroundColor: selectedScan.scanned_hex }}
                  ></div>
                  <span className="text-[10px] font-mono font-bold text-slate-300 block">SCANNED</span>
                  <span className="text-[10px] font-mono text-teal-400">{selectedScan.scanned_hex}</span>
                </div>
                <div className="text-center font-mono text-xs text-slate-500">
                  <span>ΔE = {selectedScan.delta_e}</span>
                </div>
                <div className="text-center space-y-1">
                  <div
                    className="w-16 h-16 rounded-2xl border-2 border-slate-700 shadow-md mx-auto"
                    style={{ backgroundColor: selectedScan.reference_hex || selectedScan.closest_hex }}
                  ></div>
                  <span className="text-[10px] font-mono font-bold text-slate-300 block">REFERENCE</span>
                  <span className="text-[10px] font-mono text-teal-400">{selectedScan.reference_hex || selectedScan.closest_hex}</span>
                </div>
              </div>
            </div>

            {/* ML Model Details */}
            <div className="space-y-2 text-xs font-mono">
              <div className="flex justify-between py-1.5 border-b border-slate-800 text-slate-400">
                <span>Confidence Score:</span>
                <span className="text-white font-bold">{selectedScan.confidence}%</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-800 text-slate-400">
                <span>ML Ensemble Confidence:</span>
                <span className="text-teal-400 font-bold">{selectedScan.ml_confidence}%</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-800 text-slate-400">
                <span>Model Engine:</span>
                <span className="text-slate-200">{selectedScan.model_used}</span>
              </div>
            </div>

            {/* Scientific Notice */}
            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-center text-[10px] font-mono text-slate-400">
              {selectedScan.scientific_notice}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
