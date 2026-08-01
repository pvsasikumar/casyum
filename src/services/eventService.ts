import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  setDoc,
  updateDoc,
  deleteDoc,
  where,
} from 'firebase/firestore';
import { getDb } from '../firebase/firestore';
import { nextSequence, now } from './helpers';

export interface EventRow {
  id: string;
  name: string;
  category: string;
  tagline: string;
  description: string;
  iconName: string;
  banner: string;
  venue: string;
  time: string;
  event_date: string;
  fee: number;
  max_participants: number;
  registered_count: number;
  faculty_coordinator: string;
  student_coordinator: string;
  status: string;
  revenue: number;
  rules: string[];
  created_at: string;
  updated_at: string;
}

export interface RegistrationRow {
  registration_id: string;
  event_id: string;
  participant_id: string;
  participant_user_id: string;
  participant_email: string;
  user_full_name: string;
  user_department: string;
  user_phone: string;
  college: string;
  department: string;
  year_of_study: string;
  gender: string;
  register_number: string;
  status: string;
  registered_at: string;
  payment_status: string;
  payment_amount: number;
  transaction_id: string;
  payment_screenshot_url: string;
  payment_uploaded_time: string;
  payment_remarks: string;
}

export function mapEventDoc(docId: string, data: Record<string, any>): EventRow {
  return {
    id: docId,
    name: data.name || '',
    category: data.category || 'Technical',
    tagline: data.tagline || '',
    description: data.description || '',
    iconName: data.iconName || 'Calendar',
    banner: data.banner || '',
    venue: data.venue || '',
    time: data.time || '',
    event_date: data.event_date || '',
    fee: Number(data.fee) || 0,
    max_participants: Number(data.max_participants) || 0,
    registered_count: Number(data.registered_count) || 0,
    faculty_coordinator: data.faculty_coordinator || '',
    student_coordinator: data.student_coordinator || '',
    status: data.status || 'Open',
    revenue: Number(data.revenue) || 0,
    rules: Array.isArray(data.rules) ? data.rules : [],
    created_at: data.created_at || '',
    updated_at: data.updated_at || '',
  };
}

function mapRegDoc(docId: string, data: Record<string, any>): RegistrationRow {
  return {
    registration_id: docId,
    event_id: data.event_id || '',
    participant_id: data.participant_id || '',
    participant_user_id: data.participant_id || data.participant_email || docId,
    participant_email: data.participant_email || '',
    user_full_name: data.user_full_name || data.participant_name || 'Participant',
    user_department: data.user_department || data.department || '',
    user_phone: data.user_phone || data.phone || '',
    college: data.college || '',
    department: data.department || '',
    year_of_study: data.year_of_study || '',
    gender: data.gender || 'Other',
    register_number: data.register_number || '',
    status: data.status || 'Confirmed',
    registered_at: data.registered_at || '',
    payment_status: data.payment_status || 'Pending',
    payment_amount: Number(data.payment_amount) || 0,
    transaction_id: data.transaction_id || '',
    payment_screenshot_url: data.payment_screenshot_url || '',
    payment_uploaded_time: data.payment_uploaded_time || '',
    payment_remarks: data.payment_remarks || '',
  };
}

export async function listEvents(params?: { search?: string; status?: string }): Promise<{ events: EventRow[] }> {
  const db = getDb();
  const snap = await getDocs(collection(db, 'events'));
  let events = snap.docs.map((d) => mapEventDoc(d.id, d.data()));

  if (params?.status) {
    events = events.filter((e) => e.status === params.status);
  }
  if (params?.search) {
    const q = params.search.toLowerCase();
    events = events.filter((e) => e.name.toLowerCase().includes(q));
  }
  events.sort((a, b) => a.event_date.localeCompare(b.event_date) || a.name.localeCompare(b.name));
  return { events };
}

export async function getEvent(id: string | number): Promise<{ event: any }> {
  const db = getDb();
  const eventId = String(id);
  const snap = await getDoc(doc(db, 'events', eventId));
  if (!snap.exists()) {
    throw new Error('Event not found.');
  }
  const event = mapEventDoc(snap.id, snap.data());

  const regSnap = await getDocs(
    query(collection(db, 'registrations'), where('event_id', '==', eventId))
  );
  const registrations = regSnap.docs
    .map((d) => mapRegDoc(d.id, d.data()))
    .sort((a, b) => b.registered_at.localeCompare(a.registered_at));

  return { event: { ...event, registrations } };
}

export async function createEvent(data: {
  name: string;
  category?: string;
  description?: string;
  venue?: string;
  event_date?: string;
  time?: string;
  fee?: number;
  max_participants?: number;
  status?: string;
  faculty_coordinator?: string;
  student_coordinator?: string;
  tagline?: string;
}): Promise<{ event: EventRow }> {
  if (!data.name) {
    throw new Error('Event name is required.');
  }
  const db = getDb();
  const id = String(await nextSequence('events'));
  const row: EventRow = {
    id,
    name: data.name,
    category: data.category || 'Technical',
    tagline: data.tagline || '',
    description: data.description || '',
    iconName: 'Calendar',
    banner: '',
    venue: data.venue || '',
    time: data.time || '',
    event_date: data.event_date || '',
    fee: Number(data.fee) || 0,
    max_participants: Number(data.max_participants) || 0,
    registered_count: 0,
    faculty_coordinator: data.faculty_coordinator || '',
    student_coordinator: data.student_coordinator || '',
    status: data.status || 'Open',
    revenue: 0,
    rules: [],
    created_at: now(),
    updated_at: now(),
  };
  await setDoc(doc(db, 'events', id), row);
  return { event: row };
}

export async function updateEvent(
  id: string | number,
  data: Partial<{
    name: string;
    category: string;
    description: string;
    shortDescription: string;
    tagline: string;
    venue: string;
    event_date: string;
    time: string;
    fee: number;
    max_participants: number;
    status: string;
    faculty_coordinator: string;
    student_coordinator: string;
    slug: string;
    cardImage: string;
    banner: string;
    registered_count: number;
  }>
): Promise<{ event: EventRow }> {
  const db = getDb();
  const eventId = String(id);
  const patch: Record<string, any> = { ...data, updated_at: now() };
  await updateDoc(doc(db, 'events', eventId), patch);
  const snap = await getDoc(doc(db, 'events', eventId));
  return { event: mapEventDoc(snap.id, snap.data() || {}) };
}

export async function deleteEvent(id: string | number): Promise<{ message: string }> {
  const db = getDb();
  const eventId = String(id);

  const regSnap = await getDocs(
    query(collection(db, 'registrations'), where('event_id', '==', eventId))
  );
  await Promise.all(regSnap.docs.map((d) => deleteDoc(d.ref)));

  await deleteDoc(doc(db, 'events', eventId));
  return { message: 'Event deleted' };
}

export { mapRegDoc };
