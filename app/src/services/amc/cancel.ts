import type { ServiceDefinition } from '../../types';

// ============================================================================
// AMC — CANCELLATION of Annual Maintenance Contract for Gas Systems
// Source: AMC Enhancements SDD §4 (Cancellation of AMC for Gas Systems)
//
// Distinct from Renewal / Modification: introduces a PRE-DOE two-party cross
// approval step. If owner submits → routed to the maintenance company; if
// company submits → routed to the owner. Counter-party can Approve (reason
// optional) or Reject (reason mandatory). Reject terminates the request.
//
// Workflow:
//   draft → pending_counterparty → pending_engineer → pending_section_head
//         → pending_director → fee_pending → owner_signature → company_signature → issued
//
// On completion the original AMC record status is updated to "Cancelled" and
// the AMC document is regenerated with a "Cancelled" tag + final cancellation
// date.
// ============================================================================

export const amcCancelService: ServiceDefinition = {
  id: 'amc.cancel',
  module: 'amc',
  action: 'cancel',
  title: 'Cancellation of Annual Maintenance Contract for Gas Systems',
  shortTitle: 'AMC Cancel',
  description:
    'Owner or maintenance company can request to cancel an active AMC. A pre-DOE cross-approval from the counter-party is required before the 3-tier DOE review. Final cancellation regenerates the AMC document with a "Cancelled" tag.',
  initialState: 'draft',
  feeAmount: 0,
  certificateValidityYears: 0,

  states: [
    { id: 'draft',                    label: 'Draft',                                  category: 'draft',     ownerRole: 'applicant' },
    { id: 'pending_counterparty',     label: 'Pending Counter-Party Acknowledgement',  category: 'pending',   ownerRole: 'applicant' },
    { id: 'pending_engineer',         label: 'Under DOE Review',                       category: 'pending',   ownerRole: 'engineer' },
    { id: 'returned_to_applicant',    label: 'Requested for More Info',                category: 'returned',  ownerRole: 'applicant' },
    { id: 'pending_section_head',     label: 'Pending Section Head',                   category: 'pending',   ownerRole: 'section_head' },
    { id: 'pending_director',         label: 'Pending Director',                       category: 'pending',   ownerRole: 'director' },
    { id: 'returned_to_engineer',     label: 'Sent Back to Engineer',                  category: 'returned',  ownerRole: 'engineer' },
    { id: 'returned_to_section_head', label: 'Sent Back to Section Head',              category: 'returned',  ownerRole: 'section_head' },
    { id: 'fee_pending',              label: 'Approved · Payment Pending',             category: 'payment',   ownerRole: 'applicant' },
    { id: 'pending_owner_signature',  label: 'Waiting for Owner E-Signature',          category: 'pending',   ownerRole: 'applicant' },
    { id: 'pending_company_signature',label: 'Waiting for Company E-Signature',        category: 'pending',   ownerRole: 'applicant' },
    { id: 'issued',                   label: 'Cancelled',                              category: 'issued' },
    { id: 'rejected',                 label: 'Application Rejected',                   category: 'rejected' },
    { id: 'cancelled',                label: 'Withdrawn / Counter-Party Declined',     category: 'cancelled' },
  ],

  transitions: [
    { id: 'save-draft',              label: 'Save',                                  from: 'draft',                            to: 'draft',                     allowedRoles: ['applicant'],    variant: 'secondary' },
    { id: 'submit',                  label: 'Submit · Route to Counter-Party',       from: ['draft', 'returned_to_applicant'], to: 'pending_counterparty',      allowedRoles: ['applicant'],    variant: 'primary',   notifications: ['ack-applicant', 'notify-counterparty'] },

    // Pre-DOE two-party cross approval (SDD §4.5)
    { id: 'counterparty-approve',    label: 'Counter-Party Approves · Route to DOE', from: 'pending_counterparty',      to: 'pending_engineer',          allowedRoles: ['applicant'],    variant: 'success', requiresComment: false, commentLabel: 'Optional acknowledgement note from the counter-party', notifications: ['notify-engineer', 'counterparty-approved'] },
    { id: 'counterparty-reject',     label: 'Counter-Party Rejects · Terminate',     from: 'pending_counterparty',      to: 'cancelled',                 allowedRoles: ['applicant'],    variant: 'danger',  requiresComment: true,  commentLabel: 'Reason for rejection (mandatory)',                     notifications: ['counterparty-rejected'] },

    { id: 'engineer-request-info',   label: 'Request for More Info',                 from: 'pending_engineer',          to: 'returned_to_applicant',     allowedRoles: ['engineer'],     variant: 'warning', requiresComment: true, commentLabel: 'What additional information is required?', notifications: ['return-applicant'] },
    { id: 'engineer-reject',         label: 'Reject',                                from: 'pending_engineer',          to: 'rejected',                  allowedRoles: ['engineer'],     variant: 'danger',  requiresComment: true, commentLabel: 'Reason for rejection',                       notifications: ['reject-applicant'] },
    { id: 'engineer-approve',        label: 'Endorse & Forward to Section Head',     from: 'pending_engineer',          to: 'pending_section_head',      allowedRoles: ['engineer'],     variant: 'success', notifications: ['notify-section-head'] },

    { id: 'sh-request-info',         label: 'Request for More Info (Engineer)',      from: 'pending_section_head',      to: 'returned_to_engineer',      allowedRoles: ['section_head'], variant: 'warning', requiresComment: true, commentLabel: 'What additional information is required from the Engineer?', notifications: ['notify-engineer-more-info'] },
    { id: 'sh-reject',               label: 'Reject',                                from: 'pending_section_head',      to: 'rejected',                  allowedRoles: ['section_head'], variant: 'danger',  requiresComment: true, commentLabel: 'Reason for rejection',                       notifications: ['reject-applicant'] },
    { id: 'sh-approve',              label: 'Approve & Forward to Director',         from: 'pending_section_head',      to: 'pending_director',          allowedRoles: ['section_head'], variant: 'success', notifications: ['notify-director'] },

    { id: 'eng-resubmit-to-sh',      label: 'Re-endorse to Section Head',            from: 'returned_to_engineer',      to: 'pending_section_head',      allowedRoles: ['engineer'],     variant: 'success', requiresComment: true, commentLabel: 'Additional notes for the Section Head',         notifications: ['notify-section-head'] },

    { id: 'director-request-info',   label: 'Request for More Info (Section Head)',  from: 'pending_director',          to: 'returned_to_section_head',  allowedRoles: ['director'],     variant: 'warning', requiresComment: true, commentLabel: 'What additional information is required?', notifications: ['notify-section-head-more-info'] },
    { id: 'director-reject',         label: 'Reject',                                from: 'pending_director',          to: 'rejected',                  allowedRoles: ['director'],     variant: 'danger',  requiresComment: true, commentLabel: 'Reason for rejection',                       notifications: ['reject-applicant'] },
    { id: 'director-approve',        label: 'Final Approve · Request Fee Payment',   from: 'pending_director',          to: 'fee_pending',               allowedRoles: ['director'],     variant: 'success', notifications: ['approve-applicant'] },

    { id: 'sh-resubmit-to-director', label: 'Re-endorse to Director',                from: 'returned_to_section_head',  to: 'pending_director',          allowedRoles: ['section_head'], variant: 'success', requiresComment: true, commentLabel: 'Additional notes for the Director',             notifications: ['notify-director'] },

    { id: 'pay-fee',                 label: 'Pay Fee · Route to Owner',              from: 'fee_pending',               to: 'pending_owner_signature',   allowedRoles: ['applicant'],    variant: 'primary', notifications: ['notify-owner-signature'] },

    { id: 'owner-sign',              label: 'Sign with UAE Pass (Owner)',            from: 'pending_owner_signature',   to: 'pending_company_signature', allowedRoles: ['applicant'],    variant: 'primary', notifications: ['notify-company-signature'] },
    { id: 'owner-raise-concern',     label: 'Raise Concern',                         from: 'pending_owner_signature',   to: 'pending_engineer',          allowedRoles: ['applicant'],    variant: 'warning', requiresComment: true, commentLabel: 'Concern raised by the Building Owner (returns to DOE review)', notifications: ['notify-engineer'] },

    { id: 'company-sign',            label: 'Sign with UAE Pass (Company) · Issue Cancellation', from: 'pending_company_signature', to: 'issued',    allowedRoles: ['applicant'],    variant: 'primary', notifications: ['amc-cancelled'] },
    { id: 'company-raise-concern',   label: 'Raise Concern',                         from: 'pending_company_signature', to: 'pending_engineer',          allowedRoles: ['applicant'],    variant: 'warning', requiresComment: true, commentLabel: 'Concern raised by the Company (returns to DOE review)',        notifications: ['notify-engineer'] },
  ],

  form: [
    {
      id: 'cancellation-reason',
      title: 'Cancellation Form',
      description: 'The Cancellation form is captured on a separate tab; the read-only original AMC remains visible alongside. Submitting the form routes the request to the counter-party for acknowledgement before DOE review.',
      fields: [
        { id: 'cancellationReason', label: 'Reason for Cancellation', type: 'textarea', required: true, remark: 'Mandatory — explain why this AMC should be cancelled.' },
        { id: 'submittedBy',        label: 'Submitted by',            type: 'select',   required: true, options: [
          { value: 'owner',    label: 'Building Owner' },
          { value: 'contractor', label: 'Maintenance Company' },
        ], remark: 'Determines which counter-party is routed for acknowledgement.' },
      ],
      attachments: [
        { id: 'supportingDocs', label: 'Supporting Documents (PDF / JPG / GIF / DWG / DWF · max 10 MB)', required: false },
      ],
    },
    {
      id: 'company-info',
      title: 'Original AMC (Read-Only)',
      description: 'Pre-populated from the active AMC. No fields here are editable in the Cancellation service.',
      fields: [
        { id: 'companyLicense',  label: 'Company Commercial License',   type: 'readonly' },
        { id: 'companyName',     label: 'Maintenance Company Name',     type: 'readonly' },
        { id: 'representative',  label: 'Authorized Representative',    type: 'readonly' },
        { id: 'buildingName',    label: 'Building Name',                type: 'readonly' },
        { id: 'premisesNumber',  label: 'Premises / Building Number',   type: 'readonly' },
        { id: 'emirate',         label: 'Emirate',                      type: 'readonly' },
        { id: 'detailedAddress', label: 'Detailed Address',             type: 'readonly' },
        { id: 'contractValue',   label: 'Current AMC Contract Value (AED)', type: 'readonly' },
      ],
      attachments: [],
    },
  ],

  notifications: [
    { id: 'ack-applicant',                 channel: 'email', to: 'applicant',    subject: 'Cancellation of AMC Application Received (Ref: %ApplicationNumber%)', body: 'Dear %CompanyName%,\n\nWe confirm receipt of your application for the Cancellation of Annual Maintenance Contract (AMC) for Gas Systems. The request has been routed to the counter-party for acknowledgement.\n\nApplication Reference: %ApplicationNumber%\nStatus: Pending Counter-Party Acknowledgement\n\nBest regards,\nDepartment of Energy — PPS Team' },
    { id: 'notify-counterparty',           channel: 'email', to: 'applicant',    subject: 'Cancellation Request Awaiting Your Acknowledgement (Ref: %ApplicationNumber%)', body: 'Dear Counter-Party,\n\nA Cancellation request for the AMC at %CompanyName% has been initiated.\nApplication Reference: %ApplicationNumber%\n\nYou are requested to either Approve or Reject the cancellation. A reason is optional on Approve; mandatory on Reject. If you Reject, the request is terminated.\n\nBest regards,\nDepartment of Energy — PPS Team' },
    { id: 'counterparty-approved',         channel: 'email', to: 'applicant',    subject: 'Counter-Party Approved — Cancellation Forwarded to DOE (Ref: %ApplicationNumber%)', body: 'Dear %CompanyName%,\n\nThe counter-party has acknowledged your Cancellation request. The application has been forwarded to the DOE PPS team for review.\n\nApplication Reference: %ApplicationNumber%\nStatus: Under Review\n\nBest regards,\nDepartment of Energy — PPS Team' },
    { id: 'counterparty-rejected',         channel: 'email', to: 'applicant',    subject: 'Cancellation Terminated — Counter-Party Declined (Ref: %ApplicationNumber%)', body: 'Dear %CompanyName%,\n\nThe counter-party has declined the Cancellation request and the application has been terminated.\n\nReason: %Comments%\nApplication Reference: %ApplicationNumber%\n\nBest regards,\nDepartment of Energy — PPS Team' },
    { id: 'notify-engineer',               channel: 'email', to: 'engineer',     subject: 'Review for Cancellation of AMC Application — %CompanyName%', body: 'Dear PPS Engineer,\n\n%CompanyName% has submitted a request for Cancellation of Annual Maintenance Contract (AMC) for Gas Systems and the counter-party has acknowledged it.\nApplication Reference: %ApplicationNumber%\n\nBest regards,\nDepartment of Energy — PPS Team' },
    { id: 'return-applicant',              channel: 'email', to: 'applicant',    subject: 'AMC Cancellation — More information required (Ref: %ApplicationNumber%)', body: 'Dear %CompanyName%,\n\nAdditional information is required for your AMC Cancellation application (Ref: %ApplicationNumber%).\n\nReviewer Comments: %Comments%\n\nBest regards,\nDepartment of Energy — PPS Team' },
    { id: 'notify-section-head',           channel: 'email', to: 'section_head', subject: 'AMC Cancellation Awaiting Approval — %CompanyName%', body: 'Dear Section Head,\n\nThe AMC Cancellation application from %CompanyName% has been endorsed by the PPS Engineer.\nApplication Reference: %ApplicationNumber%\n\nBest regards,\nDepartment of Energy — PPS Team' },
    { id: 'notify-engineer-more-info',     channel: 'email', to: 'engineer',     subject: 'Additional information requested — %CompanyName%', body: 'Dear PPS Engineer,\n\nThe Section Head has requested additional information on AMC Cancellation application %ApplicationNumber%.\n\nComments: %Comments%\n\nBest regards,\nDepartment of Energy — PPS Team' },
    { id: 'notify-director',               channel: 'email', to: 'director',     subject: 'AMC Cancellation Awaiting Final Approval — %CompanyName%', body: 'Dear Director,\n\nThe AMC Cancellation application from %CompanyName% has been endorsed and is awaiting your final decision.\nApplication Reference: %ApplicationNumber%\n\nBest regards,\nDepartment of Energy — PPS Team' },
    { id: 'notify-section-head-more-info', channel: 'email', to: 'section_head', subject: 'Additional information requested — %CompanyName%', body: 'Dear Section Head,\n\nThe Director has requested additional information on AMC Cancellation application %ApplicationNumber%.\n\nComments: %Comments%\n\nBest regards,\nDepartment of Energy — PPS Team' },
    { id: 'reject-applicant',              channel: 'email', to: 'applicant',    subject: 'Rejection — Cancellation of AMC (Ref: %ApplicationNumber%)', body: 'Dear %CompanyName%,\n\nWe regret to inform you that your application for Cancellation of AMC for Gas Systems has been rejected.\n\nApplication Reference: %ApplicationNumber%\nReason: %Comments%\n\nBest regards,\nDepartment of Energy — PPS Team' },
    { id: 'approve-applicant',             channel: 'email', to: 'applicant',    subject: 'Cancellation Approved — Pay Fee (Ref: %ApplicationNumber%)', body: 'Dear %CompanyName%,\n\nYour application for Cancellation of Annual Maintenance Contract (AMC) has been APPROVED.\nStatus: Approved — Payment Pending\n\nPlease log in and click "Pay Fee" to proceed to e-signature.\n\nBest regards,\nDepartment of Energy — PPS Team' },
    { id: 'notify-owner-signature',        channel: 'email', to: 'applicant',    subject: 'AMC Cancellation — Owner E-Signature Required (Ref: %ApplicationNumber%)', body: 'Dear Building Owner,\n\nThe AMC Cancellation has been approved and payment received. Please log in and either Sign with UAE Pass or Raise Concern to return the application to the DOE review cycle.\n\nBest regards,\nDepartment of Energy — PPS Team' },
    { id: 'notify-company-signature',      channel: 'email', to: 'applicant',    subject: 'AMC Cancellation — Company E-Signature Required (Ref: %ApplicationNumber%)', body: 'Dear %CompanyName%,\n\nThe AMC Cancellation has been signed by the Building Owner and is awaiting your e-signature.\n\nBest regards,\nDepartment of Energy — PPS Team' },
    { id: 'amc-cancelled',                 channel: 'email', to: 'applicant',    subject: 'Cancellation of AMC Complete (Ref: %ApplicationNumber%)', body: 'Dear %CompanyName%,\n\nYour Cancellation of Annual Maintenance Contract (AMC) for Gas Systems has been signed by both parties and is now COMPLETE.\n\nApplication Reference: %ApplicationNumber%\nThe original AMC record has been moved to "Cancelled" status. The regenerated AMC document carries a "Cancelled" tag and the final cancellation date.\n\nBest regards,\nDepartment of Energy — PPS Team' },
  ],

  sla: [
    { stage: 'Counter-party acknowledgement', role: 'applicant',    days: 5 },
    { stage: 'PPS Engineer review',            role: 'engineer',     days: 10 },
    { stage: 'Section Head decision',          role: 'section_head', days: 5 },
    { stage: 'Director final decision',        role: 'director',     days: 2 },
    { stage: 'Owner e-signature window',       role: 'applicant',    days: 7 },
    { stage: 'Company e-signature window',     role: 'applicant',    days: 7 },
  ],
};
