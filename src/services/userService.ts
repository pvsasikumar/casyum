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
import { COORDINATOR_ROLES } from './coordinatorService';
import { nextSequence, now, slugify, generateTempPassword } from './helpers';

const EMPLOYEE_ROLES = [
  'Super Admin',
  'Admin',
  'Registration Manager',
  'Certificate Manager',
  'Finance Manager',
];

function isEmployeeRecord(record: UserRecord): boolean {
  return EMPLOYEE_ROLES.includes(record.role) && !COORDINATOR_ROLES.includes(record.role);
}

function mapUserRecord(record: UserRecord): any {
  return {
    id: record.id,
    user_id: record.user_id,
    full_name: record.full_name,
    email: record.email,
    phone: record.phone || '',
    department: record.department || '',
    designation: record.designation || '',
    username: record.username,
    role: record.role,
    status: record.status,
    is_first_login: record.is_first_login ? 1 : 0,
    password_changed_at: record.password_changed_at,
    created_at: record.created_at,
    updated_at: record.updated_at,
    last_login: record.last_login,
    created_by: record.created_by,
  };
}

export async function listUsers(params?: { status?: string; search?: string; role?: string }): Promise<{ users: any[] }> {
  const db = getDb();
  const snap = await getDocs(collection(db, 'users'));
  let users = snap.docs
    .map((d) => ({ id: d.id, ...d.data() }) as UserRecord)
    .filter((r) => isEmployeeRecord(r))
    .map(mapUserRecord);

  if (params?.status && params.status !== 'All') {
    users = users.filter((u) => u.status === params.status);
  }
  if (params?.role && params.role !== 'All') {
    users = users.filter((u) => u.role === params.role);
  }
  if (params?.search) {
    const q = params.search.toLowerCase();
    users = users.filter(
      (u) =>
        u.full_name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        String(u.phone || '').includes(q)
    );
  }
  users.sort((a, b) => String(b.created_at || '').localeCompare(String(a.created_at || '')));
  return { users };
}

export async function getUser(id: string): Promise<{ user: any }> {
  const record = await readUserRecord(id);
  if (!record) {
    throw new Error('User not found.');
  }
  return { user: mapUserRecord(record) };
}

export async function createUser(data: {
  full_name: string;
  email: string;
  phone?: string;
  department?: string;
  designation?: string;
  role?: string;
  status?: string;
  password?: string;
}): Promise<{
  message: string;
  user: any;
  credentials: { email: string; password: string; username: string };
  email: { queued: boolean; log_id: string } | null;
}> {
  if (!data.full_name || !data.email) {
    throw new Error('Name and email are required.');
  }
  const password = data.password || generateTempPassword();
  let uid: string;
  try {
    uid = await createUserInProject(data.email, password);
  } catch (err) {
    throw new Error(mapFirebaseAuthError(err));
  }

  const db = getDb();
  const user_id = `EMP-${String(await nextSequence('users'))}`;
  const username = slugify(data.full_name);
  const record: UserRecord = {
    id: uid,
    user_id,
    full_name: data.full_name,
    email: data.email,
    phone: data.phone || '',
    department: data.department || '',
    designation: data.designation || '',
    username,
    role: data.role || 'Admin',
    status: data.status || 'Active',
    is_first_login: true,
    password_changed_at: null,
    created_at: now(),
    updated_at: now(),
    last_login: null,
    created_by: '',
  };
  await setDoc(doc(db, 'users', uid), record);

  return {
    message: 'User created successfully',
    user: mapUserRecord(record),
    credentials: { email: data.email, password, username },
    email: { queued: false, log_id: '' },
  };
}

export async function updateUser(id: string, data: Partial<any>): Promise<{ user: any }> {
  const db = getDb();
  const patch: Record<string, any> = { ...data, updated_at: now() };
  Object.keys(patch).forEach((k) => {
    if (patch[k] === undefined) delete patch[k];
  });
  if (patch.password) {
    delete patch.password;
  }
  await updateDoc(doc(db, 'users', id), patch);
  const record = await readUserRecord(id);
  return { user: mapUserRecord(record!) };
}

export async function deleteUser(id: string): Promise<{ message: string }> {
  const db = getDb();
  await deleteDoc(doc(db, 'users', id));
  return { message: 'User deleted' };
}

export async function resetUserPassword(id: string): Promise<{
  message: string;
  credentials: { email: string; password: string };
}> {
  const record = await readUserRecord(id);
  if (!record) {
    throw new Error('User not found.');
  }
  await sendPasswordResetEmail(getFirebaseAuth(), record.email);
  return {
    message: `Password reset email sent to ${record.email}`,
    credentials: { email: record.email, password: '(sent via email)' },
  };
}

export async function unlockUser(id: string): Promise<{ message: string }> {
  const db = getDb();
  await updateDoc(doc(db, 'users', id), { status: 'Active', updated_at: now() });
  return { message: 'Account unlocked' };
}

export async function userExists(id: string): Promise<boolean> {
  const snap = await getDoc(doc(getDb(), 'users', id));
  return snap.exists();
}
