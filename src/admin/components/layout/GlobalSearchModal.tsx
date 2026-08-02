import React, { useState, useEffect } from 'react';
import { Search, X, Calendar, Megaphone, ArrowRight } from 'lucide-react';
import { useAdmin } from '../../context/AdminContext';

export const GlobalSearchModal: React.FC = () => {
  const {
    globalSearchOpen,
    setGlobalSearchOpen,
    participants,
    events,
    announcements,
    setSelectedParticipant,
    setActiveTab,
  } = useAdmin();

  const [query, setQuery] = useState('');

  // Cmd+K shortcut listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setGlobalSearchOpen(!globalSearchOpen);
      }
      if (e.key === 'Escape' && globalSearchOpen) {
        setGlobalSearchOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [globalSearchOpen, setGlobalSearchOpen]);

  if (!globalSearchOpen) return null;

  const q = query.trim().toLowerCase();

  const matchedParticipants = q
    ? participants.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.email.toLowerCase().includes(q) ||
          p.mobile.includes(q) ||
          p.registerNumber.toLowerCase().includes(q) ||
          p.college.toLowerCase().includes(q) ||
          p.city.toLowerCase().includes(q) ||
          p.transactionId.toLowerCase().includes(q)
      )
    : [];

  const matchedEvents = q
    ? events.filter(
        (e) =>
          e.name.toLowerCase().includes(q) ||
          e.category.toLowerCase().includes(q) ||
          e.venue.toLowerCase().includes(q)
      )
    : [];

  const matchedAnnouncements = q
    ? announcements.filter(
        (a) => a.title.toLowerCase().includes(q) || a.description.toLowerCase().includes(q)
      )
    : [];

  return (
    <div className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-xl flex items-start justify-center pt-20 px-4 animate-in fade-in duration-200">
      <div
        className="w-full max-w-2xl bg-zinc-950 border border-white/20 rounded-3xl shadow-2xl overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input Bar */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-white/10 bg-white/5">
          <Search className="w-5 h-5 text-violet-400" />
          <input
            type="text"
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by Name, Email, Register No, College, Event, or Txn ID..."
            className="flex-1 bg-transparent text-white placeholder-white/40 text-sm focus:outline-none font-sans"
          />
          <button
            onClick={() => setGlobalSearchOpen(false)}
            className="p-1.5 rounded-lg text-white/50 hover:text-white bg-white/5 hover:bg-white/10"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Results List */}
        <div className="max-h-[60vh] overflow-y-auto p-4 flex flex-col gap-4">
          {!q ? (
            <div className="py-12 text-center text-xs text-white/40 flex flex-col items-center gap-2">
              <Search className="w-8 h-8 opacity-30" />
              <span>Type anything to perform a instant global search across CASYUM ERP</span>
            </div>
          ) : matchedParticipants.length === 0 && matchedEvents.length === 0 && matchedAnnouncements.length === 0 ? (
            <div className="py-12 text-center text-xs text-white/40">
              No results found matching &quot;{query}&quot;
            </div>
          ) : (
            <>
              {/* Participants Section */}
              {matchedParticipants.length > 0 && (
                <div className="flex flex-col gap-2">
                  <span className="text-[10px] font-bold text-violet-400 uppercase tracking-widest px-2">
                    Participants ({matchedParticipants.length})
                  </span>
                  <div className="flex flex-col gap-1">
                    {matchedParticipants.slice(0, 5).map((p) => (
                      <div
                        key={p.id}
                        onClick={() => {
                          setSelectedParticipant(p);
                          setActiveTab('Registrations');
                          setGlobalSearchOpen(false);
                        }}
                        className="flex items-center justify-between p-3 rounded-2xl bg-white/5 hover:bg-violet-500/10 border border-white/5 hover:border-violet-500/30 transition-all cursor-pointer group"
                      >
                        <div className="flex items-center gap-3">
                          <img src={p.photo} alt={p.name} className="w-8 h-8 rounded-full object-cover" />
                          <div className="flex flex-col">
                            <span className="text-xs font-bold text-white group-hover:text-violet-300">
                              {p.name}
                            </span>
                            <span className="text-[10px] text-white/50">
                              {p.college} · {p.city} · {p.email}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[9px] font-semibold ${
                              p.paymentStatus === 'Approved'
                                ? 'bg-emerald-500/20 text-emerald-300'
                                : p.paymentStatus === 'Pending'
                                ? 'bg-amber-500/20 text-amber-300'
                                : 'bg-rose-500/20 text-rose-300'
                            }`}
                          >
                            {p.paymentStatus}
                          </span>
                          <ArrowRight className="w-3.5 h-3.5 text-white/30 group-hover:text-white group-hover:translate-x-0.5 transition-all" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Events Section */}
              {matchedEvents.length > 0 && (
                <div className="flex flex-col gap-2">
                  <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-widest px-2">
                    Events ({matchedEvents.length})
                  </span>
                  <div className="flex flex-col gap-1">
                    {matchedEvents.map((e) => (
                      <div
                        key={e.id}
                        onClick={() => {
                          setActiveTab('Events');
                          setGlobalSearchOpen(false);
                        }}
                        className="flex items-center justify-between p-3 rounded-2xl bg-white/5 hover:bg-cyan-500/10 border border-white/5 hover:border-cyan-500/30 transition-all cursor-pointer group"
                      >
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                            <Calendar className="w-4 h-4" />
                          </div>
                          <div className="flex flex-col">
                            <span className="text-xs font-bold text-white group-hover:text-cyan-300">
                              {e.name}
                            </span>
                            <span className="text-[10px] text-white/50">{e.venue} · {e.registeredCount} Registered</span>
                          </div>
                        </div>
                        <ArrowRight className="w-3.5 h-3.5 text-white/30 group-hover:text-white group-hover:translate-x-0.5 transition-all" />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Announcements Section */}
              {matchedAnnouncements.length > 0 && (
                <div className="flex flex-col gap-2">
                  <span className="text-[10px] font-bold text-amber-400 uppercase tracking-widest px-2">
                    Announcements ({matchedAnnouncements.length})
                  </span>
                  <div className="flex flex-col gap-1">
                    {matchedAnnouncements.map((a) => (
                      <div
                        key={a.id}
                        onClick={() => {
                          setActiveTab('Announcements');
                          setGlobalSearchOpen(false);
                        }}
                        className="flex items-center justify-between p-3 rounded-2xl bg-white/5 hover:bg-amber-500/10 border border-white/5 hover:border-amber-500/30 transition-all cursor-pointer group"
                      >
                        <div className="flex items-center gap-3">
                          <Megaphone className="w-4 h-4 text-amber-400" />
                          <div className="flex flex-col">
                            <span className="text-xs font-bold text-white group-hover:text-amber-300">
                              {a.title}
                            </span>
                            <span className="text-[10px] text-white/50">{a.target}</span>
                          </div>
                        </div>
                        <ArrowRight className="w-3.5 h-3.5 text-white/30 group-hover:text-white group-hover:translate-x-0.5 transition-all" />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
