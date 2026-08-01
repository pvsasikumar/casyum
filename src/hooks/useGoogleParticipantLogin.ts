import { useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { useRBAC } from '../rbac/context/RBACContext';

export function useGoogleParticipantLogin() {
  const navigate = useNavigate();
  const { login } = useRBAC();
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [error, setError] = useState('');

  const signIn = useCallback(
    async (redirect?: string) => {
      if (isSigningIn) return;
      setIsSigningIn(true);
      setError('');
      try {
        const result = await api.googleLoginPopup();
        login({
          id: result.user.id,
          name: result.user.name,
          email: result.user.email,
          role: 'Participant',
          token: result.token,
          department: result.user.department,
          phone: result.user.phone,
          profile_completed: result.user.profile_completed,
          is_first_login: result.is_first_login,
        });
        navigate(redirect || '/participant/dashboard', { replace: true });
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Google sign-in failed. Please try again.');
      } finally {
        setIsSigningIn(false);
      }
    },
    [isSigningIn, login, navigate]
  );

  const clearError = useCallback(() => setError(''), []);

  return { signIn, isSigningIn, error, clearError };
}
