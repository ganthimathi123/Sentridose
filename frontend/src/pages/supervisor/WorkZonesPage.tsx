import React, { useState, useEffect } from 'react';
import { supervisorService } from '../../services/api';
import { WorkZone, Department, EnrichedScan, WorkerAssignment } from '../../types/supervisor';
import { MapPin, Plus, AlertTriangle, ChevronRight, X, AlertCircle } from 'lucide-react';

export const WorkZonesPage: React.FC = () => {
  const [zones, setZones] = useState<WorkZone[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [selectedZoneId, setSelectedZoneId] = useState<number | null>(null);
  const [selectedZone, setSelectedZone] = useState<WorkZone | null>(null);
  const [zoneScans, setZoneScans] = useState<EnrichedScan[]>([]);
  const [zoneAssignments, setZoneAssignments] = useState<WorkerAssignment[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [loading, setLoading] = useState(true);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    zone_code: '',
    department_id: 1,
    description: '',
    status: 'ACTIVE',
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchZonesAndDepts = async () => {
    try {
      const [zList, dList] = await Promise.all([
        supervisorService.getZones(),
        supervisorService.getDepartments(),
      ]);
      setZones(zList);
      setDepartments(dList);
      if (dList.length > 0) {
        setFormData((prev) => ({ ...prev, department_id: dList[0].id }));
      }
    } catch (err) {
      console.error('Failed to load zones:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchZonesAndDepts();
  }, []);

  const handleSelectZone = async (zone: WorkZone) => {
    setSelectedZoneId(zone.id);
    setSelectedZone(zone);
    try {
      const [scans, assigns] = await Promise.all([
        supervisorService.getAllScans({ zone_id: zone.id, limit: 20 }),
        supervisorService.getAssignments('ACTIVE'),
      ]);
      setZoneScans(scans);
      setZoneAssignments(assigns.filter((a) => a.zone_id === zone.id));
    } catch (err) {
      console.error('Failed to load zone details:', err);
    }
  };

  const handleCreateZone = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.zone_code.trim()) {
      setFormError('PLEASE ENTER ZONE NAME AND ZONE CODE');
      return;
    }

    setIsSubmitting(true);
    setFormError(null);

    try {
      await supervisorService.createZone({
        name: formData.name.trim(),
        zone_code: formData.zone_code.trim().toUpperCase(),
        department_id: Number(formData.department_id),
        description: formData.description.trim(),
        status: formData.status,
      });
      setShowAddModal(false);
      setFormData({ name: '', zone_code: '', department_id: departments[0]?.id || 1, description: '', status: 'ACTIVE' });
      fetchZonesAndDepts();
    } catch (err: any) {
      console.error('Create zone error:', err);
      setFormError(err.response?.data?.detail || 'Failed to create work zone');
    } finally {
      setIsSubmitting(false);
    }
  };

  const attentionScans = zoneScans.filter((s) => ['MEDIUM', 'HIGH'].includes(s.exposure_class));

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white tracking-wide">WORK ZONES</h1>
          <p className="text-xs text-slate-400">
            Define physical operational zones, assign department coverage, and evaluate area exposure risk.
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="px-4 py-2.5 bg-teal-500 hover:bg-teal-400 text-slate-950 font-black rounded-xl text-xs shadow-lg transition flex items-center space-x-2 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>+ ADD ZONE</span>
        </button>
      </div>

      {/* Main Grid: Zone Cards & Zone Detail View */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Zone Cards (2 Cols) */}
        <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
          {zones.map((zone) => {
            const isSelected = selectedZoneId === zone.id;
            const hasAttention = (zone.attention_count || 0) > 0;
            return (
              <div
                key={zone.id}
                onClick={() => handleSelectZone(zone)}
                className={`bg-slate-900 border rounded-3xl p-5 shadow-xl transition cursor-pointer space-y-4 relative overflow-hidden ${
                  isSelected ? 'border-teal-500 bg-slate-900/90 ring-1 ring-teal-500/50' : 'border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center text-teal-400">
                      <MapPin className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-base font-black text-white">{zone.name}</h3>
                      <span className="text-[10px] font-mono font-bold text-teal-400 uppercase">
                        {zone.zone_code}
                      </span>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-500" />
                </div>

                <div className="text-xs text-slate-400 space-y-1">
                  <p><span className="text-slate-500 font-mono text-[10px]">DEPARTMENT:</span> <strong className="text-slate-300">{zone.department_name || 'Production'}</strong></p>
                  <p className="line-clamp-1">{zone.description || 'No description provided.'}</p>
                </div>

                {/* Zone Metrics Summary */}
                <div className="grid grid-cols-3 gap-2 pt-1 text-center text-xs font-mono font-bold">
                  <div className="p-2 bg-slate-950 rounded-xl border border-slate-800">
                    <span className="text-[9px] text-slate-500 block">WORKERS</span>
                    <span className="text-white">{zone.active_worker_count}</span>
                  </div>
                  <div className="p-2 bg-slate-950 rounded-xl border border-slate-800">
                    <span className="text-[9px] text-slate-500 block">SCANS</span>
                    <span className="text-teal-400">{zone.today_scan_count}</span>
                  </div>
                  <div className={`p-2 rounded-xl border ${
                    hasAttention ? 'bg-rose-950/60 border-rose-500/40 text-rose-300' : 'bg-slate-950 border-slate-800 text-slate-400'
                  }`}>
                    <span className="text-[9px] block">ATTENTION</span>
                    <span>{zone.attention_count}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Selected Zone Detail Drawer */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl space-y-4">
          {!selectedZone ? (
            <div className="p-12 text-center text-slate-500 space-y-3">
              <MapPin className="w-10 h-10 mx-auto text-slate-600" />
              <p className="text-xs font-bold text-slate-400">SELECT A WORK ZONE</p>
              <p className="text-[11px]">Click any zone card to inspect assigned personnel, current exposure breakdown, and alerts.</p>
            </div>
          ) : (
            <div className="space-y-5">
              <div className="border-b border-slate-800 pb-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono text-teal-400 uppercase font-bold tracking-widest">
                    ZONE DETAILS
                  </span>
                  <span className="text-xs font-mono font-bold bg-teal-500/10 text-teal-300 px-2.5 py-0.5 rounded-lg border border-teal-500/30">
                    {selectedZone.zone_code}
                  </span>
                </div>
                <h2 className="text-xl font-black text-white">{selectedZone.name}</h2>
                <p className="text-xs text-slate-400 pt-1">Department: <strong className="text-slate-200">{selectedZone.department_name}</strong></p>
              </div>

              {/* Attention Alert Box if high risk detected in zone */}
              {attentionScans.length > 0 && (
                <div className="p-3.5 bg-rose-950/60 border border-rose-500/40 rounded-2xl space-y-2 text-rose-200 animate-pulse">
                  <div className="flex items-center space-x-2">
                    <AlertTriangle className="w-4 h-4 text-rose-400" />
                    <span className="text-xs font-black uppercase tracking-wider">ATTENTION REQUIRED IN THIS ZONE</span>
                  </div>
                  <p className="text-[11px] text-rose-300">
                    {attentionScans.length} worker scan(s) recorded Medium or High exposure. Move affected workers to a safe area.
                  </p>
                </div>
              )}

              {/* Assigned Workers in this Zone */}
              <div className="space-y-2">
                <span className="text-[10px] font-mono text-slate-400 font-bold uppercase tracking-wider block">
                  WORKERS CURRENTLY ASSIGNED ({zoneAssignments.length})
                </span>
                <div className="space-y-2 max-h-44 overflow-y-auto pr-1">
                  {zoneAssignments.length === 0 ? (
                    <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-center text-xs text-slate-500">
                      No active workers assigned to this zone.
                    </div>
                  ) : (
                    zoneAssignments.map((a) => (
                      <div key={a.id} className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between text-xs">
                        <div>
                          <span className="font-bold text-white block">{a.worker_name} ({a.worker_code})</span>
                          <span className="text-[10px] font-mono text-slate-500">{a.shift_name}</span>
                        </div>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-teal-500/10 text-teal-300 border border-teal-500/30">
                          ASSIGNED
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Zone Exposure Scans */}
              <div className="space-y-2">
                <span className="text-[10px] font-mono text-slate-400 font-bold uppercase tracking-wider block">
                  RECENT ZONE SCANS ({zoneScans.length})
                </span>
                <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                  {zoneScans.length === 0 ? (
                    <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-center text-xs text-slate-500">
                      No scans logged in this zone yet.
                    </div>
                  ) : (
                    zoneScans.map((scan) => (
                      <div key={scan.id} className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between text-xs">
                        <div>
                          <span className="font-bold text-white block">{scan.worker_name}</span>
                          <span className="text-[10px] font-mono text-slate-500">
                            {scan.timestamp ? new Date(scan.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
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

      {/* Modal: + ADD ZONE */}
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
              <h2 className="text-xl font-black text-white">ADD NEW WORK ZONE</h2>
              <p className="text-xs text-slate-400">
                Define a physical work zone location and bind to a department.
              </p>
            </div>

            {formError && (
              <div className="p-3 bg-rose-950/80 border border-rose-500/50 rounded-xl text-rose-200 text-xs font-bold flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleCreateZone} className="space-y-4 text-xs font-medium">
              <div className="space-y-1">
                <label className="text-[10px] font-mono text-slate-400 font-bold uppercase">Zone Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Zone D"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white outline-none focus:border-teal-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-mono text-slate-400 font-bold uppercase">Zone Code (Unique)</label>
                <input
                  type="text"
                  value={formData.zone_code}
                  onChange={(e) => setFormData({ ...formData, zone_code: e.target.value })}
                  placeholder="e.g. ZON-D"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-teal-400 font-mono font-bold outline-none focus:border-teal-500 uppercase"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-mono text-slate-400 font-bold uppercase">Parent Department</label>
                <select
                  value={formData.department_id}
                  onChange={(e) => setFormData({ ...formData, department_id: Number(e.target.value) })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white outline-none focus:border-teal-500"
                >
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-mono text-slate-400 font-bold uppercase">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Operational area coverage description..."
                  rows={2}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white outline-none focus:border-teal-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-mono text-slate-400 font-bold uppercase">Status</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
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
                <span>SAVE WORK ZONE</span>
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
