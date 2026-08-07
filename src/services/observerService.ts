import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
} from 'firebase/firestore';
import { getDb } from '../firebase/firestore';
import {
  createUserInProject,
  readUserRecord,
  mapFirebaseAuthError,
  type UserRecord,
} from './authService';
import { sendPasswordResetEmail } from 'firebase/auth';
import { getFirebaseAuth } from '../firebase/auth';
import { nextSequence, now, slugify, generateTempPassword } from './helpers';
import { OBSERVER_ROLE } from '../rbac/constants';
import type { UserRole } from '../rbac/types';

export const OBSERVER_ROLES: UserRole[] = [OBSERVER_ROLE];

export type PasswordStatus = 'temporary' | 'updated';

export interface Observer {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  phone: string;
  designation: string;
  username: string;
  role: UserRole;
  status: 'Active' | 'Inactive';
  is_first_login: number;
  mustChangePassword: boolean;
  passwordStatus: PasswordStatus;
  passwordChangedAt: string | null;
  password_changed_at: string | null;
  created_at: string;
  updated_at: string;
  last_login: string | null;
  created_by: string;
}

export interface ObserverActivity {
  id: string;
  log_id: string;
  observer_id: string;
  observer_name: string;
  action: string;
  details: string;
  performed_by: string;
  performed_by_name: string;
  timestamp: string;
  created_at: string;
}

function isObserverRecord(record: UserRecord): boolean {
  return record.role === OBSERVER_ROLE;
}

function mapObserverRecord(record: UserRecord): Observer {
  const anyRecord = record as any;
  const changed =
    anyRecord.mustChangePassword === true ||
    anyRecord.passwordStatus === 'temporary' ||
    record.is_first_login === true;
  const changedAt = anyRecord.passwordChangedAt || record.password_changed_at || null;
  return {
    id: record.id,
    user_id: record.user_id,
    full_name: record.full_name,
    email: record.email,
    phone: record.phone || '',
    designation: anyRecord.designation || '',
    username: record.username,
    role: record.role as UserRole,
    status: record.status === 'Active' ? 'Active' : 'Inactive',
    is_first_login: record.is_first_login ? 1 : 0,
    mustChangePassword: changed,
    passwordStatus: anyRecord.passwordStatus === 'updated' ? 'updated' : 'temporary',
    passwordChangedAt: changedAt,
    password_changed_at: record.password_changed_at,
    created_at: record.created_at,
    updated_at: record.updated_at,
    last_login: record.last_login,
    created_by: record.created_by,
  };
}

async function logActivity(entry: {
  observer_id: string;
  observer_name: string;
  action: string;
  details: string;
  performed_by: string;
  performed_by_name: string;
}): Promise<void> {
  const db = getDb();
  const logId = `obslog-${String(await nextSequence('observer_logs'))}`;
  const timestamp = now();
  await setDoc(doc(db, 'observer_logs', logId), {
    log_id: logId,
    ...entry,
    timestamp,
    created_at: timestamp,
  });
}

export async function listObservers(params?: { status?: string; search?: string }): Promise<{ observers: Observer[] }> {
  const db = getDb();
  const snap = await getDocs(collection(db, 'users'));
  let observers = snap.docs
    .map((d) => ({ id: d.id, ...d.data() }) as UserRecord)
    .filter((r) => isObserverRecord(r))
    .map(mapObserverRecord);

  if (params?.status && params.status !== 'All') {
    observers = observers.filter((m) => m.status === params.status);
  }
  if (params?.search) {
    const q = params.search.toLowerCase();
    observers = observers.filter(
      (m) =>
        m.full_name.toLowerCase().includes(q) ||
        m.email.toLowerCase().includes(q) ||
        String(m.phone || '').includes(q) ||
        String(m.designation || '').toLowerCase().includes(q)
    );
  }
  observers.sort((a, b) => String(b.created_at || '').localeCompare(String(a.created_at || '')));
  return { observers };
}

export async function createObserver(data: {
  full_name: string;
  email: string;
  phone: string;
  designation?: string;
  password?: string;
  status?: 'Active' | 'Inactive';
  created_by?: string;
  created_by_name?: string;
}): Promise<{
  message: string;
  observer: Observer;
  credentials: { email: string; password: string; username: string };
}> {
  if (!data.full_name || !data.email) {
    throw new Error('Name and email are required.');
  }
  const password = data.password || generateTempPassword();
  if (password.length < 8) {
    throw new Error('Temporary password must be at least 8 characters long.');
  }
  let uid: string;
  try {
    uid = await createUserInProject(data.email, password);
  } catch (err) {
    throw new Error(mapFirebaseAuthError(err));
  }

  const db = getDb();
  const user_id = `OBS-${String(await nextSequence('observers'))}`;
  const username = slugify(data.full_name);
  const record: UserRecord = {
    id: uid,
    user_id,
    full_name: data.full_name,
    email: data.email,
    phone: data.phone || '',
    department: '',
    designation: data.designation || '',
    username,
    role: OBSERVER_ROLE,
    status: data.status || 'Active',
    is_first_login: true,
    mustChangePassword: true,
    passwordStatus: 'temporary',
    passwordChangedAt: null,
    password_changed_at: null,
    created_at: now(),
    updated_at: now(),
    last_login: null,
    created_by: data.created_by || '',
    notes: '',
  };
  await setDoc(doc(db, 'users', uid), record);

  const observer = mapObserverRecord(record);

  await logActivity({
    observer_id: uid,
    observer_name: data.full_name,
    action: 'Observer Created',
    details: `Observer account created with email ${data.email}`,
    performed_by: data.created_by || '',
    performed_by_name: data.created_by_name || data.created_by || '',
  });

  return {
    message: 'Observer created successfully',
    observer,
    credentials: { email: data.email, password, username },
  };
}

export async function updateObserver(
  id: string,
  data: Partial<{
    full_name: string;
    phone: string;
    designation: string;
    status: 'Active' | 'Inactive';
    updated_by?: string;
    updated_by_name?: string;
  }>
): Promise<{ observer: Observer }> {
  const db = getDb();
  const uid = String(id);
  const existing = await readUserRecord(uid);
  if (!existing) {
    throw new Error('Observer not found.');
  }
  if (!isObserverRecord(existing)) {
    throw new Error('This account is not an Observer.');
  }

  const patch: Record<string, any> = { ...data, updated_at: now() };
  Object.keys(patch).forEach((k) => {
    if (patch[k] === undefined) delete patch[k];
  });
  const updatedBy = patch.updated_by;
  const updatedByName = patch.updated_by_name;
  delete patch.updated_by;
  delete patch.updated_by_name;

  await updateDoc(doc(db, 'users', uid), patch);
  const updated = await readUserRecord(uid);
  const observer = mapObserverRecord(updated!);

  await logActivity({
    observer_id: uid,
    observer_name: observer.full_name,
    action: 'Observer Updated',
    details: `Profile details updated by admin`,
    performed_by: updatedBy || '',
    performed_by_name: updatedByName || updatedBy || '',
  });

  return { observer };
}

export async function setObserverStatus(
  id: string,
  status: 'Active' | 'Inactive',
  performer?: { id: string; name: string }
): Promise<{ observer: Observer }> {
  const db = getDb();
  const uid = String(id);
  const existing = await readUserRecord(uid);
  if (!existing) {
    throw new Error('Observer not found.');
  }
  await updateDoc(doc(db, 'users', uid), { status, updated_at: now() });
  const updated = await readUserRecord(uid);
  const observer = mapObserverRecord(updated!);

  await logActivity({
    observer_id: uid,
    observer_name: observer.full_name,
    action: status === 'Active' ? 'Observer Enabled' : 'Observer Disabled',
    details: `Observer account ${status === 'Active' ? 'enabled' : 'disabled'} by admin`,
    performed_by: performer?.id || '',
    performed_by_name: performer?.name || performer?.id || '',
  });

  return { observer };
}

export async function deleteObserver(
  id: string,
  performer?: { id: string; name: string }
): Promise<{ message: string }> {
  const db = getDb();
  const uid = String(id);
  const existing = await readUserRecord(uid);
  if (existing) {
    await logActivity({
      observer_id: uid,
      observer_name: existing.full_name,
      action: 'Observer Deleted',
      details: `Observer account permanently deleted`,
      performed_by: performer?.id || '',
      performed_by_name: performer?.name || performer?.id || '',
    });
  }
  await deleteDoc(doc(db, 'users', uid));
  return { message: 'Observer deleted' };
}

export async function resetObserverPassword(
  id: string,
  performer?: { id: string; name: string }
): Promise<{ message: string }> {
  const db = getDb();
  const uid = String(id);
  const existing = await readUserRecord(uid);
  if (!existing) {
    throw new Error('Observer not found.');
  }

  // The observer is flagged to create a new password on next sign-in and a
  // secure Firebase password reset email is sent so the new password can be
  // entered through the official password reset flow.
  await updateDoc(doc(db, 'users', uid), {
    is_first_login: true,
    mustChangePassword: true,
    passwordStatus: 'temporary',
    passwordChangedAt: null,
    password_changed_at: null,
    updated_at: now(),
  });
  await sendPasswordResetEmail(getFirebaseAuth(), existing.email);

  await logActivity({
    observer_id: uid,
    observer_name: existing.full_name,
    action: 'Password Reset',
    details: `Temporary password reset for ${existing.full_name}; reset email sent to ${existing.email}`,
    performed_by: performer?.id || '',
    performed_by_name: performer?.name || performer?.id || '',
  });
  return {
    message: `A password reset email has been sent to ${existing.email}. The observer must set a new password on their next login.`,
  };
}

export async function listObserverActivity(limitCount = 500): Promise<ObserverActivity[]> {
  const db = getDb();
  const snap = await getDocs(collection(db, 'observer_logs'));
  return snap.docs
    .map((d) => {
      const data = d.data();
      return {
        id: d.id,
        log_id: data.log_id || d.id,
        observer_id: data.observer_id || '',
        observer_name: data.observer_name || '',
        action: data.action || '',
        details: data.details || '',
        performed_by: data.performed_by || '',
        performed_by_name: data.performed_by_name || '',
        timestamp: data.timestamp || '',
        created_at: data.created_at || '',
      } as ObserverActivity;
    })
    .sort((a, b) => String(b.timestamp).localeCompare(String(a.timestamp)))
    .slice(0, limitCount);
}

export async function getObserver(id: string): Promise<{ observer: Observer } | null> {
  const record = await readUserRecord(String(id));
  if (!record || !isObserverRecord(record)) return null;
  return { observer: mapObserverRecord(record) };
}

export async function getDocRef(id: string): Promise<{ exists: boolean }> {
  const snap = await getDoc(doc(getDb(), 'users', String(id)));
  return { exists: snap.exists() };
}
