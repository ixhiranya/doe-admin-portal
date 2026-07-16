import type { ServiceDefinition } from '../../types';

// ============================================================================
// HOE / TPI — REGISTRATION MODIFICATION
// Source: "HOE TPI Registration Enhancements SDD" §2 (Modification)
//
// Available only on an ACTIVE TPI Registration. Modified fields are
// visually highlighted for the DOE reviewer. Adding a Pre-Qualification
// category triggers engineer-count re-validation against the new category.
// ============================================================================

export const hoeModifyService: ServiceDefinition = {
  id: 'hoe.modify',
  module: 'hoe',
  action: 'modify',
  title: 'Modification of HOE (TPI) Registration',
  shortTitle: 'HOE Modify',
  description:
    'Modify an active Third Party Inspection Company Registration — change scope, category set, engineers, or other details.',
  initialState: 'draft',
  feeAmount: 2500,
  certificateValidityYears: 1,

  states: [
    { id: 'draft',                    label: 'Draft',                      category: 'draft',     ownerRole: 'applicant' },
    { id: 'pending_engineer',         label: 'Under Review',               category: 'pending',   ownerRole: 'engineer' },
    { id: 'returned_to_applicant',    label: 'Requested for More Info',    category: 'returned',  ownerRole: 'applicant' },
    { id: 'pending_section_head',     label: 'Pending Section Head',       category: 'pending',   ownerRole: 'section_head' },
    { id: 'pending_director',         label: 'Pending Director',           category: 'pending',   ownerRole: 'director' },
    { id: 'returned_to_engineer',     label: 'Sent Back to Engineer',      category: 'returned',  ownerRole: 'engineer' },
    { id: 'returned_to_section_head', label: 'Sent Back to Section Head',  category: 'returned',  ownerRole: 'section_head' },
    { id: 'fee_pending',              label: 'Approved · Payment Pending', category: 'payment',   ownerRole: 'applicant' },
    { id: 'issued',                   label: 'Modified',                   category: 'issued' },
    { id: 'rejected',                 label: 'Application Rejected',       category: 'rejected' },
    { id: 'cancelled',                label: 'Cancelled',                  category: 'cancelled' },
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

    { id: 'pay-fee',                 label: 'Pay Fee',                              from: 'fee_pending',                      to: 'issued',                   allowedRoles: ['applicant'],    variant: 'primary', notifications: ['fee-paid'] },
  ],

  form: [
    {
      id: 'company-info',
      title: 'Company Information',
      description: 'Pre-populated from the latest issued TPI Registration. Modified fields are highlighted for the DOE reviewer.',
      fields: [
        {
          id: 'category',
          label: 'Pre-Qualification Category',
          type: 'select',
          required: true,
          options: [
            { value: 'A', label: 'Central Gas Systems' },
            { value: 'B', label: 'Petroleum Products Transportation Vehicles' },
            { value: 'C', label: 'Petroleum Products Storage Facilities' },
          ],
        },
        { id: 'companyLicense',    label: 'Company Commercial Permit',         type: 'readonly' },
        { id: 'companyName',       label: "Establishment's Commercial Name",   type: 'readonly' },
        { id: 'ownerName',         label: 'Company Owner Name',                type: 'readonly' },
        { id: 'nationality',       label: 'Nationality',                       type: 'readonly' },
        { id: 'representative',    label: 'Company Authorized Representative', type: 'readonly' },
        { id: 'businessActivity',  label: 'Business Activity',                 type: 'readonly' },
        { id: 'legalStatus',       label: 'Legal Status',                      type: 'readonly' },
        { id: 'establishmentDate', label: 'Establishment Date',                type: 'readonly' },
        { id: 'permitIssueDate',   label: 'Trade Permit Issue Date',           type: 'date' },
        { id: 'permitExpiryDate',  label: 'Trade Permit Expiry Date',          type: 'date' },
        { id: 'permitType',        label: 'Permit Type',                       type: 'readonly' },
        { id: 'address',           label: 'Address',                           type: 'text' },
        { id: 'poBox',             label: 'PO Box',                            type: 'text' },
        { id: 'phone',             label: 'Phone Number',                      type: 'text' },
        { id: 'email',             label: 'Email Address',                     type: 'text' },
        { id: 'website',           label: 'Website',                           type: 'text' },
        { id: 'branchAddress',     label: 'Branch Office Address',             type: 'textarea' },
        { id: 'areaOfOperations',  label: 'Area of Operations',                type: 'text', required: true },
      ],
      attachments: [
        { id: 'articlesOfAssociation', label: 'Attested Company Articles of Association',                       required: true },
        { id: 'officeContract',        label: 'Attested rent / ownership contract — Office Facilities',         required: true },
        { id: 'adcdaIstifa',           label: 'ADCDA ISTIFAA Certificate for company offices',                  required: true },
        { id: 'molList',               label: 'Ministry of Labor (MoL) List',                                   required: true },
        { id: 'assetRegister',         label: 'Asset Register of Tools and Equipment',                          required: true },
        { id: 'priorRegistrations',    label: 'Previous UAE / Abu Dhabi Pre-qualifications and Registrations',  required: false },
        { id: 'accreditation',         label: 'Local & International Accreditation (ENAS, AD-QCC, others)',     required: true },
        { id: 'auditReports',          label: 'Financial and Quality Audit Reports — last 3 years',             required: false },
        { id: 'iso9001',               label: 'Certifications for Quality Management Systems (ISO 9001)',       required: true },
      ],
    },
    {
      id: 'tech-staff',
      title: 'Engineer Details',
      description: 'Pre-populated. Add or update engineers; new categories require minimum 2 engineers each with ≥10 years experience.',
      fields: [],
      repeatable: {
        itemLabel: 'Engineer',
        minCount: { fromCategory: { A: { engineers: 2 }, B: { engineers: 2 }, C: { engineers: 2 } } },
        perItemAttachments: [
          { id: 'laborCard',       label: 'Labor Card',                              required: true },
          { id: 'equivalency',     label: 'UAE Equivalency Certificates',            required: true },
          { id: 'education',       label: 'Educational Certificates',                required: true },
          { id: 'passport',        label: 'Passport Copy',                           required: true },
          { id: 'emiratesId',      label: 'Copy of Emirates ID',                     required: true },
          { id: 'cv',              label: 'Curriculum Vitae',                        required: true },
          { id: 'experience',      label: 'Experience Certificates',                 required: true },
          { id: 'doeRegistration', label: 'Engineer Registration Approval (DoE)',    required: true },
          { id: 'training',        label: 'Training Certificates',                   required: false },
        ],
      },
    },
    {
      id: 'ref-projects',
      title: 'Reference Projects',
      description: 'Pre-populated. New projects can be added; existing ones cannot be deleted.',
      fields: [],
      repeatable: {
        itemLabel: 'Project',
        perItemAttachments: [
          { id: 'cocProject',  label: 'CoC for the Project',    required: true },
          { id: 'poAgreement', label: 'Copy of PO / Agreement', required: true },
        ],
      },
    },
  ],

  notifications: [
    { id: 'ack-applicant',                channel: 'email', to: 'applicant',    subject: 'Modification of HOE (TPI) Registration — Application Received (Ref: %ApplicationNumber%)', body: 'Dear %CompanyName%,\n\nWe confirm receipt of your application for the Modification of HOE (TPI) Registration.\n\nApplication Reference: %ApplicationNumber%\nStatus: Under Review\n\nBest regards,\nDepartment of Energy — PPS Team' },
    { id: 'notify-engineer',              channel: 'email', to: 'engineer',     subject: 'Review Required — Modification of HOE (TPI) Registration — %CompanyName%', body: 'Dear PPS Engineer,\n\n%CompanyName% has submitted a request for Modification of HOE (TPI) Registration.\nApplication Reference: %ApplicationNumber%.\n\nBest regards,\nDepartment of Energy — PPS Team' },
    { id: 'return-applicant',             channel: 'email', to: 'applicant',    subject: 'Modification of HOE (TPI) Registration — More information required (Ref: %ApplicationNumber%)', body: 'Dear %CompanyName%,\n\nAdditional information is required for your Modification application (Ref: %ApplicationNumber%).\n\nComments: %Comments%\n\nBest regards,\nDepartment of Energy — PPS Team' },
    { id: 'notify-section-head',          channel: 'email', to: 'section_head', subject: 'Application Awaiting Approval — Modification of HOE (TPI) Registration — %CompanyName%', body: 'Dear Section Head,\n\nThe Modification application from %CompanyName% has been endorsed by the PPS Engineer.\nApplication Reference: %ApplicationNumber%\n\nBest regards,\nDepartment of Energy — PPS Team' },
    { id: 'notify-engineer-more-info',    channel: 'email', to: 'engineer',     subject: 'Additional information requested — %CompanyName%', body: 'Dear Reviewer,\n\nThe Section Head has requested additional information on Modification application %ApplicationNumber%.\n\nComments: %Comments%\n\nBest regards,\nDepartment of Energy — PPS Team' },
    { id: 'notify-director',              channel: 'email', to: 'director',     subject: 'Application Awaiting Approval — Modification of HOE (TPI) Registration — %CompanyName%', body: 'Dear Director,\n\nThe Modification application from %CompanyName% has been endorsed and is awaiting your final decision.\nApplication Reference: %ApplicationNumber%\n\nBest regards,\nDepartment of Energy — PPS Team' },
    { id: 'notify-section-head-more-info', channel: 'email', to: 'section_head', subject: 'Additional information requested — %CompanyName%', body: 'Dear Section Head,\n\nThe Director has requested additional information on Modification application %ApplicationNumber%.\n\nComments: %Comments%\n\nBest regards,\nDepartment of Energy — PPS Team' },
    { id: 'reject-applicant',             channel: 'email', to: 'applicant',    subject: 'Rejection — Modification of HOE (TPI) Registration (Ref: %ApplicationNumber%)', body: 'Dear %CompanyName%,\n\nYour Modification application has been rejected.\n\nApplication Reference: %ApplicationNumber%\nReason: %Comments%\n\nBest regards,\nDepartment of Energy — PPS Team' },
    { id: 'approve-applicant',            channel: 'email', to: 'applicant',    subject: 'Application Approved — Payment Pending — Modification of HOE (TPI) Registration (Ref: %ApplicationNumber%)', body: 'Dear %CompanyName%,\n\nYour Modification application has been approved. Please complete the modification fee payment via the DOE Unified Service Portal.\n\nApplication Reference: %ApplicationNumber%\nStatus: Approved — Payment Pending\n\nBest regards,\nDepartment of Energy — PPS Team' },
    { id: 'fee-paid',                     channel: 'email', to: 'applicant',    subject: 'Payment Received — Modification of HOE (TPI) Registration (Ref: %ApplicationNumber%)', body: 'Dear %CompanyName%,\n\nThe modification fee for %ApplicationNumber% has been received. The modified Certificate is now available for download.\n\nBest regards,\nDepartment of Energy — PPS Team' },
  ],

  sla: [
    { stage: 'Modification submission', role: 'applicant',    days: 0 },
    { stage: 'PPS Engineer review',     role: 'engineer',     days: 15 },
    { stage: 'Section Head decision',   role: 'section_head', days: 5 },
    { stage: 'Director final decision', role: 'director',     days: 2 },
  ],
};
