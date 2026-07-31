import {
  collection,
  doc,
  getDocs,
  setDoc,
  deleteDoc,
} from 'firebase/firestore';
import { getDb } from '../firebase/firestore';
import { now } from './helpers';

export interface AuditLogRow {
  id: string;
  user: string;
  role: string;
  action: string;
  details: string;
  timestamp: string;
  ip_address: string;
  created_at: string;
}

export async function listAuditLogs(): Promise<AuditLogRow[]> {
  const db = getDb();
  const snap = await getDocs(collection(db, 'audit_logs'));
  const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as AuditLogRow);
  rows.sort((a, b) => String(b.created_at || '').localeCompare(String(a.created_at || '')));
  return rows;
}

export async function addAuditLog(
  data: Omit<AuditLogRow, 'id' | 'created_at'>
): Promise<AuditLogRow> {
  const db = getDb();
  const id = `log-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  const row: AuditLogRow = { ...data, id, created_at: now() };
  await setDoc(doc(db, 'audit_logs', id), row);
  return row;
}

export async function clearAuditLogs(): Promise<void> {
  const db = getDb();
  const snap = await getDocs(collection(db, 'audit_logs'));
  await Promise.all(snap.docs.map((d) => deleteDoc(doc(db, 'audit_logs', d.id))));
}
