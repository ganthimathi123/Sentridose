import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supervisorService } from '../../services/api';
import { WorkerSummary, WorkerDetail, Department, WorkZone, Shift } from '../../types/supervisor';
import { UserPlus, Users, Search, ChevronRight, X, AlertCircle, Copy, Check, Eye } from 'lucide-react';

export const EmployeesPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const [workers, setWorkers] = useState<WorkerSummary[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [zones, setZones] = useState<WorkZone[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [selectedWorkerId, setSelectedWorkerId] = useState<number | null>(null);
  const [workerDetail, setWorkerDetail] = useState<WorkerDetail | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  useEffect(() => {
    if (searchParams.get('action') === 'register') {
      setShowAddModal(true);
    }
  }, [searchParams]);

  // Form State for WORKER REGISTRATION
  const [formData, setFormData] = useState({
    name: '',
    worker_code: '',
    department_id: 1,
    zone_id: 1,
    shift_id: 1,
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchWorkersAndMetadata = async () => {
    try {
      const [wList, dList, zList, sList] = await Promise.all([
        supervisorService.getWorkers(),
        supervisorService.getDepartments(),
        supervisorService.getZones(),
        supervisorService.getShifts(),
      ]);
      setWorkers(wList);
      setDepartments(dList);
      setZones(zList);
      setShifts(sList);

      setFormData((prev) => ({
        ...prev,
        department_id: dList[0]?.id || 1,
        zone_id: zList[0]?.id || 1,
        shift_id: sList[0]?.id || 1,
      }));
    } catch (err) {
      console.error('Failed to load workers:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWorkersAndMetadata();
  }, []);

  const handleSelectWorker = async (id: number) => {
    setSelectedWorkerId(id);
    try {
      const detail = await supervisorService.getWorkerById(id);
      setWorkerDetail(detail);
    } catch (err) {
      console.error('Failed to load worker detail:', err);
    }
  };

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const handleCreateWorker = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.worker_code.trim()) {
      setFormError('PLEASE ENTER WORKER NAME AND WORKER CODE');
      return;
    }

    setIsSubmitting(true);
    setFormError(null);

    try {
      await supervisorService.createWorker({
        name: formData.name.trim(),
        worker_code: formData.worker_code.trim().toUpperCase(),
        department_id: Number(formData.department_id),
        zone_id: Number(formData.zone_id),
        shift_id: Number(formData.shift_id),
        status: 'ACTIVE',
      });
      setShowAddModal(false);
      setFormData({
        name: '',
        worker_code: '',
        department_id: departments[0]?.id || 1,
        zone_id: zones[0]?.id || 1,
        shift_id: shifts[0]?.id || 1,
      });
      fetchWorkersAndMetadata();
    } catch (err: any) {
      console.error('Create worker error:', err);
      if (err.response?.data?.detail) {
        setFormError(err.response.data.detail);
      } else {
        setFormError('Failed to register worker. Ensure Worker Code is unique.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredWorkers = workers.filter((w) =>
    w.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    w.worker_code.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (w.department_name || w.department || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white tracking-wide">WORKER REGISTRATION & MANAGEMENT</h1>
          <p className="text-xs text-slate-400">
            Register worker identities, assign unique Worker Codes, departments, zones, and monitor exposure.
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="px-4 py-2.5 bg-teal-500 hover:bg-teal-400 text-slate-950 font-black rounded-xl text-xs shadow-lg transition flex items-center space-x-2 self-start sm:self-auto"
        >
          <UserPlus className="w-4 h-4" />
          <span>+ REGISTER WORKER</span>
        </button>
      </div>

      {/* Main Grid: List & Detail Drawer */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Workers List Table */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div className="relative flex-1">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by name, worker code, or department..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 pl-9 text-xs text-white placeholder:text-slate-500 outline-none focus:border-teal-500"
              />
              <Search className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
            </div>
            <span className="text-xs font-mono text-slate-400 bg-slate-950 px-3 py-2 rounded-xl border border-slate-800">
              {filteredWorkers.length} Employees
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-[10px] font-mono text-slate-400 uppercase tracking-wider">
                  <th className="py-3 px-3">Worker Name</th>
                  <th className="py-3 px-3">Worker Code</th>
                  <th className="py-3 px-3">Department</th>
                  <th className="py-3 px-3">Zone</th>
                  <th className="py-3 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-200">
                {filteredWorkers.map((w) => (
                  <tr
                    key={w.id}
                    onClick={() => handleSelectWorker(w.id)}
                    className={`hover:bg-slate-800/40 transition cursor-pointer ${
                      selectedWorkerId === w.id ? 'bg-teal-500/10 border-l-2 border-teal-500' : ''
                    }`}
                  >
                    <td className="py-3 px-3 font-bold text-white">{w.name}</td>
                    <td className="py-3 px-3 font-mono text-teal-400 font-bold">
                      <div className="flex items-center space-x-1">
                        <span>{w.worker_code}</span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCopyCode(w.worker_code);
                          }}
                          title="Copy Worker Code"
                          className="p-1 hover:text-white text-slate-500 transition"
                        >
                          {copiedCode === w.worker_code ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                        </button>
                      </div>
                    </td>
                    <td className="py-3 px-3 text-slate-300">{w.department_name || w.department}</td>
                    <td className="py-3 px-3 text-slate-300">{w.zone_name || 'Zone A'}</td>
                    <td className="py-3 px-3 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSelectWorker(w.id);
                        }}
                        className="p-1 bg-slate-800 hover:bg-teal-500 hover:text-slate-950 text-slate-300 rounded-lg transition"
                        title="View Details"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Selected Employee Details & Exposure History Drawer */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl space-y-4">
          {!workerDetail ? (
            <div className="p-12 text-center text-slate-500 space-y-3">
              <Users className="w-10 h-10 mx-auto text-slate-600" />
              <p className="text-xs font-bold text-slate-400">SELECT AN EMPLOYEE</p>
              <p className="text-[11px]">Click any employee row to inspect active assignments and isolated exposure history.</p>
            </div>
          ) : (
            <div className="space-y-5">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div>
                  <span className="text-[10px] font-mono text-teal-400 uppercase font-bold tracking-widest block">
                    EMPLOYEE DETAILS
                  </span>
                  <h2 className="text-xl font-black text-white">{workerDetail.name}</h2>
                </div>
                <div className="flex items-center space-x-1.5 bg-teal-500/10 text-teal-300 px-3 py-1 rounded-xl border border-teal-500/30">
                  <span className="text-xs font-mono font-bold">{workerDetail.worker_code}</span>
                  <button
                    onClick={() => handleCopyCode(workerDetail.worker_code)}
                    className="hover:text-white transition"
                    title="Copy Code"
                  >
                    {copiedCode === workerDetail.worker_code ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  </button>
                </div>
              </div>

              {/* Current Assignment Details */}
              <div className="space-y-2 bg-slate-950 p-4 rounded-2xl border border-slate-800">
                <span className="text-[10px] font-mono text-slate-400 font-bold uppercase tracking-wider block">
                  CURRENT ASSIGNMENT
                </span>
                <div className="grid grid-cols-2 gap-2 text-center text-xs">
                  <div className="p-2 bg-slate-900 rounded-xl border border-slate-800">
                    <span className="text-[9px] font-mono text-slate-500 block">DEPARTMENT</span>
                    <span className="font-bold text-slate-200">{workerDetail.department_name || 'Production'}</span>
                  </div>
                  <div className="p-2 bg-slate-900 rounded-xl border border-slate-800">
                    <span className="text-[9px] font-mono text-slate-500 block">ZONE</span>
                    <span className="font-bold text-slate-200">{workerDetail.zone_name || 'Zone A'}</span>
                  </div>
                </div>
              </div>

              {/* Latest Exposure Summary */}
              <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 space-y-2">
                <span className="text-[10px] font-mono text-slate-400 font-bold uppercase tracking-wider block">
                  LATEST EXPOSURE READING
                </span>
                <div className="flex items-center justify-between">
                  <span className={`text-lg font-black uppercase tracking-wide ${
                    ['MEDIUM', 'HIGH'].includes(workerDetail.latest_exposure || '') ? 'text-rose-400' : 'text-emerald-400'
                  }`}>
                    {workerDetail.latest_exposure || 'NONE'}
                  </span>
                  <span className="text-xs font-mono text-slate-400">
                    {workerDetail.last_scan_time ? new Date(workerDetail.last_scan_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'No Scans'}
                  </span>
                </div>
              </div>

              {/* Exposure History Table */}
              <div className="space-y-2">
                <span className="text-[10px] font-mono text-slate-400 font-bold uppercase tracking-wider block">
                  EXPOSURE HISTORY ({workerDetail.exposure_history.length})
                </span>
                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  {workerDetail.exposure_history.length === 0 ? (
                    <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 text-center text-xs text-slate-500">
                      No exposure scans recorded yet.
                    </div>
                  ) : (
                    workerDetail.exposure_history.map((scan) => (
                      <div key={scan.id} className="p-3 bg-slate-950 rounded-xl border border-slate-800/80 flex items-center justify-between text-xs">
                        <div>
                          <span className={`font-mono font-bold text-xs ${
                            ['MEDIUM', 'HIGH'].includes(scan.exposure_class) ? 'text-rose-400' : 'text-emerald-400'
                          }`}>
                            {scan.exposure_class}
                          </span>
                          <span className="text-[10px] font-mono text-slate-500 block">
                            {scan.department_name || 'Production'} • {scan.zone_name || 'Zone A'}
                          </span>
                          <span className="text-[10px] font-mono text-slate-600 block">
                            {scan.timestamp ? new Date(scan.timestamp).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : ''}
                          </span>
                        </div>
                        <span className="text-[11px] font-mono text-slate-400">{scan.confidence}% Conf</span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal: + CREATE WORKER */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 max-w-md w-full space-y-5 shadow-2xl relative">
            <button
              onClick={() => setShowAddModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-2 rounded-xl bg-slate-800"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="space-y-1">
              <h2 className="text-xl font-black text-white">WORKER REGISTRATION</h2>
              <p className="text-xs text-slate-400">
                Supervisor registers worker with unique Worker Code, department, zone, and shift.
              </p>
            </div>

            {formError && (
              <div className="p-3 bg-rose-950/80 border border-rose-500/50 rounded-xl text-rose-200 text-xs font-bold flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleCreateWorker} className="space-y-3.5 text-xs font-medium">
              <div className="space-y-1">
                <label className="text-[10px] font-mono text-slate-400 font-bold uppercase">Worker Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Arun Kumar"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-white outline-none focus:border-teal-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-mono text-slate-400 font-bold uppercase">Worker Code (MANUAL ENTRY — MUST BE UNIQUE)</label>
                <input
                  type="text"
                  value={formData.worker_code}
                  onChange={(e) => setFormData({ ...formData, worker_code: e.target.value })}
                  placeholder="e.g. WRK-A001"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-teal-400 font-mono font-bold outline-none focus:border-teal-500 uppercase"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-[9px] font-mono text-slate-400 font-bold uppercase">Department</label>
                  <select
                    value={formData.department_id}
                    onChange={(e) => setFormData({ ...formData, department_id: Number(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2 py-2.5 text-white text-[11px] outline-none focus:border-teal-500"
                  >
                    {departments.map((d) => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] font-mono text-slate-400 font-bold uppercase">Work Zone</label>
                  <select
                    value={formData.zone_id}
                    onChange={(e) => setFormData({ ...formData, zone_id: Number(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2 py-2.5 text-white text-[11px] outline-none focus:border-teal-500"
                  >
                    {zones.map((z) => (
                      <option key={z.id} value={z.id}>{z.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-teal-500 hover:bg-teal-400 text-slate-950 font-black py-3.5 px-6 rounded-xl shadow-lg transition text-xs flex items-center justify-center space-x-2 disabled:opacity-50 mt-2"
              >
                <span>[ REGISTER WORKER ]</span>
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
