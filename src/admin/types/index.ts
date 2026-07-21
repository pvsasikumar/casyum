export type UserRole = 'Super Admin' | 'Faculty Coordinator' | 'Student Coordinator' | 'Event Coordinator';

export type PaymentStatus = 'Approved' | 'Pending' | 'Rejected';
export type AttendanceStatus = 'Present' | 'Absent' | 'Late';
export type PriorityLevel = 'Low' | 'Medium' | 'High' | 'Emergency';
export type CertificateType = 'Participation' | 'Winner' | 'Coordinator' | 'Volunteer';

export interface Participant {
  id: string;
  name: string;
  photo: string;
  college: string;
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

export interface Coordinator {
  id: string;
  name: string;
  email: string;
  phone: string;
  type: 'Faculty' | 'Student' | 'Event';
  department: string;
  assignedEventId?: string;
  assignedEventName?: string;
  permissions: {
    viewParticipants: boolean;
    manageAttendance: boolean;
    uploadResults: boolean;
    announcements: boolean;
  };
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
  sponsors: Array<{ name: string; logo: string; tier: 'Title' | 'Platinum' | 'Gold' }>;
}

export type ActiveTabModule =
  | 'Dashboard'
  | 'Registrations'
  | 'Events'
  | 'Payments'
  | 'Attendance'
  | 'Analytics'
  | 'Export Center'
  | 'Announcements'
  | 'Gallery'
  | 'Certificates'
  | 'Coordinators'
  | 'Settings'
  | 'Audit Logs';
