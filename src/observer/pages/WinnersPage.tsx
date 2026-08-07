import React, { useEffect, useMemo, useState } from 'react';
import { Loader2, Trophy, Search } from 'lucide-react';
import { useObserver } from '../context/ObserverContext';
import { listResultsByEvent } from '../../services/resultsService';
import type { ResultEntry } from '../../components/results/types';
import { ReadOnlyBadge } from '../components/ReadOnlyBanner';

function positionBadge(entry: ResultEntry) {
  const p = String(entry.position || '').toLowerCase();
  if (p.includes('winner') || p === '1st' || p === 'first') {
    return { label: entry.customPosition || 'Winner', cls: 'bg-amber-500/20 text-amber-300 border-amber-500/30' };
  }
  if (p.includes('runner') || p === '2nd' || p === 'second') {
    return { label: entry.customPosition || 'Runner Up', cls: 'bg-slate-400/20 text-slate-200 border-slate-400/30' };
  }
  if (p === '3rd' || p === 'third') {
    return { label: entry.customPosition || 'Third Place', cls: 'bg-orange-500/20 text-orange-300 border-orange-500/30' };
  }
  return { label: entry.customPosition || entry.position || 'Winner', cls: 'bg-violet-500/20 text-violet-300 border-violet-500/30' };
}

export const WinnersPage: React.FC = () => {
  const { events } = useObserver();
  const [resultsByEvent, setResultsByEvent] = useState<Record<string, ResultEntry[]>>({});
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');

  useEffect(() => {
    let active = true;
    setLoading(true);
    (async () => {
      const map: Record<string, ResultEntry[]> = {};
      await Promise.all(
        events.map(async (e) => {
          try {
            const entries = await listResultsByEvent(e.id);
            map[e.id] = entries.filter((x) => x.status === 'Published');
          } catch {
            map[e.id] = [];
          }
        })
      );
      if (active) setResultsByEvent(map);
      if (active) setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [events]);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return events
      .map((e) => {
        const entries = (resultsByEvent[e.id] || [])
          .filter((x) => !q || x.eventName.toLowerCase().includes(q) || x.participantName.toLowerCase().includes(q) || x.teamName.toLowerCase().includes(q))
          .sort((a, b) => String(a.position).localeCompare(String(b.position)));
        return { event: e, entries };
      })
      .filter((r) => r.entries.length > 0)
      .sort((a, b) => a.event.event_date.localeCompare(b.event.event_date));
  }, [events, resultsByEvent, query]);

  const publishedCount = useMemo(() => Object.values(resultsByEvent).reduce((s, list) => s + list.length, 0), [resultsByEvent]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col gap-6 select-none pb-16">
      <div className="flex flex-col gap-1.5">
        <span className="text-xs font-bold text-violet-400 uppercase tracking-widest">Results &amp; Winners</span>
        <h2 className="text-xl sm:text-2xl font-extrabold font-display text-white flex items-center gap-2">
          Winners ({publishedCount})
          <Trophy className="w-5 h-5 text-amber-400" />
          <ReadOnlyBadge />
        </h2>
        <p className="text-[11px] text-white/50">Only published results are displayed.</p>
      </div>

      <div className="p-4 rounded-3xl bg-zinc-950/60 border border-white/10 backdrop-blur-md flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-white/40 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by event, participant, team..."
            className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-xs placeholder-white/30 focus:outline-none focus:border-violet-500/50"
          />
        </div>
      </div>

      {loading ? (
        <div className="rounded-3xl bg-zinc-950/60 border border-white/10 p-12 flex items-center justify-center">
          <Loader2 className="w-5 h-5 animate-spin text-violet-400" />
        </div>
      ) : rows.length === 0 ? (
        <div className="rounded-3xl bg-zinc-950/60 border border-white/10 p-12 text-center text-xs text-white/40">
          No published results yet.
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {rows.map(({ event, entries }) => (
            <div key={event.id} className="rounded-3xl bg-zinc-950/60 border border-white/10 backdrop-blur-md overflow-hidden shadow-2xl">
              <div className="px-6 py-4 border-b border-white/10 bg-gradient-to-r from-amber-500/10 via-transparent to-transparent flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-500/25 flex items-center justify-center shrink-0">
                  <Trophy className="w-4 h-4 text-amber-300" />
                </div>
                <div className="flex flex-col">
                  <span className="font-bold text-white font-display">{event.name}</span>
                  <span className="text-[10px] text-white/40">
                    {event.event_date ? new Date(event.event_date).toLocaleDateString() : ''} · {event.venue || ''} · {entries.length} result(s)
                  </span>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-white min-w-[720px]">
                  <thead className="bg-white/5 border-b border-white/10 text-[10px] uppercase tracking-wider text-white/50">
                    <tr>
                      <th className="p-4">Position</th>
                      <th className="p-4">Participant / Team</th>
                      <th className="p-4">Type</th>
                      <th className="p-4">Register Number</th>
                      <th className="p-4">College</th>
                      <th className="p-4">Prize</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {entries.map((entry) => {
                      const meta = positionBadge(entry);
                      return (
                        <tr key={entry.id} className="hover:bg-white/[0.02] transition-colors">
                          <td className="p-4">
                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold border whitespace-nowrap ${meta.cls}`}>
                              {meta.label}
                            </span>
                          </td>
                          <td className="p-4">
                            <div className="flex flex-col">
                              <span className="font-bold text-white">{entry.entryType === 'Team' && entry.teamName ? entry.teamName : entry.participantName}</span>
                              <span className="text-[10px] text-white/40">
                                {entry.entryType === 'Team'
                                  ? `${entry.members.length} member(s) · ${entry.teamName || ''}`
                                  : entry.participantName
                                  ? `${entry.department || ''} · ${entry.year || ''}`
                                  : ''}
                              </span>
                            </div>
                          </td>
                          <td className="p-4 text-white/60">{entry.entryType}</td>
                          <td className="p-4 font-mono text-[11px] text-white/50">{entry.registerNumber || '—'}</td>
                          <td className="p-4 text-white/60">{entry.college || '—'}</td>
                          <td className="p-4 font-bold text-emerald-300">{entry.prize || '—'}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
