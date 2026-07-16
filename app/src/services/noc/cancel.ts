import type { ServiceDefinition } from '../../types';

// ============================================================================
// NOC — CANCELLATION of No Objection Certificate to operate the Gas Systems
// Source: "NOC Enhancement SDD" v1.1 §2 (Cancellation of NOC)
//
// Slim form: Cancellation Reason (mandatory) + Supporting Documents (optional).
// Two-tier review: Reviewer (PPS Engineer) → Approver (Section Head). After
// payment (0 AED configurable) the Cancellation document is generated with
// the "Cancelled" tag, QR code and DOE stamp; original NOC moves to
// Cancelled with the cancellation approval date as the effective date.
// ============================================================================

export const nocCancelService: ServiceDefinition = {
  id: 'noc.cancel',
  module: 'noc',
  action: 'cancel',
  title: 'Cancellation of No Objection Certificate (NOC)',
  shortTitle: 'NOC Cancel',
  description:
    'Cancel an active No Objection Certificate to operate a gas system. Reviewer → Approver review with cancellation document output.',
  initialState: 'draft',
  feeAmount: 0,
  certificateValidityYears: 0,

  states: [
    { id: 'draft',                 label: 'Draft',                      category: 'draft',     ownerRole: 'applicant' },
    { id: 'pending_engineer',      label: 'Under Review',               category: 'pending',   ownerRole: 'engineer' },
    { id: 'returned_to_applicant', label: 'Requested for More Info',    category: 'returned',  ownerRole: 'applicant' },
    { id: 'pending_approver',      label: 'Pending Approver',           category: 'pending',   ownerRole: 'section_head' },
    { id: 'returned_to_engineer',  label: 'Sent Back to Engineer',      category: 'returned',  ownerRole: 'engineer' },
    { id: 'fee_pending',           label: 'Approved · Payment Pending', category: 'payment',   ownerRole: 'applicant' },
    { id: 'issued',                label: 'Cancelled',                  category: 'issued' },
    { id: 'rejected',              label: 'Application Rejected',       category: 'rejected' },
    { id: 'cancelled',             label: 'Withdrawn',                  category: 'cancelled' },
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

    { id: 'pay-fee',               label: 'Pay Fee · Issue Cancellation',    from: 'fee_pending',                      to: 'issued',                allowedRoles: ['applicant'],    variant: 'primary',  notifications: ['fee-paid'] },
  ],

  form: [
    {
      id: 'premises-info',
      title: 'NOC Reference',
      description: 'Pre-populated from the active NOC being cancelled.',
      fields: [
        { id: 'nocType',          label: 'NOC Type',                type: 'readonly' },
        { id: 'premisesName',     label: 'Premises Name',           type: 'readonly' },
        { id: 'premisesType',     label: 'Premises Type',           type: 'readonly' },
        { id: 'buildingNo',       label: 'Premises / Building No.', type: 'readonly' },
        { id: 'city',             label: 'City',                    type: 'readonly' },
      ],
      attachments: [],
    },
    {
      id: 'cancellation-reason',
      title: 'Cancellation Reason',
      description: 'Provide the reason for cancellation. Supporting documents are optional but recommended.',
      fields: [
        { id: 'cancellationReason', label: 'Cancellation Reason', type: 'textarea', required: true, remark: 'Mandatory.' },
      ],
      attachments: [
        { id: 'supportingDocs', label: 'Supporting Documents (PDF / JPG / PNG)', required: false },
      ],
    },
  ],

  notifications: [
    { id: 'ack-applicant',             channel: 'email', to: 'applicant',    subject: 'Cancellation of NOC for Gas System — Application Received (Ref: %ApplicationNumber%)', body: 'Dear %CompanyName%,\n\nWe confirm receipt of your application for the Cancellation of No Objection Certificate for the gas system.\n\nApplication Reference: %ApplicationNumber%\nStatus: Under Review\n\nBest regards,\nDepartment of Energy — PPS Team' },
    { id: 'notify-engineer',           channel: 'email', to: 'engineer',     subject: 'Review of Cancellation for NOC Application — %CompanyName%', body: 'Dear Reviewer,\n\nThe %CompanyName% has submitted a request for Cancellation of NoC for gas system and it is assigned for your review.\n\nPlease Click Here to review the application.\n\nBest regards,\nDepartment of Energy — PPS Team' },
    { id: 'return-applicant',          channel: 'email', to: 'applicant',    subject: 'More Information Required — Cancellation of NOC (Ref: %ApplicationNumber%)', body: 'Dear %CompanyName%,\n\nYour application for Cancellation of NOC (Ref: %ApplicationNumber%) has been reviewed and additional information is required.\n\nComments: %Comments%\n\nBest regards,\nDepartment of Energy — PPS Team' },
    { id: 'notify-approver',           channel: 'email', to: 'section_head', subject: 'Approval for Cancellation of NOC Application — %CompanyName%', body: 'Dear Approver,\n\nThe %CompanyName% has submitted a request for Cancellation of NOC for gas system and it is assigned for your Approval.\n\nApplication Reference: %ApplicationNumber%\n\nBest regards,\nDepartment of Energy — PPS Team' },
    { id: 'notify-engineer-more-info', channel: 'email', to: 'engineer',     subject: 'Additional information requested — %CompanyName%', body: 'Dear Reviewer,\n\nThe Approver has requested additional information on Cancellation application %ApplicationNumber%.\n\nComments: %Comments%\n\nBest regards,\nDepartment of Energy — PPS Team' },
    { id: 'reject-applicant',          channel: 'email', to: 'applicant',    subject: 'Rejection — Cancellation of NOC for Gas System (Ref: %ApplicationNumber%)', body: 'Dear %CompanyName%,\n\nWe regret to inform you that your application for the Cancellation of No Objection Certificate for Gas Systems (Reference: %ApplicationNumber%) has been rejected.\n\nReason: %Comments%\n\nBest regards,\nDepartment of Energy — PPS Team' },
    { id: 'approve-applicant',         channel: 'email', to: 'applicant',    subject: 'Cancellation of NOC for Gas System — Approved · Payment Pending (Ref: %ApplicationNumber%)', body: 'Dear %CompanyName%,\n\nYour application for the Cancellation of NOC has been approved.\n\nApplication Reference: %ApplicationNumber%\nStatus: Approved — Payment Pending\n\nPlease complete the payment to issue the Cancellation document.\n\nBest regards,\nDepartment of Energy — PPS Team' },
    { id: 'fee-paid',                  channel: 'email', to: 'applicant',    subject: 'Cancellation of NOC for Gas System — Approved & Issued (Ref: %ApplicationNumber%)', body: 'Dear Applicant,\n\nWe are pleased to inform you that your payment request for the Cancellation of No Objection Certificate (NOC) for the gas system (Reference: %ApplicationNumber%) has been successfully processed.\n\nYou can click here to view your NOC.\n\nBest regards,\nDepartment of Energy — PPS Team' },
  ],

  sla: [
    { stage: 'Cancellation submission',         role: 'applicant',    days: 0 },
    { stage: 'PPS Engineer (Reviewer) review',  role: 'engineer',     days: 10 },
    { stage: 'Approver decision',               role: 'section_head', days: 5 },
  ],
};
