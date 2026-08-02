import React from 'react';
import { Mail, Phone, Building2, User } from 'lucide-react';
import { useRegistrationTeam } from '../context/RegistrationTeamContext';

export const ProfilePage: React.FC = () => {
  const { user } = useRegistrationTeam();
  if (!user) return null;

  return (
    <div className="min-h-screen bg-black text-white selection:bg-violet-500/30 selection:text-violet-200">
      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-2xl sm:text-3xl font-extrabold font-display text-white mb-6">My Profile</h1>
        <div className="rounded-3xl bg-zinc-950/60 border border-white/10 backdrop-blur-md overflow-hidden">
          <div className="p-6 border-b border-white/10 flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-violet-600 to-indigo-500 p-[1px]">
              <div className="w-full h-full bg-zinc-950 rounded-[15px] flex items-center justify-center text-lg font-bold text-violet-300">
                {user.name.split(' ').map((n) => n[0]).join('').slice(0, 2)}
              </div>
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="text-lg font-extrabold font-display text-white">{user.name}</span>
              <span className="text-xs text-violet-400 font-bold">Registration Team</span>
            </div>
          </div>
          <div className="p-6 flex flex-col gap-4 text-sm">
            <div className="flex items-center gap-3">
              <User className="w-4 h-4 text-white/40" />
              <span className="text-white/40 w-28 shrink-0">Member ID</span>
              <span className="text-white/80 font-mono">{user.id}</span>
            </div>
            <div className="flex items-center gap-3">
              <Mail className="w-4 h-4 text-white/40" />
              <span className="text-white/40 w-28 shrink-0">Email</span>
              <span className="text-white/80">{user.email}</span>
            </div>
            <div className="flex items-center gap-3">
              <Phone className="w-4 h-4 text-white/40" />
              <span className="text-white/40 w-28 shrink-0">Phone</span>
              <span className="text-white/80">{user.phone || '—'}</span>
            </div>
            <div className="flex items-center gap-3">
              <Building2 className="w-4 h-4 text-white/40" />
              <span className="text-white/40 w-28 shrink-0">Department</span>
              <span className="text-white/80">{user.department || '—'}</span>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};
