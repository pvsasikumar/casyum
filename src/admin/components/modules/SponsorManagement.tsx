import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Plus,
  Pencil,
  Trash2,
  Eye,
  EyeOff,
  ChevronUp,
  ChevronDown,
  Search,
  Upload,
  FileText,
  Link2,
  X,
  Loader2,
  Tags,
  Package,
  Save,
  RefreshCw,
  Handshake,
  Image as ImageIcon,
  FileDown,
} from 'lucide-react';
import { useAdmin } from '../../context/AdminContext';
import { useRBAC } from '../../../rbac/context/RBACContext';
import { ConfirmationDialog } from '../common/ConfirmationDialog';
import { SponsorShowcase } from '../../../participant/SponsorShowcase';
import { uploadImageToStorage, uploadFileToStorage } from '../../../firebase/storage';
import { isStorageConfigured } from '../../../firebase/firebase';
import {
  listSponsors,
  listSponsorCategories,
  listSponsorPackages,
  createSponsor,
  updateSponsor,
  deleteSponsor,
  reorderSponsors,
  createSponsorCategory,
  updateSponsorCategory,
  deleteSponsorCategory,
  createSponsorPackage,
  updateSponsorPackage,
  deleteSponsorPackage,
  readSponsorshipSettings,
  saveSponsorshipSettings,
} from '../../../services/sponsorshipService';
import type {
  Sponsor,
  SponsorCategory,
  SponsorPackage,
  SponsorStatus,
  SponsorApprovalStatus,
  SponsorLogoSize,
} from '../../../types/sponsorship';

type Tab = 'sponsors' | 'categories' | 'packages' | 'tariff';

interface SponsorFormState {
  id?: string;
  name: string;
  logoUrl: string;
  category: string;
  categoryId: string;
  description: string;
  websiteUrl: string;
  displayOrder: number;
  status: SponsorStatus;
  approvalStatus: SponsorApprovalStatus;
  packageId: string;
  packageName: string;
  logoSize: SponsorLogoSize;
  displayAmount: boolean;
  sponsorshipAmount: string;
}

const EMPTY_SPONSOR_FORM: SponsorFormState = {
  name: '',
  logoUrl: '',
  category: '',
  categoryId: '',
  description: '',
  websiteUrl: '',
  displayOrder: 0,
  status: 'Active',
  approvalStatus: 'Pending',
  packageId: '',
  packageName: '',
  logoSize: 'medium',
  displayAmount: false,
  sponsorshipAmount: '',
};

const inputCls =
  'w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white placeholder-white/30 focus:outline-none focus:border-violet-500/50 transition-all';

const labelCls = 'text-[10px] font-bold uppercase tracking-widest text-white/50';

function formatDate(value: string): string {
  if (!value) return '—';
  try {
    return new Date(value).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch {
    return '—';
  }
}

export const SponsorManagement: React.FC = () => {
  const { addToast, logAction, pushNotification } = useAdmin();
  const rbac = useRBAC();

  const [tab, setTab] = useState<Tab>('sponsors');

  const [sponsors, setSponsors] = useState<Sponsor[]>([]);
  const [categories, setCategories] = useState<SponsorCategory[]>([]);
  const [packages, setPackages] = useState<SponsorPackage[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');

  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState<SponsorFormState>(EMPTY_SPONSOR_FORM);
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<{ type: 'sponsor' | 'category' | 'package'; id: string; name: string } | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [previewOpen, setPreviewOpen] = useState(false);

  const [categoryForm, setCategoryForm] = useState<{ id?: string; name: string; displayOrder: number; status: SponsorStatus }>({
    name: '',
    displayOrder: 0,
    status: 'Active',
  });
  const [categoryFormOpen, setCategoryFormOpen] = useState(false);
  const [savingCategory, setSavingCategory] = useState(false);

  const [packageForm, setPackageForm] = useState<{
    id?: string;
    name: string;
    category: string;
    minBudget: string;
    displayPriority: number;
    logoSize: SponsorLogoSize;
    displayLocations: string;
    benefits: string;
    description: string;
    status: SponsorStatus;
  }>({
    name: '',
    category: '',
    minBudget: '',
    displayPriority: 0,
    logoSize: 'medium',
    displayLocations: '',
    benefits: '',
    description: '',
    status: 'Active',
  });
  const [packageFormOpen, setPackageFormOpen] = useState(false);
  const [savingPackage, setSavingPackage] = useState(false);

  const [tariffPdfUrl, setTariffPdfUrl] = useState('');
  const [tariffEnabled, setTariffEnabled] = useState(false);
  const [tariffFileName, setTariffFileName] = useState('');
  const [uploadingTariff, setUploadingTariff] = useState(false);
  const [savingTariff, setSavingTariff] = useState(false);

  const loadAll = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [sponsorRows, categoryRows, packageRows, settingsRows] = await Promise.all([
        listSponsors(),
        listSponsorCategories(),
        listSponsorPackages(),
        readSponsorshipSettings(),
      ]);
      setSponsors(sponsorRows);
      setCategories(categoryRows);
      setPackages(packageRows);
      setTariffPdfUrl(settingsRows.tariff.pdfUrl || '');
      setTariffEnabled(settingsRows.tariff.enabled);
      setTariffFileName(settingsRows.tariff.fileName || '');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load sponsor data.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const storageConfigured = isStorageConfigured;

  const refresh = useCallback(async () => {
    try {
      const [sponsorRows, categoryRows, packageRows] = await Promise.all([
        listSponsors(),
        listSponsorCategories(),
        listSponsorPackages(),
      ]);
      setSponsors(sponsorRows);
      setCategories(categoryRows);
      setPackages(packageRows);
    } catch {
      // Keep existing data on refresh failure.
    }
  }, []);

  const filteredSponsors = useMemo(() => {
    return sponsors.filter((s) => {
      if (categoryFilter !== 'All' && s.category !== categoryFilter) return false;
      if (search && !s.name.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [sponsors, search, categoryFilter]);

  /* ----------------------- Sponsor CRUD ----------------------- */

  const openAddSponsor = () => {
    setForm({
      ...EMPTY_SPONSOR_FORM,
      displayOrder: sponsors.length > 0 ? Math.max(...sponsors.map((s) => s.displayOrder)) + 1 : 1,
      status: 'Active',
      approvalStatus: 'Approved',
    });
    setFormOpen(true);
  };

  const openEditSponsor = (s: Sponsor) => {
    setForm({
      id: s.id,
      name: s.name,
      logoUrl: s.logoUrl,
      category: s.category,
      categoryId: s.categoryId || '',
      description: s.description,
      websiteUrl: s.websiteUrl,
      displayOrder: s.displayOrder,
      status: s.status,
      approvalStatus: s.approvalStatus,
      packageId: s.packageId || '',
      packageName: s.packageName || '',
      logoSize: s.logoSize || 'medium',
      displayAmount: s.displayAmount,
      sponsorshipAmount: s.sponsorshipAmount !== undefined ? String(s.sponsorshipAmount) : '',
    });
    setFormOpen(true);
  };

  const handleLogoUpload = async (file: File) => {
    if (!storageConfigured) {
      addToast('Storage unavailable', 'Enter a logo URL instead — Firebase Storage is not configured.', 'warning');
      return;
    }
    setUploadingLogo(true);
    try {
      const url = await uploadImageToStorage('sponsors', file);
      setForm((prev) => ({ ...prev, logoUrl: url }));
      addToast('Logo uploaded', 'Sponsor logo uploaded successfully.', 'success');
    } catch (err) {
      addToast('Upload failed', err instanceof Error ? err.message : 'Could not upload the logo.', 'error');
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleSponsorSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      addToast('Name required', 'Please enter a sponsor name.', 'error');
      return;
    }
    setSaving(true);
    const payload = {
      name: form.name,
      logoUrl: form.logoUrl,
      category: form.category,
      categoryId: form.categoryId,
      description: form.description,
      websiteUrl: form.websiteUrl,
      displayOrder: Number(form.displayOrder || 0),
      status: form.status,
      approvalStatus: form.approvalStatus,
      packageId: form.packageId,
      packageName: form.packageName,
      logoSize: form.logoSize,
      displayAmount: form.displayAmount,
      sponsorshipAmount: form.sponsorshipAmount !== '' ? Number(form.sponsorshipAmount) : 0,
    };
    try {
      if (form.id) {
        await updateSponsor(form.id, payload as Partial<Sponsor>);
        logAction('Sponsor Updated', `Updated sponsor ${form.name}`);
        pushNotification('Sponsor Updated', `${form.name} has been updated.`, 'success');
      } else {
        await createSponsor(payload, { approved: form.approvalStatus === 'Approved' });
        logAction('Sponsor Added', `Added sponsor ${form.name}`);
        pushNotification('Sponsor Added', `${form.name} has been added.`, 'success');
      }
      setFormOpen(false);
      setForm(EMPTY_SPONSOR_FORM);
      await refresh();
    } catch (err) {
      addToast('Save failed', err instanceof Error ? err.message : 'Could not save the sponsor.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const toggleSponsorStatus = async (s: Sponsor) => {
    const next: SponsorStatus = s.status === 'Active' ? 'Inactive' : 'Active';
    try {
      await updateSponsor(s.id, { status: next });
      setSponsors((prev) => prev.map((x) => (x.id === s.id ? { ...x, status: next } : x)));
      logAction('Sponsor Status Changed', `Set ${s.name} to ${next}`);
      pushNotification(next === 'Active' ? 'Sponsor Enabled' : 'Sponsor Disabled', `${s.name} is now ${next}.`, next === 'Active' ? 'success' : 'warning');
    } catch (err) {
      addToast('Update failed', err instanceof Error ? err.message : 'Could not change status.', 'error');
    }
  };

  const confirmDeleteSponsor = () => {
    if (!deleteTarget) return;
    setDeleting(true);
    deleteSponsor(deleteTarget.id)
      .then(() => {
        setSponsors((prev) => prev.filter((x) => x.id !== deleteTarget.id));
        logAction('Sponsor Deleted', `Deleted sponsor ${deleteTarget.name}`);
        pushNotification('Sponsor Removed', `${deleteTarget.name} has been removed.`, 'warning');
      })
      .catch((err) => addToast('Delete failed', err instanceof Error ? err.message : 'Could not delete.', 'error'))
      .finally(() => {
        setDeleting(false);
        setDeleteTarget(null);
      });
  };

  const moveSponsor = async (index: number, dir: -1 | 1) => {
    const row = filteredSponsors[index];
    const target = filteredSponsors[index + dir];
    if (!row || !target) return;
    try {
      await reorderSponsors(row.id, row.displayOrder, target.id, target.displayOrder);
      await refresh();
    } catch (err) {
      addToast('Reorder failed', err instanceof Error ? err.message : 'Could not reorder sponsors.', 'error');
    }
  };

  /* ----------------------- Category CRUD ----------------------- */

  const handleCategorySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!categoryForm.name.trim()) {
      addToast('Name required', 'Please enter a category name.', 'error');
      return;
    }
    setSavingCategory(true);
    try {
      if (categoryForm.id) {
        await updateSponsorCategory(categoryForm.id, {
          name: categoryForm.name,
          displayOrder: Number(categoryForm.displayOrder || 0),
          status: categoryForm.status,
        });
        logAction('Sponsor Category Updated', `Updated category ${categoryForm.name}`);
      } else {
        await createSponsorCategory({
          name: categoryForm.name,
          displayOrder: Number(categoryForm.displayOrder || 0),
          status: categoryForm.status,
        });
        logAction('Sponsor Category Added', `Added category ${categoryForm.name}`);
      }
      setCategoryFormOpen(false);
      setCategoryForm({ name: '', displayOrder: 0, status: 'Active' });
      await refresh();
    } catch (err) {
      addToast('Save failed', err instanceof Error ? err.message : 'Could not save the category.', 'error');
    } finally {
      setSavingCategory(false);
    }
  };

  const moveCategory = async (index: number, dir: -1 | 1) => {
    const row = categories[index];
    const target = categories[index + dir];
    if (!row || !target) return;
    try {
      await updateSponsorCategory(row.id, { displayOrder: target.displayOrder });
      await updateSponsorCategory(target.id, { displayOrder: row.displayOrder });
      await refresh();
    } catch {
      addToast('Reorder failed', 'Could not reorder categories.', 'error');
    }
  };

  const confirmDeleteCategory = () => {
    if (!deleteTarget) return;
    setDeleting(true);
    deleteSponsorCategory(deleteTarget.id)
      .then(() => {
        setCategories((prev) => prev.filter((x) => x.id !== deleteTarget.id));
        logAction('Sponsor Category Deleted', `Deleted category ${deleteTarget.name}`);
        pushNotification('Category Removed', `${deleteTarget.name} has been removed.`, 'warning');
      })
      .catch((err) => addToast('Delete failed', err instanceof Error ? err.message : 'Could not delete.', 'error'))
      .finally(() => {
        setDeleting(false);
        setDeleteTarget(null);
      });
  };

  /* ----------------------- Package CRUD ----------------------- */

  const handlePackageSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!packageForm.name.trim()) {
      addToast('Name required', 'Please enter a package name.', 'error');
      return;
    }
    setSavingPackage(true);
    const payload = {
      name: packageForm.name,
      category: packageForm.category || packageForm.name,
      minBudget: packageForm.minBudget !== '' ? Number(packageForm.minBudget) : 0,
      displayPriority: Number(packageForm.displayPriority || 0),
      logoSize: packageForm.logoSize,
      displayLocations: packageForm.displayLocations
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
      benefits: packageForm.benefits
        .split('\n')
        .map((s) => s.trim())
        .filter(Boolean),
      description: packageForm.description,
      status: packageForm.status,
    };
    try {
      if (packageForm.id) {
        await updateSponsorPackage(packageForm.id, payload);
        logAction('Sponsor Package Updated', `Updated package ${packageForm.name}`);
      } else {
        await createSponsorPackage(payload);
        logAction('Sponsor Package Added', `Added package ${packageForm.name}`);
      }
      setPackageFormOpen(false);
      setPackageForm({ name: '', category: '', minBudget: '', displayPriority: 0, logoSize: 'medium', displayLocations: '', benefits: '', description: '', status: 'Active' });
      await refresh();
    } catch (err) {
      addToast('Save failed', err instanceof Error ? err.message : 'Could not save the package.', 'error');
    } finally {
      setSavingPackage(false);
    }
  };

  const togglePackageStatus = async (p: SponsorPackage) => {
    const next: SponsorStatus = p.status === 'Active' ? 'Inactive' : 'Active';
    try {
      await updateSponsorPackage(p.id, { status: next });
      setPackages((prev) => prev.map((x) => (x.id === p.id ? { ...x, status: next } : x)));
    } catch (err) {
      addToast('Update failed', err instanceof Error ? err.message : 'Could not change status.', 'error');
    }
  };

  const confirmDeletePackage = () => {
    if (!deleteTarget) return;
    setDeleting(true);
    deleteSponsorPackage(deleteTarget.id)
      .then(() => {
        setPackages((prev) => prev.filter((x) => x.id !== deleteTarget.id));
        logAction('Sponsor Package Deleted', `Deleted package ${deleteTarget.name}`);
      })
      .catch((err) => addToast('Delete failed', err instanceof Error ? err.message : 'Could not delete.', 'error'))
      .finally(() => {
        setDeleting(false);
        setDeleteTarget(null);
      });
  };

  /* ----------------------- Tariff ----------------------- */

  const handleTariffUpload = async (file: File) => {
    if (!storageConfigured) {
      addToast('Storage unavailable', 'Firebase Storage is not configured. Paste a PDF URL instead.', 'warning');
      return;
    }
    setUploadingTariff(true);
    try {
      const path = `sponsorship/tariff/casyum-sponsorship-tariff-${Date.now()}.pdf`;
      const url = await uploadFileToStorage(path, file, { contentType: file.type || 'application/pdf' });
      setTariffPdfUrl(url);
      setTariffFileName(file.name);
      addToast('Tariff uploaded', 'Tariff PDF uploaded successfully.', 'success');
    } catch (err) {
      addToast('Upload failed', err instanceof Error ? err.message : 'Could not upload the PDF.', 'error');
    } finally {
      setUploadingTariff(false);
    }
  };

  const handleTariffSave = async () => {
    setSavingTariff(true);
    try {
      await saveSponsorshipSettings({
        tariff: {
          pdfUrl: tariffPdfUrl,
          fileName: tariffFileName,
          enabled: tariffEnabled,
          updatedAt: new Date().toISOString(),
          updatedBy: rbac.user?.name || 'Admin',
        },
        updatedAt: new Date().toISOString(),
        updatedBy: rbac.user?.name || 'Admin',
      });
      logAction('Sponsorship Tariff Updated', 'Updated the sponsorship tariff.');
      pushNotification('Tariff Saved', 'Sponsorship tariff updated successfully.', 'success');
    } catch (err) {
      addToast('Save failed', err instanceof Error ? err.message : 'Could not save the tariff.', 'error');
    } finally {
      setSavingTariff(false);
    }
  };

  /* ----------------------- UI ----------------------- */

  const tabs: { key: Tab; label: string; icon: React.ElementType }[] = [
    { key: 'sponsors', label: 'Sponsors', icon: Handshake },
    { key: 'categories', label: 'Categories', icon: Tags },
    { key: 'packages', label: 'Packages', icon: Package },
    { key: 'tariff', label: 'Tariff', icon: FileText },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="flex items-center gap-3 text-white/50 text-sm">
          <Loader2 className="w-5 h-5 animate-spin text-violet-400" />
          <span>Loading sponsors...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 select-none pb-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-col">
          <span className="text-xs font-bold text-violet-400 uppercase tracking-widest">Partnerships</span>
          <h2 className="text-xl sm:text-2xl font-extrabold font-display text-white">Sponsor Management</h2>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setPreviewOpen(true)}
            className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/15 text-white/80 text-xs font-bold transition-all cursor-pointer flex items-center gap-2"
          >
            <Eye className="w-3.5 h-3.5" />
            Preview Showcase
          </button>
          {tab === 'sponsors' && (
            <button
              onClick={openAddSponsor}
              className="px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold transition-all shadow-lg shadow-violet-500/25 cursor-pointer flex items-center gap-2"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Sponsor
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-rose-500/10 border border-rose-500/25 text-rose-300 text-xs">
          <span>{error}</span>
          <button onClick={loadAll} className="ml-auto flex items-center gap-1.5 font-bold hover:text-white cursor-pointer">
            <RefreshCw className="w-3 h-3" /> Retry
          </button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-1 bg-white/5 p-1 rounded-xl border border-white/10 w-max max-w-full overflow-x-auto">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
              tab === t.key ? 'bg-violet-600 text-white' : 'text-white/60 hover:text-white'
            }`}
          >
            <t.icon className="w-3.5 h-3.5" />
            {t.label}
          </button>
        ))}
      </div>

      {/* ----------------------- SPONSORS ----------------------- */}
      {tab === 'sponsors' && (
        <div className="flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/30" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search sponsors..."
                className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-4 py-2.5 text-xs text-white placeholder-white/30 focus:outline-none focus:border-violet-500/50"
              />
            </div>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-violet-500/50 appearance-none cursor-pointer"
            >
              <option value="All">All Categories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.name} className="bg-zinc-900">{c.name}</option>
              ))}
            </select>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.02] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-white/5 border-b border-white/10">
                  <tr className="text-[10px] uppercase tracking-widest text-white/40">
                    <th className="px-4 py-3 font-bold w-10"></th>
                    <th className="px-4 py-3 font-bold">Logo</th>
                    <th className="px-4 py-3 font-bold">Sponsor Name</th>
                    <th className="px-4 py-3 font-bold">Category</th>
                    <th className="px-4 py-3 font-bold">Status</th>
                    <th className="px-4 py-3 font-bold">Order</th>
                    <th className="px-4 py-3 font-bold">Created</th>
                    <th className="px-4 py-3 font-bold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {filteredSponsors.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-4 py-10 text-center text-white/30 text-sm">
                        No sponsors found.
                      </td>
                    </tr>
                  ) : (
                    filteredSponsors.map((s, idx) => (
                      <tr key={s.id} className="hover:bg-white/[0.03] transition-colors">
                        <td className="px-2 py-3">
                          <div className="flex flex-col gap-0.5">
                            <button
                              onClick={() => moveSponsor(idx, -1)}
                              disabled={idx === 0}
                              className="p-0.5 rounded text-white/30 hover:text-white disabled:opacity-20 cursor-pointer"
                              aria-label="Move up"
                            >
                              <ChevronUp className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => moveSponsor(idx, 1)}
                              disabled={idx === filteredSponsors.length - 1}
                              className="p-0.5 rounded text-white/30 hover:text-white disabled:opacity-20 cursor-pointer"
                              aria-label="Move down"
                            >
                              <ChevronDown className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          {s.logoUrl ? (
                            <img
                              src={s.logoUrl}
                              alt={`${s.name} logo`}
                              className="w-10 h-10 rounded-lg object-contain bg-white/5 border border-white/10 p-1"
                              referrerPolicy="no-referrer"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-white/20">
                              <ImageIcon className="w-4 h-4" />
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3 font-semibold text-white/90 max-w-[200px] truncate">{s.name}</td>
                        <td className="px-4 py-3 text-white/60">{s.category || '—'}</td>
                        <td className="px-4 py-3">
                          <span className="flex flex-wrap gap-1">
                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-widest border ${
                              s.status === 'Active' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' : 'bg-white/5 border-white/10 text-white/40'
                            }`}>
                              {s.status}
                            </span>
                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-widest border ${
                              s.approvalStatus === 'Approved' ? 'bg-violet-500/10 border-violet-500/30 text-violet-300' : 'bg-amber-500/10 border-amber-500/30 text-amber-300'
                            }`}>
                              {s.approvalStatus}
                            </span>
                          </span>
                        </td>
                        <td className="px-4 py-3 text-white/50">{s.displayOrder}</td>
                        <td className="px-4 py-3 text-white/40">{formatDate(s.createdAt)}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => openEditSponsor(s)}
                              className="p-1.5 rounded-lg bg-white/5 border border-white/10 text-white/60 hover:text-white hover:bg-white/10 cursor-pointer"
                              aria-label={`Edit ${s.name}`}
                              title="Edit"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => toggleSponsorStatus(s)}
                              className={`p-1.5 rounded-lg border cursor-pointer ${
                                s.status === 'Active'
                                  ? 'bg-white/5 border-white/10 text-amber-300 hover:bg-amber-500/10'
                                  : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/20'
                              }`}
                              aria-label={s.status === 'Active' ? 'Disable' : 'Enable'}
                              title={s.status === 'Active' ? 'Disable' : 'Enable'}
                            >
                              {s.status === 'Active' ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                            </button>
                            <button
                              onClick={() => setDeleteTarget({ type: 'sponsor', id: s.id, name: s.name })}
                              className="p-1.5 rounded-lg bg-white/5 border border-white/10 text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 cursor-pointer"
                              aria-label={`Delete ${s.name}`}
                              title="Delete"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ----------------------- CATEGORIES ----------------------- */}
      {tab === 'categories' && (
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs text-white/40">
              Categories group sponsors on the showcase. They are shown in the order below.
            </p>
            <button
              onClick={() => {
                setCategoryForm({ name: '', displayOrder: categories.length > 0 ? Math.max(...categories.map((c) => c.displayOrder)) + 1 : 1, status: 'Active' });
                setCategoryFormOpen(true);
              }}
              className="px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold transition-all cursor-pointer flex items-center gap-2"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Category
            </button>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.02] overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-white/5 border-b border-white/10">
                <tr className="text-[10px] uppercase tracking-widest text-white/40">
                  <th className="px-4 py-3 font-bold w-10"></th>
                  <th className="px-4 py-3 font-bold">Category Name</th>
                  <th className="px-4 py-3 font-bold">Display Order</th>
                  <th className="px-4 py-3 font-bold">Status</th>
                  <th className="px-4 py-3 font-bold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {categories.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-10 text-center text-white/30 text-sm">
                      No categories yet. Add your first sponsor category.
                    </td>
                  </tr>
                ) : (
                  categories.map((c, idx) => (
                    <tr key={c.id} className="hover:bg-white/[0.03]">
                      <td className="px-2 py-3">
                        <div className="flex flex-col gap-0.5">
                          <button onClick={() => moveCategory(idx, -1)} disabled={idx === 0} className="p-0.5 rounded text-white/30 hover:text-white disabled:opacity-20 cursor-pointer">
                            <ChevronUp className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => moveCategory(idx, 1)} disabled={idx === categories.length - 1} className="p-0.5 rounded text-white/30 hover:text-white disabled:opacity-20 cursor-pointer">
                            <ChevronDown className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                      <td className="px-4 py-3 font-semibold text-white/90">{c.name}</td>
                      <td className="px-4 py-3 text-white/50">{c.displayOrder}</td>
                      <td className="px-4 py-3">
                        <button
                          onClick={async () => {
                            const next: SponsorStatus = c.status === 'Active' ? 'Inactive' : 'Active';
                            try {
                              await updateSponsorCategory(c.id, { status: next });
                              setCategories((prev) => prev.map((x) => (x.id === c.id ? { ...x, status: next } : x)));
                            } catch {
                              addToast('Update failed', 'Could not change status.', 'error');
                            }
                          }}
                          className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-widest border cursor-pointer ${
                            c.status === 'Active' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' : 'bg-white/5 border-white/10 text-white/40'
                          }`}
                        >
                          {c.status}
                        </button>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => {
                              setCategoryForm({ id: c.id, name: c.name, displayOrder: c.displayOrder, status: c.status });
                              setCategoryFormOpen(true);
                            }}
                            className="p-1.5 rounded-lg bg-white/5 border border-white/10 text-white/60 hover:text-white hover:bg-white/10 cursor-pointer"
                            title="Edit"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setDeleteTarget({ type: 'category', id: c.id, name: c.name })}
                            className="p-1.5 rounded-lg bg-white/5 border border-white/10 text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 cursor-pointer"
                            title="Delete"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ----------------------- PACKAGES ----------------------- */}
      {tab === 'packages' && (
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs text-white/40">
              Packages define display level, logo size and benefits. Only packages with status Active are selectable.
            </p>
            <button
              onClick={() => {
                setPackageForm({ name: '', category: '', minBudget: '', displayPriority: 0, logoSize: 'medium', displayLocations: '', benefits: '', description: '', status: 'Active' });
                setPackageFormOpen(true);
              }}
              className="px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold transition-all cursor-pointer flex items-center gap-2"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Package
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {packages.length === 0 ? (
              <div className="col-span-full rounded-2xl border border-white/10 bg-white/[0.03] p-10 text-center text-white/30 text-sm">
                No packages yet. Add sponsorship packages to structure the tariff.
              </div>
            ) : (
              packages.map((p) => (
                <div key={p.id} className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 flex flex-col gap-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex flex-col gap-1 min-w-0">
                      <h3 className="text-sm font-extrabold font-display text-white truncate">{p.name}</h3>
                      <span className="text-[10px] text-white/40 uppercase tracking-widest">
                        {p.category} · Priority {p.displayPriority}
                      </span>
                    </div>
                    <button
                      onClick={() => togglePackageStatus(p)}
                      className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-widest border cursor-pointer ${
                        p.status === 'Active' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' : 'bg-white/5 border-white/10 text-white/40'
                      }`}
                    >
                      {p.status}
                    </button>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-white/50">
                    <span>Min budget</span>
                    <span className="font-bold text-emerald-300">₹{Number(p.minBudget || 0).toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-white/50">
                    <span>Logo size</span>
                    <span className="font-bold text-violet-300 capitalize">{p.logoSize}</span>
                  </div>
                  {p.benefits.length > 0 && (
                    <div className="flex flex-col gap-1">
                      <span className="text-[9px] uppercase tracking-widest text-white/30 font-bold">Benefits</span>
                      <ul className="flex flex-col gap-0.5 pl-4 list-disc text-[11px] text-white/60">
                        {p.benefits.slice(0, 3).map((b, i) => (
                          <li key={i} className="truncate">{b}</li>
                        ))}
                        {p.benefits.length > 3 && <li className="text-white/40">+{p.benefits.length - 3} more</li>}
                      </ul>
                    </div>
                  )}
                  <div className="flex items-center gap-1.5 mt-auto">
                    <button
                      onClick={() => {
                        setPackageForm({
                          id: p.id,
                          name: p.name,
                          category: p.category,
                          minBudget: String(p.minBudget || ''),
                          displayPriority: p.displayPriority,
                          logoSize: p.logoSize,
                          displayLocations: p.displayLocations.join(', '),
                          benefits: p.benefits.join('\n'),
                          description: p.description,
                          status: p.status,
                        });
                        setPackageFormOpen(true);
                      }}
                      className="flex-1 p-2 rounded-lg bg-white/5 border border-white/10 text-white/60 hover:text-white hover:bg-white/10 text-[10px] font-bold uppercase tracking-widest cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <Pencil className="w-3 h-3" /> Edit
                    </button>
                    <button
                      onClick={() => setDeleteTarget({ type: 'package', id: p.id, name: p.name })}
                      className="p-2 rounded-lg bg-white/5 border border-white/10 text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 cursor-pointer"
                      title="Delete"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ----------------------- TARIFF ----------------------- */}
      {tab === 'tariff' && (
        <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6 flex flex-col gap-5 max-w-2xl">
          <div className="flex flex-col gap-1">
            <h3 className="text-sm font-extrabold font-display text-white flex items-center gap-2">
              <FileText className="w-4 h-4 text-violet-400" />
              Sponsorship Tariff
            </h3>
            <p className="text-xs text-white/40">
              The "View Sponsorship Packages" button on the public website opens the active tariff PDF.
            </p>
          </div>

          <div className="flex flex-col gap-2">
            <label className={labelCls}>Tariff PDF URL</label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/30" />
                <input
                  type="url"
                  value={tariffPdfUrl}
                  onChange={(e) => setTariffPdfUrl(e.target.value)}
                  placeholder="https://.../casyum-sponsorship-tariff.pdf"
                  className={`${inputCls} pl-9`}
                />
              </div>
              {storageConfigured && (
                <label className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/5 border border-white/15 text-white/70 hover:text-white hover:bg-white/10 text-xs font-bold cursor-pointer transition-all">
                  {uploadingTariff ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                  <span>{uploadingTariff ? 'Uploading...' : 'Upload PDF'}</span>
                  <input
                    type="file"
                    accept="application/pdf,.pdf"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) void handleTariffUpload(file);
                      e.target.value = '';
                    }}
                  />
                </label>
              )}
            </div>
            {tariffFileName && <span className="text-[10px] text-white/30">{tariffFileName}</span>}
          </div>

          <label className="flex items-center justify-between gap-3 p-4 rounded-xl bg-white/5 border border-white/10 cursor-pointer">
            <div className="flex flex-col gap-0.5">
              <span className="text-xs font-bold text-white">Active Tariff</span>
              <span className="text-[10px] text-white/40">
                When enabled, the tariff PDF is shown publicly on the website.
              </span>
            </div>
            <button
              type="button"
              onClick={() => setTariffEnabled((v) => !v)}
              className={`relative w-11 h-6 rounded-full transition-colors cursor-pointer ${tariffEnabled ? 'bg-violet-600' : 'bg-white/10'}`}
              aria-label="Toggle tariff"
            >
              <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all ${tariffEnabled ? 'left-[22px]' : 'left-0.5'}`} />
            </button>
          </label>

          <div className="flex items-center gap-3">
            <button
              onClick={handleTariffSave}
              disabled={savingTariff || !tariffPdfUrl}
              className="px-5 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold transition-all shadow-lg shadow-violet-500/25 cursor-pointer disabled:opacity-50 flex items-center gap-2"
            >
              {savingTariff ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              Save Tariff
            </button>
            {tariffPdfUrl && (
              <a
                href={tariffPdfUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/15 text-white/70 hover:text-white text-xs font-bold transition-all cursor-pointer flex items-center gap-2"
              >
                <FileDown className="w-3.5 h-3.5" />
                Preview Tariff
              </a>
            )}
          </div>
        </div>
      )}

      {/* ----------------------- Modals ----------------------- */}

      {/* Sponsor form */}
      {formOpen && (
        <div className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
          <div className="w-full max-w-2xl max-h-[92vh] overflow-y-auto bg-zinc-950 border border-white/15 rounded-3xl shadow-2xl custom-scrollbar my-auto">
            <div className="sticky top-0 z-10 bg-zinc-950/95 backdrop-blur border-b border-white/10 px-6 py-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-violet-500/15 border border-violet-500/30 text-violet-300">
                  <Handshake className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-extrabold font-display text-white">
                  {form.id ? 'Edit Sponsor' : 'Add Sponsor'}
                </h3>
              </div>
              <button onClick={() => setFormOpen(false)} className="p-2 rounded-lg text-white/50 hover:text-white bg-white/5 hover:bg-white/10 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSponsorSubmit} className="p-6 flex flex-col gap-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className={labelCls}>Sponsor Name *</label>
                  <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Company name" className={inputCls} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className={labelCls}>Category *</label>
                  <select
                    value={form.category}
                    onChange={(e) => {
                      const cat = categories.find((c) => c.name === e.target.value);
                      setForm({ ...form, category: e.target.value, categoryId: cat?.id || '' });
                    }}
                    className={`${inputCls} appearance-none cursor-pointer`}
                  >
                    <option value="">Select category...</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.name} className="bg-zinc-900">{c.name}</option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-col gap-1.5 sm:col-span-2">
                  <label className={labelCls}>Sponsor Logo</label>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <div className="relative flex-1">
                      <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/30" />
                      <input
                        type="url"
                        value={form.logoUrl}
                        onChange={(e) => setForm({ ...form, logoUrl: e.target.value })}
                        placeholder="Logo image URL"
                        className={`${inputCls} pl-9`}
                      />
                    </div>
                    {storageConfigured && (
                      <label className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white/5 border border-white/15 text-white/70 hover:text-white hover:bg-white/10 text-xs font-bold cursor-pointer transition-all">
                        {uploadingLogo ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                        <span>{uploadingLogo ? 'Uploading...' : 'Upload Logo'}</span>
                        <input
                          type="file"
                          accept="image/png,image/jpeg,image/webp"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) void handleLogoUpload(file);
                            e.target.value = '';
                          }}
                        />
                      </label>
                    )}
                  </div>
                  {form.logoUrl && (
                    <div className="flex items-center gap-3">
                      <img src={form.logoUrl} alt="Logo preview" className="w-12 h-12 rounded-lg object-contain bg-white/5 border border-white/10 p-1" referrerPolicy="no-referrer" />
                      <span className="text-[10px] text-white/30">Logo preview</span>
                    </div>
                  )}
                </div>
                <div className="flex flex-col gap-1.5 sm:col-span-2">
                  <label className={labelCls}>Short Description</label>
                  <textarea
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    placeholder="One line about the sponsor..."
                    rows={2}
                    className={`${inputCls} resize-none`}
                  />
                </div>
                <div className="flex flex-col gap-1.5 sm:col-span-2">
                  <label className={labelCls}>Website URL (Optional)</label>
                  <input type="url" value={form.websiteUrl} onChange={(e) => setForm({ ...form, websiteUrl: e.target.value })} placeholder="https://..." className={inputCls} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className={labelCls}>Display Order</label>
                  <input type="number" value={form.displayOrder} onChange={(e) => setForm({ ...form, displayOrder: Number(e.target.value || 0) })} className={inputCls} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className={labelCls}>Status</label>
                  <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as SponsorStatus })} className={`${inputCls} appearance-none cursor-pointer`}>
                    <option value="Active" className="bg-zinc-900">Active</option>
                    <option value="Inactive" className="bg-zinc-900">Inactive</option>
                  </select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className={labelCls}>Approval Status</label>
                  <select value={form.approvalStatus} onChange={(e) => setForm({ ...form, approvalStatus: e.target.value as SponsorApprovalStatus })} className={`${inputCls} appearance-none cursor-pointer`}>
                    <option value="Approved" className="bg-zinc-900">Approved</option>
                    <option value="Pending" className="bg-zinc-900">Pending</option>
                    <option value="Under Review" className="bg-zinc-900">Under Review</option>
                    <option value="Rejected" className="bg-zinc-900">Rejected</option>
                  </select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className={labelCls}>Package</label>
                  <select
                    value={form.packageId}
                    onChange={(e) => {
                      const pkg = packages.find((p) => p.id === e.target.value);
                      setForm({ ...form, packageId: e.target.value, packageName: pkg?.name || '' });
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
                  <label className={labelCls}>Logo Size</label>
                  <select value={form.logoSize} onChange={(e) => setForm({ ...form, logoSize: e.target.value as SponsorLogoSize })} className={`${inputCls} appearance-none cursor-pointer`}>
                    <option value="small" className="bg-zinc-900">Small</option>
                    <option value="medium" className="bg-zinc-900">Medium</option>
                    <option value="large" className="bg-zinc-900">Large</option>
                  </select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className={labelCls}>Sponsorship Amount (₹, Optional)</label>
                  <input
                    type="number"
                    value={form.sponsorshipAmount}
                    onChange={(e) => setForm({ ...form, sponsorshipAmount: e.target.value })}
                    placeholder="0"
                    className={inputCls}
                  />
                </div>
              </div>

              <label className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/10 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.displayAmount}
                  onChange={(e) => setForm({ ...form, displayAmount: e.target.checked })}
                  className="w-4 h-4 accent-violet-500 cursor-pointer"
                />
                <span className="text-xs text-white/70">Display sponsorship amount publicly</span>
              </label>

              <div className="flex items-center justify-end gap-3 mt-2">
                <button type="button" onClick={() => setFormOpen(false)} className="px-4 py-2.5 rounded-xl text-white/60 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold cursor-pointer">
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold transition-all cursor-pointer disabled:opacity-50 flex items-center gap-2"
                >
                  {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                  {form.id ? 'Save Changes' : 'Add Sponsor'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Category form */}
      {categoryFormOpen && (
        <div className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-zinc-950 border border-white/15 rounded-3xl p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-extrabold font-display text-white">
                {categoryForm.id ? 'Edit Category' : 'Add Category'}
              </h3>
              <button onClick={() => setCategoryFormOpen(false)} className="p-2 rounded-lg text-white/50 hover:text-white bg-white/5 hover:bg-white/10 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleCategorySubmit} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className={labelCls}>Category Name *</label>
                <input type="text" value={categoryForm.name} onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })} placeholder="e.g. Title Sponsor" className={inputCls} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className={labelCls}>Display Order</label>
                  <input type="number" value={categoryForm.displayOrder} onChange={(e) => setCategoryForm({ ...categoryForm, displayOrder: Number(e.target.value || 0) })} className={inputCls} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className={labelCls}>Status</label>
                  <select value={categoryForm.status} onChange={(e) => setCategoryForm({ ...categoryForm, status: e.target.value as SponsorStatus })} className={`${inputCls} appearance-none cursor-pointer`}>
                    <option value="Active" className="bg-zinc-900">Active</option>
                    <option value="Inactive" className="bg-zinc-900">Inactive</option>
                  </select>
                </div>
              </div>
              <div className="flex items-center justify-end gap-3 mt-1">
                <button type="button" onClick={() => setCategoryFormOpen(false)} className="px-4 py-2 rounded-xl text-white/60 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold cursor-pointer">
                  Cancel
                </button>
                <button type="submit" disabled={savingCategory} className="px-5 py-2 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold cursor-pointer disabled:opacity-50 flex items-center gap-2">
                  {savingCategory ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Package form */}
      {packageFormOpen && (
        <div className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
          <div className="w-full max-w-2xl max-h-[92vh] overflow-y-auto bg-zinc-950 border border-white/15 rounded-3xl shadow-2xl custom-scrollbar my-auto">
            <div className="sticky top-0 z-10 bg-zinc-950/95 backdrop-blur border-b border-white/10 px-6 py-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-violet-500/15 border border-violet-500/30 text-violet-300">
                  <Package className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-extrabold font-display text-white">
                  {packageForm.id ? 'Edit Package' : 'Add Package'}
                </h3>
              </div>
              <button onClick={() => setPackageFormOpen(false)} className="p-2 rounded-lg text-white/50 hover:text-white bg-white/5 hover:bg-white/10 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handlePackageSubmit} className="p-6 flex flex-col gap-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className={labelCls}>Package Name *</label>
                  <input type="text" value={packageForm.name} onChange={(e) => setPackageForm({ ...packageForm, name: e.target.value })} placeholder="e.g. Gold Sponsor" className={inputCls} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className={labelCls}>Category</label>
                  <input type="text" value={packageForm.category} onChange={(e) => setPackageForm({ ...packageForm, category: e.target.value })} placeholder="Linked sponsor category" className={inputCls} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className={labelCls}>Minimum Budget (₹)</label>
                  <input type="number" value={packageForm.minBudget} onChange={(e) => setPackageForm({ ...packageForm, minBudget: e.target.value })} placeholder="50000" className={inputCls} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className={labelCls}>Display Priority</label>
                  <input type="number" value={packageForm.displayPriority} onChange={(e) => setPackageForm({ ...packageForm, displayPriority: Number(e.target.value || 0) })} className={inputCls} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className={labelCls}>Logo Size</label>
                  <select value={packageForm.logoSize} onChange={(e) => setPackageForm({ ...packageForm, logoSize: e.target.value as SponsorLogoSize })} className={`${inputCls} appearance-none cursor-pointer`}>
                    <option value="small" className="bg-zinc-900">Small</option>
                    <option value="medium" className="bg-zinc-900">Medium</option>
                    <option value="large" className="bg-zinc-900">Large</option>
                  </select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className={labelCls}>Status</label>
                  <select value={packageForm.status} onChange={(e) => setPackageForm({ ...packageForm, status: e.target.value as SponsorStatus })} className={`${inputCls} appearance-none cursor-pointer`}>
                    <option value="Active" className="bg-zinc-900">Active</option>
                    <option value="Inactive" className="bg-zinc-900">Inactive</option>
                  </select>
                </div>
                <div className="flex flex-col gap-1.5 sm:col-span-2">
                  <label className={labelCls}>Description</label>
                  <input type="text" value={packageForm.description} onChange={(e) => setPackageForm({ ...packageForm, description: e.target.value })} placeholder="Short description of the package" className={inputCls} />
                </div>
                <div className="flex flex-col gap-1.5 sm:col-span-2">
                  <label className={labelCls}>Display Locations (comma separated)</label>
                  <input type="text" value={packageForm.displayLocations} onChange={(e) => setPackageForm({ ...packageForm, displayLocations: e.target.value })} placeholder="Hero placement, Sponsor showcase, Website link, Stage branding" className={inputCls} />
                </div>
                <div className="flex flex-col gap-1.5 sm:col-span-2">
                  <label className={labelCls}>Benefits (one per line)</label>
                  <textarea value={packageForm.benefits} onChange={(e) => setPackageForm({ ...packageForm, benefits: e.target.value })} placeholder={'Largest logo placement\nHero showcase priority\nWebsite link\nStage banner'} rows={4} className={`${inputCls} resize-none`} />
                </div>
              </div>
              <div className="flex items-center justify-end gap-3 mt-2">
                <button type="button" onClick={() => setPackageFormOpen(false)} className="px-4 py-2.5 rounded-xl text-white/60 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold cursor-pointer">
                  Cancel
                </button>
                <button type="submit" disabled={savingPackage} className="px-5 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold cursor-pointer disabled:opacity-50 flex items-center gap-2">
                  {savingPackage ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                  {packageForm.id ? 'Save Changes' : 'Add Package'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirmation dialog */}
      <ConfirmationDialog
        open={!!deleteTarget}
        title={deleteTarget?.type === 'sponsor' ? 'Delete Sponsor' : deleteTarget?.type === 'category' ? 'Delete Category' : 'Delete Package'}
        message={
          deleteTarget?.type === 'category'
            ? `Delete the category "${deleteTarget?.name}"? Sponsors using this category will keep their label but may lose grouping order.`
            : deleteTarget?.type === 'package'
              ? `Delete the package "${deleteTarget?.name}"? Sponsors referencing this package will keep their data.`
              : `Delete the sponsor "${deleteTarget?.name}"? This cannot be undone.`
        }
        loading={deleting}
        confirmLabel="Delete"
        onConfirm={
          deleteTarget?.type === 'sponsor'
            ? confirmDeleteSponsor
            : deleteTarget?.type === 'category'
              ? confirmDeleteCategory
              : confirmDeletePackage
        }
        onCancel={() => setDeleteTarget(null)}
      />

      {/* Showcase preview */}
      {previewOpen && (
        <div className="fixed inset-0 z-[10000] bg-black overflow-y-auto">
          <SponsorShowcase preview onContinue={() => setPreviewOpen(false)} />
        </div>
      )}
    </div>
  );
};

export default SponsorManagement;
