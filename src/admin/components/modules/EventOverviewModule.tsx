import React, { useState } from 'react';
import { LayoutDashboard, Calendar, Search } from 'lucide-react';
import { useAdmin } from '../../context/AdminContext';
import { useRBAC } from '../../../rbac/context/RBACContext';
import { EventOverviewCms } from '../../../components/cms/EventOverviewCms';

export const EventOverviewModule: React.FC = () => {
  const { events } = useAdmin();
  const rbac = useRBAC();
  const [selectedId, setSelectedId] = useState<string>('');

  const selectedEvent = events.find((e) => String(e.id) === selectedId) || null;

  return (
    <div className="flex flex-col gap-6 select-none pb-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-col">
          <span className="text-xs font-bold text-violet-400 uppercase tracking-widest">
            Event Overview CMS
          </span>
          <h2 className="text-xl sm:text-2xl font-extrabold font-display text-white">
            Event Content Management
          </h2>
          <p className="text-[11px] text-white/40 mt-1">
            Edit the public event overview. Changes are saved to the event and auto-published.
          </p>
        </div>
      </div>

      <div className="p-4 rounded-3xl bg-zinc-950/60 border border-white/10 backdrop-blur-md flex flex-col md:flex-row items-start md:items-center gap-3">
        <div className="flex items-center gap-2">
          <LayoutDashboard className="w-4 h-4 text-white/40" />
          <span className="text-xs font-bold text-white/70">Select Event</span>
        </div>
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-white/40 absolute left-3 top-1/2 -translate-y-1/2" />
          <select
            value={selectedId}
            onChange={(e) => setSelectedId(e.target.value)}
            className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-black/60 border border-white/10 text-white text-xs focus:outline-none focus:border-violet-500/50 appearance-none"
          >
            <option value="" className="bg-zinc-900">
              Choose an event...
            </option>
            {events.map((e) => (
              <option key={e.id} value={String(e.id)} className="bg-zinc-900">
                {e.name} ({e.category})
              </option>
            ))}
          </select>
        </div>
        {selectedEvent && (
          <span className="hidden md:flex items-center gap-1.5 text-[11px] text-white/40">
            <Calendar className="w-3.5 h-3.5 text-violet-400" />
            {selectedEvent.date || 'No date set'} · {selectedEvent.venue || 'Venue TBA'}
          </span>
        )}
      </div>

      {selectedEvent ? (
        <EventOverviewCms
          key={selectedId}
          eventId={selectedId}
          canEdit
          stickyTopClass="top-0"
          editor={{
            id: rbac.user?.id || 'admin',
            name: rbac.user?.name || 'Super Admin',
            role: rbac.user?.role || 'Super Admin',
          }}
        />
      ) : (
        <div className="flex flex-col items-center gap-3 py-24 text-center">
          <div className="p-4 rounded-2xl bg-violet-500/10 text-violet-300 border border-violet-500/20">
            <LayoutDashboard className="w-6 h-6" />
          </div>
          <p className="text-sm text-white/50 max-w-sm">
            Select an event above to manage its overview content as a CMS page.
          </p>
        </div>
      )}
    </div>
  );
};
