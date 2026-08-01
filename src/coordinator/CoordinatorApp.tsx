import React from 'react';
import { Navigate } from 'react-router-dom';
import { CoordinatorProvider, useCoordinator } from './context/CoordinatorContext';
import { CoordinatorDashboard } from './CoordinatorDashboard';

const CoordinatorContent: React.FC = () => {
  const { isAuthenticated, isLoading } = useCoordinator();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-violet-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/admin/login" replace />;
  }

  return <CoordinatorDashboard />;
};

export const CoordinatorApp: React.FC = () => {
  return (
    <CoordinatorProvider>
      <CoordinatorContent />
    </CoordinatorProvider>
  );
};
