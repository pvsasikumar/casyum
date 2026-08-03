import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { getDb } from '../firebase/firestore';
import { now } from './helpers';

const PAYMENT_SETTINGS_DOC = 'payment';

export interface PaymentSettings {
  upiId: string;
  upiQrUrl: string;
  upiQrPublicId: string;
  bankName: string;
  accountName: string;
  accountNumber: string;
  ifsc: string;
  paymentInstructions: string;
  updatedAt: string;
  updatedBy: string;
}

export const DEFAULT_PAYMENT_SETTINGS: PaymentSettings = {
  upiId: '',
  upiQrUrl: '',
  upiQrPublicId: '',
  bankName: '',
  accountName: '',
  accountNumber: '',
  ifsc: '',
  paymentInstructions: '',
  updatedAt: '',
  updatedBy: '',
};

/**
 * Read the payment collection settings from `settings/payment`. Falls back to
 * empty defaults when the document does not exist yet.
 */
export async function readPaymentSettings(): Promise<PaymentSettings> {
  const db = getDb();
  const snap = await getDoc(doc(db, 'settings', PAYMENT_SETTINGS_DOC));
  if (!snap.exists()) return { ...DEFAULT_PAYMENT_SETTINGS };
  return { ...DEFAULT_PAYMENT_SETTINGS, ...(snap.data() as Partial<PaymentSettings>) };
}

/**
 * Live subscription to `settings/payment`. The callback fires immediately with
 * the current settings and then again whenever the document changes, so open
 * payment forms stay in sync when an admin updates the QR / UPI / bank details.
 * Returns an unsubscribe function.
 */
export function subscribePaymentSettings(
  onNext: (settings: PaymentSettings) => void,
  onError?: (error: Error) => void
): () => void {
  const db = getDb();
  return onSnapshot(
    doc(db, 'settings', PAYMENT_SETTINGS_DOC),
    (snap) => {
      if (!snap.exists()) {
        onNext({ ...DEFAULT_PAYMENT_SETTINGS });
        return;
      }
      onNext({ ...DEFAULT_PAYMENT_SETTINGS, ...(snap.data() as Partial<PaymentSettings>) });
    },
    onError
  );
}

/**
 * Save payment collection settings to `settings/payment` (merge). Returns the
 * freshly re-read settings so the caller can reflect the stored state.
 */
export async function savePaymentSettings(
  partial: Partial<Omit<PaymentSettings, 'updatedAt' | 'updatedBy'>>,
  performer?: { id: string; name: string }
): Promise<PaymentSettings> {
  const db = getDb();
  const patch: Partial<PaymentSettings> = {
    ...partial,
    updatedAt: now(),
    updatedBy: performer?.name || performer?.id || '',
  };
  await setDoc(doc(db, 'settings', PAYMENT_SETTINGS_DOC), patch, { merge: true });
  return readPaymentSettings();
}
