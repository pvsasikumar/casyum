import { useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { useRBAC } from '../rbac/context/RBACContext';
import type { LoginUser } from '../services/authService';

export function useGoogleParticipantLogin() {
  const navigate = useNavigate();
  const { login } = useRBAC();
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [error, setError] = useState('');

  const signIn = useCallback(
    async (redirect?: string, onSuccess?: (user: LoginUser) => void | Promise<void>) => {
      if (isSigningIn) return;
      const destination =
        typeof redirect === 'string' && redirect.startsWith('/')
          ? redirect
          : '/participant/dashboard';
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
        if (typeof onSuccess === 'function') {
          await onSuccess(result.user);
          return;
        }
        navigate(destination, { replace: true });
      } catch (err) {
        console.error('Participant login error:', err);
        const message = err instanceof Error ? err.message : '';
        if (message && message.toLowerCase().includes('cancel')) {
          setError('Google sign-in was cancelled. Please try again.');
        } else {
          setError('Login failed. Please try again.');
        }
      } finally {
        setIsSigningIn(false);
      }
    },
    [isSigningIn, login, navigate]
  );

  const clearError = useCallback(() => setError(''), []);

  return { signIn, isSigningIn, error, clearError };
}
