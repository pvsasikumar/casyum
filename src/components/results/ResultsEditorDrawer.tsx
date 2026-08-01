import React, { useState } from 'react';
import { X, Plus, Trash2, Users, UserRound, Save, Award } from 'lucide-react';
import type { ResultEntry } from './types';
import { createMemberId, isValidResultEntry, RESULT_ENTRY_TYPES, RESULT_POSITIONS } from './types';

const inputClass =
  'w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-violet-500/50 transition-all font-sans text-white placeholder-white/30';
const labelClass = 'text-[10px] font-bold uppercase tracking-widest text-white/40';

interface ResultsEditorDrawerProps {
  entry: ResultEntry;
  isNew: boolean;
  onSave: (entry: ResultEntry) => void;
  onClose: () => void;
}

export const ResultsEditorDrawer: React.FC<ResultsEditorDrawerProps> = ({ entry, isNew, onSave, onClose }) => {
  const [draft, setDraft] = useState<ResultEntry>(() => ({ ...entry, members: entry.members.map((m) => ({ ...m })) }));

  const patch = (partial: Partial<ResultEntry>) => setDraft((prev) => ({ ...prev, ...partial }));

  const patchMember = (id: string, partial: Partial<{ name: string; registerNumber: string }>) =>
    setDraft((prev) => ({
      ...prev,
      members: prev.members.map((m) => (m.id === id ? { ...m, ...partial } : m)),
    }));

  const addMember = () =>
    setDraft((prev) => ({
      ...prev,
      members: [...prev.members, { id: createMemberId(), name: '', registerNumber: '' }],
    }));

  const removeMember = (id: string) =>
    setDraft((prev) => ({ ...prev, members: prev.members.filter((m) => m.id !== id) }));

  const valid = isValidResultEntry(draft);

  return (
    <div className="fixed inset-0 z-[9998] flex justify-end">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-2xl h-full bg-zinc-950 border-l border-white/10 shadow-2xl flex flex-col animate-[slideInRight_0.25s_ease-out]">
        {/* Header */}
        <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-violet-500/15 text-violet-300 border border-violet-500/25">
              <Award className="w-4 h-4" />
            </div>
            <div className="flex flex-col">
              <h3 className="text-sm font-extrabold font-display text-white">
                {isNew ? 'Add Result' : 'Edit Result'}
              </h3>
              <span className="text-[10px] text-white/40">{draft.eventName}</span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-white/5 border border-white/10 text-white/60 hover:text-white hover:border-violet-500/40 cursor-pointer transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-5 custom-scrollbar">
          {/* Position + Entry type */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <span className={labelClass}>Position</span>
              <select
                value={draft.position}
                onChange={(e) => patch({ position: e.target.value as ResultEntry['position'] })}
                className={`${inputClass} appearance-none`}
              >
                {RESULT_POSITIONS.map((p) => (
                  <option key={p} value={p} className="bg-zinc-900">
                    {p}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <span className={labelClass}>Entry Type</span>
              <div className="grid grid-cols-2 gap-1.5">
                {RESULT_ENTRY_TYPES.map((t) => (
                  <button
                    key={t}
                    onClick={() => patch({ entryType: t })}
                    className={`flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                      draft.entryType === t
                        ? 'bg-violet-500/15 text-violet-300 border-violet-500/40'
                        : 'bg-white/5 text-white/50 border-white/10 hover:text-white'
                    }`}
                  >
                    {t === 'Team' ? <Users className="w-3.5 h-3.5" /> : <UserRound className="w-3.5 h-3.5" />}
                    {t}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {draft.position === 'Custom Award' && (
            <div className="flex flex-col gap-1.5">
              <span className={labelClass}>Award Name</span>
              <input
                value={draft.customPosition}
                onChange={(e) => patch({ customPosition: e.target.value })}
                placeholder="e.g. Most Creative Award"
                className={inputClass}
              />
            </div>
          )}

          {/* Individual / Team details */}
          {draft.entryType === 'Individual' ? (
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <span className={labelClass}>Participant Name *</span>
                <input
                  value={draft.participantName}
                  onChange={(e) => patch({ participantName: e.target.value })}
                  placeholder="Full name of the participant"
                  className={inputClass}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <span className={labelClass}>Register Number</span>
                <input
                  value={draft.registerNumber}
                  onChange={(e) => patch({ registerNumber: e.target.value })}
                  placeholder="Register number"
                  className={inputClass}
                />
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <span className={labelClass}>Team Name *</span>
                <input
                  value={draft.teamName}
                  onChange={(e) => patch({ teamName: e.target.value })}
                  placeholder="Name of the team"
                  className={inputClass}
                />
              </div>
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className={labelClass}>Team Members</span>
                  <button
                    onClick={addMember}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white/5 border border-white/10 text-white/70 hover:text-violet-300 hover:border-violet-500/40 text-[10px] font-bold cursor-pointer transition-all"
                  >
                    <Plus className="w-3 h-3" />
                    Add Member
                  </button>
                </div>
                {draft.members.length === 0 && (
                  <div className="px-3.5 py-3 rounded-xl border border-dashed border-white/15 bg-white/[0.02] text-xs text-white/40">
                    No team members added yet. Add at least one member to save this result.
                  </div>
                )}
                {draft.members.map((member, index) => (
                  <div key={member.id} className="flex flex-col gap-2 rounded-xl border border-white/10 bg-white/[0.02] p-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-white/40">
                        Member {index + 1}
                      </span>
                      <button
                        onClick={() => removeMember(member.id)}
                        className="p-1.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 hover:bg-rose-500/20 cursor-pointer transition-all"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <input
                        value={member.name}
                        onChange={(e) => patchMember(member.id, { name: e.target.value })}
                        placeholder="Participant name"
                        className={inputClass}
                      />
                      <input
                        value={member.registerNumber}
                        onChange={(e) => patchMember(member.id, { registerNumber: e.target.value })}
                        placeholder="Register number"
                        className={inputClass}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* College / Department / Year */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="flex flex-col gap-1.5">
              <span className={labelClass}>College</span>
              <input
                value={draft.college}
                onChange={(e) => patch({ college: e.target.value })}
                placeholder="College"
                className={inputClass}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <span className={labelClass}>Department</span>
              <input
                value={draft.department}
                onChange={(e) => patch({ department: e.target.value })}
                placeholder="Department"
                className={inputClass}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <span className={labelClass}>Year</span>
              <input
                value={draft.year}
                onChange={(e) => patch({ year: e.target.value })}
                placeholder="e.g. 2nd Year"
                className={inputClass}
              />
            </div>
          </div>

          {/* Optional details */}
          <div className="flex flex-col gap-4">
            <span className="text-[10px] font-bold uppercase tracking-widest text-white/40">Optional Details</span>
            <div className="flex flex-col gap-1.5">
              <span className={labelClass}>Prize</span>
              <input
                value={draft.prize}
                onChange={(e) => patch({ prize: e.target.value })}
                placeholder="e.g. ₹10,000 cash prize"
                className={inputClass}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <span className={labelClass}>Remarks</span>
              <textarea
                value={draft.remarks}
                onChange={(e) => patch({ remarks: e.target.value })}
                placeholder="Any remarks about this result"
                rows={2}
                className={`${inputClass} resize-none`}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <span className={labelClass}>Coordinator Notes</span>
              <textarea
                value={draft.coordinatorNotes}
                onChange={(e) => patch({ coordinatorNotes: e.target.value })}
                placeholder="Internal notes for coordinators only"
                rows={2}
                className={`${inputClass} resize-none`}
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-white/10 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl text-white/60 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold cursor-pointer transition-all"
          >
            Cancel
          </button>
          <button
            onClick={() => onSave(draft)}
            disabled={!valid}
            className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-bold shadow-lg shadow-violet-500/25 cursor-pointer transition-all"
          >
            <Save className="w-3.5 h-3.5" />
            {isNew ? 'Add Result' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
};
