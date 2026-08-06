import { doc, getDoc, onSnapshot, setDoc } from 'firebase/firestore';
import { getDb } from '../firebase/firestore';
import { now } from './helpers';

const COMMUNICATION_SETTINGS_DOC = 'communication';

export interface WhatsappChannelSettings {
  enabled: boolean;
  groupName: string;
  inviteLink: string;
  description: string;
  updatedAt: string;
  updatedBy: string;
}

/**
 * App-wide communication channel settings stored in `settings/communication`.
 * The document is intentionally shaped as a channels map so future channels
 * (Telegram, Discord, Instagram, LinkedIn, YouTube, Facebook) can be added as
 * sibling keys without redesigning the database or the admin module.
 */
export interface CommunicationSettings {
  whatsapp: WhatsappChannelSettings;
  [channel: string]: unknown;
}

export const DEFAULT_WHATSAPP_SETTINGS: WhatsappChannelSettings = {
  enabled: false,
  groupName: '',
  inviteLink: '',
  description: '',
  updatedAt: '',
  updatedBy: '',
};

export const DEFAULT_COMMUNICATION_SETTINGS: CommunicationSettings = {
  whatsapp: { ...DEFAULT_WHATSAPP_SETTINGS },
};

/**
 * Read the communication settings from `settings/communication`. Falls back to
 * disabled defaults when the document does not exist yet.
 */
export async function readCommunicationSettings(): Promise<CommunicationSettings> {
  const db = getDb();
  const snap = await getDoc(doc(db, 'settings', COMMUNICATION_SETTINGS_DOC));
  if (!snap.exists()) return { ...DEFAULT_COMMUNICATION_SETTINGS };
  const data = snap.data();
  return {
    ...DEFAULT_COMMUNICATION_SETTINGS,
    ...data,
    whatsapp: { ...DEFAULT_WHATSAPP_SETTINGS, ...(data.whatsapp || {}) },
  } as CommunicationSettings;
}

/**
 * Live subscription to `settings/communication`. The callback fires immediately
 * with the current settings and again whenever the document changes, so open
 * admin forms stay in sync with other admins editing the same channels.
 * Returns an unsubscribe function.
 */
export function subscribeCommunicationSettings(
  onNext: (settings: CommunicationSettings) => void,
  onError?: (error: Error) => void
): () => void {
  const db = getDb();
  return onSnapshot(
    doc(db, 'settings', COMMUNICATION_SETTINGS_DOC),
    (snap) => {
      if (!snap.exists()) {
        onNext({ ...DEFAULT_COMMUNICATION_SETTINGS });
        return;
      }
      const data = snap.data();
      onNext({
        ...DEFAULT_COMMUNICATION_SETTINGS,
        ...data,
        whatsapp: { ...DEFAULT_WHATSAPP_SETTINGS, ...(data.whatsapp || {}) },
      } as CommunicationSettings);
    },
    onError
  );
}

/**
 * Save communication channel settings to `settings/communication` (merge).
 * The WhatsApp channel is stamped with the editor identity and timestamp.
 * Returns the freshly re-read settings so the caller reflects stored state.
 */
export async function saveCommunicationSettings(
  partial: Partial<CommunicationSettings>,
  performer?: { id: string; name: string }
): Promise<CommunicationSettings> {
  const db = getDb();
  const timestamp = now();
  const patch: Record<string, unknown> = {};
  if (partial.whatsapp) {
    patch.whatsapp = {
      ...DEFAULT_WHATSAPP_SETTINGS,
      ...partial.whatsapp,
      updatedAt: timestamp,
      updatedBy: performer?.name || performer?.id || '',
    };
  }
  await setDoc(doc(db, 'settings', COMMUNICATION_SETTINGS_DOC), patch, { merge: true });
  return readCommunicationSettings();
}
