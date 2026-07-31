import React from 'react';
import {
  FileSpreadsheet,
  FileText,
  Table2,
} from 'lucide-react';
import { ExportButton } from './ExportButton';

interface ExportCardProps {
  icon: React.ElementType;
  iconBg: string;
  title: string;
  description: string;
  onExportCSV: () => Promise<void>;
  onExportExcel: () => Promise<void>;
  onExportPDF: () => Promise<void>;
}

export const ExportCard: React.FC<ExportCardProps> = ({
  icon: Icon,
  iconBg,
  title,
  description,
  onExportCSV,
  onExportExcel,
  onExportPDF,
}) => (
  <div className="group p-5 rounded-3xl bg-zinc-950/60 border border-white/[0.07] hover:border-violet-500/25 backdrop-blur-md flex flex-col justify-between gap-5 transition-all duration-300 hover:shadow-[0_0_30px_-5px_rgba(139,92,246,0.15)] hover:translate-y-[-2px]">
    <div className="flex items-start gap-4">
      <div
        className={`p-3 rounded-2xl ${iconBg} border border-white/10 flex-shrink-0 transition-transform duration-300 group-hover:scale-110`}
      >
        <Icon className="w-5 h-5" />
      </div>
      <div className="flex flex-col gap-1 min-w-0">
        <h3 className="text-sm font-bold text-white">{title}</h3>
        <p className="text-[11px] text-white/40 leading-relaxed">
          {description}
        </p>
      </div>
    </div>

    <div className="flex items-center gap-2 pt-2.5 border-t border-white/[0.06]">
      <ExportButton
        label="CSV"
        icon={FileSpreadsheet}
        color="emerald"
        onClick={onExportCSV}
      />
      <ExportButton
        label="Excel"
        icon={Table2}
        color="blue"
        onClick={onExportExcel}
      />
      <ExportButton
        label="PDF"
        icon={FileText}
        color="rose"
        onClick={onExportPDF}
      />
    </div>
  </div>
);
