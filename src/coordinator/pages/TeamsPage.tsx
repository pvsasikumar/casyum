import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Users,
  Trophy,
  ShieldCheck,
  ShieldAlert,
  Copy,
  Check,
  BadgeCheck,
  Loader2,
} from 'lucide-react';
import { useCoordinator } from '../context/CoordinatorContext';
import { NoEventAssigned } from '../components/NoEventAssigned';
import {
  listTeamsByEvent,
  listTeamMembers,
  teamDisplayStatus,
  type Team,
  type TeamMember,
} from '../../services/teamService';
import { listRegistrationsByEvent } from '../../services/registrationService';
import type { RegistrationRow } from '../../services/eventService';

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

export const TeamsPage: React.FC = () => {
  const navigate = useNavigate();
  const { assignedEvent } = useCoordinator();

  const [teams, setTeams] = useState<TeamWithMembers[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [registrations, setRegistrations] = useState<RegistrationRow[]>([]);
  const [copiedId, setCopiedId] = useState('');

  const load = useCallback(async (id: string) => {
    setIsLoading(true);
    try {
      const rawTeams = await listTeamsByEvent(id);
      const withMembers = await Promise.all(
        rawTeams.map(async (team) => ({
          team,
          members: await listTeamMembers(team.id),
        }))
      );
      withMembers.sort((a, b) =>
        String(a.team.createdAt).localeCompare(String(b.team.createdAt))
      );
      setTeams(withMembers);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (assignedEvent) {
      load(assignedEvent.id);
      listRegistrationsByEvent(assignedEvent.id).then(setRegistrations).catch(() => setRegistrations([]));
    } else {
      setTeams([]);
      setRegistrations([]);
    }
  }, [assignedEvent, load]);

  const regById = useMemo(() => {
    const map = new Map<string, RegistrationRow>();
    registrations.forEach((r) => {
      const pid = String(r.participant_user_id || r.participant_email || r.registration_id);
      map.set(pid, r);
    });
    return map;
  }, [registrations]);

  const stats = useMemo(() => {
    const formationEnabled = assignedEvent?.teamFormationEnabled === true;
    const forming = teams.filter((t) => teamDisplayStatus(t.team, formationEnabled) === 'Forming').length;
    const complete = teams.filter((t) => teamDisplayStatus(t.team, formationEnabled) === 'Complete').length;
    const incomplete = teams.filter((t) => teamDisplayStatus(t.team, formationEnabled) === 'Incomplete').length;
    return { total: teams.length, forming, complete, incomplete };
  }, [teams, assignedEvent?.teamFormationEnabled]);

  if (!assignedEvent) {
    return <NoEventAssigned />;
  }

  return (
    <div className="min-h-screen bg-black text-white selection:bg-violet-500/30 selection:text-violet-200">
      <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/coordinator/dashboard')}
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/60 hover:text-white transition-all cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div className="flex flex-col">
              <span className="text-[10px] font-bold text-violet-400 uppercase tracking-widest">
                Teams
              </span>
              <h2 className="text-lg sm:text-xl font-extrabold font-display text-white">
                {assignedEvent.name}
              </h2>
            </div>
          </div>
          <span
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-bold uppercase tracking-widest border ${
              assignedEvent.teamFormationEnabled
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                : 'bg-white/5 border-white/10 text-white/40'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            Formation {assignedEvent.teamFormationEnabled ? 'Open' : 'Locked'}
          </span>
        </div>

        {assignedEvent.teamEvent !== true ? (
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-8 text-center text-white/40 text-sm">
            This event is a solo event — no teams to manage.
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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
            </div>

            {isLoading ? (
              <div className="flex items-center gap-2 text-white/40 text-xs">
                <Loader2 className="w-4 h-4 animate-spin text-violet-400" />
                Loading teams...
              </div>
            ) : teams.length === 0 ? (
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-8 text-center text-white/40 text-sm">
                No teams formed yet.
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                {teams.map(({ team, members }) => {
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
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={async () => {
                              setCopiedId(await copyToClipboard(team.teamCode) ? team.id : '');
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
                                : assignedEvent.teamFormationEnabled === true
                                  ? 'bg-amber-500/10 border-amber-500/30 text-amber-300'
                                  : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                            }`}
                          >
                            {teamDisplayStatus(team, assignedEvent.teamFormationEnabled === true)}
                          </span>
                        </div>
                      </div>

                      <div className="flex flex-col gap-1.5">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-white/40">
                          Team Members
                        </span>
                        {members.length === 0 ? (
                          <span className="text-[11px] text-white/40">No members yet.</span>
                        ) : (
                          members.map((m) => {
                            const reg = regById.get(m.participantId);
                            const verificationStatus = reg?.registration_verification_status || 'locked';
                            return (
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
                                      {m.casyumId || m.registrationId || reg?.registration_id || m.participantId}
                                    </span>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2 flex-shrink-0">
                                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-emerald-300 text-[9px] font-bold uppercase tracking-widest">
                                    {m.paymentStatus === 'verified' ? 'Paid' : 'Unpaid'}
                                  </span>
                                  {verificationStatus === 'verified' ? (
                                    <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/25 text-cyan-300 text-[9px] font-bold uppercase tracking-widest">
                                      <ShieldCheck className="w-3 h-3" />
                                      Verified
                                    </span>
                                  ) : (
                                    <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-white/40 text-[9px] font-bold uppercase tracking-widest">
                                      <ShieldAlert className="w-3 h-3" />
                                      Pending
                                    </span>
                                  )}
                                  <span className="text-[10px] text-white/50">{m.role}</span>
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};
