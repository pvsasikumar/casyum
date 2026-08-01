import { listRegistrationsByEvent } from '../../services/registrationService';
import type { EventParticipant } from '../types';

export const ParticipantService = {
  async getEventParticipants(eventId: string): Promise<EventParticipant[]> {
    try {
      const registrations = await listRegistrationsByEvent(eventId);
      return registrations
        .filter((r) => r.status !== 'Cancelled')
        .map((r) => {
          const participantId = String(
            r.participant_user_id || r.participant_email || r.registration_id
          );
          return {
            registrationId: r.registration_id || `REG-${participantId}`,
            participantId,
            participantName: r.user_full_name || 'Participant',
            college: r.college || '',
            department: r.user_department || '',
            phoneNumber: r.user_phone || '',
            email: r.participant_email || '',
            registrationStatus: r.status === 'Confirmed' ? 'Confirmed' : (r.status || 'Pending'),
            paymentStatus: r.payment_status || 'Pending',
          } as EventParticipant;
        });
    } catch {
      return [];
    }
  },
};
