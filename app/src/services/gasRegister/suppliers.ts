// =============================================================================
// Gas Register · Supplier Master
// -----------------------------------------------------------------------------
// Companies that supply gas to a permit holder under a trade-licence-backed
// contract. Same provenance taxonomy as the Asset and Customer masters.
// =============================================================================

import { GAS_TYPES, PERMIT_HOLDERS, type AssetSource, sourceLabel } from './assets';

export type { AssetSource } from './assets';
export { sourceLabel, GAS_TYPES, PERMIT_HOLDERS } from './assets';

export interface ContractDocument {
  fileName: string;
  uploadedAt: string;
}

// ---------------------------------------------------------------------------
// SDD §3.2.1 — Product Source (Supplier) dropdown
// -----------------------------------------------------------------------------
// Per the business feedback, the Map New Supplier form must offer a fixed
// dropdown with four options. The first three are pre-approved gas product
// sources; the fourth ("Others") enables a free-text Supplier Name field.
// ---------------------------------------------------------------------------
export type ProductSourceId = 'adnoc' | 'adnoc_city_gas' | 'adnoc_distribution' | 'others';

export interface ProductSourceDef {
  id: ProductSourceId;
  label: string;
  isOthers: boolean;
  /** Suggested trade-licence prefix for prepopulation (where known). */
  defaultTradeLicence?: string;
}

export const PRODUCT_SOURCES: ProductSourceDef[] = [
  { id: 'adnoc',              label: 'ADNOC',              isOthers: false, defaultTradeLicence: 'CN-1000001' },
  { id: 'adnoc_city_gas',     label: 'ADNOC City Gas',     isOthers: false, defaultTradeLicence: 'CN-1000023' },
  { id: 'adnoc_distribution', label: 'ADNOC Distribution', isOthers: false, defaultTradeLicence: 'CN-1000045' },
  { id: 'others',             label: 'Others',             isOthers: true },
];

export function productSourceById(id: ProductSourceId): ProductSourceDef | undefined {
  return PRODUCT_SOURCES.find((p) => p.id === id);
}

export interface GasSupplier {
  id: string;
  permitHolderId: string;
  permitHolderName: string;
  source: AssetSource;
  // SDD §3.2.1 — Product Source classification (ADNOC / ADNOC City Gas /
  // ADNOC Distribution / Others). Existing records are normalised on the fly
  // (Others if not explicitly tagged) for backward compatibility.
  productSource?: ProductSourceId;
  name: string;                  // legal company name (free text when productSource = 'others')
  tradeLicenceNumber: string;    // e.g. CN-1429968
  gasTypes: string[];
  email: string;
  mobile: string;
  detailedAddress: string;
  city: 'Abu Dhabi' | 'Al Ain' | 'Al Dhafra';
  area: string;
  dateOfContract: string;
  contractDocument?: ContractDocument;
  createdAt: string;
  updatedAt: string;
}

/** Resolve the displayed Product Source for any supplier (defaults to Others). */
export function supplierProductSource(s: GasSupplier): ProductSourceDef {
  const id = s.productSource ?? 'others';
  return productSourceById(id) ?? PRODUCT_SOURCES[3];
}

// ============================================================
// Seed dataset
// ============================================================
let counter = 8500;
const sn = () => 'SUP_' + (++counter);

export const SEED_SUPPLIERS: GasSupplier[] = [
  {
    id: sn(),
    permitHolderId: 'PH-002', permitHolderName: 'Emirates Gas LLC',
    source: 'manual',
    name: 'EUROPE GENERAL TRANSPORTING — SOLE PROPRIETORSHIP L.L.C.',
    tradeLicenceNumber: 'CN-1429968',
    gasTypes: ['Benzol / Oils'],
    email: 'ops@innovatechs.com',
    mobile: '+971 2 615 4400',
    detailedAddress: 'Mussafah ICAD, Plot 22, Abu Dhabi',
    city: 'Abu Dhabi', area: 'Mussafah ICAD',
    dateOfContract: '2026-04-20',
    contractDocument: { fileName: '1088519.png', uploadedAt: '2026-04-21T09:00:00Z' },
    createdAt: '2026-04-20T08:30:00Z', updatedAt: '2026-04-21T09:00:00Z',
  },
  {
    id: sn(),
    permitHolderId: 'PH-002', permitHolderName: 'Emirates Gas LLC',
    source: 'manual',
    name: 'CN-76543211-CN-1177604 TEST',
    tradeLicenceNumber: 'CN-76543211',
    gasTypes: ['Propane (Liquefied) / Liquefied Gases'],
    email: 'test1@innovatechs.com',
    mobile: '+971 50 100 1010',
    detailedAddress: 'Test Block A, Abu Dhabi',
    city: 'Abu Dhabi', area: 'Test',
    dateOfContract: '2026-04-22',
    contractDocument: { fileName: 'test-contract-1.pdf', uploadedAt: '2026-04-23T09:00:00Z' },
    createdAt: '2026-04-22T08:00:00Z', updatedAt: '2026-04-23T09:00:00Z',
  },
  {
    id: sn(),
    permitHolderId: 'PH-002', permitHolderName: 'Emirates Gas LLC',
    source: 'manual',
    name: 'Suport-CN-1177604 TEST',
    tradeLicenceNumber: 'Suport',
    gasTypes: ['Butane (Liquefied) / Liquefied Gases'],
    email: 'support@innovatechs.com',
    mobile: '+971 50 200 2020',
    detailedAddress: 'Support Centre, Abu Dhabi',
    city: 'Abu Dhabi', area: 'Test',
    dateOfContract: '2026-04-02',
    contractDocument: { fileName: 'suport-contract.pdf', uploadedAt: '2026-04-03T09:00:00Z' },
    createdAt: '2026-04-02T08:00:00Z', updatedAt: '2026-04-03T09:00:00Z',
  },
  {
    id: sn(),
    permitHolderId: 'PH-001', permitHolderName: 'ADNOC Distribution',
    source: 'asateel',
    name: 'GULF GAS TRADING L.L.C.',
    tradeLicenceNumber: 'CN-2204455',
    gasTypes: ['LPG (Mixed) / Liquefied Gases', 'Propane (Liquefied) / Liquefied Gases'],
    email: 'gulf.gas@innovatechs.com',
    mobile: '+971 2 555 1100',
    detailedAddress: 'Industrial Area 11, Mussafah, Abu Dhabi',
    city: 'Abu Dhabi', area: 'Mussafah',
    dateOfContract: '2025-09-12',
    contractDocument: { fileName: 'gulf-gas-trading-contract.pdf', uploadedAt: '2025-09-13T08:00:00Z' },
    createdAt: '2025-09-12T08:00:00Z', updatedAt: '2025-09-13T08:00:00Z',
  },
  {
    id: sn(),
    permitHolderId: 'PH-001', permitHolderName: 'ADNOC Distribution',
    source: 'petroleum_permit',
    name: 'ARABIAN INDUSTRIAL GASES L.L.C.',
    tradeLicenceNumber: 'CN-1009921',
    gasTypes: ['Industrial Oxygen', 'Industrial Nitrogen', 'Carbon Dioxide'],
    email: 'sales@innovatechs.com',
    mobile: '+971 2 411 8800',
    detailedAddress: 'Khalifa Industrial Zone, Block A12, Abu Dhabi',
    city: 'Abu Dhabi', area: 'KIZAD',
    dateOfContract: '2024-11-04',
    contractDocument: { fileName: 'arabian-industrial-gases-contract.pdf', uploadedAt: '2024-11-05T09:00:00Z' },
    createdAt: '2024-11-04T08:00:00Z', updatedAt: '2025-11-12T10:00:00Z',
  },
  {
    id: sn(),
    permitHolderId: 'PH-003', permitHolderName: 'ADNOC LNG',
    source: 'asateel',
    name: 'AL WATHBA HYDROCARBON SERVICES L.L.C.',
    tradeLicenceNumber: 'CN-5503012',
    gasTypes: ['Liquefied Natural Gas (LNG)', 'Methane'],
    email: 'contracts@innovatechs.com',
    mobile: '+971 2 614 0044',
    detailedAddress: 'Sas Al Nakheel Branch, Abu Dhabi',
    city: 'Abu Dhabi', area: 'Sas Al Nakheel',
    dateOfContract: '2024-08-19',
    contractDocument: { fileName: 'al-wathba-hydrocarbon-contract.pdf', uploadedAt: '2024-08-20T08:00:00Z' },
    createdAt: '2024-08-19T08:00:00Z', updatedAt: '2025-08-10T11:00:00Z',
  },
  {
    id: sn(),
    permitHolderId: 'PH-005', permitHolderName: 'ENOC / Emarat',
    source: 'manual',
    name: 'YAS DISTRIBUTION L.L.C.',
    tradeLicenceNumber: 'CN-3015214',
    gasTypes: ['LPG (Mixed) / Liquefied Gases'],
    email: 'yasdist@innovatechs.com',
    mobile: '+971 2 510 1010',
    detailedAddress: 'Logistics Yard 17, Yas Island, Abu Dhabi',
    city: 'Abu Dhabi', area: 'Yas Island',
    dateOfContract: '2025-12-08',
    contractDocument: { fileName: 'yas-distribution-contract.pdf', uploadedAt: '2025-12-09T09:00:00Z' },
    createdAt: '2025-12-08T08:00:00Z', updatedAt: '2025-12-09T09:00:00Z',
  },
  {
    id: sn(),
    permitHolderId: 'PH-006', permitHolderName: 'Petroleum Development Company',
    source: 'petroleum_permit',
    name: 'AL DHAFRA HYDROCARBON L.L.C.',
    tradeLicenceNumber: 'CN-9912001',
    gasTypes: ['Natural Gas (Compressed)', 'Methane'],
    email: 'aldhafra.hc@innovatechs.com',
    mobile: '+971 2 875 0100',
    detailedAddress: 'Ruwais Industrial City, Al Dhafra',
    city: 'Al Dhafra', area: 'Ruwais',
    dateOfContract: '2024-03-22',
    contractDocument: { fileName: 'al-dhafra-hc-contract.pdf', uploadedAt: '2024-03-23T08:00:00Z' },
    createdAt: '2024-03-22T08:00:00Z', updatedAt: '2025-04-30T13:00:00Z',
  },
];

// ============================================================
export function listSuppliers(): GasSupplier[] { return SEED_SUPPLIERS; }
export function getSupplier(id: string): GasSupplier | undefined { return SEED_SUPPLIERS.find((s) => s.id === id); }
