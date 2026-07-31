import { X, AlertTriangle } from 'lucide-react';

interface ConfirmationDialogProps {
  open: boolean;
  title: string;
  message: string | React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'warning' | 'info';
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmationDialog: React.FC<ConfirmationDialogProps> = ({
  open,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'danger',
  onConfirm,
  onCancel,
}) => {
  if (!open) return null;

  const variantStyles = {
    danger: 'bg-rose-600 hover:bg-rose-700',
    warning: 'bg-amber-600 hover:bg-amber-700',
    info: 'bg-violet-600 hover:bg-violet-700',
  };

  return (
    <div className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-zinc-950 border border-white/20 rounded-3xl p-6 shadow-2xl flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-xl ${variant === 'danger' ? 'bg-rose-500/20 text-rose-400' : variant === 'warning' ? 'bg-amber-500/20 text-amber-400' : 'bg-violet-500/20 text-violet-400'}`}>
              <AlertTriangle className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold font-display text-white">{title}</h3>
          </div>
          <button onClick={onCancel} className="p-1.5 rounded-lg text-white/50 hover:text-white bg-white/5 hover:bg-white/10 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
        <p className="text-sm text-white/70 leading-relaxed">{message}</p>
        <div className="flex items-center justify-end gap-3 mt-2">
          <button onClick={onCancel} className="px-4 py-2 rounded-xl text-white/60 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold cursor-pointer">
            {cancelLabel}
          </button>
          <button onClick={onConfirm} className={`px-4 py-2 rounded-xl text-white text-xs font-bold cursor-pointer ${variantStyles[variant]}`}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};
