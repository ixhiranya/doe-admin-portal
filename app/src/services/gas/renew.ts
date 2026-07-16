import type { ServiceDefinition } from '../../types';

// ============================================================================
// Gas Systems Operators & Contractors — REGISTRATION RENEWAL
// Source: SDD §1 (Renewal of Gas System Company Registration)
//
// Available only on an active Registration within 30 days of expiry, or
// during the post-expiry grace period (configurable; status during grace
// period is "Expired – Within Grace Period"). Three-tier review, payment,
// re-issuance of the Certificate with an updated validity period.
// ============================================================================

export const gasRenewService: ServiceDefinition = {
  id: 'gas.renew',
  module: 'gas',
  action: 'renew',
  title: 'Renewal of Gas System Company Registration',
  shortTitle: 'Gas Renew',
  description:
    'Renew an active Gas System Company Registration (Category A/B/C/D). Pre-populated form, three-tier review, payment, re-issuance.',
  initialState: 'draft',
  feeAmount: 5000,
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
    { id: 'issued',                   label: 'Renewed',                    category: 'issued' },
    { id: 'rejected',                 label: 'Application Rejected',       category: 'rejected' },
    { id: 'cancelled',                label: 'Cancelled',                  category: 'cancelled' },
  ],

  transitions: [
    { id: 'save-draft',              label: 'Save',                                    from: 'draft',                     to: 'draft',                     allowedRoles: ['applicant'],    variant: 'secondary' },
    { id: 'submit',                  label: 'Submit',                                  from: ['draft', 'returned_to_applicant'], to: 'pending_engineer',  allowedRoles: ['applicant'],    variant: 'primary',   notifications: ['ack-applicant', 'notify-engineer'] },

    { id: 'engineer-request-info',   label: 'Request for More Info',                   from: 'pending_engineer',          to: 'returned_to_applicant',     allowedRoles: ['engineer'],     variant: 'warning', requiresComment: true, commentLabel: 'What additional information is required?', notifications: ['return-applicant'] },
    { id: 'engineer-reject',         label: 'Reject',                                  from: 'pending_engineer',          to: 'rejected',                  allowedRoles: ['engineer'],     variant: 'danger',  requiresComment: true, commentLabel: 'Reason for rejection',                       notifications: ['reject-applicant'] },
    { id: 'engineer-approve',        label: 'Endorse & Forward to Section Head',       from: 'pending_engineer',          to: 'pending_section_head',      allowedRoles: ['engineer'],     variant: 'success', notifications: ['notify-section-head'] },

    { id: 'sh-request-info',         label: 'Request for More Info (Engineer)',        from: 'pending_section_head',      to: 'returned_to_engineer',      allowedRoles: ['section_head'], variant: 'warning', requiresComment: true, commentLabel: 'What additional information is required from the Engineer?', notifications: ['notify-engineer-more-info'] },
    { id: 'sh-reject',               label: 'Reject',                                  from: 'pending_section_head',      to: 'rejected',                  allowedRoles: ['section_head'], variant: 'danger',  requiresComment: true, commentLabel: 'Reason for rejection',                       notifications: ['reject-applicant'] },
    { id: 'sh-approve',              label: 'Approve & Forward to Director',           from: 'pending_section_head',      to: 'pending_director',          allowedRoles: ['section_head'], variant: 'success', notifications: ['notify-director'] },

    { id: 'eng-resubmit-to-sh',      label: 'Re-endorse to Section Head',              from: 'returned_to_engineer',      to: 'pending_section_head',      allowedRoles: ['engineer'],     variant: 'success', requiresComment: true, commentLabel: 'Additional notes for the Section Head',         notifications: ['notify-section-head'] },

    { id: 'director-request-info',   label: 'Request for More Info (Section Head)',    from: 'pending_director',          to: 'returned_to_section_head',  allowedRoles: ['director'],     variant: 'warning', requiresComment: true, commentLabel: 'What additional information is required?', notifications: ['notify-section-head-more-info'] },
    { id: 'director-reject',         label: 'Reject',                                  from: 'pending_director',          to: 'rejected',                  allowedRoles: ['director'],     variant: 'danger',  requiresComment: true, commentLabel: 'Reason for rejection',                       notifications: ['reject-applicant'] },
    { id: 'director-approve',        label: 'Final Approve · Request Fee Payment',     from: 'pending_director',          to: 'fee_pending',               allowedRoles: ['director'],     variant: 'success', notifications: ['approve-applicant'] },

    { id: 'sh-resubmit-to-director', label: 'Re-endorse to Director',                  from: 'returned_to_section_head',  to: 'pending_director',          allowedRoles: ['section_head'], variant: 'success', requiresComment: true, commentLabel: 'Additional notes for the Director',             notifications: ['notify-director'] },

    { id: 'pay-fee',                 label: 'Pay Fee',                                 from: 'fee_pending',               to: 'issued',                    allowedRoles: ['applicant'],    variant: 'primary', notifications: ['fee-paid'] },
  ],

  form: [
    {
      id: 'company-info',
      title: 'Company Information',
      description: 'Fields are pre-populated from the latest issued Registration. Editable fields can be updated; non-editable fields are read-only. Any change is highlighted for the DOE reviewer.',
      fields: [
        {
          id: 'category',
          label: 'Pre-Qualification Category',
          type: 'select',
          required: true,
          options: [
            { value: 'A', label: 'Category A — Gas in building installation, maintenance and operations including filling and decanting operations' },
            { value: 'B', label: 'Category B — Gas in building installation, maintenance and operations including filling operations' },
            { value: 'C', label: 'Category C — Gas in building installation and maintenance' },
            { value: 'D', label: 'Category D — New Establishments — Gas in building installation and maintenance (cylinder systems only)' },
          ],
          remark: 'Editable. Upgrades trigger a manpower & reference-project re-validation against the new category.',
        },
        { id: 'companyLicense',    label: 'Company Commercial License',        type: 'readonly' },
        { id: 'companyName',       label: "Establishment's Commercial Name",   type: 'readonly' },
        { id: 'ownerName',         label: 'Company Owner Name (EN)',           type: 'readonly' },
        { id: 'ownerNameAr',       label: 'Company Owner Name (AR)',           type: 'readonly' },
        { id: 'nationality',       label: 'Nationality (EN)',                  type: 'readonly' },
        { id: 'nationalityAr',     label: 'Nationality (AR)',                  type: 'readonly' },
        { id: 'representative',    label: 'Company Authorized Representative', type: 'readonly' },
        { id: 'businessActivity',  label: 'Business Activity',                 type: 'readonly' },
        { id: 'legalStatus',       label: 'Company Type',                      type: 'readonly' },
        { id: 'establishmentDate', label: 'Establishment Date',                type: 'readonly' },
        { id: 'permitIssueDate',   label: 'Trade Permit Issue Date',           type: 'date' },
        { id: 'permitExpiryDate',  label: 'Trade Permit Expiry Date',          type: 'date' },
        { id: 'address',           label: 'Address',                           type: 'text' },
        { id: 'poBox',             label: 'PO Box',                            type: 'text' },
        { id: 'phone',             label: 'Phone Number',                      type: 'text' },
        { id: 'email',             label: 'Email Address',                     type: 'text' },
        { id: 'website',           label: 'Website',                           type: 'text' },
        { id: 'branchAddress',     label: 'Branch Office Address',             type: 'textarea' },
        { id: 'workshopAddress',   label: 'Workshop Address',                  type: 'textarea', required: true },
        { id: 'areaOfOperations',  label: 'Area of Operations',                type: 'text',     required: true },
      ],
      attachments: [
        { id: 'articlesOfAssociation', label: 'Attested Company Articles of Association',                       required: true },
        { id: 'officeContract',        label: 'Attested rent / ownership contract — Office Facilities',         required: true },
        { id: 'workshopContract',      label: 'Attested rent / ownership contract — Workshop Facilities',       required: true },
        { id: 'adcdaIstifa',           label: 'ADCDA ISTIFAA Certificate (offices, workshops, storage)',        required: true },
        { id: 'molList',               label: 'Ministry of Labor (MoL) List',                                   required: true },
        { id: 'orgChart',              label: 'Organization Chart',                                             required: true },
        { id: 'assetRegister',         label: 'Asset Register of Tools and Equipment',                          required: true },
        { id: 'auditReports',          label: 'Financial and Quality Audit Reports — last 3 years',             required: false },
        { id: 'priorRegistrations',    label: 'Abu Dhabi / UAE Pre-qualifications and Registrations',           required: false },
        { id: 'hseCerts',              label: 'HSE Management Systems Certifications (ISO 9001/45001/14001)',   required: false },
        { id: 'tankerRegister',        label: 'Asset Register for Gas Vehicle Tankers',                         required: { whenCategory: ['A', 'B'] } },
      ],
    },
    {
      id: 'tech-staff',
      title: 'Technical Staff Details',
      description: 'Existing staff is pre-populated. You can add new Engineers / Technicians and delete existing ones. Category upgrade revalidates manpower minimums.',
      fields: [],
      repeatable: {
        itemLabel: 'Staff member',
        minCount: {
          fromCategory: {
            A: { engineers: 15, technicians: 45 },
            B: { engineers: 10, technicians: 30 },
            C: { engineers: 4,  technicians: 12 },
            D: { engineers: 2,  technicians: 6 },
          },
        },
        perItemAttachments: [
          { id: 'laborCard',   label: 'Labor Card',                  required: true },
          { id: 'equivalency', label: 'UAE Equivalency Certificates', required: true },
          { id: 'education',   label: 'Educational Certificates',     required: true },
          { id: 'passport',    label: 'Passport Copy',                required: true },
          { id: 'emiratesId',  label: 'Copy of Emirates ID',          required: true },
          { id: 'cv',          label: 'Curriculum Vitae',             required: true },
          { id: 'experience',  label: 'Experience Certificates',      required: true },
        ],
      },
    },
    {
      id: 'ref-projects',
      title: 'Reference Projects',
      description: 'Existing reference projects are pre-populated. New projects can be added; existing ones cannot be deleted.',
      fields: [],
      repeatable: {
        itemLabel: 'Project',
        perItemAttachments: [
          { id: 'cocProject', label: 'Copy of CoC for the Project',  required: true },
          { id: 'poAgreement', label: 'Copy of PO / Agreement',       required: true },
        ],
      },
    },
  ],

  notifications: [
    { id: 'ack-applicant',                channel: 'email', to: 'applicant',    subject: 'Renewal of Gas System Company Registration — Application Received (Ref: %ApplicationNumber%)', body: 'Dear %CompanyName%,\n\nWe confirm receipt of your application for the Renewal of Gas System Company Registration submitted via the DOE Unified Service Portal.\n\nApplication Reference: %ApplicationNumber%\nStatus: Under Review\n\nYou will be notified of the outcome at each stage of the review process. Please log in to the portal to track the status of your application.\n\nBest regards,\nDepartment of Energy — PPS Team' },
    { id: 'notify-engineer',              channel: 'email', to: 'engineer',     subject: 'Review Required — Renewal of Gas System Company Registration — %CompanyName%', body: 'Dear PPS Engineer,\n\n%CompanyName% has submitted a request for the Renewal of Gas System Company Registration.\nApplication Reference: %ApplicationNumber%.\n\nPlease log in to the DOE Unified Service Portal to review the application and take the appropriate action.\n\nBest regards,\nDepartment of Energy — PPS Team' },
    { id: 'return-applicant',             channel: 'email', to: 'applicant',    subject: 'Renewal of Gas System Company Registration — More information required (Ref: %ApplicationNumber%)', body: 'Dear %CompanyName%,\n\nAdditional information is required for your Renewal application (Ref: %ApplicationNumber%).\n\nComments: %Comments%\n\nPlease log in to the portal, update the details and re-submit.\n\nBest regards,\nDepartment of Energy — PPS Team' },
    { id: 'notify-section-head',          channel: 'email', to: 'section_head', subject: 'Application Awaiting Approval — Renewal of Gas System Company Registration — %CompanyName%', body: 'Dear Section Head,\n\nThe application submitted by %CompanyName% for the Renewal of Gas System Company Registration has been reviewed and endorsed by the PPS Engineer.\n\nApplication Reference: %ApplicationNumber%\n\nPlease log in to the DOE Unified Service Portal to review the application and take the appropriate action.\n\nBest regards,\nDepartment of Energy — PPS Team' },
    { id: 'notify-engineer-more-info',    channel: 'email', to: 'engineer',     subject: 'Additional information requested — %CompanyName%', body: 'Dear Reviewer,\n\nThe Section Head has requested additional information on Renewal application %ApplicationNumber%.\n\nComments: %Comments%\n\nPlease log in to the portal to take action.\n\nBest regards,\nDepartment of Energy — PPS Team' },
    { id: 'notify-director',              channel: 'email', to: 'director',     subject: 'Application Awaiting Approval — Renewal of Gas System Company Registration — %CompanyName%', body: 'Dear Director,\n\nThe Renewal application from %CompanyName% has been reviewed and endorsed by the Section Head and is awaiting your final decision.\n\nApplication Reference: %ApplicationNumber%\n\nBest regards,\nDepartment of Energy — PPS Team' },
    { id: 'notify-section-head-more-info', channel: 'email', to: 'section_head', subject: 'Additional information requested — %CompanyName%', body: 'Dear Section Head,\n\nThe Director has requested additional information on Renewal application %ApplicationNumber%.\n\nComments: %Comments%\n\nBest regards,\nDepartment of Energy — PPS Team' },
    { id: 'reject-applicant',             channel: 'email', to: 'applicant',    subject: 'Rejection — Renewal of Gas System Company Registration (Ref: %ApplicationNumber%)', body: 'Dear %CompanyName%,\n\nWe regret to inform you that your application for the Renewal of Gas System Company Registration has been rejected after review by the Department of Energy.\n\nApplication Reference: %ApplicationNumber%\nReason: %Comments%\n\nFor further clarification, please contact the DOE PPS team.\n\nBest regards,\nDepartment of Energy — PPS Team' },
    { id: 'approve-applicant',            channel: 'email', to: 'applicant',    subject: 'Application Approved — Payment Pending — Renewal of Gas System Company Registration (Ref: %ApplicationNumber%)', body: 'Dear %CompanyName%,\n\nWe are pleased to inform you that your application for the Renewal of Gas System Company Registration has been approved by the Department of Energy.\n\nApplication Reference: %ApplicationNumber%\nStatus: Approved — Payment Pending\n\nKindly complete the renewal fee payment via the DOE Unified Service Portal to receive the renewed Registration Certificate.\n\nBest regards,\nDepartment of Energy — PPS Team' },
    { id: 'fee-paid',                     channel: 'email', to: 'applicant',    subject: 'Payment Received — Renewal of Gas System Company Registration (Ref: %ApplicationNumber%)', body: 'Dear %CompanyName%,\n\nThe renewal fee for %ApplicationNumber% has been received. The renewed Registration Certificate is now available for download from the Unified Service Portal.\n\nBest regards,\nDepartment of Energy — PPS Team' },
  ],

  sla: [
    { stage: 'Renewal submission window (1 month pre-expiry + grace)', role: 'applicant',    days: 0 },
    { stage: 'PPS Engineer review',                                    role: 'engineer',     days: 15 },
    { stage: 'Section Head decision',                                  role: 'section_head', days: 5 },
    { stage: 'Director final decision',                                role: 'director',     days: 2 },
  ],
};
