import { DEFAULT_EVENT_IMAGE, EVENT_IMAGES, eventImageForSlug, isValidStoredImage } from '../config/eventImages';

export function slugifyEventName(name: string): string {
  return String(name || '')
    .toLowerCase()
    .trim()
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** Name-keyed lookup kept for admin/legacy callers. Paths come from the central map. */
export const EVENT_IMAGE_MAP: Record<string, string> = {
  Debugging: EVENT_IMAGES.debugging,
  'Tech Quiz': EVENT_IMAGES['tech-quiz'],
  'Paper Presentation': EVENT_IMAGES['paper-presentation'],
  Hackathon: EVENT_IMAGES.hackathon,
  'Poster Designing': EVENT_IMAGES['poster-designing'],
  Connexion: EVENT_IMAGES.connexion,
  'LAN Party': EVENT_IMAGES['lan-party'],
  ADZAP: EVENT_IMAGES.adzap,
  'Short Film': EVENT_IMAGES['short-film'],
  'IPL Auction': EVENT_IMAGES['ipl-auction'],
};

export { DEFAULT_EVENT_IMAGE, EVENT_IMAGES, eventImageForSlug, isValidStoredImage };

export function eventImageFor(name: string, storedImage?: string): string {
  return eventImageForSlug(slugifyEventName(name), storedImage);
}

export function eventSlugFor(name: string, storedSlug?: string): string {
  if (storedSlug && storedSlug.trim()) return storedSlug;
  return slugifyEventName(name);
}

export type EventRegistrationStatus =
  | 'Registration Open'
  | 'Registration Closed'
  | 'Event Full'
  | 'Completed';

export function toEventRegistrationStatus(status?: string): EventRegistrationStatus {
  switch (status) {
    case 'Full':
      return 'Event Full';
    case 'Completed':
      return 'Completed';
    case 'Closed':
      return 'Registration Closed';
    default:
      return 'Registration Open';
  }
}
