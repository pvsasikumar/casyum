import type { UserRole } from '../rbac/types';
import type { ReportScope } from './types';

/**
 * Roles authorized to open the Reports / Export module. Every portal still
 * gates the route with its own AdminRoute roles and the sidebar permission
 * (`reports.view`) — this list is the shared allow-list used by the report
 * page itself.
 */
export const REPORT_ROLES: UserRole[] = [
  'Super Admin',
  'Admin',
  'casyum_faculty_coordinator',
  'Event Coordinator',
  'Coordinator',
  'Event Coordinator (Student)',
  'Event Coordinator (Faculty)',
  'Observer',
  'Registration Team',
  'Registration Manager',
];

export function canAccessReports(role: UserRole | null | undefined): boolean {
  if (!role) return false;
  return REPORT_ROLES.includes(role);
}

/**
 * Coordinator-family roles are scoped to their assigned events. Firestore
 * rules already deny them registrations for other events; this keeps the UI
 * (and the queries the client issues) inside the same boundary so URL or
 * state manipulation cannot widen it.
 */
export function isEventScopedRole(role: UserRole): boolean {
  return (
    role === 'Event Coordinator' ||
    role === 'Coordinator' ||
    role === 'Event Coordinator (Student)' ||
    role === 'Event Coordinator (Faculty)'
  );
}

export function resolveScope(role: UserRole, assignedEventIds: string[]): ReportScope {
  if (isEventScopedRole(role)) {
    return { mode: 'assigned', eventIds: assignedEventIds.map(String).filter(Boolean) };
  }
  return { mode: 'full' };
}
