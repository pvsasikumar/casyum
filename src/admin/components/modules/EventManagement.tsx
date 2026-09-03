import React, { useState, useMemo } from 'react';
import {
  Search,
  Plus,
  X,
  Edit,
  Trash2,
  MapPin,
  Clock,
  Users,
  Lock,
  Unlock,
  Filter,
  Calendar,
  Settings,
} from 'lucide-react';
import { useAdmin } from '../../context/AdminContext';
import type { EventItem } from '../../types';
import { ConfirmationDialog } from '../common/ConfirmationDialog';
import { DEFAULT_EVENT_IMAGE } from '../../../services/eventSlug';

const emptyEventForm = {
  name: '',
  category: 'Technical' as EventItem['category'],
  event_type: 'regular' as EventItem['event_type'],
  tagline: '',
  description: '',
  iconName: 'Calendar',
  bannerImage: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=800&q=80',
  venue: '',
  time: '',
  date: '',
  fee: 0,
  maxParticipants: 100,
  registeredCount: 0,
  facultyCoordinator: '',
  studentCoordinator: '',
  status: 'Open' as EventItem['status'],
  rules: [''],
  teamEvent: false,
  minTeamSize: 2,
  maxTeamSize: 4,
  teamFormationEnabled: false,
  feeType: 'Per Participant',
};

export const EventManagement: React.FC = () => {
  const { events, participants, coordinators, toggleEventStatus, openTeamSettings, addEvent, updateEvent, deleteEvent } = useAdmin();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [categoryFilter, setCategoryFilter] = useState<string>('All');
  const [showForm, setShowForm] = useState(false);
  const [editingEvent, setEditingEvent] = useState<EventItem | null>(null);
  const [form, setForm] = useState(emptyEventForm);
  const [deleteConfirm, setDeleteConfirm] = useState<EventItem | null>(null);
  const [selectedCoordinatorIds, setSelectedCoordinatorIds] = useState<string[]>([]);
  const [coordSearch, setCoordSearch] = useState('');
  const filteredEvents = useMemo(() => {
    return events.filter((e) => {
      const matchesSearch = e.name.toLowerCase().includes(search.toLowerCase()) || e.venue.toLowerCase().includes(search.toLowerCase());
      const matchesStatus = statusFilter === 'All' || e.status === statusFilter;
      const matchesCategory = categoryFilter === 'All' || e.category === categoryFilter;
      return matchesSearch && matchesStatus && matchesCategory;
    });
  }, [events, search, statusFilter, categoryFilter]);

  const openAddForm = () => {
    setEditingEvent(null);
    setForm(emptyEventForm);
    setSelectedCoordinatorIds([]);
    setShowForm(true);
  };

  const openEditForm = (e: EventItem) => {
    setEditingEvent(e);
    setForm({
      name: e.name,
      category: e.category,
      event_type: e.event_type || (e.category === 'Gaming' ? 'gaming' : 'regular'),
      tagline: e.tagline,
      description: e.description,
      iconName: e.iconName,
      bannerImage: e.bannerImage,
      venue: e.venue,
      time: e.time,
      date: e.date,
      fee: e.fee,
      maxParticipants: e.maxParticipants,
      registeredCount: e.registeredCount,
      facultyCoordinator: e.facultyCoordinator,
      studentCoordinator: e.studentCoordinator,
      status: e.status,
      rules: e.rules,
      teamEvent: e.teamEvent === true,
      minTeamSize: Number(e.minTeamSize) || 2,
      maxTeamSize: Number(e.maxTeamSize) || 4,
      teamFormationEnabled: e.teamFormationEnabled === true,
      feeType: e.feeType || 'Per Participant',
    });
    setSelectedCoordinatorIds([]);
    setShowForm(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.venue || !form.date) return;

    if (editingEvent) {
      updateEvent({ ...editingEvent, ...form });
    } else {
      addEvent(form);
    }
    setShowForm(false);
    setEditingEvent(null);
  };

  const handleDelete = () => {
    if (deleteConfirm) {
      deleteEvent(deleteConfirm.id);
      setDeleteConfirm(null);
    }
  };

  const toggleCoordinator = (coordId: string) => {
    setSelectedCoordinatorIds((prev) =>
      prev.includes(coordId) ? prev.filter((id) => id !== coordId) : [...prev, coordId]
    );
  };

  const filteredCoordinators = coordinators.filter((c) =>
    c.full_name.toLowerCase().includes(coordSearch.toLowerCase())
  );

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
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-col">
          <span className="text-xs font-bold text-violet-400 uppercase tracking-widest">Event Management</span>
          <h2 className="text-xl sm:text-2xl font-extrabold font-display text-white">All Events ({events.length})</h2>
        </div>
        <button onClick={openAddForm} className="px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold transition-all shadow-lg shadow-violet-500/25 cursor-pointer flex items-center gap-2">
          <Plus className="w-3.5 h-3.5" />
          <span>Add Event</span>
        </button>
      </div>

      {/* Search & Filters */}
      <div className="p-4 rounded-3xl bg-zinc-950/60 border border-white/10 backdrop-blur-md flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative w-full md:w-72">
          <Search className="w-4 h-4 text-white/40 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search events..." className="w-full pl-9 pr-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-xs placeholder-white/30 focus:outline-none focus:border-violet-500/50" />
        </div>
        <div className="flex items-center gap-3 text-xs w-full md:w-auto">
          <Filter className="w-3.5 h-3.5 text-white/40" />
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="bg-zinc-900 border border-white/10 text-white text-xs rounded-xl px-3 py-2 focus:outline-none">
            <option value="All">All Status</option>
            <option value="Open">Open</option>
            <option value="Closed">Closed</option>
            <option value="Full">Full</option>
          </select>
          <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className="bg-zinc-900 border border-white/10 text-white text-xs rounded-xl px-3 py-2 focus:outline-none">
            <option value="All">All Categories</option>
            <option value="Technical">Technical</option>
            <option value="Non-Technical">Non-Technical</option>
            <option value="Workshop">Workshop</option>
            <option value="Gaming">Gaming</option>
          </select>
        </div>
      </div>

      {/* Events Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredEvents.length === 0 ? (
          <div className="col-span-full p-12 text-center text-xs text-white/40 rounded-3xl bg-zinc-950/60 border border-white/10">No events found.</div>
        ) : (
          filteredEvents.map((e) => {
            const regCount = participants.filter((p) => p.registeredEvents?.includes(e.id)).length;
            const pct = Math.round((regCount / e.maxParticipants) * 100);
            return (
              <div key={e.id} className="group rounded-3xl bg-zinc-950/60 border border-white/10 hover:border-violet-500/40 backdrop-blur-md overflow-hidden transition-all duration-300 flex flex-col justify-between hover:shadow-[0_0_30px_rgba(139,92,246,0.15)]">
                <div className="relative h-36 overflow-hidden">
                  <img
                    src={e.bannerImage}
                    alt={e.name}
                    onError={(ev) => {
                      if (ev.currentTarget.src !== window.location.origin + DEFAULT_EVENT_IMAGE) ev.currentTarget.src = DEFAULT_EVENT_IMAGE;
                    }}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/40 to-transparent" />
                  <div className="absolute top-3 left-3">
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-black/60 backdrop-blur-md text-violet-300 border border-white/10">{e.category}</span>
                  </div>
                  <div className="absolute top-3 right-3">
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase border ${statusBadge(e.status)}`}>{e.status}</span>
                  </div>
                  <div className="absolute bottom-3 left-3 right-3">
                    <h3 className="text-base font-extrabold text-white font-display line-clamp-1">{e.name}</h3>
                    <span className="text-[11px] text-white/60 line-clamp-1">{e.tagline}</span>
                  </div>
                </div>
                <div className="p-4 flex flex-col gap-3 flex-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-white/50 flex items-center gap-1.5"><MapPin className="w-3 h-3 text-violet-400" />{e.venue}</span>
                    <span className="text-white/50 flex items-center gap-1.5"><Clock className="w-3 h-3 text-cyan-400" />{e.time}</span>
                  </div>
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-white/60 flex items-center gap-1"><Users className="w-3 h-3 text-purple-400" /> Registered</span>
                      <span className="font-mono text-white">{regCount}/{e.maxParticipants} ({pct}%)</span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden">
                      <div className="h-full rounded-full bg-gradient-to-r from-violet-500 to-cyan-400" style={{ width: `${Math.min(pct, 100)}%` }} />
                    </div>
                  </div>
                  <div className="text-[10px] text-white/40 flex items-center gap-1"><Calendar className="w-3 h-3" />{e.date}</div>
                  {e.teamEvent === true && (
                    <div className="flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-xl bg-amber-500/5 border border-amber-500/15">
                      <span className="text-[10px] font-bold text-amber-300/90 flex items-center gap-1">
                        <Users className="w-3 h-3" />
                        Team {e.minTeamSize}–{e.maxTeamSize}
                      </span>
                      <span className={`text-[9px] font-extrabold uppercase tracking-widest ${e.teamFormationEnabled ? 'text-emerald-300' : 'text-rose-300/80'}`}>
                        {e.teamFormationEnabled ? 'Formation OPEN' : 'Formation LOCKED'}
                      </span>
                    </div>
                  )}
                </div>
                <div className="p-3 border-t border-white/10 bg-white/5 flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <button onClick={() => openEditForm(e)} className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-white/70 hover:text-white cursor-pointer" title="Edit"><Edit className="w-3.5 h-3.5" /></button>
                    <button onClick={() => setDeleteConfirm(e)} className="p-2 rounded-lg bg-white/5 hover:bg-rose-500/20 text-white/40 hover:text-rose-400 cursor-pointer" title="Delete"><Trash2 className="w-3.5 h-3.5" /></button>
                    {e.teamEvent === true && (
                      <button onClick={() => openTeamSettings(e.id)} className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-white/70 hover:text-white cursor-pointer" title="Team Settings">
                        <Settings className="w-3.5 h-3.5 text-cyan-300" />
                      </button>
                    )}
                  </div>
                  <button onClick={() => toggleEventStatus(e.id)} className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-white/70 hover:text-white cursor-pointer" title={e.status === 'Open' ? 'Close Registration' : 'Open Registration'}>
                    {e.status === 'Open' ? <Lock className="w-3.5 h-3.5 text-amber-400" /> : <Unlock className="w-3.5 h-3.5 text-emerald-400" />}
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Add/Edit Event Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-2xl bg-zinc-950 border border-white/20 rounded-3xl p-6 shadow-2xl flex flex-col gap-5 max-h-[90vh] overflow-y-auto custom-scrollbar">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <h3 className="text-lg font-bold font-display text-white">{editingEvent ? 'Edit Event' : 'Create New Event'}</h3>
              <button onClick={() => setShowForm(false)} className="p-2 rounded-xl text-white/60 hover:text-white bg-white/5 border border-white/10 cursor-pointer"><X className="w-4 h-4" /></button>
            </div>
            <form onSubmit={handleSubmit} className="flex flex-col gap-4 text-xs">
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-white/50 uppercase">Event Name</label>
                  <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="p-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/30 focus:outline-none focus:border-violet-500/50" placeholder="Enter event name" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-white/50 uppercase">Category</label>
                  <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value as EventItem['category'] })} className="bg-zinc-900 border border-white/10 text-white text-xs rounded-xl px-3 py-3 focus:outline-none">
                    <option value="Technical">Technical</option>
                    <option value="Non-Technical">Non-Technical</option>
                    <option value="Workshop">Workshop</option>
                    <option value="Gaming">Gaming</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-white/50 uppercase">Event Type</label>
                  <select value={form.event_type} onChange={(e) => setForm({ ...form, event_type: e.target.value as EventItem['event_type'] })} className="bg-zinc-900 border border-white/10 text-white text-xs rounded-xl px-3 py-3 focus:outline-none">
                    <option value="regular">Regular</option>
                    <option value="gaming">Gaming</option>
                  </select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-white/50 uppercase">Tagline</label>
                  <input value={form.tagline} onChange={(e) => setForm({ ...form, tagline: e.target.value })} className="p-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/30 focus:outline-none" placeholder="Short tagline" />
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-white/50 uppercase">Description</label>
                <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} className="p-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/30 focus:outline-none resize-none" placeholder="Event description" />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-white/50 uppercase">Venue</label>
                  <input required value={form.venue} onChange={(e) => setForm({ ...form, venue: e.target.value })} className="p-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/30 focus:outline-none" placeholder="Venue" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-white/50 uppercase">Date</label>
                  <input required type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} className="p-3 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-white/50 uppercase">Time</label>
                  <input value={form.time} onChange={(e) => setForm({ ...form, time: e.target.value })} className="p-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/30 focus:outline-none" placeholder="e.g. 10:00 AM - 4:00 PM" />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-white/50 uppercase">Max Participants</label>
                  <input type="number" value={form.maxParticipants} onChange={(e) => setForm({ ...form, maxParticipants: Number(e.target.value) })} className="p-3 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-white/50 uppercase">Fee (₹)</label>
                  <input type="number" value={form.fee} onChange={(e) => setForm({ ...form, fee: Number(e.target.value) })} className="p-3 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-white/50 uppercase">Status</label>
                  <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as EventItem['status'] })} className="bg-zinc-900 border border-white/10 text-white text-xs rounded-xl px-3 py-3 focus:outline-none">
                    <option value="Open">Open</option>
                    <option value="Closed">Closed</option>
                    <option value="Full">Full</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-white/50 uppercase">Faculty Coordinator</label>
                  <input value={form.facultyCoordinator} onChange={(e) => setForm({ ...form, facultyCoordinator: e.target.value })} className="p-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/30 focus:outline-none" placeholder="Name" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-white/50 uppercase">Student Coordinator</label>
                  <input value={form.studentCoordinator} onChange={(e) => setForm({ ...form, studentCoordinator: e.target.value })} className="p-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/30 focus:outline-none" placeholder="Name" />
                </div>
              </div>

              {/* Assign Coordinators */}
              <div className="flex flex-col gap-2 p-4 rounded-2xl bg-violet-500/10 border border-violet-500/20">
                <label className="text-[10px] font-bold text-violet-300 uppercase tracking-wider">Assign Coordinators</label>
                <input value={coordSearch} onChange={(e) => setCoordSearch(e.target.value)} placeholder="Search coordinators..." className="p-2.5 rounded-xl bg-black/60 border border-white/10 text-white text-xs placeholder-white/30 focus:outline-none" />
                <div className="flex flex-wrap gap-2 max-h-24 overflow-y-auto">
                  {filteredCoordinators.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => toggleCoordinator(String(c.id))}
                      className={`px-3 py-1.5 rounded-xl text-[10px] font-semibold border transition-all cursor-pointer ${
                        selectedCoordinatorIds.includes(String(c.id))
                          ? 'bg-violet-600/30 text-violet-200 border-violet-500/50'
                          : 'bg-white/5 text-white/60 border-white/10 hover:border-white/30'
                      }`}
                    >
                      {c.full_name} ({c.designation || c.department || c.role})
                    </button>
                  ))}
                </div>
                {selectedCoordinatorIds.length > 0 && (
                  <div className="text-[10px] text-violet-300">{selectedCoordinatorIds.length} coordinator(s) selected</div>
                )}
              </div>

              {/* Team Formation */}
              <div className="flex flex-col gap-3 p-4 rounded-2xl bg-amber-500/5 border border-amber-500/20">
                <label className="text-[10px] font-bold text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5" />
                  Team Formation Configuration
                </label>

                <div className="flex items-center justify-between gap-3">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[11px] font-bold text-white">Team Event</span>
                    <span className="text-[10px] text-white/40">Solo events do not require teams.</span>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      setForm((f) => ({
                        ...f,
                        teamEvent: !f.teamEvent,
                        teamFormationEnabled: !f.teamEvent ? f.teamFormationEnabled : false,
                      }))
                    }
                    className={`w-11 h-6 rounded-full transition-colors cursor-pointer relative ${
                      form.teamEvent ? 'bg-amber-500' : 'bg-white/10'
                    }`}
                    title={form.teamEvent ? 'Solo Event' : 'Team Event'}
                  >
                    <span
                      className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all ${
                        form.teamEvent ? 'left-[22px]' : 'left-0.5'
                      }`}
                    />
                  </button>
                </div>

                {form.teamEvent && (
                  <>
                    <div className="grid grid-cols-3 gap-3">
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] font-bold text-white/50 uppercase">Min Team Size</label>
                        <input
                          type="number"
                          min={1}
                          value={form.minTeamSize}
                          onChange={(e) => setForm((f) => ({ ...f, minTeamSize: Number(e.target.value) }))}
                          className="p-3 rounded-xl bg-black/60 border border-white/10 text-white focus:outline-none focus:border-amber-500/50"
                        />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] font-bold text-white/50 uppercase">Max Team Size</label>
                        <input
                          type="number"
                          min={1}
                          value={form.maxTeamSize}
                          onChange={(e) => setForm((f) => ({ ...f, maxTeamSize: Number(e.target.value) }))}
                          className="p-3 rounded-xl bg-black/60 border border-white/10 text-white focus:outline-none focus:border-amber-500/50"
                        />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] font-bold text-white/50 uppercase">Fee Type</label>
                        <select
                          value={form.feeType}
                          onChange={(e) => setForm((f) => ({ ...f, feeType: e.target.value }))}
                          className="bg-zinc-900 border border-white/10 text-white text-xs rounded-xl px-3 py-3 focus:outline-none"
                        >
                          <option value="Per Participant">Per Participant</option>
                          <option value="Per Team">Per Team</option>
                        </select>
                      </div>
                    </div>
                    {form.minTeamSize > 0 && form.minTeamSize === form.maxTeamSize && (
                      <div className="text-[10px] text-white/40">
                        This is an exact-size team — a team will be marked Complete only with exactly{' '}
                        {form.maxTeamSize} members.
                      </div>
                    )}
                    {form.minTeamSize > form.maxTeamSize && (
                      <div className="text-[10px] text-rose-400">Min team size cannot exceed max team size.</div>
                    )}

                    <div className="flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl bg-white/[0.03] border border-white/10">
                      <div className="flex flex-col gap-0.5">
                        <span className="text-[11px] font-bold text-white">
                          Team Formation Status:{' '}
                          <span className={form.teamFormationEnabled ? 'text-emerald-300' : 'text-rose-300'}>
                            {form.teamFormationEnabled ? 'OPEN' : 'LOCKED'}
                          </span>
                        </span>
                        <span className="text-[10px] text-white/40">
                          Manage from the Team Settings page for this event (enable/disable is confirmed there).
                        </span>
                      </div>
                      <span className="text-[10px] font-bold uppercase tracking-widest text-white/30 px-3 py-1.5 rounded-lg border border-white/10">
                        Managed in Team Settings
                      </span>
                    </div>
                  </>
                )}
              </div>

              <div className="flex justify-end gap-3 border-t border-white/10 pt-4">
                <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 rounded-xl text-white/60 hover:text-white bg-white/5 border border-white/10 font-bold cursor-pointer">Cancel</button>
                <button type="submit" className="px-6 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-bold transition-all shadow-lg cursor-pointer">
                  {editingEvent ? 'Update Event' : 'Create Event'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      <ConfirmationDialog
        open={!!deleteConfirm}
        title="Delete Event"
        message={`Are you sure you want to delete "${deleteConfirm?.name}"? This action cannot be undone.`}
        confirmLabel="Delete"
        variant="danger"
        onConfirm={handleDelete}
        onCancel={() => setDeleteConfirm(null)}
      />
    </div>
  );
};
