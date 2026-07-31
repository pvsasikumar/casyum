import {
  getStorage,
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject,
  type FirebaseStorage,
} from 'firebase/storage';
import { getFirebaseApp } from './firebase';

let storageInstance: FirebaseStorage | null = null;

export function getFirebaseStorage(): FirebaseStorage {
  if (!storageInstance) {
    storageInstance = getStorage(getFirebaseApp());
  }
  return storageInstance;
}

export function buildStoragePath(prefix: string, fileName: string, uid?: string): string {
  const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 80);
  const key = uid || `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  return `${prefix}/${key}_${safeName}`;
}

export async function uploadFileToStorage(
  path: string,
  file: Blob,
  metadata?: { contentType?: string }
): Promise<string> {
  const storage = getFirebaseStorage();
  const fileRef = ref(storage, path);
  await uploadBytes(fileRef, file, metadata);
  return getDownloadURL(fileRef);
}

export async function uploadImageToStorage(
  prefix: string,
  file: Blob,
  uid?: string
): Promise<string> {
  const contentType = (file as File).type || 'image/jpeg';
  return uploadFileToStorage(buildStoragePath(prefix, (file as File).name || 'image.jpg', uid), file, {
    contentType,
  });
}

export async function deleteFileFromStorage(pathOrUrl: string): Promise<void> {
  const storage = getFirebaseStorage();
  try {
    await deleteObject(ref(storage, pathOrUrl));
  } catch {
    // Ignore missing-file errors on delete.
  }
}
