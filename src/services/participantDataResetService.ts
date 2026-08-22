import {
  collection,
  doc,
  getDocs,
  query,
  limit,
  writeBatch,
  type Firestore,
} from 'firebase/firestore';
import { getDb } from '../firebase/firestore';
import {
  CASYUM_COUNTER_COLLECTION,
  CASYUM_COUNTER_DOC,
  CASYUM_COUNTER_FIELD,
} from './casyumIdService';

/**
 * Manual participant-data reset (admin action, Super Admin / Admin only).
 *
 * Deletes every participant-owned document so the system starts clean for a
 * fresh event run, and resets the CASYUM id counter to `0` so the next real
 * registration is minted `CAS00`.
 *
 * DELETED (all participant-owned collections):
 *   - participants, registrations, eventRegistrations
 *   - teams, teamMembers, teamFormationAccess
 *   - attendance, participant_verifications
 *   - verification_logs entries that reference a participant (`participant_id`)
 *   - payments (best effort — the client rules deny this collection; the
 *     Admin SDK script `scripts/reset-participants.mjs` is the authoritative
 *     cleanup for `payments` and Firebase Auth accounts)
 *
 * RESET:
 *   - events.*.registered_count back to 0 (derived counter, no event docs are
 *     deleted — events, schedules, speakers, rule books survive)
 *   - systemCounters/participantCounter.current back to 0
 *
 * PRESERVED (not participant data, must survive a reset):
 *   - users (staff/coordinator accounts), audit_logs, emailLogs, certificates,
 *     registration_team_logs, payment_verification_logs, observer_logs,
 *     casyum_faculty_logs, announcements, gallery, results, sponsorships
 *
 * The counter is only reset AFTER all participant collections have been
 * deleted, so a mid-run failure can never cause a fresh id to collide with an
 * existing participant (they would keep their old CASYUM id instead).
 */

const BATCH_SIZE = 400;

export interface ParticipantDataResetResult {
  /** Number of documents deleted per collection (-1 = skipped / not accessible). */
  deleted: Record<string, number>;
  /** True when the CASYUM id counter was successfully reset to 0. */
  counterReset: boolean;
  /** The counter value after the reset (always 0). */
  counterValue: number;
  /** Number of events whose registered_count was reset to 0. */
  eventsReset: number;
}

/** Delete every document in a collection in page-size batches (whole collection). */
async function deleteAllCollectionDocs(db: Firestore, name: string): Promise<number> {
  let deleted = 0;
  for (;;) {
    const snap = await getDocs(query(collection(db, name), limit(BATCH_SIZE)));
    if (snap.empty) break;
    const batch = writeBatch(db);
    snap.docs.forEach((d) => batch.delete(d.ref));
    await batch.commit();
    deleted += snap.docs.length;
    if (snap.docs.length < BATCH_SIZE) break;
  }
  return deleted;
}

/** Delete the verification_logs entries that reference a participant. */
async function deleteParticipantVerificationLogs(db: Firestore): Promise<number> {
  const snap = await getDocs(collection(db, 'verification_logs'));
  const refs = snap.docs
    .filter((d) => String(d.data()?.participant_id || '').trim() !== '')
    .map((d) => d.ref);

  let deleted = 0;
  for (let i = 0; i < refs.length; i += BATCH_SIZE) {
    const slice = refs.slice(i, i + BATCH_SIZE);
    const batch = writeBatch(db);
    slice.forEach((ref) => batch.delete(ref));
    await batch.commit();
    deleted += slice.length;
  }
  return deleted;
}

/** Reset every event's derived registered_count to 0 (event docs stay intact). */
async function resetEventRegisteredCounts(db: Firestore): Promise<number> {
  let updated = 0;
  for (;;) {
    const snap = await getDocs(query(collection(db, 'events'), limit(BATCH_SIZE)));
    if (snap.empty) break;
    const batch = writeBatch(db);
    snap.docs.forEach((d) => batch.update(d.ref, { registered_count: 0 }));
    await batch.commit();
    updated += snap.docs.length;
    if (snap.docs.length < BATCH_SIZE) break;
  }
  return updated;
}

/**
 * Wipe all participant data and reset the CASYUM id sequence. Admin-only
 * guardrail (Super Admin / Admin) is enforced by the calling UI.
 */
export async function resetAllParticipantData(): Promise<ParticipantDataResetResult> {
  const db = getDb();
  const deleted: Record<string, number> = {};

  const fullCollections = [
    'participants',
    'registrations',
    'eventRegistrations',
    'teams',
    'teamMembers',
    'teamFormationAccess',
    'attendance',
    'participant_verifications',
  ];

  for (const name of fullCollections) {
    deleted[name] = await deleteAllCollectionDocs(db, name);
  }

  deleted['verification_logs'] = await deleteParticipantVerificationLogs(db);

  try {
    deleted['payments'] = await deleteAllCollectionDocs(db, 'payments');
  } catch {
    // `payments` is not reachable from the client rules; the Admin SDK script
    // (scripts/reset-participants.mjs) performs the authoritative cleanup.
    deleted['payments'] = -1;
  }

  const eventsReset = await resetEventRegisteredCounts(db);

  const counterDocRef = doc(db, CASYUM_COUNTER_COLLECTION, CASYUM_COUNTER_DOC);
  await writeBatch(db)
    .set(counterDocRef, { [CASYUM_COUNTER_FIELD]: 0 }, { merge: true })
    .commit();

  return {
    deleted,
    counterReset: true,
    counterValue: 0,
    eventsReset,
  };
}

/** Purely informational: how many participant records exist today (for the confirm dialog). */
export async function countParticipantData(): Promise<{
  participants: number;
  registrations: number;
  teams: number;
}> {
  const db = getDb();
  const count = async (name: string) => (await getDocs(collection(db, name))).size;
  return {
    participants: await count('participants'),
    registrations: await count('registrations'),
    teams: await count('teams'),
  };
}
