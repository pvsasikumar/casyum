export type SponsorStatus = 'Active' | 'Inactive';

export type SponsorApprovalStatus = 'Approved' | 'Pending' | 'Rejected' | 'Under Review';

export type SponsorLogoSize = 'small' | 'medium' | 'large';

export interface Sponsor {
  id: string;
  name: string;
  logoUrl: string;
  category: string;
  categoryId?: string;
  description: string;
  websiteUrl: string;
  displayOrder: number;
  status: SponsorStatus;
  approvalStatus: SponsorApprovalStatus;
  packageId?: string;
  packageName?: string;
  logoSize?: SponsorLogoSize;
  displayAmount: boolean;
  sponsorshipAmount?: number;
  approvedBy?: string;
  approvedByName?: string;
  approvedAt?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface SponsorCategory {
  id: string;
  name: string;
  displayOrder: number;
  status: SponsorStatus;
  createdAt: string;
  updatedAt: string;
}

export interface SponsorPackage {
  id: string;
  name: string;
  category: string;
  minBudget: number;
  agreedBudget?: number;
  displayPriority: number;
  logoSize: SponsorLogoSize;
  displayLocations: string[];
  benefits: string[];
  description: string;
  status: SponsorStatus;
  createdAt: string;
  updatedAt: string;
}

export type EnquiryStatus =
  | 'New'
  | 'Contacted'
  | 'Under Review'
  | 'Negotiation'
  | 'Approved'
  | 'Rejected'
  | 'Closed';

export interface EnquiryInternalNote {
  id: string;
  note: string;
  author: string;
  authorId: string;
  createdAt: string;
}

export interface SponsorshipEnquiry {
  id: string;
  companyName: string;
  contactPerson: string;
  designation: string;
  email: string;
  phone: string;
  website: string;
  categoryInterest: string;
  packageInterest: string;
  budget: string;
  message: string;
  howDidYouHear: string;
  status: EnquiryStatus;
  assignedTo: string;
  assignedToName: string;
  internalNotes: EnquiryInternalNote[];
  recommendedPackage: string;
  submittedAt: string;
  updatedAt: string;
  updatedBy: string;
}

export interface SponsorshipTariff {
  pdfUrl: string;
  fileName: string;
  enabled: boolean;
  updatedAt: string;
  updatedBy: string;
}

export interface SponsorshipHeadInfo {
  name: string;
  designation: string;
  email: string;
  phone: string;
  /** Whether the head's contact details may be shown publicly. */
  showContactPublicly?: boolean;
}

export interface SponsorshipSettings {
  tariff: SponsorshipTariff;
  sponsorshipHead?: SponsorshipHeadInfo;
  updatedAt: string;
  updatedBy: string;
}

export const DEFAULT_SPONSOR_CATEGORIES: string[] = [
  'Title Sponsor',
  'Powered By',
  'Presenting Sponsor',
  'Gold Sponsor',
  'Silver Sponsor',
  'Bronze Sponsor',
  'Associate Sponsor',
  'Media Partner',
  'Education Partner',
  'Technology Partner',
  'Community Partner',
];

export const ENQUIRY_STATUSES: EnquiryStatus[] = [
  'New',
  'Contacted',
  'Under Review',
  'Negotiation',
  'Approved',
  'Rejected',
  'Closed',
];

export const DEFAULT_TARIFF: SponsorshipTariff = {
  pdfUrl: '',
  fileName: '',
  enabled: false,
  updatedAt: '',
  updatedBy: '',
};

export const DEFAULT_SPONSORSHIP_SETTINGS: SponsorshipSettings = {
  tariff: { ...DEFAULT_TARIFF },
  sponsorshipHead: {
    name: '',
    designation: 'Sponsorship Head',
    email: '',
    phone: '',
    showContactPublicly: false,
  },
  updatedAt: '',
  updatedBy: '',
};

export const DEFAULT_SPONSOR_PACKAGES: SponsorPackage[] = [
  {
    id: 'pkg-title',
    name: 'Title Sponsor',
    category: 'Title Sponsor',
    minBudget: 100000,
    displayPriority: 1,
    logoSize: 'large',
    displayLocations: ['Hero placement', 'Sponsor showcase', 'Website link', 'Stage branding'],
    benefits: ['Largest logo placement', 'Hero showcase priority', 'Website link', 'Stage banner', 'Social media promotion', 'Announcements'],
    description: 'Highest visibility package for CASYUM 2026.',
    status: 'Active',
    createdAt: '',
    updatedAt: '',
  },
  {
    id: 'pkg-gold',
    name: 'Gold Sponsor',
    category: 'Gold Sponsor',
    minBudget: 50000,
    displayPriority: 4,
    logoSize: 'large',
    displayLocations: ['Sponsor showcase', 'Website link'],
    benefits: ['Large logo', 'Sponsor showcase', 'Website link', 'Social media promotion'],
    description: 'High visibility sponsorship package.',
    status: 'Active',
    createdAt: '',
    updatedAt: '',
  },
  {
    id: 'pkg-silver',
    name: 'Silver Sponsor',
    category: 'Silver Sponsor',
    minBudget: 30000,
    displayPriority: 5,
    logoSize: 'medium',
    displayLocations: ['Sponsor showcase'],
    benefits: ['Standard logo', 'Sponsor showcase'],
    description: 'Medium visibility sponsorship package.',
    status: 'Active',
    createdAt: '',
    updatedAt: '',
  },
  {
    id: 'pkg-bronze',
    name: 'Bronze Sponsor',
    category: 'Bronze Sponsor',
    minBudget: 15000,
    displayPriority: 6,
    logoSize: 'small',
    displayLocations: ['Sponsor showcase'],
    benefits: ['Smaller logo', 'Sponsor showcase'],
    description: 'Standard visibility sponsorship package.',
    status: 'Active',
    createdAt: '',
    updatedAt: '',
  },
];
