import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Calendar,
  MapPin,
  Clock,
  IndianRupee,
  Loader2,
  Users,
  UserCheck,
  Users2,
} from 'lucide-react';
import { getEvent } from '../../services/eventService';

export const EventDetailsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [event, setEvent] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!id) return;
    let active = true;
    setLoading(true);
    setError('');
    getEvent(id)
      .then((res) => {
        if (active) setEvent(res.event);
      })
      .catch((err) => {
        if (active) setError(err instanceof Error ? err.message : 'Failed to load event details.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [id]);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-6 py-20 flex flex-col items-center gap-3 text-xs text-white/40">
        <Loader2 className="w-6 h-6 animate-spin text-violet-400" />
        Loading event details...
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="max-w-7xl mx-auto px-6 py-20 flex flex-col items-center gap-4 text-center">
        <span className="text-sm text-rose-400">{error || 'Event not found.'}</span>
        <Link
          to="/observer/events"
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-xs font-bold text-white/80 hover:bg-white/10 cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Events
        </Link>
      </div>
    );
  }

  const registrations = event.registrations || [];
  const verified = registrations.filter((r: any) => r.payment_status === 'verified');
  const eligible = registrations.filter((r: any) => r.attendance_eligibility === true);
  const present = registrations.filter((r: any) => r.attendance_status === 'Present');

  const paymentMeta = (status: string) => {
    if (status === 'verified') return { label: 'Verified', cls: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' };
    if (status === 'rejected') return { label: 'Rejected', cls: 'bg-rose-500/20 text-rose-300 border-rose-500/30' };
    return { label: 'Submitted', cls: 'bg-amber-500/20 text-amber-300 border-amber-500/30' };
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col gap-6 select-none pb-16">
      <Link
        to="/observer/events"
        className="flex items-center gap-1.5 text-xs text-white/50 hover:text-white transition-colors cursor-pointer w-fit"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        <span>Back to Events</span>
      </Link>

      {/* Event header */}
      <div className="rounded-3xl bg-zinc-950/60 border border-white/10 backdrop-blur-md overflow-hidden shadow-2xl">
        <div className="p-6 bg-gradient-to-r from-violet-500/15 via-transparent to-transparent flex flex-col gap-4">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="flex flex-col gap-1.5">
              <span className="text-xs font-bold text-violet-400 uppercase tracking-widest">{event.category}</span>
              <h2 className="text-2xl font-extrabold font-display text-white">{event.name}</h2>
              {event.tagline && <p className="text-xs text-white/50">{event.tagline}</p>}
            </div>
            <span
              className={`px-3 py-1 rounded-full text-[10px] font-bold border ${
                event.status === 'Open'
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                  : event.status === 'Full'
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                  : 'bg-rose-500/20 text-rose-300 border-rose-500/30'
              }`}
            >
              {event.status}
            </span>
          </div>

          <div className="flex flex-wrap gap-x-6 gap-y-2 text-xs text-white/70">
            <span className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-white/40" />
              {event.event_date ? new Date(event.event_date).toLocaleDateString() : '—'}
            </span>
            <span className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-white/40" />
              {event.time || '—'}
            </span>
            <span className="flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-white/40" />
              {event.venue || '—'}
            </span>
            <span className="flex items-center gap-1.5">
              <IndianRupee className="w-3.5 h-3.5 text-white/40" />
              {event.fee ? `₹${event.fee}` : 'Free'}
            </span>
          </div>

          {event.description && (
            <p className="text-xs text-white/60 leading-relaxed max-w-3xl">{event.description}</p>
          )}
        </div>

        <div className="border-t border-white/10 grid grid-cols-2 sm:grid-cols-4 divide-x divide-white/5">
          <div className="p-4 flex flex-col gap-1">
            <span className="text-[10px] font-semibold text-white/40 uppercase tracking-wider">Registrations</span>
            <span className="text-lg font-extrabold text-white font-display">{registrations.length}</span>
          </div>
          <div className="p-4 flex flex-col gap-1">
            <span className="text-[10px] font-semibold text-white/40 uppercase tracking-wider">Payments Verified</span>
            <span className="text-lg font-extrabold text-emerald-300 font-display">{verified.length}</span>
          </div>
          <div className="p-4 flex flex-col gap-1">
            <span className="text-[10px] font-semibold text-white/40 uppercase tracking-wider">Attendance Eligible</span>
            <span className="text-lg font-extrabold text-cyan-300 font-display">{eligible.length}</span>
          </div>
          <div className="p-4 flex flex-col gap-1">
            <span className="text-[10px] font-semibold text-white/40 uppercase tracking-wider">Present</span>
            <span className="text-lg font-extrabold text-emerald-300 font-display">{present.length}</span>
          </div>
        </div>
      </div>

      {/* Registrations table (read-only) */}
      <div className="flex flex-col gap-3">
        <h3 className="text-sm font-extrabold font-display text-white flex items-center gap-2">
          <Users2 className="w-4 h-4 text-violet-400" />
          Registered Participants ({registrations.length})
        </h3>

        <div className="rounded-3xl bg-zinc-950/60 border border-white/10 backdrop-blur-md overflow-hidden shadow-2xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-white min-w-[880px]">
              <thead className="bg-white/5 border-b border-white/10 text-[10px] uppercase tracking-wider text-white/50">
                <tr>
                  <th className="p-4">Participant</th>
                  <th className="p-4">College / City</th>
                  <th className="p-4">Contact</th>
                  <th className="p-4">Register Number</th>
                  <th className="p-4">Payment Status</th>
                  <th className="p-4">Desk Verification</th>
                  <th className="p-4">Attendance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {registrations.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-12 text-center text-xs text-white/40">
                      <Users className="w-5 h-5 mx-auto text-white/30 mb-2" />
                      No registrations for this event yet.
                    </td>
                  </tr>
                ) : (
                  registrations.map((r: any) => {
                    const pMeta = paymentMeta(r.payment_status);
                    const vMeta =
                      r.registration_verification_status === 'verified'
                        ? { label: 'Verified', cls: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' }
                        : r.registration_verification_status === 'rejected'
                        ? { label: 'Rejected', cls: 'bg-rose-500/20 text-rose-300 border-rose-500/30' }
                        : { label: 'Pending', cls: 'bg-amber-500/20 text-amber-300 border-amber-500/30' };
                    const aEligible = r.attendance_eligibility === true;
                    return (
                      <tr key={r.registration_id || r.id} className="hover:bg-white/[0.02] transition-colors">
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-violet-500/20 flex items-center justify-center text-xs font-bold text-violet-300 shrink-0">
                              {(r.user_full_name || 'P').split(' ').map((n: string) => n[0]).join('').slice(0, 2)}
                            </div>
                            <div className="flex flex-col">
                              <span className="font-bold text-white">{r.user_full_name || '—'}</span>
                              <span className="text-[10px] text-white/40">{r.user_department || r.department || '—'}</span>
                            </div>
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="flex flex-col">
                            <span className="text-white/70">{r.college || '—'}</span>
                            <span className="text-[10px] text-white/40">{r.city || ''}</span>
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="flex flex-col text-[11px]">
                            <span className="text-white/70">{r.participant_email || '—'}</span>
                            <span className="text-white/40">{r.user_phone || ''}</span>
                          </div>
                        </td>
                        <td className="p-4 font-mono text-[11px] text-white/60">{r.register_number || '—'}</td>
                        <td className="p-4">
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold border ${pMeta.cls}`}>
                            {pMeta.label}
                          </span>
                        </td>
                        <td className="p-4">
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold border ${vMeta.cls}`}>
                            {vMeta.label}
                          </span>
                        </td>
                        <td className="p-4">
                          {aEligible ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold border bg-emerald-500/20 text-emerald-300 border-emerald-500/30">
                              <UserCheck className="w-3 h-3" />
                              {r.attendance_status === 'Present' ? 'Present' : r.attendance_status === 'Absent' ? 'Absent' : 'Eligible'}
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[9px] font-bold border bg-white/5 text-white/40 border-white/10">
                              Not Eligible
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
