import type { ServiceDefinition } from '../../types';

// ============================================================================
// MAES — REVOCATION of Material and Equipment Approval (MAES) — DoE-initiated
// Source: "MAES Enhancements SDD" §5 (Revocation Enhancements)
//
// • DoE-internal flow. Initiated by the PPS Engineer against an active MAES
//   certificate; the applicant CANNOT initiate this action.
// • Operates at material-row level:
//      - Partial revocation — only selected materials are revoked. The MAES
//        certificate is regenerated with the remaining materials; certificate
//        expiry recalculated as MAX(remaining material expiry); original
//        MAES reference retained.
//      - Full revocation — all materials are revoked, the MAES certificate
//        moves to "Revoked" status, and a Revocation Certificate is issued.
// • Two-tier internal review: PPS Section Head → PPS Director (with explicit
//   Reject and Return-for-Modification available at each level).
// • No applicant fee.
// • While the revocation is in flight, the applicant's Renew / Modify /
//   Cancel actions on this MAES are disabled.
// • Final approval generates a Revocation document with QR + DoE stamp.
//   The applicant is notified by email (English + Arabic).
// ============================================================================

export const maesRevokeService: ServiceDefinition = {
  id: 'maes.revoke',
  module: 'maes',
  action: 'revoke',
  title: 'Revocation of Material and Equipment Approval (MAES)',
  shortTitle: 'MAES Revoke',
  description:
    'DoE-initiated revocation of an active MAES certificate at the material-row level (partial or full). Initiated by the PPS Engineer; two-tier internal review (Section Head → Director); no applicant fee. Partial revocation regenerates the MAES with the remaining materials; full revocation issues a Revocation Certificate.',
  initialState: 'pending_section_head',

  states: [
    { id: 'pending_section_head', label: 'Revocation Initiated · Pending Section Head', category: 'pending',  ownerRole: 'section_head' },
    { id: 'returned_to_engineer', label: 'Sent Back to PPS Engineer',                   category: 'returned', ownerRole: 'engineer' },
    { id: 'pending_director',     label: 'Pending Director',                            category: 'pending',  ownerRole: 'director' },
    { id: 'returned_to_sh',       label: 'Sent Back to Section Head',                   category: 'returned', ownerRole: 'section_head' },
    { id: 'issued',               label: 'Revoked',                                     category: 'issued' },
    { id: 'rejected',             label: 'Revocation Rejected',                         category: 'rejected' },
  ],

  transitions: [
    { id: 'sh-return-engineer', label: 'Return to Engineer',           from: 'pending_section_head', to: 'returned_to_engineer', allowedRoles: ['section_head'], variant: 'warning', requiresComment: true, commentLabel: 'Information needed from the Engineer', notifications: ['notify-engineer-more-info'] },
    { id: 'sh-reject',          label: 'Reject Revocation',            from: 'pending_section_head', to: 'rejected',             allowedRoles: ['section_head'], variant: 'danger',  requiresComment: true, commentLabel: 'Reason for rejecting the revocation', notifications: ['reject-engineer'] },
    { id: 'sh-approve',         label: 'Approve & Forward to Director', from: 'pending_section_head', to: 'pending_director',    allowedRoles: ['section_head'], variant: 'success', notifications: ['notify-director'] },

    { id: 'eng-resubmit-to-sh', label: 'Re-submit to Section Head',     from: 'returned_to_engineer', to: 'pending_section_head', allowedRoles: ['engineer'],    variant: 'success', requiresComment: true, commentLabel: 'Additional notes for the Section Head', notifications: ['notify-section-head'] },

    { id: 'dir-return-sh',      label: 'Return to Section Head',        from: 'pending_director',     to: 'returned_to_sh',       allowedRoles: ['director'],    variant: 'warning', requiresComment: true, commentLabel: 'Information needed from the Section Head', notifications: ['notify-sh-more-info'] },
    { id: 'dir-reject',         label: 'Reject Revocation',             from: 'pending_director',     to: 'rejected',             allowedRoles: ['director'],    variant: 'danger',  requiresComment: true, commentLabel: 'Reason for rejecting the revocation',          notifications: ['reject-engineer'] },
    { id: 'dir-approve',        label: 'Final Approve · Issue Revocation', from: 'pending_director',  to: 'issued',               allowedRoles: ['director'],    variant: 'success', notifications: ['revoked-applicant'] },

    { id: 'sh-resubmit-to-dir', label: 'Re-endorse to Director',        from: 'returned_to_sh',       to: 'pending_director',     allowedRoles: ['section_head'], variant: 'success', requiresComment: true, commentLabel: 'Additional notes for the Director', notifications: ['notify-director'] },
  ],

  form: [
    {
      id: 'maes-reference',
      title: 'MAES Reference',
      description: 'The active MAES this revocation is being initiated against.',
      fields: [
        { id: 'maesNumber',        label: 'MAES Reference Number',      type: 'readonly' },
        { id: 'applicantType',     label: 'Applicant Type',             type: 'readonly' },
        { id: 'businessName',      label: 'Business Name',              type: 'readonly' },
        { id: 'tradeLicence',      label: 'Trade Licence Number',       type: 'readonly' },
        { id: 'representativeName',label: 'Representative Name',        type: 'readonly' },
        { id: 'email',             label: 'Email Address',              type: 'readonly' },
        { id: 'mobile',            label: 'Mobile No.',                 type: 'readonly' },
        { id: 'currentExpiry',     label: 'Current Certificate Expiry', type: 'readonly' },
      ],
      attachments: [],
    },
    {
      id: 'revocation-scope',
      title: 'Revocation Scope',
      description: 'Choose whether this is a partial revocation (specific material rows only) or a full revocation (entire MAES certificate). Partial revocation regenerates the MAES with the remaining materials; full revocation issues a Revocation Certificate.',
      fields: [
        { id: 'revocationScope', label: 'Revocation Scope', type: 'radio', required: true, options: [
          { value: 'partial', label: 'Partial — revoke selected materials only' },
          { value: 'full',    label: 'Full — revoke the entire MAES certificate' },
        ]},
        { id: 'revocationReason', label: 'Revocation Reason', type: 'textarea', required: true, remark: 'Mandatory. Provide the regulatory basis for the revocation (inspection findings, non-compliance with Unified Gas Code, safety incident, false declaration, etc.).' },
      ],
      attachments: [
        { id: 'supportingDocs',   label: 'Supporting Documents — inspection report, non-compliance evidence, safety notice (PDF / JPG / PNG)', required: false },
        { id: 'others',           label: 'Others — any supporting document (with description)', required: false },
      ],
    },
    {
      id: 'systems-equipments',
      title: 'Systems & Equipments · Revoked Materials',
      description:
        'For partial revocation, select the specific material rows to be revoked — the remaining materials stay on the regenerated certificate. For full revocation, all materials are flagged. Per-material expiry is recalculated for the remaining set.',
      fields: [
        { id: 'totalMaterials',    label: 'Total materials on active certificate', type: 'readonly' },
        { id: 'revokedCount',      label: 'Materials being revoked',               type: 'readonly' },
        { id: 'remainingCount',    label: 'Materials remaining on certificate',    type: 'readonly' },
        { id: 'maxExpiryDate',     label: 'Recalculated Certificate Expiry (MAX of remaining material expiry dates)', type: 'readonly' },
      ],
      attachments: [],
    },
  ],

  notifications: [
    { id: 'notify-section-head',       channel: 'email', to: 'section_head', subject: 'Review MAES Revocation — %CompanyName%', body: 'Dear PPS Section Head,\n\nA request for Revocation of MAES against %CompanyName% has been submitted by the PPS Engineer and is assigned for your review.\n\nApplication Reference: %ApplicationNumber%\n\nPlease log in to review.\n\nBest regards,\nDepartment of Energy — PPS Team' },
    { id: 'notify-engineer-more-info', channel: 'email', to: 'engineer',     subject: 'Additional Information Requested — MAES Revocation — %CompanyName%', body: 'Dear PPS Engineer,\n\nThe Section Head has requested additional information on MAES Revocation %ApplicationNumber% against %CompanyName%.\n\nComments: %Comments%\n\nBest regards,\nDepartment of Energy — PPS Team' },
    { id: 'notify-director',           channel: 'email', to: 'director',     subject: 'Final Approval Required — MAES Revocation — %CompanyName%', body: 'Dear PPS Director,\n\nThe MAES Revocation against %CompanyName% (Ref: %ApplicationNumber%) has been approved by the Section Head and is forwarded for your final approval.\n\nBest regards,\nDepartment of Energy — PPS Team' },
    { id: 'notify-sh-more-info',       channel: 'email', to: 'section_head', subject: 'Additional Information Requested — MAES Revocation — %CompanyName%', body: 'Dear PPS Section Head,\n\nThe Director has requested additional information on MAES Revocation %ApplicationNumber% against %CompanyName%.\n\nComments: %Comments%\n\nBest regards,\nDepartment of Energy — PPS Team' },
    { id: 'reject-engineer',           channel: 'email', to: 'engineer',     subject: 'MAES Revocation Rejected — %CompanyName%', body: 'Dear PPS Engineer,\n\nThe MAES Revocation initiated against %CompanyName% (Ref: %ApplicationNumber%) has been rejected.\n\nReason: %Comments%\n\nBest regards,\nDepartment of Energy — PPS Team' },
    { id: 'revoked-applicant',         channel: 'email', to: 'applicant',    subject: 'MAES Revocation — %CompanyName% (Ref: %ApplicationNumber%)', body: 'Dear %CompanyName%,\n\nThe revocation process for your MAES certificate (Ref: %ApplicationNumber%) has been completed by the Department of Energy.\n\nReason: %Comments%\n\nFor partial revocations, the MAES certificate has been regenerated with the remaining materials (original reference retained); for full revocations the MAES is now Revoked and a Revocation Certificate (with QR code and DoE stamp) is available on the Unified Service Portal.\n\nBest regards,\nDepartment of Energy — PPS Team' },
  ],

  sla: [
    { stage: 'Section Head decision', role: 'section_head', days: 5 },
    { stage: 'Director decision',     role: 'director',     days: 5 },
  ],
};
