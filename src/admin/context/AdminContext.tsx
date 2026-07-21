import React, { createContext, useContext, useState, useEffect } from 'react';
import type {
  Participant,
  EventItem,
  AttendanceRecord,
  Announcement,
  Certificate,
  GalleryMedia,
  Coordinator,
  AuditLog,
  SystemSettings,
  UserRole,
  ActiveTabModule,
  PaymentStatus,
  AttendanceStatus,
} from '../types';
import {
  INITIAL_EVENTS,
  INITIAL_PARTICIPANTS,
  INITIAL_ATTENDANCE,
  INITIAL_ANNOUNCEMENTS,
  INITIAL_CERTIFICATES,
  INITIAL_GALLERY,
  INITIAL_COORDINATORS,
  INITIAL_AUDIT_LOGS,
  INITIAL_SETTINGS,
} from '../data/mockData';

interface NotificationItem {
  id: string;
  title: string;
  message: string;
  time: string;
  read: boolean;
  type: 'info' | 'success' | 'warning' | 'error';
}

interface AdminContextType {
  role: UserRole;
  setRole: (role: UserRole) => void;
  activeTab: ActiveTabModule;
  setActiveTab: (tab: ActiveTabModule) => void;

  participants: Participant[];
  events: EventItem[];
  attendance: AttendanceRecord[];
  announcements: Announcement[];
  certificates: Certificate[];
  gallery: GalleryMedia[];
  coordinators: Coordinator[];
  auditLogs: AuditLog[];
  settings: SystemSettings;
  notifications: NotificationItem[];

  // Selected Participant Drawer
  selectedParticipant: Participant | null;
  setSelectedParticipant: (p: Participant | null) => void;

  // Global Search Modal
  globalSearchOpen: boolean;
  setGlobalSearchOpen: (open: boolean) => void;

  // Actions
  approvePayment: (id: string, remarks?: string) => void;
  rejectPayment: (id: string, remarks: string) => void;
  addRegistration: (p: Omit<Participant, 'id' | 'registrationDate'>) => void;
  updateRegistration: (p: Participant) => void;
  deleteParticipant: (id: string) => void;
  bulkDeleteParticipants: (ids: string[]) => void;
  bulkApprovePayments: (ids: string[]) => void;

  toggleEventStatus: (eventId: string) => void;
  markAttendance: (participantId: string, eventId: string, status: AttendanceStatus) => void;
  createAnnouncement: (announcement: Omit<Announcement, 'id' | 'publishDate'>) => void;
  deleteAnnouncement: (id: string) => void;
  uploadGalleryMedia: (item: Omit<GalleryMedia, 'id' | 'uploadedDate'>) => void;
  deleteGalleryMedia: (id: string) => void;
  updateSettings: (newSettings: Partial<SystemSettings>) => void;
  logAction: (action: string, details: string) => void;
  markNotificationRead: (id: string) => void;
  clearNotifications: () => void;
}

const AdminContext = createContext<AdminContextType | undefined>(undefined);

export const AdminProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [role, setRole] = useState<UserRole>('Super Admin');
  const [activeTab, setActiveTab] = useState<ActiveTabModule>('Dashboard');

  const [participants, setParticipants] = useState<Participant[]>(() => {
    const saved = localStorage.getItem('casyum_participants');
    return saved ? JSON.parse(saved) : INITIAL_PARTICIPANTS;
  });

  const [events, setEvents] = useState<EventItem[]>(() => {
    const saved = localStorage.getItem('casyum_events');
    return saved ? JSON.parse(saved) : INITIAL_EVENTS;
  });

  const [attendance, setAttendance] = useState<AttendanceRecord[]>(() => {
    const saved = localStorage.getItem('casyum_attendance');
    return saved ? JSON.parse(saved) : INITIAL_ATTENDANCE;
  });

  const [announcements, setAnnouncements] = useState<Announcement[]>(() => {
    const saved = localStorage.getItem('casyum_announcements');
    return saved ? JSON.parse(saved) : INITIAL_ANNOUNCEMENTS;
  });

  const [certificates, setCertificates] = useState<Certificate[]>(INITIAL_CERTIFICATES);
  const [gallery, setGallery] = useState<GalleryMedia[]>(INITIAL_GALLERY);
  const [coordinators, setCoordinators] = useState<Coordinator[]>(INITIAL_COORDINATORS);

  const [auditLogs, setAuditLogs] = useState<AuditLog[]>(() => {
    const saved = localStorage.getItem('casyum_audit_logs');
    return saved ? JSON.parse(saved) : INITIAL_AUDIT_LOGS;
  });

  const [settings, setSettings] = useState<SystemSettings>(INITIAL_SETTINGS);

  const [selectedParticipant, setSelectedParticipant] = useState<Participant | null>(null);
  const [globalSearchOpen, setGlobalSearchOpen] = useState(false);

  const [notifications, setNotifications] = useState<NotificationItem[]>([
    { id: 'notif-1', title: 'New Registration', message: 'Rohan Deshmukh registered for AI Challenge', time: '10 mins ago', read: false, type: 'info' },
    { id: 'notif-2', title: 'Duplicate Payment Txn', message: 'UPI/402910492011 uploaded twice by participant', time: '25 mins ago', read: false, type: 'warning' },
    { id: 'notif-3', title: 'Registration Full', message: 'Paper Presentation event reached maximum quota (40)', time: '1 hour ago', read: false, type: 'error' },
  ]);

  // Sync to local storage
  useEffect(() => {
    localStorage.setItem('casyum_participants', JSON.stringify(participants));
  }, [participants]);

  useEffect(() => {
    localStorage.setItem('casyum_events', JSON.stringify(events));
  }, [events]);

  useEffect(() => {
    localStorage.setItem('casyum_attendance', JSON.stringify(attendance));
  }, [attendance]);

  useEffect(() => {
    localStorage.setItem('casyum_audit_logs', JSON.stringify(auditLogs));
  }, [auditLogs]);

  const logAction = (action: string, details: string) => {
    const newLog: AuditLog = {
      id: `log-${Date.now()}`,
      user: role,
      role: role,
      action,
      details,
      timestamp: new Date().toLocaleString(),
      ipAddress: '192.168.1.100',
    };
    setAuditLogs((prev) => [newLog, ...prev]);
  };

  const approvePayment = (id: string, remarks?: string) => {
    setParticipants((prev) =>
      prev.map((p) => {
        if (p.id === id) {
          const updated = { ...p, paymentStatus: 'Approved' as PaymentStatus, paymentRemarks: remarks || 'Approved by admin' };
          if (selectedParticipant?.id === id) setSelectedParticipant(updated);
          return updated;
        }
        return p;
      })
    );
    const p = participants.find((x) => x.id === id);
    logAction('Approved Payment', `Approved payment of ₹${p?.paymentAmount || 0} for ${p?.name || id}`);
    pushNotification('Payment Approved', `Payment for ${p?.name} has been verified and approved.`, 'success');
  };

  const rejectPayment = (id: string, remarks: string) => {
    setParticipants((prev) =>
      prev.map((p) => {
        if (p.id === id) {
          const updated = { ...p, paymentStatus: 'Rejected' as PaymentStatus, paymentRemarks: remarks };
          if (selectedParticipant?.id === id) setSelectedParticipant(updated);
          return updated;
        }
        return p;
      })
    );
    const p = participants.find((x) => x.id === id);
    logAction('Rejected Payment', `Rejected payment for ${p?.name || id}. Reason: ${remarks}`);
    pushNotification('Payment Rejected', `Payment for ${p?.name} was rejected: ${remarks}`, 'error');
  };

  const addRegistration = (data: Omit<Participant, 'id' | 'registrationDate'>) => {
    const newP: Participant = {
      ...data,
      id: `PART-${1000 + participants.length + 1}`,
      registrationDate: new Date().toISOString().split('T')[0],
    };
    setParticipants((prev) => [newP, ...prev]);
    logAction('Registration Created', `Created manual registration for ${newP.name}`);
    pushNotification('New Registration', `${newP.name} registered for CASYUM 2K26`, 'info');
  };

  const updateRegistration = (updated: Participant) => {
    setParticipants((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
    if (selectedParticipant?.id === updated.id) setSelectedParticipant(updated);
    logAction('Registration Updated', `Updated profile data for ${updated.name}`);
  };

  const deleteParticipant = (id: string) => {
    const p = participants.find((x) => x.id === id);
    setParticipants((prev) => prev.filter((x) => x.id !== id));
    if (selectedParticipant?.id === id) setSelectedParticipant(null);
    logAction('Participant Deleted', `Deleted participant ${p?.name || id}`);
  };

  const bulkDeleteParticipants = (ids: string[]) => {
    setParticipants((prev) => prev.filter((p) => !ids.includes(p.id)));
    if (selectedParticipant && ids.includes(selectedParticipant.id)) setSelectedParticipant(null);
    logAction('Bulk Delete', `Deleted ${ids.length} participants`);
  };

  const bulkApprovePayments = (ids: string[]) => {
    setParticipants((prev) =>
      prev.map((p) => (ids.includes(p.id) ? { ...p, paymentStatus: 'Approved' as PaymentStatus } : p))
    );
    logAction('Bulk Payment Approve', `Approved payments for ${ids.length} participants`);
  };

  const toggleEventStatus = (eventId: string) => {
    setEvents((prev) =>
      prev.map((e) => {
        if (e.id === eventId) {
          const nextStatus = e.status === 'Open' ? 'Closed' : 'Open';
          logAction('Event Status Updated', `Changed status of ${e.name} to ${nextStatus}`);
          return { ...e, status: nextStatus };
        }
        return e;
      })
    );
  };

  const markAttendance = (participantId: string, eventId: string, status: AttendanceStatus) => {
    const p = participants.find((x) => x.id === participantId);
    const e = events.find((x) => x.id === eventId);
    const existing = attendance.find((a) => a.participantId === participantId && a.eventId === eventId);

    if (existing) {
      setAttendance((prev) =>
        prev.map((a) =>
          a.id === existing.id
            ? { ...a, status, timestamp: new Date().toLocaleString(), checkedBy: `${role}` }
            : a
        )
      );
    } else {
      const newAtt: AttendanceRecord = {
        id: `att-${Date.now()}`,
        participantId,
        participantName: p?.name || 'Unknown',
        eventId,
        eventName: e?.name || 'Unknown Event',
        status,
        timestamp: new Date().toLocaleString(),
        checkedBy: `${role}`,
      };
      setAttendance((prev) => [newAtt, ...prev]);
    }
    logAction('Attendance Marked', `Marked ${p?.name} as ${status} for ${e?.name}`);
  };

  const createAnnouncement = (data: Omit<Announcement, 'id' | 'publishDate'>) => {
    const newAnc: Announcement = {
      ...data,
      id: `anc-${Date.now()}`,
      publishDate: new Date().toLocaleString(),
    };
    setAnnouncements((prev) => [newAnc, ...prev]);
    logAction('Announcement Published', `Title: ${newAnc.title} (Target: ${newAnc.target})`);
    pushNotification('New Announcement', newAnc.title, 'info');
  };

  const deleteAnnouncement = (id: string) => {
    setAnnouncements((prev) => prev.filter((a) => a.id !== id));
    logAction('Announcement Deleted', `Deleted announcement ID ${id}`);
  };

  const uploadGalleryMedia = (item: Omit<GalleryMedia, 'id' | 'uploadedDate'>) => {
    const newMedia: GalleryMedia = {
      ...item,
      id: `gal-${Date.now()}`,
      uploadedDate: new Date().toISOString().split('T')[0],
    };
    setGallery((prev) => [newMedia, ...prev]);
    logAction('Gallery Media Uploaded', `Uploaded ${newMedia.type}: ${newMedia.title}`);
  };

  const deleteGalleryMedia = (id: string) => {
    setGallery((prev) => prev.filter((g) => g.id !== id));
    logAction('Gallery Media Deleted', `Deleted media ${id}`);
  };

  const updateSettings = (newSettings: Partial<SystemSettings>) => {
    setSettings((prev) => ({ ...prev, ...newSettings }));
    logAction('Settings Updated', 'Updated system ERP settings configuration');
    pushNotification('Settings Saved', 'System settings were successfully updated.', 'success');
  };

  const pushNotification = (title: string, message: string, type: 'info' | 'success' | 'warning' | 'error') => {
    const notif: NotificationItem = {
      id: `notif-${Date.now()}`,
      title,
      message,
      time: 'Just now',
      read: false,
      type,
    };
    setNotifications((prev) => [notif, ...prev]);
  };

  const markNotificationRead = (id: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
  };

  const clearNotifications = () => {
    setNotifications([]);
  };

  return (
    <AdminContext.Provider
      value={{
        role,
        setRole,
        activeTab,
        setActiveTab,
        participants,
        events,
        attendance,
        announcements,
        certificates,
        gallery,
        coordinators,
        auditLogs,
        settings,
        notifications,
        selectedParticipant,
        setSelectedParticipant,
        globalSearchOpen,
        setGlobalSearchOpen,
        approvePayment,
        rejectPayment,
        addRegistration,
        updateRegistration,
        deleteParticipant,
        bulkDeleteParticipants,
        bulkApprovePayments,
        toggleEventStatus,
        markAttendance,
        createAnnouncement,
        deleteAnnouncement,
        uploadGalleryMedia,
        deleteGalleryMedia,
        updateSettings,
        logAction,
        markNotificationRead,
        clearNotifications,
      }}
    >
      {children}
    </AdminContext.Provider>
  );
};

export const useAdmin = () => {
  const context = useContext(AdminContext);
  if (!context) {
    throw new Error('useAdmin must be used within an AdminProvider');
  }
  return context;
};
