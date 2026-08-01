import React, { useState } from 'react';
import { Loader2, X, UserRound } from 'lucide-react';
import type { ProfileFormData } from '../../hooks/useEventRegistration';

interface ProfileCompletionModalProps {
  saving: boolean;
  error: string;
  onClose: () => void;
  onSubmit: (data: ProfileFormData) => void;
}

const inputClass =
  'w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-sm text-white placeholder-white/30 outline-none focus:border-violet-500/50 focus:ring-2 focus:ring-violet-500/20 transition-all';

const labelClass = 'text-[10px] font-bold uppercase tracking-widest text-white/40';

export const ProfileCompletionModal: React.FC<ProfileCompletionModalProps> = ({
  saving,
  error,
  onClose,
  onSubmit,
}) => {
  const [form, setForm] = useState<ProfileFormData>({
    phone: '',
    college: '',
    department: '',
    year_of_study: '',
  });
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const update = (key: keyof ProfileFormData, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setFieldErrors((prev) => ({ ...prev, [key]: '' }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const errors: Record<string, string> = {};
    if (!form.phone.trim()) errors.phone = 'Phone number is required.';
    if (!form.college.trim()) errors.college = 'College name is required.';
    if (!form.department.trim()) errors.department = 'Department is required.';
    if (!form.year_of_study) errors.year_of_study = 'Year of study is required.';
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;
    onSubmit(form);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={saving ? undefined : onClose} />
      <div className="relative w-full max-w-md rounded-3xl border border-white/10 bg-[#120F17] p-6 shadow-2xl shadow-violet-500/10">
        <div className="flex items-start justify-between gap-4 mb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-violet-500/15 border border-violet-500/30 flex items-center justify-center">
              <UserRound className="w-5 h-5 text-violet-300" />
            </div>
            <div className="flex flex-col">
              <h2 className="text-base font-extrabold font-display text-white">Complete Your Profile</h2>
              <p className="text-[11px] text-white/50">A few details before you register for this event.</p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={saving}
            className="text-white/40 hover:text-white transition-colors cursor-pointer disabled:opacity-40"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className={labelClass}>Phone Number</label>
            <input
              type="tel"
              value={form.phone}
              onChange={(e) => update('phone', e.target.value)}
              placeholder="+91 98765 43210"
              className={inputClass}
            />
            {fieldErrors.phone && <span className="text-[11px] text-rose-400">{fieldErrors.phone}</span>}
          </div>

          <div className="flex flex-col gap-1.5">
            <label className={labelClass}>College / Institution</label>
            <input
              type="text"
              value={form.college}
              onChange={(e) => update('college', e.target.value)}
              placeholder="College name"
              className={inputClass}
            />
            {fieldErrors.college && <span className="text-[11px] text-rose-400">{fieldErrors.college}</span>}
          </div>

          <div className="flex flex-col gap-1.5">
            <label className={labelClass}>Department</label>
            <input
              type="text"
              value={form.department}
              onChange={(e) => update('department', e.target.value)}
              placeholder="e.g. Computer Science"
              className={inputClass}
            />
            {fieldErrors.department && <span className="text-[11px] text-rose-400">{fieldErrors.department}</span>}
          </div>

          <div className="flex flex-col gap-1.5">
            <label className={labelClass}>Year of Study</label>
            <select
              value={form.year_of_study}
              onChange={(e) => update('year_of_study', e.target.value)}
              className={`${inputClass} appearance-none`}
            >
              <option value="" className="bg-black">
                Select year
              </option>
              <option value="1" className="bg-black">1st Year</option>
              <option value="2" className="bg-black">2nd Year</option>
              <option value="3" className="bg-black">3rd Year</option>
              <option value="4" className="bg-black">4th Year</option>
              <option value="Other" className="bg-black">Other</option>
            </select>
            {fieldErrors.year_of_study && <span className="text-[11px] text-rose-400">{fieldErrors.year_of_study}</span>}
          </div>

          {error && <p className="text-xs text-rose-400">{error}</p>}

          <button
            type="submit"
            disabled={saving}
            className="mt-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white text-xs font-bold shadow-lg shadow-violet-500/25 transition-colors cursor-pointer disabled:cursor-not-allowed"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserRound className="w-4 h-4" />}
            Save & Register
          </button>
        </form>
      </div>
    </div>
  );
};

export default ProfileCompletionModal;
