export type UserRole =
  | 'Super Admin'
  | 'Admin'
  | 'Event Coordinator'
  | 'Coordinator'
  | 'Event Coordinator (Student)'
  | 'Event Coordinator (Faculty)'
  | 'Registration Manager'
  | 'Certificate Manager'
  | 'Finance Manager'
  | 'Participant';

export type PermissionAction = 'view' | 'create' | 'edit' | 'delete' | 'export' | 'approve' | 'reject' | 'verify' | 'refund' | 'assign' | 'generate' | 'reissue' | 'manage';

export type PermissionDomain =
  | 'dashboard'
  | 'events'
  | 'participants'
  | 'registrations'
  | 'attendance'
  | 'certificates'
  | 'reports'
  | 'payments'
  | 'settings'
  | 'export'
  | 'admins'
  | 'employees'
  | 'coordinators'
  | 'announcements'
  | 'gallery'
  | 'activity_logs'
  | 'emails'
  | 'profile';

export type Permission = `${PermissionDomain}.${PermissionAction}`;

export interface RolePermission {
  role: UserRole;
  permissions: Permission[];
}

export interface Employee {
  id: string;
  name: string;
  email: string;
  phone: string;
  department: string;
  role: UserRole;
  status: 'Active' | 'Suspended' | 'Inactive';
  lastLogin: string;
  createdDate: string;
  password?: string;
}

export interface UserActivity {
  id: string;
  userId: string;
  userName: string;
  userRole: UserRole;
  action: string;
  details: string;
  timestamp: string;
  ipAddress?: string;
}

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  token: string;
  department?: string;
  phone?: string;
  is_first_login?: boolean;
}
