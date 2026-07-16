import type { ServiceDefinition } from '../../types';

// ============================================================================
// HOE / TPI — REGISTRATION CANCELLATION
// Source: "HOE TPI Registration Enhancements SDD" §3 (Cancellation)
//
// Slim form: Cancellation Reason (mandatory) + Supporting Documents (optional).
// Three-tier review → cancellation processing fee → cancellation document
// (with QR code & DOE stamp); original Registration moves to Cancelled.
// ============================================================================

export const hoeCancelService: ServiceDefinition = {
  id: 'hoe.cancel',
  module: 'hoe',
  action: 'cancel',
  title: 'Cancellation of HOE (TPI) Registration',
  shortTitle: 'HOE Cancel',
  description:
    'Cancel an active Third Party Inspection Company Registration with reason and optional supporting documents.',
  initialState: 'draft',
  feeAmount: 800,
  certificateValidityYears: 0,

  states: [
    { id: 'draft',                    label: 'Draft',                      category: 'draft',     ownerRole: 'applicant' },
    { id: 'pending_engineer',         label: 'Under Review',               category: 'pending',   ownerRole: 'engineer' },
    { id: 'returned_to_applicant',    label: 'Requested for More Info',    category: 'returned',  ownerRole: 'applicant' },
    { id: 'pending_section_head',     label: 'Pending Section Head',       category: 'pending',   ownerRole: 'section_head' },
    { id: 'pending_director',         label: 'Pending Director',           category: 'pending',   ownerRole: 'director' },
    { id: 'returned_to_engineer',     label: 'Sent Back to Engineer',      category: 'returned',  ownerRole: 'engineer' },
    { id: 'returned_to_section_head', label: 'Sent Back to Section Head',  category: 'returned',  ownerRole: 'section_head' },
    { id: 'fee_pending',              label: 'Approved · Payment Pending', category: 'payment',   ownerRole: 'applicant' },
    { id: 'issued',                   label: 'Cancelled',                  category: 'issued' },
    { id: 'rejected',                 label: 'Application Rejected',       category: 'rejected' },
    { id: 'cancelled',                label: 'Withdrawn',                  category: 'cancelled' },
  ],

  transitions: [
    { id: 'save-draft',              label: 'Save',                                 from: 'draft',                            to: 'draft',                    allowedRoles: ['applicant'],    variant: 'secondary' },
    { id: 'submit',                  label: 'Submit',                               from: ['draft', 'returned_to_applicant'], to: 'pending_engineer',         allowedRoles: ['applicant'],    variant: 'primary', notifications: ['ack-applicant', 'notify-engineer'] },

    { id: 'engineer-request-info',   label: 'Request for More Info',                from: 'pending_engineer',                 to: 'returned_to_applicant',    allowedRoles: ['engineer'],     variant: 'warning', requiresComment: true, commentLabel: 'What additional information is required?', notifications: ['return-applicant'] },
    { id: 'engineer-reject',         label: 'Reject',                               from: 'pending_engineer',                 to: 'rejected',                 allowedRoles: ['engineer'],     variant: 'danger',  requiresComment: true, commentLabel: 'Reason for rejection',                       notifications: ['reject-applicant'] },
    { id: 'engineer-approve',        label: 'Endorse & Forward to Section Head',    from: 'pending_engineer',                 to: 'pending_section_head',     allowedRoles: ['engineer'],     variant: 'success', notifications: ['notify-section-head'] },

    { id: 'sh-request-info',         label: 'Request for More Info (Engineer)',     from: 'pending_section_head',             to: 'returned_to_engineer',     allowedRoles: ['section_head'], variant: 'warning', requiresComment: true, commentLabel: 'What additional information is required from the Engineer?', notifications: ['notify-engineer-more-info'] },
    { id: 'sh-reject',               label: 'Reject',                               from: 'pending_section_head',             to: 'rejected',                 allowedRoles: ['section_head'], variant: 'danger',  requiresComment: true, commentLabel: 'Reason for rejection',                       notifications: ['reject-applicant'] },
    { id: 'sh-approve',              label: 'Approve & Forward to Director',        from: 'pending_section_head',             to: 'pending_director',         allowedRoles: ['section_head'], variant: 'success', notifications: ['notify-director'] },

    { id: 'eng-resubmit-to-sh',      label: 'Re-endorse to Section Head',           from: 'returned_to_engineer',             to: 'pending_section_head',     allowedRoles: ['engineer'],     variant: 'success', requiresComment: true, commentLabel: 'Additional notes for the Section Head',     notifications: ['notify-section-head'] },

    { id: 'director-request-info',   label: 'Request for More Info (Section Head)', from: 'pending_director',                 to: 'returned_to_section_head', allowedRoles: ['director'],     variant: 'warning', requiresComment: true, commentLabel: 'What additional information is required?', notifications: ['notify-section-head-more-info'] },
    { id: 'director-reject',         label: 'Reject',                               from: 'pending_director',                 to: 'rejected',                 allowedRoles: ['director'],     variant: 'danger',  requiresComment: true, commentLabel: 'Reason for rejection',                       notifications: ['reject-applicant'] },
    { id: 'director-approve',        label: 'Final Approve · Request Fee Payment',  from: 'pending_director',                 to: 'fee_pending',              allowedRoles: ['director'],     variant: 'success', notifications: ['approve-applicant'] },

    { id: 'sh-resubmit-to-director', label: 'Re-endorse to Director',               from: 'returned_to_section_head',         to: 'pending_director',         allowedRoles: ['section_head'], variant: 'success', requiresComment: true, commentLabel: 'Additional notes for the Director',         notifications: ['notify-director'] },

    { id: 'pay-fee',                 label: 'Pay Fee · Issue Cancellation',         from: 'fee_pending',                      to: 'issued',                   allowedRoles: ['applicant'],    variant: 'primary', notifications: ['fee-paid'] },
  ],

  form: [
    {
      id: 'company-info',
      title: 'Registration Reference',
      description: 'Pre-populated from the active TPI Registration Certificate being cancelled.',
      fields: [
        { id: 'companyLicense', label: 'Registration Certificate Number', type: 'readonly' },
        { id: 'companyName',    label: 'Company Name',                    type: 'readonly' },
      ],
      attachments: [],
    },
    {
      id: 'cancellation-reason',
      title: 'Cancellation Reason',
      description: 'Provide the reason for cancellation. Supporting documents are optional but recommended (board / shareholder resolution, parent-company letter, etc.).',
      fields: [
        { id: 'cancellationReason', label: 'Cancellation Reason', type: 'textarea', required: true, remark: 'Mandatory.' },
      ],
      attachments: [
        { id: 'supportingDocs', label: 'Supporting Documents (PDF / JPG / PNG)', required: false },
      ],
    },
  ],

  notifications: [
    { id: 'ack-applicant',                channel: 'email', to: 'applicant',    subject: 'Cancellation of HOE (TPI) Registration — Application Received (Ref: %ApplicationNumber%)', body: 'Dear %CompanyName%,\n\nWe confirm receipt of your application for the Cancellation of HOE (TPI) Registration.\n\nApplication Reference: %ApplicationNumber%\nStatus: Under Review\n\nBest regards,\nDepartment of Energy — PPS Team' },
    { id: 'notify-engineer',              channel: 'email', to: 'engineer',     subject: 'Review Required — Cancellation of HOE (TPI) Registration — %CompanyName%', body: 'Dear PPS Engineer,\n\n%CompanyName% has submitted a Cancellation request for their HOE (TPI) Registration.\nApplication Reference: %ApplicationNumber%.\n\nBest regards,\nDepartment of Energy — PPS Team' },
    { id: 'return-applicant',             channel: 'email', to: 'applicant',    subject: 'Cancellation of HOE (TPI) Registration — More information required (Ref: %ApplicationNumber%)', body: 'Dear %CompanyName%,\n\nAdditional information is required for your Cancellation application (Ref: %ApplicationNumber%).\n\nComments: %Comments%\n\nBest regards,\nDepartment of Energy — PPS Team' },
    { id: 'notify-section-head',          channel: 'email', to: 'section_head', subject: 'Application Awaiting Approval — Cancellation of HOE (TPI) Registration — %CompanyName%', body: 'Dear Section Head,\n\nThe Cancellation application from %CompanyName% has been endorsed by the PPS Engineer.\nApplication Reference: %ApplicationNumber%\n\nBest regards,\nDepartment of Energy — PPS Team' },
    { id: 'notify-engineer-more-info',    channel: 'email', to: 'engineer',     subject: 'Additional information requested — %CompanyName%', body: 'Dear Reviewer,\n\nThe Section Head has requested additional information on Cancellation application %ApplicationNumber%.\n\nComments: %Comments%\n\nBest regards,\nDepartment of Energy — PPS Team' },
    { id: 'notify-director',              channel: 'email', to: 'director',     subject: 'Application Awaiting Approval — Cancellation of HOE (TPI) Registration — %CompanyName%', body: 'Dear Director,\n\nThe Cancellation application from %CompanyName% has been endorsed and is awaiting your final decision.\nApplication Reference: %ApplicationNumber%\n\nBest regards,\nDepartment of Energy — PPS Team' },
    { id: 'notify-section-head-more-info', channel: 'email', to: 'section_head', subject: 'Additional information requested — %CompanyName%', body: 'Dear Section Head,\n\nThe Director has requested additional information on Cancellation application %ApplicationNumber%.\n\nComments: %Comments%\n\nBest regards,\nDepartment of Energy — PPS Team' },
    { id: 'reject-applicant',             channel: 'email', to: 'applicant',    subject: 'Rejection — Cancellation of HOE (TPI) Registration (Ref: %ApplicationNumber%)', body: 'Dear %CompanyName%,\n\nYour Cancellation application has been rejected.\n\nApplication Reference: %ApplicationNumber%\nReason: %Comments%\n\nBest regards,\nDepartment of Energy — PPS Team' },
    { id: 'approve-applicant',            channel: 'email', to: 'applicant',    subject: 'Application Approved — Payment Pending — Cancellation of HOE (TPI) Registration (Ref: %ApplicationNumber%)', body: 'Dear %CompanyName%,\n\nYour Cancellation application has been approved. Please complete the cancellation processing fee via the DOE Unified Service Portal to receive the Cancellation document.\n\nApplication Reference: %ApplicationNumber%\nStatus: Approved — Payment Pending\n\nBest regards,\nDepartment of Energy — PPS Team' },
    { id: 'fee-paid',                     channel: 'email', to: 'applicant',    subject: 'Cancellation Document Issued — HOE (TPI) Registration (Ref: %ApplicationNumber%)', body: 'Dear %CompanyName%,\n\nYour Cancellation has been processed. The Cancellation document (with QR code and DOE stamp) is now available in your DOE Unified Service Portal account.\n\nApplication Reference: %ApplicationNumber%\n\nBest regards,\nDepartment of Energy — PPS Team' },
  ],

  sla: [
    { stage: 'Cancellation submission', role: 'applicant',    days: 0 },
    { stage: 'PPS Engineer review',     role: 'engineer',     days: 10 },
    { stage: 'Section Head decision',   role: 'section_head', days: 5 },
    { stage: 'Director final decision', role: 'director',     days: 2 },
  ],
};
