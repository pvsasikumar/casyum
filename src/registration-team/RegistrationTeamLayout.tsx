import React, { useEffect, useState } from 'react';
import { Navigate, NavLink, Outlet, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  ScanLine,
  User,
  LogOut,
  Sparkles,
  ChevronRight,
} from 'lucide-react';
import { useRegistrationTeam } from './context/RegistrationTeamContext';

const PAGE_TITLES: Record<string, string> = {
  dashboard: 'Dashboard',
  verify: 'Participant Verification',
  profile: 'Profile',
};

const NAV_ITEMS = [
  { to: '/registration-team/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/registration-team/verify', label: 'Participant Verification', icon: ScanLine },
  { to: '/registration-team/profile', label: 'Profile', icon: User },
];

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  `flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-bold transition-all whitespace-nowrap ${
    isActive
      ? 'bg-violet-500/15 text-violet-300 border border-violet-500/30'
      : 'text-white/50 hover:text-white hover:bg-white/5 border border-transparent'
  }`;

export const RegistrationTeamLayout: React.FC = () => {
  const { user, isAuthenticated, isLoading, logout } = useRegistrationTeam();
  const location = useLocation();
  const [logoutDialogOpen, setLogoutDialogOpen] = useState(false);

  const segment = location.pathname.split('/').filter(Boolean).pop() || 'dashboard';
  const pageTitle = PAGE_TITLES[segment] || 'Dashboard';

  useEffect(() => {
    document.title = `CASYUM Registration Desk — ${pageTitle}`;
  }, [pageTitle]);

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

  return (
    <div className="min-h-screen bg-black text-white selection:bg-violet-500/30 selection:text-violet-200">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-50 bg-black/80 backdrop-blur-md border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-violet-600 to-cyan-400 p-[1px] shadow-[0_0_15px_rgba(139,92,246,0.3)]">
              <div className="w-full h-full bg-black rounded-[11px] flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-violet-400" />
              </div>
            </div>
            <div className="flex flex-col">
              <span className="font-extrabold font-display text-white text-sm leading-none">
                CASYUM <span className="text-violet-400">Registration</span>
              </span>
              <span className="text-[9px] text-white/40 tracking-widest uppercase mt-0.5">
                Desk Portal
              </span>
            </div>
          </div>

          {/* Shared Navigation */}
          <nav className="hidden lg:flex items-center gap-1">
            {NAV_ITEMS.map((item) => (
              <NavLink key={item.to} to={item.to} className={navLinkClass}>
                <item.icon className="w-3.5 h-3.5" />
                <span>{item.label}</span>
              </NavLink>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/5 border border-white/10">
              <User className="w-3.5 h-3.5 text-violet-400" />
              <span className="text-[11px] font-semibold text-white/80">{user?.name}</span>
            </div>
            <button
              onClick={() => setLogoutDialogOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-[11px] font-bold hover:bg-rose-500/20 transition-all cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        <div className="lg:hidden border-t border-white/10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 overflow-x-auto">
            <div className="flex items-center gap-1 py-2 w-max">
              {NAV_ITEMS.map((item) => (
                <NavLink key={item.to} to={item.to} className={navLinkClass}>
                  <item.icon className="w-3.5 h-3.5" />
                  <span>{item.label}</span>
                </NavLink>
              ))}
            </div>
          </div>
        </div>
      </header>

      {/* Breadcrumb */}
      <div className="border-b border-white/5 bg-black/40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center gap-2 text-[11px]">
          <span className="text-white/40">Registration Desk</span>
          <ChevronRight className="w-3 h-3 text-white/30" />
          <span className="text-violet-400 font-bold">{pageTitle}</span>
        </div>
      </div>

      {/* Outlet for child routes */}
      <main>
        <Outlet />
      </main>

      {/* Logout Confirmation */}
      {logoutDialogOpen && (
        <div className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-zinc-950 border border-white/20 rounded-3xl p-6 shadow-2xl flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-rose-500/20 text-rose-400">
                <LogOut className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold font-display text-white">Logout</h3>
            </div>
            <p className="text-sm text-white/70">Are you sure you want to logout from the Registration Desk Portal?</p>
            <div className="flex items-center justify-end gap-3 mt-2">
              <button
                onClick={() => setLogoutDialogOpen(false)}
                className="px-4 py-2 rounded-xl text-white/60 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => { logout(); }}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold cursor-pointer"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
