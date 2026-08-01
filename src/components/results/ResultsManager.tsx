import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  CloudUpload,
  CloudCheck,
  CloudAlert,
  Loader2,
  Save,
  Send,
  FileText,
  FileSpreadsheet,
  Plus,
  Search,
  Eye,
  Pencil,
  Trash2,
  Copy,
  BarChart3,
  LayoutGrid,
  CheckCircle2,
  FileEdit,
} from 'lucide-react';
import type {
  ResultEntry,
  ResultEntryType,
  ResultPosition,
  ResultSortBy,
  ResultStatus,
} from './types';
import {
  RESULT_POSITIONS,
  buildResultSearchText,
  compareByPosition,
  createResultEntry,
  resultDisplayName,
  resultPositionLabel,
} from './types';
import { deleteResultEntries, listResultsByEvent, saveResultEntries } from '../../services/resultsService';
import { exportResultsExcel, exportResultsPdf } from './exportUtils';
import { ResultsEditorDrawer } from './ResultsEditorDrawer';
import { ResultsViewDialog } from './ResultsViewDialog';

interface ResultsManagerProps {
  events: Array<{ id: string; name: string; date: string }>;
  editor: { id: string; name: string; role: string };
  canEditPublished?: boolean;
  stickyTopClass?: string;
}

type SaveState = 'idle' | 'saving' | 'saved' | 'dirty' | 'error';

const AUTOSAVE_DELAY = 1800;

interface ToastMsg {
  id: string;
  title: string;
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
}

function formatDate(value: string): string {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString();
}

export const ResultsManager: React.FC<ResultsManagerProps> = ({
  events,
  editor,
  canEditPublished = false,
  stickyTopClass = 'top-16',
}) => {
  const [selectedEventId, setSelectedEventId] = useState<string>(events[0]?.id ?? '');
  const [reloadKey, setReloadKey] = useState(0);
  const selectedEvent = events.find((e) => e.id === selectedEventId) ?? events[0];

  const [entries, setEntries] = useState<ResultEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [dirty, setDirty] = useState(false);

  const entriesRef = useRef(entries);
  const deletedIdsRef = useRef<string[]>([]);
  const dirtyRef = useRef(false);
  const saveLockRef = useRef(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [search, setSearch] = useState('');
  const [positionFilter, setPositionFilter] = useState<'All' | ResultPosition>('All');
  const [typeFilter, setTypeFilter] = useState<'All' | ResultEntryType>('All');
  const [statusFilter, setStatusFilter] = useState<'All' | ResultStatus>('All');
  const [sortBy, setSortBy] = useState<ResultSortBy>('newest');

  const [drawerEntry, setDrawerEntry] = useState<ResultEntry | null>(null);
  const [isNewEntry, setIsNewEntry] = useState(false);
  const [viewEntry, setViewEntry] = useState<ResultEntry | null>(null);

  const [toasts, setToasts] = useState<ToastMsg[]>([]);

  useEffect(() => {
    entriesRef.current = entries;
  }, [entries]);

  useEffect(() => {
    dirtyRef.current = dirty;
  }, [dirty]);

  const notify = useCallback((title: string, message: string, type: ToastMsg['type']) => {
    const id = `res-toast-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    setToasts((prev) => [...prev, { id, title, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setLoadError('');
    if (!selectedEvent) {
      setLoading(false);
      return;
    }
    listResultsByEvent(selectedEvent.id)
      .then((rows) => {
        if (cancelled) return;
        setEntries(rows);
        entriesRef.current = rows;
        setDirty(false);
        dirtyRef.current = false;
        deletedIdsRef.current = [];
        setSaveState('saved');
      })
      .catch(() => {
        if (cancelled) return;
        setLoadError('Failed to load results. Please try again.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedEventId, reloadKey]);

  const persist = useCallback(async () => {
    if (saveLockRef.current) return;
    saveLockRef.current = true;
    const snapshot = entriesRef.current;
    const deletes = deletedIdsRef.current;
    setSaveState('saving');
    try {
      const jobs: Promise<void>[] = [saveResultEntries(snapshot)];
      if (deletes.length) jobs.push(deleteResultEntries(deletes));
      await Promise.all(jobs);
      deletedIdsRef.current = [];
      if (entriesRef.current === snapshot) {
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
      if (dirtyRef.current) {
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => {
          void persist();
        }, AUTOSAVE_DELAY);
      }
    }
  }, []);

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
  }, [dirty, persist]);

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

  const commitEntries = useCallback((updater: (prev: ResultEntry[]) => ResultEntry[]) => {
    setEntries((prev) => {
      const next = updater(prev);
      entriesRef.current = next;
      return next;
    });
    setDirty(true);
    dirtyRef.current = true;
    setSaveState('dirty');
  }, []);

  const handleSaveDraft = useCallback(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    void persist();
  }, [persist]);

  const handleAddResult = useCallback(() => {
    if (!selectedEvent) return;
    setDrawerEntry(createResultEntry(selectedEvent, editor));
    setIsNewEntry(true);
  }, [selectedEvent, editor]);

  const handleEdit = useCallback(
    (entry: ResultEntry) => {
      setDrawerEntry({ ...entry, members: entry.members.map((m) => ({ ...m })) });
      setIsNewEntry(false);
    },
    []
  );

  const handleDuplicate = useCallback(
    (entry: ResultEntry) => {
      if (!selectedEvent) return;
      const copy: ResultEntry = {
        ...createResultEntry(selectedEvent, editor),
        position: entry.position,
        customPosition: entry.customPosition,
        entryType: entry.entryType,
        participantName: entry.participantName,
        registerNumber: entry.registerNumber,
        teamName: entry.teamName,
        members: entry.members.map((m) => ({ ...m })),
        college: entry.college,
        department: entry.department,
        year: entry.year,
        prize: entry.prize,
        remarks: entry.remarks,
        coordinatorNotes: entry.coordinatorNotes,
        status: 'Draft',
      };
      setDrawerEntry(copy);
      setIsNewEntry(true);
    },
    [selectedEvent, editor]
  );

  const handleDelete = useCallback(
    (entry: ResultEntry) => {
      if (!window.confirm(`Delete the ${resultPositionLabel(entry)} result for "${resultDisplayName(entry)}"? This cannot be undone.`)) {
        return;
      }
      commitEntries((prev) => prev.filter((e) => e.id !== entry.id));
      deletedIdsRef.current = [...deletedIdsRef.current, entry.id];
    },
    [commitEntries]
  );

  const handleDrawerSave = useCallback(
    (updated: ResultEntry) => {
      const ts = new Date().toISOString();
      const next: ResultEntry = isNewEntry
        ? updated
        : { ...updated, updatedBy: editor.id, updatedByName: editor.name, updatedAt: ts };
      setEntries((prev) => {
        const exists = prev.some((e) => e.id === next.id);
        const result = exists ? prev.map((e) => (e.id === next.id ? next : e)) : [...prev, next];
        entriesRef.current = result;
        return result;
      });
      setDirty(true);
      dirtyRef.current = true;
      setSaveState('dirty');
      setDrawerEntry(null);
      setIsNewEntry(false);
    },
    [isNewEntry, editor]
  );

  const handlePublish = useCallback(async () => {
    if (!selectedEvent) return;
    if (entries.length === 0) {
      notify('No results to publish', 'Add at least one result entry first.', 'warning');
      return;
    }
    if (
      !window.confirm(
        `Publish results for "${selectedEvent.name}"? Published results are finalized as the official internal record and become read-only for coordinators.`
      )
    ) {
      return;
    }
    const ts = new Date().toISOString();
    const published = entries.map((e) =>
      e.status === 'Published'
        ? e
        : {
            ...e,
            status: 'Published' as const,
            publishedBy: editor.id,
            publishedByName: editor.name,
            publishedAt: ts,
            updatedBy: editor.id,
            updatedByName: editor.name,
            updatedAt: ts,
          }
    );
    setEntries(published);
    entriesRef.current = published;
    setDirty(true);
    dirtyRef.current = true;
    setSaveState('dirty');
    if (debounceRef.current) clearTimeout(debounceRef.current);
    await persist();
    notify('Results published', 'The official results have been finalized as an internal record.', 'success');
  }, [entries, selectedEvent, editor, persist, notify]);

  const canEditEntry = (entry: ResultEntry) => entry.status !== 'Published' || canEditPublished;

  const visibleEntries = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = entries.filter((e) => !q || buildResultSearchText(e).includes(q));
    if (positionFilter !== 'All') list = list.filter((e) => e.position === positionFilter);
    if (typeFilter !== 'All') list = list.filter((e) => e.entryType === typeFilter);
    if (statusFilter !== 'All') list = list.filter((e) => e.status === statusFilter);
    switch (sortBy) {
      case 'newest':
        list = [...list].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
        break;
      case 'oldest':
        list = [...list].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
        break;
      case 'position':
        list = [...list].sort(compareByPosition);
        break;
      case 'college':
        list = [...list].sort((a, b) => {
          const diff = a.college.localeCompare(b.college);
          if (diff !== 0) return diff;
          return resultDisplayName(a).localeCompare(resultDisplayName(b));
        });
        break;
    }
    return list;
  }, [entries, search, positionFilter, typeFilter, statusFilter, sortBy]);

  const publishedCount = entries.filter((e) => e.status === 'Published').length;
  const overallStatus: ResultStatus =
    entries.length > 0 && publishedCount === entries.length ? 'Published' : 'Draft';

  const handleExportPdf = useCallback(async () => {
    if (!selectedEvent) return;
    if (visibleEntries.length === 0) {
      notify('Nothing to export', 'No results match the current filters.', 'warning');
      return;
    }
    try {
      await exportResultsPdf(visibleEntries, { eventName: selectedEvent.name, eventDate: selectedEvent.date });
      notify('PDF exported', 'The results PDF has been downloaded.', 'success');
    } catch {
      notify('Export failed', 'Could not generate the PDF. Please try again.', 'error');
    }
  }, [visibleEntries, selectedEvent, notify]);

  const handleExportExcel = useCallback(async () => {
    if (!selectedEvent) return;
    if (visibleEntries.length === 0) {
      notify('Nothing to export', 'No results match the current filters.', 'warning');
      return;
    }
    try {
      await exportResultsExcel(visibleEntries, { eventName: selectedEvent.name, eventDate: selectedEvent.date });
      notify('Excel exported', 'The results Excel file has been downloaded.', 'success');
    } catch {
      notify('Export failed', 'Could not generate the Excel file. Please try again.', 'error');
    }
  }, [visibleEntries, selectedEvent, notify]);

  const selectClass =
    'bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-xs focus:outline-none focus:border-violet-500/50 transition-all text-white/80 appearance-none cursor-pointer';

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="flex items-center gap-3 text-white/50 text-sm">
          <Loader2 className="w-5 h-5 animate-spin text-violet-400" />
          <span>Loading results...</span>
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
          onClick={() => setReloadKey((k) => k + 1)}
          className="px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold cursor-pointer"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Sticky action bar */}
      <div className={`sticky ${stickyTopClass} z-30 rounded-2xl bg-black/70 backdrop-blur-md border border-white/10 p-3 flex flex-col gap-3`}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3 flex-wrap">
            {events.length > 1 && (
              <select
                value={selectedEventId}
                onChange={(e) => setSelectedEventId(e.target.value)}
                className={selectClass}
              >
                {events.map((ev) => (
                  <option key={ev.id} value={ev.id} className="bg-zinc-900">
                    {ev.name}
                  </option>
                ))}
              </select>
            )}
            <span
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold border ${
                overallStatus === 'Published'
                  ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                  : 'bg-amber-500/15 text-amber-300 border-amber-500/30'
              }`}
            >
              {overallStatus === 'Published' ? <CheckCircle2 className="w-3 h-3" /> : <FileEdit className="w-3 h-3" />}
              {overallStatus}
            </span>
            <span className="hidden sm:flex items-center gap-1 text-[10px] text-white/40">
              <LayoutGrid className="w-3 h-3" />
              {entries.length} entries · {publishedCount} published
            </span>
            {saveState !== 'idle' && saveState !== 'saved' && (
              <span
                className={`flex items-center gap-1.5 text-[11px] font-bold ${
                  saveState === 'saving'
                    ? 'text-violet-300'
                    : saveState === 'error'
                      ? 'text-rose-300'
                      : saveState === 'dirty'
                        ? 'text-amber-300'
                        : 'text-emerald-300'
                }`}
              >
                {saveState === 'saving' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : saveState === 'error' ? <CloudAlert className="w-3.5 h-3.5" /> : saveState === 'dirty' ? <CloudUpload className="w-3.5 h-3.5" /> : <CloudCheck className="w-3.5 h-3.5" />}
                {saveState === 'saving' ? 'Saving...' : saveState === 'error' ? 'Save failed' : 'Unsaved changes'}
              </span>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleSaveDraft}
              disabled={!dirty || saveState === 'saving'}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white/70 hover:text-white disabled:opacity-40 text-[11px] font-bold cursor-pointer disabled:cursor-not-allowed transition-all"
            >
              <Save className="w-3.5 h-3.5" />
              Save Draft
            </button>
            <button
              onClick={handlePublish}
              disabled={entries.length === 0 || saveState === 'saving'}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-[11px] font-bold shadow-lg shadow-emerald-500/25 cursor-pointer disabled:cursor-not-allowed transition-all"
            >
              <Send className="w-3.5 h-3.5" />
              Publish Results
            </button>
            <button
              onClick={handleExportPdf}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white/70 hover:text-white hover:border-violet-500/40 text-[11px] font-bold cursor-pointer transition-all"
            >
              <FileText className="w-3.5 h-3.5" />
              Export PDF
            </button>
            <button
              onClick={handleExportExcel}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white/70 hover:text-white hover:border-violet-500/40 text-[11px] font-bold cursor-pointer transition-all"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              Export Excel
            </button>
          </div>
        </div>

        {/* Search + filters */}
        <div className="flex flex-col lg:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-white/40 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, team, college, department or register number..."
              className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm focus:outline-none focus:border-violet-500/50 transition-all font-sans text-white placeholder-white/30"
            />
          </div>
          <select
            value={positionFilter}
            onChange={(e) => setPositionFilter(e.target.value as 'All' | ResultPosition)}
            className={selectClass}
          >
            <option value="All" className="bg-zinc-900">All Positions</option>
            {RESULT_POSITIONS.map((p) => (
              <option key={p} value={p} className="bg-zinc-900">{p}</option>
            ))}
          </select>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as 'All' | ResultEntryType)}
            className={selectClass}
          >
            <option value="All" className="bg-zinc-900">All Types</option>
            <option value="Individual" className="bg-zinc-900">Individual</option>
            <option value="Team" className="bg-zinc-900">Team</option>
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as 'All' | ResultStatus)}
            className={selectClass}
          >
            <option value="All" className="bg-zinc-900">All Status</option>
            <option value="Draft" className="bg-zinc-900">Draft</option>
            <option value="Published" className="bg-zinc-900">Published</option>
          </select>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as ResultSortBy)}
            className={selectClass}
          >
            <option value="newest" className="bg-zinc-900">Newest</option>
            <option value="oldest" className="bg-zinc-900">Oldest</option>
            <option value="position" className="bg-zinc-900">Position</option>
            <option value="college" className="bg-zinc-900">College</option>
          </select>
          <button
            onClick={handleAddResult}
            className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-[11px] font-bold shadow-lg shadow-violet-500/25 cursor-pointer transition-all"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Result
          </button>
        </div>
      </div>

      {/* Table */}
      {entries.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-16 rounded-3xl border border-dashed border-white/15 bg-white/[0.02]">
          <BarChart3 className="w-8 h-8 text-white/30" />
          <p className="text-sm text-white/50">No results have been recorded for this event yet.</p>
          <button
            onClick={handleAddResult}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Result
          </button>
        </div>
      ) : visibleEntries.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-16 rounded-3xl border border-dashed border-white/15 bg-white/[0.02]">
          <Search className="w-8 h-8 text-white/30" />
          <p className="text-sm text-white/50">No results match the current filters.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-3xl border border-white/10 bg-white/[0.02]">
          <table className="w-full min-w-[960px] text-left">
            <thead>
              <tr className="border-b border-white/10 text-[9px] font-bold uppercase tracking-widest text-white/40">
                <th className="px-4 py-3">Position</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">College</th>
                <th className="px-4 py-3">Department</th>
                <th className="px-4 py-3">Year</th>
                <th className="px-4 py-3">Created By</th>
                <th className="px-4 py-3">Created Date</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {visibleEntries.map((entry) => {
                const editable = canEditEntry(entry);
                return (
                  <tr
                    key={entry.id}
                    className="border-b border-white/5 hover:bg-white/[0.03] transition-colors"
                  >
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center px-2 py-1 rounded-lg bg-violet-500/15 text-violet-300 border border-violet-500/25 text-[10px] font-bold whitespace-nowrap">
                        {resultPositionLabel(entry)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center px-2 py-1 rounded-lg text-[10px] font-bold whitespace-nowrap border ${
                          entry.entryType === 'Team'
                            ? 'bg-cyan-500/15 text-cyan-300 border-cyan-500/25'
                            : 'bg-white/5 text-white/60 border-white/10'
                        }`}
                      >
                        {entry.entryType}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col min-w-0 max-w-[220px]">
                        <span className="text-xs font-bold text-white truncate">{resultDisplayName(entry)}</span>
                        {entry.entryType === 'Team' && entry.members.length > 0 && (
                          <span className="text-[10px] text-white/40 truncate">
                            {entry.members.filter((m) => m.name).map((m) => m.name).join(', ')}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-white/70">{entry.college || '—'}</td>
                    <td className="px-4 py-3 text-xs text-white/70">{entry.department || '—'}</td>
                    <td className="px-4 py-3 text-xs text-white/70">{entry.year || '—'}</td>
                    <td className="px-4 py-3 text-xs text-white/70">{entry.createdByName || entry.createdBy || '—'}</td>
                    <td className="px-4 py-3 text-xs text-white/50 whitespace-nowrap">{formatDate(entry.createdAt)}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center px-2 py-1 rounded-full text-[10px] font-bold border ${
                          entry.status === 'Published'
                            ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                            : 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                        }`}
                      >
                        {entry.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => setViewEntry(entry)}
                          title="View"
                          className="p-1.5 rounded-lg bg-white/5 border border-white/10 text-white/60 hover:text-violet-300 hover:border-violet-500/40 cursor-pointer transition-all"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleEdit(entry)}
                          disabled={!editable}
                          title={editable ? 'Edit' : 'Published results are read-only for coordinators'}
                          className="p-1.5 rounded-lg bg-white/5 border border-white/10 text-white/60 hover:text-violet-300 hover:border-violet-500/40 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-all"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDuplicate(entry)}
                          title="Duplicate"
                          className="p-1.5 rounded-lg bg-white/5 border border-white/10 text-white/60 hover:text-cyan-300 hover:border-cyan-500/40 cursor-pointer transition-all"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(entry)}
                          title="Delete"
                          className="p-1.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 hover:bg-rose-500/20 cursor-pointer transition-all"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Drawer + dialogs */}
      {drawerEntry && (
        <ResultsEditorDrawer
          key={drawerEntry.id}
          entry={drawerEntry}
          isNew={isNewEntry}
          onSave={handleDrawerSave}
          onClose={() => {
            setDrawerEntry(null);
            setIsNewEntry(false);
          }}
        />
      )}
      {viewEntry && <ResultsViewDialog entry={viewEntry} onClose={() => setViewEntry(null)} />}

      {/* Toast container */}
      <div className="fixed bottom-4 right-4 z-[99999] flex flex-col gap-2 max-w-sm">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`rounded-2xl border p-3 bg-zinc-950/95 backdrop-blur-md shadow-2xl ${
              t.type === 'success'
                ? 'border-emerald-500/30'
                : t.type === 'error'
                  ? 'border-rose-500/30'
                  : t.type === 'warning'
                    ? 'border-amber-500/30'
                    : 'border-white/10'
            }`}
          >
            <p
              className={`text-xs font-bold ${
                t.type === 'success'
                  ? 'text-emerald-300'
                  : t.type === 'error'
                    ? 'text-rose-300'
                    : t.type === 'warning'
                      ? 'text-amber-300'
                      : 'text-white'
              }`}
            >
              {t.title}
            </p>
            <p className="text-[11px] text-white/60 mt-0.5">{t.message}</p>
          </div>
        ))}
      </div>
    </div>
  );
};
