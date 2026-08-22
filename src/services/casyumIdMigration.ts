import { collection, doc, getDoc, getDocs, runTransaction } from 'firebase/firestore';
import { getDb } from '../firebase/firestore';
import {
  assignCasyumId,
  formatCasyumId,
  parseCasyumId,
  CASYUM_COUNTER_COLLECTION,
  CASYUM_COUNTER_DOC,
  CASYUM_COUNTER_FIELD,
} from './casyumIdService';

/**
 * One-time / admin-only repair utility that back-fills `casyum_id` on every
 * participant document created before the CASYUM ID system existed.
 *
 * Guarantees:
 *  - Idempotent: running it twice assigns nothing the second time.
 *  - Never overwrites an existing `casyum_id` (existing values are only used
 *    to compute the starting point).
 *  - Continues from the highest existing CAS number, never from `CAS00`, so
 *    migrated records and future registrations never collide.
 *  - Preserves all existing participant data (only the `casyum_id` field and
 *    the counter document are touched).
 *  - Is never invoked automatically at startup — it is triggered explicitly
 *    from the admin UI.
 */
export interface CasyumIdMigrationResult {
  assigned: number;
  alreadyAssigned: number;
  total: number;
  nextCasyumId: string;
}

export async function migrateMissingCasyumIds(): Promise<CasyumIdMigrationResult> {
  const db = getDb();

  const snap = await getDocs(collection(db, 'participants'));
  let maxExisting = 0;
  let alreadyAssigned = 0;
  const missing: Array<{ id: string; created_at: string }> = [];

  snap.docs.forEach((d) => {
    const data = d.data();
    const id = d.id;
    const parsed = parseCasyumId(data.casyum_id);
    if (parsed !== null) {
      alreadyAssigned += 1;
      maxExisting = Math.max(maxExisting, parsed);
      return;
    }
    missing.push({ id, created_at: String(data.created_at || '') });
  });

  // Deterministic order: oldest first, ties broken by document id. New IDs are
  // handed out in this order so the sequence is stable across runs.
  missing.sort(
    (a, b) => a.created_at.localeCompare(b.created_at) || a.id.localeCompare(b.id)
  );

  // Initialise (or advance) the counter to the highest existing number plus one
  // so future registrations continue after the migrated range. The counter
  // always holds the NEXT number to issue, so a highest id of CAS42 means the
  // next issued id is CAS43. Idempotent.
  const counterDoc = doc(db, CASYUM_COUNTER_COLLECTION, CASYUM_COUNTER_DOC);
  await runTransaction(db, async (tx) => {
    const counterSnap = await tx.get(counterDoc);
    const stored = Number(counterSnap.data()?.[CASYUM_COUNTER_FIELD]) || 0;
    const next = Math.max(stored, maxExisting + 1);
    tx.set(counterDoc, { [CASYUM_COUNTER_FIELD]: next }, { merge: true });
  });

  let assigned = 0;
  for (const p of missing) {
    const casyumId = await assignCasyumId(p.id);
    if (casyumId) assigned += 1;
  }

  const counterSnap = await getDoc(counterDoc);
  const nextCasyumId = formatCasyumId(Number(counterSnap.data()?.[CASYUM_COUNTER_FIELD]));

  return {
    assigned,
    alreadyAssigned,
    total: snap.size,
    nextCasyumId,
  };
}
