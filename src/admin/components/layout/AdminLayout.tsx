import React, { useState } from 'react';
import { Sidebar } from './Sidebar';
import { TopNav } from './TopNav';
import { GlobalSearchModal } from './GlobalSearchModal';
import { X } from 'lucide-react';

interface AdminLayoutProps {
  children: React.ReactNode;
  onExitAdmin: () => void;
}

export const AdminLayout: React.FC<AdminLayoutProps> = ({ children, onExitAdmin }) => {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  return (
    <div className="w-full h-screen bg-black text-white font-sans flex overflow-hidden selection:bg-violet-500/30 selection:text-violet-200">
      {/* Desktop Left Sidebar */}
      <div className="hidden lg:block h-full flex-shrink-0">
        <Sidebar onExitAdmin={onExitAdmin} />
      </div>

      {/* Mobile Sidebar Overlay Drawer */}
      {mobileSidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-black/80 backdrop-blur-md"
            onClick={() => setMobileSidebarOpen(false)}
          />
          <div className="relative z-10 w-72 h-full bg-black border-r border-white/10">
            <button
              onClick={() => setMobileSidebarOpen(false)}
              className="absolute top-4 right-4 p-2 rounded-lg text-white/60 hover:text-white bg-white/5 border border-white/10"
            >
              <X className="w-4 h-4" />
            </button>
            <Sidebar onCloseMobile={() => setMobileSidebarOpen(false)} onExitAdmin={onExitAdmin} />
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 h-full flex flex-col min-w-0 overflow-hidden bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-purple-950/20 via-black to-black">
        {/* Top Navbar */}
        <TopNav onOpenMobileSidebar={() => setMobileSidebarOpen(true)} />

        {/* Dynamic Module Page View */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8 custom-scrollbar relative">
          {children}
        </main>
      </div>

      {/* Global Search Modal */}
      <GlobalSearchModal />
    </div>
  );
};
