import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useRBAC } from '../../rbac/context/RBACContext';
import { readUserRecord, signOut } from '../../services/authService';
import { OBSERVER_PORTAL_ROLES } from '../../rbac/constants';
import { listEvents, type EventRow } from '../../services/eventService';
import {
  subscribePaymentRegistrations,
  type PaymentRegistrationRow,
} from '../../services/registrationService';
import {
  subscribeVerificationParticipants,
  type VerificationParticipantRow,
} from '../../services/verificationService';
import { subscribeAllAttendance, type AttendanceRecordRow } from '../../services/attendanceService';
import { listCertificates, type CertificateRow } from '../../services/certificateService';
import { listCoordinators } from '../../services/coordinatorService';
import { listCasyumFacultyCoordinators } from '../../services/casyumFacultyService';
import { listRegistrationTeam, type RegistrationTeamMember } from '../../services/registrationTeamService';

interface ObserverUser {
  id: string;
  user_id: string;
  name: string;
  email: string;
  phone: string;
  designation: string;
}

export interface ToastData {
  id: string;
  title: string;
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
}

interface ObserverContextType {
  user: ObserverUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  logout: () => void;
  events: EventRow[];
  eventsLoading: boolean;
  registrations: PaymentRegistrationRow[];
  registrationsLoading: boolean;
  participants: VerificationParticipantRow[];
  participantsLoading: boolean;
  attendance: AttendanceRecordRow[];
  attendanceLoading: boolean;
  certificates: CertificateRow[];
  certificatesLoading: boolean;
  coordinators: any[];
  coordinatorsLoading: boolean;
  faculty: any[];
  facultyLoading: boolean;
  registrationTeam: RegistrationTeamMember[];
  registrationTeamLoading: boolean;
  toasts: ToastData[];
  addToast: (title: string, message: string, type: ToastData['type']) => void;
  dismissToast: (id: string) => void;
}

const ObserverContext = createContext<ObserverContextType | undefined>(undefined);

export const ObserverProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const rbac = useRBAC();
  const [user, setUser] = useState<ObserverUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const [events, setEvents] = useState<EventRow[]>([]);
  const [eventsLoading, setEventsLoading] = useState(true);
  const [registrations, setRegistrations] = useState<PaymentRegistrationRow[]>([]);
  const [registrationsLoading, setRegistrationsLoading] = useState(true);
  const [participants, setParticipants] = useState<VerificationParticipantRow[]>([]);
  const [participantsLoading, setParticipantsLoading] = useState(true);
  const [attendance, setAttendance] = useState<AttendanceRecordRow[]>([]);
  const [attendanceLoading, setAttendanceLoading] = useState(true);
  const [certificates, setCertificates] = useState<CertificateRow[]>([]);
  const [certificatesLoading, setCertificatesLoading] = useState(true);
  const [coordinators, setCoordinators] = useState<any[]>([]);
  const [coordinatorsLoading, setCoordinatorsLoading] = useState(true);
  const [faculty, setFaculty] = useState<any[]>([]);
  const [facultyLoading, setFacultyLoading] = useState(true);
  const [registrationTeam, setRegistrationTeam] = useState<RegistrationTeamMember[]>([]);
  const [registrationTeamLoading, setRegistrationTeamLoading] = useState(true);
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
    if (rbacUser && OBSERVER_PORTAL_ROLES.includes(rbacUser.role)) {
      (async () => {
        const record = await readUserRecord(rbacUser.id).catch(() => null);
        setUser({
          id: rbacUser.id,
          user_id: record?.user_id || rbacUser.id,
          name: record?.full_name || rbacUser.name,
          email: record?.email || rbacUser.email,
          phone: record?.phone || rbacUser.phone || '',
          designation: record?.designation || '',
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

  useEffect(() => {
    if (!user) return;
    setAttendance([]);
    setAttendanceLoading(true);
    const unsubscribe = subscribeAllAttendance(
      (rows) => {
        setAttendance(rows);
        setAttendanceLoading(false);
      },
      () => setAttendanceLoading(false)
    );
    return unsubscribe;
  }, [user]);

  useEffect(() => {
    if (!user) return;
    let active = true;
    setCertificatesLoading(true);
    listCertificates()
      .then((res) => {
        if (active) setCertificates(res.certificates || []);
      })
      .catch(() => {
        if (active) setCertificates([]);
      })
      .finally(() => {
        if (active) setCertificatesLoading(false);
      });
    return () => {
      active = false;
    };
  }, [user]);

  useEffect(() => {
    if (!user) return;
    let active = true;
    setCoordinatorsLoading(true);
    listCoordinators()
      .then((res) => {
        if (active) setCoordinators(res.coordinators || []);
      })
      .catch(() => {
        if (active) setCoordinators([]);
      })
      .finally(() => {
        if (active) setCoordinatorsLoading(false);
      });
    return () => {
      active = false;
    };
  }, [user]);

  useEffect(() => {
    if (!user) return;
    let active = true;
    setFacultyLoading(true);
    listCasyumFacultyCoordinators()
      .then((res) => {
        if (active) setFaculty(res.members || []);
      })
      .catch(() => {
        if (active) setFaculty([]);
      })
      .finally(() => {
        if (active) setFacultyLoading(false);
      });
    return () => {
      active = false;
    };
  }, [user]);

  useEffect(() => {
    if (!user) return;
    let active = true;
    setRegistrationTeamLoading(true);
    listRegistrationTeam()
      .then((res) => {
        if (active) setRegistrationTeam(res.members || []);
      })
      .catch(() => {
        if (active) setRegistrationTeam([]);
      })
      .finally(() => {
        if (active) setRegistrationTeamLoading(false);
      });
    return () => {
      active = false;
    };
  }, [user]);

  const logout = useCallback(() => {
    setUser(null);
    setEvents([]);
    setRegistrations([]);
    setParticipants([]);
    setAttendance([]);
    setCertificates([]);
    setCoordinators([]);
    setFaculty([]);
    setRegistrationTeam([]);
    void signOut();
  }, []);

  return (
    <ObserverContext.Provider
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
        attendance,
        attendanceLoading,
        certificates,
        certificatesLoading,
        coordinators,
        coordinatorsLoading,
        faculty,
        facultyLoading,
        registrationTeam,
        registrationTeamLoading,
        toasts,
        addToast,
        dismissToast,
      }}
    >
      {children}
    </ObserverContext.Provider>
  );
};

export const useObserver = () => {
  const context = useContext(ObserverContext);
  if (!context) {
    throw new Error('useObserver must be used within an ObserverProvider');
  }
  return context;
};
