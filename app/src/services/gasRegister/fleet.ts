// =============================================================================
// Gas Register · Fleet Master
// -----------------------------------------------------------------------------
// Vehicles registered against a permit holder for gas transportation. Common
// types: bulk LPG tankers, cylinder carrier trucks, CNG / LNG transporters,
// inspection & service vans.
// =============================================================================

import { PERMIT_HOLDERS, type AssetSource, sourceLabel } from './assets';

export type { AssetSource } from './assets';
export { PERMIT_HOLDERS, sourceLabel } from './assets';

export interface FleetAttachment {
  name: string;              // e.g. "Civil Defence Certificate"
  fileName?: string;         // empty when no file is uploaded yet
  uploadedAt?: string;
}

export interface GasFleet {
  id: string;                          // FL_xxx
  permitHolderId: string;
  permitHolderName: string;
  source: AssetSource;
  plateNumber: string;
  trafficId: string;
  typeOfVehicle: string;
  unitType: string;
  civilDefenceCertificateNumber: string;
  dateOfInspection: string;
  vehicleDesignationCapacityLiters: number;
  attachments: FleetAttachment[];
  createdAt: string;
  updatedAt: string;
}

export const VEHICLE_TYPES = [
  'GAS CYLINDER CARRIER TRUCK',
  'LPG BULK TANKER',
  'CNG TRANSPORTER',
  'LNG CRYOGENIC TANKER',
  'METHANE TRANSPORTER',
  'HAZMAT SERVICE VAN',
  'INSPECTION VEHICLE',
] as const;

export const UNIT_TYPES = [
  '6-wheel rigid',
  '10-wheel rigid',
  'Articulated 18T',
  'Articulated 30T',
  'Tractor + tanker',
  'Light commercial',
] as const;

// ============================================================
// Seed dataset
// ============================================================
let counter = 460;
const sn = () => 'FL_' + (++counter);

export const SEED_FLEET: GasFleet[] = [
  {
    id: sn(),
    permitHolderId: 'PH-006', permitHolderName: 'Petroleum Development Company',
    source: 'asateel',
    plateNumber: '19107', trafficId: '1980333829',
    typeOfVehicle: 'GAS CYLINDER CARRIER TRUCK',
    unitType: '10-wheel rigid',
    civilDefenceCertificateNumber: 'CDC-99231',
    dateOfInspection: '2025-01-10',
    vehicleDesignationCapacityLiters: 0,
    attachments: [
      { name: 'Civil Defence Certificate' },
      { name: 'Inspection Report' },
    ],
    createdAt: '2024-08-14T08:00:00Z', updatedAt: '2025-01-11T09:00:00Z',
  },
  {
    id: sn(),
    permitHolderId: 'PH-006', permitHolderName: 'Petroleum Development Company',
    source: 'asateel',
    plateNumber: '25762', trafficId: '1980333829',
    typeOfVehicle: 'GAS CYLINDER CARRIER TRUCK',
    unitType: '6-wheel rigid',
    civilDefenceCertificateNumber: 'CDC-99232',
    dateOfInspection: '2024-05-14',
    vehicleDesignationCapacityLiters: 0,
    attachments: [
      { name: 'Civil Defence Certificate', fileName: 'cdc-25762.pdf', uploadedAt: '2024-05-15T08:00:00Z' },
      { name: 'Inspection Report',          fileName: 'insp-25762.pdf', uploadedAt: '2024-05-15T08:00:00Z' },
    ],
    createdAt: '2023-09-04T08:00:00Z', updatedAt: '2024-05-15T08:00:00Z',
  },
  {
    id: sn(),
    permitHolderId: 'PH-006', permitHolderName: 'Petroleum Development Company',
    source: 'asateel',
    plateNumber: '19107', trafficId: '1980333829',
    typeOfVehicle: 'LPG BULK TANKER',
    unitType: 'Articulated 30T',
    civilDefenceCertificateNumber: 'CDC-99233',
    dateOfInspection: '2024-05-07',
    vehicleDesignationCapacityLiters: 28_000,
    attachments: [
      { name: 'Civil Defence Certificate', fileName: 'cdc-bulk-1.pdf', uploadedAt: '2024-05-08T08:00:00Z' },
      { name: 'Inspection Report',          fileName: 'insp-bulk-1.pdf', uploadedAt: '2024-05-08T08:00:00Z' },
    ],
    createdAt: '2023-04-10T08:00:00Z', updatedAt: '2024-05-08T08:00:00Z',
  },
  {
    id: sn(),
    permitHolderId: 'PH-001', permitHolderName: 'ADNOC Distribution',
    source: 'asateel',
    plateNumber: 'AD-87421', trafficId: '2014998771',
    typeOfVehicle: 'LPG BULK TANKER',
    unitType: 'Articulated 30T',
    civilDefenceCertificateNumber: 'CDC-77001',
    dateOfInspection: '2025-12-04',
    vehicleDesignationCapacityLiters: 32_000,
    attachments: [
      { name: 'Civil Defence Certificate', fileName: 'cdc-ad87421.pdf', uploadedAt: '2025-12-05T08:00:00Z' },
      { name: 'Inspection Report',          fileName: 'insp-ad87421.pdf', uploadedAt: '2025-12-05T08:00:00Z' },
    ],
    createdAt: '2023-02-18T08:00:00Z', updatedAt: '2025-12-05T08:00:00Z',
  },
  {
    id: sn(),
    permitHolderId: 'PH-001', permitHolderName: 'ADNOC Distribution',
    source: 'petroleum_permit',
    plateNumber: 'AD-92110', trafficId: '2015100432',
    typeOfVehicle: 'GAS CYLINDER CARRIER TRUCK',
    unitType: '10-wheel rigid',
    civilDefenceCertificateNumber: 'CDC-77018',
    dateOfInspection: '2026-02-22',
    vehicleDesignationCapacityLiters: 0,
    attachments: [
      { name: 'Civil Defence Certificate', fileName: 'cdc-92110.pdf', uploadedAt: '2026-02-23T08:00:00Z' },
      { name: 'Inspection Report' },
    ],
    createdAt: '2024-07-30T08:00:00Z', updatedAt: '2026-02-23T08:00:00Z',
  },
  {
    id: sn(),
    permitHolderId: 'PH-002', permitHolderName: 'Emirates Gas LLC',
    source: 'asateel',
    plateNumber: 'EG-44231', trafficId: '2017220943',
    typeOfVehicle: 'GAS CYLINDER CARRIER TRUCK',
    unitType: '6-wheel rigid',
    civilDefenceCertificateNumber: 'CDC-55104',
    dateOfInspection: '2025-08-19',
    vehicleDesignationCapacityLiters: 0,
    attachments: [
      { name: 'Civil Defence Certificate', fileName: 'cdc-eg44231.pdf', uploadedAt: '2025-08-20T08:00:00Z' },
      { name: 'Inspection Report',          fileName: 'insp-eg44231.pdf', uploadedAt: '2025-08-20T08:00:00Z' },
    ],
    createdAt: '2022-11-12T08:00:00Z', updatedAt: '2025-08-20T08:00:00Z',
  },
  {
    id: sn(),
    permitHolderId: 'PH-003', permitHolderName: 'ADNOC LNG',
    source: 'asateel',
    plateNumber: 'LNG-104', trafficId: '2090414421',
    typeOfVehicle: 'LNG CRYOGENIC TANKER',
    unitType: 'Articulated 30T',
    civilDefenceCertificateNumber: 'CDC-88001',
    dateOfInspection: '2026-03-04',
    vehicleDesignationCapacityLiters: 42_000,
    attachments: [
      { name: 'Civil Defence Certificate', fileName: 'cdc-lng104.pdf', uploadedAt: '2026-03-05T08:00:00Z' },
      { name: 'Inspection Report',          fileName: 'insp-lng104.pdf', uploadedAt: '2026-03-05T08:00:00Z' },
    ],
    createdAt: '2023-01-22T08:00:00Z', updatedAt: '2026-03-05T08:00:00Z',
  },
  {
    id: sn(),
    permitHolderId: 'PH-004', permitHolderName: 'Dolphin Energy',
    source: 'asateel',
    plateNumber: 'DE-2210', trafficId: '2088332119',
    typeOfVehicle: 'CNG TRANSPORTER',
    unitType: 'Tractor + tanker',
    civilDefenceCertificateNumber: 'CDC-90021',
    dateOfInspection: '2025-11-19',
    vehicleDesignationCapacityLiters: 8_500,
    attachments: [
      { name: 'Civil Defence Certificate', fileName: 'cdc-de2210.pdf', uploadedAt: '2025-11-20T08:00:00Z' },
      { name: 'Inspection Report',          fileName: 'insp-de2210.pdf', uploadedAt: '2025-11-20T08:00:00Z' },
    ],
    createdAt: '2024-06-04T08:00:00Z', updatedAt: '2025-11-20T08:00:00Z',
  },
  {
    id: sn(),
    permitHolderId: 'PH-005', permitHolderName: 'ENOC / Emarat',
    source: 'manual',
    plateNumber: 'EE-7714', trafficId: '2100002214',
    typeOfVehicle: 'HAZMAT SERVICE VAN',
    unitType: 'Light commercial',
    civilDefenceCertificateNumber: 'CDC-66012',
    dateOfInspection: '2026-04-02',
    vehicleDesignationCapacityLiters: 0,
    attachments: [
      { name: 'Civil Defence Certificate' },
      { name: 'Inspection Report' },
    ],
    createdAt: '2025-09-15T08:00:00Z', updatedAt: '2026-04-03T08:00:00Z',
  },
  {
    id: sn(),
    permitHolderId: 'PH-007', permitHolderName: 'Al Yasat Petroleum',
    source: 'petroleum_permit',
    plateNumber: 'AYP-5510', trafficId: '2200441110',
    typeOfVehicle: 'INSPECTION VEHICLE',
    unitType: 'Light commercial',
    civilDefenceCertificateNumber: 'CDC-33021',
    dateOfInspection: '2026-01-18',
    vehicleDesignationCapacityLiters: 0,
    attachments: [
      { name: 'Civil Defence Certificate', fileName: 'cdc-ayp5510.pdf', uploadedAt: '2026-01-19T08:00:00Z' },
      { name: 'Inspection Report' },
    ],
    createdAt: '2025-02-04T08:00:00Z', updatedAt: '2026-01-19T08:00:00Z',
  },
  {
    id: sn(),
    permitHolderId: 'PH-001', permitHolderName: 'ADNOC Distribution',
    source: 'asateel',
    plateNumber: 'AD-12245', trafficId: '2087441221',
    typeOfVehicle: 'METHANE TRANSPORTER',
    unitType: 'Articulated 18T',
    civilDefenceCertificateNumber: 'CDC-77042',
    dateOfInspection: '2024-09-12',
    vehicleDesignationCapacityLiters: 18_400,
    attachments: [
      { name: 'Civil Defence Certificate', fileName: 'cdc-ad12245.pdf', uploadedAt: '2024-09-13T08:00:00Z' },
      { name: 'Inspection Report',          fileName: 'insp-ad12245.pdf', uploadedAt: '2024-09-13T08:00:00Z' },
    ],
    createdAt: '2022-06-15T08:00:00Z', updatedAt: '2024-09-13T08:00:00Z',
  },
];

export function listFleet(): GasFleet[] { return SEED_FLEET; }
export function getFleet(id: string): GasFleet | undefined { return SEED_FLEET.find((f) => f.id === id); }

export function formatLiters(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toLocaleString(undefined, { maximumFractionDigits: 2 })} ML`;
  if (n >= 1_000)     return `${(n / 1_000).toLocaleString(undefined, { maximumFractionDigits: 1 })} kL`;
  return `${n.toLocaleString()} L`;
}
