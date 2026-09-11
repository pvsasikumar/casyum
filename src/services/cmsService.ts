export type CmsSitePageId = 'home' | 'about' | 'events' | 'sponsors' | 'register';

export const CMS_PAGE_IDS: CmsSitePageId[] = ['home', 'about', 'events', 'sponsors', 'register'];

export const CMS_PAGE_LABELS: Record<CmsSitePageId, string> = {
  home: 'Home',
  about: 'About',
  events: 'Events',
  sponsors: 'Sponsors',
  register: 'Register',
};

export const CMS_PAGE_PATHS: Record<CmsSitePageId, string> = {
  home: '/',
  about: '/about',
  events: '/events',
  sponsors: '/sponsors',
  register: '/register',
};

export type CmsHomeSectionKey = 'hero' | 'ctaButtons' | 'footer';
export type CmsAboutSectionKey = 'intro' | 'stats' | 'locationMap';
export type CmsEventsSectionKey = 'header' | 'pricing' | 'listing';
export type CmsSponsorsSectionKey = 'header' | 'titleSponsor' | 'sponsorGrid' | 'sponsorCta';
export type CmsRegisterSectionKey = 'signInPanel';

export const CMS_PAGE_SECTION_KEYS: Record<CmsSitePageId, string[]> = {
  home: ['hero', 'ctaButtons', 'footer'],
  about: ['locationMap'],
  events: ['header', 'pricing', 'listing'],
  sponsors: ['header', 'titleSponsor', 'sponsorGrid', 'sponsorCta'],
  register: ['signInPanel'],
};

export const CMS_PAGE_SECTION_LABELS: Record<string, string> = {
  hero: 'Hero',
  ctaButtons: 'CTA Buttons (Register / Login)',
  footer: 'Footer',
  intro: 'Introduction',
  stats: 'Highlights Stats',
  locationMap: 'Location Map',
  header: 'Header',
  pricing: 'Registration Pricing',
  listing: 'Event Listing',
  titleSponsor: 'Title Sponsor Highlight',
  sponsorGrid: 'Sponsor Categories Grid',
  sponsorCta: 'Become a Sponsor CTA',
  signInPanel: 'Registration Form Panel',
};

export interface CmsStatItem {
  id: string;
  value: string;
  label: string;
}

export interface CmsHomeContent {
  heroTitle: string;
  heroSubtitle: string;
  heroDescription: string;
  backgroundImage: string;
  backgroundImageAlt: string;
}

export interface CmsAboutContent {
  kicker: string;
  title: string;
  paragraphs: string[];
  stats: CmsStatItem[];
}

export interface CmsEventsContent {
  kicker: string;
  title: string;
  description: string;
}

export interface CmsSponsorsContent {
  kicker: string;
  title: string;
  subtitle: string;
}

export interface CmsRegisterContent {
  kicker: string;
  heading: string;
  description: string;
}

export interface CmsEditor {
  id: string;
  name: string;
  role?: string;
}

export interface ResolvedCmsPage {
  pageId: CmsSitePageId;
  visible: boolean;
  navVisible: boolean;
  content: Record<string, any>;
  sections: Record<string, boolean>;
  updatedAt: string;
  updatedBy: string;
  updatedByName: string;
  publishedAt: string;
}

const DEFAULT_CONTENT: Record<CmsSitePageId, Record<string, any>> = {
  home: {
    heroTitle: 'CASYUM 2K26',
    heroSubtitle: 'National Level Symposium',
    heroDescription: '',
    backgroundImage: '/images/final.jpeg',
    backgroundImageAlt: 'Hero Background Centerpiece',
  },
  about: {
    kicker: 'The Legacy',
    title: 'Where Innovation Meets Execution.',
    paragraphs: [
      'CASYUM is the flagship national symposium hosted by the Department of Computer Applications, School of Applied Science, under the Faculty of Liberal Arts and Business Studies at SRM Institute of Science and Technology. Year after year, we bring together the brightest minds in technology, design, and software engineering to compete, collaborate, and push the boundaries of what is possible.',
      'CASYUM 2K26 is themed around cosmic crystallization and futurism, embodying the assembly of ideas into functional brilliance. Step into the arena and claim your spot among the pioneers.',
    ],
    stats: [
      { id: 'stat-events', value: '10+', label: 'National Events' },
      { id: 'stat-prizes', value: '₹1.5L+', label: 'Cash Prizes' },
      { id: 'stat-delegates', value: '500+', label: 'Delegates' },
      { id: 'stat-hackathon', value: '24Hr', label: 'Hackathon' },
    ],
  },
  events: {
    kicker: 'Challenge Yourself',
    title: 'Arena of Battles',
    description:
      'Participate in multiple categories and compete with peers nationwide to win cash prizes and recognition. Hover over the bento cards to activate stars, 3D tilt, magnetism, and global spotlighting.',
  },
  sponsors: {
    kicker: 'Our Sponsors',
    title: 'Powered by Visionaries',
    subtitle:
      'The organizations fueling CASYUM 2K26. We are grateful to every partner whose support brings this national symposium to life.',
  },
  register: {
    kicker: 'Secure Your Spot',
    heading: 'Join the Symposium',
    description:
      'Register for CASYUM 2K26 through the official Google Form. It opens in a new tab — no account needed.',
  },
};

function defaultSections(pageId: CmsSitePageId): Record<string, boolean> {
  const sections: Record<string, boolean> = {};
  CMS_PAGE_SECTION_KEYS[pageId].forEach((key) => {
    sections[key] = true;
  });
  return sections;
}

function defaultResolvedPage(pageId: CmsSitePageId): ResolvedCmsPage {
  return {
    pageId,
    visible: true,
    navVisible: true,
    content: { ...DEFAULT_CONTENT[pageId] },
    sections: defaultSections(pageId),
    updatedAt: '',
    updatedBy: '',
    updatedByName: '',
    publishedAt: '',
  };
}

export async function loadPublishedPages(): Promise<Record<CmsSitePageId, ResolvedCmsPage>> {
  const map = {} as Record<CmsSitePageId, ResolvedCmsPage>;
  CMS_PAGE_IDS.forEach((id) => {
    map[id] = defaultResolvedPage(id);
  });
  return map;
}