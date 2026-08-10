import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft, Mail, Phone, MessageCircle, UserCheck, StickyNote, Send, Save,
  CheckCircle2, XCircle, X, Loader2, Package, ArrowUpRight,
} from 'lucide-react';
import { useSponsorshipHead } from '../context/SponsorshipHeadContext';
import { ENQUIRY_STATUS_CLS, formatDateTime, whatsappLink } from '../components/EnquiryStatus';
import { ENQUIRY_STATUSES } from '../../types/sponsorship';
import { listSponsorCategories, listSponsorPackages } from '../../services/sponsorshipService';
import type { EnquiryStatus, SponsorCategory, SponsorPackage } from '../../types/sponsorship';

const inputCls =
  'w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white placeholder-white/30 focus:outline-none focus:border-violet-500/50 transition-all';
const labelCls = 'text-[10px] font-bold uppercase tracking-widest text-white/50';
const infoBox = 'flex flex-col gap-1 rounded-xl bg-white/[0.03] border border-white/10 p-3';

export const EnquiryDetailPage: React.FC = () => {
  const { enquiryId } = useParams<{ enquiryId: string }>();
  const navigate = useNavigate();
  const { enquiries, settings, updateStatus, addNote, assignToSelf, recommendPackage, approveEnquiry, addToast, user } =
    useSponsorshipHead();

  const enquiry = useMemo(() => enquiries.find((e) => e.id === enquiryId), [enquiries, enquiryId]);

  const [statusDraft, setStatusDraft] = useState<EnquiryStatus>('New');
  const [savingStatus, setSavingStatus] = useState(false);
  const [noteDraft, setNoteDraft] = useState('');
  const [addingNote, setAddingNote] = useState(false);
  const [assigning, setAssigning] = useState(false);
  const [recommendDraft, setRecommendDraft] = useState('');
  const [savingRecommend, setSavingRecommend] = useState(false);

  const [categories, setCategories] = useState<SponsorCategory[]>([]);
  const [packages, setPackages] = useState<SponsorPackage[]>([]);

  const [approveOpen, setApproveOpen] = useState(false);
  const [approveForm, setApproveForm] = useState({
    category: '', categoryId: '', description: '', websiteUrl: '', logoUrl: '',
    packageId: '', packageName: '', sponsorshipAmount: '', displayAmount: true,
  });
  const [savingApprove, setSavingApprove] = useState(false);
  const [rejecting, setRejecting] = useState(false);

  useEffect(() => {
    if (enquiry) setStatusDraft(enquiry.status);
  }, [enquiry]);

  useEffect(() => {
    void listSponsorCategories().then(setCategories).catch(() => setCategories([]));
    void listSponsorPackages().then(setPackages).catch(() => setPackages([]));
  }, []);

  if (!enquiry) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 flex flex-col items-center gap-4 text-center">
        <p className="text-sm text-white/50">Enquiry not found or you do not have access to it.</p>
        <Link to="/sponsorship-head/enquiries" className="px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold cursor-pointer">
          Back to Enquiries
        </Link>
      </div>
    );
  }

  const handleStatusSave = async () => {
    setSavingStatus(true);
    try {
      await updateStatus(enquiry.id, statusDraft);
      addToast('Status updated', `Enquiry moved to ${statusDraft}.`, 'success');
    } catch {
      addToast('Update failed', 'Could not update the enquiry status.', 'error');
    } finally {
      setSavingStatus(false);
    }
  };

  const handleAddNote = async () => {
    if (!noteDraft.trim()) return;
    setAddingNote(true);
    try {
      await addNote(enquiry.id, noteDraft);
      setNoteDraft('');
      addToast('Note added', 'Internal note saved.', 'success');
    } catch {
      addToast('Note failed', 'Could not add the note.', 'error');
    } finally {
      setAddingNote(false);
    }
  };

  const handleAssignSelf = async () => {
    setAssigning(true);
    try {
      await assignToSelf(enquiry.id);
      addToast('Enquiry assigned', 'Assigned to you.', 'success');
    } catch {
      addToast('Assign failed', 'Could not assign the enquiry.', 'error');
    } finally {
      setAssigning(false);
    }
  };

  const handleRecommend = async () => {
    if (!recommendDraft.trim()) return;
    setSavingRecommend(true);
    try {
      await recommendPackage(enquiry.id, recommendDraft.trim());
      addToast('Package recommended', `Recommended ${recommendDraft.trim()}.`, 'success');
      setRecommendDraft('');
    } catch {
      addToast('Save failed', 'Could not recommend a package.', 'error');
    } finally {
      setSavingRecommend(false);
    }
  };

  const openApprove = () => {
    setApproveForm({
      category: enquiry.categoryInterest || categories[0]?.name || '',
      categoryId: categories.find((c) => c.name === enquiry.categoryInterest)?.id || categories[0]?.id || '',
      description: `${enquiry.companyName} — ${enquiry.packageInterest || 'sponsorship'} partner.`,
      websiteUrl: enquiry.website || '',
      logoUrl: '',
      packageId: packages.find((p) => p.name === enquiry.packageInterest)?.id || '',
      packageName: enquiry.packageInterest || '',
      sponsorshipAmount: '',
      displayAmount: true,
    });
    setApproveOpen(true);
  };

  const confirmApprove = async () => {
    if (!approveForm.category) {
      addToast('Category required', 'Choose a sponsor category.', 'error');
      return;
    }
    setSavingApprove(true);
    try {
      const sponsor = await approveEnquiry(enquiry.id, {
        category: approveForm.category,
        categoryId: approveForm.categoryId,
        description: approveForm.description,
        websiteUrl: approveForm.websiteUrl,
        logoUrl: approveForm.logoUrl,
        packageId: approveForm.packageId,
        packageName: approveForm.packageName,
        sponsorshipAmount: approveForm.sponsorshipAmount !== '' ? Number(approveForm.sponsorshipAmount) : undefined,
        displayAmount: approveForm.displayAmount,
      });
      setApproveOpen(false);
      addToast('Sponsor Approved', `${sponsor.name} has been approved and added to the showcase.`, 'success');
    } catch (err) {
      addToast('Approval failed', err instanceof Error ? err.message : 'Could not approve the enquiry.', 'error');
    } finally {
      setSavingApprove(false);
    }
  };

  const confirmReject = async () => {
    setRejecting(true);
    try {
      await updateStatus(enquiry.id, 'Rejected');
      addToast('Enquiry rejected', `${enquiry.companyName} was marked as Rejected.`, 'warning');
    } catch {
      addToast('Reject failed', 'Could not reject the enquiry.', 'error');
    } finally {
      setRejecting(false);
    }
  };

  const canAct = !['Approved', 'Rejected', 'Closed'].includes(enquiry.status);

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col gap-6 select-none pb-16">
      <button
        onClick={() => navigate('/sponsorship-head/enquiries')}
        className="flex items-center gap-2 text-[11px] font-bold text-white/50 hover:text-white transition-colors cursor-pointer w-max"
      >
        <ArrowLeft className="w-3.5 h-3.5" /> Back to Enquiries
      </button>

      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <span className="text-xs font-bold text-violet-400 uppercase tracking-widest">Enquiry</span>
          <h1 className="text-xl sm:text-2xl font-extrabold font-display text-white">{enquiry.companyName}</h1>
          <span className={`inline-flex w-max px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-widest border ${ENQUIRY_STATUS_CLS[enquiry.status]}`}>
            {enquiry.status}
          </span>
        </div>
        {canAct && (
          <div className="flex items-center gap-3">
            <button
              onClick={() => void confirmReject()}
              disabled={rejecting}
              className="px-4 py-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 hover:bg-rose-500/20 text-xs font-bold cursor-pointer flex items-center gap-2"
            >
              {rejecting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <XCircle className="w-3.5 h-3.5" />}
              Reject
            </button>
            <button
              onClick={openApprove}
              className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold cursor-pointer flex items-center gap-2"
            >
              <CheckCircle2 className="w-3.5 h-3.5" /> Approve as Sponsor
            </button>
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        {enquiry.email && (
          <a href={`mailto:${enquiry.email}`} className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white/70 hover:text-white text-[11px] font-bold cursor-pointer">
            <Mail className="w-3.5 h-3.5 text-violet-300" /> {enquiry.email}
          </a>
        )}
        {enquiry.phone && (
          <a href={`tel:${enquiry.phone}`} className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white/70 hover:text-white text-[11px] font-bold cursor-pointer">
            <Phone className="w-3.5 h-3.5 text-emerald-300" /> {enquiry.phone}
          </a>
        )}
        {enquiry.phone && (
          <a
            href={whatsappLink(enquiry.phone, `Hello ${enquiry.contactPerson}, this is the CASYUM sponsorship team...`)}
            target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-2 px-3 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-[11px] font-bold cursor-pointer"
          >
            <MessageCircle className="w-3.5 h-3.5" /> WhatsApp
          </a>
        )}
        {enquiry.website && (
          <a
            href={enquiry.website.startsWith('http') ? enquiry.website : `https://${enquiry.website}`}
            target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white/70 hover:text-white text-[11px] font-bold cursor-pointer"
          >
            <ArrowUpRight className="w-3.5 h-3.5 text-cyan-300" /> Website
          </a>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className={infoBox}>
          <span className={labelCls}>Contact Person</span>
          <span className="text-xs text-white/80">{enquiry.contactPerson}{enquiry.designation ? ` · ${enquiry.designation}` : ''}</span>
        </div>
        <div className={infoBox}>
          <span className={labelCls}>Category Interest</span>
          <span className="text-xs text-white/80">{enquiry.categoryInterest || '—'}</span>
        </div>
        <div className={infoBox}>
          <span className={labelCls}>Package Interest</span>
          <span className="text-xs text-white/80">{enquiry.packageInterest || '—'}</span>
        </div>
        <div className={infoBox}>
          <span className={labelCls}>Budget</span>
          <span className="text-xs text-white/80">{enquiry.budget || '—'}</span>
        </div>
        <div className={infoBox}>
          <span className={labelCls}>Submitted</span>
          <span className="text-xs text-white/80">{formatDateTime(enquiry.submittedAt)}</span>
        </div>
        <div className={infoBox}>
          <span className={labelCls}>Assigned To</span>
          <span className="text-xs text-white/80">{enquiry.assignedToName || 'Unassigned'}</span>
        </div>
        {enquiry.howDidYouHear && (
          <div className={`${infoBox} sm:col-span-2`}>
            <span className={labelCls}>How did they hear about us</span>
            <span className="text-xs text-white/80">{enquiry.howDidYouHear}</span>
          </div>
        )}
        {enquiry.message && (
          <div className={`${infoBox} sm:col-span-2`}>
            <span className={labelCls}>Message</span>
            <p className="text-xs text-white/80 leading-relaxed">{enquiry.message}</p>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="flex flex-col gap-2 rounded-xl bg-white/[0.03] border border-white/10 p-4">
          <span className={labelCls}>Update Status</span>
          <div className="flex gap-2">
            <select value={statusDraft} onChange={(e) => setStatusDraft(e.target.value as EnquiryStatus)} className={`${inputCls} appearance-none cursor-pointer`}>
              {ENQUIRY_STATUSES.map((s) => (
                <option key={s} value={s} className="bg-zinc-900">{s}</option>
              ))}
            </select>
            <button onClick={() => void handleStatusSave()} disabled={savingStatus} className="px-3 py-2 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold cursor-pointer disabled:opacity-50 flex items-center gap-1.5">
              {savingStatus ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              Save
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-2 rounded-xl bg-white/[0.03] border border-white/10 p-4">
          <span className={labelCls}>Assign To You</span>
          <button
            onClick={() => void handleAssignSelf()}
            disabled={assigning || enquiry.assignedToName === user?.name}
            className="px-3 py-2.5 rounded-xl bg-white/5 border border-white/15 text-white/70 hover:text-white text-xs font-bold cursor-pointer disabled:opacity-50 flex items-center gap-2"
          >
            {assigning ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <UserCheck className="w-3.5 h-3.5" />}
            {enquiry.assignedToName === user?.name ? 'Assigned to you' : 'Take ownership'}
          </button>
        </div>

        <div className="flex flex-col gap-2 rounded-xl bg-white/[0.03] border border-white/10 p-4">
          <span className={labelCls}>Recommend Package</span>
          <div className="flex gap-2">
            <select value={recommendDraft} onChange={(e) => setRecommendDraft(e.target.value)} className={`${inputCls} appearance-none cursor-pointer`}>
              <option value="">Select...</option>
              {packages.filter((p) => p.status === 'Active').map((p) => (
                <option key={p.id} value={p.name} className="bg-zinc-900">{p.name}</option>
              ))}
            </select>
            <button
              onClick={() => void handleRecommend()}
              disabled={savingRecommend || !recommendDraft}
              className="px-3 py-2 rounded-xl bg-white/5 border border-white/15 text-white/70 hover:text-white text-xs font-bold cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
            >
              {savingRecommend ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Package className="w-3.5 h-3.5" />}
              Save
            </button>
          </div>
          {enquiry.recommendedPackage && (
            <span className="text-[10px] text-violet-300">Current: {enquiry.recommendedPackage}</span>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-3 rounded-xl bg-white/[0.03] border border-white/10 p-4">
        <span className={labelCls}>Internal Notes</span>
        <div className="flex flex-col gap-2 max-h-48 overflow-y-auto custom-scrollbar">
          {(enquiry.internalNotes || []).length === 0 ? (
            <p className="text-xs text-white/30">No notes yet.</p>
          ) : (
            (enquiry.internalNotes || []).map((n) => (
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
              type="text" value={noteDraft} onChange={(e) => setNoteDraft(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') void handleAddNote(); }}
              placeholder="Add an internal note..." className={`${inputCls} pl-9`}
            />
          </div>
          <button onClick={() => void handleAddNote()} disabled={addingNote || !noteDraft.trim()} className="px-3 py-2 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold cursor-pointer disabled:opacity-50 flex items-center gap-1.5">
            {addingNote ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
            Add
          </button>
        </div>
      </div>

      {settings?.sponsorshipHead?.email && (
        <p className="text-[10px] text-white/30">
          Public contact shown on the website: {settings.sponsorshipHead.name || 'Sponsorship Head'} · {settings.sponsorshipHead.email}
        </p>
      )}

      {approveOpen && (
        <div className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
          <div className="w-full max-w-2xl max-h-[92vh] overflow-y-auto bg-zinc-950 border border-white/15 rounded-3xl shadow-2xl custom-scrollbar my-auto">
            <div className="sticky top-0 z-10 bg-zinc-950/95 backdrop-blur border-b border-white/10 px-6 py-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-extrabold font-display text-white">Approve Sponsor</h3>
              </div>
              <button onClick={() => setApproveOpen(false)} className="p-2 rounded-lg text-white/50 hover:text-white bg-white/5 hover:bg-white/10 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-6 flex flex-col gap-4">
              <p className="text-xs text-white/50">
                This will create a public sponsor profile for <span className="font-bold text-white">{enquiry.companyName}</span> and mark the enquiry as Approved.
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
                    type="number" value={approveForm.sponsorshipAmount}
                    onChange={(e) => setApproveForm({ ...approveForm, sponsorshipAmount: e.target.value })}
                    placeholder="0" className={inputCls}
                  />
                </div>
                <div className="flex flex-col gap-1.5 sm:col-span-2">
                  <label className={labelCls}>Short Description</label>
                  <textarea
                    value={approveForm.description}
                    onChange={(e) => setApproveForm({ ...approveForm, description: e.target.value })}
                    rows={2} className={`${inputCls} resize-none`}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className={labelCls}>Website URL</label>
                  <input
                    type="url" value={approveForm.websiteUrl}
                    onChange={(e) => setApproveForm({ ...approveForm, websiteUrl: e.target.value })}
                    placeholder="https://..." className={inputCls}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className={labelCls}>Logo URL</label>
                  <input
                    type="url" value={approveForm.logoUrl}
                    onChange={(e) => setApproveForm({ ...approveForm, logoUrl: e.target.value })}
                    placeholder="Logo image URL" className={inputCls}
                  />
                </div>
              </div>
              <label className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/10 cursor-pointer">
                <input
                  type="checkbox" checked={approveForm.displayAmount}
                  onChange={(e) => setApproveForm({ ...approveForm, displayAmount: e.target.checked })}
                  className="w-4 h-4 accent-emerald-500 cursor-pointer"
                />
                <span className="text-xs text-white/70">Display sponsorship amount publicly</span>
              </label>
              <div className="flex items-center justify-end gap-3 mt-1">
                <button type="button" onClick={() => setApproveOpen(false)} className="px-4 py-2.5 rounded-xl text-white/60 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold cursor-pointer">
                  Cancel
                </button>
                <button
                  type="button" onClick={() => void confirmApprove()} disabled={savingApprove || !approveForm.category}
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
    </div>
  );
};

export default EnquiryDetailPage;
