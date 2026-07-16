import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { nanoid } from 'nanoid';
import {
  PPS_SUBMISSIONS,
  LPG_DEMAND_MATRIX,
  LPG_SEASONAL_MATRIX,
  LPG_2024_REVIEW_REMARKS,
} from '../data/pps';
import type {
  Submission,
  SubmissionStatus,
  SubmissionWorkflowEvent,
  PpsActorRole,
  PpsTransitionDef,
  PpsTransitionId,
  PpsNotification,
  PpsComment,
  ReviewRemark,
  ReminderLog,
} from '../types/pps';
import { STORAGE_KEYS } from './seed';

// ============================================================================
// PPS submissions store — state machine for the entity ▸ DoE review ▸ approval
// pipeline mirroring the licensing engine (gas/hoe/noc).
//
//   draft ▸ submitted ▸ in_review ▸ returned ▸ resubmitted ▸ approved
//                                                              │
//                                                              ▼
//                                              amendment_requested → in_review → approved
// ============================================================================

export const PPS_TRANSITIONS: PpsTransitionDef[] = [
  {
    id: 'submit',
    label: 'Submit to DoE',
    from: ['draft'],
    to: 'submitted',
    allowedRoles: ['pps_entity'],
    variant: 'primary',
  },
  {
    id: 'start_review',
    label: 'Start review',
    from: ['submitted', 'resubmitted'],
    to: 'in_review',
    allowedRoles: ['pps_reviewer'],
    variant: 'secondary',
  },
  {
    id: 'return_for_clarification',
    label: 'Return for clarification',
    from: ['in_review', 'submitted', 'resubmitted'],
    to: 'returned',
    // DoE Approvers (Omar) as well as Reviewers can request more information /
    // return a submission for clarification.
    allowedRoles: ['pps_reviewer', 'pps_approver'],
    variant: 'danger',
    requiresComment: true,
    commentRequired: true,
    commentLabel: 'Clarification request — explain what needs to be corrected',
  },
  {
    id: 'resubmit',
    label: 'Re-submit',
    from: ['returned'],
    to: 'resubmitted',
    allowedRoles: ['pps_entity'],
    variant: 'primary',
    requiresComment: true,
    commentLabel: 'Notes on what was changed',
  },
  {
    id: 'approve',
    label: 'Approve & publish',
    from: ['in_review', 'submitted', 'resubmitted'],
    to: 'approved',
    allowedRoles: ['pps_approver', 'pps_reviewer'],
    variant: 'primary',
    requiresComment: true,
    commentLabel: 'Approval note (optional)',
  },
  {
    id: 'reject',
    label: 'Reject',
    from: ['in_review', 'submitted', 'resubmitted'],
    to: 'rejected',
    allowedRoles: ['pps_approver', 'pps_reviewer'],
    variant: 'danger',
    requiresComment: true,
    commentLabel: 'Reason for rejection (optional)',
  },
  {
    id: 'request_amendment',
    label: 'Request amendment',
    from: ['approved'],
    to: 'amendment_requested',
    allowedRoles: ['pps_entity'],
    variant: 'secondary',
    requiresComment: true,
    commentRequired: true,
    commentLabel: 'Reason for amendment (mandatory)',
  },
  {
    id: 'approve_amendment',
    label: 'Approve amendment',
    from: ['amendment_requested'],
    to: 'approved',
    allowedRoles: ['pps_approver'],
    variant: 'primary',
    requiresComment: true,
    commentLabel: 'Approval note',
  },
];

export function getAvailableTransitions(
  sub: Submission,
  role: PpsActorRole | string,
): PpsTransitionDef[] {
  return PPS_TRANSITIONS.filter(
    (t) => t.from.includes(sub.status) && t.allowedRoles.includes(role as PpsActorRole),
  );
}

export function stageToStatus(stage: SubmissionWorkflowEvent['stage']): SubmissionStatus | null {
  return ({
    submitted: 'submitted',
    doe_review: 'in_review',
    returned: 'returned',
    resubmitted: 'resubmitted',
    approved: 'approved',
    rejected: 'rejected',
  } as const)[stage] ?? null;
}

function transitionToEvent(t: PpsTransitionDef, actorName: string, actorRole: string, comment?: string): SubmissionWorkflowEvent {
  const stage: SubmissionWorkflowEvent['stage'] =
    t.id === 'submit'                   ? 'submitted'   :
    t.id === 'start_review'             ? 'doe_review'  :
    t.id === 'return_for_clarification' ? 'returned'    :
    t.id === 'resubmit'                 ? 'resubmitted' :
    t.id === 'approve'                  ? 'approved'    :
    t.id === 'reject'                   ? 'rejected'    :
    t.id === 'request_amendment'        ? 'returned'    :
    'approved';
  return {
    at: new Date().toISOString(),
    stage,
    by: actorName,
    byRole: roleLabel(actorRole),
    ...(comment ? { comment } : {}),
  };
}

function roleLabel(role: string): string {
  return ({
    pps_entity:   'Entity Submitter',
    pps_reviewer: 'DoE PPS Reviewer',
    pps_approver: 'DoE Approver',
  } as Record<string, string>)[role] ?? role;
}

function transitionToRemark(t: PpsTransitionDef, actorName: string, actorRole: string, comment?: string): ReviewRemark | null {
  if (t.id === 'return_for_clarification') {
    return { at: new Date().toISOString(), by: actorName, byRole: roleLabel(actorRole), kind: 'returned',
             title: 'Returned for clarification', body: comment ?? 'Returned for clarification.' };
  }
  if (t.id === 'resubmit') {
    return { at: new Date().toISOString(), by: actorName, kind: 'resubmitted',
             title: 'Re-submitted', body: comment ?? 'Re-submitted with corrected values.' };
  }
  if (t.id === 'approve' || t.id === 'approve_amendment') {
    return { at: new Date().toISOString(), by: actorName, byRole: roleLabel(actorRole), kind: 'approved',
             title: 'Approved & published', body: comment ?? 'Approved and published to PPS dashboard.' };
  }
  if (t.id === 'reject') {
    return { at: new Date().toISOString(), by: actorName, byRole: roleLabel(actorRole), kind: 'returned',
             title: 'Submission rejected', body: comment ?? 'Submission rejected by DoE.' };
  }
  return null;
}

// Notification template — body uses {placeholders}
function buildNotifications(t: PpsTransitionDef, sub: Submission, actorName: string): PpsNotification[] {
  const at = new Date().toISOString();
  const stamp = (msg: string) => msg
    .replace('{product}', sub.productLabel)
    .replace('{period}', `${sub.cycleYear} annual`)
    .replace('{entity}', sub.entityName)
    .replace('{actor}', actorName)
    .replace('{ref}', sub.ref);
  const make = (toRole: PpsNotification['toRole'], subject: string, body: string) =>
    ({ id: nanoid(8), at, toRole, submissionId: sub.id, subject: stamp(subject), body: stamp(body), read: false });
  switch (t.id) {
    case 'submit':
    case 'resubmit':
      return [
        make('pps_reviewer', '{product} · {period} submitted',
             '{entity} submitted {product} {period} (ref {ref}). Open in PPS Review to action.'),
      ];
    case 'return_for_clarification':
      return [
        make('pps_entity', '{product} · {period} returned for clarification',
             'DoE PPS returned your {product} {period} submission. Open it to view remarks and re-submit.'),
      ];
    case 'approve':
    case 'approve_amendment':
      return [
        make('pps_entity', '{product} · {period} approved & published',
             'Your {product} {period} submission was approved by {actor} and published to the PPS dashboard.'),
      ];
    case 'reject':
      return [
        make('pps_entity', '{product} · {period} rejected',
             'Your {product} {period} submission (ref {ref}) was rejected by DoE PPS. Open it to view the reason.'),
      ];
    case 'request_amendment':
      return [
        make('pps_reviewer', '{product} · {period} amendment requested',
             '{entity} requested an amendment for {product} {period}. Open in PPS Review to assess.'),
      ];
  }
  return [];
}

// ============================================================================
// Store
// ============================================================================

const SUB_KEY = 'doe.pps.submissions';
const NOTIF_KEY = 'doe.pps.submissionNotifications';

interface PpsStore {
  submissions: Submission[];
  notifications: PpsNotification[];
  hydrate: () => void;
  getById: (id: string) => Submission | undefined;
  saveDraft: (id: string, patch: Partial<Submission>) => void;
  deleteSubmission: (id: string) => void;
  createDraft: (params: { productId: string; productLabel: string; productLabelLong: string; productModel: 'distributor' | 'supplier'; entityId: string; entityName: string; cycleYear: number; formType: string; submittedBy: string; }) => string;
  runTransition: (subId: string, transitionId: PpsTransitionId, actor: { id: string; name: string; role: string }, comment?: string) => { ok: boolean; error?: string };
  sendReminder: (subId: string, actor: { id: string; name: string; role: string }, opts: { toName: string; channel: string; note?: string }) => { ok: boolean; error?: string };
  addComment: (subId: string, actor: { id: string; name: string; role: string }, body: string, opts?: { internal?: boolean; replyToId?: string; entityTag?: string }) => { ok: boolean; error?: string };
  markNotificationRead: (id: string) => void;
}

function hydrateSubmissions(): Submission[] {
  try {
    const raw = localStorage.getItem(SUB_KEY);
    if (raw) {
      const stored = JSON.parse(raw) as Submission[];
      // Merge in any newly-seeded submissions (e.g. per-product 2025 drafts)
      // that predate this localStorage snapshot, without clobbering edits.
      const ids = new Set(stored.map((s) => s.id));
      const missing = PPS_SUBMISSIONS.filter((s) => !ids.has(s.id));
      return missing.length ? [...missing, ...stored] : stored;
    }
  } catch { /* fall through */ }
  // Backfill seeded submissions on first load and ensure the LPG-2024 record
  // carries the canned review-remark trail.
  return PPS_SUBMISSIONS.map((s) => ({
    ...s,
    // Derive status from the most-recent workflow event if any; otherwise
    // trust the seeded status (drafts have no workflow entries yet).
    status: s.workflow.length
      ? (stageToStatus(s.workflow[s.workflow.length - 1].stage) ?? s.status)
      : s.status,
    reviewRemarks: s.id === 'sub-lpg-2024' ? LPG_2024_REVIEW_REMARKS : s.reviewRemarks ?? [],
  }));
}

function hydrateNotifications(): PpsNotification[] {
  try {
    const raw = localStorage.getItem(NOTIF_KEY);
    if (raw) return JSON.parse(raw) as PpsNotification[];
  } catch { /* fall through */ }
  return [];
}

function persistSubs(subs: Submission[]) {
  localStorage.setItem(SUB_KEY, JSON.stringify(subs));
}
function persistNotifs(notifs: PpsNotification[]) {
  localStorage.setItem(NOTIF_KEY, JSON.stringify(notifs));
}

// ============================================================================
// "Returned for Clarification" on-demand record (Ahmed Al Mazrouei only).
//
// Ahmed's All-submissions table shows synthetic returned-for-clarification rows
// (`ahmed-clarif-<productId>-<index>`). These are NOT persisted in `submissions`
// — so they never appear in any list/count or any other user's (Omar's) views.
// They are materialised on demand by getById from the product's base record, so
// opening one renders the real RETURNED workflow (not a Draft), with the DoE
// remark and the entity Respond / Edit / Re-submit actions.
// ============================================================================
const CLARIF_PREFIX = 'ahmed-clarif-';
export function isClarificationId(id: string): boolean { return id.startsWith(CLARIF_PREFIX); }
function parseClarifId(id: string): { productId: string; index: number } | null {
  if (!id.startsWith(CLARIF_PREFIX)) return null;
  const rest = id.slice(CLARIF_PREFIX.length);
  const lastDash = rest.lastIndexOf('-');
  if (lastDash <= 0) return null;
  const productId = rest.slice(0, lastDash);
  const index = parseInt(rest.slice(lastDash + 1), 10);
  if (!productId || Number.isNaN(index)) return null;
  return { productId, index };
}

export function buildClarificationSubmission(base: Submission, index: number): Submission {
  const submittedOn = index === 0 ? '2026-06-24T11:22:00Z' : '2026-06-20T09:15:00Z';
  const reviewAt    = index === 0 ? '2026-06-25T09:14:00Z' : '2026-06-21T10:02:00Z';
  const returnedAt  = index === 0 ? '2026-06-26T13:30:00Z' : '2026-06-22T15:48:00Z';
  const comment = 'Q3 distributor volume variance exceeds the prior-year tolerance. Please reconcile against internal records and re-submit with a supporting note.';
  return {
    ...base,
    id: `${CLARIF_PREFIX}${base.productId}-${index}`,
    ref: `SUB-${base.productLabel.toUpperCase().replace(/[^A-Z0-9]+/g, '')}-2025-ADNOC-${118 + index}`,
    status: 'returned',
    cycleYear: 2025,
    periodLabel: '2025 annual',
    version: 'v1',
    submittedBy: base.entityName,
    submittedOn,
    draftCompletePct: undefined,
    workflow: [
      { at: submittedOn, stage: 'submitted',  by: base.entityName,     byRole: 'Entity Submitter' },
      { at: reviewAt,    stage: 'doe_review', by: 'Khalid Al Qubaisi', byRole: 'DoE PPS Reviewer' },
      { at: returnedAt,  stage: 'returned',   by: 'Khalid Al Qubaisi', byRole: 'DoE PPS Reviewer', comment },
    ],
    reviewRemarks: [
      { at: returnedAt, by: 'Khalid Al Qubaisi', byRole: 'DoE PPS Reviewer', kind: 'returned', title: 'Returned for clarification', body: comment },
    ],
  };
}

export const usePpsSubmissions = create<PpsStore>((set, get) => ({
  submissions: hydrateSubmissions(),
  notifications: hydrateNotifications(),

  hydrate: () => set({ submissions: hydrateSubmissions(), notifications: hydrateNotifications() }),

  getById: (id) => {
    const found = get().submissions.find((s) => s.id === id);
    if (found) return found;
    // Materialise Ahmed's synthetic Returned-for-Clarification record on demand
    // (never stored → no impact on lists/counts or any other user).
    const parsed = parseClarifId(id);
    if (parsed) {
      const base = get().submissions.find((s) => s.productId === parsed.productId);
      if (base) return buildClarificationSubmission(base, parsed.index);
    }
    return undefined;
  },

  saveDraft: (id, patch) => {
    const subs = get().submissions.map((s) => (s.id === id ? { ...s, ...patch } : s));
    persistSubs(subs);
    set({ submissions: subs });
  },

  deleteSubmission: (id) => {
    const subs = get().submissions.filter((s) => s.id !== id);
    persistSubs(subs);
    set({ submissions: subs });
  },

  createDraft: ({ productId, productLabel, productLabelLong, productModel, entityId, entityName, cycleYear, formType, submittedBy }) => {
    const id = `sub-${productId}-${cycleYear}-${nanoid(6)}`;
    const ref = `SUB-${productLabel.toUpperCase()}-${cycleYear}-ADNOC-${String(get().submissions.length + 1).padStart(3, '0')}`;
    // Revised reporting period: 2019–2026 (8 cols; 2026 = current editable year).
    const years = Array.from({ length: 8 }, (_, i) => 2019 + i);
    const draft: Submission = {
      id, ref, productId, productLabel, productLabelLong, productModel, entityId, entityName,
      formType, periodLabel: `${cycleYear} annual`, cycleYear, years, submittedBy,
      version: 'v0.1 (draft)', status: 'draft', workflow: [],
      sections: [
        { id: '1-1', number: '1.1', title: 'Supply of LPG to the Emirate of Abu Dhabi', description: `Annual volumes · ${years[0]}–${years[years.length - 1]} · unit: kilotonne (kt)`, rows: [
          { field: 'Local production / transfer', values: Array(8).fill(null) },
          { field: 'Imports',                     values: Array(8).fill(null) },
          { field: 'Total supply from ADNOC',     values: Array(8).fill(null), isFormula: true },
        ]},
      ],
      reviewRemarks: [],
      draftCompletePct: 0,
    };
    const subs = [draft, ...get().submissions];
    persistSubs(subs);
    set({ submissions: subs });
    return id;
  },

  runTransition: (subId, transitionId, actor, comment) => {
    const sub = get().submissions.find((s) => s.id === subId);
    if (!sub) return { ok: false, error: 'Submission not found' };
    const t = PPS_TRANSITIONS.find((x) => x.id === transitionId);
    if (!t) return { ok: false, error: 'Transition not found' };
    if (!t.from.includes(sub.status)) return { ok: false, error: `Cannot ${t.label} from state "${sub.status}"` };
    if (!t.allowedRoles.includes(actor.role as PpsActorRole)) return { ok: false, error: 'Your role cannot perform this action' };
    if (t.commentRequired && !(comment ?? '').trim()) return { ok: false, error: 'A comment is required for this action' };

    const event = transitionToEvent(t, actor.name, actor.role, comment);
    const remark = transitionToRemark(t, actor.name, actor.role, comment);

    const updated: Submission = {
      ...sub,
      status: t.to,
      workflow: [...sub.workflow, event],
      reviewRemarks: remark ? [...(sub.reviewRemarks ?? []), remark] : sub.reviewRemarks,
      submittedOn: t.id === 'submit' || t.id === 'resubmit' ? event.at : sub.submittedOn,
      submittedBy: t.id === 'submit' || t.id === 'resubmit' ? actor.name : sub.submittedBy,
      version:
        t.id === 'submit'   ? 'v1' :
        t.id === 'resubmit' ? `v${(parseInt((sub.version.match(/v(\d+)/)?.[1] ?? '1'), 10) + 1)} (amended)` :
        sub.version,
    };

    const subs = get().submissions.map((s) => (s.id === subId ? updated : s));
    persistSubs(subs);
    const newNotifs = buildNotifications(t, updated, actor.name);
    const notifs = [...newNotifs, ...get().notifications];
    persistNotifs(notifs);
    set({ submissions: subs, notifications: notifs });
    return { ok: true };
  },

  // DoE PPS Approver (Omar) → entity reminder. Appends to the submission's
  // reminder audit trail and notifies the entity. Only DoE roles may call this.
  sendReminder: (subId, actor, opts) => {
    const sub = get().submissions.find((s) => s.id === subId);
    if (!sub) return { ok: false, error: 'Submission not found' };
    if (actor.role === 'pps_entity') return { ok: false, error: 'Entity submitters cannot send reminders' };

    const log: ReminderLog = {
      at: new Date().toISOString(),
      by: actor.name,
      byRole: roleLabel(actor.role),
      toName: opts.toName,
      channel: opts.channel,
      ...(opts.note?.trim() ? { note: opts.note.trim() } : {}),
    };
    const updated: Submission = { ...sub, reminders: [...(sub.reminders ?? []), log] };
    const subs = get().submissions.map((s) => (s.id === subId ? updated : s));
    persistSubs(subs);

    const notif: PpsNotification = {
      id: nanoid(8), at: log.at, toRole: 'pps_entity', submissionId: sub.id,
      subject: `${sub.productLabel} · ${sub.cycleYear} annual — reminder from DoE PPS`,
      body: `${actor.name} (DoE PPS) sent you a reminder regarding ${sub.productLabel} ${sub.cycleYear} annual (ref ${sub.ref}).${log.note ? ` Note: ${log.note}` : ''}`,
      read: false,
    };
    const notifs = [notif, ...get().notifications];
    persistNotifs(notifs);
    set({ submissions: subs, notifications: notifs });
    return { ok: true };
  },

  addComment: (subId, actor, body, opts = {}) => {
    const sub = get().submissions.find((s) => s.id === subId);
    if (!sub) return { ok: false, error: 'Submission not found' };
    if (!body.trim()) return { ok: false, error: 'Comment cannot be empty' };

    const roleLabelMap: Record<string, string> = {
      pps_entity:   'Entity Submitter',
      pps_reviewer: 'DoE PPS Reviewer',
      pps_approver: 'DoE Approver',
    };
    // External users can never post internal notes (they wouldn't see them).
    const internal = actor.role === 'pps_entity' ? false : !!opts.internal;

    const comment: PpsComment = {
      id: `c-${nanoid(8)}`,
      at: new Date().toISOString(),
      byUserId: actor.id,
      byUserName: actor.name,
      byUserRole: roleLabelMap[actor.role] ?? actor.role,
      entityTag: opts.entityTag,
      internal,
      body: body.trim(),
      replyToId: opts.replyToId,
    };

    const subs = get().submissions.map((s) => (s.id === subId ? { ...s, comments: [...(s.comments ?? []), comment] } : s));
    persistSubs(subs);
    set({ submissions: subs });
    return { ok: true };
  },

  markNotificationRead: (id) => {
    const notifs = get().notifications.map((n) => (n.id === id ? { ...n, read: true } : n));
    persistNotifs(notifs);
    set({ notifications: notifs });
  },
}));

// Re-export so consumers don't have to import data + store separately.
export { LPG_DEMAND_MATRIX, LPG_SEASONAL_MATRIX };
// Suppress the unused-import warning for STORAGE_KEYS (kept for future module
// alignment with the gas/hoe/noc persistence pattern).
void STORAGE_KEYS;
