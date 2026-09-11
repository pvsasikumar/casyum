import { DEFAULT_SPONSOR_CATEGORIES } from '../types/sponsorship';
import type { Sponsor, SponsorCategory, SponsorLogoSize } from '../types/sponsorship';

/**
 * Manually managed sponsor list for the public "Powered by Visionaries"
 * section. This is fully static — no Firebase, database or backend involved.
 *
 * Images live in the Vite `public` folder so they are copied verbatim into the
 * production build and served from the site root on both local dev and Vercel.
 * Paths are root-relative on purpose (e.g. `/images/sponsors/sponsor-1.png`).
 *
 * To add a sponsor:
 *   1. Drop the logo into `public/images/sponsors/` (e.g. `sponsor-1.png`).
 *   2. Add one entry to `SPONSORS` below using a root-relative logo path.
 *
 * Each entry supports:
 *   - name         Sponsor display name (required).
 *   - logo         Local logo path, e.g. "/images/sponsors/sponsor-1.png".
 *                  A missing/unreachable file falls back to the placeholder badge.
 *   - website      Optional external website, e.g. "https://example.com".
 *   - category     Optional group shown above the logo. Reuse a value from
 *                  DEFAULT_SPONSOR_CATEGORIES to control ordering and logo size
 *                  (e.g. "Title Sponsor", "Powered By", "Gold Sponsor").
 *   - description  Optional one-liner (shown below the Title Sponsor).
 *   - logoSize     Optional "small" | "medium" | "large" override.
 *   - displayOrder Optional number used to sort sponsors within a category.
 */
export interface StaticSponsorEntry {
  name: string;
  logo: string;
  website?: string;
  category?: string;
  description?: string;
  logoSize?: SponsorLogoSize;
  displayOrder?: number;
}

export const SPONSORS: StaticSponsorEntry[] = [
  {
    name: 'Inspire',
    logo: '/images/events/Inspire.jpeg',
    category: 'Event Sponsor',
  },
  // Example — uncomment & fill in once you have a real sponsor:
  // {
  //   name: 'Example Sponsor',
  //   logo: '/images/sponsors/sponsor-1.png',
  //   website: 'https://example.com',
  //   category: 'Gold Sponsor',
  // },
];

function toSponsor(entry: StaticSponsorEntry, index: number): Sponsor {
  return {
    id: `sponsor-${index + 1}`,
    name: entry.name,
    logoUrl: entry.logo,
    category: entry.category || 'Sponsors',
    description: entry.description || '',
    websiteUrl: entry.website || '',
    displayOrder: entry.displayOrder ?? index,
    status: 'Active',
    approvalStatus: 'Approved',
    logoSize: entry.logoSize,
    displayAmount: false,
    createdBy: '',
    createdAt: '',
    updatedAt: '',
  };
}

/** Sponsors as consumed by the public Sponsors section. */
export const STATIC_SPONSORS: Sponsor[] = SPONSORS.map(toSponsor);

/** Categories derived from the sponsor list, ordered like the original site. */
export const STATIC_SPONSOR_CATEGORIES: SponsorCategory[] = Array.from(
  new Set(SPONSORS.map((s) => s.category).filter((c): c is string => Boolean(c)))
)
  .sort(
    (a, b) =>
      (DEFAULT_SPONSOR_CATEGORIES.indexOf(a) === -1 ? 999 : DEFAULT_SPONSOR_CATEGORIES.indexOf(a)) -
      (DEFAULT_SPONSOR_CATEGORIES.indexOf(b) === -1 ? 999 : DEFAULT_SPONSOR_CATEGORIES.indexOf(b))
  )
  .map((name, i) => ({
    id: `category-${i + 1}`,
    name,
    displayOrder: i,
    status: 'Active' as const,
    createdAt: '',
    updatedAt: '',
  }));