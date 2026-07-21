import React from 'react';
import {
  UserCheck,
  Shield,
  Eye,
  CheckSquare,
  Upload,
  Megaphone,
  X,
  Mail,
  Phone,
  GraduationCap,
  Calendar,
} from 'lucide-react';
import { useAdmin } from '../../context/AdminContext';

export const CoordinatorManagement: React.FC = () => {
  const { coordinators, events } = useAdmin();

  const facultyCoords = coordinators.filter((c) => c.type === 'Faculty');
  const studentCoords = coordinators.filter((c) => c.type === 'Student');
  const eventCoords = coordinators.filter((c) => c.type === 'Event');

  return (
    <div className="flex flex-col gap-6 select-none pb-12">
      {/* Header */}
      <div className="flex flex-col">
        <span className="text-xs font-bold text-violet-400 uppercase tracking-widest">
          Access Control & Delegation
        </span>
        <h2 className="text-xl sm:text-2xl font-extrabold font-display text-white">
          Coordinator Management ({coordinators.length})
        </h2>
      </div>

      {/* Type Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-2xl bg-zinc-950/60 border border-white/10 flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-white/50">Faculty Coordinators</span>
            <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              <GraduationCap className="w-4 h-4" />
            </div>
          </div>
          <span className="text-2xl font-extrabold text-white font-display">{facultyCoords.length}</span>
          <span className="text-[10px] text-cyan-400">Full event management privileges</span>
        </div>

        <div className="p-5 rounded-2xl bg-zinc-950/60 border border-white/10 flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-white/50">Student Coordinators</span>
            <div className="p-2 rounded-xl bg-violet-500/10 text-violet-400 border border-violet-500/20">
              <UserCheck className="w-4 h-4" />
            </div>
          </div>
          <span className="text-2xl font-extrabold text-white font-display">{studentCoords.length}</span>
          <span className="text-[10px] text-violet-400">Registration & announcement access</span>
        </div>

        <div className="p-5 rounded-2xl bg-zinc-950/60 border border-white/10 flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-white/50">Event Coordinators</span>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Calendar className="w-4 h-4" />
            </div>
          </div>
          <span className="text-2xl font-extrabold text-white font-display">{eventCoords.length}</span>
          <span className="text-[10px] text-emerald-400">Assigned event only</span>
        </div>
      </div>

      {/* Coordinator Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {coordinators.map((coord) => (
          <div
            key={coord.id}
            className="rounded-3xl bg-zinc-950/60 border border-white/10 hover:border-violet-500/30 backdrop-blur-md overflow-hidden flex flex-col transition-all"
          >
            {/* Header */}
            <div className="p-5 border-b border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold ${
                  coord.type === 'Faculty' ? 'bg-cyan-500/20 text-cyan-300' :
                  coord.type === 'Student' ? 'bg-violet-500/20 text-violet-300' :
                  'bg-emerald-500/20 text-emerald-300'
                }`}>
                  {coord.name.split(' ').map((n) => n[0]).join('').slice(0, 2)}
                </div>
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-white">{coord.name}</span>
                  <span className="text-[10px] text-white/50">{coord.department}</span>
                </div>
              </div>

              <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold border ${
                coord.type === 'Faculty' ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30' :
                coord.type === 'Student' ? 'bg-violet-500/20 text-violet-300 border-violet-500/30' :
                'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
              }`}>
                {coord.type}
              </span>
            </div>

            {/* Contact Details */}
            <div className="p-5 flex flex-col gap-3 flex-1">
              <div className="flex items-center gap-2 text-xs text-white/70">
                <Mail className="w-3.5 h-3.5 text-white/40" />
                <span>{coord.email}</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-white/70">
                <Phone className="w-3.5 h-3.5 text-white/40" />
                <span>{coord.phone}</span>
              </div>

              {coord.assignedEventName && (
                <div className="p-2.5 rounded-xl bg-violet-500/10 border border-violet-500/20 text-xs text-violet-300 flex items-center gap-2">
                  <Calendar className="w-3.5 h-3.5" />
                  <span>Assigned: <strong>{coord.assignedEventName}</strong></span>
                </div>
              )}

              {/* Permission Matrix */}
              <div className="flex flex-col gap-2 mt-2">
                <span className="text-[10px] font-bold text-white/40 uppercase tracking-wider">Permissions</span>
                <div className="grid grid-cols-2 gap-2">
                  <div className={`flex items-center gap-1.5 text-[10px] font-semibold p-2 rounded-lg border ${
                    coord.permissions.viewParticipants ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20' : 'bg-white/5 text-white/30 border-white/10'
                  }`}>
                    <Eye className="w-3 h-3" />
                    <span>View Participants</span>
                  </div>
                  <div className={`flex items-center gap-1.5 text-[10px] font-semibold p-2 rounded-lg border ${
                    coord.permissions.manageAttendance ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20' : 'bg-white/5 text-white/30 border-white/10'
                  }`}>
                    <CheckSquare className="w-3 h-3" />
                    <span>Attendance</span>
                  </div>
                  <div className={`flex items-center gap-1.5 text-[10px] font-semibold p-2 rounded-lg border ${
                    coord.permissions.uploadResults ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20' : 'bg-white/5 text-white/30 border-white/10'
                  }`}>
                    <Upload className="w-3 h-3" />
                    <span>Upload Results</span>
                  </div>
                  <div className={`flex items-center gap-1.5 text-[10px] font-semibold p-2 rounded-lg border ${
                    coord.permissions.announcements ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20' : 'bg-white/5 text-white/30 border-white/10'
                  }`}>
                    <Megaphone className="w-3 h-3" />
                    <span>Announcements</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
