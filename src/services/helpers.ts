import { doc, runTransaction } from 'firebase/firestore';
import { getDb } from '../firebase/firestore';

export function now(): string {
  return new Date().toISOString();
}

export function pad(value: number, length = 4): string {
  return String(value).padStart(length, '0');
}

export async function nextSequence(key: string): Promise<number> {
  const db = getDb();
  const ref = doc(db, 'counters', key);
  return runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    const current = snap.exists() ? Number(snap.data().value || 0) : 0;
    tx.set(ref, { value: current + 1 }, { merge: true });
    return current + 1;
  });
}

export function generateTempPassword(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  let password = '';
  for (let i = 0; i < 10; i += 1) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  password += '!A1';
  return password;
}

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '')
    .slice(0, 8) || 'user';
}

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}
