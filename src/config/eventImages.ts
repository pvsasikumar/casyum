/**
 * Central mapping of event slug -> static event image.
 *
 * The images live in the Vite `public` folder so they are copied verbatim into
 * the production build and served from the site root on both local dev and
 * Vercel. Paths are root-relative on purpose (e.g. `/images/events/debugging.png`).
 */
export const EVENT_IMAGES: Record<string, string> = {
  debugging: '/images/events/debugging.png',
  'tech-quiz': '/images/events/tech_quiz.png',
  'paper-presentation': '/images/events/paper_presentation.png',
  hackathon: '/images/events/hackathon.png',
  'poster-designing': '/images/events/poster_designing.png',
  connexion: '/images/events/connexion.png',
  'lan-party': '/images/events/lan_party.png',
  adzap: '/images/events/adzap.png',
  'short-film': '/images/events/short_film.png',
  'ipl-auction': '/images/events/ipl_auction.png',
};

export const DEFAULT_EVENT_IMAGE = '/images/events/default-event.jpg';

/**
 * Only treat a stored value as a real image source. This rejects icon names
 * (e.g. `Calendar`), broken placeholders and local filesystem paths while
 * accepting Firebase URLs, other absolute http(s) URLs, root-relative paths and
 * inline data URIs.
 */
export function isValidStoredImage(src?: string | null): boolean {
  if (!src || typeof src !== 'string') return false;
  const value = src.trim();
  if (!value) return false;
  if (/^(https?:)?\/\//i.test(value)) return true;
  if (value.startsWith('/')) return true;
  if (/^data:image\//i.test(value)) return true;
  return false;
}

/**
 * Resolve the image to show for an event using the fallback priority:
 *   1. Firebase CMS image URL (if a valid one is stored)
 *   2. Local static event image (from the central slug map)
 *   3. Default CASYUM event image
 */
export function eventImageForSlug(slug: string, storedImage?: string | null): string {
  if (isValidStoredImage(storedImage)) return (storedImage as string).trim();
  const local = EVENT_IMAGES[slug || ''];
  return local || DEFAULT_EVENT_IMAGE;
}
