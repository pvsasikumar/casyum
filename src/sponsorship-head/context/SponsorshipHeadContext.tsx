import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useRBAC } from '../../rbac/context/RBACContext';
import { readUserRecord, signOut } from '../../services/authService';
import { SPONSORSHIP_HEAD_PORTAL_ROLES } from '../../rbac/constants';
import {
  listSponsorshipEnquiries,
  getSponsorshipEnquiry,
  updateSponsorshipEnquiry,
  assignEnquiryToHead,
  addEnquiryNote,
  approveEnquiryToSponsor,
  readSponsorshipSettings,
  resolveStaffIdentity,
} from '../../services/sponsorshipService';
import type { SponsorshipEnquiry, EnquiryStatus, SponsorshipSettings, Sponsor } from '../../types/sponsorship';
import { ENQUIRY_STATUSES } from '../../types/sponsorship';

interface HeadUser {
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

interface SponsorshipHeadContextType {
  user: HeadUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  logout: () => void;
  enquiries: SponsorshipEnquiry[];
  enquiriesLoading: boolean;
  settings: SponsorshipSettings | null;
  refreshEnquiries: () => Promise<void>;
  updateStatus: (id: string, status: EnquiryStatus) => Promise<void>;
  addNote: (id: string, note: string) => Promise<void>;
  assignToSelf: (id: string) => Promise<void>;
  recommendPackage: (id: string, packageName: string) => Promise<void>;
  approveEnquiry: (id: string, opts: {
    category: string;
    categoryId?: string;
    description: string;
    websiteUrl: string;
    logoUrl: string;
    packageId?: string;
    packageName?: string;
    sponsorshipAmount?: number;
    displayAmount?: boolean;
  }) => Promise<Sponsor>;
  toasts: ToastData[];
  addToast: (title: string, message: string, type: ToastData['type']) => void;
  dismissToast: (id: string) => void;
}

const SponsorshipHeadContext = createContext<SponsorshipHeadContextType | undefined>(undefined);

export const SponsorshipHeadProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const rbac = useRBAC();
  const [user, setUser] = useState<HeadUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [enquiries, setEnquiries] = useState<SponsorshipEnquiry[]>([]);
  const [enquiriesLoading, setEnquiriesLoading] = useState(true);
  const [settings, setSettings] = useState<SponsorshipSettings | null>(null);
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
    if (rbacUser && SPONSORSHIP_HEAD_PORTAL_ROLES.includes(rbacUser.role)) {
      (async () => {
        const record = await readUserRecord(rbacUser.id).catch(() => null);
        setUser({
          id: rbacUser.id,
          user_id: record?.user_id || rbacUser.id,
          name: record?.full_name || rbacUser.name,
          email: record?.email || rbacUser.email,
          phone: record?.phone || rbacUser.phone || '',
          designation: record?.designation || 'Sponsorship Head',
        });
        setIsLoading(false);
      })();
    } else {
      setUser(null);
      setIsLoading(false);
    }
  }, [rbac.isLoading, rbac.user]);

  const refreshEnquiries = useCallback(async () => {
    setEnquiriesLoading(true);
    try {
      const rows = await listSponsorshipEnquiries();
      setEnquiries(rows);
    } catch {
      addToast('Load failed', 'Could not load sponsorship enquiries.', 'error');
    } finally {
      setEnquiriesLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    if (!user) return;
    void refreshEnquiries();
    void readSponsorshipSettings()
      .then(setSettings)
      .catch(() => setSettings(null));
  }, [user, refreshEnquiries]);

  const updateStatus = useCallback(
    async (id: string, status: EnquiryStatus) => {
      if (!ENQUIRY_STATUSES.includes(status)) return;
      const identity = await resolveStaffIdentity(rbac.user?.id || '').catch(() => ({ id: '', name: 'Sponsorship Head' }));
      await updateSponsorshipEnquiry(id, { status, updatedBy: identity.name });
      setEnquiries((prev) => prev.map((e) => (e.id === id ? { ...e, status, updatedAt: new Date().toISOString() } : e)));
    },
    [rbac.user?.id]
  );

  const addNote = useCallback(
    async (id: string, note: string) => {
      if (!note.trim()) return;
      const identity = await resolveStaffIdentity(rbac.user?.id || '').catch(() => ({ id: '', name: 'Sponsorship Head' }));
      await addEnquiryNote(id, note.trim(), identity.name, identity.id);
      const fresh = await getSponsorshipEnquiry(id);
      if (fresh) {
        setEnquiries((prev) => prev.map((e) => (e.id === id ? fresh : e)));
      }
    },
    [rbac.user?.id]
  );

  const assignToSelf = useCallback(
    async (id: string) => {
      const identity = await resolveStaffIdentity(rbac.user?.id || '').catch(() => ({ id: '', name: 'Sponsorship Head' }));
      await assignEnquiryToHead(id, { id: identity.id, name: identity.name });
      setEnquiries((prev) =>
        prev.map((e) => (e.id === id ? { ...e, assignedTo: identity.id, assignedToName: identity.name } : e))
      );
    },
    [rbac.user?.id]
  );

  const recommendPackage = useCallback(
    async (id: string, packageName: string) => {
      const identity = await resolveStaffIdentity(rbac.user?.id || '').catch(() => ({ id: '', name: 'Sponsorship Head' }));
      await updateSponsorshipEnquiry(id, { recommendedPackage: packageName, updatedBy: identity.name });
      setEnquiries((prev) => prev.map((e) => (e.id === id ? { ...e, recommendedPackage: packageName } : e)));
    },
    [rbac.user?.id]
  );

  const approveEnquiry = useCallback(
    async (id: string, opts: {
      category: string;
      categoryId?: string;
      description: string;
      websiteUrl: string;
      logoUrl: string;
      packageId?: string;
      packageName?: string;
      sponsorshipAmount?: number;
      displayAmount?: boolean;
    }) => {
      const identity = await resolveStaffIdentity(rbac.user?.id || '').catch(() => ({ id: '', name: 'Sponsorship Head' }));
      const enquiry = enquiries.find((e) => e.id === id) || (await getSponsorshipEnquiry(id));
      if (!enquiry) throw new Error('Enquiry not found.');
      const sponsor = await approveEnquiryToSponsor(id, {
        companyName: enquiry.companyName,
        logoUrl: opts.logoUrl,
        category: opts.category,
        categoryId: opts.categoryId,
        description: opts.description,
        websiteUrl: opts.websiteUrl,
        displayOrder: 1,
        packageId: opts.packageId,
        packageName: opts.packageName,
        sponsorshipAmount: opts.sponsorshipAmount,
        displayAmount: opts.displayAmount,
        approvedBy: identity.id,
        approvedByName: identity.name,
      });
      setEnquiries((prev) => prev.map((e) => (e.id === id ? { ...e, status: 'Approved' } : e)));
      return sponsor;
    },
    [rbac.user?.id, enquiries]
  );

  const logout = useCallback(() => {
    setUser(null);
    setEnquiries([]);
    setSettings(null);
    void signOut();
  }, []);

  return (
    <SponsorshipHeadContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        logout,
        enquiries,
        enquiriesLoading,
        settings,
        refreshEnquiries,
        updateStatus,
        addNote,
        assignToSelf,
        recommendPackage,
        approveEnquiry,
        toasts,
        addToast,
        dismissToast,
      }}
    >
      {children}
    </SponsorshipHeadContext.Provider>
  );
};

export const useSponsorshipHead = () => {
  const context = useContext(SponsorshipHeadContext);
  if (!context) {
    throw new Error('useSponsorshipHead must be used within a SponsorshipHeadProvider');
  }
  return context;
};
