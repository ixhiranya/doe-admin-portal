// =============================================================================
// Compliance · Seed Violations Dataset
// -----------------------------------------------------------------------------
// ~60 violations across all 5 source channels with mixed states, severities,
// ages and offence counts so the Violations Register, VAP Committee queue,
// Appeals workspace and Cross-Government Enforcement view all have realistic
// data to render.
// =============================================================================

import type {
  Violation, ViolationLicensee, ViolationEvidence, ViolationAuditEntry,
  ViolationSource, ViolationState, ViolationSeverity,
  ViolationDecisionRoute, ViolationDecisionOutcome,
  CrossGovEvent,
} from '../../types';
import { getViolationCode, CATALOGUE_VERSION } from './catalogue';
import { computePenalty } from './penaltyEngine';

const DAY_MS = 86_400_000;
const NOW = new Date('2026-05-20T09:00:00Z').getTime();

function daysAgo(d: number, hour = 9): string {
  const t = NOW - d * DAY_MS;
  const dt = new Date(t);
  dt.setUTCHours(hour, 0, 0, 0);
  return dt.toISOString();
}

let _counter = 100_000;
function nextId(): string {
  _counter += 1;
  const year = 2026;
  return `VIO-${year}-${String(_counter).padStart(6, '0')}`;
}

// ---------------------------------------------------------------------------
// Licensee roster (matches existing permit holders + adds a few violators)
// ---------------------------------------------------------------------------
const LICENSEES: ViolationLicensee[] = [
  { id: 'PH-001', name: 'ADNOC Distribution',         tradeLicenceNumber: 'CN-1000045', primaryRepresentativeName: 'Khalid Al Hammadi',  primaryEmail: 'pps.compliance@adnocdistribution.ae', primaryPhone: '+971 2 555 1100' },
  { id: 'PH-002', name: 'Emirates Gas LLC',           tradeLicenceNumber: 'CN-2000125', primaryRepresentativeName: 'Saeed Al Mazrouei',  primaryEmail: 'permits@emiratesgas.ae',              primaryPhone: '+971 2 419 1000' },
  { id: 'PH-003', name: 'ADNOC LNG',                  tradeLicenceNumber: 'CN-3000871', primaryRepresentativeName: 'Reema Al Marri',     primaryEmail: 'compliance@adnoclng.ae',              primaryPhone: '+971 2 614 4400' },
  { id: 'PH-004', name: 'Dolphin Energy',             tradeLicenceNumber: 'CN-4002211', primaryRepresentativeName: 'Mariam Al Ali',      primaryEmail: 'pps@dolphinenergy.ae',                primaryPhone: '+971 2 875 0100' },
  { id: 'PH-005', name: 'ENOC / Emarat',              tradeLicenceNumber: 'CN-5009017', primaryRepresentativeName: 'Tariq Bin Hamad',    primaryEmail: 'gas.permits@enoc.com',                primaryPhone: '+971 2 510 1010' },
  { id: 'PH-006', name: 'Petroleum Development Co.',  tradeLicenceNumber: 'CN-6001188', primaryRepresentativeName: 'Hessa Al Falasi',    primaryEmail: 'permits@pdcuae.ae',                   primaryPhone: '+971 2 875 0100' },
  { id: 'PH-007', name: 'Al Yasat Petroleum',         tradeLicenceNumber: 'CN-7004411', primaryRepresentativeName: 'Omar Al Suwaidi',    primaryEmail: 'admin@alyasat.ae',                    primaryPhone: '+971 2 444 5500' },
  { id: 'PH-008', name: 'GreenFlame Gas Contractors', tradeLicenceNumber: 'CN-8033211', primaryRepresentativeName: 'Yousef Al Rashidi',  primaryEmail: 'ops@greenflame.ae',                   primaryPhone: '+971 50 700 1100' },
  { id: 'PH-009', name: 'BlueTank Engineering',       tradeLicenceNumber: 'CN-9011200', primaryRepresentativeName: 'Latifa Al Marri',    primaryEmail: 'pps@bluetank.ae',                     primaryPhone: '+971 50 333 8800' },
];

function pickLicensee(seed: number): ViolationLicensee {
  return LICENSEES[seed % LICENSEES.length];
}

function evidence(seed: number, count = 2): ViolationEvidence[] {
  const baseTypes: ViolationEvidence['fileType'][] = ['photo', 'pdf', 'sample_report', 'inspection_finding', 'witness_statement'];
  return Array.from({ length: count }, (_, i) => ({
    id: `EV-${seed}-${i + 1}`,
    fileName: `evidence-${seed}-${i + 1}.${i === 0 ? 'pdf' : 'jpg'}`,
    fileType: baseTypes[(seed + i) % baseTypes.length],
    uploadedAt: daysAgo(seed % 60 + 1),
    uploadedBy: 'Insp. M. Al Awadi',
    sizeKb: 384 + (seed * i * 17) % 4096,
    description: i === 0 ? 'Field inspection photo set' : 'Signed inspection report',
  }));
}

function auditChain(violationId: string, fromCreation: string, states: { state: ViolationState; daysFromCreation: number; actor: string; actorRole: Violation['auditTrail'][number]['actorRole']; reason?: string }[]): ViolationAuditEntry[] {
  const created: ViolationAuditEntry = {
    id: `${violationId}-AUD-1`,
    timestamp: fromCreation,
    actor: 'System (Source Channel Adapter)',
    actorRole: 'admin',
    action: 'Violation created from source channel',
    toState: 'identified',
  };
  const rest: ViolationAuditEntry[] = states.map((s, i) => ({
    id: `${violationId}-AUD-${i + 2}`,
    timestamp: new Date(new Date(fromCreation).getTime() + s.daysFromCreation * DAY_MS).toISOString(),
    actor: s.actor,
    actorRole: s.actorRole,
    action: `Transitioned to ${s.state}`,
    toState: s.state,
    reason: s.reason,
  }));
  return [created, ...rest];
}

// ---------------------------------------------------------------------------
// Per-state factory templates — each helper produces a Violation in a given
// final state so the seed list has at least one example of every state.
// ---------------------------------------------------------------------------

interface FactoryArgs {
  codeId: string;
  source: ViolationSource;
  sourceRef: string;
  licensee: ViolationLicensee;
  permitType: Violation['permitType'];
  linkedPermitId?: string;
  linkedBuildingId?: string;
  ageDays: number;
  state: ViolationState;
  offenceCount?: 1 | 2 | 3;
  severityOverride?: ViolationSeverity;
  decisionRoute?: ViolationDecisionRoute;
  decisionOutcome?: ViolationDecisionOutcome;
  paidDays?: number;
  appealStatus?: Violation['appealStatus'];
  blocked?: Array<CrossGovEvent['authority']>;
  vapMeetingId?: string;
}

function make(args: FactoryArgs): Violation {
  const code = getViolationCode(args.codeId)!;
  const id = nextId();
  const createdAt = daysAgo(args.ageDays);
  const offenceCount = args.offenceCount ?? 1;
  const severity = args.severityOverride ?? code.defaultSeverity;
  const penalty = computePenalty(code, offenceCount, severity);

  // Build a plausible audit history based on final state
  const historySteps: { state: ViolationState; daysFromCreation: number; actor: string; actorRole: Violation['auditTrail'][number]['actorRole']; reason?: string }[] = [];
  if (['under_review','pending_admin_decision','pending_committee_review','decision_recorded','penalty_outstanding','cross_gov_enforcement_triggered','appeal_submitted','appeal_decided','paid','closed_resolved','closed_no_action','closed_overturned'].includes(args.state)) {
    historySteps.push({ state: 'under_review', daysFromCreation: 1, actor: 'Eng. F. Al Awadi', actorRole: 'engineer' });
  }
  if (['pending_admin_decision','decision_recorded','penalty_outstanding','cross_gov_enforcement_triggered','appeal_submitted','appeal_decided','paid','closed_resolved','closed_no_action'].includes(args.state) && (args.decisionRoute ?? 'administrative') === 'administrative') {
    historySteps.push({ state: 'pending_admin_decision', daysFromCreation: 2, actor: 'Eng. F. Al Awadi', actorRole: 'engineer', reason: 'Routed to administrative decision per threshold' });
  }
  if (['pending_committee_review','decision_recorded','penalty_outstanding','cross_gov_enforcement_triggered','appeal_submitted','appeal_decided','paid','closed_resolved','closed_no_action'].includes(args.state) && (args.decisionRoute ?? 'administrative') === 'vap_committee') {
    historySteps.push({ state: 'pending_committee_review', daysFromCreation: 2, actor: 'Eng. F. Al Awadi', actorRole: 'engineer', reason: 'Severity / amount above admin threshold' });
  }
  if (['decision_recorded','penalty_outstanding','cross_gov_enforcement_triggered','appeal_submitted','appeal_decided','paid','closed_resolved','closed_no_action'].includes(args.state)) {
    historySteps.push({
      state: 'decision_recorded', daysFromCreation: 5,
      actor: (args.decisionRoute ?? 'administrative') === 'vap_committee' ? 'VAP Committee' : 'Sec. Head A. Al Mansoori',
      actorRole: 'section_head', reason: args.decisionOutcome ?? 'penalty_imposed',
    });
  }
  if (['penalty_outstanding','cross_gov_enforcement_triggered','appeal_submitted','appeal_decided','paid'].includes(args.state) && args.decisionOutcome === 'penalty_imposed') {
    historySteps.push({ state: 'penalty_outstanding', daysFromCreation: 6, actor: 'System', actorRole: 'admin', reason: 'Penalty Notice issued; 30-day SLA started' });
  }
  if (args.state === 'cross_gov_enforcement_triggered') {
    historySteps.push({ state: 'cross_gov_enforcement_triggered', daysFromCreation: 37, actor: 'System', actorRole: 'admin', reason: 'Payment SLA breached; Block calls dispatched' });
  }
  if (['appeal_submitted','appeal_decided'].includes(args.state)) {
    historySteps.push({ state: 'appeal_submitted', daysFromCreation: 8, actor: args.licensee.primaryRepresentativeName ?? args.licensee.name, actorRole: 'applicant', reason: 'Licensee appealed within 30-day window' });
  }
  if (args.state === 'appeal_decided') {
    historySteps.push({ state: 'appeal_decided', daysFromCreation: 25, actor: 'Director Panel', actorRole: 'director', reason: args.appealStatus ?? 'upheld' });
  }
  if (args.state === 'paid') {
    historySteps.push({ state: 'paid', daysFromCreation: args.paidDays ?? 15, actor: 'AD Pay', actorRole: 'admin', reason: 'Full settlement confirmed by AD Pay' });
  }
  if (args.state === 'closed_resolved') {
    historySteps.push({ state: 'paid', daysFromCreation: args.paidDays ?? 14, actor: 'AD Pay', actorRole: 'admin' });
    historySteps.push({ state: 'closed_resolved', daysFromCreation: (args.paidDays ?? 14) + 1, actor: 'System', actorRole: 'admin', reason: 'All knockouts released; corrective actions verified' });
  }
  if (args.state === 'closed_no_action') {
    historySteps.push({ state: 'closed_no_action', daysFromCreation: 4, actor: 'Sec. Head A. Al Mansoori', actorRole: 'section_head', reason: 'No regulatory action warranted' });
  }
  if (args.state === 'closed_overturned') {
    historySteps.push({ state: 'closed_overturned', daysFromCreation: 26, actor: 'Director Panel', actorRole: 'director', reason: 'Appeal overturned the violation' });
  }

  const auditTrail = auditChain(id, createdAt, historySteps);

  const crossGovEvents: CrossGovEvent[] = (args.blocked ?? []).map((auth, i) => ({
    id: `${id}-CG-${i + 1}`,
    authority: auth,
    operation: 'block',
    emittedAt: new Date(new Date(createdAt).getTime() + 37 * DAY_MS).toISOString(),
    reasonText: `Penalty Outstanding past 30-day SLA for violation ${id}`,
    responseCode: 200,
    responseAt: new Date(new Date(createdAt).getTime() + 37 * DAY_MS + 2_000).toISOString(),
  }));

  const decidedAt = ['decision_recorded','penalty_outstanding','cross_gov_enforcement_triggered','appeal_submitted','appeal_decided','paid','closed_resolved','closed_no_action'].includes(args.state)
    ? new Date(new Date(createdAt).getTime() + 5 * DAY_MS).toISOString() : undefined;

  const paymentDeadline = decidedAt
    ? new Date(new Date(decidedAt).getTime() + 30 * DAY_MS).toISOString()
    : undefined;

  return {
    id,
    source: args.source,
    sourceReference: args.sourceRef,
    violationCodeId: code.id,
    violationCode: code.code,
    title: code.title,
    titleAr: code.titleAr,
    description: code.description,
    licensee: args.licensee,
    permitType: args.permitType,
    linkedPermitId: args.linkedPermitId,
    linkedBuildingId: args.linkedBuildingId,
    severity,
    autoDerivedSeverity: code.defaultSeverity,
    severityOverrideReason: args.severityOverride && args.severityOverride !== code.defaultSeverity ? 'Section Head escalated per repeated occurrence' : undefined,
    offenceCount,
    penaltyAed: penalty.computedPenaltyAed,
    evidence: evidence(_counter),
    state: args.state,
    decisionRoute: args.decisionRoute ?? (penalty.computedPenaltyAed > 5_000 || severity === 'critical' || code.vapThresholdOverride ? 'vap_committee' : 'administrative'),
    decisionOutcome: args.decisionOutcome,
    decisionAt: decidedAt,
    decisionBy: decidedAt ? (args.decisionRoute === 'vap_committee' ? 'VAP Committee' : 'Sec. Head A. Al Mansoori') : undefined,
    appealStatus: args.appealStatus ?? (args.state === 'appeal_submitted' || args.state === 'appeal_decided' ? (args.appealStatus ?? 'submitted') : 'no_appeal'),
    appealSubmittedAt: ['appeal_submitted','appeal_decided'].includes(args.state) ? new Date(new Date(createdAt).getTime() + 8 * DAY_MS).toISOString() : undefined,
    appealReason: ['appeal_submitted','appeal_decided'].includes(args.state) ? 'We dispute the finding — the records show the maintenance visit was completed two days earlier than the inspector noted; supporting log attached.' : undefined,
    appealDecidedAt: args.state === 'appeal_decided' ? new Date(new Date(createdAt).getTime() + 25 * DAY_MS).toISOString() : undefined,
    paymentReceiptNumber: args.state === 'paid' || args.state === 'closed_resolved' ? `ADPAY-2026-${10000 + _counter % 99000}` : undefined,
    paymentSettledAt: args.state === 'paid' || args.state === 'closed_resolved' ? new Date(new Date(createdAt).getTime() + (args.paidDays ?? 14) * DAY_MS).toISOString() : undefined,
    paymentDeadline,
    closureDate: ['closed_resolved','closed_no_action','closed_overturned'].includes(args.state) ? new Date(new Date(createdAt).getTime() + 28 * DAY_MS).toISOString() : undefined,
    configVersionBound: CATALOGUE_VERSION,
    auditTrail,
    crossGovEvents,
    vapMeetingId: args.vapMeetingId,
    createdAt,
    updatedAt: auditTrail[auditTrail.length - 1].timestamp,
  };
}

// ---------------------------------------------------------------------------
// Build the seed dataset
// ---------------------------------------------------------------------------
export const SEED_VIOLATIONS: Violation[] = [
  // Identified (fresh from source channel — Engineer hasn't triaged yet)
  make({ codeId: 'VC-INSP-001', source: 'mobile_inspection', sourceRef: 'INSP-2026-04412',  licensee: pickLicensee(2), permitType: 'amc',  linkedPermitId: 'AMC-2026-002201', ageDays: 1, state: 'identified' }),
  make({ codeId: 'VC-LAB-001',  source: 'sampling_fail',     sourceRef: 'SMP-2026-08812',  licensee: pickLicensee(4), permitType: 'gas_company_registration', linkedPermitId: 'GAS-2025-118', ageDays: 0, state: 'identified' }),
  make({ codeId: 'VC-HOE-001',  source: 'tpi_conformity',    sourceRef: 'TPI-2026-1140',   licensee: pickLicensee(7), permitType: 'hoe_tpi_registration', linkedPermitId: 'HOE-2024-0028', ageDays: 2, state: 'identified' }),
  make({ codeId: 'VC-INC-001',  source: 'incident_report',   sourceRef: 'IRS-2026-0044',   licensee: pickLicensee(1), permitType: 'noc', linkedBuildingId: 'BLD-2024-7711', ageDays: 0, state: 'identified', severityOverride: 'critical' }),

  // Under Review
  make({ codeId: 'VC-AMC-001',  source: 'mobile_inspection', sourceRef: 'INSP-2026-04388',  licensee: pickLicensee(8), permitType: 'amc', linkedPermitId: 'AMC-2024-001488', ageDays: 3, state: 'under_review' }),
  make({ codeId: 'VC-INSP-003', source: 'mobile_inspection', sourceRef: 'INSP-2026-04405',  licensee: pickLicensee(0), permitType: 'gas_company_registration', linkedPermitId: 'GAS-2024-002', ageDays: 4, state: 'under_review' }),
  make({ codeId: 'VC-LAB-003',  source: 'sampling_fail',     sourceRef: 'SMP-2026-08801',  licensee: pickLicensee(5), permitType: 'gas_company_registration', linkedPermitId: 'GAS-2025-121', ageDays: 2, state: 'under_review' }),

  // Pending Administrative Decision
  make({ codeId: 'VC-INSP-003', source: 'mobile_inspection', sourceRef: 'INSP-2026-04382',  licensee: pickLicensee(6), permitType: 'amc',  linkedPermitId: 'AMC-2024-002744', ageDays: 6, state: 'pending_admin_decision' }),
  make({ codeId: 'VC-INSP-004', source: 'mobile_inspection', sourceRef: 'INSP-2026-04379',  licensee: pickLicensee(2), permitType: 'amc',  linkedPermitId: 'AMC-2025-001102', ageDays: 7, state: 'pending_admin_decision' }),
  make({ codeId: 'VC-AMC-002',  source: 'mobile_inspection', sourceRef: 'INSP-2026-04369',  licensee: pickLicensee(8), permitType: 'amc',  linkedPermitId: 'AMC-2024-001488', ageDays: 9, state: 'pending_admin_decision', offenceCount: 2 }),

  // Pending Committee Review (VAP queue)
  make({ codeId: 'VC-GAS-001',  source: 'mobile_inspection', sourceRef: 'INSP-2026-04321',  licensee: pickLicensee(8), permitType: 'gas_company_registration', linkedPermitId: 'GAS-EXP-001', ageDays: 12, state: 'pending_committee_review', decisionRoute: 'vap_committee' }),
  make({ codeId: 'VC-GAS-005',  source: 'compliance_assessment', sourceRef: 'CA-2026-0014', licensee: pickLicensee(7), permitType: 'gas_company_registration', linkedPermitId: 'GAS-2023-099', ageDays: 14, state: 'pending_committee_review', decisionRoute: 'vap_committee', severityOverride: 'critical' }),
  make({ codeId: 'VC-NOC-003',  source: 'mobile_inspection', sourceRef: 'INSP-2026-04305',  licensee: pickLicensee(4), permitType: 'noc',  linkedBuildingId: 'BLD-2022-0119', ageDays: 15, state: 'pending_committee_review', decisionRoute: 'vap_committee', severityOverride: 'critical' }),
  make({ codeId: 'VC-COC-001',  source: 'tpi_conformity',    sourceRef: 'TPI-2026-0998',   licensee: pickLicensee(0), permitType: 'coc',  linkedPermitId: 'COC-2025-00188', ageDays: 11, state: 'pending_committee_review', decisionRoute: 'vap_committee', severityOverride: 'critical' }),
  make({ codeId: 'VC-LAB-001',  source: 'sampling_fail',     sourceRef: 'SMP-2026-08725',  licensee: pickLicensee(5), permitType: 'gas_company_registration', linkedPermitId: 'GAS-2025-121', ageDays: 18, state: 'pending_committee_review', decisionRoute: 'vap_committee', offenceCount: 2 }),

  // Decision Recorded → Penalty Notice in flight
  make({ codeId: 'VC-INSP-001', source: 'mobile_inspection', sourceRef: 'INSP-2026-04281',  licensee: pickLicensee(3), permitType: 'amc',  linkedPermitId: 'AMC-2024-001995', ageDays: 20, state: 'decision_recorded', decisionOutcome: 'penalty_imposed' }),

  // Penalty Outstanding (in-flight payment)
  make({ codeId: 'VC-NOC-002',  source: 'mobile_inspection', sourceRef: 'INSP-2026-04221',  licensee: pickLicensee(1), permitType: 'noc',  linkedBuildingId: 'BLD-2024-2208', ageDays: 22, state: 'penalty_outstanding', decisionOutcome: 'penalty_imposed' }),
  make({ codeId: 'VC-AMC-001',  source: 'mobile_inspection', sourceRef: 'INSP-2026-04204',  licensee: pickLicensee(8), permitType: 'amc',  linkedPermitId: 'AMC-2024-001488', ageDays: 24, state: 'penalty_outstanding', decisionOutcome: 'penalty_imposed', offenceCount: 2 }),
  make({ codeId: 'VC-HOE-002',  source: 'tpi_conformity',    sourceRef: 'TPI-2026-0921',   licensee: pickLicensee(7), permitType: 'hoe_tpi_registration', linkedPermitId: 'HOE-2024-0028', ageDays: 25, state: 'penalty_outstanding', decisionOutcome: 'penalty_imposed' }),

  // Cross-Government Enforcement Triggered (SLA missed)
  make({ codeId: 'VC-GAS-002',  source: 'compliance_assessment', sourceRef: 'CA-2026-0009', licensee: pickLicensee(8), permitType: 'gas_company_registration', linkedPermitId: 'GAS-EXP-001', ageDays: 65, state: 'cross_gov_enforcement_triggered', decisionOutcome: 'penalty_imposed', blocked: ['adpolice', 'ded', 'tamm'] }),
  make({ codeId: 'VC-NOC-003',  source: 'mobile_inspection', sourceRef: 'INSP-2026-04114',  licensee: pickLicensee(4), permitType: 'noc',  linkedBuildingId: 'BLD-2022-0119', ageDays: 72, state: 'cross_gov_enforcement_triggered', decisionRoute: 'vap_committee', decisionOutcome: 'penalty_imposed', blocked: ['adcda', 'tamm'] }),

  // Appeal in flight
  make({ codeId: 'VC-INSP-002', source: 'mobile_inspection', sourceRef: 'INSP-2026-04162',  licensee: pickLicensee(6), permitType: 'gas_company_registration', linkedPermitId: 'GAS-2024-005', ageDays: 30, state: 'appeal_submitted', decisionOutcome: 'penalty_imposed' }),
  make({ codeId: 'VC-AMC-002',  source: 'mobile_inspection', sourceRef: 'INSP-2026-04149',  licensee: pickLicensee(2), permitType: 'amc',  linkedPermitId: 'AMC-2025-001102', ageDays: 35, state: 'appeal_submitted', decisionOutcome: 'penalty_imposed' }),

  // Appeal Decided (multiple outcomes)
  make({ codeId: 'VC-LAB-002',  source: 'sampling_fail',     sourceRef: 'SMP-2026-08628',  licensee: pickLicensee(5), permitType: 'gas_company_registration', linkedPermitId: 'GAS-2025-121', ageDays: 45, state: 'appeal_decided', decisionOutcome: 'penalty_imposed', appealStatus: 'upheld' }),
  make({ codeId: 'VC-INSP-001', source: 'mobile_inspection', sourceRef: 'INSP-2026-04088',  licensee: pickLicensee(3), permitType: 'amc',  linkedPermitId: 'AMC-2024-001995', ageDays: 48, state: 'appeal_decided', decisionOutcome: 'penalty_imposed', appealStatus: 'reduced' }),

  // Paid (in transition to closed)
  make({ codeId: 'VC-AMC-001',  source: 'mobile_inspection', sourceRef: 'INSP-2026-04022',  licensee: pickLicensee(0), permitType: 'amc',  linkedPermitId: 'AMC-2024-000412', ageDays: 38, state: 'paid', decisionOutcome: 'penalty_imposed', paidDays: 14 }),
  make({ codeId: 'VC-INSP-003', source: 'mobile_inspection', sourceRef: 'INSP-2026-04011',  licensee: pickLicensee(2), permitType: 'gas_company_registration', linkedPermitId: 'GAS-2024-008', ageDays: 40, state: 'paid', decisionOutcome: 'penalty_imposed', paidDays: 18 }),

  // Closed — Resolved
  make({ codeId: 'VC-INSP-001', source: 'mobile_inspection', sourceRef: 'INSP-2026-03922',  licensee: pickLicensee(1), permitType: 'amc',  linkedPermitId: 'AMC-2024-000812', ageDays: 60, state: 'closed_resolved', decisionOutcome: 'penalty_imposed', paidDays: 12 }),
  make({ codeId: 'VC-AMC-001',  source: 'mobile_inspection', sourceRef: 'INSP-2026-03891',  licensee: pickLicensee(0), permitType: 'amc',  linkedPermitId: 'AMC-2024-000412', ageDays: 75, state: 'closed_resolved', decisionOutcome: 'penalty_imposed', paidDays: 15 }),
  make({ codeId: 'VC-HOE-002',  source: 'tpi_conformity',    sourceRef: 'TPI-2026-0817',   licensee: pickLicensee(7), permitType: 'hoe_tpi_registration', linkedPermitId: 'HOE-2024-0028', ageDays: 90, state: 'closed_resolved', decisionOutcome: 'penalty_imposed', paidDays: 18 }),

  // Closed — No Action
  make({ codeId: 'VC-INSP-003', source: 'mobile_inspection', sourceRef: 'INSP-2026-04201',  licensee: pickLicensee(3), permitType: 'amc',  linkedPermitId: 'AMC-2024-001995', ageDays: 28, state: 'closed_no_action', decisionOutcome: 'no_action' }),
  make({ codeId: 'VC-INSP-004', source: 'mobile_inspection', sourceRef: 'INSP-2026-04199',  licensee: pickLicensee(5), permitType: 'amc',  linkedPermitId: 'AMC-2024-002201', ageDays: 32, state: 'closed_no_action', decisionOutcome: 'no_action' }),

  // Closed — Overturned (appeal succeeded)
  make({ codeId: 'VC-INSP-002', source: 'mobile_inspection', sourceRef: 'INSP-2026-04055',  licensee: pickLicensee(4), permitType: 'gas_company_registration', linkedPermitId: 'GAS-2024-013', ageDays: 80, state: 'closed_overturned', decisionOutcome: 'penalty_imposed', appealStatus: 'overturned' }),

  // Critical Warning Letter only (no penalty)
  make({ codeId: 'VC-INSP-004', source: 'mobile_inspection', sourceRef: 'INSP-2026-04240',  licensee: pickLicensee(0), permitType: 'amc',  linkedPermitId: 'AMC-2024-000412', ageDays: 18, state: 'decision_recorded', decisionOutcome: 'warning_letter' }),

  // Long-standing critical violations under VAP review (creates SLA pressure)
  make({ codeId: 'VC-GAS-005',  source: 'compliance_assessment', sourceRef: 'CA-2026-0007', licensee: pickLicensee(8), permitType: 'gas_company_registration', linkedPermitId: 'GAS-EXP-001', ageDays: 21, state: 'pending_committee_review', decisionRoute: 'vap_committee', severityOverride: 'critical' }),
  make({ codeId: 'VC-INC-001',  source: 'incident_report',   sourceRef: 'IRS-2026-0027',   licensee: pickLicensee(1), permitType: 'noc',  linkedBuildingId: 'BLD-2024-0118', ageDays: 19, state: 'pending_committee_review', decisionRoute: 'vap_committee', severityOverride: 'critical' }),

  // Extra historical noise for ageing reports
  make({ codeId: 'VC-INSP-006', source: 'mobile_inspection', sourceRef: 'INSP-2026-03811',  licensee: pickLicensee(6), permitType: 'amc',  linkedPermitId: 'AMC-2024-002744', ageDays: 120, state: 'closed_resolved', decisionOutcome: 'warning_letter' }),
  make({ codeId: 'VC-MAES-002', source: 'compliance_assessment', sourceRef: 'CA-2026-0001', licensee: pickLicensee(5), permitType: 'maes', linkedPermitId: 'MAES-2024-1102', ageDays: 110, state: 'closed_resolved', decisionOutcome: 'penalty_imposed', paidDays: 20 }),
  make({ codeId: 'VC-MAES-001', source: 'mobile_inspection', sourceRef: 'INSP-2026-03722',  licensee: pickLicensee(4), permitType: 'maes', linkedPermitId: 'MAES-2024-1099', ageDays: 145, state: 'closed_resolved', decisionOutcome: 'penalty_imposed', paidDays: 23 }),
];
