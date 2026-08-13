import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Search,
  Users,
  Trophy,
  Trash2,
  BadgeCheck,
  ShieldCheck,
  Copy,
  Check,
  Settings,
  Loader2,
} from 'lucide-react';
import { useAdmin } from '../../context/AdminContext';
import { ConfirmationDialog } from '../common/ConfirmationDialog';
import {
  listTeamsByEvent,
  listTeamMembers,
  removeMember,
  disbandTeam,
  teamDisplayStatus,
  type Team,
  type TeamMember,
} from '../../../services/teamService';
import { listRegistrationsByEvent } from '../../../services/registrationService';

interface TeamWithMembers {
  team: Team;
  members: TeamMember[];
}

const copyToClipboard = async (text: string): Promise<boolean> => {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
};

export const TeamsModule: React.FC = () => {
  const { events, openTeamSettings, pushNotification } = useAdmin();
  const [selectedEventId, setSelectedEventId] = useState('');
  const [search, setSearch] = useState('');
  const [teams, setTeams] = useState<TeamWithMembers[]>([]);
  const [registeredCount, setRegisteredCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [copiedId, setCopiedId] = useState('');

  const [disbandTarget, setDisbandTarget] = useState<Team | null>(null);
  const [removeTarget, setRemoveTarget] = useState<{ team: Team; member: TeamMember } | null>(null);
  const [acting, setActing] = useState(false);

  const teamEvents = useMemo(() => events.filter((e) => e.teamEvent === true), [events]);

  const selectedEvent = useMemo(
    () => teamEvents.find((e) => e.id === selectedEventId),
    [teamEvents, selectedEventId]
  );

  const load = useCallback(async (eventId: string) => {
    setIsLoading(true);
    try {
      const rawTeams = await listTeamsByEvent(eventId);
      const withMembers = await Promise.all(
        rawTeams.map(async (team) => ({
          team,
          members: await listTeamMembers(team.id),
        }))
      );
      withMembers.sort((a, b) => String(a.team.createdAt).localeCompare(String(b.team.createdAt)));
      setTeams(withMembers);
      const regs = await listRegistrationsByEvent(eventId).catch(() => []);
      setRegisteredCount(regs.filter((r) => r.status !== 'Cancelled').length);
    } catch {
      setTeams([]);
      setRegisteredCount(0);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selectedEventId) {
      load(selectedEventId);
    } else {
      setTeams([]);
    }
  }, [selectedEventId, load]);

  const filtered = useMemo(
    () =>
      teams.filter((t) => {
        const q = search.toLowerCase();
        if (!q) return true;
        return (
          t.team.teamName.toLowerCase().includes(q) ||
          t.team.teamCode.toLowerCase().includes(q) ||
          t.members.some(
            (m) =>
              (m.participantName || '').toLowerCase().includes(q) ||
              (m.casyumId || '').toLowerCase().includes(q)
          )
        );
      }),
    [teams, search]
  );

  const stats = useMemo(() => {
    const formationEnabled = selectedEvent?.teamFormationEnabled === true;
    const forming = teams.filter((t) => teamDisplayStatus(t.team, formationEnabled) === 'Forming').length;
    const complete = teams.filter((t) => teamDisplayStatus(t.team, formationEnabled) === 'Complete').length;
    const incomplete = teams.filter((t) => teamDisplayStatus(t.team, formationEnabled) === 'Incomplete').length;
    const inTeams = teams.reduce((sum, t) => sum + (t.team.currentMemberCount || 0), 0);
    return {
      total: teams.length,
      forming,
      complete,
      incomplete,
      inTeams,
      withoutTeams: Math.max(registeredCount - inTeams, 0),
    };
  }, [teams, registeredCount, selectedEvent]);

  const handleDisband = async () => {
    if (!disbandTarget) return;
    setActing(true);
    try {
      await disbandTeam(disbandTarget.id);
      pushNotification('Team Disbanded', `Team "${disbandTarget.teamName}" was disbanded.`, 'success');
      setDisbandTarget(null);
      if (selectedEventId) await load(selectedEventId);
    } catch (err) {
      pushNotification('Error', err instanceof Error ? err.message : 'Failed to disband team.', 'error');
    } finally {
      setActing(false);
    }
  };

  const handleRemoveMember = async () => {
    if (!removeTarget) return;
    setActing(true);
    try {
      await removeMember({ teamId: removeTarget.team.id, memberId: removeTarget.member.id });
      pushNotification(
        'Member Removed',
        `${removeTarget.member.participantName || 'Member'} removed from "${removeTarget.team.teamName}".`,
        'success'
      );
      setRemoveTarget(null);
      if (selectedEventId) await load(selectedEventId);
    } catch (err) {
      pushNotification('Error', err instanceof Error ? err.message : 'Failed to remove member.', 'error');
    } finally {
      setActing(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 select-none pb-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-col">
          <span className="text-xs font-bold text-violet-400 uppercase tracking-widest">Teams</span>
          <h2 className="text-xl sm:text-2xl font-extrabold font-display text-white">Team Monitoring</h2>
          <p className="text-[11px] text-white/40 mt-1">
            Monitor teams formed for team events, remove members, and disband teams. Participant
            registrations are preserved on disband.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative w-full md:w-64">
            <Search className="w-4 h-4 text-white/40 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search teams, codes, members..."
              className="w-full pl-9 pr-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-xs placeholder-white/30 focus:outline-none focus:border-violet-500/50"
            />
          </div>
          <select
            value={selectedEventId}
            onChange={(e) => setSelectedEventId(e.target.value)}
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

      {selectedEvent && (
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 rounded-2xl bg-amber-500/5 border border-amber-500/20">
          <div className="flex items-center gap-2.5">
            <span className="text-xs font-bold text-white">{selectedEvent.name}</span>
            <span className="text-[11px] text-white/40">
              {selectedEvent.minTeamSize}-{selectedEvent.maxTeamSize} members ·{' '}
              {selectedEvent.teamFormationEnabled ? 'Formation OPEN' : 'Formation LOCKED'}
            </span>
          </div>
          <button
            onClick={() => openTeamSettings(selectedEvent.id)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-bold uppercase tracking-widest border cursor-pointer transition-all bg-white/5 border-white/20 text-white/80 hover:bg-white/10"
          >
            <Settings className="w-3.5 h-3.5 text-cyan-300" /> Team Settings
          </button>
        </div>
      )}

      {selectedEventId && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div className="flex flex-col gap-1 p-4 rounded-2xl bg-zinc-950/60 border border-white/10">
            <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Total Teams</span>
            <span className="text-2xl font-extrabold font-display text-white">{stats.total}</span>
          </div>
          <div className="flex flex-col gap-1 p-4 rounded-2xl bg-zinc-950/60 border border-amber-500/25">
            <span className="text-[10px] font-bold text-amber-300/70 uppercase tracking-widest">Forming</span>
            <span className="text-2xl font-extrabold font-display text-amber-300">{stats.forming}</span>
          </div>
          <div className="flex flex-col gap-1 p-4 rounded-2xl bg-zinc-950/60 border border-emerald-500/25">
            <span className="text-[10px] font-bold text-emerald-300/70 uppercase tracking-widest">Complete</span>
            <span className="text-2xl font-extrabold font-display text-emerald-300">{stats.complete}</span>
          </div>
          <div className="flex flex-col gap-1 p-4 rounded-2xl bg-zinc-950/60 border border-rose-500/25">
            <span className="text-[10px] font-bold text-rose-300/70 uppercase tracking-widest">Incomplete</span>
            <span className="text-2xl font-extrabold font-display text-rose-300">{stats.incomplete}</span>
          </div>
          <div className="flex flex-col gap-1 p-4 rounded-2xl bg-zinc-950/60 border border-cyan-500/25">
            <span className="text-[10px] font-bold text-cyan-300/70 uppercase tracking-widest">Participants in Teams</span>
            <span className="text-2xl font-extrabold font-display text-cyan-300">{stats.inTeams}</span>
          </div>
          <div className="flex flex-col gap-1 p-4 rounded-2xl bg-zinc-950/60 border border-white/10">
            <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Without Teams</span>
            <span className="text-2xl font-extrabold font-display text-white">{stats.withoutTeams}</span>
          </div>
        </div>
      )}

      {!selectedEventId ? (
        <div className="p-12 text-center text-xs text-white/40 rounded-3xl bg-zinc-950/60 border border-white/10">
          Select a team event to view its teams.
        </div>
      ) : isLoading ? (
        <div className="flex items-center gap-2 text-white/40 text-xs">
          <Loader2 className="w-4 h-4 animate-spin text-violet-400" />
          Loading teams...
        </div>
      ) : filtered.length === 0 ? (
        <div className="p-12 text-center text-xs text-white/40 rounded-3xl bg-zinc-950/60 border border-white/10">
          {teams.length === 0 ? 'No teams formed for this event yet.' : 'No teams match your search.'}
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {filtered.map(({ team, members }) => {
            const leader = members.find((m) => m.role === 'Leader');
            return (
              <div
                key={team.id}
                className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 flex flex-col gap-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-col gap-1 min-w-0">
                    <span className="text-sm font-bold text-white flex items-center gap-2">
                      <Trophy className="w-4 h-4 text-amber-400 flex-shrink-0" />
                      {team.teamName}
                    </span>
                    <span className="text-[11px] text-white/40">
                      {team.currentMemberCount}/{team.maxTeamSize} members · required {team.minTeamSize}–
                      {team.maxTeamSize} · {leader?.participantName || 'No leader'}
                    </span>
                    <span className="text-[10px] text-white/30">
                      Created by {team.createdBy || team.teamLeaderId || '—'} on{' '}
                      {team.createdAt ? new Date(team.createdAt).toLocaleString() : '—'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={async () => {
                        setCopiedId((await copyToClipboard(team.teamCode)) ? team.id : '');
                        setTimeout(() => setCopiedId(''), 1500);
                      }}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/70 hover:text-white text-[10px] font-bold cursor-pointer"
                      title="Copy team ID"
                    >
                      {copiedId === team.id ? (
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                      <span className="font-mono">{team.teamCode}</span>
                    </button>
                    <span
                      className={`px-2.5 py-1.5 rounded-xl text-[10px] font-bold uppercase tracking-widest border ${
                        team.status === 'Complete'
                          ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                          : selectedEvent?.teamFormationEnabled
                            ? 'bg-amber-500/10 border-amber-500/30 text-amber-300'
                            : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                      }`}
                    >
                      {teamDisplayStatus(team, selectedEvent?.teamFormationEnabled === true)}
                    </span>
                    <button
                      onClick={() => setDisbandTarget(team)}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/25 text-rose-300 text-[10px] font-bold cursor-pointer"
                      title="Disband team (keeps registrations)"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Disband
                    </button>
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-white/40">
                    Team Members
                  </span>
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
                            <Users className="w-3.5 h-3.5 text-violet-300" />
                          </span>
                          <div className="flex flex-col min-w-0">
                            <span className="text-xs font-bold text-white truncate flex items-center gap-1.5">
                              {m.participantName || 'Participant'}
                              {m.role === 'Leader' && (
                                <BadgeCheck className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
                              )}
                            </span>
                            <span className="text-[10px] text-white/40 font-mono">
                              {m.casyumId || m.registrationId}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-emerald-300 text-[9px] font-bold uppercase tracking-widest">
                            {m.paymentStatus === 'verified' ? 'Paid' : 'Unpaid'}
                          </span>
                          <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/25 text-cyan-300 text-[9px] font-bold uppercase tracking-widest">
                            <ShieldCheck className="w-3 h-3" />
                            Verified
                          </span>
                          <span className="text-[10px] text-white/50">{m.role}</span>
                          {m.role !== 'Leader' && (
                            <button
                              onClick={() => setRemoveTarget({ team, member: m })}
                              className="p-1.5 rounded-lg bg-white/5 hover:bg-rose-500/20 text-white/40 hover:text-rose-400 cursor-pointer"
                              title="Remove member"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <ConfirmationDialog
        open={disbandTarget !== null}
        title="Disband Team?"
        message={`Disband "${disbandTarget?.teamName}"? All members will be removed from the team. Their event registrations are preserved.`}
        confirmLabel="Disband Team"
        onConfirm={handleDisband}
        onCancel={() => setDisbandTarget(null)}
        loading={acting}
      />

      <ConfirmationDialog
        open={removeTarget !== null}
        title="Remove Member?"
        message={`Remove ${removeTarget?.member.participantName || 'this member'} from "${removeTarget?.team.teamName}"?`}
        confirmLabel="Remove Member"
        onConfirm={handleRemoveMember}
        onCancel={() => setRemoveTarget(null)}
        loading={acting}
      />
    </div>
  );
};
