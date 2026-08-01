import React from 'react';
import { GripVertical, Eye, EyeOff, Pencil, Copy, ArrowUp, ArrowDown, Trash2, Settings2 } from 'lucide-react';

interface SectionToolbarProps {
  label: string;
  isVisible: boolean;
  index: number;
  total: number;
  onDragStart: (e: React.DragEvent) => void;
  onDragEnd: () => void;
  onToggleVisible: () => void;
  onEdit: () => void;
  onDuplicate: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onDelete: () => void;
  onSettings: () => void;
}

const btn =
  'p-1.5 rounded-lg bg-white/5 hover:bg-white/15 text-white/60 hover:text-white border border-transparent hover:border-white/20 transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed';

export const SectionToolbar: React.FC<SectionToolbarProps> = ({
  label,
  isVisible,
  index,
  total,
  onDragStart,
  onDragEnd,
  onToggleVisible,
  onEdit,
  onDuplicate,
  onMoveUp,
  onMoveDown,
  onDelete,
  onSettings,
}) => (
  <div className="flex items-center gap-1.5 flex-wrap">
    <div
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      title="Drag to reorder"
      className="p-1 rounded-lg cursor-grab active:cursor-grabbing text-white/40 hover:text-white/80 hover:bg-white/10"
    >
      <GripVertical className="w-4 h-4" />
    </div>
    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/5 border border-white/10">
      <span className="text-[10px] font-bold uppercase tracking-widest text-white/70">{label}</span>
      {!isVisible && (
        <span className="px-1.5 py-0.5 rounded-md bg-rose-500/20 text-rose-300 border border-rose-500/30 text-[9px] font-bold uppercase tracking-wider">
          Hidden
        </span>
      )}
    </div>
    <div className="flex-1" />
    <button type="button" className={btn} title={isVisible ? 'Hide section' : 'Show section'} onClick={onToggleVisible}>
      {isVisible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
    </button>
    <button type="button" className={btn} title="Edit / focus" onClick={onEdit}>
      <Pencil className="w-3.5 h-3.5" />
    </button>
    <button type="button" className={btn} title="Duplicate section" onClick={onDuplicate}>
      <Copy className="w-3.5 h-3.5" />
    </button>
    <button type="button" className={btn} title="Move up" disabled={index === 0} onClick={onMoveUp}>
      <ArrowUp className="w-3.5 h-3.5" />
    </button>
    <button type="button" className={btn} title="Move down" disabled={index === total - 1} onClick={onMoveDown}>
      <ArrowDown className="w-3.5 h-3.5" />
    </button>
    <button
      type="button"
      className="p-1.5 rounded-lg bg-rose-500/15 hover:bg-rose-500/30 text-rose-400 transition-colors cursor-pointer"
      title="Delete section"
      onClick={onDelete}
    >
      <Trash2 className="w-3.5 h-3.5" />
    </button>
    <button type="button" className={btn} title="Section settings" onClick={onSettings}>
      <Settings2 className="w-3.5 h-3.5" />
    </button>
  </div>
);
