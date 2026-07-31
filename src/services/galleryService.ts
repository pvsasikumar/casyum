import {
  collection,
  doc,
  getDocs,
  setDoc,
  deleteDoc,
} from 'firebase/firestore';
import { getDb } from '../firebase/firestore';
import { nextSequence, now } from './helpers';

export interface GalleryRow {
  id: string;
  title: string;
  type: 'image' | 'video';
  url: string;
  category: string;
  is_featured: boolean;
  uploaded_date: string;
}

export async function listGallery(): Promise<{ gallery: GalleryRow[] }> {
  const db = getDb();
  const snap = await getDocs(collection(db, 'gallery'));
  const gallery = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as GalleryRow);
  gallery.sort((a, b) => String(b.uploaded_date || '').localeCompare(String(a.uploaded_date || '')));
  return { gallery };
}

export async function addGalleryMedia(item: Omit<GalleryRow, 'id' | 'uploaded_date'>): Promise<GalleryRow> {
  const db = getDb();
  const id = `gal-${String(await nextSequence('gallery'))}`;
  const row: GalleryRow = {
    ...item,
    id,
    uploaded_date: now(),
  };
  await setDoc(doc(db, 'gallery', id), row);
  return row;
}

export async function deleteGalleryMedia(id: string): Promise<{ message: string }> {
  const db = getDb();
  await deleteDoc(doc(db, 'gallery', id));
  return { message: 'Gallery media deleted' };
}
