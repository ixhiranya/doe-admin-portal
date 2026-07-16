// =============================================================================
// Gas Register · Customers Master — BN 1 of the Gas Register SDD.
// -----------------------------------------------------------------------------
// Central registry of all gas consumers, indexed by Category + Building Type.
// Two identification flows per SDD §3.1.2:
//   • EID flow      — Residential Buildings, Villas Palaces
//   • CN/MC flow    — every other category (Government, Religious, Commercial,
//                     Industrial, Gas Plants, Food Establishments, Educational,
//                     Special Events)
// Each customer carries its 4-cert set used by the live Compliance computation
// (see ./compliance.ts).
// =============================================================================

import { GAS_TYPES, PERMIT_HOLDERS, type AssetSource, sourceLabel } from './assets';
import {
  certActive, certExpired, certExpiringSoon, certMissing,
  computeCompliance, type CertSet, type ComplianceResult,
} from './compliance';
import type { GasTypeId } from './technical';

export type { AssetSource } from './assets';
export { sourceLabel, GAS_TYPES, PERMIT_HOLDERS } from './assets';

// ---------------------------------------------------------------------------
// 1. Categories (SDD §3.1.1) — 10 in total, drive the form and the EID/CN flow
// ---------------------------------------------------------------------------
export type CustomerCategory =
  | 'government'
  | 'religious'
  | 'residential'
  | 'commercial'
  | 'industrial'
  | 'gas_plants'
  | 'food_establishments'
  | 'educational'
  | 'villas_palaces'
  | 'special_events';

export interface CategoryDef {
  id: CustomerCategory;
  label: string;
  identification: 'eid' | 'cn-mc';
  buildingTypes: string[];
}

export const CATEGORIES: CategoryDef[] = [
  {
    id: 'government', label: 'Government Buildings', identification: 'cn-mc',
    buildingTypes: ['Municipal buildings', 'Courts and judicial buildings', 'Police stations', 'Civil defence buildings', 'Immigration and passport offices', 'Government service centres', 'Military and security facilities', 'Ministries and government headquarters'],
  },
  {
    id: 'religious', label: 'Religious Buildings', identification: 'cn-mc',
    buildingTypes: ['Mosques', 'Churches', 'Temples', 'Synagogues', 'Religious schools', 'Religious community halls'],
  },
  {
    id: 'residential', label: 'Residential Buildings', identification: 'eid',
    buildingTypes: ['Apartment buildings', 'Residential towers', 'Townhouses', 'Duplexes', 'Labor accommodations', 'Staff housing', 'Boarding houses'],
  },
  {
    id: 'commercial', label: 'Commercial Buildings', identification: 'cn-mc',
    buildingTypes: ['Office buildings', 'Shopping malls', 'Retail shops', 'Supermarkets', 'Hotels', 'Business centres', 'Banks', 'Showrooms', 'Hospitals', 'Mixed Use Building'],
  },
  {
    id: 'industrial', label: 'Industrial Buildings', identification: 'cn-mc',
    buildingTypes: ['Factories', 'Manufacturing plants', 'Warehouses', 'Workshops', 'Industrial laboratories', 'Maintenance yards', 'Logistics and distribution centres'],
  },
  {
    id: 'gas_plants', label: 'Gas Plants', identification: 'cn-mc',
    buildingTypes: ['LPG Plant', 'SNG Plant', 'CNG Plant', 'Gas pressure reduction stations', 'LPG filling stations', 'Gas storage facilities', 'Gas bottling plants', 'SSLNG Plant'],
  },
  {
    id: 'food_establishments', label: 'Food Establishments', identification: 'cn-mc',
    buildingTypes: ['Restaurants', 'Cafés', 'Bakeries', 'Catering kitchens', 'Food courts', 'Slaughterhouses', 'Cold storage facilities', 'Food processing units'],
  },
  {
    id: 'educational', label: 'Educational Buildings', identification: 'cn-mc',
    buildingTypes: ['Schools', 'Universities and colleges', 'Training institutes', 'Research centres', 'Laboratories', 'Student dormitories', 'Early Education Institutions'],
  },
  {
    id: 'villas_palaces', label: 'Villas Palaces', identification: 'eid',
    buildingTypes: ['Private villas', 'Compound villas', 'Staff villas', 'Executive VVIP villas', 'Royal palaces', 'Official guest palaces', 'Cultural or heritage palaces'],
  },
  {
    id: 'special_events', label: 'Special Events', identification: 'cn-mc',
    buildingTypes: ['Mobile caravans', 'Ramadan Tents', 'Exhibition cooking booths', 'Food trucks', 'Outdoor live cooking shows', 'Promotional food events', 'Temporary market stalls', 'Desert events / beach events', 'Temporary Gas setups for catering', 'Community events', 'Temporary cooking facilities'],
  },
];

export function categoryById(id: CustomerCategory): CategoryDef | undefined {
  return CATEGORIES.find((c) => c.id === id);
}
export function categoryLabel(id: CustomerCategory): string {
  return categoryById(id)?.label ?? id;
}
/** EID-flow categories per SDD §3.1.2 — Residential, Villas Palaces. */
export function categoryUsesEid(id: CustomerCategory): boolean {
  return categoryById(id)?.identification === 'eid';
}

// ---------------------------------------------------------------------------
// 2. Connection Status (SDD §3.13) — driven by Connection / Disconnection log
// ---------------------------------------------------------------------------
export type ConnectionStatus = 'Active' | 'Disconnected' | 'Suspended' | 'Expired';

// ---------------------------------------------------------------------------
// 3. Gas allocations (existing)
// ---------------------------------------------------------------------------
export interface GasAllocation {
  id: string;
  gasType: GasTypeId | string;     // typed-keyed when known; legacy seed used free strings
  capacityLiters: number;
}

export interface ContractDocument {
  fileName: string;
  uploadedAt: string;
}

// ---------------------------------------------------------------------------
// 4. Customer record
// ---------------------------------------------------------------------------
export interface GasCustomer {
  id: string;                            // CUST_xxxxx
  permitHolderId: string;
  permitHolderName: string;
  source: AssetSource;

  // Category & Building Type (SDD §3.1.1)
  category: CustomerCategory;
  buildingType: string;

  // Common (all categories)
  accountId: string;                     // Gas account / meter account reference
  buildingName: string;
  ownerOrFmName: string;
  ownerOrFmContact: string;
  ownerOrFmEmail: string;
  detailedAddress: string;
  city: 'Abu Dhabi' | 'Al Ain' | 'Al Dhafra';
  area: string;
  sectorNo?: string;
  plotNo?: string;
  coordinates: { lat: number; lng: number };
  totalCapacityLiters: number;
  gasTypes: GasTypeId[];                 // multi-select from Type of Gas master
  gasAllocations: GasAllocation[];       // optional per-gas allocation
  dateOfContract: string;
  expiryOfGasSalesContract?: string;     // SDD §3.1.2 — new field
  contractDocument?: ContractDocument;

  // EID-flow only (Residential + Villas Palaces) — SDD §3.1.2
  emiratesId?: string;
  accountOwnerName?: string;
  endUserName?: string;
  nationality?: string;

  // CN/MC-flow only — SDD §3.1.2
  tradeLicenceNumber?: string;
  commercialName?: string;
  licenceAuthority?: string;
  economicActivity?: string;

  // Connection lifecycle (SDD §3.13)
  connectionStatus: ConnectionStatus;

  // Compliance (SDD §3.14) — 4-cert set; Compliance Rate is computed live.
  certificates: CertSet;

  // Provenance — for Petroleum-Permit-fetched rows with incomplete data
  incompleteFromPermit?: boolean;

  createdAt: string;
  updatedAt: string;
}

// ---------------------------------------------------------------------------
// 5. Helpers exported for the UI layer
// ---------------------------------------------------------------------------

/** Mask an Emirates ID for display: 784-XXXX-XXXXXXX-X. SDD §3.1: "mask their
 *  emirates ID from displaying" for Residential / Villas Palaces. */
export function maskEid(eid: string | undefined): string {
  if (!eid) return '—';
  const digits = eid.replace(/[^0-9]/g, '');
  if (digits.length < 10) return eid;
  const last4 = digits.slice(-4);
  return `784-XXXX-XXX${last4.slice(0, 3)}-${last4.slice(3)}`;
}

/** Resolve the customer's display "identifier" — masked EID for the EID flow,
 *  trade-licence number for CN/MC flow. */
export function customerIdentifier(c: GasCustomer): string {
  return categoryUsesEid(c.category)
    ? maskEid(c.emiratesId)
    : (c.tradeLicenceNumber || '—');
}

/** Compliance result for a customer — re-derived on every call (live). */
export function customerCompliance(c: GasCustomer): ComplianceResult {
  return computeCompliance(c.certificates);
}

/** Is the customer's gas-sales contract about to expire (≤ 30 days)? */
export function contractExpiringSoon(c: GasCustomer): boolean {
  if (!c.expiryOfGasSalesContract) return false;
  const days = Math.round((new Date(c.expiryOfGasSalesContract).getTime() - Date.now()) / 86400000);
  return days >= 0 && days <= 30;
}

/** Is the customer's gas-sales contract expired? */
export function contractExpired(c: GasCustomer): boolean {
  if (!c.expiryOfGasSalesContract) return false;
  return c.expiryOfGasSalesContract < new Date().toISOString().slice(0, 10);
}

// ---------------------------------------------------------------------------
// 6. Seed dataset — populated to demonstrate every category & compliance band
// ---------------------------------------------------------------------------
let counter = 1_001_500;
const sn = () => 'CUST_' + (++counter);

function alloc(gas: GasTypeId, capacityLiters: number, idx = 0): GasAllocation {
  return { id: `g${idx + 1}`, gasType: gas, capacityLiters };
}

export const SEED_CUSTOMERS: GasCustomer[] = [
  // ─────────── Government ────────────────────────────────────────────────
  {
    id: sn(),
    permitHolderId: 'PH-001', permitHolderName: 'ADNOC Distribution', source: 'petroleum_permit',
    category: 'government', buildingType: 'Ministries and government headquarters',
    accountId: 'GOV-AC-44120', buildingName: 'Ministry of Energy & Infrastructure HQ',
    ownerOrFmName: 'Khalid Al Mansoori', ownerOrFmContact: '+971 2 555 1100', ownerOrFmEmail: 'fm@moei.gov.ae',
    detailedAddress: 'Al Bateen, Abu Dhabi', city: 'Abu Dhabi', area: 'Al Bateen', sectorNo: 'W-12', plotNo: 'P-7',
    coordinates: { lat: 24.443, lng: 54.402 },
    totalCapacityLiters: 18_000, gasTypes: ['lpg'], gasAllocations: [alloc('lpg', 18_000, 0)],
    dateOfContract: '2024-03-15', expiryOfGasSalesContract: '2027-03-14',
    tradeLicenceNumber: 'GOV-1001', commercialName: 'Ministry of Energy & Infrastructure', licenceAuthority: 'Federal Government',
    economicActivity: 'Government services',
    connectionStatus: 'Active',
    certificates: { istifaa: certActive(3), doeNoc: certActive(2), amcGas: certActive(2), gasTpiCoc: certActive(2) },
    createdAt: '2024-03-15T08:00:00Z', updatedAt: '2025-11-05T10:00:00Z',
  },
  // ─────────── Religious ─────────────────────────────────────────────────
  {
    id: sn(),
    permitHolderId: 'PH-002', permitHolderName: 'Emirates Gas LLC', source: 'petroleum_permit',
    category: 'religious', buildingType: 'Mosques',
    accountId: 'REL-AC-22014', buildingName: 'Sheikh Zayed Grand Mosque · Cafeteria',
    ownerOrFmName: 'Saeed Al Mazrouei', ownerOrFmContact: '+971 2 419 1000', ownerOrFmEmail: 'admin@szgmc.ae',
    detailedAddress: 'Sheikh Rashid Bin Saeed Street, Abu Dhabi', city: 'Abu Dhabi', area: 'Al Khaleej Al Arabi', sectorNo: 'E-2', plotNo: 'P-1',
    coordinates: { lat: 24.412, lng: 54.475 },
    totalCapacityLiters: 8_000, gasTypes: ['lpg'], gasAllocations: [alloc('lpg', 8_000, 0)],
    dateOfContract: '2024-09-01', expiryOfGasSalesContract: '2026-08-31',
    tradeLicenceNumber: 'REL-2001', commercialName: 'Sheikh Zayed Grand Mosque Centre',
    licenceAuthority: 'GAC',
    connectionStatus: 'Active',
    certificates: { istifaa: certActive(4), doeNoc: certExpiringSoon(20), amcGas: certActive(1), gasTpiCoc: certActive(2) },
    createdAt: '2024-09-01T08:00:00Z', updatedAt: '2025-10-12T10:00:00Z',
  },
  // ─────────── Residential (EID flow) ────────────────────────────────────
  {
    id: sn(),
    permitHolderId: 'PH-001', permitHolderName: 'ADNOC Distribution', source: 'manual',
    category: 'residential', buildingType: 'Apartment buildings',
    accountId: 'RES-AC-11288', buildingName: 'Al Reem Lagoon Residences',
    ownerOrFmName: 'Ahmed Al Suwaidi', ownerOrFmContact: '+971 50 700 8801', ownerOrFmEmail: 'fm@reemlagoon.ae',
    detailedAddress: 'Al Reem Island, Abu Dhabi', city: 'Abu Dhabi', area: 'Al Reem Island', sectorNo: 'R-12', plotNo: 'R-12-A',
    coordinates: { lat: 24.499, lng: 54.405 },
    totalCapacityLiters: 24_000, gasTypes: ['lpg'], gasAllocations: [alloc('lpg', 24_000, 0)],
    dateOfContract: '2025-04-10', expiryOfGasSalesContract: '2028-04-09',
    emiratesId: '784-1985-1234567-1', accountOwnerName: 'Ahmed Al Suwaidi', nationality: 'United Arab Emirates',
    connectionStatus: 'Active',
    certificates: { istifaa: certActive(3), doeNoc: certActive(2), amcGas: certActive(2), gasTpiCoc: certActive(2) },
    createdAt: '2025-04-10T08:00:00Z', updatedAt: '2025-12-01T10:00:00Z',
  },
  // ─────────── Commercial (CN/MC) ────────────────────────────────────────
  {
    id: sn(),
    permitHolderId: 'PH-005', permitHolderName: 'ENOC / Emarat', source: 'petroleum_permit',
    category: 'commercial', buildingType: 'Hotels',
    accountId: 'COM-AC-91120', buildingName: 'Yas North Beach Hotel',
    ownerOrFmName: 'Mariam Al Hashemi', ownerOrFmContact: '+971 2 510 1010', ownerOrFmEmail: 'fm@yashotels.ae',
    detailedAddress: 'Yas North, Abu Dhabi', city: 'Abu Dhabi', area: 'Yas Island', sectorNo: 'Y-7', plotNo: 'P-3A',
    coordinates: { lat: 24.488, lng: 54.604 },
    totalCapacityLiters: 32_000, gasTypes: ['lpg', 'cng'], gasAllocations: [alloc('lpg', 24_000, 0), alloc('cng', 8_000, 1)],
    dateOfContract: '2025-06-12', expiryOfGasSalesContract: '2028-06-11',
    tradeLicenceNumber: 'CN-3015214', commercialName: 'YAS DISTRIBUTION L.L.C.', licenceAuthority: 'ADDED',
    economicActivity: 'Hospitality · Hotel',
    connectionStatus: 'Active',
    certificates: { istifaa: certActive(3), doeNoc: certActive(2), amcGas: certExpiringSoon(25), gasTpiCoc: certActive(2) },
    createdAt: '2025-06-12T08:00:00Z', updatedAt: '2025-12-05T10:00:00Z',
  },
  // ─────────── Industrial ────────────────────────────────────────────────
  {
    id: sn(),
    permitHolderId: 'PH-006', permitHolderName: 'Petroleum Development Company', source: 'petroleum_permit',
    category: 'industrial', buildingType: 'Manufacturing plants',
    accountId: 'IND-AC-77881', buildingName: 'Ruwais Catering Block',
    ownerOrFmName: 'Tarek Bin Hamad', ownerOrFmContact: '+971 2 875 0100', ownerOrFmEmail: 'plant@ruwais.ae',
    detailedAddress: 'Ruwais Industrial Complex, Al Dhafra', city: 'Al Dhafra', area: 'Ruwais', sectorNo: 'E-11', plotNo: 'RIC-22',
    coordinates: { lat: 24.085, lng: 52.733 },
    totalCapacityLiters: 65_000, gasTypes: ['lpg', 'ng'], gasAllocations: [alloc('lpg', 40_000, 0), alloc('ng', 25_000, 1)],
    dateOfContract: '2024-08-19', expiryOfGasSalesContract: '2027-08-18',
    tradeLicenceNumber: 'CN-9912001', commercialName: 'AL DHAFRA HYDROCARBON L.L.C.', licenceAuthority: 'ADDED',
    economicActivity: 'Industrial · Manufacturing',
    connectionStatus: 'Active',
    incompleteFromPermit: true,
    certificates: { istifaa: certActive(4), doeNoc: certActive(2), amcGas: certExpired(45), gasTpiCoc: certActive(1) },
    createdAt: '2024-08-19T08:00:00Z', updatedAt: '2025-09-04T10:00:00Z',
  },
  // ─────────── Gas Plants ────────────────────────────────────────────────
  {
    id: sn(),
    permitHolderId: 'PH-003', permitHolderName: 'ADNOC LNG', source: 'asateel',
    category: 'gas_plants', buildingType: 'LPG filling stations',
    accountId: 'GP-AC-04412', buildingName: 'Mussafah LPG Filling Station',
    ownerOrFmName: 'Reema Al Marri', ownerOrFmContact: '+971 2 614 4400', ownerOrFmEmail: 'ops@adnoclng.ae',
    detailedAddress: 'Mussafah ICAD, Plot 22, Abu Dhabi', city: 'Abu Dhabi', area: 'Mussafah ICAD', sectorNo: 'ICAD-3', plotNo: 'P-22',
    coordinates: { lat: 24.354, lng: 54.501 },
    totalCapacityLiters: 120_000, gasTypes: ['lpg', 'propane', 'butane'],
    gasAllocations: [alloc('lpg', 80_000, 0), alloc('propane', 25_000, 1), alloc('butane', 15_000, 2)],
    dateOfContract: '2024-11-04', expiryOfGasSalesContract: '2027-11-03',
    tradeLicenceNumber: 'CN-1009921', commercialName: 'ARABIAN INDUSTRIAL GASES L.L.C.', licenceAuthority: 'ADDED',
    economicActivity: 'Industrial · Gas',
    connectionStatus: 'Active',
    certificates: { istifaa: certActive(5), doeNoc: certActive(3), amcGas: certActive(2), gasTpiCoc: certActive(2) },
    createdAt: '2024-11-04T08:00:00Z', updatedAt: '2025-11-12T10:00:00Z',
  },
  // ─────────── Food Establishments ───────────────────────────────────────
  {
    id: sn(),
    permitHolderId: 'PH-005', permitHolderName: 'ENOC / Emarat', source: 'manual',
    category: 'food_establishments', buildingType: 'Restaurants',
    accountId: 'FE-AC-22014', buildingName: 'Yas Mall Food Court',
    ownerOrFmName: 'Hessa Al Falasi', ownerOrFmContact: '+971 2 555 9001', ownerOrFmEmail: 'fm@yasmall.ae',
    detailedAddress: 'Yas Mall, Abu Dhabi', city: 'Abu Dhabi', area: 'Yas Island', sectorNo: 'YM', plotNo: 'P-1A',
    coordinates: { lat: 24.488, lng: 54.604 },
    totalCapacityLiters: 4_500, gasTypes: ['lpg'], gasAllocations: [alloc('lpg', 4_500, 0)],
    dateOfContract: '2025-01-15', expiryOfGasSalesContract: '2026-06-30',
    tradeLicenceNumber: 'CN-77104432', commercialName: 'Yas Mall Catering Services', licenceAuthority: 'ADDED',
    economicActivity: 'Hospitality · Restaurant & catering',
    connectionStatus: 'Active',
    certificates: { istifaa: certMissing(), doeNoc: certActive(1), amcGas: certActive(1), gasTpiCoc: certMissing() },
    createdAt: '2025-01-15T08:00:00Z', updatedAt: '2025-09-15T10:00:00Z',
  },
  // ─────────── Educational ───────────────────────────────────────────────
  {
    id: sn(),
    permitHolderId: 'PH-001', permitHolderName: 'ADNOC Distribution', source: 'petroleum_permit',
    category: 'educational', buildingType: 'Universities and colleges',
    accountId: 'EDU-AC-15008', buildingName: 'NYU Abu Dhabi · Dining Hall',
    ownerOrFmName: 'Layla Al Hammadi', ownerOrFmContact: '+971 2 628 4000', ownerOrFmEmail: 'facilities@nyuad.ae',
    detailedAddress: 'Saadiyat Island, Abu Dhabi', city: 'Abu Dhabi', area: 'Saadiyat Island', sectorNo: 'Cult', plotNo: 'P-7B',
    coordinates: { lat: 24.541, lng: 54.444 },
    totalCapacityLiters: 6_500, gasTypes: ['lpg'], gasAllocations: [alloc('lpg', 6_500, 0)],
    dateOfContract: '2024-12-10', expiryOfGasSalesContract: '2027-12-09',
    tradeLicenceNumber: 'CN-22018855', commercialName: 'NYU Abu Dhabi', licenceAuthority: 'ADEK',
    economicActivity: 'Education · University',
    connectionStatus: 'Active',
    certificates: { istifaa: certActive(3), doeNoc: certActive(2), amcGas: certActive(2), gasTpiCoc: certActive(2) },
    createdAt: '2024-12-10T08:00:00Z', updatedAt: '2025-12-12T10:00:00Z',
  },
  // ─────────── Villas Palaces (EID flow) ─────────────────────────────────
  {
    id: sn(),
    permitHolderId: 'PH-001', permitHolderName: 'ADNOC Distribution', source: 'manual',
    category: 'villas_palaces', buildingType: 'Private villas',
    accountId: 'VP-AC-77001', buildingName: 'Saadiyat Cove Private Villa',
    ownerOrFmName: 'Mohammed Al Mansouri', ownerOrFmContact: '+971 50 700 8801', ownerOrFmEmail: 'pv@saadiyatcove.ae',
    detailedAddress: 'Saadiyat Cove, Abu Dhabi', city: 'Abu Dhabi', area: 'Saadiyat Island', sectorNo: 'SC-5', plotNo: 'V-7',
    coordinates: { lat: 24.535, lng: 54.451 },
    totalCapacityLiters: 1_200, gasTypes: ['lpg'], gasAllocations: [alloc('lpg', 1_200, 0)],
    dateOfContract: '2025-08-22', expiryOfGasSalesContract: '2028-08-21',
    emiratesId: '784-1972-9988776-3', accountOwnerName: 'Mohammed Al Mansouri', endUserName: 'Sara Al Mansouri', nationality: 'United Arab Emirates',
    connectionStatus: 'Active',
    certificates: { istifaa: certActive(4), doeNoc: certActive(2), amcGas: certActive(2), gasTpiCoc: certActive(2) },
    createdAt: '2025-08-22T08:00:00Z', updatedAt: '2025-12-15T10:00:00Z',
  },
  // ─────────── Special Events ────────────────────────────────────────────
  {
    id: sn(),
    permitHolderId: 'PH-002', permitHolderName: 'Emirates Gas LLC', source: 'manual',
    category: 'special_events', buildingType: 'Ramadan Tents',
    accountId: 'SE-AC-09010', buildingName: 'Eid Festival Catering · Corniche Tent',
    ownerOrFmName: 'Noura Al Otaiba', ownerOrFmContact: '+971 50 110 2030', ownerOrFmEmail: 'events@adevents.ae',
    detailedAddress: 'Corniche Road, Abu Dhabi', city: 'Abu Dhabi', area: 'Corniche', sectorNo: 'C-2', plotNo: 'P-3',
    coordinates: { lat: 24.464, lng: 54.328 },
    totalCapacityLiters: 800, gasTypes: ['lpg'], gasAllocations: [alloc('lpg', 800, 0)],
    dateOfContract: '2026-03-01', expiryOfGasSalesContract: '2026-05-31',
    tradeLicenceNumber: 'CN-66201144', commercialName: 'AD Events & Catering LLC', licenceAuthority: 'ADDED',
    economicActivity: 'Hospitality · Catering',
    connectionStatus: 'Suspended',
    certificates: { istifaa: certExpired(120), doeNoc: certMissing(), amcGas: certMissing(), gasTpiCoc: certMissing() },
    createdAt: '2026-03-01T08:00:00Z', updatedAt: '2026-04-01T10:00:00Z',
  },
  // ─────────── Disconnected commercial — for Outflow-dropdown exclusion demo
  {
    id: sn(),
    permitHolderId: 'PH-001', permitHolderName: 'ADNOC Distribution', source: 'manual',
    category: 'commercial', buildingType: 'Retail shops',
    accountId: 'COM-AC-DISC-1', buildingName: 'Closed Restaurant · Khalidiya',
    ownerOrFmName: 'Yusuf Al Khaja', ownerOrFmContact: '+971 50 999 0000', ownerOrFmEmail: 'closed@archive.ae',
    detailedAddress: 'Khalidiya Mall, Abu Dhabi', city: 'Abu Dhabi', area: 'Khalidiya',
    coordinates: { lat: 24.475, lng: 54.347 },
    totalCapacityLiters: 600, gasTypes: ['lpg'], gasAllocations: [alloc('lpg', 600, 0)],
    dateOfContract: '2023-04-10', expiryOfGasSalesContract: '2024-04-09',
    tradeLicenceNumber: 'CN-88012044', commercialName: 'Khalidiya F&B', licenceAuthority: 'ADDED',
    economicActivity: 'Hospitality · Restaurant & catering',
    connectionStatus: 'Disconnected',
    certificates: { istifaa: certExpired(200), doeNoc: certExpired(180), amcGas: certMissing(), gasTpiCoc: certMissing() },
    createdAt: '2023-04-10T08:00:00Z', updatedAt: '2025-02-12T10:00:00Z',
  },
];

// ---------------------------------------------------------------------------
// 7. Public API
// ---------------------------------------------------------------------------
export function listCustomers(): GasCustomer[] { return SEED_CUSTOMERS; }
export function getCustomer(id: string): GasCustomer | undefined { return SEED_CUSTOMERS.find((c) => c.id === id); }

/** Active customers only (exclude Disconnected / Suspended) — used by Outflow
 *  dropdown per SDD §3.13: "A disconnected customer shall not appear in the
 *  Outflow customer dropdown." */
export function listActiveCustomers(): GasCustomer[] {
  return SEED_CUSTOMERS.filter((c) => c.connectionStatus === 'Active');
}

/** Aggregate live compliance computation across every customer — used by the
 *  Gas Register Dashboard heatmap and the average-compliance KPI. */
export function aggregateCompliance() {
  const results = SEED_CUSTOMERS.map((c) => ({ customer: c, compliance: customerCompliance(c) }));
  const avg = results.length === 0 ? 0
    : Math.round(results.reduce((s, r) => s + r.compliance.rate, 0) / results.length);
  const byBand = {
    'Fully Compliant': results.filter((r) => r.compliance.band === 'Fully Compliant').length,
    'Minor Gap':       results.filter((r) => r.compliance.band === 'Minor Gap').length,
    'At Risk':         results.filter((r) => r.compliance.band === 'At Risk').length,
    'Non-Compliant':   results.filter((r) => r.compliance.band === 'Non-Compliant').length,
  };
  const expiringSoon = results.filter((r) => r.compliance.anyExpiringSoon).length;
  const expired      = results.filter((r) => r.compliance.anyExpired).length;
  return { results, avg, byBand, expiringSoon, expired };
}

// Backwards-compatibility re-exports — the older binary BusinessType is still
// referenced by some pages (gasFlow seed, OutflowListPage filters). Map it to
// the new category space so those pages keep compiling while we migrate them.
export type BusinessType = 'Residential' | 'Commercial';
export const BUSINESS_TYPES: BusinessType[] = ['Residential', 'Commercial'];
export const ECONOMIC_ACTIVITIES = [
  'Hospitality · Hotel',
  'Hospitality · Restaurant & catering',
  'Healthcare · Hospital',
  'Education · School',
  'Industrial · Manufacturing',
  'Industrial · Painting & coating',
  'Retail · Mall food court',
  'Retail · Filling station',
  'Office · Mixed-use tower',
  'Residential · Villa',
  'Residential · Apartment',
] as const;

/** Legacy helper — a customer's "businessType" used to be the only category;
 *  expose a derived value so older pages keep working until they migrate to
 *  the full 10-category model. */
export function customerLegacyBusinessType(c: GasCustomer): BusinessType {
  return c.category === 'residential' || c.category === 'villas_palaces' ? 'Residential' : 'Commercial';
}
