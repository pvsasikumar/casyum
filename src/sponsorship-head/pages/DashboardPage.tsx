import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Inbox,
  Clock3,
  Handshake,
  CheckCircle2,
  XCircle,
  ArrowRight,
  Sparkles,
  MessageCircle,
} from 'lucide-react';
import { useSponsorshipHead } from '../context/SponsorshipHeadContext';
import { ENQUIRY_STATUS_CLS, formatDate, OPEN_STATUSES } from '../components/EnquiryStatus';
import type { EnquiryStatus } from '../../types/sponsorship';

interface CardDef {
  label: string;
  value: string | number;
  sub: string;
  icon: React.ElementType;
  tone: 'violet' | 'emerald' | 'amber' | 'rose' | 'cyan' | 'sky';
}

const TONE_CLS: Record<CardDef['tone'], { card: string; icon: string }> = {
  violet: { card: 'bg-violet-500/10 border-violet-500/25', icon: 'bg-violet-500/20 text-violet-300' },
  emerald: { card: 'bg-emerald-500/10 border-emerald-500/25', icon: 'bg-emerald-500/20 text-emerald-300' },
  amber: { card: 'bg-amber-500/10 border-amber-500/25', icon: 'bg-amber-500/20 text-amber-300' },
  rose: { card: 'bg-rose-500/10 border-rose-500/25', icon: 'bg-rose-500/20 text-rose-300' },
  cyan: { card: 'bg-cyan-500/10 border-cyan-500/25', icon: 'bg-cyan-500/20 text-cyan-300' },
  sky: { card: 'bg-sky-500/10 border-sky-500/25', icon: 'bg-sky-500/20 text-sky-300' },
};

const STATUS_BADGE: Record<string, { label: string; tone: CardDef['tone'] }> = {
  New: { label: 'New', tone: 'sky' },
  Contacted: { label: 'Contacted', tone: 'violet' },
  'Under Review': { label: 'Under Review', tone: 'amber' },
  Negotiation: { label: 'Negotiation', tone: 'cyan' },
  Approved: { label: 'Approved', tone: 'emerald' },
  Rejected: { label: 'Rejected', tone: 'rose' },
  Closed: { label: 'Closed', tone: 'sky' },
};

export const DashboardPage: React.FC = () => {
  const { user, enquiries, enquiriesLoading } = useSponsorshipHead();

  const stats = useMemo(() => {
    const byStatus = (s: EnquiryStatus) => enquiries.filter((e) => e.status === s).length;
    const open = enquiries.filter((e) => OPEN_STATUSES.includes(e.status)).length;
    const negotiating = enquiries.filter((e) => ['Negotiation', 'Under Review'].includes(e.status)).length;
    const mine = enquiries.filter((e) => e.assignedToName && e.assignedToName === user?.name).length;
    return {
      total: enquiries.length,
      open,
      newCount: byStatus('New'),
      negotiating,
      approved: byStatus('Approved'),
      rejected: byStatus('Rejected'),
      mine,
    };
  }, [enquiries, user?.name]);

  const cards: CardDef[] = [
    { label: 'Total Enquiries', value: stats.total, sub: 'All sponsorship leads', icon: Inbox, tone: 'violet' },
    { label: 'Open Leads', value: stats.open, sub: 'Require attention', icon: Clock3, tone: 'amber' },
    { label: 'In Negotiation', value: stats.negotiating, sub: 'Review / negotiation', icon: MessageCircle, tone: 'cyan' },
    { label: 'Approved', value: stats.approved, sub: 'Converted to sponsors', icon: CheckCircle2, tone: 'emerald' },
    { label: 'Rejected', value: stats.rejected, sub: 'Declined leads', icon: XCircle, tone: 'rose' },
    { label: 'Assigned to Me', value: stats.mine, sub: 'Your pipeline', icon: Handshake, tone: 'sky' },
  ];

  const recent = useMemo(
    () => [...enquiries].sort((a, b) => String(b.submittedAt).localeCompare(String(a.submittedAt))).slice(0, 6),
    [enquiries]
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col gap-8 select-none pb-16">
      {/* Header */}
      <div className="flex flex-col gap-1.5">
        <span className="text-xs font-bold text-violet-400 uppercase tracking-widest">
          {user?.name ? `Welcome, ${user.name}` : 'Welcome'}
        </span>
        <h1 className="text-2xl sm:text-3xl font-extrabold font-display text-white tracking-tight">
          CASYUM <span className="text-violet-400">Sponsorship</span> Portal
        </h1>
        <p className="text-xs text-white/50">
          {user?.designation || 'Sponsorship Head'} · Manage sponsor leads, negotiate and approve partnerships.
        </p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {cards.map((card) => {
          const tone = TONE_CLS[card.tone];
          const Icon = card.icon;
          return (
            <div key={card.label} className={`p-5 rounded-3xl border backdrop-blur-md shadow-lg flex flex-col gap-3 ${tone.card}`}>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-white/60 uppercase tracking-widest">{card.label}</span>
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${tone.icon}`}>
                  <Icon className="w-3.5 h-3.5" />
                </div>
              </div>
              <span className="text-2xl font-extrabold font-display text-white leading-none">{card.value}</span>
              <span className="text-[10px] text-white/40">{card.sub}</span>
            </div>
          );
        })}
      </div>

      {/* Quick links */}
      <div className="flex flex-wrap items-center gap-3">
        <Link
          to="/sponsorship-head/enquiries"
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white text-xs font-bold transition-all shadow-lg shadow-violet-500/25 cursor-pointer"
        >
          <Inbox className="w-4 h-4" />
          All Enquiries
        </Link>
      </div>

      {/* Recent enquiries */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-extrabold font-display text-white tracking-tight flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-violet-400" />
            Recent Enquiries
          </h2>
          <Link
            to="/sponsorship-head/enquiries"
            className="flex items-center gap-1 text-[11px] font-bold text-violet-400 hover:text-violet-300 transition-colors cursor-pointer"
          >
            View all <ArrowRight className="w-3 h-3" />
          </Link>
        </div>

        <div className="rounded-3xl bg-zinc-950/60 border border-white/10 backdrop-blur-md overflow-hidden shadow-2xl">
          {enquiriesLoading ? (
            <div className="p-10 text-center text-xs text-white/40">Loading enquiries...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-white min-w-[760px]">
                <thead className="bg-white/5 border-b border-white/10 text-[10px] uppercase tracking-wider text-white/50">
                  <tr>
                    <th className="p-4">Company</th>
                    <th className="p-4">Contact</th>
                    <th className="p-4">Interest</th>
                    <th className="p-4">Status</th>
                    <th className="p-4">Submitted</th>
                    <th className="p-4"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {recent.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-10 text-center text-xs text-white/40">
                        No enquiries yet. Leads from the public "Looking for Sponsors" form will appear here.
                      </td>
                    </tr>
                  ) : (
                    recent.map((e) => {
                      const meta = STATUS_BADGE[e.status] || { label: e.status, tone: 'sky' as CardDef['tone'] };
                      return (
                        <tr key={e.id} className="hover:bg-white/[0.02] transition-colors">
                          <td className="p-4">
                            <div className="flex flex-col">
                              <span className="font-bold text-white">{e.companyName}</span>
                              <span className="text-[10px] text-white/40">{e.website || '—'}</span>
                            </div>
                          </td>
                          <td className="p-4 text-white/70">
                            <div className="flex flex-col">
                              <span>{e.contactPerson}</span>
                              <span className="text-[10px] text-white/40">{e.email}</span>
                            </div>
                          </td>
                          <td className="p-4 text-white/60">{e.categoryInterest || '—'}</td>
                          <td className="p-4">
                            <span className={`inline-flex px-2 py-0.5 rounded-full text-[9px] font-bold border ${ENQUIRY_STATUS_CLS[e.status]}`}>
                              {meta.label}
                            </span>
                          </td>
                          <td className="p-4 text-white/50 text-[11px]">{formatDate(e.submittedAt)}</td>
                          <td className="p-4">
                            <Link
                              to={`/sponsorship-head/enquiries/${e.id}`}
                              className="flex items-center gap-1 text-[11px] font-bold text-violet-400 hover:text-violet-300 cursor-pointer"
                            >
                              Open <ArrowRight className="w-3 h-3" />
                            </Link>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
