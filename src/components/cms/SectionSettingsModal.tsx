import React, { useState } from 'react';
import { X } from 'lucide-react';
import type { CmsSectionSettings, CmsSectionPadding } from './types';
import { CmsField, CmsInput, CmsSelect } from './fields';

const BG_PRESETS = ['', '#0f172a', '#1e1b4b', '#312e81', '#111827', '#1f2937', '#064e3b', '#7f1d1d', '#581c87', '#134e4a'];

interface SectionSettingsModalProps {
  settings: CmsSectionSettings;
  isVisible: boolean;
  onClose: () => void;
  onSave: (settings: CmsSectionSettings, isVisible: boolean) => void;
}

export const SectionSettingsModal: React.FC<SectionSettingsModalProps> = ({ settings, isVisible, onClose, onSave }) => {
  const [draft, setDraft] = useState<CmsSectionSettings>({ ...settings });
  const [visible, setVisible] = useState(isVisible);
  const set = (patch: Partial<CmsSectionSettings>) => setDraft((p) => ({ ...p, ...patch }));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <div
        className="w-full max-w-lg rounded-3xl bg-zinc-950 border border-white/10 p-5 sm:p-6 flex flex-col gap-4 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-extrabold font-display text-white">Section Settings</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg bg-white/5 text-white/50 hover:text-white cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>

        <CmsField label="Section Title">
          <CmsInput value={draft.title} onChange={(e) => set({ title: e.target.value })} placeholder="Shown above the section (optional)" />
        </CmsField>
        <CmsField label="Subtitle">
          <CmsInput value={draft.subtitle} onChange={(e) => set({ subtitle: e.target.value })} placeholder="Short subheading (optional)" />
        </CmsField>

        <CmsField label="Background Color">
          <div className="flex flex-col gap-2">
            <div className="flex flex-wrap gap-1.5">
              {BG_PRESETS.map((c) => (
                <button
                  key={c || 'none'}
                  type="button"
                  onClick={() => set({ background: c })}
                  title={c || 'Default / transparent'}
                  className={`w-7 h-7 rounded-lg border ${draft.background === c ? 'border-violet-400 ring-2 ring-violet-500/40' : 'border-white/15'} ${c ? '' : 'bg-white/[0.03]'} cursor-pointer`}
                  style={c ? { backgroundColor: c } : undefined}
                />
              ))}
            </div>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={draft.background || '#000000'}
                onChange={(e) => set({ background: e.target.value })}
                className="w-9 h-9 rounded-lg border border-white/15 bg-transparent cursor-pointer"
              />
              <CmsInput value={draft.background} onChange={(e) => set({ background: e.target.value })} placeholder="Hex color or leave empty" />
            </div>
          </div>
        </CmsField>

        <CmsField label="Padding">
          <CmsSelect value={draft.padding} onChange={(e) => set({ padding: e.target.value as CmsSectionPadding })}>
            <option value="none" className="bg-zinc-900">None</option>
            <option value="sm" className="bg-zinc-900">Small</option>
            <option value="md" className="bg-zinc-900">Medium</option>
            <option value="lg" className="bg-zinc-900">Large</option>
          </CmsSelect>
        </CmsField>

        <CmsField label="Visibility">
          <CmsSelect value={visible ? 'visible' : 'hidden'} onChange={(e) => setVisible(e.target.value === 'visible')}>
            <option value="visible" className="bg-zinc-900">Visible</option>
            <option value="hidden" className="bg-zinc-900">Hidden</option>
          </CmsSelect>
        </CmsField>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <CmsField label="Anchor ID" hint="For deep links (e.g. #rules)">
            <CmsInput value={draft.anchorId} onChange={(e) => set({ anchorId: e.target.value })} placeholder="rules" />
          </CmsField>
          <CmsField label="Custom CSS Class">
            <CmsInput value={draft.cssClass} onChange={(e) => set({ cssClass: e.target.value })} placeholder="my-section" />
          </CmsField>
        </div>

        <div className="flex items-center justify-end gap-2 pt-1">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white/60 hover:text-white text-[11px] font-bold cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={() => onSave(draft, visible)}
            className="px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-[11px] font-bold shadow-lg shadow-violet-500/25 cursor-pointer"
          >
            Save Settings
          </button>
        </div>
      </div>
    </div>
  );
};
