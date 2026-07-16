import type { ServiceDefinition } from '../../types';

// ============================================================================
// COC — MODIFICATION of Certificate of Completion (COC) for Gas Systems
// Source: "Certificate of Completion Enhancement Solution Design Document" §1
//          (Modification of Certificate of Completion (COC) for Gas Systems)
//
// Enabled only when the linked COC is Active/Issued. Disabled if Cancelled,
// Revoked or already in another open workflow.
//
// Two-tier DOE review: PPS Engineer (Reviewer) → Section Head (Approver).
// A "Request for More Info" from the Section Head returns the application to
// the PPS Engineer (one step back). The PPS Engineer's "Request for More Info"
// returns the application to the company.
//
// Payment is taken AFTER Section Head approval. The COC fee is configurable
// and kept at 0 AED for go-live pending ADEO approval of the service fees.
//
// On payment success the system regenerates the COC document — retaining the
// original COC application/reference number — with an embedded QR code and
// the DOE stamp. No signature is required.
// ============================================================================

export const cocModifyService: ServiceDefinition = {
  id: 'coc.modify',
  module: 'coc',
  action: 'modify',
  title: 'Modification of Certificate of Completion (COC) for Gas Systems',
  shortTitle: 'COC Modify',
  description:
    'Modify an active Certificate of Completion (COC) for Gas Systems. Two-tier DOE review (PPS Engineer → Section Head), payment after approval, then the COC is regenerated with the original reference number retained, an embedded QR code and the DOE stamp.',
  initialState: 'draft',
  feeAmount: 0,
  certificateValidityYears: 0,

  states: [
    { id: 'draft',                 label: 'Draft',                              category: 'draft',     ownerRole: 'applicant' },
    { id: 'pending_engineer',      label: 'Under Review',                       category: 'pending',   ownerRole: 'engineer' },
    { id: 'returned_to_applicant', label: 'Requested for More Info',            category: 'returned',  ownerRole: 'applicant' },
    { id: 'pending_section_head',  label: 'Pending Section Head Approval',      category: 'pending',   ownerRole: 'section_head' },
    { id: 'returned_to_engineer',  label: 'Sent Back to Engineer',              category: 'returned',  ownerRole: 'engineer' },
    { id: 'fee_pending',           label: 'Payment Pending',                    category: 'payment',   ownerRole: 'applicant' },
    { id: 'issued',                label: 'Approved · Updated COC Issued',      category: 'issued' },
    { id: 'rejected',              label: 'Application Rejected',               category: 'rejected' },
    { id: 'cancelled',             label: 'Withdrawn',                          category: 'cancelled' },
  ],

  transitions: [
    { id: 'save-draft',               label: 'Save',                                  from: 'draft',                            to: 'draft',                 allowedRoles: ['applicant'],    variant: 'secondary' },
    { id: 'submit',                   label: 'Submit',                                from: ['draft', 'returned_to_applicant'], to: 'pending_engineer',      allowedRoles: ['applicant'],    variant: 'primary',  notifications: ['ack-applicant', 'notify-engineer'] },

    { id: 'engineer-request-info',    label: 'Request for More Info',                 from: 'pending_engineer',                 to: 'returned_to_applicant', allowedRoles: ['engineer'],     variant: 'warning',  requiresComment: true, commentLabel: 'What additional information is required?', notifications: ['return-applicant'] },
    { id: 'engineer-reject',          label: 'Reject',                                from: 'pending_engineer',                 to: 'rejected',              allowedRoles: ['engineer'],     variant: 'danger',   requiresComment: true, commentLabel: 'Reason for rejection',                       notifications: ['reject-applicant'] },
    { id: 'engineer-approve',         label: 'Approve & Forward to Section Head',     from: 'pending_engineer',                 to: 'pending_section_head',  allowedRoles: ['engineer'],     variant: 'success',  notifications: ['notify-section-head'] },

    { id: 'sh-request-info',          label: 'Request for More Info (Engineer)',      from: 'pending_section_head',             to: 'returned_to_engineer',  allowedRoles: ['section_head'], variant: 'warning',  requiresComment: true, commentLabel: 'What additional information is required from the Engineer?', notifications: ['notify-engineer-more-info'] },
    { id: 'sh-reject',                label: 'Reject',                                from: 'pending_section_head',             to: 'rejected',              allowedRoles: ['section_head'], variant: 'danger',   requiresComment: true, commentLabel: 'Reason for rejection',                       notifications: ['reject-applicant'] },
    { id: 'sh-approve',               label: 'Final Approve · Request Fee Payment',   from: 'pending_section_head',             to: 'fee_pending',           allowedRoles: ['section_head'], variant: 'success',  notifications: ['approve-applicant'] },

    { id: 'eng-resubmit-to-sh',       label: 'Re-endorse to Section Head',            from: 'returned_to_engineer',             to: 'pending_section_head',  allowedRoles: ['engineer'],     variant: 'success',  requiresComment: true, commentLabel: 'Additional notes for the Section Head',         notifications: ['notify-section-head'] },

    { id: 'pay-fee',                  label: 'Pay Fee · Regenerate COC',              from: 'fee_pending',                      to: 'issued',                allowedRoles: ['applicant'],    variant: 'primary',  notifications: ['fee-paid'] },
  ],

  form: [
    {
      id: 'modification-reason',
      title: 'Modification Reason',
      description: 'Capture why the COC is being modified. Required before submission.',
      fields: [
        { id: 'modificationReason', label: 'Modification Reason', type: 'textarea', required: true, remark: 'Mandatory — describe the modification being requested.' },
      ],
      attachments: [
        { id: 'supportingDocs', label: 'Supporting Documents (PDF / JPG / GIF / DWG / DWF · max 10 MB)', required: false },
      ],
    },
    {
      id: 'premises-building',
      title: 'Premises & Building Information',
      description: 'Pre-populated from the latest issued COC. All fields are non-editable at this stage (subject to business confirmation).',
      fields: [
        { id: 'buildingName',     label: 'Building Name',           type: 'readonly' },
        { id: 'premisesType',     label: 'Premises Type',           type: 'readonly' },
        { id: 'premisesNumber',   label: 'Premises / Building No.', type: 'readonly' },
        { id: 'emirate',          label: 'Emirate',                 type: 'readonly' },
        { id: 'city',             label: 'City',                    type: 'readonly' },
        { id: 'area',             label: 'Area',                    type: 'readonly' },
        { id: 'sector',           label: 'Sector',                  type: 'readonly' },
        { id: 'plotNumber',       label: 'Plot Number',             type: 'readonly' },
        { id: 'coordinates',      label: 'Coordinates',             type: 'readonly' },
        { id: 'dmtMepsRef',       label: 'DMT MePs System Ref.',    type: 'readonly' },
      ],
      attachments: [],
    },
    {
      id: 'owner-consultant-contractor',
      title: 'Owner, Consultant & Contractor Information',
      description: 'Pre-populated from the latest issued COC. Editable fields are highlighted for the DOE reviewer on submission.',
      fields: [
        { id: 'premisesOwnerName',    label: 'Premises Owner’s Name',     type: 'text' },
        { id: 'premisesOwnerEid',     label: 'Premises Owner’s EID',      type: 'emirates-id' },
        { id: 'premisesOwnerContact', label: 'Premises Owner Contact Info',    type: 'text' },
        { id: 'projectConsultant',    label: 'Project Consultant',             type: 'text' },
        { id: 'gasInstallContractor', label: 'Gas Installation Contractor',    type: 'readonly' },
        { id: 'gasAmcContractor',     label: 'Gas AMC Contractor',             type: 'readonly' },
        { id: 'emergencyEmail',       label: 'Emergency Email',                type: 'text' },
        { id: 'fmCompany',            label: 'Facility Management Company',    type: 'text' },
        { id: 'fmContact',            label: 'FM Contact Info',                type: 'text' },
      ],
      attachments: [],
    },
    {
      id: 'gas-system-tpi',
      title: 'Gas System & TPI Details',
      description: 'Pre-populated from the latest issued COC. Highlight any changes for the DOE reviewer.',
      fields: [
        { id: 'tpiCompany',       label: 'Gas System TPI Company Name', type: 'text' },
        { id: 'tpiCocRef',        label: 'TPI CoC Ref Number',          type: 'text' },
        { id: 'tpiCocIssueDate',  label: 'TPI CoC Issue Date',          type: 'readonly' },
        { id: 'gasSystemType',    label: 'Gas System Type',             type: 'readonly' },
        { id: 'gasMedium',        label: 'Gas Medium',                  type: 'text' },
        { id: 'gasSupplyCompany', label: 'Gas Supply Company',          type: 'text' },
      ],
      attachments: [],
    },
    {
      id: 'required-attachments',
      title: 'Required Attachments',
      description: 'All documents are pre-populated from the latest issued COC. New documents can be uploaded; previous attachments cannot be deleted.',
      fields: [],
      attachments: [
        { id: 'tpiCocInspectionReport', label: 'TPI Certificate of Conformity (CoC) Inspection Report',  required: false },
        { id: 'tpiInspectionReport',    label: 'TPI Inspection Report',                                  required: false },
        { id: 'materialsList',          label: 'Materials List installed, approved by the TPI',          required: false },
        { id: 'gasSystemDrawings',      label: 'Gas system workshop and schematic drawings approved by DoE', required: false },
        { id: 'raCloseOutReport',       label: 'Risk Assessment (RA) Close-out Report approved by TPI',  required: false },
      ],
    },
  ],

  notifications: [
    { id: 'ack-applicant',                 channel: 'email', to: 'applicant',    subject: 'Modification of COC Application Received — %CompanyName% (Ref: %ApplicationNumber%)', body: 'Dear %CompanyName%,\n\nWe confirm receipt of your application for the Modification of Certificate of Completion (COC) for Gas Systems submitted via the DOE Unified Service Portal.\n\nApplication Reference: %ApplicationNumber%\nStatus: Under Review\n\nYou will be notified of the outcome at each stage of the review process. Please log in to the portal to track the status of your application.\n\nBest regards,\nDepartment of Energy — PPS Team' },
    { id: 'notify-engineer',               channel: 'email', to: 'engineer',     subject: 'Review for Modification of COC Application — %CompanyName%',                          body: 'Dear PPS Engineer,\n\n%CompanyName% has submitted a request for Modification of Certificate of Completion (COC) for Gas Systems and it is assigned for your review.\nApplication Reference: %ApplicationNumber%\n\nPlease log in to the DOE Unified Service Portal to review the application and take the appropriate action.\n\nBest regards,\nDepartment of Energy — PPS Team' },
    { id: 'return-applicant',              channel: 'email', to: 'applicant',    subject: 'More Information Required for Modification of COC Application (Ref: %ApplicationNumber%)',  body: 'Dear %CompanyName%,\n\nYour application for Modification of Certificate of Completion (COC) for Gas Systems with reference number %ApplicationNumber% has been reviewed by the Department of Energy (DoE), and additional information has been requested.\n\nReviewer Comments: %Comments%\n\nPlease log in to the DOE Unified Service Portal, address the requested clarifications and re-submit the application for further review.\n\nBest regards,\nDepartment of Energy — PPS Team' },
    { id: 'notify-section-head',           channel: 'email', to: 'section_head', subject: 'Application Awaiting Approval — Modification of COC Application — %CompanyName%',  body: 'Dear Section Head,\n\nThe %CompanyName% application for Modification of Certificate of Completion (COC) for Gas Systems has been reviewed and endorsed by the previous level.\nApplication Reference: %ApplicationNumber%\n\nPlease log in to the DOE Unified Service Portal to review the application and take the appropriate action.\n\nBest regards,\nDepartment of Energy — PPS Team' },
    { id: 'notify-engineer-more-info',     channel: 'email', to: 'engineer',     subject: 'More Information Required for Modification of COC (Ref: %ApplicationNumber%)',                body: 'Dear PPS Engineer,\n\nThe Modification request for COC for Gas Systems which you endorsed, with reference number %ApplicationNumber%, has been returned by the next-level approver for additional information.\n\nReviewer Comments: %Comments%\n\nPlease log in to the DOE Unified Service Portal, address the requested clarifications and re-submit the request for further review.\n\nBest regards,\nDepartment of Energy — PPS Team' },
    { id: 'reject-applicant',              channel: 'email', to: 'applicant',    subject: 'Rejection of Modification for COC Application (Ref: %ApplicationNumber%)',                   body: 'Dear %CompanyName%,\n\nWe regret to inform you that your application for the Modification of Certificate of Completion (COC) for Gas Systems, with reference number %ApplicationNumber%, has been rejected after review by the Department of Energy.\n\nReason: %Comments%\n\nFor further clarification, please contact the DOE PPS team or log in to the DOE Unified Service Portal to view the application.\n\nBest regards,\nDepartment of Energy — PPS Team' },
    { id: 'approve-applicant',             channel: 'email', to: 'applicant',    subject: 'Modification of COC Approved — Pay Fee (Ref: %ApplicationNumber%)',                     body: 'Dear %CompanyName%,\n\nYour application for Modification of Certificate of Completion (COC) for Gas Systems with reference number %ApplicationNumber% has been APPROVED by the Department of Energy.\nStatus: Approved — Payment Pending\n\nPlease log in to the DOE Unified Service Portal and click the “Pay Fee” button to complete the payment. The COC will be regenerated once the payment is successfully received.\n\nBest regards,\nDepartment of Energy — PPS Team' },
    { id: 'fee-paid',                      channel: 'email', to: 'applicant',    subject: 'Modification of COC Complete — Updated COC Issued (Ref: %ApplicationNumber%)',          body: 'Dear %CompanyName%,\n\nYour application for the Modification of Certificate of Completion (COC) for Gas Systems has been approved by the Department of Energy and the payment has been received successfully. The updated COC is now COMPLETE.\n\nApplication Reference: %ApplicationNumber%\nStatus: Approved — Updated COC Issued\n\nImportant notes:\n• The original COC application/reference number is retained — only the modified details are reflected on the updated certificate.\n• The document is authenticated with the DOE stamp and an embedded QR code. No signature is required.\n\nPlease find the updated COC document available in your account on the DOE Unified Service Portal.\n\nBest regards,\nDepartment of Energy — PPS Team' },
  ],

  sla: [
    { stage: 'Modification submission',           role: 'applicant',    days: 0 },
    { stage: 'PPS Engineer (Reviewer) review',    role: 'engineer',     days: 2 },
    { stage: 'Section Head (Approver) decision',  role: 'section_head', days: 2 },
    { stage: 'Applicant payment window',          role: 'applicant',    days: 7 },
  ],
};
