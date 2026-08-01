import React from 'react';
import { useCoordinator } from '../context/CoordinatorContext';
import { NoEventAssigned } from '../components/NoEventAssigned';
import { EventOverviewCms } from '../../components/cms/EventOverviewCms';

export const EventOverviewPage: React.FC = () => {
  const { user, assignedEvent } = useCoordinator();

  if (!assignedEvent) {
    return <NoEventAssigned />;
  }

  return (
    <div className="min-h-screen bg-black text-white selection:bg-violet-500/30 selection:text-violet-200">
      <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 flex flex-col gap-6">
        <div className="flex flex-col gap-1">
          <span className="text-[10px] font-bold text-violet-400 uppercase tracking-widest">
            Event Overview
          </span>
          <h2 className="text-lg sm:text-xl font-extrabold font-display text-white">
            {assignedEvent.name}
          </h2>
        </div>
        <EventOverviewCms
          eventId={assignedEvent.id}
          canEdit
          defaultView="details"
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
