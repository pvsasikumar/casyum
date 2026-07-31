import React, { useState } from 'react';
import { Loader2 } from 'lucide-react';

interface ExportButtonProps {
  label: string;
  icon: React.ElementType;
  color: 'emerald' | 'blue' | 'rose';
  onClick: () => Promise<void>;
}

const colorMap = {
  emerald: {
    bg: 'bg-emerald-500/10 hover:bg-emerald-500/20',
    border: 'border-emerald-500/20',
    text: 'text-emerald-300',
    spinner: 'text-emerald-300',
  },
  blue: {
    bg: 'bg-blue-500/10 hover:bg-blue-500/20',
    border: 'border-blue-500/20',
    text: 'text-blue-300',
    spinner: 'text-blue-300',
  },
  rose: {
    bg: 'bg-rose-500/10 hover:bg-rose-500/20',
    border: 'border-rose-500/20',
    text: 'text-rose-300',
    spinner: 'text-rose-300',
  },
};

export const ExportButton: React.FC<ExportButtonProps> = ({
  label,
  icon: Icon,
  color,
  onClick,
}) => {
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    if (loading) return;
    setLoading(true);
    try {
      await onClick();
    } finally {
      setLoading(false);
    }
  };

  const c = colorMap[color];

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl ${c.bg} ${c.border} border ${c.text} text-xs font-bold transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed`}
    >
      {loading ? (
        <Loader2 className={`w-3.5 h-3.5 animate-spin ${c.spinner}`} />
      ) : (
        <Icon className="w-3.5 h-3.5" />
      )}
      <span>{loading ? 'Generating...' : label}</span>
    </button>
  );
};
