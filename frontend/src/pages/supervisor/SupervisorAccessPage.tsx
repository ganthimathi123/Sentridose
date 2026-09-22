import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supervisorService } from '../../services/api';
import { ShieldCheck, Lock, Mail, AlertCircle, ArrowRight, Activity } from 'lucide-react';

export const SupervisorAccessPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setError('PLEASE ENTER BOTH EMAIL AND PASSWORD');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const res = await supervisorService.login({
        email: email.trim(),
        password: password.trim(),
      });
      localStorage.setItem('sentridose_supervisor_token', res.access_token);
      localStorage.setItem('sentridose_supervisor_user', JSON.stringify(res.user));
      navigate('/supervisor/dashboard');
    } catch (err: any) {
      console.error('Supervisor Login Error:', err);
      if (err.response?.data?.detail) {
        setError(err.response.data.detail);
      } else {
        setError('INVALID EMAIL OR PASSWORD — Access denied.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white font-sans flex flex-col justify-between p-4 sm:p-6">
      {/* Top Brand Bar */}
      <header className="max-w-md mx-auto w-full flex items-center justify-between py-2">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 rounded-xl bg-teal-500 flex items-center justify-center text-slate-950 font-black shadow-lg shadow-teal-500/20">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-sm font-black tracking-wider text-white">SENTRIDOSE</h1>
            <p className="text-[10px] font-mono text-teal-400 font-extrabold uppercase tracking-widest">
              SUPERVISOR SYSTEM
            </p>
          </div>
        </div>
        <span className="text-[10px] font-mono bg-slate-900 text-slate-400 border border-slate-800 px-2.5 py-1 rounded-full">
          JWT AUTH
        </span>
      </header>

      {/* Main Form Container */}
      <main className="max-w-md mx-auto w-full my-auto space-y-6">
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6 backdrop-blur-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-teal-500/5 rounded-full blur-3xl pointer-events-none"></div>

          {/* Title & Icon Header */}
          <div className="text-center space-y-2">
            <div className="w-14 h-14 bg-slate-800 border border-slate-700 rounded-2xl flex items-center justify-center mx-auto text-teal-400 shadow-inner">
              <ShieldCheck className="w-7 h-7" />
            </div>
            <h2 className="text-xl font-black tracking-wide text-white">SUPERVISOR LOGIN</h2>
            <p className="text-xs text-slate-400 font-medium">
              Log in with your supervisor email and password to manage workforce & workers.
            </p>
          </div>

          {/* Error Message Alert */}
          {error && (
            <div className="p-4 bg-rose-950/80 border border-rose-500/50 rounded-2xl text-rose-200 text-xs font-bold flex items-start space-x-2.5 animate-shake">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[11px] font-mono font-bold uppercase tracking-wider text-slate-400">
                Email
              </label>
              <div className="relative">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="supervisor@sentridose.com"
                  className="w-full bg-slate-950 border border-slate-800 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 text-white rounded-xl px-4 py-3.5 pl-10 text-sm font-mono outline-none transition placeholder:text-slate-600"
                />
                <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-4" />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-mono font-bold uppercase tracking-wider text-slate-400">
                Password
              </label>
              <div className="relative">
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full bg-slate-950 border border-slate-800 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 text-white rounded-xl px-4 py-3.5 pl-10 text-sm font-mono tracking-widest outline-none transition placeholder:text-slate-600"
                />
                <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-4" />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-teal-500 hover:bg-teal-400 text-slate-950 font-black py-4 px-6 rounded-xl shadow-lg shadow-teal-500/10 transition text-sm flex items-center justify-center space-x-2 disabled:opacity-50"
            >
              <span>LOGIN</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Demo Hint */}
          <div className="p-3 bg-slate-950/80 rounded-2xl border border-slate-800/80 text-center text-[11px] font-mono text-slate-400 space-y-1">
            <div>SUPERVISOR EMAIL: <span className="text-teal-400 font-bold">supervisor@sentridose.com</span></div>
            <div>PASSWORD: <span className="text-teal-400 font-bold">Supervisor2026!</span></div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="max-w-md mx-auto w-full text-center text-[11px] font-mono text-slate-600 py-2">
        SENTRIDOSE — Single Supervisor System
      </footer>
    </div>
  );
};
