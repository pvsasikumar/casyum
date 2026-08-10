import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  runTransaction,
} from 'firebase/firestore';
import { getDb } from '../firebase/firestore';
import { now } from './helpers';
import { readUserRecord } from './authService';
import {
  DEFAULT_SPONSORSHIP_SETTINGS,
  DEFAULT_TARIFF,
  type Sponsor,
  type SponsorCategory,
  type SponsorPackage,
  type SponsorshipEnquiry,
  type SponsorshipSettings,
  type SponsorStatus,
  type SponsorApprovalStatus,
  type EnquiryStatus,
  type EnquiryInternalNote,
} from '../types/sponsorship';
import { SPONSORSHIP_HEAD_ROLE } from '../rbac/constants';
import { isStorageConfigured } from '../firebase/firebase';

const SPONSORS = 'sponsors';
const CATEGORIES = 'sponsorCategories';
const PACKAGES = 'sponsorPackages';
const ENQUIRIES = 'sponsorshipEnquiries';
const SETTINGS_DOC = 'sponsorship';

function sortByDisplayOrder<T>(rows: T[]): T[] {
  return [...rows].sort((a, b) => {
    const ao = Number((a as any).displayOrder ?? 0);
    const bo = Number((b as any).displayOrder ?? 0);
    if (ao !== bo) return ao - bo;
    return String((a as any).name || (a as any).id).localeCompare(String((b as any).name || (b as any).id));
  });
}

function mapSponsor(id: string, data: any): Sponsor {
  return {
    id,
    name: data.name || '',
    logoUrl: data.logoUrl || '',
    category: data.category || '',
    categoryId: data.categoryId || undefined,
    description: data.description || '',
    websiteUrl: data.websiteUrl || '',
    displayOrder: Number(data.displayOrder ?? 0),
    status: (data.status || 'Inactive') as SponsorStatus,
    approvalStatus: (data.approvalStatus || 'Pending') as SponsorApprovalStatus,
    packageId: data.packageId || undefined,
    packageName: data.packageName || undefined,
    logoSize: data.logoSize || undefined,
    displayAmount: data.displayAmount === true,
    sponsorshipAmount: data.sponsorshipAmount !== undefined ? Number(data.sponsorshipAmount) : undefined,
    approvedBy: data.approvedBy || undefined,
    approvedByName: data.approvedByName || undefined,
    approvedAt: data.approvedAt || undefined,
    createdBy: data.createdBy || '',
    createdAt: data.createdAt || '',
    updatedAt: data.updatedAt || '',
  };
}

function mapCategory(id: string, data: any): SponsorCategory {
  return {
    id,
    name: data.name || '',
    displayOrder: Number(data.displayOrder ?? 0),
    status: (data.status || 'Active') as SponsorStatus,
    createdAt: data.createdAt || '',
    updatedAt: data.updatedAt || '',
  };
}

function mapPackage(id: string, data: any): SponsorPackage {
  return {
    id,
    name: data.name || '',
    category: data.category || '',
    minBudget: Number(data.minBudget ?? 0),
    agreedBudget: data.agreedBudget !== undefined ? Number(data.agreedBudget) : undefined,
    displayPriority: Number(data.displayPriority ?? 0),
    logoSize: (data.logoSize || 'medium') as SponsorPackage['logoSize'],
    displayLocations: Array.isArray(data.displayLocations) ? data.displayLocations : [],
    benefits: Array.isArray(data.benefits) ? data.benefits : [],
    description: data.description || '',
    status: (data.status || 'Active') as SponsorStatus,
    createdAt: data.createdAt || '',
    updatedAt: data.updatedAt || '',
  };
}

function mapEnquiry(id: string, data: any): SponsorshipEnquiry {
  return {
    id,
    companyName: data.companyName || '',
    contactPerson: data.contactPerson || '',
    designation: data.designation || '',
    email: data.email || '',
    phone: data.phone || '',
    website: data.website || '',
    categoryInterest: data.categoryInterest || '',
    packageInterest: data.packageInterest || '',
    budget: data.budget || '',
    message: data.message || '',
    howDidYouHear: data.howDidYouHear || '',
    status: (data.status || 'New') as EnquiryStatus,
    assignedTo: data.assignedTo || '',
    assignedToName: data.assignedToName || '',
    internalNotes: Array.isArray(data.internalNotes) ? data.internalNotes : [],
    recommendedPackage: data.recommendedPackage || '',
    submittedAt: data.submittedAt || '',
    updatedAt: data.updatedAt || '',
    updatedBy: data.updatedBy || '',
  };
}

async function queryAll<T>(collectionName: string, mapper: (id: string, data: any) => T): Promise<T[]> {
  const db = getDb();
  const snap = await getDocs(collection(db, collectionName));
  return snap.docs.map((d) => mapper(d.id, d.data()));
}

/* ------------------------------------------------------------------ */
/* Sponsor Categories                                                  */
/* ------------------------------------------------------------------ */

export async function listSponsorCategories(): Promise<SponsorCategory[]> {
  const rows = await queryAll(CATEGORIES, mapCategory);
  return sortByDisplayOrder(rows);
}

export async function createSponsorCategory(data: {
  name: string;
  displayOrder: number;
  status: SponsorStatus;
}): Promise<SponsorCategory> {
  const db = getDb();
  const payload = {
    name: data.name.trim(),
    displayOrder: Number(data.displayOrder ?? 0),
    status: data.status || 'Active',
    createdAt: now(),
    updatedAt: now(),
  };
  const ref = await addDoc(collection(db, CATEGORIES), payload);
  return mapCategory(ref.id, payload);
}

export async function updateSponsorCategory(id: string, data: Partial<SponsorCategory>): Promise<void> {
  const db = getDb();
  const patch: Record<string, any> = { ...data, updatedAt: now() };
  Object.keys(patch).forEach((k) => {
    if (patch[k] === undefined) delete patch[k];
  });
  if (typeof patch.displayOrder === 'string') patch.displayOrder = Number(patch.displayOrder);
  await updateDoc(doc(db, CATEGORIES, id), patch);
}

export async function deleteSponsorCategory(id: string): Promise<void> {
  const db = getDb();
  await deleteDoc(doc(db, CATEGORIES, id));
}

/* ------------------------------------------------------------------ */
/* Sponsors                                                            */
/* ------------------------------------------------------------------ */

export async function listSponsors(): Promise<Sponsor[]> {
  const rows = await queryAll(SPONSORS, mapSponsor);
  return sortByDisplayOrder(rows);
}

/** Active + approved sponsors, as shown to participants. */
export async function listActiveSponsors(): Promise<Sponsor[]> {
  const rows = await listSponsors();
  return sortByDisplayOrder(
    rows.filter(
      (s) => s.status === 'Active' && s.approvalStatus === 'Approved'
    )
  );
}

export async function getSponsor(id: string): Promise<Sponsor | null> {
  const db = getDb();
  const snap = await getDoc(doc(db, SPONSORS, id));
  return snap.exists() ? mapSponsor(snap.id, snap.data()) : null;
}

export type SponsorInput = Omit<
  Sponsor,
  'id' | 'createdAt' | 'updatedAt' | 'createdBy' | 'approvedBy' | 'approvedByName' | 'approvedAt'
>;

export async function createSponsor(
  data: Partial<SponsorInput> & {
    createdBy?: string;
    approvedBy?: string;
    approvedByName?: string;
    approvedAt?: string;
  },
  opts: { approved?: boolean } = {}
): Promise<Sponsor> {
  const db = getDb();
  const payload: Record<string, any> = {
    name: (data.name || '').trim(),
    logoUrl: data.logoUrl || '',
    category: data.category || '',
    categoryId: data.categoryId || '',
    description: data.description || '',
    websiteUrl: data.websiteUrl || '',
    displayOrder: Number(data.displayOrder ?? 0),
    status: data.status || 'Inactive',
    approvalStatus: opts.approved ? 'Approved' : (data.approvalStatus || 'Pending'),
    packageId: data.packageId || '',
    packageName: data.packageName || '',
    logoSize: data.logoSize || 'medium',
    displayAmount: data.displayAmount === true,
    sponsorshipAmount: data.sponsorshipAmount !== undefined ? Number(data.sponsorshipAmount) : 0,
    approvedBy: data.approvedBy || '',
    approvedByName: data.approvedByName || '',
    approvedAt: opts.approved ? now() : (data.approvedAt || ''),
    createdBy: data.createdBy || '',
    createdAt: now(),
    updatedAt: now(),
  };
  const ref = await addDoc(collection(db, SPONSORS), payload);
  return mapSponsor(ref.id, payload);
}

export async function updateSponsor(id: string, data: Partial<Sponsor>): Promise<void> {
  const db = getDb();
  const patch: Record<string, any> = { ...data, updatedAt: now() };
  Object.keys(patch).forEach((k) => {
    if (patch[k] === undefined || patch[k] === null) delete patch[k];
  });
  if (typeof patch.displayOrder === 'string') patch.displayOrder = Number(patch.displayOrder);
  await updateDoc(doc(db, SPONSORS, id), patch);
}

export async function deleteSponsor(id: string): Promise<void> {
  const db = getDb();
  await deleteDoc(doc(db, SPONSORS, id));
}

/** Swap the display order of two sponsors. */
export async function reorderSponsors(aId: string, aOrder: number, bId: string, bOrder: number): Promise<void> {
  const db = getDb();
  await runTransaction(db, async (tx) => {
    tx.update(doc(db, SPONSORS, aId), { displayOrder: bOrder, updatedAt: now() });
    tx.update(doc(db, SPONSORS, bId), { displayOrder: aOrder, updatedAt: now() });
  });
}

/* ------------------------------------------------------------------ */
/* Sponsor Packages                                                    */
/* ------------------------------------------------------------------ */

export async function listSponsorPackages(): Promise<SponsorPackage[]> {
  const rows = await queryAll(PACKAGES, mapPackage);
  return sortByDisplayOrder(rows);
}

export async function createSponsorPackage(data: Partial<SponsorPackage>): Promise<SponsorPackage> {
  const db = getDb();
  const payload: Record<string, any> = {
    name: (data.name || '').trim(),
    category: data.category || '',
    minBudget: Number(data.minBudget ?? 0),
    agreedBudget: data.agreedBudget !== undefined ? Number(data.agreedBudget) : 0,
    displayPriority: Number(data.displayPriority ?? 0),
    logoSize: data.logoSize || 'medium',
    displayLocations: Array.isArray(data.displayLocations) ? data.displayLocations : [],
    benefits: Array.isArray(data.benefits) ? data.benefits : [],
    description: data.description || '',
    status: data.status || 'Active',
    createdAt: now(),
    updatedAt: now(),
  };
  const ref = await addDoc(collection(db, PACKAGES), payload);
  return mapPackage(ref.id, payload);
}

export async function updateSponsorPackage(id: string, data: Partial<SponsorPackage>): Promise<void> {
  const db = getDb();
  const patch: Record<string, any> = { ...data, updatedAt: now() };
  Object.keys(patch).forEach((k) => {
    if (patch[k] === undefined || patch[k] === null) delete patch[k];
  });
  if (typeof patch.minBudget === 'string') patch.minBudget = Number(patch.minBudget);
  if (typeof patch.agreedBudget === 'string') patch.agreedBudget = Number(patch.agreedBudget);
  if (typeof patch.displayPriority === 'string') patch.displayPriority = Number(patch.displayPriority);
  await updateDoc(doc(db, PACKAGES, id), patch);
}

export async function deleteSponsorPackage(id: string): Promise<void> {
  const db = getDb();
  await deleteDoc(doc(db, PACKAGES, id));
}

/* ------------------------------------------------------------------ */
/* Sponsorship Enquiries                                               */
/* ------------------------------------------------------------------ */

export async function listSponsorshipEnquiries(): Promise<SponsorshipEnquiry[]> {
  const rows = await queryAll(ENQUIRIES, mapEnquiry);
  return rows.sort((a, b) => String(b.submittedAt || '').localeCompare(String(a.submittedAt || '')));
}

export async function getSponsorshipEnquiry(id: string): Promise<SponsorshipEnquiry | null> {
  const db = getDb();
  const snap = await getDoc(doc(db, ENQUIRIES, id));
  return snap.exists() ? mapEnquiry(snap.id, snap.data()) : null;
}

export interface EnquiryInput {
  companyName: string;
  contactPerson: string;
  designation: string;
  email: string;
  phone: string;
  website?: string;
  categoryInterest?: string;
  packageInterest?: string;
  budget?: string;
  message?: string;
  howDidYouHear?: string;
}

export async function createSponsorshipEnquiry(data: EnquiryInput): Promise<SponsorshipEnquiry> {
  const db = getDb();
  const payload: Record<string, any> = {
    companyName: (data.companyName || '').trim(),
    contactPerson: (data.contactPerson || '').trim(),
    designation: (data.designation || '').trim(),
    email: (data.email || '').trim(),
    phone: (data.phone || '').trim(),
    website: (data.website || '').trim(),
    categoryInterest: (data.categoryInterest || '').trim(),
    packageInterest: (data.packageInterest || '').trim(),
    budget: (data.budget || '').trim(),
    message: (data.message || '').trim(),
    howDidYouHear: (data.howDidYouHear || '').trim(),
    status: 'New',
    assignedTo: '',
    assignedToName: '',
    internalNotes: [],
    recommendedPackage: '',
    submittedAt: now(),
    updatedAt: now(),
    updatedBy: '',
  };
  const ref = await addDoc(collection(db, ENQUIRIES), payload);
  return mapEnquiry(ref.id, payload);
}

export async function updateSponsorshipEnquiry(id: string, data: Partial<SponsorshipEnquiry>): Promise<void> {
  const db = getDb();
  const patch: Record<string, any> = { ...data, updatedAt: now() };
  Object.keys(patch).forEach((k) => {
    if (patch[k] === undefined) delete patch[k];
  });
  await updateDoc(doc(db, ENQUIRIES, id), patch);
}

export async function assignEnquiryToHead(
  id: string,
  head: { id: string; name: string }
): Promise<void> {
  const db = getDb();
  await updateDoc(doc(db, ENQUIRIES, id), {
    assignedTo: head.id,
    assignedToName: head.name,
    updatedAt: now(),
  });
}

export async function addEnquiryNote(id: string, note: string, author: string, authorId: string): Promise<void> {
  const db = getDb();
  const entry: EnquiryInternalNote = {
    id: `note-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    note,
    author,
    authorId,
    createdAt: now(),
  };
  const snap = await getDoc(doc(db, ENQUIRIES, id));
  const existing: EnquiryInternalNote[] = snap.exists() && Array.isArray(snap.data()?.internalNotes)
    ? (snap.data().internalNotes as EnquiryInternalNote[])
    : [];
  await updateDoc(doc(db, ENQUIRIES, id), {
    internalNotes: [...existing, entry],
    updatedAt: now(),
  });
}

export async function deleteSponsorshipEnquiry(id: string): Promise<void> {
  const db = getDb();
  await deleteDoc(doc(db, ENQUIRIES, id));
}

/**
 * Approve an enquiry and create the public sponsor profile in a single
 * transaction. Returns the created sponsor.
 */
export async function approveEnquiryToSponsor(
  enquiryId: string,
  data: {
    companyName: string;
    logoUrl: string;
    category: string;
    categoryId?: string;
    description: string;
    websiteUrl: string;
    displayOrder: number;
    packageId?: string;
    packageName?: string;
    sponsorshipAmount?: number;
    displayAmount?: boolean;
    approvedBy: string;
    approvedByName: string;
  }
): Promise<Sponsor> {
  const db = getDb();
  const sponsorRef = doc(collection(db, SPONSORS));
  const enquiryRef = doc(db, ENQUIRIES, enquiryId);
  const createdAt = now();

  await runTransaction(db, async (tx) => {
    const enquirySnap = await tx.get(enquiryRef);
    if (!enquirySnap.exists()) {
      throw new Error('Enquiry not found.');
    }
    tx.set(sponsorRef, {
      name: data.companyName.trim(),
      logoUrl: data.logoUrl || '',
      category: data.category || '',
      categoryId: data.categoryId || '',
      description: data.description || '',
      websiteUrl: data.websiteUrl || '',
      displayOrder: Number(data.displayOrder ?? 0),
      status: 'Active',
      approvalStatus: 'Approved',
      packageId: data.packageId || '',
      packageName: data.packageName || '',
      logoSize: 'medium',
      displayAmount: data.displayAmount === true,
      sponsorshipAmount: data.sponsorshipAmount !== undefined ? Number(data.sponsorshipAmount) : 0,
      approvedBy: data.approvedBy || '',
      approvedByName: data.approvedByName || '',
      approvedAt: createdAt,
      createdBy: data.approvedBy || '',
      createdAt,
      updatedAt: createdAt,
    });
    tx.update(enquiryRef, {
      status: 'Approved',
      updatedAt: createdAt,
      updatedBy: data.approvedByName || '',
    });
  });

  const snap = await getDoc(sponsorRef);
  return mapSponsor(snap.id, snap.data());
}

/* ------------------------------------------------------------------ */
/* Sponsorship settings (tariff + sponsorship head)                    */
/* ------------------------------------------------------------------ */

export async function readSponsorshipSettings(): Promise<SponsorshipSettings> {
  const db = getDb();
  const snap = await getDoc(doc(db, 'settings', SETTINGS_DOC));
  const defaults = DEFAULT_SPONSORSHIP_SETTINGS;
  if (!snap.exists()) return defaults;
  const data = snap.data();
  return {
    ...defaults,
    ...data,
    tariff: {
      ...DEFAULT_TARIFF,
      ...(data.tariff && typeof data.tariff === 'object' ? data.tariff : {}),
    },
    sponsorshipHead: {
      ...defaults.sponsorshipHead,
      ...(data.sponsorshipHead && typeof data.sponsorshipHead === 'object' ? data.sponsorshipHead : {}),
    },
  };
}

export async function saveSponsorshipSettings(partial: Partial<SponsorshipSettings>): Promise<void> {
  const db = getDb();
  await setDoc(doc(db, 'settings', SETTINGS_DOC), partial, { merge: true });
}

/** Staff members who can act as the designated Sponsorship Head. */
export async function listSponsorshipHeads(): Promise<{ id: string; name: string; email: string; phone: string }[]> {
  const db = getDb();
  const snap = await getDocs(collection(db, 'users'));
  const heads: { id: string; name: string; email: string; phone: string }[] = [];
  for (const d of snap.docs) {
    const data = d.data();
    if (data.role === SPONSORSHIP_HEAD_ROLE && data.status !== 'Inactive') {
      heads.push({
        id: d.id,
        name: data.full_name || data.name || 'Sponsorship Head',
        email: data.email || '',
        phone: data.phone || '',
      });
    }
  }
  return heads;
}

/** Resolve the currently signed-in staff user's id + name. */
export async function resolveStaffIdentity(uid: string): Promise<{ id: string; name: string }> {
  const record = await readUserRecord(uid).catch(() => null);
  return { id: uid, name: record?.full_name || 'Admin' };
}

export { isStorageConfigured };
