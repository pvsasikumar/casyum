/**
 * Shared rules for CASYUM event selection & fees.
 *
 * Regular events: a participant may select up to 2 events for a flat fee of
 * ₹150. Gaming events (Free Fire / BGMI) are special: a participant may select
 * exactly one gaming event for ₹250. The two categories are combined into a
 * single bundled registration with only three possible totals: ₹150, ₹250 or
 * ₹400. Selecting both gaming events, more than 2 regular events, two regular
 * events plus a gaming event, or a zero selection is always rejected.
 */

export const GAMING_EVENT_NAMES = ['Free Fire', 'BGMI'] as const;

export const MAX_REGULAR_EVENTS = 2;
export const REGULAR_EVENT_FEE = 150;
export const GAMING_EVENT_FEE = 250;
export const REGULAR_PLUS_GAMING_FEE = REGULAR_EVENT_FEE + GAMING_EVENT_FEE;

export const ALLOWED_TOTALS = [
  REGULAR_EVENT_FEE,
  GAMING_EVENT_FEE,
  REGULAR_PLUS_GAMING_FEE,
] as const;

/** A minimal view of an event that is enough to classify it. */
export interface EventSelectionLike {
  id?: string | number;
  eventId?: string | number;
  name?: string;
  eventName?: string;
  category?: string;
  type?: string;
  event_type?: string;
  is_gaming?: boolean;
  /** ISO date (`YYYY-MM-DD`) used to scope time-clash detection. */
  event_date?: string;
  /** Legacy alias for `event_date` used by the admin event model. */
  date?: string;
  /** Free-text display time, e.g. `10:00 AM - 4:00 PM`. */
  time?: string;
}

export interface SelectedEventRef {
  eventId: string;
  eventName: string;
}

export interface SelectedGamingRef {
  eventId: string;
  eventName: string;
}

export interface SelectedEventsData {
  regular: SelectedEventRef[];
  gaming: SelectedGamingRef | null;
}

export function isGamingEventName(name: string): boolean {
  const n = String(name || '').trim().toLowerCase();
  return GAMING_EVENT_NAMES.some((g) => g.toLowerCase() === n);
}

export function isGamingEvent(event: EventSelectionLike | null | undefined): boolean {
  if (!event) return false;
  if (event.is_gaming === true) return true;
  if (String(event.event_type || '').toLowerCase() === 'gaming') return true;
  if (String(event.type || '').toLowerCase() === 'gaming') return true;
  if (String(event.category || '').toLowerCase() === 'gaming') return true;
  return isGamingEventName(String(event.name || event.eventName || ''));
}

/** Canonical fee breakdown returned by every fee calculation entry point. */
export interface RegistrationFeeBreakdown {
  regularCount: number;
  gamingCount: number;
  regularFee: number;
  gamingFee: number;
  total: number;
}

export interface EventFeeBreakdown extends RegistrationFeeBreakdown {
  totalFee: number;
}

function feeFromCounts(regularCount: number, gamingCount: number): RegistrationFeeBreakdown {
  const rc = Math.max(0, Math.min(Number(regularCount) || 0, MAX_REGULAR_EVENTS));
  const gc = Math.max(0, Math.min(Number(gamingCount) || 0, 1));
  const regularFee = rc > 0 ? REGULAR_EVENT_FEE : 0;
  const gamingFee = gc > 0 ? GAMING_EVENT_FEE : 0;
  return {
    regularCount: rc,
    gamingCount: gc,
    regularFee,
    gamingFee,
    total: regularFee + gamingFee,
  };
}

/**
 * The single, reusable CASYUM registration fee calculator.
 *
 * Accepts the currently selected events as full event objects (preferred) or
 * plain event IDs (resolved through the optional `eventsById` lookup). Gaming
 * events (Free Fire / BGMI) are identified through `isGamingEvent`; everything
 * else counts as a regular event. The total is always one of ₹150, ₹250, ₹400
 * or ₹0 — never a per-event multiplication.
 *
 * Returns `{ regularFee, gamingFee, total }` plus the resolved counts.
 */
export function calculateRegistrationFee(
  selectedEvents: Array<EventSelectionLike | string | number> | null | undefined,
  eventsById?: Record<string, EventSelectionLike>
): RegistrationFeeBreakdown {
  const items = Array.isArray(selectedEvents) ? selectedEvents : [];
  let regularCount = 0;
  let gamingCount = 0;
  for (const item of items) {
    if (item === null || item === undefined) continue;
    let ev: EventSelectionLike;
    if (typeof item === 'object') {
      ev = item as EventSelectionLike;
    } else {
      const key = String(item);
      ev = (eventsById && (eventsById[key] || eventsById[item])) || { id: key, name: key };
    }
    if (isGamingEvent(ev)) {
      gamingCount = Math.min(gamingCount + 1, 1);
    } else {
      regularCount = Math.min(regularCount + 1, MAX_REGULAR_EVENTS);
    }
  }
  return feeFromCounts(regularCount, gamingCount);
}

/**
 * Returns the registration fee for a single event, derived through the shared
 * `calculateRegistrationFee` calculator. Regular events return ₹150, gaming
 * events (Free Fire / BGMI) return ₹250 — never a per-event price.
 */
export function singleEventRegistrationFee(event: EventSelectionLike | null | undefined): number {
  return calculateRegistrationFee(event ? [event] : []).total;
}

/**
 * Legacy count-based calculator. Kept for callers that already know the number
 * of regular / gaming events selected; delegates to the same core rules.
 */
export function computeEventSelectionFee(
  regularCount: number,
  gamingCount: number
): EventFeeBreakdown {
  const breakdown = feeFromCounts(regularCount, gamingCount);
  return { ...breakdown, totalFee: breakdown.total };
}

export function formatEventSelection(regular: SelectedEventRef[], gaming: SelectedGamingRef | null): string {
  const names = regular.map((r) => r.eventName);
  if (gaming) names.push(gaming.eventName);
  return names.join(', ');
}

/**
 * Validates a raw selection. Returns an error message when the selection is
 * invalid, otherwise `null`.
 */
export function validateEventSelection(
  regularEvents: EventSelectionLike[],
  gamingEvent: EventSelectionLike | null
): string | null {
  const regular = (regularEvents || []).filter((e) => !isGamingEvent(e));
  const gaming = gamingEvent && !isGamingEvent(gamingEvent) ? null : gamingEvent;

  if (regular.length > MAX_REGULAR_EVENTS) {
    return `You can select a maximum of ${MAX_REGULAR_EVENTS} regular events.`;
  }
  if (gaming && !isGamingEvent(gaming)) {
    return 'You can participate in only one gaming event.';
  }
  if (gaming && regular.length >= MAX_REGULAR_EVENTS) {
    return 'Two regular events cannot be combined with a gaming event.';
  }
  if (regular.length === 0 && !gaming) {
    return 'Please select at least one event to register.';
  }
  return null;
}

/** A resolved event time range, in minutes from midnight. */
export interface EventTimeRange {
  start: number;
  end: number;
}

/** Two selected events whose scheduled times overlap on the same date. */
export interface EventClash {
  eventA: EventSelectionLike;
  eventB: EventSelectionLike;
  eventDate?: string;
}

/**
 * Parse a single clock time (`10:00 AM`, `4pm`, `13:30`) into minutes from
 * midnight. Returns `null` when the value is not a recognizable time.
 */
function parseSingleTime(value: string): number | null {
  const match = String(value || '')
    .trim()
    .match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)?$/i);
  if (!match) return null;
  let hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2] || '0', 10);
  const meridiem = (match[3] || '').toLowerCase();
  if (hours > 23 || minutes > 59) return null;
  if (meridiem === 'am' && hours === 12) hours = 0;
  if (meridiem === 'pm' && hours !== 12) hours += 12;
  return hours * 60 + minutes;
}

/**
 * Tolerant parser for the free-text `time` field (e.g. `10:00 AM - 4:00 PM`).
 *
 * Accepts `-`, `–`, `—`, `to` and `until` separators, 12-hour times with an
 * AM/PM suffix and 24-hour times. Parenthesized suffixes such as `(IST)` are
 * stripped. A bare 12-hour range like `10:00 - 4:00` is interpreted as ending
 * in the PM when the end would otherwise be earlier than the start.
 *
 * Returns `null` when no reliable range can be extracted — callers must then
 * skip the pair rather than guess, so unparseable event times never produce a
 * false scheduling conflict.
 */
export function parseEventTimeRange(time: string): EventTimeRange | null {
  const cleaned = String(time || '')
    .replace(/\([^)]*\)/g, ' ')
    .replace(/–|—|to|until/gi, '-');
  const parts = cleaned
    .split('-')
    .map((p) => p.trim())
    .filter(Boolean);
  if (parts.length !== 2) return null;

  const start = parseSingleTime(parts[0]);
  const end = parseSingleTime(parts[1]);
  if (start === null || end === null) return null;

  let resolvedEnd = end;
  const startHasMeridiem = /[ap]m\b/i.test(parts[0]);
  const endHasMeridiem = /[ap]m\b/i.test(parts[1]);
  if (!startHasMeridiem && !endHasMeridiem && end <= start && end < 12 * 60) {
    resolvedEnd = end + 12 * 60;
  }
  if (resolvedEnd <= start) return null;
  return { start, end };
}

/**
 * Find pairs of selected events whose scheduled times overlap on the same
 * date. Both events must expose a parseable `time` (see `parseEventTimeRange`);
 * otherwise the pair is skipped. Returns an empty array when nothing clashes.
 */
export function findEventTimeClashes(
  events: Array<EventSelectionLike | null | undefined>
): EventClash[] {
  const list = (events || []).filter((e): e is EventSelectionLike => Boolean(e));
  const clashes: EventClash[] = [];
  for (let i = 0; i < list.length; i++) {
    for (let j = i + 1; j < list.length; j++) {
      const a = list[i];
      const b = list[j];
      const dateA = String(a.event_date || a.date || '').trim();
      const dateB = String(b.event_date || b.date || '').trim();
      if (dateA && dateB && dateA !== dateB) continue;
      if (dateA && !dateB) continue;
      if (!dateA && dateB) continue;

      const rangeA = parseEventTimeRange(String(a.time || ''));
      const rangeB = parseEventTimeRange(String(b.time || ''));
      if (!rangeA || !rangeB) continue;

      if (rangeA.start < rangeB.end && rangeB.start < rangeA.end) {
        clashes.push({ eventA: a, eventB: b, eventDate: dateA || undefined });
      }
    }
  }
  return clashes;
}

/** Human-readable warning for a detected scheduling conflict. */
export function eventTimeClashMessage(clash: EventClash): string {
  const aName = String(clash.eventA.name || clash.eventA.eventName || 'Event');
  const bName = String(clash.eventB.name || clash.eventB.eventName || 'Event');
  const aTime = String(clash.eventA.time || '').trim();
  const bTime = String(clash.eventB.time || '').trim();
  return `"${aName}" (${aTime || 'time not set'}) overlaps with "${bName}" (${bTime || 'time not set'})`;
}
