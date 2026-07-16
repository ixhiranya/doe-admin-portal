import type { ServiceDefinition } from '../../types';

// ============================================================================
// MAES — ISSUANCE of Material and Equipment Approval System (MAES) for Gas Systems
// Source: "MAES Enhancements SDD" §1 (Issuance Enhancements)
//
// • Three-tier review: PPS Engineer → PPS Section Head → PPS Director.
// • Applicant Type now includes Distributor in addition to Agent / Manufacturer.
// • Expiry-date model is per-material; certificate expiry = MAX(material expiry).
// • Reviewer has explicit Reject action (in addition to Approve / Return).
// • Configurable payment step (currently 0 AED pending ADEO approval).
// • Certificate output: PDF with QR code + DoE stamp; lists every approved
//   material with its individual per-material expiry date.
// ============================================================================

export const maesIssueService: ServiceDefinition = {
  id: 'maes.issue',
  module: 'maes',
  action: 'issue',
  title: 'Issuance of Material and Equipment Approval (MAES)',
  shortTitle: 'MAES Issue',
  description:
    'Apply to register materials & equipment for use in gas systems (Agent / Manufacturer / Distributor). Three-tier review with per-material expiry dates; 0 AED fee (configurable).',
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
    { id: 'issued',                label: 'Issued',                      category: 'issued' },
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

    { id: 'pay-fee', label: 'Pay Fee', from: 'fee_pending', to: 'issued', allowedRoles: ['applicant'], variant: 'primary', notifications: ['fee-paid'] },
  ],

  form: [
    {
      id: 'main-info',
      title: 'Main Info',
      description:
        'Applicant identity, business licence, and contact details. Select whether you are an Agent, Manufacturer, or Distributor — the form behaves identically across the three.',
      fields: [
        { id: 'applicantType',     label: 'Are you an Agent, Manufacturer or Distributor?', type: 'select', required: true, options: [
          { value: 'agent',        label: 'Agent' },
          { value: 'manufacturer', label: 'Manufacturer' },
          { value: 'distributor', label: 'Distributor' },
        ]},
        { id: 'applicationDate',   label: 'Application Date',    type: 'date',  required: true },
        { id: 'activityArea',      label: 'Activity Area',       type: 'text',  required: true },
        { id: 'fileNumber',        label: 'File Number',         type: 'text',  required: true },
        { id: 'businessName',      label: 'Business Name',       type: 'text',  required: true },
        { id: 'tradeLicence',      label: 'Trade Licence Number',type: 'text',  required: true },
        { id: 'licensedBy',        label: 'Licensed By',          type: 'text', required: true },
        { id: 'businessStartDate', label: 'Business Start Date', type: 'date',  required: true },
        { id: 'businessType',      label: 'Business Type',       type: 'text',  required: true },
        { id: 'representativeName',label: 'Representative Name', type: 'text',  required: true },
        { id: 'nationality',       label: 'Nationality',          type: 'text', required: true },
        { id: 'mobile',            label: 'Mobile No.',          type: 'text',  required: true },
        { id: 'address',           label: 'Address',             type: 'text',  required: true },
        { id: 'addressDetail',     label: 'Address in Detail',   type: 'text',  required: true },
        { id: 'phone',             label: 'Phone',               type: 'text',  required: false },
        { id: 'email',             label: 'Email Address',       type: 'text',  required: true },
        { id: 'fax',               label: 'Fax No.',             type: 'text',  required: false },
        { id: 'poBox',             label: 'P.O. Box',            type: 'text',  required: false },
        { id: 'establishmentDate', label: 'Establishment Date',  type: 'date',  required: true },
      ],
      attachments: [
        { id: 'cocTechnical', label: 'Certificate of Technical Conformity / Type Examination / CE Marking (incl. House-of-Expertise Compliance Letter)', required: true },
        { id: 'mtc',          label: 'Materials & Equipment Test Certificates (MTCs) with data sheets & drawings',                                       required: true },
        { id: 'refList',      label: 'Reference List — previously supplied equipment with PO copies',                                                     required: true },
        { id: 'inspReports',  label: 'Approved Material Inspection Reports — internationally / locally approved laboratories',                            required: true },
        { id: 'iso',          label: 'HSE Management Systems — ISO 9001 / 45001 / 14001 certificates',                                                    required: false },
        { id: 'prevPreQual',  label: 'Previous local Pre-Qualification & registration',                                                                   required: false },
        { id: 'icv',          label: 'ICV (In-Country Value) Certificate',                                                                                required: false },
        { id: 'others',       label: 'Others — any supporting document (with description)',                                                              required: false },
      ],
    },
    {
      id: 'systems-equipments',
      title: 'Systems & Equipments',
      description:
        'Add every material / equipment item to be registered. Each row captures its own Expiry Date — the certificate-level expiry date is automatically calculated as the maximum of all material expiry dates.',
      fields: [
        { id: 'equipmentCount',  label: 'Number of materials / equipment items', type: 'readonly' },
        { id: 'maxExpiryDate',   label: 'Calculated Certificate Expiry (MAX of material expiry dates)', type: 'readonly' },
      ],
      attachments: [
        { id: 'oemProfile',      label: 'OEM Company Profile — offices, manufacturing & testing facilities (per equipment)', required: true },
        { id: 'complianceSheet', label: 'Signed & endorsed Compliance Sheet vs. Unified Gas Code (per equipment)',            required: true },
      ],
    },
  ],

  notifications: [
    { id: 'ack-applicant',             channel: 'email', to: 'applicant',    subject: 'Issuance of MAES — Application Received (Ref: %ApplicationNumber%)', body: 'Dear %CompanyName%,\n\nWe confirm receipt of your application for Issuance of Material and Equipment Approval (MAES). Application Reference: %ApplicationNumber%. Status: Under Review.\n\nBest regards,\nDepartment of Energy — PPS Team' },
    { id: 'notify-engineer',           channel: 'email', to: 'engineer',     subject: 'Review MAES Issuance Application — %CompanyName%', body: 'Dear PPS Engineer,\n\n%CompanyName% has submitted a MAES Issuance application. Reference: %ApplicationNumber%. Please log in to review.\n\nBest regards,\nDepartment of Energy — PPS Team' },
    { id: 'return-applicant',          channel: 'email', to: 'applicant',    subject: 'More Information Required — MAES Issuance (Ref: %ApplicationNumber%)', body: 'Dear %CompanyName%,\n\nYour MAES Issuance application has been returned for modification.\n\nComments: %Comments%\n\nPlease log in to update and re-submit, attaching any new files along with an explanatory comment.\n\nBest regards,\nDepartment of Energy — PPS Team' },
    { id: 'notify-section-head',       channel: 'email', to: 'section_head', subject: 'Approval Required — MAES Issuance — %CompanyName%', body: 'Dear PPS Section Head,\n\nThe MAES Issuance application from %CompanyName% (Ref: %ApplicationNumber%) has been approved by the PPS Engineer and is forwarded for your review.\n\nBest regards,\nDepartment of Energy — PPS Team' },
    { id: 'notify-engineer-more-info', channel: 'email', to: 'engineer',     subject: 'Additional Information Requested — MAES Issuance — %CompanyName%', body: 'Dear PPS Engineer,\n\nThe Section Head has requested additional information on MAES Issuance application %ApplicationNumber%.\n\nComments: %Comments%\n\nBest regards,\nDepartment of Energy — PPS Team' },
    { id: 'notify-director',           channel: 'email', to: 'director',     subject: 'Final Approval Required — MAES Issuance — %CompanyName%', body: 'Dear PPS Director,\n\nThe MAES Issuance application from %CompanyName% (Ref: %ApplicationNumber%) has been approved by the Section Head and is forwarded for your final approval.\n\nBest regards,\nDepartment of Energy — PPS Team' },
    { id: 'notify-sh-more-info',       channel: 'email', to: 'section_head', subject: 'Additional Information Requested — MAES Issuance — %CompanyName%', body: 'Dear PPS Section Head,\n\nThe Director has requested additional information on MAES Issuance application %ApplicationNumber%.\n\nComments: %Comments%\n\nBest regards,\nDepartment of Energy — PPS Team' },
    { id: 'reject-applicant',          channel: 'email', to: 'applicant',    subject: 'Rejection — MAES Issuance (Ref: %ApplicationNumber%)', body: 'Dear %CompanyName%,\n\nYour MAES Issuance application has been rejected.\n\nReason: %Comments%\n\nBest regards,\nDepartment of Energy — PPS Team' },
    { id: 'approve-applicant',         channel: 'email', to: 'applicant',    subject: 'MAES Issuance Approved — Payment Pending (Ref: %ApplicationNumber%)', body: 'Dear %CompanyName%,\n\nYour MAES Issuance application has been approved by the PPS Director. Please log in to complete the payment and receive your certificate.\n\nBest regards,\nDepartment of Energy — PPS Team' },
    { id: 'fee-paid',                  channel: 'email', to: 'applicant',    subject: 'MAES Registration Certificate Issued (Ref: %ApplicationNumber%)', body: 'Dear %CompanyName%,\n\nYour MAES Registration Certificate has been issued. The Certificate Expiry Date (derived as MAX of all per-material expiry dates) is %CertificateExpiryDate%. Please log in to download the PDF.\n\nBest regards,\nDepartment of Energy — PPS Team' },
  ],

  sla: [
    { stage: 'PPS Engineer review',  role: 'engineer',     days: 10 },
    { stage: 'Section Head review',  role: 'section_head', days: 5 },
    { stage: 'Director review',      role: 'director',     days: 5 },
  ],
};
