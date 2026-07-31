import React from 'react';
import { CoordinatorProvider, useCoordinator } from './context/CoordinatorContext';
import { CoordinatorLogin } from './CoordinatorLogin';
import { CoordinatorDashboard } from './CoordinatorDashboard';

interface CoordinatorAppProps {
  onBack: () => void;
}

const CoordinatorContent: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const { isAuthenticated, isLoading } = useCoordinator();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-violet-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <CoordinatorLogin onBack={onBack} />;
  }

  return <CoordinatorDashboard />;
};

export const CoordinatorApp: React.FC<CoordinatorAppProps> = ({ onBack }) => {
  return (
    <CoordinatorProvider>
      <CoordinatorContent onBack={onBack} />
    </CoordinatorProvider>
  );
};
