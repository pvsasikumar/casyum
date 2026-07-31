import React from 'react';
import { ShieldOff, ArrowLeft } from 'lucide-react';

interface AccessDeniedProps {
  onBack?: () => void;
}

export const AccessDenied: React.FC<AccessDeniedProps> = ({ onBack }) => {
  return (
    <div className="flex items-center justify-center min-h-[60vh] p-8">
      <div className="flex flex-col items-center gap-6 text-center max-w-md">
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20">
          <ShieldOff className="w-12 h-12 text-rose-400" />
        </div>
        <div className="flex flex-col gap-2">
          <h2 className="text-xl font-bold text-white">Access Denied</h2>
          <p className="text-sm text-white/60 leading-relaxed">
            You do not have the required permissions to access this page. Please contact your administrator if you believe this is a mistake.
          </p>
        </div>
        {onBack && (
          <button
            onClick={onBack}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/70 hover:text-white text-xs font-bold transition-all cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Go Back
          </button>
        )}
      </div>
    </div>
  );
};
