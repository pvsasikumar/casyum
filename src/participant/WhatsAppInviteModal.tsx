import React, { useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  CheckCircle2,
  X,
  Ticket,
  Clock,
  ShieldCheck,
  CalendarDays,
  MapPin,
  Megaphone,
  Trophy,
  Award,
  AlertTriangle,
  ArrowRight,
} from 'lucide-react';

export interface RegistrationSuccessInfo {
  registrationId: string;
  events: string[];
  amount: number;
  paymentStatus: string;
}

interface WhatsAppGroupSettings {
  groupName: string;
  description: string;
  inviteLink: string;
}

interface WhatsAppInviteModalProps {
  open: boolean;
  settings: WhatsAppGroupSettings | null;
  registration?: RegistrationSuccessInfo | null;
  onContinue: () => void;
}

const GROUP_BENEFITS = [
  { icon: CalendarDays, label: 'Event Schedule' },
  { icon: MapPin, label: 'Venue Changes' },
  { icon: Megaphone, label: 'Important Announcements' },
  { icon: Trophy, label: 'Results' },
  { icon: Award, label: 'Certificates' },
  { icon: AlertTriangle, label: 'Emergency Updates' },
];

const WhatsAppLogo: React.FC<{ className?: string }> = ({ className }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
  </svg>
);

export const WhatsAppInviteModal: React.FC<WhatsAppInviteModalProps> = ({
  open,
  settings,
  registration,
  onContinue,
}) => {
  const handleJoin = useCallback(() => {
    const link = settings?.inviteLink;
    if (!link) return;
    window.open(link, '_blank', 'noopener,noreferrer');
  }, [settings]);

  if (!open) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
      className="fixed inset-0 z-[10000] bg-black/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-label="Registration Submitted Successfully"
    >
      <div className="min-h-full flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.92, y: 24 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 220, damping: 24 }}
          className="w-full max-w-md rounded-3xl border border-violet-500/30 bg-gradient-to-br from-violet-500/[0.1] via-[#161021] to-cyan-500/[0.05] shadow-2xl shadow-violet-500/20 overflow-hidden relative"
        >
          <div className="absolute inset-0 bg-ambient-glow pointer-events-none" />

          {/* Close */}
          <button
            onClick={onContinue}
            aria-label="Close"
            className="absolute top-4 right-4 z-10 p-2 rounded-xl text-white/50 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 transition-all cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="relative flex flex-col gap-6 p-6 sm:p-7 max-h-[calc(100vh-40px)] overflow-y-auto custom-scrollbar">
            {/* Header */}
            <div className="flex flex-col items-center text-center gap-2 pt-1">
              <motion.div
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.15, type: 'spring', stiffness: 260, damping: 18 }}
                className="w-14 h-14 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center shadow-[0_0_25px_rgba(16,185,129,0.25)]"
              >
                <CheckCircle2 className="w-7 h-7 text-emerald-400" />
              </motion.div>
              <span className="text-[10px] font-bold uppercase tracking-[0.25em] text-emerald-400">
                Success
              </span>
              <h2 className="text-xl sm:text-2xl font-extrabold font-display text-white tracking-tight">
                🎉 Registration Submitted Successfully!
              </h2>
              <p className="text-xs text-white/55 leading-relaxed">
                Thank you for registering for CASYUM 2K26. Your registration has been submitted
                successfully. Your payment is currently pending verification by the CASYUM Faculty
                Management Team. You will receive updates once your payment is verified.
              </p>
            </div>

            {/* Registration summary */}
            {registration && (
              <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 flex flex-col gap-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex flex-col gap-0.5 min-w-0">
                    <span className="text-[9px] font-bold uppercase tracking-widest text-white/40">
                      Registration ID
                    </span>
                    <span className="text-xs font-mono text-violet-300 truncate">
                      {registration.registrationId}
                    </span>
                  </div>
                  <div className="flex flex-col gap-0.5 items-end">
                    <span className="text-[9px] font-bold uppercase tracking-widest text-white/40">
                      Amount Paid
                    </span>
                    <span className="text-xs font-extrabold text-emerald-300">
                      ₹{Number(registration.amount) || 0}
                    </span>
                  </div>
                </div>

                {registration.events && registration.events.length > 0 && (
                  <div className="flex flex-col gap-1">
                    <span className="text-[9px] font-bold uppercase tracking-widest text-white/40">
                      Registered Events
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {registration.events.map((ev) => (
                        <span
                          key={ev}
                          className="px-2 py-0.5 rounded-lg bg-violet-500/10 border border-violet-500/25 text-violet-300 text-[10px] font-bold"
                        >
                          {ev}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between gap-3 pt-1 border-t border-white/10">
                  <span className="text-[9px] font-bold uppercase tracking-widest text-white/40">
                    Payment Status
                  </span>
                  <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/25 text-amber-300 text-[10px] font-bold uppercase tracking-wider">
                    <Clock className="w-3 h-3" />
                    {registration.paymentStatus}
                  </span>
                </div>
              </div>
            )}

            {/* WhatsApp group card */}
            {settings && (
              <div className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-[#25D366]/15 border border-[#25D366]/30 flex items-center justify-center flex-shrink-0">
                    <WhatsAppLogo className="w-6 h-6 text-[#25D366]" />
                  </div>
                  <div className="flex flex-col gap-0.5 min-w-0">
                    <span className="text-[9px] font-bold uppercase tracking-widest text-[#25D366]">
                      Official WhatsApp Group
                    </span>
                    <span className="text-sm font-extrabold text-white truncate">
                      {settings.groupName || 'CASYUM 2K26 Participants'}
                    </span>
                  </div>
                </div>

                {settings.description && (
                  <p className="text-[11px] text-white/55 leading-relaxed">{settings.description}</p>
                )}

                <p className="text-[10px] font-bold uppercase tracking-widest text-white/40">
                  Stay updated with:
                </p>
                <div className="grid grid-cols-2 gap-x-3 gap-y-2">
                  {GROUP_BENEFITS.map(({ icon: Icon, label }) => (
                    <div key={label} className="flex items-center gap-2 text-[11px] text-white/70">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                      <span className="flex items-center gap-1.5">
                        <Icon className="w-3 h-3 text-white/30" />
                        {label}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Action buttons */}
            <div className="flex flex-col gap-2.5">
              <button
                onClick={handleJoin}
                disabled={!settings?.inviteLink}
                className="w-full flex items-center justify-center gap-2 px-4 py-3.5 rounded-xl bg-[#25D366] hover:bg-[#1fbd5a] disabled:opacity-50 disabled:cursor-not-allowed text-white font-extrabold text-xs uppercase tracking-widest transition-all shadow-lg shadow-[#25D366]/25 cursor-pointer active:scale-[0.99]"
              >
                <WhatsAppLogo className="w-4 h-4" />
                Join Official WhatsApp Group
              </button>
              <button
                onClick={onContinue}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/70 hover:text-white text-xs font-bold uppercase tracking-widest transition-all cursor-pointer active:scale-[0.99]"
              >
                <Ticket className="w-4 h-4" />
                Continue to Dashboard
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>

            {/* Trust note */}
            <div className="flex items-center justify-center gap-1.5 text-[10px] text-white/35">
              <ShieldCheck className="w-3 h-3 text-emerald-400/60" />
              <span>To receive important announcements, schedules, venue updates, event instructions and notifications, join the official CASYUM WhatsApp group.</span>
            </div>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
};

export default WhatsAppInviteModal;
