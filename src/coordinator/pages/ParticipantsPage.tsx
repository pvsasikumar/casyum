import React, { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useCoordinator } from '../context/CoordinatorContext';
import { ParticipantService } from '../services/ParticipantService';
import { ParticipantTable } from '../components/ParticipantTable';
import { NoEventAssigned } from '../components/NoEventAssigned';
import type { EventParticipant } from '../types';

export const ParticipantsPage: React.FC = () => {
  const navigate = useNavigate();
  const { assignedEvent } = useCoordinator();

  const [participants, setParticipants] = useState<EventParticipant[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const loadParticipants = useCallback(async (id: string) => {
    setIsLoading(true);
    const data = await ParticipantService.getEventParticipants(id);
    setParticipants(data);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    if (assignedEvent) {
      loadParticipants(assignedEvent.id);
    } else {
      setParticipants([]);
    }
  }, [assignedEvent, loadParticipants]);

  if (!assignedEvent) {
    return <NoEventAssigned />;
  }

  return (
    <div className="min-h-screen bg-black text-white selection:bg-violet-500/30 selection:text-violet-200">
      <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 flex flex-col gap-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/coordinator/dashboard')}
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/60 hover:text-white transition-all cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div className="flex flex-col">
              <span className="text-[10px] font-bold text-violet-400 uppercase tracking-widest">
                Participants
              </span>
              <h2 className="text-lg sm:text-xl font-extrabold font-display text-white">
                {assignedEvent.name}
              </h2>
            </div>
          </div>
        </div>

        {/* Participant Table */}
        <ParticipantTable participants={participants} isLoading={isLoading} />
      </div>
    </div>
  );
};
