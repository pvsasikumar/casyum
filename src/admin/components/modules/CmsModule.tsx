import React, { useEffect, useMemo, useState } from 'react';
import {
  BookOpen,
  CalendarDays,
  Eye,
  EyeOff,
  FileText,
  Globe,
  LayoutDashboard,
  Loader2,
  Pencil,
  RefreshCw,
} from 'lucide-react';
import { useAdmin } from '../../context/AdminContext';
import { useRBAC } from '../../../rbac/context/RBACContext';
import {
  CMS_PAGE_IDS,
  CMS_PAGE_LABELS,
  formatCmsTimestamp,
  fetchRuleBookVisible,
  setCmsNavVisibility,
  setCmsPageVisibility,
  setRuleBookVisibility,
  subscribeCmsDraftInfo,
  subscribeCmsPages,
  type CmsEditor,
  type CmsSitePageId,
  type ResolvedCmsPage,
} from '../../../services/cmsService';
import type { EventItem } from '../../types';
import { CmsPageEditor } from './CmsPageEditor';
import { CmsPreviewPane } from './CmsPreviewPane';

type CmsTab = 'pages' | 'navigation' | 'events';

const TABS: Array<{ key: CmsTab; label: string; icon: typeof Globe }> = [
  { key: 'pages', label: 'Pages', icon: LayoutDashboard },
  { key: 'navigation', label: 'Navigation', icon: Globe },
  { key: 'events', label: 'Events & Rule Books', icon: BookOpen },
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
            Manage the public website's pages, navigation and rule books — no code changes required.
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

      {tab === 'events' && <EventsRuleBooksTab canEdit={canModify} editor={editor} />}

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
/* Events & Rule Books                                                 */
/* ------------------------------------------------------------------ */

interface EventsRuleBooksTabProps {
  canEdit: boolean;
  editor: CmsEditor;
}

const EventsRuleBooksTab: React.FC<EventsRuleBooksTabProps> = ({ canEdit, editor }) => {
  const { events, openEventOverview, addToast, logAction } = useAdmin();
  const [visibilityMap, setVisibilityMap] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    void (async () => {
      const entries = await Promise.all(
        events.map(async (event: EventItem) => {
          try {
            return [String(event.id), await fetchRuleBookVisible(String(event.id))] as const;
          } catch {
            return [String(event.id), true] as const;
          }
        })
      );
      if (!alive) return;
      setVisibilityMap(Object.fromEntries(entries));
      setLoading(false);
    })();
    return () => {
      alive = false;
    };
  }, [events]);

  const handleToggle = async (event: EventItem) => {
    const id = String(event.id);
    const current = visibilityMap[id] ?? true;
    setBusyId(id);
    try {
      await setRuleBookVisibility(id, !current, editor);
      setVisibilityMap((prev) => ({ ...prev, [id]: !current }));
      logAction(
        current ? 'Rule Book Hidden' : 'Rule Book Shown',
        `The rule book for "${event.name}" is now ${current ? 'hidden from' : 'visible on'} the event details page.`
      );
      addToast(
        current ? 'Rule Book Hidden' : 'Rule Book Visible',
        `Visitors ${current ? 'can no longer see' : 'can now see'} the "${event.name}" rule book.`,
        current ? 'warning' : 'success'
      );
    } catch (err) {
      addToast('Error', err instanceof Error ? err.message : 'Failed to update rule book visibility.', 'error');
    } finally {
      setBusyId(null);
    }
  };

  if (!events.length) {
    return (
      <div className="p-8 rounded-3xl bg-zinc-950/60 border border-white/10 text-center text-white/40 text-sm">
        No events yet. Create events in Event Management first.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-[11px] text-white/40">
        Control whether each event's rule book download appears on its public details page, and jump into the
        existing Event Description CMS for full content editing.
      </p>
      {loading && (
        <div className="flex items-center gap-2 text-white/50 text-sm py-4">
          <Loader2 className="w-4 h-4 animate-spin text-violet-400" />
          <span>Checking rule book visibility...</span>
        </div>
      )}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {events.map((event) => {
          const id = String(event.id);
          const visible = visibilityMap[id] ?? true;
          const hasRuleBook = !!event.ruleBookUrl;
          return (
            <div
              key={id}
              className="p-4 sm:p-5 rounded-3xl bg-zinc-950/60 hover:bg-zinc-900/60 border border-white/10 hover:border-white/20 transition-all duration-300 backdrop-blur-md flex flex-col gap-3"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 min-w-0">
                  <span className="mt-0.5 w-9 h-9 rounded-xl bg-violet-500/15 border border-violet-500/25 flex items-center justify-center flex-shrink-0">
                    <FileText className="w-4 h-4 text-violet-300" />
                  </span>
                  <div className="min-w-0">
                    <h4 className="font-bold text-white text-sm truncate">{event.name}</h4>
                    <span className="text-[10px] text-white/40 uppercase tracking-wider">
                      {event.category} · {event.date || 'No date'} · Status: {event.status}
                    </span>
                  </div>
                </div>
                {!hasRuleBook && (
                  <span className="px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-white/40 text-[9px] font-extrabold uppercase tracking-wider flex-shrink-0">
                    No Rule Book
                  </span>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2 mt-auto pt-1">
                <button
                  onClick={() => void handleToggle(event)}
                  disabled={!canEdit || busyId === id || !hasRuleBook}
                  title={hasRuleBook ? undefined : 'Upload a rule book first (Event Management)'}
                  className={`px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest border transition-colors cursor-pointer flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed ${
                    !hasRuleBook
                      ? 'bg-white/5 text-white/30 border-white/10'
                      : visible
                        ? 'bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border-rose-500/25'
                        : 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border-emerald-500/25'
                  }`}
                >
                  {busyId === id ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : visible ? (
                    <EyeOff className="w-3 h-3" />
                  ) : (
                    <Eye className="w-3 h-3" />
                  )}
                  {hasRuleBook ? (visible ? 'Hide Rule Book' : 'Show Rule Book') : '—'}
                </button>
                <button
                  onClick={() => openEventOverview(id)}
                  className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 border border-white/10 text-[10px] font-bold uppercase tracking-widest transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <CalendarDays className="w-3 h-3" />
                  Edit Details
                </button>
                <span className="ml-auto text-[10px] font-bold uppercase tracking-widest flex-shrink-0">
                  {hasRuleBook ? (
                    visible ? (
                      <span className="text-emerald-300">🟢 Visible</span>
                    ) : (
                      <span className="text-rose-300">🔴 Hidden</span>
                    )
                  ) : (
                    ''
                  )}
                </span>
              </div>
            </div>
          );
        })}
      </div>
      <div className="flex items-start gap-2 px-4 py-3 rounded-xl bg-violet-500/10 border border-violet-500/20 text-violet-300 text-[11px] max-w-2xl">
        <RefreshCw className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
        <span>
          Rule book files are uploaded and versioned from Admin → Event Management; this tab only controls their
          public visibility.
        </span>
      </div>
    </div>
  );
};
