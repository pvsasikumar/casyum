import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  CloudUpload,
  CloudCheck,
  CloudAlert,
  Loader2,
  Save,
  Undo2,
  Eye,
  Pencil,
  Plus,
  LayoutGrid,
  Rocket,
  ExternalLink,
} from 'lucide-react';
import type {
  CmsEditor,
  CmsSection,
  CmsSectionPadding,
  CmsSectionSettings,
  CmsSectionType,
  EventCmsData,
} from './types';
import { createCmsId, createSection, emptyCmsData, hasContent, reindexSections } from './types';
import { loadEventCms, publishEventCms, saveEventCmsDraft } from './eventCmsService';
import { slugifyEventName } from '../../services/eventSlug';
import { SectionView } from './sections/view';
import { SectionEditor } from './sections/editor';
import { SectionToolbar } from './SectionToolbar';
import { SectionSettingsModal } from './SectionSettingsModal';
import { AddSectionModal } from './AddSectionModal';
import { SECTION_META } from './sectionMeta';

interface EventOverviewCmsProps {
  eventId: string;
  canEdit: boolean;
  editor?: CmsEditor;
  stickyTopClass?: string;
  defaultView?: 'details' | 'editor';
}

type SaveState = 'idle' | 'saving' | 'saved' | 'dirty' | 'error';

const AUTOSAVE_DELAY = 1800;

const saveStateUi: Record<SaveState, { label: string; icon: React.ElementType; cls: string }> = {
  idle: { label: '', icon: CloudUpload, cls: 'text-white/40' },
  saving: { label: 'Saving...', icon: Loader2, cls: 'text-violet-300 animate-spin' },
  saved: { label: 'All changes saved', icon: CloudCheck, cls: 'text-emerald-300' },
  dirty: { label: 'Unsaved changes', icon: CloudUpload, cls: 'text-amber-300' },
  error: { label: 'Save failed', icon: CloudAlert, cls: 'text-rose-300' },
};

const PADDING: Record<CmsSectionPadding, string> = {
  none: 'p-0',
  sm: 'p-3',
  md: 'p-5',
  lg: 'p-8',
};

const SectionHeader: React.FC<{ settings: CmsSectionSettings }> = ({ settings }) => (
  <div className="flex flex-col gap-1 mb-4">
    {settings.title && <h2 className="text-lg font-extrabold font-display text-white">{settings.title}</h2>}
    {settings.subtitle && <p className="text-xs text-white/50">{settings.subtitle}</p>}
  </div>
);

export const EventOverviewCms: React.FC<EventOverviewCmsProps> = ({
  eventId,
  canEdit,
  editor,
  stickyTopClass = 'top-16',
  defaultView = 'editor',
}) => {
  const [data, setData] = useState<EventCmsData>(() => emptyCmsData(eventId));
  const [draft, setDraft] = useState<EventCmsData>(() => emptyCmsData(eventId));
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [dirty, setDirty] = useState(false);
  const saveLockRef = useRef(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dirtyRef = useRef(false);
  const draftRef = useRef(draft);
  const [settingsSectionId, setSettingsSectionId] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);
  const [lastAddedId, setLastAddedId] = useState<string | null>(null);
  const [mode, setMode] = useState<'details' | 'editor'>(defaultView === 'details' ? 'details' : 'editor');

  useEffect(() => {
    draftRef.current = draft;
  }, [draft]);

  useEffect(() => {
    dirtyRef.current = dirty;
  }, [dirty]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setLoadError('');
    loadEventCms(eventId, { draft: true })
      .then((loaded) => {
        if (cancelled) return;
        setData(loaded);
        setDraft(loaded);
        setDirty(false);
        setSaveState('saved');
      })
      .catch(() => {
        if (cancelled) return;
        setLoadError('Failed to load event content. Please try again.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [eventId]);

  useEffect(() => {
    if (!lastAddedId) return;
    const el = document.getElementById(`cms-section-${lastAddedId}`);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setLastAddedId(null);
  }, [lastAddedId]);

  const persist = useCallback(async () => {
    if (saveLockRef.current) return;
    saveLockRef.current = true;
    const snapshot = draftRef.current;
    setSaveState('saving');
    try {
      const saved = await saveEventCmsDraft(eventId, snapshot, editor || { id: 'editor', name: 'Editor', role: 'Editor' });
      setData(saved);
      // Only reset the draft if the user didn't keep typing during the save.
      if (draftRef.current === snapshot) {
        setDraft(saved);
        setDirty(false);
        dirtyRef.current = false;
        setSaveState('saved');
      } else {
        setSaveState('dirty');
      }
    } catch {
      setSaveState('error');
    } finally {
      saveLockRef.current = false;
    }
  }, [eventId, editor]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (dirty) {
      debounceRef.current = setTimeout(() => {
        void persist();
      }, AUTOSAVE_DELAY);
    }
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [draft, dirty, persist]);

  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (dirtyRef.current) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, []);

  const updateSections = useCallback((updater: (prev: CmsSection[]) => CmsSection[]) => {
    setDraft((prev) => ({ ...prev, sections: reindexSections(updater(prev.sections)) }));
    setDirty(true);
  }, []);

  const moveSection = useCallback(
    (from: number, to: number) => {
      if (from === to) return;
      updateSections((prev) => {
        const next = [...prev];
        const [moved] = next.splice(from, 1);
        next.splice(to, 0, moved);
        return next;
      });
    },
    [updateSections]
  );

  const updateSectionContent = useCallback(
    (id: string, patch: any) => {
      updateSections((prev) => prev.map((s) => (s.id === id ? { ...s, content: { ...s.content, ...patch } } : s)));
    },
    [updateSections]
  );

  const handleToggleVisible = useCallback(
    (id: string) => {
      updateSections((prev) => prev.map((s) => (s.id === id ? { ...s, isVisible: !s.isVisible } : s)));
    },
    [updateSections]
  );

  const handleDuplicate = useCallback(
    (id: string) => {
      const index = draft.sections.findIndex((s) => s.id === id);
      if (index < 0) return;
      const source = draft.sections[index];
      const copy: CmsSection = {
        ...source,
        id: createCmsId(),
        settings: { ...source.settings },
        content: JSON.parse(JSON.stringify(source.content)),
      };
      updateSections((prev) => {
        const next = [...prev];
        next.splice(index + 1, 0, copy);
        return next;
      });
    },
    [draft.sections, updateSections]
  );

  const handleDelete = useCallback(
    (id: string) => {
      const meta = draft.sections.find((s) => s.id === id);
      const label = meta ? SECTION_META[meta.sectionType].label : 'section';
      if (!window.confirm(`Delete the "${label}" section? This cannot be undone.`)) return;
      updateSections((prev) => prev.filter((s) => s.id !== id));
    },
    [draft.sections, updateSections]
  );

  const handleEditFocus = useCallback((id: string) => {
    document.getElementById(`cms-section-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);

  const handleSettingsSave = useCallback(
    (id: string, settings: CmsSectionSettings, isVisible: boolean) => {
      updateSections((prev) => prev.map((s) => (s.id === id ? { ...s, settings, isVisible } : s)));
      setSettingsSectionId(null);
    },
    [updateSections]
  );

  const handleAddSection = useCallback(
    (type: CmsSectionType) => {
      const section = createSection(type, draft.sections.length);
      updateSections((prev) => [...prev, section]);
      setShowAddModal(false);
      setLastAddedId(section.id);
    },
    [draft.sections.length, updateSections]
  );

  const handleSaveNow = useCallback(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    void persist();
  }, [persist]);

  const handleDiscard = useCallback(() => {
    setDraft(data);
    setDirty(false);
    dirtyRef.current = false;
    setSaveState('saved');
  }, [data]);

  const handlePreview = useCallback(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const heroSection = draft.sections.find((s) => s.sectionType === 'hero');
    const title = (heroSection?.content as { title?: string } | undefined)?.title?.trim();
    const slug = slugifyEventName(title || 'event-details');
    window.open(`/events/${slug}`, '_blank', 'noopener,noreferrer');
  }, [draft.sections]);

  const handlePublish = useCallback(async () => {
    if (saveLockRef.current) return;
    const snapshot = draftRef.current;
    const heroTitle = snapshot.sections.find((s) => s.sectionType === 'hero')?.content?.title?.trim?.();
    if (!window.confirm(`Publish these changes to the live event page${heroTitle ? ` for "${heroTitle}"` : ''}?`)) return;
    saveLockRef.current = true;
    setSaveState('saving');
    try {
      const published = await publishEventCms(eventId, snapshot, editor || { id: 'editor', name: 'Editor', role: 'Editor' });
      setData(published);
      if (draftRef.current === snapshot) {
        setDraft(published);
        setDirty(false);
        dirtyRef.current = false;
      }
      setSaveState('saved');
      window.open(`/events/${slugifyEventName(heroTitle || 'event-details')}`, '_blank', 'noopener,noreferrer');
    } catch {
      setSaveState('error');
    } finally {
      saveLockRef.current = false;
    }
  }, [eventId, editor]);

  const handleDragStart = (index: number) => (e: React.DragEvent) => {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', String(index));
    setDragIndex(index);
  };

  const handleDragEnd = () => {
    setDragIndex(null);
    setOverIndex(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="flex items-center gap-3 text-white/50 text-sm">
          <Loader2 className="w-5 h-5 animate-spin text-violet-400" />
          <span>Loading event content...</span>
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="flex flex-col items-center gap-4 py-24">
        <CloudAlert className="w-8 h-8 text-rose-400" />
        <p className="text-sm text-white/60">{loadError}</p>
        <button
          onClick={() => {
            setLoading(true);
            setLoadError('');
            loadEventCms(eventId, { draft: true })
              .then((l) => {
                setData(l);
                setDraft(l);
                setDirty(false);
                setSaveState('saved');
              })
              .catch(() => setLoadError('Failed to load event content. Please try again.'))
              .finally(() => setLoading(false));
          }}
          className="px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold cursor-pointer"
        >
          Retry
        </button>
      </div>
    );
  }

  const sections = draft.sections;
  const visibleSections = sections.filter((section) => section.isVisible && hasContent(section));
  const editing = canEdit && mode === 'editor';
  const isSuperAdmin = editor?.role === 'Super Admin';
  const settingsSection = sections.find((s) => s.id === settingsSectionId) || null;
  const status = saveStateUi[saveState];
  const StatusIcon = status.icon;

  return (
    <div className="flex flex-col gap-5">
      {/* Editor toolbar */}
      <div className={`sticky ${stickyTopClass} z-30 rounded-2xl bg-black/70 backdrop-blur-md border border-white/10 p-3 flex flex-wrap items-center justify-between gap-3`}>
        <div className="flex items-center gap-3">
          {editing && (
            <span className={`flex items-center gap-1.5 text-[11px] font-bold ${status.cls}`}>
              <StatusIcon className={`w-3.5 h-3.5 ${saveState === 'saving' ? 'animate-spin' : ''}`} />
              {status.label || 'Ready'}
            </span>
          )}
          {!editing && (
            <span className="flex items-center gap-1.5 text-[11px] font-bold text-white/50">
              <Eye className="w-3 h-3" />
              {canEdit ? 'Previewing event details' : 'Read only'}
            </span>
          )}
          {data.meta.updatedAt && (
            <span className="hidden sm:flex items-center gap-1.5 text-[10px] text-white/40">
              Last updated {new Date(data.meta.updatedAt).toLocaleString()} by{' '}
              <span className="text-white/70 font-semibold">{data.meta.updatedByName || data.meta.updatedBy || '—'}</span>
            </span>
          )}
          {data.meta.updatedAt && (
            <span className="hidden md:flex items-center gap-1.5 text-[10px] text-amber-300/80">
              <CloudUpload className="w-3 h-3" />
              Draft saved {new Date(data.meta.updatedAt).toLocaleString()}
            </span>
          )}
          {data.meta.publishedAt && (
            <span className="hidden md:flex items-center gap-1.5 text-[10px] text-emerald-300/80">
              <Rocket className="w-3 h-3" />
              Published {new Date(data.meta.publishedAt).toLocaleString()}
              {data.meta.publishedByName && (
                <span className="text-white/60">by {data.meta.publishedByName}</span>
              )}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {editing && defaultView === 'details' && (
            <button
              onClick={() => setMode('details')}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white/70 hover:text-white hover:border-violet-500/40 text-[11px] font-bold cursor-pointer"
            >
              <Eye className="w-3.5 h-3.5" />
              View Details
            </button>
          )}
          {editing && (
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white/70 hover:text-white hover:border-violet-500/40 text-[11px] font-bold cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Section
            </button>
          )}
          {editing && (
            <button
              onClick={handleDiscard}
              disabled={!dirty}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white/60 hover:text-white disabled:opacity-40 text-[11px] font-bold cursor-pointer disabled:cursor-not-allowed"
            >
              <Undo2 className="w-3.5 h-3.5" />
              Discard
            </button>
          )}
          {editing && (
            <button
              onClick={handlePreview}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white/70 hover:text-white hover:border-violet-500/40 text-[11px] font-bold cursor-pointer"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Preview Event Page
            </button>
          )}
          {editing && (
            <button
              onClick={() => void handlePublish()}
              disabled={saveState === 'saving'}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-[11px] font-bold shadow-lg shadow-emerald-500/25 cursor-pointer disabled:cursor-not-allowed"
            >
              <Rocket className="w-3.5 h-3.5" />
              Publish Changes
            </button>
          )}
          {editing && (
            <button
              onClick={handleSaveNow}
              disabled={!dirty || saveState === 'saving'}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white text-[11px] font-bold shadow-lg shadow-violet-500/25 cursor-pointer disabled:cursor-not-allowed"
            >
              {saveState === 'saving' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              Save Changes
            </button>
          )}
          {!editing && canEdit && (
            <button
              onClick={() => setMode('editor')}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-[11px] font-bold shadow-lg shadow-violet-500/25 cursor-pointer"
            >
              <Pencil className="w-3.5 h-3.5" />
              Edit Content
            </button>
          )}
        </div>
      </div>

      {/* Unsaved changes warning */}
      {editing && dirty && (
        <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 rounded-2xl bg-amber-500/10 border border-amber-500/25 text-amber-300 text-xs">
          <span>You have unsaved changes. They will be auto-saved shortly, or you can save them now.</span>
          <button onClick={handleSaveNow} className="px-3 py-1.5 rounded-lg bg-amber-500/20 text-amber-200 hover:bg-amber-500/30 font-bold cursor-pointer">
            Save Now
          </button>
        </div>
      )}

      {/* Edit mode indicator */}
      <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest">
        {editing ? (
          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-violet-500/15 text-violet-300 border border-violet-500/25">
            <Pencil className="w-3 h-3" />
            Edit Mode
          </span>
        ) : canEdit ? (
          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/5 text-white/50 border border-white/10">
            <Eye className="w-3 h-3" />
            Event Details
          </span>
        ) : (
          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/5 text-white/50 border border-white/10">
            <Eye className="w-3 h-3" />
            Read Only
          </span>
        )}
        <span className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/5 text-white/40 border border-white/10">
          <LayoutGrid className="w-3 h-3" />
          {editing ? sections.length : visibleSections.length} sections
        </span>
      </div>

      {/* Sections */}
      {editing ? (
        sections.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-16 rounded-3xl border border-dashed border-white/15 bg-white/[0.02]">
            <LayoutGrid className="w-8 h-8 text-white/30" />
            <p className="text-sm text-white/50">No sections yet.</p>
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              Add your first section
            </button>
          </div>
        ) : (
          sections.map((section, index) => {
            const meta = SECTION_META[section.sectionType];
            const s = section.settings;
            const isOver = overIndex === index;
            return (
              <div
                key={section.id}
                id={s.anchorId || `cms-section-${section.id}`}
                className={`rounded-3xl border bg-white/[0.03] transition-colors scroll-mt-32 ${
                  isOver ? 'border-violet-500/60 ring-2 ring-violet-500/30' : 'border-white/10'
                } ${s.cssClass || ''}`}
                style={s.background ? { backgroundColor: s.background } : undefined}
                onDragOver={(e) => {
                  if (dragIndex === null || dragIndex === index) return;
                  e.preventDefault();
                  setOverIndex(index);
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  if (dragIndex === null || dragIndex === index) return;
                  moveSection(dragIndex, index);
                  setDragIndex(null);
                  setOverIndex(null);
                }}
              >
                <div className="p-3 border-b border-white/10">
                  <SectionToolbar
                    label={meta.label}
                    isVisible={section.isVisible}
                    index={index}
                    total={sections.length}
                    onDragStart={handleDragStart(index)}
                    onDragEnd={handleDragEnd}
                    onToggleVisible={() => handleToggleVisible(section.id)}
                    onEdit={() => handleEditFocus(section.id)}
                    onDuplicate={() => handleDuplicate(section.id)}
                    onMoveUp={() => moveSection(index, index - 1)}
                    onMoveDown={() => moveSection(index, index + 1)}
                    onDelete={() => handleDelete(section.id)}
                    onSettings={() => setSettingsSectionId(section.id)}
                  />
                </div>
                <div className="p-5">
                  {(s.title || s.subtitle) && <SectionHeader settings={s} />}
                  <SectionEditor section={section} eventId={eventId} onChange={(patch) => updateSectionContent(section.id, patch)} />
                </div>
              </div>
            );
          })
        )
      ) : visibleSections.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-16 rounded-3xl border border-dashed border-white/15 bg-white/[0.02]">
          <Eye className="w-8 h-8 text-white/30" />
          <p className="text-sm text-white/50">No content has been added to this event yet.</p>
          {canEdit && (
            <button
              onClick={() => setMode('editor')}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Content
            </button>
          )}
        </div>
      ) : (
        visibleSections.map((section) => {
          const s = section.settings;
          return (
            <div
              key={section.id}
              id={s.anchorId || `cms-section-${section.id}`}
              className={`rounded-3xl border border-white/10 bg-white/[0.03] ${s.cssClass || ''}`}
              style={s.background ? { backgroundColor: s.background } : undefined}
            >
              <div className={PADDING[s.padding] || PADDING.md}>
                {(s.title || s.subtitle) && <SectionHeader settings={s} />}
                <SectionView section={section} />
              </div>
            </div>
          );
        })
      )}

      {/* Modals */}
      {showAddModal && (
        <AddSectionModal
          existingTypes={sections.map((s) => s.sectionType)}
          isSuperAdmin={isSuperAdmin}
          onClose={() => setShowAddModal(false)}
          onAdd={handleAddSection}
        />
      )}
      {settingsSection && (
        <SectionSettingsModal
          settings={settingsSection.settings}
          isVisible={settingsSection.isVisible}
          onClose={() => setSettingsSectionId(null)}
          onSave={(settings, isVisible) => handleSettingsSave(settingsSection.id, settings, isVisible)}
        />
      )}
    </div>
  );
};
