/**
 * Shared rules for CASYUM event selection & fees.
 *
 * Regular events: a participant may select up to 3 events for a flat fee of
 * ₹150. Gaming events (Free Fire / BGMI) are special: a participant may select
 * exactly one gaming event for ₹250. The two categories are combined into a
 * single bundled registration with only three possible totals: ₹150, ₹250 or
 * ₹400. Selecting both gaming events, more than 3 regular events, or a zero
 * selection is always rejected.
 */

export const GAMING_EVENT_NAMES = ['Free Fire', 'BGMI'] as const;

export const MAX_REGULAR_EVENTS = 3;
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
    return 'Only one gaming event can be selected. Please choose either Free Fire or BGMI.';
  }
  if (regular.length === 0 && !gaming) {
    return 'Please select at least one event to register.';
  }
  return null;
}
