import React from 'react';
import { User } from 'lucide-react';
import { ComingSoon } from '../components/ComingSoon';

export const ProfilePage: React.FC = () => {
  return (
    <div className="min-h-screen bg-black text-white selection:bg-violet-500/30 selection:text-violet-200">
      <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
        <ComingSoon
          icon={User}
          title="Profile"
          description="Coordinator profile management is coming soon."
        />
      </div>
    </div>
  );
};
