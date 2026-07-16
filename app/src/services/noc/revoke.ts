import type { ServiceDefinition } from '../../types';

// ============================================================================
// NOC — REVOCATION of No Objection Certificate (DOE-initiated)
// Source: "NOC Enhancement SDD" v1.1 §3 (Revocation of NOC)
//
// DOE-internal flow. Initiated by the PPS Engineer against an active NOC
// (Revocation Reason mandatory + optional supporting documents). While in
// flight the applicant's Renew / Modify / Cancel actions are disabled.
// Single-tier review by the Section Head. No applicant fee. Final approval
// generates a Revocation document with QR + DOE stamp; the NOC moves to
// Revoked status.
// ============================================================================

export const nocRevokeService: ServiceDefinition = {
  id: 'noc.revoke',
  module: 'noc',
  action: 'revoke',
  title: 'Revocation of No Objection Certificate (NOC)',
  shortTitle: 'NOC Revoke',
  description:
    'DOE-initiated revocation of an active NOC. Initiated by the PPS Engineer; reviewed and decided by the Section Head.',
  initialState: 'pending_section_head',

  states: [
    { id: 'pending_section_head', label: 'Revocation Initiated · Pending Section Head', category: 'pending',  ownerRole: 'section_head' },
    { id: 'returned_to_engineer', label: 'Sent Back to PPS Engineer',                   category: 'returned', ownerRole: 'engineer' },
    { id: 'issued',               label: 'Revoked',                                     category: 'issued' },
    { id: 'rejected',             label: 'Revocation Rejected',                         category: 'rejected' },
  ],

  transitions: [
    { id: 'sh-request-info',     label: 'Request for More Info (Engineer)',   from: 'pending_section_head', to: 'returned_to_engineer',  allowedRoles: ['section_head'], variant: 'warning', requiresComment: true, commentLabel: 'What additional information is required from the Engineer?', notifications: ['notify-engineer-more-info'] },
    { id: 'sh-reject',           label: 'Reject Revocation',                  from: 'pending_section_head', to: 'rejected',              allowedRoles: ['section_head'], variant: 'danger',  requiresComment: true, commentLabel: 'Reason for rejecting the revocation',           notifications: ['reject-engineer'] },
    { id: 'sh-approve',          label: 'Final Approve · Issue Revocation',   from: 'pending_section_head', to: 'issued',                allowedRoles: ['section_head'], variant: 'success', notifications: ['revoked-applicant'] },

    { id: 'eng-resubmit-to-sh',  label: 'Re-submit to Section Head',          from: 'returned_to_engineer', to: 'pending_section_head',  allowedRoles: ['engineer'],     variant: 'success', requiresComment: true, commentLabel: 'Additional notes for the Section Head',     notifications: ['notify-section-head'] },
  ],

  form: [
    {
      id: 'premises-info',
      title: 'NOC Reference',
      description: 'The active NOC this Revocation is being initiated against.',
      fields: [
        { id: 'nocType',          label: 'NOC Type',                type: 'readonly' },
        { id: 'premisesName',     label: 'Premises Name',           type: 'readonly' },
        { id: 'premisesType',     label: 'Premises Type',           type: 'readonly' },
        { id: 'buildingNo',       label: 'Premises / Building No.', type: 'readonly' },
        { id: 'city',             label: 'City',                    type: 'readonly' },
      ],
      attachments: [],
    },
    {
      id: 'revocation-reason',
      title: 'Revocation Reason',
      description: 'Provide the regulatory basis for revoking this NOC. Attach supporting evidence if available (inspection findings, AMC lapse, safety incident, etc.).',
      fields: [
        { id: 'revocationReason', label: 'Revocation Reason', type: 'textarea', required: true, remark: 'Mandatory.' },
      ],
      attachments: [
        { id: 'supportingDocs', label: 'Supporting Documents (PDF / JPG / PNG)', required: false },
      ],
    },
  ],

  notifications: [
    { id: 'notify-section-head',       channel: 'email', to: 'section_head', subject: 'Review Revoke of NOC Application — %CompanyName%', body: 'Dear Section Head,\n\nA request for Revoke of NoC for gas system of %CompanyName% has been submitted and it is assigned for your review.\n\nApplication Reference: %ApplicationNumber%\n\nPlease Click Here to review the application.\n\nBest regards,\nDepartment of Energy — PPS Team' },
    { id: 'notify-engineer-more-info', channel: 'email', to: 'engineer',     subject: 'Additional information requested — Revocation of %CompanyName%', body: 'Dear PPS Engineer,\n\nThe Section Head has requested additional information on Revocation %ApplicationNumber% against %CompanyName%.\n\nComments: %Comments%\n\nBest regards,\nDepartment of Energy — PPS Team' },
    { id: 'reject-engineer',           channel: 'email', to: 'engineer',     subject: 'Revocation Rejected — %CompanyName%', body: 'Dear PPS Engineer,\n\nThe Revocation initiated against %CompanyName% (Ref: %ApplicationNumber%) has been rejected by the Section Head.\n\nReason: %Comments%\n\nBest regards,\nDepartment of Energy — PPS Team' },
    { id: 'revoked-applicant',         channel: 'email', to: 'applicant',    subject: 'Revoke of NOC Application — %CompanyName%', body: 'Dear Gas Operator,\n\nThe revocation process for your NOC application (Ref: %ApplicationNumber%) has been completed by the Department of Energy and your NOC is now Revoked.\n\nReason: %Comments%\n\nThe Revocation document (with QR code and DOE stamp) is available on the Unified Service Portal.\n\nBest regards,\nDepartment of Energy — PPS Team' },
  ],

  sla: [
    { stage: 'Section Head decision', role: 'section_head', days: 5 },
  ],
};
