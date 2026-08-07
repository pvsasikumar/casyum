import React, { useMemo, useState } from 'react';
import { Search, Loader2, Award, ExternalLink } from 'lucide-react';
import { useObserver } from '../context/ObserverContext';
import { ReadOnlyBadge } from '../components/ReadOnlyBanner';

export const CertificatesPage: React.FC = () => {
  const { certificates, certificatesLoading } = useObserver();
  const [query, setQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('All');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return certificates
      .filter((c) => {
        if (typeFilter !== 'All' && c.type !== typeFilter) return false;
        if (
          q &&
          !(
            (c.participant_name || '').toLowerCase().includes(q) ||
            (c.event_name || '').toLowerCase().includes(q) ||
            (c.college || '').toLowerCase().includes(q) ||
            (c.certificate_code || '').toLowerCase().includes(q)
          )
        ) {
          return false;
        }
        return true;
      })
      .sort((a, b) => String(b.issue_date || '').localeCompare(String(a.issue_date || '')));
  }, [certificates, query, typeFilter]);

  const types = useMemo(() => Array.from(new Set(certificates.map((c) => c.type).filter(Boolean))), [certificates]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col gap-6 select-none pb-16">
      <div className="flex flex-col gap-1.5">
        <span className="text-xs font-bold text-violet-400 uppercase tracking-widest">Certificate Registry</span>
        <h2 className="text-xl sm:text-2xl font-extrabold font-display text-white flex items-center gap-2">
          Certificates ({filtered.length})
          <Award className="w-5 h-5 text-amber-400" />
          <ReadOnlyBadge />
        </h2>
        <p className="text-[11px] text-white/50">{certificates.length} total issued certificates.</p>
      </div>

      <div className="p-4 rounded-3xl bg-zinc-950/60 border border-white/10 backdrop-blur-md flex flex-col lg:flex-row items-center justify-between gap-4">
        <div className="relative w-full lg:w-80">
          <Search className="w-4 h-4 text-white/40 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name, event, code..."
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-xs placeholder-white/30 focus:outline-none focus:border-violet-500/50"
          />
        </div>
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="bg-zinc-900 border border-white/10 text-white text-xs rounded-xl px-3 py-2 focus:outline-none cursor-pointer"
        >
          <option value="All">All Types</option>
          {types.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
      </div>

      <div className="rounded-3xl bg-zinc-950/60 border border-white/10 backdrop-blur-md overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-white min-w-[900px]">
            <thead className="bg-white/5 border-b border-white/10 text-[10px] uppercase tracking-wider text-white/50">
              <tr>
                <th className="p-4">Certificate Code</th>
                <th className="p-4">Recipient</th>
                <th className="p-4">Event</th>
                <th className="p-4">Type</th>
                <th className="p-4">College</th>
                <th className="p-4">Issue Date</th>
                <th className="p-4">Certificate</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {certificatesLoading ? (
                <tr>
                  <td colSpan={7} className="p-12 text-center text-xs text-white/40">
                    <Loader2 className="w-5 h-5 animate-spin mx-auto text-violet-400" />
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-12 text-center text-xs text-white/40">No certificates found.</td>
                </tr>
              ) : (
                filtered.map((c) => (
                  <tr key={c.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="p-4 font-mono text-[11px] text-amber-300">{c.certificate_code || '—'}</td>
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-amber-500/20 flex items-center justify-center text-xs font-bold text-amber-300 shrink-0">
                          {(c.participant_name || 'C').split(' ').map((n) => n[0]).join('').slice(0, 2)}
                        </div>
                        <span className="font-bold text-white">{c.participant_name || '—'}</span>
                      </div>
                    </td>
                    <td className="p-4 text-white/70">{c.event_name || '—'}</td>
                    <td className="p-4">
                      <span className="px-2 py-0.5 rounded-full text-[9px] font-bold border bg-violet-500/20 text-violet-300 border-violet-500/30 whitespace-nowrap">
                        {c.type || '—'}
                      </span>
                    </td>
                    <td className="p-4 text-white/60">{c.college || '—'}</td>
                    <td className="p-4 text-white/50 text-[11px]">
                      {c.issue_date ? new Date(c.issue_date).toLocaleDateString() : '—'}
                    </td>
                    <td className="p-4">
                      {c.download_url ? (
                        <a
                          href={c.download_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-[11px] font-bold text-white hover:bg-white/10 transition-colors"
                        >
                          <ExternalLink className="w-3.5 h-3.5 text-amber-300" /> View
                        </a>
                      ) : (
                        <span className="text-white/30 text-[11px]">—</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
