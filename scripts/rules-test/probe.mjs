import { readFileSync } from 'node:fs';
import { initializeTestEnvironment } from '@firebase/rules-unit-testing';

for (const k of ['FIRESTORE_EMULATOR_HOST', 'FIREBASE_FIRESTORE_EMULATOR_ADDRESS']) {
  delete process.env[k];
}

const rules = readFileSync(new URL('../../firestore.rules', import.meta.url), 'utf8');

console.log('step 0: start initializeTestEnvironment');
const testEnv = await initializeTestEnvironment({
  projectId: 'casyum-rules-test',
  firestore: { rules, host: '127.0.0.1', port: 8080 },
});
console.log('step 1: initializeTestEnvironment done');

console.log('step 2: withSecurityRulesDisabled seed');
await testEnv.withSecurityRulesDisabled(async (ctx) => {
  console.log('  seed: firestore().doc set users');
  await ctx.firestore().doc('users/oGAEwmL8XVUPB48E3VuwJB9YZV93').set({ role: 'Super Admin', email: 'admin@casyum.com' });
  console.log('  seed: done users');
});
console.log('step 3: seed done');

console.log('step 4: authenticatedContext');
const authed = testEnv.authenticatedContext('oGAEwmL8XVUPB48E3VuwJB9YZV93');
console.log('step 5: created context, calling firestore()');
const db = authed.firestore();
console.log('step 6: firestore() ok, doing getDoc');
const snap = await db.doc('users/oGAEwmL8XVUPB48E3VuwJB9YZV93').get();
console.log('step 7: getDoc done exists=', snap.exists);

await testEnv.cleanup();
console.log('ALL DONE');
