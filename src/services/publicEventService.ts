import { collection, doc, getDoc, getDocs, type DocumentData } from 'firebase/firestore';
import { getDb } from '../firebase/firestore';
import {
  DEFAULT_EVENT_IMAGE,
  EVENT_IMAGES,
  eventImageForSlug,
  eventSlugFor,
  isValidStoredImage,
  toEventRegistrationStatus,
  type EventRegistrationStatus,
} from './eventSlug';
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
  registrationStatus: EventRegistrationStatus;
  isPublished: boolean;
  date: string;
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

function mapEventDoc(eventId: string, data: DocumentData): PublicEvent {
  const name = String(data.name || 'Event');
  const hero = (data.hero && typeof data.hero === 'object' ? data.hero : {}) as {
    imageUrl?: string;
    imageAlt?: string;
    title?: string;
    tagline?: string;
    description?: string;
  };
  const slug = eventSlugFor(name, data.slug);
  const storedImage = [data.cardImage, data.banner, data.iconName].find(isValidStoredImage) || '';
  const cardImage = eventImageForSlug(slug, storedImage);
  const heroImage = isValidStoredImage(hero.imageUrl) ? (hero.imageUrl as string) : cardImage;
  return {
    eventId,
    slug,
    name: hero.title || name,
    category: String(data.category || 'Technical'),
    cardImage,
    heroImage,
    heroImageAlt: String(hero.imageAlt || ''),
    shortDescription: String(hero.description || data.shortDescription || data.description || ''),
    tagline: String(hero.tagline || data.tagline || ''),
    status: String(data.status || 'Open'),
    registrationStatus: toEventRegistrationStatus(data.status),
    isPublished: data.isPublished === true,
    date: String(data.event_date || data.date || ''),
    venue: String(data.venue || ''),
    fee: Number(data.fee) || 0,
    maxParticipants: Number(data.max_participants) || 0,
    registeredCount: Number(data.registered_count) || 0,
    publishedAt: String(data.publishedAt || data.cms_updated_at || ''),
    ruleBookUrl: String(data.ruleBookUrl || ''),
    ruleBookFileName: String(data.ruleBookFileName || ''),
    ruleBookVersion: String(data.ruleBookVersion || ''),
    ruleBookUpdatedAt: String(data.ruleBookUpdatedAt || ''),
  };
}

const CATEGORY_ORDER: Record<string, number> = {
  Technical: 0,
  'Non-Technical': 1,
  Gaming: 2,
  Workshop: 3,
};

/**
 * Static fallback events used when Firestore is unavailable or the `events`
 * collection is empty. This keeps the public Events section and the event
 * details route fully functional (in development and during Firebase outages)
 * while preserving the exact same cards users already see.
 */
interface FallbackEventSeed {
  slug: string;
  name: string;
  category: string;
  description: string;
}

const FALLBACK_SEEDS: FallbackEventSeed[] = [
  { slug: 'debugging', name: 'Debugging', category: 'Technical', description: 'Find bugs, fix syntax, and resolve logic errors under intense time limits.' },
  { slug: 'tech-quiz', name: 'Tech Quiz', category: 'Technical', description: 'Test your core computer science, algorithms, and general tech trivia knowledge.' },
  { slug: 'paper-presentation', name: 'Paper Presentation', category: 'Technical', description: 'Present innovative research on advanced technologies to industry judges.' },
  { slug: 'hackathon', name: 'Hackathon', category: 'Technical', description: 'Prototype solutions for real-world problems in this intense coding sprint.' },
  { slug: 'poster-designing', name: 'Poster Designing', category: 'Technical', description: 'Design visually striking cyberpunk/futuristic posters illustrating tech concepts.' },
  { slug: 'connexion', name: 'Connexion', category: 'Technical', description: 'Decipher logical associations and technical terms from visual clues.' },
  { slug: 'lan-party', name: 'LAN Party', category: 'Non-Technical', description: 'Dominate the esports arena in high-octane gaming tournaments.' },
  { slug: 'adzap', name: 'ADZAP', category: 'Non-Technical', description: 'Pitch futuristic products with high creativity, humor, and marketing flair.' },
  { slug: 'short-film', name: 'Short Film', category: 'Non-Technical', description: 'Showcase your cinematic vision, storytelling, and editing skills.' },
  { slug: 'ipl-auction', name: 'IPL Auction', category: 'Non-Technical', description: 'Strategize, bid, and assemble the ultimate cricket squad under budget caps.' },
];

function fallbackEvent(seed: FallbackEventSeed): PublicEvent {
  const image = EVENT_IMAGES[seed.slug] || DEFAULT_EVENT_IMAGE;
  return {
    eventId: `fallback-${seed.slug}`,
    slug: seed.slug,
    name: seed.name,
    category: seed.category,
    cardImage: image,
    heroImage: image,
    heroImageAlt: seed.name,
    shortDescription: seed.description,
    tagline: seed.description,
    status: 'Open',
    registrationStatus: 'Registration Open',
    isPublished: true,
    date: '',
    venue: '',
    fee: REGULAR_EVENT_FEE,
    maxParticipants: 0,
    registeredCount: 0,
    publishedAt: '',
    ruleBookUrl: '',
    ruleBookFileName: '',
    ruleBookVersion: '',
    ruleBookUpdatedAt: '',
  };
}

export const FALLBACK_EVENTS: PublicEvent[] = FALLBACK_SEEDS.map(fallbackEvent);

export function findFallbackEvent(target: { slug?: string; name?: string } | string | null | undefined): PublicEvent | null {
  if (!target) return null;
  const slug = String(typeof target === 'string' ? target : target.slug || '')
    .toLowerCase()
    .trim();
  const name = String(typeof target === 'string' ? '' : target.name || '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
  if (!slug && !name) return null;
  const bySlug = FALLBACK_EVENTS.find((e) => e.slug === slug);
  if (bySlug) return bySlug;
  const byName = FALLBACK_EVENTS.find((e) => e.name.toLowerCase().replace(/[^a-z0-9]/g, '') === name);
  return byName || null;
}

export async function listPublicEvents(): Promise<PublicEvent[]> {
  const db = getDb();
  if (!db) return FALLBACK_EVENTS;
  try {
    const snap = await getDocs(collection(db, 'events'));
    const events = snap.docs
      .map((d) => mapEventDoc(d.id, d.data()))
      .sort((a, b) => {
        const cat = (CATEGORY_ORDER[a.category] ?? 99) - (CATEGORY_ORDER[b.category] ?? 99);
        if (cat !== 0) return cat;
        return a.name.localeCompare(b.name);
      });
    return events.length > 0 ? events : FALLBACK_EVENTS;
  } catch {
    return FALLBACK_EVENTS;
  }
}

export async function getEventSummary(eventId: string): Promise<PublicEvent | null> {
  const db = getDb();
  if (!db) return null;
  const snap = await getDoc(doc(db, 'events', String(eventId)));
  if (!snap.exists()) return null;
  return mapEventDoc(snap.id, snap.data());
}

export async function fetchEventBySlug(slug: string): Promise<PublicEvent | null> {
  const normalized = String(slug || '').toLowerCase();
  if (!normalized) return null;

  let events: PublicEvent[] = [];
  try {
    events = await listPublicEvents();
  } catch {
    return null;
  }

  const exact = events.find((e) => e.slug.toLowerCase() === normalized);
  if (exact) return exact;

  const byName = events.find((e) => e.name.toLowerCase().replace(/[^a-z0-9]/g, '') === normalized.replace(/[^a-z0-9]/g, ''));
  if (byName) return byName;

  return findFallbackEvent(normalized);
}
