import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getCurrentUser, readParticipantRecord, type ParticipantRecord } from '../services/authService';
import { completeProfile } from '../services/participantService';
import { listRegistrationsByParticipant } from '../services/registrationService';
import { useGoogleParticipantLogin } from './useGoogleParticipantLogin';

export interface ProfileFormData {
  phone: string;
  college: string;
  city: string;
  department: string;
  year_of_study: string;
}

/**
 * Orchestrates the public "Register for Event" flow from an event details page.
 *
 * Landing page → Event Details → Register for Event → Google Login if needed →
 * Complete Profile if needed → Participant Dashboard → Selected Event →
 * Correct Payment Amount → Enter Transaction ID → Submit Registration.
 *
 * The hook never renders a payment form itself; it moves the participant to the
 * Participant Dashboard with the clicked event preselected (but does NOT open
 * payment — the participant picks any additional events and clicks
 * "Proceed to Payment" manually). If the participant is already registered, it
 * redirects to the dashboard with a clear notice instead of creating a duplicate.
 */
export function useEventRegistration(eventId: string) {
  const navigate = useNavigate();
  const { signIn, isSigningIn, error: signInError } = useGoogleParticipantLogin();
  const [isChecking, setIsChecking] = useState(true);
  const [profile, setProfile] = useState<ParticipantRecord | null>(null);
  const [alreadyRegistered, setAlreadyRegistered] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileError, setProfileError] = useState('');
  const [registerError, setRegisterError] = useState('');

  const refreshStatus = useCallback(async () => {
    const current = getCurrentUser();
    if (!current) {
      setProfile(null);
      setAlreadyRegistered(false);
      return false;
    }
    const record = await readParticipantRecord(current.uid);
    setProfile(record);
    if (record) {
      const regs = await listRegistrationsByParticipant(current.uid);
      setAlreadyRegistered(
        regs.length > 0 || (record.event_ids || []).includes(eventId)
      );
    } else {
      setAlreadyRegistered(false);
    }
    return Boolean(record);
  }, [eventId]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setIsChecking(true);
      try {
        await refreshStatus();
      } catch {
        // Ignore transient read errors; the register action will surface them.
      } finally {
        if (!cancelled) setIsChecking(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [refreshStatus]);

  const isAlreadyRegistered = useCallback(async (): Promise<boolean> => {
    const current = getCurrentUser();
    if (!current) return false;
    const record = await readParticipantRecord(current.uid);
    if (!record) return false;
    const regs = await listRegistrationsByParticipant(current.uid);
    return regs.length > 0 || (record.event_ids || []).includes(eventId);
  }, [eventId]);

  const finishRegistrationFlow = useCallback(async () => {
    const already = await isAlreadyRegistered();
    if (already) {
      setAlreadyRegistered(true);
      navigate(`/participant/dashboard?event=${encodeURIComponent(eventId)}&status=already_registered`, {
        replace: true,
      });
    } else {
      navigate(`/participant/dashboard?event=${encodeURIComponent(eventId)}&select=1`, {
        replace: true,
      });
    }
  }, [eventId, isAlreadyRegistered, navigate]);

  const continueAfterAuth = useCallback(async () => {
    const current = getCurrentUser();
    if (!current) {
      setRegisterError('Unable to confirm your sign-in. Please try again.');
      return;
    }
    const record = await readParticipantRecord(current.uid);
    setProfile(record);
    if (!record?.profile_completed) {
      setShowProfileModal(true);
      return;
    }
    await finishRegistrationFlow();
  }, [finishRegistrationFlow]);

  const handleRegister = useCallback(async () => {
    setRegisterError('');
    if (!getCurrentUser()) {
      await signIn(undefined, () => continueAfterAuth());
      return;
    }
    await continueAfterAuth();
  }, [continueAfterAuth, signIn]);

  const handleProfileComplete = useCallback(
    async (data: ProfileFormData) => {
      setProfileSaving(true);
      setProfileError('');
      try {
        await completeProfile(data);
        setShowProfileModal(false);
        await refreshStatus();
        await finishRegistrationFlow();
      } catch (err) {
        setProfileError(err instanceof Error ? err.message : 'Failed to save your profile. Please try again.');
      } finally {
        setProfileSaving(false);
      }
    },
    [finishRegistrationFlow, refreshStatus]
  );

  return {
    isChecking,
    isSigningIn,
    signInError,
    profile,
    alreadyRegistered,
    showProfileModal,
    setShowProfileModal,
    profileSaving,
    profileError,
    registerError,
    handleRegister,
    handleProfileComplete,
  };
}
