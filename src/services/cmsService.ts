import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  setDoc,
} from 'firebase/firestore';
import { getDb } from '../firebase/firestore';
import { now, sanitizeFirestoreData } from './helpers';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type CmsSitePageId = 'home' | 'about' | 'events' | 'sponsors' | 'register';

export const CMS_PAGE_IDS: CmsSitePageId[] = ['home', 'about', 'events', 'sponsors', 'register'];

export const CMS_PAGE_LABELS: Record<CmsSitePageId, string> = {
  home: 'Home',
  about: 'About',
  events: 'Events',
  sponsors: 'Sponsors',
  register: 'Register',
};

/** Public URL each page is reachable at (used for hidden-page redirects). */
export const CMS_PAGE_PATHS: Record<CmsSitePageId, string> = {
  home: '/',
  about: '/about',
  events: '/events',
  sponsors: '/sponsors',
  register: '/register',
};

/** Major sections inside every managed page (all visible by default). */
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

export interface CmsPagePayload {
  content: Record<string, any>;
  sections: Record<string, boolean>;
  visible?: boolean;
  navVisible?: boolean;
}

interface PageAuditDoc {
  updated_at?: string;
  updated_by?: string;
  updated_by_name?: string;
  published_at?: string;
  published_by?: string;
  published_by_name?: string;
  draft_saved_at?: string;
  draft_updated_by_name?: string;
  [key: string]: unknown;
}

// ---------------------------------------------------------------------------
// Defaults — migrated verbatim from the original hardcoded public site so the
// website renders exactly the same before any CMS document exists.
// ---------------------------------------------------------------------------

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

/**
 * Merge a stored Firestore doc over the defaults so partially-filled or
 * missing documents always resolve to a complete, render-safe page.
 */
function normalizePageDoc(pageId: CmsSitePageId, data: PageAuditDoc | undefined): ResolvedCmsPage {
  const base = defaultResolvedPage(pageId);
  if (!data) return base;

    const storedSections = (data.sections && typeof data.sections === 'object' ? data.sections : {}) as Record<string, unknown>;
    const sections: Record<string, boolean> = { ...base.sections };
    // Merge stored sections — including keys not in base.defaults (so admin
    // can re-enable previously-hidden sections).
    Object.keys(storedSections).forEach((key) => {
      if (typeof storedSections[key] === 'boolean') sections[key] = storedSections[key] as boolean;
    });
    // The About page's intro and stats are permanently disabled. Strip any
    // stale Firestore values so they never re-appear.
    if (pageId === 'about') {
      delete sections.intro;
      delete sections.stats;
    }

  const storedStats = Array.isArray(data.stats)
    ? (data.stats as any[]).filter((s) => s && typeof s === 'object')
        .map((s, i) => ({
          id: String(s.id || `stat-${i}`),
          value: String(s.value ?? ''),
          label: String(s.label ?? ''),
        }))
    : undefined;

  const storedParagraphs = Array.isArray(data.paragraphs)
    ? (data.paragraphs as unknown[]).map((p) => String(p ?? ''))
    : undefined;

  const storedContent = (data.content && typeof data.content === 'object' ? data.content : {}) as Record<string, unknown>;

  const content: Record<string, any> = { ...base.content };
  Object.keys(content).forEach((key) => {
    if (storedContent[key] !== undefined) content[key] = storedContent[key];
  });
  // Legacy/flat fallbacks: accept fields written directly on the doc too.
  Object.keys(DEFAULT_CONTENT[pageId]).forEach((key) => {
    if (data[key] !== undefined) content[key] = data[key];
  });
  if (storedParagraphs) content.paragraphs = storedParagraphs;
  if (storedStats) content.stats = storedStats;

  return {
    ...base,
    visible: data.visible !== false,
    navVisible: data.nav_visible !== false,
    content,
    sections,
    updatedAt: String(data.updated_at || ''),
    updatedBy: String(data.updated_by || ''),
    updatedByName: String(data.updated_by_name || ''),
    publishedAt: String(data.published_at || ''),
  };
}

// ---------------------------------------------------------------------------
// Firestore paths
// ---------------------------------------------------------------------------

// Collections must have an odd number of path segments and documents an even
// number, so the site CMS uses flat root collections (mirroring `event_cms` /
// `event_drafts`). Documents:
//   cms_pages/{pageId}   cms_drafts/{pageId}   cms_events/{eventId}
const PAGES_COLLECTION = 'cms_pages';
const DRAFT_COLLECTION = 'cms_drafts';
const EVENT_FLAGS_COLLECTION = 'cms_events';

function pageRef(pageId: CmsSitePageId) {
  return doc(getDb(), PAGES_COLLECTION, pageId);
}

function draftRef(pageId: CmsSitePageId) {
  return doc(getDb(), DRAFT_COLLECTION, pageId);
}

function eventFlagRef(eventId: string) {
  return doc(getDb(), EVENT_FLAGS_COLLECTION, eventId);
}

// ---------------------------------------------------------------------------
// Public-site reads
// ---------------------------------------------------------------------------

/** One-shot read of all published pages merged over defaults. */
export async function loadPublishedPages(): Promise<Record<CmsSitePageId, ResolvedCmsPage>> {
  const map = {} as Record<CmsSitePageId, ResolvedCmsPage>;
  CMS_PAGE_IDS.forEach((id) => {
    map[id] = defaultResolvedPage(id);
  });
  try {
    const snap = await getDocs(collection(getDb(), PAGES_COLLECTION));
    snap.docs.forEach((d) => {
      const id = d.id as CmsSitePageId;
      if (CMS_PAGE_IDS.includes(id)) {
        map[id] = normalizePageDoc(id, d.data() as PageAuditDoc);
      }
    });
  } catch {
    // Keep defaults when the collection cannot be read yet.
  }
  return map;
}

/**
 * Live subscription used by the public site. Fires immediately with defaults
 * and again whenever an admin publishes visibility/content changes.
 */
export function subscribeCmsPages(
  onNext: (pages: Record<CmsSitePageId, ResolvedCmsPage>) => void,
  onError?: (error: Error) => void
): () => void {
  let latest: Record<CmsSitePageId, ResolvedCmsPage> | null = null;
  const emit = () => {
    if (latest) onNext(latest);
  };
  emitDefault();
  function emitDefault() {
    const map = {} as Record<CmsSitePageId, ResolvedCmsPage>;
    CMS_PAGE_IDS.forEach((id) => {
      map[id] = defaultResolvedPage(id);
    });
    latest = map;
    emit();
  }
  const db = getDb();
  if (!db) return () => {};
  return onSnapshot(
    collection(db, PAGES_COLLECTION),
    (snap) => {
      const map = {} as Record<CmsSitePageId, ResolvedCmsPage>;
      CMS_PAGE_IDS.forEach((id) => {
        map[id] = defaultResolvedPage(id);
      });
      snap.docs.forEach((d) => {
        const id = d.id as CmsSitePageId;
        if (CMS_PAGE_IDS.includes(id)) {
          map[id] = normalizePageDoc(id, d.data() as PageAuditDoc);
        }
      });
      latest = map;
      emit();
    },
    (error) => onError?.(error)
  );
}

/** Live subscription for the admin overview: which pages currently have drafts. */
export function subscribeCmsDraftInfo(
  onNext: (info: Record<string, { savedAt: string; savedBy: string }>) => void,
  onError?: (error: Error) => void
): () => void {
  return onSnapshot(
    collection(getDb(), DRAFT_COLLECTION),
    (snap) => {
      const info: Record<string, { savedAt: string; savedBy: string }> = {};
      snap.docs.forEach((d) => {
        const data = d.data() as PageAuditDoc;
        info[d.id] = {
          savedAt: String(data.draft_saved_at || ''),
          savedBy: String(data.draft_updated_by_name || ''),
        };
      });
      onNext(info);
    },
    (error) => onError?.(error)
  );
}

// ---------------------------------------------------------------------------
// Admin editing: load / save draft / publish
// ---------------------------------------------------------------------------

export interface EditableCmsPage extends ResolvedCmsPage {
  isDraft: boolean;
}

/**
 * Load a page for editing. Prefers the stored private draft; otherwise seeds
 * from the published version (or defaults) — mirroring the event CMS flow.
 */
export async function loadPageForEditing(pageId: CmsSitePageId): Promise<EditableCmsPage> {
  const base = normalizePageDoc(pageId, (await getDoc(pageRef(pageId))).data() as PageAuditDoc | undefined);
  try {
    const draftSnap = await getDoc(draftRef(pageId));
    if (draftSnap.exists()) {
      const draft = normalizePageDoc(pageId, draftSnap.data() as PageAuditDoc);
      const audit = draftSnap.data() as PageAuditDoc;
      return {
        ...draft,
        // Visibility is always edited live against the published doc.
        visible: base.visible,
        navVisible: base.navVisible,
        updatedAt: String(audit.draft_saved_at || draft.updatedAt),
        updatedBy: draft.updatedBy,
        updatedByName: String(audit.draft_updated_by_name || draft.updatedByName),
        isDraft: true,
      };
    }
  } catch {
    // Draft unreadable (permissions) — fall through to published state.
  }
  return { ...base, isDraft: false };
}

function buildPageDoc(
  payload: CmsPagePayload,
  editor: CmsEditor,
  timestamp: string,
  opts: { publish: boolean; previous?: PageAuditDoc }
): Record<string, any> {
  const docData: Record<string, any> = {
    content: sanitizeFirestoreData(payload.content),
    sections: payload.sections,
    visible: payload.visible !== false,
    nav_visible: payload.navVisible !== false,
    updated_at: timestamp,
    updated_by: editor.id,
    updated_by_name: editor.name,
  };
  if (opts.publish) {
    docData.published_at = timestamp;
    docData.published_by = editor.id;
    docData.published_by_name = editor.name;
  } else {
    docData.draft_saved_at = timestamp;
    docData.draft_updated_by_name = editor.name;
  }
  void opts.previous;
  return docData;
}

/** Saves a private draft. The public site keeps showing the published version. */
export async function saveCmsPageDraft(
  pageId: CmsSitePageId,
  payload: CmsPagePayload,
  editor: CmsEditor
): Promise<void> {
  const timestamp = now();
  await setDoc(draftRef(pageId), sanitizeFirestoreData(buildPageDoc(payload, editor, timestamp, { publish: false })), { merge: true });
}

/** Publishes content + section visibility to the public site and clears the draft. */
export async function publishCmsPage(
  pageId: CmsSitePageId,
  payload: CmsPagePayload,
  editor: CmsEditor
): Promise<void> {
  const timestamp = now();
  await setDoc(
    pageRef(pageId),
    sanitizeFirestoreData(buildPageDoc(payload, editor, timestamp, { publish: true })),
    { merge: true }
  );
  deleteDoc(draftRef(pageId)).catch(() => {});
}

/** Immediate visibility toggle (Hide/Show) straight onto the published doc. */
export async function setCmsPageVisibility(
  pageId: CmsSitePageId,
  visible: boolean,
  editor: CmsEditor
): Promise<void> {
  const timestamp = now();
  await setDoc(
    pageRef(pageId),
    sanitizeFirestoreData({
      visible,
      updated_at: timestamp,
      updated_by: editor.id,
      updated_by_name: editor.name,
      published_at: timestamp,
      published_by: editor.id,
      published_by_name: editor.name,
    }),
    { merge: true }
  );
}

/** Immediate navigation-item toggle (Navigation Management). */
export async function setCmsNavVisibility(
  pageId: CmsSitePageId,
  navVisible: boolean,
  editor: CmsEditor
): Promise<void> {
  const timestamp = now();
  await setDoc(
    pageRef(pageId),
    sanitizeFirestoreData({
      nav_visible: navVisible,
      updated_at: timestamp,
      updated_by: editor.id,
      updated_by_name: editor.name,
      published_at: timestamp,
      published_by: editor.id,
      published_by_name: editor.name,
    }),
    { merge: true }
  );
}

// ---------------------------------------------------------------------------
// Event-level flags (Rule Book visibility etc.)
// ---------------------------------------------------------------------------

export async function fetchRuleBookVisible(eventId: string): Promise<boolean> {
  try {
    const snap = await getDoc(eventFlagRef(eventId));
    if (!snap.exists()) return true;
    return snap.data().ruleBookVisible !== false;
  } catch {
    return true;
  }
}

export async function setRuleBookVisibility(
  eventId: string,
  visible: boolean,
  editor: CmsEditor
): Promise<void> {
  const timestamp = now();
  await setDoc(
    eventFlagRef(eventId),
    sanitizeFirestoreData({
      eventId,
      ruleBookVisible: visible,
      updated_at: timestamp,
      updated_by: editor.id,
      updated_by_name: editor.name,
    }),
    { merge: true }
  );
}

// ---------------------------------------------------------------------------
// Formatting helpers
// ---------------------------------------------------------------------------

/** "22 Aug 2026, 4:30 PM" style audit stamps for the admin UI. */
export function formatCmsTimestamp(iso: string): string {
  if (!iso) return '—';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '—';
  const day = date.getDate();
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const month = months[date.getMonth()];
  const year = date.getFullYear();
  let hours = date.getHours();
  const minutes = date.getMinutes().toString().padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12 || 12;
  return `${day} ${month} ${year}, ${hours}:${minutes} ${ampm}`;
}
