import {
  getStorage,
  ref,
  uploadBytes,
  uploadBytesResumable,
  getDownloadURL,
  deleteObject,
  type FirebaseStorage,
  type UploadTask,
} from 'firebase/storage';
import { getFirebaseApp, isFirebaseConfigured, isStorageConfigured } from './firebase';

let storageInstance: FirebaseStorage | null = null;

export const MAX_IMAGE_SIZE_MB = 10;
export const MAX_IMAGE_SIZE_BYTES = MAX_IMAGE_SIZE_MB * 1024 * 1024;

export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
export const ALLOWED_IMAGE_EXTENSIONS = /\.(jpe?g|png|webp)$/i;

export interface UploadResult {
  url: string;
  path: string;
  name: string;
  contentType: string;
  size: number;
  uploadedAt: string;
}

export interface UploadOptions {
  onProgress?: (percent: number) => void;
  compress?: boolean;
}

/** Sanitize a file name so it is safe to use in a Firebase Storage path. */
export function sanitizeFileName(fileName: string): string {
  const base = String(fileName || '').split(/[\\/]/).pop() || 'file';
  return base.replace(/[^a-zA-Z0-9._-]/g, '_').replace(/_{2,}/g, '_').slice(0, 80);
}

/** Keep only the extension of a file name. */
export function fileExtension(fileName: string): string {
  const match = String(fileName || '').match(/\.([a-zA-Z0-9]{1,10})$/);
  return match ? match[1].toLowerCase() : '';
}

export function getFirebaseStorage(): FirebaseStorage {
  if (!isFirebaseConfigured || !isStorageConfigured) return null as unknown as FirebaseStorage;
  if (!storageInstance) {
    const app = getFirebaseApp();
    if (!app) return null as unknown as FirebaseStorage;
    storageInstance = getStorage(app, app.options.storageBucket || '');
  }
  return storageInstance;
}

/**
 * Validate an image file. Throws a human-readable error when invalid.
 * Allowed: JPG, JPEG, PNG, WEBP. Max size 10 MB.
 */
export function validateImageFile(file: File): { name: string; type: string } | never {
  if (!file) throw new Error('No file selected.');
  const type = (file.type || '').toLowerCase();
  const name = sanitizeFileName(file.name || 'image.jpg');

  const isAllowedType =
    ALLOWED_IMAGE_TYPES.includes(type) || (type === '' && ALLOWED_IMAGE_EXTENSIONS.test(name));
  if (!isAllowedType) {
    throw new Error('Please upload a JPG, PNG, or WEBP image.');
  }
  if (file.size > MAX_IMAGE_SIZE_BYTES) {
    throw new Error(`Please upload an image smaller than ${MAX_IMAGE_SIZE_MB} MB.`);
  }
  return { name, type: ALLOWED_IMAGE_TYPES.includes(type) ? type : 'image/jpeg' };
}

/**
 * Downscale / re-encode very large images before upload so files stay fast and
 * under the 10 MB limit while keeping good quality. Returns the original file
 * when no compression is needed.
 */
export async function compressImage(
  file: File,
  maxDimension = 1920,
  quality = 0.85
): Promise<File> {
  if (file.type !== 'image/jpeg' && file.type !== 'image/png' && file.type !== 'image/webp') {
    return file;
  }
  if (file.size <= 1.5 * 1024 * 1024) return file;

  try {
    const bitmap = await createImageBitmap(file);
    const { width, height } = bitmap;
    const scale = Math.min(1, maxDimension / Math.max(width, height));
    if (scale >= 1) {
      bitmap.close();
      return file;
    }
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(width * scale));
    canvas.height = Math.max(1, Math.round(height * scale));
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      bitmap.close();
      return file;
    }
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();

    const outType = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, outType, quality)
    );
    if (!blob || blob.size >= file.size) return file;
    return new File([blob], sanitizeFileName(file.name), { type: outType });
  } catch {
    // If compression fails (e.g. invalid image), fall back to the original file.
    return file;
  }
}

/** Validate that the compressed blob is actually a decodable image. */
export async function verifyImageFile(file: File): Promise<void> {
  try {
    const bitmap = await createImageBitmap(file);
    bitmap.close();
  } catch {
    throw new Error('That file is not a valid image. Please upload a JPG, PNG, or WEBP file.');
  }
}

/**
 * Build the structured upload path for an event image:
 *   events/{eventId}/{folder}/{fileKey}-{timestamp}.{extension}
 */
export function buildEventImagePath(
  eventId: string,
  folder: string,
  fileName: string,
  timestamp: number = Date.now()
): string {
  const safeEventId = sanitizeFileName(String(eventId || 'unknown')) || 'unknown';
  const safeFolder = sanitizeFileName(String(folder || 'images')) || 'images';
  const base = sanitizeFileName(String(fileName || '').replace(/\.[a-zA-Z0-9]+$/, '')).slice(0, 50) || 'image';
  const ext = fileExtension(fileName) || 'jpg';
  return `events/${safeEventId}/${safeFolder}/${base}-${timestamp}.${ext}`;
}

export function buildStoragePath(prefix: string, fileName: string, uid?: string): string {
  const safeName = sanitizeFileName(fileName);
  const key = uid || `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  return `${prefix.replace(/\/+$/, '')}/${key}_${safeName}`;
}

function uploadTask(
  storage: FirebaseStorage,
  path: string,
  blob: Blob,
  metadata?: { contentType?: string },
  onProgress?: (percent: number) => void
): Promise<string> {
  const fileRef = ref(storage, path);

  if (onProgress) {
    const task: UploadTask = uploadBytesResumable(fileRef, blob, metadata);
    return new Promise<string>((resolve, reject) => {
      task.on(
        'state_changed',
        (snap) => {
          const pct = snap.totalBytes > 0 ? Math.round((snap.bytesTransferred / snap.totalBytes) * 100) : 0;
          onProgress(Math.min(100, Math.max(0, pct)));
        },
        (error) => reject(error),
        () => {
          onProgress(100);
          getDownloadURL(task.snapshot.ref).then(resolve).catch(reject);
        }
      );
    });
  }

  return uploadBytes(fileRef, blob, metadata).then(() => getDownloadURL(fileRef));
}

/**
 * Upload an image for an event into a structured folder
 * (hero, logo, about, gallery, sponsors, images, ...). Returns the permanent
 * download URL, the storage path, and upload metadata.
 */
export async function uploadEventImage(
  eventId: string,
  folder: string,
  file: File,
  options: UploadOptions = {}
): Promise<UploadResult> {
  const storage = getFirebaseStorage();
  const validated = validateImageFile(file);
  const readyFile = options.compress !== false ? await compressImage(file) : file;
  await verifyImageFile(readyFile);

  const timestamp = Date.now();
  const path = buildEventImagePath(eventId, folder, validated.name, timestamp);

  const url = await uploadTask(
    storage,
    path,
    readyFile,
    { contentType: readyFile.type || validated.type },
    options.onProgress
  );

  return {
    url,
    path,
    name: validated.name,
    contentType: readyFile.type || validated.type,
    size: readyFile.size,
    uploadedAt: new Date(timestamp).toISOString(),
  };
}

/**
 * Upload an image to a generic storage prefix. Kept for existing callers
 * (admin profile photo, gallery management) and legacy CMS paths.
 */
export async function uploadImageToStorage(
  prefix: string,
  file: File,
  options: UploadOptions = {}
): Promise<string> {
  const storage = getFirebaseStorage();
  const validated = validateImageFile(file);
  const readyFile = options.compress !== false ? await compressImage(file) : file;
  await verifyImageFile(readyFile);

  const path = buildStoragePath(prefix, validated.name);
  return uploadTask(
    storage,
    path,
    readyFile,
    { contentType: readyFile.type || validated.type },
    options.onProgress
  );
}

export async function uploadFileToStorage(
  path: string,
  file: Blob,
  metadata?: { contentType?: string },
  onProgress?: (percent: number) => void
): Promise<string> {
  const storage = getFirebaseStorage();
  return uploadTask(storage, path, file, metadata, onProgress);
}

/** Recover the storage path from a Firebase download URL (or a full path). */
export function getStoragePathFromUrl(pathOrUrl: string): string | null {
  if (!pathOrUrl) return null;
  if (!/^https?:\/\//.test(pathOrUrl)) return pathOrUrl;
  try {
    const u = new URL(pathOrUrl);
    if (!u.pathname.includes('/v0/b/')) return null;
    const match = u.pathname.match(/\/o\/(.+)/);
    if (!match) return null;
    return decodeURIComponent(match[1]);
  } catch {
    return null;
  }
}

/** Delete a stored file by storage path or Firebase download URL. */
export async function deleteFileFromStorage(pathOrUrl: string): Promise<void> {
  const path = getStoragePathFromUrl(pathOrUrl);
  if (!path) return;
  const storage = getFirebaseStorage();
  try {
    await deleteObject(ref(storage, path));
  } catch {
    // Ignore missing-file errors on delete.
  }
}
