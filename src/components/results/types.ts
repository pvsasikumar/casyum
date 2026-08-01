export type ResultPosition =
  | 'Winner'
  | 'Runner Up'
  | 'Second Runner Up'
  | 'Third Place'
  | 'Special Mention'
  | 'Best Innovation'
  | 'Best Presentation'
  | 'Best Design'
  | 'Best Performer'
  | 'Custom Award';

export type ResultEntryType = 'Individual' | 'Team';

export type ResultStatus = 'Draft' | 'Published';

export interface TeamMember {
  id: string;
  name: string;
  registerNumber: string;
}

export interface ResultEntry {
  id: string;
  eventId: string;
  eventName: string;
  eventDate: string;
  position: ResultPosition;
  customPosition: string;
  entryType: ResultEntryType;
  participantName: string;
  registerNumber: string;
  teamName: string;
  members: TeamMember[];
  college: string;
  department: string;
  year: string;
  prize: string;
  remarks: string;
  coordinatorNotes: string;
  status: ResultStatus;
  createdBy: string;
  createdByName: string;
  createdAt: string;
  updatedBy: string;
  updatedByName: string;
  updatedAt: string;
  publishedBy: string;
  publishedByName: string;
  publishedAt: string;
}

export const RESULT_POSITIONS: ResultPosition[] = [
  'Winner',
  'Runner Up',
  'Second Runner Up',
  'Third Place',
  'Special Mention',
  'Best Innovation',
  'Best Presentation',
  'Best Design',
  'Best Performer',
  'Custom Award',
];

export const RESULT_ENTRY_TYPES: ResultEntryType[] = ['Individual', 'Team'];

export const RESULT_STATUSES: ResultStatus[] = ['Draft', 'Published'];

export const POSITION_ORDER: Record<ResultPosition, number> = Object.fromEntries(
  RESULT_POSITIONS.map((p, i) => [p, i])
) as Record<ResultPosition, number>;

export type ResultSortBy = 'newest' | 'oldest' | 'position' | 'college';

export function createResultId(): string {
  return `res-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function createMemberId(): string {
  return `mem-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function createResultEntry(
  event: { id: string; name: string; date: string },
  editor: { id: string; name: string }
): ResultEntry {
  const ts = new Date().toISOString();
  return {
    id: createResultId(),
    eventId: event.id,
    eventName: event.name,
    eventDate: event.date,
    position: 'Winner',
    customPosition: '',
    entryType: 'Individual',
    participantName: '',
    registerNumber: '',
    teamName: '',
    members: [],
    college: '',
    department: '',
    year: '',
    prize: '',
    remarks: '',
    coordinatorNotes: '',
    status: 'Draft',
    createdBy: editor.id,
    createdByName: editor.name,
    createdAt: ts,
    updatedBy: editor.id,
    updatedByName: editor.name,
    updatedAt: ts,
    publishedBy: '',
    publishedByName: '',
    publishedAt: '',
  };
}

export function resultPositionLabel(entry: ResultEntry): string {
  return entry.position === 'Custom Award' && entry.customPosition.trim()
    ? entry.customPosition.trim()
    : entry.position;
}

export function resultDisplayName(entry: ResultEntry): string {
  return entry.entryType === 'Team' ? entry.teamName : entry.participantName;
}

export function resultMemberNames(entry: ResultEntry): string {
  return entry.entryType === 'Team'
    ? entry.members
        .map((m) => m.name.trim())
        .filter(Boolean)
        .join(', ')
    : '';
}

export function buildResultSearchText(entry: ResultEntry): string {
  const parts = [
    resultDisplayName(entry),
    resultPositionLabel(entry),
    entry.registerNumber,
    entry.college,
    entry.department,
    entry.year,
    entry.prize,
    entry.remarks,
  ];
  if (entry.entryType === 'Team') {
    entry.members.forEach((m) => parts.push(m.name, m.registerNumber));
  }
  return parts.filter(Boolean).join(' ').toLowerCase();
}

export function compareByPosition(a: ResultEntry, b: ResultEntry): number {
  const diff = POSITION_ORDER[a.position] - POSITION_ORDER[b.position];
  if (diff !== 0) return diff;
  return resultDisplayName(a).localeCompare(resultDisplayName(b));
}

export function isValidResultEntry(entry: ResultEntry): boolean {
  if (entry.entryType === 'Team') {
    return entry.teamName.trim() !== '' && entry.members.some((m) => m.name.trim() !== '');
  }
  return entry.participantName.trim() !== '';
}
