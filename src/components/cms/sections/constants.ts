import type { ElementType } from 'react';
import {
  CalendarDays,
  Clock,
  MapPin,
  Building2,
  DoorOpen,
  Map,
  CalendarClock,
  Users,
  UserRound,
  Tag,
  IndianRupee,
  Shirt,
  Languages,
  Gauge,
  Hourglass,
} from 'lucide-react';
import type { CmsEventDetails, CmsContact } from '../types';

export const CATEGORIES = ['Technical', 'Non-Technical', 'Workshop', 'Gaming'];
export const STATUSES = ['Registration Open', 'Registration Closed', 'Completed'];
export const DIFFICULTY = ['Beginner', 'Intermediate', 'Advanced'];

export const statusStyles: Record<string, string> = {
  'Registration Open': 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  'Registration Closed': 'bg-amber-500/15 text-amber-300 border-amber-500/30',
  Completed: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30',
};

export const DETAIL_FIELDS: Array<{ key: keyof CmsEventDetails; label: string; icon: ElementType; placeholder?: string }> = [
  { key: 'date', label: 'Event Date', icon: CalendarDays, placeholder: 'e.g. 19 Sep 2026' },
  { key: 'time', label: 'Event Time', icon: Clock, placeholder: 'e.g. 10:00 AM - 4:00 PM' },
  { key: 'venue', label: 'Venue', icon: MapPin, placeholder: 'Main venue' },
  { key: 'teamSize', label: 'Team Size (Min–Max)', icon: UserRound, placeholder: 'e.g. 1 – 3' },
  { key: 'category', label: 'Category', icon: Tag, placeholder: 'Select category' },
  { key: 'registrationFee', label: 'Registration Fee', icon: IndianRupee, placeholder: 'e.g. ₹300' },
  { key: 'participantLimit', label: 'Maximum Participants', icon: Users, placeholder: 'e.g. 100' },
  { key: 'registrationStatus', label: 'Registration Status', icon: CalendarClock, placeholder: 'Select status' },
  { key: 'building', label: 'Building', icon: Building2, placeholder: 'Building name' },
  { key: 'room', label: 'Room', icon: DoorOpen, placeholder: 'Room / Hall no.' },
  { key: 'mapsLink', label: 'Google Maps Link', icon: Map, placeholder: 'https://maps.google.com/...' },
  { key: 'registrationDeadline', label: 'Registration Deadline', icon: CalendarClock, placeholder: 'e.g. 25 Aug 2026' },
  { key: 'dressCode', label: 'Dress Code', icon: Shirt, placeholder: 'e.g. Formal' },
  { key: 'language', label: 'Language', icon: Languages, placeholder: 'e.g. English / Tamil' },
  { key: 'difficultyLevel', label: 'Difficulty Level', icon: Gauge, placeholder: 'e.g. Intermediate' },
  { key: 'duration', label: 'Duration', icon: Hourglass, placeholder: 'e.g. 6 hours' },
];

export const QUICK_REQUIREMENTS = ['Laptop Required', 'ID Card', 'Software', 'Internet'];
export const PRIZE_LABELS = ['1st Prize', '2nd Prize', '3rd Prize', 'Special Mention', 'Certificates', 'Participation Certificates'];

export const prizeIconClass = (label: string) => {
  if (label.toLowerCase().includes('1st')) return 'bg-amber-500/20 text-amber-300 border-amber-500/30';
  if (label.toLowerCase().includes('2nd')) return 'bg-zinc-400/20 text-zinc-200 border-zinc-400/30';
  if (label.toLowerCase().includes('3rd')) return 'bg-orange-500/20 text-orange-300 border-orange-500/30';
  return 'bg-violet-500/20 text-violet-300 border-violet-500/30';
};

export const GALLERY_CATEGORIES = ['Images', 'Posters', 'Event Banner', 'Sponsor Logos'];
export const DOWNLOAD_TYPES = ['Rulebook', 'Problem Statement', 'Template', 'Other'];

export const CONTACT_FIELDS: Array<{ key: keyof CmsContact; label: string }> = [
  { key: 'facultyCoordinator', label: 'Faculty Coordinator' },
  { key: 'studentCoordinator', label: 'Student Coordinator' },
  { key: 'phone', label: 'Phone' },
  { key: 'email', label: 'Email' },
  { key: 'whatsapp', label: 'WhatsApp' },
];
