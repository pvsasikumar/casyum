import React, { useState } from 'react';
import {
  Save,
  Globe,
  DollarSign,
  Clock,
  Image as ImageIcon,
  Mail,
  Shield,
  Lock,
  Unlock,
  AlertTriangle,
  CheckCircle2,
} from 'lucide-react';
import { useAdmin } from '../../context/AdminContext';

export const SettingsModule: React.FC = () => {
  const { settings, updateSettings } = useAdmin();
  const [localSettings, setLocalSettings] = useState(settings);
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    updateSettings(localSettings);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const update = (partial: Partial<typeof localSettings>) => {
    setLocalSettings((prev) => ({ ...prev, ...partial }));
    setSaved(false);
  };

  return (
    <div className="flex flex-col gap-6 select-none pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-col">
          <span className="text-xs font-bold text-violet-400 uppercase tracking-widest">
            System Configuration
          </span>
          <h2 className="text-xl sm:text-2xl font-extrabold font-display text-white">
            ERP Settings
          </h2>
        </div>

        <button
          onClick={handleSave}
          className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all shadow-lg cursor-pointer flex items-center gap-2 ${
            saved
              ? 'bg-emerald-500 text-white shadow-emerald-500/25'
              : 'bg-violet-600 hover:bg-violet-700 text-white shadow-violet-500/25'
          }`}
        >
          {saved ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Save className="w-3.5 h-3.5" />}
          <span>{saved ? 'Settings Saved!' : 'Save All Changes'}</span>
        </button>
      </div>

      {/* Settings Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Registration Status Toggle */}
        <div className="p-6 rounded-3xl bg-zinc-950/60 border border-white/10 backdrop-blur-md flex flex-col gap-5">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Shield className="w-4 h-4 text-violet-400" />
            <span>Registration Control</span>
          </h3>

          <div className="flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/10">
            <div className="flex flex-col">
              <span className="text-xs font-bold text-white">Registration Status</span>
              <span className="text-[10px] text-white/50">
                Toggle live registration on/off for the public site
              </span>
            </div>

            <div className="flex items-center gap-2">
              {(['Open', 'Closed', 'Maintenance'] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => update({ registrationStatus: s })}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    localSettings.registrationStatus === s
                      ? s === 'Open'
                        ? 'bg-emerald-500 text-white'
                        : s === 'Closed'
                        ? 'bg-rose-500 text-white'
                        : 'bg-amber-500 text-white'
                      : 'bg-white/5 text-white/50 border border-white/10'
                  }`}
                >
                  {s === 'Open' && <Unlock className="w-3 h-3 inline mr-1" />}
                  {s === 'Closed' && <Lock className="w-3 h-3 inline mr-1" />}
                  {s === 'Maintenance' && <AlertTriangle className="w-3 h-3 inline mr-1" />}
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Registration Fee */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-bold text-white/50 flex items-center gap-2">
              <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
              <span>Registration Fee (₹)</span>
            </label>
            <input
              type="number"
              value={localSettings.registrationFee}
              onChange={(e) => update({ registrationFee: Number(e.target.value) })}
              className="p-3 rounded-xl bg-white/5 border border-white/10 text-white text-sm font-mono focus:outline-none focus:border-violet-500/50"
            />
          </div>

          {/* UPI ID */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-bold text-white/50">UPI ID for Payment Collection</label>
            <input
              type="text"
              value={localSettings.upiId}
              onChange={(e) => update({ upiId: e.target.value })}
              className="p-3 rounded-xl bg-white/5 border border-white/10 text-white text-sm font-mono focus:outline-none focus:border-violet-500/50"
            />
          </div>
        </div>

        {/* Symposium Branding */}
        <div className="p-6 rounded-3xl bg-zinc-950/60 border border-white/10 backdrop-blur-md flex flex-col gap-5">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Globe className="w-4 h-4 text-cyan-400" />
            <span>Symposium Branding</span>
          </h3>

          <div className="flex flex-col gap-2">
            <label className="text-xs font-bold text-white/50">Symposium Name</label>
            <input
              type="text"
              value={localSettings.symposiumName}
              onChange={(e) => update({ symposiumName: e.target.value })}
              className="p-3 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-violet-500/50"
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-xs font-bold text-white/50">Tagline</label>
            <input
              type="text"
              value={localSettings.tagline}
              onChange={(e) => update({ tagline: e.target.value })}
              className="p-3 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-violet-500/50"
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-xs font-bold text-white/50 flex items-center gap-2">
              <ImageIcon className="w-3.5 h-3.5 text-violet-400" />
              <span>Homepage Banner Text</span>
            </label>
            <textarea
              value={localSettings.homepageBanner}
              onChange={(e) => update({ homepageBanner: e.target.value })}
              rows={2}
              className="p-3 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-violet-500/50 resize-none"
            />
          </div>
        </div>

        {/* Countdown Target */}
        <div className="p-6 rounded-3xl bg-zinc-950/60 border border-white/10 backdrop-blur-md flex flex-col gap-5">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Clock className="w-4 h-4 text-amber-400" />
            <span>Countdown & Timing</span>
          </h3>

          <div className="flex flex-col gap-2">
            <label className="text-xs font-bold text-white/50">Countdown Target (ISO Datetime)</label>
            <input
              type="datetime-local"
              value={localSettings.countdownTarget.slice(0, 16)}
              onChange={(e) => update({ countdownTarget: e.target.value + ':00' })}
              className="p-3 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-violet-500/50"
            />
          </div>

          <div className="p-3 rounded-xl bg-violet-500/10 border border-violet-500/20 text-violet-300 text-xs">
            The homepage countdown timer will count towards this datetime.
          </div>
        </div>

        {/* Contact Info */}
        <div className="p-6 rounded-3xl bg-zinc-950/60 border border-white/10 backdrop-blur-md flex flex-col gap-5">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Mail className="w-4 h-4 text-pink-400" />
            <span>Contact Information</span>
          </h3>

          <div className="flex flex-col gap-2">
            <label className="text-xs font-bold text-white/50">Contact Email</label>
            <input
              type="email"
              value={localSettings.contactEmail}
              onChange={(e) => update({ contactEmail: e.target.value })}
              className="p-3 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-violet-500/50"
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-xs font-bold text-white/50">Contact Phone</label>
            <input
              type="text"
              value={localSettings.contactPhone}
              onChange={(e) => update({ contactPhone: e.target.value })}
              className="p-3 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-violet-500/50"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
