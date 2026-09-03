import { useState } from 'react';
import { doc, collection, getDocFromServer, getDocsFromServer } from 'firebase/firestore';
import { getFirebaseApp } from '../firebase/firebase';
import { getDb } from '../firebase/firestore';
import { getFirebaseAuth } from '../firebase/auth';

interface TestResult {
  operation: string;
  path: string;
  success: boolean;
  code: string;
  message: string;
  documentsReturned: number | null;
}

const TARGET_UID = 'oGAEwmL8XVUPB48E3VuwJB9YZV93';

function printResult(r: TestResult) {
  const block = [
    '[SERVER TEST]',
    `operation: ${r.operation}`,
    `path: ${r.path}`,
    `success/failure: ${r.success ? 'SUCCESS' : 'FAILURE'}`,
    `Firebase error code: ${r.code}`,
    `Firebase error message: ${r.message}`,
    `documents returned: ${r.documentsReturned === null ? 'N/A' : r.documentsReturned}`,
  ].join('\n');
  console.log(block);
}

export function FirestoreServerDiagnostics() {
  const [running, setRunning] = useState(false);
  const [results, setResults] = useState<TestResult[]>([]);

  const runTests = async () => {
    setRunning(true);
    const auth = getFirebaseAuth();
    const db = getDb();
    const firebaseUser = auth.currentUser;
    const app = getFirebaseApp();

    const resultsOut: TestResult[] = [];
    const appRaw: any = app as any;
    const appProjectId = appRaw?.options?.projectId ?? 'unknown';

    console.log('Firebase projectId:', appProjectId);
    console.log('currentUser.uid:', firebaseUser?.uid ?? 'NO CURRENT USER');
    console.log('currentUser.email:', firebaseUser?.email ?? 'NO CURRENT USER');

    const uid = firebaseUser?.uid ?? TARGET_UID;

    const tests: Array<{ operation: string; path: string; run: () => Promise<any> }> = [
      {
        operation: 'getDocFromServer',
        path: `users/${uid}`,
        run: () => getDocFromServer(doc(db, 'users', uid)),
      },
      {
        operation: 'getDocsFromServer',
        path: 'users (collection)',
        run: () => getDocsFromServer(collection(db, 'users')),
      },
      {
        operation: 'getDocsFromServer',
        path: 'participants (collection)',
        run: () => getDocsFromServer(collection(db, 'participants')),
      },
      {
        operation: 'getDocsFromServer',
        path: 'registrations (collection)',
        run: () => getDocsFromServer(collection(db, 'registrations')),
      },
    ];

    for (const t of tests) {
      const res: TestResult = {
        operation: t.operation,
        path: t.path,
        success: false,
        code: '',
        message: '',
        documentsReturned: null,
      };
      try {
        const snap: any = await t.run();
        res.success = true;
        res.documentsReturned =
          typeof snap?.size === 'number' ? snap.size : snap?.exists ? 1 : 0;
        printResult(res);
      } catch (err: any) {
        res.code = err?.code || err?.name || 'unknown';
        res.message = err?.message || String(err);
        printResult(res);
      }
      resultsOut.push(res);
    }

    setResults(resultsOut);
    setRunning(false);
  };

  return (
    <div className="min-h-screen bg-black text-white p-8 font-mono text-sm">
      <h1 className="text-xl font-bold mb-2 text-violet-400">TEMP: Firestore Server-Read Diagnostics</h1>
      <p className="mb-6 text-white/60">
        Uses <span className="text-emerald-300">getDocFromServer / getDocsFromServer</span> (bypasses SDK cache).
        Results are printed to browser console AND shown below.
      </p>

      <button
        type="button"
        onClick={() => void runTests()}
        disabled={running}
        className="px-6 py-3 rounded-xl bg-violet-500/20 border border-violet-500/40 text-violet-200 hover:bg-violet-500/30 disabled:opacity-50 transition-colors cursor-pointer mb-6"
      >
        {running ? 'Running…' : 'Run Server Tests'}
      </button>

      {results.length > 0 && (
        <div className="space-y-4">
          {results.map((r, i) => (
            <div
              key={i}
              className={`rounded-xl border p-4 ${
                r.success ? 'border-emerald-500/40 bg-emerald-500/5' : 'border-rose-500/40 bg-rose-500/5'
              }`}
            >
              <div className="font-bold">{r.operation}</div>
              <div className="text-white/70">path: {r.path}</div>
              <div className={r.success ? 'text-emerald-300' : 'text-rose-300'}>
                success/failure: {r.success ? 'SUCCESS' : 'FAILURE'}
              </div>
              <div>Firebase error code: {r.code || 'N/A'}</div>
              <div>Firebase error message: {r.message || 'N/A'}</div>
              <div>documents returned: {r.documentsReturned === null ? 'N/A' : r.documentsReturned}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
