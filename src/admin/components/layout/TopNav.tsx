import React, { useState } from 'react';
import {
  Search,
  Bell,
  Menu,
  Shield,
  CheckCircle2,
  AlertTriangle,
  Info,
  X,
  User,
  Sliders,
} from 'lucide-react';
import { useAdmin } from '../../context/AdminContext';
import type { UserRole } from '../../types';

interface TopNavProps {
  onOpenMobileSidebar: () => void;
}

export const TopNav: React.FC<TopNavProps> = ({ onOpenMobileSidebar }) => {
  const {
    activeTab,
    role,
    setRole,
    notifications,
    markNotificationRead,
    clearNotifications,
    setGlobalSearchOpen,
  } = useAdmin();

  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [roleMenuOpen, setRoleMenuOpen] = useState(false);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const rolesList: UserRole[] = [
    'Super Admin',
    'Faculty Coordinator',
    'Student Coordinator',
    'Event Coordinator',
  ];

  return (
    <header className="w-full h-16 bg-black/60 backdrop-blur-md border-b border-white/10 px-4 sm:px-6 flex items-center justify-between relative z-20 select-none">
      {/* Left Title & Mobile Menu Trigger */}
      <div className="flex items-center gap-3">
        <button
          onClick={onOpenMobileSidebar}
          className="lg:hidden p-2 rounded-lg text-white/70 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex flex-col">
          <h1 className="text-base sm:text-lg font-bold font-display text-white tracking-tight flex items-center gap-2">
            <span>{activeTab}</span>
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
        {/* Global Search Button */}
        <button
          onClick={() => setGlobalSearchOpen(true)}
          className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/50 hover:text-white text-xs transition-all cursor-pointer"
        >
          <Search className="w-3.5 h-3.5 text-violet-400" />
          <span className="hidden md:inline">Search ERP...</span>
          <kbd className="hidden md:inline-block px-1.5 py-0.5 text-[9px] font-mono bg-white/10 rounded border border-white/20 text-white/70">
            ⌘K
          </kbd>
        </button>

        {/* Role Switcher */}
        <div className="relative">
          <button
            onClick={() => setRoleMenuOpen(!roleMenuOpen)}
            className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-violet-500/10 hover:bg-violet-500/20 border border-violet-500/30 text-violet-300 text-xs font-semibold transition-all cursor-pointer"
          >
            <Shield className="w-3.5 h-3.5 text-violet-400" />
            <span className="hidden sm:inline">{role}</span>
            <Sliders className="w-3 h-3 text-violet-400/70" />
          </button>

          {roleMenuOpen && (
            <div className="absolute right-0 top-full mt-2 w-52 bg-zinc-950 border border-white/15 rounded-2xl shadow-2xl p-2 z-50 backdrop-blur-2xl">
              <div className="text-[10px] font-bold text-white/40 uppercase tracking-widest px-2 py-1.5 border-b border-white/10">
                Switch User Role
              </div>
              <div className="flex flex-col gap-1 mt-1">
                {rolesList.map((r) => (
                  <button
                    key={r}
                    onClick={() => {
                      setRole(r);
                      setRoleMenuOpen(false);
                    }}
                    className={`flex items-center justify-between px-2.5 py-2 rounded-xl text-xs font-medium transition-all ${
                      role === r
                        ? 'bg-violet-600/30 text-white border border-violet-500/40'
                        : 'text-white/60 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    <span>{r}</span>
                    {role === r && <CheckCircle2 className="w-3.5 h-3.5 text-violet-400" />}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

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
                  <button
                    onClick={clearNotifications}
                    className="text-[10px] text-violet-400 hover:text-violet-300 cursor-pointer"
                  >
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

        {/* User Profile Avatar */}
        <div className="flex items-center gap-2.5 pl-2 border-l border-white/10">
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-violet-500 to-cyan-400 p-[1px]">
            <div className="w-full h-full bg-zinc-900 rounded-full flex items-center justify-center text-white">
              <User className="w-4 h-4 text-violet-300" />
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
