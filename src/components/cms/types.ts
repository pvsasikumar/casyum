export type CmsEventStatus = 'Registration Open' | 'Registration Closed' | 'Completed';

export interface CmsHero {
  bannerImage: string;
  title: string;
  category: string;
  tagline: string;
  shortDescription: string;
  status: CmsEventStatus;
}

export interface CmsEventDetails {
  date: string;
  time: string;
  venue: string;
  building: string;
  room: string;
  mapsLink: string;
  registrationDeadline: string;
  participantLimit: string;
  dressCode: string;
  language: string;
  difficultyLevel: string;
  duration: string;
}

export interface CmsRule {
  id: string;
  text: string;
}

export interface CmsRequirement {
  id: string;
  text: string;
}

export interface CmsPrize {
  id: string;
  label: string;
  description: string;
}

export interface CmsJudgingCriterion {
  id: string;
  criterion: string;
  percentage: number;
}

export interface CmsScheduleItem {
  id: string;
  time: string;
  title: string;
  description: string;
}

export interface CmsFaq {
  id: string;
  question: string;
  answer: string;
}

export interface CmsCoordinatorPerson {
  id: string;
  name: string;
  phone: string;
  email: string;
}

export interface CmsCoordinatorInfo {
  facultyCoordinator: CmsCoordinatorPerson;
  coordinators: CmsCoordinatorPerson[];
}

export interface CmsDownload {
  id: string;
  name: string;
  type: string;
  url: string;
}

export interface CmsGalleryItem {
  id: string;
  url: string;
  caption: string;
  category: string;
}

export interface CmsSponsor {
  id: string;
  name: string;
  logoUrl: string;
  website: string;
  description: string;
}

export interface CmsContact {
  facultyCoordinator: string;
  studentCoordinator: string;
  phone: string;
  email: string;
  whatsapp: string;
}

export interface CmsCardItem {
  id: string;
  title: string;
  description: string;
}

export interface CmsStatItem {
  id: string;
  value: string;
  label: string;
}

export interface CmsMeta {
  updatedAt: string;
  updatedBy: string;
  updatedByName: string;
}

export type CmsSectionType =
  | 'hero'
  | 'details'
  | 'about'
  | 'rules'
  | 'requirements'
  | 'prizes'
  | 'judging'
  | 'timeline'
  | 'faq'
  | 'coordinator'
  | 'downloads'
  | 'gallery'
  | 'sponsors'
  | 'contact'
  | 'heading'
  | 'richText'
  | 'image'
  | 'video'
  | 'cards'
  | 'statistics'
  | 'divider'
  | 'html';

export const CMS_SECTION_TYPES: CmsSectionType[] = [
  'hero',
  'details',
  'about',
  'rules',
  'requirements',
  'prizes',
  'judging',
  'timeline',
  'faq',
  'coordinator',
  'downloads',
  'gallery',
  'sponsors',
  'contact',
  'heading',
  'richText',
  'image',
  'video',
  'cards',
  'statistics',
  'divider',
  'html',
];

export type CmsSectionPadding = 'none' | 'sm' | 'md' | 'lg';

export interface CmsSectionSettings {
  title: string;
  subtitle: string;
  background: string;
  padding: CmsSectionPadding;
  anchorId: string;
  cssClass: string;
}

export interface CmsSectionBase<T extends CmsSectionType, C> {
  id: string;
  sectionType: T;
  displayOrder: number;
  isVisible: boolean;
  settings: CmsSectionSettings;
  content: C;
}

export type CmsSection =
  | CmsSectionBase<'hero', CmsHero>
  | CmsSectionBase<'details', CmsEventDetails>
  | CmsSectionBase<'about', { html: string }>
  | CmsSectionBase<'rules', { items: CmsRule[] }>
  | CmsSectionBase<'requirements', { items: CmsRequirement[] }>
  | CmsSectionBase<'prizes', { items: CmsPrize[] }>
  | CmsSectionBase<'judging', { items: CmsJudgingCriterion[] }>
  | CmsSectionBase<'timeline', { items: CmsScheduleItem[] }>
  | CmsSectionBase<'faq', { items: CmsFaq[] }>
  | CmsSectionBase<'coordinator', CmsCoordinatorInfo>
  | CmsSectionBase<'downloads', { items: CmsDownload[] }>
  | CmsSectionBase<'gallery', { items: CmsGalleryItem[] }>
  | CmsSectionBase<'sponsors', { items: CmsSponsor[] }>
  | CmsSectionBase<'contact', CmsContact>
  | CmsSectionBase<'heading', { text: string; level: 'h2' | 'h3'; align: 'left' | 'center' }>
  | CmsSectionBase<'richText', { html: string }>
  | CmsSectionBase<'image', { url: string; caption: string; alt: string; aspect: string }>
  | CmsSectionBase<'video', { url: string; caption: string }>
  | CmsSectionBase<'cards', { items: CmsCardItem[] }>
  | CmsSectionBase<'statistics', { items: CmsStatItem[] }>
  | CmsSectionBase<'divider', Record<string, never>>
  | CmsSectionBase<'html', { html: string }>;

export interface EventCmsData {
  eventId: string;
  sections: CmsSection[];
  meta: CmsMeta;
}

export interface CmsEditor {
  id: string;
  name: string;
  role: string;
}

export function createCmsId(): string {
  return `itm-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function defaultSectionSettings(): CmsSectionSettings {
  return { title: '', subtitle: '', background: '', padding: 'md', anchorId: '', cssClass: '' };
}

export function defaultContent(type: CmsSectionType): Record<string, unknown> {
  const newId = () => createCmsId();
  switch (type) {
    case 'hero':
      return { bannerImage: '', title: '', category: 'Technical', tagline: '', shortDescription: '', status: 'Registration Open' };
    case 'details':
      return { date: '', time: '', venue: '', building: '', room: '', mapsLink: '', registrationDeadline: '', participantLimit: '', dressCode: '', language: '', difficultyLevel: '', duration: '' };
    case 'about':
    case 'richText':
      return { html: '' };
    case 'rules':
    case 'requirements':
      return { items: [] };
    case 'prizes':
      return {
        items: [
          { id: newId(), label: '1st Prize', description: '' },
          { id: newId(), label: '2nd Prize', description: '' },
          { id: newId(), label: '3rd Prize', description: '' },
          { id: newId(), label: 'Special Mention', description: '' },
        ],
      };
    case 'judging':
    case 'timeline':
    case 'faq':
    case 'downloads':
    case 'gallery':
    case 'sponsors':
    case 'cards':
    case 'statistics':
      return { items: [] };
    case 'coordinator':
      return {
        facultyCoordinator: { id: newId(), name: '', phone: '', email: '' },
        coordinators: [{ id: newId(), name: '', phone: '', email: '' }],
      };
    case 'contact':
      return { facultyCoordinator: '', studentCoordinator: '', phone: '', email: '', whatsapp: '' };
    case 'heading':
      return { text: '', level: 'h2', align: 'left' };
    case 'image':
      return { url: '', caption: '', alt: '', aspect: 'aspect-video' };
    case 'video':
      return { url: '', caption: '' };
    case 'divider':
      return {};
    case 'html':
      return { html: '' };
  }
}

export function createSection(type: CmsSectionType, displayOrder: number): CmsSection {
  const settings = defaultSectionSettings();
  if (type === 'hero') settings.padding = 'none';
  const base = { id: createCmsId(), sectionType: type, displayOrder, isVisible: true, settings };
  return { ...base, content: defaultContent(type) } as CmsSection;
}

export function patchSectionContent<S extends CmsSection>(section: S, patch: Partial<S['content']>): S {
  return { ...section, content: { ...section.content, ...patch } } as S;
}

export function hasContent(section: CmsSection): boolean {
  switch (section.sectionType) {
    case 'hero':
      return Boolean(
        section.content.title?.trim() ||
          section.content.tagline?.trim() ||
          section.content.shortDescription?.trim() ||
          section.content.bannerImage?.trim()
      );
    case 'details':
    case 'contact':
      return Object.values(section.content).some((v) => typeof v === 'string' && v.trim() !== '');
    case 'about':
    case 'richText':
    case 'html':
      return section.content.html.replace(/<[^>]*>/g, '').trim().length > 0;
    case 'rules':
    case 'requirements':
    case 'prizes':
    case 'judging':
    case 'timeline':
    case 'faq':
    case 'downloads':
    case 'gallery':
    case 'sponsors':
    case 'cards':
    case 'statistics':
      return section.content.items.length > 0;
    case 'coordinator':
      return Boolean(
        section.content.facultyCoordinator.name?.trim() ||
          section.content.coordinators.some((c) => c.name?.trim())
      );
    case 'heading':
      return Boolean(section.content.text?.trim());
    case 'image':
      return Boolean(section.content.url?.trim());
    case 'video':
      return Boolean(section.content.url?.trim());
    case 'divider':
      return true;
  }
}

export function sortSections(sections: CmsSection[]): CmsSection[] {
  return [...sections].sort((a, b) => a.displayOrder - b.displayOrder);
}

export function reindexSections(sections: CmsSection[]): CmsSection[] {
  return sections.map((s, i) => ({ ...s, displayOrder: i }));
}

export function emptyCmsData(eventId: string): EventCmsData {
  return { eventId, sections: [], meta: { updatedAt: '', updatedBy: '', updatedByName: '' } };
}
