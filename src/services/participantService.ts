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
  createBundleRegistration,
  getRegistration,
  resubmitPayment as resubmitPaymentRow,
  removeRegistrationsByParticipant,
} from './registrationService';
import { mapEventDoc } from './eventService';
import { nextSequence, now } from './helpers';
import { createParticipantWithCasyumId } from './casyumIdService';
import {
  isGamingEvent,
  calculateRegistrationFee,
  validateEventSelection,
  MAX_REGULAR_EVENTS,
  type SelectedEventRef,
  type SelectedGamingRef,
} from './eventSelection';

function registrationEventIds(reg: any): string[] {
  if (Array.isArray(reg.event_ids) && reg.event_ids.length > 0) {
    return reg.event_ids.map(String);
  }
  return [String(reg.event_id || '')].filter(Boolean);
}

function registrationEventNames(reg: any): string[] {
  const names: string[] = [];
  const sel = reg.selectedEvents;
  if (sel?.regular && Array.isArray(sel.regular)) {
    sel.regular.forEach((r: any) => {
      if (r?.eventName) names.push(String(r.eventName));
    });
  }
  if (sel?.gaming?.eventName) names.push(String(sel.gaming.eventName));
  if (names.length > 0) return names;
  return [String(reg.event_name || '')].filter(Boolean);
}

function mapParticipantRow(
  record: ParticipantRecord,
  regs: any[],
  events: Record<string, any>
): any {
  return {
    participant_id: record.id,
    id: record.id,
    casyum_id: record.casyum_id || '',
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
      event_ids: registrationEventIds(r),
      event_name: registrationEventNames(r).join(', ') || events[r.event_id]?.name || '',
      selectedEvents: r.selectedEvents || null,
      status: r.status,
      registration_status: r.registrationStatus || 'registered',
      submitted_at: r.submittedAt || r.registered_at || '',
      casyum_id: r.casyum_id || record.casyum_id || '',
      registered_at: r.registered_at,
      payment_status: r.payment_status,
      payment_amount: r.payment_amount,
      payment_method: r.payment_method || '',
      transaction_id: r.transaction_id || '',
      payment_date: r.payment_date || '',
      payment_rejection_reason: r.payment_rejection_reason || '',
      payment_resubmission_count: r.payment_resubmission_count || 0,
      registration_verification_status: r.registration_verification_status || 'locked',
      attendance_eligibility: r.attendance_eligibility === true,
      attendance_status: r.attendance_status || 'not_marked',
      event_date: events[r.event_id]?.event_date || '',
      event_time: events[r.event_id]?.time || '',
      venue: events[r.event_id]?.venue || '',
      fee: r.payment_amount || (events[r.event_id] ? calculateRegistrationFee([events[r.event_id]]).total : 0),
    })),
  };
}

async function fetchEvents(regs: any[]): Promise<Record<string, any>> {
  const db = getDb();
  const ids = [...new Set(regs.flatMap((r) => registrationEventIds(r)).filter(Boolean))];
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
      fee: events[r.event_id] ? calculateRegistrationFee([events[r.event_id]]).total : 0,
    })),
  };
}

export interface RegisterPaymentInput {
  payment_method: string;
  transaction_id: string;
  payment_date?: string;
  payment_screenshot_url?: string;
  payment_screenshot_file_id?: string;
}

export async function registerEvent(
  eventId: string | number,
  payment?: RegisterPaymentInput
): Promise<{ message: string; event: any; registrationId: string }> {
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
  const existingRegs = await listRegistrationsByParticipant(user.uid);
  if (existingRegs.length > 0) {
    throw new Error('You have already submitted your registration for CASYUM. Duplicate registrations are not allowed.');
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
  if (isGamingEvent(event)) {
    const regs = await listRegistrationsByParticipant(user.uid);
    const existingIds = [...new Set(regs.flatMap((r) => registrationEventIds(r)))].filter(
      (existingId) => existingId !== id
    );
    for (const existingId of existingIds) {
      const snap = await getDoc(doc(db, 'events', existingId));
      if (snap.exists() && isGamingEvent({ id: snap.id, ...snap.data() })) {
        throw new Error('You can participate in only one gaming event.');
      }
    }
  }

  if (!payment) {
    throw new Error('Payment details are required to register for this event.');
  }

  const singleFee = calculateRegistrationFee([event]);

  await createRegistration({
    event_id: id,
    participant_id: user.uid,
    uid: user.uid,
    casyum_id: record.casyum_id || '',
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
    payment_amount: singleFee.total,
    regular_fee: singleFee.regularFee,
    gaming_fee: singleFee.gamingFee,
    payment_info: {
      payment_method: payment.payment_method,
      transaction_id: payment.transaction_id,
      payment_date: payment.payment_date || '',
      payment_screenshot_url: payment.payment_screenshot_url || '',
      payment_screenshot_file_id: payment.payment_screenshot_file_id || '',
    },
  });

  return {
    message: 'You have been registered for the event. Your payment will be reviewed by the CASYUM team.',
    event: { id, name: event.name },
    registrationId: `reg-${user.uid}`,
  };
}

export interface RegisterEventBundleInput {
  regularEventIds: Array<string | number>;
  gamingEventId?: string | number | null;
}

export interface RegisterEventBundleResult {
  message: string;
  fee: number;
  regularFee: number;
  gamingFee: number;
  regular: SelectedEventRef[];
  gaming: SelectedGamingRef | null;
  registrationId: string;
}

/**
 * Registers a participant for a bundled selection (up to 2 regular events plus
 * one gaming event) with a single payment. The fee is recomputed server-side
 * from the event documents and never trusted from the caller.
 */
export async function registerEventBundle(
  data: RegisterEventBundleInput,
  payment: RegisterPaymentInput
): Promise<RegisterEventBundleResult> {
  const user = await ensureSignedIn();
  if (!user) {
    throw new Error('You must be signed in to register.');
  }
  const record = await readParticipantRecord(user.uid);
  if (!record) {
    throw new Error('Participant profile not found. Please complete your profile first.');
  }
  if (!record.profile_completed) {
    throw new Error('Please complete your profile before registering for events.');
  }
  const existingRegs = await listRegistrationsByParticipant(user.uid);
  if (existingRegs.length > 0) {
    throw new Error('You have already submitted your registration for CASYUM. Duplicate registrations are not allowed.');
  }

  const regularEventIds = (data.regularEventIds || []).map(String).filter(Boolean);
  const gamingEventId = data.gamingEventId == null || String(data.gamingEventId) === ''
    ? null
    : String(data.gamingEventId);

  if (regularEventIds.length === 0 && !gamingEventId) {
    throw new Error('Please select at least one event to register.');
  }
  if (regularEventIds.length > MAX_REGULAR_EVENTS) {
    throw new Error(`You can select a maximum of ${MAX_REGULAR_EVENTS} regular events.`);
  }
  if (gamingEventId && regularEventIds.includes(gamingEventId)) {
    throw new Error('You can participate in only one gaming event.');
  }
  if (gamingEventId && regularEventIds.length >= MAX_REGULAR_EVENTS) {
    throw new Error('Two regular events cannot be combined with a gaming event.');
  }

  const db = getDb();
  const eventDocs = new Map<string, any>();
  for (const eventId of [...regularEventIds, ...(gamingEventId ? [gamingEventId] : [])]) {
    const snap = await getDoc(doc(db, 'events', eventId));
    if (!snap.exists()) {
      throw new Error('One or more selected events could not be found.');
    }
    eventDocs.set(eventId, { id: eventId, ...snap.data() });
  }

  const regular: SelectedEventRef[] = [];
  for (const eventId of regularEventIds) {
    const ev = eventDocs.get(eventId);
    if (!ev) continue;
    if (isGamingEvent(ev)) {
      throw new Error('You can participate in only one gaming event.');
    }
    const event = mapEventDoc(eventId, ev);
    if (event.status === 'Closed') {
      throw new Error(`"${event.name}" is no longer accepting registrations.`);
    }
    if (Number(event.max_participants) > 0 && Number(event.registered_count) >= Number(event.max_participants)) {
      throw new Error(`"${event.name}" has reached its maximum capacity.`);
    }
    if ((record.event_ids || []).includes(eventId)) {
      throw new Error(`You have already registered for "${event.name}".`);
    }
    regular.push({ eventId, eventName: event.name });
  }

  let gaming: SelectedGamingRef | null = null;
  if (gamingEventId) {
    const ev = eventDocs.get(gamingEventId);
    if (!ev) {
      throw new Error('The selected gaming event could not be found.');
    }
    if (!isGamingEvent(ev)) {
      throw new Error('You can participate in only one gaming event.');
    }
    const event = mapEventDoc(gamingEventId, ev);
    if (event.status === 'Closed') {
      throw new Error(`"${event.name}" is no longer accepting registrations.`);
    }
    if (Number(event.max_participants) > 0 && Number(event.registered_count) >= Number(event.max_participants)) {
      throw new Error(`"${event.name}" has reached its maximum capacity.`);
    }
    if ((record.event_ids || []).includes(gamingEventId)) {
      throw new Error(`You have already registered for "${event.name}".`);
    }
    gaming = { eventId: gamingEventId, eventName: event.name };
  }

  const selectionError = validateEventSelection(regular, gaming);
  if (selectionError) {
    throw new Error(selectionError);
  }

  const fee = calculateRegistrationFee([...regular, ...(gaming ? [gaming] : [])]);

  const reg = await createBundleRegistration({
    regular,
    gaming,
    participant_id: user.uid,
    uid: user.uid,
    casyum_id: record.casyum_id || '',
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
    payment_info: {
      payment_method: payment.payment_method,
      transaction_id: payment.transaction_id,
      payment_date: payment.payment_date || '',
      payment_screenshot_url: payment.payment_screenshot_url || '',
      payment_screenshot_file_id: payment.payment_screenshot_file_id || '',
    },
  });

  return {
    message: 'You have been registered. Your payment will be reviewed by the CASYUM team.',
    fee: fee.total,
    regularFee: fee.regularFee,
    gamingFee: fee.gamingFee,
    regular,
    gaming,
    registrationId: reg.registration_id,
  };
}

/**
 * Resubmit a rejected payment for one of the participant's registrations with
 * a new transaction ID. The registration returns to the `submitted` state.
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

  const res = await resubmitPaymentRow(registrationId, {
    payment_method: payment.payment_method,
    transaction_id: payment.transaction_id,
    payment_date: payment.payment_date || '',
    payment_screenshot_url: payment.payment_screenshot_url || '',
    payment_screenshot_file_id: payment.payment_screenshot_file_id || '',
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
  // Create the participant document and mint its unique CASYUM id atomically.
  await createParticipantWithCasyumId(participantId, record);

  // A participant owns exactly one registration record, so all selected events
  // are folded into a single bundle registration (never one record per event).
  const eventIds = (data.event_ids || []).map(String);
  if (eventIds.length > 0) {
    const db = getDb();
    const eventDocs = new Map<string, any>();
    for (const eventId of eventIds) {
      const snap = await getDoc(doc(db, 'events', eventId));
      if (snap.exists()) eventDocs.set(eventId, { id: eventId, ...snap.data() });
    }

    const regular: SelectedEventRef[] = [];
    let gaming: SelectedGamingRef | null = null;
    for (const eventId of eventIds) {
      const ev = eventDocs.get(eventId);
      if (!ev) continue;
      const eventName = String(ev.name || eventId);
      if (isGamingEvent(ev)) {
        if (gaming) {
          throw new Error('A participant can select only one gaming event.');
        }
        gaming = { eventId, eventName };
      } else {
        if (regular.length >= MAX_REGULAR_EVENTS) {
          throw new Error(`A participant can select a maximum of ${MAX_REGULAR_EVENTS} regular events.`);
        }
        regular.push({ eventId, eventName });
      }
    }
    if (gaming && regular.length >= MAX_REGULAR_EVENTS) {
      throw new Error('Two regular events cannot be combined with a gaming event.');
    }

    if (regular.length > 0 || gaming) {
      await createBundleRegistration({
        regular,
        gaming,
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
      });
    }
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
  console.log('[CASYUM DEBUG] participants query succeeded:', snap.docs.length, 'documents');
  const records = snap.docs.map(
    (d) => ({ id: d.id, ...d.data() }) as ParticipantRecord
  );

  const regSnap = await getDocs(collection(db, 'registrations'));
  console.log('[CASYUM DEBUG] registrations query succeeded:', regSnap.docs.length, 'documents');
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
  console.log('[CASYUM DEBUG] final participants after merge/filter:', rows.length);
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
