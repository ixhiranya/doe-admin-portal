// ============================================================================
// Inspection store — DoE PPS Mobile Inspection app + web review side.
//
// State machine (Doc 2 SDD §5–§7):
//
//   draft (mobile, on device)
//     ─ Submit (retain) ─→ retained               (Senior Inspector queue)
//     ─ Submit (escalate) ─→ escalated → in_review (Section Head / Regulation Team)
//   in_review
//     ─ Start co-sign ─→ needs_cosign   (Critical violations only)
//     ─ Co-sign       ─→ in_review      (Senior Inspector confirms)
//     ─ Return        ─→ returned       (back to inspector with comments)
//     ─ Approve       ─→ approved
//     ─ Escalate VAP  ─→ closed         (Violations written to register)
//   retained
//     ─ Reassign / Complete ─→ closed
//
// Submissions are persisted to localStorage so the mobile simulator and the
// web review pages stay in sync across reloads.
// ============================================================================

import { create } from 'zustand';
import { nanoid } from 'nanoid';
import type {
  Inspection,
  InspectionStatus,
  InspectionSubmissionRoute,
  InspectionWorkflowEvent,
  InspectionViolation,
  ChecklistItem,
  Severity,
} from '../types/inspection';

const STORE_KEY = 'doe.pps.mobile.inspections';
const COUNTER_KEY = 'doe.pps.mobile.counters';

interface Counters {
  insSeq: number;
  vioSeq: number;
}

function loadCounters(): Counters {
  try {
    const raw = localStorage.getItem(COUNTER_KEY);
    if (raw) return JSON.parse(raw) as Counters;
  } catch { /* ignore */ }
  return { insSeq: 1042, vioSeq: 3210 };
}

function persistCounters(c: Counters) {
  localStorage.setItem(COUNTER_KEY, JSON.stringify(c));
}

function loadInspections(): Inspection[] {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (raw) return JSON.parse(raw) as Inspection[];
  } catch { /* ignore */ }
  return [];
}

function persistInspections(list: Inspection[]) {
  localStorage.setItem(STORE_KEY, JSON.stringify(list));
}

function nowIso(): string {
  return new Date().toISOString();
}

function yearOf(iso: string): string {
  return new Date(iso).getFullYear().toString();
}

// Critical-severity gating: any violation with severity = critical requires
// Senior Inspector co-sign before the inspection can move to "approved".
function hasCriticalViolation(ins: Inspection): boolean {
  return ins.violations.some((v) => v.severity === 'critical');
}

interface Actor {
  id: string;
  name: string;
  role: string;
}

interface InspectionStore {
  inspections: Inspection[];
  hydrate: () => void;

  getById: (id: string) => Inspection | undefined;
  listByInspector: (inspectorId: string) => Inspection[];
  listForReview: () => Inspection[];           // Section Head / Regulation Team queue
  listForSeniorQueue: () => Inspection[];      // Senior Inspector retained queue + co-sign queue
  listRecent: (limit?: number) => Inspection[];

  // ---- mobile-side mutations ----
  createDraft: (params: {
    type: Inspection['type'];
    building: {
      id: string;
      uid: string;
      name: string;
      address: string;
      city?: string;
      type?: string;
      commercialLicence?: string;
      coords: { lat: number; lng: number };
      permits: Inspection['permits'];
      openViolations: number;
      openWarnings: number;
      complianceScore?: number;
    };
    inspector: Actor;
    checkIn: { lat: number; lng: number; distance: number; override?: boolean; overrideReason?: string };
    checklistTemplate: { description: string; clause?: string }[];
  }) => string;
  updateDraft: (id: string, patch: Partial<Inspection>) => void;
  updateChecklistItem: (id: string, itemId: string, patch: Partial<ChecklistItem>) => void;
  upsertViolation: (id: string, violation: InspectionViolation) => void;
  removeViolation: (id: string, vioId: string) => void;

  // ---- submit (mobile → web) ----
  submit: (
    id: string,
    route: InspectionSubmissionRoute,
    actor: Actor,
    note?: string,
  ) => { ok: boolean; error?: string };

  // ---- web-side mutations (review cycle) ----
  startReview: (id: string, actor: Actor) => { ok: boolean; error?: string };
  requestCoSign: (id: string, actor: Actor) => { ok: boolean; error?: string };
  coSign: (id: string, actor: Actor, note?: string) => { ok: boolean; error?: string };
  approve: (id: string, actor: Actor, note?: string) => { ok: boolean; error?: string };
  returnToInspector: (id: string, actor: Actor, note: string) => { ok: boolean; error?: string };
  escalateToVap: (id: string, actor: Actor, note?: string) => { ok: boolean; error?: string };
  reassignFollowUp: (id: string, actor: Actor, toInspectorName: string, dueAt: string) => { ok: boolean; error?: string };
  closeRetained: (id: string, actor: Actor, note?: string) => { ok: boolean; error?: string };

  // ---- counters ----
  newInspectionNumber: () => string;
  newViolationNumber: () => string;
}

function appendEvent(ins: Inspection, ev: Omit<InspectionWorkflowEvent, 'at'>): Inspection {
  const event: InspectionWorkflowEvent = { ...ev, at: nowIso() };
  return { ...ins, workflow: [...ins.workflow, event], updatedAt: event.at };
}

function severityRank(s?: Severity): number {
  return s === 'critical' ? 3 : s === 'major' ? 2 : s === 'minor' ? 1 : 0;
}

function summariseOverall(checklist: ChecklistItem[], violations: InspectionViolation[]) {
  const hasViolation = violations.length > 0 || checklist.some((c) => c.outcome === 'violation');
  if (hasViolation) return 'non_compliant' as const;
  const hasWarning = checklist.some((c) => c.outcome === 'warning');
  if (hasWarning) return 'compliant_with_warnings' as const;
  return 'compliant' as const;
}

export const useInspections = create<InspectionStore>((set, get) => ({
  inspections: loadInspections(),

  hydrate: () => set({ inspections: loadInspections() }),

  getById: (id) => get().inspections.find((i) => i.id === id),

  listByInspector: (inspectorId) =>
    get().inspections.filter((i) => i.inspectorId === inspectorId)
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),

  listForReview: () =>
    get().inspections.filter((i) => ['submitted', 'escalated', 'in_review', 'needs_cosign', 'returned'].includes(i.status))
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),

  listForSeniorQueue: () =>
    get().inspections.filter((i) => ['retained', 'needs_cosign'].includes(i.status))
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),

  listRecent: (limit = 25) =>
    [...get().inspections].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, limit),

  newInspectionNumber: () => {
    const c = loadCounters();
    c.insSeq += 1;
    persistCounters(c);
    return `DOE-INS-${new Date().getFullYear()}-${String(c.insSeq).padStart(4, '0')}`;
  },

  newViolationNumber: () => {
    const c = loadCounters();
    c.vioSeq += 1;
    persistCounters(c);
    return `DOE-VIO-${new Date().getFullYear()}-${String(c.vioSeq).padStart(4, '0')}`;
  },

  createDraft: ({ type, building, inspector, checkIn, checklistTemplate }) => {
    const id = `ins-${nanoid(8)}`;
    const at = nowIso();
    const inspectionNumber = get().newInspectionNumber();
    const checklist: ChecklistItem[] = checklistTemplate.map((tpl, i) => ({
      id: `ci-${i}-${nanoid(4)}`,
      description: tpl.description,
      outcome: null,
      photos: [],
      referenceClause: tpl.clause,
    }));
    const draft: Inspection = {
      id,
      inspectionNumber,
      type,
      status: 'draft',
      buildingId: building.id,
      buildingName: building.name,
      buildingUid: building.uid,
      buildingAddress: building.address,
      buildingCity: building.city,
      buildingCoords: building.coords,
      buildingType: building.type,
      commercialLicence: building.commercialLicence,
      permits: building.permits,
      openViolationsAtCheckin: building.openViolations,
      openWarningsAtCheckin: building.openWarnings,
      complianceScoreAtCheckin: building.complianceScore,
      inspectorId: inspector.id,
      inspectorName: inspector.name,
      inspectorRole: inspector.role,
      checkInAt: at,
      checkInLat: checkIn.lat,
      checkInLng: checkIn.lng,
      geofenceDistanceMeters: checkIn.distance,
      geofenceOverride: checkIn.override,
      geofenceOverrideReason: checkIn.overrideReason,
      responsibleParty: [],
      amcVisible: null,
      nocVisible: null,
      briefingGiven: null,
      checklist,
      priorFindings: [],
      violations: [],
      workflow: [{
        at,
        actorId: inspector.id,
        actorName: inspector.name,
        actorRole: inspector.role,
        action: 'check_in',
        to: 'draft',
        comment: `Checked in at the building. GPS distance ${checkIn.distance}m${checkIn.override ? ' (geofence override)' : ''}.`,
      }],
      createdAt: at,
      updatedAt: at,
    };
    const next = [draft, ...get().inspections];
    persistInspections(next);
    set({ inspections: next });
    return id;
  },

  updateDraft: (id, patch) => {
    const next = get().inspections.map((i) => (i.id === id ? { ...i, ...patch, updatedAt: nowIso() } : i));
    persistInspections(next);
    set({ inspections: next });
  },

  updateChecklistItem: (id, itemId, patch) => {
    const next = get().inspections.map((i) => {
      if (i.id !== id) return i;
      return {
        ...i,
        updatedAt: nowIso(),
        checklist: i.checklist.map((c) => (c.id === itemId ? { ...c, ...patch } : c)),
      };
    });
    persistInspections(next);
    set({ inspections: next });
  },

  upsertViolation: (id, violation) => {
    const next = get().inspections.map((i) => {
      if (i.id !== id) return i;
      const exists = i.violations.find((v) => v.id === violation.id);
      const violations = exists
        ? i.violations.map((v) => (v.id === violation.id ? violation : v))
        : [...i.violations, violation];
      return { ...i, violations, updatedAt: nowIso() };
    });
    persistInspections(next);
    set({ inspections: next });
  },

  removeViolation: (id, vioId) => {
    const next = get().inspections.map((i) =>
      i.id !== id ? i : { ...i, violations: i.violations.filter((v) => v.id !== vioId), updatedAt: nowIso() },
    );
    persistInspections(next);
    set({ inspections: next });
  },

  submit: (id, route, actor, note) => {
    const ins = get().inspections.find((i) => i.id === id);
    if (!ins) return { ok: false, error: 'Inspection not found' };
    if (ins.status !== 'draft' && ins.status !== 'returned') {
      return { ok: false, error: `Cannot submit from status "${ins.status}"` };
    }
    // Validate: every checklist item has an outcome, violation items have a
    // matching Violation form.
    const missingOutcome = ins.checklist.find((c) => c.outcome === null);
    if (missingOutcome) return { ok: false, error: `Checklist item not complete: "${missingOutcome.description.slice(0, 50)}…"` };
    const violationItems = ins.checklist.filter((c) => c.outcome === 'violation');
    for (const v of violationItems) {
      if (!ins.violations.find((vv) => vv.checklistItemId === v.id)) {
        return { ok: false, error: 'A violation form must be filled for every checklist item marked as Violation.' };
      }
    }

    const overall = summariseOverall(ins.checklist, ins.violations);
    const submittedAt = nowIso();
    let nextStatus: InspectionStatus = route === 'retain' ? 'retained' : 'escalated';
    let updated: Inspection = {
      ...ins,
      status: nextStatus,
      submissionRoute: route,
      endAt: submittedAt,
      inspectorSignedAt: submittedAt,
      inspectorSignature: `${actor.name} · AD biometric @ ${submittedAt}`,
      overallOutcome: { result: overall },
    };

    // On escalate route, every Violation marked during the inspection is
    // written to the centralized Violations Register (Doc 2 §7.2).
    if (route === 'escalate') {
      const linkedViolationIds: string[] = [];
      updated = {
        ...updated,
        violations: updated.violations.map((v) => {
          if (v.violationNumber) {
            linkedViolationIds.push(v.violationNumber);
            return v;
          }
          const number = get().newViolationNumber();
          linkedViolationIds.push(number);
          return { ...v, violationNumber: number, registerStatus: 'open' };
        }),
        linkedViolationIds,
      };
    }

    updated = appendEvent(updated, {
      actorId: actor.id, actorName: actor.name, actorRole: actor.role,
      action: route === 'retain' ? 'submit_retain' : 'submit_escalate',
      from: ins.status, to: nextStatus,
      comment: note ?? (route === 'retain'
        ? 'Submitted — retained in inspection team for follow-up.'
        : `Submitted — escalated to Regulation Team. Overall outcome: ${overall.replace(/_/g, ' ')}.`),
    });

    // Retained inspections get an automatic follow-up due date.
    if (route === 'retain') {
      const dueDays = updated.violations.length === 0 && overall === 'compliant_with_warnings' ? 30 : 7;
      const due = new Date();
      due.setDate(due.getDate() + dueDays);
      updated.followUpDueAt = due.toISOString();
    }

    const next = get().inspections.map((i) => (i.id === id ? updated : i));
    persistInspections(next);
    set({ inspections: next });
    return { ok: true };
  },

  startReview: (id, actor) => {
    const ins = get().inspections.find((i) => i.id === id);
    if (!ins) return { ok: false, error: 'Not found' };
    if (!['submitted', 'escalated'].includes(ins.status)) {
      return { ok: false, error: `Cannot start review from "${ins.status}"` };
    }
    const updated = appendEvent({ ...ins, status: 'in_review' }, {
      actorId: actor.id, actorName: actor.name, actorRole: actor.role,
      action: 'start_review', from: ins.status, to: 'in_review',
    });
    const next = get().inspections.map((i) => (i.id === id ? updated : i));
    persistInspections(next);
    set({ inspections: next });
    return { ok: true };
  },

  requestCoSign: (id, actor) => {
    const ins = get().inspections.find((i) => i.id === id);
    if (!ins) return { ok: false, error: 'Not found' };
    if (!hasCriticalViolation(ins)) return { ok: false, error: 'No critical violation requires co-sign' };
    const updated = appendEvent({ ...ins, status: 'needs_cosign' }, {
      actorId: actor.id, actorName: actor.name, actorRole: actor.role,
      action: 'request_cosign', from: ins.status, to: 'needs_cosign',
      comment: 'Critical violation found — Senior Inspector co-sign required.',
    });
    const next = get().inspections.map((i) => (i.id === id ? updated : i));
    persistInspections(next);
    set({ inspections: next });
    return { ok: true };
  },

  coSign: (id, actor, note) => {
    const ins = get().inspections.find((i) => i.id === id);
    if (!ins) return { ok: false, error: 'Not found' };
    if (ins.status !== 'needs_cosign') return { ok: false, error: 'Inspection is not awaiting co-sign' };
    if (actor.role !== 'senior_inspector' && actor.role !== 'section_head' && actor.role !== 'director') {
      return { ok: false, error: 'Only a Senior Inspector or higher can co-sign.' };
    }
    const updated = appendEvent({
      ...ins,
      status: 'in_review',
      coSignerId: actor.id, coSignerName: actor.name, coSignedAt: nowIso(),
    }, {
      actorId: actor.id, actorName: actor.name, actorRole: actor.role,
      action: 'cosign', from: ins.status, to: 'in_review',
      comment: note ?? 'Co-signed by Senior Inspector.',
    });
    const next = get().inspections.map((i) => (i.id === id ? updated : i));
    persistInspections(next);
    set({ inspections: next });
    return { ok: true };
  },

  approve: (id, actor, note) => {
    const ins = get().inspections.find((i) => i.id === id);
    if (!ins) return { ok: false, error: 'Not found' };
    if (!['in_review', 'escalated', 'submitted'].includes(ins.status)) {
      return { ok: false, error: `Cannot approve from "${ins.status}"` };
    }
    if (hasCriticalViolation(ins) && !ins.coSignedAt) {
      return { ok: false, error: 'Critical violation present — Senior Inspector co-sign required before approval.' };
    }
    const updated = appendEvent({ ...ins, status: 'approved' }, {
      actorId: actor.id, actorName: actor.name, actorRole: actor.role,
      action: 'approve', from: ins.status, to: 'approved',
      comment: note ?? 'Approved.',
    });
    const next = get().inspections.map((i) => (i.id === id ? updated : i));
    persistInspections(next);
    set({ inspections: next });
    return { ok: true };
  },

  returnToInspector: (id, actor, note) => {
    const ins = get().inspections.find((i) => i.id === id);
    if (!ins) return { ok: false, error: 'Not found' };
    if (!note.trim()) return { ok: false, error: 'Return comment is required.' };
    if (!['in_review', 'submitted', 'escalated', 'needs_cosign'].includes(ins.status)) {
      return { ok: false, error: `Cannot return from "${ins.status}"` };
    }
    const updated = appendEvent({ ...ins, status: 'returned' }, {
      actorId: actor.id, actorName: actor.name, actorRole: actor.role,
      action: 'return', from: ins.status, to: 'returned',
      comment: note,
    });
    const next = get().inspections.map((i) => (i.id === id ? updated : i));
    persistInspections(next);
    set({ inspections: next });
    return { ok: true };
  },

  escalateToVap: (id, actor, note) => {
    const ins = get().inspections.find((i) => i.id === id);
    if (!ins) return { ok: false, error: 'Not found' };
    if (!hasCriticalViolation(ins) && !ins.violations.length) {
      return { ok: false, error: 'No violations present — VAP escalation not applicable.' };
    }
    // Critical-severity violations also need co-sign before VAP escalation.
    if (hasCriticalViolation(ins) && !ins.coSignedAt) {
      return { ok: false, error: 'Critical violation present — Senior Inspector co-sign required before VAP escalation.' };
    }
    const updated = appendEvent({ ...ins, status: 'closed' }, {
      actorId: actor.id, actorName: actor.name, actorRole: actor.role,
      action: 'escalate_vap', from: ins.status, to: 'closed',
      comment: note ?? 'Violations routed to VAP Committee via the Violations Register.',
    });
    const next = get().inspections.map((i) => (i.id === id ? updated : i));
    persistInspections(next);
    set({ inspections: next });
    return { ok: true };
  },

  reassignFollowUp: (id, actor, toInspectorName, dueAt) => {
    const ins = get().inspections.find((i) => i.id === id);
    if (!ins) return { ok: false, error: 'Not found' };
    if (ins.status !== 'retained') return { ok: false, error: 'Only retained inspections can be reassigned.' };
    const updated = appendEvent({
      ...ins,
      followUpAssignedTo: toInspectorName,
      followUpDueAt: dueAt,
    }, {
      actorId: actor.id, actorName: actor.name, actorRole: actor.role,
      action: 'reassign', comment: `Reassigned follow-up to ${toInspectorName}, due ${dueAt.slice(0, 10)}.`,
    });
    const next = get().inspections.map((i) => (i.id === id ? updated : i));
    persistInspections(next);
    set({ inspections: next });
    return { ok: true };
  },

  closeRetained: (id, actor, note) => {
    const ins = get().inspections.find((i) => i.id === id);
    if (!ins) return { ok: false, error: 'Not found' };
    if (ins.status !== 'retained') return { ok: false, error: 'Only retained inspections can be closed.' };
    const updated = appendEvent({ ...ins, status: 'closed' }, {
      actorId: actor.id, actorName: actor.name, actorRole: actor.role,
      action: 'close', from: ins.status, to: 'closed',
      comment: note ?? 'Follow-up complete, inspection closed.',
    });
    const next = get().inspections.map((i) => (i.id === id ? updated : i));
    persistInspections(next);
    set({ inspections: next });
    return { ok: true };
  },
}));

// Convenience: a SHA-256-like deterministic hash for the photo-tampering
// simulation. Real implementation would use SubtleCrypto, but since we are
// stamping a base64 PNG produced on the simulator we use a simple djb2-style
// hash and prefix it to look like SHA. Used solely for visual fidelity.
export function pseudoSha256(input: string): string {
  let h = 5381;
  for (let i = 0; i < input.length; i++) h = ((h << 5) + h + input.charCodeAt(i)) | 0;
  const hex = (h >>> 0).toString(16).padStart(8, '0');
  return `sha256:${hex}${hex.split('').reverse().join('')}${hex}${hex.split('').reverse().join('')}`.slice(0, 71);
}

// Severity ranking helper used by the UI badges.
export { severityRank };
