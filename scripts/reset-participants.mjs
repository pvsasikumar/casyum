#!/usr/bin/env node
/**
 * Full participant-data reset via the Firebase Admin SDK.
 *
 * This is the authoritative cleanup used together with the in-app
 * "Reset Data" button (src/services/participantDataResetService.ts). The web
 * client can delete the Firestore participant collections, but it CANNOT
 * delete other users' Firebase Auth accounts, and the `payments` collection is
 * denied to the client by firestore.rules — both are handled here.
 *
 * WHAT IT DELETES:
 *   - Firebase Auth accounts that are NOT staff (any Auth user whose uid is
 *     absent from the `users` collection is treated as a participant)
 *   - participants, registrations, eventRegistrations
 *   - teams, teamMembers, teamFormationAccess
 *   - attendance, participant_verifications
 *   - verification_logs entries that reference a participant (`participant_id`)
 *   - payments (the whole collection)
 *
 * WHAT IT RESETS:
 *   - events.*.registered_count back to 0 (event docs are NOT deleted)
 *   - systemCounters/participantCounter.current back to 0, so the next
 *     registration is minted `CAS00`
 *
 * WHAT IT PRESERVES:
 *   - users (staff / coordinator / observer accounts and their Firebase Auth
 *     accounts), audit_logs, emailLogs, certificates, registration_team_logs,
 *     payment_verification_logs, observer_logs, casyum_faculty_logs,
 *     announcements, gallery, results, sponsorships, all other config
 *
 * USAGE:
 *   Set GOOGLE_APPLICATION_CREDENTIALS to your service-account JSON, then:
 *
 *     node scripts/reset-participants.mjs --yes
 *
 *   Safety: pass --yes to actually run; without it the script only prints the
 *   plan (dry run) and exits.
 */

import { readFileSync, existsSync } from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const admin = require('firebase-admin');

const args = process.argv.slice(2);
const force = args.includes('--yes');
const projectOverride =
  (args.find((a) => a.startsWith('--project=')) || '').split('=')[1] || undefined;

const serviceAccountPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
if (!serviceAccountPath || !existsSync(serviceAccountPath)) {
  console.error(
    'Missing service account. Set GOOGLE_APPLICATION_CREDENTIALS to the JSON path, e.g.:\n' +
      '  $env:GOOGLE_APPLICATION_CREDENTIALS = "C:/path/to/service-account.json"\n' +
      '  node scripts/reset-participants.mjs --yes'
  );
  process.exit(1);
}

const serviceAccount = JSON.parse(readFileSync(serviceAccountPath, 'utf8'));
const projectId = projectOverride || serviceAccount.project_id;

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId,
});

const auth = admin.auth();
const db = admin.firestore();

const BATCH_SIZE = 400;

async function deleteAllCollection(collectionPath) {
  let deleted = 0;
  for (;;) {
    const snap = await db.collection(collectionPath).limit(BATCH_SIZE).get();
    if (snap.empty) break;
    const batch = db.batch();
    snap.docs.forEach((d) => batch.delete(d.ref));
    await batch.commit();
    deleted += snap.docs.length;
    if (snap.docs.length < BATCH_SIZE) break;
  }
  return deleted;
}

async function deleteParticipantVerificationLogs() {
  const snap = await db.collection('verification_logs').get();
  const refs = snap.docs.filter(
    (d) => String(d.data().participant_id || '').trim() !== ''
  );
  let deleted = 0;
  for (let i = 0; i < refs.length; i += BATCH_SIZE) {
    const slice = refs.slice(i, i + BATCH_SIZE);
    const batch = db.batch();
    slice.forEach((d) => batch.delete(d.ref));
    await batch.commit();
    deleted += slice.length;
  }
  return deleted;
}

async function deleteParticipantAuthAccounts() {
  const staffUids = new Set();
  const staffSnap = await db.collection('users').get();
  staffSnap.docs.forEach((d) => staffUids.add(d.id));

  let list;
  const deleted = { count: 0, uids: [] };
  while (list === undefined || list.nextPageToken) {
    list = await auth.listUsers(1000, list ? list.nextPageToken : undefined);
    const participantUids = list.users
      .filter((u) => !staffUids.has(u.uid))
      .map((u) => u.uid);
    if (participantUids.length > 0) {
      const result = await auth.deleteUsers(participantUids);
      deleted.count += result.successCount;
      deleted.uids.push(...participantUids);
    }
  }
  return deleted;
}

async function resetEventRegisteredCounts() {
  let updated = 0;
  for (;;) {
    const snap = await db.collection('events').limit(BATCH_SIZE).get();
    if (snap.empty) break;
    const batch = db.batch();
    snap.docs.forEach((d) => batch.update(d.ref, { registered_count: 0 }));
    await batch.commit();
    updated += snap.docs.length;
    if (snap.docs.length < BATCH_SIZE) break;
  }
  return updated;
}

async function run() {
  console.log(`Project:  ${projectId}`);
  console.log(`Mode:     ${force ? 'LIVE RESET' : 'DRY RUN (pass --yes to execute)'}`);
  console.log('');

  const plan = [];
  for (const name of [
    'participants',
    'registrations',
    'eventRegistrations',
    'teams',
    'teamMembers',
    'teamFormationAccess',
    'attendance',
    'participant_verifications',
    'payments',
  ]) {
    const snap = await db.collection(name).count().get();
    plan.push([name, snap.data().count]);
  }
  const vlog = await db.collection('verification_logs').get();
  plan.push([
    'verification_logs (participant entries)',
    vlog.docs.filter((d) => String(d.data().participant_id || '').trim() !== '').length,
  ]);
  const events = await db.collection('events').get();
  plan.push(['events (registered_count -> 0)', events.size]);
  const staff = await db.collection('users').count().get();
  const authList = await auth.listUsers(1000);
  let totalAuth = 0;
  let nextPage = authList.nextPageToken;
  totalAuth += authList.users.length;
  while (nextPage) {
    const page = await auth.listUsers(1000, nextPage);
    totalAuth += page.users.length;
    nextPage = page.nextPageToken;
  }
  plan.push(['auth accounts to delete (non-staff)', Math.max(0, totalAuth - staff.data().count)]);

  console.log('PLAN');
  console.log('----');
  plan.forEach(([name, n]) => console.log(`  ${String(n).padStart(8)}  ${name}`));

  if (!force) {
    console.log('');
    console.log('Dry run only — nothing was changed. Re-run with --yes to reset.');
    return;
  }

  console.log('');
  console.log('Deleting participant Auth accounts…');
  const authResult = await deleteParticipantAuthAccounts();
  console.log(`  deleted ${authResult.count} auth account(s)`);

  for (const [name] of plan.slice(0, 9)) {
    const n = await deleteAllCollection(name);
    console.log(`  ${name}: deleted ${n}`);
  }
  const vlogDeleted = await deleteParticipantVerificationLogs();
  console.log(`  verification_logs: deleted ${vlogDeleted}`);
  const eventsReset = await resetEventRegisteredCounts();
  console.log(`  events: registered_count reset on ${eventsReset}`);
  await db
    .collection('systemCounters')
    .doc('participantCounter')
    .set({ current: 0 }, { merge: true });
  console.log('  systemCounters/participantCounter.current -> 0 (next id: CAS00)');

  console.log('');
  console.log('Done. Next registration will be minted CAS00.');
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
