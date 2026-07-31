import { useRBAC } from '../context/RBACContext';
import type { Permission } from '../types';

export function usePermission() {
  const { hasPermission, hasAnyPermission, hasAllPermissions } = useRBAC();
  return { can: hasPermission, canAny: hasAnyPermission, canAll: hasAllPermissions };
}

export function useRequirePermission(permission: Permission): boolean {
  const { hasPermission } = useRBAC();
  return hasPermission(permission);
}
