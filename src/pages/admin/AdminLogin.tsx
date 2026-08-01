import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Sparkles, Lock, Eye, EyeOff, Loader2, AlertCircle, ShieldCheck, Mail, ArrowLeft } from 'lucide-react';
import { useRBAC } from '../../rbac/context/RBACContext';
import { api } from '../../services/api';
import { signOut } from '../../services/authService';
import { ADMIN_PORTAL_ROLES } from '../../rbac/constants';
import type { UserRole } from '../../rbac/types';

function dashboardPathFor(role: string): string {
  return role === 'Super Admin' ? '/admin/dashboard' : '/admin/coordinator/dashboard';
}

export const AdminLogin: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, setFirstLogin, isAuthenticated, role, isLoading: rbacLoading } = useRBAC();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(() => {
    const state = (location.state as { unauthorized?: boolean }) || {};
    return state.unauthorized
      ? 'Unauthorized Access. This portal is restricted to authorized staff only.'
      : '';
  });

  useEffect(() => {
    if (rbacLoading) return;
    if (isAuthenticated && role) {
      if (ADMIN_PORTAL_ROLES.includes(role)) {
        const target = dashboardPathFor(role);
        if (location.pathname !== target && location.pathname !== '/create-password') {
          navigate(target, { replace: true });
        }
      } else {
        setError('Unauthorized Access. This portal is restricted to authorized staff only.');
      }
    }
  }, [rbacLoading, isAuthenticated, role, location.pathname, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const trimmedEmail = email.trim();
    const trimmedPassword = password.trim();
    if (!trimmedEmail) {
      setError('Please enter your email address.');
      return;
    }
    if (!trimmedPassword) {
      setError('Please enter your password.');
      return;
    }

    setIsLoading(true);
    try {
      const result = await api.employeeLogin(trimmedEmail, trimmedPassword);
      const userRole = result.user.role as UserRole;

      if (!ADMIN_PORTAL_ROLES.includes(userRole)) {
        await signOut();
        setPassword('');
        setError('Unauthorized Access. Only Super Admin and Event Coordinators may access this portal.');
        return;
      }

      login({
        id: result.user.id || `user-${Date.now()}`,
        name: result.user.name,
        email: result.user.email || trimmedEmail,
        role: userRole,
        token: result.token,
        department: result.user.department,
        phone: result.user.phone,
        is_first_login: result.is_first_login === true,
      });

      setFirstLogin(result.is_first_login === true);
      setPassword('');
      setError('');

      if (result.is_first_login) {
        navigate('/create-password', { replace: true });
      } else {
        navigate(dashboardPathFor(userRole), { replace: true });
      }
    } catch (err) {
      setPassword('');
      setError(err instanceof Error ? err.message : 'Login failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center p-4 selection:bg-violet-500/30 selection:text-violet-200">
      <div className="absolute top-0 right-0 w-96 h-96 bg-violet-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-cyan-600/10 rounded-full blur-3xl pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 25 }}
        className="relative w-full max-w-md bg-zinc-950/90 border border-white/15 rounded-3xl p-6 sm:p-8 shadow-[0_0_50px_rgba(139,92,246,0.2)] overflow-hidden"
      >
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-1.5 text-white/50 hover:text-white text-xs transition-colors mb-6 cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Home</span>
        </button>

        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-violet-600 to-cyan-400 p-[1px] shadow-[0_0_15px_rgba(139,92,246,0.4)]">
            <div className="w-full h-full bg-black rounded-[15px] flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-violet-400" />
            </div>
          </div>
          <div className="flex flex-col">
            <h3 className="text-lg font-bold font-display text-white tracking-tight">
              CASYUM <span className="text-violet-400">Admin</span>
            </h3>
            <span className="text-[10px] text-white/40 tracking-widest uppercase">
              Admin Portal Sign In
            </span>
          </div>
        </div>

        <div className="flex flex-wrap gap-1.5 mb-5">
          {['Super Admin', 'Event Coordinator (Student)', 'Event Coordinator (Faculty)'].map((label) => (
            <span key={label} className="px-2 py-0.5 rounded-md bg-violet-500/10 border border-violet-500/20 text-[9px] text-violet-300/70 font-medium">
              {label}
            </span>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold text-white/50 uppercase tracking-wider">
              Email Address
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-white/40 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="email"
                value={email}
                onChange={(e) => { setEmail(e.target.value); if (error) setError(''); }}
                placeholder="admin@casyum.edu"
                autoComplete="email"
                disabled={isLoading}
                className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-xs text-white placeholder-white/30 focus:outline-none focus:border-violet-500/50 disabled:opacity-50"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold text-white/50 uppercase tracking-wider">
              Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-white/40 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => { setPassword(e.target.value); if (error) setError(''); }}
                placeholder="Enter your password"
                autoComplete="current-password"
                disabled={isLoading}
                className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-10 py-3 text-xs text-white placeholder-white/30 focus:outline-none focus:border-violet-500/50 disabled:opacity-50"
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70 transition-colors cursor-pointer"
                tabIndex={-1}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="flex items-center justify-end">
            <button
              type="button"
              onClick={() => navigate('/forgot-password')}
              className="text-[10px] text-violet-400 hover:text-violet-300 font-bold transition-colors cursor-pointer"
            >
              Forgot Password?
            </button>
          </div>

          {error && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs"
            >
              <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
              <span>{error}</span>
            </motion.div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3.5 mt-1 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-bold text-xs uppercase tracking-widest transition-all shadow-lg shadow-violet-500/25 cursor-pointer flex items-center justify-center gap-2 group disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Authenticating...</span>
              </>
            ) : (
              <>
                <ShieldCheck className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                <span>Sign In</span>
              </>
            )}
          </button>

          <div className="flex items-center gap-3 mt-1">
            <div className="h-px flex-1 bg-white/10" />
            <span className="text-[9px] text-white/30 uppercase tracking-widest text-center">
              Authorized staff only
            </span>
            <div className="h-px flex-1 bg-white/10" />
          </div>
        </form>
      </motion.div>
    </div>
  );
};
