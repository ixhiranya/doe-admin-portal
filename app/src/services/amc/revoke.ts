import type { ServiceDefinition } from '../../types';

// ============================================================================
// AMC — REVOCATION of Annual Maintenance Contract for Gas Systems
// Source: AMC Enhancements SDD §5 (Revoke of AMC for Gas Systems)
//
// DOE-internal flow. Initiated by the PPS Engineer (Reviewer) against an
// active AMC. While the revocation is in progress the applicant's Renew /
// Modify / Cancel actions are disabled.
//
// Two-tier review on the regulator side: Section Head → Director.
// No applicant fee, no e-signatures. Final approval regenerates the AMC
// document with a "Revoked" tag + final revocation approval date, and moves
// the linked AMC record to "Revoked".
// ============================================================================

export const amcRevokeService: ServiceDefinition = {
  id: 'amc.revoke',
  module: 'amc',
  action: 'revoke',
  title: 'Revocation of Annual Maintenance Contract for Gas Systems',
  shortTitle: 'AMC Revoke',
  description:
    'DOE-initiated revocation of an active AMC. Started by the PPS Engineer, reviewed by the Section Head and the Director. No fees, no e-signatures — final approval regenerates the AMC document with a "Revoked" tag.',
  initialState: 'pending_section_head',

  states: [
    { id: 'pending_section_head',     label: 'Revocation Initiated · Pending Section Head', category: 'pending',  ownerRole: 'section_head' },
    { id: 'returned_to_engineer',     label: 'Sent Back to PPS Engineer',                   category: 'returned', ownerRole: 'engineer' },
    { id: 'pending_director',         label: 'Pending Director',                            category: 'pending',  ownerRole: 'director' },
    { id: 'returned_to_section_head', label: 'Sent Back to Section Head',                   category: 'returned', ownerRole: 'section_head' },
    { id: 'issued',                   label: 'Revoked',                                     category: 'issued' },
    { id: 'rejected',                 label: 'Revocation Rejected',                         category: 'rejected' },
  ],

  transitions: [
    { id: 'sh-request-info',         label: 'Request for More Info (Engineer)',     from: 'pending_section_head',     to: 'returned_to_engineer',     allowedRoles: ['section_head'], variant: 'warning', requiresComment: true, commentLabel: 'What additional information is required from the Engineer?', notifications: ['notify-engineer-more-info'] },
    { id: 'sh-reject',               label: 'Reject Revocation',                    from: 'pending_section_head',     to: 'rejected',                 allowedRoles: ['section_head'], variant: 'danger',  requiresComment: true, commentLabel: 'Reason for rejecting the revocation',           notifications: ['reject-engineer'] },
    { id: 'sh-approve',              label: 'Approve & Forward to Director',        from: 'pending_section_head',     to: 'pending_director',         allowedRoles: ['section_head'], variant: 'success', notifications: ['notify-director'] },

    { id: 'eng-resubmit-to-sh',      label: 'Re-submit to Section Head',            from: 'returned_to_engineer',     to: 'pending_section_head',     allowedRoles: ['engineer'],     variant: 'success', requiresComment: true, commentLabel: 'Additional notes for the Section Head',     notifications: ['notify-section-head'] },

    { id: 'director-request-info',   label: 'Request for More Info (Section Head)', from: 'pending_director',         to: 'returned_to_section_head', allowedRoles: ['director'],     variant: 'warning', requiresComment: true, commentLabel: 'What additional information is required?', notifications: ['notify-section-head-more-info'] },
    { id: 'director-reject',         label: 'Reject Revocation',                    from: 'pending_director',         to: 'rejected',                 allowedRoles: ['director'],     variant: 'danger',  requiresComment: true, commentLabel: 'Reason for rejecting the revocation',           notifications: ['reject-engineer'] },
    { id: 'director-approve',        label: 'Final Approve · Issue Revocation',     from: 'pending_director',         to: 'issued',                   allowedRoles: ['director'],     variant: 'success', notifications: ['amc-revoked'] },

    { id: 'sh-resubmit-to-director', label: 'Re-endorse to Director',               from: 'returned_to_section_head', to: 'pending_director',         allowedRoles: ['section_head'], variant: 'success', requiresComment: true, commentLabel: 'Additional notes for the Director',         notifications: ['notify-director'] },
  ],

  form: [
    {
      id: 'amc-reference',
      title: 'AMC Reference',
      description: 'The active AMC this Revocation is being initiated against.',
      fields: [
        { id: 'companyLicense', label: 'AMC Reference Number', type: 'readonly' },
        { id: 'companyName',    label: 'Maintenance Company',  type: 'readonly' },
        { id: 'buildingName',   label: 'Building',             type: 'readonly' },
        { id: 'premisesNumber', label: 'Premises Number',      type: 'readonly' },
        { id: 'emirate',        label: 'Emirate',              type: 'readonly' },
      ],
      attachments: [],
    },
    {
      id: 'revocation-reason',
      title: 'Revocation Reason',
      description: 'Provide the regulatory basis for revoking this AMC. Attach supporting evidence (compliance reports, inspection findings, etc.).',
      fields: [
        { id: 'revocationReason', label: 'Revocation Reason', type: 'textarea', required: true, remark: 'Mandatory — set out the regulatory / safety / compliance basis for revocation.' },
      ],
      attachments: [
        { id: 'supportingDocs', label: 'Supporting Documents (PDF / JPG / GIF / DWG / DWF · max 10 MB)', required: false },
      ],
    },
  ],

  notifications: [
    { id: 'notify-section-head',         channel: 'email', to: 'section_head', subject: 'AMC Revocation Awaiting Approval — %CompanyName%', body: 'Dear Section Head,\n\nA Revocation has been initiated against the AMC at %CompanyName% by the PPS Engineer.\nApplication Reference: %ApplicationNumber%\n\nPlease log in to review the case and take the appropriate action.\n\nBest regards,\nDepartment of Energy — PPS Team' },
    { id: 'notify-engineer-more-info',   channel: 'email', to: 'engineer',     subject: 'Additional information requested — AMC Revocation of %CompanyName%', body: 'Dear PPS Engineer,\n\nThe Section Head has requested additional information on AMC Revocation %ApplicationNumber% against %CompanyName%.\n\nComments: %Comments%\n\nBest regards,\nDepartment of Energy — PPS Team' },
    { id: 'reject-engineer',             channel: 'email', to: 'engineer',     subject: 'AMC Revocation Rejected — %CompanyName%', body: 'Dear PPS Engineer,\n\nThe Revocation initiated against the AMC at %CompanyName% (Ref: %ApplicationNumber%) has been rejected.\n\nReason: %Comments%\n\nBest regards,\nDepartment of Energy — PPS Team' },
    { id: 'notify-director',             channel: 'email', to: 'director',     subject: 'AMC Revocation Awaiting Final Approval — %CompanyName%', body: 'Dear Director,\n\nThe AMC Revocation against %CompanyName% has been endorsed by the Section Head and is awaiting your final decision.\nApplication Reference: %ApplicationNumber%\n\nBest regards,\nDepartment of Energy — PPS Team' },
    { id: 'notify-section-head-more-info', channel: 'email', to: 'section_head', subject: 'Additional information requested — AMC Revocation of %CompanyName%', body: 'Dear Section Head,\n\nThe Director has requested additional information on AMC Revocation %ApplicationNumber%.\n\nComments: %Comments%\n\nBest regards,\nDepartment of Energy — PPS Team' },
    { id: 'amc-revoked',                 channel: 'email', to: 'applicant',    subject: 'Notice of AMC Revocation (Ref: %ApplicationNumber%)', body: 'Dear %CompanyName%,\n\nThis is to inform you that the Department of Energy has revoked your Annual Maintenance Contract (AMC) for Gas Systems.\n\nApplication Reference: %ApplicationNumber%\nReason: %Comments%\n\nThe revoked AMC document (with the "Revoked" tag, the final revocation date, the QR code and the DOE stamp) is available in your DOE Unified Service Portal account. The original AMC status has been updated to "Revoked".\n\nBest regards,\nDepartment of Energy — PPS Team' },
  ],

  sla: [
    { stage: 'Section Head decision',   role: 'section_head', days: 5 },
    { stage: 'Director final decision', role: 'director',     days: 2 },
  ],
};
