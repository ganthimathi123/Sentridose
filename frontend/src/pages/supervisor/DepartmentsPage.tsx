import React, { useState, useEffect } from 'react';
import { supervisorService } from '../../services/api';
import { Department, EnrichedScan } from '../../types/supervisor';
import { Building2, Plus, Users, Activity, AlertTriangle, ChevronRight, X, AlertCircle } from 'lucide-react';

export const DepartmentsPage: React.FC = () => {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [selectedDeptId, setSelectedDeptId] = useState<number | null>(null);
  const [selectedDept, setSelectedDept] = useState<Department | null>(null);
  const [deptScans, setDeptScans] = useState<EnrichedScan[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [loading, setLoading] = useState(true);

  // Form State
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState('ACTIVE');
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchDepartments = async () => {
    try {
      const list = await supervisorService.getDepartments();
      setDepartments(list);
    } catch (err) {
      console.error('Failed to load departments:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDepartments();
  }, []);

  const handleSelectDepartment = async (dept: Department) => {
    setSelectedDeptId(dept.id);
    setSelectedDept(dept);
    try {
      const scans = await supervisorService.getAllScans({ department_id: dept.id, limit: 20 });
      setDeptScans(scans);
    } catch (err) {
      console.error('Failed to load department scans:', err);
    }
  };

  const handleCreateDepartment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setFormError('PLEASE ENTER DEPARTMENT NAME');
      return;
    }

    setIsSubmitting(true);
    setFormError(null);

    try {
      await supervisorService.createDepartment({
        name: name.trim(),
        description: description.trim(),
        status,
      });
      setShowAddModal(false);
      setName('');
      setDescription('');
      fetchDepartments();
    } catch (err: any) {
      console.error('Create department error:', err);
      setFormError(err.response?.data?.detail || 'Failed to create department');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white tracking-wide">DEPARTMENT OVERVIEW</h1>
          <p className="text-xs text-slate-400">
            Define organizational divisions, track active workforce distribution, and monitor department dosage levels.
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="px-4 py-2.5 bg-teal-500 hover:bg-teal-400 text-slate-950 font-black rounded-xl text-xs shadow-lg transition flex items-center space-x-2 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>+ ADD DEPARTMENT</span>
        </button>
      </div>

      {/* Main Grid: Cards & Details Drawer */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Department Cards Grid (2 Cols) */}
        <div className="lg:col-span-2 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {departments.map((dept) => {
              const isSelected = selectedDeptId === dept.id;
              return (
                <div
                  key={dept.id}
                  onClick={() => handleSelectDepartment(dept)}
                  className={`bg-slate-900 border rounded-3xl p-5 shadow-xl transition cursor-pointer space-y-4 relative overflow-hidden ${
                    isSelected ? 'border-teal-500 bg-slate-900/90 ring-1 ring-teal-500/50' : 'border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center text-teal-400">
                        <Building2 className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="text-base font-black text-white">{dept.name}</h3>
                        <span className="text-[10px] font-mono font-bold text-slate-500 uppercase">
                          STATUS: {dept.status}
                        </span>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-500" />
                  </div>

                  <p className="text-xs text-slate-400 line-clamp-2">{dept.description || 'No description provided.'}</p>

                  {/* Department Summary Metrics */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 text-center text-xs">
                    <div className="p-2 bg-slate-950 rounded-xl border border-slate-800">
                      <span className="text-[9px] font-mono text-slate-500 block uppercase">EMPLOYEES</span>
                      <span className="font-bold text-white">{dept.employee_count}</span>
                    </div>
                    <div className="p-2 bg-slate-950 rounded-xl border border-slate-800">
                      <span className="text-[9px] font-mono text-slate-500 block uppercase">ACTIVE</span>
                      <span className="font-bold text-teal-400">{dept.active_worker_count}</span>
                    </div>
                    <div className="p-2 bg-slate-950 rounded-xl border border-slate-800">
                      <span className="text-[9px] font-mono text-slate-500 block uppercase">TODAY SCANS</span>
                      <span className="font-bold text-white">{dept.today_scan_count}</span>
                    </div>
                    <div className={`p-2 rounded-xl border ${
                      (dept.attention_count || 0) > 0 ? 'bg-rose-950/60 border-rose-500/40 text-rose-300' : 'bg-slate-950 border-slate-800 text-slate-400'
                    }`}>
                      <span className="text-[9px] font-mono block uppercase">ATTENTION</span>
                      <span className="font-bold">{dept.attention_count}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Selected Department Details View */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl space-y-4">
          {!selectedDept ? (
            <div className="p-12 text-center text-slate-500 space-y-3">
              <Building2 className="w-10 h-10 mx-auto text-slate-600" />
              <p className="text-xs font-bold text-slate-400">SELECT A DEPARTMENT</p>
              <p className="text-[11px]">Click any department card to view active workers, dosage breakdown, and recent scans.</p>
            </div>
          ) : (
            <div className="space-y-5">
              <div className="border-b border-slate-800 pb-3">
                <span className="text-[10px] font-mono text-teal-400 uppercase font-bold tracking-widest block">
                  DEPARTMENT DETAILS
                </span>
                <h2 className="text-xl font-black text-white">{selectedDept.name}</h2>
                <p className="text-xs text-slate-400 pt-1">{selectedDept.description}</p>
              </div>

              {/* Stat Counters */}
              <div className="grid grid-cols-3 gap-2 text-center text-xs font-bold font-mono">
                <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800">
                  <span className="text-[9px] text-slate-500 block">TOTAL WORKERS</span>
                  <span className="text-lg text-white">{selectedDept.employee_count}</span>
                </div>
                <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800">
                  <span className="text-[9px] text-slate-500 block">TODAY SCANS</span>
                  <span className="text-lg text-teal-400">{selectedDept.today_scan_count}</span>
                </div>
                <div className="p-3 bg-rose-950/40 border border-rose-500/30 rounded-2xl">
                  <span className="text-[9px] text-rose-400 block">ATTENTION</span>
                  <span className="text-lg text-rose-300">{selectedDept.attention_count}</span>
                </div>
              </div>

              {/* Department Scans Table */}
              <div className="space-y-2">
                <span className="text-[10px] font-mono text-slate-400 font-bold uppercase tracking-wider block">
                  DEPARTMENT SCANS ({deptScans.length})
                </span>
                <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                  {deptScans.length === 0 ? (
                    <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 text-center text-xs text-slate-500">
                      No scans logged for this department yet.
                    </div>
                  ) : (
                    deptScans.map((scan) => (
                      <div key={scan.id} className="p-3 bg-slate-950 rounded-xl border border-slate-800/80 flex items-center justify-between text-xs">
                        <div>
                          <span className="font-bold text-white block">{scan.worker_name} ({scan.worker_code})</span>
                          <span className="text-[10px] font-mono text-slate-500">
                            {scan.zone_name || 'Zone A'} • {scan.timestamp ? new Date(scan.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                          </span>
                        </div>
                        <span className={`px-2 py-0.5 rounded-md font-mono font-bold text-[10px] ${
                          ['MEDIUM', 'HIGH'].includes(scan.exposure_class) ? 'bg-rose-950 text-rose-300 border border-rose-500/40' : 'bg-emerald-950 text-emerald-300 border border-emerald-500/40'
                        }`}>
                          {scan.exposure_class}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal: + ADD DEPARTMENT */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 max-w-md w-full space-y-6 shadow-2xl relative">
            <button
              onClick={() => setShowAddModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-2 rounded-xl bg-slate-800"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="space-y-1">
              <h2 className="text-xl font-black text-white">ADD NEW DEPARTMENT</h2>
              <p className="text-xs text-slate-400">
                Create a custom department division for workforce grouping.
              </p>
            </div>

            {formError && (
              <div className="p-3 bg-rose-950/80 border border-rose-500/50 rounded-xl text-rose-200 text-xs font-bold flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleCreateDepartment} className="space-y-4 text-xs font-medium">
              <div className="space-y-1">
                <label className="text-[10px] font-mono text-slate-400 font-bold uppercase">Department Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Chemical Processing"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white outline-none focus:border-teal-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-mono text-slate-400 font-bold uppercase">Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Brief description of operations in this department..."
                  rows={3}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white outline-none focus:border-teal-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-mono text-slate-400 font-bold uppercase">Status</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white outline-none focus:border-teal-500 font-mono font-bold"
                >
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="INACTIVE">INACTIVE</option>
                </select>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-teal-500 hover:bg-teal-400 text-slate-950 font-black py-3.5 px-6 rounded-xl shadow-lg transition text-xs flex items-center justify-center space-x-2 disabled:opacity-50"
              >
                <span>SAVE DEPARTMENT</span>
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
