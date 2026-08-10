import React from 'react';
import { Mail, Phone, BadgeCheck, Sparkles } from 'lucide-react';
import { useSponsorshipHead } from '../context/SponsorshipHeadContext';

export const ProfilePage: React.FC = () => {
  const { user, settings } = useSponsorshipHead();

  if (!user) return null;

  const rows = [
    { label: 'Full Name', value: user.name },
    { label: 'Designation', value: user.designation || 'Sponsorship Head' },
    { label: 'Email', value: user.email },
    { label: 'Phone', value: user.phone || '—' },
  ];

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col gap-6 select-none pb-16">
      <div className="flex flex-col gap-1">
        <span className="text-xs font-bold text-violet-400 uppercase tracking-widest">Account</span>
        <h1 className="text-xl sm:text-2xl font-extrabold font-display text-white">Profile</h1>
      </div>

      <div className="rounded-3xl bg-zinc-950/60 border border-white/10 backdrop-blur-md overflow-hidden shadow-2xl">
        <div className="p-6 flex items-center gap-4 border-b border-white/10 bg-gradient-to-r from-violet-600/10 to-transparent">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-violet-600 to-fuchsia-500 p-[2px] shadow-[0_0_20px_rgba(139,92,246,0.35)]">
            <div className="w-full h-full bg-black rounded-[14px] flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-violet-400" />
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-base font-extrabold font-display text-white">{user.name}</span>
            <span className="flex items-center gap-1.5 text-[11px] text-violet-300">
              <BadgeCheck className="w-3.5 h-3.5" /> Sponsorship Head
            </span>
          </div>
        </div>

        <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
          {rows.map((r) => (
            <div key={r.label} className="flex flex-col gap-1 rounded-xl bg-white/[0.03] border border-white/10 p-4">
              <span className="text-[10px] font-bold uppercase tracking-widest text-white/50">{r.label}</span>
              <span className="text-sm font-semibold text-white">{r.value}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4 flex flex-col gap-3">
        <span className="text-[10px] font-bold uppercase tracking-widest text-white/50">Contact Links</span>
        <div className="flex flex-wrap gap-2">
          {user.email && (
            <a href={`mailto:${user.email}`} className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white/70 hover:text-white text-[11px] font-bold cursor-pointer">
              <Mail className="w-3.5 h-3.5 text-violet-300" /> {user.email}
            </a>
          )}
          {user.phone && (
            <a href={`tel:${user.phone}`} className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white/70 hover:text-white text-[11px] font-bold cursor-pointer">
              <Phone className="w-3.5 h-3.5 text-emerald-300" /> {user.phone}
            </a>
          )}
        </div>
      </div>

      {settings?.sponsorshipHead?.showContactPublicly && (
        <p className="text-[10px] text-white/30">
          Your public contact is visible on the website "Looking for Sponsors" section as configured by the Super Admin.
        </p>
      )}
    </div>
  );
};

export default ProfilePage;
