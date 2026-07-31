import React from 'react';
import { FileText, FileSpreadsheet, FileDown, Loader2 } from 'lucide-react';

interface ExportButtonsProps {
  onExportCSV: () => void;
  onExportExcel: () => void;
  onExportPDF: () => void;
  loading: boolean;
  disabled: boolean;
}

export const ExportButtons: React.FC<ExportButtonsProps> = ({
  onExportCSV,
  onExportExcel,
  onExportPDF,
  loading,
  disabled,
}) => {
  const btnClass = (color: string) =>
    `flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
      disabled || loading
        ? 'opacity-40 cursor-not-allowed'
        : 'hover:scale-[1.02] active:scale-[0.98]'
    } ${color}`;

  return (
    <div className="flex items-center gap-2.5 flex-wrap">
      <button
        onClick={onExportCSV}
        disabled={disabled || loading}
        className={btnClass(
          'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/25'
        )}
      >
        {loading ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <FileText className="w-4 h-4" />
        )}
        CSV
      </button>

      <button
        onClick={onExportExcel}
        disabled={disabled || loading}
        className={btnClass(
          'bg-cyan-500/15 text-cyan-400 border border-cyan-500/30 hover:bg-cyan-500/25'
        )}
      >
        {loading ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <FileSpreadsheet className="w-4 h-4" />
        )}
        Excel (.xlsx)
      </button>

      <button
        onClick={onExportPDF}
        disabled={disabled || loading}
        className={btnClass(
          'bg-rose-500/15 text-rose-400 border border-rose-500/30 hover:bg-rose-500/25'
        )}
      >
        {loading ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <FileDown className="w-4 h-4" />
        )}
        PDF
      </button>
    </div>
  );
};
