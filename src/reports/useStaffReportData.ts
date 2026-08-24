import { useEffect, useMemo, useRef, useState } from 'react';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import type { Unsubscribe } from 'firebase/firestore';
import { getDb } from '../firebase/firestore';
import {
  buildReportRows,
  type AttendanceDoc,
  type ParticipantDoc,
  type RegistrationDoc,
  type ReportEventDoc,
} from './buildReportRows';
import type { ReportEventOption, ReportRow, ReportScope } from './types';

interface RawState {
  participants: Map<string, ParticipantDoc>;
  events: Map<string, ReportEventDoc>;
  registrations: Map<string, RegistrationDoc>;
  attendance: Map<string, AttendanceDoc>;
}

const EMPTY: RawState = {
  participants: new Map(),
  events: new Map(),
  registrations: new Map(),
  attendance: new Map(),
};

/**
 * Live Firestore loader behind the staff report.
 *
 * Subscribes to the EXISTING collections (participants / eventRegistrations /
 * attendance / events) and joins them into report rows on every update, so
 * verification / payment / attendance changes appear without manual reloads.
 *
 * Coordinator scope (`mode: 'assigned'`) constrains every query to assigned
 * event ids - exactly what Firestore rules permit - so manipulating the client
 * cannot widen the visible data window.
 */
export function useStaffReportData(
  scope: ReportScope
): { rows: ReportRow[]; events: ReportEventOption[]; loading: boolean; error: string | null } {
  const scopeKey =
    scope.mode === 'assigned' ? `assigned:${[...scope.eventIds].sort().join(',')}` : 'full';

  const [state, setState] = useState<RawState>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (scope.mode === 'assigned' && scope.eventIds.filter(Boolean).length === 0) {
      setState(EMPTY);
      setLoading(false);
      setError('No events are assigned to you yet.');
      return () => {};
    }
    const assignedIds =
      scope.mode === 'assigned' ? scope.eventIds.map(String).filter(Boolean) : null;

    const db = getDb();
    mountedRef.current = true;
    setLoading(true);
    setError(null);
    setState(EMPTY);

    // Per-source doc maps rebuilt on every snapshot; merged into React state
    // so deletions in one query never leave stale docs behind.
    const participants = new Map<string, ParticipantDoc>();
    const events = new Map<string, ReportEventDoc>();
    const regSources = new Map<string, Map<string, RegistrationDoc>>();
    const attSources = new Map<string, Map<string, AttendanceDoc>>();

    let pending = 0; // required sources awaiting their first snapshot

    const emit = () => {
      if (!mountedRef.current) return;
      const regs = new Map<string, RegistrationDoc>();
      regSources.forEach((m) => m.forEach((doc, id) => regs.set(id, doc)));
      const att = new Map<string, AttendanceDoc>();
      attSources.forEach((m) => m.forEach((doc, id) => att.set(id, doc)));
      setState({ participants: new Map(participants), events: new Map(events), registrations: regs, attendance: att });
    };
    const settle = () => {
      pending -= 1;
      if (pending <= 0 && mountedRef.current) setLoading(false);
    };
    const fail = (msg: string) => {
      if (mountedRef.current) setError(msg);
    };

    const unsubs: Unsubscribe[] = [];

    // --- Events (public read; drives dropdown + Event Type column) ----------
    pending += 1;
    unsubs.push(
      onSnapshot(
        collection(db, 'events'),
        (s) => {
          events.clear();
          s.docs.forEach((d) => events.set(d.id, { id: d.id, ...d.data() } as ReportEventDoc));
          emit();
          settle();
        },
        () => settle()
      )
    );

    // --- Participants ---------------------------------------------------------
    pending += 1;
    unsubs.push(
      onSnapshot(
        collection(db, 'participants'),
        (s) => {
          participants.clear();
          s.docs.forEach((d) => participants.set(d.id, { id: d.id, ...d.data() } as ParticipantDoc));
          emit();
          settle();
        },
        (err) => {
          fail(err.message || 'You are not authorized to view participant data.');
          settle();
        }
      )
    );

    // --- Registrations --------------------------------------------------------
    if (!assignedIds) {
      pending += 1;
      unsubs.push(
        onSnapshot(
          collection(db, 'eventRegistrations'),
          (s) => {
            const m = new Map<string, RegistrationDoc>();
            s.docs.forEach((d) => m.set(d.id, { id: d.id, ...d.data() } as RegistrationDoc));
            regSources.set('full', m);
            emit();
            settle();
          },
          () => {
            // Canonical collection unavailable: fall back to the legacy mirror.
            const legacy = onSnapshot(
              collection(db, 'registrations'),
              (s2) => {
                const m = new Map<string, RegistrationDoc>();
                s2.docs.forEach((d) => m.set(d.id, { id: d.id, ...d.data() } as RegistrationDoc));
                regSources.set('legacy', m);
                regSources.delete('full');
                emit();
              },
              (err2) => fail(err2.message || 'You are not authorized to view registration data.')
            );
            unsubs.push(legacy);
            settle();
          }
        )
      );
    } else {
      let regPending = assignedIds.length;
      assignedIds.forEach((eventId) => {
        const srcA = `reg:${eventId}:id`;
        const srcB = `reg:${eventId}:ids`;
        const collect = (docs: any[], srcKey: string) => {
          const m = new Map<string, RegistrationDoc>();
          docs.forEach((d) => m.set(d.id, d));
          regSources.set(srcKey, m);
          emit();
        };
        unsubs.push(
          onSnapshot(
            query(collection(db, 'eventRegistrations'), where('event_id', '==', eventId)),
            (s) => {
              collect(
                s.docs.map((d) => ({ id: d.id, ...d.data() }) as RegistrationDoc),
                srcA
              );
              if (regPending > 0) {
                regPending -= 1;
                if (regPending === 0) settle();
              }
            },
            () => {
              if (regPending > 0) {
                regPending -= 1;
                if (regPending === 0) settle();
              }
            }
          )
        );
        // Bundle registrations list every selected event in event_ids. The
        // constrained query above already covers rule-permitted rows for this
        // coordinator, so a rejected wider query is tolerated silently.
        unsubs.push(
          onSnapshot(
            query(collection(db, 'eventRegistrations'), where('event_ids', 'array-contains', eventId)),
            (s) =>
              collect(
                s.docs.map((d) => ({ id: d.id, ...d.data() }) as RegistrationDoc),
                srcB
              ),
            () => {}
          )
        );
      });
    }

    return () => {
      mountedRef.current = false;
      unsubs.forEach((u) => u());
    };
  }, [scopeKey]); // eslint-disable-line react-hooks/exhaustive-deps

  // --- Attendance (optional source). Some roles cannot read this collection;
  // they still get attendance mirrored via registration documents, so failures
  // here degrade silently instead of breaking the report.
  useEffect(() => {
    if (scope.mode === 'assigned' && scope.eventIds.filter(Boolean).length === 0) {
      return () => {};
    }
    const assignedIds =
      scope.mode === 'assigned' ? scope.eventIds.map(String).filter(Boolean) : null;
    const db = getDb();
    mountedRef.current = true;

    const attSources = new Map<string, Map<string, AttendanceDoc>>();
    const emitAtt = () => {
      if (!mountedRef.current) return;
      const merged = new Map<string, AttendanceDoc>();
      attSources.forEach((m) => m.forEach((doc, id) => merged.set(id, doc)));
      setState((prev) => ({ ...prev, attendance: merged }));
    };

    const unsubs: Unsubscribe[] = [];
    const collect = (s: any, srcKey: string, eventId?: string) => {
      const m = new Map<string, AttendanceDoc>();
      s.docs.forEach((d: any) =>
        m.set(d.id, { id: d.id, ...d.data(), ...(eventId ? { event_id: eventId } : {}) } as AttendanceDoc)
      );
      attSources.set(srcKey, m);
      emitAtt();
    };

    if (!assignedIds) {
      unsubs.push(
        onSnapshot(
          collection(db, 'attendance'),
          (s) => collect(s, 'att:full'),
          () => {}
        )
      );
    } else {
      assignedIds.forEach((eventId) => {
        unsubs.push(
          onSnapshot(
            query(collection(db, 'attendance'), where('event_id', '==', eventId)),
            (s) => collect(s, `att:${eventId}`, eventId),
            () => {}
          )
        );
      });
    }
    return () => {
      unsubs.forEach((u) => u());
    };
  }, [scopeKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const eventOptions = useMemo<ReportEventOption[]>(() => {
    const allowed = scope.mode === 'assigned' ? new Set(scope.eventIds.map(String)) : null;
    let list: ReportEventOption[] = Array.from(state.events.values()).map((e) => ({
      id: String(e.id),
      name: String(e.name || e.id),
    }));
    if (allowed) list = list.filter((e) => allowed.has(e.id));
    list.sort((a, b) => a.name.localeCompare(b.name));
    return list;
  }, [state.events, scope.mode, scopeKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const rows = useMemo<ReportRow[]>(() => {
    const assigned =
      scope.mode === 'assigned' ? scope.eventIds.map(String).filter(Boolean) : null;
    return buildReportRows(
      Array.from(state.participants.values()),
      Array.from(state.registrations.values()),
      Array.from(state.attendance.values()),
      Array.from(state.events.values()),
      assigned
    );
  }, [state.participants, state.registrations, state.attendance, state.events, scope.mode, scopeKey]); // eslint-disable-line react-hooks/exhaustive-deps

  return { rows, events: eventOptions, loading, error };
}

