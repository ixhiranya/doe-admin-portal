// =============================================================================
// Gas Register · Asset Master
// -----------------------------------------------------------------------------
// Storage facilities (tanks, cylinders, pipelines, bunkers) registered with the
// DoE under a permit holder. Sourced from one of three channels:
//   - Asateel        — DMT-side asset records
//   - Petroleum Permit — the asset is referenced on an active permit
//   - Manual          — the entity entered it directly into the Gas Register
//
// This file owns the type model + seed dataset for the demo. Real wiring would
// load from the Unified Platform; the rest of the UI never touches that detail.
// =============================================================================

export type AssetSource = 'asateel' | 'petroleum_permit' | 'manual';
export type Ownership = 'owned' | 'rented';
export type OperatedBy = 'self' | 'others';
export type StorageType = 'tank' | 'cylinder' | 'pipeline' | 'drum' | 'bunker';

export interface Person {
  fullName: string;
  emiratesId: string;
  email: string;
  mobile: string;
}

export interface StorageMethod {
  id: string;
  name: string;
  areaSqM: number;
  capacityLiters: number;
  type: StorageType;
  productsStored: string[];
}

export interface GasAsset {
  id: string;                 // APPP_795
  permitHolderId: string;
  permitHolderName: string;
  facilityName: string;
  source: AssetSource;
  totalCapacityLiters: number;
  gasTypes: string[];         // canonical labels
  detailedAddress: string;
  city: 'Abu Dhabi' | 'Al Ain' | 'Al Dhafra';
  area: string;
  coordinates: { lat: number; lng: number };
  safetyMeasures: string;
  inspectionAuthority: string;
  dateOfInspection: string;   // ISO date
  ownership: Ownership;
  owner: Person;
  operatedBy: OperatedBy;
  operator: Person;
  storageMethods: StorageMethod[];
  createdAt: string;
  updatedAt: string;
}

// ============================================================
// Reference lists — single source of truth for dropdowns/badges
// ============================================================
export const GAS_TYPES = [
  'Propane (Liquefied) / Liquefied Gases',
  'Butane (Liquefied) / Liquefied Gases',
  'LPG (Mixed) / Liquefied Gases',
  'Natural Gas (Compressed)',
  'Liquefied Natural Gas (LNG)',
  'Methane',
  'Ethane',
  'Hydrogen',
  'Industrial Oxygen',
  'Industrial Nitrogen',
  'Carbon Dioxide',
  'Refrigerated Liquefied Gases',
] as const;

export const PERMIT_HOLDERS = [
  { id: 'PH-001', name: 'ADNOC Distribution' },
  { id: 'PH-002', name: 'Emirates Gas LLC' },
  { id: 'PH-003', name: 'ADNOC LNG' },
  { id: 'PH-004', name: 'Dolphin Energy' },
  { id: 'PH-005', name: 'ENOC / Emarat' },
  { id: 'PH-006', name: 'Petroleum Development Company' },
  { id: 'PH-007', name: 'Al Yasat Petroleum' },
] as const;

export const STORAGE_TYPES: { id: StorageType; label: string }[] = [
  { id: 'tank',     label: 'Tank' },
  { id: 'cylinder', label: 'Cylinder bank' },
  { id: 'pipeline', label: 'Pipeline manifold' },
  { id: 'drum',     label: 'Drum store' },
  { id: 'bunker',   label: 'Bunker' },
];

export const INSPECTION_AUTHORITIES = [
  'Bureau Veritas',
  'SGS Gulf',
  'TÜV SÜD Middle East',
  'Lloyd’s Register',
  'Intertek',
  'DoE Internal Inspectorate',
] as const;

// ============================================================
// Completeness scoring — drives the "Incomplete Data from
// Petroleum Permit" indicator from the legacy screen, but
// generalised so it works for any source.
// ============================================================
const REQUIRED_FIELDS: (keyof GasAsset)[] = [
  'permitHolderName', 'facilityName', 'totalCapacityLiters', 'gasTypes',
  'detailedAddress', 'coordinates', 'safetyMeasures', 'inspectionAuthority',
  'dateOfInspection', 'ownership', 'operatedBy',
];

export function assetCompleteness(a: GasAsset): number {
  let filled = 0;
  for (const k of REQUIRED_FIELDS) {
    const v = a[k] as unknown;
    if (v == null) continue;
    if (Array.isArray(v) && v.length === 0) continue;
    if (typeof v === 'string' && !v.trim()) continue;
    if (typeof v === 'number' && v === 0) continue;
    filled++;
  }
  // Storage methods count for one more slot — at least one must exist
  if (a.storageMethods && a.storageMethods.length > 0) filled++;
  return Math.round((filled / (REQUIRED_FIELDS.length + 1)) * 100);
}

export function inspectionStatus(a: GasAsset): 'current' | 'due-soon' | 'overdue' {
  const last = new Date(a.dateOfInspection).getTime();
  const months = (Date.now() - last) / (1000 * 60 * 60 * 24 * 30);
  if (months >= 12) return 'overdue';
  if (months >= 10) return 'due-soon';
  return 'current';
}

// ============================================================
// Seed dataset
// ============================================================
function person(name: string, eid: string, suffix: string): Person {
  const initials = name.split(' ').slice(0, 2).map((p) => p[0]).join('').toLowerCase();
  return {
    fullName: name.toUpperCase(),
    emiratesId: eid,
    email: `${initials}.${suffix}@innovatechs.com`,
    mobile: '+971 50 ' + (3000000 + parseInt(suffix.replace(/\D/g, ''), 10) % 7000000).toString().padStart(7, '0'),
  };
}

let serial = 600;
const sn = () => 'APPP_' + (++serial);

export const SEED_ASSETS: GasAsset[] = [
  {
    id: sn(),
    permitHolderId: 'PH-001', permitHolderName: 'ADNOC Distribution',
    facilityName: 'Mussafah Bulk Storage Terminal',
    source: 'asateel',
    totalCapacityLiters: 4_800_000,
    gasTypes: ['Propane (Liquefied) / Liquefied Gases', 'Butane (Liquefied) / Liquefied Gases', 'LPG (Mixed) / Liquefied Gases'],
    detailedAddress: 'M-44 Industrial Area, Mussafah, Abu Dhabi',
    city: 'Abu Dhabi', area: 'Mussafah',
    coordinates: { lat: 24.3552, lng: 54.5104 },
    safetyMeasures: 'Foam-water deluge system, 24/7 fire watch, gas detection grid, intrinsically-safe lighting, double-wall containment, automatic ESD valves on inlet and outlet manifolds.',
    inspectionAuthority: 'Bureau Veritas',
    dateOfInspection: '2026-02-14',
    ownership: 'owned', owner: person('Khalid Al Hosani', '784-1986-1112233-4', '5101'),
    operatedBy: 'self', operator: person('Khalid Al Hosani', '784-1986-1112233-4', '5101'),
    storageMethods: [
      { id: 's1', name: 'Bulk Tank A', areaSqM: 220, capacityLiters: 2_400_000, type: 'tank', productsStored: ['Propane (Liquefied) / Liquefied Gases'] },
      { id: 's2', name: 'Bulk Tank B', areaSqM: 220, capacityLiters: 2_400_000, type: 'tank', productsStored: ['Butane (Liquefied) / Liquefied Gases', 'LPG (Mixed) / Liquefied Gases'] },
    ],
    createdAt: '2024-11-04T08:12:00Z', updatedAt: '2026-02-15T10:02:00Z',
  },
  {
    id: sn(),
    permitHolderId: 'PH-001', permitHolderName: 'ADNOC Distribution',
    facilityName: 'Al Ain North Cylinder Depot',
    source: 'petroleum_permit',
    totalCapacityLiters: 320_000,
    gasTypes: ['LPG (Mixed) / Liquefied Gases'],
    detailedAddress: 'Plot 12-B, Al Jimi Industrial Block, Al Ain',
    city: 'Al Ain', area: 'Al Jimi',
    coordinates: { lat: 24.2273, lng: 55.7472 },
    safetyMeasures: 'Cylinder cages with ventilation, no-smoke perimeter, twice-daily integrity inspection.',
    inspectionAuthority: 'SGS Gulf',
    dateOfInspection: '2025-08-22',
    ownership: 'rented', owner: person('Hessa Al Mazrouei', '784-1990-2233445-1', '5102'),
    operatedBy: 'self', operator: person('Hessa Al Mazrouei', '784-1990-2233445-1', '5102'),
    storageMethods: [
      { id: 's1', name: 'Cylinder Bank 1', areaSqM: 120, capacityLiters: 160_000, type: 'cylinder', productsStored: ['LPG (Mixed) / Liquefied Gases'] },
      { id: 's2', name: 'Cylinder Bank 2', areaSqM: 120, capacityLiters: 160_000, type: 'cylinder', productsStored: ['LPG (Mixed) / Liquefied Gases'] },
    ],
    createdAt: '2024-09-18T11:30:00Z', updatedAt: '2025-08-23T07:45:00Z',
  },
  {
    id: sn(),
    permitHolderId: 'PH-002', permitHolderName: 'Emirates Gas LLC',
    facilityName: 'Khalifa Industrial Filling Plant',
    source: 'asateel',
    totalCapacityLiters: 1_650_000,
    gasTypes: ['Propane (Liquefied) / Liquefied Gases', 'Butane (Liquefied) / Liquefied Gases'],
    detailedAddress: 'KIZAD Block A4, Khalifa Industrial Zone, Abu Dhabi',
    city: 'Abu Dhabi', area: 'KIZAD',
    coordinates: { lat: 24.7621, lng: 54.6498 },
    safetyMeasures: 'Automatic foam suppression, two independent ESD circuits, gas leak alarms on every loading bay, perimeter ATEX rating.',
    inspectionAuthority: 'TÜV SÜD Middle East',
    dateOfInspection: '2025-12-10',
    ownership: 'owned', owner: person('Reem Al Dhaheri', '784-1988-3344556-2', '5103'),
    operatedBy: 'others', operator: person('Saif Al Suwaidi', '784-1992-4455667-3', '5104'),
    storageMethods: [
      { id: 's1', name: 'Bulk Tank A', areaSqM: 180, capacityLiters: 900_000, type: 'tank', productsStored: ['Propane (Liquefied) / Liquefied Gases'] },
      { id: 's2', name: 'Bulk Tank B', areaSqM: 180, capacityLiters: 750_000, type: 'tank', productsStored: ['Butane (Liquefied) / Liquefied Gases'] },
    ],
    createdAt: '2024-06-12T09:00:00Z', updatedAt: '2025-12-11T12:18:00Z',
  },
  {
    id: sn(),
    permitHolderId: 'PH-003', permitHolderName: 'ADNOC LNG',
    facilityName: 'Das Island LNG Terminal — North Bund',
    source: 'asateel',
    totalCapacityLiters: 280_000_000,
    gasTypes: ['Liquefied Natural Gas (LNG)', 'Methane'],
    detailedAddress: 'Das Island, Al Dhafra Region',
    city: 'Al Dhafra', area: 'Das Island',
    coordinates: { lat: 25.1480, lng: 52.8773 },
    safetyMeasures: 'Cryogenic spill containment basin, helideck-rated foam tender, dual loop emergency depressurisation, redundant boil-off compressors, three-tier perimeter ESD.',
    inspectionAuthority: 'Lloyd’s Register',
    dateOfInspection: '2026-01-30',
    ownership: 'owned', owner: person('Dr. Khalifa Al Nuaimi', '784-1975-5566778-4', '5105'),
    operatedBy: 'self', operator: person('Dr. Khalifa Al Nuaimi', '784-1975-5566778-4', '5105'),
    storageMethods: [
      { id: 's1', name: 'LNG Storage T-101', areaSqM: 4_800, capacityLiters: 140_000_000, type: 'tank', productsStored: ['Liquefied Natural Gas (LNG)'] },
      { id: 's2', name: 'LNG Storage T-102', areaSqM: 4_800, capacityLiters: 140_000_000, type: 'tank', productsStored: ['Liquefied Natural Gas (LNG)'] },
    ],
    createdAt: '2024-03-01T07:00:00Z', updatedAt: '2026-01-31T08:30:00Z',
  },
  {
    id: sn(),
    permitHolderId: 'PH-004', permitHolderName: 'Dolphin Energy',
    facilityName: 'Taweelah Reception Manifold',
    source: 'asateel',
    totalCapacityLiters: 38_500_000,
    gasTypes: ['Natural Gas (Compressed)', 'Methane'],
    detailedAddress: 'Taweelah Receiving Terminal, Abu Dhabi',
    city: 'Abu Dhabi', area: 'Taweelah',
    coordinates: { lat: 24.7943, lng: 54.7124 },
    safetyMeasures: 'Pig launcher containment, gas-leak detection along the manifold, automatic isolation valves at 100 m intervals.',
    inspectionAuthority: 'Bureau Veritas',
    dateOfInspection: '2025-11-04',
    ownership: 'owned', owner: person('Amna Al Marri', '784-1983-6677889-5', '5106'),
    operatedBy: 'self', operator: person('Amna Al Marri', '784-1983-6677889-5', '5106'),
    storageMethods: [
      { id: 's1', name: 'Main Pipeline Header', areaSqM: 1_200, capacityLiters: 38_500_000, type: 'pipeline', productsStored: ['Natural Gas (Compressed)', 'Methane'] },
    ],
    createdAt: '2024-02-08T06:00:00Z', updatedAt: '2025-11-05T11:00:00Z',
  },
  {
    id: sn(),
    permitHolderId: 'PH-005', permitHolderName: 'ENOC / Emarat',
    facilityName: 'Al Falah Fleet Refuelling Yard',
    source: 'petroleum_permit',
    totalCapacityLiters: 240_000,
    gasTypes: ['LPG (Mixed) / Liquefied Gases'],
    detailedAddress: 'Sector 9, Al Falah, Abu Dhabi',
    city: 'Abu Dhabi', area: 'Al Falah',
    coordinates: { lat: 24.4523, lng: 54.7128 },
    safetyMeasures: 'Cylinder rack ventilation, manual fire extinguisher stations, perimeter lighting.',
    inspectionAuthority: 'Intertek',
    dateOfInspection: '2025-05-19',
    ownership: 'rented', owner: person('Faisal Al Shamsi', '784-1985-7788990-6', '5107'),
    operatedBy: 'others', operator: person('Mohammed Al Mansoori', '784-1987-8899001-7', '5108'),
    storageMethods: [
      { id: 's1', name: 'Cylinder Cage A', areaSqM: 95, capacityLiters: 120_000, type: 'cylinder', productsStored: ['LPG (Mixed) / Liquefied Gases'] },
      { id: 's2', name: 'Cylinder Cage B', areaSqM: 95, capacityLiters: 120_000, type: 'cylinder', productsStored: ['LPG (Mixed) / Liquefied Gases'] },
    ],
    createdAt: '2025-01-19T14:15:00Z', updatedAt: '2025-05-20T09:00:00Z',
  },
  {
    id: sn(),
    permitHolderId: 'PH-002', permitHolderName: 'Emirates Gas LLC',
    facilityName: 'Al Mafraq Cylinder Plant',
    source: 'manual',
    totalCapacityLiters: 510_000,
    gasTypes: ['LPG (Mixed) / Liquefied Gases', 'Butane (Liquefied) / Liquefied Gases'],
    detailedAddress: 'Al Mafraq Industrial Area, Abu Dhabi',
    city: 'Abu Dhabi', area: 'Al Mafraq',
    coordinates: { lat: 24.3204, lng: 54.7895 },
    safetyMeasures: 'Foam-water dual agent, cathodic protection on bulk tank, gas detection on filling lines.',
    inspectionAuthority: 'TÜV SÜD Middle East',
    dateOfInspection: '2025-09-08',
    ownership: 'owned', owner: person('Maha Al Falasi', '784-1991-9900112-8', '5109'),
    operatedBy: 'self', operator: person('Maha Al Falasi', '784-1991-9900112-8', '5109'),
    storageMethods: [
      { id: 's1', name: 'Bulk Tank B-1', areaSqM: 150, capacityLiters: 360_000, type: 'tank', productsStored: ['LPG (Mixed) / Liquefied Gases'] },
      { id: 's2', name: 'Cylinder Rack', areaSqM: 80,  capacityLiters: 150_000, type: 'cylinder', productsStored: ['Butane (Liquefied) / Liquefied Gases'] },
    ],
    createdAt: '2025-03-22T10:00:00Z', updatedAt: '2025-09-09T08:10:00Z',
  },
  {
    id: sn(),
    permitHolderId: 'PH-006', permitHolderName: 'Petroleum Development Company',
    facilityName: 'Al Abyad Island Storage Compound',
    source: 'petroleum_permit',
    totalCapacityLiters: 95_000,
    gasTypes: ['Propane (Liquefied) / Liquefied Gases'],
    detailedAddress: 'Abu Al Abyad Island, Al Dhafra Region',
    city: 'Al Dhafra', area: 'Abu Al Abyad',
    coordinates: { lat: 24.2221, lng: 53.7922 },
    safetyMeasures: 'Foam tender on standby, perimeter fence, twice-yearly internal audit.',
    inspectionAuthority: 'SGS Gulf',
    dateOfInspection: '2025-03-31',
    ownership: 'owned', owner: person('Salem Al Hammadi', '784-1982-1122334-9', '5110'),
    operatedBy: 'self', operator: person('Salem Al Hammadi', '784-1982-1122334-9', '5110'),
    storageMethods: [
      { id: 's1', name: 'Bulk Tank A', areaSqM: 70, capacityLiters: 95_000, type: 'tank', productsStored: ['Propane (Liquefied) / Liquefied Gases'] },
    ],
    createdAt: '2024-10-08T07:30:00Z', updatedAt: '2025-04-01T13:25:00Z',
  },
  {
    id: sn(),
    permitHolderId: 'PH-007', permitHolderName: 'Al Yasat Petroleum',
    facilityName: 'Ruwais Industrial Depot',
    source: 'asateel',
    totalCapacityLiters: 6_200_000,
    gasTypes: ['Natural Gas (Compressed)', 'Industrial Nitrogen', 'Carbon Dioxide'],
    detailedAddress: 'Ruwais Industrial City, Al Dhafra',
    city: 'Al Dhafra', area: 'Ruwais',
    coordinates: { lat: 24.0958, lng: 52.7351 },
    safetyMeasures: 'High-rate foam, automatic isolation, redundant nitrogen blanket on inert gas tanks, hot-work permit zoning.',
    inspectionAuthority: 'DoE Internal Inspectorate',
    dateOfInspection: '2026-03-04',
    ownership: 'owned', owner: person('Nasser Al Suwaidi', '784-1979-2233445-3', '5111'),
    operatedBy: 'self', operator: person('Nasser Al Suwaidi', '784-1979-2233445-3', '5111'),
    storageMethods: [
      { id: 's1', name: 'Nitrogen Bullet 1', areaSqM: 90, capacityLiters: 2_500_000, type: 'tank',     productsStored: ['Industrial Nitrogen'] },
      { id: 's2', name: 'CO₂ Bullet',        areaSqM: 90, capacityLiters: 1_800_000, type: 'tank',     productsStored: ['Carbon Dioxide'] },
      { id: 's3', name: 'CNG Manifold',      areaSqM: 200, capacityLiters: 1_900_000, type: 'pipeline', productsStored: ['Natural Gas (Compressed)'] },
    ],
    createdAt: '2024-04-20T08:00:00Z', updatedAt: '2026-03-05T09:30:00Z',
  },
  {
    id: sn(),
    permitHolderId: 'PH-001', permitHolderName: 'ADNOC Distribution',
    facilityName: 'Madinat Zayed Service Station — Bulk Yard',
    source: 'petroleum_permit',
    totalCapacityLiters: 75_000,
    gasTypes: ['LPG (Mixed) / Liquefied Gases'],
    detailedAddress: 'Highway E-11, Madinat Zayed, Al Dhafra',
    city: 'Al Dhafra', area: 'Madinat Zayed',
    coordinates: { lat: 23.6492, lng: 53.7060 },
    safetyMeasures: 'Tank earthing, foam extinguisher cabinets at 30 m, hot-work isolation.',
    inspectionAuthority: 'Intertek',
    dateOfInspection: '2025-07-12',
    ownership: 'owned', owner: person('Omar Al Mansoori', '784-1987-3344556-4', '5112'),
    operatedBy: 'self', operator: person('Omar Al Mansoori', '784-1987-3344556-4', '5112'),
    storageMethods: [
      { id: 's1', name: 'LPG Bulk Tank', areaSqM: 60, capacityLiters: 75_000, type: 'tank', productsStored: ['LPG (Mixed) / Liquefied Gases'] },
    ],
    createdAt: '2025-01-04T07:45:00Z', updatedAt: '2025-07-13T10:15:00Z',
  },
  {
    id: sn(),
    permitHolderId: 'PH-005', permitHolderName: 'ENOC / Emarat',
    facilityName: 'Yas South Filling Depot',
    source: 'manual',
    totalCapacityLiters: 180_000,
    gasTypes: ['LPG (Mixed) / Liquefied Gases'],
    detailedAddress: 'Yas Island South Logistics Zone, Abu Dhabi',
    city: 'Abu Dhabi', area: 'Yas Island',
    coordinates: { lat: 24.4769, lng: 54.6058 },
    safetyMeasures: 'Cylinder racks under ventilated canopy, ESD pull-stations every 25 m.',
    inspectionAuthority: 'Bureau Veritas',
    dateOfInspection: '2026-04-02',
    ownership: 'rented', owner: person('Yousef Al Qasimi', '784-1989-5566778-2', '5113'),
    operatedBy: 'others', operator: person('Tariq Al Ali', '784-1991-6677889-1', '5114'),
    storageMethods: [
      { id: 's1', name: 'Cylinder Cage North', areaSqM: 110, capacityLiters: 90_000, type: 'cylinder', productsStored: ['LPG (Mixed) / Liquefied Gases'] },
      { id: 's2', name: 'Cylinder Cage South', areaSqM: 110, capacityLiters: 90_000, type: 'cylinder', productsStored: ['LPG (Mixed) / Liquefied Gases'] },
    ],
    createdAt: '2025-09-30T08:00:00Z', updatedAt: '2026-04-03T14:20:00Z',
  },
  {
    id: sn(),
    permitHolderId: 'PH-003', permitHolderName: 'ADNOC LNG',
    facilityName: 'Habshan CNG Hub',
    source: 'asateel',
    totalCapacityLiters: 12_400_000,
    gasTypes: ['Natural Gas (Compressed)', 'Methane', 'Ethane'],
    detailedAddress: 'Habshan Gas Plant Cluster, Al Dhafra',
    city: 'Al Dhafra', area: 'Habshan',
    coordinates: { lat: 23.7468, lng: 53.6112 },
    safetyMeasures: 'Continuous flammability monitoring, multi-stage compression skids isolated, full F&G coverage.',
    inspectionAuthority: 'Lloyd’s Register',
    dateOfInspection: '2025-10-29',
    ownership: 'owned', owner: person('Ahmed Al Marzouqi', '784-1980-7788990-2', '5115'),
    operatedBy: 'self', operator: person('Ahmed Al Marzouqi', '784-1980-7788990-2', '5115'),
    storageMethods: [
      { id: 's1', name: 'Compression Skid A', areaSqM: 300, capacityLiters: 6_200_000, type: 'pipeline', productsStored: ['Natural Gas (Compressed)'] },
      { id: 's2', name: 'Compression Skid B', areaSqM: 300, capacityLiters: 6_200_000, type: 'pipeline', productsStored: ['Methane', 'Ethane'] },
    ],
    createdAt: '2024-08-15T07:30:00Z', updatedAt: '2025-10-30T11:00:00Z',
  },
  // Split-stakeholder record — rented from a private landlord and operated by
  // a separately-contracted operating company. Useful for exercising the
  // owner/operator side-by-side rendering on the detail page.
  {
    id: sn(),
    permitHolderId: 'PH-005', permitHolderName: 'ENOC / Emarat',
    facilityName: 'Khalifa City Service Yard',
    source: 'manual',
    totalCapacityLiters: 220_000,
    gasTypes: ['LPG (Mixed) / Liquefied Gases', 'Propane (Liquefied) / Liquefied Gases'],
    detailedAddress: 'Plot 18, Khalifa City A — Sector 17, Abu Dhabi',
    city: 'Abu Dhabi', area: 'Khalifa City',
    coordinates: { lat: 24.4128, lng: 54.5784 },
    safetyMeasures: 'Foam-water cabinets at 25 m intervals, automatic gas leak detection, perimeter ATEX rating, weekly hot-work permit audit, 24/7 manned gatehouse.',
    inspectionAuthority: 'SGS Gulf',
    dateOfInspection: '2026-01-08',
    ownership: 'rented',
    owner:    person('Hamad Al Suwaidi',     '784-1972-3344556-7', '5116'), // private landowner
    operatedBy: 'others',
    operator: person('Mariam Al Zaabi',      '784-1990-8899001-3', '5117'), // contracted operator
    storageMethods: [
      { id: 's1', name: 'Bulk Tank A',       areaSqM: 90,  capacityLiters: 140_000, type: 'tank',     productsStored: ['LPG (Mixed) / Liquefied Gases'] },
      { id: 's2', name: 'Cylinder Bank',     areaSqM: 60,  capacityLiters:  80_000, type: 'cylinder', productsStored: ['Propane (Liquefied) / Liquefied Gases'] },
    ],
    createdAt: '2025-06-11T08:30:00Z', updatedAt: '2026-01-09T10:20:00Z',
  },
];

// ============================================================
// Access helpers — small wrappers so the rest of the app stays
// loosely coupled to the storage shape.
// ============================================================
export function listAssets(): GasAsset[] {
  return SEED_ASSETS;
}
export function getAsset(id: string): GasAsset | undefined {
  return SEED_ASSETS.find((a) => a.id === id);
}

export function sourceLabel(s: AssetSource): string {
  return s === 'asateel' ? 'Asateel' : s === 'petroleum_permit' ? 'Petroleum Permit' : 'Manual entry';
}
export function storageTypeLabel(t: StorageType): string {
  return STORAGE_TYPES.find((x) => x.id === t)?.label ?? t;
}

// Convenience: pretty-print very large capacities (some tanks reach 280 Ml).
export function formatLiters(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toLocaleString(undefined, { maximumFractionDigits: 2 })} ML`;
  if (n >= 1_000)     return `${(n / 1_000).toLocaleString(undefined, { maximumFractionDigits: 1 })} kL`;
  return `${n.toLocaleString()} L`;
}
