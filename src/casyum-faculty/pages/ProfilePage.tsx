import React from 'react';
import { UserCircle2, Mail, Building2, Phone, ShieldCheck, KeyRound } from 'lucide-react';
import { useCasyumFaculty } from '../context/CasyumFacultyContext';

export const ProfilePage: React.FC = () => {
  const { user, registrations } = useCasyumFaculty();

  if (!user) {
    return (
      <div className="max-w-7xl mx-auto px-6 py-8 text-xs text-white/50">
        No profile information available.
      </div>
    );
  }

  const approved = registrations.filter((r) => r.paymentStatus === 'verified').length;

  const items = [
    { icon: UserCircle2, label: 'Full Name', value: user.name || '—' },
    { icon: Mail, label: 'Email Address', value: user.email || '—' },
    { icon: Building2, label: 'Department', value: user.department || '—' },
    { icon: Phone, label: 'Phone Number', value: user.phone || '—' },
  ];

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col gap-6 select-none pb-16">
      <div className="flex flex-col gap-1.5">
        <span className="text-xs font-bold text-violet-400 uppercase tracking-widest">Account</span>
        <h2 className="text-xl sm:text-2xl font-extrabold font-display text-white">My Profile</h2>
      </div>

      <div className="rounded-3xl bg-zinc-950/60 border border-white/10 backdrop-blur-md overflow-hidden shadow-2xl">
        <div className="p-6 flex items-center gap-4 border-b border-white/10 bg-gradient-to-r from-violet-500/10 via-transparent to-transparent">
          <div className="w-16 h-16 rounded-2xl bg-violet-500/20 border border-violet-500/30 flex items-center justify-center">
            <ShieldCheck className="w-8 h-8 text-violet-300" />
          </div>
          <div className="flex flex-col">
            <span className="text-lg font-extrabold font-display text-white">{user.name || 'CASYUM Faculty Manager'}</span>
            <span className="text-[11px] font-bold text-violet-300 uppercase tracking-widest flex items-center gap-1.5">
              <KeyRound className="w-3 h-3" /> CASYUM Faculty Manager
            </span>
          </div>
        </div>

        <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
          {items.map((item) => (
            <div key={item.label} className="flex items-center gap-3 p-4 rounded-2xl bg-white/[0.03] border border-white/10">
              <div className="w-9 h-9 rounded-xl bg-violet-500/15 border border-violet-500/25 flex items-center justify-center shrink-0">
                <item.icon className="w-4 h-4 text-violet-300" />
              </div>
              <div className="flex flex-col gap-0.5 min-w-0">
                <span className="text-[10px] font-semibold text-white/40 uppercase tracking-wider">{item.label}</span>
                <span className="text-xs font-bold text-white truncate">{item.value}</span>
              </div>
            </div>
          ))}
        </div>

        <div className="px-6 pb-6 flex flex-wrap gap-4">
          <div className="flex-1 min-w-[200px] p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/25 flex flex-col gap-1">
            <span className="text-[10px] font-semibold text-emerald-300/70 uppercase tracking-wider">Payments Verified</span>
            <span className="text-xl font-extrabold text-white font-display">{approved}</span>
          </div>
          <div className="flex-1 min-w-[200px] p-4 rounded-2xl bg-violet-500/10 border border-violet-500/25 flex flex-col gap-1">
            <span className="text-[10px] font-semibold text-violet-300/70 uppercase tracking-wider">Your Role</span>
            <span className="text-xl font-extrabold text-white font-display">Faculty Manager</span>
          </div>
        </div>
      </div>
    </div>
  );
};
