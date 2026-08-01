import React from 'react';
import { useCoordinator } from '../context/CoordinatorContext';
import { NoEventAssigned } from '../components/NoEventAssigned';
import { ResultsManager } from '../../components/results/ResultsManager';

export const ResultsPage: React.FC = () => {
  const { user, assignedEvents } = useCoordinator();

  if (assignedEvents.length === 0) {
    return <NoEventAssigned />;
  }

  const events = assignedEvents.map((e) => ({
    id: String(e.id),
    name: e.name,
    date: e.date || '',
  }));

  return (
    <div className="min-h-screen bg-black text-white selection:bg-violet-500/30 selection:text-violet-200">
      <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 flex flex-col gap-6">
        <div className="flex flex-col gap-1">
          <span className="text-[10px] font-bold text-violet-400 uppercase tracking-widest">
            Results
          </span>
          <h2 className="text-lg sm:text-xl font-extrabold font-display text-white">Results</h2>
          <p className="text-[11px] text-white/40">Record and maintain the official outcome of this event.</p>
        </div>
        <ResultsManager
          events={events}
          editor={{
            id: user?.id || 'coordinator',
            name: user?.name || 'Coordinator',
            role: user?.coordinator_type || user?.designation || 'Event Coordinator',
          }}
        />
      </div>
    </div>
  );
};
