import React, { useState, useEffect, useCallback } from 'react';
import {
  ShieldAlert,
  Download,
  CheckCircle2,
  AlertTriangle,
  X,
} from 'lucide-react';
import { useAdmin } from '../../context/AdminContext';
import { EventSelector } from '../export/EventSelector';
import { ParticipantTable } from '../export/ParticipantTable';
import { ExportButtons } from '../export/ExportButtons';
import { EventExportService } from '../../services/EventExportService';
import type { EventItem } from '../../types';
import type { RegisteredParticipant } from '../../services/EventExportService';

interface Toast {
  id: string;
  title: string;
  message: string;
  type: 'success' | 'error';
}

let toastId = 0;

export const EventParticipantExport: React.FC = () => {
  const { role, events: contextEvents } = useAdmin();

  const [events, setEvents] = useState<EventItem[]>([]);
  const [eventsLoading, setEventsLoading] = useState(true);
  const [selectedEventId, setSelectedEventId] = useState('');
  const [participants, setParticipants] = useState<RegisteredParticipant[]>([]);
  const [participantsLoading, setParticipantsLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback(
    (title: string, message: string, type: 'success' | 'error') => {
      const id = String(++toastId);
      setToasts((prev) => [...prev, { id, title, message, type }]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 4000);
    },
    []
  );

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  useEffect(() => {
    setEvents(contextEvents);
    setEventsLoading(false);
  }, [contextEvents]);

  useEffect(() => {
    if (!selectedEventId) {
      setParticipants([]);
      return;
    }
    setParticipantsLoading(true);
    EventExportService.getEventParticipants(selectedEventId)
      .then(setParticipants)
      .catch(() => {
        showToast('Error', 'Failed to load participants.', 'error');
      })
      .finally(() => setParticipantsLoading(false));
  }, [selectedEventId, showToast]);

  const selectedEvent = events.find((e) => e.id === selectedEventId) || null;

  const handleExport = useCallback(
    async (format: 'csv' | 'xlsx' | 'pdf') => {
      if (!participants.length) {
        showToast('No Data', 'No participants to export.', 'error');
        return;
      }
      setExporting(true);
      try {
        const label = format.toUpperCase();
        if (format === 'csv') await EventExportService.exportCSV(participants);
        else if (format === 'xlsx') await EventExportService.exportExcel(participants);
        else await EventExportService.exportPDF(participants);
        showToast('Export Successful', `${label} exported successfully.`, 'success');
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Export failed.';
        showToast('Export Failed', msg, 'error');
      } finally {
        setExporting(false);
      }
    },
    [participants, showToast]
  );

  if (role !== 'Super Admin') {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-24 select-none">
        <div className="p-4 rounded-full bg-rose-500/10 border border-rose-500/20">
          <ShieldAlert className="w-10 h-10 text-rose-400" />
        </div>
        <h2 className="text-xl font-extrabold text-white font-display">Access Denied</h2>
        <p className="text-sm text-white/50 max-w-md text-center">
          Only Admin and Super Admin can access this page.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5 select-none pb-12 relative">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div className="flex flex-col">
          <span className="text-xs font-bold text-violet-400 uppercase tracking-widest">
            Data Export
          </span>
          <h2 className="text-xl sm:text-2xl font-extrabold font-display text-white">
            Event-wise Participant Export
          </h2>
          <p className="text-xs text-white/50 mt-1">
            Select an event to view and export registered participants.
          </p>
        </div>
      </div>

      {/* Event Selector */}
      <div className="flex flex-col sm:flex-row sm:items-end gap-4">
        <div className="flex-1">
          <span className="text-[10px] uppercase tracking-widest text-white/30 font-bold mb-1.5 block">
            Select Event
          </span>
          <EventSelector
            events={events}
            selectedEventId={selectedEventId}
            onSelect={setSelectedEventId}
            disabled={eventsLoading}
          />
        </div>
      </div>

      {/* Export Buttons (only show when event selected) */}
      {selectedEvent && !participantsLoading && (
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <Download className="w-4 h-4 text-white/40" />
            <span className="text-xs text-white/50 font-semibold">Export Current Event</span>
          </div>
          <ExportButtons
            onExportCSV={() => handleExport('csv')}
            onExportExcel={() => handleExport('xlsx')}
            onExportPDF={() => handleExport('pdf')}
            loading={exporting}
            disabled={participants.length === 0}
          />
        </div>
      )}

      {/* Participant Table */}
      <ParticipantTable
        participants={participants}
        event={selectedEvent}
        loading={participantsLoading}
      />

      {/* Toasts */}
      <div className="fixed bottom-4 right-4 z-[9999] flex flex-col gap-2 max-w-sm w-full pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`pointer-events-auto flex items-start gap-3 p-4 rounded-2xl bg-zinc-950 border ${
              t.type === 'success' ? 'border-emerald-500/30' : 'border-rose-500/30'
            } shadow-2xl backdrop-blur-xl transition-all duration-300 opacity-100 translate-x-0`}
          >
            <div className="mt-0.5 flex-shrink-0">
              {t.type === 'success' ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              ) : (
                <AlertTriangle className="w-5 h-5 text-rose-400" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-white">{t.title}</p>
              <p className="text-[11px] text-white/60 mt-0.5">{t.message}</p>
            </div>
            <button
              onClick={() => dismissToast(t.id)}
              className="p-0.5 text-white/30 hover:text-white flex-shrink-0 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};
