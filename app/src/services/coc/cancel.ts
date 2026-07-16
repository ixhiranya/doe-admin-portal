import type { ServiceDefinition } from '../../types';

// ============================================================================
// COC — CANCELLATION of Certificate of Completion (COC) for Gas Systems
// Source: "Certificate of Completion Enhancement Solution Design Document" §2
//          (Cancellation of Certificate of Completion (COC) for Gas Systems)
//
// Enabled only when the linked COC is Active/Issued. Disabled if the COC is
// already Cancelled, Revoked or in another open workflow.
//
// Slim form: Reason for Cancellation (mandatory) + optional supporting
// documents. The previous COC application form is pre-populated and shown
// read-only alongside this Cancellation form; no COC field values are
// modified by this service.
//
// Two-tier DOE review: PPS Engineer (Reviewer) → Section Head (Approver).
// A "Request for More Info" from the Section Head returns the application to
// the PPS Engineer (one step back); a "Request for More Info" from the PPS
// Engineer returns the application to the company.
//
// Payment is taken AFTER Section Head approval (configurable, 0 AED for
// go-live pending ADEO approval of the service fees).
//
// On payment success the system regenerates the COC document with a
// "Cancelled" tag, prints the final cancellation approval date, retains the
// original COC application/reference number, and updates the linked COC
// record status to "Cancelled". The certificate is authenticated with an
// embedded QR code and the DOE stamp. No signature is required.
// ============================================================================

export const cocCancelService: ServiceDefinition = {
  id: 'coc.cancel',
  module: 'coc',
  action: 'cancel',
  title: 'Cancellation of Certificate of Completion (COC) for Gas Systems',
  shortTitle: 'COC Cancel',
  description:
    'Cancel an active Certificate of Completion (COC) for Gas Systems. Two-tier DOE review (PPS Engineer → Section Head), payment after approval, then the COC document is regenerated with a "Cancelled" tag and the linked COC record status is updated to Cancelled.',
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
    { id: 'issued',                label: 'Approved · COC Cancelled',           category: 'issued' },
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

    { id: 'pay-fee',                  label: 'Pay Fee · Issue Cancelled COC',         from: 'fee_pending',                      to: 'issued',                allowedRoles: ['applicant'],    variant: 'primary',  notifications: ['fee-paid'] },
  ],

  form: [
    {
      id: 'cancellation-reason',
      title: 'Cancellation Reason',
      description: 'Capture the cancellation reason and any supporting documents. The previous COC application form is pre-populated and read-only on the alongside tab — no COC field values are modified by this service.',
      fields: [
        { id: 'cancellationReason', label: 'Reason for Cancellation', type: 'textarea', required: true, remark: 'Mandatory — e.g. premises / gas system no longer in operation, or COC issued in error.' },
      ],
      attachments: [
        { id: 'supportingDocs', label: 'Supporting Documents (PDF / JPG / GIF / DWG / DWF · max 10 MB)', required: false },
      ],
    },
    {
      id: 'coc-reference',
      title: 'COC Reference (Read-Only)',
      description: 'Pre-populated from the active COC selected for cancellation. All fields are non-editable.',
      fields: [
        { id: 'buildingName',     label: 'Building Name',           type: 'readonly' },
        { id: 'premisesType',     label: 'Premises Type',           type: 'readonly' },
        { id: 'premisesNumber',   label: 'Premises / Building No.', type: 'readonly' },
        { id: 'emirate',          label: 'Emirate',                 type: 'readonly' },
        { id: 'city',             label: 'City',                    type: 'readonly' },
        { id: 'area',             label: 'Area',                    type: 'readonly' },
        { id: 'plotNumber',       label: 'Plot Number',             type: 'readonly' },
        { id: 'gasSystemType',    label: 'Gas System Type',         type: 'readonly' },
        { id: 'gasMedium',        label: 'Gas Medium',              type: 'readonly' },
        { id: 'tpiCompany',       label: 'TPI Company',             type: 'readonly' },
        { id: 'tpiCocRef',        label: 'TPI CoC Ref Number',      type: 'readonly' },
        { id: 'gasInstallContractor', label: 'Gas Installation Contractor', type: 'readonly' },
        { id: 'gasAmcContractor',     label: 'Gas AMC Contractor',         type: 'readonly' },
      ],
      attachments: [],
    },
  ],

  notifications: [
    { id: 'ack-applicant',                 channel: 'email', to: 'applicant',    subject: 'Cancellation of COC Application Received — %CompanyName% (Ref: %ApplicationNumber%)', body: 'Dear %CompanyName%,\n\nWe confirm receipt of your application for the Cancellation of Certificate of Completion (COC) for Gas Systems submitted via the DOE Unified Service Portal.\n\nApplication Reference: %ApplicationNumber%\nStatus: Under Review\n\nYou will be notified of the outcome at each stage of the review process. Please log in to the portal to track the status of your application.\n\nBest regards,\nDepartment of Energy — PPS Team' },
    { id: 'notify-engineer',               channel: 'email', to: 'engineer',     subject: 'Review for Cancellation of COC Application — %CompanyName%',                          body: 'Dear PPS Engineer,\n\n%CompanyName% has submitted a request for Cancellation of Certificate of Completion (COC) for Gas Systems and it is assigned for your review.\nApplication Reference: %ApplicationNumber%\n\nPlease log in to the DOE Unified Service Portal to review the application and take the appropriate action.\n\nBest regards,\nDepartment of Energy — PPS Team' },
    { id: 'return-applicant',              channel: 'email', to: 'applicant',    subject: 'More Information Required for Cancellation of COC Application (Ref: %ApplicationNumber%)',  body: 'Dear %CompanyName%,\n\nYour application for Cancellation of Certificate of Completion (COC) for Gas Systems with reference number %ApplicationNumber% has been reviewed by the Department of Energy (DoE), and additional information has been requested.\n\nReviewer Comments: %Comments%\n\nPlease log in to the DOE Unified Service Portal, address the requested clarifications and re-submit the application for further review.\n\nBest regards,\nDepartment of Energy — PPS Team' },
    { id: 'notify-section-head',           channel: 'email', to: 'section_head', subject: 'Application Awaiting Approval — Cancellation of COC Application — %CompanyName%',  body: 'Dear Section Head,\n\nThe %CompanyName% application for Cancellation of Certificate of Completion (COC) for Gas Systems has been reviewed and endorsed by the previous level.\nApplication Reference: %ApplicationNumber%\n\nPlease log in to the DOE Unified Service Portal to review the application and take the appropriate action.\n\nBest regards,\nDepartment of Energy — PPS Team' },
    { id: 'notify-engineer-more-info',     channel: 'email', to: 'engineer',     subject: 'More Information Required for Cancellation of COC (Ref: %ApplicationNumber%)',                body: 'Dear PPS Engineer,\n\nThe Cancellation request for COC for Gas Systems which you endorsed, with reference number %ApplicationNumber%, has been returned by the next-level approver for additional information.\n\nReviewer Comments: %Comments%\n\nPlease log in to the DOE Unified Service Portal, address the requested clarifications and re-submit the request for further review.\n\nBest regards,\nDepartment of Energy — PPS Team' },
    { id: 'reject-applicant',              channel: 'email', to: 'applicant',    subject: 'Rejection of Cancellation for COC Application (Ref: %ApplicationNumber%)',                   body: 'Dear %CompanyName%,\n\nWe regret to inform you that your application for the Cancellation of Certificate of Completion (COC) for Gas Systems, with reference number %ApplicationNumber%, has been rejected after review by the Department of Energy.\n\nReason: %Comments%\n\nFor further clarification, please contact the DOE PPS team or log in to the DOE Unified Service Portal to view the application.\n\nBest regards,\nDepartment of Energy — PPS Team' },
    { id: 'approve-applicant',             channel: 'email', to: 'applicant',    subject: 'Cancellation of COC Approved — Pay Fee (Ref: %ApplicationNumber%)',                     body: 'Dear %CompanyName%,\n\nYour application for Cancellation of Certificate of Completion (COC) for Gas Systems with reference number %ApplicationNumber% has been APPROVED by the Department of Energy.\nStatus: Approved — Payment Pending\n\nPlease log in to the DOE Unified Service Portal and click the “Pay Fee” button to complete the payment. The cancelled COC will be generated once the payment is successfully received.\n\nBest regards,\nDepartment of Energy — PPS Team' },
    { id: 'fee-paid',                      channel: 'email', to: 'applicant',    subject: 'Cancellation of COC Complete — Cancelled COC Issued (Ref: %ApplicationNumber%)',          body: 'Dear %CompanyName%,\n\nYour application for the Cancellation of Certificate of Completion (COC) for Gas Systems has been approved by the Department of Energy and the payment has been received successfully. The cancellation is now COMPLETE.\n\nApplication Reference: %ApplicationNumber%\nStatus: Approved — COC Cancelled\n\nImportant notes:\n• The original COC application/reference number is retained on the cancelled document.\n• The final cancellation approval date is printed on the document.\n• The linked COC record status has been updated to “Cancelled”.\n• The document is authenticated with the DOE stamp and an embedded QR code. No signature is required.\n\nPlease find the cancelled COC document available in your account on the DOE Unified Service Portal.\n\nBest regards,\nDepartment of Energy — PPS Team' },
  ],

  sla: [
    { stage: 'Cancellation submission',           role: 'applicant',    days: 0 },
    { stage: 'PPS Engineer (Reviewer) review',    role: 'engineer',     days: 2 },
    { stage: 'Section Head (Approver) decision',  role: 'section_head', days: 2 },
    { stage: 'Applicant payment window',          role: 'applicant',    days: 7 },
  ],
};
