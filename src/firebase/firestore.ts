import { getFirestore, type Firestore } from 'firebase/firestore';
import { getFirebaseApp, isFirebaseConfigured } from './firebase';

let dbInstance: Firestore | null = null;

export function getDb(): Firestore {
  if (!isFirebaseConfigured) return null as unknown as Firestore;
  if (!dbInstance) {
    dbInstance = getFirestore(getFirebaseApp());
  }
  return dbInstance;
}
