import type { ServiceDefinition } from '../../types';

// ============================================================================
// MAES — CANCELLATION of Material and Equipment Approval (MAES)
// Source: "MAES Enhancements SDD" §4 (Cancellation Enhancements)
//
// • Three-tier review: PPS Engineer → PPS Section Head → PPS Director.
// • Operates at material-row level:
//      - Partial cancellation — only selected materials are cancelled. The
//        MAES certificate is regenerated with the remaining materials and the
//        certificate expiry recalculated as MAX(remaining material expiry).
//      - Full cancellation — every material is cancelled, the MAES certificate
//        moves to "Cancelled" status, and a Cancellation Certificate is issued.
// • Mandatory Cancellation Reason; supporting documents optional.
// • Reject / Return for Modification available at every reviewer level.
// • Configurable payment step (0 AED pending ADEO approval).
// • Output:
//      - Partial → regenerated MAES Certificate (reduced material list) with
//        QR + DoE stamp; original reference number retained.
//      - Full    → Cancellation Certificate with QR + DoE stamp; MAES moves
//        to Cancelled.
// ============================================================================

export const maesCancelService: ServiceDefinition = {
  id: 'maes.cancel',
  module: 'maes',
  action: 'cancel',
  title: 'Cancellation of Material and Equipment Approval (MAES)',
  shortTitle: 'MAES Cancel',
  description:
    'Cancel an active MAES certificate fully, or cancel only selected material rows (partial cancellation). Three-tier review (Engineer → Section Head → Director); 0 AED fee (configurable); partial cancellation regenerates the certificate with the remaining materials, full cancellation issues a Cancellation Certificate.',
  initialState: 'draft',
  feeAmount: 0,
  certificateValidityYears: 0,

  states: [
    { id: 'draft',                 label: 'Draft',                       category: 'draft',     ownerRole: 'applicant' },
    { id: 'pending_engineer',      label: 'Under Review',                category: 'pending',   ownerRole: 'engineer' },
    { id: 'returned_to_applicant', label: 'Returned for Modification',   category: 'returned',  ownerRole: 'applicant' },
    { id: 'pending_section_head',  label: 'Pending Section Head',        category: 'pending',   ownerRole: 'section_head' },
    { id: 'returned_to_engineer',  label: 'Sent Back to Engineer',       category: 'returned',  ownerRole: 'engineer' },
    { id: 'pending_director',      label: 'Pending Director',            category: 'pending',   ownerRole: 'director' },
    { id: 'returned_to_sh',        label: 'Sent Back to Section Head',   category: 'returned',  ownerRole: 'section_head' },
    { id: 'fee_pending',           label: 'Approved · Payment Pending',  category: 'payment',   ownerRole: 'applicant' },
    { id: 'issued',                label: 'Cancelled',                   category: 'issued' },
    { id: 'rejected',              label: 'Application Rejected',        category: 'rejected' },
  ],

  transitions: [
    { id: 'save-draft', label: 'Save', from: 'draft', to: 'draft', allowedRoles: ['applicant'], variant: 'secondary' },
    { id: 'submit',     label: 'Submit',                       from: ['draft', 'returned_to_applicant'], to: 'pending_engineer',     allowedRoles: ['applicant'],    variant: 'primary',  notifications: ['ack-applicant', 'notify-engineer'] },

    { id: 'engineer-return',  label: 'Return for Modification', from: 'pending_engineer',     to: 'returned_to_applicant', allowedRoles: ['engineer'],     variant: 'warning', requiresComment: true, commentLabel: 'What needs to change?',     notifications: ['return-applicant'] },
    { id: 'engineer-reject',  label: 'Reject',                  from: 'pending_engineer',     to: 'rejected',              allowedRoles: ['engineer'],     variant: 'danger',  requiresComment: true, commentLabel: 'Reason for rejection',      notifications: ['reject-applicant'] },
    { id: 'engineer-approve', label: 'Approve & Forward to Section Head', from: 'pending_engineer', to: 'pending_section_head', allowedRoles: ['engineer'], variant: 'success', notifications: ['notify-section-head'] },

    { id: 'sh-return-engineer', label: 'Return to Engineer',          from: 'pending_section_head', to: 'returned_to_engineer',  allowedRoles: ['section_head'], variant: 'warning', requiresComment: true, commentLabel: 'Information needed from Engineer', notifications: ['notify-engineer-more-info'] },
    { id: 'sh-reject',          label: 'Reject',                       from: 'pending_section_head', to: 'rejected',              allowedRoles: ['section_head'], variant: 'danger',  requiresComment: true, commentLabel: 'Reason for rejection',             notifications: ['reject-applicant'] },
    { id: 'sh-approve',         label: 'Approve & Forward to Director', from: 'pending_section_head', to: 'pending_director',     allowedRoles: ['section_head'], variant: 'success', notifications: ['notify-director'] },

    { id: 'eng-resubmit-to-sh', label: 'Re-endorse to Section Head', from: 'returned_to_engineer', to: 'pending_section_head', allowedRoles: ['engineer'], variant: 'success', requiresComment: true, commentLabel: 'Notes for Section Head', notifications: ['notify-section-head'] },

    { id: 'dir-return-sh', label: 'Return to Section Head', from: 'pending_director', to: 'returned_to_sh',     allowedRoles: ['director'], variant: 'warning', requiresComment: true, commentLabel: 'Information needed from Section Head', notifications: ['notify-sh-more-info'] },
    { id: 'dir-reject',    label: 'Reject',                  from: 'pending_director', to: 'rejected',            allowedRoles: ['director'], variant: 'danger',  requiresComment: true, commentLabel: 'Reason for rejection',                 notifications: ['reject-applicant'] },
    { id: 'dir-approve',   label: 'Final Approve · Request Fee Payment', from: 'pending_director', to: 'fee_pending', allowedRoles: ['director'], variant: 'success', notifications: ['approve-applicant'] },

    { id: 'sh-resubmit-to-dir', label: 'Re-endorse to Director', from: 'returned_to_sh', to: 'pending_director', allowedRoles: ['section_head'], variant: 'success', requiresComment: true, commentLabel: 'Notes for Director', notifications: ['notify-director'] },

    { id: 'pay-fee', label: 'Pay Fee · Issue Cancellation', from: 'fee_pending', to: 'issued', allowedRoles: ['applicant'], variant: 'primary', notifications: ['fee-paid'] },
  ],

  form: [
    {
      id: 'maes-reference',
      title: 'MAES Reference',
      description: 'Pre-populated from the active MAES being cancelled.',
      fields: [
        { id: 'maesNumber',        label: 'MAES Reference Number',       type: 'readonly' },
        { id: 'applicantType',     label: 'Applicant Type',              type: 'readonly' },
        { id: 'businessName',      label: 'Business Name',               type: 'readonly' },
        { id: 'tradeLicence',      label: 'Trade Licence Number',        type: 'readonly' },
        { id: 'representativeName',label: 'Representative Name',         type: 'readonly' },
        { id: 'email',             label: 'Email Address',               type: 'readonly' },
        { id: 'mobile',            label: 'Mobile No.',                  type: 'readonly' },
        { id: 'currentExpiry',     label: 'Current Certificate Expiry',  type: 'readonly' },
      ],
      attachments: [],
    },
    {
      id: 'cancellation-scope',
      title: 'Cancellation Scope',
      description: 'Choose whether you are cancelling specific material rows (partial) or the entire MAES certificate (full). Partial cancellation regenerates the MAES certificate with the remaining materials; full cancellation issues a Cancellation Certificate.',
      fields: [
        { id: 'cancellationScope', label: 'Cancellation Scope', type: 'radio', required: true, options: [
          { value: 'partial', label: 'Partial — cancel selected materials only' },
          { value: 'full',    label: 'Full — cancel the entire MAES certificate' },
        ]},
        { id: 'cancellationReason', label: 'Cancellation Reason', type: 'textarea', required: true, remark: 'Mandatory. Briefly describe why the materials are being cancelled.' },
      ],
      attachments: [],
    },
    {
      id: 'systems-equipments',
      title: 'Systems & Equipments · Cancelled Materials',
      description:
        'For partial cancellation, select the specific material rows to be cancelled — the remaining materials stay on the regenerated certificate. For full cancellation, all materials are flagged for cancellation. Per-material expiry is recalculated for the remaining set.',
      fields: [
        { id: 'totalMaterials',    label: 'Total materials on active certificate',  type: 'readonly' },
        { id: 'cancelledCount',    label: 'Materials being cancelled',              type: 'readonly' },
        { id: 'remainingCount',    label: 'Materials remaining on certificate',     type: 'readonly' },
        { id: 'maxExpiryDate',     label: 'Recalculated Certificate Expiry (MAX of remaining material expiry dates)', type: 'readonly' },
      ],
      attachments: [
        { id: 'supportingDocs',    label: 'Supporting Documents — discontinuation letter / safety notice / replacement evidence (PDF / JPG / PNG)', required: false },
        { id: 'others',            label: 'Others — any supporting document (with description)', required: false },
      ],
    },
  ],

  notifications: [
    { id: 'ack-applicant',             channel: 'email', to: 'applicant',    subject: 'Cancellation of MAES — Application Received (Ref: %ApplicationNumber%)', body: 'Dear %CompanyName%,\n\nWe confirm receipt of your application for the Cancellation of Material and Equipment Approval (MAES). Application Reference: %ApplicationNumber%. Status: Under Review.\n\nBest regards,\nDepartment of Energy — PPS Team' },
    { id: 'notify-engineer',           channel: 'email', to: 'engineer',     subject: 'Review MAES Cancellation Application — %CompanyName%', body: 'Dear PPS Engineer,\n\n%CompanyName% has submitted a MAES Cancellation application. Reference: %ApplicationNumber%. Please log in to review.\n\nBest regards,\nDepartment of Energy — PPS Team' },
    { id: 'return-applicant',          channel: 'email', to: 'applicant',    subject: 'More Information Required — MAES Cancellation (Ref: %ApplicationNumber%)', body: 'Dear %CompanyName%,\n\nYour MAES Cancellation application has been returned for modification.\n\nComments: %Comments%\n\nPlease log in to update and re-submit, attaching any new files along with an explanatory comment.\n\nBest regards,\nDepartment of Energy — PPS Team' },
    { id: 'notify-section-head',       channel: 'email', to: 'section_head', subject: 'Approval Required — MAES Cancellation — %CompanyName%', body: 'Dear PPS Section Head,\n\nThe MAES Cancellation application from %CompanyName% (Ref: %ApplicationNumber%) has been approved by the PPS Engineer and is forwarded for your review.\n\nBest regards,\nDepartment of Energy — PPS Team' },
    { id: 'notify-engineer-more-info', channel: 'email', to: 'engineer',     subject: 'Additional Information Requested — MAES Cancellation — %CompanyName%', body: 'Dear PPS Engineer,\n\nThe Section Head has requested additional information on MAES Cancellation application %ApplicationNumber%.\n\nComments: %Comments%\n\nBest regards,\nDepartment of Energy — PPS Team' },
    { id: 'notify-director',           channel: 'email', to: 'director',     subject: 'Final Approval Required — MAES Cancellation — %CompanyName%', body: 'Dear PPS Director,\n\nThe MAES Cancellation application from %CompanyName% (Ref: %ApplicationNumber%) has been approved by the Section Head and is forwarded for your final approval.\n\nBest regards,\nDepartment of Energy — PPS Team' },
    { id: 'notify-sh-more-info',       channel: 'email', to: 'section_head', subject: 'Additional Information Requested — MAES Cancellation — %CompanyName%', body: 'Dear PPS Section Head,\n\nThe Director has requested additional information on MAES Cancellation application %ApplicationNumber%.\n\nComments: %Comments%\n\nBest regards,\nDepartment of Energy — PPS Team' },
    { id: 'reject-applicant',          channel: 'email', to: 'applicant',    subject: 'Rejection — MAES Cancellation (Ref: %ApplicationNumber%)', body: 'Dear %CompanyName%,\n\nYour MAES Cancellation application has been rejected.\n\nReason: %Comments%\n\nBest regards,\nDepartment of Energy — PPS Team' },
    { id: 'approve-applicant',         channel: 'email', to: 'applicant',    subject: 'MAES Cancellation Approved — Payment Pending (Ref: %ApplicationNumber%)', body: 'Dear %CompanyName%,\n\nYour MAES Cancellation application has been approved by the PPS Director. Please log in to complete the payment and receive the cancellation document.\n\nBest regards,\nDepartment of Energy — PPS Team' },
    { id: 'fee-paid',                  channel: 'email', to: 'applicant',    subject: 'MAES Cancellation Issued (Ref: %ApplicationNumber%)', body: 'Dear %CompanyName%,\n\nYour MAES Cancellation has been processed. For partial cancellations the MAES certificate has been regenerated with the remaining materials (original reference retained); for full cancellations a Cancellation Certificate has been issued and the MAES status is now Cancelled. Please log in to download the PDF.\n\nBest regards,\nDepartment of Energy — PPS Team' },
  ],

  sla: [
    { stage: 'PPS Engineer review',  role: 'engineer',     days: 10 },
    { stage: 'Section Head review',  role: 'section_head', days: 5 },
    { stage: 'Director review',      role: 'director',     days: 5 },
  ],
};
