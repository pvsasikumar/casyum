import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Lock, Eye, EyeOff, CheckCircle2, XCircle, Sparkles, ShieldCheck } from 'lucide-react';
import { api } from '../../services/api';
import { useRBAC } from '../../rbac/context/RBACContext';

const ROLE_PATHS: Record<string, string> = {
  'Super Admin': '/admin/dashboard',
  'Admin': '/admin/dashboard',
  'Event Coordinator': '/admin/coordinator/dashboard',
  'Coordinator': '/admin/coordinator/dashboard',
  'Event Coordinator (Student)': '/admin/coordinator/dashboard',
  'Event Coordinator (Faculty)': '/admin/coordinator/dashboard',
  'Registration Manager': '/admin/dashboard',
  'Certificate Manager': '/admin/dashboard',
  'Finance Manager': '/admin/dashboard',
  'Participant': '/participant/dashboard',
};

export const CreatePassword: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useRBAC();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [serverError, setServerError] = useState('');

  const strengthChecks = {
    minLength: newPassword.length >= 8,
    hasUpper: /[A-Z]/.test(newPassword),
    hasLower: /[a-z]/.test(newPassword),
    hasNumber: /[0-9]/.test(newPassword),
    hasSpecial: /[!@#$%^&*()_+\-={}[\]\\|;':",.<>/?]/.test(newPassword),
  };

  const strengthScore = Object.values(strengthChecks).filter(Boolean).length;
  const strengthLabel = strengthScore <= 1 ? 'Weak' : strengthScore <= 3 ? 'Medium' : 'Strong';
  const strengthColor = strengthScore <= 1 ? 'bg-rose-500' : strengthScore <= 3 ? 'bg-amber-500' : 'bg-emerald-500';
  const strengthTextColor = strengthScore <= 1 ? 'text-rose-400' : strengthScore <= 3 ? 'text-amber-400' : 'text-emerald-400';

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!currentPassword) {
      newErrors.currentPassword = 'Current password is required';
    }
    if (!newPassword) {
      newErrors.newPassword = 'New password is required';
    } else if (newPassword.length < 8) {
      newErrors.newPassword = 'Minimum 8 characters required';
    } else if (!strengthChecks.hasUpper) {
      newErrors.newPassword = 'Must contain an uppercase letter';
    } else if (!strengthChecks.hasLower) {
      newErrors.newPassword = 'Must contain a lowercase letter';
    } else if (!strengthChecks.hasNumber) {
      newErrors.newPassword = 'Must contain a number';
    } else if (!strengthChecks.hasSpecial) {
      newErrors.newPassword = 'Must contain a special character';
    }
    if (!confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (confirmPassword !== newPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError('');
    if (!validate()) return;

    setIsLoading(true);
    try {
      await api.changePassword(currentPassword, newPassword, confirmPassword);
      setIsSuccess(true);
      setTimeout(() => {
        const path = ROLE_PATHS[user?.role || ''] || '/admin/dashboard';
        navigate(path, { replace: true });
      }, 2000);
    } catch (err) {
      setServerError(err instanceof Error ? err.message : 'Failed to change password');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } finally {
      setIsLoading(false);
    }
  };

  const inputClass = (field: string) =>
    `w-full p-3 pl-10 pr-10 rounded-xl bg-white/5 border text-sm text-white focus:outline-none focus:border-violet-500/50 transition-all ${
      errors[field] ? 'border-rose-500/50' : 'border-white/10'
    }`;

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4 selection:bg-violet-500/30 selection:text-violet-200">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-violet-600/10 rounded-full blur-3xl pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative w-full max-w-lg bg-zinc-950/90 border border-white/15 rounded-3xl p-8 shadow-[0_0_50px_rgba(139,92,246,0.2)]"
      >
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-violet-600 to-cyan-400 p-[1px] shadow-[0_0_15px_rgba(139,92,246,0.4)]">
            <div className="w-full h-full bg-black rounded-[15px] flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-violet-400" />
            </div>
          </div>
          <div className="flex flex-col">
            <h3 className="text-lg font-bold font-display text-white tracking-tight">
              CASYUM <span className="text-violet-400">Security</span>
            </h3>
            <span className="text-[10px] text-white/40 tracking-widest uppercase">
              First Login - Create New Password
            </span>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 mb-6">
          <p className="text-xs text-amber-300">
            Welcome! Since this is your first login, you must create a new password before accessing the dashboard.
          </p>
        </div>

        {isSuccess && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center gap-3 mb-6"
          >
            <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
            <div>
              <span className="text-sm font-bold text-emerald-300">Password changed successfully!</span>
              <span className="text-xs text-emerald-400/80 block mt-1">Redirecting to your dashboard...</span>
            </div>
          </motion.div>
        )}

        {!isSuccess && (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {serverError && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs"
              >
                <XCircle className="w-3.5 h-3.5 flex-shrink-0" />
                <span>{serverError}</span>
              </motion.div>
            )}

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-white/50">Current Password (Temporary)</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                <input
                  type={showCurrent ? 'text' : 'password'}
                  value={currentPassword}
                  onChange={(e) => { setCurrentPassword(e.target.value); setServerError(''); }}
                  placeholder="Enter your temporary password"
                  disabled={isLoading}
                  className={inputClass('currentPassword')}
                />
                <button
                  type="button"
                  onClick={() => setShowCurrent(!showCurrent)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 cursor-pointer"
                >
                  {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.currentPassword && (
                <span className="text-[10px] text-rose-400">{errors.currentPassword}</span>
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-white/50">New Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                <input
                  type={showNew ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => { setNewPassword(e.target.value); setServerError(''); }}
                  placeholder="Create a strong password"
                  disabled={isLoading}
                  className={inputClass('newPassword')}
                />
                <button
                  type="button"
                  onClick={() => setShowNew(!showNew)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 cursor-pointer"
                >
                  {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.newPassword && (
                <span className="text-[10px] text-rose-400">{errors.newPassword}</span>
              )}

              {newPassword.length > 0 && (
                <div className="flex flex-col gap-1.5 mt-1">
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1.5 rounded-full bg-white/10 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${strengthColor}`}
                        style={{ width: `${(strengthScore / 5) * 100}%` }}
                      />
                    </div>
                    <span className={`text-[10px] font-bold ${strengthTextColor}`}>
                      {strengthLabel}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                    <RequirementCheck met={strengthChecks.minLength} label="Min 8 characters" />
                    <RequirementCheck met={strengthChecks.hasUpper} label="Uppercase letter" />
                    <RequirementCheck met={strengthChecks.hasLower} label="Lowercase letter" />
                    <RequirementCheck met={strengthChecks.hasNumber} label="Number" />
                    <RequirementCheck met={strengthChecks.hasSpecial} label="Special character" />
                  </div>
                </div>
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-white/50">Confirm New Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                <input
                  type={showConfirm ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => { setConfirmPassword(e.target.value); setServerError(''); }}
                  placeholder="Confirm your new password"
                  disabled={isLoading}
                  className={inputClass('confirmPassword')}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(!showConfirm)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 cursor-pointer"
                >
                  {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.confirmPassword && (
                <span className="text-[10px] text-rose-400">{errors.confirmPassword}</span>
              )}
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3.5 mt-2 bg-gradient-to-r from-violet-500 to-indigo-600 hover:from-violet-600 hover:to-indigo-700 text-white rounded-xl font-bold uppercase tracking-widest text-xs transition-all duration-300 shadow-lg shadow-violet-500/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer"
            >
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Updating Password...
                </span>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4" />
                  Create New Password
                </>
              )}
            </button>
          </form>
        )}
      </motion.div>
    </div>
  );
};

const RequirementCheck: React.FC<{ met: boolean; label: string }> = ({ met, label }) => (
  <div className="flex items-center gap-1.5">
    {met ? (
      <CheckCircle2 className="w-3 h-3 text-emerald-400" />
    ) : (
      <XCircle className="w-3 h-3 text-white/30" />
    )}
    <span className={`text-[10px] ${met ? 'text-emerald-400' : 'text-white/40'}`}>{label}</span>
  </div>
);