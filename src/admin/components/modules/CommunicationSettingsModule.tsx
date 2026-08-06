import React, { useEffect, useRef, useState } from 'react';
import {
  Save,
  CheckCircle2,
  Loader2,
  AlertCircle,
  Link,
  Type,
  AlignLeft,
  MessageCircle,
  ShieldCheck,
  Eye,
  EyeOff,
  ExternalLink,
} from 'lucide-react';
import { useAdmin } from '../../context/AdminContext';
import { useRBAC } from '../../../rbac/context/RBACContext';
import {
  subscribeCommunicationSettings,
  saveCommunicationSettings,
  type WhatsappChannelSettings,
} from '../../../services/communicationSettingsService';

const inputClass =
  'w-full p-3 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-violet-500/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed';

const labelClass = 'text-[10px] font-bold uppercase tracking-widest text-white/50';

const WhatsAppLogo: React.FC<{ className?: string }> = ({ className }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
  </svg>
);

/**
 * Communication Settings — manages the official WhatsApp group invitation shown
 * to participants in the success popup after a registration submission.
 *
 * Only the Super Admin may edit these settings. The link is never hardcoded in
 * the frontend: participants always fetch the latest value from Firestore.
 */
export const CommunicationSettingsModule: React.FC = () => {
  const rbac = useRBAC();
  const { addToast, logAction } = useAdmin();
  const canEdit = rbac.role === 'Super Admin';

  const [form, setForm] = useState<WhatsappChannelSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [linkPreviewOpen, setLinkPreviewOpen] = useState(false);
  const dirtyRef = useRef(false);

  useEffect(() => {
    setLoading(true);
    const unsubscribe = subscribeCommunicationSettings(
      (next) => {
        if (!dirtyRef.current) setForm(next.whatsapp);
        setLoading(false);
      },
      () => {
        addToast('Error', 'Failed to load communication settings.', 'error');
        setLoading(false);
      }
    );
    return unsubscribe;
  }, [addToast]);

  const update = (partial: Partial<WhatsappChannelSettings>) => {
    if (!canEdit) return;
    dirtyRef.current = true;
    setForm((prev) => (prev ? { ...prev, ...partial } : prev));
  };

  const handleSave = async () => {
    if (!canEdit || !form) return;
    setSaving(true);
    try {
      const saved = await saveCommunicationSettings(
        { whatsapp: form },
        { id: rbac.user?.id || '', name: rbac.user?.name || '' }
      );
      dirtyRef.current = false;
      setForm(saved.whatsapp);
      logAction(
        'Communication Settings Updated',
        `Updated official WhatsApp group settings (enabled: ${form.enabled}).`
      );
      addToast('Saved', 'WhatsApp group settings saved successfully.', 'success');
    } catch (err) {
      addToast('Error', err instanceof Error ? err.message : 'Failed to save communication settings.', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-white/50 text-sm py-10">
        <Loader2 className="w-4 h-4 animate-spin text-violet-400" />
        <span>Loading communication settings...</span>
      </div>
    );
  }

  if (!form) return null;

  const inviteLink = form.inviteLink.trim();
  const isWhatsAppLink = /^https?:\/\/chat\.whatsapp\.com\//i.test(inviteLink);

  return (
    <div className="flex flex-col gap-6 select-none pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-col">
          <span className="text-xs font-bold text-violet-400 uppercase tracking-widest">
            Communication
          </span>
          <h2 className="text-xl sm:text-2xl font-extrabold font-display text-white">
            Communication Settings
          </h2>
          <p className="text-[11px] text-white/50">
            Manage the official WhatsApp group invitation shown to participants after a successful
            registration.
          </p>
        </div>

        <button
          onClick={handleSave}
          disabled={!canEdit || saving}
          className="px-5 py-2.5 rounded-xl text-xs font-bold transition-all shadow-lg cursor-pointer flex items-center gap-2 bg-violet-600 hover:bg-violet-700 text-white shadow-violet-500/25 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
          <span>{saving ? 'Saving...' : 'Save Changes'}</span>
        </button>
      </div>

      {!canEdit && (
        <div className="flex items-start gap-2 px-4 py-3 rounded-xl bg-amber-500/10 border border-amber-500/25 text-amber-300 text-xs">
          <ShieldCheck className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <span>
            Only the Super Admin can edit the WhatsApp group settings. Your current role cannot
            modify these values.
          </span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Official WhatsApp Group */}
        <div className="p-6 rounded-3xl bg-zinc-950/60 border border-white/10 backdrop-blur-md flex flex-col gap-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#25D366]/15 border border-[#25D366]/30 flex items-center justify-center">
              <WhatsAppLogo className="w-5 h-5 text-[#25D366]" />
            </div>
            <div className="flex flex-col">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <MessageCircle className="w-4 h-4 text-[#25D366]" />
                Official WhatsApp Group
              </h3>
              <span className="text-[10px] text-white/50">
                Shown in the success popup after registration submission.
              </span>
            </div>
          </div>

          {/* Enable toggle */}
          <div className="flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/10">
            <div className="flex flex-col gap-0.5">
              <span className="text-xs font-bold text-white">Enable WhatsApp Group</span>
              <span className="text-[10px] text-white/50">
                {form.enabled
                  ? 'The invitation popup will appear after registration submission.'
                  : 'The invitation popup will be skipped.'}
              </span>
            </div>
            <button
              onClick={() => update({ enabled: !form.enabled })}
              disabled={!canEdit}
              aria-pressed={form.enabled}
              className={`relative w-12 h-6 rounded-full transition-all cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 ${
                form.enabled ? 'bg-[#25D366] shadow-[0_0_15px_rgba(37,211,102,0.4)]' : 'bg-white/10'
              }`}
            >
              <div
                className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow-md transition-all ${
                  form.enabled ? 'left-7' : 'left-1'
                }`}
              />
            </button>
          </div>

          {/* Group name */}
          <div className="flex flex-col gap-2">
            <label className={`${labelClass} flex items-center gap-2`}>
              <Type className="w-3.5 h-3.5 text-[#25D366]" />
              Group Name
            </label>
            <input
              type="text"
              value={form.groupName}
              onChange={(e) => update({ groupName: e.target.value })}
              disabled={!canEdit}
              placeholder="e.g. CASYUM 2K26 Official Participants"
              className={inputClass}
            />
          </div>

          {/* Invite link */}
          <div className="flex flex-col gap-2">
            <label className={`${labelClass} flex items-center gap-2`}>
              <Link className="w-3.5 h-3.5 text-[#25D366]" />
              WhatsApp Invite Link
            </label>
            <div className="flex flex-col gap-2">
              <input
                type="url"
                value={form.inviteLink}
                onChange={(e) => update({ inviteLink: e.target.value })}
                disabled={!canEdit}
                placeholder="https://chat.whatsapp.com/xxxxxxxxxxxxxxxx"
                className={inputClass}
              />
              <div className="flex items-center gap-2">
                {inviteLink && (
                  <>
                    <button
                      type="button"
                      onClick={() => window.open(inviteLink, '_blank', 'noopener,noreferrer')}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/60 hover:text-white text-[10px] font-bold cursor-pointer transition-all"
                    >
                      <ExternalLink className="w-3 h-3" />
                      Test Link
                    </button>
                    <button
                      type="button"
                      onClick={() => setLinkPreviewOpen((v) => !v)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/60 hover:text-white text-[10px] font-bold cursor-pointer transition-all"
                    >
                      {linkPreviewOpen ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                      {linkPreviewOpen ? 'Hide Preview' : 'Preview'}
                    </button>
                  </>
                )}
                {inviteLink && isWhatsAppLink && (
                  <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-400">
                    <CheckCircle2 className="w-3 h-3" />
                    Valid WhatsApp invite
                  </span>
                )}
                {inviteLink && !isWhatsAppLink && (
                  <span className="flex items-center gap-1 text-[10px] font-bold text-amber-400">
                    <AlertCircle className="w-3 h-3" />
                    Link does not look like a WhatsApp invite
                  </span>
                )}
              </div>
              {linkPreviewOpen && inviteLink && (
                <div className="rounded-xl border border-white/10 bg-black/40 p-3 flex flex-col gap-2">
                  <span className="text-[9px] font-bold uppercase tracking-widest text-white/40">
                    Preview
                  </span>
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-lg bg-[#25D366]/15 border border-[#25D366]/30 flex items-center justify-center">
                      <WhatsAppLogo className="w-4 h-4 text-[#25D366]" />
                    </div>
                    <div className="flex flex-col gap-0.5 min-w-0">
                      <span className="text-xs font-bold text-white truncate">
                        {form.groupName || 'CASYUM 2K26 Participants'}
                      </span>
                      <span className="text-[9px] text-white/40 truncate break-all">{inviteLink}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Description */}
          <div className="flex flex-col gap-2">
            <label className={`${labelClass} flex items-center gap-2`}>
              <AlignLeft className="w-3.5 h-3.5 text-[#25D366]" />
              Group Description
            </label>
            <textarea
              value={form.description}
              onChange={(e) => update({ description: e.target.value })}
              disabled={!canEdit}
              rows={3}
              placeholder="Official announcements, venue updates and event notifications."
              className={`${inputClass} resize-none`}
            />
          </div>
        </div>

        {/* Info / preview panel */}
        <div className="p-6 rounded-3xl bg-zinc-950/60 border border-white/10 backdrop-blur-md flex flex-col gap-5 self-start">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-violet-400" />
            <span>Participant Popup Preview</span>
          </h3>

          {form.enabled ? (
            <div className="rounded-2xl border border-violet-500/25 bg-gradient-to-br from-violet-500/[0.08] to-cyan-500/[0.04] p-5 flex flex-col gap-4">
              <div className="flex flex-col gap-1">
                <span className="text-[9px] font-bold uppercase tracking-widest text-emerald-400">
                  Success
                </span>
                <span className="text-sm font-extrabold font-display text-white">
                  🎉 Registration Submitted Successfully!
                </span>
              </div>

              <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-black/30 p-3">
                <div className="w-10 h-10 rounded-xl bg-[#25D366]/15 border border-[#25D366]/30 flex items-center justify-center flex-shrink-0">
                  <WhatsAppLogo className="w-5 h-5 text-[#25D366]" />
                </div>
                <div className="flex flex-col gap-0.5 min-w-0">
                  <span className="text-[9px] font-bold uppercase tracking-widest text-[#25D366]">
                    Official WhatsApp Group
                  </span>
                  <span className="text-xs font-bold text-white truncate">
                    {form.groupName || 'CASYUM 2K26 Participants'}
                  </span>
                </div>
              </div>

              <p className="text-[11px] text-white/55 leading-relaxed">
                {form.description || 'Official announcements, venue updates and event notifications.'}
              </p>

              <div className="flex flex-col gap-1.5 text-[11px] text-white/60">
                {['Event Schedule', 'Venue Changes', 'Important Announcements', 'Results', 'Certificates', 'Emergency Updates'].map((b) => (
                  <span key={b} className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                    {b}
                  </span>
                ))}
              </div>

              <div className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#25D366] text-white text-[10px] font-extrabold uppercase tracking-widest">
                <WhatsAppLogo className="w-3.5 h-3.5" />
                Join Official WhatsApp Group
              </div>
            </div>
          ) : (
            <div className="flex items-start gap-2 px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white/50 text-xs">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-amber-400" />
              <span>
                The WhatsApp group popup is currently disabled. Participants will be redirected
                straight to their dashboard after registering.
              </span>
            </div>
          )}

          <div className="flex flex-col gap-1.5 rounded-xl bg-violet-500/10 border border-violet-500/20 p-3 text-[11px] text-violet-300/80">
            <span className="flex items-center gap-1.5 font-bold text-violet-300">
              <ShieldCheck className="w-3.5 h-3.5" />
              How it works
            </span>
            <span>
              Participants see this popup exactly once, right after their registration is submitted.
              The invite link is always fetched live from Firestore, so the latest link you save here
              is what every future participant receives.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
