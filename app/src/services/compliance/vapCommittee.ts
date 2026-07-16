// =============================================================================
// Compliance · VAP Committee Service — SDD §5.3
// -----------------------------------------------------------------------------
// Meetings, roster, agenda auto-pull from Pending Committee Review violations,
// per-member voting, decision recording, minutes generation.
// =============================================================================

import type {
  VapMeeting, VapMember, VapAgendaItem, VapVote, VapMeetingState,
  Violation, ViolationDecisionOutcome, Role,
} from '../../types';
import { listViolations, recordTransition, STATE_LABEL } from './violations';

// ---------------------------------------------------------------------------
// Default committee roster (configurable in production per SDD §2)
// ---------------------------------------------------------------------------
export const DEFAULT_ROSTER: VapMember[] = [
  { id: 'VAPM-001', name: 'Eng. Mohammed Al Mansoori',  role: 'chair',     organisation: 'DoE PPS',  email: 'mohammed.mansoori@doe.gov.ae' },
  { id: 'VAPM-002', name: 'Dr. Hessa Al Falasi',        role: 'co_chair',  organisation: 'ADEO',     email: 'hessa.falasi@adeo.gov.ae' },
  { id: 'VAPM-003', name: 'Lt. Khalid Al Suwaidi',      role: 'member',    organisation: 'ADPolice', email: 'khalid.suwaidi@adpolice.gov.ae' },
  { id: 'VAPM-004', name: 'Eng. Mariam Al Hashemi',     role: 'member',    organisation: 'DoE PPS',  email: 'mariam.hashemi@doe.gov.ae' },
  { id: 'VAPM-005', name: 'Eng. Tariq Bin Hamad',       role: 'member',    organisation: 'DoE PPS',  email: 'tariq.binhamad@doe.gov.ae' },
  { id: 'VAPM-006', name: 'Ms. Reema Al Marri',         role: 'member',    organisation: 'ADCDA',    email: 'reema.marri@adcda.gov.ae' },
  { id: 'VAPM-007', name: 'Eng. Latifa Al Awadi',       role: 'alternate', organisation: 'DoE PPS',  email: 'latifa.awadi@doe.gov.ae' },
];

const DEFAULT_QUORUM = Math.ceil(DEFAULT_ROSTER.filter((m) => m.role !== 'alternate').length / 2) + 1;

// ---------------------------------------------------------------------------
// In-memory meeting store
// ---------------------------------------------------------------------------
const MEETINGS: VapMeeting[] = [];

const DAY_MS = 86_400_000;

function fmtMeetingNumber(d: Date, ad_hoc: boolean): string {
  const year = d.getUTCFullYear();
  if (ad_hoc) {
    const m = String(d.getUTCMonth() + 1).padStart(2, '0');
    const day = String(d.getUTCDate()).padStart(2, '0');
    return `VAP-${year}-ADHOC-${m}${day}`;
  }
  // ISO week number (rough)
  const start = new Date(Date.UTC(year, 0, 1));
  const week = Math.ceil((((d.getTime() - start.getTime()) / DAY_MS) + start.getUTCDay() + 1) / 7);
  return `VAP-${year}-W${String(week).padStart(2, '0')}`;
}

let _vapCounter = 4_000;
function nextMeetingId(): string {
  _vapCounter += 1;
  return `VAP-2026-${String(_vapCounter).padStart(6, '0')}`;
}

// ---------------------------------------------------------------------------
// Seeded meetings — 1 concluded (last week), 1 scheduled (this week), 1 ad-hoc
// ---------------------------------------------------------------------------
function seed(): VapMeeting[] {
  const now = new Date('2026-05-20T09:00:00Z');

  // Concluded meeting last Wednesday — 3 violations decided
  const lastWed = new Date(now);
  lastWed.setUTCDate(lastWed.getUTCDate() - 7);
  lastWed.setUTCHours(10, 0, 0, 0);
  const concluded = makeMeeting({
    scheduledAt: lastWed.toISOString(),
    cadence: 'weekly',
    state: 'minutes_circulated',
    secretaryId: 'VAPM-007',
    secretaryName: DEFAULT_ROSTER.find((m) => m.id === 'VAPM-007')!.name,
    chairId: 'VAPM-001',
    chairName: DEFAULT_ROSTER.find((m) => m.id === 'VAPM-001')!.name,
    attendedMemberIds: ['VAPM-001', 'VAPM-002', 'VAPM-003', 'VAPM-004', 'VAPM-005'],
    minutesGenerated: true,
  });

  // Upcoming meeting this Wednesday
  const thisWed = new Date(now);
  thisWed.setUTCDate(thisWed.getUTCDate() + (3 - thisWed.getUTCDay() + 7) % 7);
  thisWed.setUTCHours(10, 0, 0, 0);
  const upcoming = makeMeeting({
    scheduledAt: thisWed.toISOString(),
    cadence: 'weekly',
    state: 'agenda_ready',
    secretaryId: 'VAPM-007',
    secretaryName: DEFAULT_ROSTER.find((m) => m.id === 'VAPM-007')!.name,
    attendedMemberIds: [],
  });

  return [upcoming, concluded];
}

interface SeedMeetingArgs {
  scheduledAt: string;
  cadence: VapMeeting['cadence'];
  state: VapMeetingState;
  secretaryId: string;
  secretaryName: string;
  chairId?: string;
  chairName?: string;
  attendedMemberIds: string[];
  minutesGenerated?: boolean;
}

function makeMeeting(args: SeedMeetingArgs): VapMeeting {
  const id = nextMeetingId();
  const scheduled = new Date(args.scheduledAt);
  return {
    id,
    meetingNumber: fmtMeetingNumber(scheduled, args.cadence === 'ad_hoc'),
    scheduledAt: args.scheduledAt,
    venue: 'DoE HQ · Conference Room 3 · Floor 12 / Microsoft Teams',
    cadence: args.cadence,
    state: args.state,
    roster: DEFAULT_ROSTER.map((m) => ({ ...m, isPresent: args.attendedMemberIds.includes(m.id) })),
    quorumMin: DEFAULT_QUORUM,
    decisionRule: 'majority',
    agenda: [],          // populated after seed violations are loaded
    secretaryId: args.secretaryId,
    secretaryName: args.secretaryName,
    chairId: args.chairId,
    chairName: args.chairName,
    attendedMemberIds: args.attendedMemberIds,
    minutesGeneratedAt: args.minutesGenerated ? new Date(scheduled.getTime() + 4 * 3600_000).toISOString() : undefined,
    minutesFileName: args.minutesGenerated ? `VAP-Minutes-${fmtMeetingNumber(scheduled, args.cadence === 'ad_hoc')}.pdf` : undefined,
    createdAt: new Date(scheduled.getTime() - 5 * DAY_MS).toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

// Populate agenda from current violations and seed past committee decisions.
function hydrateAgendas(meetings: VapMeeting[]): VapMeeting[] {
  const allViolations = listViolations();
  const pending = allViolations.filter((v) => v.state === 'pending_committee_review');
  const decidedAtCommittee = allViolations.filter((v) => v.decisionRoute === 'vap_committee' && (v.state === 'decision_recorded' || v.state === 'penalty_outstanding' || v.state.startsWith('closed') || v.state === 'paid' || v.state.startsWith('appeal') || v.state === 'cross_gov_enforcement_triggered'));

  // The upcoming meeting (state agenda_ready) → pending violations
  const upcoming = meetings.find((m) => m.state === 'agenda_ready');
  if (upcoming) {
    upcoming.agenda = pending.map((v, i) => buildEmptyAgendaItem(v, i + 1));
  }

  // The concluded meeting (state minutes_circulated) → past decisions, randomly assigned
  const concluded = meetings.find((m) => m.state === 'minutes_circulated');
  if (concluded) {
    concluded.agenda = decidedAtCommittee.slice(0, 4).map((v, i) => buildDecidedAgendaItem(v, i + 1));
  }

  // Patch the violations linked to past decisions to point at the concluded meeting
  if (concluded) {
    for (const ai of concluded.agenda) {
      const v = allViolations.find((vv) => vv.id === ai.violationId);
      if (v) v.vapMeetingId = concluded.id;
    }
  }
  // Patch the violations on the upcoming agenda to point at the upcoming meeting
  if (upcoming) {
    for (const ai of upcoming.agenda) {
      const v = allViolations.find((vv) => vv.id === ai.violationId);
      if (v) v.vapMeetingId = upcoming.id;
    }
  }
  return meetings;
}

function buildEmptyAgendaItem(v: Violation, order: number): VapAgendaItem {
  return {
    id: `AI-${v.id}`,
    violationId: v.id,
    presentationOrder: order,
    votes: [],
  };
}

function buildDecidedAgendaItem(v: Violation, order: number): VapAgendaItem {
  // Reverse-engineer plausible per-member votes consistent with the recorded outcome.
  const outcome: VapVote['vote'] =
    v.decisionOutcome === 'penalty_imposed' ? 'penalty_imposed' :
    v.decisionOutcome === 'warning_letter' ? 'warning_letter' :
    v.decisionOutcome === 'no_action' ? 'no_action' :
    v.decisionOutcome === 'referred_investigation' ? 'referred_investigation' :
    'penalty_imposed';
  const votes: VapVote[] = DEFAULT_ROSTER.filter((m) => m.role !== 'alternate').slice(0, 5).map((m, i) => ({
    memberId: m.id,
    memberName: m.name,
    vote: i < 4 ? outcome : 'deferred',
    memberComments: i === 0 ? 'In line with the Engineer recommendation.' : undefined,
  }));
  return {
    id: `AI-${v.id}`,
    violationId: v.id,
    presentationOrder: order,
    discussionSummary: 'Reviewed evidence pack. Severity confirmed; offence-count noted. Decision recorded by majority.',
    votes,
    finalDecision: outcome,
    decidedAt: v.decisionAt,
  };
}

// Initialise the store
MEETINGS.push(...seed());
hydrateAgendas(MEETINGS);

// ---------------------------------------------------------------------------
// Read-side API
// ---------------------------------------------------------------------------
export function listMeetings(): VapMeeting[] {
  // Always re-hydrate the upcoming meeting's agenda so newly-routed violations
  // appear without a page refresh.
  hydrateAgendas(MEETINGS);
  return MEETINGS.slice().sort((a, b) => b.scheduledAt.localeCompare(a.scheduledAt));
}

export function getMeeting(id: string): VapMeeting | undefined {
  hydrateAgendas(MEETINGS);
  return MEETINGS.find((m) => m.id === id);
}

export function nextScheduledMeeting(): VapMeeting | undefined {
  return listMeetings().find((m) => m.state === 'agenda_ready' || m.state === 'scheduled');
}

// ---------------------------------------------------------------------------
// Write-side API
// ---------------------------------------------------------------------------
export function scheduleAdHocMeeting(scheduledAt: string, secretaryName = 'Eng. Latifa Al Awadi'): VapMeeting {
  const meeting = makeMeeting({
    scheduledAt,
    cadence: 'ad_hoc',
    state: 'agenda_ready',
    secretaryId: 'VAPM-007',
    secretaryName,
    attendedMemberIds: [],
  });
  MEETINGS.unshift(meeting);
  hydrateAgendas(MEETINGS);
  return meeting;
}

export function startMeeting(meetingId: string): void {
  const m = getMeeting(meetingId);
  if (!m) return;
  m.state = 'in_progress';
  m.updatedAt = new Date().toISOString();
}

export function recordVote(meetingId: string, agendaItemId: string, vote: VapVote): void {
  const m = getMeeting(meetingId);
  if (!m) return;
  const item = m.agenda.find((a) => a.id === agendaItemId);
  if (!item) return;
  // Replace existing vote from the same member if present
  const existingIdx = item.votes.findIndex((v) => v.memberId === vote.memberId);
  if (existingIdx >= 0) item.votes[existingIdx] = vote;
  else item.votes.push(vote);
  m.updatedAt = new Date().toISOString();
}

/** Finalise an agenda item — record the outcome, push the linked violation
 *  forward through its state machine accordingly. */
export function recordItemDecision(
  meetingId: string,
  agendaItemId: string,
  outcome: VapAgendaItem['finalDecision'],
  discussionSummary?: string,
  actor = 'VAP Committee',
): void {
  const m = getMeeting(meetingId);
  if (!m) return;
  const item = m.agenda.find((a) => a.id === agendaItemId);
  if (!item) return;
  item.finalDecision = outcome;
  item.discussionSummary = discussionSummary ?? item.discussionSummary;
  item.decidedAt = new Date().toISOString();

  // Push the bound violation forward
  if (outcome && outcome !== 'deferred') {
    const v = listViolations().find((vv) => vv.id === item.violationId);
    if (v) {
      const decisionOutcome: ViolationDecisionOutcome =
        outcome === 'penalty_imposed'        ? 'penalty_imposed' :
        outcome === 'warning_letter'         ? 'warning_letter' :
        outcome === 'no_action'              ? 'no_action' :
        'referred_investigation';
      const nextState = decisionOutcome === 'penalty_imposed' ? 'penalty_outstanding'
                      : decisionOutcome === 'no_action' ? 'closed_no_action'
                      : 'decision_recorded';
      const paymentDeadline = decisionOutcome === 'penalty_imposed'
        ? new Date(Date.now() + 30 * DAY_MS).toISOString() : undefined;
      recordTransition({
        violationId: v.id,
        toState: nextState,
        actor: actor as string,
        actorRole: 'vap_member' as Role,
        reason: `VAP Committee decision: ${outcome}`,
        patch: {
          decisionRoute: 'vap_committee',
          decisionOutcome,
          decisionAt: new Date().toISOString(),
          decisionBy: actor,
          paymentDeadline,
          closureDate: nextState === 'closed_no_action' ? new Date().toISOString() : undefined,
        },
      });
    }
  }
  m.updatedAt = new Date().toISOString();
}

export function concludeMeeting(meetingId: string): void {
  const m = getMeeting(meetingId);
  if (!m) return;
  m.state = 'concluded';
  m.minutesGeneratedAt = new Date().toISOString();
  m.minutesFileName = `VAP-Minutes-${m.meetingNumber}.pdf`;
  m.updatedAt = new Date().toISOString();
  // Mark members as present per current attendedMemberIds — could be edited mid-meeting
}

export function markAttendance(meetingId: string, memberIds: string[]): void {
  const m = getMeeting(meetingId);
  if (!m) return;
  m.attendedMemberIds = memberIds;
  m.roster = m.roster.map((r) => ({ ...r, isPresent: memberIds.includes(r.id) }));
  m.updatedAt = new Date().toISOString();
}

// ---------------------------------------------------------------------------
// Display helpers
// ---------------------------------------------------------------------------
export const MEETING_STATE_LABEL: Record<VapMeetingState, string> = {
  scheduled: 'Scheduled',
  agenda_ready: 'Agenda Ready',
  in_progress: 'In Progress',
  concluded: 'Concluded',
  minutes_circulated: 'Minutes Circulated',
};

export const VOTE_LABEL: Record<NonNullable<VapAgendaItem['finalDecision']>, string> = {
  penalty_imposed: 'Penalty Imposed',
  warning_letter: 'Warning Letter',
  no_action: 'No Action',
  referred_investigation: 'Refer for Investigation',
  deferred: 'Defer',
};

export function quorumReached(m: VapMeeting): boolean {
  return m.attendedMemberIds.length >= m.quorumMin;
}

void STATE_LABEL;  // re-export usage signal
