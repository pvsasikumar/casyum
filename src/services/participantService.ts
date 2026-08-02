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
  getCurrentUser,
  ensureSignedIn,
  readParticipantRecord,
  type ParticipantRecord,
} from './authService';
import {
  listRegistrationsByParticipant,
  createRegistration,
  getRegistration,
  resubmitPayment as resubmitPaymentRow,
  removeRegistrationsByParticipant,
} from './registrationService';
import { uploadPaymentProof } from './paymentProofService';
import { mapEventDoc } from './eventService';
import { nextSequence, now } from './helpers';

function mapParticipantRow(
  record: ParticipantRecord,
  regs: any[],
  events: Record<string, any>
): any {
  return {
    participant_id: record.id,
    id: record.id,
    full_name: record.full_name,
    email: record.email || '',
    phone: record.phone || '',
    college: record.college || '',
    city: record.city || '',
    department: record.department || '',
    year_of_study: record.year_of_study || '',
    gender: record.gender || 'Other',
    register_number: record.register_number || '',
    student_id: record.student_id || '',
    photo: record.profile_picture || '',
    profile_picture: record.profile_picture || '',
    profile_completed: record.profile_completed ? 1 : 0,
    google_id: record.google_id || '',
    created_at: record.created_at || '',
    payment_status: record.payment_status || 'Pending',
    payment_screenshot_url: record.payment_screenshot_url || '',
    transaction_id: record.transaction_id || '',
    payment_amount: Number(record.payment_amount) || 0,
    payment_uploaded_time: record.payment_uploaded_time || '',
    payment_remarks: record.payment_remarks || '',
    event_ids: record.event_ids || [],
    verificationStatus: record.verificationStatus || 'Pending',
    verifiedBy: record.verifiedBy || '',
    verifiedByUserId: record.verifiedByUserId || '',
    verifiedAt: record.verifiedAt || '',
    verificationRemarks: record.verificationRemarks || '',
    registered_events: regs.map((r) => ({
      registration_id: r.registration_id,
      event_id: r.event_id,
      status: r.status,
      registered_at: r.registered_at,
      payment_status: r.payment_status,
      payment_amount: r.payment_amount,
      payment_method: r.payment_method || '',
      transaction_id: r.transaction_id || '',
      payment_screenshot_url: r.payment_screenshot_url || '',
      payment_uploaded_time: r.payment_uploaded_time || '',
      payment_proof_file_name: r.payment_proof_file_name || '',
      payment_proof_file_type: r.payment_proof_file_type || '',
      payment_rejection_reason: r.payment_rejection_reason || '',
      payment_resubmission_count: r.payment_resubmission_count || 0,
      registration_verification_status: r.registration_verification_status || 'locked',
      attendance_eligibility: r.attendance_eligibility === true,
      attendance_status: r.attendance_status || 'not_marked',
      event_name: events[r.event_id]?.name || '',
      event_date: events[r.event_id]?.event_date || '',
      event_time: events[r.event_id]?.time || '',
      venue: events[r.event_id]?.venue || '',
      fee: events[r.event_id]?.fee || 0,
    })),
  };
}

async function fetchEvents(regs: any[]): Promise<Record<string, any>> {
  const db = getDb();
  const ids = [...new Set(regs.map((r) => r.event_id).filter(Boolean))];
  const map: Record<string, any> = {};
  await Promise.all(
    ids.map(async (id) => {
      const snap = await getDoc(doc(db, 'events', id));
      if (snap.exists()) map[id] = { id: snap.id, ...snap.data() };
    })
  );
  return map;
}

async function loadParticipantRow(participantId: string): Promise<any> {
  const record = await readParticipantRecord(participantId);
  if (!record) return null;
  const regs = await listRegistrationsByParticipant(participantId);
  const events = await fetchEvents(regs);
  return mapParticipantRow(record, regs, events);
}

export async function me(): Promise<{ participant: any }> {
  const user = await ensureSignedIn();
  if (!user) {
    throw new Error('You must be signed in to view your profile.');
  }
  const row = await loadParticipantRow(user.uid);
  if (!row) {
    throw new Error('Participant profile not found.');
  }
  return { participant: row };
}

export async function completeProfile(data: {
  phone: string;
  college: string;
  city: string;
  department: string;
  year_of_study: string;
}): Promise<{ message: string; participant: any }> {
  const user = getCurrentUser();
  if (!user) {
    throw new Error('You must be signed in to complete your profile.');
  }
  const db = getDb();
  const participantId = user.uid;
  const patch: Record<string, any> = {
    phone: data.phone,
    college: data.college,
    city: data.city,
    department: data.department,
    year_of_study: data.year_of_study,
    profile_completed: true,
    updated_at: now(),
  };
  await updateDoc(doc(db, 'participants', participantId), patch);
  const row = await loadParticipantRow(participantId);
  return { message: 'Profile updated successfully', participant: row };
}

export async function myEvents(): Promise<{ events: any[] }> {
  const user = await ensureSignedIn();
  if (!user) {
    throw new Error('You must be signed in to view your registrations.');
  }
  const regs = await listRegistrationsByParticipant(user.uid);
  const events = await fetchEvents(regs);
  return {
    events: regs.map((r) => ({
      registration_id: r.registration_id,
      event_id: r.event_id,
      status: r.status,
      event_name: events[r.event_id]?.name || '',
      event_date: events[r.event_id]?.event_date || '',
      event_time: events[r.event_id]?.time || '',
      venue: events[r.event_id]?.venue || '',
      fee: events[r.event_id]?.fee || 0,
    })),
  };
}

export interface RegisterPaymentInput {
  payment_method: string;
  transaction_id: string;
  file: File;
  onProgress?: (percent: number) => void;
}

export async function registerEvent(
  eventId: string | number,
  payment?: RegisterPaymentInput
): Promise<{ message: string; event: any }> {
  const user = await ensureSignedIn();
  if (!user) {
    throw new Error('You must be signed in to register.');
  }
  const id = String(eventId);
  const record = await readParticipantRecord(user.uid);
  if (!record) {
    throw new Error('Participant profile not found. Please complete your profile first.');
  }
  if (!record.profile_completed) {
    throw new Error('Please complete your profile before registering for events.');
  }

  const db = getDb();
  const eventSnap = await getDoc(doc(db, 'events', id));
  if (!eventSnap.exists()) {
    throw new Error('Event not found.');
  }
  const event = mapEventDoc(eventSnap.id, eventSnap.data());
  if (event.status === 'Closed') {
    throw new Error('This event is no longer accepting registrations.');
  }
  if (Number(event.max_participants) > 0 && Number(event.registered_count) >= Number(event.max_participants)) {
    throw new Error('This event has reached its maximum capacity.');
  }
  if ((record.event_ids || []).includes(id)) {
    throw new Error('You have already registered for this event.');
  }

  if (!payment || !payment.file) {
    throw new Error('Payment proof is required to register for this event.');
  }

  const regId = `reg-${String(await nextSequence('registrations'))}`;

  const proof = await uploadPaymentProof(user.uid, id, regId, payment.file, {
    onProgress: payment.onProgress,
  });

  await createRegistration({
    event_id: id,
    participant_id: user.uid,
    participant_email: record.email,
    user_full_name: record.full_name,
    user_department: record.department,
    user_phone: record.phone,
    college: record.college,
    city: record.city,
    department: record.department,
    year_of_study: record.year_of_study,
    gender: record.gender,
    register_number: record.register_number,
    status: 'Confirmed',
    payment_amount: event.fee,
    registration_id: regId,
    payment_info: {
      payment_method: payment.payment_method,
      transaction_id: payment.transaction_id,
      payment_proof_url: proof.url,
      payment_proof_file_name: proof.name,
      payment_proof_file_type: proof.contentType,
      payment_proof_file_size: proof.size,
      payment_proof_uploaded_at: proof.uploadedAt,
    },
  });

  return {
    message: 'You have been registered for the event. Your payment will be reviewed by the CASYUM team.',
    event: { id, name: event.name },
  };
}

/**
 * Resubmit a rejected payment for one of the participant's registrations with
 * a new transaction ID and proof. The proof is uploaded to the same structured
 * storage path and the registration returns to the `submitted` state.
 */
export async function resubmitRegistrationPayment(
  registrationId: string,
  payment: RegisterPaymentInput
): Promise<{ message: string }> {
  const user = await ensureSignedIn();
  if (!user) {
    throw new Error('You must be signed in to resubmit a payment.');
  }
  const reg = await getRegistration(registrationId);
  if (!reg) {
    throw new Error('Registration not found.');
  }
  if (reg.participant_id !== user.uid) {
    throw new Error('You can only resubmit your own payment.');
  }
  if (!payment.file) {
    throw new Error('Please upload your new payment proof.');
  }

  const proof = await uploadPaymentProof(user.uid, reg.event_id, registrationId, payment.file, {
    onProgress: payment.onProgress,
  });

  const res = await resubmitPaymentRow(registrationId, {
    payment_method: payment.payment_method,
    transaction_id: payment.transaction_id,
    payment_proof_url: proof.url,
    payment_proof_file_name: proof.name,
    payment_proof_file_type: proof.contentType,
    payment_proof_file_size: proof.size,
    payment_proof_uploaded_at: proof.uploadedAt,
  });
  return res;
}

export async function register(data: {
  full_name: string;
  email: string;
  phone: string;
  college: string;
  city: string;
  department: string;
  year_of_study: string;
  register_number?: string;
  gender?: string;
  event_ids?: Array<number | string>;
}): Promise<{ message: string; participant: any; email: { queued: boolean; log_id: string } }> {
  if (!data.full_name || !data.email) {
    throw new Error('Name and email are required.');
  }
  const db = getDb();
  const participantId = `part-${String(await nextSequence('participants'))}`;
  const record: ParticipantRecord = {
    id: participantId,
    full_name: data.full_name,
    email: data.email,
    phone: data.phone,
    college: data.college,
    city: data.city,
    department: data.department,
    year_of_study: data.year_of_study,
    gender: data.gender || 'Other',
    register_number: data.register_number || '',
    student_id: '',
    profile_picture: '',
    profile_completed: true,
    created_at: now(),
    payment_status: 'Pending',
    payment_amount: 0,
    event_ids: [],
  };
  await setDoc(doc(db, 'participants', participantId), record);

  const eventIds = (data.event_ids || []).map(String);
  for (const eventId of eventIds) {
    await createRegistration({
      event_id: eventId,
      participant_id: participantId,
      participant_email: data.email,
      user_full_name: data.full_name,
      user_department: data.department,
      user_phone: data.phone,
      college: data.college,
      city: data.city,
      department: data.department,
      year_of_study: data.year_of_study,
      gender: data.gender,
      register_number: data.register_number,
      status: 'Confirmed',
    });
  }

  const row = await loadParticipantRow(participantId);
  return {
    message: 'Registration created successfully',
    participant: row,
    email: { queued: false, log_id: '' },
  };
}

export async function list(params?: { search?: string; status?: string }): Promise<{ participants: any[] }> {
  const db = getDb();
  const snap = await getDocs(collection(db, 'participants'));
  const records = snap.docs.map(
    (d) => ({ id: d.id, ...d.data() }) as ParticipantRecord
  );

  const regSnap = await getDocs(collection(db, 'registrations'));
  const regsByParticipant: Record<string, any[]> = {};
  regSnap.docs.forEach((d) => {
    const data = d.data();
    const pid = String(data.participant_id || '');
    if (!pid) return;
    if (!regsByParticipant[pid]) regsByParticipant[pid] = [];
    regsByParticipant[pid].push({ ...data, registration_id: d.id });
  });

  let rows = records.map((r) => {
    const regs = regsByParticipant[r.id] || [];
    return mapParticipantRow(r, regs, {});
  });

  if (params?.search) {
    const q = params.search.toLowerCase();
    rows = rows.filter(
      (p) =>
        p.full_name.toLowerCase().includes(q) ||
        p.email.toLowerCase().includes(q) ||
        String(p.phone || '').includes(q)
    );
  }
  if (params?.status && params.status !== 'All') {
    rows = rows.filter((p) => p.registration_status === params.status);
  }

  rows.sort((a, b) => String(b.created_at || '').localeCompare(String(a.created_at || '')));
  return { participants: rows };
}

export async function get(id: string | number): Promise<{ participant: any }> {
  const row = await loadParticipantRow(String(id));
  if (!row) {
    throw new Error('Participant not found.');
  }
  return { participant: row };
}

export async function update(
  id: string | number,
  data: Partial<{
    full_name: string;
    email: string;
    phone: string;
    college: string;
    city: string;
    department: string;
    year_of_study: string;
    register_number: string;
    gender: string;
    payment_status: string;
    payment_remarks: string;
    transaction_id: string;
    payment_amount: number;
    payment_screenshot_url: string;
    registration_status: string;
  }>
): Promise<{ message: string; participant: any }> {
  const db = getDb();
  const participantId = String(id);
  const patch: Record<string, any> = { ...data, updated_at: now() };
  Object.keys(patch).forEach((k) => {
    if (patch[k] === undefined) delete patch[k];
  });
  await updateDoc(doc(db, 'participants', participantId), patch);

  if (data.payment_status || data.payment_amount || data.transaction_id) {
    const participant = await readParticipantRecord(participantId);
    if (participant) {
      await setDoc(
        doc(db, 'payments', `p-${participantId}`),
        {
          payment_id: `p-${participantId}`,
          participant_id: participantId,
          participant_name: participant.full_name,
          amount: Number(data.payment_amount ?? participant.payment_amount) || 0,
          status: data.payment_status || participant.payment_status || 'Pending',
          transaction_id: data.transaction_id || participant.transaction_id || '',
          screenshot_url: data.payment_screenshot_url || participant.payment_screenshot_url || '',
          remarks: data.payment_remarks || participant.payment_remarks || '',
          updated_at: now(),
        },
        { merge: true }
      );
    }
  }

  const row = await loadParticipantRow(participantId);
  return { message: 'Participant updated', participant: row };
}

export async function remove(id: string | number): Promise<{ message: string }> {
  const db = getDb();
  const participantId = String(id);
  await removeRegistrationsByParticipant(participantId);
  await deleteDoc(doc(db, 'participants', participantId));
  return { message: 'Participant deleted' };
}
