import React from 'react';
import type { UserRole, Permission } from '../types';
import { useRBAC } from '../context/RBACContext';
import { AccessDenied } from './AccessDenied';

interface ProtectedRouteProps {
  children: React.ReactNode;
  roles?: UserRole[];
  permissions?: Permission[];
  fallback?: React.ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  roles,
  permissions,
  fallback,
}) => {
  const { isAuthenticated, role, hasAllPermissions } = useRBAC();

  if (!isAuthenticated) {
    return fallback ? <>{fallback}</> : null;
  }

  if (roles && role && !roles.includes(role)) {
    return fallback ? <>{fallback}</> : <AccessDenied />;
  }

  if (permissions && permissions.length > 0 && !hasAllPermissions(permissions)) {
    return fallback ? <>{fallback}</> : <AccessDenied />;
  }

  return <>{children}</>;
};
