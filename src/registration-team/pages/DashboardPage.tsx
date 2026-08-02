import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Users,
  Clock,
  BadgeCheck,
  XCircle,
  ScanLine,
  History,
  CheckCircle2,
  ShieldCheck,
} from 'lucide-react';
import { useRegistrationTeam } from '../context/RegistrationTeamContext';
import { subscribeVerificationLogs, type VerificationLogEntry } from '../../services/verificationService';

interface StatCardProps {
  label: string;
  value: number;
  icon: React.ElementType;
  color: string;
  bg: string;
  border: string;
}

const StatCard: React.FC<StatCardProps> = ({ label, value, icon: Icon, color, bg, border }) => (
  <div className={`p-5 rounded-2xl ${bg} ${border} border flex flex-col gap-2`}>
    <div className={`w-9 h-9 rounded-xl ${bg} border ${border} flex items-center justify-center`}>
      <Icon className={`w-4 h-4 ${color}`} />
    </div>
    <span className="text-2xl font-extrabold text-white font-display">{value}</span>
    <span className="text-[10px] font-semibold text-white/50">{label}</span>
  </div>
);

const TYPE_STYLES: Record<string, string> = {
  verify: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
  reject: 'bg-rose-500/20 text-rose-300 border-rose-500/30',
  bulk: 'bg-sky-500/20 text-sky-300 border-sky-500/30',
  account: 'bg-violet-500/20 text-violet-300 border-violet-500/30',
};

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, participants } = useRegistrationTeam();
  const [logs, setLogs] = useState<VerificationLogEntry[]>([]);

  useEffect(() => {
    const unsubscribe = subscribeVerificationLogs(
      (next) => setLogs(next),
      () => setLogs([])
    );
    return unsubscribe;
  }, []);

  if (!user) return null;

  const total = participants.length;
  const verified = participants.filter((p) => p.verificationStatus === 'Verified').length;
  const pending = participants.filter((p) => p.verificationStatus === 'Pending').length;
  const rejected = participants.filter((p) => p.verificationStatus === 'Rejected').length;
  const verifiedToday = logs.filter((l) => l.type === 'verify').length;

  return (
    <div className="min-h-screen bg-black text-white selection:bg-violet-500/30 selection:text-violet-200">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome */}
        <div className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-extrabold font-display text-white">
            Welcome, {user.name.split(' ')[0]}!
          </h1>
          <p className="text-sm text-white/50 mt-1">Verify participants at the registration desk</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Total Registered Participants" value={total} icon={Users} color="text-blue-400" bg="bg-blue-500/10" border="border-blue-500/20" />
          <StatCard label="Total Pending Verification" value={pending} icon={Clock} color="text-amber-400" bg="bg-amber-500/10" border="border-amber-500/20" />
          <StatCard label="Total Verified Participants" value={verified} icon={BadgeCheck} color="text-emerald-400" bg="bg-emerald-500/10" border="border-emerald-500/20" />
          <StatCard label="Total Rejected Participants" value={rejected} icon={XCircle} color="text-rose-400" bg="bg-rose-500/10" border="border-rose-500/20" />
        </div>

        {/* Quick Actions */}
        <div className="mt-8">
          <h3 className="text-xs font-bold text-white/60 uppercase tracking-widest mb-3">Quick Actions</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <motion.button
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              onClick={() => navigate('/registration-team/verify')}
              className="rounded-3xl bg-zinc-950/60 border border-white/10 hover:border-violet-500/40 backdrop-blur-md p-6 flex items-center gap-4 text-left transition-all group cursor-pointer"
            >
              <div className="w-12 h-12 rounded-2xl bg-violet-500/15 border border-violet-500/25 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                <ScanLine className="w-6 h-6 text-violet-400" />
              </div>
              <div className="flex flex-col gap-1 min-w-0">
                <span className="text-sm font-bold text-white">Verify Participants</span>
                <span className="text-[11px] text-white/40">Search, scan QR codes or bulk verify registrations at the desk.</span>
              </div>
            </motion.button>
            <motion.button
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 }}
              onClick={() => navigate('/registration-team/profile')}
              className="rounded-3xl bg-zinc-950/60 border border-white/10 hover:border-violet-500/40 backdrop-blur-md p-6 flex items-center gap-4 text-left transition-all group cursor-pointer"
            >
              <div className="w-12 h-12 rounded-2xl bg-cyan-500/15 border border-cyan-500/25 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                <ShieldCheck className="w-6 h-6 text-cyan-400" />
              </div>
              <div className="flex flex-col gap-1 min-w-0">
                <span className="text-sm font-bold text-white">View Profile & Account</span>
                <span className="text-[11px] text-white/40">Review your account details and staff information.</span>
              </div>
            </motion.button>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="mt-8 rounded-3xl bg-zinc-950/60 border border-white/10 backdrop-blur-md overflow-hidden">
          <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <History className="w-4 h-4 text-violet-400" />
              <span className="text-xs font-bold text-white">Recent Verification Activity</span>
            </div>
            <span className="text-[10px] text-white/40">{logs.length} events</span>
          </div>
          <div className="flex flex-col divide-y divide-white/5 max-h-[420px] overflow-y-auto">
            {logs.length === 0 ? (
              <div className="p-10 text-center text-xs text-white/40">
                No verification activity yet. Start verifying participants at the desk.
              </div>
            ) : (
              logs.slice(0, 20).map((l) => (
                <div key={l.id} className="px-5 py-3 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold border shrink-0 ${TYPE_STYLES[l.type] || 'bg-white/10 text-white/70 border-white/15'}`}>
                      {l.type.toUpperCase()}
                    </span>
                    <div className="flex flex-col min-w-0">
                      <span className="text-xs text-white/80 truncate">{l.details}</span>
                      <span className="text-[10px] text-white/40">{l.actor_name}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {l.type === 'verify' && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />}
                    <span className="text-[9px] text-white/35">{new Date(l.timestamp).toLocaleString()}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="mt-6 text-[10px] text-white/25 text-center">
          {verifiedToday} verification{verifiedToday === 1 ? '' : 's'} recorded this session across the desk.
        </div>
      </main>
    </div>
  );
};
