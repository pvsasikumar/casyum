import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Calendar,
  ClipboardList,
  Hourglass,
  ShieldCheck,
  XCircle,
  Users,
  UserCheck,
  CheckCircle2,
  BadgeCheck,
  IndianRupee,
  TrendingUp,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import { useCasyumFaculty } from '../context/CasyumFacultyContext';

interface CardDef {
  label: string;
  value: string | number;
  sub: string;
  icon: React.ElementType;
  tone: 'violet' | 'emerald' | 'amber' | 'rose' | 'cyan' | 'sky' | 'indigo';
}

const TONE_CLS: Record<CardDef['tone'], { card: string; icon: string }> = {
  violet: { card: 'bg-violet-500/10 border-violet-500/25', icon: 'bg-violet-500/20 text-violet-300' },
  emerald: { card: 'bg-emerald-500/10 border-emerald-500/25', icon: 'bg-emerald-500/20 text-emerald-300' },
  amber: { card: 'bg-amber-500/10 border-amber-500/25', icon: 'bg-amber-500/20 text-amber-300' },
  rose: { card: 'bg-rose-500/10 border-rose-500/25', icon: 'bg-rose-500/20 text-rose-300' },
  cyan: { card: 'bg-cyan-500/10 border-cyan-500/25', icon: 'bg-cyan-500/20 text-cyan-300' },
  sky: { card: 'bg-sky-500/10 border-sky-500/25', icon: 'bg-sky-500/20 text-sky-300' },
  indigo: { card: 'bg-indigo-500/10 border-indigo-500/25', icon: 'bg-indigo-500/20 text-indigo-300' },
};

function formatRupees(value: number): string {
  return `₹${value.toLocaleString('en-IN')}`;
}

export const DashboardPage: React.FC = () => {
  const { user, events, registrations, participants, registrationsLoading } = useCasyumFaculty();

  const stats = useMemo(() => {
    const totalRegs = registrations.length;
    const pending = registrations.filter((r) => r.paymentStatus === 'submitted').length;
    const verified = registrations.filter((r) => r.paymentStatus === 'verified').length;
    const rejected = registrations.filter((r) => r.paymentStatus === 'rejected').length;
    const deskVerified = registrations.filter((r) => r.registrationVerificationStatus === 'verified').length;
    const eligible = registrations.filter((r) => r.attendanceEligibility === true).length;
    const attendanceMarked = registrations.filter((r) => r.attendanceStatus && r.attendanceStatus !== 'not_marked').length;
    const revenue = registrations
      .filter((r) => r.paymentStatus === 'verified')
      .reduce((sum, r) => sum + (Number(r.registrationFee) || 0), 0);
    const completionRate = totalRegs === 0 ? 0 : Math.round((eligible / totalRegs) * 100);
    return { totalRegs, pending, verified, rejected, deskVerified, eligible, attendanceMarked, revenue, completionRate };
  }, [registrations]);

  const cards: CardDef[] = [
    { label: 'Total Events', value: events.length, sub: 'Across all CASYUM tracks', icon: Calendar, tone: 'violet' },
    { label: 'Total Registrations', value: stats.totalRegs, sub: 'All event registrations', icon: ClipboardList, tone: 'indigo' },
    { label: 'Payments Pending', value: stats.pending, sub: 'Awaiting faculty review', icon: Hourglass, tone: 'amber' },
    { label: 'Payments Verified', value: stats.verified, sub: 'Payment proof confirmed', icon: ShieldCheck, tone: 'emerald' },
    { label: 'Payments Rejected', value: stats.rejected, sub: 'Need resubmission', icon: XCircle, tone: 'rose' },
    { label: 'Total Participants', value: participants.length, sub: 'Registered participants', icon: Users, tone: 'cyan' },
    { label: 'Desk Verified', value: stats.deskVerified, sub: 'Registration Desk approved', icon: UserCheck, tone: 'sky' },
    { label: 'Attendance Eligible', value: stats.eligible, sub: 'Fully approved to attend', icon: CheckCircle2, tone: 'emerald' },
    { label: 'Attendance Marked', value: stats.attendanceMarked, sub: 'Checked in / out', icon: BadgeCheck, tone: 'indigo' },
    { label: 'Revenue Collected', value: formatRupees(stats.revenue), sub: 'From verified payments', icon: IndianRupee, tone: 'violet' },
    { label: 'Completion Rate', value: `${stats.completionRate}%`, sub: 'Eligible / total registrations', icon: TrendingUp, tone: 'cyan' },
  ];

  const recent = useMemo(
    () => [...registrations].sort((a, b) => b.registered_at.localeCompare(a.registered_at)).slice(0, 6),
    [registrations]
  );

  const paymentMeta = (status: string) => {
    if (status === 'verified') return { label: 'Verified', cls: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' };
    if (status === 'rejected') return { label: 'Rejected', cls: 'bg-rose-500/20 text-rose-300 border-rose-500/30' };
    return { label: 'Submitted', cls: 'bg-amber-500/20 text-amber-300 border-amber-500/30' };
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col gap-8 select-none pb-16">
      {/* Header */}
      <div className="flex flex-col gap-1.5">
        <span className="text-xs font-bold text-violet-400 uppercase tracking-widest">
          {user?.name ? `Welcome back, ${user.name}` : 'Faculty Manager'}
        </span>
        <h1 className="text-2xl sm:text-3xl font-extrabold font-display text-white tracking-tight">
          CASYUM Faculty <span className="text-violet-400">Management</span>
        </h1>
        <p className="text-xs text-white/50">Complete CASYUM Management &amp; Payment Verification</p>
      </div>

      {/* 11 Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {cards.map((card) => {
          const tone = TONE_CLS[card.tone];
          const Icon = card.icon;
          return (
            <div
              key={card.label}
              className={`p-5 rounded-3xl border backdrop-blur-md shadow-lg flex flex-col gap-3 ${tone.card}`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-white/60 uppercase tracking-widest">{card.label}</span>
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${tone.icon}`}>
                  <Icon className="w-4 h-4" />
                </div>
              </div>
              <span className="text-2xl font-extrabold font-display text-white leading-none">{card.value}</span>
              <span className="text-[10px] text-white/40">{card.sub}</span>
            </div>
          );
        })}
      </div>

      {/* Quick actions */}
      <div className="flex flex-wrap items-center gap-3">
        <Link
          to="/casyum-faculty/payment-verification"
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white text-xs font-bold transition-all shadow-lg shadow-violet-500/25 cursor-pointer"
        >
          <ShieldCheck className="w-4 h-4" />
          Payment Verification
        </Link>
        <Link
          to="/casyum-faculty/registration-status"
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/80 hover:text-white text-xs font-bold transition-all cursor-pointer"
        >
          <ClipboardList className="w-4 h-4" />
          Registration Status
        </Link>
        <Link
          to="/casyum-faculty/reports"
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/80 hover:text-white text-xs font-bold transition-all cursor-pointer"
        >
          <TrendingUp className="w-4 h-4" />
          Reports
        </Link>
      </div>

      {/* Recent submissions */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-extrabold font-display text-white tracking-tight flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-violet-400" />
            Recent Payment Submissions
          </h2>
          <Link
            to="/casyum-faculty/payment-verification"
            className="flex items-center gap-1 text-[11px] font-bold text-violet-400 hover:text-violet-300 transition-colors cursor-pointer"
          >
            View all <ArrowRight className="w-3 h-3" />
          </Link>
        </div>

        <div className="rounded-3xl bg-zinc-950/60 border border-white/10 backdrop-blur-md overflow-hidden shadow-2xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-white min-w-[760px]">
              <thead className="bg-white/5 border-b border-white/10 text-[10px] uppercase tracking-wider text-white/50">
                <tr>
                  <th className="p-4">Participant</th>
                  <th className="p-4">Event</th>
                  <th className="p-4">Transaction ID</th>
                  <th className="p-4">Amount</th>
                  <th className="p-4">Payment Status</th>
                  <th className="p-4">Submitted</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {registrationsLoading ? (
                  <tr>
                    <td colSpan={6} className="p-10 text-center text-xs text-white/40">Loading submissions...</td>
                  </tr>
                ) : recent.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-10 text-center text-xs text-white/40">
                      No payment submissions yet.
                    </td>
                  </tr>
                ) : (
                  recent.map((r) => {
                    const meta = paymentMeta(r.paymentStatus);
                    return (
                      <tr key={r.registration_id} className="hover:bg-white/[0.02] transition-colors">
                        <td className="p-4">
                          <div className="flex flex-col">
                            <span className="font-bold text-white">{r.user_full_name}</span>
                            <span className="text-[10px] text-white/40">{r.college || '—'}</span>
                          </div>
                        </td>
                        <td className="p-4 text-white/70">{r.event_name || r.event_id}</td>
                        <td className="p-4 font-mono text-[11px] text-violet-300">{r.transactionId || '—'}</td>
                        <td className="p-4 font-mono font-extrabold text-emerald-400">₹{r.registrationFee || 0}</td>
                        <td className="p-4">
                          <span className={`inline-flex px-2 py-0.5 rounded-full text-[9px] font-bold border ${meta.cls}`}>
                            {meta.label}
                          </span>
                        </td>
                        <td className="p-4 text-white/50 text-[11px]">
                          {r.registered_at ? new Date(r.registered_at).toLocaleString() : '—'}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
