// ============================================================================
// Seed data for the DoE PPS Mobile Inspection app simulator.
//
// Buildings here are independent of the Building 360 derived-from-applications
// view — the mobile app's map needs a stable list of inspectable premises
// with coordinates, permit snapshots, and open enforcement counts. The web
// review side reads the same store, so a submission written from the mobile
// simulator surfaces against the same building record on both sides.
// ============================================================================

export interface InspectableBuilding {
  id: string;                       // e.g. 'b-001' (matches route params & plan-stop ids)
  uid: string;                      // B-{premises_number}
  name: string;
  address: string;
  city: string;
  type: string;
  commercialLicence: string;
  coords: { lat: number; lng: number };
  permits: {
    amc: { status: 'active' | 'expired' | 'grace' | 'not_on_file'; expiry?: string };
    noc: { status: 'active' | 'expired' | 'grace' | 'not_on_file'; expiry?: string };
    coc: { status: 'active' | 'expired' | 'grace' | 'not_on_file'; expiry?: string };
    tpiCoc?: { status: 'active' | 'expired' | 'grace' | 'not_on_file'; expiry?: string };
  };
  openViolations: number;
  openWarnings: number;
  pendingActions: number;
  complianceLevel: 'green' | 'amber' | 'red';
  complianceScore: number;
  lastInspection?: { date: string; type: string; outcome: string };
  riskFlag?: 'critical_open' | 'reinspection' | 'high_risk';
  ownerName?: string;
  fmCompany?: string;
  gasContractor?: string;
}

export const INSPECTABLE_BUILDINGS: InspectableBuilding[] = [
  {
    id: 'b-001',
    uid: 'B-AD-44128',
    name: 'Marina Tower Residential Complex',
    address: 'Al Reem Island, Tower B-44, Abu Dhabi',
    city: 'Abu Dhabi',
    type: 'Residential High-Rise',
    commercialLicence: 'CN-1107845',
    coords: { lat: 24.4998, lng: 54.4123 },
    permits: {
      amc: { status: 'active', expiry: '2027-03-12' },
      noc: { status: 'active', expiry: '2027-01-30' },
      coc: { status: 'active', expiry: '2028-05-14' },
      tpiCoc: { status: 'active', expiry: '2026-12-01' },
    },
    openViolations: 0, openWarnings: 0, pendingActions: 0,
    complianceLevel: 'green', complianceScore: 96,
    lastInspection: { date: '2026-02-14', type: 'Routine Scheduled', outcome: 'Compliant' },
    ownerName: 'Reem Properties LLC',
    fmCompany: 'Falcon FM Services',
    gasContractor: 'Acme Energy Services LLC',
  },
  {
    id: 'b-002',
    uid: 'B-AD-22091',
    name: 'Mussafah Industrial Plant 7',
    address: 'M-44, Mussafah Industrial Area, Abu Dhabi',
    city: 'Abu Dhabi',
    type: 'Industrial — LPG Plant',
    commercialLicence: 'CN-2204120',
    coords: { lat: 24.3567, lng: 54.5012 },
    permits: {
      amc: { status: 'active', expiry: '2026-08-04' },
      noc: { status: 'expired', expiry: '2026-03-21' },
      coc: { status: 'active', expiry: '2027-11-09' },
    },
    openViolations: 1, openWarnings: 2, pendingActions: 1,
    complianceLevel: 'red', complianceScore: 54,
    lastInspection: { date: '2026-04-02', type: 'Complaint-Driven', outcome: 'Non-Compliant' },
    riskFlag: 'critical_open',
    ownerName: 'Mussafah Industries',
    fmCompany: 'IndustrialOps Co.',
    gasContractor: 'Bluefield Industrial Contracting',
  },
  {
    id: 'b-003',
    uid: 'B-AD-31870',
    name: 'Khalifa Hospital — Main Block',
    address: 'Sector W-12, Khalifa City, Abu Dhabi',
    city: 'Abu Dhabi',
    type: 'Healthcare — SNG Central',
    commercialLicence: 'CN-3398214',
    coords: { lat: 24.4145, lng: 54.5807 },
    permits: {
      amc: { status: 'active', expiry: '2026-06-19' },
      noc: { status: 'active', expiry: '2026-07-01' },
      coc: { status: 'active', expiry: '2027-02-22' },
      tpiCoc: { status: 'active', expiry: '2026-09-30' },
    },
    openViolations: 0, openWarnings: 1, pendingActions: 0,
    complianceLevel: 'amber', complianceScore: 78,
    lastInspection: { date: '2026-03-19', type: 'Routine Scheduled', outcome: 'Compliant with Warnings' },
    riskFlag: 'reinspection',
    ownerName: 'SEHA',
    fmCompany: 'MedFM Services',
    gasContractor: 'Central Gas Systems Co.',
  },
  {
    id: 'b-004',
    uid: 'B-AD-50223',
    name: 'Al Maryah Plaza Hotel',
    address: 'Tower A-9, Al Maryah Island, Abu Dhabi',
    city: 'Abu Dhabi',
    type: 'Hospitality — LPG Central',
    commercialLicence: 'CN-4498127',
    coords: { lat: 24.5018, lng: 54.3856 },
    permits: {
      amc: { status: 'active', expiry: '2026-05-10' },
      noc: { status: 'active', expiry: '2026-11-25' },
      coc: { status: 'active', expiry: '2028-01-14' },
    },
    openViolations: 0, openWarnings: 0, pendingActions: 0,
    complianceLevel: 'green', complianceScore: 92,
    lastInspection: { date: '2026-01-08', type: 'Routine Scheduled', outcome: 'Compliant' },
    ownerName: 'Maryah Hospitality Holdings',
    fmCompany: 'Premium FM',
    gasContractor: 'Acme Energy Services LLC',
  },
  {
    id: 'b-005',
    uid: 'B-AD-19842',
    name: 'Yas Mall Food Court',
    address: 'Yas Island, Yas Mall, Level 2, Abu Dhabi',
    city: 'Abu Dhabi',
    type: 'Retail — Cylinder System',
    commercialLicence: 'CN-5512903',
    coords: { lat: 24.4886, lng: 54.6052 },
    permits: {
      amc: { status: 'grace', expiry: '2026-05-31' },
      noc: { status: 'active', expiry: '2027-04-04' },
      coc: { status: 'active', expiry: '2028-08-21' },
    },
    openViolations: 0, openWarnings: 0, pendingActions: 1,
    complianceLevel: 'amber', complianceScore: 71,
    lastInspection: { date: '2026-02-27', type: 'Spot Check', outcome: 'Compliant' },
    ownerName: 'Aldar Properties',
    fmCompany: 'Yas FM Services',
    gasContractor: 'Bluefield Industrial Contracting',
  },
  {
    id: 'b-006',
    uid: 'B-AD-77410',
    name: 'Khalidiya Petroleum Storage',
    address: 'Plot 17, Khalidiya, Abu Dhabi',
    city: 'Abu Dhabi',
    type: 'Petroleum Storage Facility',
    commercialLicence: 'CN-6601844',
    coords: { lat: 24.4763, lng: 54.3399 },
    permits: {
      amc: { status: 'active', expiry: '2026-09-20' },
      noc: { status: 'active', expiry: '2027-05-10' },
      coc: { status: 'active', expiry: '2028-03-30' },
      tpiCoc: { status: 'active', expiry: '2026-10-15' },
    },
    openViolations: 2, openWarnings: 3, pendingActions: 2,
    complianceLevel: 'red', complianceScore: 48,
    lastInspection: { date: '2026-03-31', type: 'Incident Response', outcome: 'Non-Compliant' },
    riskFlag: 'high_risk',
    ownerName: 'ADNOC Distribution',
    fmCompany: 'Khalidiya Ops',
    gasContractor: 'Acme Energy Services LLC',
  },
  {
    id: 'b-007',
    uid: 'B-AD-88321',
    name: 'Saadiyat Beach Apartments',
    address: 'Beach Road, Saadiyat Island, Abu Dhabi',
    city: 'Abu Dhabi',
    type: 'Residential — NG Central',
    commercialLicence: 'CN-7790023',
    coords: { lat: 24.5439, lng: 54.4392 },
    permits: {
      amc: { status: 'active', expiry: '2027-06-30' },
      noc: { status: 'active', expiry: '2027-09-15' },
      coc: { status: 'active', expiry: '2028-12-04' },
    },
    openViolations: 0, openWarnings: 0, pendingActions: 0,
    complianceLevel: 'green', complianceScore: 98,
    lastInspection: { date: '2026-01-23', type: 'Routine Scheduled', outcome: 'Compliant' },
    ownerName: 'TDIC Saadiyat',
    fmCompany: 'Saadiyat FM',
    gasContractor: 'Central Gas Systems Co.',
  },
  {
    id: 'b-008',
    uid: 'B-AD-14502',
    name: 'Al Falah Cylinder Bank',
    address: 'Sector 6, Al Falah Community, Abu Dhabi',
    city: 'Abu Dhabi',
    type: 'Gas Cylinder System',
    commercialLicence: 'CN-8821654',
    coords: { lat: 24.4321, lng: 54.6534 },
    permits: {
      amc: { status: 'active', expiry: '2026-07-08' },
      noc: { status: 'not_on_file' },
      coc: { status: 'active', expiry: '2027-10-19' },
    },
    openViolations: 1, openWarnings: 0, pendingActions: 1,
    complianceLevel: 'red', complianceScore: 62,
    lastInspection: { date: '2026-02-12', type: 'Complaint-Driven', outcome: 'Compliant with Warnings' },
    ownerName: 'Al Falah Community Co.',
    fmCompany: 'Community FM',
    gasContractor: 'Bluefield Industrial Contracting',
  },
];

// Distance (m) between two coordinates using the haversine formula. Used by
// the geofence simulation to decide whether the inspector is within the
// building's allowable radius before letting them Start Inspection.
export function haversineMeters(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const R = 6371000;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const x = Math.sin(dLat / 2) ** 2 + Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return Math.round(2 * R * Math.asin(Math.min(1, Math.sqrt(x))));
}

// Canonical Violation Category catalogue from Doc 2 §6.1.
export const VIOLATION_CATEGORIES = [
  'Expired Permit',
  'Unposted Permit',
  'Unauthorized Modification',
  'Safety Equipment Non-Functional',
  'Non-MAES-Registered Material',
  'Failure to Maintain',
  'Failure to Display Emergency Information',
  'Obstructed Safety Equipment',
] as const;

// Inspection Type → human label + canonical checklist template
export const INSPECTION_TYPES = [
  { id: 'routine', label: 'Routine Scheduled Inspection', description: 'Periodic compliance check against the active AMC / NOC / COC.' },
  { id: 're_inspection', label: 'Re-Inspection', description: 'Follow-up on a prior inspection that issued warnings or violations.' },
  { id: 'complaint', label: 'Complaint-Driven Inspection', description: 'Initiated in response to a complaint or tip-off.' },
  { id: 'spot_check', label: 'Spot Check', description: 'Unannounced verification of a specific compliance aspect.' },
  { id: 'incident_response', label: 'Incident Response Inspection', description: 'Initiated in response to an incident report.' },
  { id: 'pre_approval', label: 'Pre-Approval Site Verification', description: 'On-site verification preceding NOC, COC or MAES issuance.' },
] as const;

// Default checklist template — Routine Scheduled Inspection (Doc 2 §5.3).
// Each item links to a Unified Gas Code clause where applicable.
export const DEFAULT_CHECKLIST_TEMPLATE: { description: string; clause?: string }[] = [
  { description: 'AMC currently in force; copy posted at premises.', clause: 'UGC §3.1.1' },
  { description: 'NOC currently in force; copy posted at premises.', clause: 'UGC §3.1.2' },
  { description: 'TPI Conformity Certificate currently valid (where applicable).', clause: 'UGC §3.1.3' },
  { description: 'Gas system schematic drawings, approved by DoE, accessible at premises.', clause: 'UGC §4.2.1' },
  { description: 'Emergency contact numbers and gas-leak procedure displayed at premises (EN + AR).', clause: 'UGC §8.2.1' },
  { description: 'Gas detection / leak detection system operational; calibration in date.', clause: 'UGC §5.3.4' },
  { description: 'Slam-shut valves accessible, not obstructed, functional.', clause: 'UGC §5.4.2' },
  { description: 'Pressure gauges within calibration period.', clause: 'UGC §5.5.1' },
  { description: 'Cylinder / tank storage area complies with the Unified Gas Code.', clause: 'UGC §6.1.0' },
  { description: 'Ventilation adequate per the Unified Gas Code.', clause: 'UGC §6.4.2' },
  { description: 'Safety signage in place (EN + AR) and unobstructed.', clause: 'UGC §8.3.1' },
  { description: 'No unauthorised modifications to the gas system since the last inspection.', clause: 'UGC §7.2.1' },
  { description: 'Materials and equipment installed are MAES-registered.', clause: 'UGC §9.1.1' },
  { description: 'Maintenance company representative present (for scheduled inspections).', clause: 'UGC §10.1' },
];

// Per-inspection-type checklist override — for now the routine template is
// the canonical one; spot checks and pre-approval use trimmed subsets.
export function checklistFor(type: string): { description: string; clause?: string }[] {
  if (type === 'spot_check') {
    return [
      { description: 'AMC currently in force; copy posted at premises.', clause: 'UGC §3.1.1' },
      { description: 'NOC currently in force; copy posted at premises.', clause: 'UGC §3.1.2' },
      { description: 'Emergency contact numbers and gas-leak procedure displayed at premises (EN + AR).', clause: 'UGC §8.2.1' },
      { description: 'Safety signage in place (EN + AR) and unobstructed.', clause: 'UGC §8.3.1' },
    ];
  }
  if (type === 'pre_approval') {
    return [
      { description: 'Site matches the approved schematic drawings.', clause: 'UGC §4.2.1' },
      { description: 'All installed materials are MAES-registered.', clause: 'UGC §9.1.1' },
      { description: 'Pressure / leak testing certificates available.', clause: 'UGC §5.5.1' },
      { description: 'Ventilation adequate per the Unified Gas Code.', clause: 'UGC §6.4.2' },
      { description: 'Safety signage in place (EN + AR).', clause: 'UGC §8.3.1' },
    ];
  }
  return DEFAULT_CHECKLIST_TEMPLATE;
}

// Today's inspector plan — assigned by Senior Inspector at the start of day.
export const INSPECTOR_PLAN_STOPS = ['b-002', 'b-003', 'b-005', 'b-008'];
