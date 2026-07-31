import { getFirestore, type Firestore } from 'firebase/firestore';
import { getFirebaseApp } from './firebase';

let dbInstance: Firestore | null = null;

export function getDb(): Firestore {
  if (!dbInstance) {
    dbInstance = getFirestore(getFirebaseApp());
  }
  return dbInstance;
}
