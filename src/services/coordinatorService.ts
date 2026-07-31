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

export const COORDINATOR_ROLES = [
  'Event Coordinator',
  'Coordinator',
  'Event Coordinator (Student)',
  'Event Coordinator (Faculty)',
];

function isCoordinatorRecord(record: UserRecord): boolean {
  return COORDINATOR_ROLES.includes(record.role);
}

async function fetchEventsByIds(ids: string[]): Promise<Record<string, any>> {
  const db = getDb();
  const map: Record<string, any> = {};
  await Promise.all(
    ids.map(async (id) => {
      const snap = await getDoc(doc(db, 'events', id));
      if (snap.exists()) map[id] = { id: snap.id, ...snap.data() };
    })
  );
  return map;
}

async function mapCoordinatorRecord(record: UserRecord): Promise<any> {
  const eventIds = record.assigned_event_ids || [];
  const events = await fetchEventsByIds(eventIds);
  return {
    id: record.id,
    coordinator_id: record.coordinator_id || record.user_id,
    full_name: record.full_name,
    email: record.email,
    phone: record.phone || '',
    department: record.department || '',
    designation: record.designation || '',
    coordinator_type: record.coordinator_type || record.role,
    username: record.username,
    role: record.role,
    status: record.status === 'Active' ? 'Active' : 'Inactive',
    notes: record.notes || '',
    created_at: record.created_at,
    updated_at: record.updated_at,
    assigned_events: eventIds.map((id) => {
      const ev = events[id];
      return {
        id: Number(id),
        event_id: id,
        name: ev?.name || 'Event',
        category: ev?.category || 'Technical',
        description: ev?.description || '',
        venue: ev?.venue || '',
        event_date: ev?.event_date || '',
        time: ev?.time || '',
        fee: Number(ev?.fee) || 0,
        max_participants: Number(ev?.max_participants) || 0,
        registered_count: Number(ev?.registered_count) || 0,
        status: ev?.status || 'Open',
      };
    }),
  };
}

export async function listCoordinators(params?: { status?: string; search?: string }): Promise<{ coordinators: any[] }> {
  const db = getDb();
  const snap = await getDocs(collection(db, 'users'));
  const records = snap.docs
    .map((d) => ({ id: d.id, ...d.data() }) as UserRecord)
    .filter((r) => isCoordinatorRecord(r));

  let rows = await Promise.all(records.map(mapCoordinatorRecord));

  if (params?.status && params.status !== 'All') {
    rows = rows.filter((c) => c.status === params.status);
  }
  if (params?.search) {
    const q = params.search.toLowerCase();
    rows = rows.filter(
      (c) =>
        c.full_name.toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q) ||
        String(c.phone || '').includes(q)
    );
  }
  rows.sort((a, b) => String(b.created_at || '').localeCompare(String(a.created_at || '')));
  return { coordinators: rows };
}

export async function getCoordinator(id: string | number): Promise<{ coordinator: any }> {
  const record = await readUserRecord(String(id));
  if (!record || !isCoordinatorRecord(record)) {
    throw new Error('Coordinator not found.');
  }
  return { coordinator: await mapCoordinatorRecord(record) };
}

export async function createCoordinator(data: {
  full_name: string;
  email: string;
  phone: string;
  department?: string;
  designation?: string;
  coordinator_type?: string;
  username?: string;
  password?: string;
  role?: string;
  status?: string;
  notes?: string;
  event_ids?: Array<string | number>;
}): Promise<{ message: string; coordinator: any; credentials: { email: string; password: string; username: string } }> {
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
  const user_id = `CRD-${String(await nextSequence('coordinators'))}`;
  const username = data.username || slugify(data.full_name);
  const role = data.role || data.coordinator_type || 'Coordinator';
  const assignedEventIds = (data.event_ids || []).map(String);

  const record: UserRecord = {
    id: uid,
    user_id,
    full_name: data.full_name,
    email: data.email,
    phone: data.phone || '',
    department: data.department || '',
    designation: data.designation || '',
    username,
    role,
    status: data.status || 'Active',
    is_first_login: true,
    coordinator_type: data.coordinator_type || role,
    notes: data.notes || '',
    password_changed_at: null,
    created_at: now(),
    updated_at: now(),
    last_login: null,
    created_by: '',
    coordinator_id: user_id,
    assigned_event_ids: assignedEventIds,
  };
  await setDoc(doc(db, 'users', uid), record);

  const coordinator = await mapCoordinatorRecord(record);
  return {
    message: 'Coordinator created successfully',
    coordinator,
    credentials: { email: data.email, password, username },
  };
}

export async function updateCoordinator(
  id: string | number,
  data: Partial<any>
): Promise<{ coordinator: any }> {
  const db = getDb();
  const uid = String(id);
  const existing = await readUserRecord(uid);
  if (!existing) {
    throw new Error('Coordinator not found.');
  }

  const patch: Record<string, any> = { ...data, updated_at: now() };
  if (patch.event_ids !== undefined) {
    patch.assigned_event_ids = (patch.event_ids || []).map(String);
    delete patch.event_ids;
  }
  Object.keys(patch).forEach((k) => {
    if (patch[k] === undefined) delete patch[k];
  });

  if (patch.password) {
    try {
      await sendPasswordResetEmail(getFirebaseAuth(), existing.email);
    } catch {
      // Email delivery failure should not block the profile update.
    }
    delete patch.password;
    patch.is_first_login = true;
    patch.password_changed_at = null;
  }

  await updateDoc(doc(db, 'users', uid), patch);
  const updated = await readUserRecord(uid);
  return { coordinator: await mapCoordinatorRecord(updated!) };
}

export async function deleteCoordinator(id: string | number): Promise<{ message: string }> {
  const db = getDb();
  await deleteDoc(doc(db, 'users', String(id)));
  return { message: 'Coordinator deleted' };
}

export async function assignEvents(
  id: string | number,
  event_ids: Array<string | number>,
  _method?: 'POST' | 'PUT'
): Promise<{ message: string; assigned_event_ids: string[] }> {
  const db = getDb();
  const assignedEventIds = (event_ids || []).map(String);
  await updateDoc(doc(db, 'users', String(id)), {
    assigned_event_ids: assignedEventIds,
    updated_at: now(),
  });
  return { message: 'Events assigned successfully', assigned_event_ids: assignedEventIds };
}

export async function getAssignedEvents(id: string | number): Promise<{ events: any[] }> {
  const record = await readUserRecord(String(id));
  if (!record) return { events: [] };
  const eventIds = record.assigned_event_ids || [];
  const events = await fetchEventsByIds(eventIds);
  return {
    events: eventIds.map((eventId) => {
      const ev = events[eventId];
      return {
        id: eventId,
        name: ev?.name || 'Event',
        category: ev?.category || 'Technical',
        tagline: ev?.tagline || '',
        description: ev?.description || '',
        iconName: ev?.iconName || '',
        bannerImage: '',
        venue: ev?.venue || '',
        time: ev?.time || '',
        event_date: ev?.event_date || '',
        fee: Number(ev?.fee) || 0,
        max_participants: Number(ev?.max_participants) || 0,
        registered_count: Number(ev?.registered_count) || 0,
        faculty_coordinator: ev?.faculty_coordinator || '',
        student_coordinator: ev?.student_coordinator || '',
        status: ev?.status || 'Open',
        revenue: 0,
        rules: [],
      };
    }),
  };
}
