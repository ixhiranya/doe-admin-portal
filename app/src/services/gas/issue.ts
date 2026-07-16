import type { ServiceDefinition } from '../../types';

// ============================================================================
// Gas Systems Operators & Contractors — Registration ISSUANCE
// Source: BRD v1.4, 22 April 2025 — Petroleum Products Sector (PPS)
// ============================================================================

export const gasIssueService: ServiceDefinition = {
  id: 'gas.issue',
  module: 'gas',
  action: 'issue',
  title: 'Gas Systems Operators & Contractors — Pre-qualification (Issuance)',
  shortTitle: 'Gas Issue',
  description:
    'End-to-end pre-qualification and registration of Gas Systems Operators and Contractors.',
  initialState: 'draft',
  feeAmount: 5000,
  certificateValidityYears: 1,

  // ------------------------------------------------------------------ STATES
  states: [
    { id: 'draft', label: 'Draft', category: 'draft', ownerRole: 'applicant' },
    { id: 'pending_engineer', label: 'In Review', category: 'pending', ownerRole: 'engineer' },
    { id: 'returned_to_applicant', label: 'Returned', category: 'returned', ownerRole: 'applicant' },
    { id: 'pending_section_head', label: 'Section Head Review', category: 'pending', ownerRole: 'section_head' },
    { id: 'pending_director', label: 'Director Review', category: 'pending', ownerRole: 'director' },
    { id: 'returned_to_engineer', label: 'Returned to Engineer', category: 'returned', ownerRole: 'engineer' },
    { id: 'returned_to_section_head', label: 'Returned to Section Head', category: 'returned', ownerRole: 'section_head' },
    { id: 'fee_pending', label: 'Fee Pending', category: 'payment', ownerRole: 'applicant' },
    { id: 'approved', label: 'Approved', category: 'approved' },
    { id: 'issued', label: 'Issued', category: 'issued' },
    { id: 'rejected', label: 'Rejected', category: 'rejected' },
    { id: 'cancelled', label: 'Cancelled', category: 'cancelled' },
  ],

  // ------------------------------------------------------------- TRANSITIONS
  transitions: [
    {
      id: 'save-draft',
      label: 'Save',
      from: ['draft'],
      to: 'draft',
      allowedRoles: ['applicant'],
      variant: 'secondary',
    },
    {
      id: 'submit',
      label: 'Submit',
      from: ['draft', 'returned_to_applicant'],
      to: 'pending_engineer',
      allowedRoles: ['applicant'],
      variant: 'primary',
      notifications: ['ack-applicant', 'notify-engineer'],
    },
    {
      id: 'engineer-return',
      label: 'Return for Modification',
      from: 'pending_engineer',
      to: 'returned_to_applicant',
      allowedRoles: ['engineer'],
      variant: 'warning',
      requiresComment: true,
      commentLabel: 'Reason / comments for modification',
      notifications: ['return-applicant'],
    },
    {
      id: 'engineer-approve',
      label: 'Endorse & Forward to Section Head',
      from: 'pending_engineer',
      to: 'pending_section_head',
      allowedRoles: ['engineer'],
      variant: 'success',
      notifications: ['notify-section-head'],
    },
    {
      id: 'sh-request-info',
      label: 'Request More Info from Engineer',
      from: 'pending_section_head',
      to: 'returned_to_engineer',
      allowedRoles: ['section_head'],
      variant: 'warning',
      requiresComment: true,
      commentLabel: 'What additional information is needed?',
      notifications: ['notify-engineer-more-info'],
    },
    {
      id: 'sh-approve',
      label: 'Approve & Forward to Director',
      from: 'pending_section_head',
      to: 'pending_director',
      allowedRoles: ['section_head'],
      variant: 'success',
      notifications: ['notify-director'],
    },
    {
      id: 'sh-reject',
      label: 'Reject',
      from: 'pending_section_head',
      to: 'rejected',
      allowedRoles: ['section_head'],
      variant: 'danger',
      requiresComment: true,
      commentLabel: 'Reason for rejection',
      notifications: ['reject-applicant'],
    },
    {
      id: 'eng-resubmit-to-sh',
      label: 'Re-endorse to Section Head',
      from: 'returned_to_engineer',
      to: 'pending_section_head',
      allowedRoles: ['engineer'],
      variant: 'success',
      requiresComment: true,
      commentLabel: 'Additional notes for Section Head',
      notifications: ['notify-section-head'],
    },
    {
      id: 'director-request-info',
      label: 'Request More Info from Section Head',
      from: 'pending_director',
      to: 'returned_to_section_head',
      allowedRoles: ['director'],
      variant: 'warning',
      requiresComment: true,
      commentLabel: 'What additional information is needed?',
      notifications: ['notify-section-head-more-info'],
    },
    {
      id: 'director-approve',
      label: 'Final Approve · Request Fee Payment',
      from: 'pending_director',
      to: 'fee_pending',
      allowedRoles: ['director'],
      variant: 'success',
      notifications: ['approve-applicant'],
    },
    {
      id: 'director-reject',
      label: 'Reject',
      from: 'pending_director',
      to: 'rejected',
      allowedRoles: ['director'],
      variant: 'danger',
      requiresComment: true,
      commentLabel: 'Reason for rejection',
      notifications: ['reject-applicant'],
    },
    {
      id: 'sh-resubmit-to-director',
      label: 'Re-endorse to Director',
      from: 'returned_to_section_head',
      to: 'pending_director',
      allowedRoles: ['section_head'],
      variant: 'success',
      requiresComment: true,
      commentLabel: 'Additional notes for Director',
      notifications: ['notify-director'],
    },
    {
      id: 'pay-fee',
      label: 'Pay Fee',
      from: 'fee_pending',
      to: 'issued',
      allowedRoles: ['applicant'],
      variant: 'primary',
      notifications: ['fee-paid'],
      confirmText: 'You will be redirected to the Payment Gateway. Continue?',
    },
  ],

  // ------------------------------------------------------------ FORM SCHEMA
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
            { value: 'A', label: 'Category A — Gas in building installation, maintenance and operations including filling and decanting operations' },
            { value: 'B', label: 'Category B — Gas in building installation, maintenance and operations including filling operations' },
            { value: 'C', label: 'Category C — Gas in building installation and maintenance' },
            { value: 'D', label: 'Category D — New Establishments — Gas in building installation and maintenance (cylinder systems only)' },
          ],
          remark: 'Mandatory. Determines minimum manpower requirements (A: 15 Eng + 45 Tech, B: 10 + 30, C: 4 + 12, D: 2 + 6).',
        },
        { id: 'companyLicense', label: 'Company Commercial License', type: 'readonly', prepopulate: 'company-license' },
        { id: 'companyName', label: "Establishment's Commercial Name (Company Name)", type: 'readonly', prepopulate: 'company-name' },
        { id: 'ownerName', label: 'Company Owner Name', type: 'readonly', prepopulate: 'company-owner' },
        { id: 'nationality', label: 'Nationality', type: 'readonly' },
        { id: 'representative', label: 'Company Authorized Representative', type: 'readonly', prepopulate: 'representative' },
        { id: 'businessActivity', label: 'Business Activity', type: 'readonly' },
        { id: 'legalStatus', label: 'Legal Status', type: 'readonly' },
        { id: 'establishmentDate', label: 'Establishment Date', type: 'readonly' },
        { id: 'permitIssueDate', label: 'Trade Permit Issuance Date', type: 'readonly' },
        { id: 'permitExpiryDate', label: 'Trade Permit Expiry Date', type: 'readonly' },
        { id: 'address', label: 'Address', type: 'readonly' },
        { id: 'poBox', label: 'PO Box', type: 'readonly' },
        { id: 'phone', label: 'Phone Number', type: 'readonly' },
        { id: 'email', label: 'Email Address', type: 'readonly' },
        { id: 'website', label: 'Website', type: 'readonly' },
        { id: 'branchAddress', label: 'Branch Office Address (multiple supported)', type: 'textarea' },
        { id: 'workshopAddress', label: 'Workshop Address (multiple supported)', type: 'textarea', required: true },
        { id: 'areaOfOperations', label: 'Area of Operations', type: 'text', required: true },
      ],
      attachments: [
        { id: 'articlesOfAssociation', label: 'Attested Company Articles of Association', required: true },
        { id: 'officeContract', label: 'Attested rent / ownership contract — Office Facilities', required: true },
        { id: 'workshopContract', label: 'Attested rent / ownership contract — Workshop Facilities', required: true },
        { id: 'adcdaIstifa', label: 'ADCDA ISTIFAA Certificate (offices, workshops, storage)', required: true },
        { id: 'molList', label: 'Ministry of Labor (MoL) List', required: true },
        { id: 'orgChart', label: 'Organization Chart', required: true },
        { id: 'assetRegister', label: 'Asset Register of Tools and Equipment (with software & ownership evidence)', required: true },
        { id: 'auditReports', label: 'Financial and Quality Audit Reports — last 3 years', required: false },
        { id: 'priorRegistrations', label: 'Abu Dhabi / UAE Pre-qualifications and Registrations', required: false },
        { id: 'hseCerts', label: 'HSE Management Systems Certifications: ISO 9001, ISO 45001, ISO 14001', required: false },
        { id: 'tankerRegister', label: 'Asset Register for Gas Vehicle Tankers (registration & ownership)', required: { whenCategory: ['A', 'B'] } },
      ],
    },
    {
      id: 'tech-staff',
      title: 'Technical Staff Details',
      description: 'Add Engineers and Technicians. Each entry requires labour card, education and ID documents.',
      fields: [],
      repeatable: {
        itemLabel: 'Staff member',
        minCount: {
          fromCategory: {
            A: { engineers: 15, technicians: 45 },
            B: { engineers: 10, technicians: 30 },
            C: { engineers: 4, technicians: 12 },
            D: { engineers: 2, technicians: 6 },
          },
        },
        perItemAttachments: [
          { id: 'laborCard', label: 'Labor Card', required: true },
          { id: 'equivalency', label: 'UAE Equivalency Certificates', required: true },
          { id: 'education', label: 'Educational Certificates', required: true },
          { id: 'passport', label: 'Passport Copy', required: true },
          { id: 'emiratesId', label: 'Copy of Emirates ID', required: true },
          { id: 'cv', label: 'Curriculum Vitae', required: true },
          { id: 'experience', label: 'Experience Certificates', required: true },
        ],
      },
    },
    {
      id: 'ref-projects',
      title: 'Reference Projects',
      description: 'Mandatory for Categories A, B and C. Optional for Category D (new establishment).',
      fields: [],
      repeatable: {
        itemLabel: 'Project',
        perItemAttachments: [
          { id: 'cocProject', label: 'Copy of CoC for the Project', required: true },
          { id: 'poAgreement', label: 'Copy of PO / Agreement', required: true },
        ],
      },
    },
  ],

  // ----------------------------------------------------------- NOTIFICATIONS
  notifications: [
    {
      id: 'ack-applicant',
      channel: 'email',
      to: 'applicant',
      subject: 'Submission of Gas Systems Operators and Contractors Application — %CompanyName%',
      body:
        'Dear %CompanyName%,\n\nThis is to inform you that a request for pre-registration %ApplicationNumber% as Gas Systems Operators and Contractors has been submitted and sent for DOE review.\n\nPlease click Unified Platform to view the application.\n\nSincerely,\nDepartment of Energy',
    },
    {
      id: 'notify-engineer',
      channel: 'email',
      to: 'engineer',
      subject: 'Review Gas Systems Operators and Contractors Application — %CompanyName%',
      body:
        'Dear Reviewer,\n\nThe %CompanyName% has submitted a request for pre-registration as Gas Systems Operators and Contractors and it is assigned for your review.\n\nPlease Click Here to review the application.\n\nSincerely,\nDepartment of Energy',
    },
    {
      id: 'return-applicant',
      channel: 'email',
      to: 'applicant',
      subject: 'Gas Systems Operators and Contractors Application of %CompanyName% has been sent for more information',
      body:
        'Dear %CompanyName%,\n\nThe application no. %ApplicationNumber% for Gas Systems Operators and Contractors registration has been sent back for modification.\n\nKindly note that the updated (revised) application must be resubmitted within 60 business days from the date of this notification. Failure to respond within the specified timeframe will result in the cancellation of the application by the Department.\n\nComments:\n%Comments%\n\nPlease click Unified Platform to review the application.\n\nSincerely,\nDepartment of Energy',
    },
    {
      id: 'notify-section-head',
      channel: 'email',
      to: 'section_head',
      subject: 'Please Review Gas Systems Operators and Contractors Application — %CompanyName%',
      body:
        'Dear Approver,\n\nThe %CompanyName% has submitted a request for pre-registration as Gas Systems Operators and Contractors and it is assigned for your review.\n\nPlease click Unified Platform to review the application.\n\nSincerely,\nDepartment of Energy',
    },
    {
      id: 'notify-director',
      channel: 'email',
      to: 'director',
      subject: 'Please Review Gas Systems Operators and Contractors Application — %CompanyName%',
      body:
        'Dear Approver,\n\nThe %CompanyName% has submitted a request for pre-registration as Gas Systems Operators and Contractors and it is assigned for your review.\n\nPlease click Unified Platform to review the application.\n\nSincerely,\nDepartment of Energy',
    },
    {
      id: 'notify-engineer-more-info',
      channel: 'email',
      to: 'engineer',
      subject: 'Additional information requested — %CompanyName%',
      body:
        'Dear Reviewer,\n\nThe Section Head has requested additional information on application %ApplicationNumber%.\n\nComments:\n%Comments%\n\nPlease click Unified Platform to take action.\n\nSincerely,\nDepartment of Energy',
    },
    {
      id: 'notify-section-head-more-info',
      channel: 'email',
      to: 'section_head',
      subject: 'Additional information requested — %CompanyName%',
      body:
        'Dear Section Head,\n\nThe Director has requested additional information on application %ApplicationNumber%.\n\nComments:\n%Comments%\n\nPlease click Unified Platform to take action.\n\nSincerely,\nDepartment of Energy',
    },
    {
      id: 'reject-applicant',
      channel: 'email',
      to: 'applicant',
      subject: 'Gas Systems Operators and Contractors Application of %CompanyName% has been Rejected',
      body:
        'Dear %CompanyName%,\n\nThe application no. %ApplicationNumber% for Gas Systems Operators and Contractors registration has been rejected.\n\nComments:\n%Comments%\n\nPlease click Unified Platform to review the application.\n\nSincerely,\nDepartment of Energy',
    },
    {
      id: 'approve-applicant',
      channel: 'email',
      to: 'applicant',
      subject: 'Gas Systems Operators and Contractors Application of %CompanyName% has been approved',
      body:
        'Dear %CompanyName%,\n\nThe application no. %ApplicationNumber% for Gas Systems Operators and Contractors registration has been approved, please pay the Registration fees to proceed.\n\nComments:\n%Comments%\n\nPlease click Unified Platform to review the application.\n\nSincerely,\nDepartment of Energy',
    },
    {
      id: 'fee-paid',
      channel: 'email',
      to: 'applicant',
      subject: 'Gas Systems Operators and Contractors Application of %CompanyName% — Registration fees has been paid',
      body:
        'Dear %CompanyName%,\n\nThe Registration fees of application no. %ApplicationNumber% for Gas Systems Operators and Contractors registration has been paid.\n\nYour Certificate is now available for download from the Unified Platform.\n\nSincerely,\nDepartment of Energy',
    },
  ],

  // -------------------------------------------------------------------- SLA
  sla: [
    { stage: 'Apply for Pre-qualification', role: 'applicant', days: 0 },
    { stage: 'Resubmission after Return', role: 'applicant', days: 60 },
    { stage: 'Engineer review & endorsement', role: 'engineer', days: 15 },
    { stage: 'Section Head decision', role: 'section_head', days: 5 },
    { stage: 'Director final decision', role: 'director', days: 2 },
  ],
};
