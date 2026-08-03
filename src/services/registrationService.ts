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
  onSnapshot,
  serverTimestamp,
} from 'firebase/firestore';
import { getDb } from '../firebase/firestore';
import { nextSequence, now } from './helpers';
import type { RegistrationRow } from './eventService';
import { mapRegDoc } from './eventService';
import { normalizeTransactionId, validateTransactionId } from './paymentProofService';
import {
  isGamingEvent,
  calculateRegistrationFee,
  MAX_REGULAR_EVENTS,
  type SelectedEventsData,
  type SelectedEventRef,
  type SelectedGamingRef,
} from './eventSelection';

export interface PaymentInfoInput {
  payment_method: string;
  transaction_id: string;
  payment_date: string;
}

export interface CreateRegistrationInput {
  event_id: string;
  participant_id: string;
  participant_email?: string;
  user_full_name?: string;
  user_department?: string;
  user_phone?: string;
  college?: string;
  city?: string;
  department?: string;
  year_of_study?: string;
  gender?: string;
  register_number?: string;
  status?: string;
  payment_info?: PaymentInfoInput;
  payment_amount?: number;
  registration_id?: string;
  /** Bundled multi-event selection (regular + optional gaming). */
  selected_events?: SelectedEventsData;
  event_ids?: string[];
  regular_fee?: number;
  gaming_fee?: number;
}

/**
 * A full per-registration record (the canonical document stored in the
 * `eventRegistrations` collection). Covers payment submission, Faculty
 * Manager review, Registration Desk verification and attendance eligibility.
 */
export interface PaymentRegistrationRow extends RegistrationRow {
  paymentRequired: boolean;
  registrationFee: number;
  paymentMethod: string;
  transactionId: string;
  paymentDate: string;
  paymentStatus: string;
  paymentVerifiedBy: string;
  paymentVerifiedByName: string;
  paymentVerifiedAt: string;
  paymentRejectedBy: string;
  paymentRejectedByName: string;
  paymentRejectedAt: string;
  paymentRejectionReason: string;
  paymentResubmittedAt: string;
  paymentResubmissionCount: number;
  registrationVerificationStatus: string;
  registrationVerifiedBy: string;
  registrationVerifiedByName: string;
  registrationVerifiedAt: string;
  attendanceEligibility: boolean;
  attendanceStatus: string;
  event_name?: string;
  event_date?: string;
  event_time?: string;
  event_venue?: string;
  /** All event ids included in this registration (bundles include every event). */
  event_ids?: string[];
  /** Bundled multi-event selection stored as the canonical shape. */
  selectedEvents?: SelectedEventsData;
  regularFee: number;
  gamingFee: number;
}

function mapPaymentRegDoc(docId: string, data: Record<string, any>): PaymentRegistrationRow {
  const legacy = mapRegDoc(docId, data);
  return {
    ...legacy,
    paymentRequired: data.paymentRequired === true || data.payment_required === true,
    registrationFee: Number(data.registrationFee ?? data.payment_amount) || 0,
    regularFee: Number(data.regularFee ?? data.regular_fee) || 0,
    gamingFee: Number(data.gamingFee ?? data.gaming_fee) || 0,
    event_ids: Array.isArray(data.event_ids)
      ? data.event_ids.map(String)
      : [String(data.event_id || '')].filter(Boolean),
    selectedEvents: data.selectedEvents || data.selected_events || null,
    paymentMethod: data.paymentMethod || data.payment_method || '',
    transactionId: data.transactionId || data.transaction_id || '',
    paymentDate: data.paymentDate || data.payment_date || '',
    paymentStatus: data.paymentStatus || data.payment_status || 'submitted',
    paymentVerifiedBy: data.paymentVerifiedBy || data.payment_verified_by || '',
    paymentVerifiedByName: data.paymentVerifiedByName || data.payment_verified_by_name || data.paymentVerifiedBy || '',
    paymentVerifiedAt: data.paymentVerifiedAt || data.payment_verified_at || '',
    paymentRejectedBy: data.paymentRejectedBy || data.payment_rejected_by || '',
    paymentRejectedByName: data.paymentRejectedByName || data.payment_rejected_by_name || data.paymentRejectedBy || '',
    paymentRejectedAt: data.paymentRejectedAt || data.payment_rejected_at || '',
    paymentRejectionReason: data.paymentRejectionReason || data.payment_rejection_reason || '',
    paymentResubmittedAt: data.paymentResubmittedAt || data.payment_resubmitted_at || '',
    paymentResubmissionCount: Number(data.paymentResubmissionCount ?? data.payment_resubmission_count) || 0,
    registrationVerificationStatus:
      data.registrationVerificationStatus || data.registration_verification_status || 'locked',
    registrationVerifiedBy: data.registrationVerifiedBy || data.registration_verified_by || '',
    registrationVerifiedByName:
      data.registrationVerifiedByName || data.registration_verified_by_name || data.registrationVerifiedBy || '',
    registrationVerifiedAt: data.registrationVerifiedAt || data.registration_verified_at || '',
    attendanceEligibility: data.attendanceEligibility === true || data.attendance_eligibility === true,
    attendanceStatus: data.attendanceStatus || data.attendance_status || 'not_marked',
    event_name: data.event_name || '',
    event_date: data.event_date || '',
    event_time: data.event_time || '',
    event_venue: data.event_venue || '',
  };
}

/** Build the full canonical + legacy payload for a registration document. */
function buildRegistrationPayload(
  regId: string,
  input: CreateRegistrationInput,
  eventName?: string
): { canonical: Record<string, any>; legacy: Record<string, any> } {
  const payment = input.payment_info;
  const timestamp = now();
  const selectedEvents = input.selected_events || null;
  const eventIds = (input.event_ids || [String(input.event_id)])
    .map(String)
    .filter((id) => id !== '');
  const canonical: Record<string, any> = {
    registrationId: regId,
    registration_id: regId,
    event_id: input.event_id,
    event_name: eventName || '',
    event_ids: eventIds,
    selectedEvents,
    participant_id: input.participant_id,
    participant_user_id: input.participant_id,
    participant_email: input.participant_email || '',
    user_full_name: input.user_full_name || 'Participant',
    user_department: input.user_department || input.department || '',
    user_phone: input.user_phone || '',
    college: input.college || '',
    city: input.city || '',
    department: input.department || '',
    year_of_study: input.year_of_study || '',
    gender: input.gender || 'Other',
    register_number: input.register_number || '',
    status: input.status || 'Confirmed',
    registered_at: timestamp,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),

    registrationFee: Number(input.payment_amount) || 0,
    regularFee: Number(input.regular_fee) || 0,
    gamingFee: Number(input.gaming_fee) || 0,
    paymentRequired: true,
    paymentMethod: payment?.payment_method || '',
    transactionId: payment?.transaction_id || '',
    transactionIdNormalized: normalizeTransactionId(payment?.transaction_id || ''),
    paymentDate: payment?.payment_date || '',

    paymentStatus: 'submitted',
    paymentVerifiedBy: '',
    paymentVerifiedByName: '',
    paymentVerifiedAt: '',
    paymentRejectedBy: '',
    paymentRejectedByName: '',
    paymentRejectedAt: '',
    paymentRejectionReason: '',
    paymentResubmittedAt: '',
    paymentResubmissionCount: 0,

    registrationVerificationStatus: 'locked',
    registrationVerifiedBy: '',
    registrationVerifiedByName: '',
    registrationVerifiedAt: '',
    attendanceEligibility: false,
    attendanceStatus: 'not_marked',
  };

  const legacy: Record<string, any> = {
    registration_id: regId,
    event_id: input.event_id,
    event_ids: eventIds,
    selectedEvents,
    participant_id: input.participant_id,
    participant_user_id: input.participant_id,
    participant_email: input.participant_email || '',
    user_full_name: input.user_full_name || 'Participant',
    user_department: input.user_department || input.department || '',
    user_phone: input.user_phone || '',
    college: input.college || '',
    city: input.city || '',
    department: input.department || '',
    year_of_study: input.year_of_study || '',
    gender: input.gender || 'Other',
    register_number: input.register_number || '',
    status: input.status || 'Confirmed',
    registered_at: timestamp,
    created_at: timestamp,
    payment_status: 'submitted',
    payment_amount: Number(input.payment_amount) || 0,
    regular_fee: Number(input.regular_fee) || 0,
    gaming_fee: Number(input.gaming_fee) || 0,
    transaction_id: payment?.transaction_id || '',
    transactionIdNormalized: normalizeTransactionId(payment?.transaction_id || ''),
    payment_date: payment?.payment_date || '',
    payment_remarks: '',
    // Mirror the canonical payment/verification fields so legacy readers
    // (coordinator attendance, registration team) work without changes.
    paymentRequired: true,
    payment_method: payment?.payment_method || '',
    registrationVerificationStatus: 'locked',
    attendanceEligibility: false,
    attendanceStatus: 'not_marked',
  };

  return { canonical, legacy };
}

export async function listRegistrationsByEvent(eventId: string): Promise<RegistrationRow[]> {
  const db = getDb();
  const [exactSnap, bundledSnap] = await Promise.all([
    getDocs(query(collection(db, 'registrations'), where('event_id', '==', eventId))),
    getDocs(query(collection(db, 'registrations'), where('event_ids', 'array-contains', eventId))),
  ]);
  const seen = new Set<string>();
  const rows: RegistrationRow[] = [];
  for (const doc of [...exactSnap.docs, ...bundledSnap.docs]) {
    if (seen.has(doc.id)) continue;
    seen.add(doc.id);
    rows.push(mapRegDoc(doc.id, doc.data()));
  }
  return rows.sort((a, b) => b.registered_at.localeCompare(a.registered_at));
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

/**
 * Check whether a transaction ID has already been submitted for another
 * registration. Optionally ignores the current registration (for resubmits).
 */
export async function checkDuplicateTransaction(
  transactionId: string,
  excludeRegistrationId?: string
): Promise<boolean> {
  const normalized = normalizeTransactionId(transactionId);
  if (!normalized) return false;
  const db = getDb();
  const snap = await getDocs(
    query(
      collection(db, 'eventRegistrations'),
      where('transactionIdNormalized', '==', normalized)
    )
  );
  return snap.docs.some(
    (d) => d.id !== excludeRegistrationId && String(d.data().paymentStatus || '') !== 'rejected'
  );
}

export async function getRegistration(registrationId: string): Promise<PaymentRegistrationRow | null> {
  const db = getDb();
  const snap = await getDoc(doc(db, 'eventRegistrations', registrationId));
  if (!snap.exists()) return null;
  return mapPaymentRegDoc(snap.id, snap.data());
}

export async function createRegistration(input: CreateRegistrationInput): Promise<RegistrationRow> {
  const db = getDb();
  const eventId = input.event_id;

  const eventSnap = await getDoc(doc(db, 'events', eventId));
  if (!eventSnap.exists()) {
    throw new Error('Event not found.');
  }
  const eventData = eventSnap.data();

  const regId = input.registration_id || `reg-${String(await nextSequence('registrations'))}`;

  if (input.payment_info) {
    const txnError = validateTransactionId(input.payment_info.transaction_id);
    if (txnError) throw new Error(txnError);
    const duplicate = await checkDuplicateTransaction(input.payment_info.transaction_id, regId);
    if (duplicate) {
      throw new Error(
        'This Transaction ID has already been submitted. Please verify the payment details.'
      );
    }
  }

  const { canonical, legacy } = buildRegistrationPayload(regId, input, eventData.name || '');

  await setDoc(doc(db, 'eventRegistrations', regId), canonical);
  await setDoc(doc(db, 'registrations', regId), legacy);

  await updateDoc(doc(db, 'events', eventId), {
    registered_count: increment(1),
    updated_at: now(),
  });
  await updateDoc(doc(db, 'participants', input.participant_id), {
    event_ids: arrayUnion(eventId),
    updated_at: now(),
  });

  return mapRegDoc(regId, canonical);
}

export interface CreateBundleRegistrationInput {
  regular: SelectedEventRef[];
  gaming: SelectedGamingRef | null;
  participant_id: string;
  participant_email?: string;
  user_full_name?: string;
  user_department?: string;
  user_phone?: string;
  college?: string;
  city?: string;
  department?: string;
  year_of_study?: string;
  gender?: string;
  register_number?: string;
  payment_info?: PaymentInfoInput;
  registration_id?: string;
}

/**
 * Server-side creation of a bundled registration (up to 3 regular events plus
 * one gaming event). The fee is always recomputed from the selection here and
 * never trusted from the client. Rejects invalid selections including both
 * gaming events being submitted together.
 */
export async function createBundleRegistration(
  input: CreateBundleRegistrationInput
): Promise<RegistrationRow> {
  const regular = (input.regular || []).slice(0, MAX_REGULAR_EVENTS);
  const gaming = input.gaming || null;

  if (regular.length === 0 && !gaming) {
    throw new Error('Please select at least one event to register.');
  }
  if (regular.length > MAX_REGULAR_EVENTS) {
    throw new Error(`You can select a maximum of ${MAX_REGULAR_EVENTS} regular events.`);
  }
  if (gaming && !isGamingEvent(gaming)) {
    throw new Error('Only one gaming event can be selected. Please choose either Free Fire or BGMI.');
  }

  const fee = calculateRegistrationFee([...regular, ...(gaming ? [gaming] : [])]);

  const db = getDb();
  const regId = input.registration_id || `reg-${String(await nextSequence('registrations'))}`;

  if (input.payment_info) {
    const txnError = validateTransactionId(input.payment_info.transaction_id);
    if (txnError) throw new Error(txnError);
    const duplicate = await checkDuplicateTransaction(input.payment_info.transaction_id, regId);
    if (duplicate) {
      throw new Error(
        'This Transaction ID has already been submitted. Please verify the payment details.'
      );
    }
  }

  const selectedEvents: SelectedEventsData = {
    regular: regular.map((r) => ({ eventId: String(r.eventId), eventName: String(r.eventName) })),
    gaming: gaming ? { eventId: String(gaming.eventId), eventName: String(gaming.eventName) } : null,
  };
  const eventIds = [
    ...selectedEvents.regular.map((r) => r.eventId),
    ...(selectedEvents.gaming ? [selectedEvents.gaming.eventId] : []),
  ];
  const primaryEventId = eventIds[0];
  const displayName = [
    ...selectedEvents.regular.map((r) => r.eventName),
    ...(selectedEvents.gaming ? [selectedEvents.gaming.eventName] : []),
  ].join(', ');

  const payload = buildRegistrationPayload(
    regId,
    {
      event_id: primaryEventId,
      participant_id: input.participant_id,
      participant_email: input.participant_email,
      user_full_name: input.user_full_name,
      user_department: input.user_department,
      user_phone: input.user_phone,
      college: input.college,
      city: input.city,
      department: input.department,
      year_of_study: input.year_of_study,
      gender: input.gender,
      register_number: input.register_number,
      status: 'Confirmed',
      payment_amount: fee.total,
      regular_fee: fee.regularFee,
      gaming_fee: fee.gamingFee,
      payment_info: input.payment_info,
      registration_id: regId,
      selected_events: selectedEvents,
      event_ids: eventIds,
    },
    displayName
  );

  await setDoc(doc(db, 'eventRegistrations', regId), payload.canonical);
  await setDoc(doc(db, 'registrations', regId), payload.legacy);

  await Promise.all(
    eventIds.map((eventId) =>
      updateDoc(doc(db, 'events', eventId), {
        registered_count: increment(1),
        updated_at: now(),
      })
    )
  );
  await updateDoc(doc(db, 'participants', input.participant_id), {
    event_ids: arrayUnion(...eventIds),
    updated_at: now(),
  });

  return mapRegDoc(regId, payload.canonical);
}

/** Throws an error that keeps a payment review list read-only for non-reviewers. */
export async function listPaymentRegistrations(): Promise<PaymentRegistrationRow[]> {
  const db = getDb();
  const snap = await getDocs(collection(db, 'eventRegistrations'));
  return snap.docs
    .map((d) => mapPaymentRegDoc(d.id, d.data()))
    .sort((a, b) => b.registered_at.localeCompare(a.registered_at));
}

export function subscribePaymentRegistrations(
  onNext: (rows: PaymentRegistrationRow[]) => void,
  onError?: (error: Error) => void
): () => void {
  const db = getDb();
  return onSnapshot(
    collection(db, 'eventRegistrations'),
    (snapshot) => {
      const rows = snapshot.docs.map((d) => mapPaymentRegDoc(d.id, d.data()));
      rows.sort((a, b) => b.registered_at.localeCompare(a.registered_at));
      onNext(rows);
    },
    onError
  );
}

export interface PaymentVerifier {
  userId: string;
  name: string;
}

function paymentPatchForStatus(
  status: 'verified' | 'rejected',
  verifier: PaymentVerifier,
  reason: string
): Record<string, any> {
  const timestamp = now();
  const patch: Record<string, any> = {
    paymentStatus: status,
    updatedAt: serverTimestamp(),
  };
  if (status === 'verified') {
    patch.paymentVerifiedBy = verifier.userId;
    patch.paymentVerifiedByName = verifier.name;
    patch.paymentVerifiedAt = timestamp;
    patch.paymentRejectedBy = '';
    patch.paymentRejectedByName = '';
    patch.paymentRejectedAt = '';
    patch.paymentRejectionReason = '';
  } else {
    patch.paymentRejectedBy = verifier.userId;
    patch.paymentRejectedByName = verifier.name;
    patch.paymentRejectedAt = timestamp;
    patch.paymentRejectionReason = reason;
    patch.paymentVerifiedBy = '';
    patch.paymentVerifiedByName = '';
    patch.paymentVerifiedAt = '';
  }
  return patch;
}

function legacyPatchForStatus(
  status: 'verified' | 'rejected',
  verifier: PaymentVerifier,
  reason: string
): Record<string, any> {
  const timestamp = now();
  const patch: Record<string, any> = {
    payment_status: status,
    updated_at: now(),
  };
  if (status === 'verified') {
    patch.payment_verified_by = verifier.userId;
    patch.payment_verified_by_name = verifier.name;
    patch.payment_verified_at = timestamp;
    patch.payment_rejected_by = '';
    patch.payment_rejected_by_name = '';
    patch.payment_rejected_at = '';
    patch.payment_rejection_reason = '';
    patch.payment_remarks = '';
  } else {
    patch.payment_rejected_by = verifier.userId;
    patch.payment_rejected_by_name = verifier.name;
    patch.payment_rejected_at = timestamp;
    patch.payment_rejection_reason = reason;
    patch.payment_remarks = reason;
    patch.payment_verified_by = '';
    patch.payment_verified_by_name = '';
    patch.payment_verified_at = '';
  }
  return patch;
}

export async function verifyPayment(
  registrationId: string,
  verifier: PaymentVerifier
): Promise<{ message: string }> {
  const db = getDb();
  const reg = await getRegistration(registrationId);
  if (!reg) {
    throw new Error('Registration not found.');
  }
  if (reg.paymentStatus === 'verified') {
    return { message: 'Payment is already verified.' };
  }
  await updateDoc(
    doc(db, 'eventRegistrations', registrationId),
    paymentPatchForStatus('verified', verifier, '')
  );
  await updateDoc(
    doc(db, 'registrations', registrationId),
    legacyPatchForStatus('verified', verifier, '')
  );
  return { message: 'Payment verified successfully.' };
}

export async function rejectPayment(
  registrationId: string,
  verifier: PaymentVerifier,
  reason: string
): Promise<{ message: string }> {
  const db = getDb();
  const trimmed = String(reason || '').trim();
  if (!trimmed) {
    throw new Error('A rejection reason is required.');
  }
  const reg = await getRegistration(registrationId);
  if (!reg) {
    throw new Error('Registration not found.');
  }
  await updateDoc(
    doc(db, 'eventRegistrations', registrationId),
    paymentPatchForStatus('rejected', verifier, trimmed)
  );
  await updateDoc(
    doc(db, 'registrations', registrationId),
    legacyPatchForStatus('rejected', verifier, trimmed)
  );
  return { message: 'Payment rejected.' };
}

/**
 * Record a resubmitted payment after a rejection. Payment details and proof
 * are replaced, status resets to `submitted`, and the resubmission counters
 * are bumped for audit history.
 */
export async function resubmitPayment(
  registrationId: string,
  payment: PaymentInfoInput,
  verifier?: PaymentVerifier
): Promise<{ message: string }> {
  const db = getDb();
  const reg = await getRegistration(registrationId);
  if (!reg) {
    throw new Error('Registration not found.');
  }
  const txnError = validateTransactionId(payment.transaction_id);
  if (txnError) throw new Error(txnError);
  const duplicate = await checkDuplicateTransaction(payment.transaction_id, registrationId);
  if (duplicate) {
    throw new Error(
      'This Transaction ID has already been submitted. Please verify the payment details.'
    );
  }
  const timestamp = now();
  const resubmissionCount = Number(reg.paymentResubmissionCount) + 1;

  const canonicalPatch: Record<string, any> = {
    paymentMethod: payment.payment_method,
    transactionId: payment.transaction_id,
    transactionIdNormalized: normalizeTransactionId(payment.transaction_id),
    paymentDate: payment.payment_date,
    paymentStatus: 'submitted',
    paymentResubmittedAt: timestamp,
    paymentResubmissionCount: resubmissionCount,
    paymentVerifiedBy: '',
    paymentVerifiedByName: '',
    paymentVerifiedAt: '',
    paymentRejectedBy: '',
    paymentRejectedByName: '',
    paymentRejectedAt: '',
    paymentRejectionReason: '',
    updatedAt: serverTimestamp(),
  };

  const legacyPatch: Record<string, any> = {
    payment_status: 'submitted',
    transaction_id: payment.transaction_id,
    transactionIdNormalized: normalizeTransactionId(payment.transaction_id),
    payment_date: payment.payment_date,
    payment_method: payment.payment_method,
    payment_remarks: '',
    payment_resubmitted_at: timestamp,
    payment_resubmission_count: resubmissionCount,
    payment_rejected_by: '',
    payment_rejected_by_name: '',
    payment_rejected_at: '',
    payment_rejection_reason: '',
    updated_at: now(),
  };

  if (verifier) {
    canonicalPatch.paymentRejectedBy = verifier.userId;
    canonicalPatch.paymentRejectedByName = verifier.name;
    legacyPatch.payment_rejected_by = verifier.userId;
    legacyPatch.payment_rejected_by_name = verifier.name;
  }

  await updateDoc(doc(db, 'eventRegistrations', registrationId), canonicalPatch);
  await updateDoc(doc(db, 'registrations', registrationId), legacyPatch);
  return { message: 'Payment resubmitted. It will be reviewed again.' };
}

/**
 * Called by the Registration Desk when a participant is verified/rejected so
 * the per-registration verification state and attendance eligibility stay in
 * sync with the participant-level verification record.
 */
export async function syncRegistrationDeskVerification(
  participantId: string,
  status: 'verified' | 'rejected' | 'locked',
  verifier?: PaymentVerifier
): Promise<void> {
  const db = getDb();
  const regs = await listRegistrationsByParticipant(participantId);
  if (regs.length === 0) return;

  const timestamp = now();
  const canonicalPatch: Record<string, any> = {
    registrationVerificationStatus: status,
    attendanceEligibility: status === 'verified',
    updatedAt: serverTimestamp(),
  };
  const legacyPatch: Record<string, any> = {
    registrationVerificationStatus: status,
    attendanceEligibility: status === 'verified',
    updated_at: now(),
  };

  if (status === 'verified' && verifier) {
    canonicalPatch.registrationVerifiedBy = verifier.userId;
    canonicalPatch.registrationVerifiedByName = verifier.name;
    canonicalPatch.registrationVerifiedAt = timestamp;
    legacyPatch.registration_verified_by = verifier.userId;
    legacyPatch.registration_verified_by_name = verifier.name;
    legacyPatch.registration_verified_at = timestamp;
  } else if (status !== 'verified') {
    canonicalPatch.registrationVerifiedBy = '';
    canonicalPatch.registrationVerifiedByName = '';
    canonicalPatch.registrationVerifiedAt = '';
    legacyPatch.registration_verified_by = '';
    legacyPatch.registration_verified_by_name = '';
    legacyPatch.registration_verified_at = '';
  }

  await Promise.all(
    regs.map((r) =>
      Promise.all([
        updateDoc(doc(db, 'eventRegistrations', r.registration_id), canonicalPatch),
        updateDoc(doc(db, 'registrations', r.registration_id), legacyPatch),
      ])
    )
  );
}

export async function removeRegistration(registrationId: string): Promise<void> {
  const db = getDb();
  const ref = doc(db, 'registrations', registrationId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return;
  const data = snap.data();
  const participantId = String(data.participant_id || '');
  const eventIds = Array.isArray(data.event_ids)
    ? data.event_ids.map(String).filter(Boolean)
    : [String(data.event_id || '')].filter(Boolean);

  await deleteDoc(doc(db, 'eventRegistrations', registrationId));
  await deleteDoc(ref);
  await Promise.all(
    eventIds.map((eventId) =>
      updateDoc(doc(db, 'events', eventId), {
        registered_count: increment(-1),
        updated_at: now(),
      })
    )
  );
  if (participantId) {
    await updateDoc(doc(db, 'participants', participantId), {
      event_ids: arrayRemove(...eventIds),
    });
  }
}

export async function removeRegistrationsByParticipant(participantId: string): Promise<void> {
  const regs = await listRegistrationsByParticipant(participantId);
  await Promise.all(regs.map((r) => removeRegistration(r.registration_id)));
}
