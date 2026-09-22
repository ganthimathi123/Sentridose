import React, { useState, useEffect } from 'react';
import {
  FileText,
  Download,
  Share2,
  Calendar,
  Filter,
  RefreshCw,
  Search,
  CheckCircle2,
  AlertTriangle,
  User,
  Building2,
  MapPin,
  Clock,
  ShieldAlert,
  ArrowRight,
  Database,
  Eye,
  History
} from 'lucide-react';
import { api } from '../../services/api';

interface FilterOption {
  id: number;
  name: string;
}

interface SummaryData {
  total_workers: number;
  total_scans: number;
  base_count: number;
  low_count: number;
  medium_count: number;
  high_count: number;
  attention_required: number;
  base_pct: number;
  low_pct: number;
  medium_pct: number;
  high_pct: number;
}

interface ScanRecord {
  id: number;
  scan_id: number;
  worker_id: number;
  worker_name: string;
  worker_code: string;
  department_name: string;
  zone_name: string;
  shift_name: string;
  timestamp_fmt: string;
  exposure_class: string;
  nearest_shade: string;
  confidence: number;
  delta_e: number;
  risk_status: string;
  is_acknowledged: boolean;
}

interface HistoryItem {
  id: number;
  report_id: string;
  report_type: string;
  generated_by_name: string;
  period: string;
  format: string;
  scan_count: number;
  generated_at: string;
}

export const ReportsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'preview' | 'history'>('preview');

  // Filter States
  const [reportType, setReportType] = useState('Complete Scan Report');
  const [quickFilter, setQuickFilter] = useState('Last 30 Days');
  const [startDate, setStartDate] = useState(
    new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0]
  );
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);

  const [selectedDept, setSelectedDept] = useState<string>('');
  const [selectedZone, setSelectedZone] = useState<string>('');
  const [selectedShift, setSelectedShift] = useState<string>('');
  const [selectedWorker, setSelectedWorker] = useState<string>('');
  const [exposureFilter, setExposureFilter] = useState<string>('ALL');

  // Option Lists
  const [departments, setDepartments] = useState<FilterOption[]>([]);
  const [zones, setZones] = useState<FilterOption[]>([]);
  const [shifts, setShifts] = useState<FilterOption[]>([]);
  const [workers, setWorkers] = useState<{ id: number; name: string; worker_code: string }[]>([]);

  // Report Data
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState<string | null>(null);
  const [reportMetadata, setReportMetadata] = useState<any>(null);
  const [summaryData, setSummaryData] = useState<SummaryData | null>(null);
  const [scansData, setScansData] = useState<ScanRecord[]>([]);
  const [reportHistory, setReportHistory] = useState<HistoryItem[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Quick Date Presets
  const handleQuickFilter = (preset: string) => {
    setQuickFilter(preset);
    const now = new Date();
    if (preset === 'Today') {
      const todayStr = now.toISOString().split('T')[0];
      setStartDate(todayStr);
      setEndDate(todayStr);
    } else if (preset === 'Yesterday') {
      const y = new Date(Date.now() - 86400000);
      const yStr = y.toISOString().split('T')[0];
      setStartDate(yStr);
      setEndDate(yStr);
    } else if (preset === 'Last 7 Days') {
      setStartDate(new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0]);
      setEndDate(now.toISOString().split('T')[0]);
    } else if (preset === 'Last 30 Days') {
      setStartDate(new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0]);
      setEndDate(now.toISOString().split('T')[0]);
    } else if (preset === 'This Month') {
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
      setStartDate(firstDay);
      setEndDate(now.toISOString().split('T')[0]);
    }
  };

  // Initial Option Lists Fetch
  useEffect(() => {
    const fetchOptions = async () => {
      try {
        const [dRes, zRes, sRes, wRes] = await Promise.all([
          api.get('/departments'),
          api.get('/zones'),
          api.get('/shifts'),
          api.get('/workers')
        ]);
        setDepartments(dRes.data);
        setZones(zRes.data);
        setShifts(sRes.data);
        setWorkers(wRes.data);
      } catch (e) {
        console.warn('Error fetching report filter options:', e);
      }
    };
    fetchOptions();
    fetchReportPreview();
  }, []);

  // Generate Report Preview
  const fetchReportPreview = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const params: any = {
        report_type: reportType,
        start_date: startDate,
        end_date: endDate,
        exposure_class: exposureFilter
      };

      if (selectedDept) params.department_id = selectedDept;
      if (selectedZone) params.zone_id = selectedZone;
      if (selectedShift) params.shift_id = selectedShift;
      if (selectedWorker) params.worker_id = selectedWorker;
      if (reportType === 'Risk/Attention Report') params.risk_only = true;

      const [sumRes, scansRes] = await Promise.all([
        api.get('/reports/summary', { params }),
        api.get('/reports/scans', { params: { ...params, page: 1, limit: 100 } })
      ]);

      setReportMetadata(sumRes.data);
      setSummaryData(sumRes.data.summary);
      setScansData(scansRes.data.scans || []);

      if ((scansRes.data.scans || []).length === 0) {
        setErrorMsg('NO DATA FOUND — No scan records match the selected filters.');
      }
    } catch (e: any) {
      console.error('Failed to generate report:', e);
      setErrorMsg(e.response?.data?.detail || 'Failed to generate report preview.');
      setScansData([]);
    } finally {
      setLoading(false);
    }
  };

  // Download Handlers
  const handleDownload = async (format: 'pdf' | 'csv' | 'excel') => {
    setDownloading(format);
    try {
      const params: any = {
        report_type: reportType,
        start_date: startDate,
        end_date: endDate,
        exposure_class: exposureFilter
      };

      if (selectedDept) params.department_id = selectedDept;
      if (selectedZone) params.zone_id = selectedZone;
      if (selectedShift) params.shift_id = selectedShift;
      if (selectedWorker) params.worker_id = selectedWorker;
      if (reportType === 'Risk/Attention Report') params.risk_only = true;

      const endpoint = format === 'pdf' ? '/reports/pdf' : format === 'csv' ? '/reports/csv' : '/reports/excel';
      const response = await api.get(endpoint, {
        params,
        responseType: 'blob'
      });

      // Derive filename
      let filename = `SentriDose_Report.${format === 'excel' ? 'xlsx' : format}`;
      const header = response.headers['content-disposition'];
      if (header && header.includes('filename=')) {
        filename = header.split('filename=')[1].replace(/"/g, '');
      }

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      fetchHistory();
    } catch (e: any) {
      alert('Failed to download report. Ensure matching data exists.');
    } finally {
      setDownloading(null);
    }
  };

  // Android Web Share API Implementation
  const handleShareReport = async () => {
    const title = `SentriDose ${reportType}`;
    const text = `SentriDose Exposure Monitoring Report (${reportMetadata?.period || ''}). Total Scans: ${summaryData?.total_scans || 0}`;
    const shareUrl = window.location.href;

    if (navigator.share) {
      try {
        await navigator.share({
          title,
          text,
          url: shareUrl
        });
      } catch (err) {
        console.log('Share canceled or failed:', err);
      }
    } else {
      navigator.clipboard.writeText(`${title}\n${text}\n${shareUrl}`);
      alert('Report link & summary copied to clipboard for sharing!');
    }
  };

  const fetchHistory = async () => {
    try {
      const res = await api.get('/reports/history');
      setReportHistory(res.data);
    } catch (e) {
      console.warn('Error fetching report history:', e);
    }
  };

  useEffect(() => {
    if (activeTab === 'history') {
      fetchHistory();
    }
  }, [activeTab]);

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-5 rounded-2xl">
        <div>
          <div className="flex items-center space-x-2">
            <FileText className="w-5 h-5 text-teal-400" />
            <h1 className="text-lg font-black tracking-wider text-white">DOWNLOADABLE REPORTS MODULE</h1>
          </div>
          <p className="text-xs text-slate-400 font-mono mt-1">
            Generate and export real-time organizational H₂S colorimetric exposure reports in PDF, CSV & Excel formats.
          </p>
        </div>

        {/* Tab Toggle */}
        <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800 shrink-0">
          <button
            onClick={() => setActiveTab('preview')}
            className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition ${
              activeTab === 'preview'
                ? 'bg-teal-500 text-slate-950 shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Report Generator
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition ${
              activeTab === 'history'
                ? 'bg-teal-500 text-slate-950 shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Report History Log
          </button>
        </div>
      </div>

      {activeTab === 'preview' ? (
        <>
          {/* Controls Header & Filters */}
          <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {/* Report Type */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-mono font-bold text-slate-400 uppercase">
                  1. Report Type
                </label>
                <select
                  value={reportType}
                  onChange={(e) => setReportType(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 text-white rounded-xl px-3 py-2 text-xs font-bold focus:border-teal-500 focus:outline-hidden"
                >
                  <option value="Complete Scan Report">Complete Scan Report</option>
                  <option value="Daily Exposure Report">Daily Exposure Report</option>
                  <option value="Date Range Exposure Report">Date Range Exposure Report</option>
                  <option value="Worker Exposure Report">Worker Exposure Report</option>
                  <option value="Department Exposure Report">Department Exposure Report</option>
                  <option value="Zone Exposure Report">Zone Exposure Report</option>
                  <option value="Shift Exposure Report">Shift Exposure Report</option>
                  <option value="Risk/Attention Report">Risk / Attention Report (MEDIUM/HIGH)</option>
                </select>
              </div>

              {/* Start Date */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-mono font-bold text-slate-400 uppercase">
                  Start Date
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 text-white rounded-xl px-3 py-2 text-xs font-bold focus:border-teal-500 focus:outline-hidden"
                />
              </div>

              {/* End Date */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-mono font-bold text-slate-400 uppercase">
                  End Date
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 text-white rounded-xl px-3 py-2 text-xs font-bold focus:border-teal-500 focus:outline-hidden"
                />
              </div>

              {/* Exposure Class */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-mono font-bold text-slate-400 uppercase">
                  Exposure Filter
                </label>
                <select
                  value={exposureFilter}
                  onChange={(e) => setExposureFilter(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 text-white rounded-xl px-3 py-2 text-xs font-bold focus:border-teal-500 focus:outline-hidden"
                >
                  <option value="ALL">ALL Classes</option>
                  <option value="BASE">BASE</option>
                  <option value="LOW">LOW</option>
                  <option value="MEDIUM">MEDIUM Risk</option>
                  <option value="HIGH">HIGH Critical Risk</option>
                </select>
              </div>
            </div>

            {/* Quick Presets */}
            <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-800/80">
              <span className="text-[11px] font-mono text-slate-500 font-bold uppercase mr-1">
                Quick Presets:
              </span>
              {['Today', 'Yesterday', 'Last 7 Days', 'Last 30 Days', 'This Month'].map((preset) => (
                <button
                  key={preset}
                  onClick={() => handleQuickFilter(preset)}
                  className={`px-2.5 py-1 text-[11px] font-bold rounded-lg border transition ${
                    quickFilter === preset
                      ? 'bg-teal-500/10 text-teal-300 border-teal-500/40'
                      : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
                  }`}
                >
                  {preset}
                </button>
              ))}
            </div>

            {/* Additional Filter Selectors */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2">
              <select
                value={selectedDept}
                onChange={(e) => setSelectedDept(e.target.value)}
                className="bg-slate-950 border border-slate-800 text-slate-300 rounded-xl px-3 py-1.5 text-xs font-bold"
              >
                <option value="">All Departments</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>

              <select
                value={selectedZone}
                onChange={(e) => setSelectedZone(e.target.value)}
                className="bg-slate-950 border border-slate-800 text-slate-300 rounded-xl px-3 py-1.5 text-xs font-bold"
              >
                <option value="">All Work Zones</option>
                {zones.map((z) => (
                  <option key={z.id} value={z.id}>
                    {z.name}
                  </option>
                ))}
              </select>

              <select
                value={selectedShift}
                onChange={(e) => setSelectedShift(e.target.value)}
                className="bg-slate-950 border border-slate-800 text-slate-300 rounded-xl px-3 py-1.5 text-xs font-bold"
              >
                <option value="">All Shifts</option>
                {shifts.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>

              <select
                value={selectedWorker}
                onChange={(e) => setSelectedWorker(e.target.value)}
                className="bg-slate-950 border border-slate-800 text-slate-300 rounded-xl px-3 py-1.5 text-xs font-bold"
              >
                <option value="">All Workers</option>
                {workers.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name} ({w.worker_code})
                  </option>
                ))}
              </select>
            </div>

            {/* Generate Button */}
            <div className="flex justify-end pt-2">
              <button
                onClick={fetchReportPreview}
                disabled={loading}
                className="flex items-center space-x-2 px-6 py-2.5 bg-teal-500 hover:bg-teal-400 text-slate-950 font-black rounded-xl text-xs uppercase tracking-wider shadow-lg shadow-teal-500/20 transition disabled:opacity-50"
              >
                {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Eye className="w-4 h-4" />}
                <span>[ GENERATE REPORT ]</span>
              </button>
            </div>
          </div>

          {/* Error / Empty Notification Banner */}
          {errorMsg && (
            <div className="bg-rose-950/30 border border-rose-800 p-4 rounded-xl flex items-center space-x-3 text-rose-300 text-xs font-bold">
              <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* REPORT PREVIEW CARD */}
          {summaryData && (
            <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl space-y-6">
              {/* Document Title Header */}
              <div className="flex flex-col md:flex-row justify-between border-b border-slate-800 pb-4 gap-4">
                <div>
                  <h2 className="text-base font-black tracking-wider text-white">SENTRIDOSE</h2>
                  <p className="text-xs font-bold text-teal-400 uppercase tracking-widest mt-0.5">
                    PASSIVE EXPOSURE MONITORING REPORT — {reportMetadata?.report_type}
                  </p>
                </div>
                <div className="text-right font-mono text-[11px] text-slate-400 space-y-1">
                  <div>
                    <span className="text-slate-500 font-bold">Report ID:</span>{' '}
                    <span className="text-white font-bold">{reportMetadata?.report_id}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 font-bold">Period:</span>{' '}
                    <span className="text-teal-300 font-bold">{reportMetadata?.period}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 font-bold">Generated:</span>{' '}
                    <span>{reportMetadata?.generated_at}</span>
                  </div>
                </div>
              </div>

              {/* Summary Statistics Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
                <div className="bg-slate-950 border border-slate-800 p-3 rounded-xl">
                  <span className="text-[10px] font-mono text-slate-500 font-bold block uppercase">
                    Total Workers
                  </span>
                  <span className="text-lg font-black text-white">{summaryData.total_workers}</span>
                </div>
                <div className="bg-slate-950 border border-slate-800 p-3 rounded-xl">
                  <span className="text-[10px] font-mono text-slate-500 font-bold block uppercase">
                    Total Scans
                  </span>
                  <span className="text-lg font-black text-teal-400">{summaryData.total_scans}</span>
                </div>
                <div className="bg-slate-950 border border-slate-800 p-3 rounded-xl">
                  <span className="text-[10px] font-mono text-slate-500 font-bold block uppercase">BASE</span>
                  <span className="text-lg font-black text-slate-300">{summaryData.base_count}</span>
                </div>
                <div className="bg-slate-950 border border-emerald-900/40 p-3 rounded-xl">
                  <span className="text-[10px] font-mono text-emerald-400 font-bold block uppercase">LOW</span>
                  <span className="text-lg font-black text-emerald-400">{summaryData.low_count}</span>
                </div>
                <div className="bg-slate-950 border border-amber-900/40 p-3 rounded-xl">
                  <span className="text-[10px] font-mono text-amber-400 font-bold block uppercase">MEDIUM</span>
                  <span className="text-lg font-black text-amber-400">{summaryData.medium_count}</span>
                </div>
                <div className="bg-slate-950 border border-rose-900/40 p-3 rounded-xl">
                  <span className="text-[10px] font-mono text-rose-400 font-bold block uppercase">HIGH</span>
                  <span className="text-lg font-black text-rose-400">{summaryData.high_count}</span>
                </div>
                <div className="bg-rose-950/20 border border-rose-800/60 p-3 rounded-xl col-span-2 sm:col-span-1">
                  <span className="text-[10px] font-mono text-rose-300 font-bold block uppercase">ATTENTION</span>
                  <span className="text-lg font-black text-rose-400">{summaryData.attention_required}</span>
                </div>
              </div>

              {/* Exposure Distribution Progress */}
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
                <h3 className="text-xs font-extrabold text-slate-300 uppercase tracking-wider">
                  Exposure Class Distribution
                </h3>
                <div className="grid grid-cols-4 gap-2 text-center text-xs font-mono font-bold">
                  <div className="p-2 bg-slate-900 rounded-lg text-slate-300">
                    BASE: {summaryData.base_count} ({summaryData.base_pct}%)
                  </div>
                  <div className="p-2 bg-emerald-950/40 text-emerald-300 border border-emerald-800/40 rounded-lg">
                    LOW: {summaryData.low_count} ({summaryData.low_pct}%)
                  </div>
                  <div className="p-2 bg-amber-950/40 text-amber-300 border border-amber-800/40 rounded-lg">
                    MEDIUM: {summaryData.medium_count} ({summaryData.medium_pct}%)
                  </div>
                  <div className="p-2 bg-rose-950/40 text-rose-300 border border-rose-800/40 rounded-lg">
                    HIGH: {summaryData.high_count} ({summaryData.high_pct}%)
                  </div>
                </div>
              </div>

              {/* Detailed Preview Scan Records Table */}
              <div className="space-y-3">
                <h3 className="text-xs font-extrabold text-slate-300 uppercase tracking-wider">
                  Detailed Scan Records ({scansData.length})
                </h3>

                <div className="overflow-x-auto border border-slate-800 rounded-xl">
                  <table className="w-full text-left text-xs font-sans">
                    <thead className="bg-slate-950 text-slate-400 font-mono text-[11px] uppercase border-b border-slate-800">
                      <tr>
                        <th className="p-3">Scan ID</th>
                        <th className="p-3">Date / Time</th>
                        <th className="p-3">Worker & Code</th>
                        <th className="p-3">Dept / Zone / Shift</th>
                        <th className="p-3">Exposure</th>
                        <th className="p-3">Confidence</th>
                        <th className="p-3">Delta E</th>
                        <th className="p-3">Risk Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 font-medium">
                      {scansData.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="p-8 text-center text-slate-500 font-mono">
                            No matching scan records found.
                          </td>
                        </tr>
                      ) : (
                        scansData.map((s) => (
                          <tr key={s.id} className="hover:bg-slate-800/30">
                            <td className="p-3 font-mono font-bold text-teal-400">#{s.id}</td>
                            <td className="p-3 font-mono text-slate-400">{s.timestamp_fmt}</td>
                            <td className="p-3">
                              <div className="font-bold text-white">{s.worker_name}</div>
                              <div className="text-[10px] font-mono text-slate-400">{s.worker_code}</div>
                            </td>
                            <td className="p-3">
                              <div>{s.department_name}</div>
                              <div className="text-[10px] font-mono text-slate-400">
                                {s.zone_name} | {s.shift_name}
                              </div>
                            </td>
                            <td className="p-3">
                              <span
                                className={`px-2 py-0.5 rounded-full font-extrabold text-[10px] ${
                                  s.exposure_class === 'HIGH'
                                    ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
                                    : s.exposure_class === 'MEDIUM'
                                    ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                                    : s.exposure_class === 'LOW'
                                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                                    : 'bg-slate-800 text-slate-300'
                                }`}
                              >
                                {s.exposure_class}
                              </span>
                            </td>
                            <td className="p-3 font-mono font-bold text-slate-300">
                              {(s.confidence * 100).toFixed(1)}%
                            </td>
                            <td className="p-3 font-mono text-slate-400">{s.delta_e.toFixed(2)}</td>
                            <td className="p-3 font-mono font-bold text-xs">
                              {s.risk_status === 'ACKNOWLEDGED' ? (
                                <span className="text-emerald-400 font-bold">ACKNOWLEDGED</span>
                              ) : s.risk_status === 'OPEN RISK' ? (
                                <span className="text-rose-400 font-bold">OPEN RISK</span>
                              ) : (
                                <span className="text-slate-500">NORMAL</span>
                              )}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* DOWNLOAD & SHARE ACTION BUTTONS */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-slate-800">
                <div className="flex flex-wrap items-center gap-2">
                  {/* Download PDF */}
                  <button
                    onClick={() => handleDownload('pdf')}
                    disabled={downloading !== null || scansData.length === 0}
                    className="flex items-center space-x-2 px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white font-black text-xs rounded-xl shadow transition disabled:opacity-40"
                  >
                    <Download className="w-4 h-4" />
                    <span>[ DOWNLOAD PDF ]</span>
                  </button>

                  {/* Download CSV */}
                  <button
                    onClick={() => handleDownload('csv')}
                    disabled={downloading !== null || scansData.length === 0}
                    className="flex items-center space-x-2 px-4 py-2 bg-teal-600 hover:bg-teal-500 text-white font-black text-xs rounded-xl shadow transition disabled:opacity-40"
                  >
                    <Download className="w-4 h-4" />
                    <span>[ DOWNLOAD CSV ]</span>
                  </button>

                  {/* Download Excel */}
                  <button
                    onClick={() => handleDownload('excel')}
                    disabled={downloading !== null || scansData.length === 0}
                    className="flex items-center space-x-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs rounded-xl shadow transition disabled:opacity-40"
                  >
                    <Download className="w-4 h-4" />
                    <span>[ DOWNLOAD EXCEL ]</span>
                  </button>
                </div>

                {/* Share Button (Android / Web Share) */}
                <button
                  onClick={handleShareReport}
                  className="flex items-center space-x-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-extrabold text-xs rounded-xl transition"
                >
                  <Share2 className="w-4 h-4 text-teal-400" />
                  <span>[ SHARE REPORT ]</span>
                </button>
              </div>
            </div>
          )}
        </>
      ) : (
        /* REPORT HISTORY LOG TAB */
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h2 className="text-sm font-black text-white tracking-wider">GENERATED REPORT HISTORY LOG</h2>
            <button
              onClick={fetchHistory}
              className="p-2 text-slate-400 hover:text-white rounded-lg bg-slate-800"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>

          <div className="overflow-x-auto border border-slate-800 rounded-xl">
            <table className="w-full text-left text-xs font-sans">
              <thead className="bg-slate-950 text-slate-400 font-mono text-[11px] uppercase border-b border-slate-800">
                <tr>
                  <th className="p-3">Report ID</th>
                  <th className="p-3">Type</th>
                  <th className="p-3">Generated By</th>
                  <th className="p-3">Date Range</th>
                  <th className="p-3">Format</th>
                  <th className="p-3">Record Count</th>
                  <th className="p-3">Generated At</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-medium">
                {reportHistory.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-500 font-mono">
                      No report generation history logged yet.
                    </td>
                  </tr>
                ) : (
                  reportHistory.map((h) => (
                    <tr key={h.id} className="hover:bg-slate-800/30">
                      <td className="p-3 font-mono font-bold text-teal-400">{h.report_id}</td>
                      <td className="p-3 font-bold text-white">{h.report_type}</td>
                      <td className="p-3 text-slate-300">{h.generated_by_name}</td>
                      <td className="p-3 font-mono text-slate-400">{h.period}</td>
                      <td className="p-3">
                        <span
                          className={`px-2 py-0.5 rounded-full font-extrabold text-[10px] ${
                            h.format === 'PDF'
                              ? 'bg-rose-500/20 text-rose-400'
                              : h.format === 'EXCEL'
                              ? 'bg-emerald-500/20 text-emerald-400'
                              : 'bg-teal-500/20 text-teal-400'
                          }`}
                        >
                          {h.format}
                        </span>
                      </td>
                      <td className="p-3 font-mono text-slate-300">{h.scan_count}</td>
                      <td className="p-3 font-mono text-slate-400">
                        {new Date(h.generated_at).toLocaleString()}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
