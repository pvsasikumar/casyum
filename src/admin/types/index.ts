export type UserRole = 'Super Admin' | 'Admin' | 'Event Coordinator' | 'Registration Manager' | 'Registration Team' | 'Certificate Manager' | 'Finance Manager' | 'Participant' | 'Faculty Coordinator' | 'Student Coordinator' | 'casyum_faculty_coordinator';

export type PaymentStatus = 'Approved' | 'Pending' | 'Rejected';
export type AttendanceStatus = 'Present' | 'Absent' | 'Late';
export type PriorityLevel = 'Low' | 'Medium' | 'High' | 'Emergency';
export type CertificateType = 'Participation' | 'Winner' | 'Coordinator' | 'Volunteer';

export interface Participant {
  id: string;
  casyumId?: string;
  name: string;
  photo: string;
  college: string;
  city: string;
  department: string;
  year: string;
  registerNumber: string;
  mobile: string;
  email: string;
  gender: 'Male' | 'Female' | 'Other';
  studentId: string;
  registeredEvents: string[]; // event IDs
  paymentStatus: PaymentStatus;
  paymentScreenshotUrl: string;
  transactionId: string;
  paymentAmount: number;
  paymentUploadedTime: string;
  paymentRemarks?: string;
  registrationDate: string;
  isDuplicateTransaction?: boolean;
}

export interface EventItem {
  id: string;
  name: string;
  category: 'Technical' | 'Non-Technical' | 'Workshop' | 'Gaming';
  event_type?: 'regular' | 'gaming';
  tagline: string;
  description: string;
  iconName: string;
  bannerImage: string;
  venue: string;
  time: string;
  date: string;
  fee: number;
  maxParticipants: number;
  registeredCount: number;
  facultyCoordinator: string;
  studentCoordinator: string;
  status: 'Open' | 'Closed' | 'Full';
  revenue: number;
  rules: string[];
  teamEvent?: boolean;
  minTeamSize?: number;
  maxTeamSize?: number;
  teamFormationEnabled?: boolean;
  feeType?: string;
  ruleBookUrl?: string;
  ruleBookFileName?: string;
  ruleBookVersion?: string;
  ruleBookUpdatedAt?: string;
  ruleBookUpdatedBy?: string;
}

export interface AttendanceRecord {
  id: string;
  participantId: string;
  participantName: string;
  eventId: string;
  eventName: string;
  status: AttendanceStatus;
  timestamp: string;
  checkedBy: string;
}

export interface Announcement {
  id: string;
  title: string;
  description: string;
  target: 'Entire Symposium' | 'Specific Event' | 'Selected Participants';
  targetEventId?: string;
  priority: PriorityLevel;
  publishDate: string;
  author: string;
  status: 'Published' | 'Draft' | 'Archived';
}

export interface Certificate {
  id: string;
  participantId: string;
  participantName: string;
  college: string;
  type: CertificateType;
  eventName?: string;
  issueDate: string;
  certificateCode: string;
  downloadUrl?: string;
}

export interface GalleryMedia {
  id: string;
  title: string;
  type: 'image' | 'video';
  url: string;
  category: 'Highlights' | 'Ceremony' | 'Hackathon' | 'Winners';
  isFeatured: boolean;
  uploadedDate: string;
}

export interface CoordinatorAssignedEvent {
  id: number;
  event_id: string;
  name: string;
  category: string;
  description?: string;
  venue: string;
  event_date: string;
  time: string;
  fee?: number;
  max_participants?: number;
  registered_count?: number;
  status?: string;
}

export interface Coordinator {
  id: number;
  coordinator_id: string;
  full_name: string;
  email: string;
  phone: string;
  department: string;
  designation?: string;
  coordinator_type: string;
  username: string;
  role?: string;
  status: 'Active' | 'Inactive';
  notes: string;
  created_at: string;
  updated_at: string;
  assigned_events?: CoordinatorAssignedEvent[];
}

export interface AuditLog {
  id: string;
  user: string;
  role: UserRole;
  action: string;
  details: string;
  timestamp: string;
  ipAddress: string;
}

export interface SystemSettings {
  symposiumName: string;
  tagline: string;
  registrationStatus: 'Open' | 'Closed' | 'Maintenance';
  registrationFee: number;
  upiId: string;
  upiQrUrl: string;
  countdownTarget: string;
  homepageBanner: string;
  contactEmail: string;
  contactPhone: string;
  socialLinks: {
    instagram?: string;
    twitter?: string;
    linkedin?: string;
    youtube?: string;
  };
  sponsors: Array<{ name: string; logo: string; tier: 'Title' | 'Platinum' | 'Gold' }>;
  admin_profile?: Record<string, unknown>;
}

export interface CoordinatorAccount {
  id: string;
  email: string;
  password: string;
  coordinatorId: string;
  name: string;
  department: string;
  phone: string;
}

export type ActiveTabModule =
  | 'Dashboard'
  | 'CMS'
  | 'Registrations'
  | 'Events'
  | 'Event Overview'
  | 'Event Cards'
  | 'Payments'
  | 'Payment Settings'
  | 'Communication Settings'
  | 'Attendance'
  | 'Analytics'
  | 'Export Center'
  | 'Event Export'
  | 'Announcements'
  | 'Gallery'
  | 'Certificates'
  | 'Coordinators'
  | 'Registration Team'
  | 'CASYUM Faculty Coordinators'
  | 'Observers'
  | 'Participants'
  | 'Settings'
  | 'Audit Logs'
  | 'Employees'
  | 'Email Logs'
  | 'Results'
  | 'Sponsors'
  | 'Sponsorship Enquiries'
  | 'Teams'
  | 'Team Settings';

export interface EmailLog {
  id: string;
  log_id: string;
  recipient: string;
  recipient_name: string;
  subject: string;
  email_type: string;
  status: 'Pending' | 'Sent' | 'Failed';
  sent_at: string | null;
  error_message: string | null;
  attempts: number;
  meta: any;
  created_at: string;
  updated_at: string;
}
