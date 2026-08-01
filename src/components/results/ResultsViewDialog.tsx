import React from 'react';
import { X, Award, Users, UserRound, History } from 'lucide-react';
import type { ResultEntry } from './types';
import { resultMemberNames, resultPositionLabel } from './types';

const cellClass = 'flex flex-col gap-0.5 rounded-xl bg-white/[0.03] border border-white/10 p-3';
const cellLabelClass = 'text-[9px] font-bold uppercase tracking-widest text-white/40';
const cellValueClass = 'text-xs text-white/85 break-words';

function formatDate(value: string): string {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString();
}

interface ResultsViewDialogProps {
  entry: ResultEntry;
  onClose: () => void;
}

export const ResultsViewDialog: React.FC<ResultsViewDialogProps> = ({ entry, onClose }) => {
  const members = resultMemberNames(entry);
  const isPublished = entry.status === 'Published';

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-zinc-950 border border-white/10 rounded-3xl shadow-2xl custom-scrollbar">
        {/* Header */}
        <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between gap-3 sticky top-0 bg-zinc-950 z-10">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-violet-500/15 text-violet-300 border border-violet-500/25">
              <Award className="w-4 h-4" />
            </div>
            <div className="flex flex-col gap-0.5">
              <h3 className="text-sm font-extrabold font-display text-white">{resultPositionLabel(entry)}</h3>
              <span className="text-[10px] text-white/40">{entry.eventName}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold border ${
                isPublished
                  ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                  : 'bg-amber-500/15 text-amber-300 border-amber-500/30'
              }`}
            >
              {entry.status}
            </span>
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-white/5 border border-white/10 text-white/60 hover:text-white hover:border-violet-500/40 cursor-pointer transition-all"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="px-5 py-4 flex flex-col gap-4">
          {/* Winner */}
          <div className="flex items-center gap-2.5 rounded-2xl border border-violet-500/25 bg-violet-500/10 p-3">
            {entry.entryType === 'Team' ? (
              <Users className="w-5 h-5 text-violet-300 flex-shrink-0" />
            ) : (
              <UserRound className="w-5 h-5 text-violet-300 flex-shrink-0" />
            )}
            <div className="flex flex-col min-w-0">
              <span className="text-[9px] font-bold uppercase tracking-widest text-white/40">{entry.entryType}</span>
              <span className="text-sm font-bold text-white break-words">
                {entry.entryType === 'Team' ? entry.teamName : entry.participantName}
              </span>
              {members && <span className="text-[11px] text-white/60">{members}</span>}
            </div>
          </div>

          {/* Detail grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div className={cellClass}>
              <span className={cellLabelClass}>Position</span>
              <span className={cellValueClass}>{resultPositionLabel(entry)}</span>
            </div>
            <div className={cellClass}>
              <span className={cellLabelClass}>Entry Type</span>
              <span className={cellValueClass}>{entry.entryType}</span>
            </div>
            <div className={cellClass}>
              <span className={cellLabelClass}>College</span>
              <span className={cellValueClass}>{entry.college || '—'}</span>
            </div>
            <div className={cellClass}>
              <span className={cellLabelClass}>Department</span>
              <span className={cellValueClass}>{entry.department || '—'}</span>
            </div>
            <div className={cellClass}>
              <span className={cellLabelClass}>Year</span>
              <span className={cellValueClass}>{entry.year || '—'}</span>
            </div>
            <div className={cellClass}>
              <span className={cellLabelClass}>Register Number</span>
              <span className={cellValueClass}>{entry.registerNumber || '—'}</span>
            </div>
            <div className={cellClass}>
              <span className={cellLabelClass}>Prize</span>
              <span className={cellValueClass}>{entry.prize || '—'}</span>
            </div>
            <div className={cellClass}>
              <span className={cellLabelClass}>Remarks</span>
              <span className={cellValueClass}>{entry.remarks || '—'}</span>
            </div>
          </div>

          {entry.coordinatorNotes && (
            <div className={cellClass}>
              <span className={cellLabelClass}>Coordinator Notes</span>
              <span className={`${cellValueClass} whitespace-pre-wrap`}>{entry.coordinatorNotes}</span>
            </div>
          )}

          {/* Audit */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-white/40">
              <History className="w-3.5 h-3.5" />
              History
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <div className={cellClass}>
                <span className={cellLabelClass}>Created By</span>
                <span className={cellValueClass}>{entry.createdByName || entry.createdBy || '—'}</span>
                <span className="text-[10px] text-white/40 mt-0.5">{formatDate(entry.createdAt)}</span>
              </div>
              <div className={cellClass}>
                <span className={cellLabelClass}>Updated By</span>
                <span className={cellValueClass}>{entry.updatedByName || entry.updatedBy || '—'}</span>
                <span className="text-[10px] text-white/40 mt-0.5">{formatDate(entry.updatedAt)}</span>
              </div>
              <div className={cellClass}>
                <span className={cellLabelClass}>Published By</span>
                <span className={cellValueClass}>{entry.publishedByName || entry.publishedBy || '—'}</span>
                <span className="text-[10px] text-white/40 mt-0.5">{formatDate(entry.publishedAt)}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="px-5 py-4 border-t border-white/10 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white/70 hover:text-white text-xs font-bold cursor-pointer transition-all"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
