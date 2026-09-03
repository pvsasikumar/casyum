import React, { useEffect, useMemo, useState } from 'react';
import {
  BookOpen,
  Eye,
  EyeOff,
  FileText,
  Globe,
  LayoutDashboard,
  Loader2,
  Pencil,
  RefreshCw,
  UploadCloud,
  Trash2,
  ExternalLink,
} from 'lucide-react';
import { useAdmin } from '../../context/AdminContext';
import { useRBAC } from '../../../rbac/context/RBACContext';
import {
  CMS_PAGE_IDS,
  CMS_PAGE_LABELS,
  formatCmsTimestamp,
  setCmsNavVisibility,
  setCmsPageVisibility,
  subscribeCmsDraftInfo,
  subscribeCmsPages,
  type CmsEditor,
  type CmsSitePageId,
  type ResolvedCmsPage,
} from '../../../services/cmsService';
import {
  fetchGlobalRuleBook,
  saveGlobalRuleBook,
  uploadGlobalRuleBook,
  deleteRuleBookFile,
  isRuleBookConfigured,
  validateRuleBookFile,
  formatRuleBookDate,
  type GlobalRuleBookInfo,
} from '../../../services/ruleBookService';
import { isStorageConfigured } from '../../../firebase/firebase';
import { CmsPageEditor } from './CmsPageEditor';
import { CmsPreviewPane } from './CmsPreviewPane';

type CmsTab = 'pages' | 'navigation' | 'rulebook';

const TABS: Array<{ key: CmsTab; label: string; icon: typeof Globe }> = [
  { key: 'pages', label: 'Pages', icon: LayoutDashboard },
  { key: 'navigation', label: 'Navigation', icon: Globe },
  { key: 'rulebook', label: 'Rule Book', icon: BookOpen },
];

interface CmsModuleProps {
  canEdit?: boolean;
}

export const CmsModule: React.FC<CmsModuleProps> = ({ canEdit }) => {
  const rbac = useRBAC();
  const { addToast, logAction } = useAdmin();
  const canModify = canEdit ?? rbac.hasPermission('cms.edit');

  const [tab, setTab] = useState<CmsTab>('pages');
  const [pages, setPages] = useState<Record<string, ResolvedCmsPage>>({});
  const [draftInfo, setDraftInfo] = useState<Record<string, { savedAt: string; savedBy: string }>>({});
  const [loading, setLoading] = useState(true);
  const [editingPageId, setEditingPageId] = useState<CmsSitePageId | null>(null);
  const [previewPageId, setPreviewPageId] = useState<CmsSitePageId | null>(null);
  const [busyPageId, setBusyPageId] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    const unsub1 = subscribeCmsPages(
      (map) => {
        if (!alive) return;
        setPages(map);
        setLoading(false);
      },
      () => {
        if (alive) setLoading(false);
      }
    );
    const unsub2 = subscribeCmsDraftInfo((info) => {
      if (alive) setDraftInfo(info);
    });
    return () => {
      alive = false;
      unsub1();
      unsub2();
    };
  }, []);

  const editor = useMemo<CmsEditor>(
    () => ({
      id: rbac.user?.id || 'admin',
      name: rbac.user?.name || 'Super Admin',
      role: rbac.user?.role || '',
    }),
    [rbac.user]
  );

  const handleVisibilityToggle = async (pageId: CmsSitePageId) => {
    const current = pages[pageId];
    if (!current) return;
    setBusyPageId(pageId);
    try {
      await setCmsPageVisibility(pageId, !current.visible, editor);
      logAction(
        current.visible ? 'CMS Page Hidden' : 'CMS Page Shown',
        `${CMS_PAGE_LABELS[pageId]} page is now ${current.visible ? 'hidden' : 'visible'} on the public website.`
      );
      addToast(
        current.visible ? 'Page Hidden' : 'Page Visible',
        `${CMS_PAGE_LABELS[pageId]} is now ${current.visible ? 'hidden from' : 'visible on'} the public website.`,
        current.visible ? 'warning' : 'success'
      );
    } catch (err) {
      addToast('Error', err instanceof Error ? err.message : 'Failed to update page visibility.', 'error');
    } finally {
      setBusyPageId(null);
    }
  };

  // ---- Page editor view -------------------------------------------------
  if (editingPageId) {
    return (
      <div className="flex flex-col gap-4 select-none">
        <CmsPageEditor pageId={editingPageId} canEdit={canModify} onBack={() => setEditingPageId(null)} />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5 select-none pb-12">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold text-violet-400 uppercase tracking-widest flex items-center gap-2">
            <Globe className="w-3.5 h-3.5" />
            Website Content Management
          </span>
          <h2 className="text-xl sm:text-2xl font-extrabold font-display text-white mt-0.5">Website CMS</h2>
          <p className="text-[11px] text-white/40 mt-1">
            Manage the public website's pages, navigation and the global CASYUM Rule Book — no code changes required.
          </p>
        </div>
        {/* Tabs */}
        <div className="flex flex-wrap items-center gap-2">
          {TABS.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-[11px] font-bold uppercase tracking-widest border transition-all cursor-pointer ${
                tab === key
                  ? 'bg-violet-600/25 border-violet-500/40 text-violet-200'
                  : 'bg-white/[0.03] border-white/10 text-white/50 hover:text-white hover:bg-white/[0.07]'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {label}
            </button>
          ))}
        </div>
      </div>

      {tab === 'pages' && (
        <>
          {loading ? (
            <div className="flex items-center gap-2 text-white/50 text-sm py-10">
              <Loader2 className="w-4 h-4 animate-spin text-violet-400" />
              <span>Loading pages...</span>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {CMS_PAGE_IDS.map((pageId) => {
                const page = pages[pageId];
                const visible = page?.visible ?? true;
                const hasDraft = !!draftInfo[pageId];
                return (
                  <div
                    key={pageId}
                    className="group p-5 rounded-3xl bg-zinc-950/60 hover:bg-zinc-900/60 border border-white/10 hover:border-white/20 transition-all duration-300 backdrop-blur-md flex flex-col gap-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex flex-col min-w-0">
                        <h3 className="font-display font-bold text-lg text-white truncate">{CMS_PAGE_LABELS[pageId]}</h3>
                        <span className="text-[10px] text-white/30 font-mono">cms/pages/{pageId}</span>
                      </div>
                      <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest flex-shrink-0">
                        {visible ? (
                          <span className="text-emerald-300">🟢 Visible</span>
                        ) : (
                          <span className="text-rose-300">🔴 Hidden</span>
                        )}
                      </span>
                    </div>

                    <div className="flex flex-col gap-1 text-[11px] text-white/40">
                      <span>Last Updated: {formatCmsTimestamp(page?.publishedAt || '')}</span>
                      <span>Updated By: {page?.updatedByName || '—'}</span>
                      <div className="mt-1">
                        {hasDraft && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 text-[9px] font-extrabold uppercase tracking-wider">
                            Draft Saved · {formatCmsTimestamp(draftInfo[pageId]?.savedAt || '')}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 mt-auto pt-2 border-t border-white/5">
                      <button
                        onClick={() => setEditingPageId(pageId)}
                        disabled={!canModify}
                        className="px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-[10px] font-bold uppercase tracking-widest transition-colors cursor-pointer flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Pencil className="w-3 h-3" />
                        Edit
                      </button>
                      <button
                        onClick={() => setPreviewPageId(pageId)}
                        disabled={!page}
                        className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 border border-white/10 text-[10px] font-bold uppercase tracking-widest transition-colors cursor-pointer flex items-center gap-1.5 disabled:opacity-40"
                      >
                        <Eye className="w-3 h-3" />
                        Preview
                      </button>
                      <button
                        onClick={() => void handleVisibilityToggle(pageId)}
                        disabled={!canModify || busyPageId === pageId}
                        className={`ml-auto px-3 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest border transition-colors cursor-pointer flex items-center gap-1.5 disabled:opacity-50 ${
                          visible
                            ? 'bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border-rose-500/25'
                            : 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border-emerald-500/25'
                        }`}
                      >
                        {busyPageId === pageId ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : visible ? (
                          <EyeOff className="w-3 h-3" />
                        ) : (
                          <Eye className="w-3 h-3" />
                        )}
                        {visible ? 'Hide' : 'Show'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {tab === 'navigation' && (
        <NavigationTab
          pages={pages}
          loading={loading}
          canEdit={canModify}
          editor={editor}
          addToast={addToast}
          logAction={logAction}
        />
      )}

      {tab === 'rulebook' && <GlobalRuleBookTab canEdit={canModify} editor={editor} />}

      {previewPageId && pages[previewPageId] && (
        <CmsPreviewPane
          pageId={previewPageId}
          content={pages[previewPageId].content}
          sections={pages[previewPageId].sections}
          onClose={() => setPreviewPageId(null)}
        />
      )}
    </div>
  );
};

/* ------------------------------------------------------------------ */
/* Navigation management                                               */
/* ------------------------------------------------------------------ */

interface NavigationTabProps {
  pages: Record<string, ResolvedCmsPage>;
  loading: boolean;
  canEdit: boolean;
  editor: CmsEditor;
  addToast: ReturnType<typeof useAdmin>['addToast'];
  logAction: ReturnType<typeof useAdmin>['logAction'];
}

const NavigationTab: React.FC<NavigationTabProps> = ({ pages, loading, canEdit, editor, addToast, logAction }) => {
  const [busy, setBusy] = useState<string | null>(null);

  const handleToggle = async (pageId: CmsSitePageId) => {
    const current = pages[pageId];
    if (!current) return;
    setBusy(pageId);
    try {
      await setCmsNavVisibility(pageId, !current.navVisible, editor);
      logAction(
        current.navVisible ? 'CMS Nav Link Hidden' : 'CMS Nav Link Shown',
        `${CMS_PAGE_LABELS[pageId]} is now ${current.navVisible ? 'hidden from' : 'shown in'} the public navbar.`
      );
      addToast(
        current.navVisible ? 'Link Hidden' : 'Link Visible',
        `${CMS_PAGE_LABELS[pageId]} is now ${current.navVisible ? 'hidden from' : 'shown in'} the navbar.`,
        current.navVisible ? 'warning' : 'success'
      );
    } catch (err) {
      addToast('Error', err instanceof Error ? err.message : 'Failed to update navigation.', 'error');
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="p-5 sm:p-6 rounded-3xl bg-zinc-950/60 border border-white/10 backdrop-blur-md flex flex-col gap-4 max-w-2xl">
      <div>
        <h3 className="text-sm font-bold text-white">Public Navbar Links</h3>
        <p className="text-[11px] text-white/40 mt-1">
          Hiding a link does not hide the page itself — visitors can still reach it directly.
          Protected portals are never exposed in the public navigation.
        </p>
      </div>
      {loading ? (
        <div className="flex items-center gap-2 text-white/50 text-sm py-6">
          <Loader2 className="w-4 h-4 animate-spin text-violet-400" />
          <span>Loading...</span>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {CMS_PAGE_IDS.map((pageId) => {
            const page = pages[pageId];
            const navVisible = page?.navVisible ?? true;
            return (
              <div
                key={pageId}
                className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3"
              >
                <div className="flex flex-col min-w-0">
                  <span className="text-sm font-bold text-white">{CMS_PAGE_LABELS[pageId]}</span>
                  <span className={`text-[10px] font-bold uppercase tracking-widest ${navVisible ? 'text-emerald-300' : 'text-rose-300'}`}>
                    {navVisible ? '🟢 In Menu' : '🔴 Hidden'}
                  </span>
                </div>
                <button
                  onClick={() => void handleToggle(pageId)}
                  disabled={!canEdit || busy === pageId}
                  className={`px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest border transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-50 ${
                    navVisible
                      ? 'bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border-rose-500/25'
                      : 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border-emerald-500/25'
                  }`}
                >
                  {busy === pageId ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : navVisible ? (
                    <EyeOff className="w-3 h-3" />
                  ) : (
                    <Eye className="w-3 h-3" />
                  )}
                  {navVisible ? 'Hide' : 'Show'}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

/* ------------------------------------------------------------------ */
/* Global Rule Book Management                                         */
/* ------------------------------------------------------------------ */

interface GlobalRuleBookTabProps {
  canEdit: boolean;
  editor: CmsEditor;
}

const GlobalRuleBookTab: React.FC<GlobalRuleBookTabProps> = ({ canEdit, editor }) => {
  const { addToast, logAction } = useAdmin();
  const [ruleBook, setRuleBook] = useState<GlobalRuleBookInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [ruleBookFile, setRuleBookFile] = useState<File | null>(null);
  const [uploadError, setUploadError] = useState('');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [storageConfigured] = useState<boolean>(() => isStorageConfigured);

  useEffect(() => {
    let alive = true;
    void (async () => {
      try {
        const info = await fetchGlobalRuleBook();
        if (alive) setRuleBook(info);
      } catch {
        // keep defaults
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  const handleFileSelect = (file: File | null) => {
    setUploadError('');
    if (!file) { setRuleBookFile(null); return; }
    try {
      validateRuleBookFile(file);
      setRuleBookFile(file);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Invalid file.');
      setRuleBookFile(null);
    }
  };

  const handleUpload = async () => {
    if (!ruleBookFile || uploading) return;
    setUploadError('');
    setUploading(true);
    setUploadProgress(0);
    try {
      if (isRuleBookConfigured() && storageConfigured) {
        const result = await uploadGlobalRuleBook(ruleBookFile, {
          name: 'casyum-rulebook',
          version: ruleBook?.version || 'v1',
          updatedBy: editor.name || 'Admin',
          onProgress: setUploadProgress,
        });
        const updated: GlobalRuleBookInfo = {
          url: result.url,
          fileName: result.fileName,
          version: result.version || ruleBook?.version || 'v1',
          updatedAt: result.updatedAt || new Date().toISOString(),
          updatedBy: editor.name || 'Admin',
          visible: ruleBook?.visible ?? true,
        };
        await saveGlobalRuleBook(updated);
        setRuleBook(updated);
        logAction('Rule Book Updated', `CASYUM Rule Book PDF uploaded: ${result.fileName}`);
        addToast('Rule Book Updated', 'The CASYUM Rule Book PDF has been uploaded successfully.', 'success');
      } else {
        const safeName = `casyum-rulebook.pdf`;
        setUploadError(
          `Firebase Storage is not configured. Copy "${ruleBookFile.name}" into public/rulebooks/ as "${safeName}", then save manually.`
        );
      }
      setRuleBookFile(null);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Upload failed.');
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const handleRemove = async () => {
    if (!ruleBook?.url) return;
    setSaving(true);
    try {
      await deleteRuleBookFile(ruleBook.url);
      const updated: GlobalRuleBookInfo = {
        url: '',
        fileName: '',
        version: '',
        updatedAt: new Date().toISOString(),
        updatedBy: editor.name || 'Admin',
        visible: ruleBook.visible,
      };
      await saveGlobalRuleBook(updated);
      setRuleBook(updated);
      logAction('Rule Book Removed', 'The CASYUM Rule Book PDF has been removed.');
      addToast('Rule Book Removed', 'The Rule Book PDF has been removed.', 'warning');
    } catch (err) {
      addToast('Error', err instanceof Error ? err.message : 'Failed to remove Rule Book.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleVisibilityToggle = async () => {
    if (!ruleBook) return;
    setSaving(true);
    try {
      const newVisible = !ruleBook.visible;
      await saveGlobalRuleBook({ visible: newVisible });
      setRuleBook({ ...ruleBook, visible: newVisible });
      logAction(
        newVisible ? 'Rule Book Visible' : 'Rule Book Hidden',
        `The CASYUM Rule Book is now ${newVisible ? 'visible on' : 'hidden from'} all event details pages.`
      );
      addToast(
        newVisible ? 'Rule Book Visible' : 'Rule Book Hidden',
        `The Rule Book button is now ${newVisible ? 'visible on' : 'hidden from'} all event details pages.`,
        newVisible ? 'success' : 'warning'
      );
    } catch (err) {
      addToast('Error', err instanceof Error ? err.message : 'Failed to update visibility.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleManualUrlSave = async () => {
    if (!ruleBook) return;
    setSaving(true);
    try {
      await saveGlobalRuleBook({
        url: ruleBook.url,
        updatedAt: new Date().toISOString(),
        updatedBy: editor.name || 'Admin',
      });
      logAction('Rule Book URL Updated', 'The CASYUM Rule Book URL has been updated.');
      addToast('Rule Book Updated', 'The Rule Book URL has been saved.', 'success');
    } catch (err) {
      addToast('Error', err instanceof Error ? err.message : 'Failed to save.', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-white/50 text-sm py-10">
        <Loader2 className="w-4 h-4 animate-spin text-violet-400" />
        <span>Loading Rule Book settings...</span>
      </div>
    );
  }

  const hasRuleBook = !!ruleBook?.url;

  return (
    <div className="flex flex-col gap-4 max-w-2xl">
      <p className="text-[11px] text-white/40">
        Manage the single CASYUM Rule Book PDF. This same PDF will be opened from every event's "Rule Book" button.
      </p>

      {/* Main Card */}
      <div className="p-5 sm:p-6 rounded-3xl bg-zinc-950/60 border border-white/10 backdrop-blur-md flex flex-col gap-4">
        {/* Status Header */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="w-10 h-10 rounded-xl bg-cyan-500/15 border border-cyan-500/25 flex items-center justify-center flex-shrink-0">
              <FileText className="w-5 h-5 text-cyan-300" />
            </span>
            <div className="flex flex-col">
              <span className="text-sm font-bold text-white">CASYUM Rule Book</span>
              <span className="text-[10px] text-white/40 uppercase tracking-wider">
                {hasRuleBook ? 'PDF uploaded' : 'No PDF uploaded yet'}
              </span>
            </div>
          </div>
          <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest flex-shrink-0">
            {ruleBook?.visible ? (
              <span className="text-emerald-300">🟢 Visible</span>
            ) : (
              <span className="text-rose-300">🔴 Hidden</span>
            )}
          </span>
        </div>

        {/* Current File Info */}
        {hasRuleBook && (
          <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 flex flex-col gap-2">
            <div className="flex items-center justify-between gap-3">
              <span className="text-xs text-white/85 break-all font-medium">{ruleBook?.fileName}</span>
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <a
                  href={ruleBook?.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/70 hover:text-white text-[10px] font-bold border border-white/10 flex items-center gap-1.5"
                >
                  <ExternalLink className="w-3 h-3" /> View
                </a>
                {canEdit && (
                  <button
                    onClick={() => void handleRemove()}
                    disabled={saving}
                    className="px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-rose-500/20 text-white/60 hover:text-rose-400 text-[10px] font-bold border border-white/10 flex items-center gap-1.5 disabled:opacity-50"
                  >
                    <Trash2 className="w-3 h-3" /> Remove
                  </button>
                )}
              </div>
            </div>
            <span className="text-[10px] text-white/40">
              {[ruleBook?.version && `v${ruleBook.version}`, ruleBook?.updatedAt && `updated ${formatRuleBookDate(ruleBook.updatedAt)}`, ruleBook?.updatedBy && `by ${ruleBook.updatedBy}`].filter(Boolean).join(' · ')}
            </span>
          </div>
        )}

        {/* Upload Section */}
        {canEdit && (
          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center gap-2.5">
              <label className="relative cursor-pointer">
                <input
                  type="file"
                  accept=".pdf,application/pdf"
                  className="sr-only"
                  onChange={(e) => {
                    handleFileSelect(e.target.files?.[0] ?? null);
                    e.target.value = '';
                  }}
                />
                <span className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/70 hover:text-white text-[10px] font-bold">
                  <UploadCloud className="w-3.5 h-3.5" />
                  {uploading ? 'Uploading...' : ruleBookFile ? ruleBookFile.name : 'Choose PDF'}
                </span>
              </label>
              {ruleBookFile && !uploading && (
                <button
                  type="button"
                  onClick={() => void handleUpload()}
                  className="px-3 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white text-[10px] font-bold cursor-pointer"
                >
                  {isRuleBookConfigured() && storageConfigured ? 'Upload to Firebase' : 'Use Public Path'}
                </button>
              )}
            </div>

            {uploading && uploadProgress > 0 && (
              <div className="flex items-center gap-2">
                <div className="flex-1 h-2 rounded-full bg-white/10 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-violet-500 transition-all"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
                <span className="text-[10px] text-white/50">{uploadProgress}%</span>
              </div>
            )}

            {!storageConfigured && (
              <span className="text-[10px] text-white/40">
                Firebase Storage is off — PDFs go in public/rulebooks/ (requires rebuild/redeploy).
              </span>
            )}

            {uploadError && (
              <p className="text-[10px] text-amber-300 leading-relaxed">{uploadError}</p>
            )}
          </div>
        )}

        {/* Manual URL Input */}
        {canEdit && (
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold text-white/50 uppercase">Rule Book URL / Path</label>
            <div className="flex items-center gap-2">
              <input
                value={ruleBook?.url || ''}
                onChange={(e) => setRuleBook((prev) => prev ? { ...prev, url: e.target.value } : prev)}
                className="flex-1 p-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/30 focus:outline-none focus:border-cyan-500/50 text-xs"
                placeholder={storageConfigured ? 'https://... or /rulebooks/casyum-rulebook.pdf' : '/rulebooks/casyum-rulebook.pdf'}
              />
              <button
                onClick={() => void handleManualUrlSave()}
                disabled={saving || !ruleBook?.url}
                className="px-3 py-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/70 hover:text-white text-[10px] font-bold cursor-pointer disabled:opacity-50"
              >
                Save
              </button>
            </div>
          </div>
        )}

        {/* Visibility Toggle */}
        <div className="flex items-center justify-between gap-3 p-4 rounded-2xl bg-white/[0.03] border border-white/10">
          <div className="flex flex-col gap-0.5">
            <span className="text-[11px] font-bold text-white">Rule Book Visibility</span>
            <span className="text-[10px] text-white/40">
              {ruleBook?.visible
                ? 'The Rule Book button is visible on all event details pages.'
                : 'The Rule Book button is hidden from all event details pages.'}
            </span>
          </div>
          <button
            onClick={() => void handleVisibilityToggle()}
            disabled={!canEdit || saving}
            className={`px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest border transition-colors cursor-pointer flex items-center gap-1.5 disabled:opacity-50 ${
              ruleBook?.visible
                ? 'bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border-rose-500/25'
                : 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border-emerald-500/25'
            }`}
          >
            {saving ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : ruleBook?.visible ? (
              <EyeOff className="w-3 h-3" />
            ) : (
              <Eye className="w-3 h-3" />
            )}
            {ruleBook?.visible ? 'Hide' : 'Show'}
          </button>
        </div>
      </div>

      {/* Info Box */}
      <div className="flex items-start gap-2 px-4 py-3 rounded-xl bg-violet-500/10 border border-violet-500/20 text-violet-300 text-[11px] max-w-2xl">
        <RefreshCw className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
        <span>
          Only ONE Rule Book PDF is used for the entire CASYUM event. Every event's "Rule Book" button
          opens this same PDF in a new browser tab.
        </span>
      </div>
    </div>
  );
};
