import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate, Outlet } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  Building2,
  MapPin,
  Clock,
  UserCheck,
  Activity,
  FileText,
  Bell,
  LogOut,
  Menu,
  X,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Volume2,
  VolumeX
} from 'lucide-react';
import { api } from '../../services/api';

interface NotificationItem {
  id: number;
  scan_id: number;
  worker_id: number;
  worker_name: string;
  worker_code: string;
  department_name?: string;
  zone_name?: string;
  shift_name?: string;
  severity: 'MEDIUM' | 'HIGH';
  title: string;
  message: string;
  is_read: boolean;
  is_acknowledged: boolean;
  acknowledged_at?: string;
  created_at: string;
}

export const SupervisorLayout: React.FC = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem('sentridose_supervisor_token');
    localStorage.removeItem('sentridose_supervisor_user');
    navigate('/supervisor');
  };

  const navItems = [
    { label: 'Dashboard', path: '/supervisor/dashboard', icon: LayoutDashboard },
    { label: 'Employees', path: '/supervisor/employees', icon: Users },
    { label: 'Departments', path: '/supervisor/departments', icon: Building2 },
    { label: 'Zones', path: '/supervisor/zones', icon: MapPin },
    { label: 'Shifts', path: '/supervisor/shifts', icon: Clock },
    { label: 'Scans', path: '/supervisor/scans', icon: Activity },
    { label: 'Reports', path: '/supervisor/reports', icon: FileText },
  ];

  const fetchNotifications = async () => {
    try {
      const res = await api.get('/notifications?limit=30');
      setNotifications(res.data);
      const countRes = await api.get('/notifications/unread');
      setUnreadCount(countRes.data.unread_count || 0);
    } catch (e) {
      console.warn('Failed to fetch notifications:', e);
    }
  };

  useEffect(() => {
    fetchNotifications();
    const timer = setInterval(fetchNotifications, 10000);

    // WebSocket connection for real-time risk notification push
    let socket: WebSocket | null = null;
    try {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/ws/supervisor`;
      socket = new WebSocket(wsUrl);

      socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'risk.alert' && data.notification) {
            setNotifications((prev) => [data.notification, ...prev]);
            setUnreadCount((prev) => prev + 1);

            // Play audio alert
            if (soundEnabled) {
              try {
                const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.type = data.notification.severity === 'HIGH' ? 'sawtooth' : 'sine';
                osc.frequency.setValueAtTime(data.notification.severity === 'HIGH' ? 880 : 587.33, ctx.currentTime);
                gain.gain.setValueAtTime(0.3, ctx.currentTime);
                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.start();
                osc.stop(ctx.currentTime + 0.6);
              } catch (err) {
                console.warn('Audio play failed:', err);
              }
            }

            // Desktop notification
            if ('Notification' in window && Notification.permission === 'granted') {
              new Notification(data.notification.title, {
                body: data.notification.message,
                icon: '/favicon.ico'
              });
            }
          }
        } catch (err) {
          console.warn('Error parsing WS message:', err);
        }
      };
    } catch (err) {
      console.warn('WebSocket connection error:', err);
    }

    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }

    return () => {
      clearInterval(timer);
      if (socket) socket.close();
    };
  }, [soundEnabled]);

  const handleAcknowledge = async (id: number) => {
    try {
      await api.post(`/notifications/${id}/acknowledge`);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_acknowledged: true, is_read: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (e) {
      console.error('Acknowledge failed:', e);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await api.post('/notifications/mark-all-read');
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch (e) {
      console.error('Mark all read failed:', e);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans flex flex-col md:flex-row">
      {/* Mobile Header Bar */}
      <header className="md:hidden bg-slate-900 border-b border-slate-800 px-4 py-3 flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center space-x-2.5">
          <div className="w-7 h-7 rounded-lg bg-teal-500 flex items-center justify-center text-slate-950 font-black">
            <Activity className="w-4 h-4" />
          </div>
          <div>
            <h1 className="text-xs font-black tracking-wider text-white">SENTRIDOSE</h1>
            <p className="text-[9px] font-mono text-teal-400 uppercase tracking-widest font-extrabold">SUPERVISOR</p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {/* Mobile Bell Icon */}
          <button
            onClick={() => setNotificationsOpen(!notificationsOpen)}
            className="relative p-2 text-slate-400 hover:text-white rounded-lg bg-slate-800"
          >
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 px-1.5 py-0.5 bg-rose-600 text-white font-mono text-[9px] font-bold rounded-full animate-pulse">
                {unreadCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 text-slate-400 hover:text-white rounded-lg bg-slate-800"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </header>

      {/* Desktop Sidebar / Mobile Dropdown Overlay */}
      <aside
        className={`fixed md:sticky top-0 left-0 bottom-0 w-64 bg-slate-900 border-r border-slate-800 p-4 z-40 flex flex-col justify-between transition-transform duration-200 ${
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        <div className="space-y-6">
          {/* Brand & Panel Header */}
          <div className="hidden md:flex items-center justify-between px-2 pt-2">
            <div className="flex items-center space-x-3">
              <div className="w-9 h-9 rounded-xl bg-teal-500 flex items-center justify-center text-slate-950 font-black shadow-lg shadow-teal-500/20">
                <Activity className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-sm font-black tracking-wider text-white">SENTRIDOSE</h1>
                <div className="flex items-center space-x-1">
                  <ShieldCheck className="w-3 h-3 text-teal-400" />
                  <span className="text-[10px] font-mono text-teal-400 font-extrabold uppercase tracking-widest">
                    SUPERVISOR
                  </span>
                </div>
              </div>
            </div>

            {/* Notification Bell Button Desktop */}
            <button
              onClick={() => setNotificationsOpen(!notificationsOpen)}
              className="relative p-2 text-slate-400 hover:text-teal-300 rounded-xl bg-slate-800/80 border border-slate-700/60 hover:border-teal-500/50 transition"
              title="Notifications"
            >
              <Bell className="w-4 h-4" />
              {unreadCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 px-1.5 py-0.5 bg-rose-600 text-white font-mono text-[9px] font-bold rounded-full animate-bounce">
                  {unreadCount}
                </span>
              )}
            </button>
          </div>

          {/* Navigation Links */}
          <nav className="space-y-1 pt-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  onClick={() => setMobileMenuOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition ${
                      isActive
                        ? 'bg-teal-500/10 text-teal-300 border border-teal-500/30'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                    }`
                  }
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{item.label}</span>
                </NavLink>
              );
            })}

            {/* Notifications Navigation Link */}
            <button
              onClick={() => setNotificationsOpen(!notificationsOpen)}
              className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 transition"
            >
              <div className="flex items-center space-x-3">
                <Bell className="w-4 h-4 shrink-0 text-amber-400" />
                <span>Notifications</span>
              </div>
              {unreadCount > 0 && (
                <span className="px-2 py-0.5 bg-rose-600/20 text-rose-400 border border-rose-500/30 font-mono text-[10px] font-bold rounded-full">
                  {unreadCount} NEW
                </span>
              )}
            </button>
          </nav>
        </div>

        {/* Sidebar Footer & Logout */}
        <div className="pt-4 border-t border-slate-800 space-y-3">
          <div className="px-3.5 py-2 bg-slate-950/60 rounded-xl border border-slate-800 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-mono text-slate-500 block">AUTHENTICATED ROLE</span>
              <span className="text-xs font-bold text-slate-300">Supervisor Officer</span>
            </div>
            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              className="text-slate-400 hover:text-teal-400 p-1"
              title={soundEnabled ? 'Mute Sound Alerts' : 'Enable Sound Alerts'}
            >
              {soundEnabled ? <Volume2 className="w-4 h-4 text-teal-400" /> : <VolumeX className="w-4 h-4 text-slate-500" />}
            </button>
          </div>

          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center space-x-2 px-3.5 py-2.5 bg-slate-800 hover:bg-rose-950/50 hover:text-rose-400 text-slate-300 rounded-xl text-xs font-bold border border-slate-700 hover:border-rose-800/50 transition"
          >
            <LogOut className="w-4 h-4" />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* Real-Time Risk Notification Dropdown Drawer Modal */}
      {notificationsOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/70 backdrop-blur-xs">
          <div className="w-full max-w-md bg-slate-900 border-l border-slate-800 h-full flex flex-col shadow-2xl animate-in slide-in-from-right duration-200">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
              <div className="flex items-center space-x-2">
                <Bell className="w-5 h-5 text-amber-400" />
                <h2 className="text-sm font-black tracking-wider text-white">RISK NOTIFICATIONS</h2>
                {unreadCount > 0 && (
                  <span className="px-2 py-0.5 bg-rose-600 text-white font-mono text-[10px] font-bold rounded-full">
                    {unreadCount} UNREAD
                  </span>
                )}
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={handleMarkAllRead}
                  className="text-[11px] font-bold text-teal-400 hover:underline"
                >
                  Mark all read
                </button>
                <button
                  onClick={() => setNotificationsOpen(false)}
                  className="p-1.5 text-slate-400 hover:text-white rounded-lg bg-slate-800"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Notifications List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {notifications.length === 0 ? (
                <div className="py-12 text-center text-slate-500 text-xs font-mono">
                  No risk notifications recorded yet.
                </div>
              ) : (
                notifications.map((n) => (
                  <div
                    key={n.id}
                    className={`p-3.5 rounded-xl border transition ${
                      n.severity === 'HIGH'
                        ? 'bg-rose-950/20 border-rose-800/40 hover:border-rose-600'
                        : 'bg-amber-950/20 border-amber-800/40 hover:border-amber-600'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center space-x-2">
                        <AlertTriangle
                          className={`w-4 h-4 ${n.severity === 'HIGH' ? 'text-rose-400' : 'text-amber-400'}`}
                        />
                        <span
                          className={`text-xs font-black tracking-wide ${
                            n.severity === 'HIGH' ? 'text-rose-400' : 'text-amber-300'
                          }`}
                        >
                          {n.title}
                        </span>
                      </div>
                      <span className="text-[10px] font-mono text-slate-500">
                        {new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>

                    <p className="mt-1.5 text-xs text-slate-300 font-medium leading-relaxed">{n.message}</p>

                    <div className="mt-3 flex items-center justify-between pt-2 border-t border-slate-800/60 text-[11px]">
                      <div className="font-mono text-slate-400">
                        <span>{n.department_name}</span> &bull; <span>{n.zone_name}</span>
                      </div>

                      {n.is_acknowledged ? (
                        <span className="flex items-center space-x-1 text-emerald-400 font-bold">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>ACKNOWLEDGED</span>
                        </span>
                      ) : (
                        <button
                          onClick={() => handleAcknowledge(n.id)}
                          className="px-2.5 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-lg text-[10px] tracking-wider uppercase shadow transition"
                        >
                          [ ACKNOWLEDGE ]
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full overflow-x-hidden">
        <Outlet />
      </main>
    </div>
  );
};
