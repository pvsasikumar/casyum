import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Search,
  Bell,
  Menu,
  CheckCircle2,
  AlertTriangle,
  Info,
  X,
  User,
  Moon,
  Sun,
  Lock,
  Settings,
  LogOut,
} from 'lucide-react';
import { useAdmin } from '../../context/AdminContext';
import { useRBAC } from '../../../rbac/context/RBACContext';
import { ConfirmationDialog } from '../../components/common/ConfirmationDialog';

interface TopNavProps {
  onOpenMobileSidebar: () => void;
  onExitAdmin: () => void;
}

export const TopNav: React.FC<TopNavProps> = ({ onOpenMobileSidebar, onExitAdmin }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const {
    activeTab,
    isDarkMode,
    toggleDarkMode,
    notifications,
    markNotificationRead,
    clearNotifications,
    setGlobalSearchOpen,
    adminProfile,
  } = useAdmin();
  const { role } = useRBAC();

  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [logoutDialogOpen, setLogoutDialogOpen] = useState(false);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const displayTabName = activeTab === 'Coordinators' ? 'Event Coordinators' : activeTab;

  return (
    <header className="w-full h-16 bg-black/60 backdrop-blur-md border-b border-white/10 px-4 sm:px-6 flex items-center justify-between relative z-20 select-none">
      {/* Left Title & Mobile Menu */}
      <div className="flex items-center gap-3">
        <button
          onClick={onOpenMobileSidebar}
          className="lg:hidden p-2 rounded-lg text-white/70 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 cursor-pointer"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex flex-col">
          <h1 className="text-base sm:text-lg font-bold font-display text-white tracking-tight flex items-center gap-2">
            <span>{displayTabName}</span>
            <span className="hidden sm:inline-block text-[10px] font-mono font-semibold px-2 py-0.5 rounded-md bg-violet-500/20 text-violet-300 border border-violet-500/30">
              v2.6 ERP
            </span>
          </h1>
          <span className="text-[10px] text-white/40 hidden sm:block">
            CASYUM 2K26 · SRM IST Dept of Computer Applications
          </span>
        </div>
      </div>

      {/* Right Actions */}
      <div className="flex items-center gap-2 sm:gap-4">
        {/* Global Search */}
        <button
          onClick={() => setGlobalSearchOpen(true)}
          className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/50 hover:text-white text-xs transition-all cursor-pointer"
        >
          <Search className="w-3.5 h-3.5 text-violet-400" />
          <span className="hidden md:inline">Search...</span>
          <kbd className="hidden md:inline-block px-1.5 py-0.5 text-[9px] font-mono bg-white/10 rounded border border-white/20 text-white/70">
            ⌘K
          </kbd>
        </button>

        {/* Dark/Light Mode Toggle */}
        <button
          onClick={toggleDarkMode}
          className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/70 hover:text-white transition-all cursor-pointer"
          title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
        >
          {isDarkMode ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
        </button>

        {/* Notification Bell */}
        <div className="relative">
          <button
            onClick={() => setNotificationsOpen(!notificationsOpen)}
            className="relative p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/70 hover:text-white transition-all cursor-pointer"
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-rose-500 text-white text-[9px] font-extrabold flex items-center justify-center animate-bounce shadow-md">
                {unreadCount}
              </span>
            )}
          </button>

          {notificationsOpen && (
            <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 bg-zinc-950 border border-white/15 rounded-2xl shadow-2xl z-50 overflow-hidden backdrop-blur-2xl">
              <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-white/5">
                <span className="text-xs font-bold text-white uppercase tracking-wider">
                  Notifications ({notifications.length})
                </span>
                {notifications.length > 0 && (
                  <button onClick={clearNotifications} className="text-[10px] text-violet-400 hover:text-violet-300 cursor-pointer">
                    Clear All
                  </button>
                )}
              </div>

              <div className="max-h-72 overflow-y-auto divide-y divide-white/5">
                {notifications.length === 0 ? (
                  <div className="p-6 text-center text-xs text-white/40">No notifications</div>
                ) : (
                  notifications.map((n) => (
                    <div
                      key={n.id}
                      onClick={() => markNotificationRead(n.id)}
                      className={`p-3 transition-all cursor-pointer flex gap-3 ${
                        n.read ? 'opacity-60 bg-transparent' : 'bg-violet-500/5 hover:bg-violet-500/10'
                      }`}
                    >
                      <div className="mt-0.5">
                        {n.type === 'warning' && <AlertTriangle className="w-4 h-4 text-amber-400" />}
                        {n.type === 'error' && <X className="w-4 h-4 text-rose-400" />}
                        {n.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
                        {n.type === 'info' && <Info className="w-4 h-4 text-cyan-400" />}
                      </div>
                      <div className="flex-1 flex flex-col gap-0.5">
                        <span className="text-xs font-bold text-white">{n.title}</span>
                        <span className="text-[11px] text-white/60 leading-snug">{n.message}</span>
                        <span className="text-[9px] text-white/30 mt-1">{n.time}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Admin Profile Dropdown */}
        <div className="relative">
          <button
            onClick={() => setProfileMenuOpen(!profileMenuOpen)}
            className="flex items-center gap-2.5 pl-2 border-l border-white/10 cursor-pointer"
          >
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-violet-500 to-cyan-400 p-[1px]">
              <div className="w-full h-full bg-zinc-900 rounded-full flex items-center justify-center text-white overflow-hidden">
                {adminProfile.photo ? (
                  <img src={adminProfile.photo} alt="" className="w-full h-full object-cover" />
                ) : (
                  <User className="w-4 h-4 text-violet-300" />
                )}
              </div>
            </div>
          </button>

          {profileMenuOpen && (
            <div className="absolute right-0 top-full mt-2 w-52 bg-zinc-950 border border-white/15 rounded-2xl shadow-2xl p-2 z-50 backdrop-blur-2xl">
              <div className="flex flex-col gap-1">
                <div className="px-2.5 py-2 border-b border-white/10 mb-1">
                  <span className="text-xs font-bold text-white">{adminProfile.name}</span>
                  <span className="text-[10px] text-white/40 block">{adminProfile.email}</span>
                  {role && (
                    <span className="mt-1 inline-block px-2 py-0.5 rounded bg-violet-500/20 text-violet-400 border border-violet-500/30 text-[9px] font-semibold">
                      {role}
                    </span>
                  )}
                </div>
                <button onClick={() => { setProfileMenuOpen(false); navigate('/admin/profile'); }} className={`flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-xs font-medium transition-all cursor-pointer w-full text-left ${location.pathname === '/admin/profile' ? 'text-violet-400 bg-violet-500/10' : 'text-white/60 hover:text-white hover:bg-white/5'}`}>
                  <User className="w-3.5 h-3.5" />
                  <span>My Profile</span>
                </button>
                <button onClick={() => { setProfileMenuOpen(false); navigate('/admin/change-password'); }} className={`flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-xs font-medium transition-all cursor-pointer w-full text-left ${location.pathname === '/admin/change-password' ? 'text-violet-400 bg-violet-500/10' : 'text-white/60 hover:text-white hover:bg-white/5'}`}>
                  <Lock className="w-3.5 h-3.5" />
                  <span>Change Password</span>
                </button>
                <button onClick={() => { setProfileMenuOpen(false); navigate('/admin/settings'); }} className={`flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-xs font-medium transition-all cursor-pointer w-full text-left ${location.pathname === '/admin/settings' ? 'text-violet-400 bg-violet-500/10' : 'text-white/60 hover:text-white hover:bg-white/5'}`}>
                  <Settings className="w-3.5 h-3.5" />
                  <span>Settings</span>
                </button>
                <div className="border-t border-white/10 mt-1 pt-1">
                  <button onClick={() => { setProfileMenuOpen(false); setLogoutDialogOpen(true); }} className="flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-xs font-medium text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 transition-all cursor-pointer w-full text-left">
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Logout</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        <ConfirmationDialog
          open={logoutDialogOpen}
          title="Logout"
          message="Are you sure you want to logout?"
          confirmLabel="Logout"
          cancelLabel="Cancel"
          variant="danger"
          onConfirm={() => {
            setLogoutDialogOpen(false);
            onExitAdmin();
          }}
          onCancel={() => setLogoutDialogOpen(false)}
        />
      </div>
    </header>
  );
};
