import React from 'react';
import { BarChart3, TrendingUp, DollarSign, PieChart, Users, Award } from 'lucide-react';
import { useAdmin } from '../../context/AdminContext';

export const AnalyticsModule: React.FC = () => {
  const { participants, events } = useAdmin();

  const totalRegs = participants.length;
  const approved = participants.filter((p) => p.paymentStatus === 'Approved').length;
  const pending = participants.filter((p) => p.paymentStatus === 'Pending').length;
  const rejected = participants.filter((p) => p.paymentStatus === 'Rejected').length;

  const conversionRate = totalRegs ? Math.round((approved / totalRegs) * 100) : 0;

  return (
    <div className="flex flex-col gap-6 select-none pb-12">
      {/* Header */}
      <div className="flex flex-col">
        <span className="text-xs font-bold text-violet-400 uppercase tracking-widest">
          SaaS Analytics Engine
        </span>
        <h2 className="text-xl sm:text-2xl font-extrabold font-display text-white">
          Deep Performance & Revenue Analytics
        </h2>
      </div>

      {/* Top Conversion Funnel Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-white/5 border border-white/10 flex flex-col gap-1">
          <span className="text-xs font-semibold text-white/50">Total Form Visits</span>
          <span className="text-2xl font-extrabold text-white font-display">1,240</span>
          <span className="text-[10px] text-emerald-400">+18% growth this week</span>
        </div>

        <div className="p-5 rounded-2xl bg-white/5 border border-white/10 flex flex-col gap-1">
          <span className="text-xs font-semibold text-white/50">Completed Registrations</span>
          <span className="text-2xl font-extrabold text-violet-400 font-display">{totalRegs}</span>
          <span className="text-[10px] text-violet-400">42% checkout rate</span>
        </div>

        <div className="p-5 rounded-2xl bg-white/5 border border-white/10 flex flex-col gap-1">
          <span className="text-xs font-semibold text-white/50">Verified Payments</span>
          <span className="text-2xl font-extrabold text-emerald-400 font-display">{approved}</span>
          <span className="text-[10px] text-emerald-400">{conversionRate}% conversion rate</span>
        </div>

        <div className="p-5 rounded-2xl bg-white/5 border border-white/10 flex flex-col gap-1">
          <span className="text-xs font-semibold text-white/50">Average Ticket Value</span>
          <span className="text-2xl font-extrabold text-cyan-300 font-display">₹385</span>
          <span className="text-[10px] text-cyan-400">Per registration bundle</span>
        </div>
      </div>

      {/* Visual Chart Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Payment Status Breakdown */}
        <div className="p-6 rounded-3xl bg-zinc-950/60 border border-white/10 backdrop-blur-md flex flex-col gap-6">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-white font-display flex items-center gap-2">
              <PieChart className="w-4 h-4 text-violet-400" />
              <span>Payment Verification Breakdown</span>
            </h3>
          </div>

          <div className="flex items-center justify-center py-6">
            {/* Custom SVG Pie Chart */}
            <div className="relative w-48 h-48 flex items-center justify-center">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                <path
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  fill="none"
                  stroke="rgba(255,255,255,0.05)"
                  strokeWidth="3.8"
                />
                <path
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  fill="none"
                  stroke="#10b981"
                  strokeWidth="3.8"
                  strokeDasharray={`${(approved / (totalRegs || 1)) * 100}, 100`}
                />
                <path
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  fill="none"
                  stroke="#f59e0b"
                  strokeWidth="3.8"
                  strokeDasharray={`${(pending / (totalRegs || 1)) * 100}, 100`}
                  strokeDashoffset={`-${(approved / (totalRegs || 1)) * 100}`}
                />
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

        {/* Event Revenue Contribution Bar Chart */}
        <div className="p-6 rounded-3xl bg-zinc-950/60 border border-white/10 backdrop-blur-md flex flex-col justify-between gap-6">
          <div className="flex flex-col">
            <h3 className="text-base font-bold text-white font-display flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-emerald-400" />
              <span>Revenue Generated by Event</span>
            </h3>
          </div>

          <div className="flex flex-col gap-3">
            {events.map((e) => (
              <div key={e.id} className="flex flex-col gap-1 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-white font-medium truncate max-w-[200px]">{e.name}</span>
                  <span className="font-mono font-bold text-emerald-400">₹{e.revenue}</span>
                </div>
                <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-cyan-400"
                    style={{ width: `${Math.min((e.revenue / 50000) * 100, 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
