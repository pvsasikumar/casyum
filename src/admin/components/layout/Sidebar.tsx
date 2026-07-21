import React from 'react';
import {
  LayoutDashboard,
  Users,
  Calendar,
  CreditCard,
  CheckSquare,
  BarChart3,
  Download,
  Megaphone,
  Image as ImageIcon,
  Award,
  UserCheck,
  Settings,
  ShieldAlert,
  LogOut,
  Sparkles,
  ChevronRight,
} from 'lucide-react';
import type { ActiveTabModule } from '../../types';
import { useAdmin } from '../../context/AdminContext';

interface SidebarProps {
  onCloseMobile?: () => void;
  onExitAdmin: () => void;
}

interface NavItemConfig {
  name: ActiveTabModule;
  icon: React.ElementType;
  badge?: string | number;
}

export const Sidebar: React.FC<SidebarProps> = ({ onCloseMobile, onExitAdmin }) => {
  const { activeTab, setActiveTab, participants, announcements } = useAdmin();

  const pendingPaymentsCount = participants.filter((p) => p.paymentStatus === 'Pending').length;

  const navItems: NavItemConfig[] = [
    { name: 'Dashboard', icon: LayoutDashboard },
    { name: 'Registrations', icon: Users, badge: participants.length },
    { name: 'Events', icon: Calendar },
    { name: 'Payments', icon: CreditCard, badge: pendingPaymentsCount > 0 ? pendingPaymentsCount : undefined },
    { name: 'Attendance', icon: CheckSquare },
    { name: 'Analytics', icon: BarChart3 },
    { name: 'Export Center', icon: Download },
    { name: 'Announcements', icon: Megaphone, badge: announcements.length },
    { name: 'Gallery', icon: ImageIcon },
    { name: 'Certificates', icon: Award },
    { name: 'Coordinators', icon: UserCheck },
    { name: 'Settings', icon: Settings },
    { name: 'Audit Logs', icon: ShieldAlert },
  ];

  return (
    <aside className="w-64 h-full bg-black/80 backdrop-blur-xl border-r border-white/10 flex flex-col justify-between p-4 select-none relative z-30">
      {/* Brand Header */}
      <div className="flex flex-col gap-6">
        <div className="flex items-center gap-3 px-2 pt-2">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-violet-600 via-purple-500 to-cyan-400 p-[1px] shadow-[0_0_15px_rgba(167,139,250,0.4)]">
            <div className="w-full h-full bg-black rounded-[11px] flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-violet-400 animate-pulse" />
            </div>
          </div>
          <div className="flex flex-col">
            <span className="font-extrabold font-display tracking-tight text-white text-base leading-none">
              CASYUM <span className="text-violet-400">ERP</span>
            </span>
            <span className="text-[10px] text-white/40 tracking-widest uppercase mt-1">Event SaaS Admin</span>
          </div>
        </div>

        {/* Section Navigation List */}
        <nav className="flex flex-col gap-1 overflow-y-auto max-h-[calc(100vh-220px)] pr-1 custom-scrollbar">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.name;

            return (
              <button
                key={item.name}
                onClick={() => {
                  setActiveTab(item.name);
                  onCloseMobile?.();
                }}
                className={`group relative flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all duration-200 cursor-pointer ${
                  isActive
                    ? 'bg-gradient-to-r from-violet-600/30 to-indigo-600/20 text-white border border-violet-500/40 shadow-[0_0_15px_rgba(139,92,246,0.2)]'
                    : 'text-white/60 hover:text-white hover:bg-white/5 border border-transparent'
                }`}
              >
                {/* Active Indicator Bar */}
                {isActive && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-violet-400 rounded-r-full shadow-[0_0_10px_#a78bfa]" />
                )}

                <div className="flex items-center gap-3">
                  <Icon
                    className={`w-4 h-4 transition-transform duration-200 ${
                      isActive ? 'text-violet-400 scale-110' : 'text-white/40 group-hover:text-white'
                    }`}
                  />
                  <span>{item.name}</span>
                </div>

                {item.badge !== undefined && (
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      item.name === 'Payments' && Number(item.badge) > 0
                        ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30 animate-pulse'
                        : 'bg-white/10 text-white/70 border border-white/10'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Footer / Exit Section */}
      <div className="pt-4 border-t border-white/10 flex flex-col gap-2">
        <button
          onClick={onExitAdmin}
          className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold text-rose-400 hover:text-rose-300 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 transition-all cursor-pointer"
        >
          <div className="flex items-center gap-2.5">
            <LogOut className="w-4 h-4" />
            <span>Return to Public Site</span>
          </div>
          <ChevronRight className="w-3.5 h-3.5 opacity-60" />
        </button>
      </div>
    </aside>
  );
};
