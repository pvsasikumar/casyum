import {
  ref,
  uploadBytesResumable,
  getDownloadURL,
  type UploadTask,
} from 'firebase/storage';
import { getFirebaseStorage, sanitizeFileName, fileExtension, deleteFileFromStorage } from '../firebase/storage';

export const MAX_PAYMENT_PROOF_SIZE_MB = 5;
export const MAX_PAYMENT_PROOF_SIZE_BYTES = MAX_PAYMENT_PROOF_SIZE_MB * 1024 * 1024;

export const ALLOWED_PAYMENT_PROOF_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
];

export const ALLOWED_PAYMENT_PROOF_EXTENSIONS = /\.(jpe?g|png|webp|pdf)$/i;

export interface PaymentProofUploadResult {
  url: string;
  path: string;
  name: string;
  contentType: string;
  size: number;
  uploadedAt: string;
}

export interface UploadPaymentProofOptions {
  onProgress?: (percent: number) => void;
}

export function isPaymentProofImage(type: string): boolean {
  const t = String(type || '').toLowerCase();
  return t === 'image/jpeg' || t === 'image/png' || t === 'image/webp';
}

export function isPaymentProofPdf(type: string): boolean {
  return String(type || '').toLowerCase() === 'application/pdf';
}

export function formatFileSize(bytes: number): string {
  const value = Number(bytes) || 0;
  if (value <= 0) return '0 B';
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  return `${(value / (1024 * 1024)).toFixed(2)} MB`;
}

/**
 * Trim whitespace and normalize a transaction ID/UTR for duplicate detection.
 * The original trimmed value is preserved for display; this normalized form is
 * only used for uniqueness comparisons.
 */
export function normalizeTransactionId(value: string): string {
  return String(value || '')
    .trim()
    .replace(/\s+/g, ' ')
    .toUpperCase();
}

/**
 * Validate a transaction ID/UTR. Returns null when valid, otherwise a
 * human-readable error message. Rules: required, no leading/trailing
 * whitespace, 6-100 characters, and not made entirely of spaces.
 */
export function validateTransactionId(value: string): string | null {
  const raw = String(value || '');
  if (!raw.trim()) {
    return 'Please enter your Transaction ID / UTR number.';
  }
  if (raw !== raw.trim()) {
    return 'Please remove extra spaces before or after the Transaction ID.';
  }
  const normalized = normalizeTransactionId(raw);
  if (/^\s*$/.test(raw)) {
    return 'Transaction ID cannot contain only spaces.';
  }
  if (normalized.length < 6) {
    return 'Transaction ID must be at least 6 characters long.';
  }
  if (normalized.length > 100) {
    return 'Transaction ID cannot exceed 100 characters.';
  }
  return null;
}

export const PAYMENT_METHODS = [
  { value: 'upi', label: 'UPI', description: 'GPay, PhonePe, Paytm, BHIM, etc.' },
  { value: 'bank_transfer', label: 'Bank Transfer', description: 'NEFT / IMPS / RTGS' },
  { value: 'other', label: 'Other Digital Payment', description: 'Net banking, wallets, cards, etc.' },
] as const;

export type PaymentMethod = (typeof PAYMENT_METHODS)[number]['value'];

export function paymentMethodLabel(value: string): string {
  return PAYMENT_METHODS.find((m) => m.value === value)?.label || value || '—';
}

/**
 * Validate a payment proof file. Accepted types: JPG, JPEG, PNG, WEBP, PDF.
 * Maximum size: 5 MB. Throws a human-readable error when invalid.
 */
export function validatePaymentProofFile(
  file: File | null
): { name: string; type: string } | never {
  if (!file) {
    throw new Error('Please upload your payment proof.');
  }
  if (file.size <= 0) {
    throw new Error('The uploaded file is empty. Please upload a valid payment proof.');
  }
  const type = (file.type || '').toLowerCase();
  const name = sanitizeFileName(file.name || 'payment-proof');

  const isAllowedType =
    ALLOWED_PAYMENT_PROOF_TYPES.includes(type) ||
    (type === '' && ALLOWED_PAYMENT_PROOF_EXTENSIONS.test(name));
  if (!isAllowedType) {
    throw new Error(
      'Unsupported file type. Please upload a JPG, PNG, WEBP, or PDF payment proof.'
    );
  }
  if (file.size > MAX_PAYMENT_PROOF_SIZE_BYTES) {
    throw new Error(
      `Payment proof is too large. Maximum allowed size is ${MAX_PAYMENT_PROOF_SIZE_MB} MB.`
    );
  }
  const resolvedType = ALLOWED_PAYMENT_PROOF_TYPES.includes(type)
    ? type
    : fileExtension(name) === 'pdf'
      ? 'application/pdf'
      : 'image/jpeg';
  return { name, type: resolvedType };
}

/**
 * Build the structured upload path for a payment proof:
 *   payment-proofs/{participantId}/{eventId}/{registrationId}/payment-proof.{extension}
 */
export function buildPaymentProofPath(
  participantId: string,
  eventId: string,
  registrationId: string,
  fileName: string,
  timestamp?: number
): string {
  const safeParticipant = sanitizeFileName(String(participantId || 'participant')) || 'participant';
  const safeEvent = sanitizeFileName(String(eventId || 'event')) || 'event';
  const safeReg = sanitizeFileName(String(registrationId || 'registration')) || 'registration';
  const ext = fileExtension(fileName) || 'jpg';
  const stamp = typeof timestamp === 'number' ? `-${timestamp}` : '';
  return `payment-proofs/${safeParticipant}/${safeEvent}/${safeReg}/payment-proof${stamp}.${ext}`;
}

/**
 * Upload a payment proof to Firebase Storage and return the download URL and
 * file metadata. Reports real-time progress through onProgress (0-100).
 */
export async function uploadPaymentProof(
  participantId: string,
  eventId: string,
  registrationId: string,
  file: File,
  options: UploadPaymentProofOptions = {}
): Promise<PaymentProofUploadResult> {
  const storage = getFirebaseStorage();
  const validated = validatePaymentProofFile(file);
  const timestamp = Date.now();
  const path = buildPaymentProofPath(participantId, eventId, registrationId, validated.name, timestamp);

  const fileRef = ref(storage, path);
  const task: UploadTask = uploadBytesResumable(fileRef, file, {
    contentType: file.type || validated.type,
    cacheControl: 'private, max-age=0',
  });

  const url = await new Promise<string>((resolve, reject) => {
    task.on(
      'state_changed',
      (snap) => {
        const pct =
          snap.totalBytes > 0
            ? Math.round((snap.bytesTransferred / snap.totalBytes) * 100)
            : 0;
        options.onProgress?.(Math.min(100, Math.max(0, pct)));
      },
      (error) => reject(error),
      () => {
        options.onProgress?.(100);
        getDownloadURL(task.snapshot.ref).then(resolve).catch(reject);
      }
    );
  });

  return {
    url,
    path,
    name: validated.name,
    contentType: file.type || validated.type,
    size: file.size,
    uploadedAt: new Date(timestamp).toISOString(),
  };
}

export { deleteFileFromStorage as deletePaymentProofFile };
