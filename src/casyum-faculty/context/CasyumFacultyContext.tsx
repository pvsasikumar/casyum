import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useRBAC } from '../../rbac/context/RBACContext';
import { readUserRecord, signOut } from '../../services/authService';
import { CASYUM_FACULTY_PORTAL_ROLES } from '../../rbac/constants';
import { listEvents, type EventRow } from '../../services/eventService';
import {
  subscribePaymentRegistrations,
  type PaymentRegistrationRow,
} from '../../services/registrationService';
import {
  subscribeVerificationParticipants,
  type VerificationParticipantRow,
} from '../../services/verificationService';

interface CasyumFacultyUser {
  id: string;
  name: string;
  email: string;
  department: string;
  phone: string;
}

export interface ToastData {
  id: string;
  title: string;
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
}

interface CasyumFacultyContextType {
  user: CasyumFacultyUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  logout: () => void;
  events: EventRow[];
  eventsLoading: boolean;
  registrations: PaymentRegistrationRow[];
  registrationsLoading: boolean;
  participants: VerificationParticipantRow[];
  participantsLoading: boolean;
  toasts: ToastData[];
  addToast: (title: string, message: string, type: ToastData['type']) => void;
  dismissToast: (id: string) => void;
}

const CasyumFacultyContext = createContext<CasyumFacultyContextType | undefined>(undefined);

export const CasyumFacultyProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const rbac = useRBAC();
  const [user, setUser] = useState<CasyumFacultyUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const [events, setEvents] = useState<EventRow[]>([]);
  const [eventsLoading, setEventsLoading] = useState(true);
  const [registrations, setRegistrations] = useState<PaymentRegistrationRow[]>([]);
  const [registrationsLoading, setRegistrationsLoading] = useState(true);
  const [participants, setParticipants] = useState<VerificationParticipantRow[]>([]);
  const [participantsLoading, setParticipantsLoading] = useState(true);
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
    if (rbacUser && CASYUM_FACULTY_PORTAL_ROLES.includes(rbacUser.role)) {
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
    let active = true;
    setEventsLoading(true);
    listEvents()
      .then((res) => {
        if (active) setEvents(res.events || []);
      })
      .catch(() => {
        if (active) setEvents([]);
      })
      .finally(() => {
        if (active) setEventsLoading(false);
      });
    return () => {
      active = false;
    };
  }, [user]);

  useEffect(() => {
    if (!user) return;
    setRegistrations([]);
    setRegistrationsLoading(true);
    const unsubscribe = subscribePaymentRegistrations(
      (rows) => {
        setRegistrations(rows);
        setRegistrationsLoading(false);
      },
      () => setRegistrationsLoading(false)
    );
    return unsubscribe;
  }, [user]);

  useEffect(() => {
    if (!user) return;
    setParticipants([]);
    setParticipantsLoading(true);
    const unsubscribe = subscribeVerificationParticipants(
      (rows) => {
        setParticipants(rows);
        setParticipantsLoading(false);
      },
      () => setParticipantsLoading(false)
    );
    return unsubscribe;
  }, [user]);

  const logout = useCallback(() => {
    setUser(null);
    setRegistrations([]);
    setParticipants([]);
    setEvents([]);
    void signOut();
  }, []);

  return (
    <CasyumFacultyContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        logout,
        events,
        eventsLoading,
        registrations,
        registrationsLoading,
        participants,
        participantsLoading,
        toasts,
        addToast,
        dismissToast,
      }}
    >
      {children}
    </CasyumFacultyContext.Provider>
  );
};

export const useCasyumFaculty = () => {
  const context = useContext(CasyumFacultyContext);
  if (!context) {
    throw new Error('useCasyumFaculty must be used within a CasyumFacultyProvider');
  }
  return context;
};
