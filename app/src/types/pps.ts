// ============================================================================
// PPS (Petroleum Products Sector) data model — independent of the
// Gas/HOE/NOC registration engine in `types/index.ts`.
// ============================================================================

export type ProductModel = 'distributor' | 'supplier';

export interface PpsProduct {
  id: string;
  label: string;
  model: ProductModel;
  annualVolumeMt: number;     // most-recent-year total (for the product picker dropdown stats)
  unit: 'kt' | 'Mt';
  greyMarketSharePct?: number;
}

export type Region = 'Abu Dhabi City' | 'Al Ain' | 'Al Dhafra';
export const REGIONS: Region[] = ['Abu Dhabi City', 'Al Ain', 'Al Dhafra'];

export interface AnnualSlice {
  year: number;
  production: number;   // kt
  imports: number;      // kt
  salesByRegion: Record<Region, number>;
  salesBySector: { commercial: number; construction: number };
  monthlyProductionKt: number[]; // 12 months
  monthlyImportsKt: number[];    // 12 months
}

export interface Operator {
  id: string;
  name: string;
  licenseNumber: string;
  shareKt: number;
  isOfficial: boolean;   // false = grey market
}

export interface PpsDataset {
  product: PpsProduct;
  series: AnnualSlice[];         // history including forecast years (2019–2030)
  operators: Operator[];         // per most-recent-year
  seasonalityKt: number[];       // 12 months of avg sales
}

// ---------- Submissions (entity-side) ----------

export type SubmissionStatus =
  | 'draft'
  | 'submitted'
  | 'in_review'
  | 'returned'
  | 'resubmitted'
  | 'approved'
  | 'amendment_requested'
  | 'rejected';

export type PpsActorRole = 'pps_entity' | 'pps_reviewer' | 'pps_approver';

export type PpsTransitionId =
  | 'submit'
  | 'start_review'
  | 'return_for_clarification'
  | 'resubmit'
  | 'approve'
  | 'reject'
  | 'request_amendment'
  | 'approve_amendment';

export interface PpsTransitionDef {
  id: PpsTransitionId;
  label: string;
  from: SubmissionStatus[];
  to: SubmissionStatus;
  allowedRoles: PpsActorRole[];
  variant: 'primary' | 'danger' | 'secondary';
  requiresComment?: boolean;
  commentLabel?: string;
  commentRequired?: boolean;
}

export interface PpsNotification {
  id: string;
  at: string;
  toRole: PpsActorRole | 'pps_entity' | 'pps_reviewer' | 'pps_approver';
  submissionId: string;
  subject: string;
  body: string;
  read?: boolean;
}

export interface SubmissionWorkflowEvent {
  at: string;
  stage: 'submitted' | 'doe_review' | 'returned' | 'resubmitted' | 'approved' | 'rejected';
  by: string;
  byRole?: string;
  comment?: string;
}

// Audit trail of reminder notifications sent by the DoE PPS Approver (Omar) to
// the submitting entity. Surfaced in the Submission Workflow activity on the
// Review screen (DoE roles only — never the entity submitter).
export interface ReminderLog {
  at: string;          // ISO timestamp
  by: string;          // 'Omar Al Suwaidi'
  byRole?: string;     // 'DoE Approver'
  toName: string;      // entity recipient, e.g. 'Ahmed Al Mazrouei'
  channel: string;     // 'Email' | 'In-app' | 'Email + In-app'
  note?: string;       // optional message included with the reminder
}

export interface SubmissionRow {
  field: string;
  values: (number | null)[];     // one per year column, matches series years
  isFormula?: boolean;
}

export interface SubmissionSection {
  id: string;
  number: string;                // e.g., '1.1', '2.3'
  title: string;
  description?: string;
  reconciled?: boolean;
  rows: SubmissionRow[];
}

export interface PpsComment {
  id: string;
  at: string;                  // ISO timestamp
  byUserId: string;
  byUserName: string;
  byUserRole: string;          // PPS role string (display label)
  entityTag?: string;          // optional small tag, e.g. "ADNOC DIST."
  internal: boolean;           // true → only DoE reviewers/approvers can see
  body: string;
  replyToId?: string;
}

export interface ReviewRemark {
  at: string;
  by: string;
  byRole?: string;
  kind: 'returned' | 'resubmitted' | 'approved';
  title: string;
  body: string;
  fromValue?: string;
  toValue?: string;
}

export interface Submission {
  id: string;
  ref: string;                   // SUB-LPG-2024-ADNOC-002
  productId: string;
  productLabel: string;          // 'LPG'
  productLabelLong: string;      // 'Liquefied Petroleum Gas'
  productModel: ProductModel;
  entityId: string;
  entityName: string;            // 'ADNOC Distribution'
  formType: string;              // 'Producer · Bulk + Cylinder'
  periodLabel: string;           // '2024 annual'
  cycleYear: number;             // 2024
  years: number[];               // year columns (2019 → 2030)
  submittedBy: string;
  submittedOn?: string;
  version: string;               // 'v1' / 'v2 (amended)' / 'v0.3 (draft)'
  status: SubmissionStatus;
  workflow: SubmissionWorkflowEvent[];
  sections: SubmissionSection[];
  draftCompletePct?: number;     // for draft rows
  reviewRemarks?: ReviewRemark[];
  comments?: PpsComment[];
  reminders?: ReminderLog[];     // reminders sent by DoE to the entity
}

export interface SubmissionTask {
  id: string;
  productId: string;
  productLabel: string;
  cycleYear: number;
  formType: string;
  dueOn: string;
  status: 'not_started' | 'in_progress' | 'overdue' | 'pending_review';
  draftPct?: number;
  remindersSent?: number;
  notes?: string;
}
