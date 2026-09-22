import React, { useState, useEffect } from 'react';
import { supervisorService } from '../../services/api';
import { WorkerAssignment, WorkerSummary, Department, WorkZone, Shift } from '../../types/supervisor';
import { UserCheck, Plus, X, AlertCircle } from 'lucide-react';

export const AssignmentsPage: React.FC = () => {
  const [assignments, setAssignments] = useState<WorkerAssignment[]>([]);
  const [workers, setWorkers] = useState<WorkerSummary[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [zones, setZones] = useState<WorkZone[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [loading, setLoading] = useState(true);

  // Form State
  const [formData, setFormData] = useState({
    worker_id: 1,
    department_id: 1,
    zone_id: 1,
    shift_id: 1,
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchAssignmentData = async () => {
    try {
      const [aList, wList, dList, zList, sList] = await Promise.all([
        supervisorService.getAssignments('ACTIVE'),
        supervisorService.getWorkers('ACTIVE'),
        supervisorService.getDepartments(),
        supervisorService.getZones(),
        supervisorService.getShifts(),
      ]);
      setAssignments(aList);
      setWorkers(wList);
      setDepartments(dList);
      setZones(zList);
      setShifts(sList);

      if (wList.length > 0 && dList.length > 0 && zList.length > 0 && sList.length > 0) {
        setFormData({
          worker_id: wList[0].id,
          department_id: dList[0].id,
          zone_id: zList[0].id,
          shift_id: sList[0].id,
        });
      }
    } catch (err) {
      console.error('Failed to load assignment data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAssignmentData();
  }, []);

  const handleCreateAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setFormError(null);

    try {
      await supervisorService.createAssignment({
        worker_id: Number(formData.worker_id),
        department_id: Number(formData.department_id),
        zone_id: Number(formData.zone_id),
        shift_id: Number(formData.shift_id),
      });
      setShowAddModal(false);
      fetchAssignmentData();
    } catch (err: any) {
      console.error('Create assignment error:', err);
      setFormError(err.response?.data?.detail || 'Failed to save worker assignment');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filter available zones by selected department
  const filteredZones = zones.filter((z) => z.department_id === Number(formData.department_id));

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white tracking-wide">WORKER ASSIGNMENTS</h1>
          <p className="text-xs text-slate-400">
            Bind employees to Department + Work Zone + Shift. Future scans automatically retrieve active assignments.
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="px-4 py-2.5 bg-teal-500 hover:bg-teal-400 text-slate-950 font-black rounded-xl text-xs shadow-lg transition flex items-center space-x-2 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>+ ASSIGN WORKER</span>
        </button>
      </div>

      {/* Assignments Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-black text-white">ACTIVE ASSIGNMENTS</h2>
          <span className="text-xs font-mono text-slate-400 bg-slate-950 px-3 py-1 rounded-xl border border-slate-800">
            {assignments.length} Active Assignments
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-medium">
            <thead>
              <tr className="border-b border-slate-800 text-[10px] font-mono text-slate-400 uppercase tracking-wider">
                <th className="py-3 px-3">Employee</th>
                <th className="py-3 px-3">Worker Code</th>
                <th className="py-3 px-3">Department</th>
                <th className="py-3 px-3">Work Zone</th>
                <th className="py-3 px-3">Shift</th>
                <th className="py-3 px-3">Assigned Date</th>
                <th className="py-3 px-3 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-200">
              {assignments.map((assign) => (
                <tr key={assign.id} className="hover:bg-slate-800/40 transition">
                  <td className="py-3.5 px-3 font-bold text-white">{assign.worker_name}</td>
                  <td className="py-3.5 px-3 font-mono text-teal-400 font-bold">{assign.worker_code}</td>
                  <td className="py-3.5 px-3 text-slate-300">{assign.department_name}</td>
                  <td className="py-3.5 px-3 text-slate-300 font-bold">{assign.zone_name}</td>
                  <td className="py-3.5 px-3 text-slate-400 font-mono text-[11px]">{assign.shift_name}</td>
                  <td className="py-3.5 px-3 font-mono text-slate-500 text-[11px]">
                    {assign.start_date ? new Date(assign.start_date).toLocaleDateString() : '—'}
                  </td>
                  <td className="py-3.5 px-3 text-center">
                    <span className="px-2.5 py-1 bg-emerald-950 text-emerald-300 border border-emerald-500/30 rounded-full text-[10px] font-mono font-bold">
                      {assign.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: + ASSIGN WORKER */}
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
              <h2 className="text-xl font-black text-white">ASSIGN WORKER</h2>
              <p className="text-xs text-slate-400">
                Select Employee + Department + Zone + Shift configuration.
              </p>
            </div>

            {formError && (
              <div className="p-3 bg-rose-950/80 border border-rose-500/50 rounded-xl text-rose-200 text-xs font-bold flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleCreateAssignment} className="space-y-4 text-xs font-medium">
              {/* Select Employee */}
              <div className="space-y-1">
                <label className="text-[10px] font-mono text-slate-400 font-bold uppercase">Select Employee</label>
                <select
                  value={formData.worker_id}
                  onChange={(e) => setFormData({ ...formData, worker_id: Number(e.target.value) })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white outline-none focus:border-teal-500 font-bold"
                >
                  {workers.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name} ({w.worker_code})
                    </option>
                  ))}
                </select>
              </div>

              {/* Select Department */}
              <div className="space-y-1">
                <label className="text-[10px] font-mono text-slate-400 font-bold uppercase">Select Department</label>
                <select
                  value={formData.department_id}
                  onChange={(e) => {
                    const deptId = Number(e.target.value);
                    const matchingZones = zones.filter((z) => z.department_id === deptId);
                    setFormData({
                      ...formData,
                      department_id: deptId,
                      zone_id: matchingZones[0]?.id || zones[0]?.id || 1,
                    });
                  }}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white outline-none focus:border-teal-500"
                >
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Select Work Zone */}
              <div className="space-y-1">
                <label className="text-[10px] font-mono text-slate-400 font-bold uppercase">Select Work Zone</label>
                <select
                  value={formData.zone_id}
                  onChange={(e) => setFormData({ ...formData, zone_id: Number(e.target.value) })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white outline-none focus:border-teal-500"
                >
                  {(filteredZones.length > 0 ? filteredZones : zones).map((z) => (
                    <option key={z.id} value={z.id}>
                      {z.name} ({z.zone_code})
                    </option>
                  ))}
                </select>
              </div>

              {/* Select Shift */}
              <div className="space-y-1">
                <label className="text-[10px] font-mono text-slate-400 font-bold uppercase">Select Shift</label>
                <select
                  value={formData.shift_id}
                  onChange={(e) => setFormData({ ...formData, shift_id: Number(e.target.value) })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white outline-none focus:border-teal-500 font-mono"
                >
                  {shifts.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.start_time} – {s.end_time})
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-teal-500 hover:bg-teal-400 text-slate-950 font-black py-3.5 px-6 rounded-xl shadow-lg transition text-xs flex items-center justify-center space-x-2 disabled:opacity-50"
              >
                <span>SAVE ASSIGNMENT</span>
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
