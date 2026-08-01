import React from 'react';
import {
  Image as ImageIcon,
  CalendarDays,
  AlignLeft,
  ListChecks,
  Laptop,
  Trophy,
  Scale,
  Clock4,
  HelpCircle,
  UserRound,
  FileDown,
  Images,
  Handshake,
  Phone,
  Heading2,
  Type,
  ImagePlus,
  Video,
  LayoutGrid,
  BarChart3,
  Minus,
  Code,
} from 'lucide-react';
import type { CmsSectionType } from './types';

export interface SectionMeta {
  type: CmsSectionType;
  label: string;
  description: string;
  icon: React.ElementType;
  adminOnly?: boolean;
  singleton?: boolean;
}

export const SECTION_META: Record<CmsSectionType, SectionMeta> = {
  hero: { type: 'hero', label: 'Hero Banner', description: 'Event banner, title, category and status', icon: ImageIcon, singleton: true },
  details: { type: 'details', label: 'Event Details', description: 'Date, time, venue and logistics', icon: CalendarDays, singleton: true },
  about: { type: 'about', label: 'About Event', description: 'Rich formatted description of the event', icon: AlignLeft },
  rules: { type: 'rules', label: 'Rules', description: 'Numbered list of event rules', icon: ListChecks },
  requirements: { type: 'requirements', label: 'Requirements', description: 'What participants need to bring', icon: Laptop },
  prizes: { type: 'prizes', label: 'Prizes', description: 'Prizes, certificates and recognition', icon: Trophy },
  judging: { type: 'judging', label: 'Judging Criteria', description: 'Weighted scoring breakdown', icon: Scale },
  timeline: { type: 'timeline', label: 'Schedule / Timeline', description: 'Event schedule you can reorder', icon: Clock4 },
  faq: { type: 'faq', label: 'FAQs', description: 'Question and answer accordion', icon: HelpCircle },
  coordinator: { type: 'coordinator', label: 'Coordinator Info', description: 'Faculty and event coordinators', icon: UserRound },
  downloads: { type: 'downloads', label: 'Downloads', description: 'Rulebook, templates and files', icon: FileDown },
  gallery: { type: 'gallery', label: 'Gallery', description: 'Images, posters and banners', icon: Images },
  sponsors: { type: 'sponsors', label: 'Sponsors', description: 'Logos, websites and descriptions', icon: Handshake },
  contact: { type: 'contact', label: 'Contact', description: 'Reach out to coordinators', icon: Phone },
  heading: { type: 'heading', label: 'Heading', description: 'Large heading with alignment', icon: Heading2 },
  richText: { type: 'richText', label: 'Rich Text', description: 'Formatted paragraphs of content', icon: Type },
  image: { type: 'image', label: 'Image', description: 'Single image with caption', icon: ImagePlus },
  video: { type: 'video', label: 'Video Embed', description: 'Embed a YouTube or Vimeo video', icon: Video },
  cards: { type: 'cards', label: 'Cards', description: 'Grid of title and description cards', icon: LayoutGrid },
  statistics: { type: 'statistics', label: 'Statistics', description: 'Numbers like participants or rounds', icon: BarChart3 },
  divider: { type: 'divider', label: 'Divider', description: 'A horizontal separator line', icon: Minus },
  html: { type: 'html', label: 'Custom HTML', description: 'Raw HTML for advanced styling', icon: Code, adminOnly: true },
};

export const SECTION_GROUPS: Array<{ title: string; types: CmsSectionType[] }> = [
  {
    title: 'Core Sections',
    types: ['hero', 'details', 'about', 'rules', 'requirements', 'prizes', 'judging', 'timeline', 'faq', 'coordinator', 'downloads', 'gallery', 'sponsors', 'contact'],
  },
  {
    title: 'Content Blocks',
    types: ['heading', 'richText', 'image', 'video', 'cards', 'statistics', 'divider', 'html'],
  },
];
