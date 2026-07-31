import React from 'react';
import { BarChart3, TrendingUp, Users, PieChart } from 'lucide-react';
import { useAdmin } from '../../context/AdminContext';

export const AnalyticsModule: React.FC = () => {
  const { participants, events } = useAdmin();

  const totalRegs = participants.length;
  const approved = participants.filter((p) => p.paymentStatus === 'Approved').length;
  const pending = participants.filter((p) => p.paymentStatus === 'Pending').length;
  const rejected = participants.filter((p) => p.paymentStatus === 'Rejected').length;
  const conversionRate = totalRegs ? Math.round((approved / totalRegs) * 100) : 0;

  // Department-wise participation
  const deptCounts: Record<string, number> = {};
  participants.forEach((p) => {
    const dept = p.department || 'Other';
    deptCounts[dept] = (deptCounts[dept] || 0) + 1;
  });

  // Event popularity
  const eventPopularity = events
    .map((e) => ({
      name: e.name,
      count: participants.filter((p) => p.registeredEvents?.includes(e.id)).length,
      max: e.maxParticipants,
      pct: Math.round((participants.filter((p) => p.registeredEvents?.includes(e.id)).length / e.maxParticipants) * 100),
    }))
    .sort((a, b) => b.count - a.count);

  // Registration trend data (last 7 days)
  const trendDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const trendData = [12, 18, 15, 22, 28, 20, 14];
  const maxTrend = Math.max(...trendData);

  return (
    <div className="flex flex-col gap-6 select-none pb-12">
      <div className="flex flex-col">
        <span className="text-xs font-bold text-violet-400 uppercase tracking-widest">Reports & Analytics</span>
        <h2 className="text-xl sm:text-2xl font-extrabold font-display text-white">Performance Dashboard</h2>
      </div>

      {/* Summary Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-white/5 border border-white/10 flex flex-col gap-1">
          <span className="text-xs font-semibold text-white/50">Total Registrations</span>
          <span className="text-2xl font-extrabold text-white font-display">{totalRegs}</span>
          <span className="text-[10px] text-emerald-400"><TrendingUp className="w-3 h-3 inline" /> +18% this week</span>
        </div>
        <div className="p-5 rounded-2xl bg-white/5 border border-white/10 flex flex-col gap-1">
          <span className="text-xs font-semibold text-white/50">Approved Payments</span>
          <span className="text-2xl font-extrabold text-emerald-400 font-display">{approved}</span>
          <span className="text-[10px] text-emerald-400">{conversionRate}% conversion</span>
        </div>
        <div className="p-5 rounded-2xl bg-white/5 border border-white/10 flex flex-col gap-1">
          <span className="text-xs font-semibold text-white/50">Pending Verification</span>
          <span className="text-2xl font-extrabold text-amber-400 font-display">{pending}</span>
          <span className="text-[10px] text-amber-400">Requires review</span>
        </div>
        <div className="p-5 rounded-2xl bg-white/5 border border-white/10 flex flex-col gap-1">
          <span className="text-xs font-semibold text-white/50">Total Events</span>
          <span className="text-2xl font-extrabold text-cyan-300 font-display">{events.length}</span>
          <span className="text-[10px] text-cyan-400">{events.filter((e) => e.status === 'Open').length} active</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Registration Trend Chart */}
        <div className="p-6 rounded-3xl bg-zinc-950/60 border border-white/10 backdrop-blur-md flex flex-col gap-4">
          <h3 className="text-sm font-bold text-white font-display flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-violet-400" />
            <span>Registration Trend (Last 7 Days)</span>
          </h3>
          <div className="flex items-end justify-between h-48 pt-4 gap-2">
            {trendData.map((val, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-2">
                <div className="relative w-full flex justify-center">
                  <div
                    className="w-full max-w-[32px] rounded-t-lg bg-gradient-to-t from-violet-600 to-violet-400 transition-all duration-500"
                    style={{ height: `${(val / maxTrend) * 160}px` }}
                  />
                </div>
                <span className="text-[9px] text-white/40">{trendDays[i]}</span>
                <span className="text-[9px] font-mono text-white/60">{val}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Payment Verification Pie Chart */}
        <div className="p-6 rounded-3xl bg-zinc-950/60 border border-white/10 backdrop-blur-md flex flex-col gap-6">
          <h3 className="text-sm font-bold text-white font-display flex items-center gap-2">
            <PieChart className="w-4 h-4 text-violet-400" />
            <span>Payment Verification Breakdown</span>
          </h3>
          <div className="flex items-center justify-center py-4">
            <div className="relative w-44 h-44 flex items-center justify-center">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="3.8" />
                <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#10b981" strokeWidth="3.8" strokeDasharray={`${(approved / (totalRegs || 1)) * 100}, 100`} />
                <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#f59e0b" strokeWidth="3.8" strokeDashoffset={`-${(approved / (totalRegs || 1)) * 100}`} strokeDasharray={`${(pending / (totalRegs || 1)) * 100}, 100`} />
              </svg>
              <div className="absolute flex flex-col items-center justify-center text-center">
                <span className="text-xl font-extrabold text-white">{conversionRate}%</span>
                <span className="text-[9px] text-white/50 uppercase">Verified</span>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center text-xs">
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex flex-col">
              <span className="text-emerald-400 font-bold">{approved}</span>
              <span className="text-[10px] text-white/50">Approved</span>
            </div>
            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 flex flex-col">
              <span className="text-amber-400 font-bold">{pending}</span>
              <span className="text-[10px] text-white/50">Pending</span>
            </div>
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 flex flex-col">
              <span className="text-rose-400 font-bold">{rejected}</span>
              <span className="text-[10px] text-white/50">Rejected</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Event Popularity */}
        <div className="p-6 rounded-3xl bg-zinc-950/60 border border-white/10 backdrop-blur-md flex flex-col gap-4">
          <h3 className="text-sm font-bold text-white font-display flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-cyan-400" />
            <span>Participants per Event</span>
          </h3>
          <div className="flex flex-col gap-3">
            {eventPopularity.map((ep) => (
              <div key={ep.name} className="flex flex-col gap-1 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-white font-medium truncate max-w-[200px]">{ep.name}</span>
                  <span className="font-mono text-white/60">{ep.count}/{ep.max} ({ep.pct}%)</span>
                </div>
                <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden">
                  <div className={`h-full rounded-full ${ep.pct >= 90 ? 'bg-gradient-to-r from-rose-500 to-amber-500' : 'bg-gradient-to-r from-violet-500 to-cyan-400'}`} style={{ width: `${Math.min(ep.pct, 100)}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Department-wise Participation */}
        <div className="p-6 rounded-3xl bg-zinc-950/60 border border-white/10 backdrop-blur-md flex flex-col gap-4">
          <h3 className="text-sm font-bold text-white font-display flex items-center gap-2">
            <Users className="w-4 h-4 text-amber-400" />
            <span>Department-wise Participation</span>
          </h3>
          <div className="flex flex-col gap-3">
            {Object.entries(deptCounts)
              .sort((a, b) => b[1] - a[1])
              .map(([dept, count]) => {
                const maxDept = Math.max(...Object.values(deptCounts));
                const pct = Math.round((count / maxDept) * 100);
                return (
                  <div key={dept} className="flex flex-col gap-1 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-white font-medium truncate max-w-[240px]">{dept}</span>
                      <span className="font-mono font-bold text-amber-300">{count}</span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden">
                      <div className="h-full rounded-full bg-gradient-to-r from-amber-500 to-orange-400" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      </div>
    </div>
  );
};
