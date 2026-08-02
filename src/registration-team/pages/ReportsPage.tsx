import React, { useMemo, useState } from 'react';
import {
  FileDown,
  Search,
  History,
  BarChart3,
  Loader2,
} from 'lucide-react';
import { useRegistrationTeam } from '../context/RegistrationTeamContext';
import {
  subscribeVerificationLogs,
  type VerificationLogEntry,
} from '../../services/verificationService';
import { exportToCSV, exportToPrintableReport } from '../../admin/utils/exportUtils';

const STATUS_STYLES: Record<string, string> = {
  Verified: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
  Pending: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
  Rejected: 'bg-rose-500/20 text-rose-300 border-rose-500/30',
};

export const ReportsPage: React.FC = () => {
  const { participants } = useRegistrationTeam();
  const [filter, setFilter] = useState<'All' | 'Verified' | 'Pending' | 'Rejected'>('All');
  const [search, setSearch] = useState('');
  const [logs, setLogs] = useState<VerificationLogEntry[]>([]);

  React.useEffect(() => {
    const unsubscribe = subscribeVerificationLogs(
      (next) => setLogs(next),
      () => setLogs([])
    );
    return unsubscribe;
  }, []);

  const stats = useMemo(() => {
    return {
      total: participants.length,
      verified: participants.filter((p) => p.verificationStatus === 'Verified').length,
      pending: participants.filter((p) => p.verificationStatus === 'Pending').length,
      rejected: participants.filter((p) => p.verificationStatus === 'Rejected').length,
    };
  }, [participants]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return participants
      .filter((p) => {
        const matchesFilter = filter === 'All' || p.verificationStatus === filter;
        const matchesSearch =
          !term ||
          p.full_name.toLowerCase().includes(term) ||
          p.email.toLowerCase().includes(term) ||
          p.phone.toLowerCase().includes(term) ||
          p.register_number.toLowerCase().includes(term) ||
          p.id.toLowerCase().includes(term);
        return matchesFilter && matchesSearch;
      })
      .sort((a, b) => {
        if (a.verificationStatus === 'Verified' && b.verificationStatus !== 'Verified') return -1;
        if (a.verificationStatus !== 'Verified' && b.verificationStatus === 'Verified') return 1;
        return String(b.verifiedAt || '').localeCompare(String(a.verifiedAt || ''));
      });
  }, [participants, filter, search]);

  const handleExportCSV = () => {
    exportToCSV('casyum_verification_report', filtered.map((p) => ({
      'Participant ID': p.participant_id,
      'Full Name': p.full_name,
      'Email': p.email,
      'Phone': p.phone,
      'College': p.college,
      'Department': p.department,
      'Register Number': p.register_number,
      'Payment Status': p.payment_status,
      'Verification Status': p.verificationStatus,
      'Verified By': p.verifiedBy,
      'Verified At': p.verifiedAt,
      'Remarks': p.verificationRemarks,
    })));
  };

  const handleExportPrint = () => {
    exportToPrintableReport(
      'CASYUM Verification Report',
      ['ID', 'Name', 'College', 'Register No', 'Status', 'Verified By', 'Verified At'],
      filtered.map((p) => [
        p.participant_id,
        p.full_name,
        p.college || 'N/A',
        p.register_number || '',
        p.verificationStatus,
        p.verifiedBy || '',
        p.verifiedAt ? new Date(p.verifiedAt).toLocaleString() : '',
      ])
    );
  };

  const percent = (n: number) => (stats.total > 0 ? Math.round((n / stats.total) * 100) : 0);

  return (
    <div className="min-h-screen bg-black text-white selection:bg-violet-500/30 selection:text-violet-200">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold font-display text-white">Verification Reports</h1>
            <p className="text-sm text-white/50 mt-1">Summary of participant verification across the symposium</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleExportCSV}
              disabled={filtered.length === 0}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <FileDown className="w-3.5 h-3.5" />
              Export CSV
            </button>
            <button
              onClick={handleExportPrint}
              disabled={filtered.length === 0}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/70 text-xs font-bold transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <BarChart3 className="w-3.5 h-3.5" />
              Print Report
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="p-5 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex flex-col gap-1">
            <span className="text-[10px] font-semibold text-blue-300/70">Total Registered</span>
            <span className="text-2xl font-extrabold text-white font-display">{stats.total}</span>
            <span className="text-[10px] text-blue-400">100%</span>
          </div>
          <div className="p-5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex flex-col gap-1">
            <span className="text-[10px] font-semibold text-emerald-300/70">Verified</span>
            <span className="text-2xl font-extrabold text-white font-display">{stats.verified}</span>
            <span className="text-[10px] text-emerald-400">{percent(stats.verified)}% of registrations</span>
          </div>
          <div className="p-5 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex flex-col gap-1">
            <span className="text-[10px] font-semibold text-amber-300/70">Pending</span>
            <span className="text-2xl font-extrabold text-white font-display">{stats.pending}</span>
            <span className="text-[10px] text-amber-400">{percent(stats.pending)}% of registrations</span>
          </div>
          <div className="p-5 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex flex-col gap-1">
            <span className="text-[10px] font-semibold text-rose-300/70">Rejected</span>
            <span className="text-2xl font-extrabold text-white font-display">{stats.rejected}</span>
            <span className="text-[10px] text-rose-400">{percent(stats.rejected)}% of registrations</span>
          </div>
        </div>

        {/* Filter & search */}
        <div className="p-4 rounded-3xl bg-zinc-950/60 border border-white/10 backdrop-blur-md flex flex-col md:flex-row items-center justify-between gap-4 mb-6">
          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 text-white/40 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search participants..."
              className="w-full pl-9 pr-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-xs placeholder-white/30 focus:outline-none focus:border-violet-500/50"
            />
          </div>
          <div className="flex items-center gap-1.5">
            {(['All', 'Verified', 'Pending', 'Rejected'] as const).map((s) => (
              <button
                key={s}
                onClick={() => setFilter(s)}
                className={`px-3 py-1.5 rounded-xl text-[11px] font-bold transition-all cursor-pointer ${filter === s ? 'bg-violet-600/30 text-white border border-violet-500/40' : 'text-white/50 hover:text-white border border-transparent'}`}
              >
                {s} <span className="opacity-60">({s === 'All' ? stats.total : stats[s.toLowerCase() as 'verified' | 'pending' | 'rejected']})</span>
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        <div className="rounded-3xl bg-zinc-950/60 border border-white/10 backdrop-blur-md overflow-hidden">
          <div className="flex items-center gap-2 px-5 py-4 border-b border-white/10">
            <BarChart3 className="w-4 h-4 text-violet-400" />
            <span className="text-xs font-bold text-white">Verification Status ({filtered.length})</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-white/10 text-[9px] uppercase tracking-widest text-white/40">
                  <th className="px-5 py-3 font-bold">Participant</th>
                  <th className="px-5 py-3 font-bold">Register No.</th>
                  <th className="px-5 py-3 font-bold">College</th>
                  <th className="px-5 py-3 font-bold">Payment</th>
                  <th className="px-5 py-3 font-bold">Status</th>
                  <th className="px-5 py-3 font-bold">Verified By</th>
                  <th className="px-5 py-3 font-bold">Verified At</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-5 py-10 text-center text-xs text-white/40">
                      No participants match the current filters.
                    </td>
                  </tr>
                ) : (
                  filtered.slice(0, 100).map((p) => (
                    <tr key={p.id} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                      <td className="px-5 py-3">
                        <div className="flex flex-col min-w-0">
                          <span className="text-xs font-bold text-white truncate">{p.full_name}</span>
                          <span className="text-[10px] text-white/40 truncate">{p.email}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3 text-xs text-white/60">{p.register_number || '—'}</td>
                      <td className="px-5 py-3 text-xs text-white/60">{p.college || '—'}</td>
                      <td className="px-5 py-3">
                        <span className={`text-[10px] font-bold ${p.payment_status === 'Approved' ? 'text-emerald-400' : p.payment_status === 'Rejected' ? 'text-rose-400' : 'text-amber-400'}`}>
                          {p.payment_status}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold border ${STATUS_STYLES[p.verificationStatus]}`}>
                          {p.verificationStatus}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-xs text-white/60">{p.verifiedBy || '—'}</td>
                      <td className="px-5 py-3 text-[10px] text-white/40">
                        {p.verifiedAt ? new Date(p.verifiedAt).toLocaleString() : '—'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent verification log */}
        <div className="mt-6 rounded-3xl bg-zinc-950/60 border border-white/10 backdrop-blur-md overflow-hidden">
          <div className="flex items-center gap-2 px-5 py-4 border-b border-white/10">
            <History className="w-4 h-4 text-violet-400" />
            <span className="text-xs font-bold text-white">Verification Log</span>
          </div>
          <div className="flex flex-col divide-y divide-white/5 max-h-[360px] overflow-y-auto">
            {logs.length === 0 ? (
              <div className="p-10 text-center text-xs text-white/40">
                <Loader2 className="w-4 h-4 animate-spin mx-auto mb-2" />
                Loading verification logs...
              </div>
            ) : (
              logs.slice(0, 50).map((l) => (
                <div key={l.id} className="px-5 py-3 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold border shrink-0 ${l.type === 'verify' ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' : l.type === 'reject' ? 'bg-rose-500/20 text-rose-300 border-rose-500/30' : 'bg-sky-500/20 text-sky-300 border-sky-500/30'}`}>
                      {l.type.toUpperCase()}
                    </span>
                    <div className="flex flex-col min-w-0">
                      <span className="text-xs text-white/80 truncate">{l.details}</span>
                      <span className="text-[10px] text-white/40">{l.actor_name} · {l.device || 'Web'}</span>
                    </div>
                  </div>
                  <span className="text-[9px] text-white/35 shrink-0">{new Date(l.timestamp).toLocaleString()}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </main>
    </div>
  );
};
