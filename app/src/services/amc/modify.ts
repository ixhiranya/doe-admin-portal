import type { ServiceDefinition } from '../../types';

// ============================================================================
// AMC — MODIFICATION of Annual Maintenance Contract for Gas Systems
// Source: AMC Enhancements SDD §3 (Modification of AMC)
//
// Enabled only when the AMC is Active. The AMC issue date and expiry date are
// preserved — the original AMC retains its number. Modified fields are
// highlighted on the form for both the applicant and the DOE reviewer.
//
// Two parallel tasks queued on submit: AMC Modification Approval + NOC
// Modification Approval (the linked NOC is auto-updated on completion; the
// previous NOC is cancelled).
//
// Workflow: draft → 3-tier review → payment → owner e-sign → company e-sign
//           → modified AMC re-issued (original number, original dates retained,
//             linked NOC re-generated).
// ============================================================================

export const amcModifyService: ServiceDefinition = {
  id: 'amc.modify',
  module: 'amc',
  action: 'modify',
  title: 'Modification of Annual Maintenance Contract for Gas Systems',
  shortTitle: 'AMC Modify',
  description:
    'Modify an active AMC. Pre-populated form, 3-tier DOE review, payment, owner + company e-signatures, then the AMC document is regenerated with the original AMC number, issue date and expiry date retained, and the linked NOC is auto-updated.',
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
    { id: 'issued',                   label: 'Modified AMC Issued',                category: 'issued' },
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

    { id: 'company-sign',            label: 'Sign with UAE Pass (Company) · Issue Modified AMC', from: 'pending_company_signature', to: 'issued',    allowedRoles: ['applicant'],    variant: 'primary', notifications: ['amc-modified'] },
    { id: 'company-raise-concern',   label: 'Raise Concern',                         from: 'pending_company_signature', to: 'pending_engineer',          allowedRoles: ['applicant'],    variant: 'warning', requiresComment: true, commentLabel: 'Concern raised by the Company (returns to DOE review)',        notifications: ['notify-engineer'] },
  ],

  form: [
    {
      id: 'modification-reason',
      title: 'Modification Trigger',
      description: 'Capture why the AMC is being modified. Required before submission.',
      fields: [
        { id: 'modificationReason', label: 'Reason for Modification', type: 'textarea', required: true, remark: 'Mandatory — describe the changes being requested and the rationale (e.g. equipment replacement, owner change).' },
      ],
      attachments: [
        { id: 'supportingDocs', label: 'Supporting Documents (PDF / JPG / DWG · max 10 MB)', required: false },
      ],
    },
    {
      id: 'company-info',
      title: 'Building & Maintenance Company Information',
      description: 'Pre-populated from the latest issued AMC. Editable fields are highlighted for the DOE reviewer on submission.',
      fields: [
        { id: 'companyLicense',  label: 'Company Commercial License',   type: 'readonly' },
        { id: 'companyName',     label: 'Maintenance Company Name',     type: 'readonly' },
        { id: 'representative',  label: 'Authorized Representative',    type: 'readonly' },
        { id: 'phone',           label: 'Company Mobile Number',        type: 'readonly' },
        { id: 'email',           label: 'Company Email Address',        type: 'text' },
        { id: 'emergencyContact',label: 'Gas Emergency Contact (24/7)', type: 'text' },
        { id: 'customerService', label: 'Customer Service Contact',     type: 'text' },
        { id: 'contractValue',   label: 'Maintenance Contract Value (AED)', type: 'text' },

        { id: 'buildingName',    label: 'Building Name (EN)',           type: 'readonly' },
        { id: 'premisesNumber',  label: 'Premises / Building Number',   type: 'readonly' },
        { id: 'emirate',         label: 'Emirate',                      type: 'readonly' },
        { id: 'city',            label: 'City',                         type: 'readonly' },
        { id: 'makanyId',        label: 'Makany No.',                   type: 'readonly' },
        { id: 'electricMeter',   label: 'Electric Meter No.',           type: 'readonly' },
        { id: 'detailedAddress', label: 'Detailed Address',             type: 'readonly' },
        { id: 'guardName',       label: 'Guard Name',                   type: 'text' },
        { id: 'guardMobile',     label: 'Guard Mobile',                 type: 'text' },
      ],
      attachments: [],
    },
    {
      id: 'building-owners',
      title: 'Building Owners (Signatories)',
      description: 'Existing owners are pre-populated and editable. Owners may be added, edited or deleted. Any change is highlighted for the DOE reviewer.',
      fields: [],
      repeatable: {
        itemLabel: 'Building owner',
        perItemAttachments: [
          { id: 'passportCopy', label: 'Passport and UAE ID Copy', required: false },
        ],
      },
    },
    {
      id: 'systems-equipment',
      title: 'Systems & Equipment Details',
      description: 'Pre-populated from the previous AMC. Add new systems / equipment or edit / delete existing entries.',
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
      description: 'All documents are pre-populated from the previous AMC. New documents can be uploaded; previous attachments cannot be deleted.',
      fields: [],
      attachments: [
        { id: 'updatedLayout',    label: 'Updated Gas-System Layout (if equipment changed)', required: false },
        { id: 'modificationDocs', label: 'Modification Supporting Documents',                 required: false },
      ],
    },
  ],

  notifications: [
    { id: 'ack-applicant',                 channel: 'email', to: 'applicant',    subject: 'Modification of AMC Application Received (Ref: %ApplicationNumber%)', body: 'Dear %CompanyName%,\n\nWe confirm receipt of your application for the Modification of Annual Maintenance Contract (AMC) for Gas Systems submitted via the DOE Unified Service Portal.\n\nApplication Reference: %ApplicationNumber%\nStatus: Under Review\n\nBest regards,\nDepartment of Energy — PPS Team' },
    { id: 'notify-engineer',               channel: 'email', to: 'engineer',     subject: 'Review for Modification of AMC Application — %CompanyName%', body: 'Dear PPS Engineer,\n\n%CompanyName% has submitted a request for Modification of Annual Maintenance Contract (AMC) for Gas Systems and it is assigned for your review.\nApplication Reference: %ApplicationNumber%\n\nBest regards,\nDepartment of Energy — PPS Team' },
    { id: 'return-applicant',              channel: 'email', to: 'applicant',    subject: 'AMC Modification — More information required (Ref: %ApplicationNumber%)', body: 'Dear %CompanyName%,\n\nAdditional information is required for your AMC Modification application (Ref: %ApplicationNumber%).\n\nReviewer Comments: %Comments%\n\nPlease log in to the portal, address the clarifications and re-submit.\n\nBest regards,\nDepartment of Energy — PPS Team' },
    { id: 'notify-section-head',           channel: 'email', to: 'section_head', subject: 'AMC Modification Awaiting Approval — %CompanyName%', body: 'Dear Section Head,\n\nThe AMC Modification application from %CompanyName% has been endorsed by the PPS Engineer and is awaiting your approval.\nApplication Reference: %ApplicationNumber%\n\nBest regards,\nDepartment of Energy — PPS Team' },
    { id: 'notify-engineer-more-info',     channel: 'email', to: 'engineer',     subject: 'Additional information requested — %CompanyName%', body: 'Dear PPS Engineer,\n\nThe Section Head has requested additional information on AMC Modification application %ApplicationNumber%.\n\nComments: %Comments%\n\nBest regards,\nDepartment of Energy — PPS Team' },
    { id: 'notify-director',               channel: 'email', to: 'director',     subject: 'AMC Modification Awaiting Final Approval — %CompanyName%', body: 'Dear Director,\n\nThe AMC Modification application from %CompanyName% has been endorsed and is awaiting your final decision.\nApplication Reference: %ApplicationNumber%\n\nBest regards,\nDepartment of Energy — PPS Team' },
    { id: 'notify-section-head-more-info', channel: 'email', to: 'section_head', subject: 'Additional information requested — %CompanyName%', body: 'Dear Section Head,\n\nThe Director has requested additional information on AMC Modification application %ApplicationNumber%.\n\nComments: %Comments%\n\nBest regards,\nDepartment of Energy — PPS Team' },
    { id: 'reject-applicant',              channel: 'email', to: 'applicant',    subject: 'Rejection — Modification of AMC (Ref: %ApplicationNumber%)', body: 'Dear %CompanyName%,\n\nWe regret to inform you that your application for Modification of AMC for Gas Systems has been rejected.\n\nApplication Reference: %ApplicationNumber%\nReason: %Comments%\n\nBest regards,\nDepartment of Energy — PPS Team' },
    { id: 'approve-applicant',             channel: 'email', to: 'applicant',    subject: 'Modification Approved — Pay Fee (Ref: %ApplicationNumber%)', body: 'Dear %CompanyName%,\n\nYour application for Modification of Annual Maintenance Contract (AMC) for Gas Systems has been APPROVED.\nStatus: Approved — Payment Pending\n\nPlease log in to the DOE Unified Service Portal and click "Pay Fee" to proceed.\n\nBest regards,\nDepartment of Energy — PPS Team' },
    { id: 'notify-owner-signature',        channel: 'email', to: 'applicant',    subject: 'AMC Modification — Owner E-Signature Required (Ref: %ApplicationNumber%)', body: 'Dear Building Owner,\n\nThe AMC Modification has been approved and payment received. Please log in and either:\n\n• Click "Sign with UAE Pass" to digitally sign the modified AMC, OR\n• Click "Raise Concern" to return the application to the DOE review cycle.\n\nBest regards,\nDepartment of Energy — PPS Team' },
    { id: 'notify-company-signature',      channel: 'email', to: 'applicant',    subject: 'AMC Modification — Company E-Signature Required (Ref: %ApplicationNumber%)', body: 'Dear %CompanyName%,\n\nThe modified AMC has been signed by the Building Owner and is awaiting your e-signature.\n\nBest regards,\nDepartment of Energy — PPS Team' },
    { id: 'amc-modified',                  channel: 'email', to: 'applicant',    subject: 'Modification of AMC Complete (Ref: %ApplicationNumber%)', body: 'Dear %CompanyName%,\n\nYour Modification of Annual Maintenance Contract (AMC) for Gas Systems has been signed by both parties and is now COMPLETE.\n\nApplication Reference: %ApplicationNumber%\nThe AMC number, issue date and expiry date have been retained from the original AMC.\nThe linked NOC has been auto-updated; the previous NOC has been cancelled.\n\nThe modified AMC document (with embedded QR code and DOE stamp) is now available in your DOE Unified Service Portal account.\n\nBest regards,\nDepartment of Energy — PPS Team' },
  ],

  sla: [
    { stage: 'PPS Engineer review',       role: 'engineer',     days: 10 },
    { stage: 'Section Head decision',     role: 'section_head', days: 5 },
    { stage: 'Director final decision',   role: 'director',     days: 2 },
    { stage: 'Owner e-signature window',  role: 'applicant',    days: 7 },
    { stage: 'Company e-signature window',role: 'applicant',    days: 7 },
  ],
};
