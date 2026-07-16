import type { ServiceDefinition } from '../../types';

// ============================================================================
// NOC — RENEWAL of No Objection Certificate to operate the Gas Systems
// Source: "NOC Enhancement SDD" v1.1 §1 (Renewal of NOC)
//
// Premises-level certificate (tied to a building / site), NOT company-level.
// Eligibility window: 1 month before expiry, plus 30-day configurable grace
// period (status during grace = "Expired"). Two-tier review:
//   Reviewer (PPS Engineer) → Approver (Section Head)
// Payment is 0 AED (configurable). Output is a Renewed NOC document.
// ============================================================================

export const nocRenewService: ServiceDefinition = {
  id: 'noc.renew',
  module: 'noc',
  action: 'renew',
  title: 'Renewal of No Objection Certificate (NOC)',
  shortTitle: 'NOC Renew',
  description:
    'Renew an active No Objection Certificate to operate a gas system at a registered premises. Two-tier review (Reviewer → Approver), 0 AED fee.',
  initialState: 'draft',
  feeAmount: 0,
  certificateValidityYears: 1,

  states: [
    { id: 'draft',                 label: 'Draft',                      category: 'draft',     ownerRole: 'applicant' },
    { id: 'pending_engineer',      label: 'Under Review',               category: 'pending',   ownerRole: 'engineer' },
    { id: 'returned_to_applicant', label: 'Requested for More Info',    category: 'returned',  ownerRole: 'applicant' },
    { id: 'pending_approver',      label: 'Pending Approver',           category: 'pending',   ownerRole: 'section_head' },
    { id: 'returned_to_engineer',  label: 'Sent Back to Engineer',      category: 'returned',  ownerRole: 'engineer' },
    { id: 'fee_pending',           label: 'Approved · Payment Pending', category: 'payment',   ownerRole: 'applicant' },
    { id: 'issued',                label: 'Renewed',                    category: 'issued' },
    { id: 'rejected',              label: 'Application Rejected',       category: 'rejected' },
    { id: 'cancelled',             label: 'Cancelled',                  category: 'cancelled' },
  ],

  transitions: [
    { id: 'save-draft',            label: 'Save',                            from: 'draft',                            to: 'draft',                 allowedRoles: ['applicant'],    variant: 'secondary' },
    { id: 'submit',                label: 'Submit',                          from: ['draft', 'returned_to_applicant'], to: 'pending_engineer',      allowedRoles: ['applicant'],    variant: 'primary',  notifications: ['ack-applicant', 'notify-engineer'] },

    { id: 'engineer-request-info', label: 'Request for More Info',           from: 'pending_engineer',                 to: 'returned_to_applicant', allowedRoles: ['engineer'],     variant: 'warning',  requiresComment: true, commentLabel: 'What additional information is required?', notifications: ['return-applicant'] },
    { id: 'engineer-reject',       label: 'Reject',                          from: 'pending_engineer',                 to: 'rejected',              allowedRoles: ['engineer'],     variant: 'danger',   requiresComment: true, commentLabel: 'Reason for rejection',                       notifications: ['reject-applicant'] },
    { id: 'engineer-approve',      label: 'Approve & Forward to Approver',   from: 'pending_engineer',                 to: 'pending_approver',      allowedRoles: ['engineer'],     variant: 'success',  notifications: ['notify-approver'] },

    { id: 'approver-request-info', label: 'Request for More Info (Engineer)', from: 'pending_approver',                to: 'returned_to_engineer',  allowedRoles: ['section_head'], variant: 'warning',  requiresComment: true, commentLabel: 'What additional information is required from the Engineer?', notifications: ['notify-engineer-more-info'] },
    { id: 'approver-reject',       label: 'Reject',                          from: 'pending_approver',                 to: 'rejected',              allowedRoles: ['section_head'], variant: 'danger',   requiresComment: true, commentLabel: 'Reason for rejection',                       notifications: ['reject-applicant'] },
    { id: 'approver-approve',      label: 'Final Approve · Request Fee Payment', from: 'pending_approver',             to: 'fee_pending',           allowedRoles: ['section_head'], variant: 'success',  notifications: ['approve-applicant'] },

    { id: 'eng-resubmit-to-approver', label: 'Re-endorse to Approver',       from: 'returned_to_engineer',             to: 'pending_approver',      allowedRoles: ['engineer'],     variant: 'success',  requiresComment: true, commentLabel: 'Additional notes for the Approver',          notifications: ['notify-approver'] },

    { id: 'pay-fee',               label: 'Pay Fee',                         from: 'fee_pending',                      to: 'issued',                allowedRoles: ['applicant'],    variant: 'primary',  notifications: ['fee-paid'] },
  ],

  form: [
    {
      id: 'premises-info',
      title: 'Premises Information',
      description: 'Pre-populated from the active NOC. Premises identity is locked; operations & contractor fields are editable. Changes are highlighted for the DOE reviewer.',
      fields: [
        { id: 'nocType',          label: 'NOC Type',                    type: 'readonly' },
        { id: 'premisesName',     label: 'Premises Name',               type: 'readonly' },
        { id: 'premisesType',     label: 'Premises Type',               type: 'readonly' },
        { id: 'buildingNo',       label: 'Premises / Building No.',     type: 'readonly' },
        { id: 'emirate',          label: 'Emirate',                     type: 'readonly' },
        { id: 'city',             label: 'City',                        type: 'readonly' },
        { id: 'area',             label: 'Area',                        type: 'readonly' },
        { id: 'sector',           label: 'Sector',                      type: 'readonly' },
        { id: 'plotNo',           label: 'Plot No.',                    type: 'readonly' },
        { id: 'coordinates',      label: 'Coordinates',                 type: 'readonly' },
        { id: 'ownerName',        label: "Premises Owner's Name",       type: 'text', required: true },
        { id: 'ownerEid',         label: "Premises Owner's EID",        type: 'text', required: true },
        { id: 'ownerContact',     label: 'Premises Owner Contact Info', type: 'text', required: true },
        { id: 'projectConsultant',label: 'Project Consultant',          type: 'text', required: true },
      ],
      attachments: [],
    },
    {
      id: 'gas-system-info',
      title: 'Gas System Information',
      description: 'Pre-populated from the active NOC. Operational fields are editable; the installation contractor and AMC contractor are locked to the originally approved entities.',
      fields: [
        { id: 'installContractor', label: 'Gas Installation Contractor', type: 'readonly' },
        { id: 'amcContractor',     label: 'Gas AMC Contractor',          type: 'readonly' },
        { id: 'emergencyContact',  label: 'Emergency # / Email',         type: 'text', required: true },
        { id: 'tpiCompany',        label: 'Gas System TPI Company Name', type: 'text', required: true },
        { id: 'tpiCocRef',         label: 'TPI CoC Reference',           type: 'text', required: true },
        { id: 'tpiCocIssueDate',   label: 'TPI CoC Issue Date',          type: 'date', required: true },
        { id: 'gasSystemType',     label: 'Gas System Type',             type: 'readonly' },
        { id: 'gasMedium',         label: 'Gas Medium',                  type: 'text', required: true },
        { id: 'gasSupplyCompany',  label: 'Gas Supply Company',          type: 'text', required: true },
        { id: 'fmCompany',         label: 'Facility Management Company', type: 'text', required: true },
        { id: 'fmContact',         label: 'FM Contact Info',             type: 'text', required: true },
      ],
      attachments: [
        { id: 'amc',             label: 'Active Annual Maintenance Contract (AMC)',    required: true },
        { id: 'tpiCoc',          label: 'TPI Certificate of Conformity',               required: true },
        { id: 'inspectionReport',label: 'Latest TPI inspection report',                required: false },
      ],
    },
  ],

  notifications: [
    { id: 'ack-applicant',             channel: 'email', to: 'applicant',    subject: 'Renewal of NOC for Gas System — Application Received (Ref: %ApplicationNumber%)', body: 'Dear %CompanyName%,\n\nWe confirm receipt of your application for the Renewal of No Objection Certificate for the gas system.\n\nApplication Reference: %ApplicationNumber%\nStatus: Under Review\n\nBest regards,\nDepartment of Energy — PPS Team' },
    { id: 'notify-engineer',           channel: 'email', to: 'engineer',     subject: 'Review Renewal of NOC Application — %CompanyName%', body: 'Dear Reviewer,\n\nThe %CompanyName% has submitted a request for Renewal of NoC for gas system and it is assigned for your review.\n\nPlease Click Here to review the application.\n\nBest regards,\nDepartment of Energy — PPS Team' },
    { id: 'return-applicant',          channel: 'email', to: 'applicant',    subject: 'More Information Required — Renewal of NOC (Ref: %ApplicationNumber%)', body: 'Dear %CompanyName%,\n\nYour application for Renewal of NOC (Ref: %ApplicationNumber%) has been reviewed by the department and additional information is required.\n\nComments: %Comments%\n\nPlease log in to update and re-submit.\n\nBest regards,\nDepartment of Energy — PPS Team' },
    { id: 'notify-approver',           channel: 'email', to: 'section_head', subject: 'Approval for Renewal of NOC Application — %CompanyName%', body: 'Dear Approver,\n\nThe %CompanyName% has submitted a request for Renewal of NOC for gas system and it is assigned for your Approval.\n\nApplication Reference: %ApplicationNumber%\n\nBest regards,\nDepartment of Energy — PPS Team' },
    { id: 'notify-engineer-more-info', channel: 'email', to: 'engineer',     subject: 'Additional information requested — %CompanyName%', body: 'Dear Reviewer,\n\nThe Approver has requested additional information on Renewal application %ApplicationNumber%.\n\nComments: %Comments%\n\nBest regards,\nDepartment of Energy — PPS Team' },
    { id: 'reject-applicant',          channel: 'email', to: 'applicant',    subject: 'Rejection — Renewal of NOC for Gas System (Ref: %ApplicationNumber%)', body: 'Dear %CompanyName%,\n\nWe regret to inform you that your application for the Renewal of No Objection Certificate for Gas Systems (Reference: %ApplicationNumber%) has been rejected.\n\nReason: %Comments%\n\nFor further details, kindly review your application.\n\nBest regards,\nDepartment of Energy — PPS Team' },
    { id: 'approve-applicant',         channel: 'email', to: 'applicant',    subject: 'Renewal of NOC for Gas System — Approved · Payment Pending (Ref: %ApplicationNumber%)', body: 'Dear %CompanyName%,\n\nYour application for the Renewal of NOC has been approved by the Department of Energy.\n\nApplication Reference: %ApplicationNumber%\nStatus: Approved — Payment Pending\n\nPlease complete the payment via the Unified Service Portal to receive the renewed NOC.\n\nBest regards,\nDepartment of Energy — PPS Team' },
    { id: 'fee-paid',                  channel: 'email', to: 'applicant',    subject: 'Renewal of NOC for Gas System — Issued (Ref: %ApplicationNumber%)', body: 'Dear Applicant,\n\nWe are pleased to inform you that your payment for the Renewal of No Objection Certificate (Reference: %ApplicationNumber%) has been successfully processed.\n\nYou can click here to view your NOC.\n\nBest regards,\nDepartment of Energy — PPS Team' },
  ],

  sla: [
    { stage: 'Renewal submission window (1 month pre-expiry + 30d grace)', role: 'applicant',    days: 0 },
    { stage: 'PPS Engineer (Reviewer) review',                             role: 'engineer',     days: 10 },
    { stage: 'Approver decision',                                          role: 'section_head', days: 5 },
  ],
};
