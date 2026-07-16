// ============================================================================
// Domain types — kept module-agnostic so Gas, HOE and future modules share them.
// ============================================================================

export type Module = 'gas' | 'hoe' | 'noc' | 'pps' | 'amc' | 'coc' | 'maes';
export type ServiceAction = 'issue' | 'renew' | 'modify' | 'cancel' | 'revoke';
export type ServiceId = `${Module}.${ServiceAction}`;

// ---- Users ----------------------------------------------------------------

export type Role =
  | 'applicant'
  | 'engineer'
  | 'section_head'
  | 'director'
  | 'admin'
  | 'pps_entity'      // entity user submitting petroleum-products data (e.g. ADNOC Distribution)
  | 'pps_reviewer'    // DoE PPS reviewer (returns or approves submission)
  | 'pps_approver'    // DoE Director (final approval / amendment sign-off)
  | 'vap_member'      // Violations and Penalties Committee Member (per Compliance SDD §2)
  | 'vap_secretary'   // VAP Committee Secretary — owns meeting cadence, agenda, minutes
  | 'inspector'        // DoE PPS Field Inspector (mobile inspection app — Doc 2 §2)
  | 'senior_inspector' // DoE PPS Senior Inspector (co-sign Critical, team queue)
  | 'regulation_team'; // DoE PPS Regulation Team (web review of escalated inspections)

export interface User {
  id: string;                  // login userid
  name: string;
  email: string;
  phone?: string;
  role: Role;
  modules: Module[];           // which modules this user can act on
  userType: 'internal' | 'external';
  company?: Company;           // for external (applicant) users
  initials?: string;           // optional avatar initials override (else derived from name)
}

export interface Company {
  name: string;
  ownerName: string;
  nationality: string;
  authorizedRepresentative: string;
  businessActivity: string;
  legalStatus: string;
  establishmentDate: string;
  tradePermitNumber: string;
  tradePermitIssueDate: string;
  tradePermitExpiryDate: string;
  address: string;
  poBox: string;
  phone: string;
  email: string;
  website?: string;
}

// ---- Workflow engine ------------------------------------------------------

export type StateId = string;        // service-specific state ids
export type ActionId = string;       // service-specific action ids (button labels)

export interface StateDef {
  id: StateId;
  label: string;
  category: 'draft' | 'pending' | 'returned' | 'approved' | 'rejected' | 'cancelled' | 'payment' | 'issued';
  ownerRole?: Role;                  // role that has the application in their queue
  description?: string;
}

export interface TransitionDef {
  id: ActionId;
  label: string;
  from: StateId | StateId[];
  to: StateId;
  allowedRoles: Role[];
  variant?: 'primary' | 'success' | 'danger' | 'warning' | 'secondary' | 'ghost';
  requiresComment?: boolean;
  commentLabel?: string;
  notifications?: NotificationTemplateId[];
  confirmText?: string;
}

export type NotificationTemplateId = string;

export interface NotificationTemplate {
  id: NotificationTemplateId;
  channel: 'email' | 'sms';
  to: 'applicant' | 'engineer' | 'section_head' | 'director';
  subject: string;
  body: string;                      // supports %placeholders%
}

export interface FormFieldOption { value: string; label: string; }

export interface FormField {
  id: string;
  label: string;
  type:
    | 'text' | 'textarea' | 'number' | 'date'
    | 'select' | 'multiselect' | 'radio'
    | 'file' | 'readonly' | 'emirates-id';
  required?: boolean;
  options?: FormFieldOption[];
  remark?: string;
  prepopulate?: 'company-license' | 'company-name' | 'company-owner' | 'representative' | 'static';
  staticValue?: string;
  showIf?: { field: string; equals: string };
}

export interface AttachmentDef {
  id: string;
  label: string;
  required: boolean | { whenCategory: string[] };  // some attachments only required for some categories
}

export interface FormSection {
  id: string;
  title: string;
  description?: string;
  fields: FormField[];
  attachments?: AttachmentDef[];
  repeatable?: {                       // for technical staff / reference projects
    itemLabel: string;
    minCount?: number | { fromCategory: Record<string, { engineers?: number; technicians?: number }> };
    perItemAttachments?: AttachmentDef[];
  };
}

export interface ServiceDefinition {
  id: ServiceId;
  module: Module;
  action: ServiceAction;
  title: string;
  shortTitle: string;
  description: string;
  initialState: StateId;
  states: StateDef[];
  transitions: TransitionDef[];
  form: FormSection[];
  notifications: NotificationTemplate[];
  sla: { stage: string; role: Role | 'applicant'; days: number }[];
  feeAmount?: number;
  certificateValidityYears?: number;
}

// ---- Application instance -------------------------------------------------

export interface AttachmentRef {
  id: string;
  defId: string;                       // matches AttachmentDef.id
  filename: string;
  size: number;
  uploadedAt: string;
  uploadedBy: string;
}

export interface TechnicalStaff {
  id: string;
  emiratesId: string;
  name: string;
  email: string;
  phone: string;
  nationality: string;
  passportNumber: string;
  staffType: 'Engineer' | 'Technician';
  technicianType?: string;
  position: string;
  education: string;
  attachments: AttachmentRef[];
}

export interface ReferenceProject {
  id: string;
  projectName: string;
  clientName: string;
  location: string;
  scope: string[];
  agreementValue: number;
  startDate: string;
  endDate: string;
  attachments: AttachmentRef[];
}

// ---- MAES material rows ----------------------------------------------------
// Per the "MAES Enhancements SDD" v1.0 §3.3.3.3 + §1.3.5.2 — every material on
// a MAES Registration carries its own field set and its own Expiry Date. The
// certificate-level Expiry Date is derived as MAX(materials[].expiryDate).
export interface MaesMaterial {
  id: string;
  commercialName: string;          // e.g. "Pressure Regulator PR-2000 Series"
  modelNo: string;                 // e.g. "PR2000-AX"
  materialType: string;            // e.g. "Pressure Regulator", "Flame Arrestor"
  testingLabs: string;             // e.g. "TÜV NORD Middle East"
  certificationBody: string;       // e.g. "Bureau Veritas"
  intlSafetyCertNo: string;        // C.O.C / Type-Examination / CE marking ref.
  manufacturerCountry: string;     // ISO country name
  labInspectionType: string;       // e.g. "Type Examination · ATEX"
  expiryDate: string;              // ISO date (YYYY-MM-DD)
  status?: 'active' | 'expired' | 'cancelled' | 'revoked' | 'pending-renewal';
}

export interface TimelineEntry {
  id: string;
  at: string;
  byUserId: string;
  byUserName: string;
  byUserRole: Role;
  action: string;
  fromState?: StateId;
  toState: StateId;
  comment?: string;
}

export interface NotificationLogEntry {
  id: string;
  at: string;
  templateId: NotificationTemplateId;
  channel: 'email' | 'sms';
  toEmail?: string;
  toPhone?: string;
  toUserId: string;
  subject: string;
  body: string;
  applicationId: string;
}

export interface Application {
  id: string;
  applicationNumber: string;           // e.g., GSO-2025-00021
  fileNumber?: string;                 // assigned post-approval
  serviceId: ServiceId;
  module: Module;
  state: StateId;
  category?: 'A' | 'B' | 'C' | 'D';

  applicantUserId: string;
  company: Company;

  branchAddress?: string;
  workshopAddress: string;
  areaOfOperations: string;

  attachments: AttachmentRef[];
  technicalStaff: TechnicalStaff[];
  referenceProjects: ReferenceProject[];

  submittedOn?: string;
  slaDueDate?: string;

  approvedOn?: string;
  expiryDate?: string;

  feePaid?: boolean;
  feeReceipt?: { receiptNumber: string; paidAt: string; amount: number };
  certificate?: { number: string; issuedAt: string; expiresAt: string };

  // Generic per-field values keyed by FormField.id. NOC apps populate this
  // with premises/gas-system data; Gas/HOE leave it empty and the detail
  // page falls back to canonical `company.*` fields via the resolver.
  fieldValues?: Record<string, string>;

  // MAES-only — every material on the certificate with its individual fields
  // and per-material Expiry Date. Certificate-level expiry is derived as
  // MAX(materials.expiryDate). See SDD §1.3.4 / §3.3.3.3.
  materials?: MaesMaterial[];

  timeline: TimelineEntry[];

  createdAt: string;
  updatedAt: string;
}

export interface AuthState {
  user: User | null;
  loginAs: (userId: string, password: string, tab: 'internal' | 'external') => { ok: boolean; error?: string };
  logout: () => void;
}

// ============================================================================
// Integrated Compliance, Violations, Enforcement and Escalation Module
// Per the SDD §4–§5 — every violation across the platform shares one canonical
// shape; states, severities, source channels and decision routes are enums so
// they can be filtered and rolled-up consistently.
// ============================================================================

/** Source channel the violation originated from — SDD §4.1 + §1.3. */
export type ViolationSource =
  | 'mobile_inspection'        // DoE PPS Mobile Inspection and Enforcement App (§4.16)
  | 'tpi_conformity'           // HOE / TPI Portal conformity outcomes (§4.12)
  | 'sampling_fail'            // Sampling & Testing Approved-Fail event (§4.15)
  | 'incident_report'          // Incident Reporting System feed
  | 'compliance_assessment';   // Routine compliance assessment

/** Permit type the violation is bound to (one of). */
export type ViolationPermitType =
  | 'gas_company_registration'
  | 'hoe_tpi_registration'
  | 'amc'
  | 'noc'
  | 'coc'
  | 'maes'
  | 'tadawel';

/** Severity grading — SDD §4.3 (auto-derived; Section Head can override). */
export type ViolationSeverity = 'critical' | 'major' | 'minor' | 'informational';

/** State machine for a violation record — SDD §4.2 (12 states). */
export type ViolationState =
  | 'identified'
  | 'under_review'
  | 'pending_admin_decision'
  | 'pending_committee_review'
  | 'decision_recorded'
  | 'penalty_outstanding'
  | 'cross_gov_enforcement_triggered'
  | 'appeal_submitted'
  | 'appeal_decided'
  | 'paid'
  | 'closed_resolved'
  | 'closed_no_action'
  | 'closed_overturned';

/** Decision route — admin (Section Head) vs VAP Committee — SDD §4.1 / §5.4. */
export type ViolationDecisionRoute = 'administrative' | 'vap_committee';

/** Decision outcome (set at Decision Recorded state) — SDD §4.1. */
export type ViolationDecisionOutcome =
  | 'penalty_imposed'
  | 'warning_letter'
  | 'no_action'
  | 'referred_investigation';

/** Appeal lifecycle — SDD §4.5. */
export type ViolationAppealStatus =
  | 'no_appeal'
  | 'submitted'
  | 'upheld'
  | 'reduced'
  | 'overturned';

/** One entry in the catalogue of permitted violation codes. */
export interface ViolationCode {
  id: string;                              // e.g. VC-GAS-OP-NO-PERMIT
  code: string;                            // human-readable short code
  applicablePermitTypes: ViolationPermitType[];
  title: string;                           // EN
  titleAr: string;                         // AR
  description: string;                     // EN
  defaultSeverity: ViolationSeverity;
  basePenaltyAed: number;                  // configurable per SDD §4.4
  maxPenaltyAed?: number;                  // optional cap
  vapThresholdOverride?: boolean;          // if true, always route to VAP regardless of admin threshold
}

/** Evidence attached to a violation (photos, sample reports, witness statements). */
export interface ViolationEvidence {
  id: string;
  fileName: string;
  fileType: 'photo' | 'pdf' | 'sample_report' | 'inspection_finding' | 'witness_statement' | 'other';
  uploadedAt: string;
  uploadedBy: string;
  sizeKb: number;
  description?: string;
}

/** Single audit-trail entry — SDD §8 cross-cutting requirement. */
export interface ViolationAuditEntry {
  id: string;
  timestamp: string;
  actor: string;                           // user name + role for display
  actorRole: Role;
  action: string;                          // free-text human-readable action
  fromState?: ViolationState;
  toState?: ViolationState;
  reason?: string;
  attachmentId?: string;                   // pointer to evidence/escalation form
}

/** A single Block / Release call to a cross-government authority — SDD §6.1. */
export interface CrossGovEvent {
  id: string;
  authority: 'adpolice' | 'ded' | 'adcda' | 'moei' | 'tamm';
  operation: 'block' | 'release';
  emittedAt: string;
  reasonText: string;                      // bilingual block-reason text
  responseCode?: number;
  responseAt?: string;
  conditionalApproval?: boolean;
}

/** The licensee identity — usually the company; sometimes the building owner. */
export interface ViolationLicensee {
  id: string;                              // permit-holder id or company id
  name: string;
  tradeLicenceNumber?: string;
  primaryRepresentativeName?: string;
  primaryEmail?: string;
  primaryPhone?: string;
}

/** The full Violation record per SDD §4.1 — 19 fields plus derived metadata. */
export interface Violation {
  id: string;                              // VIO-YYYY-xxxxxx
  source: ViolationSource;
  sourceReference: string;                 // hyperlinks back to inspection / sample / etc.

  violationCodeId: string;                 // FK to ViolationCode
  violationCode: string;                   // denormalised for table display
  title: string;                           // EN
  titleAr: string;                         // AR
  description: string;
  descriptionEditedBy?: string;            // if Engineer edited, with reason

  licensee: ViolationLicensee;
  permitType: ViolationPermitType;
  linkedPermitId?: string;
  linkedBuildingId?: string;
  linkedMaterialId?: string;

  severity: ViolationSeverity;
  autoDerivedSeverity: ViolationSeverity;
  severityOverrideReason?: string;
  offenceCount: 1 | 2 | 3 | 4 | 5;          // 1st / 2nd / 3rd+ within repeat window
  penaltyAed: number;
  penaltyOverrideReason?: string;

  evidence: ViolationEvidence[];

  state: ViolationState;
  decisionRoute: ViolationDecisionRoute;
  decisionOutcome?: ViolationDecisionOutcome;
  decisionAt?: string;
  decisionBy?: string;
  decisionNotes?: string;

  appealStatus: ViolationAppealStatus;
  appealSubmittedAt?: string;
  appealReason?: string;
  appealDecidedAt?: string;
  appealDecisionBy?: string;
  appealDecisionReason?: string;
  appealPenaltyReducedTo?: number;

  paymentReceiptNumber?: string;
  paymentSettledAt?: string;
  paymentDeadline?: string;                // SLA — default 30 days from Penalty Notice

  closureDate?: string;
  closureLetterFileName?: string;

  configVersionBound: string;              // catalogue version pinned at creation

  auditTrail: ViolationAuditEntry[];
  crossGovEvents: CrossGovEvent[];

  // Routing
  assignedTo?: string;                     // current owner user id (engineer / section head / etc.)
  vapMeetingId?: string;                   // if routed to a VAP meeting

  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// VAP Committee (Violations and Penalties) — SDD §5.3
// ============================================================================

/** A single member of the VAP Committee roster. */
export interface VapMember {
  id: string;
  name: string;
  role: 'chair' | 'co_chair' | 'member' | 'alternate';
  organisation: string;                    // e.g. DoE / ADEO / ADPolice
  email: string;
  isPresent?: boolean;                     // populated per-meeting at attendance time
}

/** One vote cast by a member on an agenda item. */
export interface VapVote {
  memberId: string;
  memberName: string;
  vote: 'penalty_imposed' | 'warning_letter' | 'no_action' | 'referred_investigation' | 'deferred';
  memberComments?: string;
}

/** One agenda item — bound to exactly one violation. */
export interface VapAgendaItem {
  id: string;
  violationId: string;                     // FK to Violation
  presentationOrder: number;
  discussionSummary?: string;
  votes: VapVote[];
  finalDecision?: 'penalty_imposed' | 'warning_letter' | 'no_action' | 'referred_investigation' | 'deferred';
  decidedAt?: string;
  deferReason?: string;
}

/** Lifecycle of a VAP meeting. */
export type VapMeetingState = 'scheduled' | 'agenda_ready' | 'in_progress' | 'concluded' | 'minutes_circulated';

/** One VAP Committee meeting record. */
export interface VapMeeting {
  id: string;                              // VAP-YYYY-xxxxxx
  meetingNumber: string;                   // e.g. "VAP-2026-W21" for weekly
  scheduledAt: string;                     // ISO datetime
  venue: string;                           // physical room or "Microsoft Teams"
  cadence: 'weekly' | 'ad_hoc';
  state: VapMeetingState;
  roster: VapMember[];
  quorumMin: number;                       // default = ceil(roster/2)+1
  decisionRule: 'majority' | 'consensus' | 'weighted';
  agenda: VapAgendaItem[];
  secretaryId: string;
  secretaryName: string;
  chairId?: string;
  chairName?: string;
  attendedMemberIds: string[];
  minutesGeneratedAt?: string;
  minutesFileName?: string;
  createdAt: string;
  updatedAt: string;
}
