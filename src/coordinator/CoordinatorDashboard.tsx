import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Calendar,
  MapPin,
  Users,
  CheckCircle2,
  XCircle,
  Percent,
  LogOut,
  Sparkles,
  User,
  ClipboardList,
  ChevronRight,
  Loader2,
} from 'lucide-react';
import { useCoordinator } from './context/CoordinatorContext';
import { AttendanceService } from './services/AttendanceService';
import { AttendancePage } from './pages/AttendancePage';
import type { EventAttendanceStats } from './types';

type ViewState = 'dashboard' | 'attendance';

export const CoordinatorDashboard: React.FC = () => {
  const { user, assignedEvents, isLoading, logout } = useCoordinator();
  const [currentView, setCurrentView] = useState<ViewState>('dashboard');
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [eventStats, setEventStats] = useState<Record<string, EventAttendanceStats>>({});
  const [logoutDialogOpen, setLogoutDialogOpen] = useState(false);

  useEffect(() => {
    if (assignedEvents.length > 0) {
      const statsMap: Record<string, EventAttendanceStats> = {};
      assignedEvents.forEach((event) => {
        statsMap[event.id] = AttendanceService.getEventAttendanceStats(event.id);
      });
      setEventStats(statsMap);
    }
  }, [assignedEvents]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-violet-400 animate-spin" />
      </div>
    );
  }

  if (!user) return null;

  if (currentView === 'attendance' && selectedEventId) {
    return (
      <AttendancePage eventId={selectedEventId} />
    );
  }

  return (
    <div className="min-h-screen bg-black text-white selection:bg-violet-500/30 selection:text-violet-200">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-50 bg-black/80 backdrop-blur-md border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-violet-600 to-cyan-400 p-[1px] shadow-[0_0_15px_rgba(139,92,246,0.3)]">
              <div className="w-full h-full bg-black rounded-[11px] flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-violet-400" />
              </div>
            </div>
            <div className="flex flex-col">
              <span className="font-extrabold font-display text-white text-sm leading-none">
                CASYUM <span className="text-violet-400">Coordinator</span>
              </span>
              <span className="text-[9px] text-white/40 tracking-widest uppercase mt-0.5">
                Attendance Portal
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/5 border border-white/10">
              <User className="w-3.5 h-3.5 text-violet-400" />
              <span className="text-[11px] font-semibold text-white/80">{user.name}</span>
            </div>
            <button
              onClick={() => setLogoutDialogOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-[11px] font-bold hover:bg-rose-500/20 transition-all cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>
      </header>

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
                    {stats && (
                      <div className="grid grid-cols-2 gap-2">
                        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-blue-500/10 border border-blue-500/20">
                          <Users className="w-3.5 h-3.5 text-blue-400" />
                          <div className="flex flex-col">
                            <span className="text-[10px] text-white/40">Registered</span>
                            <span className="text-sm font-extrabold text-white">{stats.totalRegistered}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                          <div className="flex flex-col">
                            <span className="text-[10px] text-white/40">Present</span>
                            <span className="text-sm font-extrabold text-emerald-400">{stats.present}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-rose-500/10 border border-rose-500/20">
                          <XCircle className="w-3.5 h-3.5 text-rose-400" />
                          <div className="flex flex-col">
                            <span className="text-[10px] text-white/40">Absent</span>
                            <span className="text-sm font-extrabold text-rose-400">{stats.absent}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-violet-500/10 border border-violet-500/20">
                          <Percent className="w-3.5 h-3.5 text-violet-400" />
                          <div className="flex flex-col">
                            <span className="text-[10px] text-white/40">Attendance</span>
                            <span className="text-sm font-extrabold text-violet-400">{stats.percentage}%</span>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Action Button */}
                    <button
                      onClick={() => {
                        setSelectedEventId(event.id);
                        setCurrentView('attendance');
                      }}
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

      {/* Logout Confirmation */}
      {logoutDialogOpen && (
        <div className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-zinc-950 border border-white/20 rounded-3xl p-6 shadow-2xl flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-rose-500/20 text-rose-400">
                <LogOut className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold font-display text-white">Logout</h3>
            </div>
            <p className="text-sm text-white/70">Are you sure you want to logout from the Coordinator Portal?</p>
            <div className="flex items-center justify-end gap-3 mt-2">
              <button
                onClick={() => setLogoutDialogOpen(false)}
                className="px-4 py-2 rounded-xl text-white/60 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => { logout(); }}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold cursor-pointer"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
