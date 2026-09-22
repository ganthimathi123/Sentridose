import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supervisorService } from '../../services/api';
import { DashboardSummary, ExposureDistribution, EnrichedScan } from '../../types/supervisor';
import { Users, UserCheck, Activity, AlertTriangle, RefreshCw, Eye, UserPlus, X, ShieldCheck } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

export const SupervisorDashboardPage: React.FC = () => {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [distribution, setDistribution] = useState<ExposureDistribution | null>(null);
  const [timeRange, setTimeRange] = useState<'today' | 'week' | 'month'>('today');
  const [recentScans, setRecentScans] = useState<EnrichedScan[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastRefreshed, setLastRefreshed] = useState<string>('');
  
  // Real-Time Notification & Polling Trackers
  const [lastKnownScanId, setLastKnownScanId] = useState<number>(0);
  const [newScanToast, setNewScanToast] = useState<EnrichedScan | null>(null);

  const fetchDashboardData = async () => {
    try {
      const [sumData, distData, scanData] = await Promise.all([
        supervisorService.getDashboardSummary(),
        supervisorService.getExposureDistribution(timeRange),
        supervisorService.getAllScans({ limit: 20 }),
      ]);
      setSummary(sumData);
      setDistribution(distData);
      setRecentScans(scanData);
      setLastRefreshed(new Date().toLocaleTimeString());

      // Real-Time New Scan Detection Logic
      if (scanData.length > 0) {
        const topScan = scanData[0];
        const topId = topScan.id || (topScan as any).scan_id || 0;
        
        if (lastKnownScanId > 0 && topId > lastKnownScanId) {
          setNewScanToast(topScan);
        }
        setLastKnownScanId(topId);
      }
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  // Initial Load + Range Change
  useEffect(() => {
    fetchDashboardData();
  }, [timeRange]);

  // Real-Time Polling Loop (Every 5 Seconds as per Spec 6 & 18)
  useEffect(() => {
    const interval = setInterval(() => {
      fetchDashboardData();
    }, 5000);
    return () => clearInterval(interval);
  }, [timeRange, lastKnownScanId]);

  const attentionScans = recentScans.filter((s) => ['MEDIUM', 'HIGH'].includes(s.exposure_class));

  const chartData = distribution
    ? [
        { name: 'BASE', count: distribution.BASE, color: '#10B981' },
        { name: 'LOW', count: distribution.LOW, color: '#059669' },
        { name: 'MEDIUM', count: distribution.MEDIUM, color: '#EF4444' },
        { name: 'HIGH', count: distribution.HIGH, color: '#DC2626' },
      ]
    : [];

  return (
    <div className="space-y-6 relative">
      {/* Real-Time Toast Notification (Spec 7 & 17) */}
      {newScanToast && (
        <div className="fixed top-6 right-6 z-50 max-w-sm w-full bg-slate-900 border-2 border-teal-500 rounded-3xl p-5 shadow-2xl space-y-3 animate-bounce">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-black text-teal-400 uppercase tracking-widest bg-teal-500/10 px-3 py-1 rounded-full border border-teal-500/30">
              NEW SCAN RECEIVED
            </span>
            <button
              onClick={() => setNewScanToast(null)}
              className="text-slate-400 hover:text-white p-1 rounded-lg bg-slate-800"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="text-xs space-y-1">
            <div className="flex justify-between font-bold text-white text-sm">
              <span>{newScanToast.worker_name}</span>
              <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-mono font-black ${
                ['MEDIUM', 'HIGH'].includes(newScanToast.exposure_class) ? 'bg-rose-600 text-white' : 'bg-emerald-600 text-white'
              }`}>
                {newScanToast.exposure_class}
              </span>
            </div>
            <div className="text-slate-400 font-mono text-[11px] flex justify-between">
              <span>Code: {newScanToast.worker_code}</span>
              <span>Zone: {newScanToast.zone_name || 'Zone A'}</span>
            </div>
            <div className="text-slate-400 font-mono text-[11px]">
              Time: {newScanToast.timestamp ? new Date(newScanToast.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
            </div>
          </div>

          <Link
            to={`/supervisor/scans/${newScanToast.id}`}
            onClick={() => setNewScanToast(null)}
            className="w-full py-2 bg-teal-500 hover:bg-teal-400 text-slate-950 font-black text-xs rounded-xl flex items-center justify-center space-x-1.5 transition shadow"
          >
            <Eye className="w-3.5 h-3.5" />
            <span>[ VIEW SCAN ]</span>
          </Link>
        </div>
      )}

      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl relative overflow-hidden">
        <div className="space-y-1 z-10">
          <div className="flex items-center space-x-2">
            <span className="text-xs font-mono font-bold text-teal-400 uppercase tracking-widest bg-teal-500/10 px-2.5 py-0.5 rounded-full border border-teal-500/30">
              SENTRIDOSE SUPERVISOR PANEL
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white">Good morning, Supervisor</h1>
          <p className="text-xs text-slate-400">
            Real-time passive dosimeter monitoring, workplace assignment tracking, and exposure oversight.
          </p>
        </div>

        <div className="flex items-center space-x-3 z-10 self-start sm:self-auto">
          <Link
            to="/supervisor/employees?action=register"
            className="px-4 py-2 bg-teal-500 hover:bg-teal-400 text-slate-950 font-black text-xs rounded-xl shadow-lg transition flex items-center space-x-1.5"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>+ REGISTER WORKER</span>
          </Link>
          <button
            onClick={fetchDashboardData}
            className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl border border-slate-700 transition flex items-center space-x-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-teal-400' : ''}`} />
            <span>Refresh</span>
          </button>
          <div className="text-[11px] font-mono text-slate-500 bg-slate-950 px-3 py-2 rounded-xl border border-slate-800">
            Auto-refreshing 5s | {lastRefreshed}
          </div>
        </div>
      </div>

      {/* 4 Core Summary Cards (Spec 9) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Employees */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-lg space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-mono font-bold uppercase tracking-wider">TOTAL EMPLOYEES</span>
            <Users className="w-4 h-4 text-slate-500" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-white">
            {summary ? summary.total_employees : '—'}
          </div>
          <p className="text-[10px] font-medium text-slate-500">Registered workforce identities</p>
        </div>

        {/* Active Employees */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-lg space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-mono font-bold uppercase tracking-wider">ACTIVE EMPLOYEES</span>
            <UserCheck className="w-4 h-4 text-teal-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-teal-300">
            {summary ? summary.active_employees : '—'}
          </div>
          <p className="text-[10px] font-medium text-teal-500/80">Cleared for active scanning</p>
        </div>

        {/* Total / Today's Scans */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-lg space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-mono font-bold uppercase tracking-wider">TODAY'S SCANS</span>
            <Activity className="w-4 h-4 text-teal-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-white">
            {summary ? summary.todays_scans : '—'}
          </div>
          <p className="text-[10px] font-medium text-slate-500">Optical readings logged today</p>
        </div>

        {/* Attention Required */}
        <div className={`border rounded-2xl p-4 sm:p-5 shadow-lg space-y-2 transition ${
          summary && summary.attention_required > 0
            ? 'bg-rose-950/40 border-rose-500/50 text-rose-200'
            : 'bg-slate-900 border-slate-800 text-slate-200'
        }`}>
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono font-bold uppercase tracking-wider">ATTENTION REQUIRED</span>
            <AlertTriangle className={`w-4 h-4 ${summary && summary.attention_required > 0 ? 'text-rose-400 animate-pulse' : 'text-slate-500'}`} />
          </div>
          <div className={`text-2xl sm:text-3xl font-black ${summary && summary.attention_required > 0 ? 'text-rose-400' : 'text-white'}`}>
            {summary ? summary.attention_required : '—'}
          </div>
          <p className="text-[10px] font-medium text-slate-400">Medium & High exposure alerts</p>
        </div>
      </div>

      {/* Middle Grid: Exposure Overview Chart & Attention Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Exposure Overview Chart (2 Columns) */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <h2 className="text-lg font-black text-white tracking-wide">EXPOSURE OVERVIEW</h2>
              <p className="text-xs text-slate-400">Aggregated dosage classifications from real worker scans</p>
            </div>

            {/* Range Filters */}
            <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs font-bold font-mono">
              {(['today', 'week', 'month'] as const).map((r) => (
                <button
                  key={r}
                  onClick={() => setTimeRange(r)}
                  className={`px-3 py-1 rounded-lg transition uppercase ${
                    timeRange === r ? 'bg-teal-500 text-slate-950 font-black' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {r === 'today' ? 'Today' : r === 'week' ? 'This Week' : 'This Month'}
                </button>
              ))}
            </div>
          </div>

          {/* Recharts Bar Graph */}
          <div className="h-56 sm:h-64 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <XAxis dataKey="name" stroke="#64748B" fontSize={11} tickLine={false} />
                <YAxis stroke="#64748B" fontSize={11} tickLine={false} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0F172A', borderColor: '#334155', borderRadius: '12px', fontSize: '12px', color: '#fff' }}
                />
                <Bar dataKey="count" radius={[8, 8, 0, 0]}>
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-4 gap-2 pt-2 text-center text-xs font-bold font-mono">
            <div className="p-2 bg-emerald-950/40 border border-emerald-500/30 rounded-xl text-emerald-400">
              BASE ({distribution?.BASE || 0})
            </div>
            <div className="p-2 bg-emerald-950/40 border border-emerald-500/30 rounded-xl text-emerald-300">
              LOW ({distribution?.LOW || 0})
            </div>
            <div className="p-2 bg-rose-950/40 border border-rose-500/30 rounded-xl text-rose-400">
              MEDIUM ({distribution?.MEDIUM || 0})
            </div>
            <div className="p-2 bg-rose-950/50 border border-rose-500/40 rounded-xl text-rose-500">
              HIGH ({distribution?.HIGH || 0})
            </div>
          </div>
        </div>

        {/* Attention Required Card (1 Column) */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center space-x-2 text-rose-400">
              <AlertTriangle className="w-5 h-5" />
              <h2 className="text-lg font-black tracking-wide text-white">ATTENTION REQUIRED</h2>
            </div>
            <p className="text-xs text-slate-400 pt-1">
              Workers registering Medium or High dosage requiring immediate evacuation or safety review.
            </p>
          </div>

          <div className="space-y-3 my-2 overflow-y-auto max-h-64 pr-1">
            {attentionScans.length === 0 ? (
              <div className="p-6 bg-slate-950 rounded-2xl border border-slate-800 text-center space-y-1 text-slate-400">
                <span className="text-xs font-bold text-teal-400 uppercase tracking-wider block">NO HIGH RISK ALERTS</span>
                <p className="text-[11px]">All recent dosimeter readings are within normal BASE/LOW parameters.</p>
              </div>
            ) : (
              attentionScans.map((scan) => (
                <div
                  key={scan.id || scan.timestamp}
                  className="p-3.5 bg-rose-950/60 border border-rose-500/40 rounded-2xl space-y-1.5 text-rose-200"
                >
                  <div className="flex items-center justify-between text-xs font-bold">
                    <span className="text-white font-extrabold">{scan.worker_name} ({scan.worker_code})</span>
                    <span className="px-2 py-0.5 bg-rose-600 text-white rounded-md text-[10px] font-black uppercase">
                      {scan.exposure_class}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-300 flex justify-between font-mono">
                    <span>{scan.department_name || 'Production'} • {scan.zone_name || 'Zone A'}</span>
                    <span>{scan.timestamp ? new Date(scan.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}</span>
                  </div>
                  <div className="text-[10px] font-bold text-rose-300 tracking-wide uppercase pt-1 border-t border-rose-800/40 flex items-center space-x-1">
                    <span>STATUS: MOVE TO SAFER PLACE</span>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="text-[10px] font-mono text-slate-500 text-center pt-2 border-t border-slate-800">
            SIMULATED OPTICAL REFERENCE — NOT A GAS CONCENTRATION STANDARD.
          </div>
        </div>
      </div>

      {/* RECENT SCANS TABLE (Spec 8 & 10) */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-black text-white tracking-wide">RECENT SCANS</h2>
            <p className="text-xs text-slate-400">Live feed of worker optical dosimeter scans saved to central database</p>
          </div>
          <Link
            to="/supervisor/scans"
            className="text-xs font-bold font-mono text-teal-400 hover:text-teal-300 transition"
          >
            View All Scans →
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-medium">
            <thead>
              <tr className="border-b border-slate-800 text-[10px] font-mono text-slate-400 uppercase tracking-wider">
                <th className="py-3 px-3">Worker</th>
                <th className="py-3 px-3">Worker Code</th>
                <th className="py-3 px-3">Department</th>
                <th className="py-3 px-3">Zone</th>
                <th className="py-3 px-3">Shift</th>
                <th className="py-3 px-3">Exposure</th>
                <th className="py-3 px-3 text-right">Confidence</th>
                <th className="py-3 px-3">Date</th>
                <th className="py-3 px-3">Time</th>
                <th className="py-3 px-3 text-center">Status</th>
                <th className="py-3 px-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-200">
              {recentScans.length === 0 ? (
                <tr>
                  <td colSpan={11} className="py-8 text-center text-slate-500">
                    No recent scans logged in database.
                  </td>
                </tr>
              ) : (
                recentScans.map((s) => {
                  const isAttention = ['MEDIUM', 'HIGH'].includes(s.exposure_class);
                  return (
                    <tr key={s.id} className="hover:bg-slate-800/40 transition">
                      <td className="py-3.5 px-3 font-bold text-white">{s.worker_name || 'Worker'}</td>
                      <td className="py-3.5 px-3 font-mono text-teal-400 font-bold">{s.worker_code}</td>
                      <td className="py-3.5 px-3 text-slate-300">{s.department_name || 'Production'}</td>
                      <td className="py-3.5 px-3 text-slate-300 font-bold">{s.zone_name || 'Zone A'}</td>
                      <td className="py-3.5 px-3 text-slate-400 font-mono text-[11px]">{s.shift_name || 'Morning'}</td>
                      <td className="py-3.5 px-3">
                        <span className={`px-2 py-0.5 rounded-md font-mono font-bold text-[10px] ${
                          isAttention ? 'bg-rose-950 text-rose-300 border border-rose-500/40' : 'bg-emerald-950 text-emerald-300 border border-emerald-500/40'
                        }`}>
                          {s.exposure_class}
                        </span>
                      </td>
                      <td className="py-3.5 px-3 text-right font-mono text-slate-300">{s.confidence}%</td>
                      <td className="py-3.5 px-3 font-mono text-slate-400 text-[11px]">
                        {s.timestamp ? new Date(s.timestamp).toLocaleDateString([], { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                      </td>
                      <td className="py-3.5 px-3 font-mono text-slate-400 text-[11px]">
                        {s.timestamp ? new Date(s.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}
                      </td>
                      <td className="py-3.5 px-3 text-center">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                          isAttention ? 'bg-rose-600 text-white' : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                        }`}>
                          {isAttention ? 'ATTENTION' : 'ACCEPTABLE'}
                        </span>
                      </td>
                      <td className="py-3.5 px-3 text-right">
                        <Link
                          to={`/supervisor/scans/${s.id}`}
                          className="p-1.5 bg-slate-800 hover:bg-teal-500 hover:text-slate-950 text-slate-300 rounded-lg transition inline-flex items-center space-x-1"
                          title="View Scan Details"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span className="text-[10px] font-bold">VIEW</span>
                        </Link>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
