import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Lock,
  Eye,
  EyeOff,
  CheckCircle2,
  XCircle,
  ArrowLeft,
  Loader2,
} from 'lucide-react';
import { api } from '../../services/api';

export const ChangePassword: React.FC = () => {
  const navigate = useNavigate();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
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
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setErrors({});
      setIsSubmitted(true);
    } catch (err) {
      setServerError(err instanceof Error ? err.message : 'Failed to change password');
    } finally {
      setIsLoading(false);
    }
  };

  const inputClass = (field: string) =>
    `w-full p-3 pl-10 pr-10 rounded-xl bg-white/5 border text-sm text-white focus:outline-none focus:border-violet-500/50 transition-all ${
      errors[field] ? 'border-rose-500/50' : 'border-white/10'
    }`;

  return (
    <div className="flex flex-col gap-6 select-none pb-12 max-w-2xl mx-auto">
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/admin')}
          className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/60 hover:text-white transition-all cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="flex flex-col">
          <span className="text-xs font-bold text-violet-400 uppercase tracking-widest">
            Security
          </span>
          <h2 className="text-xl sm:text-2xl font-extrabold font-display text-white">
            Change Password
          </h2>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="p-6 rounded-3xl bg-zinc-950/60 border border-white/10 backdrop-blur-md flex flex-col gap-5">
        {isSubmitted && (
          <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
            <span className="text-sm text-emerald-300">Password changed successfully.</span>
          </div>
        )}

        {serverError && (
          <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center gap-3">
            <XCircle className="w-5 h-5 text-rose-400 flex-shrink-0" />
            <span className="text-sm text-rose-300">{serverError}</span>
          </div>
        )}

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-bold text-white/50">Current Password</label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
            <input
              type={showCurrent ? 'text' : 'password'}
              value={currentPassword}
              onChange={(e) => { setCurrentPassword(e.target.value); setIsSubmitted(false); setServerError(''); }}
              placeholder="Enter current password"
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
              onChange={(e) => { setNewPassword(e.target.value); setIsSubmitted(false); setServerError(''); }}
              placeholder="Enter new password"
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
          <label className="text-xs font-bold text-white/50">Confirm Password</label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
            <input
              type={showConfirm ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e) => { setConfirmPassword(e.target.value); setIsSubmitted(false); setServerError(''); }}
              placeholder="Confirm new password"
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
          className="w-full py-3 mt-2 bg-gradient-to-r from-violet-500 to-indigo-600 hover:from-violet-600 hover:to-indigo-700 text-white rounded-xl font-bold uppercase tracking-widest text-xs transition-all duration-300 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {isLoading ? (
            <><Loader2 className="w-4 h-4 animate-spin" /> Updating Password...</>
          ) : (
            'Update Password'
          )}
        </button>
      </form>
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