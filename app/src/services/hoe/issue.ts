import type { ServiceDefinition } from '../../types';

// ============================================================================
// House of Expertise (HOE / TPI) — Registration ISSUANCE
// Source: "HOE (TPI) Issuance" BRD
//
// Three Pre-Qualification Categories (multi-select in the form, modelled
// here as one of three codes to match the engine's single-select category):
//   A — Central Gas Systems
//   B — Petroleum Products Transportation Vehicles
//   C — Petroleum Products Storage Facilities
//
// Engineer Details (§3.2): at least 2 Engineers per selected category,
// minimum 10 years' gas utilization experience.
// ============================================================================

export const hoeIssueService: ServiceDefinition = {
  id: 'hoe.issue',
  module: 'hoe',
  action: 'issue',
  title: 'Third Party Inspection Companies — Pre-qualification (Issuance)',
  shortTitle: 'HOE Issue',
  description:
    'Pre-qualification and registration of Third Party Inspection Companies (Houses of Expertise) on the DOE Unified Platform.',
  initialState: 'draft',
  feeAmount: 4500,
  certificateValidityYears: 1,

  states: [
    { id: 'draft',                    label: 'Draft',                      category: 'draft',     ownerRole: 'applicant' },
    { id: 'pending_engineer',         label: 'Pending DoE Review',         category: 'pending',   ownerRole: 'engineer' },
    { id: 'returned_to_applicant',    label: 'Pending for Resubmission',   category: 'returned',  ownerRole: 'applicant' },
    { id: 'pending_section_head',     label: 'Pending Section Head',       category: 'pending',   ownerRole: 'section_head' },
    { id: 'pending_director',         label: 'Pending Director',           category: 'pending',   ownerRole: 'director' },
    { id: 'returned_to_engineer',     label: 'Sent Back to Engineer',      category: 'returned',  ownerRole: 'engineer' },
    { id: 'returned_to_section_head', label: 'Sent Back to Section Head',  category: 'returned',  ownerRole: 'section_head' },
    { id: 'fee_pending',              label: 'Fee Payment Pending',        category: 'payment',   ownerRole: 'applicant' },
    { id: 'issued',                   label: 'Issued',                     category: 'issued' },
    { id: 'rejected',                 label: 'Rejected',                   category: 'rejected' },
    { id: 'cancelled',                label: 'Cancelled',                  category: 'cancelled' },
  ],

  transitions: [
    { id: 'save-draft',              label: 'Save',                                 from: 'draft',                            to: 'draft',                    allowedRoles: ['applicant'],    variant: 'secondary' },
    { id: 'submit',                  label: 'Submit',                               from: ['draft', 'returned_to_applicant'], to: 'pending_engineer',         allowedRoles: ['applicant'],    variant: 'primary', notifications: ['ack-applicant', 'notify-engineer'] },

    { id: 'engineer-return',         label: 'Return for Modification',              from: 'pending_engineer',                 to: 'returned_to_applicant',    allowedRoles: ['engineer'],     variant: 'warning', requiresComment: true, commentLabel: 'Reason / comments for modification', notifications: ['return-applicant'] },
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
      description: 'Most fields are pre-populated from the commercial licence record.',
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
          remark: 'Mandatory. Determines minimum engineer headcount (≥ 2 Engineers per selected category, each with ≥ 10 years gas-utilization experience).',
        },
        { id: 'companyLicense',    label: 'Company Commercial Permit',         type: 'readonly' },
        { id: 'companyName',       label: "Establishment's Commercial Name",   type: 'readonly' },
        { id: 'ownerName',         label: 'Company Owner Name',                type: 'readonly' },
        { id: 'nationality',       label: 'Nationality',                       type: 'readonly' },
        { id: 'representative',    label: 'Company Authorized Representative', type: 'readonly' },
        { id: 'businessActivity',  label: 'Business Activity',                 type: 'readonly' },
        { id: 'legalStatus',       label: 'Legal Status',                      type: 'readonly' },
        { id: 'establishmentDate', label: 'Establishment Date',                type: 'readonly' },
        { id: 'permitIssueDate',   label: 'Trade Permit Issuance Date',        type: 'readonly' },
        { id: 'permitExpiryDate',  label: 'Trade Permit Expiry Date',          type: 'readonly' },
        { id: 'permitType',        label: 'Permit Type',                       type: 'readonly' },
        { id: 'address',           label: 'Address',                           type: 'readonly' },
        { id: 'poBox',             label: 'PO Box',                            type: 'readonly' },
        { id: 'phone',             label: 'Phone Number',                      type: 'readonly' },
        { id: 'email',             label: 'Email Address',                     type: 'readonly' },
        { id: 'website',           label: 'Website',                           type: 'readonly' },
        { id: 'branchAddress',     label: 'Branch Office Address',             type: 'textarea' },
        { id: 'areaOfOperations',  label: 'Area of Operations',                type: 'text', required: true },
      ],
      attachments: [
        { id: 'articlesOfAssociation', label: 'Attested Company Articles of Association',                    required: true },
        { id: 'officeContract',        label: 'Attested rent / ownership contract — Office Facilities',      required: true },
        { id: 'adcdaIstifa',           label: 'ADCDA ISTIFAA Certificate for company offices',               required: true },
        { id: 'molList',               label: 'Ministry of Labor (MoL) List',                                required: true },
        { id: 'assetRegister',         label: 'Asset Register of Tools and Equipment',                       required: true },
        { id: 'priorRegistrations',    label: 'Previous UAE / Abu Dhabi Pre-qualifications and Registrations', required: false },
        { id: 'accreditation',         label: 'Local & International Accreditation (ENAS, AD-QCC, others)',  required: true },
        { id: 'auditReports',          label: 'Financial and Quality Audit Reports — last 3 years',          required: false },
        { id: 'iso9001',               label: 'Certifications for Quality Management Systems (ISO 9001)',    required: true },
      ],
    },
    {
      id: 'tech-staff',
      title: 'Engineer Details',
      description: 'Add at least 2 Engineers per selected Pre-Qualification Category. Each engineer must have a minimum of 10 years gas-utilization experience.',
      fields: [],
      repeatable: {
        itemLabel: 'Engineer',
        minCount: {
          fromCategory: {
            A: { engineers: 2 },
            B: { engineers: 2 },
            C: { engineers: 2 },
          },
        },
        perItemAttachments: [
          { id: 'laborCard',    label: 'Labor Card',                              required: true },
          { id: 'equivalency',  label: 'UAE Equivalency Certificates',            required: true },
          { id: 'education',    label: 'Educational Certificates',                required: true },
          { id: 'passport',     label: 'Passport Copy',                           required: true },
          { id: 'emiratesId',   label: 'Copy of Emirates ID',                     required: true },
          { id: 'cv',           label: 'Curriculum Vitae',                        required: true },
          { id: 'experience',   label: 'Experience Certificates',                 required: true },
          { id: 'doeRegistration', label: 'Engineer Registration Approval (DoE)', required: true },
          { id: 'training',     label: 'Training Certificates',                   required: false },
        ],
      },
    },
    {
      id: 'ref-projects',
      title: 'Reference Projects',
      description: 'At least one reference project is recommended. Each project requires a Certificate of Completion (CoC).',
      fields: [],
      repeatable: {
        itemLabel: 'Project',
        perItemAttachments: [
          { id: 'cocProject',  label: 'CoC for the Project',  required: true },
          { id: 'poAgreement', label: 'Copy of PO / Agreement', required: true },
        ],
      },
    },
  ],

  notifications: [
    { id: 'ack-applicant',                channel: 'email', to: 'applicant',    subject: 'Third Party Inspection Company Application of %CompanyName% — Received', body: 'Dear %CompanyName%,\n\nThis is to inform you that a request for pre-registration %ApplicationNumber% as a Third Party Inspection Company has been submitted and sent for DOE review.\n\nPlease click Unified Platform to view the application.\n\nSincerely,\nDepartment of Energy' },
    { id: 'notify-engineer',              channel: 'email', to: 'engineer',     subject: 'Review Third Party Inspection Company Application — %CompanyName%', body: 'Dear Reviewer,\n\n%CompanyName% has submitted a request for pre-registration as a Third Party Inspection Company and it is assigned for your review.\n\nPlease Click Here to review the application.\n\nSincerely,\nDepartment of Energy' },
    { id: 'return-applicant',             channel: 'email', to: 'applicant',    subject: 'Third Party Inspection Company Application of %CompanyName% — sent for more information', body: 'Dear %CompanyName%,\n\nThe application no. %ApplicationNumber% has been sent back for modification.\n\nKindly note that the updated application must be resubmitted within 60 business days. Failure to respond within the specified timeframe will result in the cancellation of the application by the Department.\n\nComments:\n%Comments%\n\nSincerely,\nDepartment of Energy' },
    { id: 'notify-section-head',          channel: 'email', to: 'section_head', subject: 'Please Review Third Party Inspection Company Application — %CompanyName%', body: 'Dear Approver,\n\n%CompanyName% has submitted a request for pre-registration as a Third Party Inspection Company and it is assigned for your review.\n\nSincerely,\nDepartment of Energy' },
    { id: 'notify-engineer-more-info',    channel: 'email', to: 'engineer',     subject: 'Additional information requested — %CompanyName%', body: 'Dear Reviewer,\n\nThe Section Head has requested additional information on TPI application %ApplicationNumber%.\n\nComments:\n%Comments%\n\nSincerely,\nDepartment of Energy' },
    { id: 'notify-director',              channel: 'email', to: 'director',     subject: 'Please Review Third Party Inspection Company Application — %CompanyName%', body: 'Dear Director,\n\n%CompanyName% has been endorsed and is awaiting your final decision.\n\nSincerely,\nDepartment of Energy' },
    { id: 'notify-section-head-more-info', channel: 'email', to: 'section_head', subject: 'Additional information requested — %CompanyName%', body: 'Dear Section Head,\n\nThe Director has requested additional information on TPI application %ApplicationNumber%.\n\nComments:\n%Comments%\n\nSincerely,\nDepartment of Energy' },
    { id: 'reject-applicant',             channel: 'email', to: 'applicant',    subject: 'Third Party Inspection Company Application of %CompanyName% has been Rejected', body: 'Dear %CompanyName%,\n\nThe application no. %ApplicationNumber% for Third Party Inspection Company registration has been rejected.\n\nComments:\n%Comments%\n\nSincerely,\nDepartment of Energy' },
    { id: 'approve-applicant',            channel: 'email', to: 'applicant',    subject: 'Third Party Inspection Company Application of %CompanyName% has been approved', body: 'Dear %CompanyName%,\n\nThe application no. %ApplicationNumber% has been approved. Please pay the Registration fees to proceed.\n\nSincerely,\nDepartment of Energy' },
    { id: 'fee-paid',                     channel: 'email', to: 'applicant',    subject: 'Third Party Inspection Company Application of %CompanyName% — Registration fees paid', body: 'Dear %CompanyName%,\n\nThe Registration fees of application no. %ApplicationNumber% have been received. Your Certificate is now available for download from the Unified Platform.\n\nSincerely,\nDepartment of Energy' },
  ],

  sla: [
    { stage: 'Apply for Pre-qualification', role: 'applicant',    days: 0 },
    { stage: 'Resubmission after Return',   role: 'applicant',    days: 60 },
    { stage: 'PPS Engineer review',         role: 'engineer',     days: 15 },
    { stage: 'Section Head decision',       role: 'section_head', days: 5 },
    { stage: 'Director final decision',     role: 'director',     days: 2 },
  ],
};
