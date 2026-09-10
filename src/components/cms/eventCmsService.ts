import { collection, doc, getDoc, getDocs, setDoc, updateDoc } from 'firebase/firestore';
import { getDb } from '../../firebase/firestore';
import { now, sanitizeFirestoreData } from '../../services/helpers';
import { slugifyEventName, eventImageForSlug, isValidStoredImage } from '../../services/eventSlug';
import type {
  CmsEditor,
  CmsEventStatus,
  EventCmsData,
  CmsHero,
  CmsEventDetails,
  CmsMeta,
  CmsSection,
  CmsSectionType,
  CmsSectionSettings,
} from './types';
import { CMS_SECTION_TYPES, createCmsId, createSection, defaultContent, defaultSectionSettings, emptyCmsData, sortSections } from './types';

const EVENTS_COLLECTION = 'events';
const CMS_COLLECTION = 'event_cms';
const DRAFT_COLLECTION = 'event_drafts';

interface EventDocLike {
  id: string;
  name?: string;
  category?: string;
  tagline?: string;
  description?: string;
  shortDescription?: string;
  slug?: string;
  cardImage?: string;
  banner?: string;
  venue?: string;
  time?: string;
  event_date?: string;
  status?: string;
  max_participants?: number;
  fee?: number;
  registered_count?: number;
  faculty_coordinator?: string;
  student_coordinator?: string;
  registration_deadline?: string;
  building?: string;
  room?: string;
  maps_link?: string;
  dress_code?: string;
  language?: string;
  difficulty_level?: string;
  duration?: string;
  isPublished?: boolean;
  publishedAt?: string;
  cms_updated_at?: string;
  cms_updated_by?: string;
  cms_updated_by_name?: string;
}

const emptyHero = (): CmsHero => ({
  bannerImage: '',
  bannerImagePath: '',
  bannerImageAlt: '',
  title: '',
  category: 'Technical',
  tagline: '',
  shortDescription: '',
  status: 'Registration Open',
});

const emptyDetails = (): CmsEventDetails => ({
  date: '',
  time: '',
  venue: '',
  teamSize: '',
  category: '',
  registrationFee: '',
  participantLimit: '',
  registrationStatus: '',
  building: '',
  room: '',
  mapsLink: '',
  registrationDeadline: '',
  dressCode: '',
  language: '',
  difficultyLevel: '',
  duration: '',
});

export function toEventStatus(status: CmsEventStatus): string {
  switch (status) {
    case 'Registration Open':
      return 'Open';
    case 'Registration Closed':
      return 'Closed';
    case 'Completed':
      return 'Completed';
    default:
      return 'Open';
  }
}

function fromEventStatus(status?: string): CmsEventStatus {
  if (status === 'Closed') return 'Registration Closed';
  if (status === 'Completed') return 'Completed';
  return 'Registration Open';
}

function asArray(value: unknown): any[] {
  return Array.isArray(value) ? value : [];
}

function normalizeSection(raw: any, index: number): CmsSection {
  const type: CmsSectionType = CMS_SECTION_TYPES.includes(raw?.sectionType) ? raw.sectionType : 'richText';
  const stored = raw?.content && typeof raw.content === 'object' ? raw.content : {};
  const settings: CmsSectionSettings = { ...defaultSectionSettings(), ...(raw?.settings || {}) };
  const base = {
    id: typeof raw?.id === 'string' && raw.id ? raw.id : createCmsId(),
    sectionType: type,
    displayOrder: Number.isFinite(Number(raw?.displayOrder)) ? Number(raw.displayOrder) : index,
    isVisible: raw?.isVisible !== false,
    settings,
  };
  return { ...base, content: { ...defaultContent(type), ...stored } } as CmsSection;
}

/**
 * When the CMS has no usable Firebase hero image yet, fall back to the static
 * event image shipped with the app so the hero renders immediately instead of
 * showing an empty/drop-zone (or a stuck upload) state.
 */
function applyLocalHeroImage(sections: CmsSection[], eventDoc: EventDocLike): CmsSection[] {
  const localImage = eventImageForSlug(slugifyEventName(eventDoc.name || ''), '');
  return sections.map((section) => {
    if (section.sectionType !== 'hero') return section;
    const content = section.content as CmsHero;
    if (isValidStoredImage(content.bannerImage)) return section;
    return { ...section, content: { ...content, bannerImage: localImage, bannerImagePath: '' } };
  });
}

function buildLegacySections(
  c: Record<string, any>,
  hero: CmsHero,
  details: CmsEventDetails
): CmsSection[] {
  const mk = (type: CmsSectionType, i: number) => createSection(type, i);
  const fill = (section: CmsSection, content: Record<string, unknown>): CmsSection =>
    ({
      ...section,
      content: { ...(section.content as Record<string, unknown>), ...content },
    } as CmsSection);

  return [
    fill(mk('hero', 0), { ...hero }),
    fill(mk('details', 1), { ...details }),
    fill(mk('about', 2), { html: (c.about_html as string) || '' }),
    fill(mk('rules', 3), { items: asArray(c.rules) }),
    fill(mk('requirements', 4), { items: asArray(c.requirements) }),
    fill(mk('prizes', 5), { items: asArray(c.prizes) }),
    fill(mk('judging', 6), { items: asArray(c.judging_criteria) }),
    fill(mk('timeline', 7), { items: asArray(c.schedule) }),
    fill(mk('faq', 8), { items: asArray(c.faqs) }),
    fill(mk('coordinator', 9), {
      facultyCoordinator: c.coordinator_info?.facultyCoordinator || { id: createCmsId(), name: '', phone: '', email: '' },
      coordinators: asArray(c.coordinator_info?.coordinators),
    }),
    fill(mk('downloads', 10), { items: asArray(c.downloads) }),
    fill(mk('gallery', 11), { items: asArray(c.gallery) }),
    fill(mk('sponsors', 12), { items: asArray(c.sponsors) }),
    fill(mk('contact', 13), {
      facultyCoordinator: '',
      studentCoordinator: '',
      phone: '',
      email: '',
      whatsapp: '',
      ...(c.contact || {}),
    }),
  ];
}

export async function listEventsForCms(): Promise<Array<{ id: string; name: string }>> {
  const db = getDb();
  const snap = await getDocs(collection(db, EVENTS_COLLECTION));
  return snap.docs
    .map((d) => ({ id: d.id, name: (d.data()?.name as string) || 'Event' }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

async function readEventDoc(eventId: string): Promise<EventDocLike> {
  const db = getDb();
  const snap = await getDoc(doc(db, EVENTS_COLLECTION, eventId));
  return snap.exists() ? ({ id: snap.id, ...snap.data() } as EventDocLike) : { id: eventId };
}

function eventDocToHero(eventDoc: EventDocLike): CmsHero {
  const hero = (eventDoc as any).hero as
    | { imageUrl?: string; imagePath?: string; imageAlt?: string; title?: string; tagline?: string; description?: string; shortDescription?: string }
    | undefined;
  // Priority: Firebase CMS image URL -> local static event image -> default image.
  const storedBanner = [hero?.imageUrl, eventDoc.banner, eventDoc.cardImage].find(isValidStoredImage) || '';
  const localImage = eventImageForSlug(slugifyEventName(eventDoc.name || ''), '');
  const banner = storedBanner || localImage;
  const bannerIsStored = storedBanner !== '';
  return {
    bannerImage: banner,
    bannerImagePath: bannerIsStored ? hero?.imagePath || '' : '',
    bannerImageAlt: hero?.imageAlt || '',
    title: hero?.title || eventDoc.name || '',
    category: eventDoc.category || 'Technical',
    tagline: hero?.tagline || eventDoc.tagline || '',
    shortDescription: hero?.shortDescription || hero?.description || eventDoc.shortDescription || eventDoc.description || '',
    status: fromEventStatus(eventDoc.status),
  };
}

function eventDocToDetails(eventDoc: EventDocLike): CmsEventDetails {
  return {
    date: eventDoc.event_date || '',
    time: eventDoc.time || '',
    venue: eventDoc.venue || '',
    teamSize: String((eventDoc as any).team_size || ''),
    category: '',
    registrationFee: '',
    participantLimit: eventDoc.max_participants ? String(eventDoc.max_participants) : '',
    registrationStatus: '',
    building: eventDoc.building || '',
    room: eventDoc.room || '',
    mapsLink: eventDoc.maps_link || '',
    registrationDeadline: eventDoc.registration_deadline || '',
    dressCode: eventDoc.dress_code || '',
    language: eventDoc.language || '',
    difficultyLevel: eventDoc.difficulty_level || '',
    duration: eventDoc.duration || '',
  };
}

interface LoadOptions {
  draft?: boolean;
}

export async function loadEventCms(eventId: string, options?: LoadOptions): Promise<EventCmsData> {
  const db = getDb();
  const data = emptyCmsData(eventId);
  if (!db) return data;
  const eventDoc = await readEventDoc(eventId);
  const hero = eventDocToHero(eventDoc);
  const details = eventDocToDetails(eventDoc);

  const collectionName = options?.draft ? DRAFT_COLLECTION : CMS_COLLECTION;
  const cmsSnap = await getDoc(doc(db, collectionName, eventId));

  const buildData = (c: Record<string, any>, meta: CmsMeta): EventCmsData => {
    const rawSections = asArray(c.sections);
    if (rawSections.length > 0) {
      data.sections = sortSections(rawSections.map((r, i) => normalizeSection(r, i)));
    } else {
      data.sections = buildLegacySections(c, hero, details);
    }
    data.sections = applyLocalHeroImage(data.sections, eventDoc);
    data.meta = meta;
    return data;
  };

  if (cmsSnap.exists()) {
    const c = cmsSnap.data() || {};
    const meta: CmsMeta = {
      updatedAt: (c.updated_at as string) || eventDoc.cms_updated_at || '',
      updatedBy: (c.updated_by as string) || eventDoc.cms_updated_by || '',
      updatedByName: (c.updated_by_name as string) || eventDoc.cms_updated_by_name || '',
      publishedAt: (c.published_at as string) || (c.cms_published_at as string) || '',
      publishedBy: (c.published_by as string) || '',
      publishedByName: (c.published_by_name as string) || '',
    };
    return buildData(c, meta);
  }

  // Draft requested but no draft exists yet -> seed from the published version
  // so the coordinator edits from the current public state.
  if (options?.draft) {
    const publishedSnap = await getDoc(doc(db, CMS_COLLECTION, eventId));
    if (publishedSnap.exists()) {
      const c = publishedSnap.data() || {};
      const meta: CmsMeta = {
        updatedAt: (c.updated_at as string) || eventDoc.cms_updated_at || '',
        updatedBy: (c.updated_by as string) || eventDoc.cms_updated_by || '',
        updatedByName: (c.updated_by_name as string) || eventDoc.cms_updated_by_name || '',
        publishedAt: (c.published_at as string) || (c.updated_at as string) || '',
        publishedBy: (c.published_by as string) || '',
        publishedByName: (c.published_by_name as string) || '',
      };
      return buildData(c, meta);
    }
  }

  data.sections = buildLegacySections({}, hero, details);
  const meta: CmsMeta = {
    updatedAt: eventDoc.cms_updated_at || '',
    updatedBy: eventDoc.cms_updated_by || '',
    updatedByName: eventDoc.cms_updated_by_name || '',
    publishedAt: eventDoc.publishedAt || eventDoc.cms_updated_at || '',
    publishedBy: (eventDoc as any).cms_published_by || '',
    publishedByName: (eventDoc as any).cms_published_by_name || '',
  };
  data.meta = meta;
  return data;
}

function contentOf<T extends CmsSectionType>(sections: CmsSection[], type: T): Extract<CmsSection, { sectionType: T }> | undefined {
  return sections.find((s) => s.sectionType === type) as Extract<CmsSection, { sectionType: T }> | undefined;
}

function buildLegacyPayload(sections: CmsSection[]): Record<string, any> {
  const about = contentOf(sections, 'about')?.content.html || contentOf(sections, 'richText')?.content.html || '';
  const coordinator = contentOf(sections, 'coordinator')?.content;
  const contact = contentOf(sections, 'contact')?.content;
  return {
    hero: contentOf(sections, 'hero')?.content || emptyHero(),
    details: contentOf(sections, 'details')?.content || emptyDetails(),
    about_html: about,
    rules: contentOf(sections, 'rules')?.content.items || [],
    requirements: contentOf(sections, 'requirements')?.content.items || [],
    prizes: contentOf(sections, 'prizes')?.content.items || [],
    judging_criteria: contentOf(sections, 'judging')?.content.items || [],
    schedule: contentOf(sections, 'timeline')?.content.items || [],
    faqs: contentOf(sections, 'faq')?.content.items || [],
    coordinator_info: coordinator || {
      facultyCoordinator: { id: createCmsId(), name: '', phone: '', email: '' },
      coordinators: [],
    },
    downloads: contentOf(sections, 'downloads')?.content.items || [],
    gallery: contentOf(sections, 'gallery')?.content.items || [],
    sponsors: contentOf(sections, 'sponsors')?.content.items || [],
    contact: contact || { facultyCoordinator: '', studentCoordinator: '', phone: '', email: '', whatsapp: '' },
  };
}

function buildCmsDoc(
  eventId: string,
  data: EventCmsData,
  timestamp: string,
  editor: CmsEditor,
  published?: boolean
): Record<string, any> {
  const doc: Record<string, any> = {
    event_id: eventId,
    sections: data.sections.map((s) => ({ ...s })),
    ...buildLegacyPayload(data.sections),
    updated_at: timestamp,
    updated_by: editor.id,
    updated_by_name: editor.name,
  };
  if (published) {
    doc.published_at = timestamp;
    doc.published_by = editor.id;
    doc.published_by_name = editor.name;
  } else {
    doc.draft_saved_at = timestamp;
  }
  return doc;
}

/** Saves the coordinator's draft. Draft changes never touch the public event doc. */
export async function saveEventCmsDraft(eventId: string, data: EventCmsData, editor: CmsEditor): Promise<EventCmsData> {
  const db = getDb();
  const timestamp = now();
  await setDoc(doc(db, DRAFT_COLLECTION, eventId), sanitizeFirestoreData(buildCmsDoc(eventId, data, timestamp, editor)), { merge: true });
  return {
    ...data,
    meta: {
      ...data.meta,
      updatedAt: timestamp,
      updatedBy: editor.id,
      updatedByName: editor.name,
    },
  };
}

/** Publishes draft content to the public event page. */
export async function publishEventCms(eventId: string, data: EventCmsData, editor: CmsEditor): Promise<EventCmsData> {
  const db = getDb();
  const timestamp = now();

  const heroSection = contentOf(data.sections, 'hero');
  const detailsSection = contentOf(data.sections, 'details');
  const eventDoc = await readEventDoc(eventId);
  const heroTitle = heroSection?.content.title?.trim() || eventDoc.name || 'Event';
  const slug = slugifyEventName(heroTitle);
  const heroContent = heroSection?.content || emptyHero();
  const cardImage = heroContent.bannerImage || eventDoc.cardImage || eventDoc.banner || '';
  const shortDescription = heroContent.shortDescription || eventDoc.shortDescription || eventDoc.description || '';

  const eventPatch: Record<string, any> = {
    name: heroTitle,
    slug,
    category: heroContent.category || eventDoc.category || 'Technical',
    tagline: heroContent.tagline || eventDoc.tagline || '',
    shortDescription,
    cardImage,
    description: shortDescription,
    banner: cardImage,
    status: heroSection ? toEventStatus(heroContent.status) : eventDoc.status || 'Open',
    isPublished: true,
    publishedAt: timestamp,
    updated_at: timestamp,
    cms_updated_at: timestamp,
    cms_updated_by: editor.id,
    cms_updated_by_name: editor.name,
    hero: {
      title: heroTitle,
      tagline: heroContent.tagline || eventDoc.tagline || '',
      description: shortDescription,
      imageUrl: heroContent.bannerImage || '',
      imagePath: heroContent.bannerImagePath || '',
      imageAlt: heroContent.bannerImageAlt || '',
      updatedAt: timestamp,
      updatedBy: editor.id,
      updatedByName: editor.name,
    },
  };

  if (detailsSection) {
    const details = detailsSection.content;
    const participantLimitNum = Number(details.participantLimit);
    Object.assign(eventPatch, {
      venue: details.venue,
      event_date: details.date,
      time: details.time,
      registration_deadline: details.registrationDeadline,
      building: details.building,
      room: details.room,
      maps_link: details.mapsLink,
      dress_code: details.dressCode,
      language: details.language,
      difficulty_level: details.difficultyLevel,
      duration: details.duration,
    });
    if (Number.isFinite(participantLimitNum) && participantLimitNum > 0) {
      eventPatch.max_participants = participantLimitNum;
    }
  }

  await updateDoc(doc(db, EVENTS_COLLECTION, eventId), sanitizeFirestoreData(eventPatch));
  await setDoc(doc(db, CMS_COLLECTION, eventId), sanitizeFirestoreData(buildCmsDoc(eventId, data, timestamp, editor, true)), { merge: true });

  return {
    ...data,
    meta: {
      ...data.meta,
      updatedAt: timestamp,
      updatedBy: editor.id,
      updatedByName: editor.name,
      publishedAt: timestamp,
      publishedBy: editor.id,
      publishedByName: editor.name,
    },
  };
}

/**
 * Legacy "Save Changes" path used by the admin module. Saves the CMS as the
 * published public content immediately.
 */
export async function saveEventCms(eventId: string, data: EventCmsData, editor: CmsEditor): Promise<EventCmsData> {
  return publishEventCms(eventId, data, editor);
}
