import React, { useState, useRef, useEffect, useMemo } from 'react';
import { ChevronDown, Search, Calendar } from 'lucide-react';
import type { EventItem } from '../../types';

interface EventSelectorProps {
  events: EventItem[];
  selectedEventId: string;
  onSelect: (eventId: string) => void;
  disabled?: boolean;
}

export const EventSelector: React.FC<EventSelectorProps> = ({
  events,
  selectedEventId,
  onSelect,
  disabled,
}) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const ref = useRef<HTMLDivElement>(null);

  const selectedEvent = events.find((e) => e.id === selectedEventId);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setSearch('');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filtered = useMemo(
    () =>
      events.filter((e) =>
        e.name.toLowerCase().includes(search.toLowerCase())
      ),
    [events, search]
  );

  return (
    <div ref={ref} className="relative w-full sm:max-w-md">
      <button
        type="button"
        onClick={() => { if (!disabled) setOpen(!open); }}
        disabled={disabled}
        className="w-full flex items-center justify-between gap-3 px-4 py-3 rounded-2xl bg-zinc-950/60 border border-white/10 hover:border-violet-500/40 text-white text-xs font-semibold transition-all backdrop-blur-md disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
      >
        <div className="flex items-center gap-3 min-w-0">
          <Calendar className="w-4 h-4 text-violet-400 flex-shrink-0" />
          <span className="truncate">
            {selectedEvent ? selectedEvent.name : 'Select Event'}
          </span>
        </div>
        <ChevronDown
          className={`w-4 h-4 text-white/40 flex-shrink-0 transition-transform duration-200 ${
            open ? 'rotate-180' : ''
          }`}
        />
      </button>

      {open && (
        <div className="absolute z-50 mt-2 w-full rounded-2xl bg-zinc-950 border border-white/10 backdrop-blur-2xl shadow-2xl overflow-hidden">
          <div className="relative p-2">
            <Search className="w-4 h-4 text-white/40 absolute left-4 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search events..."
              className="w-full pl-8 pr-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-xs placeholder-white/30 focus:outline-none focus:border-violet-500/50"
              autoFocus
            />
          </div>
          <div className="max-h-56 overflow-y-auto custom-scrollbar pb-1">
            {filtered.length === 0 ? (
              <p className="text-xs text-white/40 text-center py-6">No events found.</p>
            ) : (
              filtered.map((event) => {
                const isSelected = event.id === selectedEventId;
                return (
                  <button
                    key={event.id}
                    onClick={() => {
                      onSelect(event.id);
                      setOpen(false);
                      setSearch('');
                    }}
                    className={`w-full flex items-center gap-3 px-4 py-2.5 text-xs text-left transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-violet-500/20 text-violet-300 border-l-2 border-violet-400'
                        : 'text-white/70 hover:bg-white/5 hover:text-white border-l-2 border-transparent'
                    }`}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                        isSelected ? 'bg-violet-400' : 'bg-white/20'
                      }`}
                    />
                    <span className="truncate">{event.name}</span>
                    <span className="ml-auto text-[10px] text-white/30 flex-shrink-0">
                      {event.category}
                    </span>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};
