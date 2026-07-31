import {
  collection,
  doc,
  getDocs,
  setDoc,
  deleteDoc,
} from 'firebase/firestore';
import { getDb } from '../firebase/firestore';
import { nextSequence, now } from './helpers';

export interface AnnouncementRow {
  id: string;
  title: string;
  description: string;
  target: string;
  targetEventId?: string;
  priority: string;
  publish_date: string;
  author: string;
  status: string;
  created_at: string;
}

export async function listAnnouncements(): Promise<AnnouncementRow[]> {
  const db = getDb();
  const snap = await getDocs(collection(db, 'announcements'));
  const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as AnnouncementRow);
  rows.sort((a, b) => String(b.publish_date || '').localeCompare(String(a.publish_date || '')));
  return rows;
}

export async function createAnnouncement(
  data: Omit<AnnouncementRow, 'id' | 'publish_date' | 'created_at'>
): Promise<AnnouncementRow> {
  const db = getDb();
  const id = `anc-${String(await nextSequence('announcements'))}`;
  const row: AnnouncementRow = {
    ...data,
    id,
    publish_date: now(),
    created_at: now(),
  };
  await setDoc(doc(db, 'announcements', id), row);
  return row;
}

export async function deleteAnnouncement(id: string): Promise<void> {
  const db = getDb();
  await deleteDoc(doc(db, 'announcements', id));
}
