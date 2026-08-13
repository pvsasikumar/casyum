import React from 'react';
import { FileText } from 'lucide-react';

interface RuleBookButtonProps {
  /** Rule Book PDF URL or public path. When empty/falsy the button is hidden. */
  url?: string;
  fileName?: string;
  version?: string;
  label?: string;
  variant?: 'primary' | 'secondary' | 'subtle';
  className?: string;
  fullWidth?: boolean;
  showFileName?: boolean;
}

const variantClass: Record<NonNullable<RuleBookButtonProps['variant']>, string> = {
  primary:
    'bg-violet-600 hover:bg-violet-700 text-white border-transparent shadow-lg shadow-violet-500/25',
  secondary:
    'bg-white/5 hover:bg-white/10 text-white/80 hover:text-white border-white/15 hover:border-white/30',
  subtle:
    'bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
};

/**
 * Reusable "[ 📄 Rule Book ]" button that opens the event's own Rule Book PDF
 * in a new browser tab. It renders nothing when no valid Rule Book reference
 * exists, so participants are never shown a broken link. Always reads the URL
 * from the event document, which guarantees the correct event's PDF opens.
 */
export const RuleBookButton: React.FC<RuleBookButtonProps> = ({
  url,
  fileName,
  version,
  label = 'Rule Book',
  variant = 'primary',
  className = '',
  fullWidth = false,
  showFileName = false,
}) => {
  const href = String(url || '').trim();
  if (!href) return null;

  return (
    <div className={`flex flex-col gap-1 ${fullWidth ? 'w-full' : 'w-fit'} ${className}`}>
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        title={`Open ${fileName || 'the Rule Book PDF'} in a new tab`}
        className={`inline-flex items-center justify-center gap-2 px-4 sm:px-5 py-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer select-none min-h-[42px] ${variantClass[variant]} ${fullWidth ? 'w-full' : ''}`}
      >
        <FileText className="w-4 h-4 flex-shrink-0" />
        <span>{label}</span>
      </a>
      {showFileName && fileName && (
        <span className="px-1 text-[10px] text-white/40 truncate max-w-full" title={fileName}>
          {fileName}
          {version ? ` · ${version}` : ''}
        </span>
      )}
    </div>
  );
};

export default RuleBookButton;
