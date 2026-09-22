import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supervisorService } from '../../services/api';
import { ShieldCheck, User, Mail, Lock, AlertCircle, ArrowRight, Activity, CheckCircle } from 'lucide-react';

export const SupervisorRegisterPage: React.FC = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasSupervisor, setHasSupervisor] = useState<boolean | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    supervisorService.checkHasSupervisor()
      .then((res) => setHasSupervisor(res.has_supervisor))
      .catch((err) => console.error('Error checking supervisor exist:', err));
  }, []);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !password.trim() || !confirmPassword.trim()) {
      setError('PLEASE FILL IN ALL REGISTRATION FIELDS');
      return;
    }

    if (password !== confirmPassword) {
      setError('PASSWORDS DO NOT MATCH — Please verify passwords');
      return;
    }

    if (password.length < 6) {
      setError('PASSWORD MUST BE AT LEAST 6 CHARACTERS LONG');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const res = await supervisorService.register({
        name: name.trim(),
        email: email.trim(),
        password: password.trim(),
        confirm_password: confirmPassword.trim(),
      });

      localStorage.setItem('sentridose_supervisor_token', res.access_token);
      localStorage.setItem('sentridose_supervisor_user', JSON.stringify(res.user));
      navigate('/supervisor/dashboard');
    } catch (err: any) {
      console.error('Supervisor Registration Error:', err);
      if (err.response?.data?.detail) {
        setError(err.response.data.detail);
      } else {
        setError('REGISTRATION FAILED — Please check inputs and try again.');
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
              SUPERVISOR REGISTRATION
            </p>
          </div>
        </div>
        <span className="text-[10px] font-mono bg-slate-900 text-slate-400 border border-slate-800 px-2.5 py-1 rounded-full">
          SYSTEM SETUP
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
            <h2 className="text-xl font-black tracking-wide text-white">FIRST-TIME SUPERVISOR SETUP</h2>
            <p className="text-xs text-slate-400 font-medium">
              Create the primary administrator Supervisor account for SentriDose.
            </p>
          </div>

          {/* If Supervisor already exists, show Alert */}
          {hasSupervisor === true && (
            <div className="p-4 bg-amber-950/80 border border-amber-500/50 rounded-2xl text-amber-200 text-xs space-y-2">
              <div className="flex items-center space-x-2 font-bold text-amber-400">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>SUPERVISOR ACCOUNT ALREADY EXISTS</span>
              </div>
              <p className="text-[11px] text-amber-200/80">
                Only ONE Supervisor account is allowed. Please log in with the existing supervisor account.
              </p>
              <Link
                to="/supervisor"
                className="inline-block mt-1 text-xs font-bold text-teal-400 hover:underline"
              >
                ← Return to Supervisor Login
              </Link>
            </div>
          )}

          {/* Error Message Alert */}
          {error && (
            <div className="p-4 bg-rose-950/80 border border-rose-500/50 rounded-2xl text-rose-200 text-xs font-bold flex items-start space-x-2.5 animate-shake">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Registration Form */}
          <form onSubmit={handleRegister} className="space-y-3.5">
            <div className="space-y-1">
              <label className="text-[11px] font-mono font-bold uppercase tracking-wider text-slate-400">
                Full Name
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Safety Administrator"
                  disabled={hasSupervisor === true}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 text-white rounded-xl px-4 py-3 pl-10 text-xs font-medium outline-none transition disabled:opacity-50"
                />
                <User className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-mono font-bold uppercase tracking-wider text-slate-400">
                Supervisor Email
              </label>
              <div className="relative">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="supervisor@sentridose.com"
                  disabled={hasSupervisor === true}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 text-white rounded-xl px-4 py-3 pl-10 text-xs font-mono outline-none transition disabled:opacity-50"
                />
                <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-mono font-bold uppercase tracking-wider text-slate-400">
                Password
              </label>
              <div className="relative">
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  disabled={hasSupervisor === true}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 text-white rounded-xl px-4 py-3 pl-10 text-xs font-mono tracking-widest outline-none transition disabled:opacity-50"
                />
                <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-mono font-bold uppercase tracking-wider text-slate-400">
                Confirm Password
              </label>
              <div className="relative">
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••••••"
                  disabled={hasSupervisor === true}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 text-white rounded-xl px-4 py-3 pl-10 text-xs font-mono tracking-widest outline-none transition disabled:opacity-50"
                />
                <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting || hasSupervisor === true}
              className="w-full bg-teal-500 hover:bg-teal-400 text-slate-950 font-black py-3.5 px-6 rounded-xl shadow-lg shadow-teal-500/10 transition text-xs flex items-center justify-center space-x-2 disabled:opacity-50 mt-2"
            >
              <span>REGISTER SUPERVISOR ACCOUNT</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Login Navigation Link */}
          <div className="text-center pt-2 border-t border-slate-800/80">
            <Link to="/supervisor" className="text-xs font-bold text-slate-400 hover:text-teal-400 transition">
              Already have a Supervisor account? <span className="text-teal-400 underline">Log in here</span>
            </Link>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="max-w-md mx-auto w-full text-center text-[11px] font-mono text-slate-600 py-2">
        SENTRIDOSE — Single Supervisor Setup & Authentication
      </footer>
    </div>
  );
};
