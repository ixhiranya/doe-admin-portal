import type { ServiceDefinition } from '../../types';

// ============================================================================
// AMC — ISSUANCE of Annual Maintenance Contract for Gas Systems
// Source: AMC Enhancements SDD §1 (Issuance Enhancements) — the existing
// Issuance workflow is preserved; this implementation adds the new dropdown
// values (System Type "NG Central Gas System"; 9 new Equipment Type values)
// and references the new bilingual Gas Systems AMC contract template.
//
// Workflow: applicant draft → 3-tier DOE review → payment → owner e-sign →
// company e-sign → AMC issued (1-year validity, QR code + DOE stamp).
// ============================================================================

const SYSTEM_TYPE_OPTIONS = [
  { value: 'lpg_central',    label: 'LPG Central Gas System' },
  { value: 'sng_central',    label: 'SNG Central Gas System' },
  { value: 'lpg_plant',      label: 'LPG Plant' },
  { value: 'sng_plant',      label: 'SNG Plant' },
  { value: 'gas_cylinder',   label: 'Gas Cylinder System' },
  { value: 'ng_central',     label: 'NG Central Gas System (new)' },
];

const EQUIPMENT_TYPE_OPTIONS = [
  // Existing
  { value: 'lpg_tank',          label: 'LPG Tank' },
  { value: 'manual_valves',     label: 'Manual Valves' },
  { value: 'gas_meters',        label: 'Gas Meters' },
  { value: 'gas_regulators',    label: 'Gas Pressure Regulators' },
  { value: 'gas_detectors',     label: 'Gas Detectors' },
  { value: 'gas_detection_pnl', label: 'Gas Detection Panel' },
  { value: 'copper_tubes',      label: 'Copper Tubes and Fittings' },
  { value: 'cs_pipes',          label: 'Carbon Steel Pipes and Fittings' },
  { value: 'gs_pipes',          label: 'Galvanized Steel Pipes and Fittings' },
  { value: 'pe_pipes',          label: 'PE Pipes and Fittings' },
  { value: 'solenoid_valve',    label: 'Solenoid Valve' },
  { value: 'sng_module',        label: 'SNG Module' },
  { value: 'lpg_pump',          label: 'LPG Pump' },
  { value: 'lpg_vaporizers',    label: 'LPG Vaporizers' },
  { value: 'air_compressor',    label: 'Air Compressor' },
  { value: 'gas_quality',       label: 'Gas Quality Control System' },
  { value: 'pressure_gauges',   label: 'Pressure Gauges' },
  { value: 'excess_flow',       label: 'Excess Flow Valves' },
  { value: 'relief_valves',     label: 'Relief Valves' },
  { value: 'pressure_tx',       label: 'Pressure Transmitters' },
  { value: 'lpg_liquid_fill',   label: 'LPG Liquid Fill Valve' },
  { value: 'lpg_air_mixer',     label: 'LPG / AIR Mixer' },
  { value: 'pressure_reg_stn',  label: 'Pressure Regulating Station' },
  { value: 'cooker_hose',       label: 'Cooker Hose Connection' },
  // NEW (SDD §1.3.2)
  { value: 'slam_shut',         label: 'Slam Shut Valve (new)' },
  { value: 'gas_filter',        label: 'Gas Filter (new)' },
  { value: 'cathodic',          label: 'Cathodic Protection System (new)' },
  { value: 'temp_gauges',       label: 'Temperature Gauges (new)' },
  { value: 'check_valve',       label: 'Check Valve (new)' },
  { value: 'prms',              label: 'Pressure Regulating & Metering Station — PRMS (new)' },
  { value: 'lpg_lvl_tx',        label: 'LPG Tank Level Transmitters (new)' },
  { value: 'lpg_lvl_gauges',    label: 'LPG Tank Level Gauges (new)' },
  { value: 'actuated_shutoff',  label: 'Actuated Shut Off Valve (new)' },
];

export const amcIssueService: ServiceDefinition = {
  id: 'amc.issue',
  module: 'amc',
  action: 'issue',
  title: 'Issuance of Annual Maintenance Contract for Gas Systems',
  shortTitle: 'AMC Issue',
  description:
    'A Gas Operator company applies for an AMC against a specific building. Includes the building / maintenance-company info, owner signatories, system & equipment list, and required attachments. 3-tier DOE review → payment → owner & company e-signatures → AMC issued (1-year validity, QR & DOE stamp).',
  initialState: 'draft',
  feeAmount: 0,
  certificateValidityYears: 1,

  states: [
    { id: 'draft',                    label: 'Draft',                        category: 'draft',     ownerRole: 'applicant' },
    { id: 'pending_engineer',         label: 'Under Review',                 category: 'pending',   ownerRole: 'engineer' },
    { id: 'returned_to_applicant',    label: 'Requested for More Info',      category: 'returned',  ownerRole: 'applicant' },
    { id: 'pending_section_head',     label: 'Pending Section Head',         category: 'pending',   ownerRole: 'section_head' },
    { id: 'pending_director',         label: 'Pending Director',             category: 'pending',   ownerRole: 'director' },
    { id: 'returned_to_engineer',     label: 'Sent Back to Engineer',        category: 'returned',  ownerRole: 'engineer' },
    { id: 'returned_to_section_head', label: 'Sent Back to Section Head',    category: 'returned',  ownerRole: 'section_head' },
    { id: 'fee_pending',              label: 'Approved · Payment Pending',   category: 'payment',   ownerRole: 'applicant' },
    { id: 'pending_owner_signature',  label: 'Waiting for Owner E-Signature',category: 'pending',   ownerRole: 'applicant' },
    { id: 'pending_company_signature',label: 'Waiting for Company E-Signature',category: 'pending', ownerRole: 'applicant' },
    { id: 'issued',                   label: 'AMC Issued',                   category: 'issued' },
    { id: 'rejected',                 label: 'Application Rejected',         category: 'rejected' },
    { id: 'cancelled',                label: 'Withdrawn',                    category: 'cancelled' },
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

    { id: 'company-sign',            label: 'Sign with UAE Pass (Company) · Issue AMC', from: 'pending_company_signature', to: 'issued',                allowedRoles: ['applicant'],    variant: 'primary', notifications: ['amc-issued'] },
    { id: 'company-raise-concern',   label: 'Raise Concern',                         from: 'pending_company_signature', to: 'pending_engineer',          allowedRoles: ['applicant'],    variant: 'warning', requiresComment: true, commentLabel: 'Concern raised by the Company (returns to DOE review)',        notifications: ['notify-engineer'] },
  ],

  form: [
    {
      id: 'company-info',
      title: 'Building & Maintenance Company Information',
      description: 'Building details and the maintenance company information for which the AMC is being issued.',
      fields: [
        { id: 'companyLicense',     label: 'Company Commercial License',   type: 'readonly' },
        { id: 'companyName',        label: 'Maintenance Company Name',     type: 'readonly' },
        { id: 'representative',     label: 'Authorized Representative',    type: 'readonly' },
        { id: 'phone',              label: 'Company Mobile Number',        type: 'readonly' },
        { id: 'email',              label: 'Company Email Address',        type: 'text',     required: true },
        { id: 'emergencyContact',   label: 'Gas Emergency Contact (24/7)', type: 'text',     required: true },
        { id: 'customerService',    label: 'Customer Service Contact',     type: 'text',     required: true },
        { id: 'contractValue',      label: 'Maintenance Contract Value (AED)', type: 'text', required: true, remark: 'Editable — the agreed annual fee between owner and maintenance company.' },

        { id: 'buildingName',       label: 'Building Name (EN)',           type: 'text',     required: true },
        { id: 'buildingNameAr',     label: 'Building Name (AR)',           type: 'text' },
        { id: 'premisesNumber',     label: 'Premises / Building Number',   type: 'text',     required: true },
        { id: 'buildingType',       label: 'Building Type',                type: 'select',   required: true, options: [
          { value: 'residential',  label: 'Residential' },
          { value: 'commercial',   label: 'Commercial' },
          { value: 'mixed_use',    label: 'Mixed Use' },
          { value: 'industrial',   label: 'Industrial' },
          { value: 'hospitality',  label: 'Hospitality / Hotel' },
          { value: 'institutional',label: 'Institutional / Educational' },
        ] },
        { id: 'emirate',            label: 'Emirate',                      type: 'select',   required: true, options: [
          { value: 'abu_dhabi', label: 'Abu Dhabi' }, { value: 'al_ain', label: 'Al Ain' }, { value: 'al_dhafra', label: 'Al Dhafra' },
        ] },
        { id: 'city',               label: 'City',                         type: 'text',     required: true },
        { id: 'geographicalArea',   label: 'Geographical Area',            type: 'text' },
        { id: 'plotNo',             label: 'Plot No.',                     type: 'text' },
        { id: 'sectorNo',           label: 'Sector No.',                   type: 'text' },
        { id: 'makanyId',           label: 'Makany No.',                   type: 'text',     required: true },
        { id: 'electricMeter',      label: 'Electric Meter No.',           type: 'text',     required: true },
        { id: 'hussantakId',        label: 'Hussantak ID',                 type: 'text' },
        { id: 'area',               label: 'Area (m²)',                    type: 'text' },
        { id: 'floors',             label: 'Number of Floors',             type: 'text' },
        { id: 'flats',              label: 'Number of Flats',              type: 'text' },
        { id: 'shops',              label: 'Number of Shops',              type: 'text' },
        { id: 'guardName',          label: 'Guard Name',                   type: 'text' },
        { id: 'guardMobile',        label: 'Guard Mobile',                 type: 'text' },
        { id: 'detailedAddress',    label: 'Detailed Address',             type: 'textarea', required: true },
        { id: 'latitude',           label: 'Latitude',                     type: 'text' },
        { id: 'longitude',          label: 'Longitude',                    type: 'text' },
        { id: 'propertyMgmt',       label: 'Property Management Name',     type: 'text' },
        { id: 'insuranceCo',        label: 'Insurance Company Name',       type: 'text' },
      ],
      attachments: [
        { id: 'makanyDoc',        label: 'Makany Validation Document',          required: true },
        { id: 'electricDoc',      label: 'Electric Meter Validation Document',  required: true },
        { id: 'constructionLic',  label: 'Construction License',                required: true },
        { id: 'propertyMgmtDoc',  label: 'Property Management File',            required: false },
        { id: 'insuranceDoc',     label: 'Insurance Company File',              required: false },
      ],
    },
    {
      id: 'building-owners',
      title: 'Building Owners (Signatories)',
      description: 'The building owners who will e-sign the contract. At least one owner is required.',
      fields: [],
      repeatable: {
        itemLabel: 'Building owner',
        perItemAttachments: [
          { id: 'passportCopy',  label: 'Passport and UAE ID Copy', required: true },
          { id: 'signatureFile', label: 'Signature Sample',          required: false },
          { id: 'miscOwner',     label: 'Miscellaneous',             required: false },
        ],
      },
    },
    {
      id: 'systems-equipment',
      title: 'Systems & Equipment Details',
      description: 'The gas systems and equipment items covered by the AMC. Pick the appropriate System Type and add Equipment Items (new values per AMC SDD §1).',
      fields: [
        { id: 'systemType', label: 'System Type', type: 'select', required: true, options: SYSTEM_TYPE_OPTIONS, remark: 'Includes the new value "NG Central Gas System" added by the AMC Enhancements SDD §1.3.1.' },
      ],
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
      description: 'Supporting documents needed to issue the AMC. Allowed: PDF / JPG / GIF / DWG / DWF · max 10 MB each.',
      fields: [],
      attachments: [
        { id: 'commercialLicense',    label: 'Maintenance Company Commercial License',    required: true },
        { id: 'engineerCard',         label: 'Engineer-in-Charge UAE ID Card',            required: true },
        { id: 'siteSurveyReport',     label: 'Site Survey Report',                        required: true },
        { id: 'gasSystemLayout',      label: 'Approved Gas-System Layout (DWG)',          required: true },
        { id: 'ownerAuthLetter',      label: 'Owner Authorization Letter',                required: true },
        { id: 'tariffSchedule',       label: 'Maintenance Tariff Schedule',               required: false },
      ],
    },
  ],

  notifications: [
    { id: 'ack-applicant',                 channel: 'email', to: 'applicant',    subject: 'AMC Application Received (Ref: %ApplicationNumber%)', body: 'Dear %CompanyName%,\n\nWe confirm receipt of your application for the Annual Maintenance Contract (AMC) for Gas Systems submitted via the DOE Unified Service Portal.\n\nApplication Reference: %ApplicationNumber%\nStatus: Under Review\n\nBest regards,\nDepartment of Energy — PPS Team' },
    { id: 'notify-engineer',               channel: 'email', to: 'engineer',     subject: 'Review for AMC Application — %CompanyName%',           body: 'Dear PPS Engineer,\n\n%CompanyName% has submitted a request for the Annual Maintenance Contract (AMC) for Gas Systems and it is assigned for your review.\nApplication Reference: %ApplicationNumber%\n\nBest regards,\nDepartment of Energy — PPS Team' },
    { id: 'return-applicant',              channel: 'email', to: 'applicant',    subject: 'AMC — More information required (Ref: %ApplicationNumber%)', body: 'Dear %CompanyName%,\n\nAdditional information is required for your AMC application (Ref: %ApplicationNumber%).\n\nReviewer Comments: %Comments%\n\nPlease log in to the portal, address the clarifications and re-submit.\n\nBest regards,\nDepartment of Energy — PPS Team' },
    { id: 'notify-section-head',           channel: 'email', to: 'section_head', subject: 'AMC Application Awaiting Approval — %CompanyName%',    body: 'Dear Section Head,\n\nThe AMC application from %CompanyName% has been endorsed by the PPS Engineer and is awaiting your approval.\nApplication Reference: %ApplicationNumber%\n\nBest regards,\nDepartment of Energy — PPS Team' },
    { id: 'notify-engineer-more-info',     channel: 'email', to: 'engineer',     subject: 'Additional information requested — %CompanyName%',     body: 'Dear PPS Engineer,\n\nThe Section Head has requested additional information on AMC application %ApplicationNumber%.\n\nComments: %Comments%\n\nBest regards,\nDepartment of Energy — PPS Team' },
    { id: 'notify-director',               channel: 'email', to: 'director',     subject: 'AMC Application Awaiting Final Approval — %CompanyName%', body: 'Dear Director,\n\nThe AMC application from %CompanyName% has been endorsed by the Section Head and is awaiting your final decision.\nApplication Reference: %ApplicationNumber%\n\nBest regards,\nDepartment of Energy — PPS Team' },
    { id: 'notify-section-head-more-info', channel: 'email', to: 'section_head', subject: 'Additional information requested — %CompanyName%',     body: 'Dear Section Head,\n\nThe Director has requested additional information on AMC application %ApplicationNumber%.\n\nComments: %Comments%\n\nBest regards,\nDepartment of Energy — PPS Team' },
    { id: 'reject-applicant',              channel: 'email', to: 'applicant',    subject: 'Rejection — AMC Application (Ref: %ApplicationNumber%)', body: 'Dear %CompanyName%,\n\nWe regret to inform you that your AMC application has been rejected after review by the Department of Energy.\n\nApplication Reference: %ApplicationNumber%\nReason: %Comments%\n\nBest regards,\nDepartment of Energy — PPS Team' },
    { id: 'approve-applicant',             channel: 'email', to: 'applicant',    subject: 'AMC Approved — Pay Fee (Ref: %ApplicationNumber%)',    body: 'Dear %CompanyName%,\n\nYour AMC application has been APPROVED by the Department of Energy.\nStatus: Approved — Payment Pending\n\nPlease log in to the DOE Unified Service Portal and click "Pay Fee" to complete the payment. The application will proceed to e-signature once the payment is received.\n\nBest regards,\nDepartment of Energy — PPS Team' },
    { id: 'notify-owner-signature',        channel: 'email', to: 'applicant',    subject: 'AMC — Owner E-Signature Required (Ref: %ApplicationNumber%)', body: 'Dear Building Owner,\n\nThe AMC for your premises has been approved and the payment received. Please log in to the DOE Unified Service Portal and either:\n\n• Click "Sign with UAE Pass" to digitally sign the AMC, OR\n• Click "Raise Concern" to return the application to the DOE review cycle.\n\nBest regards,\nDepartment of Energy — PPS Team' },
    { id: 'notify-company-signature',      channel: 'email', to: 'applicant',    subject: 'AMC — Company E-Signature Required (Ref: %ApplicationNumber%)', body: 'Dear %CompanyName%,\n\nThe AMC has been signed by the Building Owner and is awaiting your e-signature. Please log in to the DOE Unified Service Portal and either:\n\n• Click "Sign with UAE Pass" to digitally sign the AMC, OR\n• Click "Raise Concern" to return the application to the DOE review cycle.\n\nBest regards,\nDepartment of Energy — PPS Team' },
    { id: 'amc-issued',                    channel: 'email', to: 'applicant',    subject: 'AMC Issued (Ref: %ApplicationNumber%)',                body: 'Dear %CompanyName%,\n\nYour Annual Maintenance Contract (AMC) for Gas Systems has been signed by both parties and is now COMPLETE.\n\nApplication Reference: %ApplicationNumber%\nValidity: One year from the date of issue\n\nThe AMC document (with embedded QR code and DOE stamp) is now available in your DOE Unified Service Portal account.\n\nBest regards,\nDepartment of Energy — PPS Team' },
  ],

  sla: [
    { stage: 'PPS Engineer review',       role: 'engineer',     days: 10 },
    { stage: 'Section Head decision',     role: 'section_head', days: 5 },
    { stage: 'Director final decision',   role: 'director',     days: 2 },
    { stage: 'Owner e-signature window',  role: 'applicant',    days: 7 },
    { stage: 'Company e-signature window',role: 'applicant',    days: 7 },
  ],
};
