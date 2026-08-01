import React from 'react';
import { Plus, ChevronUp, ChevronDown, Trash2 } from 'lucide-react';
import { EmptyState } from './fields';

interface CmsItemListProps<T> {
  items: T[];
  onChange?: (items: T[]) => void;
  createItem: () => T;
  idKey: (item: T) => string;
  renderEditor: (item: T, update: (patch: Partial<T>) => void, index: number) => React.ReactNode;
  renderView: (item: T, index: number) => React.ReactNode;
  addLabel: string;
  emptyText: string;
  moveLabel?: (item: T) => string;
}

export const CmsItemList = <T,>({
  items,
  onChange,
  createItem,
  idKey,
  renderEditor,
  renderView,
  addLabel,
  emptyText,
}: CmsItemListProps<T>) => {
  const canEdit = !!onChange;

  if (!canEdit) {
    if (items.length === 0) return <EmptyState text={emptyText} />;
    return (
      <div className="flex flex-col gap-2">
        {items.map((item, index) => (
          <div key={idKey(item)}>{renderView(item, index)}</div>
        ))}
      </div>
    );
  }

  const updateItem = (id: string, patch: Partial<T>) => {
    onChange?.(items.map((it) => (idKey(it) === id ? { ...it, ...patch } : it)));
  };

  const removeItem = (id: string) => {
    onChange?.(items.filter((it) => idKey(it) !== id));
  };

  const moveItem = (index: number, dir: -1 | 1) => {
    const target = index + dir;
    if (target < 0 || target >= items.length) return;
    const next = [...items];
    const [moved] = next.splice(index, 1);
    next.splice(target, 0, moved);
    onChange?.(next);
  };

  return (
    <div className="flex flex-col gap-2">
      {items.length === 0 && <EmptyState text={emptyText} />}
      {items.map((item, index) => (
        <div
          key={idKey(item)}
          className="flex gap-2 items-start rounded-xl border border-white/10 bg-white/[0.03] p-2"
        >
          <div className="flex-1 flex flex-col gap-2">
            {renderEditor(item, (patch) => updateItem(idKey(item), patch), index)}
          </div>
          <div className="flex flex-col gap-1 pt-1">
            <button
              type="button"
              onClick={() => moveItem(index, -1)}
              disabled={index === 0}
              className="p-1 rounded-md bg-white/5 text-white/50 hover:text-white disabled:opacity-25 cursor-pointer disabled:cursor-not-allowed"
              title="Move up"
            >
              <ChevronUp className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => moveItem(index, 1)}
              disabled={index === items.length - 1}
              className="p-1 rounded-md bg-white/5 text-white/50 hover:text-white disabled:opacity-25 cursor-pointer disabled:cursor-not-allowed"
              title="Move down"
            >
              <ChevronDown className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => removeItem(idKey(item))}
              className="p-1 rounded-md bg-rose-500/15 text-rose-400 hover:bg-rose-500/30 cursor-pointer"
              title="Delete"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      ))}
      <button
        type="button"
        onClick={() => onChange?.([...items, createItem()])}
        className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border border-dashed border-white/15 text-white/50 hover:text-white hover:border-violet-500/40 text-[11px] font-bold transition-colors cursor-pointer"
      >
        <Plus className="w-3.5 h-3.5" />
        {addLabel}
      </button>
    </div>
  );
};
