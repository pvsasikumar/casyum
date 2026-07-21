import React from 'react';
import {
  Users,
  Calendar,
  CreditCard,
  CheckCircle2,
  Clock,
  XCircle,
  TrendingUp,
  DollarSign,
  UserCheck,
  Megaphone,
  ArrowUpRight,
  ShieldCheck,
} from 'lucide-react';
import { useAdmin } from '../../context/AdminContext';

export const DashboardHome: React.FC = () => {
  const { participants, events, announcements, approvePayment, rejectPayment, setSelectedParticipant, setActiveTab } =
    useAdmin();

  const totalRegistrations = participants.length;
  const approvedPayments = participants.filter((p) => p.paymentStatus === 'Approved');
  const pendingPayments = participants.filter((p) => p.paymentStatus === 'Pending');
  const rejectedPayments = participants.filter((p) => p.paymentStatus === 'Rejected');
  const activeEvents = events.filter((e) => e.status === 'Open').length;

  const totalRevenue = approvedPayments.reduce((acc, curr) => acc + (curr.paymentAmount || 0), 0);
  const todaysRegistrations = participants.filter(
    (p) => p.registrationDate === new Date().toISOString().split('T')[0]
  ).length;

  const attendanceCount = 184; // Simulated live checked-in attendance

  // College distribution
  const collegeCounts: Record<string, number> = {};
  participants.forEach((p) => {
    const col = p.college || 'Other';
    collegeCounts[col] = (collegeCounts[col] || 0) + 1;
  });

  // Department distribution
  const deptCounts: Record<string, number> = {};
  participants.forEach((p) => {
    const dept = p.department || 'Other';
    deptCounts[dept] = (deptCounts[dept] || 0) + 1;
  });

  const topColleges = Object.entries(collegeCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4);

  const topDepts = Object.entries(deptCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4);

  return (
    <div className="flex flex-col gap-6 select-none pb-12">
      {/* Top Banner Notice */}
      <div className="relative overflow-hidden p-6 rounded-3xl bg-gradient-to-r from-violet-900/40 via-purple-900/20 to-cyan-900/30 border border-white/10 shadow-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="absolute top-0 right-0 w-96 h-96 bg-violet-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col gap-1 relative z-10">
          <span className="text-[10px] font-extrabold tracking-[0.3em] uppercase text-violet-400">
            CASYUM 2K26 ERP Command Center
          </span>
          <h2 className="text-xl sm:text-2xl font-extrabold font-display text-white">
            Welcome back, System Administrator
          </h2>
          <p className="text-xs text-white/60">
            Symposium registration is currently <span className="text-emerald-400 font-bold">LIVE</span>. Real-time participant analytics and payment verification metrics are running smoothly.
          </p>
        </div>

        <div className="flex items-center gap-3 relative z-10">
          <button
            onClick={() => setActiveTab('Payments')}
            className="px-4 py-2 rounded-xl bg-violet-500 hover:bg-violet-600 text-white text-xs font-bold transition-all shadow-lg shadow-violet-500/25 cursor-pointer flex items-center gap-2"
          >
            <CreditCard className="w-3.5 h-3.5" />
            <span>Verify Payments ({pendingPayments.length})</span>
          </button>
        </div>
      </div>

      {/* 8 Stat Cards Matrix */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        {/* Total Registrations */}
        <div className="p-4 sm:p-5 rounded-2xl bg-white/5 border border-white/10 hover:border-violet-500/30 transition-all flex flex-col justify-between gap-3 group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-white/50">Total Registrations</span>
            <div className="p-2 rounded-xl bg-violet-500/10 text-violet-400 border border-violet-500/20">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="flex flex-col">
            <span className="text-2xl sm:text-3xl font-extrabold font-display text-white">
              {totalRegistrations}
            </span>
            <span className="text-[10px] text-emerald-400 flex items-center gap-1 mt-1 font-medium">
              <TrendingUp className="w-3 h-3" /> +24% vs yesterday
            </span>
          </div>
        </div>

        {/* Today's Registrations */}
        <div className="p-4 sm:p-5 rounded-2xl bg-white/5 border border-white/10 hover:border-cyan-500/30 transition-all flex flex-col justify-between gap-3 group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-white/50">Today&apos;s Registrations</span>
            <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="flex flex-col">
            <span className="text-2xl sm:text-3xl font-extrabold font-display text-white">
              {todaysRegistrations}
            </span>
            <span className="text-[10px] text-cyan-400 flex items-center gap-1 mt-1 font-medium">
              Live registrations today
            </span>
          </div>
        </div>

        {/* Total Revenue */}
        <div className="p-4 sm:p-5 rounded-2xl bg-white/5 border border-white/10 hover:border-emerald-500/30 transition-all flex flex-col justify-between gap-3 group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-white/50">Total Revenue</span>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="flex flex-col">
            <span className="text-2xl sm:text-3xl font-extrabold font-display text-white">
              ₹{totalRevenue.toLocaleString()}
            </span>
            <span className="text-[10px] text-emerald-400 flex items-center gap-1 mt-1 font-medium">
              Verified collections
            </span>
          </div>
        </div>

        {/* Active Events */}
        <div className="p-4 sm:p-5 rounded-2xl bg-white/5 border border-white/10 hover:border-purple-500/30 transition-all flex flex-col justify-between gap-3 group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-white/50">Active Events</span>
            <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
              <Calendar className="w-4 h-4" />
            </div>
          </div>
          <div className="flex flex-col">
            <span className="text-2xl sm:text-3xl font-extrabold font-display text-white">
              {activeEvents} / {events.length}
            </span>
            <span className="text-[10px] text-white/40 flex items-center gap-1 mt-1 font-medium">
              Registration open
            </span>
          </div>
        </div>

        {/* Pending Payments */}
        <div className="p-4 sm:p-5 rounded-2xl bg-white/5 border border-white/10 hover:border-amber-500/30 transition-all flex flex-col justify-between gap-3 group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-white/50">Pending Verification</span>
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="flex flex-col">
            <span className="text-2xl sm:text-3xl font-extrabold font-display text-amber-300">
              {pendingPayments.length}
            </span>
            <span className="text-[10px] text-amber-400 flex items-center gap-1 mt-1 font-medium">
              Requires review
            </span>
          </div>
        </div>

        {/* Approved Payments */}
        <div className="p-4 sm:p-5 rounded-2xl bg-white/5 border border-white/10 hover:border-emerald-500/30 transition-all flex flex-col justify-between gap-3 group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-white/50">Approved Payments</span>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="flex flex-col">
            <span className="text-2xl sm:text-3xl font-extrabold font-display text-emerald-400">
              {approvedPayments.length}
            </span>
            <span className="text-[10px] text-emerald-400 flex items-center gap-1 mt-1 font-medium">
              Confirmed tickets
            </span>
          </div>
        </div>

        {/* Rejected Payments */}
        <div className="p-4 sm:p-5 rounded-2xl bg-white/5 border border-white/10 hover:border-rose-500/30 transition-all flex flex-col justify-between gap-3 group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-white/50">Rejected Payments</span>
            <div className="p-2 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20">
              <XCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="flex flex-col">
            <span className="text-2xl sm:text-3xl font-extrabold font-display text-rose-400">
              {rejectedPayments.length}
            </span>
            <span className="text-[10px] text-rose-400 flex items-center gap-1 mt-1 font-medium">
              Invalid screenshots
            </span>
          </div>
        </div>

        {/* Attendance Checked In */}
        <div className="p-4 sm:p-5 rounded-2xl bg-white/5 border border-white/10 hover:border-cyan-500/30 transition-all flex flex-col justify-between gap-3 group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-white/50">Attendance Checked-In</span>
            <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              <UserCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="flex flex-col">
            <span className="text-2xl sm:text-3xl font-extrabold font-display text-cyan-300">
              {attendanceCount}
            </span>
            <span className="text-[10px] text-cyan-400 flex items-center gap-1 mt-1 font-medium">
              QR code scans logged
            </span>
          </div>
        </div>
      </div>

      {/* Grid of Interactive Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Registration & Revenue Trend SVG Chart */}
        <div className="lg:col-span-2 p-6 rounded-3xl bg-zinc-950/60 border border-white/10 backdrop-blur-md flex flex-col gap-6">
          <div className="flex items-center justify-between">
            <div className="flex flex-col">
              <span className="text-xs font-bold text-violet-400 uppercase tracking-widest">
                Registration Velocity & Revenue Growth
              </span>
              <h3 className="text-base font-bold text-white font-display">Weekly Growth Curves</h3>
            </div>
            <div className="flex items-center gap-4 text-xs">
              <span className="flex items-center gap-1.5 text-white/70">
                <span className="w-2.5 h-2.5 rounded-full bg-violet-400" /> Registrations
              </span>
              <span className="flex items-center gap-1.5 text-white/70">
                <span className="w-2.5 h-2.5 rounded-full bg-cyan-400" /> Revenue (₹k)
              </span>
            </div>
          </div>

          {/* SVG Area Chart */}
          <div className="w-full h-64 relative flex items-end pt-8">
            <svg className="w-full h-full overflow-visible" viewBox="0 0 500 200">
              <defs>
                <linearGradient id="violetGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.4" />
                  <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0.0" />
                </linearGradient>
                <linearGradient id="cyanGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.4" />
                  <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.0" />
                </linearGradient>
              </defs>

              {/* Grid Lines */}
              <line x1="0" y1="40" x2="500" y2="40" stroke="rgba(255,255,255,0.05)" strokeDasharray="4" />
              <line x1="0" y1="90" x2="500" y2="90" stroke="rgba(255,255,255,0.05)" strokeDasharray="4" />
              <line x1="0" y1="140" x2="500" y2="140" stroke="rgba(255,255,255,0.05)" strokeDasharray="4" />

              {/* Area 1: Registrations */}
              <path
                d="M 0 170 Q 100 130 200 90 T 400 40 L 500 20 L 500 200 L 0 200 Z"
                fill="url(#violetGrad)"
              />
              <path
                d="M 0 170 Q 100 130 200 90 T 400 40 L 500 20"
                fill="none"
                stroke="#8b5cf6"
                strokeWidth="3"
              />

              {/* Area 2: Revenue */}
              <path
                d="M 0 190 Q 100 160 200 120 T 400 70 L 500 50 L 500 200 L 0 200 Z"
                fill="url(#cyanGrad)"
              />
              <path
                d="M 0 190 Q 100 160 200 120 T 400 70 L 500 50"
                fill="none"
                stroke="#06b6d4"
                strokeWidth="3"
              />

              {/* Points */}
              <circle cx="200" cy="90" r="5" fill="#8b5cf6" className="animate-ping" />
              <circle cx="200" cy="90" r="4" fill="#ffffff" />
              <circle cx="400" cy="40" r="4" fill="#8b5cf6" />
              <circle cx="500" cy="20" r="4" fill="#8b5cf6" />

              <circle cx="200" cy="120" r="4" fill="#06b6d4" />
              <circle cx="400" cy="70" r="4" fill="#06b6d4" />
              <circle cx="500" cy="50" r="4" fill="#06b6d4" />
            </svg>
          </div>

          <div className="grid grid-cols-5 gap-2 text-center text-[10px] text-white/40 border-t border-white/5 pt-3">
            <span>Mon</span>
            <span>Tue</span>
            <span>Wed</span>
            <span>Thu</span>
            <span>Fri (Live)</span>
          </div>
        </div>

        {/* Most Popular Events Bar List */}
        <div className="p-6 rounded-3xl bg-zinc-950/60 border border-white/10 backdrop-blur-md flex flex-col justify-between gap-6">
          <div className="flex flex-col">
            <span className="text-xs font-bold text-cyan-400 uppercase tracking-widest">
              Event Popularity
            </span>
            <h3 className="text-base font-bold text-white font-display">Top Registered Events</h3>
          </div>

          <div className="flex flex-col gap-4">
            {events.slice(0, 5).map((e) => {
              const pct = Math.round((e.registeredCount / e.maxParticipants) * 100);
              return (
                <div key={e.id} className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-white truncate max-w-[180px]">{e.name}</span>
                    <span className="font-mono text-white/60">
                      {e.registeredCount} / {e.maxParticipants} ({pct}%)
                    </span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        pct >= 90
                          ? 'bg-gradient-to-r from-rose-500 to-amber-500'
                          : 'bg-gradient-to-r from-violet-500 to-cyan-400'
                      }`}
                      style={{ width: `${Math.min(pct, 100)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          <button
            onClick={() => setActiveTab('Events')}
            className="w-full py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/70 hover:text-white text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5"
          >
            <span>View All {events.length} Events</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* College & Department Breakdown + Pending Verification Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* College & Department Metrics */}
        <div className="p-6 rounded-3xl bg-zinc-950/60 border border-white/10 backdrop-blur-md flex flex-col gap-6">
          <div className="flex flex-col">
            <span className="text-xs font-bold text-violet-400 uppercase tracking-widest">
              Demographics
            </span>
            <h3 className="text-base font-bold text-white font-display">Top Colleges & Depts</h3>
          </div>

          <div className="flex flex-col gap-4">
            <span className="text-xs font-bold text-white/50 uppercase tracking-wider">Colleges</span>
            {topColleges.map(([college, count]) => (
              <div key={college} className="flex items-center justify-between text-xs">
                <span className="text-white/80 truncate max-w-[200px]">{college}</span>
                <span className="font-mono font-bold text-violet-300 px-2 py-0.5 rounded bg-violet-500/10 border border-violet-500/20">
                  {count}
                </span>
              </div>
            ))}

            <div className="w-full h-[1px] bg-white/10 my-1" />

            <span className="text-xs font-bold text-white/50 uppercase tracking-wider">Departments</span>
            {topDepts.map(([dept, count]) => (
              <div key={dept} className="flex items-center justify-between text-xs">
                <span className="text-white/80 truncate max-w-[200px]">{dept}</span>
                <span className="font-mono font-bold text-cyan-300 px-2 py-0.5 rounded bg-cyan-500/10 border border-cyan-500/20">
                  {count}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Pending Verification Action Stream */}
        <div className="lg:col-span-2 p-6 rounded-3xl bg-zinc-950/60 border border-white/10 backdrop-blur-md flex flex-col gap-6">
          <div className="flex items-center justify-between">
            <div className="flex flex-col">
              <span className="text-xs font-bold text-amber-400 uppercase tracking-widest flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5" /> Verification Stream
              </span>
              <h3 className="text-base font-bold text-white font-display">Pending Payment Approvals</h3>
            </div>
            <button
              onClick={() => setActiveTab('Payments')}
              className="text-xs text-violet-400 hover:text-violet-300 font-semibold cursor-pointer"
            >
              View Full Queue ({pendingPayments.length})
            </button>
          </div>

          <div className="flex flex-col gap-3">
            {pendingPayments.length === 0 ? (
              <div className="p-8 text-center text-xs text-white/40 border border-dashed border-white/10 rounded-2xl">
                All uploaded payments have been verified! 🎉
              </div>
            ) : (
              pendingPayments.slice(0, 3).map((p) => (
                <div
                  key={p.id}
                  className="p-4 rounded-2xl bg-white/5 border border-white/10 hover:border-white/20 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="flex items-center gap-3">
                    <img src={p.photo} alt={p.name} className="w-10 h-10 rounded-full object-cover" />
                    <div className="flex flex-col">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-white">{p.name}</span>
                        {p.isDuplicateTransaction && (
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30">
                            DUPLICATE TXN
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] text-white/50">{p.college} · Txn: {p.transactionId}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold text-emerald-400 mr-2">
                      ₹{p.paymentAmount}
                    </span>
                    <button
                      onClick={() => approvePayment(p.id)}
                      className="px-3 py-1.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 text-xs font-semibold cursor-pointer transition-all"
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => rejectPayment(p.id, 'Invalid receipt')}
                      className="px-3 py-1.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 text-xs font-semibold cursor-pointer transition-all"
                    >
                      Reject
                    </button>
                    <button
                      onClick={() => {
                        setSelectedParticipant(p);
                        setActiveTab('Registrations');
                      }}
                      className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 text-xs font-semibold cursor-pointer"
                    >
                      View
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Announcements Stream */}
      <div className="p-6 rounded-3xl bg-zinc-950/60 border border-white/10 backdrop-blur-md flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-bold text-white uppercase tracking-wider">
            <Megaphone className="w-4 h-4 text-violet-400" />
            <span>Symposium Announcements ({announcements.length})</span>
          </div>
          <button
            onClick={() => setActiveTab('Announcements')}
            className="text-xs text-violet-400 hover:text-violet-300 font-semibold cursor-pointer"
          >
            Manage Announcements
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {announcements.slice(0, 3).map((a) => (
            <div
              key={a.id}
              className="p-4 rounded-2xl bg-white/5 border border-white/10 flex flex-col justify-between gap-3"
            >
              <div className="flex flex-col gap-1">
                <div className="flex items-center justify-between">
                  <span
                    className={`text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full ${
                      a.priority === 'Emergency'
                        ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                        : 'bg-violet-500/20 text-violet-300 border border-violet-500/30'
                    }`}
                  >
                    {a.priority}
                  </span>
                  <span className="text-[10px] text-white/40">{a.publishDate}</span>
                </div>
                <h4 className="text-xs font-bold text-white mt-1">{a.title}</h4>
                <p className="text-[11px] text-white/60 line-clamp-2 leading-relaxed">
                  {a.description}
                </p>
              </div>
              <span className="text-[9px] text-white/30">By {a.author}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
