import React, { useState } from 'react';
import { Search, X, Save, Image as ImageIcon, MapPin, Users } from 'lucide-react';
import { useAdmin } from '../../context/AdminContext';
import type { EventItem } from '../../types';
import { slugifyEventName } from '../../../services/eventSlug';
import { EVENT_IMAGE_MAP, DEFAULT_EVENT_IMAGE } from '../../../services/eventSlug';

const statusBadge = (status: string) => {
  const map: Record<string, string> = {
    Open: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
    Closed: 'bg-rose-500/20 text-rose-300 border-rose-500/30',
    Full: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
    Completed: 'bg-sky-500/20 text-sky-300 border-sky-500/30',
  };
  return map[status] || 'bg-white/10 text-white/60 border-white/20';
};

export const EventCardsModule: React.FC = () => {
  const { events, updateEvent } = useAdmin();
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<EventItem | null>(null);
  const [form, setForm] = useState({
    name: '',
    category: 'Technical' as EventItem['category'],
    tagline: '',
    shortDescription: '',
    cardImage: '',
    status: 'Open' as EventItem['status'],
  });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  const filtered = events.filter((e) => e.name.toLowerCase().includes(search.toLowerCase()));

  const openEdit = (e: EventItem) => {
    setEditing(e);
    setMessage('');
    setForm({
      name: e.name,
      category: e.category,
      tagline: e.tagline,
      shortDescription: (e as any).description || '',
      cardImage: EVENT_IMAGE_MAP[e.name] || DEFAULT_EVENT_IMAGE,
      status: e.status as EventItem['status'],
    });
  };

  const handleSave = async () => {
    if (!editing) return;
    if (!form.name.trim()) {
      setMessage('Event name is required.');
      return;
    }
    setSaving(true);
    setMessage('');
    try {
      await updateEvent({
        ...editing,
        name: form.name.trim(),
        category: form.category,
        tagline: form.tagline,
        description: form.shortDescription,
        shortDescription: form.shortDescription,
        status: form.status,
        slug: slugifyEventName(form.name.trim()),
        cardImage: form.cardImage.trim() || DEFAULT_EVENT_IMAGE,
        banner: form.cardImage.trim() || DEFAULT_EVENT_IMAGE,
      } as any);
      setMessage('Saved. The event card and slug will update on the public site.');
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Failed to save event card.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 select-none pb-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-col">
          <span className="text-xs font-bold text-violet-400 uppercase tracking-widest">Event Cards</span>
          <h2 className="text-xl sm:text-2xl font-extrabold font-display text-white">Public Event Cards</h2>
          <p className="text-[11px] text-white/40 mt-1">
            Manage what appears on the public Events bento grid — name, category, tagline, card image, and status.
          </p>
        </div>
        <div className="relative w-full md:w-72">
          <Search className="w-4 h-4 text-white/40 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search events..."
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-xs placeholder-white/30 focus:outline-none focus:border-violet-500/50"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filtered.length === 0 ? (
          <div className="col-span-full p-12 text-center text-xs text-white/40 rounded-3xl bg-zinc-950/60 border border-white/10">No events found.</div>
        ) : (
          filtered.map((e) => {
            const slug = slugifyEventName(e.name);
            return (
              <div key={e.id} className="group rounded-3xl bg-zinc-950/60 border border-white/10 hover:border-violet-500/40 backdrop-blur-md overflow-hidden transition-all duration-300 flex flex-col justify-between hover:shadow-[0_0_30px_rgba(139,92,246,0.15)]">
                <div className="relative h-36 overflow-hidden">
                  <img
                    src={EVENT_IMAGE_MAP[e.name] || DEFAULT_EVENT_IMAGE}
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
                    <span className="text-[11px] font-mono text-white/40">/events/{slug}</span>
                  </div>
                </div>
                <div className="p-4 flex flex-col gap-2 flex-1">
                  <p className="text-[11px] text-white/60 line-clamp-2">{e.tagline || e.description || 'No description yet.'}</p>
                  <div className="flex items-center justify-between text-[10px] text-white/40 pt-1">
                    <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{e.venue || 'Venue TBA'}</span>
                    <span className="flex items-center gap-1"><Users className="w-3 h-3" />{e.registeredCount}/{e.maxParticipants}</span>
                  </div>
                </div>
                <div className="p-3 border-t border-white/10 bg-white/5">
                  <button
                    onClick={() => openEdit(e)}
                    className="w-full px-3 py-2 rounded-xl bg-violet-600/20 hover:bg-violet-600/40 text-violet-200 text-[11px] font-bold border border-violet-500/30 transition-all cursor-pointer"
                  >
                    Edit Card
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {editing && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-2xl bg-zinc-950 border border-white/20 rounded-3xl p-6 shadow-2xl flex flex-col gap-5 max-h-[90vh] overflow-y-auto custom-scrollbar">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <h3 className="text-lg font-bold font-display text-white">Edit Event Card</h3>
              <button onClick={() => setEditing(null)} className="p-2 rounded-xl text-white/60 hover:text-white bg-white/5 border border-white/10 cursor-pointer"><X className="w-4 h-4" /></button>
            </div>
            <div className="flex flex-col gap-4 text-xs">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-white/50 uppercase">Event Name</label>
                  <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="p-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/30 focus:outline-none focus:border-violet-500/50" />
                  <span className="text-[10px] font-mono text-violet-300">/events/{slugifyEventName(form.name)}</span>
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
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-white/50 uppercase">Tagline</label>
                <input value={form.tagline} onChange={(e) => setForm({ ...form, tagline: e.target.value })} className="p-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/30 focus:outline-none" />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-white/50 uppercase">Short Description</label>
                <textarea value={form.shortDescription} onChange={(e) => setForm({ ...form, shortDescription: e.target.value })} rows={3} className="p-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/30 focus:outline-none resize-none" placeholder="Shown on the public event card" />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-white/50 uppercase">Card Image URL</label>
                <div className="flex items-center gap-2">
                  <ImageIcon className="w-4 h-4 text-white/40 flex-shrink-0" />
                  <input value={form.cardImage} onChange={(e) => setForm({ ...form, cardImage: e.target.value })} className="w-full p-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/30 focus:outline-none focus:border-violet-500/50" placeholder="https://... or /images/events/xxx.png" />
                </div>
                {form.cardImage && (
                  <img src={form.cardImage} alt="Card preview" className="mt-2 w-40 h-28 object-cover rounded-xl border border-white/10" />
                )}
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-white/50 uppercase">Registration Status</label>
                <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as EventItem['status'] })} className="bg-zinc-900 border border-white/10 text-white text-xs rounded-xl px-3 py-3 focus:outline-none">
                  <option value="Open">Open</option>
                  <option value="Closed">Closed</option>
                  <option value="Full">Full</option>
                  <option value="Completed">Completed</option>
                </select>
              </div>
              {message && <p className="text-xs text-violet-300">{message}</p>}
              <div className="flex justify-end gap-3 border-t border-white/10 pt-4">
                <button onClick={() => setEditing(null)} className="px-4 py-2 rounded-xl text-white/60 hover:text-white bg-white/5 border border-white/10 font-bold cursor-pointer">Cancel</button>
                <button onClick={() => void handleSave()} disabled={saving} className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-bold transition-all shadow-lg cursor-pointer disabled:opacity-50">
                  <Save className="w-3.5 h-3.5" />
                  {saving ? 'Saving...' : 'Save Card'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EventCardsModule;
