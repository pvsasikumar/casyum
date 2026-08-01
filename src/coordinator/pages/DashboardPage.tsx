import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Calendar,
  MapPin,
  Users,
  BadgeCheck,
  Clock,
  CheckCircle2,
  XCircle,
  Percent,
  Ticket,
  ClipboardList,
  ChevronRight,
  type LucideIcon,
} from 'lucide-react';
import { useCoordinator } from '../context/CoordinatorContext';
import { AttendanceService } from '../services/AttendanceService';
import { ParticipantService } from '../services/ParticipantService';
import type { EventAttendanceStats } from '../types';

interface StatTileProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  color: string;
  bg: string;
  border: string;
}

const StatTile: React.FC<StatTileProps> = ({ label, value, icon: Icon, color, bg, border }) => {
  return (
    <div className={`flex items-center gap-2 px-3 py-2 rounded-xl ${bg} ${border} border`}>
      <Icon className={`w-3.5 h-3.5 ${color} flex-shrink-0`} />
      <div className="flex flex-col min-w-0">
        <span className="text-[10px] text-white/40 truncate">{label}</span>
        <span className={`text-sm font-extrabold ${color}`}>{value}</span>
      </div>
    </div>
  );
};

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, assignedEvents } = useCoordinator();
  const [eventStats, setEventStats] = useState<Record<string, EventAttendanceStats>>({});
  const [isLoadingStats, setIsLoadingStats] = useState(false);

  useEffect(() => {
    let cancelled = false;
    if (assignedEvents.length > 0) {
      setIsLoadingStats(true);
      (async () => {
        const statsMap: Record<string, EventAttendanceStats> = {};
        for (const event of assignedEvents) {
          const participants = await ParticipantService.getEventParticipants(event.id);
          if (cancelled) return;
          statsMap[event.id] = AttendanceService.getEventAttendanceStats(
            event.id,
            participants,
            event.maxParticipants
          );
        }
        if (!cancelled) setEventStats(statsMap);
        if (!cancelled) setIsLoadingStats(false);
      })();
    } else {
      setEventStats({});
    }
    return () => {
      cancelled = true;
    };
  }, [assignedEvents]);

  if (!user) return null;

  return (
    <div className="min-h-screen bg-black text-white selection:bg-violet-500/30 selection:text-violet-200">
      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome */}
        <div className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-extrabold font-display text-white">
            Welcome, {user.name.split(' ')[0]}!
          </h1>
          <p className="text-sm text-white/50 mt-1">
            Manage attendance for your assigned events
          </p>
        </div>

        {/* Assigned Events */}
        {assignedEvents.length === 0 ? (
          <div className="rounded-3xl bg-zinc-950/60 border border-white/10 backdrop-blur-md p-12 text-center">
            <div className="w-16 h-16 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mx-auto mb-4">
              <Calendar className="w-6 h-6 text-white/30" />
            </div>
            <h3 className="text-base font-bold text-white/70 font-display mb-1">No Events Assigned</h3>
            <p className="text-xs text-white/40">
              You have not been assigned to any events yet. Please contact the admin.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {assignedEvents.map((event) => {
              const stats = eventStats[event.id];
              return (
                <motion.div
                  key={event.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="rounded-3xl bg-zinc-950/60 border border-white/10 backdrop-blur-md overflow-hidden hover:border-violet-500/40 transition-all group"
                >
                  <div className="p-6 flex flex-col gap-4">
                    {/* Event Header */}
                    <div className="flex items-start justify-between">
                      <div className="flex flex-col gap-1">
                        <span className="text-[10px] font-bold text-violet-400 uppercase tracking-widest">
                          {event.category}
                        </span>
                        <h3 className="text-lg font-extrabold font-display text-white group-hover:text-violet-300 transition-colors">
                          {event.name}
                        </h3>
                      </div>
                    </div>

                    {/* Event Details */}
                    <div className="flex flex-wrap gap-4 text-[11px] text-white/60">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-violet-400" />
                        <span>{new Date(event.date).toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-cyan-400" />
                        <span>{event.venue}</span>
                      </div>
                    </div>

                    {/* Stats Grid */}
                    {isLoadingStats && !stats ? (
                      <div className="py-4 text-center text-[11px] text-white/40">
                        Loading statistics...
                      </div>
                    ) : stats ? (
                      <div className="flex flex-col gap-2">
                        <div className="grid grid-cols-2 gap-2">
                          <StatTile
                            label="Registered"
                            value={stats.totalRegistered}
                            icon={Users}
                            color="text-blue-400"
                            bg="bg-blue-500/10"
                            border="border-blue-500/20"
                          />
                          <StatTile
                            label="Verified"
                            value={stats.verified}
                            icon={BadgeCheck}
                            color="text-emerald-400"
                            bg="bg-emerald-500/10"
                            border="border-emerald-500/20"
                          />
                          <StatTile
                            label="Pending Verification"
                            value={stats.pendingVerification}
                            icon={Clock}
                            color="text-amber-400"
                            bg="bg-amber-500/10"
                            border="border-amber-500/20"
                          />
                          <StatTile
                            label="Present"
                            value={stats.present}
                            icon={CheckCircle2}
                            color="text-green-400"
                            bg="bg-green-500/10"
                            border="border-green-500/20"
                          />
                          <StatTile
                            label="Absent"
                            value={stats.absent}
                            icon={XCircle}
                            color="text-rose-400"
                            bg="bg-rose-500/10"
                            border="border-rose-500/20"
                          />
                          <StatTile
                            label="Attendance %"
                            value={`${stats.percentage}%`}
                            icon={Percent}
                            color="text-violet-400"
                            bg="bg-violet-500/10"
                            border="border-violet-500/20"
                          />
                        </div>
                        {stats.capacity !== undefined && stats.remainingSeats !== undefined && (
                          <div className="grid grid-cols-3 gap-2">
                            <StatTile
                              label="Capacity"
                              value={stats.capacity}
                              icon={Ticket}
                              color="text-cyan-400"
                              bg="bg-cyan-500/10"
                              border="border-cyan-500/20"
                            />
                            <StatTile
                              label="Registered"
                              value={stats.totalRegistered}
                              icon={Users}
                              color="text-cyan-400"
                              bg="bg-cyan-500/10"
                              border="border-cyan-500/20"
                            />
                            <StatTile
                              label="Remaining Seats"
                              value={stats.remainingSeats}
                              icon={Clock}
                              color="text-cyan-400"
                              bg="bg-cyan-500/10"
                              border="border-cyan-500/20"
                            />
                          </div>
                        )}
                      </div>
                    ) : null}

                    {/* Action Button */}
                    <button
                      onClick={() => navigate('/coordinator/attendance')}
                      className="w-full py-3 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white text-xs font-bold uppercase tracking-wider transition-all shadow-lg shadow-violet-500/20 cursor-pointer flex items-center justify-center gap-2 group/btn"
                    >
                      <ClipboardList className="w-4 h-4" />
                      <span>Manage Attendance</span>
                      <ChevronRight className="w-3.5 h-3.5 group-hover/btn:translate-x-0.5 transition-transform" />
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
};
