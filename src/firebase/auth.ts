import { getAuth, type Auth } from 'firebase/auth';
import { getFirebaseApp, isFirebaseConfigured } from './firebase';

let authInstance: Auth | null = null;

export function getFirebaseAuth(): Auth {
  if (!isFirebaseConfigured) return null as unknown as Auth;
  if (!authInstance) {
    authInstance = getAuth(getFirebaseApp());
  }
  return authInstance;
}
