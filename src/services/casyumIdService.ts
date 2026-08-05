import { doc, runTransaction, type Firestore } from 'firebase/firestore';
import { getDb } from '../firebase/firestore';

/**
 * Sequential, globally unique public participant identifier.
 *
 * Every participant document (`participants/{firebaseAuthUid}`) carries a
 * `casyum_id` field of the form `CAS-<number>` (minimum two digits, e.g.
 * `CAS-01`, `CAS-02`, ..., `CAS-99`, `CAS-100`). The number is minted
 * atomically from the single counter document
 * `systemCounters/participantCounter { current: <number> }` inside the same
 * transaction that creates the participant, so IDs are never duplicated and
 * never reused — deleting a participant never decrements the counter.
 *
 * The Firebase Auth UID stays the internal document id and is never replaced;
 * `casyum_id` is the public identifier printed on the participant pass and
 * encoded inside the QR payload (`<casyum_id>`, e.g. `CAS-02`).
 */

export const CASYUM_ID_REGEX = /^CAS-(\d+)$/i;
export const CASYUM_COUNTER_COLLECTION = 'systemCounters';
export const CASYUM_COUNTER_DOC = 'participantCounter';
export const CASYUM_COUNTER_FIELD = 'current';

/** `1` -> `CAS-01`, `100` -> `CAS-100`. Always at least two digits. */
export function formatCasyumId(number: number): string {
  const n = Math.max(1, Math.trunc(number));
  return `CAS-${String(n).padStart(2, '0')}`;
}

/** `CAS-05` -> `5`, `CAS-100` -> `100`. Returns null when not a CASYUM id. */
export function parseCasyumId(value: unknown): number | null {
  const raw = String(value ?? '').trim();
  const match = CASYUM_ID_REGEX.exec(raw);
  if (!match) return null;
  const n = Number(match[1]);
  return Number.isInteger(n) && n > 0 ? n : null;
}

function counterRef(db: Firestore) {
  return doc(db, CASYUM_COUNTER_COLLECTION, CASYUM_COUNTER_DOC);
}

/**
 * Create a participant document and mint its `casyum_id` in a single
 * Firestore transaction. Idempotent per document: if the participant already
 * carries a `casyum_id` the transaction returns the existing value without
 * touching the counter.
 */
export async function createParticipantWithCasyumId(
  uid: string,
  record: object
): Promise<string> {
  const db = getDb();
  const participantRef = doc(db, 'participants', uid);
  const existingCasyumId = String((record as Record<string, unknown>).casyum_id || '').trim();

  if (existingCasyumId) {
    return existingCasyumId;
  }

  return runTransaction(db, async (tx) => {
    const snap = await tx.get(participantRef);
    if (snap.exists()) {
      const already = String(snap.data().casyum_id || '').trim();
      if (already) return already;
      const counterSnap = await tx.get(counterRef(db));
      const current = readCounter(counterSnap.data()?.current);
      const casyumId = formatCasyumId(current + 1);
      tx.set(counterRef(db), { [CASYUM_COUNTER_FIELD]: current + 1 }, { merge: true });
      tx.update(participantRef, { casyum_id: casyumId });
      return casyumId;
    }
    const counterSnap = await tx.get(counterRef(db));
    const current = readCounter(counterSnap.data()?.current);
    const casyumId = formatCasyumId(current + 1);
    tx.set(counterRef(db), { [CASYUM_COUNTER_FIELD]: current + 1 }, { merge: true });
    tx.set(participantRef, { ...record, casyum_id: casyumId });
    return casyumId;
  });
}

/**
 * Ensure a participant document has a `casyum_id`, assigning one if missing.
 * Idempotent: never overwrites an existing id. Used by the admin repair
 * utility and as a safety net after any participant creation path.
 */
export async function assignCasyumId(uid: string): Promise<string | null> {
  const db = getDb();
  const participantRef = doc(db, 'participants', uid);

  return runTransaction(db, async (tx) => {
    const snap = await tx.get(participantRef);
    if (!snap.exists()) return null;
    const existing = String(snap.data().casyum_id || '').trim();
    if (existing) return existing;

    const counterSnap = await tx.get(counterRef(db));
    const current = readCounter(counterSnap.data()?.current);
    const casyumId = formatCasyumId(current + 1);
    tx.set(counterRef(db), { [CASYUM_COUNTER_FIELD]: current + 1 }, { merge: true });
    tx.update(participantRef, { casyum_id: casyumId });
    return casyumId;
  });
}

function readCounter(value: unknown): number {
  const n = Number(value);
  return Number.isInteger(n) && n > 0 ? n : 0;
}
