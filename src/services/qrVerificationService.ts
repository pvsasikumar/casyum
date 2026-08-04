import { decodeParticipantQR, decodeQRPayload } from '../lib/qr';
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
 * The QR code carries the participant's unique CASYUM id
 * (`CASYUM:PARTICIPANT:CAS-01`) — never PII. Every lookup below resolves that
 * id against the `casyum_id` field of the `participants` collection
 * (`participants where casyum_id == "CAS-01"`), re-checks the workflow rules on
 * the server (payment verified, registration desk verified, event membership)
 * and returns a structured outcome with a user-facing message — the scanned
 * data itself is never trusted. Legacy registration-token QRs are still
 * accepted for backward compatibility and resolved through the registration
 * lookup.
 */

export type DeskScanOutcome =
  | { status: 'invalid'; profile: null; message: string }
  | { status: 'not_found'; profile: null; message: string }
  | { status: 'payment_pending'; profile: ScannedParticipant; message: string }
  | { status: 'pending'; profile: ScannedParticipant; message: string }
  | { status: 'already_verified'; profile: ScannedParticipant; message: string }
  | { status: 'already_rejected'; profile: ScannedParticipant; message: string };

/** Development-only logging. Stripped from production by Vite. */
function devLog(message: string, data: Record<string, unknown>): void {
  if (import.meta.env.DEV) {
    console.info(`[CASYUM:SCAN] ${message}`, data);
  }
}

function devError(message: string, data: Record<string, unknown>): void {
  if (import.meta.env.DEV) {
    console.error(`[CASYUM:SCAN] ${message}`, data);
  }
}

/**
 * Registration Desk scan flow. Enforces, in order:
 *   1. the QR is a valid CASYUM code;
 *   2. the participant exists;
 *   3. the payment is already verified — desk verification is not allowed
 *      otherwise;
 *   4. the participant is not already verified/rejected at the desk.
 */
export async function scanForDeskVerification(raw: string): Promise<DeskScanOutcome> {
  let participantId = '';
  let profile: ScannedParticipant | null = null;
  try {
    devLog('raw decoded QR value', { raw });

    const participantCode = decodeParticipantQR(raw);
    const decoded = decodeQRPayload(raw);
    participantId = participantCode || decoded || '';
    devLog('parsed participant id', {
      raw,
      decoded,
      participantId,
      isParticipantCode: participantCode !== null,
    });

    if (!participantId) {
      console.warn('[CASYUM:SCAN] invalid QR payload', { raw });
      return {
        status: 'invalid',
        profile: null,
        message: 'Invalid QR Code.',
      };
    }

    // Participant-id QRs are resolved directly against `participants/<id>` with
    // no registration fallback. The raw payload is passed through so the
    // lookup can detect the `CASYUM:PARTICIPANT:` prefix. Registration tokens
    // (legacy `CASYUM:REG:` / `REG-*`) are passed as the decoded id so the
    // registration lookup can resolve them.
    profile = await getScannedParticipant(participantCode ? raw : participantId).catch((err: any) => {
      devError('participant lookup failed', {
        participantId,
        error: String(err?.message || err),
      });
      return null;
    });

    devLog('participant found', {
      participantId,
      path: profile ? `participants/${profile.id}` : `participants/${participantId}`,
      found: profile !== null,
    });
    if (!profile) {
      console.warn('[CASYUM:SCAN] participant not found', { participantId });
      return { status: 'not_found', profile: null, message: 'Participant Not Found.' };
    }

    devLog('participant profile resolved', {
      participantId: profile.participantId,
      registrationId: profile.registrationId,
      paymentStatus: profile.paymentStatus,
      paymentVerified: profile.paymentVerified,
      verificationStatus: profile.verificationStatus,
      registrationVerificationStatus: profile.registrationVerificationStatus,
      attendanceEligibility: profile.attendanceEligibility,
      eventIds: profile.eventIds,
    });

    if (!profile.paymentVerified) {
      devLog('final verification result', { participantId, status: 'payment_pending' });
      return {
        status: 'payment_pending',
        profile,
        message: 'Payment Not Verified. Faculty Coordinator approval is required.',
      };
    }

    if (profile.verificationStatus === 'Verified') {
      devLog('final verification result', { participantId, status: 'already_verified' });
      return {
        status: 'already_verified',
        profile,
        message: 'Already Verified at Registration Desk.',
      };
    }

    if (profile.verificationStatus === 'Rejected') {
      devLog('final verification result', { participantId, status: 'already_rejected' });
      return {
        status: 'already_rejected',
        profile,
        message:
          'This participant was previously rejected at the desk. Review the details before re-verifying.',
      };
    }

    devLog('final verification result', { participantId, status: 'pending' });
    return { status: 'pending', profile, message: 'Ready to verify this participant at the desk.' };
  } catch (err: any) {
    devError('scan handler error', {
      raw,
      participantId,
      error: String(err?.message || err),
    });
    return { status: 'invalid', profile: null, message: 'Invalid QR Code.' };
  } finally {
    devLog('desk scan completed', { raw, participantId, participantFound: profile !== null });
  }
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
  let check: AttendanceCheck;
  if (!profile) {
    check = {
      profile: null,
      registered: false,
      paymentVerified: false,
      deskVerified: false,
      eligible: false,
      registeredEvents: emptyEvents,
      message: 'Participant not found.',
    };
  } else if (!profile.eventIds.includes(eventId)) {
    const registeredNames = profile.registeredEvents.map((e) => e.name).filter(Boolean);
    check = {
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
  } else if (!profile.paymentVerified) {
    check = {
      profile,
      registered: true,
      paymentVerified: false,
      deskVerified: false,
      eligible: false,
      registeredEvents: profile.registeredEvents,
      message: 'Payment Not Verified. Attendance is not allowed yet.',
    };
  } else {
    const deskVerified =
      profile.registrationVerificationStatus === 'verified' && profile.attendanceEligibility;
    check = deskVerified
      ? {
          profile,
          registered: true,
          paymentVerified: true,
          deskVerified: true,
          eligible: true,
          registeredEvents: profile.registeredEvents,
          message: 'Participant is eligible for attendance.',
        }
      : {
          profile,
          registered: true,
          paymentVerified: true,
          deskVerified: false,
          eligible: false,
          registeredEvents: profile.registeredEvents,
          message:
            'Registration Verification Pending. Please complete verification at the Registration Desk.',
        };
  }

  devLog('coordinator attendance check', {
    coordinatorEventId: eventId,
    participantId: profile?.participantId,
    participantFound: profile !== null,
    paymentStatus: profile?.paymentStatus,
    paymentVerified: profile?.paymentVerified,
    eventIds: profile?.eventIds,
    currentCoordinatorEventInEventIds: profile ? profile.eventIds.includes(eventId) : false,
    registrationDeskVerified: profile
      ? profile.registrationVerificationStatus === 'verified' && profile.attendanceEligibility
      : false,
    eligible: check.eligible,
    message: check.message,
  });
  return check;
}

export async function checkEventAttendance(eventId: string, identifier: string): Promise<AttendanceCheck> {
  try {
    devLog('raw decoded QR value (coordinator)', { raw: identifier });
    const participantCode = decodeParticipantQR(identifier);
    const decoded = decodeQRPayload(identifier);
    const id = participantCode || decoded || '';
    devLog('parsed participant id (coordinator)', {
      raw: identifier,
      decoded,
      participantId: id,
      coordinatorEventId: eventId,
    });
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
    const profile = await getScannedParticipant(participantCode ? identifier : id, { eventId }).catch(
      (err: any) => {
        devError('coordinator participant lookup failed', {
          coordinatorEventId: eventId,
          participantId: id,
          error: String(err?.message || err),
        });
        return null;
      }
    );
    return buildAttendanceCheck(eventId, profile);
  } catch (err: any) {
    devError('coordinator scan handler error', {
      coordinatorEventId: eventId,
      raw: identifier,
      error: String(err?.message || err),
    });
    return {
      profile: null,
      registered: false,
      paymentVerified: false,
      deskVerified: false,
      eligible: false,
      registeredEvents: [],
      message: 'Invalid QR Code.',
    };
  } finally {
    devLog('coordinator scan completed', { coordinatorEventId: eventId, raw: identifier });
  }
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
