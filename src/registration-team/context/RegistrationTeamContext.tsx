import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useRBAC } from '../../rbac/context/RBACContext';
import { readUserRecord, signOut } from '../../services/authService';
import { REGISTRATION_TEAM_PORTAL_ROLES } from '../../rbac/constants';
import { subscribeVerificationParticipants, type VerificationParticipantRow } from '../../services/verificationService';

interface RegistrationTeamUser {
  id: string;
  name: string;
  email: string;
  department: string;
  phone: string;
}

interface ToastData {
  id: string;
  title: string;
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
}

interface RegistrationTeamContextType {
  user: RegistrationTeamUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  logout: () => void;
  participants: VerificationParticipantRow[];
  participantsLoading: boolean;
  participantsError: string | null;
  toasts: ToastData[];
  addToast: (title: string, message: string, type: ToastData['type']) => void;
  dismissToast: (id: string) => void;
}

const RegistrationTeamContext = createContext<RegistrationTeamContextType | undefined>(undefined);

export const RegistrationTeamProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const rbac = useRBAC();
  const [user, setUser] = useState<RegistrationTeamUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [participants, setParticipants] = useState<VerificationParticipantRow[]>([]);
  const [participantsLoading, setParticipantsLoading] = useState(true);
  const [participantsError, setParticipantsError] = useState<string | null>(null);
  const [toasts, setToasts] = useState<ToastData[]>([]);

  const addToast = useCallback((title: string, message: string, type: ToastData['type']) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    setToasts((prev) => [...prev, { id, title, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  useEffect(() => {
    if (rbac.isLoading) return;
    const rbacUser = rbac.user;
    if (rbacUser && REGISTRATION_TEAM_PORTAL_ROLES.includes(rbacUser.role)) {
      (async () => {
        const record = await readUserRecord(rbacUser.id).catch(() => null);
        setUser({
          id: rbacUser.id,
          name: record?.full_name || rbacUser.name,
          email: record?.email || rbacUser.email,
          department: record?.department || rbacUser.department || '',
          phone: record?.phone || rbacUser.phone || '',
        });
        setIsLoading(false);
      })();
    } else {
      setUser(null);
      setIsLoading(false);
    }
  }, [rbac.isLoading, rbac.user]);

  useEffect(() => {
    if (!user) return;
    setParticipants([]);
    setParticipantsLoading(true);
    setParticipantsError(null);
    const unsubscribe = subscribeVerificationParticipants(
      (rows) => {
        setParticipants(rows);
        setParticipantsLoading(false);
        setParticipantsError(null);
      },
      (error) => {
        setParticipantsLoading(false);
        setParticipantsError(error?.message || 'Failed to load participants.');
      }
    );
    return unsubscribe;
  }, [user]);

  const logout = useCallback(() => {
    setUser(null);
    setParticipants([]);
    setParticipantsLoading(false);
    setParticipantsError(null);
    void signOut();
  }, []);

  return (
    <RegistrationTeamContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        logout,
        participants,
        participantsLoading,
        participantsError,
        toasts,
        addToast,
        dismissToast,
      }}
    >
      {children}
    </RegistrationTeamContext.Provider>
  );
};

export const useRegistrationTeam = () => {
  const context = useContext(RegistrationTeamContext);
  if (!context) {
    throw new Error('useRegistrationTeam must be used within a RegistrationTeamProvider');
  }
  return context;
};
