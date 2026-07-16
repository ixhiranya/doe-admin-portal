// ============================================================================
// Inspection types — DoE PPS Mobile Inspection & Enforcement App SDD §5–§7.
//
// The inspector captures these on the mobile / tablet simulator. On submit
// the record is persisted (localStorage) so the existing web app can run the
// review cycle (Senior Inspector co-sign · Section Head review · Regulation
// Team escalation · Violations Register write).
// ============================================================================

export type InspectionType =
  | 'routine'
  | 're_inspection'
  | 'complaint'
  | 'spot_check'
  | 'incident_response'
  | 'pre_approval';

export type ChecklistOutcome = 'compliant' | 'warning' | 'violation' | 'na';
export type Severity = 'minor' | 'major' | 'critical';

export interface InspectionPhoto {
  id: string;
  // base64 data: URL of the captured (or simulated) photo
  dataUrl: string;
  caption: string;
  capturedAt: string;       // ISO timestamp
  lat: number;
  lng: number;
  inspectorId: string;
  inspectorName: string;
  // SHA-256 hash for tamper detection (simulated)
  hash: string;
  // True when GPS was outside the building geofence at capture time
  geofenceOverride?: boolean;
}

export interface ChecklistItem {
  id: string;
  description: string;
  outcome: ChecklistOutcome | null;
  observations?: string;
  severity?: Severity;
  referenceClause?: string;
  photos: InspectionPhoto[];
  sampleTaken?: boolean;
  sampleReference?: string;
}

export interface PriorFindingResolution {
  id: string;
  reference: string;
  description: string;
  status: 'resolved' | 'partial' | 'not_resolved' | null;
  evidencePhotos: InspectionPhoto[];
  disposition: 'close' | 'carry_forward' | 'escalate' | null;
}

export interface InspectionViolation {
  id: string;
  // Linked checklist item id (1:1 — every Violation outcome must open a form)
  checklistItemId: string;
  violationNumber?: string;      // DOE-VIO-{YYYY}-{NNNN} — assigned on escalation
  category: string;
  severity: Severity;
  description: string;
  photos: InspectionPhoto[];
  witnessStatement?: string;
  witnessName?: string;
  witnessId?: string;
  sampleReference?: string;
  disposition: 'warning_letter' | 'admin_fine' | 'operations_cessation' | 'refer_vap';
  repeatOffenceCount?: number;
  // Set by the back-end after severity re-evaluation
  registerStatus?: 'open' | 'in_vap' | 'closed';
}

export type InspectionStatus =
  | 'draft'              // in-progress on device
  | 'submitted'          // submitted but not yet routed (retain vs escalate decision pending → auto via submission path)
  | 'retained'           // retained in inspection team queue (Senior Inspector)
  | 'escalated'          // escalated to regulation team
  | 'in_review'          // Section Head / Regulation Team has picked it up
  | 'needs_cosign'       // critical violation awaiting Senior Inspector co-sign
  | 'returned'           // returned to inspector with comments
  | 'approved'           // approved and closed
  | 'closed';            // closed (after VAP, fine, etc.)

export type InspectionSubmissionRoute = 'retain' | 'escalate';

export interface InspectionWorkflowEvent {
  at: string;
  actorId: string;
  actorName: string;
  actorRole: string;
  action: string;
  from?: InspectionStatus;
  to?: InspectionStatus;
  comment?: string;
}

export interface InspectionOverallOutcome {
  result: 'compliant' | 'compliant_with_warnings' | 'non_compliant';
  // Inspector override of computed result (if any)
  override?: boolean;
  notes?: string;
}

export interface Inspection {
  id: string;
  inspectionNumber: string;          // DOE-INS-{YYYY}-{NNNN}
  type: InspectionType;
  status: InspectionStatus;
  submissionRoute?: InspectionSubmissionRoute;

  // Building snapshot at check-in
  buildingId: string;
  buildingName: string;
  buildingUid: string;               // B-{premises_number}
  buildingAddress: string;
  buildingCity?: string;
  buildingCoords?: { lat: number; lng: number };
  buildingType?: string;
  commercialLicence?: string;

  // Permit snapshot
  permits: {
    amc: { status: string; expiry?: string };
    noc: { status: string; expiry?: string };
    coc: { status: string; expiry?: string };
    tpiCoc?: { status: string; expiry?: string };
  };

  openViolationsAtCheckin: number;
  openWarningsAtCheckin: number;
  complianceScoreAtCheckin?: number;

  // Inspector profile
  inspectorId: string;
  inspectorName: string;
  inspectorRole: string;

  // Check-in
  checkInAt: string;                 // ISO
  checkInLat: number;
  checkInLng: number;
  geofenceDistanceMeters: number;
  geofenceOverride?: boolean;
  geofenceOverrideReason?: string;

  // Pre-inspection
  responsibleParty: {
    role: string;
    name: string;
    id?: string;
    mobile?: string;
  }[];
  amcVisible: boolean | null;
  nocVisible: boolean | null;
  briefingGiven: boolean | null;

  // Checklist
  checklist: ChecklistItem[];

  // Prior findings (from prior open warnings / violations at this building)
  priorFindings: PriorFindingResolution[];

  // General notes
  generalObservations?: string;
  recommendations?: string;
  internalNotes?: string;

  // Violations recorded during this inspection (refers to checklist items where
  // outcome=violation; the violation form is filled before submit can complete)
  violations: InspectionViolation[];

  // Overall outcome
  overallOutcome?: InspectionOverallOutcome;

  // Sign-off
  inspectorSignedAt?: string;
  inspectorSignature?: string;       // representation of biometric / AD re-auth
  coSignerId?: string;
  coSignerName?: string;
  coSignedAt?: string;
  responsiblePartyAck?: { name: string; id?: string; signedAt: string; refusalReason?: string };

  // End time
  endAt?: string;
  endLat?: number;
  endLng?: number;

  // Workflow trail
  workflow: InspectionWorkflowEvent[];

  // Linked violation numbers from the central Violations Register (after escalate)
  linkedViolationIds?: string[];

  // Follow-up (when retained)
  followUpDueAt?: string;
  followUpAssignedTo?: string;

  // Created / updated
  createdAt: string;
  updatedAt: string;
}

// Inspection plan assigned to an inspector for the day / week
export interface InspectorPlanStop {
  buildingId: string;
  priority: 'normal' | 'high';
  reason?: string;
}
