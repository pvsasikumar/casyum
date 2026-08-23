import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Eye,
  EyeOff,
  Image as ImageIcon,
  Loader2,
  Plus,
  Save,
  Trash2,
} from 'lucide-react';
import { useAdmin } from '../../context/AdminContext';
import { useRBAC } from '../../../rbac/context/RBACContext';
import {
  CMS_PAGE_LABELS,
  CMS_PAGE_SECTION_KEYS,
  CMS_PAGE_SECTION_LABELS,
  formatCmsTimestamp,
  loadPageForEditing,
  publishCmsPage,
  saveCmsPageDraft,
  setCmsPageVisibility,
  type CmsEditor,
  type CmsSitePageId,
} from '../../../services/cmsService';
import { CmsPreviewPane } from './CmsPreviewPane';

const inputClass =
  'w-full p-3 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-violet-500/50 transition-all';

interface FieldProps {
  label: string;
  hint?: string;
}

/**
 * Renders an image from a URL with a graceful failure state. Falls back to the
 * bundled default; if even that cannot render, shows a friendly error without
 * ever breaking the page.
 */
const UrlImagePreview: React.FC<{ url: string; fallbackUrl?: string; alt: string }> = ({
  url,
  fallbackUrl = '',
  alt,
}) => {
  const candidates = useMemo(
    () => Array.from(new Set([url.trim(), fallbackUrl.trim()].filter(Boolean))),
    [url, fallbackUrl]
  );
  const [index, setIndex] = useState(0);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setIndex(0);
    setFailed(candidates.length === 0);
  }, [candidates]);

  if (failed || candidates.length === 0) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center gap-2 bg-white/[0.03] text-white/30 px-4 text-center">
        <AlertCircle className="w-6 h-6" />
        <span className="text-[10px] font-bold uppercase tracking-widest">
          Unable to load this image. Please check the URL.
        </span>
      </div>
    );
  }

  return (
    <img
      key={`${candidates[index]}-${index}`}
      src={candidates[index]}
      alt={alt}
      className="w-full h-full object-cover"
      onError={() => {
        if (index < candidates.length - 1) setIndex((i) => i + 1);
        else setFailed(true);
      }}
    />
  );
};

const TextField: React.FC<FieldProps & { value: string; onChange: (v: string) => void; disabled?: boolean }> = ({
  label,
  hint,
  value,
  onChange,
  disabled,
}) => (
  <div className="flex flex-col gap-2">
    <label className="text-xs font-bold text-white/50">{label}</label>
    <input type="text" value={value} disabled={disabled} onChange={(e) => onChange(e.target.value)} className={inputClass} />
    {hint && <span className="text-[10px] text-white/30">{hint}</span>}
  </div>
);

const TextAreaField: React.FC<
  FieldProps & { value: string; onChange: (v: string) => void; rows?: number; disabled?: boolean }
> = ({ label, hint, value, onChange, rows = 3, disabled }) => (
  <div className="flex flex-col gap-2">
    <label className="text-xs font-bold text-white/50">{label}</label>
    <textarea
      value={value}
      rows={rows}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value)}
      className={`${inputClass} resize-none leading-relaxed`}
    />
    {hint && <span className="text-[10px] text-white/30">{hint}</span>}
  </div>
);

interface CmsPageEditorProps {
  pageId: CmsSitePageId;
  canEdit: boolean;
  onBack: () => void;
}

export const CmsPageEditor: React.FC<CmsPageEditorProps> = ({ pageId, canEdit, onBack }) => {
  const rbac = useRBAC();
  const { addToast, logAction } = useAdmin();

  const [loading, setLoading] = useState(true);
  const [content, setContent] = useState<Record<string, any>>({});
  const [sections, setSections] = useState<Record<string, boolean>>({});
  const [pageVisible, setPageVisible] = useState(true);
  const [audit, setAudit] = useState({ updatedAt: '', updatedByName: '', publishedAt: '', isDraft: false });
  const [baseline, setBaseline] = useState('');

  const [savingDraft, setSavingDraft] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [togglingVisibility, setTogglingVisibility] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);

  const editor = useCallback(
    (): CmsEditor => ({
      id: rbac.user?.id || 'admin',
      name: rbac.user?.name || 'Super Admin',
      role: rbac.user?.role || '',
    }),
    [rbac.user]
  );

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await loadPageForEditing(pageId);
      setContent({ ...data.content });
      setSections({ ...data.sections });
      setPageVisible(data.visible);
      setAudit({
        updatedAt: data.updatedAt,
        updatedByName: data.updatedByName,
        publishedAt: data.publishedAt,
        isDraft: data.isDraft,
      });
      setBaseline(JSON.stringify({ c: data.content, s: data.sections }));
    } catch {
      addToast('Error', 'Failed to load the page content.', 'error');
    } finally {
      setLoading(false);
    }
  }, [pageId, addToast]);

  useEffect(() => {
    void load();
  }, [load]);

  const dirty = useMemo(
    () => baseline !== '' && JSON.stringify({ c: content, s: sections }) !== baseline,
    [baseline, content, sections]
  );

  const update = (key: string, value: any) => {
    setContent((prev) => ({ ...prev, [key]: value }));
  };

  const paragraphsText = Array.isArray(content.paragraphs) ? content.paragraphs.join('\n') : '';
  const setParagraphsText = (text: string) => {
    update(
      'paragraphs',
      text
        .split('\n')
        .map((p) => p.trim())
        .filter(Boolean)
    );
  };

  const handleSaveDraft = async () => {
    setSavingDraft(true);
    try {
      await saveCmsPageDraft(pageId, { content, sections }, editor());
      logAction('CMS Draft Saved', `Saved a private draft for the ${CMS_PAGE_LABELS[pageId]} page.`);
      addToast('Draft Saved', `${CMS_PAGE_LABELS[pageId]} draft saved. The public site still shows the published version.`, 'success');
      await load();
    } catch (err) {
      addToast('Error', err instanceof Error ? err.message : 'Failed to save the draft.', 'error');
    } finally {
      setSavingDraft(false);
    }
  };

  const handlePublish = async () => {
    setPublishing(true);
    try {
      await publishCmsPage(pageId, { content, sections, visible: pageVisible }, editor());
      logAction('CMS Published', `Published changes to the ${CMS_PAGE_LABELS[pageId]} page.`);
      addToast('Published', `${CMS_PAGE_LABELS[pageId]} page is now live.`, 'success');
      await load();
    } catch (err) {
      addToast('Error', err instanceof Error ? err.message : 'Failed to publish changes.', 'error');
    } finally {
      setPublishing(false);
    }
  };

  const handleToggleVisibility = async () => {
    setTogglingVisibility(true);
    try {
      const next = !pageVisible;
      await setCmsPageVisibility(pageId, next, editor());
      logAction(
        next ? 'CMS Page Shown' : 'CMS Page Hidden',
        `${CMS_PAGE_LABELS[pageId]} page is now ${next ? 'visible' : 'hidden'} on the public website.`
      );
      addToast(next ? 'Page Visible' : 'Page Hidden', `${CMS_PAGE_LABELS[pageId]} is now ${next ? 'visible' : 'hidden'} on the public website.`, next ? 'success' : 'warning');
      await load();
    } catch (err) {
      addToast('Error', err instanceof Error ? err.message : 'Failed to update page visibility.', 'error');
    } finally {
      setTogglingVisibility(false);
    }
  };

  const handleRemoveImage = () => {
    // Only clears the stored image URL in Firestore — the externally hosted
    // image itself is never touched.
    update('backgroundImage', '');
    addToast('Image Removed', 'The image URL was removed. Publish to apply.', 'info');
  };

  const handleBack = () => {
    if (dirty && !window.confirm('You have unpublished changes. Leave without saving?')) return;
    onBack();
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-white/50 text-sm py-10">
        <Loader2 className="w-4 h-4 animate-spin text-violet-400" />
        <span>Loading {CMS_PAGE_LABELS[pageId]} page...</span>
      </div>
    );
  }

  const sectionKeys = CMS_PAGE_SECTION_KEYS[pageId];

  return (
    <div className="flex flex-col gap-6 select-none pb-12">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <button
            onClick={handleBack}
            className="mt-1 p-2 rounded-xl bg-white/5 border border-white/10 text-white/60 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            aria-label="Back to pages"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="flex flex-col">
            <span className="text-xs font-bold text-violet-400 uppercase tracking-widest">Website CMS</span>
            <h2 className="text-xl sm:text-2xl font-extrabold font-display text-white">
              Edit {CMS_PAGE_LABELS[pageId]} Page
            </h2>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-[11px] text-white/40">
              <span>
                Last Updated: {formatCmsTimestamp(audit.isDraft ? audit.updatedAt : audit.publishedAt || audit.updatedAt)}
              </span>
              <span>Updated By: {audit.updatedByName || '—'}</span>
              <span
                className={`inline-flex items-center gap-1.5 font-bold ${
                  pageVisible ? 'text-emerald-300' : 'text-rose-300'
                }`}
              >
                {pageVisible ? '🟢 Visible' : '🔴 Hidden'}
              </span>
              {audit.isDraft && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 text-[9px] font-extrabold uppercase tracking-wider">
                  Unsaved Draft Loaded
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => void handleToggleVisibility()}
            disabled={togglingVisibility}
            className={`px-4 py-2.5 rounded-xl text-[11px] font-bold uppercase tracking-widest border transition-all cursor-pointer flex items-center gap-2 disabled:opacity-50 ${
              pageVisible
                ? 'bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border-rose-500/25'
                : 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border-emerald-500/25'
            }`}
          >
            {togglingVisibility ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : pageVisible ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            <span>{pageVisible ? 'Hide Page' : 'Show Page'}</span>
          </button>
          <button
            onClick={() => setPreviewOpen(true)}
            className="px-4 py-2.5 rounded-xl text-[11px] font-bold uppercase tracking-widest bg-white/5 hover:bg-white/10 text-white/80 border border-white/15 transition-all cursor-pointer flex items-center gap-2"
          >
            <Eye className="w-3.5 h-3.5" />
            Preview
          </button>
        </div>
      </div>

      {!canEdit && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-amber-500/10 border border-amber-500/25 text-amber-300 text-xs">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>You have view-only access to the CMS.</span>
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* ---- Content ---- */}
        <div className="p-6 rounded-3xl bg-zinc-950/60 border border-white/10 backdrop-blur-md flex flex-col gap-5">
          <h3 className="text-sm font-bold text-white">Page Content</h3>

          {pageId === 'home' && (
            <>
              <TextField
                label="Hero Title"
                value={content.heroTitle ?? ''}
                disabled={!canEdit}
                onChange={(v) => update('heroTitle', v)}
              />
              <TextField
                label="Hero Subtitle"
                value={content.heroSubtitle ?? ''}
                disabled={!canEdit}
                onChange={(v) => update('heroSubtitle', v)}
              />
              <TextAreaField
                label="Description (optional)"
                hint="Shown under the subtitle. Leave empty to hide."
                value={content.heroDescription ?? ''}
                disabled={!canEdit}
                onChange={(v) => update('heroDescription', v)}
              />

              {/* Background image (externally hosted URL — no Firebase Storage) */}
              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold text-white/50">Hero Image / Background</label>
                <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 flex flex-col gap-3">
                  <div className="w-full h-40 sm:h-44 rounded-xl overflow-hidden border border-white/10 bg-black">
                    <UrlImagePreview
                      url={content.backgroundImage || ''}
                      fallbackUrl="/images/final.jpeg"
                      alt="Hero background"
                    />
                  </div>
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-white/50">Image URL</label>
                    {!!content.backgroundImage && (
                      <button
                        onClick={handleRemoveImage}
                        disabled={!canEdit}
                        className="px-4 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/25 text-[11px] font-bold uppercase tracking-widest transition-colors cursor-pointer flex items-center gap-2 disabled:opacity-50"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Delete Image
                      </button>
                    )}
                  </div>
                  <input
                    type="text"
                    value={content.backgroundImage ?? ''}
                    disabled={!canEdit}
                    onChange={(e) => update('backgroundImage', e.target.value)}
                    placeholder="https://example.com/image.jpg"
                    className={inputClass}
                    spellCheck={false}
                  />
                  <span className="text-[10px] text-white/30 break-all">
                    Paste a publicly accessible image URL — the preview above updates automatically. Leave empty to use
                    the default bundled background (/images/final.jpeg). Save Draft or Publish Changes applies the URL.
                  </span>
                </div>
              </div>
            </>
          )}

          {pageId === 'about' && (
            <>
              <TextField label="Kicker" value={content.kicker ?? ''} disabled={!canEdit} onChange={(v) => update('kicker', v)} />
              <TextField label="Title" value={content.title ?? ''} disabled={!canEdit} onChange={(v) => update('title', v)} />
              <TextAreaField
                label="Paragraphs"
                hint="One paragraph per line."
                rows={6}
                value={paragraphsText}
                disabled={!canEdit}
                onChange={setParagraphsText}
              />

              {/* Stats */}
              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold text-white/50">Highlights Stats</label>
                {(Array.isArray(content.stats) ? content.stats : []).map((stat: any, idx: number) => (
                  <div key={stat.id || idx} className="flex items-center gap-2">
                    <input
                      type="text"
                      value={stat.value ?? ''}
                      placeholder="Value (e.g. 10+)"
                      disabled={!canEdit}
                      onChange={(e) =>
                        update(
                          'stats',
                          content.stats.map((s: any, i: number) => (i === idx ? { ...s, value: e.target.value } : s))
                        )
                      }
                      className={`${inputClass} w-28 sm:w-32 flex-shrink-0`}
                    />
                    <input
                      type="text"
                      value={stat.label ?? ''}
                      placeholder="Label"
                      disabled={!canEdit}
                      onChange={(e) =>
                        update(
                          'stats',
                          content.stats.map((s: any, i: number) => (i === idx ? { ...s, label: e.target.value } : s))
                        )
                      }
                      className={inputClass}
                    />
                    <button
                      onClick={() =>
                        update(
                          'stats',
                          content.stats.filter((_: any, i: number) => i !== idx)
                        )
                      }
                      disabled={!canEdit}
                      className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/25 text-rose-300 hover:bg-rose-500/20 transition-colors cursor-pointer flex-shrink-0 disabled:opacity-50"
                      aria-label="Remove stat"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
                {canEdit && (
                  <button
                    onClick={() => update('stats', [...(content.stats || []), { id: `stat-${Date.now()}`, value: '', label: '' }])}
                    className="w-fit px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/70 text-[11px] font-bold uppercase tracking-widest transition-colors cursor-pointer flex items-center gap-2"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Add Stat
                  </button>
                )}
              </div>
            </>
          )}

          {pageId === 'events' && (
            <>
              <TextField label="Kicker" value={content.kicker ?? ''} disabled={!canEdit} onChange={(v) => update('kicker', v)} />
              <TextField label="Title" value={content.title ?? ''} disabled={!canEdit} onChange={(v) => update('title', v)} />
              <TextAreaField
                label="Description"
                value={content.description ?? ''}
                disabled={!canEdit}
                onChange={(v) => update('description', v)}
              />
            </>
          )}

          {pageId === 'sponsors' && (
            <>
              <TextField label="Kicker" value={content.kicker ?? ''} disabled={!canEdit} onChange={(v) => update('kicker', v)} />
              <TextField label="Title" value={content.title ?? ''} disabled={!canEdit} onChange={(v) => update('title', v)} />
              <TextAreaField
                label="Subtitle"
                value={content.subtitle ?? ''}
                disabled={!canEdit}
                onChange={(v) => update('subtitle', v)}
              />
            </>
          )}

          {pageId === 'register' && (
            <>
              <TextField label="Kicker" value={content.kicker ?? ''} disabled={!canEdit} onChange={(v) => update('kicker', v)} />
              <TextField label="Heading" value={content.heading ?? ''} disabled={!canEdit} onChange={(v) => update('heading', v)} />
              <TextAreaField
                label="Description"
                value={content.description ?? ''}
                disabled={!canEdit}
                onChange={(v) => update('description', v)}
              />
            </>
          )}
        </div>

        {/* ---- Sections ---- */}
        <div className="p-6 rounded-3xl bg-zinc-950/60 border border-white/10 backdrop-blur-md flex flex-col gap-4 h-fit">
          <h3 className="text-sm font-bold text-white">Sections</h3>
          <p className="text-[11px] text-white/40">
            Hidden sections are not shown publicly but their content is never deleted.
          </p>
          <div className="flex flex-col gap-2">
            {sectionKeys.map((key) => {
              const isVisible = sections[key] !== false;
              return (
                <div
                  key={key}
                  className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3"
                >
                  <div className="flex flex-col min-w-0">
                    <span className="text-sm font-bold text-white truncate">{CMS_PAGE_SECTION_LABELS[key] || key}</span>
                    <span className={`text-[10px] font-bold uppercase tracking-widest ${isVisible ? 'text-emerald-300' : 'text-rose-300'}`}>
                      {isVisible ? '🟢 Visible' : '🔴 Hidden'}
                    </span>
                  </div>
                  <button
                    onClick={() => setSections((prev) => ({ ...prev, [key]: !isVisible }))}
                    disabled={!canEdit}
                    className={`px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest border transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-50 ${
                      isVisible
                        ? 'bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border-rose-500/25'
                        : 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border-emerald-500/25'
                    }`}
                  >
                    {isVisible ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    {isVisible ? 'Hide' : 'Show'}
                  </button>
                </div>
              );
            })}
          </div>

          <div className="mt-2 flex items-start gap-2 px-3 py-2.5 rounded-xl bg-violet-500/10 border border-violet-500/20 text-violet-300 text-[11px]">
            <ImageIcon className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
            <span>
              Event listings stay connected to the existing Firestore event collection and the Event Overview CMS —
              nothing is duplicated here.
            </span>
          </div>
        </div>
      </div>

      {/* Save bar */}
      <div className="sticky bottom-4 z-20 flex flex-wrap items-center justify-between gap-3 p-4 rounded-2xl bg-zinc-950/90 border border-white/10 backdrop-blur-xl shadow-2xl">
        <span className="text-[11px] text-white/40 flex items-center gap-2">
          {dirty ? (
            <>
              <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
              You have unsaved changes.
            </>
          ) : (
            <>
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              All changes saved.
            </>
          )}
        </span>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => void handleSaveDraft()}
            disabled={!canEdit || savingDraft || publishing}
            className="px-5 py-2.5 rounded-xl text-[11px] font-bold uppercase tracking-widest bg-white/5 hover:bg-white/10 text-white/80 border border-white/15 transition-all cursor-pointer flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {savingDraft ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            Save Draft
          </button>
          <button
            onClick={() => void handlePublish()}
            disabled={!canEdit || publishing || savingDraft}
            className="px-5 py-2.5 rounded-xl text-[11px] font-bold uppercase tracking-widest bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white shadow-lg shadow-violet-500/25 transition-all cursor-pointer flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {publishing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
            Publish Changes
          </button>
        </div>
      </div>

      {previewOpen && (
        <CmsPreviewPane
          pageId={pageId}
          content={content}
          sections={sections}
          onClose={() => setPreviewOpen(false)}
        />
      )}
    </div>
  );
};
