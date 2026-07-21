import React, { useState } from 'react';
import {
  Calendar,
  Users,
  MapPin,
  Clock,
  DollarSign,
  Download,
  Megaphone,
  CheckCircle2,
  Lock,
  Unlock,
  X,
  FileSpreadsheet,
  FileText,
  Sparkles,
} from 'lucide-react';
import { useAdmin } from '../../context/AdminContext';
import type { EventItem } from '../../types';
import { exportToCSV, exportToPrintableReport } from '../../utils/exportUtils';

export const EventManagement: React.FC = () => {
  const { events, participants, toggleEventStatus, createAnnouncement } = useAdmin();
  const [selectedEvent, setSelectedEvent] = useState<EventItem | null>(null);
  const [announcementText, setAnnouncementText] = useState('');
  const [showAncInput, setShowAncInput] = useState(false);

  const handleExportEventCSV = (event: EventItem) => {
    const eventParticipants = participants.filter((p) => p.registeredEvents?.includes(event.id));
    const data = eventParticipants.map((p) => ({
      ID: p.id,
      Name: p.name,
      College: p.college,
      Department: p.department,
      RegNo: p.registerNumber,
      Mobile: p.mobile,
      Email: p.email,
      PaymentStatus: p.paymentStatus,
    }));
    exportToCSV(`${event.name}_Participants`, data);
  };

  const handleExportEventPDF = (event: EventItem) => {
    const eventParticipants = participants.filter((p) => p.registeredEvents?.includes(event.id));
    const rows = eventParticipants.map((p) => [
      p.id,
      p.name,
      p.college,
      p.department,
      p.mobile,
      p.paymentStatus,
    ]);
    exportToPrintableReport(
      `Event Roster - ${event.name}`,
      ['ID', 'Name', 'College', 'Dept', 'Mobile', 'Payment Status'],
      rows
    );
  };

  const handleSendEventAnnouncement = (event: EventItem) => {
    if (!announcementText.trim()) return;
    createAnnouncement({
      title: `Announcement for ${event.name}`,
      description: announcementText,
      target: 'Specific Event',
      targetEventId: event.id,
      priority: 'High',
      author: 'Event Coordinator',
      status: 'Published',
    });
    setAnnouncementText('');
    setShowAncInput(false);
  };

  return (
    <div className="flex flex-col gap-6 select-none pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-col">
          <span className="text-xs font-bold text-violet-400 uppercase tracking-widest">
            Symposium Schedule & Arenas
          </span>
          <h2 className="text-xl sm:text-2xl font-extrabold font-display text-white">
            Event Management ({events.length})
          </h2>
        </div>
      </div>

      {/* Grid of Event Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {events.map((e) => {
          const registeredCount = participants.filter((p) => p.registeredEvents?.includes(e.id)).length;
          const pct = Math.round((registeredCount / e.maxParticipants) * 100);

          return (
            <div
              key={e.id}
              className="group rounded-3xl bg-zinc-950/60 border border-white/10 hover:border-violet-500/40 backdrop-blur-md overflow-hidden transition-all duration-300 flex flex-col justify-between hover:shadow-[0_0_30px_rgba(139,92,246,0.15)]"
            >
              {/* Banner Image Header */}
              <div className="relative h-40 overflow-hidden">
                <img
                  src={e.bannerImage}
                  alt={e.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/40 to-transparent" />

                <div className="absolute top-3 left-3 flex items-center gap-2">
                  <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-black/60 backdrop-blur-md text-violet-300 border border-white/10">
                    {e.category}
                  </span>
                </div>

                <div className="absolute top-3 right-3">
                  <span
                    className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase ${
                      e.status === 'Open'
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                    }`}
                  >
                    {e.status}
                  </span>
                </div>

                <div className="absolute bottom-3 left-3 right-3 flex flex-col">
                  <h3 className="text-base font-extrabold text-white font-display line-clamp-1">{e.name}</h3>
                  <span className="text-[11px] text-white/60 line-clamp-1">{e.tagline}</span>
                </div>
              </div>

              {/* Card Body */}
              <div className="p-5 flex flex-col gap-4">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-white/50 flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-violet-400" />
                    <span className="truncate max-w-[140px]">{e.venue}</span>
                  </span>
                  <span className="font-mono font-bold text-emerald-400">₹{e.fee}</span>
                </div>

                <div className="flex items-center justify-between text-xs">
                  <span className="text-white/50 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-cyan-400" />
                    <span>{e.time}</span>
                  </span>
                </div>

                {/* Progress bar */}
                <div className="flex flex-col gap-1.5 mt-1">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-white/60 flex items-center gap-1">
                      <Users className="w-3.5 h-3.5 text-purple-400" /> Registered
                    </span>
                    <span className="font-mono text-white">
                      {registeredCount} / {e.maxParticipants} ({pct}%)
                    </span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-violet-500 to-cyan-400"
                      style={{ width: `${Math.min(pct, 100)}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Card Footer Actions */}
              <div className="p-4 border-t border-white/10 bg-white/5 flex items-center justify-between">
                <button
                  onClick={() => setSelectedEvent(e)}
                  className="px-4 py-2 rounded-xl bg-violet-600/20 hover:bg-violet-600/30 text-violet-300 border border-violet-500/30 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Overview & Details</span>
                </button>

                <button
                  onClick={() => toggleEventStatus(e.id)}
                  className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 hover:text-white cursor-pointer"
                  title={e.status === 'Open' ? 'Close Registration' : 'Open Registration'}
                >
                  {e.status === 'Open' ? <Lock className="w-4 h-4 text-amber-400" /> : <Unlock className="w-4 h-4 text-emerald-400" />}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Event Details Modal */}
      {selectedEvent && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-3xl bg-zinc-950 border border-white/20 rounded-3xl p-6 sm:p-8 shadow-2xl flex flex-col gap-6 max-h-[90vh] overflow-y-auto custom-scrollbar">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div className="flex flex-col">
                <span className="text-xs font-bold text-violet-400 uppercase tracking-widest">
                  Event Control Dashboard
                </span>
                <h3 className="text-xl font-bold font-display text-white">{selectedEvent.name}</h3>
              </div>
              <button
                onClick={() => setSelectedEvent(null)}
                className="p-2 rounded-xl text-white/60 hover:text-white bg-white/5 border border-white/10 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Event Info Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="p-3.5 rounded-2xl bg-white/5 border border-white/5 flex flex-col gap-1">
                <span className="text-[10px] font-semibold text-white/40 uppercase">Faculty Coord</span>
                <span className="text-xs font-bold text-white truncate">{selectedEvent.facultyCoordinator}</span>
              </div>
              <div className="p-3.5 rounded-2xl bg-white/5 border border-white/5 flex flex-col gap-1">
                <span className="text-[10px] font-semibold text-white/40 uppercase">Student Coord</span>
                <span className="text-xs font-bold text-white truncate">{selectedEvent.studentCoordinator}</span>
              </div>
              <div className="p-3.5 rounded-2xl bg-white/5 border border-white/5 flex flex-col gap-1">
                <span className="text-[10px] font-semibold text-white/40 uppercase">Total Revenue</span>
                <span className="text-xs font-bold text-emerald-400 font-mono">₹{selectedEvent.revenue}</span>
              </div>
              <div className="p-3.5 rounded-2xl bg-white/5 border border-white/5 flex flex-col gap-1">
                <span className="text-[10px] font-semibold text-white/40 uppercase">Max Quota</span>
                <span className="text-xs font-bold text-cyan-300 font-mono">{selectedEvent.maxParticipants} Seats</span>
              </div>
            </div>

            {/* Event Description & Rules */}
            <div className="p-4 rounded-2xl bg-white/5 border border-white/10 flex flex-col gap-3">
              <span className="text-xs font-bold text-white uppercase tracking-wider">Event Overview</span>
              <p className="text-xs text-white/70 leading-relaxed">{selectedEvent.description}</p>
              <div className="flex flex-col gap-1 mt-2">
                <span className="text-[11px] font-bold text-violet-300">Rules & Guidelines:</span>
                <ul className="list-disc list-inside text-xs text-white/60 space-y-1">
                  {selectedEvent.rules.map((r, i) => (
                    <li key={i}>{r}</li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Target Announcement Trigger */}
            <div className="p-4 rounded-2xl bg-violet-600/10 border border-violet-500/30 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-violet-300 flex items-center gap-2">
                  <Megaphone className="w-4 h-4 text-violet-400" />
                  <span>Broadcast Announcement to Event Participants</span>
                </span>
                <button
                  onClick={() => setShowAncInput(!showAncInput)}
                  className="text-xs text-violet-400 hover:text-violet-300 font-bold"
                >
                  {showAncInput ? 'Cancel' : '+ Compose'}
                </button>
              </div>

              {showAncInput && (
                <div className="flex flex-col gap-2 mt-2">
                  <textarea
                    value={announcementText}
                    onChange={(e) => setAnnouncementText(e.target.value)}
                    placeholder="Type announcement message for participants..."
                    className="p-3 rounded-xl bg-black border border-white/20 text-xs text-white placeholder-white/40 focus:outline-none"
                  />
                  <button
                    onClick={() => handleSendEventAnnouncement(selectedEvent)}
                    className="self-end px-4 py-2 rounded-xl bg-violet-600 text-white text-xs font-bold cursor-pointer"
                  >
                    Send Announcement
                  </button>
                </div>
              )}
            </div>

            {/* Exports Footer */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-4">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleExportEventCSV(selectedEvent)}
                  className="px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white text-xs font-bold flex items-center gap-2 cursor-pointer"
                >
                  <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                  <span>Export Roster CSV</span>
                </button>
                <button
                  onClick={() => handleExportEventPDF(selectedEvent)}
                  className="px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white text-xs font-bold flex items-center gap-2 cursor-pointer"
                >
                  <FileText className="w-4 h-4 text-rose-400" />
                  <span>Download PDF</span>
                </button>
              </div>

              <button
                onClick={() => setSelectedEvent(null)}
                className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
