import React, { useState } from 'react';
import {
  Megaphone,
  Plus,
  X,
  Trash2,
  Send,
  Globe,
  Calendar,
  Users,
} from 'lucide-react';
import { useAdmin } from '../../context/AdminContext';
import type { Announcement, PriorityLevel } from '../../types';

export const AnnouncementCenter: React.FC = () => {
  const { announcements, events, createAnnouncement, deleteAnnouncement } = useAdmin();
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [target, setTarget] = useState<Announcement['target']>('Entire Symposium');
  const [targetEventId, setTargetEventId] = useState('');
  const [priority, setPriority] = useState<PriorityLevel>('Medium');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) return;

    createAnnouncement({
      title,
      description,
      target,
      targetEventId: target === 'Specific Event' ? targetEventId : undefined,
      priority,
      author: 'Super Admin',
      status: 'Published',
    });

    setTitle('');
    setDescription('');
    setTarget('Entire Symposium');
    setPriority('Medium');
    setShowForm(false);
  };

  const getPriorityStyle = (p: PriorityLevel) => {
    switch (p) {
      case 'Emergency': return 'bg-rose-500/20 text-rose-300 border-rose-500/30';
      case 'High': return 'bg-amber-500/20 text-amber-300 border-amber-500/30';
      case 'Medium': return 'bg-violet-500/20 text-violet-300 border-violet-500/30';
      case 'Low': return 'bg-white/10 text-white/60 border-white/20';
    }
  };

  const getTargetIcon = (t: Announcement['target']) => {
    switch (t) {
      case 'Entire Symposium': return <Globe className="w-3.5 h-3.5 text-cyan-400" />;
      case 'Specific Event': return <Calendar className="w-3.5 h-3.5 text-violet-400" />;
      case 'Selected Participants': return <Users className="w-3.5 h-3.5 text-emerald-400" />;
    }
  };

  return (
    <div className="flex flex-col gap-6 select-none pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-col">
          <span className="text-xs font-bold text-violet-400 uppercase tracking-widest">
            Broadcast Engine
          </span>
          <h2 className="text-xl sm:text-2xl font-extrabold font-display text-white">
            Announcement Center ({announcements.length})
          </h2>
        </div>

        <button
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold transition-all shadow-lg shadow-violet-500/25 cursor-pointer flex items-center gap-2"
        >
          {showForm ? <X className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
          <span>{showForm ? 'Cancel' : 'Create Announcement'}</span>
        </button>
      </div>

      {/* Compose Announcement Form */}
      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="p-6 rounded-3xl bg-zinc-950/60 border border-violet-500/30 backdrop-blur-md flex flex-col gap-4 shadow-2xl"
        >
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Send className="w-4 h-4 text-violet-400" />
            <span>Compose New Announcement</span>
          </h3>

          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Announcement title..."
            required
            className="p-3 rounded-xl bg-white/5 border border-white/10 text-white text-sm placeholder-white/30 focus:outline-none focus:border-violet-500/50"
          />

          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Detailed announcement message..."
            required
            rows={3}
            className="p-3 rounded-xl bg-white/5 border border-white/10 text-white text-sm placeholder-white/30 focus:outline-none focus:border-violet-500/50 resize-none"
          />

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold text-white/50 uppercase tracking-wider">
                Target Audience
              </label>
              <select
                value={target}
                onChange={(e) => setTarget(e.target.value as Announcement['target'])}
                className="bg-zinc-900 border border-white/10 text-white text-xs rounded-xl px-3 py-2.5 focus:outline-none"
              >
                <option value="Entire Symposium">Entire Symposium</option>
                <option value="Specific Event">Specific Event</option>
                <option value="Selected Participants">Selected Participants</option>
              </select>
            </div>

            {target === 'Specific Event' && (
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-white/50 uppercase tracking-wider">
                  Select Event
                </label>
                <select
                  value={targetEventId}
                  onChange={(e) => setTargetEventId(e.target.value)}
                  className="bg-zinc-900 border border-white/10 text-white text-xs rounded-xl px-3 py-2.5 focus:outline-none"
                >
                  {events.map((e) => (
                    <option key={e.id} value={e.id}>{e.name}</option>
                  ))}
                </select>
              </div>
            )}

            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold text-white/50 uppercase tracking-wider">
                Priority Level
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as PriorityLevel)}
                className="bg-zinc-900 border border-white/10 text-white text-xs rounded-xl px-3 py-2.5 focus:outline-none"
              >
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
                <option value="Emergency">Emergency</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              className="px-6 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold transition-all shadow-lg cursor-pointer flex items-center gap-2"
            >
              <Megaphone className="w-3.5 h-3.5" />
              <span>Publish Announcement</span>
            </button>
          </div>
        </form>
      )}

      {/* Announcement Feed */}
      <div className="flex flex-col gap-4">
        {announcements.length === 0 ? (
          <div className="p-12 text-center text-xs text-white/40 rounded-3xl bg-zinc-950/60 border border-white/10">
            No announcements have been published yet.
          </div>
        ) : (
          announcements.map((a) => (
            <div
              key={a.id}
              className="p-5 rounded-3xl bg-zinc-950/60 border border-white/10 hover:border-white/20 backdrop-blur-md flex flex-col sm:flex-row sm:items-start justify-between gap-4 transition-all"
            >
              <div className="flex-1 flex flex-col gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase border ${getPriorityStyle(a.priority)}`}>
                    {a.priority}
                  </span>
                  <span className="text-[10px] text-white/40 flex items-center gap-1">
                    {getTargetIcon(a.target)}
                    <span>{a.target}</span>
                  </span>
                  <span className={`text-[9px] font-semibold px-2 py-0.5 rounded ${a.status === 'Published' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-white/10 text-white/50'}`}>
                    {a.status}
                  </span>
                </div>

                <h3 className="text-sm font-bold text-white">{a.title}</h3>
                <p className="text-xs text-white/60 leading-relaxed">{a.description}</p>

                <div className="flex items-center gap-3 text-[10px] text-white/30 mt-1">
                  <span>By {a.author}</span>
                  <span>·</span>
                  <span>{a.publishDate}</span>
                </div>
              </div>

              <button
                onClick={() => deleteAnnouncement(a.id)}
                className="p-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 cursor-pointer flex-shrink-0 self-start"
                title="Delete Announcement"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
