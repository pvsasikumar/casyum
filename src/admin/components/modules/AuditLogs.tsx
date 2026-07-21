import React, { useState } from 'react';
import {
  Search,
  Filter,
  Clock,
  User,
  Globe,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { useAdmin } from '../../context/AdminContext';

export const AuditLogs: React.FC = () => {
  const { auditLogs } = useAdmin();
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState<string>('All');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  const uniqueActions = Array.from(new Set(auditLogs.map((l) => l.action)));

  const filtered = auditLogs.filter((l) => {
    const matchSearch =
      l.user.toLowerCase().includes(search.toLowerCase()) ||
      l.action.toLowerCase().includes(search.toLowerCase()) ||
      l.details.toLowerCase().includes(search.toLowerCase()) ||
      l.ipAddress.includes(search);

    const matchAction = actionFilter === 'All' || l.action === actionFilter;
    return matchSearch && matchAction;
  });

  const totalPages = Math.ceil(filtered.length / pageSize) || 1;
  const paginated = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const getActionColor = (action: string) => {
    if (action.includes('Approved') || action.includes('Created')) return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30';
    if (action.includes('Rejected') || action.includes('Deleted')) return 'bg-rose-500/20 text-rose-300 border-rose-500/30';
    if (action.includes('Updated')) return 'bg-amber-500/20 text-amber-300 border-amber-500/30';
    return 'bg-violet-500/20 text-violet-300 border-violet-500/30';
  };

  return (
    <div className="flex flex-col gap-6 select-none pb-12">
      {/* Header */}
      <div className="flex flex-col">
        <span className="text-xs font-bold text-violet-400 uppercase tracking-widest">
          Security & Compliance
        </span>
        <h2 className="text-xl sm:text-2xl font-extrabold font-display text-white">
          Audit Logs ({auditLogs.length})
        </h2>
        <p className="text-xs text-white/50 mt-1">
          Every system action by admins and coordinators is immutably logged for accountability.
        </p>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="p-4 rounded-3xl bg-zinc-950/60 border border-white/10 backdrop-blur-md flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-white/40 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
            placeholder="Search user, action, details, IP..."
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-xs placeholder-white/30 focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="w-3.5 h-3.5 text-white/40" />
          <select
            value={actionFilter}
            onChange={(e) => { setActionFilter(e.target.value); setCurrentPage(1); }}
            className="bg-zinc-900 border border-white/10 text-white text-xs rounded-xl px-3 py-2 focus:outline-none"
          >
            <option value="All">All Actions</option>
            {uniqueActions.map((a) => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Audit Log Timeline Feed */}
      <div className="flex flex-col gap-3">
        {paginated.length === 0 ? (
          <div className="p-12 text-center text-xs text-white/40 rounded-3xl bg-zinc-950/60 border border-white/10">
            No audit log entries found matching criteria.
          </div>
        ) : (
          paginated.map((log, index) => (
            <div
              key={log.id}
              className="p-5 rounded-3xl bg-zinc-950/60 border border-white/10 hover:border-white/20 backdrop-blur-md flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all relative overflow-hidden"
            >
              {/* Timeline Dot & Connector */}
              <div className="absolute left-6 top-0 bottom-0 w-[2px] bg-white/5 hidden sm:block" style={{ display: index === paginated.length - 1 ? 'none' : undefined }} />

              <div className="flex items-start gap-4 flex-1">
                {/* Timeline Dot */}
                <div className="w-3 h-3 rounded-full bg-violet-500 flex-shrink-0 mt-1 ring-4 ring-violet-500/10 hidden sm:block" />

                <div className="flex flex-col gap-1.5 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-extrabold uppercase border ${getActionColor(log.action)}`}>
                      {log.action}
                    </span>
                    <span className="text-[10px] text-white/40 flex items-center gap-1">
                      <User className="w-3 h-3" />
                      <span>{log.user}</span>
                    </span>
                    <span className="text-[9px] text-white/30 bg-white/5 px-2 py-0.5 rounded border border-white/10">
                      {log.role}
                    </span>
                  </div>

                  <p className="text-xs text-white/70 leading-relaxed">{log.details}</p>

                  <div className="flex items-center gap-4 text-[10px] text-white/30 mt-1">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      <span>{log.timestamp}</span>
                    </span>
                    <span className="flex items-center gap-1">
                      <Globe className="w-3 h-3" />
                      <span>{log.ipAddress}</span>
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Pagination Footer */}
      {filtered.length > pageSize && (
        <div className="flex items-center justify-between text-xs text-white/60 pt-2">
          <span>
            Showing {paginated.length} of {filtered.length} entries
          </span>
          <div className="flex items-center gap-2">
            <button
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className="p-1.5 rounded-lg bg-white/5 border border-white/10 text-white disabled:opacity-30 cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="font-mono text-white">
              Page {currentPage} of {totalPages}
            </span>
            <button
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              className="p-1.5 rounded-lg bg-white/5 border border-white/10 text-white disabled:opacity-30 cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
