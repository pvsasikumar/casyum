import { decodeQRPayload } from '../lib/qr';
import {
  getScannedParticipant,
  searchEventParticipant,
  type ScannedParticipant,
  type RegisteredEventDetail,
} from './participantLookupService';

/**
 * Server-side (Firestore) verification layer shared by the Registration Desk
 * and Event Coordinator check-in flows.
 *
 * The QR code only ever carries a registration token. Every lookup below
 * resolves that token against Firestore, re-checks the workflow rules on the
 * server (payment verified, registration desk verified, event membership) and
 * returns a structured outcome with a user-facing message — the scanned data
 * itself is never trusted.
 */

export type DeskScanOutcome =
  | { status: 'invalid'; profile: null; message: string }
  | { status: 'not_found'; profile: null; message: string }
  | { status: 'payment_pending'; profile: ScannedParticipant; message: string }
  | { status: 'pending'; profile: ScannedParticipant; message: string }
  | { status: 'already_verified'; profile: ScannedParticipant; message: string }
  | { status: 'already_rejected'; profile: ScannedParticipant; message: string };

/**
 * Registration Desk scan flow. Enforces, in order:
 *   1. the QR is a valid CASYUM code;
 *   2. the participant exists;
 *   3. the payment is already verified — desk verification is not allowed
 *      otherwise;
 *   4. the participant is not already verified/rejected at the desk.
 */
export async function scanForDeskVerification(raw: string): Promise<DeskScanOutcome> {
  console.info('[CASYUM:SCAN] raw decoded QR value', { raw });
  const id = decodeQRPayload(raw);
  console.info('[CASYUM:SCAN] normalized registration id', { id });
  if (!id) {
    console.warn('[CASYUM:SCAN] invalid QR payload', { raw });
    return {
      status: 'invalid',
      profile: null,
      message: 'This QR code is not a valid CASYUM participant code.',
    };
  }

  const profile = await getScannedParticipant(id).catch((err: any) => {
    console.error('[CASYUM:SCAN] participant lookup failed', {
      id,
      error: String(err?.message || err),
    });
    return null;
  });
  if (!profile) {
    console.warn('[CASYUM:SCAN] participant registration not found', { id });
    return { status: 'not_found', profile: null, message: 'No participant matches this QR code.' };
  }

  console.info('[CASYUM:SCAN] participant profile resolved', {
    participantId: profile.participantId,
    registrationId: profile.registrationId,
    paymentStatus: profile.paymentStatus,
    paymentVerified: profile.paymentVerified,
    verificationStatus: profile.verificationStatus,
    registrationVerificationStatus: profile.registrationVerificationStatus,
  });

  if (!profile.paymentVerified) {
    return {
      status: 'payment_pending',
      profile,
      message: 'Payment Not Verified. Faculty Coordinator approval is required.',
    };
  }

  if (profile.verificationStatus === 'Verified') {
    return {
      status: 'already_verified',
      profile,
      message: 'This participant is already verified at the registration desk.',
    };
  }

  if (profile.verificationStatus === 'Rejected') {
    return {
      status: 'already_rejected',
      profile,
      message:
        'This participant was previously rejected at the desk. Review the details before re-verifying.',
    };
  }

  return { status: 'pending', profile, message: 'Ready to verify this participant at the desk.' };
}

export interface AttendanceCheck {
  profile: ScannedParticipant | null;
  registered: boolean;
  paymentVerified: boolean;
  deskVerified: boolean;
  eligible: boolean;
  /** Events this participant is registered for (for the "Wrong Event" case). */
  registeredEvents: RegisteredEventDetail[];
  message: string;
}

/**
 * Attendance flow for Event Coordinators. Enforces, in order:
 *   1. the participant exists;
 *   2. the participant is registered for the event being checked;
 *   3. the payment is verified;
 *   4. the registration desk verification is complete.
 * Only then is the participant eligible to be marked present.
 */
export function buildAttendanceCheck(eventId: string, profile: ScannedParticipant | null): AttendanceCheck {
  const emptyEvents: RegisteredEventDetail[] = [];
  if (!profile) {
    return {
      profile: null,
      registered: false,
      paymentVerified: false,
      deskVerified: false,
      eligible: false,
      registeredEvents: emptyEvents,
      message: 'Participant not found.',
    };
  }

  const registered = profile.eventIds.includes(eventId);
  if (!registered) {
    const registeredNames = profile.registeredEvents.map((e) => e.name).filter(Boolean);
    return {
      profile,
      registered: false,
      paymentVerified: profile.paymentVerified,
      deskVerified: false,
      eligible: false,
      registeredEvents: profile.registeredEvents,
      message: registeredNames.length > 0
        ? `Wrong Event. Registered for: ${registeredNames.join(', ')}`
        : 'Wrong Event. This participant is not registered for this event.',
    };
  }

  if (!profile.paymentVerified) {
    return {
      profile,
      registered: true,
      paymentVerified: false,
      deskVerified: false,
      eligible: false,
      registeredEvents: profile.registeredEvents,
      message: 'Payment Not Verified. Attendance is not allowed yet.',
    };
  }

  const deskVerified =
    profile.registrationVerificationStatus === 'verified' && profile.attendanceEligibility;
  if (!deskVerified) {
    return {
      profile,
      registered: true,
      paymentVerified: true,
      deskVerified: false,
      eligible: false,
      registeredEvents: profile.registeredEvents,
      message: 'Registration Verification Pending. Please complete verification at the Registration Desk.',
    };
  }

  return {
    profile,
    registered: true,
    paymentVerified: true,
    deskVerified: true,
    eligible: true,
    registeredEvents: profile.registeredEvents,
    message: 'Participant is eligible for attendance.',
  };
}

export async function checkEventAttendance(eventId: string, identifier: string): Promise<AttendanceCheck> {
  const id = decodeQRPayload(identifier);
  if (!id) {
    return {
      profile: null,
      registered: false,
      paymentVerified: false,
      deskVerified: false,
      eligible: false,
      registeredEvents: [],
      message: 'Invalid QR Code.',
    };
  }
  const profile = await getScannedParticipant(id, { eventId }).catch(() => null);
  return buildAttendanceCheck(eventId, profile);
}

/**
 * Manual fallback for the coordinator check-in dialog: search the event's
 * registrations by name/email/phone/registration id when a QR cannot be read.
 */
export async function searchEventAttendance(eventId: string, query: string): Promise<AttendanceCheck> {
  const profile = await searchEventParticipant(eventId, query).catch(() => null);
  if (!profile) {
    return {
      profile: null,
      registered: false,
      paymentVerified: false,
      deskVerified: false,
      eligible: false,
      registeredEvents: [],
      message: 'No participant matches this search.',
    };
  }
  return buildAttendanceCheck(eventId, profile);
}
