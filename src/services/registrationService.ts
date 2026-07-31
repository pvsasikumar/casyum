import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  setDoc,
  updateDoc,
  deleteDoc,
  arrayRemove,
  arrayUnion,
  increment,
} from 'firebase/firestore';
import { getDb } from '../firebase/firestore';
import { nextSequence, now } from './helpers';
import type { RegistrationRow } from './eventService';
import { mapRegDoc } from './eventService';

export interface CreateRegistrationInput {
  event_id: string;
  participant_id: string;
  participant_email?: string;
  user_full_name?: string;
  user_department?: string;
  user_phone?: string;
  college?: string;
  department?: string;
  year_of_study?: string;
  gender?: string;
  register_number?: string;
  status?: string;
  payment_status?: string;
  payment_amount?: number;
  transaction_id?: string;
  payment_screenshot_url?: string;
  payment_uploaded_time?: string;
  payment_remarks?: string;
}

export async function listRegistrationsByEvent(eventId: string): Promise<RegistrationRow[]> {
  const db = getDb();
  const snap = await getDocs(
    query(collection(db, 'registrations'), where('event_id', '==', eventId))
  );
  return snap.docs
    .map((d) => mapRegDoc(d.id, d.data()))
    .sort((a, b) => b.registered_at.localeCompare(a.registered_at));
}

export async function listRegistrationsByParticipant(participantId: string): Promise<RegistrationRow[]> {
  const db = getDb();
  const snap = await getDocs(
    query(collection(db, 'registrations'), where('participant_id', '==', participantId))
  );
  return snap.docs
    .map((d) => mapRegDoc(d.id, d.data()))
    .sort((a, b) => b.registered_at.localeCompare(a.registered_at));
}

export async function createRegistration(input: CreateRegistrationInput): Promise<RegistrationRow> {
  const db = getDb();
  const eventId = input.event_id;

  const eventSnap = await getDoc(doc(db, 'events', eventId));
  if (!eventSnap.exists()) {
    throw new Error('Event not found.');
  }

  const regId = `reg-${String(await nextSequence('registrations'))}`;
  const row: RegistrationRow = {
    registration_id: regId,
    event_id: eventId,
    participant_id: input.participant_id,
    participant_user_id: input.participant_id,
    participant_email: input.participant_email || '',
    user_full_name: input.user_full_name || 'Participant',
    user_department: input.user_department || input.department || '',
    user_phone: input.user_phone || '',
    college: input.college || '',
    department: input.department || '',
    year_of_study: input.year_of_study || '',
    gender: input.gender || 'Other',
    register_number: input.register_number || '',
    status: input.status || 'Confirmed',
    registered_at: now(),
    payment_status: input.payment_status || 'Pending',
    payment_amount: Number(input.payment_amount) || 0,
    transaction_id: input.transaction_id || '',
    payment_screenshot_url: input.payment_screenshot_url || '',
    payment_uploaded_time: input.payment_uploaded_time || '',
    payment_remarks: input.payment_remarks || '',
  };
  await setDoc(doc(db, 'registrations', regId), row);

  await updateDoc(doc(db, 'events', eventId), {
    registered_count: increment(1),
    updated_at: now(),
  });
  await updateDoc(doc(db, 'participants', input.participant_id), {
    event_ids: arrayUnion(eventId),
  });

  await syncPaymentDoc(input.participant_id, row);

  return row;
}

async function syncPaymentDoc(participantId: string, reg: RegistrationRow): Promise<void> {
  const db = getDb();
  if (!reg.payment_amount && !reg.transaction_id && reg.payment_status !== 'Approved') return;
  const ref = doc(db, 'payments', reg.registration_id);
  await setDoc(
    ref,
    {
      payment_id: reg.registration_id,
      participant_id: participantId,
      participant_name: reg.user_full_name,
      event_id: reg.event_id,
      amount: reg.payment_amount,
      status: reg.payment_status,
      transaction_id: reg.transaction_id,
      screenshot_url: reg.payment_screenshot_url,
      remarks: reg.payment_remarks,
      updated_at: now(),
      created_at: now(),
    },
    { merge: true }
  );
}

export async function removeRegistration(registrationId: string): Promise<void> {
  const db = getDb();
  const ref = doc(db, 'registrations', registrationId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return;
  const data = snap.data();
  const eventId = String(data.event_id || '');
  const participantId = String(data.participant_id || '');

  await deleteDoc(ref);
  if (eventId) {
    await updateDoc(doc(db, 'events', eventId), {
      registered_count: increment(-1),
      updated_at: now(),
    });
  }
  if (participantId) {
    await updateDoc(doc(db, 'participants', participantId), {
      event_ids: arrayRemove(eventId),
    });
  }
}

export async function removeRegistrationsByParticipant(participantId: string): Promise<void> {
  const regs = await listRegistrationsByParticipant(participantId);
  await Promise.all(regs.map((r) => removeRegistration(r.registration_id)));
}
