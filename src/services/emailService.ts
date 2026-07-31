import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import { getDb } from '../firebase/firestore';
import { nextSequence, now } from './helpers';

const EMAIL_TYPES = ['Welcome', 'Password Reset', 'Event Notification', 'Certificate Issued'];

export async function listEmails(params?: { status?: string; search?: string }): Promise<{ emails: any[] }> {
  const db = getDb();
  const snap = await getDocs(collection(db, 'emailLogs'));
  let emails = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as any);
  if (params?.status && params.status !== 'All') {
    emails = emails.filter((e) => e.status === params.status);
  }
  if (params?.search) {
    const q = params.search.toLowerCase();
    emails = emails.filter(
      (e) =>
        String(e.recipient || '').toLowerCase().includes(q) ||
        String(e.subject || '').toLowerCase().includes(q)
    );
  }
  emails.sort((a, b) => String(b.sent_at || '').localeCompare(String(a.sent_at || '')));
  return { emails };
}

export async function emailStats(): Promise<{
  total: number;
  sent: number;
  pending: number;
  failed: number;
  today: number;
  smtp_configured: boolean;
  types: Array<{ type: string; label: string }>;
}> {
  const db = getDb();
  const snap = await getDocs(collection(db, 'emailLogs'));
  let sent = 0;
  let pending = 0;
  let failed = 0;
  let today = 0;
  const todayPrefix = new Date().toISOString().slice(0, 10);
  snap.docs.forEach((d) => {
    const data = d.data();
    const s = data.status;
    if (s === 'Sent') sent += 1;
    else if (s === 'Pending' || s === 'Queued') pending += 1;
    else if (s === 'Failed') failed += 1;
    if (String(data.sent_at || '').startsWith(todayPrefix)) today += 1;
  });
  return {
    total: snap.size,
    sent,
    pending,
    failed,
    today,
    smtp_configured: false,
    types: EMAIL_TYPES.map((t) => ({ type: t, label: t })),
  };
}

export async function getEmail(id: string): Promise<{ email: any }> {
  const db = getDb();
  const snap = await getDoc(doc(db, 'emailLogs', id));
  if (!snap.exists()) {
    throw new Error('Email log not found.');
  }
  return { email: { id: snap.id, ...snap.data() } };
}

export async function resendEmail(id: string): Promise<{ message: string }> {
  const db = getDb();
  await updateDoc(doc(db, 'emailLogs', id), { status: 'Pending', attempts: 0, updated_at: now() });
  return { message: 'Email queued for resend (Firebase Auth email delivery applies to reset links only).' };
}

export async function sendTestEmail(to: string): Promise<{ message: string }> {
  const db = getDb();
  const id = `log-${String(await nextSequence('emailLogs'))}`;
  await setDoc(doc(db, 'emailLogs', id), {
    log_id: id,
    recipient: to,
    recipient_name: to,
    subject: 'Test Email from CASYUM',
    email_type: 'Test',
    status: 'Pending',
    attempts: 0,
    sent_at: now(),
    created_at: now(),
  });
  return { message: 'Test email queued' };
}

export async function emailTypes(): Promise<string[]> {
  return EMAIL_TYPES;
}
