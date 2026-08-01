import { initializeApp, type FirebaseApp } from 'firebase/app';

export const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || '',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || '',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || '',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '',
};

export const isFirebaseConfigured = Boolean(
  firebaseConfig.apiKey &&
    firebaseConfig.authDomain &&
    firebaseConfig.projectId &&
    firebaseConfig.appId
);

export const isStorageConfigured = Boolean(firebaseConfig.storageBucket);

export const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';

let app: FirebaseApp | undefined;
let configError: Error | null = null;

export function getFirebaseApp(): FirebaseApp {
  if (configError) throw configError;
  if (!app) {
    if (!isFirebaseConfigured) {
      configError = new Error(
        'Firebase is not configured yet. Add your VITE_FIREBASE_* keys to the .env file and restart the dev server.'
      );
      throw configError;
    }
    app = initializeApp(firebaseConfig);
  }
  return app;
}
