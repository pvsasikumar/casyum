import React from 'react';
import type { LucideIcon } from 'lucide-react';

interface ComingSoonProps {
  icon: LucideIcon;
  title: string;
  description: string;
}

export const ComingSoon: React.FC<ComingSoonProps> = ({ icon: Icon, title, description }) => {
  return (
    <div className="rounded-3xl bg-zinc-950/60 border border-white/10 backdrop-blur-md p-12 text-center">
      <div className="w-16 h-16 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mx-auto mb-4">
        <Icon className="w-6 h-6 text-violet-400" />
      </div>
      <h3 className="text-base font-bold text-white/70 font-display mb-1">{title}</h3>
      <p className="text-xs text-white/40">{description}</p>
    </div>
  );
};
