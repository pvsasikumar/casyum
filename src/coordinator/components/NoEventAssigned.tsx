import React from 'react';
import { Calendar } from 'lucide-react';

export const NoEventAssigned: React.FC = () => {
  return (
    <div className="rounded-3xl bg-zinc-950/60 border border-white/10 backdrop-blur-md p-12 text-center">
      <div className="w-16 h-16 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mx-auto mb-4">
        <Calendar className="w-6 h-6 text-white/30" />
      </div>
      <h3 className="text-base font-bold text-white/70 font-display mb-1">No Event Assigned</h3>
      <p className="text-xs text-white/40">
        You have not been assigned to any event yet. Please contact the admin.
      </p>
    </div>
  );
};
