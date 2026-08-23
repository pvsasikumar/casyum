import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
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
  EmailLog,
} from '../types';
import type { ToastData } from '../components/common/Toast';
import { useRBAC } from '../../rbac/context/RBACContext';
import { api } from '../../services/api';
import { listGallery, addGalleryMedia, deleteGalleryMedia as deleteGalleryRow } from '../../services/galleryService';
import { listCertificates } from '../../services/certificateService';
import {
  listAnnouncements,
  createAnnouncement as createAnnouncementRow,
  deleteAnnouncement as deleteAnnouncementRow,
} from '../../services/announcementService';
import { listAuditLogs, addAuditLog } from '../../services/auditLogService';
import { readSettings, saveSettings } from '../../services/settingsService';
import { listAllAttendance, upsertAttendance } from '../../services/attendanceService';
import { EVENT_IMAGE_MAP, DEFAULT_EVENT_IMAGE } from '../../services/eventSlug';
import { isGamingEvent } from '../../services/eventSelection';

interface NotificationItem {
  id: string;
  title: string;
  message: string;
  time: string;
  read: boolean;
  type: 'info' | 'success' | 'warning' | 'error';
}

export interface AdminProfile {
  name: string;
  email: string;
  role: string;
  phone: string;
  department: string;
  photo: string;
  lastLogin: string;
  accountStatus: string;
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

  // Dark Mode
  isDarkMode: boolean;
  toggleDarkMode: () => void;

  // Admin Profile
  adminProfile: AdminProfile;
  updateAdminProfile: (profile: Partial<AdminProfile>) => void;

  // Toast
  toasts: ToastData[];
  addToast: (title: string, message: string, type: ToastData['type'], duration?: number) => void;
  dismissToast: (id: string) => void;
  pushNotification: (title: string, message: string, type: 'info' | 'success' | 'warning' | 'error') => void;

  // Email Logs
  emailLogs: EmailLog[];
  emailLogsLoading: boolean;
  emailStats: any;
  refreshEmailLogs: () => Promise<void>;
  resendEmail: (logId: string) => Promise<any>;
  sendTestEmail: (to: string) => Promise<any>;

  // Coordinator CRUD
  addCoordinator: (c: {
    full_name: string;
    email: string;
    phone: string;
    department?: string;
    designation?: string;
    coordinator_type?: string;
    username?: string;
    password?: string;
    role?: string;
    status?: string;
    notes?: string;
    event_ids?: number[];
  }) => Promise<any>;
  updateCoordinator: (id: number, data: Partial<Coordinator> & { password?: string; event_ids?: number[] }) => Promise<void>;
  deleteCoordinator: (id: number) => Promise<void>;
  refreshCoordinators: () => Promise<void>;

  // Event CRUD
  addEvent: (e: Omit<EventItem, 'id' | 'revenue'>) => void;
  updateEvent: (e: EventItem) => void;
  deleteEvent: (id: string) => void;
  refreshEvents: () => Promise<void>;

  // Actions
  approvePayment: (id: string, remarks?: string) => void;
  rejectPayment: (id: string, remarks: string) => void;
  addRegistration: (p: {
    name: string;
    email: string;
    mobile: string;
    college: string;
    city: string;
    department: string;
    year: string;
    gender: 'Male' | 'Female' | 'Other';
    registeredEvents: string[];
  }) => void;
  updateRegistration: (p: Participant) => void;
  deleteParticipant: (id: string) => void;
  bulkDeleteParticipants: (ids: string[]) => void;
  bulkApprovePayments: (ids: string[]) => void;
  refreshParticipants: () => Promise<void>;

  toggleEventStatus: (eventId: string) => void;
  // Team Settings: opening navigates to the Team Settings module for the event.
  // Enabling/disabling team formation is ONLY done from there (with confirmation)
  // via teamService.enableTeamFormation/disableTeamFormation.
  teamSettingsEventId: string | null;
  openTeamSettings: (eventId: string) => void;
  closeTeamSettings: () => void;
  // Event Overview CMS: pre-selects an event when opening that module from
  // another module (e.g. the Website CMS "Events & Rule Books" tab).
  eventOverviewEventId: string | null;
  openEventOverview: (eventId: string) => void;
  closeEventOverview: () => void;
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

const DEFAULT_SETTINGS: SystemSettings = {
  symposiumName: 'CASYUM 2K26',
  tagline: 'Annual National Level Technical Symposium',
  registrationStatus: 'Open',
  registrationFee: 250,
  upiId: 'casyum.srm@okicici',
  upiQrUrl: 'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?auto=format&fit=crop&w=400&q=80',
  countdownTarget: '2026-08-29T08:00:00',
  homepageBanner: '🚀 Registration for CASYUM 2K26 is LIVE! Cash prizes worth ₹1.5L+ awaiting.',
  contactEmail: 'casyum2k26@srmist.edu.in',
  contactPhone: '+91 44 2741 7000',
  socialLinks: {
    instagram: 'https://instagram.com/casyum',
    twitter: 'https://twitter.com/casyum',
    linkedin: 'https://linkedin.com/in/casyum',
    youtube: 'https://youtube.com/@casyum',
  },
  sponsors: [
    { name: 'NVIDIA', logo: 'https://upload.wikimedia.org/wikipedia/commons/2/21/Nvidia_logo.svg', tier: 'Title' },
    { name: 'Google Cloud', logo: 'https://upload.wikimedia.org/wikipedia/commons/5/51/Google_Cloud_logo.svg', tier: 'Platinum' },
    { name: 'GitHub', logo: 'https://upload.wikimedia.org/wikipedia/commons/9/91/Octicons-mark-github.svg', tier: 'Gold' },
  ],
};

const AdminContext = createContext<AdminContextType | undefined>(undefined);

export const AdminProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const rbac = useRBAC();
  const [role, setRole] = useState<UserRole>(() => (rbac.role as UserRole) || 'Super Admin');
  const [activeTab, setActiveTab] = useState<ActiveTabModule>('Dashboard');

  useEffect(() => {
    if (rbac.role) {
      setRole(rbac.role as UserRole);
    }
  }, [rbac.role]);

  const [participants, setParticipants] = useState<Participant[]>([]);

  const [events, setEvents] = useState<EventItem[]>([]);

  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);

  const [announcements, setAnnouncements] = useState<Announcement[]>([]);

  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [gallery, setGallery] = useState<GalleryMedia[]>([]);
  const [coordinators, setCoordinators] = useState<Coordinator[]>([]);

  const refreshCoordinators = useCallback(async () => {
    try {
      const res = await api.coordinator.list();
      setCoordinators(res.coordinators);
    } catch {
      setCoordinators([]);
    }
  }, []);

  useEffect(() => {
    refreshCoordinators();
  }, [refreshCoordinators]);

  const mapDbEventToItem = useCallback((row: any): EventItem => {
    const name = row?.name || '';
    return {
      id: String(row?.id),
      name,
      category: row?.category || 'Technical',
      // Events created before the schema introduced `event_type` may not have
      // the field. Derive a sensible value so updates never send `undefined`
      // and the admin form always shows a valid selection.
      event_type:
        row?.event_type ||
        (isGamingEvent(row) ? 'gaming' : 'regular'),
      tagline: row?.tagline || '',
      description: row?.description || '',
      iconName: row?.iconName || 'Calendar',
      bannerImage: EVENT_IMAGE_MAP[name] || DEFAULT_EVENT_IMAGE,
      venue: row?.venue || '',
      time: row?.time || '',
      date: row?.event_date || '',
      fee: Number(row?.fee) || 0,
      maxParticipants: Number(row?.max_participants) || 0,
      registeredCount: Number(row?.registered_count) || 0,
      facultyCoordinator: row?.faculty_coordinator || '',
      studentCoordinator: row?.student_coordinator || '',
      status: row?.status || 'Open',
      revenue: 0,
      rules: [],
      teamEvent: row?.team_event === true,
      minTeamSize: Number(row?.min_team_size) || 0,
      maxTeamSize: Number(row?.max_team_size) || 0,
      teamFormationEnabled: row?.team_formation_enabled === true,
      feeType: row?.fee_type || 'Per Participant',
      ruleBookUrl: row?.ruleBookUrl || '',
      ruleBookFileName: row?.ruleBookFileName || '',
      ruleBookVersion: row?.ruleBookVersion || '',
      ruleBookUpdatedAt: row?.ruleBookUpdatedAt || '',
      ruleBookUpdatedBy: row?.ruleBookUpdatedBy || '',
    };
  }, []);

  const refreshEvents = useCallback(async () => {
    try {
      const res = await api.event.list();
      setEvents((res.events || []).map(mapDbEventToItem));
    } catch {
      setEvents([]);
    }
  }, [mapDbEventToItem]);

  useEffect(() => {
    refreshEvents();
  }, [refreshEvents]);

  const DEFAULT_PARTICIPANT_PHOTO = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80';

  const mapDbParticipantToItem = useCallback((row: any): Participant => {
    const regs: any[] = row.registered_events || [];
    return {
      id: String(row.participant_id),
      casyumId: String(row.casyum_id || ''),
      name: row.full_name || '',
      photo: row.photo || DEFAULT_PARTICIPANT_PHOTO,
      college: row.college || '',
      city: row.city || '',
      department: row.department || '',
      year: row.year_of_study || '',
      registerNumber: row.register_number || '',
      mobile: row.phone || '',
      email: row.email || '',
      gender: (row.gender === 'Male' || row.gender === 'Female' ? row.gender : 'Other') as Participant['gender'],
      studentId: row.student_id || '',
      registeredEvents: regs.map((r: any) => String(r.event_id)),
      paymentStatus: (row.payment_status || 'Pending') as PaymentStatus,
      paymentScreenshotUrl: row.payment_screenshot_url || '',
      transactionId: row.transaction_id || '',
      paymentAmount: Number(row.payment_amount) || 0,
      paymentUploadedTime: row.payment_uploaded_time || '',
      paymentRemarks: row.payment_remarks || '',
      registrationDate: row.created_at || '',
      isDuplicateTransaction: false,
    };
  }, []);

  const refreshParticipants = useCallback(async () => {
    try {
      const res = await api.participant.list();
      setParticipants((res.participants || []).map(mapDbParticipantToItem));
    } catch {
      setParticipants([]);
    }
  }, [mapDbParticipantToItem]);

  useEffect(() => {
    refreshParticipants();
  }, [refreshParticipants]);

  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);

  const [emailLogs, setEmailLogs] = useState<EmailLog[]>([]);
  const [emailLogsLoading, setEmailLogsLoading] = useState(false);
  const [emailStats, setEmailStats] = useState<any>(null);

  const mapDbAnnouncement = (row: any): Announcement => ({
    id: String(row.id),
    title: row.title || '',
    description: row.description || '',
    target: (row.target || 'Entire Symposium') as Announcement['target'],
    targetEventId: row.targetEventId,
    priority: (row.priority || 'Medium') as Announcement['priority'],
    publishDate: row.publish_date || row.created_at || '',
    author: row.author || '',
    status: (row.status || 'Published') as Announcement['status'],
  });

  const mapDbGallery = (row: any): GalleryMedia => ({
    id: String(row.id),
    title: row.title || '',
    type: (row.type || 'image') as GalleryMedia['type'],
    url: row.url || '',
    category: (row.category || 'Highlights') as GalleryMedia['category'],
    isFeatured: row.is_featured === true,
    uploadedDate: String(row.uploaded_date || row.created_at || '').slice(0, 10),
  });

  const mapDbCertificate = (row: any): Certificate => ({
    id: String(row.id),
    participantId: row.participant_id || '',
    participantName: row.participant_name || '',
    college: row.college || '',
    type: (row.type || 'Participation') as Certificate['type'],
    eventName: row.event_name,
    issueDate: row.issue_date || '',
    certificateCode: row.certificate_code || '',
    downloadUrl: row.download_url,
  });

  const mapDbAuditLog = (row: any): AuditLog => ({
    id: String(row.id),
    user: row.user || '',
    role: (row.role || 'Admin') as UserRole,
    action: row.action || '',
    details: row.details || '',
    timestamp: row.timestamp || row.created_at || '',
    ipAddress: row.ip_address || '',
  });

  const mapDbAttendance = (row: any): AttendanceRecord => ({
    id: String(row.id || row.attendance_id),
    participantId: row.participant_id || '',
    participantName: row.participant_name || 'Participant',
    eventId: row.event_id || '',
    eventName: '',
    status: (row.status || 'Absent') as AttendanceStatus,
    timestamp: row.updated_at || row.check_in_time || '',
    checkedBy: row.coordinator_id || 'Coordinator',
  });

  useEffect(() => {
    listGallery()
      .then((res) => setGallery(res.gallery.map(mapDbGallery)))
      .catch(() => setGallery([]));
    listCertificates()
      .then((res) => setCertificates(res.certificates.map(mapDbCertificate)))
      .catch(() => setCertificates([]));
    listAnnouncements()
      .then((rows) => setAnnouncements(rows.map(mapDbAnnouncement)))
      .catch(() => setAnnouncements([]));
    listAuditLogs()
      .then((rows) => setAuditLogs(rows.map(mapDbAuditLog)))
      .catch(() => setAuditLogs([]));
    listAllAttendance()
      .then((rows) => setAttendance(rows.map(mapDbAttendance)))
      .catch(() => setAttendance([]));
  }, []);

  const refreshEmailLogs = useCallback(async () => {
    setEmailLogsLoading(true);
    try {
      const [logsRes, statsRes] = await Promise.all([
        api.email.list({ limit: 100 }),
        api.email.stats(),
      ]);
      setEmailLogs(logsRes.emails);
      setEmailStats(statsRes);
    } catch {
      setEmailLogs([]);
    } finally {
      setEmailLogsLoading(false);
    }
  }, []);

  const resendEmail = useCallback(async (logId: string) => {
    const res = await api.email.resend(logId);
    await refreshEmailLogs();
    return res;
  }, [refreshEmailLogs]);

  const sendTestEmail = useCallback(async (to: string) => {
    const res = await api.email.test(to);
    await refreshEmailLogs();
    return res;
  }, [refreshEmailLogs]);

  const [settings, setSettings] = useState<SystemSettings>(DEFAULT_SETTINGS);

  useEffect(() => {
    readSettings<SystemSettings>(DEFAULT_SETTINGS).then((stored) => {
      setSettings(stored);
      if (stored.admin_profile) {
        setAdminProfile((prev) => ({ ...prev, ...(stored.admin_profile as Partial<AdminProfile>) }));
      }
    }).catch(() => {});
  }, []);

  const [adminProfile, setAdminProfile] = useState<AdminProfile>(() => {
    try {
      const saved = localStorage.getItem('casyum_admin_profile');
      if (saved) return JSON.parse(saved) as AdminProfile;
    } catch { /* ignore */ }
    return {
      name: rbac.user?.name || 'Admin User',
      email: rbac.user?.email || 'admin@casyum.edu',
      role: rbac.user?.role || 'Super Admin',
      phone: rbac.user?.phone || '+91 98765 43210',
      department: rbac.user?.department || 'Computer Applications',
      photo: '',
      lastLogin: new Date().toLocaleString(),
      accountStatus: 'Active',
    };
  });

  const [toasts, setToasts] = useState<ToastData[]>([]);

  const addToast = useCallback((title: string, message: string, type: ToastData['type'], duration?: number) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    setToasts((prev) => [...prev, { id, title, message, type, duration }]);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const updateAdminProfile = useCallback((partial: Partial<AdminProfile>) => {
    setAdminProfile((prev) => {
      const next = { ...prev, ...partial };
      localStorage.setItem('casyum_admin_profile', JSON.stringify(next));
      saveSettings({ admin_profile: next }).catch(() => {});
      return next;
    });
  }, []);

  const [isDarkMode, setIsDarkMode] = useState(() => {
    const saved = localStorage.getItem('casyum_dark_mode');
    return saved ? JSON.parse(saved) : true;
  });

  const toggleDarkMode = () => {
    setIsDarkMode((prev: boolean) => {
      const next = !prev;
      localStorage.setItem('casyum_dark_mode', JSON.stringify(next));
      return next;
    });
  };

  const [selectedParticipant, setSelectedParticipant] = useState<Participant | null>(null);
  const [globalSearchOpen, setGlobalSearchOpen] = useState(false);

  const [notifications, setNotifications] = useState<NotificationItem[]>([]);

  const addCoordinator = async (data: {
    full_name: string;
    email: string;
    phone: string;
    department?: string;
    designation?: string;
    coordinator_type?: string;
    username?: string;
    password?: string;
    role?: string;
    status?: string;
    notes?: string;
    event_ids?: number[];
  }) => {
    try {
      const res = await api.coordinator.create(data);
      setCoordinators((prev) => [res.coordinator, ...prev]);
      logAction('Coordinator Created', `Added coordinator ${res.coordinator.full_name}`);
      pushNotification('Coordinator Added', `${res.coordinator.full_name} has been added. Credentials were sent.`, 'success');
      return res;
    } catch (err: any) {
      pushNotification('Error', err.message || 'Failed to add coordinator', 'error');
      throw err;
    }
  };

  const updateCoordinator = async (id: number, data: Partial<Coordinator> & { password?: string }) => {
    try {
      const res = await api.coordinator.update(id, data);
      setCoordinators((prev) => prev.map((c) => (c.id === id ? res.coordinator : c)));
      logAction('Coordinator Updated', `Updated coordinator ${res.coordinator.full_name}`);
      pushNotification('Coordinator Updated', `${res.coordinator.full_name}'s information has been updated.`, 'info');
    } catch (err: any) {
      pushNotification('Error', err.message || 'Failed to update coordinator', 'error');
      throw err;
    }
  };

  const deleteCoordinator = async (id: number) => {
    try {
      const c = coordinators.find((x) => x.id === id);
      await api.coordinator.delete(id);
      setCoordinators((prev) => prev.filter((x) => x.id !== id));
      logAction('Coordinator Deleted', `Deleted coordinator ${c?.full_name || id}`);
      pushNotification('Coordinator Removed', `${c?.full_name || 'Coordinator'} has been removed.`, 'warning');
    } catch (err: any) {
      pushNotification('Error', err.message || 'Failed to delete coordinator', 'error');
    }
  };

  const addEvent = async (data: Omit<EventItem, 'id' | 'revenue'>) => {
    try {
      await api.event.create({
        name: data.name,
        category: data.category,
        event_type: data.event_type,
        description: data.description,
        venue: data.venue,
        event_date: data.date,
        time: data.time,
        fee: data.fee,
        max_participants: data.maxParticipants,
        status: data.status,
        faculty_coordinator: data.facultyCoordinator,
        student_coordinator: data.studentCoordinator,
        ruleBookUrl: data.ruleBookUrl,
        ruleBookFileName: data.ruleBookFileName,
        ruleBookVersion: data.ruleBookVersion,
        ruleBookUpdatedAt: data.ruleBookUpdatedAt,
        ruleBookUpdatedBy: data.ruleBookUpdatedBy,
        team_event: data.teamEvent === true,
        min_team_size: Number(data.minTeamSize) || 0,
        max_team_size: Number(data.maxTeamSize) || 0,
        team_formation_enabled: data.teamFormationEnabled === true,
        fee_type: data.feeType || 'Per Participant',
      });
      await refreshEvents();
      logAction('Event Created', `Created new event: ${data.name}`);
      pushNotification('Event Added', `${data.name} has been created successfully.`, 'success');
    } catch (err: any) {
      pushNotification('Error', err.message || 'Failed to create event', 'error');
    }
  };

  const updateEvent = async (updated: EventItem) => {
    try {
      await api.event.update(updated.id, {
        name: updated.name,
        category: updated.category,
        event_type: updated.event_type,
        description: updated.description,
        venue: updated.venue,
        event_date: updated.date,
        time: updated.time,
        fee: updated.fee,
        max_participants: updated.maxParticipants,
        status: updated.status,
        faculty_coordinator: updated.facultyCoordinator,
        student_coordinator: updated.studentCoordinator,
        ruleBookUrl: updated.ruleBookUrl,
        ruleBookFileName: updated.ruleBookFileName,
        ruleBookVersion: updated.ruleBookVersion,
        ruleBookUpdatedAt: updated.ruleBookUpdatedAt,
        ruleBookUpdatedBy: updated.ruleBookUpdatedBy,
        team_event: updated.teamEvent === true,
        min_team_size: Number(updated.minTeamSize) || 0,
        max_team_size: Number(updated.maxTeamSize) || 0,
        team_formation_enabled: updated.teamFormationEnabled === true,
        fee_type: updated.feeType || 'Per Participant',
      });
      await refreshEvents();
      logAction('Event Updated', `Updated event: ${updated.name}`);
      pushNotification('Event Updated', `${updated.name} has been updated.`, 'info');
    } catch (err: any) {
      pushNotification('Error', err.message || 'Failed to update event', 'error');
    }
  };

  const deleteEvent = async (id: string) => {
    try {
      const e = events.find((x) => x.id === id);
      await api.event.delete(id);
      setEvents((prev) => prev.filter((x) => x.id !== id));
      logAction('Event Deleted', `Deleted event ${e?.name || id}`);
      pushNotification('Event Removed', `${e?.name || 'Event'} has been deleted.`, 'warning');
    } catch (err: any) {
      pushNotification('Error', err.message || 'Failed to delete event', 'error');
    }
  };

  const logAction = (action: string, details: string) => {
    addAuditLog({
      user: rbac.user?.name || role,
      role: role,
      action,
      details,
      timestamp: new Date().toLocaleString(),
      ip_address: 'N/A',
    }).then(() => {
      listAuditLogs().then((rows) => setAuditLogs(rows.map(mapDbAuditLog))).catch(() => {});
    }).catch(() => {});
    rbac.addActivity(action, details);
  };

  const approvePayment = async (id: string, remarks?: string) => {
    try {
      await api.participant.update(id, {
        payment_status: 'Approved',
        payment_remarks: remarks || 'Approved by admin',
      });
    } catch (err: any) {
      pushNotification('Error', err.message || 'Failed to approve payment', 'error');
      return;
    }
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

  const rejectPayment = async (id: string, remarks: string) => {
    try {
      await api.participant.update(id, {
        payment_status: 'Rejected',
        payment_remarks: remarks,
      });
    } catch (err: any) {
      pushNotification('Error', err.message || 'Failed to reject payment', 'error');
      return;
    }
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

  const addRegistration = async (data: {
    name: string;
    email: string;
    mobile: string;
    college: string;
    city: string;
    department: string;
    year: string;
    gender: 'Male' | 'Female' | 'Other';
    registeredEvents: string[];
  }) => {
    const eventIds = (data.registeredEvents || [])
      .map((e) => {
        const str = String(e);
        const match = str.match(/^evt-(\d+)$/);
        if (match) return parseInt(match[1], 10);
        const num = parseInt(str, 10);
        return Number.isNaN(num) ? 0 : num;
      })
      .filter((n) => n > 0);

    const res = await api.participant.register({
      full_name: data.name,
      email: data.email,
      phone: data.mobile,
      college: data.college,
      city: data.city,
      department: data.department,
      year_of_study: data.year,
      gender: data.gender,
      event_ids: eventIds,
    });
    await refreshParticipants();
    logAction('Registration Created', `Created manual registration for ${data.name}`);
    pushNotification('New Registration', `${data.name} registered for CASYUM 2K26`, 'info');
    return res;
  };

  const updateRegistration = (updated: Participant) => {
    setParticipants((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
    if (selectedParticipant?.id === updated.id) setSelectedParticipant(updated);
    logAction('Registration Updated', `Updated profile data for ${updated.name}`);
  };

  const deleteParticipant = async (id: string) => {
    const p = participants.find((x) => x.id === id);
    try {
      await api.participant.delete(id);
    } catch (err: any) {
      pushNotification('Error', err.message || 'Failed to delete participant', 'error');
    }
    setParticipants((prev) => prev.filter((x) => x.id !== id));
    if (selectedParticipant?.id === id) setSelectedParticipant(null);
    logAction('Participant Deleted', `Deleted participant ${p?.name || id}`);
  };

  const bulkDeleteParticipants = async (ids: string[]) => {
    await Promise.all(ids.map((id) => api.participant.delete(id).catch(() => null)));
    setParticipants((prev) => prev.filter((p) => !ids.includes(p.id)));
    if (selectedParticipant && ids.includes(selectedParticipant.id)) setSelectedParticipant(null);
    logAction('Bulk Delete', `Deleted ${ids.length} participants`);
  };

  const bulkApprovePayments = async (ids: string[]) => {
    await Promise.all(ids.map((id) => api.participant.update(id, { payment_status: 'Approved' }).catch(() => null)));
    setParticipants((prev) =>
      prev.map((p) => (ids.includes(p.id) ? { ...p, paymentStatus: 'Approved' as PaymentStatus } : p))
    );
    logAction('Bulk Payment Approve', `Approved payments for ${ids.length} participants`);
  };

  const toggleEventStatus = async (eventId: string) => {
    const e = events.find((x) => x.id === eventId);
    if (!e) return;
    const nextStatus = e.status === 'Open' ? 'Closed' : 'Open';
    try {
      await api.event.update(eventId, { status: nextStatus });
      await refreshEvents();
      logAction('Event Status Updated', `Changed status of ${e.name} to ${nextStatus}`);
    } catch (err: any) {
      pushNotification('Error', err.message || 'Failed to update event status', 'error');
    }
  };

  const [teamSettingsEventId, setTeamSettingsEventId] = useState<string | null>(null);

  const openTeamSettings = (eventId: string) => {
    setTeamSettingsEventId(String(eventId));
    setActiveTab('Team Settings');
  };

  const closeTeamSettings = () => {
    setTeamSettingsEventId(null);
  };

  const [eventOverviewEventId, setEventOverviewEventId] = useState<string | null>(null);

  const openEventOverview = (eventId: string) => {
    setEventOverviewEventId(String(eventId));
    setActiveTab('Event Overview');
  };

  const closeEventOverview = () => {
    setEventOverviewEventId(null);
  };

  const markAttendance = (participantId: string, eventId: string, status: AttendanceStatus) => {
    const p = participants.find((x) => x.id === participantId);
    const e = events.find((x) => x.id === eventId);
    const existing = attendance.find((a) => a.participantId === participantId && a.eventId === eventId);

    const dbStatus = status === 'Late' ? 'Absent' : status;
    const remarks = status === 'Late' ? 'Late' : '';

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

    upsertAttendance({
      event_id: eventId,
      participant_id: participantId,
      coordinator_id: role,
      status: dbStatus,
      remarks,
    }).catch(() => {});
    logAction('Attendance Marked', `Marked ${p?.name} as ${status} for ${e?.name}`);
  };

  const createAnnouncement = (data: Omit<Announcement, 'id' | 'publishDate'>) => {
    createAnnouncementRow({
      title: data.title,
      description: data.description,
      target: data.target,
      targetEventId: data.targetEventId,
      priority: data.priority,
      author: rbac.user?.name || role,
      status: data.status,
    })
      .then((row) => {
        setAnnouncements((prev) => [mapDbAnnouncement(row), ...prev]);
        logAction('Announcement Published', `Title: ${data.title} (Target: ${data.target})`);
        pushNotification('New Announcement', data.title, 'info');
      })
      .catch(() => {
        pushNotification('Error', 'Failed to publish announcement', 'error');
      });
  };

  const deleteAnnouncement = (id: string) => {
    setAnnouncements((prev) => prev.filter((a) => a.id !== id));
    deleteAnnouncementRow(id).catch(() => {});
    logAction('Announcement Deleted', `Deleted announcement ID ${id}`);
  };

  const uploadGalleryMedia = (item: Omit<GalleryMedia, 'id' | 'uploadedDate'>) => {
    addGalleryMedia({
      title: item.title,
      type: item.type,
      url: item.url,
      category: item.category,
      is_featured: item.isFeatured,
    })
      .then((row) => {
        setGallery((prev) => [mapDbGallery(row), ...prev]);
        logAction('Gallery Media Uploaded', `Uploaded ${item.type}: ${item.title}`);
      })
      .catch(() => {
        pushNotification('Error', 'Failed to upload media', 'error');
      });
  };

  const deleteGalleryMedia = (id: string) => {
    setGallery((prev) => prev.filter((g) => g.id !== id));
    deleteGalleryRow(id).catch(() => {});
    logAction('Gallery Media Deleted', `Deleted media ${id}`);
  };

  const updateSettings = (newSettings: Partial<SystemSettings>) => {
    setSettings((prev) => ({ ...prev, ...newSettings }));
    saveSettings<SystemSettings>(newSettings).catch(() => {});
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
        isDarkMode,
        toggleDarkMode,
        adminProfile,
        updateAdminProfile,
        toasts,
        addToast,
        dismissToast,
        addCoordinator,
        updateCoordinator,
        deleteCoordinator,
        refreshCoordinators,
        emailLogs,
        emailLogsLoading,
        emailStats,
        refreshEmailLogs,
        resendEmail,
        sendTestEmail,
        addEvent,
        updateEvent,
        deleteEvent,
        refreshEvents,
        approvePayment,
        rejectPayment,
        addRegistration,
        refreshParticipants,
        updateRegistration,
        deleteParticipant,
        bulkDeleteParticipants,
        bulkApprovePayments,
        toggleEventStatus,
        teamSettingsEventId,
        openTeamSettings,
        closeTeamSettings,
        eventOverviewEventId,
        openEventOverview,
        closeEventOverview,
        markAttendance,
        createAnnouncement,
        deleteAnnouncement,
        uploadGalleryMedia,
        deleteGalleryMedia,
        updateSettings,
        logAction,
        pushNotification,
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
