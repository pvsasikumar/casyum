import {
  collection,
  query,
  where,
  onSnapshot,
  getDocs,
  type QuerySnapshot,
  type DocumentData,
} from 'firebase/firestore';
import { getDb } from '../../firebase/firestore';
import { listRegistrationsByEvent } from '../../services/registrationService';
import { mapRegDoc } from '../../services/eventService';
import type { RegistrationRow } from '../../services/eventService';
import type { EventParticipant, VerificationStatus } from '../types';

export interface ParticipantVerificationInfo {
  verificationStatus: VerificationStatus;
  verifiedBy: string;
}

function toParticipant(r: RegistrationRow): EventParticipant {
  const participantId = String(
    r.participant_user_id || r.participant_email || r.registration_id
  );
  return {
    registrationId: r.registration_id || `REG-${participantId}`,
    participantId,
    participantName: r.user_full_name || 'Participant',
    college: r.college || '',
    city: r.city || '',
    department: r.user_department || '',
    phoneNumber: r.user_phone || '',
    email: r.participant_email || '',
    registrationStatus: r.status === 'Confirmed' ? 'Confirmed' : (r.status || 'Pending'),
    paymentStatus: r.payment_status || 'submitted',
    verificationStatus: 'Pending',
    verifiedBy: '',
    registrationVerificationStatus: r.registration_verification_status || 'locked',
    attendanceEligibility: r.attendance_eligibility === true,
  } as EventParticipant;
}

export const ParticipantService = {
  async getEventParticipants(eventId: string): Promise<EventParticipant[]> {
    try {
      const registrations = await listRegistrationsByEvent(eventId);
      return registrations
        .filter((r) => r.status !== 'Cancelled')
        .map(toParticipant);
    } catch {
      return [];
    }
  },

  subscribeEventParticipants(
    eventId: string,
    onNext: (participants: EventParticipant[]) => void,
    onError?: (error: Error) => void
  ): () => void {
    const db = getDb();
    const q = query(collection(db, 'registrations'), where('event_id', '==', eventId));
    return onSnapshot(
      q,
      (snapshot: QuerySnapshot<DocumentData>) => {
        const registrations = snapshot.docs
          .map((d) => mapRegDoc(d.id, d.data()))
          .sort((a, b) => String(b.registered_at).localeCompare(String(a.registered_at)));
        onNext(registrations.filter((r) => r.status !== 'Cancelled').map(toParticipant));
      },
      onError
    );
  },

  subscribeParticipantVerifications(
    onNext: (byId: Record<string, ParticipantVerificationInfo>) => void,
    onError?: (error: Error) => void
  ): () => void {
    const db = getDb();
    return onSnapshot(
      collection(db, 'participants'),
      (snapshot: QuerySnapshot<DocumentData>) => {
        const map: Record<string, ParticipantVerificationInfo> = {};
        snapshot.docs.forEach((d) => {
          const data = d.data();
          map[d.id] = {
            verificationStatus: (data.verificationStatus || 'Pending') as VerificationStatus,
            verifiedBy: data.verifiedBy || '',
          };
        });
        onNext(map);
      },
      onError
    );
  },

  async getParticipantVerifications(): Promise<Record<string, ParticipantVerificationInfo>> {
    const db = getDb();
    const snap = await getDocs(collection(db, 'participants'));
    const map: Record<string, ParticipantVerificationInfo> = {};
    snap.docs.forEach((d) => {
      const data = d.data();
      map[d.id] = {
        verificationStatus: (data.verificationStatus || 'Pending') as VerificationStatus,
        verifiedBy: data.verifiedBy || '',
      };
    });
    return map;
  },
};
