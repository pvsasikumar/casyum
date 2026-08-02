import React from 'react';
import {
  Users,
  Calendar,
  UserCheck,
  ClipboardList,
  TrendingUp,
  Plus,
  Megaphone,
  ArrowUpRight,
  Eye,
  Edit,
  Trash2,
  Download,
  MapPin,
  Clock,
} from 'lucide-react';
import { useAdmin } from '../../context/AdminContext';
import type { EventItem } from '../../types';

export const DashboardHome: React.FC = () => {
  const { participants, events, coordinators, setActiveTab } = useAdmin();

  const totalEvents = events.length;
  const activeEvents = events.filter((e) => e.status === 'Open').length;
  const totalParticipants = participants.length;
  const totalRegistrations = participants.reduce((sum, p) => sum + (p.registeredEvents?.length || 0), 0);
  const coordinatorCount = coordinators.length;
  const todayEvents = events.filter((e) => e.date === new Date().toISOString().split('T')[0]).length;

  const recentEvents = [...events].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 5);
  const upcomingEvents = [...events]
    .filter((e) => new Date(e.date) > new Date())
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .slice(0, 4);

  const collegeCounts: Record<string, number> = {};
  participants.forEach((p) => {
    const col = p.college || 'Other';
    collegeCounts[col] = (collegeCounts[col] || 0) + 1;
  });
  const topColleges = Object.entries(collegeCounts).sort((a, b) => b[1] - a[1]).slice(0, 5);

  const departmentCounts: Record<string, number> = {};
  participants.forEach((p) => {
    const dept = p.department || 'Other';
    departmentCounts[dept] = (departmentCounts[dept] || 0) + 1;
  });
  const topDepts = Object.entries(departmentCounts).sort((a, b) => b[1] - a[1]).slice(0, 5);

  const cityCounts: Record<string, number> = {};
  participants.forEach((p) => {
    const city = p.city || 'Other';
    cityCounts[city] = (cityCounts[city] || 0) + 1;
  });
  const topCities = Object.entries(cityCounts).sort((a, b) => b[1] - a[1]).slice(0, 5);

  const statCards = [
    { label: 'Total Events', value: totalEvents, icon: Calendar, color: 'from-violet-500 to-purple-600', textColor: 'text-violet-400', bgColor: 'bg-violet-500/10', borderColor: 'border-violet-500/20', trend: '+3 this month' },
    { label: 'Active Events', value: activeEvents, icon: Calendar, color: 'from-emerald-500 to-teal-600', textColor: 'text-emerald-400', bgColor: 'bg-emerald-500/10', borderColor: 'border-emerald-500/20', trend: 'Registration open' },
    { label: 'Total Participants', value: totalParticipants, icon: Users, color: 'from-cyan-500 to-blue-600', textColor: 'text-cyan-400', bgColor: 'bg-cyan-500/10', borderColor: 'border-cyan-500/20', trend: `+${Math.floor(totalParticipants * 0.15)} this week` },
    { label: 'Total Registrations', value: totalRegistrations, icon: ClipboardList, color: 'from-purple-500 to-pink-600', textColor: 'text-purple-400', bgColor: 'bg-purple-500/10', borderColor: 'border-purple-500/20', trend: 'Across all events' },
    { label: 'Event Coordinators', value: coordinatorCount, icon: UserCheck, color: 'from-amber-500 to-orange-600', textColor: 'text-amber-400', bgColor: 'bg-amber-500/10', borderColor: 'border-amber-500/20', trend: `${coordinators.filter((c) => c.status === 'Active').length} active` },
    { label: "Today's Events", value: todayEvents, icon: Clock, color: 'from-rose-500 to-red-600', textColor: 'text-rose-400', bgColor: 'bg-rose-500/10', borderColor: 'border-rose-500/20', trend: todayEvents === 0 ? 'No events today' : 'Happening now' },
  ];

  const quickActions = [
    { label: 'Add Event', icon: Plus, action: () => setActiveTab('Events'), color: 'bg-violet-600 hover:bg-violet-700' },
    { label: 'Add Coordinator', icon: UserCheck, action: () => setActiveTab('Coordinators'), color: 'bg-cyan-600 hover:bg-cyan-700' },
    { label: 'Add Announcement', icon: Megaphone, action: () => setActiveTab('Announcements'), color: 'bg-amber-600 hover:bg-amber-700' },
    { label: 'View Registrations', icon: Eye, action: () => setActiveTab('Registrations'), color: 'bg-emerald-600 hover:bg-emerald-700' },
    { label: 'Export Data', icon: Download, action: () => setActiveTab('Export Center'), color: 'bg-rose-600 hover:bg-rose-700' },
  ];

  const statusBadge = (status: EventItem['status']) => {
    const map = {
      Open: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
      Closed: 'bg-rose-500/20 text-rose-300 border-rose-500/30',
      Full: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
    };
    return map[status];
  };

  return (
    <div className="flex flex-col gap-6 select-none pb-12">
      {/* Welcome Banner */}
      <div className="relative overflow-hidden p-6 rounded-3xl bg-gradient-to-r from-violet-900/40 via-purple-900/20 to-cyan-900/30 border border-white/10 shadow-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="absolute top-0 right-0 w-96 h-96 bg-violet-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col gap-1 relative z-10">
          <span className="text-[10px] font-extrabold tracking-[0.3em] uppercase text-violet-400">
            CASYUM 2K26 Command Center
          </span>
          <h2 className="text-xl sm:text-2xl font-extrabold font-display text-white">
            Welcome back, Administrator
          </h2>
          <p className="text-xs text-white/60">
            Symposium is <span className="text-emerald-400 font-bold">LIVE</span>. Monitor events, participants, and analytics in real-time.
          </p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.label} className={`p-4 rounded-2xl bg-white/5 border ${card.borderColor} hover:border-white/30 transition-all flex flex-col justify-between gap-3 group`}>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-semibold text-white/50 truncate">{card.label}</span>
                <div className={`p-1.5 rounded-lg ${card.bgColor} ${card.textColor} border ${card.borderColor}`}>
                  <Icon className="w-3.5 h-3.5" />
                </div>
              </div>
              <div className="flex flex-col">
                <span className="text-xl sm:text-2xl font-extrabold font-display text-white">{card.value}</span>
                <span className="text-[9px] text-white/40 flex items-center gap-1 mt-0.5 font-medium truncate">
                  <TrendingUp className="w-2.5 h-2.5" /> {card.trend}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Quick Actions */}
      <div className="p-5 rounded-3xl bg-zinc-950/60 border border-white/10 backdrop-blur-md">
        <h3 className="text-xs font-bold text-white uppercase tracking-wider mb-4 flex items-center gap-2">
          <ArrowUpRight className="w-3.5 h-3.5 text-violet-400" />
          <span>Quick Actions</span>
        </h3>
        <div className="flex flex-wrap gap-3">
          {quickActions.map((qa) => {
            const Icon = qa.icon;
            return (
              <button
                key={qa.label}
                onClick={qa.action}
                className={`px-4 py-2.5 rounded-xl ${qa.color} text-white text-xs font-bold transition-all shadow-lg cursor-pointer flex items-center gap-2`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{qa.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Recent Events Table & Upcoming Events */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Events Table */}
        <div className="lg:col-span-2 rounded-3xl bg-zinc-950/60 border border-white/10 backdrop-blur-md overflow-hidden">
          <div className="p-4 border-b border-white/10 flex items-center justify-between">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Calendar className="w-3.5 h-3.5 text-violet-400" />
              <span>Recent Events</span>
            </h3>
            <button onClick={() => setActiveTab('Events')} className="text-[10px] text-violet-400 hover:text-violet-300 font-semibold cursor-pointer">
              View All
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-white">
              <thead className="bg-white/5 border-b border-white/10 text-[10px] uppercase tracking-wider text-white/50">
                <tr>
                  <th className="p-3">Event Name</th>
                  <th className="p-3">Date</th>
                  <th className="p-3">Venue</th>
                  <th className="p-3">Coordinator</th>
                  <th className="p-3">Registered</th>
                  <th className="p-3">Status</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {recentEvents.map((e) => {
                  const regCount = participants.filter((p) => p.registeredEvents?.includes(e.id)).length;
                  return (
                    <tr key={e.id} className="hover:bg-violet-500/5 transition-all">
                      <td className="p-3 font-semibold text-white truncate max-w-[120px]">{e.name}</td>
                      <td className="p-3 text-white/60">{e.date}</td>
                      <td className="p-3 text-white/60 truncate max-w-[100px]">{e.venue}</td>
                      <td className="p-3 text-white/60 truncate max-w-[100px]">{e.facultyCoordinator}</td>
                      <td className="p-3 font-mono text-white">{regCount}/{e.maxParticipants}</td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold border ${statusBadge(e.status)}`}>{e.status}</span>
                      </td>
                      <td className="p-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => setActiveTab('Events')} className="p-1 rounded-lg bg-white/5 hover:bg-white/10 text-white/60 hover:text-white cursor-pointer" title="View"><Eye className="w-3 h-3" /></button>
                          <button onClick={() => setActiveTab('Events')} className="p-1 rounded-lg bg-white/5 hover:bg-white/10 text-white/60 hover:text-white cursor-pointer" title="Edit"><Edit className="w-3 h-3" /></button>
                          <button onClick={() => setActiveTab('Events')} className="p-1 rounded-lg bg-white/5 hover:bg-rose-500/20 text-white/40 hover:text-rose-400 cursor-pointer" title="Delete"><Trash2 className="w-3 h-3" /></button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Upcoming Events Cards */}
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Clock className="w-3.5 h-3.5 text-cyan-400" />
              <span>Upcoming Events</span>
            </h3>
          </div>
          {upcomingEvents.length === 0 ? (
            <div className="p-6 rounded-2xl bg-zinc-950/60 border border-white/10 text-center text-xs text-white/40">No upcoming events scheduled.</div>
          ) : (
            upcomingEvents.map((e) => {
              const regCount = participants.filter((p) => p.registeredEvents?.includes(e.id)).length;
              const pct = Math.round((regCount / e.maxParticipants) * 100);
              return (
                <div key={e.id} className="p-4 rounded-2xl bg-zinc-950/60 border border-white/10 hover:border-violet-500/30 transition-all flex flex-col gap-3">
                  <div className="flex items-start justify-between">
                    <div className="flex flex-col">
                      <h4 className="text-xs font-bold text-white">{e.name}</h4>
                      <span className="text-[10px] text-white/50 flex items-center gap-1 mt-0.5"><Calendar className="w-3 h-3" /> {e.date}</span>
                      <span className="text-[10px] text-white/50 flex items-center gap-1"><MapPin className="w-3 h-3" /> {e.venue}</span>
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold border ${statusBadge(e.status)}`}>{e.status}</span>
                  </div>
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="text-white/50">Registration</span>
                      <span className="font-mono text-white">{pct}%</span>
                    </div>
                    <div className="w-full h-1.5 rounded-full bg-white/10 overflow-hidden">
                      <div className="h-full rounded-full bg-gradient-to-r from-violet-500 to-cyan-400" style={{ width: `${Math.min(pct, 100)}%` }} />
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-white/50">
                    <span>Coordinator: {e.facultyCoordinator}</span>
                    <button onClick={() => setActiveTab('Events')} className="text-violet-400 hover:text-violet-300 font-semibold cursor-pointer flex items-center gap-1">
                      View <ArrowUpRight className="w-2.5 h-2.5" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Analytics & Demographics Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Top Colleges */}
        <div className="p-5 rounded-3xl bg-zinc-950/60 border border-white/10 backdrop-blur-md">
          <h3 className="text-xs font-bold text-white uppercase tracking-wider mb-4">Top Colleges</h3>
          <div className="flex flex-col gap-3">
            {topColleges.map(([college, count]) => (
              <div key={college} className="flex items-center justify-between text-xs">
                <span className="text-white/80 truncate max-w-[180px]">{college}</span>
                <span className="font-mono font-bold text-violet-300 px-2 py-0.5 rounded bg-violet-500/10 border border-violet-500/20">{count}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Top Departments */}
        <div className="p-5 rounded-3xl bg-zinc-950/60 border border-white/10 backdrop-blur-md">
          <h3 className="text-xs font-bold text-white uppercase tracking-wider mb-4">Top Departments</h3>
          <div className="flex flex-col gap-3">
            {topDepts.map(([dept, count]) => (
              <div key={dept} className="flex items-center justify-between text-xs">
                <span className="text-white/80 truncate max-w-[180px]">{dept}</span>
                <span className="font-mono font-bold text-cyan-300 px-2 py-0.5 rounded bg-cyan-500/10 border border-cyan-500/20">{count}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Top Cities */}
        <div className="p-5 rounded-3xl bg-zinc-950/60 border border-white/10 backdrop-blur-md">
          <h3 className="text-xs font-bold text-white uppercase tracking-wider mb-4">Top Cities</h3>
          <div className="flex flex-col gap-3">
            {topCities.map(([city, count]) => (
              <div key={city} className="flex items-center justify-between text-xs">
                <span className="text-white/80 truncate max-w-[180px]">{city}</span>
                <span className="font-mono font-bold text-fuchsia-300 px-2 py-0.5 rounded bg-fuchsia-500/10 border border-fuchsia-500/20">{count}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Event Popularity */}
        <div className="p-5 rounded-3xl bg-zinc-950/60 border border-white/10 backdrop-blur-md">
          <h3 className="text-xs font-bold text-white uppercase tracking-wider mb-4">Event Popularity</h3>
          <div className="flex flex-col gap-3">
            {events.slice(0, 5).map((e) => {
              const regCount = participants.filter((p) => p.registeredEvents?.includes(e.id)).length;
              const pct = Math.round((regCount / e.maxParticipants) * 100);
              return (
                <div key={e.id} className="flex flex-col gap-1">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-white/80 truncate max-w-[140px]">{e.name}</span>
                    <span className="font-mono text-white/50">{regCount}/{e.maxParticipants}</span>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-white/10 overflow-hidden">
                    <div className={`h-full rounded-full ${pct >= 90 ? 'bg-gradient-to-r from-rose-500 to-amber-500' : 'bg-gradient-to-r from-violet-500 to-cyan-400'}`} style={{ width: `${Math.min(pct, 100)}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Notifications Section */}
      <div className="p-5 rounded-3xl bg-zinc-950/60 border border-white/10 backdrop-blur-md">
        <h3 className="text-xs font-bold text-white uppercase tracking-wider mb-4 flex items-center gap-2">
          <Megaphone className="w-3.5 h-3.5 text-amber-400" />
          <span>Recent Notifications</span>
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs flex flex-col gap-1">
            <span className="text-emerald-300 font-bold">New Registration</span>
            <span className="text-white/60">A new participant registered for Hackathon</span>
            <span className="text-[9px] text-white/30 mt-1">2 mins ago</span>
          </div>
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs flex flex-col gap-1">
            <span className="text-rose-300 font-bold">Registration Closed</span>
            <span className="text-white/60">LAN Party event reached max capacity</span>
            <span className="text-[9px] text-white/30 mt-1">1 hour ago</span>
          </div>
          <div className="p-3 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-xs flex flex-col gap-1">
            <span className="text-cyan-300 font-bold">Coordinator Assigned</span>
            <span className="text-white/60">Dr. Sharma assigned to Hackathon event</span>
            <span className="text-[9px] text-white/30 mt-1">3 hours ago</span>
          </div>
          <div className="p-3 rounded-xl bg-violet-500/10 border border-violet-500/20 text-xs flex flex-col gap-1">
            <span className="text-violet-300 font-bold">Event Updated</span>
            <span className="text-white/60">Tech Quiz schedule has been updated</span>
            <span className="text-[9px] text-white/30 mt-1">5 hours ago</span>
          </div>
        </div>
      </div>
    </div>
  );
};
