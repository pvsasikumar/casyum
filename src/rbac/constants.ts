import type { UserRole, Permission, RolePermission, PermissionDomain } from './types';

export const ALL_ROLES: UserRole[] = [
  'Super Admin',
  'Admin',
  'Event Coordinator',
  'Coordinator',
  'Event Coordinator (Student)',
  'Event Coordinator (Faculty)',
  'Registration Manager',
  'Registration Team',
  'Certificate Manager',
  'Finance Manager',
  'casyum_faculty_coordinator',
];

export const ROLE_LABELS: Record<UserRole, string> = {
  'Super Admin': 'Super Admin',
  'Admin': 'Admin',
  'Event Coordinator': 'Event Coordinator',
  'Coordinator': 'Coordinator',
  'Event Coordinator (Student)': 'Event Coordinator (Student)',
  'Event Coordinator (Faculty)': 'Event Coordinator (Faculty)',
  'Registration Manager': 'Registration Manager',
  'Registration Team': 'Registration Team',
  'Certificate Manager': 'Certificate Manager',
  'Finance Manager': 'Finance Manager',
  'Participant': 'Participant',
  'casyum_faculty_coordinator': 'CASYUM Faculty Coordinator',
};

export const SUPER_ADMIN_ROLE: UserRole = 'Super Admin';

export const REGISTRATION_TEAM_ROLE: UserRole = 'Registration Team';

export const CASYUM_FACULTY_COORDINATOR_ROLE: UserRole = 'casyum_faculty_coordinator';

export const ADMIN_PORTAL_ROLES: UserRole[] = [
  'Super Admin',
  'Event Coordinator (Student)',
  'Event Coordinator (Faculty)',
];

export const COORDINATOR_PORTAL_ROLES: UserRole[] = [
  'Event Coordinator (Student)',
  'Event Coordinator (Faculty)',
];

export const REGISTRATION_TEAM_PORTAL_ROLES: UserRole[] = ['Registration Team'];

export const CASYUM_FACULTY_PORTAL_ROLES: UserRole[] = [CASYUM_FACULTY_COORDINATOR_ROLE];

export const STAFF_PORTAL_ROLES: UserRole[] = [
  ...ADMIN_PORTAL_ROLES,
  ...REGISTRATION_TEAM_PORTAL_ROLES,
  ...CASYUM_FACULTY_PORTAL_ROLES,
];

export const ROLE_HIERARCHY: Record<UserRole, number> = {
  'Super Admin': 0,
  'Admin': 1,
  'Event Coordinator': 2,
  'Coordinator': 2,
  'Event Coordinator (Student)': 2,
  'Event Coordinator (Faculty)': 2,
  'Registration Manager': 3,
  'Registration Team': 3,
  'Certificate Manager': 4,
  'Finance Manager': 5,
  'Participant': 6,
  'casyum_faculty_coordinator': 2,
};

const all = (domain: PermissionDomain): Permission[] => [
  `${domain}.view`,
  `${domain}.create`,
  `${domain}.edit`,
  `${domain}.delete`,
  `${domain}.export`,
] as Permission[];

export const ROLE_PERMISSIONS: RolePermission[] = [
  {
    role: 'Super Admin',
    permissions: [
      ...all('dashboard'),
      ...all('events'),
      ...all('participants'),
      ...all('registrations'),
      ...all('attendance'),
      ...all('certificates'),
      ...all('reports'),
      ...all('payments'),
      ...all('settings'),
      ...all('export'),
      ...all('admins'),
      ...all('employees'),
      ...all('coordinators'),
      ...all('registration_team'),
      ...all('casyum_faculty_coordinators'),
      ...all('verification'),
      ...all('announcements'),
      ...all('gallery'),
      ...all('activity_logs'),
      ...all('emails'),
      ...all('results'),
      ...all('profile'),
      'payments.verify',
      'payments.refund',
      'registrations.approve',
      'registrations.reject',
      'settings.manage',
      'coordinators.assign',
    ],
  },
  {
    role: 'Admin',
    permissions: [
      'dashboard.view',
      'events.view',
      'events.create',
      'events.edit',
      'events.delete',
      'participants.view',
      'registrations.view',
      'attendance.view',
      'reports.view',
      'reports.export',
      'export.view',
      'export.export',
      'announcements.view',
      'announcements.create',
      'announcements.edit',
      'announcements.delete',
      'coordinators.assign',
      'emails.view',
      'emails.create',
      'profile.view',
      'profile.edit',
    ],
  },
  {
    role: 'Event Coordinator',
    permissions: [
      'dashboard.view',
      'events.view',
      'participants.view',
      'registrations.view',
      'attendance.view',
      'attendance.create',
      'attendance.edit',
      'reports.view',
      'profile.view',
      'profile.edit',
    ],
  },
  {
    role: 'Registration Manager',
    permissions: [
      'dashboard.view',
      'registrations.view',
      'registrations.create',
      'registrations.edit',
      'registrations.approve',
      'registrations.reject',
      'payments.view',
      'payments.verify',
      'participants.view',
      'participants.edit',
      'reports.view',
      'reports.export',
      'export.view',
      'export.export',
      'profile.view',
      'profile.edit',
    ],
  },
  {
    role: 'Registration Team',
    permissions: [
      'dashboard.view',
      'participants.view',
      'participants.edit',
      'registrations.view',
      'verification.view',
      'verification.edit',
      'verification.create',
      'reports.view',
      'reports.export',
      'export.view',
      'export.export',
      'profile.view',
      'profile.edit',
    ],
  },
  {
    role: 'Certificate Manager',
    permissions: [
      'dashboard.view',
      'certificates.view',
      'certificates.create',
      'certificates.edit',
      'certificates.delete',
      'certificates.generate',
      'certificates.reissue',
      'reports.view',
      'reports.export',
      'export.view',
      'export.export',
      'profile.view',
      'profile.edit',
    ],
  },
  {
    role: 'Finance Manager',
    permissions: [
      'dashboard.view',
      'payments.view',
      'payments.edit',
      'payments.verify',
      'payments.refund',
      'reports.view',
      'reports.export',
      'export.view',
      'export.export',
      'profile.view',
      'profile.edit',
    ],
  },
  {
    role: 'Coordinator',
    permissions: [
      'dashboard.view',
      'events.view',
      'participants.view',
      'registrations.view',
      'attendance.view',
      'attendance.create',
      'attendance.edit',
      'reports.view',
      'profile.view',
      'profile.edit',
    ],
  },
  {
    role: 'Event Coordinator (Student)',
    permissions: [
      'dashboard.view',
      'events.view',
      'participants.view',
      'registrations.view',
      'attendance.view',
      'attendance.create',
      'attendance.edit',
      'reports.view',
      'profile.view',
      'profile.edit',
    ],
  },
  {
    role: 'Event Coordinator (Faculty)',
    permissions: [
      'dashboard.view',
      'events.view',
      'participants.view',
      'registrations.view',
      'attendance.view',
      'attendance.create',
      'attendance.edit',
      'reports.view',
      'profile.view',
      'profile.edit',
    ],
  },
  {
    role: 'casyum_faculty_coordinator',
    permissions: [
      'dashboard.view',
      'events.view',
      'participants.view',
      'registrations.view',
      'registrations.approve',
      'registrations.reject',
      'payments.view',
      'payments.verify',
      'payments.reject',
      'verification.view',
      'attendance.view',
      'reports.view',
      'reports.export',
      'export.view',
      'export.export',
      'profile.view',
      'profile.edit',
    ],
  },
  {
    role: 'Participant',
    permissions: [
      'profile.view',
      'profile.edit',
      'events.view',
      'registrations.view',
      'registrations.create',
      'attendance.view',
      'certificates.view',
    ],
  },
];

export function getPermissionsForRole(role: UserRole): Permission[] {
  const entry = ROLE_PERMISSIONS.find((rp) => rp.role === role);
  return entry?.permissions ?? [];
}

export function hasPermission(role: UserRole, permission: Permission): boolean {
  return getPermissionsForRole(role).includes(permission);
}

export function canAccessModule(role: UserRole, moduleName: string): boolean {
  const domain = moduleName.toLowerCase().replace(/\s+/g, '_') as any;
  const perm = `${domain}.view` as Permission;
  return hasPermission(role, perm);
}
