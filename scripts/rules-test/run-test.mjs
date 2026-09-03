import { readFileSync } from 'node:fs';
import { initializeTestEnvironment } from '@firebase/rules-unit-testing';

// Clear emulator host env vars set by `firebase emulators:exec` so the compat
// SDK does not auto-connect before rules-unit-testing calls useEmulator().
for (const k of ['FIRESTORE_EMULATOR_HOST', 'FIREBASE_FIRESTORE_EMULATOR_ADDRESS', 'PUBSUB_EMULATOR_HOST', 'STORAGE_EMULATOR_HOST', 'RTDB_EMULATOR_HOST', 'FIREBASE_AUTH_EMULATOR_HOST', 'FIREBASE_DATABASE_EMULATOR_HOST']) {
  delete process.env[k];
}

const TEST_UID = 'oGAEwmL8XVUPB48E3VuwJB9YZV93';
const rules = readFileSync(new URL('../../firestore.rules', import.meta.url), 'utf8');

let testEnv;

async function seed(testEnv) {
  await testEnv.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    await db.doc('users/' + TEST_UID).set({
      role: 'Super Admin',
      email: 'admin@casyum.com'
    });
    await db.doc('participants/test-participant').set({
      name: 'Test Participant',
      verificationStatus: 'Verified'
    });
    await db.doc('registrations/test-registration').set({
      participant_id: TEST_UID,
      participant_user_id: TEST_UID,
      event_id: 'some-event',
      registrationFee: 150,
      payment_status: 'verified',
      registrationVerificationStatus: 'verified'
    });
  });
}

function fmtErr(e) {
  return `code=${e?.code || '(none)'} message=${e?.message || String(e)}`;
}

async function runTest(label, path, op, fn, db) {
  process.stdout.write(`\n${'='.repeat(64)}\n[LOCAL RULES TEST]\npath: ${path}\noperation: ${op}\n`);
  try {
    const snap = await fn(db);
    const n = snap?.size ?? snap?.length ?? 'n/a';
    process.stdout.write(`ALLOW or DENY: ALLOW\nresult: returned ${n} document(s)\n`);
    return 'ALLOW';
  } catch (e) {
    process.stdout.write(`ALLOW or DENY: DENY\nerror code/message: ${fmtErr(e)}\n`);
    return 'DENY';
  }
}

async function main() {
  testEnv = await initializeTestEnvironment({
    projectId: 'casyum-rules-test',
    firestore: { rules, host: '127.0.0.1', port: 8080 },
  });

  await seed(testEnv);

  // Authenticated context as the Super Admin UID
  const authed = testEnv.authenticatedContext(TEST_UID);
  const db = authed.firestore();

  const results = {};

  // TEST 1: document get
  results.Test1 = await runTest('Test1', 'users/oGAEwmL8XVUPB48E3VuwJB9YZV93', 'get(doc)', async (d) => {
    const snap = await d.doc('users/' + TEST_UID).get();
    const data = snap.exists ? snap.data() : null;
    process.stdout.write(`exists=${snap.exists} role=${data?.role || '(none)'}\n`);
    return snap;
  }, db);

  // TEST 2: list /users (full collection scan)
  results.Test2 = await runTest('Test2', '/users', 'getDocs(collection("users"))', (d) =>
    d.collection('users').get(), db);

  // TEST 3: list /participants
  results.Test3 = await runTest('Test3', '/participants', 'getDocs(collection("participants"))', (d) =>
    d.collection('participants').get(), db);

  // TEST 4: list /registrations
  results.Test4 = await runTest('Test4', '/registrations', 'getDocs(collection("registrations"))', (d) =>
    d.collection('registrations').get(), db);

  // TEST 5: list /users with limit(1)
  results.Test5 = await runTest('Test5', '/users', 'getDocs(query(collection("users"), limit(1)))', (d) =>
    d.collection('users').limit(1).get(), db);

  // TEST 6: list /participants with limit(1)
  results.Test6 = await runTest('Test6', '/participants', 'getDocs(query(collection("participants"), limit(1)))', (d) =>
    d.collection('participants').limit(1).get(), db);

  // TEST 7: list /registrations with limit(1)
  results.Test7 = await runTest('Test7', '/registrations', 'getDocs(query(collection("registrations"), limit(1)))', (d) =>
    d.collection('registrations').limit(1).get(), db);

  process.stdout.write(`\n${'='.repeat(64)}\nSUMMARY\n`);
  for (const [k, v] of Object.entries(results)) {
    process.stdout.write(`${k}: ${v}\n`);
  }

  await testEnv.cleanup();
}

main().catch((e) => {
  console.error('FATAL:', e);
  process.exitCode = 1;
});
