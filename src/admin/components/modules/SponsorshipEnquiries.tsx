import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Search,
  Eye,
  X,
  Loader2,
  RefreshCw,
  Mail,
  Phone,
  MessageCircle,
  CheckCircle2,
  XCircle,
  UserCheck,
  StickyNote,
  Send,
  Handshake,
  Save,
  Trash2,
  ArrowUpRight,
} from 'lucide-react';
import { useAdmin } from '../../context/AdminContext';
import { useRBAC } from '../../../rbac/context/RBACContext';
import { ConfirmationDialog } from '../common/ConfirmationDialog';
import {
  listSponsorshipEnquiries,
  updateSponsorshipEnquiry,
  assignEnquiryToHead,
  addEnquiryNote,
  deleteSponsorshipEnquiry,
  approveEnquiryToSponsor,
  listSponsorshipHeads,
  listSponsorCategories,
  listSponsorPackages,
  resolveStaffIdentity,
} from '../../../services/sponsorshipService';
import type {
  SponsorshipEnquiry,
  EnquiryStatus,
  SponsorCategory,
  SponsorPackage,
} from '../../../types/sponsorship';
import { ENQUIRY_STATUSES } from '../../../types/sponsorship';

const inputCls =
  'w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white placeholder-white/30 focus:outline-none focus:border-violet-500/50 transition-all';

const labelCls = 'text-[10px] font-bold uppercase tracking-widest text-white/50';

const STATUS_CLS: Record<EnquiryStatus, string> = {
  New: 'bg-sky-500/10 border-sky-500/30 text-sky-300',
  Contacted: 'bg-violet-500/10 border-violet-500/30 text-violet-300',
  'Under Review': 'bg-amber-500/10 border-amber-500/30 text-amber-300',
  Negotiation: 'bg-indigo-500/10 border-indigo-500/30 text-indigo-300',
  Approved: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300',
  Rejected: 'bg-rose-500/10 border-rose-500/30 text-rose-300',
  Closed: 'bg-white/5 border-white/10 text-white/40',
};

function formatDate(value: string): string {
  if (!value) return '—';
  try {
    return new Date(value).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch {
    return '—';
  }
}

function formatDateTime(value: string): string {
  if (!value) return '—';
  try {
    return new Date(value).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  } catch {
    return '—';
  }
}

function whatsappLink(phone: string, text: string): string {
  const clean = String(phone || '').replace(/[^0-9]/g, '');
  return `https://wa.me/${clean}?text=${encodeURIComponent(text)}`;
}

export const SponsorshipEnquiries: React.FC = () => {
  const { addToast, logAction, pushNotification } = useAdmin();
  const rbac = useRBAC();

  const [enquiries, setEnquiries] = useState<SponsorshipEnquiry[]>([]);
  const [categories, setCategories] = useState<SponsorCategory[]>([]);
  const [packages, setPackages] = useState<SponsorPackage[]>([]);
  const [heads, setHeads] = useState<{ id: string; name: string; email: string; phone: string }[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');

  const [selected, setSelected] = useState<SponsorshipEnquiry | null>(null);
  const [noteDraft, setNoteDraft] = useState('');
  const [addingNote, setAddingNote] = useState(false);

  const [statusDraft, setStatusDraft] = useState<EnquiryStatus>('New');
  const [savingStatus, setSavingStatus] = useState(false);

  const [assignDraft, setAssignDraft] = useState('');
  const [savingAssign, setSavingAssign] = useState(false);

  const [approveTarget, setApproveTarget] = useState<SponsorshipEnquiry | null>(null);
  const [approveForm, setApproveForm] = useState({
    category: '',
    categoryId: '',
    description: '',
    websiteUrl: '',
    logoUrl: '',
    packageId: '',
    packageName: '',
    sponsorshipAmount: '',
    displayAmount: true,
  });
  const [savingApprove, setSavingApprove] = useState(false);

  const [rejectTarget, setRejectTarget] = useState<SponsorshipEnquiry | null>(null);
  const [rejecting, setRejecting] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<SponsorshipEnquiry | null>(null);
  const [deleting, setDeleting] = useState(false);

  const canApprove = rbac.hasPermission('sponsorship_enquiries.approve');
  const canAssign = rbac.hasPermission('sponsorship_enquiries.assign');
  const canDelete = rbac.hasPermission('sponsorship_enquiries.delete');
  const canEdit = rbac.hasPermission('sponsorship_enquiries.edit');

  const loadAll = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [enquiryRows, categoryRows, packageRows, headRows] = await Promise.all([
        listSponsorshipEnquiries(),
        listSponsorCategories(),
        listSponsorPackages(),
        listSponsorshipHeads(),
      ]);
      setEnquiries(enquiryRows);
      setCategories(categoryRows);
      setPackages(packageRows);
      setHeads(headRows);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load sponsorship enquiries.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

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

  const openDetails = async (e: SponsorshipEnquiry) => {
    setSelected(e);
    setStatusDraft(e.status);
    setAssignDraft(e.assignedTo || '');
    setNoteDraft('');
  };

  const handleStatusChange = async () => {
    if (!selected) return;
    setSavingStatus(true);
    try {
      await updateSponsorshipEnquiry(selected.id, {
        status: statusDraft,
        updatedBy: rbac.user?.name || 'Admin',
      });
      setEnquiries((prev) => prev.map((x) => (x.id === selected.id ? { ...x, status: statusDraft } : x)));
      setSelected((prev) => (prev ? { ...prev, status: statusDraft } : prev));
      logAction('Enquiry Status Updated', `Set ${selected.companyName} to ${statusDraft}`);
      addToast('Status updated', `Enquiry moved to ${statusDraft}.`, 'success');
    } catch (err) {
      addToast('Update failed', err instanceof Error ? err.message : 'Could not update status.', 'error');
    } finally {
      setSavingStatus(false);
    }
  };

  const handleAssign = async () => {
    if (!selected) return;
    if (!assignDraft) {
      addToast('Select a head', 'Choose a Sponsorship Head to assign this enquiry.', 'error');
      return;
    }
    setSavingAssign(true);
    const head = heads.find((h) => h.id === assignDraft);
    try {
      await assignEnquiryToHead(selected.id, { id: assignDraft, name: head?.name || 'Sponsorship Head' });
      const assignedToName = head?.name || 'Sponsorship Head';
      setEnquiries((prev) => prev.map((x) => (x.id === selected.id ? { ...x, assignedTo: assignDraft, assignedToName } : x)));
      setSelected((prev) => (prev ? { ...prev, assignedTo: assignDraft, assignedToName } : prev));
      logAction('Enquiry Assigned', `Assigned ${selected.companyName} to ${assignedToName}`);
      addToast('Enquiry assigned', `Assigned to ${assignedToName}.`, 'success');
    } catch (err) {
      addToast('Assign failed', err instanceof Error ? err.message : 'Could not assign the enquiry.', 'error');
    } finally {
      setSavingAssign(false);
    }
  };

  const handleAddNote = async () => {
    if (!selected || !noteDraft.trim()) return;
    setAddingNote(true);
    try {
      const identity = await resolveStaffIdentity(rbac.user?.id || '');
      await addEnquiryNote(selected.id, noteDraft.trim(), identity.name, identity.id);
      const entry = {
        id: `note-${Date.now()}`,
        note: noteDraft.trim(),
        author: identity.name,
        authorId: identity.id,
        createdAt: new Date().toISOString(),
      };
      setSelected((prev) => (prev ? { ...prev, internalNotes: [...(prev.internalNotes || []), entry] } : prev));
      setNoteDraft('');
      logAction('Enquiry Note Added', `Added internal note to ${selected.companyName}`);
      addToast('Note added', 'Internal note saved.', 'success');
    } catch (err) {
      addToast('Note failed', err instanceof Error ? err.message : 'Could not add the note.', 'error');
    } finally {
      setAddingNote(false);
    }
  };

  const openApprove = (e: SponsorshipEnquiry) => {
    setApproveTarget(e);
    setApproveForm({
      category: e.categoryInterest || categories[0]?.name || '',
      categoryId: categories.find((c) => c.name === e.categoryInterest)?.id || categories[0]?.id || '',
      description: `${e.companyName} — ${e.packageInterest || 'sponsorship'} partner.`,
      websiteUrl: e.website || '',
      logoUrl: '',
      packageId: packages.find((p) => p.name === e.packageInterest)?.id || '',
      packageName: e.packageInterest || '',
      sponsorshipAmount: '',
      displayAmount: true,
    });
  };

  const confirmApprove = async () => {
    if (!approveTarget) return;
    setSavingApprove(true);
    try {
      const identity = await resolveStaffIdentity(rbac.user?.id || '');
      const sponsor = await approveEnquiryToSponsor(approveTarget.id, {
        companyName: approveForm.description.trim() ? approveTarget.companyName : approveTarget.companyName,
        logoUrl: approveForm.logoUrl,
        category: approveForm.category,
        categoryId: approveForm.categoryId,
        description: approveForm.description,
        websiteUrl: approveForm.websiteUrl,
        displayOrder: 1,
        packageId: approveForm.packageId,
        packageName: approveForm.packageName,
        sponsorshipAmount: approveForm.sponsorshipAmount !== '' ? Number(approveForm.sponsorshipAmount) : undefined,
        displayAmount: approveForm.displayAmount,
        approvedBy: identity.id,
        approvedByName: identity.name,
      });
      setEnquiries((prev) => prev.map((x) => (x.id === approveTarget.id ? { ...x, status: 'Approved' } : x)));
      setSelected((prev) => (prev && prev.id === approveTarget.id ? { ...prev, status: 'Approved' } : prev));
      setApproveTarget(null);
      logAction('Enquiry Approved', `Approved ${approveTarget.companyName} as a sponsor (${sponsor.name})`);
      pushNotification('Sponsor Approved', `${sponsor.name} has been approved and added to the showcase.`, 'success');
    } catch (err) {
      addToast('Approval failed', err instanceof Error ? err.message : 'Could not approve the enquiry.', 'error');
    } finally {
      setSavingApprove(false);
    }
  };

  const confirmReject = async () => {
    if (!rejectTarget) return;
    setRejecting(true);
    try {
      await updateSponsorshipEnquiry(rejectTarget.id, {
        status: 'Rejected',
        updatedBy: rbac.user?.name || 'Admin',
      });
      setEnquiries((prev) => prev.map((x) => (x.id === rejectTarget.id ? { ...x, status: 'Rejected' } : x)));
      setSelected((prev) => (prev && prev.id === rejectTarget.id ? { ...prev, status: 'Rejected' } : prev));
      setRejectTarget(null);
      logAction('Enquiry Rejected', `Rejected enquiry from ${rejectTarget.companyName}`);
      addToast('Enquiry rejected', `${rejectTarget.companyName} was marked as Rejected.`, 'warning');
    } catch (err) {
      addToast('Reject failed', err instanceof Error ? err.message : 'Could not reject the enquiry.', 'error');
    } finally {
      setRejecting(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteSponsorshipEnquiry(deleteTarget.id);
      setEnquiries((prev) => prev.filter((x) => x.id !== deleteTarget.id));
      if (selected?.id === deleteTarget.id) setSelected(null);
      setDeleteTarget(null);
      logAction('Enquiry Deleted', `Deleted enquiry from ${deleteTarget.companyName}`);
      addToast('Enquiry deleted', 'The enquiry record was removed.', 'warning');
    } catch (err) {
      addToast('Delete failed', err instanceof Error ? err.message : 'Could not delete.', 'error');
    } finally {
      setDeleting(false);
    }
  };

  const quickStatus = async (e: SponsorshipEnquiry, status: EnquiryStatus) => {
    try {
      await updateSponsorshipEnquiry(e.id, { status, updatedBy: rbac.user?.name || 'Admin' });
      setEnquiries((prev) => prev.map((x) => (x.id === e.id ? { ...x, status } : x)));
      logAction('Enquiry Status Updated', `Set ${e.companyName} to ${status}`);
    } catch (err) {
      addToast('Update failed', err instanceof Error ? err.message : 'Could not update status.', 'error');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="flex items-center gap-3 text-white/50 text-sm">
          <Loader2 className="w-5 h-5 animate-spin text-violet-400" />
          <span>Loading enquiries...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 select-none pb-12">
      <div className="flex flex-col">
        <span className="text-xs font-bold text-violet-400 uppercase tracking-widest">Partnerships</span>
        <h2 className="text-xl sm:text-2xl font-extrabold font-display text-white">Sponsorship Enquiries</h2>
        <p className="text-xs text-white/40 mt-1">
          Leads from the public "Looking for Sponsors" form. Review, assign, negotiate and approve.
        </p>
      </div>

      {error && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-rose-500/10 border border-rose-500/25 text-rose-300 text-xs">
          <span>{error}</span>
          <button onClick={loadAll} className="ml-auto flex items-center gap-1.5 font-bold hover:text-white cursor-pointer">
            <RefreshCw className="w-3 h-3" /> Retry
          </button>
        </div>
      )}

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
                <th className="px-4 py-3 font-bold">Assigned To</th>
                <th className="px-4 py-3 font-bold">Submitted</th>
                <th className="px-4 py-3 font-bold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-white/30 text-sm">
                    No enquiries found.
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
                        <span className="text-white/70">{e.contactPerson}{e.designation ? ` · ${e.designation}` : ''}</span>
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
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-widest border ${STATUS_CLS[e.status]}`}>
                        {e.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-white/60">{e.assignedToName || '—'}</td>
                    <td className="px-4 py-3 text-white/40">{formatDate(e.submittedAt)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => void openDetails(e)}
                          className="p-1.5 rounded-lg bg-white/5 border border-white/10 text-white/60 hover:text-white hover:bg-white/10 cursor-pointer"
                          title="View details"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        {canEdit && (
                          <select
                            value={e.status}
                            onChange={(ev) => void quickStatus(e, ev.target.value as EnquiryStatus)}
                            className="bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-[10px] text-white/70 focus:outline-none appearance-none cursor-pointer"
                            title="Quick status"
                          >
                            {ENQUIRY_STATUSES.map((s) => (
                              <option key={s} value={s} className="bg-zinc-900">{s}</option>
                            ))}
                          </select>
                        )}
                        {canApprove && e.status !== 'Approved' && e.status !== 'Rejected' && (
                          <button
                            onClick={() => openApprove(e)}
                            className="p-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/20 cursor-pointer"
                            title="Approve"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {canDelete && (
                          <button
                            onClick={() => setDeleteTarget(e)}
                            className="p-1.5 rounded-lg bg-white/5 border border-white/10 text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 cursor-pointer"
                            title="Delete"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ----------------------- Details modal ----------------------- */}
      {selected && (
        <div className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
          <div className="w-full max-w-3xl max-h-[92vh] overflow-y-auto bg-zinc-950 border border-white/15 rounded-3xl shadow-2xl custom-scrollbar my-auto">
            <div className="sticky top-0 z-10 bg-zinc-950/95 backdrop-blur border-b border-white/10 px-6 py-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-violet-500/15 border border-violet-500/30 text-violet-300">
                  <Handshake className="w-4 h-4" />
                </div>
                <div className="flex flex-col">
                  <h3 className="text-sm font-extrabold font-display text-white">{selected.companyName}</h3>
                  <span className={`inline-flex w-max px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-widest border mt-0.5 ${STATUS_CLS[selected.status]}`}>
                    {selected.status}
                  </span>
                </div>
              </div>
              <button onClick={() => setSelected(null)} className="p-2 rounded-lg text-white/50 hover:text-white bg-white/5 hover:bg-white/10 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 flex flex-col gap-5">
              {/* Contact card */}
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 flex flex-col gap-3">
                <div className="flex flex-wrap gap-2">
                  {selected.email && (
                    <a
                      href={`mailto:${selected.email}`}
                      className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white/70 hover:text-white text-[11px] font-bold cursor-pointer"
                    >
                      <Mail className="w-3.5 h-3.5 text-violet-300" /> {selected.email}
                    </a>
                  )}
                  {selected.phone && (
                    <a
                      href={`tel:${selected.phone}`}
                      className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white/70 hover:text-white text-[11px] font-bold cursor-pointer"
                    >
                      <Phone className="w-3.5 h-3.5 text-emerald-300" /> {selected.phone}
                    </a>
                  )}
                  {selected.phone && (
                    <a
                      href={whatsappLink(selected.phone, `Hello ${selected.contactPerson}, this is the CASYUM sponsorship team...`)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 px-3 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-[11px] font-bold cursor-pointer"
                    >
                      <MessageCircle className="w-3.5 h-3.5" /> WhatsApp
                    </a>
                  )}
                  {selected.website && (
                    <a
                      href={selected.website.startsWith('http') ? selected.website : `https://${selected.website}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white/70 hover:text-white text-[11px] font-bold cursor-pointer"
                    >
                      <ArrowUpRight className="w-3.5 h-3.5 text-cyan-300" /> Website
                    </a>
                  )}
                </div>
              </div>

              {/* Details grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="flex flex-col gap-1 rounded-xl bg-white/[0.03] border border-white/10 p-3">
                  <span className={labelCls}>Contact Person</span>
                  <span className="text-xs text-white/80">{selected.contactPerson}{selected.designation ? ` · ${selected.designation}` : ''}</span>
                </div>
                <div className="flex flex-col gap-1 rounded-xl bg-white/[0.03] border border-white/10 p-3">
                  <span className={labelCls}>Category Interest</span>
                  <span className="text-xs text-white/80">{selected.categoryInterest || '—'}</span>
                </div>
                <div className="flex flex-col gap-1 rounded-xl bg-white/[0.03] border border-white/10 p-3">
                  <span className={labelCls}>Package Interest</span>
                  <span className="text-xs text-white/80">{selected.packageInterest || '—'}</span>
                </div>
                <div className="flex flex-col gap-1 rounded-xl bg-white/[0.03] border border-white/10 p-3">
                  <span className={labelCls}>Budget</span>
                  <span className="text-xs text-white/80">{selected.budget || '—'}</span>
                </div>
                <div className="flex flex-col gap-1 rounded-xl bg-white/[0.03] border border-white/10 p-3 sm:col-span-2">
                  <span className={labelCls}>How did they hear about us</span>
                  <span className="text-xs text-white/80">{selected.howDidYouHear || '—'}</span>
                </div>
                {selected.message && (
                  <div className="flex flex-col gap-1 rounded-xl bg-white/[0.03] border border-white/10 p-3 sm:col-span-2">
                    <span className={labelCls}>Message</span>
                    <p className="text-xs text-white/80 leading-relaxed">{selected.message}</p>
                  </div>
                )}
                <div className="flex flex-col gap-1 rounded-xl bg-white/[0.03] border border-white/10 p-3">
                  <span className={labelCls}>Submitted</span>
                  <span className="text-xs text-white/80">{formatDateTime(selected.submittedAt)}</span>
                </div>
                <div className="flex flex-col gap-1 rounded-xl bg-white/[0.03] border border-white/10 p-3">
                  <span className={labelCls}>Last Updated</span>
                  <span className="text-xs text-white/80">{formatDateTime(selected.updatedAt)}</span>
                </div>
              </div>

              {/* Status + assign */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="flex flex-col gap-2 rounded-xl bg-white/[0.03] border border-white/10 p-4">
                  <span className={labelCls}>Update Status</span>
                  <div className="flex gap-2">
                    <select
                      value={statusDraft}
                      onChange={(e) => setStatusDraft(e.target.value as EnquiryStatus)}
                      className={`${inputCls} appearance-none cursor-pointer`}
                    >
                      {ENQUIRY_STATUSES.map((s) => (
                        <option key={s} value={s} className="bg-zinc-900">{s}</option>
                      ))}
                    </select>
                    <button
                      onClick={() => void handleStatusChange()}
                      disabled={savingStatus}
                      className="px-3 py-2 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                    >
                      {savingStatus ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                      Save
                    </button>
                  </div>
                </div>
                <div className="flex flex-col gap-2 rounded-xl bg-white/[0.03] border border-white/10 p-4">
                  <span className={labelCls}>Assign Sponsorship Head</span>
                  <div className="flex gap-2">
                    <select
                      value={assignDraft}
                      onChange={(e) => setAssignDraft(e.target.value)}
                      className={`${inputCls} appearance-none cursor-pointer`}
                    >
                      <option value="">Unassigned</option>
                      {heads.map((h) => (
                        <option key={h.id} value={h.id} className="bg-zinc-900">{h.name}</option>
                      ))}
                    </select>
                    <button
                      onClick={() => void handleAssign()}
                      disabled={savingAssign}
                      className="px-3 py-2 rounded-xl bg-white/5 border border-white/15 text-white/70 hover:text-white text-xs font-bold cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                    >
                      {savingAssign ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <UserCheck className="w-3.5 h-3.5" />}
                      Assign
                    </button>
                  </div>
                  {!canAssign && <span className="text-[10px] text-white/30">You do not have permission to assign enquiries.</span>}
                </div>
              </div>

              {/* Internal notes */}
              <div className="flex flex-col gap-3 rounded-xl bg-white/[0.03] border border-white/10 p-4">
                <span className={labelCls}>Internal Notes</span>
                <div className="flex flex-col gap-2 max-h-48 overflow-y-auto custom-scrollbar">
                  {(selected.internalNotes || []).length === 0 ? (
                    <p className="text-xs text-white/30">No notes yet.</p>
                  ) : (
                    (selected.internalNotes || []).map((n) => (
                      <div key={n.id} className="rounded-xl bg-white/5 border border-white/10 p-3 flex flex-col gap-1">
                        <p className="text-xs text-white/80 leading-relaxed">{n.note}</p>
                        <span className="text-[10px] text-white/40">{n.author} · {formatDateTime(n.createdAt)}</span>
                      </div>
                    ))
                  )}
                </div>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <StickyNote className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/30" />
                    <input
                      type="text"
                      value={noteDraft}
                      onChange={(e) => setNoteDraft(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') void handleAddNote(); }}
                      placeholder="Add an internal note..."
                      className={`${inputCls} pl-9`}
                    />
                  </div>
                  <button
                    onClick={() => void handleAddNote()}
                    disabled={addingNote || !noteDraft.trim()}
                    className="px-3 py-2 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                  >
                    {addingNote ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                    Add
                  </button>
                </div>
              </div>

              {/* Approve / reject */}
              {canApprove && selected.status !== 'Approved' && selected.status !== 'Rejected' && (
                <div className="flex items-center justify-end gap-3">
                  <button
                    onClick={() => setRejectTarget(selected)}
                    disabled={rejecting}
                    className="px-4 py-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 hover:bg-rose-500/20 text-xs font-bold cursor-pointer flex items-center gap-2"
                  >
                    <XCircle className="w-3.5 h-3.5" /> Reject
                  </button>
                  <button
                    onClick={() => { openApprove(selected); setSelected(null); }}
                    className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold cursor-pointer flex items-center gap-2"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" /> Approve as Sponsor
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ----------------------- Approve modal ----------------------- */}
      {approveTarget && (
        <div className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
          <div className="w-full max-w-2xl max-h-[92vh] overflow-y-auto bg-zinc-950 border border-white/15 rounded-3xl shadow-2xl custom-scrollbar my-auto">
            <div className="sticky top-0 z-10 bg-zinc-950/95 backdrop-blur border-b border-white/10 px-6 py-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-extrabold font-display text-white">Approve Sponsor</h3>
              </div>
              <button onClick={() => setApproveTarget(null)} className="p-2 rounded-lg text-white/50 hover:text-white bg-white/5 hover:bg-white/10 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-6 flex flex-col gap-4">
              <p className="text-xs text-white/50">
                This will create a public sponsor profile for <span className="font-bold text-white">{approveTarget.companyName}</span> and mark the enquiry as Approved.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5 sm:col-span-2">
                  <label className={labelCls}>Category</label>
                  <select
                    value={approveForm.category}
                    onChange={(e) => {
                      const cat = categories.find((c) => c.name === e.target.value);
                      setApproveForm({ ...approveForm, category: e.target.value, categoryId: cat?.id || '' });
                    }}
                    className={`${inputCls} appearance-none cursor-pointer`}
                  >
                    <option value="">Select category...</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.name} className="bg-zinc-900">{c.name}</option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className={labelCls}>Package</label>
                  <select
                    value={approveForm.packageId}
                    onChange={(e) => {
                      const pkg = packages.find((p) => p.id === e.target.value);
                      setApproveForm({ ...approveForm, packageId: e.target.value, packageName: pkg?.name || '' });
                    }}
                    className={`${inputCls} appearance-none cursor-pointer`}
                  >
                    <option value="">No package</option>
                    {packages.map((p) => (
                      <option key={p.id} value={p.id} className="bg-zinc-900">{p.name}</option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className={labelCls}>Sponsorship Amount (₹, Optional)</label>
                  <input
                    type="number"
                    value={approveForm.sponsorshipAmount}
                    onChange={(e) => setApproveForm({ ...approveForm, sponsorshipAmount: e.target.value })}
                    placeholder="0"
                    className={inputCls}
                  />
                </div>
                <div className="flex flex-col gap-1.5 sm:col-span-2">
                  <label className={labelCls}>Short Description</label>
                  <textarea
                    value={approveForm.description}
                    onChange={(e) => setApproveForm({ ...approveForm, description: e.target.value })}
                    rows={2}
                    className={`${inputCls} resize-none`}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className={labelCls}>Website URL</label>
                  <input
                    type="url"
                    value={approveForm.websiteUrl}
                    onChange={(e) => setApproveForm({ ...approveForm, websiteUrl: e.target.value })}
                    placeholder="https://..."
                    className={inputCls}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className={labelCls}>Logo URL</label>
                  <input
                    type="url"
                    value={approveForm.logoUrl}
                    onChange={(e) => setApproveForm({ ...approveForm, logoUrl: e.target.value })}
                    placeholder="Logo image URL"
                    className={inputCls}
                  />
                </div>
              </div>
              <label className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/10 cursor-pointer">
                <input
                  type="checkbox"
                  checked={approveForm.displayAmount}
                  onChange={(e) => setApproveForm({ ...approveForm, displayAmount: e.target.checked })}
                  className="w-4 h-4 accent-emerald-500 cursor-pointer"
                />
                <span className="text-xs text-white/70">Display sponsorship amount publicly</span>
              </label>
              <div className="flex items-center justify-end gap-3 mt-1">
                <button type="button" onClick={() => setApproveTarget(null)} className="px-4 py-2.5 rounded-xl text-white/60 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold cursor-pointer">
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => void confirmApprove()}
                  disabled={savingApprove || !approveForm.category}
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold cursor-pointer disabled:opacity-50 flex items-center gap-2"
                >
                  {savingApprove ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                  Approve Sponsor
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Reject confirmation */}
      <ConfirmationDialog
        open={!!rejectTarget}
        title="Reject Enquiry"
        message={`Mark the enquiry from "${rejectTarget?.companyName}" as Rejected? The company will not appear in the sponsor showcase.`}
        loading={rejecting}
        confirmLabel="Reject"
        variant="danger"
        onConfirm={() => void confirmReject()}
        onCancel={() => setRejectTarget(null)}
      />

      {/* Delete confirmation */}
      <ConfirmationDialog
        open={!!deleteTarget}
        title="Delete Enquiry"
        message={`Delete the enquiry from "${deleteTarget?.companyName}"? This cannot be undone.`}
        loading={deleting}
        confirmLabel="Delete"
        variant="danger"
        onConfirm={() => void confirmDelete()}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
};

export default SponsorshipEnquiries;
