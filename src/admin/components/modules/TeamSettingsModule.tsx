import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Search,
  Loader2,
  Settings,
  RefreshCw,
  Send,
  ChevronLeft,
  Mail,
  Ban,
  CheckCircle2,
  XCircle,
  User,
} from 'lucide-react';
import { useAdmin } from '../../context/AdminContext';
import { ConfirmationDialog } from '../common/ConfirmationDialog';
import type { RegistrationRow } from '../../../services/eventService';
import { listRegistrationsByEvent } from '../../../services/registrationService';
import {
  getTeamConfig,
  enableTeamFormation,
  disableTeamFormation,
  sendTeamFormationNotifications,
  subscribeTeamFormationAccess,
  listTeamsByEvent,
  listTeamMembers,
  isRegistrationEligibleForTeamFormation,
  type TeamConfig,
  type TeamFormationAccess,
  type Team,
  type TeamMember,
} from '../../../services/teamService';

interface EligibilityRow {
  registrationId: string;
  participantId: string;
  name: string;
  email: string;
  paymentStatus: string;
  verificationStatus: string;
  inTeam: boolean;
  teamName: string;
  teamCode: string;
  teamRole: string;
  eligible: boolean;
  access?: TeamFormationAccess;
}

const PAYMENT_FILTERS = ['All', 'Verified', 'Not Verified'] as const;
const VERIFICATION_FILTERS = ['All', 'Verified', 'Not Verified'] as const;
const TEAM_FILTERS = ['All', 'In Team', 'Not in Team'] as const;
const NOTIFICATION_FILTERS = ['All', 'Sent', 'Pending', 'Failed', 'Not Sent'] as const;

export const TeamSettingsModule: React.FC = () => {
  const { events, teamSettingsEventId, openTeamSettings, closeTeamSettings, setActiveTab, refreshEvents, pushNotification, logAction } =
    useAdmin();

  const teamEvents = useMemo(() => events.filter((e) => e.teamEvent === true), [events]);
  const eventId = teamSettingsEventId && teamEvents.some((e) => e.id === teamSettingsEventId)
    ? teamSettingsEventId
    : null;

  const [config, setConfig] = useState<TeamConfig | null>(null);
  const [registrations, setRegistrations] = useState<RegistrationRow[]>([]);
  const [accessRows, setAccessRows] = useState<TeamFormationAccess[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [teamMembers, setTeamMembers] = useState<Record<string, TeamMember[]>>({});
  const [isLoading, setIsLoading] = useState(false);

  const [search, setSearch] = useState('');
  const [paymentFilter, setPaymentFilter] = useState<(typeof PAYMENT_FILTERS)[number]>('All');
  const [verificationFilter, setVerificationFilter] = useState<(typeof VERIFICATION_FILTERS)[number]>('All');
  const [teamFilter, setTeamFilter] = useState<(typeof TEAM_FILTERS)[number]>('All');
  const [notificationFilter, setNotificationFilter] = useState<(typeof NOTIFICATION_FILTERS)[number]>('All');

  const [enableOpen, setEnableOpen] = useState(false);
  const [disableOpen, setDisableOpen] = useState(false);
  const [acting, setActing] = useState(false);
  const [viewing, setViewing] = useState<EligibilityRow | null>(null);

  const eventName = useMemo(
    () => (eventId ? teamEvents.find((e) => e.id === eventId)?.name || '' : ''),
    [eventId, teamEvents]
  );

  const load = useCallback(async (id: string) => {
    setIsLoading(true);
    try {
      const [cfg, regs, rawTeams] = await Promise.all([
        getTeamConfig(id),
        listRegistrationsByEvent(id).catch(() => [] as RegistrationRow[]),
        listTeamsByEvent(id).catch(() => [] as Team[]),
      ]);
      const withMembers = await Promise.all(
        rawTeams.map(async (team) => {
          const members = await listTeamMembers(team.id).catch(() => [] as TeamMember[]);
          return { team, members };
        })
      );
      setConfig(cfg);
      setRegistrations(regs.filter((r) => r.status !== 'Cancelled'));
      setTeams(withMembers.map((w) => w.team));
      const membersByTeam: Record<string, TeamMember[]> = {};
      withMembers.forEach((w) => {
        membersByTeam[w.team.id] = w.members;
      });
      setTeamMembers(membersByTeam);
    } catch {
      setConfig(null);
      setRegistrations([]);
      setTeams([]);
      setTeamMembers({});
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!eventId) {
      setConfig(null);
      setRegistrations([]);
      setAccessRows([]);
      setTeams([]);
      setTeamMembers({});
      return;
    }
    load(eventId);
    const unsub = subscribeTeamFormationAccess(
      eventId,
      (rows) => setAccessRows(rows),
      () => {}
    );
    return () => unsub();
  }, [eventId, load]);

  const teamByParticipant = useMemo(() => {
    const map = new Map<string, { teamName: string; teamCode: string; role: string }>();
    teams.forEach((team) => {
      const members = teamMembers[team.id] || [];
      members.forEach((m) => {
        map.set(m.participantId, {
          teamName: team.teamName,
          teamCode: team.teamCode,
          role: m.role,
        });
      });
    });
    return map;
  }, [teams, teamMembers]);

  const accessByRegistration = useMemo(() => {
    const map = new Map<string, TeamFormationAccess>();
    accessRows.forEach((a) => map.set(a.registrationId, a));
    return map;
  }, [accessRows]);

  const rows = useMemo<EligibilityRow[]>(() => {
    return registrations.map((r) => {
      const registrationId = String(r.registration_id || '');
      const participantId = String(r.participant_user_id || r.participant_id || '');
      const team = teamByParticipant.get(participantId);
      const paymentStatus = String(r.payment_status || 'submitted');
      const verificationStatus = String(r.registration_verification_status || 'locked');
      const eligible = isRegistrationEligibleForTeamFormation({
        payment_status: paymentStatus,
        registration_verification_status: verificationStatus,
      });
      return {
        registrationId,
        participantId,
        name: String(r.user_full_name || 'Participant'),
        email: String(r.participant_email || ''),
        paymentStatus,
        verificationStatus,
        inTeam: Boolean(team),
        teamName: team?.teamName || '',
        teamCode: team?.teamCode || '',
        teamRole: team?.role || '',
        eligible,
        access: accessByRegistration.get(registrationId),
      };
    });
  }, [registrations, teamByParticipant, accessByRegistration]);

  const summary = useMemo(() => {
    const total = rows.length;
    const paymentCompleted = rows.filter((r) => r.paymentStatus.toLowerCase() === 'verified').length;
    const verified = rows.filter((r) => r.verificationStatus.toLowerCase() === 'verified').length;
    const eligible = rows.filter((r) => r.eligible).length;
    const inTeam = rows.filter((r) => r.inTeam).length;
    return {
      total,
      paymentCompleted,
      verified,
      eligible,
      inTeam,
      notInTeam: total - inTeam,
    };
  }, [rows]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (q) {
        const haystack = `${r.name} ${r.email} ${r.registrationId} ${r.teamName} ${r.teamCode}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      const paid = r.paymentStatus.toLowerCase() === 'verified';
      if (paymentFilter === 'Verified' && !paid) return false;
      if (paymentFilter === 'Not Verified' && paid) return false;
      const deskVerified = r.verificationStatus.toLowerCase() === 'verified';
      if (verificationFilter === 'Verified' && !deskVerified) return false;
      if (verificationFilter === 'Not Verified' && deskVerified) return false;
      if (teamFilter === 'In Team' && !r.inTeam) return false;
      if (teamFilter === 'Not in Team' && r.inTeam) return false;
      const notif = r.access?.notificationStatus || 'Not Sent';
      if (notificationFilter === 'Sent' && notif !== 'Sent') return false;
      if (notificationFilter === 'Pending' && notif !== 'Pending') return false;
      if (notificationFilter === 'Failed' && notif !== 'Failed') return false;
      if (notificationFilter === 'Not Sent' && notif !== 'Not Sent') return false;
      return true;
    });
  }, [rows, search, paymentFilter, verificationFilter, teamFilter, notificationFilter]);

  const handleEnable = async () => {
    if (!eventId) return;
    setActing(true);
    try {
      const result = await enableTeamFormation(eventId);
      await refreshEvents();
      await load(eventId);
      logAction(
        'Team Formation Enabled',
        `Team formation opened for ${eventName} (${result.eligibleCount} eligible, ${result.notifiedCount} notified).`
      );
      pushNotification(
        'Team Formation Enabled',
        `Team formation is now available to eligible participants. ${result.notifiedCount} notification${result.notifiedCount === 1 ? '' : 's'} sent, ${result.failedCount} failed.`,
        'success'
      );
      setEnableOpen(false);
    } catch (err) {
      pushNotification('Error', err instanceof Error ? err.message : 'Failed to enable team formation.', 'error');
    } finally {
      setActing(false);
    }
  };

  const handleDisable = async () => {
    if (!eventId) return;
    setActing(true);
    try {
      await disableTeamFormation(eventId);
      await refreshEvents();
      await load(eventId);
      logAction('Team Formation Disabled', `Team formation locked for ${eventName}.`);
      pushNotification('Team Formation Disabled', `Team formation is currently disabled for ${eventName}.`, 'warning');
      setDisableOpen(false);
    } catch (err) {
      pushNotification('Error', err instanceof Error ? err.message : 'Failed to disable team formation.', 'error');
    } finally {
      setActing(false);
    }
  };

  const handleSendNotifications = async () => {
    if (!eventId) return;
    setActing(true);
    try {
      const result = await sendTeamFormationNotifications(eventId);
      pushNotification(
        'Notifications Sent',
        `${result.sent} notification${result.sent === 1 ? '' : 's'} sent, ${result.failed} failed, ${result.skipped} already sent.`,
        result.failed > 0 ? 'warning' : 'success'
      );
      logAction('Team Formation Notifications', `${result.sent} notifications sent for ${eventName}.`);
    } catch (err) {
      pushNotification('Error', err instanceof Error ? err.message : 'Failed to send notifications.', 'error');
    } finally {
      setActing(false);
    }
  };

  const backToTeams = () => {
    closeTeamSettings();
    setActiveTab('Teams');
  };

  return (
    <div className="flex flex-col gap-6 select-none pb-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={backToTeams}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/60 hover:text-white cursor-pointer"
            title="Back to Teams"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <div className="flex flex-col">
            <span className="text-xs font-bold text-violet-400 uppercase tracking-widest">Team Settings</span>
            <h2 className="text-xl sm:text-2xl font-extrabold font-display text-white">Team Formation Control</h2>
            <p className="text-[11px] text-white/40 mt-1">
              Enable or disable team formation for an event and manage participant access and notifications.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => eventId && load(eventId)}
            disabled={!eventId || isLoading}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/70 hover:text-white text-[10px] font-bold cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} /> Refresh
          </button>
          <select
            value={eventId || ''}
            onChange={(e) => e.target.value && openTeamSettings(e.target.value)}
            className="bg-zinc-900 border border-white/10 text-white text-xs rounded-xl px-3 py-2.5 focus:outline-none"
          >
            <option value="">Select team event...</option>
            {teamEvents.map((e) => (
              <option key={e.id} value={e.id}>
                {e.name} ({e.minTeamSize}-{e.maxTeamSize})
              </option>
            ))}
          </select>
        </div>
      </div>

      {!eventId ? (
        <div className="p-12 text-center text-xs text-white/40 rounded-3xl bg-zinc-950/60 border border-white/10">
          Select a team event to manage its team formation settings.
        </div>
      ) : isLoading ? (
        <div className="flex items-center gap-2 text-white/40 text-xs">
          <Loader2 className="w-4 h-4 animate-spin text-violet-400" />
          Loading team settings...
        </div>
      ) : (
        <>
          <div className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-amber-500/5 border border-amber-500/20">
            <Settings className="w-4 h-4 text-amber-300 flex-shrink-0" />
            <span className="text-xs font-bold text-white">{eventName}</span>
            <span className="text-[11px] text-white/40">
              Team size {config?.minTeamSize}-{config?.maxTeamSize} · {config?.feeType}
            </span>
          </div>

          <div className="flex flex-col gap-4 p-5 rounded-2xl bg-zinc-950/60 border border-white/10">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-col gap-1">
                <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest">
                  Team Formation Status
                </span>
                <span className={`text-lg font-extrabold font-display flex items-center gap-2 ${config?.formationEnabled ? 'text-emerald-300' : 'text-rose-300'}`}>
                  <span className={`w-2.5 h-2.5 rounded-full ${config?.formationEnabled ? 'bg-emerald-400' : 'bg-rose-400'}`} />
                  {config?.formationEnabled ? 'ENABLED' : 'DISABLED'}
                </span>
                <span className="text-[11px] text-white/40">
                  {config?.formationEnabled
                    ? 'Team formation is now available to eligible participants.'
                    : 'Team formation is currently disabled for this event.'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                {config?.formationEnabled ? (
                  <button
                    onClick={() => setDisableOpen(true)}
                    disabled={acting}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-300 text-[10px] font-bold uppercase tracking-widest cursor-pointer disabled:opacity-50"
                  >
                    <Ban className="w-3.5 h-3.5" /> Disable Team Formation
                  </button>
                ) : (
                  <button
                    onClick={() => setEnableOpen(true)}
                    disabled={acting}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-[10px] font-bold uppercase tracking-widest cursor-pointer disabled:opacity-50"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" /> Enable Team Formation
                  </button>
                )}
              </div>
            </div>
            {!config?.formationEnabled && (
              <p className="text-[11px] text-white/40 leading-relaxed border-t border-white/10 pt-3">
                When you enable team formation, only participants who have completed payment{' '}
                <b>and</b> Registration Desk verification will be allowed to create or join a team.
                Eligible participants are notified automatically.
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <div className="flex flex-col gap-1 p-4 rounded-2xl bg-zinc-950/60 border border-white/10">
              <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Total Registered</span>
              <span className="text-2xl font-extrabold font-display text-white">{summary.total}</span>
            </div>
            <div className="flex flex-col gap-1 p-4 rounded-2xl bg-zinc-950/60 border border-amber-500/25">
              <span className="text-[10px] font-bold text-amber-300/70 uppercase tracking-widest">Payment Completed</span>
              <span className="text-2xl font-extrabold font-display text-amber-300">{summary.paymentCompleted}</span>
            </div>
            <div className="flex flex-col gap-1 p-4 rounded-2xl bg-zinc-950/60 border border-cyan-500/25">
              <span className="text-[10px] font-bold text-cyan-300/70 uppercase tracking-widest">Registration Verified</span>
              <span className="text-2xl font-extrabold font-display text-cyan-300">{summary.verified}</span>
            </div>
            <div className="flex flex-col gap-1 p-4 rounded-2xl bg-zinc-950/60 border border-emerald-500/25">
              <span className="text-[10px] font-bold text-emerald-300/70 uppercase tracking-widest">Eligible</span>
              <span className="text-2xl font-extrabold font-display text-emerald-300">{summary.eligible}</span>
            </div>
            <div className="flex flex-col gap-1 p-4 rounded-2xl bg-zinc-950/60 border border-violet-500/25">
              <span className="text-[10px] font-bold text-violet-300/70 uppercase tracking-widest">Already in Team</span>
              <span className="text-2xl font-extrabold font-display text-violet-300">{summary.inTeam}</span>
            </div>
            <div className="flex flex-col gap-1 p-4 rounded-2xl bg-zinc-950/60 border border-white/10">
              <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Not in Team</span>
              <span className="text-2xl font-extrabold font-display text-white">{summary.notInTeam}</span>
            </div>
          </div>

          <div className="flex flex-col gap-4 p-5 rounded-2xl bg-zinc-950/60 border border-white/10">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-col gap-0.5">
                <span className="text-sm font-bold text-white">Team Formation Access</span>
                <span className="text-[11px] text-white/40">
                  {accessRows.length} access record{accessRows.length === 1 ? '' : 's'} · per-participant
                  notification delivery status
                </span>
              </div>
              <button
                onClick={handleSendNotifications}
                disabled={acting}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/15 text-white/80 text-[10px] font-bold uppercase tracking-widest cursor-pointer disabled:opacity-50"
              >
                <Send className="w-3.5 h-3.5 text-cyan-300" /> Send Notifications
              </button>
            </div>
            {accessRows.length === 0 ? (
              <p className="text-[11px] text-white/40">
                No access records yet. Records are created for eligible participants when team formation is enabled.
              </p>
            ) : (
              <div className="flex flex-col gap-2">
                {accessRows.slice(0, 20).map((a) => (
                  <div key={a.id} className="flex items-center justify-between gap-3 px-3 py-2 rounded-xl bg-white/[0.03] border border-white/10">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="w-7 h-7 rounded-full bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center flex-shrink-0">
                        <Mail className="w-3.5 h-3.5 text-cyan-300" />
                      </span>
                      <div className="flex flex-col min-w-0">
                        <span className="text-xs font-bold text-white truncate">{a.participantName}</span>
                        <span className="text-[10px] text-white/40 font-mono truncate">{a.participantEmail}</span>
                      </div>
                    </div>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-widest border flex-shrink-0 ${
                        a.notificationStatus === 'Sent'
                          ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-300'
                          : a.notificationStatus === 'Failed'
                            ? 'bg-rose-500/10 border-rose-500/25 text-rose-300'
                            : a.notificationStatus === 'Pending'
                              ? 'bg-amber-500/10 border-amber-500/25 text-amber-300'
                              : 'bg-white/5 border-white/15 text-white/50'
                      }`}
                    >
                      {a.notificationStatus}
                    </span>
                  </div>
                ))}
                {accessRows.length > 20 && (
                  <span className="text-[10px] text-white/40">
                    Showing 20 of {accessRows.length} — see the table below for all participants.
                  </span>
                )}
              </div>
            )}
          </div>

          <div className="flex flex-col gap-4 rounded-2xl bg-zinc-950/60 border border-white/10 p-5">
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative w-full md:w-72">
                <Search className="w-4 h-4 text-white/40 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search name, email, registration ID, team..."
                  className="w-full pl-9 pr-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-xs placeholder-white/30 focus:outline-none focus:border-violet-500/50"
                />
              </div>
              <select value={paymentFilter} onChange={(e) => setPaymentFilter(e.target.value as any)} className="bg-zinc-900 border border-white/10 text-white text-xs rounded-xl px-3 py-2.5 focus:outline-none">
                {PAYMENT_FILTERS.map((f) => (
                  <option key={f} value={f}>Payment: {f}</option>
                ))}
              </select>
              <select value={verificationFilter} onChange={(e) => setVerificationFilter(e.target.value as any)} className="bg-zinc-900 border border-white/10 text-white text-xs rounded-xl px-3 py-2.5 focus:outline-none">
                {VERIFICATION_FILTERS.map((f) => (
                  <option key={f} value={f}>Verification: {f}</option>
                ))}
              </select>
              <select value={teamFilter} onChange={(e) => setTeamFilter(e.target.value as any)} className="bg-zinc-900 border border-white/10 text-white text-xs rounded-xl px-3 py-2.5 focus:outline-none">
                {TEAM_FILTERS.map((f) => (
                  <option key={f} value={f}>Team: {f}</option>
                ))}
              </select>
              <select value={notificationFilter} onChange={(e) => setNotificationFilter(e.target.value as any)} className="bg-zinc-900 border border-white/10 text-white text-xs rounded-xl px-3 py-2.5 focus:outline-none">
                {NOTIFICATION_FILTERS.map((f) => (
                  <option key={f} value={f}>Notification: {f}</option>
                ))}
              </select>
            </div>

            <div className="overflow-x-auto custom-scrollbar">
              <table className="w-full text-left border-collapse min-w-[1000px]">
                <thead>
                  <tr className="text-[9px] uppercase tracking-widest text-white/40 border-b border-white/10">
                    <th className="py-2.5 px-2 font-bold">Name</th>
                    <th className="py-2.5 px-2 font-bold">Registration ID</th>
                    <th className="py-2.5 px-2 font-bold">Email</th>
                    <th className="py-2.5 px-2 font-bold">Payment</th>
                    <th className="py-2.5 px-2 font-bold">Verification</th>
                    <th className="py-2.5 px-2 font-bold">Team</th>
                    <th className="py-2.5 px-2 font-bold">Eligibility</th>
                    <th className="py-2.5 px-2 font-bold">Notification</th>
                    <th className="py-2.5 px-2 font-bold" />
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((r) => (
                    <tr key={r.registrationId} className="border-b border-white/5 hover:bg-white/[0.02] text-xs">
                      <td className="py-2.5 px-2 text-white font-bold whitespace-nowrap">{r.name}</td>
                      <td className="py-2.5 px-2 text-white/60 font-mono">{r.registrationId}</td>
                      <td className="py-2.5 px-2 text-white/50">{r.email || '—'}</td>
                      <td className="py-2.5 px-2">
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-widest border ${
                          r.paymentStatus.toLowerCase() === 'verified'
                            ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-300'
                            : 'bg-white/5 border-white/15 text-white/50'
                        }`}>
                          {r.paymentStatus.toLowerCase() === 'verified' ? 'Paid' : 'Pending'}
                        </span>
                      </td>
                      <td className="py-2.5 px-2">
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-widest border ${
                          r.verificationStatus.toLowerCase() === 'verified'
                            ? 'bg-cyan-500/10 border-cyan-500/25 text-cyan-300'
                            : 'bg-white/5 border-white/15 text-white/50'
                        }`}>
                          {r.verificationStatus.toLowerCase() === 'verified' ? 'Verified' : 'Unverified'}
                        </span>
                      </td>
                      <td className="py-2.5 px-2">
                        {r.inTeam ? (
                          <span className="flex flex-col">
                            <span className="text-white font-bold">{r.teamName}</span>
                            <span className="text-[10px] text-white/40 font-mono">
                              {r.teamCode} · {r.teamRole}
                            </span>
                          </span>
                        ) : (
                          <span className="text-white/40">Not in team</span>
                        )}
                      </td>
                      <td className="py-2.5 px-2">
                        {r.eligible ? (
                          <span className="flex items-center gap-1 text-emerald-300 font-bold">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Eligible
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-white/40">
                            <XCircle className="w-3.5 h-3.5" /> Not eligible
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-2">
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-widest border ${
                          (r.access?.notificationStatus || 'Not Sent') === 'Sent'
                            ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-300'
                            : (r.access?.notificationStatus || 'Not Sent') === 'Failed'
                              ? 'bg-rose-500/10 border-rose-500/25 text-rose-300'
                              : (r.access?.notificationStatus || 'Not Sent') === 'Pending'
                                ? 'bg-amber-500/10 border-amber-500/25 text-amber-300'
                                : 'bg-white/5 border-white/15 text-white/50'
                        }`}>
                          {r.access?.notificationStatus || 'Not Sent'}
                        </span>
                      </td>
                      <td className="py-2.5 px-2 text-right">
                        <button
                          onClick={() => setViewing(r)}
                          className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/60 hover:text-white cursor-pointer"
                          title="View participant"
                        >
                          <User className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {filtered.length === 0 && (
                    <tr>
                      <td colSpan={9} className="py-8 text-center text-white/40 text-xs">
                        No registrations match your filters.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      <ConfirmationDialog
        open={enableOpen}
        title="Enable team formation for this event?"
        message={
          <>
            Only participants who have completed payment and registration verification will be allowed to
            create or join a team. Eligible participants will receive the "Team Formation is Now Open"
            notification.
          </>
        }
        confirmLabel="Enable Team Formation"
        cancelLabel="Cancel"
        variant="success"
        loading={acting}
        onConfirm={handleEnable}
        onCancel={() => setEnableOpen(false)}
      />

      <ConfirmationDialog
        open={disableOpen}
        title="Disable Team Formation?"
        message="Team formation is currently disabled for this event. Existing teams are preserved; participants can no longer create or join teams."
        confirmLabel="Disable Team Formation"
        cancelLabel="Cancel"
        variant="warning"
        loading={acting}
        onConfirm={handleDisable}
        onCancel={() => setDisableOpen(false)}
      />

      {viewing && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-zinc-950 border border-white/20 rounded-3xl p-6 shadow-2xl flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <h3 className="text-base font-bold font-display text-white">Participant Details</h3>
              <button onClick={() => setViewing(null)} className="p-2 rounded-xl text-white/60 hover:text-white bg-white/5 border border-white/10 cursor-pointer">
                <XCircle className="w-4 h-4" />
              </button>
            </div>
            <div className="flex flex-col gap-2 text-xs">
              <div className="flex justify-between gap-4"><span className="text-white/40">Name</span><span className="text-white font-bold text-right">{viewing.name}</span></div>
              <div className="flex justify-between gap-4"><span className="text-white/40">Email</span><span className="text-white text-right">{viewing.email || '—'}</span></div>
              <div className="flex justify-between gap-4"><span className="text-white/40">Registration ID</span><span className="text-white font-mono text-right">{viewing.registrationId}</span></div>
              <div className="flex justify-between gap-4">
                <span className="text-white/40">Payment</span>
                <span className={viewing.paymentStatus.toLowerCase() === 'verified' ? 'text-emerald-300 font-bold' : 'text-amber-300 font-bold'}>
                  {viewing.paymentStatus.toLowerCase() === 'verified' ? 'Verified' : 'Pending'}
                </span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-white/40">Registration Desk</span>
                <span className={viewing.verificationStatus.toLowerCase() === 'verified' ? 'text-emerald-300 font-bold' : 'text-amber-300 font-bold'}>
                  {viewing.verificationStatus.toLowerCase() === 'verified' ? 'Verified' : 'Unverified'}
                </span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-white/40">Team</span>
                <span className="text-white text-right">{viewing.inTeam ? `${viewing.teamName} (${viewing.teamCode})` : 'Not in team'}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-white/40">Team Eligibility</span>
                <span className={viewing.eligible ? 'text-emerald-300 font-bold' : 'text-white/40'}>
                  {viewing.eligible ? 'Eligible' : 'Not eligible'}
                </span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-white/40">Notification</span>
                <span className="text-white text-right">{viewing.access?.notificationStatus || 'Not Sent'}</span>
              </div>
              {viewing.access?.notificationSentAt && (
                <div className="flex justify-between gap-4">
                  <span className="text-white/40">Notification Sent At</span>
                  <span className="text-white text-right">{new Date(viewing.access.notificationSentAt).toLocaleString()}</span>
                </div>
              )}
              {viewing.access?.notificationError && (
                <div className="flex justify-between gap-4">
                  <span className="text-white/40">Notification Error</span>
                  <span className="text-rose-300 text-right">{viewing.access.notificationError}</span>
                </div>
              )}
              {viewing.access?.notificationMessage && (
                <div className="flex flex-col gap-1 border-t border-white/10 pt-3">
                  <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Notification</span>
                  <span className="text-[11px] text-white/70 leading-relaxed">{viewing.access.notificationMessage}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
