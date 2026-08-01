import { collection, doc, getDoc, getDocs, setDoc, updateDoc } from 'firebase/firestore';
import { getDb } from '../../firebase/firestore';
import { now } from '../../services/helpers';
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

interface EventDocLike {
  id: string;
  name?: string;
  category?: string;
  tagline?: string;
  description?: string;
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
  cms_updated_at?: string;
  cms_updated_by?: string;
  cms_updated_by_name?: string;
}

const emptyHero = (): CmsHero => ({
  bannerImage: '',
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
  building: '',
  room: '',
  mapsLink: '',
  registrationDeadline: '',
  participantLimit: '',
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

export async function loadEventCms(eventId: string): Promise<EventCmsData> {
  const db = getDb();
  const data = emptyCmsData(eventId);

  const eventSnap = await getDoc(doc(db, EVENTS_COLLECTION, eventId));
  const eventDoc: EventDocLike = eventSnap.exists() ? ({ id: eventSnap.id, ...eventSnap.data() } as EventDocLike) : { id: eventId };

  const hero: CmsHero = {
    bannerImage: eventDoc.banner || '',
    title: eventDoc.name || '',
    category: eventDoc.category || 'Technical',
    tagline: eventDoc.tagline || '',
    shortDescription: eventDoc.description || '',
    status: fromEventStatus(eventDoc.status),
  };

  const details: CmsEventDetails = {
    date: eventDoc.event_date || '',
    time: eventDoc.time || '',
    venue: eventDoc.venue || '',
    building: eventDoc.building || '',
    room: eventDoc.room || '',
    mapsLink: eventDoc.maps_link || '',
    registrationDeadline: eventDoc.registration_deadline || '',
    participantLimit: eventDoc.max_participants ? String(eventDoc.max_participants) : '',
    dressCode: eventDoc.dress_code || '',
    language: eventDoc.language || '',
    difficultyLevel: eventDoc.difficulty_level || '',
    duration: eventDoc.duration || '',
  };

  const cmsSnap = await getDoc(doc(db, CMS_COLLECTION, eventId));
  if (cmsSnap.exists()) {
    const c = cmsSnap.data() || {};
    const rawSections = asArray(c.sections);
    data.sections =
      rawSections.length > 0
        ? sortSections(rawSections.map((r, i) => normalizeSection(r, i)))
        : buildLegacySections(c, hero, details);
    const meta: CmsMeta = {
      updatedAt: (c.updated_at as string) || eventDoc.cms_updated_at || '',
      updatedBy: (c.updated_by as string) || eventDoc.cms_updated_by || '',
      updatedByName: (c.updated_by_name as string) || eventDoc.cms_updated_by_name || '',
    };
    data.meta = meta;
  } else {
    data.sections = buildLegacySections({}, hero, details);
    const meta: CmsMeta = {
      updatedAt: eventDoc.cms_updated_at || '',
      updatedBy: eventDoc.cms_updated_by || '',
      updatedByName: eventDoc.cms_updated_by_name || '',
    };
    data.meta = meta;
  }

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

export async function saveEventCms(eventId: string, data: EventCmsData, editor: CmsEditor): Promise<EventCmsData> {
  const db = getDb();
  const timestamp = now();

  const heroSection = contentOf(data.sections, 'hero');
  const detailsSection = contentOf(data.sections, 'details');

  const eventPatch: Record<string, any> = {
    cms_updated_at: timestamp,
    cms_updated_by: editor.id,
    cms_updated_by_name: editor.name,
    updated_at: timestamp,
  };
  if (heroSection) {
    const hero = heroSection.content;
    Object.assign(eventPatch, {
      name: hero.title,
      category: hero.category,
      tagline: hero.tagline,
      description: hero.shortDescription,
      banner: hero.bannerImage,
      status: toEventStatus(hero.status),
    });
  }
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

  await updateDoc(doc(db, EVENTS_COLLECTION, eventId), eventPatch);

  const cmsDoc = {
    event_id: eventId,
    sections: data.sections.map((s) => ({ ...s })),
    ...buildLegacyPayload(data.sections),
    updated_at: timestamp,
    updated_by: editor.id,
    updated_by_name: editor.name,
  };
  await setDoc(doc(db, CMS_COLLECTION, eventId), cmsDoc, { merge: true });

  return {
    ...data,
    meta: {
      updatedAt: timestamp,
      updatedBy: editor.id,
      updatedByName: editor.name,
    },
  };
}
