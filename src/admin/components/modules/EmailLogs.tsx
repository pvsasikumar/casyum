import React, { useState, useEffect, useMemo } from 'react';
import {
  Search,
  CheckCircle2,
  XCircle,
  Clock,
  RotateCcw,
  Send,
  RefreshCw,
  Loader2,
  Inbox,
  AlertTriangle,
  MailCheck,
} from 'lucide-react';
import { useAdmin } from '../../context/AdminContext';

const EMAIL_TYPE_LABELS: Record<string, string> = {
  welcome: 'Welcome Email',
  coordinator_assigned: 'Coordinator Assigned',
  registration_confirmation: 'Registration Confirmation',
  password_reset: 'Password Reset',
  event_reminder: 'Event Reminder',
  event_cancelled: 'Event Cancelled',
  event_updated: 'Event Updated',
  attendance_confirmation: 'Attendance Confirmation',
  certificate_available: 'Certificate Available',
  payment_successful: 'Payment Successful',
  payment_failed: 'Payment Failed',
  account_deactivated: 'Account Deactivated',
  account_reactivated: 'Account Reactivated',
};

const STATUS_STYLES: Record<string, string> = {
  Sent: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  Failed: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
  Pending: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
};

export const EmailLogs: React.FC = () => {
  const {
    emailLogs,
    emailLogsLoading,
    emailStats,
    refreshEmailLogs,
    resendEmail,
    sendTestEmail,
    addToast,
  } = useAdmin();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Sent' | 'Failed' | 'Pending'>('All');
  const [typeFilter, setTypeFilter] = useState('All');
  const [page, setPage] = useState(1);
  const [showTestModal, setShowTestModal] = useState(false);
  const [testTo, setTestTo] = useState('');
  const [testSending, setTestSending] = useState(false);
  const [resendingId, setResendingId] = useState<string | null>(null);

  const pageSize = 12;

  useEffect(() => {
    refreshEmailLogs();
  }, [refreshEmailLogs]);

  const filtered = useMemo(() => {
    return emailLogs.filter((log) => {
      const matchSearch =
        log.recipient.toLowerCase().includes(search.toLowerCase()) ||
        (log.recipient_name || '').toLowerCase().includes(search.toLowerCase()) ||
        log.subject.toLowerCase().includes(search.toLowerCase());
      const matchStatus = statusFilter === 'All' || log.status === statusFilter;
      const matchType = typeFilter === 'All' || log.email_type === typeFilter;
      return matchSearch && matchStatus && matchType;
    });
  }, [emailLogs, search, statusFilter, typeFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);

  const typeOptions = useMemo(() => {
    const seen = new Set<string>();
    const opts: { type: string; label: string }[] = [{ type: 'All', label: 'All Types' }];
    emailLogs.forEach((log) => {
      if (!seen.has(log.email_type)) {
        seen.add(log.email_type);
        opts.push({ type: log.email_type, label: EMAIL_TYPE_LABELS[log.email_type] || log.email_type });
      }
    });
    return opts;
  }, [emailLogs]);

  const handleResend = async (logId: string) => {
    setResendingId(logId);
    try {
      const res = await resendEmail(logId);
      addToast(
        res.email?.status === 'Sent' ? 'Email Resent' : 'Resend Failed',
        res.email?.status === 'Sent'
          ? `The email was resent successfully to ${res.email?.recipient}.`
          : `Resend failed: ${res.email?.error_message || 'Unknown error'}`,
        res.email?.status === 'Sent' ? 'success' : 'error'
      );
    } catch (err: any) {
      addToast('Resend Failed', err.message || 'Failed to resend email', 'error');
    } finally {
      setResendingId(null);
    }
  };

  const handleSendTest = async () => {
    if (!testTo.trim()) return;
    setTestSending(true);
    try {
      const res = await sendTestEmail(testTo.trim());
      addToast(
        res.email?.status === 'Sent' ? 'Test Email Sent' : 'Test Email Failed',
        res.email?.status === 'Sent'
          ? `A test email was sent to ${testTo.trim()}.`
          : `Test email failed: ${res.email?.error_message || 'Check SMTP configuration'}`,
        res.email?.status === 'Sent' ? 'success' : 'error'
      );
      setShowTestModal(false);
      setTestTo('');
    } catch (err: any) {
      addToast('Test Email Failed', err.message || 'Failed to send test email', 'error');
    } finally {
      setTestSending(false);
    }
  };

  const statCards = [
    { label: 'Total Emails', value: emailStats?.total ?? 0, icon: Inbox, color: 'text-violet-400', bg: 'bg-violet-500/10 border-violet-500/20' },
    { label: 'Sent', value: emailStats?.sent ?? 0, icon: CheckCircle2, color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' },
    { label: 'Failed', value: emailStats?.failed ?? 0, icon: XCircle, color: 'text-rose-400', bg: 'bg-rose-500/10 border-rose-500/20' },
    { label: 'Pending', value: emailStats?.pending ?? 0, icon: Clock, color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20' },
    { label: 'Sent Today', value: emailStats?.today ?? 0, icon: MailCheck, color: 'text-cyan-400', bg: 'bg-cyan-500/10 border-cyan-500/20' },
  ];

  return (
    <div className="flex flex-col gap-6 select-none pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <span className="text-xs font-bold text-violet-400 uppercase tracking-widest">Notifications</span>
          <h2 className="text-xl sm:text-2xl font-extrabold font-display text-white">Email Logs</h2>
          <p className="text-xs text-white/50 mt-1">
            Audit trail of all system-generated email notifications. Failed emails can be resent.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {emailStats && (
            <span className={`px-3 py-1.5 rounded-xl text-[10px] font-bold border flex items-center gap-1.5 ${emailStats.smtp_configured ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-amber-500/10 text-amber-400 border-amber-500/20'}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${emailStats.smtp_configured ? 'bg-emerald-400' : 'bg-amber-400'}`} />
              {emailStats.smtp_configured ? 'SMTP Connected' : 'Console Mode'}
            </span>
          )}
          <button
            onClick={() => setShowTestModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold transition-all cursor-pointer"
          >
            <Send className="w-4 h-4" />
            Send Test Email
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.label} className={`p-4 rounded-2xl border ${card.bg} flex flex-col gap-1.5`}>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-white/50 uppercase tracking-widest">{card.label}</span>
                <Icon className={`w-4 h-4 ${card.color}`} />
              </div>
              <span className="text-2xl font-extrabold text-white">{card.value}</span>
            </div>
          );
        })}
      </div>

      <div className="p-4 rounded-3xl bg-zinc-950/60 border border-white/10 backdrop-blur-md flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-white/40 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search recipient, subject..."
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-xs placeholder-white/30 focus:outline-none"
          />
        </div>
        <div className="flex items-center gap-2 w-full md:w-auto">
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value as typeof statusFilter); setPage(1); }}
            className="bg-zinc-900 border border-white/10 text-white text-xs rounded-xl px-3 py-2 focus:outline-none cursor-pointer"
          >
            <option value="All">All Status</option>
            <option value="Sent">Sent</option>
            <option value="Failed">Failed</option>
            <option value="Pending">Pending</option>
          </select>
          <select
            value={typeFilter}
            onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }}
            className="bg-zinc-900 border border-white/10 text-white text-xs rounded-xl px-3 py-2 focus:outline-none cursor-pointer"
          >
            {typeOptions.map((opt) => (
              <option key={opt.type} value={opt.type}>{opt.label}</option>
            ))}
          </select>
          <button
            onClick={() => { setSearch(''); setStatusFilter('All'); setTypeFilter('All'); refreshEmailLogs(); }}
            className="p-2 rounded-xl bg-white/5 border border-white/10 text-white/60 hover:text-white transition-all cursor-pointer"
            title="Reset filters"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-white/10">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-white/5 border-b border-white/10">
              <th className="p-3 text-[10px] font-bold text-white/50 uppercase tracking-wider text-left">Recipient</th>
              <th className="p-3 text-[10px] font-bold text-white/50 uppercase tracking-wider text-left">Subject</th>
              <th className="p-3 text-[10px] font-bold text-white/50 uppercase tracking-wider text-left">Type</th>
              <th className="p-3 text-[10px] font-bold text-white/50 uppercase tracking-wider text-left">Status</th>
              <th className="p-3 text-[10px] font-bold text-white/50 uppercase tracking-wider text-left">Sent At</th>
              <th className="p-3 text-[10px] font-bold text-white/50 uppercase tracking-wider text-left">Error</th>
              <th className="p-3 text-[10px] font-bold text-white/50 uppercase tracking-wider text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {emailLogsLoading ? (
              <tr>
                <td colSpan={7} className="p-12 text-center">
                  <div className="flex items-center justify-center gap-2 text-white/40 text-sm">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Loading email logs...
                  </div>
                </td>
              </tr>
            ) : paginated.length === 0 ? (
              <tr>
                <td colSpan={7} className="p-12 text-center text-white/40 text-sm">
                  <div className="flex flex-col items-center gap-3">
                    <Inbox className="w-8 h-8 text-white/20" />
                    No email logs found matching your filters.
                  </div>
                </td>
              </tr>
            ) : (
              paginated.map((log) => (
                <tr key={log.log_id} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                  <td className="p-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center text-white font-bold text-xs">
                        {(log.recipient_name || log.recipient).charAt(0).toUpperCase()}
                      </div>
                      <div className="flex flex-col">
                        <span className="font-medium text-white">{log.recipient_name || '—'}</span>
                        <span className="text-[10px] text-white/40">{log.recipient}</span>
                      </div>
                    </div>
                  </td>
                  <td className="p-3 text-white/70 max-w-[240px] truncate" title={log.subject}>{log.subject}</td>
                  <td className="p-3">
                    <span className="px-2 py-0.5 rounded-lg bg-white/5 border border-white/10 text-white/60 text-[10px] font-semibold whitespace-nowrap">
                      {EMAIL_TYPE_LABELS[log.email_type] || log.email_type}
                    </span>
                  </td>
                  <td className="p-3">
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${STATUS_STYLES[log.status]}`}>
                      {log.status}
                    </span>
                  </td>
                  <td className="p-3 text-white/50 whitespace-nowrap">
                    {log.sent_at ? new Date(log.sent_at).toLocaleString() : '—'}
                  </td>
                  <td className="p-3 text-rose-400/80 max-w-[220px] truncate" title={log.error_message || ''}>
                    {log.error_message ? (
                      <span className="flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3 flex-shrink-0" />
                        {log.error_message}
                      </span>
                    ) : '—'}
                  </td>
                  <td className="p-3 text-right">
                    <button
                      onClick={() => handleResend(log.log_id)}
                      disabled={resendingId === log.log_id}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
                        log.status === 'Failed'
                          ? 'bg-rose-500/10 text-rose-300 border border-rose-500/20 hover:bg-rose-500/20'
                          : 'bg-white/5 text-white/60 border border-white/10 hover:bg-white/10 hover:text-white'
                      }`}
                    >
                      {resendingId === log.log_id ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <RotateCcw className="w-3 h-3" />
                      )}
                      Resend
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between text-xs text-white/50">
          <span>
            Showing {(page - 1) * pageSize + 1}-{Math.min(page * pageSize, filtered.length)} of {filtered.length}
          </span>
          <div className="flex items-center gap-2">
            <button
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-white/70 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
            >
              Previous
            </button>
            <span className="font-mono text-white">Page {page} of {totalPages}</span>
            <button
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-white/70 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {showTestModal && (
        <div className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-zinc-950 border border-white/20 rounded-3xl p-6 shadow-2xl flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-violet-500/20 text-violet-400">
                <Send className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Send Test Email</h3>
                <p className="text-[10px] text-white/40">Verify your email configuration is working.</p>
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-[10px] font-bold text-white/50 uppercase tracking-wider">Recipient Email</label>
              <input
                type="email"
                value={testTo}
                onChange={(e) => setTestTo(e.target.value)}
                placeholder="admin@casyum.edu"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white placeholder-white/30 focus:outline-none focus:border-violet-500/50"
              />
            </div>
            {emailStats && !emailStats.smtp_configured && (
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-300 leading-relaxed">
                SMTP is not configured — the email will be previewed in the server console (console transport). Configure SMTP_HOST in <code className="font-mono">server/.env</code> for real delivery.
              </div>
            )}
            <div className="flex items-center justify-end gap-3 mt-1">
              <button onClick={() => setShowTestModal(false)} className="px-4 py-2 rounded-xl text-white/60 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold cursor-pointer">
                Cancel
              </button>
              <button
                onClick={handleSendTest}
                disabled={!testTo.trim() || testSending}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {testSending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                Send Test
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmailLogs;
