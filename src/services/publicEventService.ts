import { STATIC_EVENTS, eventImageForStaticEvent, type StaticEvent } from '../config/events';
import { REGULAR_EVENT_FEE } from './eventSelection';

export interface PublicEvent {
  eventId: string;
  slug: string;
  name: string;
  category: string;
  cardImage: string;
  heroImage: string;
  heroImageAlt: string;
  shortDescription: string;
  tagline: string;
  status: string;
  registrationStatus: string;
  isPublished: boolean;
  date: string;
  time: string;
  venue: string;
  fee: number;
  maxParticipants: number;
  registeredCount: number;
  publishedAt: string;
  ruleBookUrl: string;
  ruleBookFileName: string;
  ruleBookVersion: string;
  ruleBookUpdatedAt: string;
}

export const EVENT_NOT_PUBLISHED_MESSAGE = 'Event details are available soon.';

const CATEGORY_ORDER: Record<string, number> = {
  Technical: 0,
  'Non-Technical': 1,
  Gaming: 2,
  Workshop: 3,
};

function toPublicEvent(seed: StaticEvent): PublicEvent {
  const image = eventImageForStaticEvent(seed.slug);
  return {
    eventId: `casyum-${seed.slug}`,
    slug: seed.slug,
    name: seed.name,
    category: seed.category,
    cardImage: image,
    heroImage: image,
    heroImageAlt: seed.name,
    shortDescription: seed.shortDescription,
    tagline: seed.tagline,
    status: 'Open',
    registrationStatus: seed.registrationStatus,
    isPublished: true,
    date: seed.date,
    time: seed.time,
    venue: seed.venue,
    fee: seed.fee || REGULAR_EVENT_FEE,
    maxParticipants: seed.maxParticipants,
    registeredCount: seed.registeredCount,
    publishedAt: '',
    ruleBookUrl: '',
    ruleBookFileName: '',
    ruleBookVersion: '',
    ruleBookUpdatedAt: '',
  };
}

export const PUBLIC_EVENTS: PublicEvent[] = [...STATIC_EVENTS]
  .map(toPublicEvent)
  .sort((a, b) => {
    const cat = (CATEGORY_ORDER[a.category] ?? 99) - (CATEGORY_ORDER[b.category] ?? 99);
    if (cat !== 0) return cat;
    return a.name.localeCompare(b.name);
  });

export async function listPublicEvents(): Promise<PublicEvent[]> {
  return PUBLIC_EVENTS;
}

export function findPublicEvent(target: { slug?: string; name?: string } | string | null | undefined): PublicEvent | null {
  if (!target) return null;
  const slug = String(typeof target === 'string' ? target : target.slug || '')
    .toLowerCase()
    .trim();
  const name = String(typeof target === 'string' ? '' : target.name || '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
  if (!slug && !name) return null;
  const bySlug = PUBLIC_EVENTS.find((e) => e.slug.toLowerCase() === slug);
  if (bySlug) return bySlug;
  return (
    PUBLIC_EVENTS.find((e) => e.name.toLowerCase().replace(/[^a-z0-9]/g, '') === name) || null
  );
}

export async function fetchEventBySlug(slug: string): Promise<PublicEvent | null> {
  const normalized = String(slug || '').toLowerCase();
  if (!normalized) return null;
  const exact = PUBLIC_EVENTS.find((e) => e.slug.toLowerCase() === normalized);
  if (exact) return exact;
  return findPublicEvent(normalized);
}

export async function getEventSummary(eventId: string): Promise<PublicEvent | null> {
  const normalized = String(eventId || '').replace(/^casyum-/, '').toLowerCase();
  return findPublicEvent(normalized) || null;
}

export const FALLBACK_EVENTS: PublicEvent[] = PUBLIC_EVENTS;

export function findFallbackEvent(target: { slug?: string; name?: string } | string | null | undefined): PublicEvent | null {
  return findPublicEvent(target);
}