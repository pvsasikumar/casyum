import React from 'react';
import { X, Lock } from 'lucide-react';
import type { CmsSectionType } from './types';
import { SECTION_GROUPS, SECTION_META } from './sectionMeta';

interface AddSectionModalProps {
  existingTypes: CmsSectionType[];
  isSuperAdmin: boolean;
  onClose: () => void;
  onAdd: (type: CmsSectionType) => void;
}

export const AddSectionModal: React.FC<AddSectionModalProps> = ({ existingTypes, isSuperAdmin, onClose, onAdd }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={onClose}>
    <div
      className="w-full max-w-2xl rounded-3xl bg-zinc-950 border border-white/10 p-5 sm:p-6 flex flex-col gap-5 max-h-[90vh] overflow-y-auto"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-extrabold font-display text-white">Add Section</h3>
        <button onClick={onClose} className="p-1.5 rounded-lg bg-white/5 text-white/50 hover:text-white cursor-pointer">
          <X className="w-4 h-4" />
        </button>
      </div>

      {SECTION_GROUPS.map((group) => (
        <div key={group.title} className="flex flex-col gap-2">
          <span className="text-[10px] font-bold uppercase tracking-widest text-white/40">{group.title}</span>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {group.types.map((t) => {
              const meta = SECTION_META[t];
              const Icon = meta.icon;
              const locked = meta.adminOnly && !isSuperAdmin;
              const already = meta.singleton && existingTypes.includes(t);
              const disabled = locked || already;
              return (
                <button
                  key={t}
                  type="button"
                  disabled={disabled}
                  onClick={() => onAdd(t)}
                  title={
                    locked
                      ? 'Super Admin only'
                      : already
                        ? 'This section is already added'
                        : `Add ${meta.label}`
                  }
                  className={`flex items-start gap-3 p-3 rounded-2xl border text-left transition-colors ${disabled ? 'border-white/5 bg-white/[0.02] opacity-45 cursor-not-allowed' : 'border-white/10 bg-white/[0.03] hover:border-violet-500/40 hover:bg-white/[0.06] cursor-pointer'}`}
                >
                  <div className="p-2 rounded-xl bg-violet-500/15 text-violet-300 border border-violet-500/20 flex-shrink-0">
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="flex items-center gap-1.5 text-xs font-bold text-white">
                      {meta.label}
                      {meta.adminOnly && (
                        <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-amber-500/15 text-amber-300 text-[9px] font-bold uppercase tracking-wider">
                          <Lock className="w-2.5 h-2.5" />
                          Admin
                        </span>
                      )}
                    </span>
                    <span className="text-[10px] text-white/50 leading-snug mt-0.5">{meta.description}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  </div>
);
