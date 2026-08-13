import { collection, doc, getDoc, getDocs, type DocumentData } from 'firebase/firestore';
import { getDb } from '../firebase/firestore';
import {
  eventImageForSlug,
  eventSlugFor,
  isValidStoredImage,
  toEventRegistrationStatus,
  type EventRegistrationStatus,
} from './eventSlug';

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

export async function listPublicEvents(): Promise<PublicEvent[]> {
  const db = getDb();
  const snap = await getDocs(collection(db, 'events'));
  return snap.docs
    .map((d) => mapEventDoc(d.id, d.data()))
    .sort((a, b) => {
      const cat = (CATEGORY_ORDER[a.category] ?? 99) - (CATEGORY_ORDER[b.category] ?? 99);
      if (cat !== 0) return cat;
      return a.name.localeCompare(b.name);
    });
}

export async function getEventSummary(eventId: string): Promise<PublicEvent | null> {
  const db = getDb();
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

  return null;
}
