import { DEFAULT_EVENT_IMAGE, EVENT_IMAGES } from './eventImages';

export interface StaticEvent {
  slug: string;
  name: string;
  category: string;
  shortDescription: string;
  tagline: string;
  date: string;
  time: string;
  venue: string;
  fee: number;
  maxParticipants: number;
  registeredCount: number;
  registrationStatus: 'Registration Open' | 'Registration Closed' | 'Event Full' | 'Completed';
}

export const STATIC_EVENTS: StaticEvent[] = [
  {
    slug: 'debugging',
    name: 'Debugging',
    category: 'Technical',
    shortDescription: 'Find bugs, fix syntax, and resolve logic errors under intense time limits.',
    tagline: 'Find bugs, fix syntax, and resolve logic errors under intense time limits.',
    date: '',
    time: '',
    venue: '',
    fee: 150,
    maxParticipants: 0,
    registeredCount: 0,
    registrationStatus: 'Registration Open',
  },
  {
    slug: 'tech-quiz',
    name: 'Tech Quiz',
    category: 'Technical',
    shortDescription: 'Test your core computer science, algorithms, and general tech trivia knowledge.',
    tagline: 'Test your core computer science, algorithms, and general tech trivia knowledge.',
    date: '',
    time: '',
    venue: '',
    fee: 150,
    maxParticipants: 0,
    registeredCount: 0,
    registrationStatus: 'Registration Open',
  },
  {
    slug: 'paper-presentation',
    name: 'Paper Presentation',
    category: 'Technical',
    shortDescription: 'Present innovative research on advanced technologies to industry judges.',
    tagline: 'Present innovative research on advanced technologies to industry judges.',
    date: '',
    time: '',
    venue: '',
    fee: 150,
    maxParticipants: 0,
    registeredCount: 0,
    registrationStatus: 'Registration Open',
  },
  {
    slug: 'hackathon',
    name: 'Hackathon',
    category: 'Technical',
    shortDescription: 'Prototype solutions for real-world problems in this intense coding sprint.',
    tagline: 'Prototype solutions for real-world problems in this intense coding sprint.',
    date: '',
    time: '',
    venue: '',
    fee: 150,
    maxParticipants: 0,
    registeredCount: 0,
    registrationStatus: 'Registration Open',
  },
  {
    slug: 'poster-designing',
    name: 'Poster Designing',
    category: 'Technical',
    shortDescription: 'Design visually striking cyberpunk/futuristic posters illustrating tech concepts.',
    tagline: 'Design visually striking cyberpunk/futuristic posters illustrating tech concepts.',
    date: '',
    time: '',
    venue: '',
    fee: 150,
    maxParticipants: 0,
    registeredCount: 0,
    registrationStatus: 'Registration Open',
  },
  {
    slug: 'connexion',
    name: 'Connexion',
    category: 'Technical',
    shortDescription: 'Decipher logical associations and technical terms from visual clues.',
    tagline: 'Decipher logical associations and technical terms from visual clues.',
    date: '',
    time: '',
    venue: '',
    fee: 150,
    maxParticipants: 0,
    registeredCount: 0,
    registrationStatus: 'Registration Open',
  },
  {
    slug: 'lan-party',
    name: 'LAN Party',
    category: 'Non-Technical',
    shortDescription: 'Dominate the esports arena in high-octane gaming tournaments.',
    tagline: 'Dominate the esports arena in high-octane gaming tournaments.',
    date: '',
    time: '',
    venue: '',
    fee: 150,
    maxParticipants: 0,
    registeredCount: 0,
    registrationStatus: 'Registration Open',
  },
  {
    slug: 'adzap',
    name: 'ADZAP',
    category: 'Non-Technical',
    shortDescription: 'Pitch futuristic products with high creativity, humor, and marketing flair.',
    tagline: 'Pitch futuristic products with high creativity, humor, and marketing flair.',
    date: '',
    time: '',
    venue: '',
    fee: 150,
    maxParticipants: 0,
    registeredCount: 0,
    registrationStatus: 'Registration Open',
  },
  {
    slug: 'short-film',
    name: 'Short Film',
    category: 'Non-Technical',
    shortDescription: 'Showcase your cinematic vision, storytelling, and editing skills.',
    tagline: 'Showcase your cinematic vision, storytelling, and editing skills.',
    date: '',
    time: '',
    venue: '',
    fee: 150,
    maxParticipants: 0,
    registeredCount: 0,
    registrationStatus: 'Registration Open',
  },
  {
    slug: 'ipl-auction',
    name: 'IPL Auction',
    category: 'Non-Technical',
    shortDescription: 'Strategize, bid, and assemble the ultimate cricket squad under budget caps.',
    tagline: 'Strategize, bid, and assemble the ultimate cricket squad under budget caps.',
    date: '',
    time: '',
    venue: '',
    fee: 150,
    maxParticipants: 0,
    registeredCount: 0,
    registrationStatus: 'Registration Open',
  },
];

export function eventImageForStaticEvent(slug: string): string {
  return EVENT_IMAGES[slug] || DEFAULT_EVENT_IMAGE;
}