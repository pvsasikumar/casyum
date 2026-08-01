import React, { useRef, useState } from 'react';
import { Upload, ImagePlus, X, Loader2, Link2 } from 'lucide-react';
import { uploadImageToStorage } from '../../firebase/storage';

const inputBase =
  'w-full p-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/30 focus:outline-none focus:border-violet-500/50 text-xs transition-colors';

export const CmsField: React.FC<{
  label: string;
  hint?: string;
  children: React.ReactNode;
}> = ({ label, hint, children }) => (
  <div className="flex flex-col gap-1.5">
    <label className="text-[10px] font-bold text-white/50 uppercase tracking-wider">{label}</label>
    {children}
    {hint && <span className="text-[10px] text-white/30">{hint}</span>}
  </div>
);

export const CmsInput: React.FC<React.InputHTMLAttributes<HTMLInputElement>> = (props) => (
  <input {...props} className={`${inputBase} ${props.className || ''}`} />
);

export const CmsTextArea: React.FC<React.TextareaHTMLAttributes<HTMLTextAreaElement>> = (props) => (
  <textarea {...props} className={`${inputBase} resize-none ${props.className || ''}`} />
);

export const CmsSelect: React.FC<React.SelectHTMLAttributes<HTMLSelectElement>> = ({ children, ...props }) => (
  <select {...props} className={`${inputBase} appearance-none ${props.className || ''}`}>
    {children}
  </select>
);

export const CmsReadOnlyText: React.FC<{ children?: React.ReactNode; className?: string }> = ({
  children,
  className = '',
}) => (
  <div className={`text-sm text-white/80 leading-relaxed ${className}`}>{children || '—'}</div>
);

interface ImageFieldProps {
  value: string;
  onChange: (url: string) => void;
  storagePrefix: string;
  label?: string;
  aspect?: string;
  canEdit: boolean;
}

export const CmsImageField: React.FC<ImageFieldProps> = ({
  value,
  onChange,
  storagePrefix,
  label,
  aspect = 'aspect-video',
  canEdit,
}) => {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [showUrl, setShowUrl] = useState(false);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const url = await uploadImageToStorage(storagePrefix, file);
      onChange(url);
    } catch {
      // Upload failure leaves the previous value intact.
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  if (!canEdit) {
    if (!value) return null;
    return (
      <div className={`${aspect} w-full overflow-hidden rounded-xl bg-white/5 border border-white/10`}>
        <img src={value} alt={label || ''} className="w-full h-full object-cover" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {value ? (
        <div className="relative group overflow-hidden rounded-xl bg-white/5 border border-white/10">
          <img src={value} alt={label || ''} className={`${aspect} w-full object-cover`} />
          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="px-3 py-1.5 rounded-lg bg-white/10 text-white text-[10px] font-bold hover:bg-white/20 cursor-pointer"
            >
              Replace
            </button>
            <button
              type="button"
              onClick={() => onChange('')}
              className="p-1.5 rounded-lg bg-rose-500/30 text-rose-300 hover:bg-rose-500/50 cursor-pointer"
              title="Remove image"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      ) : (
        <div
          onClick={() => fileRef.current?.click()}
          className={`${aspect} w-full rounded-xl border border-dashed border-white/15 bg-white/[0.03] flex flex-col items-center justify-center gap-2 text-white/40 hover:text-white/70 hover:border-violet-500/40 transition-colors cursor-pointer`}
        >
          {uploading ? (
            <Loader2 className="w-5 h-5 animate-spin text-violet-400" />
          ) : (
            <ImagePlus className="w-5 h-5" />
          )}
          <span className="text-[10px] font-bold uppercase tracking-widest">
            {uploading ? 'Uploading...' : 'Upload image'}
          </span>
        </div>
      )}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-white/70 hover:text-white hover:border-white/25 text-[10px] font-bold cursor-pointer"
        >
          <Upload className="w-3 h-3" />
          {value ? 'Change Image' : 'Upload'}
        </button>
        <button
          type="button"
          onClick={() => setShowUrl((v) => !v)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-white/70 hover:text-white hover:border-white/25 text-[10px] font-bold cursor-pointer"
        >
          <Link2 className="w-3 h-3" />
          URL
        </button>
      </div>
      {showUrl && (
        <CmsInput
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Paste image URL..."
        />
      )}
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFile}
      />
    </div>
  );
};

export const SectionCard: React.FC<{
  title: string;
  subtitle?: string;
  icon: React.ElementType;
  children: React.ReactNode;
}> = ({ title, subtitle, icon: Icon, children }) => (
  <section className="rounded-3xl bg-white/[0.03] backdrop-blur-md border border-white/10 p-5 sm:p-6 flex flex-col gap-5 hover:border-white/15 transition-colors">
    <div className="flex items-center gap-3">
      <div className="p-2 rounded-xl bg-violet-500/15 text-violet-300 border border-violet-500/20">
        <Icon className="w-4 h-4" />
      </div>
      <div className="flex flex-col">
        <h3 className="text-sm font-extrabold font-display text-white">{title}</h3>
        {subtitle && <span className="text-[10px] text-white/40">{subtitle}</span>}
      </div>
    </div>
    {children}
  </section>
);

export const EmptyState: React.FC<{ text: string }> = ({ text }) => (
  <div className="p-6 text-center text-[11px] text-white/30 rounded-xl bg-white/[0.02] border border-dashed border-white/10">
    {text}
  </div>
);
