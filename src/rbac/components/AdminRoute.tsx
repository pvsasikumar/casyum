import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import type { UserRole } from '../types';
import { useRBAC } from '../context/RBACContext';
import { SUPER_ADMIN_ROLE, COORDINATOR_PORTAL_ROLES } from '../constants';

interface AdminRouteProps {
  roles: UserRole[];
  children: React.ReactNode;
}

export const AdminRoute: React.FC<AdminRouteProps> = ({ roles, children }) => {
  const { isAuthenticated, role, isLoading } = useRBAC();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-violet-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated || !role) {
    return <Navigate to="/admin/login" replace state={{ from: location.pathname }} />;
  }

  if (roles.includes(role)) {
    return <>{children}</>;
  }

  if (role === SUPER_ADMIN_ROLE) {
    return <Navigate to="/admin/dashboard" replace />;
  }

  if (COORDINATOR_PORTAL_ROLES.includes(role)) {
    return <Navigate to="/coordinator/dashboard" replace />;
  }

  return <Navigate to="/admin/login" replace state={{ unauthorized: true }} />;
};
