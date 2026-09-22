import React, { useState, useEffect } from 'react';
import { supervisorService } from '../../services/api';
import { Shift } from '../../types/supervisor';
import { Clock, Plus, Users, Activity, AlertTriangle, X, AlertCircle } from 'lucide-react';

export const ShiftsPage: React.FC = () => {
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [loading, setLoading] = useState(true);

  // Form State
  const [name, setName] = useState('');
  const [startTime, setStartTime] = useState('06:00 AM');
  const [endTime, setEndTime] = useState('02:00 PM');
  const [status, setStatus] = useState('ACTIVE');
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchShifts = async () => {
    try {
      const list = await supervisorService.getShifts();
      setShifts(list);
    } catch (err) {
      console.error('Failed to load shifts:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchShifts();
  }, []);

  const handleCreateShift = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !startTime.trim() || !endTime.trim()) {
      setFormError('PLEASE FILL ALL SHIFT FIELDS');
      return;
    }

    setIsSubmitting(true);
    setFormError(null);

    try {
      await supervisorService.createShift({
        name: name.trim(),
        start_time: startTime.trim(),
        end_time: endTime.trim(),
        status,
      });
      setShowAddModal(false);
      setName('');
      fetchShifts();
    } catch (err: any) {
      console.error('Create shift error:', err);
      setFormError(err.response?.data?.detail || 'Failed to create shift');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white tracking-wide">SHIFT MANAGEMENT</h1>
          <p className="text-xs text-slate-400">
            Define work shift schedules, start/end hours, and monitor shift dosage exposure.
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="px-4 py-2.5 bg-teal-500 hover:bg-teal-400 text-slate-950 font-black rounded-xl text-xs shadow-lg transition flex items-center space-x-2 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>+ ADD SHIFT</span>
        </button>
      </div>

      {/* Shifts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {shifts.map((shift) => {
          const hasAttention = (shift.attention_count || 0) > 0;
          return (
            <div
              key={shift.id}
              className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-5 relative overflow-hidden"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center text-teal-400">
                    <Clock className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-white">{shift.name}</h3>
                    <span className="text-[10px] font-mono font-bold text-teal-400 uppercase">
                      STATUS: {shift.status}
                    </span>
                  </div>
                </div>
              </div>

              {/* Time Range Badge */}
              <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800 text-center font-mono text-xs font-extrabold text-slate-200">
                {shift.start_time} – {shift.end_time}
              </div>

              {/* Shift Metrics */}
              <div className="grid grid-cols-3 gap-2 text-center text-xs font-mono font-bold">
                <div className="p-2.5 bg-slate-950 rounded-xl border border-slate-800">
                  <span className="text-[9px] text-slate-500 block uppercase">WORKERS</span>
                  <span className="text-white text-sm">{shift.active_worker_count}</span>
                </div>
                <div className="p-2.5 bg-slate-950 rounded-xl border border-slate-800">
                  <span className="text-[9px] text-slate-500 block uppercase">SCANS</span>
                  <span className="text-teal-400 text-sm">{shift.today_scan_count}</span>
                </div>
                <div className={`p-2.5 rounded-xl border ${
                  hasAttention ? 'bg-rose-950/60 border-rose-500/40 text-rose-300' : 'bg-slate-950 border-slate-800 text-slate-400'
                }`}>
                  <span className="text-[9px] block uppercase">ATTENTION</span>
                  <span className="text-sm">{shift.attention_count}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal: + ADD SHIFT */}
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
              <h2 className="text-xl font-black text-white">ADD NEW SHIFT</h2>
              <p className="text-xs text-slate-400">
                Define a custom work shift schedule.
              </p>
            </div>

            {formError && (
              <div className="p-3 bg-rose-950/80 border border-rose-500/50 rounded-xl text-rose-200 text-xs font-bold flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleCreateShift} className="space-y-4 text-xs font-medium">
              <div className="space-y-1">
                <label className="text-[10px] font-mono text-slate-400 font-bold uppercase">Shift Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Evening Shift"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white outline-none focus:border-teal-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-mono text-slate-400 font-bold uppercase">Start Time</label>
                  <input
                    type="text"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    placeholder="e.g. 06:00 AM"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white font-mono outline-none focus:border-teal-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-mono text-slate-400 font-bold uppercase">End Time</label>
                  <input
                    type="text"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    placeholder="e.g. 02:00 PM"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white font-mono outline-none focus:border-teal-500"
                  />
                </div>
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
                <span>SAVE SHIFT</span>
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
