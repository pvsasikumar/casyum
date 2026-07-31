import { doc, getDoc, setDoc } from 'firebase/firestore';
import { getDb } from '../firebase/firestore';

const SETTINGS_DOC = 'app';

export async function readSettings<T>(defaults: T): Promise<T> {
  const db = getDb();
  const snap = await getDoc(doc(db, 'settings', SETTINGS_DOC));
  if (!snap.exists()) return defaults;
  return { ...defaults, ...snap.data() } as T;
}

export async function saveSettings<T>(partial: Partial<T>): Promise<void> {
  const db = getDb();
  await setDoc(doc(db, 'settings', SETTINGS_DOC), partial, { merge: true });
}
