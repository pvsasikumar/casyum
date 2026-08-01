import {
  collection,
  doc,
  getDocs,
  query,
  setDoc,
  deleteDoc,
  where,
} from 'firebase/firestore';
import { getDb } from '../firebase/firestore';
import { now } from './helpers';
import type { ResultEntry } from '../components/results/types';

function mapRow(row: any): ResultEntry {
  return {
    id: String(row.id),
    eventId: String(row.event_id || ''),
    eventName: row.event_name || '',
    eventDate: row.event_date || '',
    position: row.position || 'Winner',
    customPosition: row.custom_position || '',
    entryType: row.entry_type === 'Team' ? 'Team' : 'Individual',
    participantName: row.participant_name || '',
    registerNumber: row.register_number || '',
    teamName: row.team_name || '',
    members: Array.isArray(row.members)
      ? row.members.map((m: any) => ({
          id: String(m?.id || `mem-${Math.random().toString(36).slice(2, 8)}`),
          name: m?.name || '',
          registerNumber: m?.register_number || '',
        }))
      : [],
    college: row.college || '',
    department: row.department || '',
    year: row.year || '',
    prize: row.prize || '',
    remarks: row.remarks || '',
    coordinatorNotes: row.coordinator_notes || '',
    status: row.status === 'Published' ? 'Published' : 'Draft',
    createdBy: row.created_by || '',
    createdByName: row.created_by_name || '',
    createdAt: row.created_at || '',
    updatedBy: row.updated_by || '',
    updatedByName: row.updated_by_name || '',
    updatedAt: row.updated_at || '',
    publishedBy: row.published_by || '',
    publishedByName: row.published_by_name || '',
    publishedAt: row.published_at || '',
  };
}

function toRow(entry: ResultEntry): Record<string, any> {
  return {
    event_id: entry.eventId,
    event_name: entry.eventName,
    event_date: entry.eventDate,
    position: entry.position,
    custom_position: entry.customPosition,
    entry_type: entry.entryType,
    participant_name: entry.participantName,
    register_number: entry.registerNumber,
    team_name: entry.teamName,
    members: entry.members.map((m) => ({
      id: m.id,
      name: m.name,
      register_number: m.registerNumber,
    })),
    college: entry.college,
    department: entry.department,
    year: entry.year,
    prize: entry.prize,
    remarks: entry.remarks,
    coordinator_notes: entry.coordinatorNotes,
    status: entry.status,
    created_by: entry.createdBy,
    created_by_name: entry.createdByName,
    created_at: entry.createdAt,
    updated_by: entry.updatedBy,
    updated_by_name: entry.updatedByName,
    updated_at: entry.updatedAt,
    published_by: entry.publishedBy,
    published_by_name: entry.publishedByName,
    published_at: entry.publishedAt,
    saved_at: now(),
  };
}

export async function listResultsByEvent(eventId: string): Promise<ResultEntry[]> {
  const db = getDb();
  const snap = await getDocs(
    query(collection(db, 'results'), where('event_id', '==', eventId))
  );
  return snap.docs.map((d) => mapRow({ id: d.id, ...d.data() }));
}

export async function saveResultEntries(entries: ResultEntry[]): Promise<void> {
  const db = getDb();
  await Promise.all(
    entries.map((entry) => setDoc(doc(db, 'results', entry.id), toRow(entry)))
  );
}

export async function deleteResultEntries(ids: string[]): Promise<void> {
  const db = getDb();
  await Promise.all(ids.map((id) => deleteDoc(doc(db, 'results', id))));
}
