import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, ArrowRight, Inbox } from 'lucide-react';
import { useSponsorshipHead } from '../context/SponsorshipHeadContext';
import { ENQUIRY_STATUS_CLS, formatDate } from '../components/EnquiryStatus';
import { ENQUIRY_STATUSES } from '../../types/sponsorship';

export const EnquiriesPage: React.FC = () => {
  const { enquiries, enquiriesLoading } = useSponsorshipHead();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');

  const filtered = useMemo(() => {
    return enquiries.filter((e) => {
      if (statusFilter !== 'All' && e.status !== statusFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        const haystack = `${e.companyName} ${e.contactPerson} ${e.email} ${e.phone} ${e.categoryInterest} ${e.assignedToName}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [enquiries, search, statusFilter]);

  if (enquiriesLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 flex items-center justify-center text-white/40 text-sm">
        Loading enquiries...
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col gap-6 select-none pb-16">
      <div className="flex flex-col gap-1">
        <span className="text-xs font-bold text-violet-400 uppercase tracking-widest">Pipeline</span>
        <h1 className="text-xl sm:text-2xl font-extrabold font-display text-white">Sponsorship Enquiries</h1>
        <p className="text-xs text-white/50">Review leads, update status, add notes and recommend packages.</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/30" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search company, contact, email..."
            className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-4 py-2.5 text-xs text-white placeholder-white/30 focus:outline-none focus:border-violet-500/50"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-violet-500/50 appearance-none cursor-pointer"
        >
          <option value="All">All Statuses</option>
          {ENQUIRY_STATUSES.map((s) => (
            <option key={s} value={s} className="bg-zinc-900">{s}</option>
          ))}
        </select>
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/[0.02] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-white/5 border-b border-white/10">
              <tr className="text-[10px] uppercase tracking-widest text-white/40">
                <th className="px-4 py-3 font-bold">Company</th>
                <th className="px-4 py-3 font-bold">Contact</th>
                <th className="px-4 py-3 font-bold">Interest</th>
                <th className="px-4 py-3 font-bold">Status</th>
                <th className="px-4 py-3 font-bold">Recommended Package</th>
                <th className="px-4 py-3 font-bold">Submitted</th>
                <th className="px-4 py-3 font-bold"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center">
                    <div className="flex flex-col items-center gap-2 text-white/30">
                      <Inbox className="w-6 h-6" />
                      <span className="text-sm">No enquiries match your filters.</span>
                    </div>
                  </td>
                </tr>
              ) : (
                filtered.map((e) => (
                  <tr key={e.id} className="hover:bg-white/[0.03] transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex flex-col">
                        <span className="font-semibold text-white/90 max-w-[180px] truncate">{e.companyName}</span>
                        <span className="text-[10px] text-white/40 max-w-[180px] truncate">{e.website || '—'}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col">
                        <span className="text-white/70">{e.contactPerson}</span>
                        <span className="text-[10px] text-white/40">{e.email}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col">
                        <span className="text-white/60">{e.categoryInterest || '—'}</span>
                        <span className="text-[10px] text-white/40">{e.budget || 'Budget not shared'}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-widest border ${ENQUIRY_STATUS_CLS[e.status]}`}>
                        {e.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-white/60">{e.recommendedPackage || '—'}</td>
                    <td className="px-4 py-3 text-white/40">{formatDate(e.submittedAt)}</td>
                    <td className="px-4 py-3">
                      <Link
                        to={`/sponsorship-head/enquiries/${e.id}`}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-violet-500/10 border border-violet-500/30 text-violet-300 hover:bg-violet-500/20 text-[11px] font-bold cursor-pointer"
                      >
                        Open <ArrowRight className="w-3 h-3" />
                      </Link>
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

export default EnquiriesPage;
