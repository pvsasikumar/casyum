import React from 'react';
import { Users, CheckCircle2, XCircle, Percent } from 'lucide-react';
import type { EventAttendanceStats } from '../types';

interface AttendanceSummaryProps {
  stats: EventAttendanceStats;
  isLoading?: boolean;
}

export const AttendanceSummary: React.FC<AttendanceSummaryProps> = ({ stats, isLoading = false }) => {
  const cards = [
    {
      label: 'Total Registered',
      value: stats.totalRegistered,
      icon: Users,
      color: 'text-blue-400',
      bg: 'bg-blue-500/10',
      border: 'border-blue-500/20',
    },
    {
      label: 'Present',
      value: stats.present,
      icon: CheckCircle2,
      color: 'text-emerald-400',
      bg: 'bg-emerald-500/10',
      border: 'border-emerald-500/20',
    },
    {
      label: 'Absent',
      value: stats.absent,
      icon: XCircle,
      color: 'text-rose-400',
      bg: 'bg-rose-500/10',
      border: 'border-rose-500/20',
    },
    {
      label: 'Attendance %',
      value: `${stats.percentage}%`,
      icon: Percent,
      color: 'text-violet-400',
      bg: 'bg-violet-500/10',
      border: 'border-violet-500/20',
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <div
            key={card.label}
            className={`${card.bg} ${card.border} border rounded-2xl p-4 flex flex-col gap-2`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-white/50 uppercase tracking-wider">
                {card.label}
              </span>
              <Icon className={`w-4 h-4 ${card.color}`} />
            </div>
            {isLoading ? (
              <div className="h-8 w-16 rounded-lg bg-white/10 animate-pulse" />
            ) : (
              <span className={`text-2xl font-extrabold font-display ${card.color}`}>
                {card.value}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
};
