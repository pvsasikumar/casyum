import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Users,
  Lock,
  Unlock,
  Copy,
  Check,
  Trophy,
  LogOut,
  AlertCircle,
  Loader2,
  UserRound,
  BadgeCheck,
} from 'lucide-react';
import {
  createTeam,
  joinTeam,
  leaveTeam,
  listTeamMembers,
  listTeamsForParticipant,
  type Team,
  type TeamMember,
} from '../services/teamService';

interface TeamFormationSectionProps {
  participantId: string;
  /** All events (with team config fields read from Firestore, snake_case). */
  events: any[];
  /**
   * The participant's registration records (participant.registered_events).
   * Each record carries payment_status, registration_verification_status and
   * the event_ids it covers, so eligibility is computed per event.
   */
  registrations: any[];
}

interface TeamEntry {
  eventId: string;
  team: Team | null;
  members: TeamMember[];
  loading: boolean;
}

interface EventCardProps {
  event: any;
  entry: TeamEntry;
  participantId: string;
  isLeader: boolean;
  canAct: boolean;
  onCreated: (team: Team) => void;
  onJoined: (team: Team) => void;
  onLeft: () => void;
}

const copyToClipboard = async (text: string): Promise<boolean> => {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      return true;
    } catch {
      return false;
    }
  }
};

const sizeLabel = (e: any): string => {
  const min = Number(e.min_team_size) || 0;
  const max = Number(e.max_team_size) || 0;
  if (min <= 0 || max <= 0) return '';
  if (min === max) return `Exactly ${min} members`;
  return `${min}–${max} members`;
};

export const TeamFormationSection: React.FC<TeamFormationSectionProps> = ({
  participantId,
  events,
  registrations,
}) => {
  /**
   * Map each event id to the registration record that covers it, so payment and
   * Registration Desk verification can be checked per event.
   */
  const eventRegs = useMemo(() => {
    const map = new Map<string, any>();
    (registrations || []).forEach((r) => {
      const ids: string[] = Array.isArray(r?.event_ids)
        ? r.event_ids.map(String)
        : r?.event_id
          ? [String(r.event_id)]
          : [];
      ids.forEach((id) => {
        if (!map.has(id)) map.set(id, r);
      });
    });
    return map;
  }, [registrations]);

  /** All team events the participant is registered for (the eligibility gate
   *  is applied below so locked or unverified events stay hidden). */
  const teamEvents = useMemo(
    () =>
      (events || []).filter(
        (e) => e?.team_event === true && eventRegs.has(String(e?.id))
      ),
    [events, eventRegs]
  );

  const isEventEligible = useCallback(
    (ev: any): boolean => {
      const reg = eventRegs.get(String(ev?.id));
      if (!reg) return false;
      if (ev?.team_formation_enabled !== true) return false;
      const paymentVerified = String(reg.payment_status || '').toLowerCase() === 'verified';
      if (!paymentVerified) return false;
      const deskVerified = String(reg.registration_verification_status || '').toLowerCase() === 'verified';
      return deskVerified;
    },
    [eventRegs]
  );

  const [entries, setEntries] = useState<Record<string, TeamEntry>>({});
  const [loadingTeams, setLoadingTeams] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const refresh = useCallback(async () => {
    if (teamEvents.length === 0) return;
    setLoadingTeams(true);
    try {
      const teams = await listTeamsForParticipant(participantId);
      const byEvent = new Map<string, Team>();
      teams.forEach(({ team }) => byEvent.set(team.eventId, team));

      const next: Record<string, TeamEntry> = {};
      await Promise.all(
        teamEvents.map(async (ev) => {
          const eventId = String(ev.id);
          const team = byEvent.get(eventId) || null;
          const members = team ? await listTeamMembers(team.id) : [];
          next[eventId] = { eventId, team, members, loading: false };
        })
      );
      setEntries(next);
    } finally {
      setLoadingTeams(false);
    }
  }, [teamEvents, participantId]);

  useEffect(() => {
    refresh();
  }, [refresh, refreshKey]);

  /**
   * Only events the participant is eligible for (team formation enabled AND
   * payment verified AND Registration Desk verified) are shown. The one
   * exception: an event the participant already has a team in stays visible so
   * they can still view their team even after formation is locked.
   */
  const visibleEvents = useMemo(
    () => teamEvents.filter((ev) => isEventEligible(ev) || Boolean(entries[String(ev.id)]?.team)),
    [teamEvents, isEventEligible, entries]
  );

  if (visibleEvents.length === 0) return null;

  const handleCreated = async (team: Team) => {
    const members = await listTeamMembers(team.id);
    setEntries((prev) => ({
      ...prev,
      [team.eventId]: { eventId: team.eventId, team, members, loading: false },
    }));
  };

  const handleJoined = async (team: Team) => {
    const members = await listTeamMembers(team.id);
    setEntries((prev) => ({
      ...prev,
      [team.eventId]: { eventId: team.eventId, team, members, loading: false },
    }));
  };

  const handleLeft = (eventId: string) => {
    setEntries((prev) => ({
      ...prev,
      [eventId]: { eventId, team: null, members: [], loading: false },
    }));
    setRefreshKey((k) => k + 1);
  };

  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-300">
            <Users className="w-4 h-4" />
          </div>
          <div className="flex flex-col">
            <h2 className="text-sm font-extrabold tracking-tight font-display uppercase">
              Team <span className="text-gradient">Formation</span>
            </h2>
            <span className="text-[10px] text-white/40">
              Create or join a team for your team events
            </span>
          </div>
        </div>
        <span className="px-3 py-1.5 rounded-xl text-[10px] font-bold uppercase tracking-widest border bg-amber-500/10 border-amber-500/25 text-amber-300">
          {visibleEvents.length} team event{visibleEvents.length === 1 ? '' : 's'}
        </span>
      </div>

      {loadingTeams && (
        <div className="flex items-center gap-2 text-white/40 text-xs">
          <Loader2 className="w-4 h-4 animate-spin text-violet-400" />
          Loading your teams...
        </div>
      )}

      <div className="flex flex-col gap-4">
        {visibleEvents.map((ev) => {
          const eventId = String(ev.id);
          const entry = entries[eventId] || { eventId, team: null, members: [], loading: true };
          const team = entry.team;
          const isLeader = team?.teamLeaderId === participantId;
          return (
            <TeamEventCard
              key={eventId}
              event={ev}
              entry={entry}
              participantId={participantId}
              isLeader={isLeader}
              canAct={isEventEligible(ev)}
              onCreated={handleCreated}
              onJoined={handleJoined}
              onLeft={() => handleLeft(eventId)}
            />
          );
        })}
      </div>
    </section>
  );
};

const TeamEventCard: React.FC<EventCardProps> = ({
  event,
  entry,
  participantId,
  isLeader,
  canAct,
  onCreated,
  onJoined,
  onLeft,
}) => {
  const [showCreate, setShowCreate] = useState(false);
  const [showJoin, setShowJoin] = useState(false);
  const [teamName, setTeamName] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  const formationOpen = event?.team_formation_enabled === true;
  const team = entry.team;
  const sizeNote = sizeLabel(event);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const created = await createTeam({
        eventId: String(event.id),
        eventName: event.name,
        teamName,
        participantId,
      });
      // participantId resolved by the parent through the closure
      setShowCreate(false);
      setTeamName('');
      onCreated(created);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create team.');
    } finally {
      setBusy(false);
    }
  };

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const joined = await joinTeam({ teamCode: joinCode, participantId });
      setShowJoin(false);
      setJoinCode('');
      onJoined(joined);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to join team.');
    } finally {
      setBusy(false);
    }
  };

  const handleCopyCode = async () => {
    if (!team) return;
    setCopied(await copyToClipboard(team.teamCode));
    setTimeout(() => setCopied(false), 1500);
  };

  const handleLeave = async () => {
    if (!team) return;
    setError('');
    setBusy(true);
    try {
      await leaveTeam({ teamId: team.id, participantId });
      onLeft();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to leave team.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 flex flex-col gap-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-col gap-1 min-w-0">
          <span className="text-[9px] font-bold uppercase tracking-widest text-amber-400/80 flex items-center gap-1">
            <Trophy className="w-3 h-3" />
            Team Event
          </span>
          <h3 className="text-base font-bold tracking-tight">{event.name}</h3>
          {sizeNote && <span className="text-[11px] text-white/40">{sizeNote}</span>}
        </div>
        <span
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-bold uppercase tracking-widest border ${
            formationOpen
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
              : 'bg-white/5 border-white/10 text-white/40'
          }`}
        >
          {formationOpen ? <Unlock className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
          {formationOpen ? 'Open' : 'Locked'}
        </span>
      </div>

      {!formationOpen && (
        <div className="flex items-start gap-2 px-3 py-2.5 rounded-xl bg-amber-500/10 border border-amber-500/25 text-amber-300 text-xs">
          <Lock className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
          <span>Team Formation is currently disabled for this event.</span>
        </div>
      )}

      {entry.loading ? (
        <div className="flex items-center gap-2 text-white/40 text-xs">
          <Loader2 className="w-4 h-4 animate-spin text-violet-400" />
          Loading team...
        </div>
      ) : team ? (
        <TeamView
          team={team}
          members={entry.members}
          isLeader={isLeader}
          displayStatus={team.status === 'Complete' ? 'Complete' : formationOpen ? 'Forming' : 'Incomplete'}
          canLeave={formationOpen}
          copied={copied}
          onCopy={handleCopyCode}
          onLeave={handleLeave}
          busy={busy}
        />
      ) : (
        <>
          <div className="flex flex-col gap-3">
            {showCreate ? (
              <form onSubmit={handleCreate} className="flex flex-col gap-2.5">
                <input
                  value={teamName}
                  onChange={(e) => setTeamName(e.target.value)}
                  placeholder="Enter your team name"
                  maxLength={40}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-violet-500/50 text-white placeholder-white/30"
                />
                <div className="flex items-center gap-2">
                  <button
                    type="submit"
                    disabled={busy || !teamName.trim()}
                    className="px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-[10px] font-bold uppercase tracking-widest transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {busy ? 'Creating...' : 'Create Team'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowCreate(false)}
                    className="px-4 py-2 rounded-xl text-white/60 hover:text-white bg-white/5 border border-white/10 text-[10px] font-bold cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            ) : showJoin ? (
              <form onSubmit={handleJoin} className="flex flex-col gap-2.5">
                <input
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                  placeholder="Enter Team ID (e.g. HACK-7F42K)"
                  maxLength={12}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-xs uppercase focus:outline-none focus:border-violet-500/50 text-white placeholder-white/30 placeholder:normal-case"
                />
                <div className="flex items-center gap-2">
                  <button
                    type="submit"
                    disabled={busy || !joinCode.trim()}
                    className="px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-[10px] font-bold uppercase tracking-widest transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {busy ? 'Joining...' : 'Join Team'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowJoin(false)}
                    className="px-4 py-2 rounded-xl text-white/60 hover:text-white bg-white/5 border border-white/10 text-[10px] font-bold cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            ) : (
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setShowCreate(true)}
                  disabled={!canAct}
                  className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-violet-500 to-indigo-600 hover:from-violet-600 hover:to-indigo-700 text-white text-[10px] font-bold uppercase tracking-widest transition-all shadow-lg shadow-violet-500/20 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Create Team
                </button>
                <button
                  onClick={() => setShowJoin(true)}
                  disabled={!canAct}
                  className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/70 hover:text-white text-[10px] font-bold uppercase tracking-widest transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Join with Team ID
                </button>
              </div>
            )}
            {error && (
              <p className="flex items-start gap-1.5 text-[11px] text-rose-300">
                <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                {error}
              </p>
            )}
          </div>
        </>
      )}
    </div>
  );
};

interface TeamViewProps {
  team: Team;
  members: TeamMember[];
  isLeader: boolean;
  displayStatus: 'Forming' | 'Complete' | 'Incomplete';
  canLeave: boolean;
  copied: boolean;
  busy: boolean;
  onCopy: () => void;
  onLeave: () => void;
}

const TeamView: React.FC<TeamViewProps> = ({
  team,
  members,
  isLeader,
  displayStatus,
  canLeave,
  copied,
  busy,
  onCopy,
  onLeave,
}) => {
  const [confirmLeave, setConfirmLeave] = useState(false);

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-violet-500/25 bg-violet-500/[0.04] p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-col gap-1 min-w-0">
          <span className="text-sm font-bold text-white flex items-center gap-2">
            {team.teamName}
            {isLeader && (
              <span className="px-2 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 text-[9px] font-bold uppercase tracking-widest">
                Team Leader
              </span>
            )}
          </span>
          <span className="text-[11px] text-white/40">
            {team.currentMemberCount}/{team.maxTeamSize} members ·{' '}
            <span className={displayStatus === 'Complete' ? 'text-emerald-300 font-bold' : displayStatus === 'Incomplete' ? 'text-rose-300 font-bold' : 'text-amber-300 font-bold'}>
              {displayStatus}
            </span>
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onCopy}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/70 hover:text-white text-[10px] font-bold cursor-pointer"
            title="Copy team ID"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span className="font-mono">{team.teamCode}</span>
          </button>
          {canLeave && (
            <button
              onClick={() => setConfirmLeave(true)}
              disabled={busy}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/25 text-rose-300 text-[10px] font-bold cursor-pointer disabled:opacity-40"
            >
              <LogOut className="w-3.5 h-3.5" />
              Leave Team
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <span className="text-[10px] font-bold uppercase tracking-widest text-white/40">Team Members</span>
        {members.length === 0 ? (
          <span className="text-[11px] text-white/40">No members yet.</span>
        ) : (
          members.map((m) => (
            <div
              key={m.id}
              className="flex items-center justify-between gap-3 px-3 py-2 rounded-xl bg-white/[0.03] border border-white/10"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="w-7 h-7 rounded-full bg-violet-500/15 border border-violet-500/30 flex items-center justify-center flex-shrink-0">
                  <UserRound className="w-3.5 h-3.5 text-violet-300" />
                </span>
                <div className="flex flex-col min-w-0">
                  <span className="text-xs font-bold text-white truncate flex items-center gap-1.5">
                    {m.participantName || 'Participant'}
                    {m.role === 'Leader' && <BadgeCheck className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />}
                  </span>
                  <span className="text-[10px] text-white/40 font-mono">
                    {m.casyumId || m.registrationId}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-emerald-300 text-[9px] font-bold uppercase tracking-widest">
                  {m.paymentStatus === 'verified' ? 'Paid' : m.paymentStatus || 'Paid'}
                </span>
                <span className="text-[10px] text-white/50">{m.role}</span>
              </div>
            </div>
          ))
        )}
      </div>

      {confirmLeave && (
        <div className="flex flex-col gap-2.5 px-3 py-3 rounded-xl bg-rose-500/10 border border-rose-500/25">
          <p className="text-[11px] text-rose-200">
            Are you sure you want to leave this team? You can join another team for this event
            while team formation is open.
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setConfirmLeave(false);
                onLeave();
              }}
              disabled={busy}
              className="px-3.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-[10px] font-bold cursor-pointer disabled:opacity-40"
            >
              {busy ? 'Leaving...' : 'Leave Team'}
            </button>
            <button
              onClick={() => setConfirmLeave(false)}
              className="px-3.5 py-1.5 rounded-lg text-white/60 hover:text-white bg-white/5 border border-white/10 text-[10px] font-bold cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
