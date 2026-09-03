import {
  deleteObject,
  getDownloadURL,
  ref,
  uploadBytesResumable,
  type UploadTask,
} from 'firebase/storage';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { isFirebaseConfigured, isStorageConfigured } from '../firebase/firebase';
import { getFirebaseStorage } from '../firebase/storage';
import { getDb } from '../firebase/firestore';

/**
 * Event-wise Rule Book service.
 *
 * Every event document may carry a reference to its own Rule Book PDF:
 *
 *   ruleBookUrl          - absolute URL or public path (e.g. /rulebooks/adzap-rulebook.pdf)
 *   ruleBookFileName     - human friendly file name shown in the UI
 *   ruleBookVersion      - optional version label (e.g. "v2.0")
 *   ruleBookUpdatedAt    - ISO timestamp of the last update
 *   ruleBookUpdatedBy    - name of the admin who last updated it
 *
 * Storage:
 *   - If Firebase Storage is configured, the admin can upload the PDF and the
 *     Firebase download URL is stored on the event document. Replacing the file
 *     (or removing it) updates the document, so the public website picks the
 *     new Rule Book automatically with no code/rebuild.
 *   - If Firebase Storage is NOT configured (the current default for this
 *     project), the Rule Book files live in the project's `public/rulebooks/`
 *     folder and the admin stores the public path (e.g. `/rulebooks/hackathon-rulebook.pdf`).
 *     Limitation: files under `public/` are baked into the static build, so
 *     replacing a file there requires a rebuild/redeploy. The event reference
 *     itself stays correct because the public pages always read `ruleBookUrl`.
 */

export const RULE_BOOK_FOLDER = '/rulebooks/';

export const ALLOWED_RULE_BOOK_TYPES = ['application/pdf'];
export const ALLOWED_RULE_BOOK_EXTENSION = /\.pdf$/i;

export interface RuleBookInfo {
  url: string;
  fileName: string;
}

export interface UploadRuleBookResult {
  url: string;
  path: string;
  fileName: string;
  contentType: string;
  size: number;
  uploadedAt: string;
  version?: string;
  updatedAt?: string;
  updatedBy?: string;
}

export interface UploadRuleBookOptions {
  onProgress?: (percent: number) => void;
  /** Event display name used for the storage path base (optional). */
  name?: string;
  /** Version label to store alongside the upload (e.g. "v1.0"). */
  version?: string;
  /** Admin name who performed the upload. */
  updatedBy?: string;
}

/** Convert a raw file name to a safe event-based file name (e.g. "adzap-rulebook.pdf"). */
export function sanitizeRuleBookFileName(fileName: string): string {
  const base = String(fileName || '')
    .split(/[\\/]/)
    .pop() || 'event';
  const nameWithoutExt = base.replace(/\.[a-zA-Z0-9]+$/, '');
  const safe = nameWithoutExt
    .toLowerCase()
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-+/g, '-')
    .slice(0, 60) || 'event';
  return `${safe}-rulebook.pdf`;
}

export function isPdfFileName(fileName: string): boolean {
  return ALLOWED_RULE_BOOK_EXTENSION.test(String(fileName || ''));
}

/**
 * Validate a Rule Book upload. Only PDF files are allowed.
 * Throws "Please upload a valid PDF Rule Book." otherwise.
 */
export function validateRuleBookFile(file: File): { name: string; type: string } | never {
  if (!file) throw new Error('No file selected.');
  const name = sanitizeRuleBookFileName(file.name || 'rulebook.pdf');
  const type = String(file.type || '').toLowerCase();
  const looksLikePdf = ALLOWED_RULE_BOOK_TYPES.includes(type) || (type === '' && isPdfFileName(file.name));
  if (!looksLikePdf) {
    throw new Error('Please upload a valid PDF Rule Book.');
  }
  return { name, type: ALLOWED_RULE_BOOK_TYPES.includes(type) ? type : 'application/pdf' };
}

export function isRuleBookConfigured(): boolean {
  return isFirebaseConfigured && isStorageConfigured;
}

/**
 * Upload a Rule Book PDF to Firebase Storage under `events/{eventId}/rulebook/`.
 * Requires Firebase Storage to be configured. When storage is unavailable the
 * admin should reference a PDF inside the project's public/rulebooks folder.
 */
export async function uploadRuleBook(
  eventId: string | number,
  file: File,
  options: UploadRuleBookOptions = {}
): Promise<UploadRuleBookResult> {
  if (!isRuleBookConfigured()) {
    throw new Error(
      'Firebase Storage is not configured. Paste a Rule Book path from the public/rulebooks folder (e.g. /rulebooks/hackathon-rulebook.pdf) instead.'
    );
  }
  const validated = validateRuleBookFile(file);
  const storage = getFirebaseStorage();
  const timestamp = Date.now();
  const safeEventId = String(eventId || 'unknown').replace(/[^a-zA-Z0-9._-]/g, '_') || 'unknown';
  const base = (options.name ? sanitizeRuleBookFileName(options.name) : validated.name).replace(/\.pdf$/i, '');
  const path = `events/${safeEventId}/rulebook/${base}-${timestamp}.pdf`;
  const fileRef = ref(storage, path);

  const upload = (): Promise<string> =>
    new Promise<string>((resolve, reject) => {
      const task: UploadTask = uploadBytesResumable(fileRef, file, {
        contentType: validated.type,
      });
      task.on(
        'state_changed',
        (snap) => {
          const pct = snap.totalBytes > 0 ? Math.round((snap.bytesTransferred / snap.totalBytes) * 100) : 0;
          options.onProgress?.(Math.min(100, Math.max(0, pct)));
        },
        (error) => reject(error),
        () => {
          options.onProgress?.(100);
          getDownloadURL(task.snapshot.ref).then(resolve).catch(reject);
        }
      );
    });

  const url = await upload();

  return {
    url,
    path,
    fileName: validated.name,
    contentType: validated.type,
    size: file.size,
    uploadedAt: new Date(timestamp).toISOString(),
    version: options.version,
    updatedAt: new Date(timestamp).toISOString(),
    updatedBy: options.updatedBy,
  };
}

/** Recover a Firebase Storage path from a download URL or a raw path. */
function storagePathFromUrl(pathOrUrl: string): string | null {
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

/**
 * Delete the previous Rule Book file from Firebase Storage when the admin
 * replaces or removes a Rule Book. Silently ignores paths that are not
 * storage-backed (e.g. /rulebooks/... public folder references) or missing.
 */
export async function deleteRuleBookFile(urlOrPath?: string): Promise<void> {
  if (!isRuleBookConfigured() || !urlOrPath) return;
  const path = storagePathFromUrl(urlOrPath);
  if (!path) return;
  const storage = getFirebaseStorage();
  try {
    await deleteObject(ref(storage, path));
  } catch {
    // Missing files and permission errors are intentionally ignored on delete.
  }
}

/** Format a stored timestamp for display (e.g. "12 August 2026"). */
export function formatRuleBookDate(iso?: string): string {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

// ---------------------------------------------------------------------------
// Global CASYUM Rule Book (single PDF for the entire event)
// ---------------------------------------------------------------------------

export interface GlobalRuleBookInfo {
  url: string;
  fileName: string;
  version: string;
  updatedAt: string;
  updatedBy: string;
  visible: boolean;
}

const GLOBAL_RULE_BOOK_DOC = 'ruleBook';

function globalRuleBookRef() {
  return doc(getDb(), 'settings', GLOBAL_RULE_BOOK_DOC);
}

/** Read the global CASYUM Rule Book settings from Firestore. */
export async function fetchGlobalRuleBook(): Promise<GlobalRuleBookInfo> {
  const defaults: GlobalRuleBookInfo = {
    url: '',
    fileName: '',
    version: '',
    updatedAt: '',
    updatedBy: '',
    visible: true,
  };
  try {
    const snap = await getDoc(globalRuleBookRef());
    if (!snap.exists()) return defaults;
    const d = snap.data();
    return {
      url: String(d.url || ''),
      fileName: String(d.fileName || ''),
      version: String(d.version || ''),
      updatedAt: String(d.updatedAt || ''),
      updatedBy: String(d.updatedBy || ''),
      visible: d.visible !== false,
    };
  } catch {
    return defaults;
  }
}

/** Save the global CASYUM Rule Book settings to Firestore. */
export async function saveGlobalRuleBook(data: Partial<GlobalRuleBookInfo>): Promise<void> {
  await setDoc(globalRuleBookRef(), data, { merge: true });
}

/**
 * Upload the single CASYUM Rule Book PDF to Firebase Storage under
 * `settings/ruleBook/`. Requires Firebase Storage to be configured.
 */
export async function uploadGlobalRuleBook(
  file: File,
  options: UploadRuleBookOptions = {}
): Promise<UploadRuleBookResult> {
  if (!isRuleBookConfigured()) {
    throw new Error(
      'Firebase Storage is not configured. Paste a Rule Book path from the public/rulebooks folder (e.g. /rulebooks/casyum-rulebook.pdf) instead.'
    );
  }
  const validated = validateRuleBookFile(file);
  const storage = getFirebaseStorage();
  const timestamp = Date.now();
  const safeName = (options.name ? sanitizeRuleBookFileName(options.name) : validated.name).replace(/\.pdf$/i, '');
  const path = `settings/ruleBook/${safeName}-${timestamp}.pdf`;
  const fileRef = ref(storage, path);

  const upload = (): Promise<string> =>
    new Promise<string>((resolve, reject) => {
      const task: UploadTask = uploadBytesResumable(fileRef, file, {
        contentType: validated.type,
      });
      task.on(
        'state_changed',
        (snap) => {
          const pct = snap.totalBytes > 0 ? Math.round((snap.bytesTransferred / snap.totalBytes) * 100) : 0;
          options.onProgress?.(Math.min(100, Math.max(0, pct)));
        },
        (error) => reject(error),
        () => {
          options.onProgress?.(100);
          getDownloadURL(task.snapshot.ref).then(resolve).catch(reject);
        }
      );
    });

  const url = await upload();

  return {
    url,
    path,
    fileName: validated.name,
    contentType: validated.type,
    size: file.size,
    uploadedAt: new Date(timestamp).toISOString(),
    version: options.version,
    updatedAt: new Date(timestamp).toISOString(),
    updatedBy: options.updatedBy,
  };
}
