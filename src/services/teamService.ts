import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  increment,
  onSnapshot,
  query,
  setDoc,
  updateDoc,
  where,
  arrayUnion,
  arrayRemove,
} from 'firebase/firestore';
import { getDb } from '../firebase/firestore';
import { now, nextSequence } from './helpers';
import { listRegistrationsByParticipant, listRegistrationsByEvent } from './registrationService';

/**
 * Team Formation System.
 *
 * New collections:
 *  - `teams/{teamId}`          — a team for one event
 *  - `teamMembers/{memberId}`  — a participant's membership in a team
 *
 * Registration documents (`eventRegistrations` + legacy `registrations`) mirror
 * the joined team as `teamId` (primary) and `teamIds` (array, since one
 * participant may join teams for different events). The registration write is
 * best-effort — the teamMembers collection is the source of truth.
 *
 * All team size rules are read from the event document at runtime; nothing is
 * hardcoded in the UI.
 */

export type TeamStatus = 'Forming' | 'Complete' | 'Incomplete' | 'Disbanded';

export interface Team {
  id: string;
  eventId: string;
  eventName?: string;
  teamName: string;
  teamCode: string;
  teamLeaderId: string;
  /** Participant id that created the team (identical to teamLeaderId on create). */
  createdBy: string;
  minTeamSize: number;
  maxTeamSize: number;
  currentMemberCount: number;
  /** Participant ids in the team (kept in sync with teamMembers for rules-side
   *  membership checks and leader delegation). */
  memberIds: string[];
  /** Storage status: a team is 'Forming' while below its minimum size and
   *  'Complete' once the minimum is reached. Display labels ('Incomplete',
   *  'Disbanded') are derived in `teamDisplayStatus`. */
  status: 'Forming' | 'Complete';
  createdAt: string;
  updatedAt: string;
}

/** Display status for a team. 'Incomplete' = below minimum size after team
 *  formation was locked. */
export function teamDisplayStatus(
  team: Pick<Team, 'status'>,
  formationEnabled: boolean
): TeamStatus {
  if (team.status === 'Complete') return 'Complete';
  return formationEnabled ? 'Forming' : 'Incomplete';
}

export interface TeamMember {
  id: string;
  teamId: string;
  eventId: string;
  participantId: string;
  registrationId: string;
  role: 'Leader' | 'Member';
  joinedAt: string;
  /** Stable identity mirrors captured at join time (participants may only read
   *  their own participants/registration docs, so the team view reads these). */
  participantName?: string;
  casyumId?: string;
  /** Payment status at join time. Payment must be verified before joining, so
   *  this is 'verified'; coordinators/admins read live status from registrations. */
  paymentStatus?: string;
}

export interface TeamConfig {
  exists: boolean;
  teamEvent: boolean;
  eventType: string;
  minTeamSize: number;
  maxTeamSize: number;
  formationEnabled: boolean;
  feeType: string;
}

export interface TeamEligibility {
  ok: boolean;
  reason?: string;
  registrationId?: string;
}

const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function deriveEventCodePrefix(eventName: string): string {
  const cleaned = String(eventName || '').replace(/[^A-Za-z0-9]/g, '').toUpperCase();
  const base = cleaned.slice(0, 4);
  if (base.length >= 4) return base;
  return (base + 'CASY').slice(0, 4);
}

function randomCodePart(length: number): string {
  let out = '';
  for (let i = 0; i < length; i += 1) {
    out += CODE_CHARS.charAt(Math.floor(Math.random() * CODE_CHARS.length));
  }
  return out;
}

/** A team is Complete once it reaches its minimum size; exact-size teams need equality. */
export function computeTeamStatus(count: number, min: number, max: number): Team['status'] {
  if (min > 0 && min === max) return count >= max ? 'Complete' : 'Forming';
  return count >= min ? 'Complete' : 'Forming';
}

/** Deterministic teamMembers doc id so the rules layer can enforce one member
 *  per participant per team without collection queries. */
function teamMemberDocId(participantId: string, teamId: string): string {
  return `tm-${participantId}-${teamId}`;
}

function mapTeamDoc(docId: string, data: Record<string, any>): Team {
  return {
    id: docId,
    eventId: String(data.eventId || data.event_id || ''),
    eventName: data.eventName || data.event_name || '',
    teamName: data.teamName || data.team_name || '',
    teamCode: String(data.teamCode || data.team_code || ''),
    teamLeaderId: String(data.teamLeaderId || data.team_leader_id || ''),
    createdBy: String(data.createdBy || data.created_by || data.teamLeaderId || data.team_leader_id || ''),
    minTeamSize: Number(data.minTeamSize ?? data.min_team_size) || 0,
    maxTeamSize: Number(data.maxTeamSize ?? data.max_team_size) || 0,
    currentMemberCount: Number(data.currentMemberCount ?? data.current_member_count) || 0,
    memberIds: Array.isArray(data.memberIds) ? data.memberIds.map(String) : [],
    status: (data.status === 'Complete' ? 'Complete' : 'Forming') as Team['status'],
    createdAt: data.createdAt || data.created_at || '',
    updatedAt: data.updatedAt || data.updated_at || '',
  };
}

function mapTeamMemberDoc(docId: string, data: Record<string, any>): TeamMember {
  return {
    id: docId,
    teamId: String(data.teamId || data.team_id || ''),
    eventId: String(data.eventId || data.event_id || ''),
    participantId: String(data.participantId || data.participant_id || ''),
    registrationId:
      data.registrationId ||
      data.registration_id ||
      `reg-${data.participantId || data.participant_id || ''}`,
    role: (data.role === 'Leader' ? 'Leader' : 'Member') as TeamMember['role'],
    joinedAt: data.joinedAt || data.joined_at || '',
    participantName: data.participantName || data.participant_name || '',
    casyumId: data.casyumId || data.casyum_id || '',
    paymentStatus: data.paymentStatus || data.payment_status || 'verified',
  };
}

/** Read the participant's own profile to capture stable identity mirrors. */
async function readSelfProfile(participantId: string): Promise<{ participantName: string; casyumId: string }> {
  const snap = await getDoc(doc(getDb(), 'participants', String(participantId))).catch(() => null);
  const d = snap?.exists() ? snap.data() : null;
  return {
    participantName: String(d?.full_name || d?.name || 'Participant'),
    casyumId: String(d?.casyum_id || ''),
  };
}

/** Read team formation configuration from the event document at runtime. */
export async function getTeamConfig(eventId: string): Promise<TeamConfig> {
  const snap = await getDoc(doc(getDb(), 'events', String(eventId)));
  if (!snap.exists()) {
    return {
      exists: false,
      teamEvent: false,
      eventType: '',
      minTeamSize: 0,
      maxTeamSize: 0,
      formationEnabled: false,
      feeType: 'Per Participant',
    };
  }
  const d = snap.data();
  const eventType = String(d.event_type || '').toLowerCase();
  const teamEvent = d.team_event === true || eventType === 'team';
  return {
    exists: true,
    teamEvent,
    eventType,
    minTeamSize: Number(d.min_team_size) || 0,
    maxTeamSize: Number(d.max_team_size) || 0,
    formationEnabled: d.team_formation_enabled === true,
    feeType: d.fee_type || 'Per Participant',
  };
}

/**
 * Eligibility for team formation on an event. The participant must be
 * registered for the event, their payment verified, and their registration
 * verified at the Registration Desk. Team formation only opens after the
 * Admin/Super Admin enables it for the event; that gate is enforced by
 * `assertCanFormTeam` and the security rules.
 */
export async function getTeamEligibility(eventId: string, participantId: string): Promise<TeamEligibility> {
  const eventKey = String(eventId);
  const regs = await listRegistrationsByParticipant(participantId).catch(() => []);
  const reg = regs.find(
    (r) =>
      String(r.event_id) === eventKey ||
      (Array.isArray(r.event_ids) && r.event_ids.map(String).includes(eventKey))
  );
  if (!reg) {
    return { ok: false, reason: 'You are not registered for this event.' };
  }
  const paymentVerified = String(reg.payment_status || '').toLowerCase() === 'verified';
  if (!paymentVerified) {
    return {
      ok: false,
      reason: 'Your payment for this event must be verified before joining a team.',
      registrationId: reg.registration_id,
    };
  }
  const deskVerified = String(reg.registration_verification_status || '').toLowerCase() === 'verified';
  if (!deskVerified) {
    return {
      ok: false,
      reason: 'Your registration must be verified at the Registration Desk before joining a team.',
      registrationId: reg.registration_id,
    };
  }
  return { ok: true, registrationId: reg.registration_id };
}

export async function getTeam(teamId: string): Promise<Team | null> {
  const snap = await getDoc(doc(getDb(), 'teams', String(teamId)));
  return snap.exists() ? mapTeamDoc(snap.id, snap.data()) : null;
}

export async function getTeamByCode(teamCode: string): Promise<Team | null> {
  const code = String(teamCode || '').trim().toUpperCase();
  if (!code) return null;
  const snap = await getDocs(query(collection(getDb(), 'teams'), where('teamCode', '==', code)));
  return snap.empty ? null : mapTeamDoc(snap.docs[0].id, snap.docs[0].data());
}

export async function listTeamsByEvent(eventId: string): Promise<Team[]> {
  const snap = await getDocs(query(collection(getDb(), 'teams'), where('eventId', '==', String(eventId))));
  return snap.docs
    .map((d) => mapTeamDoc(d.id, d.data()))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function listTeamMembers(teamId: string): Promise<TeamMember[]> {
  const snap = await getDocs(query(collection(getDb(), 'teamMembers'), where('teamId', '==', String(teamId))));
  return snap.docs
    .map((d) => mapTeamMemberDoc(d.id, d.data()))
    .sort((a, b) => a.joinedAt.localeCompare(b.joinedAt));
}

export async function getParticipantTeamForEvent(eventId: string, participantId: string): Promise<Team | null> {
  const eventKey = String(eventId);
  const snap = await getDocs(
    query(collection(getDb(), 'teamMembers'), where('participantId', '==', String(participantId)))
  );
  for (const d of snap.docs) {
    const member = mapTeamMemberDoc(d.id, d.data());
    if (member.eventId !== eventKey) continue;
    const team = await getTeam(member.teamId);
    if (team) return team;
  }
  return null;
}

export async function listTeamsForParticipant(
  participantId: string
): Promise<Array<{ team: Team; myRole: TeamMember['role'] }>> {
  const snap = await getDocs(
    query(collection(getDb(), 'teamMembers'), where('participantId', '==', String(participantId)))
  );
  const results: Array<{ team: Team; myRole: TeamMember['role'] }> = [];
  for (const d of snap.docs) {
    const member = mapTeamMemberDoc(d.id, d.data());
    const team = await getTeam(member.teamId);
    if (team) results.push({ team, myRole: member.role });
  }
  return results.sort((a, b) => b.team.createdAt.localeCompare(a.team.createdAt));
}

export function subscribeTeamsByEvent(
  eventId: string,
  onNext: (teams: Team[]) => void,
  onError?: (error: Error) => void
): () => void {
  const db = getDb();
  return onSnapshot(
    query(collection(db, 'teams'), where('eventId', '==', String(eventId))),
    (snapshot) => {
      const teams = snapshot.docs
        .map((d) => mapTeamDoc(d.id, d.data()))
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      onNext(teams);
    },
    onError
  );
}

export function subscribeTeamMembers(
  teamId: string,
  onNext: (members: TeamMember[]) => void,
  onError?: (error: Error) => void
): () => void {
  const db = getDb();
  return onSnapshot(
    query(collection(db, 'teamMembers'), where('teamId', '==', String(teamId))),
    (snapshot) => {
      const members = snapshot.docs
        .map((d) => mapTeamMemberDoc(d.id, d.data()))
        .sort((a, b) => a.joinedAt.localeCompare(b.joinedAt));
      onNext(members);
    },
    onError
  );
}

async function setRegistrationTeamId(participantId: string, teamId: string): Promise<void> {
  const db = getDb();
  const regId = `reg-${participantId}`;
  const timestamp = now();
  const snap = await getDoc(doc(db, 'registrations', regId)).catch(() => null);
  const existing = snap?.exists() ? (snap.data().teamIds as string[] | undefined) || [] : [];
  const next = existing.includes(teamId) ? existing : [...existing, teamId];
  const patch = { teamId, teamIds: next, updatedAt: timestamp, updated_at: timestamp };
  await Promise.all([
    updateDoc(doc(db, 'eventRegistrations', regId), patch).catch(() => {}),
    updateDoc(doc(db, 'registrations', regId), patch).catch(() => {}),
  ]);
}

async function clearRegistrationTeamId(participantId: string, teamId: string): Promise<void> {
  const db = getDb();
  const regId = `reg-${participantId}`;
  const timestamp = now();
  const snap = await getDoc(doc(db, 'registrations', regId)).catch(() => null);
  const existing = snap?.exists() ? (snap.data().teamIds as string[] | undefined) || [] : [];
  const next = existing.filter((id) => id !== teamId);
  const patch = { teamId: next.length > 0 ? next[0] : '', teamIds: next, updatedAt: timestamp, updated_at: timestamp };
  await Promise.all([
    updateDoc(doc(db, 'eventRegistrations', regId), patch).catch(() => {}),
    updateDoc(doc(db, 'registrations', regId), patch).catch(() => {}),
  ]);
}

export interface CreateTeamInput {
  eventId: string;
  eventName?: string;
  teamName: string;
  participantId: string;
}

/** Validate that a participant may create or join a team on this event. */
async function assertCanFormTeam(eventId: string, participantId: string): Promise<{ registrationId: string }> {
  const config = await getTeamConfig(eventId);
  if (!config.exists) throw new Error('Event not found.');
  if (!config.teamEvent) throw new Error('This is a solo event — teams are not required.');
  if (!config.formationEnabled) {
    throw new Error('Team Formation is currently disabled for this event.');
  }
  if (config.minTeamSize <= 0 || config.maxTeamSize <= 0 || config.minTeamSize > config.maxTeamSize) {
    throw new Error('This event has an invalid team size configuration. Contact the administration.');
  }
  const eligibility = await getTeamEligibility(eventId, participantId);
  if (!eligibility.ok) {
    throw new Error(eligibility.reason || 'You are not eligible to form a team.');
  }
  const existing = await getParticipantTeamForEvent(eventId, participantId);
  if (existing) {
    throw new Error('You are already in a team for this event.');
  }
  return { registrationId: eligibility.registrationId || `reg-${participantId}` };
}

export async function createTeam(input: CreateTeamInput): Promise<Team> {
  const teamName = String(input.teamName || '').trim();
  if (!teamName) throw new Error('Team name is required.');
  if (teamName.length > 40) throw new Error('Team name must be 40 characters or fewer.');

  const { registrationId } = await assertCanFormTeam(input.eventId, input.participantId);
  const config = await getTeamConfig(input.eventId);

  const db = getDb();
  const timestamp = now();

  let teamCode = '';
  for (let attempt = 0; attempt < 5; attempt += 1) {
    teamCode = `${deriveEventCodePrefix(input.eventName || '')}-${randomCodePart(5)}`;
    if (!(await getTeamByCode(teamCode))) break;
    teamCode = '';
  }
  if (!teamCode) {
    throw new Error('Could not generate a unique team ID. Please try again.');
  }

  const teamRef = await addDoc(collection(db, 'teams'), {
    eventId: String(input.eventId),
    eventName: input.eventName || '',
    teamName,
    teamCode,
    teamLeaderId: input.participantId,
    createdBy: input.participantId,
    minTeamSize: config.minTeamSize,
    maxTeamSize: config.maxTeamSize,
    currentMemberCount: 1,
    memberIds: [input.participantId],
    status: computeTeamStatus(1, config.minTeamSize, config.maxTeamSize),
    createdAt: timestamp,
    updatedAt: timestamp,
  });

  await setDoc(doc(db, 'teamMembers', teamMemberDocId(input.participantId, teamRef.id)), {
    teamId: teamRef.id,
    eventId: String(input.eventId),
    participantId: input.participantId,
    registrationId,
    role: 'Leader',
    joinedAt: timestamp,
    ...(await readSelfProfile(input.participantId)),
    paymentStatus: 'verified',
  });

  await setRegistrationTeamId(input.participantId, teamRef.id);
  return (await getTeam(teamRef.id)) as Team;
}

export async function joinTeam(input: { teamCode: string; participantId: string }): Promise<Team> {
  const code = String(input.teamCode || '').trim().toUpperCase();
  if (!code) throw new Error('Enter a team ID to join.');
  const team = await getTeamByCode(code);
  if (!team) {
    throw new Error('No team found with this ID. Ask your team leader for the correct team ID.');
  }

  await assertCanFormTeam(team.eventId, input.participantId);
  if (team.currentMemberCount >= team.maxTeamSize) {
    throw new Error(`This team is full (max ${team.maxTeamSize} members).`);
  }

  const config = await getTeamConfig(team.eventId);
  const db = getDb();
  const timestamp = now();
  const memberDocId = teamMemberDocId(input.participantId, team.id);

  const existingMember = await getDoc(doc(db, 'teamMembers', memberDocId)).catch(() => null);
  if (existingMember?.exists()) {
    throw new Error('You are already a member of this team.');
  }

  await setDoc(doc(db, 'teamMembers', memberDocId), {
    teamId: team.id,
    eventId: team.eventId,
    participantId: input.participantId,
    registrationId: `reg-${input.participantId}`,
    role: 'Member',
    joinedAt: timestamp,
    ...(await readSelfProfile(input.participantId)),
    paymentStatus: 'verified',
  });

  const nextCount = team.currentMemberCount + 1;
  await updateDoc(doc(db, 'teams', team.id), {
    currentMemberCount: increment(1),
    memberIds: arrayUnion(input.participantId),
    status: computeTeamStatus(nextCount, team.minTeamSize, config.maxTeamSize),
    updatedAt: timestamp,
  });

  await setRegistrationTeamId(input.participantId, team.id);
  return (await getTeam(team.id)) as Team;
}

export async function leaveTeam(input: { teamId: string; participantId: string }): Promise<void> {
  const db = getDb();
  const team = await getTeam(input.teamId);
  if (!team) throw new Error('Team not found.');
  const members = await listTeamMembers(team.id);
  const me = members.find((m) => m.participantId === input.participantId);
  if (!me) throw new Error('You are not a member of this team.');

  const timestamp = now();
  await deleteDoc(doc(db, 'teamMembers', me.id));
  await clearRegistrationTeamId(input.participantId, team.id);

  const remaining = members.filter((m) => m.id !== me.id);
  if (remaining.length === 0) {
    await deleteDoc(doc(db, 'teams', team.id));
    return;
  }

  const patch: Record<string, any> = {
    currentMemberCount: Math.max(team.currentMemberCount - 1, 0),
    memberIds: arrayRemove(input.participantId),
    status: computeTeamStatus(Math.max(team.currentMemberCount - 1, 0), team.minTeamSize, team.maxTeamSize),
    updatedAt: timestamp,
  };
  if (me.role === 'Leader') {
    patch.teamLeaderId = remaining[0].participantId;
    await updateDoc(doc(db, 'teamMembers', remaining[0].id), { role: 'Leader', updatedAt: timestamp });
  }
  await updateDoc(doc(db, 'teams', team.id), patch);
}

/** Admin action: remove a member from a team without deleting their registration. */
export async function removeMember(input: { teamId: string; memberId: string }): Promise<void> {
  const db = getDb();
  const team = await getTeam(input.teamId);
  if (!team) throw new Error('Team not found.');
  const members = await listTeamMembers(team.id);
  const member = members.find((m) => m.id === input.memberId);
  if (!member) throw new Error('Member not found.');

  const timestamp = now();
  await deleteDoc(doc(db, 'teamMembers', member.id));
  await clearRegistrationTeamId(member.participantId, team.id);

  const remaining = members.filter((m) => m.id !== input.memberId);
  if (remaining.length === 0) {
    await deleteDoc(doc(db, 'teams', team.id));
    return;
  }

  const patch: Record<string, any> = {
    currentMemberCount: Math.max(team.currentMemberCount - 1, 0),
    memberIds: arrayRemove(member.participantId),
    status: computeTeamStatus(Math.max(team.currentMemberCount - 1, 0), team.minTeamSize, team.maxTeamSize),
    updatedAt: timestamp,
  };
  if (member.role === 'Leader') {
    patch.teamLeaderId = remaining[0].participantId;
    await updateDoc(doc(db, 'teamMembers', remaining[0].id), { role: 'Leader', updatedAt: timestamp });
  }
  await updateDoc(doc(db, 'teams', team.id), patch);
}

/** Admin action: disband a team (keeps all participant registrations intact). */
export async function disbandTeam(teamId: string): Promise<void> {
  const db = getDb();
  const team = await getTeam(teamId);
  if (!team) throw new Error('Team not found.');
  const members = await listTeamMembers(teamId);
  await Promise.all([
    ...members.map((m) => clearRegistrationTeamId(m.participantId, teamId)),
    ...members.map((m) => deleteDoc(doc(db, 'teamMembers', m.id))),
  ]);
  await deleteDoc(doc(db, 'teams', teamId));
}

// ---------------------------------------------------------------------------
// Team Formation Access + Notifications
// ---------------------------------------------------------------------------
//
// When an Admin/Super Admin enables team formation for an event, every
// participant who is eligible (registered + payment verified + registration
// desk verified) receives an access record in the `teamFormationAccess`
// collection keyed by their registration id. The record carries the in-app
// notification ("Team Formation is Now Open") and a per-participant delivery
// status. Access records are written ONLY by admins (enforced in the rules) —
// participants can read their own but never write them.

export type NotificationStatus = 'Not Sent' | 'Sent' | 'Pending' | 'Failed';

export interface TeamFormationAccess {
  id: string;
  eventId: string;
  participantId: string;
  registrationId: string;
  participantName: string;
  participantEmail: string;
  accessGranted: boolean;
  accessGrantedAt: string;
  notificationStatus: NotificationStatus;
  notificationSentAt: string;
  notificationAttemptedAt: string;
  notificationError: string;
  notificationMessage: string;
  updatedAt: string;
}

export interface EligibleRegistration {
  registrationId: string;
  participantId: string;
  participantName: string;
  participantEmail: string;
  paymentStatus: string;
  verificationStatus: string;
}

export interface EnableTeamFormationResult {
  enabled: boolean;
  eligibleCount: number;
  notifiedCount: number;
  failedCount: number;
}

function accessDocId(registrationId: string): string {
  return `access-${String(registrationId || '').replace(/^access-/i, '')}`;
}

function mapAccessDoc(docId: string, data: Record<string, any>): TeamFormationAccess {
  return {
    id: docId,
    eventId: String(data.eventId || data.event_id || ''),
    participantId: String(data.participantId || data.participant_id || ''),
    registrationId: String(data.registrationId || data.registration_id || ''),
    participantName: String(data.participantName || data.participant_name || ''),
    participantEmail: String(data.participantEmail || data.participant_email || ''),
    accessGranted: data.accessGranted === true,
    accessGrantedAt: data.accessGrantedAt || data.access_granted_at || '',
    notificationStatus: (data.notificationStatus || data.notification_status || 'Not Sent') as NotificationStatus,
    notificationSentAt: data.notificationSentAt || data.notification_sent_at || '',
    notificationAttemptedAt: data.notificationAttemptedAt || data.notification_attempted_at || '',
    notificationError: data.notificationError || data.notification_error || '',
    notificationMessage: data.notificationMessage || data.notification_message || '',
    updatedAt: data.updatedAt || data.updated_at || '',
  };
}

/** A participant is eligible for team formation once payment AND Registration
 *  Desk verification are both complete. Unpaid, rejected, or unverified
 *  participants are never eligible. */
export function isRegistrationEligibleForTeamFormation(
  reg: Pick<RegistrationRowLike, 'payment_status' | 'registration_verification_status'>
): boolean {
  return (
    String(reg.payment_status || '').toLowerCase() === 'verified' &&
    String(reg.registration_verification_status || '').toLowerCase() === 'verified'
  );
}

type RegistrationRowLike = {
  payment_status?: string;
  registration_verification_status?: string;
};

/**
 * All participants registered for an event who may create/join a team once
 * formation opens (payment verified AND Registration Desk verified).
 */
export async function getEligibleRegistrations(eventId: string): Promise<EligibleRegistration[]> {
  const regs = await listRegistrationsByEvent(String(eventId)).catch(() => []);
  return regs
    .filter((r) => isRegistrationEligibleForTeamFormation(r))
    .map((r) => ({
      registrationId: String(r.registration_id || ''),
      participantId: String(r.participant_user_id || r.participant_id || ''),
      participantName: String(r.user_full_name || 'Participant'),
      participantEmail: String(r.participant_email || ''),
      paymentStatus: String(r.payment_status || ''),
      verificationStatus: String(r.registration_verification_status || ''),
    }))
    .filter((r) => r.registrationId && r.participantId);
}

export async function listTeamFormationAccess(eventId: string): Promise<TeamFormationAccess[]> {
  const snap = await getDocs(
    query(collection(getDb(), 'teamFormationAccess'), where('eventId', '==', String(eventId)))
  );
  return snap.docs
    .map((d) => mapAccessDoc(d.id, d.data()))
    .sort((a, b) => a.participantName.localeCompare(b.participantName));
}

export function subscribeTeamFormationAccess(
  eventId: string,
  onNext: (rows: TeamFormationAccess[]) => void,
  onError?: (error: Error) => void
): () => void {
  const db = getDb();
  return onSnapshot(
    query(collection(db, 'teamFormationAccess'), where('eventId', '==', String(eventId))),
    (snapshot) => {
      const rows = snapshot.docs.map((d) => mapAccessDoc(d.id, d.data()));
      rows.sort((a, b) => a.participantName.localeCompare(b.participantName));
      onNext(rows);
    },
    onError
  );
}

/** Build the "Team Formation is Now Open" notification payload for an event. */
function buildFormationNotification(event: { name?: string; min?: number; max?: number }): {
  message: string;
  subject: string;
} {
  const name = event.name || 'this event';
  const sizeNote =
    event.min && event.max
      ? event.min === event.max
        ? `exactly ${event.max} members`
        : `${event.min} to ${event.max} members`
      : 'the size shown for the event';
  return {
    subject: `Team Formation is Now Open — ${name}`,
    message: `Team Formation is Now Open for ${name}! Gather ${sizeNote}. You can Create a Team or Join a Team with your Team ID from the My Team section on your dashboard.`,
  };
}

/**
 * Attempt to deliver the "Team Formation is Now Open" notification to one
 * eligible participant. Delivery here is the in-app access record (which the
 * participant dashboard reads) plus an audit entry in `emailLogs`. The status
 * is only marked 'Sent' when BOTH Firestore writes succeed; any failure is
 * recorded as 'Failed' so the admin can re-send.
 */
async function deliverFormationNotification(
  eventId: string,
  event: { name?: string; min?: number; max?: number },
  eligible: EligibleRegistration
): Promise<void> {
  const db = getDb();
  const timestamp = now();
  const { subject, message } = buildFormationNotification(event);

  const logId = `log-${String(await nextSequence('emailLogs'))}`;
  await setDoc(doc(db, 'emailLogs', logId), {
    log_id: logId,
    recipient: eligible.participantEmail,
    recipient_name: eligible.participantName,
    subject,
    email_type: 'Event Notification',
    status: 'Sent',
    attempts: 1,
    sent_at: timestamp,
    created_at: timestamp,
    meta: { eventId, registrationId: eligible.registrationId, kind: 'team_formation' },
  });

  const patch: Record<string, any> = {
    accessGranted: true,
    accessGrantedAt: timestamp,
    notificationStatus: 'Sent',
    notificationSentAt: timestamp,
    notificationAttemptedAt: timestamp,
    notificationError: '',
    notificationMessage: message,
    updatedAt: timestamp,
  };

  await updateDoc(doc(db, 'teamFormationAccess', accessDocId(eligible.registrationId)), patch);
}

/** Mark an access record as failed (used when delivery throws). */
async function markAccessFailed(
  registrationId: string,
  errorMessage: string
): Promise<void> {
  const db = getDb();
  const timestamp = now();
  await updateDoc(doc(db, 'teamFormationAccess', accessDocId(registrationId)), {
    accessGranted: true,
    accessGrantedAt: timestamp,
    notificationStatus: 'Failed',
    notificationAttemptedAt: timestamp,
    notificationError: String(errorMessage || 'Notification delivery failed.').slice(0, 500),
    updatedAt: timestamp,
  }).catch(() => {});
}

/**
 * Admin/Super Admin action: enable team formation for an event. Grants access
 * and sends the "Team Formation is Now Open" notification to every currently
 * eligible participant. Never called automatically on payment.
 */
export async function enableTeamFormation(eventId: string): Promise<EnableTeamFormationResult> {
  const db = getDb();
  const eventSnap = await getDoc(doc(db, 'events', String(eventId)));
  if (!eventSnap.exists()) throw new Error('Event not found.');
  const eventData = eventSnap.data();
  const config = await getTeamConfig(String(eventId));
  if (!config.teamEvent) throw new Error('This is a solo event — teams are not required.');
  if (config.minTeamSize <= 0 || config.maxTeamSize <= 0 || config.minTeamSize > config.maxTeamSize) {
    throw new Error('This event has an invalid team size configuration. Contact the administration.');
  }

  await updateDoc(doc(db, 'events', String(eventId)), {
    team_formation_enabled: true,
    updated_at: now(),
  });

  const eligible = await getEligibleRegistrations(String(eventId));
  const event = {
    name: String(eventData.name || ''),
    min: config.minTeamSize,
    max: config.maxTeamSize,
  };

  let notifiedCount = 0;
  let failedCount = 0;

  for (const row of eligible) {
    const accessPatch: Record<string, any> = {
      eventId: String(eventId),
      participantId: row.participantId,
      registrationId: row.registrationId,
      participantName: row.participantName,
      participantEmail: row.participantEmail,
      accessGranted: true,
      accessGrantedAt: now(),
      notificationStatus: 'Pending',
      notificationAttemptedAt: now(),
      notificationError: '',
      updatedAt: now(),
    };
    await setDoc(doc(db, 'teamFormationAccess', accessDocId(row.registrationId)), accessPatch).catch(
      () => {}
    );
    try {
      await deliverFormationNotification(String(eventId), event, row);
      notifiedCount += 1;
    } catch (err) {
      failedCount += 1;
      await markAccessFailed(row.registrationId, err instanceof Error ? err.message : 'Notification failed.');
    }
  }

  return { enabled: true, eligibleCount: eligible.length, notifiedCount, failedCount };
}

/** Admin/Super Admin action: disable (lock) team formation for an event. */
export async function disableTeamFormation(eventId: string): Promise<void> {
  await updateDoc(doc(getDb(), 'events', String(eventId)), {
    team_formation_enabled: false,
    updated_at: now(),
  });
}

/**
 * Admin/Super Admin action: (re)send the team formation notification to
 * eligible participants who do not yet have a 'Sent' access record. Useful
 * after more participants are verified at the Registration Desk.
 */
export async function sendTeamFormationNotifications(eventId: string): Promise<{
  sent: number;
  failed: number;
  skipped: number;
}> {
  const config = await getTeamConfig(String(eventId));
  if (!config.teamEvent) throw new Error('This is a solo event — teams are not required.');
  const db = getDb();
  const eventSnap = await getDoc(doc(db, 'events', String(eventId)));
  const event = {
    name: String(eventSnap.exists() ? eventSnap.data().name || '' : ''),
    min: config.minTeamSize,
    max: config.maxTeamSize,
  };
  const eligible = await getEligibleRegistrations(String(eventId));
  const existing = await listTeamFormationAccess(String(eventId));
  const existingByReg = new Map(existing.map((a) => [a.registrationId, a]));

  let sent = 0;
  let failed = 0;
  let skipped = 0;

  for (const row of eligible) {
    const prev = existingByReg.get(row.registrationId);
    if (prev?.notificationStatus === 'Sent') {
      skipped += 1;
      continue;
    }
    await setDoc(doc(db, 'teamFormationAccess', accessDocId(row.registrationId)), {
      eventId: String(eventId),
      participantId: row.participantId,
      registrationId: row.registrationId,
      participantName: row.participantName,
      participantEmail: row.participantEmail,
      accessGranted: true,
      accessGrantedAt: prev?.accessGrantedAt || now(),
      notificationStatus: 'Pending',
      notificationAttemptedAt: now(),
      notificationError: '',
      updatedAt: now(),
    }).catch(() => {});
    try {
      await deliverFormationNotification(String(eventId), event, row);
      sent += 1;
    } catch (err) {
      failed += 1;
      await markAccessFailed(row.registrationId, err instanceof Error ? err.message : 'Notification failed.');
    }
  }

  return { sent, failed, skipped };
}
