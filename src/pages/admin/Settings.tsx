import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Globe,
  Image,
  Mail,
  Phone,
  Moon,
  Sun,
  Bell,
  BellRing,
  Shield,
  Clock,
  Fingerprint,
  Save,
  RotateCcw,
  ArrowLeft,
} from 'lucide-react';
import { useAdmin } from '../../admin/context/AdminContext';
import { readSettings, saveSettings } from '../../services/settingsService';

interface AdminSettings {
  websiteTitle: string;
  eventName: string;
  contactEmail: string;
  contactPhone: string;
  themeColor: string;
  emailNotifications: boolean;
  pushNotifications: boolean;
  sessionTimeout: number;
  twoFactorEnabled: boolean;
}

const DEFAULT_SETTINGS: AdminSettings = {
  websiteTitle: 'CASYUM 2K26',
  eventName: 'CASYUM Symposium',
  contactEmail: 'contact@casyum.edu',
  contactPhone: '+91 98765 43210',
  themeColor: '#8b5cf6',
  emailNotifications: true,
  pushNotifications: false,
  sessionTimeout: 30,
  twoFactorEnabled: false,
};

const THEME_COLORS = [
  { name: 'Violet', value: '#8b5cf6' },
  { name: 'Blue', value: '#3b82f6' },
  { name: 'Emerald', value: '#10b981' },
  { name: 'Rose', value: '#f43f5e' },
  { name: 'Amber', value: '#f59e0b' },
  { name: 'Cyan', value: '#06b6d4' },
];

const TIMEOUT_OPTIONS = [
  { label: '5 minutes', value: 5 },
  { label: '15 minutes', value: 15 },
  { label: '30 minutes', value: 30 },
  { label: '1 hour', value: 60 },
  { label: 'Never', value: 0 },
];

export const Settings: React.FC = () => {
  const navigate = useNavigate();
  const { isDarkMode, toggleDarkMode, addToast } = useAdmin();

  const [settings, setSettings] = useState<AdminSettings>(DEFAULT_SETTINGS);

  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    readSettings<AdminSettings>(DEFAULT_SETTINGS)
      .then((stored) => setSettings(stored))
      .catch(() => {});
  }, []);

  const updateSetting = <K extends keyof AdminSettings>(key: K, value: AdminSettings[K]) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  const handleSave = () => {
    saveSettings<AdminSettings>(settings).catch(() => {});
    addToast('Settings Saved', 'Admin settings have been updated successfully.', 'success');
    setHasChanges(false);
  };

  const handleReset = () => {
    setSettings(DEFAULT_SETTINGS);
    saveSettings<AdminSettings>(DEFAULT_SETTINGS).catch(() => {});
    setHasChanges(true);
  };

  const SectionCard: React.FC<{
    title: string;
    icon: React.ReactNode;
    children: React.ReactNode;
  }> = ({ title, icon, children }) => (
    <div className="p-6 rounded-3xl bg-zinc-950/60 border border-white/10 backdrop-blur-md flex flex-col gap-5">
      <h3 className="text-sm font-bold text-white flex items-center gap-2">
        {icon}
        <span>{title}</span>
      </h3>
      {children}
    </div>
  );

  const inputClass = 'w-full p-3 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-violet-500/50 transition-all';

  return (
    <div className="flex flex-col gap-6 select-none pb-12">
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/admin')}
          className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/60 hover:text-white transition-all cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="flex-1 flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-xs font-bold text-violet-400 uppercase tracking-widest">
              Preferences
            </span>
            <h2 className="text-xl sm:text-2xl font-extrabold font-display text-white">
              Settings
            </h2>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleReset}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/60 hover:text-white text-xs font-bold transition-all cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset</span>
            </button>
            <button
              onClick={handleSave}
              disabled={!hasChanges}
              className={`flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-bold transition-all shadow-lg cursor-pointer ${
                hasChanges
                  ? 'bg-violet-600 hover:bg-violet-700 text-white shadow-violet-500/25'
                  : 'bg-white/5 text-white/30 border border-white/10 cursor-not-allowed'
              }`}
            >
              <Save className="w-3.5 h-3.5" />
              <span>Save</span>
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* General */}
        <SectionCard title="General" icon={<Globe className="w-4 h-4 text-violet-400" />}>
          <div className="flex flex-col gap-2">
            <label className="text-xs font-bold text-white/50">Website Title</label>
            <input
              type="text"
              value={settings.websiteTitle}
              onChange={(e) => updateSetting('websiteTitle', e.target.value)}
              className={inputClass}
            />
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-xs font-bold text-white/50">Event Name</label>
            <input
              type="text"
              value={settings.eventName}
              onChange={(e) => updateSetting('eventName', e.target.value)}
              className={inputClass}
            />
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-xs font-bold text-white/50 flex items-center gap-1.5">
              <Mail className="w-3 h-3 text-pink-400" />
              <span>Contact Email</span>
            </label>
            <input
              type="email"
              value={settings.contactEmail}
              onChange={(e) => updateSetting('contactEmail', e.target.value)}
              className={inputClass}
            />
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-xs font-bold text-white/50 flex items-center gap-1.5">
              <Phone className="w-3 h-3 text-emerald-400" />
              <span>Contact Phone</span>
            </label>
            <input
              type="text"
              value={settings.contactPhone}
              onChange={(e) => updateSetting('contactPhone', e.target.value)}
              className={inputClass}
            />
          </div>
        </SectionCard>

        {/* Appearance */}
        <SectionCard title="Appearance" icon={<Image className="w-4 h-4 text-cyan-400" />}>
          <div className="flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/10">
            <div className="flex flex-col">
              <span className="text-xs font-bold text-white">Dark / Light Mode</span>
              <span className="text-[10px] text-white/50">Toggle the admin theme</span>
            </div>
            <button
              onClick={toggleDarkMode}
              className={`p-2.5 rounded-xl transition-all cursor-pointer ${
                isDarkMode
                  ? 'bg-violet-500/20 text-violet-400 border border-violet-500/30'
                  : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
              }`}
            >
              {isDarkMode ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
            </button>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-xs font-bold text-white/50">Theme Color</label>
            <div className="flex items-center gap-3">
              {THEME_COLORS.map((color) => (
                <button
                  key={color.value}
                  onClick={() => updateSetting('themeColor', color.value)}
                  className={`w-8 h-8 rounded-xl transition-all cursor-pointer ${
                    settings.themeColor === color.value
                      ? 'ring-2 ring-white ring-offset-2 ring-offset-zinc-950 scale-110'
                      : 'hover:scale-105'
                  }`}
                  style={{ backgroundColor: color.value }}
                  title={color.name}
                />
              ))}
            </div>
          </div>
        </SectionCard>

        {/* Notifications */}
        <SectionCard title="Notifications" icon={<Bell className="w-4 h-4 text-pink-400" />}>
          <ToggleField
            icon={<BellRing className="w-3.5 h-3.5 text-emerald-400" />}
            label="Email Notifications"
            description="Receive email alerts for important updates"
            checked={settings.emailNotifications}
            onChange={(v) => updateSetting('emailNotifications', v)}
          />
          <ToggleField
            icon={<Bell className="w-3.5 h-3.5 text-cyan-400" />}
            label="Push Notifications"
            description="Receive browser push notifications"
            checked={settings.pushNotifications}
            onChange={(v) => updateSetting('pushNotifications', v)}
          />
        </SectionCard>

        {/* Security */}
        <SectionCard title="Security" icon={<Shield className="w-4 h-4 text-amber-400" />}>
          <div className="flex flex-col gap-2">
            <label className="text-xs font-bold text-white/50 flex items-center gap-1.5">
              <Clock className="w-3 h-3 text-violet-400" />
              <span>Session Timeout</span>
            </label>
            <div className="flex flex-wrap gap-2">
              {TIMEOUT_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => updateSetting('sessionTimeout', opt.value)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    settings.sessionTimeout === opt.value
                      ? 'bg-violet-600 text-white'
                      : 'bg-white/5 text-white/50 border border-white/10 hover:bg-white/10'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/10">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-violet-500/20">
                <Fingerprint className="w-4 h-4 text-violet-400" />
              </div>
              <div className="flex flex-col">
                <span className="text-xs font-bold text-white">Two-Factor Authentication</span>
                <span className="text-[10px] text-white/50">Add an extra layer of security</span>
              </div>
            </div>
            <button
              onClick={() => addToast('Coming Soon', 'Two-factor authentication will be available in a future update.', 'info')}
              className="px-4 py-1.5 rounded-xl bg-white/5 border border-white/10 text-white/40 text-[10px] font-bold cursor-pointer"
            >
              Coming Soon
            </button>
          </div>
        </SectionCard>
      </div>
    </div>
  );
};

const ToggleField: React.FC<{
  icon: React.ReactNode;
  label: string;
  description: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}> = ({ icon, label, description, checked, onChange }) => (
  <div className="flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/10">
    <div className="flex items-center gap-3">
      {icon}
      <div className="flex flex-col">
        <span className="text-xs font-bold text-white">{label}</span>
        <span className="text-[10px] text-white/50">{description}</span>
      </div>
    </div>
    <button
      onClick={() => onChange(!checked)}
      className={`relative w-10 h-5 rounded-full transition-all cursor-pointer ${
        checked ? 'bg-violet-600' : 'bg-white/10'
      }`}
    >
      <div
        className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-md transition-all ${
          checked ? 'left-5.5' : 'left-0.5'
        }`}
      />
    </button>
  </div>
);
