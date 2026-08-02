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
import { REGISTRATION_TEAM_ROLE } from '../rbac/constants';
import type { UserRole } from '../rbac/types';

export const REGISTRATION_TEAM_ROLES: UserRole[] = [REGISTRATION_TEAM_ROLE];

export type PasswordStatus = 'temporary' | 'updated';

export interface RegistrationTeamMember {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  phone: string;
  department: string;
  employee_id: string;
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

export interface RegistrationTeamActivity {
  id: string;
  log_id: string;
  member_id: string;
  member_name: string;
  action: string;
  details: string;
  performed_by: string;
  performed_by_name: string;
  timestamp: string;
  created_at: string;
}

function isRegistrationTeamRecord(record: UserRecord): boolean {
  return record.role === REGISTRATION_TEAM_ROLE;
}

function mapMemberRecord(record: UserRecord): RegistrationTeamMember {
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
    department: record.department || '',
    employee_id: anyRecord.employee_id || '',
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
  member_id: string;
  member_name: string;
  action: string;
  details: string;
  performed_by: string;
  performed_by_name: string;
}): Promise<void> {
  const db = getDb();
  const logId = `rtlog-${String(await nextSequence('registration_team_logs'))}`;
  const timestamp = now();
  await setDoc(doc(db, 'registration_team_logs', logId), {
    log_id: logId,
    ...entry,
    timestamp,
    created_at: timestamp,
  });
}

export async function listRegistrationTeam(params?: { status?: string; search?: string }): Promise<{ members: RegistrationTeamMember[] }> {
  const db = getDb();
  const snap = await getDocs(collection(db, 'users'));
  let members = snap.docs
    .map((d) => ({ id: d.id, ...d.data() }) as UserRecord)
    .filter((r) => isRegistrationTeamRecord(r))
    .map(mapMemberRecord);

  if (params?.status && params.status !== 'All') {
    members = members.filter((m) => m.status === params.status);
  }
  if (params?.search) {
    const q = params.search.toLowerCase();
    members = members.filter(
      (m) =>
        m.full_name.toLowerCase().includes(q) ||
        m.email.toLowerCase().includes(q) ||
        String(m.phone || '').includes(q)
    );
  }
  members.sort((a, b) => String(b.created_at || '').localeCompare(String(a.created_at || '')));
  return { members };
}

export async function createRegistrationTeamMember(data: {
  full_name: string;
  email: string;
  phone: string;
  department: string;
  employee_id?: string;
  password?: string;
  status?: 'Active' | 'Inactive';
  created_by?: string;
  created_by_name?: string;
}): Promise<{
  message: string;
  member: RegistrationTeamMember;
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
  const user_id = `RTM-${String(await nextSequence('registration_team'))}`;
  const username = slugify(data.full_name);
  const record: UserRecord = {
    id: uid,
    user_id,
    full_name: data.full_name,
    email: data.email,
    phone: data.phone || '',
    department: data.department || '',
    designation: 'Registration Team',
    username,
    role: REGISTRATION_TEAM_ROLE,
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
  await setDoc(doc(db, 'users', uid), {
    ...record,
    employee_id: data.employee_id || '',
  });

  const member = mapMemberRecord({ ...record, employee_id: data.employee_id || '' } as any);

  await logActivity({
    member_id: uid,
    member_name: data.full_name,
    action: 'Member Created',
    details: `Registration Team member account created with email ${data.email}`,
    performed_by: data.created_by || '',
    performed_by_name: data.created_by_name || data.created_by || '',
  });

  return {
    message: 'Registration Team member created successfully',
    member,
    credentials: { email: data.email, password, username },
  };
}

export async function updateRegistrationTeamMember(
  id: string,
  data: Partial<{
    full_name: string;
    email: string;
    phone: string;
    department: string;
    employee_id: string;
    status: 'Active' | 'Inactive';
    updated_by?: string;
    updated_by_name?: string;
  }>
): Promise<{ member: RegistrationTeamMember }> {
  const db = getDb();
  const uid = String(id);
  const existing = await readUserRecord(uid);
  if (!existing) {
    throw new Error('Registration Team member not found.');
  }
  if (!isRegistrationTeamRecord(existing)) {
    throw new Error('This account is not a Registration Team member.');
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
  const member = mapMemberRecord(updated!);

  await logActivity({
    member_id: uid,
    member_name: member.full_name,
    action: 'Member Updated',
    details: `Profile details updated by admin`,
    performed_by: updatedBy || '',
    performed_by_name: updatedByName || updatedBy || '',
  });

  return { member };
}

export async function setRegistrationTeamStatus(
  id: string,
  status: 'Active' | 'Inactive',
  performer?: { id: string; name: string }
): Promise<{ member: RegistrationTeamMember }> {
  const db = getDb();
  const uid = String(id);
  const existing = await readUserRecord(uid);
  if (!existing) {
    throw new Error('Registration Team member not found.');
  }
  await updateDoc(doc(db, 'users', uid), { status, updated_at: now() });
  const updated = await readUserRecord(uid);
  const member = mapMemberRecord(updated!);

  await logActivity({
    member_id: uid,
    member_name: member.full_name,
    action: status === 'Active' ? 'Member Enabled' : 'Member Disabled',
    details: `Registration Team member account ${status === 'Active' ? 'enabled' : 'disabled'} by admin`,
    performed_by: performer?.id || '',
    performed_by_name: performer?.name || performer?.id || '',
  });

  return { member };
}

export async function deleteRegistrationTeamMember(
  id: string,
  performer?: { id: string; name: string }
): Promise<{ message: string }> {
  const db = getDb();
  const uid = String(id);
  const existing = await readUserRecord(uid);
  if (existing) {
    await logActivity({
      member_id: uid,
      member_name: existing.full_name,
      action: 'Member Deleted',
      details: `Registration Team member account permanently deleted`,
      performed_by: performer?.id || '',
      performed_by_name: performer?.name || performer?.id || '',
    });
  }
  await deleteDoc(doc(db, 'users', uid));
  return { message: 'Registration Team member deleted' };
}

export async function resetRegistrationTeamPassword(
  id: string,
  performer?: { id: string; name: string },
  newTemporaryPassword?: string
): Promise<{ message: string }> {
  const db = getDb();
  const uid = String(id);
  const existing = await readUserRecord(uid);
  if (!existing) {
    throw new Error('Registration Team member not found.');
  }
  if (newTemporaryPassword && newTemporaryPassword.length < 8) {
    throw new Error('Temporary password must be at least 8 characters long.');
  }

  // The temporary password entered by the Super Admin is never stored. The
  // member is flagged to create a new password on next sign-in and a secure
  // Firebase password reset email is sent so the new temporary password can be
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
    member_id: uid,
    member_name: existing.full_name,
    action: 'Password Reset',
    details: `Temporary password reset for ${existing.full_name}; reset email sent to ${existing.email}`,
    performed_by: performer?.id || '',
    performed_by_name: performer?.name || performer?.id || '',
  });
  return {
    message: `A password reset email has been sent to ${existing.email}. The member must set a new password on their next login.`,
  };
}

export async function listRegistrationTeamActivity(limitCount = 500): Promise<RegistrationTeamActivity[]> {
  const db = getDb();
  const snap = await getDocs(collection(db, 'registration_team_logs'));
  return snap.docs
    .map((d) => {
      const data = d.data();
      return {
        id: d.id,
        log_id: data.log_id || d.id,
        member_id: data.member_id || '',
        member_name: data.member_name || '',
        action: data.action || '',
        details: data.details || '',
        performed_by: data.performed_by || '',
        performed_by_name: data.performed_by_name || '',
        timestamp: data.timestamp || '',
        created_at: data.created_at || '',
      } as RegistrationTeamActivity;
    })
    .sort((a, b) => String(b.timestamp).localeCompare(String(a.timestamp)))
    .slice(0, limitCount);
}

export async function getRegistrationTeamMember(id: string): Promise<{ member: RegistrationTeamMember } | null> {
  const record = await readUserRecord(String(id));
  if (!record || !isRegistrationTeamRecord(record)) return null;
  return { member: mapMemberRecord(record) };
}

export async function getDocRef(id: string): Promise<{ exists: boolean }> {
  const snap = await getDoc(doc(getDb(), 'users', String(id)));
  return { exists: snap.exists() };
}
