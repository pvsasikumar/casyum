import React from 'react';
import { useAdmin } from '../../context/AdminContext';
import { useRBAC } from '../../../rbac/context/RBACContext';
import { ResultsManager } from '../../../components/results/ResultsManager';

export const ResultsModule: React.FC = () => {
  const { events } = useAdmin();
  const rbac = useRBAC();

  const list = events.map((e) => ({
    id: String(e.id),
    name: e.name,
    date: e.date || '',
  }));

  return (
    <div className="flex flex-col gap-6 select-none pb-12">
      <div className="flex flex-col">
        <span className="text-xs font-bold text-violet-400 uppercase tracking-widest">Results</span>
        <h2 className="text-xl sm:text-2xl font-extrabold font-display text-white">Results Management</h2>
        <p className="text-[11px] text-white/40 mt-1">
          Maintain the official internal record of event outcomes. Results are never visible to participants.
        </p>
      </div>
      <ResultsManager
        events={list}
        canEditPublished={rbac.role === 'Super Admin'}
        stickyTopClass="top-0"
        editor={{
          id: rbac.user?.id || 'admin',
          name: rbac.user?.name || 'Super Admin',
          role: rbac.user?.role || 'Super Admin',
        }}
      />
    </div>
  );
};
