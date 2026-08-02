import { useCallback, useEffect, useState } from 'react';
import { getCurrentUser, readParticipantRecord, type ParticipantRecord } from '../services/authService';
import { completeProfile, registerEvent, type RegisterPaymentInput } from '../services/participantService';
import { listRegistrationsByParticipant } from '../services/registrationService';
import { useGoogleParticipantLogin } from './useGoogleParticipantLogin';

export interface ProfileFormData {
  phone: string;
  college: string;
  city: string;
  department: string;
  year_of_study: string;
}

export interface PaymentFormData {
  payment_method: string;
  transaction_id: string;
  file: File;
}

export function useEventRegistration(eventId: string, slug: string) {
  const { signIn, isSigningIn, error: signInError } = useGoogleParticipantLogin();
  const [isChecking, setIsChecking] = useState(true);
  const [profile, setProfile] = useState<ParticipantRecord | null>(null);
  const [alreadyRegistered, setAlreadyRegistered] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileError, setProfileError] = useState('');
  const [registerMessage, setRegisterMessage] = useState<string | null>(null);
  const [registerError, setRegisterError] = useState('');
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);

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
        regs.some((r) => r.event_id === eventId) || (record.event_ids || []).includes(eventId)
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

  const doRegister = useCallback(
    async (payment: PaymentFormData): Promise<boolean> => {
      setIsRegistering(true);
      setRegisterError('');
      setRegisterMessage(null);
      setUploadProgress(0);
      try {
        const input: RegisterPaymentInput = {
          payment_method: payment.payment_method,
          transaction_id: payment.transaction_id,
          file: payment.file,
          onProgress: (pct) => setUploadProgress(pct),
        };
        const result = await registerEvent(eventId, input);
        setRegisterMessage(result.message);
        setAlreadyRegistered(true);
        return true;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Registration failed. Please try again.';
        setRegisterError(message);
        if (message.includes('already registered')) setAlreadyRegistered(true);
        return false;
      } finally {
        setIsRegistering(false);
        setUploadProgress(null);
      }
    },
    [eventId]
  );

  const handleRegister = useCallback(async () => {
    setRegisterError('');
    setRegisterMessage(null);
    if (!getCurrentUser()) {
      await signIn(`/events/${slug}`);
      const record = await readParticipantRecord(getCurrentUser()?.uid || '');
      setProfile(record);
      if (!record?.profile_completed) {
        setShowProfileModal(true);
        return;
      }
      setShowPaymentForm(true);
      return;
    }
    let record = profile;
    if (!record) {
      record = await readParticipantRecord(getCurrentUser()?.uid || '');
      setProfile(record);
    }
    if (!record?.profile_completed) {
      setShowProfileModal(true);
      return;
    }
    setShowPaymentForm(true);
  }, [profile, signIn, slug]);

  const handleProfileComplete = useCallback(
    async (data: ProfileFormData) => {
      setProfileSaving(true);
      setProfileError('');
      try {
        await completeProfile(data);
        setShowProfileModal(false);
        await refreshStatus();
        setShowPaymentForm(true);
      } catch (err) {
        setProfileError(err instanceof Error ? err.message : 'Failed to save your profile. Please try again.');
      } finally {
        setProfileSaving(false);
      }
    },
    [refreshStatus]
  );

  const cancelPaymentForm = useCallback(() => {
    setShowPaymentForm(false);
    setRegisterError('');
    setRegisterMessage(null);
    setUploadProgress(null);
  }, []);

  return {
    isChecking,
    isSigningIn,
    signInError,
    profile,
    alreadyRegistered,
    isRegistering,
    showProfileModal,
    setShowProfileModal,
    showPaymentForm,
    cancelPaymentForm,
    profileSaving,
    profileError,
    registerMessage,
    registerError,
    uploadProgress,
    handleRegister,
    handleProfileComplete,
    doRegister,
  };
}
