import type { ServiceDefinition } from '../../types';

// ============================================================================
// MAES — MODIFICATION of Material and Equipment Approval (MAES) for Gas Systems
// Source: "MAES Enhancements SDD" §3 (Modification Enhancements)
//
// • Three-tier review: PPS Engineer → PPS Section Head → PPS Director.
// • Operates at material-row level:
//      - Update existing material (data sheet, drawings, expiry date, etc.).
//      - Add brand-new material rows under the same certificate.
//      - Remove obsolete material rows (with reason).
// • Original MAES reference number is retained. Per-material expiry dates
//   may be revised; certificate expiry recalculated as MAX(material expiry).
// • Reject / Return for Modification available at every reviewer level.
// • Configurable payment step (0 AED pending ADEO approval).
// • Output: regenerated MAES Certificate (PDF · QR · DoE stamp) reflecting
//   the modified material list and recalculated expiry; original reference
//   number retained.
// ============================================================================

export const maesModifyService: ServiceDefinition = {
  id: 'maes.modify',
  module: 'maes',
  action: 'modify',
  title: 'Modification of Material and Equipment Approval (MAES)',
  shortTitle: 'MAES Modify',
  description:
    'Modify an active MAES certificate at the material-row level — update existing materials, add new materials, or remove obsolete materials. Three-tier review (Engineer → Section Head → Director); 0 AED fee (configurable); original MAES reference number retained.',
  initialState: 'draft',
  feeAmount: 0,
  certificateValidityYears: 1,

  states: [
    { id: 'draft',                 label: 'Draft',                       category: 'draft',     ownerRole: 'applicant' },
    { id: 'pending_engineer',      label: 'Under Review',                category: 'pending',   ownerRole: 'engineer' },
    { id: 'returned_to_applicant', label: 'Returned for Modification',   category: 'returned',  ownerRole: 'applicant' },
    { id: 'pending_section_head',  label: 'Pending Section Head',        category: 'pending',   ownerRole: 'section_head' },
    { id: 'returned_to_engineer',  label: 'Sent Back to Engineer',       category: 'returned',  ownerRole: 'engineer' },
    { id: 'pending_director',      label: 'Pending Director',            category: 'pending',   ownerRole: 'director' },
    { id: 'returned_to_sh',        label: 'Sent Back to Section Head',   category: 'returned',  ownerRole: 'section_head' },
    { id: 'fee_pending',           label: 'Approved · Payment Pending',  category: 'payment',   ownerRole: 'applicant' },
    { id: 'issued',                label: 'Approved · Updated MAES Issued', category: 'issued' },
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

    { id: 'pay-fee', label: 'Pay Fee · Issue Updated Certificate', from: 'fee_pending', to: 'issued', allowedRoles: ['applicant'], variant: 'primary', notifications: ['fee-paid'] },
  ],

  form: [
    {
      id: 'maes-reference',
      title: 'MAES Reference',
      description: 'Pre-populated from the active MAES being modified. Reference number is retained.',
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
      id: 'modification-scope',
      title: 'Modification Scope',
      description: 'Describe the modifications being requested. The reviewer uses this summary to triage the change against the linked materials.',
      fields: [
        { id: 'modificationType',  label: 'Modification Type', type: 'multiselect', required: true, options: [
          { value: 'add',    label: 'Add new material(s)' },
          { value: 'update', label: 'Update existing material(s)' },
          { value: 'remove', label: 'Remove obsolete material(s)' },
        ]},
        { id: 'modificationReason', label: 'Reason for Modification', type: 'textarea', required: true, remark: 'Mandatory. Briefly describe what is changing and why.' },
      ],
      attachments: [],
    },
    {
      id: 'systems-equipments',
      title: 'Systems & Equipments · Modified Set',
      description:
        'Manage the material list — edit, add, or remove rows. Each row has its own expiry date; the certificate-level expiry is automatically recalculated as the maximum of all material expiry dates. Removed rows are kept for audit purposes with the removal reason.',
      fields: [
        { id: 'equipmentCount',    label: 'Number of materials / equipment items after modification', type: 'readonly' },
        { id: 'maxExpiryDate',     label: 'Recalculated Certificate Expiry (MAX of material expiry dates)', type: 'readonly' },
        { id: 'addedCount',        label: 'Added materials',   type: 'readonly' },
        { id: 'updatedCount',      label: 'Updated materials', type: 'readonly' },
        { id: 'removedCount',      label: 'Removed materials', type: 'readonly' },
      ],
      attachments: [
        { id: 'updatedCoc',        label: 'Updated Certificate of Technical Conformity / Type Examination / CE Marking (per added or updated material)', required: true },
        { id: 'updatedMtc',        label: 'Updated Material Test Certificates (MTCs) for added or updated materials',                                    required: true },
        { id: 'oemProfile',        label: 'OEM Company Profile (per added or substantially updated material)',                                            required: false },
        { id: 'complianceSheet',   label: 'Signed & endorsed Compliance Sheet vs. Unified Gas Code (per added or updated material)',                      required: true },
        { id: 'removalEvidence',   label: 'Removal evidence — discontinuation / replacement letter (per removed material)',                                required: false },
        { id: 'others',            label: 'Others — any supporting document (with description)',                                                          required: false },
      ],
    },
  ],

  notifications: [
    { id: 'ack-applicant',             channel: 'email', to: 'applicant',    subject: 'Modification of MAES — Application Received (Ref: %ApplicationNumber%)', body: 'Dear %CompanyName%,\n\nWe confirm receipt of your application for the Modification of Material and Equipment Approval (MAES). Application Reference: %ApplicationNumber%. Status: Under Review.\n\nBest regards,\nDepartment of Energy — PPS Team' },
    { id: 'notify-engineer',           channel: 'email', to: 'engineer',     subject: 'Review MAES Modification Application — %CompanyName%', body: 'Dear PPS Engineer,\n\n%CompanyName% has submitted a MAES Modification application. Reference: %ApplicationNumber%. Please log in to review.\n\nBest regards,\nDepartment of Energy — PPS Team' },
    { id: 'return-applicant',          channel: 'email', to: 'applicant',    subject: 'More Information Required — MAES Modification (Ref: %ApplicationNumber%)', body: 'Dear %CompanyName%,\n\nYour MAES Modification application has been returned for modification.\n\nComments: %Comments%\n\nPlease log in to update and re-submit, attaching any new files along with an explanatory comment.\n\nBest regards,\nDepartment of Energy — PPS Team' },
    { id: 'notify-section-head',       channel: 'email', to: 'section_head', subject: 'Approval Required — MAES Modification — %CompanyName%', body: 'Dear PPS Section Head,\n\nThe MAES Modification application from %CompanyName% (Ref: %ApplicationNumber%) has been approved by the PPS Engineer and is forwarded for your review.\n\nBest regards,\nDepartment of Energy — PPS Team' },
    { id: 'notify-engineer-more-info', channel: 'email', to: 'engineer',     subject: 'Additional Information Requested — MAES Modification — %CompanyName%', body: 'Dear PPS Engineer,\n\nThe Section Head has requested additional information on MAES Modification application %ApplicationNumber%.\n\nComments: %Comments%\n\nBest regards,\nDepartment of Energy — PPS Team' },
    { id: 'notify-director',           channel: 'email', to: 'director',     subject: 'Final Approval Required — MAES Modification — %CompanyName%', body: 'Dear PPS Director,\n\nThe MAES Modification application from %CompanyName% (Ref: %ApplicationNumber%) has been approved by the Section Head and is forwarded for your final approval.\n\nBest regards,\nDepartment of Energy — PPS Team' },
    { id: 'notify-sh-more-info',       channel: 'email', to: 'section_head', subject: 'Additional Information Requested — MAES Modification — %CompanyName%', body: 'Dear PPS Section Head,\n\nThe Director has requested additional information on MAES Modification application %ApplicationNumber%.\n\nComments: %Comments%\n\nBest regards,\nDepartment of Energy — PPS Team' },
    { id: 'reject-applicant',          channel: 'email', to: 'applicant',    subject: 'Rejection — MAES Modification (Ref: %ApplicationNumber%)', body: 'Dear %CompanyName%,\n\nYour MAES Modification application has been rejected.\n\nReason: %Comments%\n\nBest regards,\nDepartment of Energy — PPS Team' },
    { id: 'approve-applicant',         channel: 'email', to: 'applicant',    subject: 'MAES Modification Approved — Payment Pending (Ref: %ApplicationNumber%)', body: 'Dear %CompanyName%,\n\nYour MAES Modification application has been approved by the PPS Director. Please log in to complete the payment and receive your updated certificate.\n\nBest regards,\nDepartment of Energy — PPS Team' },
    { id: 'fee-paid',                  channel: 'email', to: 'applicant',    subject: 'Updated MAES Certificate Issued (Ref: %ApplicationNumber%)', body: 'Dear %CompanyName%,\n\nYour updated MAES Registration Certificate has been issued. The original MAES reference number is retained. The Certificate Expiry Date (derived as MAX of all per-material expiry dates) is %CertificateExpiryDate%. Please log in to download the PDF.\n\nBest regards,\nDepartment of Energy — PPS Team' },
  ],

  sla: [
    { stage: 'PPS Engineer review',  role: 'engineer',     days: 10 },
    { stage: 'Section Head review',  role: 'section_head', days: 5 },
    { stage: 'Director review',      role: 'director',     days: 5 },
  ],
};
