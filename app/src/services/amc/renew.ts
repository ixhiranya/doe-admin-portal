import type { ServiceDefinition } from '../../types';

// ============================================================================
// AMC — RENEWAL of Annual Maintenance Contract for Gas Systems
// Source: AMC Enhancements SDD §2 (Renewal of AMC for Gas Systems)
//
// Eligibility window:
//   • Renew button enabled within 1 month before the AMC expiry date.
//   • 30-day grace period after expiry (AMC status = "Expired" in grace).
//   • Beyond grace → escalation to PPS Gas Regulations Team; renewal blocked
//     until violations are cleared.
//
// Reminders sent to Building Owner / Gas Operator / Facility Management:
//   1 month · 15 days · 7 days · on expiry date. Includes the regulatory
//   notice (DoE Chairman's Decision 14/2025, fine 100k–400k AED).
//
// Workflow: draft → 3-tier review → payment → owner e-sign → company e-sign
//           → renewed AMC (1-year validity).
// ============================================================================

export const amcRenewService: ServiceDefinition = {
  id: 'amc.renew',
  module: 'amc',
  action: 'renew',
  title: 'Renewal of Annual Maintenance Contract for Gas Systems',
  shortTitle: 'AMC Renew',
  description:
    'Renew an active AMC within the 1-month pre-expiry window or the 30-day post-expiry grace period. Pre-populated form, 3-tier DOE review, payment, owner + company e-signatures, then renewed AMC issued for one year.',
  initialState: 'draft',
  feeAmount: 0,
  certificateValidityYears: 1,

  states: [
    { id: 'draft',                    label: 'Draft',                              category: 'draft',     ownerRole: 'applicant' },
    { id: 'pending_engineer',         label: 'Under Review',                       category: 'pending',   ownerRole: 'engineer' },
    { id: 'returned_to_applicant',    label: 'Requested for More Info',            category: 'returned',  ownerRole: 'applicant' },
    { id: 'pending_section_head',     label: 'Pending Section Head',               category: 'pending',   ownerRole: 'section_head' },
    { id: 'pending_director',         label: 'Pending Director',                   category: 'pending',   ownerRole: 'director' },
    { id: 'returned_to_engineer',     label: 'Sent Back to Engineer',              category: 'returned',  ownerRole: 'engineer' },
    { id: 'returned_to_section_head', label: 'Sent Back to Section Head',          category: 'returned',  ownerRole: 'section_head' },
    { id: 'fee_pending',              label: 'Approved · Payment Pending',         category: 'payment',   ownerRole: 'applicant' },
    { id: 'pending_owner_signature',  label: 'Waiting for Owner E-Signature',      category: 'pending',   ownerRole: 'applicant' },
    { id: 'pending_company_signature',label: 'Waiting for Company E-Signature',    category: 'pending',   ownerRole: 'applicant' },
    { id: 'issued',                   label: 'Renewed',                            category: 'issued' },
    { id: 'rejected',                 label: 'Application Rejected',               category: 'rejected' },
    { id: 'cancelled',                label: 'Withdrawn',                          category: 'cancelled' },
  ],

  transitions: [
    { id: 'save-draft',              label: 'Save',                                  from: 'draft',                            to: 'draft',                     allowedRoles: ['applicant'],    variant: 'secondary' },
    { id: 'submit',                  label: 'Submit',                                from: ['draft', 'returned_to_applicant'], to: 'pending_engineer',          allowedRoles: ['applicant'],    variant: 'primary',   notifications: ['ack-applicant', 'notify-engineer'] },

    { id: 'engineer-request-info',   label: 'Request for More Info',                 from: 'pending_engineer',          to: 'returned_to_applicant',     allowedRoles: ['engineer'],     variant: 'warning', requiresComment: true, commentLabel: 'What additional information is required?', notifications: ['return-applicant'] },
    { id: 'engineer-reject',         label: 'Reject',                                from: 'pending_engineer',          to: 'rejected',                  allowedRoles: ['engineer'],     variant: 'danger',  requiresComment: true, commentLabel: 'Reason for rejection',                       notifications: ['reject-applicant'] },
    { id: 'engineer-approve',        label: 'Endorse & Forward to Section Head',     from: 'pending_engineer',          to: 'pending_section_head',      allowedRoles: ['engineer'],     variant: 'success', notifications: ['notify-section-head'] },

    { id: 'sh-request-info',         label: 'Request for More Info (Engineer)',      from: 'pending_section_head',      to: 'returned_to_engineer',      allowedRoles: ['section_head'], variant: 'warning', requiresComment: true, commentLabel: 'What additional information is required from the Engineer?', notifications: ['notify-engineer-more-info'] },
    { id: 'sh-reject',               label: 'Reject',                                from: 'pending_section_head',      to: 'rejected',                  allowedRoles: ['section_head'], variant: 'danger',  requiresComment: true, commentLabel: 'Reason for rejection',                       notifications: ['reject-applicant'] },
    { id: 'sh-approve',              label: 'Approve & Forward to Director',         from: 'pending_section_head',      to: 'pending_director',          allowedRoles: ['section_head'], variant: 'success', notifications: ['notify-director'] },

    { id: 'eng-resubmit-to-sh',      label: 'Re-endorse to Section Head',            from: 'returned_to_engineer',      to: 'pending_section_head',      allowedRoles: ['engineer'],     variant: 'success', requiresComment: true, commentLabel: 'Additional notes for the Section Head',         notifications: ['notify-section-head'] },

    { id: 'director-request-info',   label: 'Request for More Info (Section Head)',  from: 'pending_director',          to: 'returned_to_section_head',  allowedRoles: ['director'],     variant: 'warning', requiresComment: true, commentLabel: 'What additional information is required?', notifications: ['notify-section-head-more-info'] },
    { id: 'director-reject',         label: 'Reject',                                from: 'pending_director',          to: 'rejected',                  allowedRoles: ['director'],     variant: 'danger',  requiresComment: true, commentLabel: 'Reason for rejection',                       notifications: ['reject-applicant'] },
    { id: 'director-approve',        label: 'Final Approve · Request Fee Payment',   from: 'pending_director',          to: 'fee_pending',               allowedRoles: ['director'],     variant: 'success', notifications: ['approve-applicant'] },

    { id: 'sh-resubmit-to-director', label: 'Re-endorse to Director',                from: 'returned_to_section_head',  to: 'pending_director',          allowedRoles: ['section_head'], variant: 'success', requiresComment: true, commentLabel: 'Additional notes for the Director',             notifications: ['notify-director'] },

    { id: 'pay-fee',                 label: 'Pay Fee · Route to Owner',              from: 'fee_pending',               to: 'pending_owner_signature',   allowedRoles: ['applicant'],    variant: 'primary', notifications: ['notify-owner-signature'] },

    { id: 'owner-sign',              label: 'Sign with UAE Pass (Owner)',            from: 'pending_owner_signature',   to: 'pending_company_signature', allowedRoles: ['applicant'],    variant: 'primary', notifications: ['notify-company-signature'] },
    { id: 'owner-raise-concern',     label: 'Raise Concern',                         from: 'pending_owner_signature',   to: 'pending_engineer',          allowedRoles: ['applicant'],    variant: 'warning', requiresComment: true, commentLabel: 'Concern raised by the Building Owner (returns to DOE review)', notifications: ['notify-engineer'] },

    { id: 'company-sign',            label: 'Sign with UAE Pass (Company) · Issue Renewed AMC', from: 'pending_company_signature', to: 'issued',     allowedRoles: ['applicant'],    variant: 'primary', notifications: ['amc-renewed'] },
    { id: 'company-raise-concern',   label: 'Raise Concern',                         from: 'pending_company_signature', to: 'pending_engineer',          allowedRoles: ['applicant'],    variant: 'warning', requiresComment: true, commentLabel: 'Concern raised by the Company (returns to DOE review)',        notifications: ['notify-engineer'] },
  ],

  form: [
    {
      id: 'company-info',
      title: 'Building & Maintenance Company Information',
      description: 'Pre-populated from the latest approved AMC. Building info is non-editable; Maintenance-company contact details and contract value can be updated. Any change is highlighted for the DOE reviewer.',
      fields: [
        { id: 'companyLicense',  label: 'Company Commercial License',   type: 'readonly' },
        { id: 'companyName',     label: 'Maintenance Company Name',     type: 'readonly' },
        { id: 'representative',  label: 'Authorized Representative',    type: 'readonly' },
        { id: 'phone',           label: 'Company Mobile Number',        type: 'readonly' },
        { id: 'email',           label: 'Company Email Address',        type: 'text',     required: true },
        { id: 'emergencyContact',label: 'Gas Emergency Contact (24/7)', type: 'text',     required: true },
        { id: 'customerService', label: 'Customer Service Contact',     type: 'text',     required: true },
        { id: 'contractValue',   label: 'Maintenance Contract Value (AED)', type: 'text', required: true, remark: 'Editable — updated annual fee between owner and maintenance company.' },

        { id: 'buildingName',    label: 'Building Name (EN)',           type: 'readonly' },
        { id: 'premisesNumber',  label: 'Premises / Building Number',   type: 'readonly' },
        { id: 'emirate',         label: 'Emirate',                      type: 'readonly' },
        { id: 'city',            label: 'City',                         type: 'readonly' },
        { id: 'plotNo',          label: 'Plot No.',                     type: 'readonly' },
        { id: 'makanyId',        label: 'Makany No.',                   type: 'readonly' },
        { id: 'electricMeter',   label: 'Electric Meter No.',           type: 'readonly' },
        { id: 'detailedAddress', label: 'Detailed Address',             type: 'readonly' },
        { id: 'floors',          label: 'Number of Floors',             type: 'readonly' },
        { id: 'flats',           label: 'Number of Flats',              type: 'readonly' },
        { id: 'guardName',       label: 'Guard Name',                   type: 'text' },
        { id: 'guardMobile',     label: 'Guard Mobile',                 type: 'text' },
      ],
      attachments: [
        { id: 'makanyDoc',       label: 'Makany Validation Document (pre-populated from previous AMC)', required: false },
        { id: 'electricDoc',     label: 'Electric Meter Validation Document',                           required: false },
      ],
    },
    {
      id: 'building-owners',
      title: 'Building Owners (Signatories)',
      description: 'Existing owners are pre-populated and editable. New owners can be added — new additions are highlighted for the DOE reviewer.',
      fields: [],
      repeatable: {
        itemLabel: 'Building owner',
        perItemAttachments: [
          { id: 'passportCopy',  label: 'Passport and UAE ID Copy', required: false },
          { id: 'signatureFile', label: 'Signature Sample',          required: false },
        ],
      },
    },
    {
      id: 'systems-equipment',
      title: 'Systems & Equipment Details',
      description: 'Pre-populated from the previous AMC. Add new systems / equipment or edit / delete existing entries as needed.',
      fields: [],
      repeatable: {
        itemLabel: 'Equipment item',
        perItemAttachments: [
          { id: 'equipmentSpec', label: 'Equipment Specification / Datasheet', required: false },
        ],
      },
    },
    {
      id: 'required-attachments',
      title: 'Required Attachments',
      description: 'All documents are pre-populated from the previous AMC. You may upload new documents; previous attachments cannot be deleted.',
      fields: [],
      attachments: [
        { id: 'commercialLicense', label: 'Maintenance Company Commercial License — updated', required: true },
        { id: 'engineerCard',      label: 'Engineer-in-Charge UAE ID Card',                   required: false },
        { id: 'siteSurveyReport',  label: 'Updated Site Survey Report (if equipment changed)', required: false },
        { id: 'ownerAuthLetter',   label: 'Owner Authorization Letter — renewal',             required: true },
      ],
    },
  ],

  notifications: [
    { id: 'ack-applicant',                 channel: 'email', to: 'applicant',    subject: 'Renewal of AMC Application Received (Ref: %ApplicationNumber%)', body: 'Dear %CompanyName%,\n\nWe confirm receipt of your application for the Renewal of Annual Maintenance Contract (AMC) for Gas Systems submitted via the DOE Unified Service Portal.\n\nApplication Reference: %ApplicationNumber%\nStatus: Under Review\n\nBest regards,\nDepartment of Energy — PPS Team' },
    { id: 'notify-engineer',               channel: 'email', to: 'engineer',     subject: 'Review for Renewal of AMC Application — %CompanyName%', body: 'Dear PPS Engineer,\n\n%CompanyName% has submitted a request for Renewal of Annual Maintenance Contract (AMC) for Gas Systems and it is assigned for your review.\nApplication Reference: %ApplicationNumber%\n\nBest regards,\nDepartment of Energy — PPS Team' },
    { id: 'return-applicant',              channel: 'email', to: 'applicant',    subject: 'AMC Renewal — More information required (Ref: %ApplicationNumber%)', body: 'Dear %CompanyName%,\n\nAdditional information is required for your AMC Renewal application (Ref: %ApplicationNumber%).\n\nReviewer Comments: %Comments%\n\nPlease log in to the portal, address the clarifications and re-submit.\n\nBest regards,\nDepartment of Energy — PPS Team' },
    { id: 'notify-section-head',           channel: 'email', to: 'section_head', subject: 'AMC Renewal Awaiting Approval — %CompanyName%', body: 'Dear Section Head,\n\nThe AMC Renewal application from %CompanyName% has been endorsed by the PPS Engineer and is awaiting your approval.\nApplication Reference: %ApplicationNumber%\n\nBest regards,\nDepartment of Energy — PPS Team' },
    { id: 'notify-engineer-more-info',     channel: 'email', to: 'engineer',     subject: 'Additional information requested — %CompanyName%', body: 'Dear PPS Engineer,\n\nThe Section Head has requested additional information on AMC Renewal application %ApplicationNumber%.\n\nComments: %Comments%\n\nBest regards,\nDepartment of Energy — PPS Team' },
    { id: 'notify-director',               channel: 'email', to: 'director',     subject: 'AMC Renewal Awaiting Final Approval — %CompanyName%', body: 'Dear Director,\n\nThe AMC Renewal application from %CompanyName% has been endorsed and is awaiting your final decision.\nApplication Reference: %ApplicationNumber%\n\nBest regards,\nDepartment of Energy — PPS Team' },
    { id: 'notify-section-head-more-info', channel: 'email', to: 'section_head', subject: 'Additional information requested — %CompanyName%', body: 'Dear Section Head,\n\nThe Director has requested additional information on AMC Renewal application %ApplicationNumber%.\n\nComments: %Comments%\n\nBest regards,\nDepartment of Energy — PPS Team' },
    { id: 'reject-applicant',              channel: 'email', to: 'applicant',    subject: 'Rejection — Renewal of AMC (Ref: %ApplicationNumber%)', body: 'Dear %CompanyName%,\n\nWe regret to inform you that your application for the Renewal of AMC for Gas Systems has been rejected.\n\nApplication Reference: %ApplicationNumber%\nReason: %Comments%\n\nBest regards,\nDepartment of Energy — PPS Team' },
    { id: 'approve-applicant',             channel: 'email', to: 'applicant',    subject: 'Renewal Approved — Pay Fee (Ref: %ApplicationNumber%)', body: 'Dear %CompanyName%,\n\nYour application for Renewal of Annual Maintenance Contract (AMC) for Gas Systems has been APPROVED.\nStatus: Approved — Payment Pending\n\nPlease log in to the DOE Unified Service Portal and click "Pay Fee" to complete the payment. The application will proceed to e-signature once the payment is received.\n\nBest regards,\nDepartment of Energy — PPS Team' },
    { id: 'notify-owner-signature',        channel: 'email', to: 'applicant',    subject: 'AMC Renewal — Owner E-Signature Required (Ref: %ApplicationNumber%)', body: 'Dear Building Owner,\n\nThe AMC Renewal for your premises has been approved and payment received. Please log in and either:\n\n• Click "Sign with UAE Pass" to digitally sign the renewed AMC, OR\n• Click "Raise Concern" to return the application to the DOE review cycle.\n\nBest regards,\nDepartment of Energy — PPS Team' },
    { id: 'notify-company-signature',      channel: 'email', to: 'applicant',    subject: 'AMC Renewal — Company E-Signature Required (Ref: %ApplicationNumber%)', body: 'Dear %CompanyName%,\n\nThe renewed AMC has been signed by the Building Owner and is awaiting your e-signature. Please log in and either:\n\n• Click "Sign with UAE Pass" to digitally sign, OR\n• Click "Raise Concern" to return the application to the DOE review cycle.\n\nBest regards,\nDepartment of Energy — PPS Team' },
    { id: 'amc-renewed',                   channel: 'email', to: 'applicant',    subject: 'AMC Renewal Complete — Renewed AMC Issued (Ref: %ApplicationNumber%)', body: 'Dear %CompanyName%,\n\nYour Renewal of Annual Maintenance Contract (AMC) for Gas Systems has been signed by both parties and is now COMPLETE.\n\nApplication Reference: %ApplicationNumber%\nValidity: One year from the date of issue\n\nThe renewed AMC document (with embedded QR code and DOE stamp) is now available in your DOE Unified Service Portal account. The previous AMC has been moved to Archived status.\n\nBest regards,\nDepartment of Energy — PPS Team' },

    // Reminder series (SDD §2.3.2)
    { id: 'reminder-30d',                  channel: 'email', to: 'applicant',    subject: 'Reminder — AMC Renewal Required (Ref: %ApplicationNumber%)', body: 'Dear Recipient,\n\nThis is a reminder that your Annual Maintenance Contract (AMC) for Gas Systems expires in 1 month.\nApplication Reference: %ApplicationNumber%\nExpiry Date: %ExpiryDate%\n\nImportant regulatory notice:\n• Failure to renew the AMC for the gas system may constitute a regulatory violation in accordance with DoE Chairman\'s Decision No. (14) of 2025.\n• Penalties under Fine No. (14) range from AED 100,000 to AED 400,000.\n\nBest regards,\nDepartment of Energy — PPS Team' },
    { id: 'reminder-15d',                  channel: 'email', to: 'applicant',    subject: 'Reminder — AMC Renewal Required (15 days) (Ref: %ApplicationNumber%)', body: 'Dear Recipient,\n\nThis is a reminder that your AMC for Gas Systems expires in 15 days.\nApplication Reference: %ApplicationNumber%\nExpiry Date: %ExpiryDate%\n\nFailure to renew may result in fines (AED 100,000 – 400,000) under DoE Chairman\'s Decision No. (14) of 2025.\n\nBest regards,\nDepartment of Energy — PPS Team' },
    { id: 'reminder-7d',                   channel: 'email', to: 'applicant',    subject: 'Reminder — AMC Renewal Required (7 days) (Ref: %ApplicationNumber%)', body: 'Dear Recipient,\n\nThis is a reminder that your AMC for Gas Systems expires in 7 days.\nApplication Reference: %ApplicationNumber%\nExpiry Date: %ExpiryDate%\n\nBest regards,\nDepartment of Energy — PPS Team' },
    { id: 'reminder-due',                  channel: 'email', to: 'applicant',    subject: 'AMC Expires Today — Renew Now (Ref: %ApplicationNumber%)', body: 'Dear Recipient,\n\nYour AMC for Gas Systems expires today (%ExpiryDate%). Please submit the Renewal application immediately to avoid regulatory violations.\n\nApplication Reference: %ApplicationNumber%\n\nBest regards,\nDepartment of Energy — PPS Team' },
  ],

  sla: [
    { stage: 'Renewal window (1mo pre-expiry + 30d grace)', role: 'applicant',    days: 0 },
    { stage: 'PPS Engineer review',                          role: 'engineer',     days: 10 },
    { stage: 'Section Head decision',                        role: 'section_head', days: 5 },
    { stage: 'Director final decision',                      role: 'director',     days: 2 },
    { stage: 'Owner e-signature window',                     role: 'applicant',    days: 7 },
    { stage: 'Company e-signature window',                   role: 'applicant',    days: 7 },
  ],
};
