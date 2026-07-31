import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { EventItem } from '../../admin/types';
import { AttendanceService } from '../services/AttendanceService';
import type { EventAttendanceStats } from '../types';
import { employeeLogin, signOut, readUserRecord } from '../../services/authService';
import { getAssignedEvents as fetchCoordinatorEvents, COORDINATOR_ROLES } from '../../services/coordinatorService';
import { useRBAC } from '../../rbac/context/RBACContext';

interface CoordinatorUser {
  id: string;
  coordinator_id?: string;
  name: string;
  email: string;
  department: string;
  phone: string;
  coordinator_type?: string;
  designation?: string;
}

interface ToastData {
  id: string;
  title: string;
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
}

interface CoordinatorContextType {
  user: CoordinatorUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  assignedEvents: EventItem[];
  login: (email: string, password: string) => Promise<{ is_first_login: boolean; user: CoordinatorUser; token: string }>;
  logout: () => void;
  getEventStats: (eventId: string) => EventAttendanceStats;
  toasts: ToastData[];
  addToast: (title: string, message: string, type: ToastData['type']) => void;
  dismissToast: (id: string) => void;
  refreshEvents: () => Promise<void>;
}

const CoordinatorContext = createContext<CoordinatorContextType | undefined>(undefined);

function mapAssignedEvent(ev: any): EventItem {
  return {
    id: String(ev.id),
    name: ev.name,
    category: ev.category || 'Technical',
    tagline: '',
    description: ev.description || '',
    iconName: '',
    bannerImage: '',
    venue: ev.venue || '',
    time: ev.time || '',
    date: ev.event_date || '',
    fee: Number(ev.fee) || 0,
    maxParticipants: Number(ev.max_participants) || 0,
    registeredCount: Number(ev.registered_count) || 0,
    facultyCoordinator: ev.faculty_coordinator || '',
    studentCoordinator: ev.student_coordinator || '',
    status: ev.status || 'Open',
    revenue: 0,
    rules: [],
  };
}

async function fetchAssignedEvents(coordinatorId: string): Promise<EventItem[]> {
  try {
    const res = await fetchCoordinatorEvents(coordinatorId);
    return (res.events || []).map(mapAssignedEvent);
  } catch {
    return [];
  }
}

export const CoordinatorProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const rbac = useRBAC();
  const [user, setUser] = useState<CoordinatorUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [assignedEvents, setAssignedEvents] = useState<EventItem[]>([]);
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

  const buildCoordinatorUser = useCallback(async (rbacUser: { id: string; name: string; email: string; role: string; department?: string; phone?: string }): Promise<CoordinatorUser> => {
    const record = await readUserRecord(rbacUser.id).catch(() => null);
    return {
      id: rbacUser.id,
      coordinator_id: record?.coordinator_id || rbacUser.id,
      name: record?.full_name || rbacUser.name,
      email: record?.email || rbacUser.email,
      department: record?.department || rbacUser.department || '',
      phone: record?.phone || rbacUser.phone || '',
      coordinator_type: record?.coordinator_type,
      designation: record?.designation,
    };
  }, []);

  useEffect(() => {
    if (rbac.isLoading) return;
    const rbacUser = rbac.user;
    if (rbacUser && COORDINATOR_ROLES.includes(rbacUser.role)) {
      (async () => {
        const coordUser = await buildCoordinatorUser(rbacUser);
        setUser(coordUser);
        const events = await fetchAssignedEvents(coordUser.id);
        setAssignedEvents(events);
        setIsLoading(false);
      })();
    } else {
      setUser(null);
      setAssignedEvents([]);
      setIsLoading(false);
    }
  }, [rbac.isLoading, rbac.user, buildCoordinatorUser]);

  const login = useCallback(async (email: string, password: string): Promise<{ is_first_login: boolean; user: CoordinatorUser; token: string }> => {
    const data = await employeeLogin(email, password);

    if (!COORDINATOR_ROLES.includes(data.user.role)) {
      await signOut();
      throw new Error('Invalid coordinator credentials.');
    }

    const coordUser: CoordinatorUser = {
      id: data.user.id,
      coordinator_id: data.user.coordinator_id,
      name: data.user.name,
      email: data.user.email,
      department: data.user.department || '',
      phone: data.user.phone || '',
      coordinator_type: data.user.coordinator_type,
      designation: data.user.designation,
    };
    setUser(coordUser);
    const events = await fetchAssignedEvents(coordUser.id);
    setAssignedEvents(events);

    return { is_first_login: data.is_first_login === true, user: coordUser, token: data.token };
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    setAssignedEvents([]);
    void signOut();
  }, []);

  const getEventStats = useCallback((eventId: string): EventAttendanceStats => {
    return AttendanceService.getEventAttendanceStats(eventId);
  }, []);

  const refreshEvents = useCallback(async () => {
    if (user) {
      const events = await fetchAssignedEvents(user.id);
      setAssignedEvents(events);
    }
  }, [user]);

  return (
    <CoordinatorContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        assignedEvents,
        login,
        logout,
        getEventStats,
        toasts,
        addToast,
        dismissToast,
        refreshEvents,
      }}
    >
      {children}
    </CoordinatorContext.Provider>
  );
};

export const useCoordinator = () => {
  const context = useContext(CoordinatorContext);
  if (!context) {
    throw new Error('useCoordinator must be used within a CoordinatorProvider');
  }
  return context;
};
