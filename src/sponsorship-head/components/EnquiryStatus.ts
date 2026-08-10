import type { EnquiryStatus } from '../../types/sponsorship';

export const ENQUIRY_STATUS_CLS: Record<EnquiryStatus, string> = {
  New: 'bg-sky-500/10 border-sky-500/30 text-sky-300',
  Contacted: 'bg-violet-500/10 border-violet-500/30 text-violet-300',
  'Under Review': 'bg-amber-500/10 border-amber-500/30 text-amber-300',
  Negotiation: 'bg-indigo-500/10 border-indigo-500/30 text-indigo-300',
  Approved: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300',
  Rejected: 'bg-rose-500/10 border-rose-500/30 text-rose-300',
  Closed: 'bg-white/5 border-white/10 text-white/40',
};

export function formatDate(value: string): string {
  if (!value) return '—';
  try {
    return new Date(value).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch {
    return '—';
  }
}

export function formatDateTime(value: string): string {
  if (!value) return '—';
  try {
    return new Date(value).toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '—';
  }
}

export function whatsappLink(phone: string, text: string): string {
  const clean = String(phone || '').replace(/[^0-9]/g, '');
  return `https://wa.me/${clean}?text=${encodeURIComponent(text)}`;
}

export const OPEN_STATUSES = ['New', 'Contacted', 'Under Review', 'Negotiation'];
