import React from 'react';
import type { Permission } from '../types';
import { useRBAC } from '../context/RBACContext';

interface WithPermissionProps {
  permission: Permission;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export const WithPermission: React.FC<WithPermissionProps> = ({
  permission,
  children,
  fallback = null,
}) => {
  const { hasPermission } = useRBAC();

  if (!hasPermission(permission)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
};

interface WithAnyPermissionProps {
  permissions: Permission[];
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export const WithAnyPermission: React.FC<WithAnyPermissionProps> = ({
  permissions,
  children,
  fallback = null,
}) => {
  const { hasAnyPermission } = useRBAC();

  if (!hasAnyPermission(permissions)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
};
