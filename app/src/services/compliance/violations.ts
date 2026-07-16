// =============================================================================
// Compliance · Violations Register Service
// -----------------------------------------------------------------------------
// Single canonical register per SDD §4.1. Every source channel lands here.
// Read-side helpers + a minimal state-machine transition function so the UI
// can advance a violation through its lifecycle without scattering state-
// transition logic.
// =============================================================================

import type {
  Violation, ViolationState, ViolationSeverity, ViolationCode,
  ViolationSource, ViolationPermitType, ViolationDecisionRoute,
  ViolationDecisionOutcome, ViolationAuditEntry, ViolationLicensee,
  ViolationEvidence, Role,
} from '../../types';
import { getViolationCode, CATALOGUE_VERSION } from './catalogue';
import { computePenalty } from './penaltyEngine';
import {
  countPriorOffences, deriveFinalSeverity,
} from './severity';
import { SEED_VIOLATIONS } from './seed';

// ---------------------------------------------------------------------------
// In-memory store — backed by the seed; mutations applied via recordTransition.
// ---------------------------------------------------------------------------
const STORE: Violation[] = [...SEED_VIOLATIONS];

export function listViolations(): Violation[] {
  return STORE;
}

export function getViolation(id: string): Violation | undefined {
  return STORE.find((v) => v.id === id);
}

export function listForLicensee(licenseeId: string): Violation[] {
  return STORE.filter((v) => v.licensee.id === licenseeId);
}

export function listOpenViolations(): Violation[] {
  return STORE.filter((v) => !v.state.startsWith('closed') && v.state !== 'paid');
}

// ---------------------------------------------------------------------------
// New violation creation (called by source-channel adapters in production)
// ---------------------------------------------------------------------------
export interface NewViolationInput {
  source: ViolationSource;
  sourceReference: string;
  violationCodeId: string;
  licensee: ViolationLicensee;
  permitType: ViolationPermitType;
  linkedPermitId?: string;
  linkedBuildingId?: string;
  linkedMaterialId?: string;
  evidence?: ViolationEvidence[];
  sourceSeverityHint?: ViolationSeverity;
  createdByName?: string;
}

let _counter = 100_000;
function nextId(): string {
  _counter += 1;
  const year = new Date().getFullYear();
  return `VIO-${year}-${String(_counter).padStart(6, '0')}`;
}

export function createViolation(input: NewViolationInput): Violation {
  const code = getViolationCode(input.violationCodeId);
  if (!code) throw new Error(`Unknown violation code: ${input.violationCodeId}`);
  const offenceCount = (countPriorOffences(input.licensee.id, code.id, STORE) + 1) as Violation['offenceCount'];
  const { autoDerived, finalSeverity } = deriveFinalSeverity(code, input.source, offenceCount, input.sourceSeverityHint);
  const penalty = computePenalty(code, offenceCount, finalSeverity);
  const now = new Date().toISOString();
  const id = nextId();
  const audit: ViolationAuditEntry = {
    id: `${id}-AUD-1`,
    timestamp: now,
    actor: input.createdByName ?? 'System',
    actorRole: 'admin',
    action: `Violation created from ${input.source}`,
    toState: 'identified',
  };
  const v: Violation = {
    id,
    source: input.source,
    sourceReference: input.sourceReference,
    violationCodeId: code.id,
    violationCode: code.code,
    title: code.title,
    titleAr: code.titleAr,
    description: code.description,
    licensee: input.licensee,
    permitType: input.permitType,
    linkedPermitId: input.linkedPermitId,
    linkedBuildingId: input.linkedBuildingId,
    linkedMaterialId: input.linkedMaterialId,
    severity: finalSeverity,
    autoDerivedSeverity: autoDerived,
    offenceCount,
    penaltyAed: penalty.computedPenaltyAed,
    evidence: input.evidence ?? [],
    state: 'identified',
    decisionRoute: 'administrative',  // default suggestion; engineer may re-route
    appealStatus: 'no_appeal',
    configVersionBound: CATALOGUE_VERSION,
    auditTrail: [audit],
    crossGovEvents: [],
    createdAt: now,
    updatedAt: now,
  };
  STORE.unshift(v);
  return v;
}

// ---------------------------------------------------------------------------
// State machine — every transition records an audit entry
// ---------------------------------------------------------------------------
export interface TransitionInput {
  violationId: string;
  toState: ViolationState;
  actor: string;
  actorRole: Role;
  reason?: string;
  patch?: Partial<Violation>;
}

export function recordTransition(input: TransitionInput): Violation {
  const v = getViolation(input.violationId);
  if (!v) throw new Error(`Violation not found: ${input.violationId}`);
  const fromState = v.state;
  v.state = input.toState;
  if (input.patch) Object.assign(v, input.patch);
  v.updatedAt = new Date().toISOString();
  const audit: ViolationAuditEntry = {
    id: `${v.id}-AUD-${v.auditTrail.length + 1}`,
    timestamp: v.updatedAt,
    actor: input.actor,
    actorRole: input.actorRole,
    action: stateTransitionLabel(fromState, input.toState),
    fromState,
    toState: input.toState,
    reason: input.reason,
  };
  v.auditTrail = [...v.auditTrail, audit];
  return v;
}

function stateTransitionLabel(from: ViolationState, to: ViolationState): string {
  return `Transitioned: ${STATE_LABEL[from]} → ${STATE_LABEL[to]}`;
}

// ---------------------------------------------------------------------------
// Display helpers
// ---------------------------------------------------------------------------
export const STATE_LABEL: Record<ViolationState, string> = {
  identified: 'Identified',
  under_review: 'Under Review',
  pending_admin_decision: 'Pending Administrative Decision',
  pending_committee_review: 'Pending Committee Review',
  decision_recorded: 'Decision Recorded',
  penalty_outstanding: 'Penalty Outstanding',
  cross_gov_enforcement_triggered: 'Cross-Gov Enforcement Triggered',
  appeal_submitted: 'Appeal Submitted',
  appeal_decided: 'Appeal Decided',
  paid: 'Paid',
  closed_resolved: 'Closed — Resolved',
  closed_no_action: 'Closed — No Action',
  closed_overturned: 'Closed — Overturned',
};

export const SOURCE_LABEL: Record<ViolationSource, string> = {
  mobile_inspection: 'Mobile Inspection',
  tpi_conformity: 'TPI Conformity',
  sampling_fail: 'Sampling Fail',
  incident_report: 'Incident Report',
  compliance_assessment: 'Compliance Assessment',
};

export const PERMIT_TYPE_LABEL: Record<ViolationPermitType, string> = {
  gas_company_registration: 'Gas Systems Company',
  hoe_tpi_registration: 'House of Expertise',
  amc: 'AMC',
  noc: 'NOC',
  coc: 'COC',
  maes: 'MAES',
  tadawel: 'Tadawel',
};

export const DECISION_ROUTE_LABEL: Record<ViolationDecisionRoute, string> = {
  administrative: 'Administrative Decision',
  vap_committee: 'VAP Committee',
};

export const DECISION_OUTCOME_LABEL: Record<ViolationDecisionOutcome, string> = {
  penalty_imposed: 'Penalty Imposed',
  warning_letter: 'Warning Letter Issued',
  no_action: 'No Action',
  referred_investigation: 'Referred for Further Investigation',
};

/** Is the violation in an "open" state (active in the queue)? */
export function isOpen(v: Violation): boolean {
  return !v.state.startsWith('closed') && v.state !== 'paid';
}

/** Age in days since creation. */
export function ageDays(v: Violation, now: Date = new Date()): number {
  return Math.floor((now.getTime() - new Date(v.createdAt).getTime()) / 86_400_000);
}

/** Days remaining until the payment SLA expires (negative = overdue). */
export function daysToPaymentSla(v: Violation, now: Date = new Date()): number | null {
  if (!v.paymentDeadline) return null;
  return Math.ceil((new Date(v.paymentDeadline).getTime() - now.getTime()) / 86_400_000);
}

/** Quick aggregate counts useful for KPI tiles. */
export interface ViolationsSummary {
  total: number;
  open: number;
  critical: number;
  penaltyOutstanding: number;
  appealSubmitted: number;
  pendingVap: number;
  pendingAdmin: number;
  totalPenaltyAed: number;
  outstandingAed: number;
  slaBreach: number;
}

export function summary(now: Date = new Date()): ViolationsSummary {
  const all = STORE;
  let outstandingAed = 0;
  let slaBreach = 0;
  for (const v of all) {
    if (v.state === 'penalty_outstanding' || v.state === 'cross_gov_enforcement_triggered') {
      outstandingAed += v.penaltyAed;
      const d = daysToPaymentSla(v, now);
      if (d !== null && d < 0) slaBreach += 1;
    }
  }
  return {
    total: all.length,
    open: all.filter(isOpen).length,
    critical: all.filter((v) => isOpen(v) && v.severity === 'critical').length,
    penaltyOutstanding: all.filter((v) => v.state === 'penalty_outstanding').length,
    appealSubmitted: all.filter((v) => v.state === 'appeal_submitted').length,
    pendingVap: all.filter((v) => v.state === 'pending_committee_review').length,
    pendingAdmin: all.filter((v) => v.state === 'pending_admin_decision').length,
    totalPenaltyAed: all.reduce((s, v) => s + v.penaltyAed, 0),
    outstandingAed,
    slaBreach,
  };
}

// Re-export catalogue + penalty engine for UI convenience
export { VIOLATION_CATALOGUE, getViolationCode as catalogueCode } from './catalogue';
export { computePenalty, formatAed } from './penaltyEngine';
export { SEVERITY_LABEL, SEVERITY_LABEL_AR, severityTone } from './severity';
export type { ViolationCode };
