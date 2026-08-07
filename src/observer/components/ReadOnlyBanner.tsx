import React from 'react';
import { ShieldAlert } from 'lucide-react';

export const ReadOnlyBanner: React.FC = () => (
  <div className="w-full bg-gradient-to-r from-amber-500/20 via-amber-500/10 to-amber-500/20 border-b border-amber-500/30">
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2 flex items-center justify-center gap-2">
      <ShieldAlert className="w-3.5 h-3.5 text-amber-400 shrink-0" />
      <span className="text-[10px] font-extrabold uppercase tracking-widest text-amber-300">
        Read Only Mode
      </span>
      <span className="text-[10px] text-amber-200/60 hidden sm:inline">
        Viewing data only — no edits, deletions or verifications are available.
      </span>
    </div>
  </div>
);

export const ReadOnlyBadge: React.FC = () => (
  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/30 text-amber-300 text-[9px] font-extrabold uppercase tracking-widest">
    <ShieldAlert className="w-3 h-3" />
    Read Only
  </span>
);
