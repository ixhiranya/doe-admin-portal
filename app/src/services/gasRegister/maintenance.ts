// =============================================================================
// Gas Register · Maintenance & Operational Records — BN 15 of the Gas SDD.
// -----------------------------------------------------------------------------
// Activity log per facility: system modifications, material changes, calibration
// of gas detectors and sensors, plus preventive and corrective maintenance.
// =============================================================================

import { listAssets, PERMIT_HOLDERS } from './assets';
import { listEngineers } from './engineers';
import { listDrivers } from './drivers';

export type MaintenanceActivityType =
  | 'System Modification'
  | 'Material Change'
  | 'Gas Detector Calibration'
  | 'Sensor Calibration'
  | 'Preventive Maintenance'
  | 'Corrective Maintenance'
  | 'Other';

export type CalibrationResult = 'Pass' | 'Pass with Notes' | 'Fail' | 'N/A';

export interface MaintenanceRecord {
  id: string;
  facilityId: string;
  facilityName: string;
  permitHolderId: string;
  permitHolderName: string;
  activityType: MaintenanceActivityType;
  activityDate: string;                 // ISO date
  performedById: string;                // engineer / driver / employee id
  performedByName: string;
  performedByRole: 'Engineer' | 'Driver' | 'Technician' | 'Supervisor';
  description: string;
  calibrationResult?: CalibrationResult;
  nextDueDate?: string;                 // for calibration activities
  linkedAssetId?: string;
  linkedAssetName?: string;
  supportingDocument?: { fileName: string; uploadedAt: string };
  createdAt: string;
  updatedAt: string;
}

let counter = 3300;
const sn = () => 'MR_' + (++counter);

const today = new Date();
function daysAgo(n: number): string {
  const d = new Date(today); d.setDate(today.getDate() - n);
  return d.toISOString().slice(0, 10);
}
function daysAhead(n: number): string {
  const d = new Date(today); d.setDate(today.getDate() + n);
  return d.toISOString().slice(0, 10);
}

const TYPES: MaintenanceActivityType[] = [
  'Gas Detector Calibration', 'Sensor Calibration', 'Preventive Maintenance',
  'Corrective Maintenance', 'System Modification', 'Material Change',
];

function seedRecords(): MaintenanceRecord[] {
  const assets = listAssets();
  const engineers = listEngineers();
  const drivers = listDrivers();
  if (assets.length === 0) return [];
  const rows: MaintenanceRecord[] = [];

  for (let i = 0; i < 18; i++) {
    const asset = assets[i % assets.length];
    const ph = PERMIT_HOLDERS.find((p) => p.id === asset.permitHolderId) ?? PERMIT_HOLDERS[0];
    const activity = TYPES[i % TYPES.length];
    const isCalibration = activity === 'Gas Detector Calibration' || activity === 'Sensor Calibration';
    const performedAs = isCalibration ? engineers[i % engineers.length] : drivers[i % drivers.length];
    const isEng = isCalibration || i % 3 === 0;
    const date = daysAgo(2 + i * 9);

    rows.push({
      id: sn(),
      facilityId: asset.id, facilityName: asset.facilityName,
      permitHolderId: ph.id, permitHolderName: ph.name,
      activityType: activity,
      activityDate: date,
      performedById: isEng ? engineers[i % engineers.length].id : drivers[i % drivers.length].id,
      performedByName: isEng ? engineers[i % engineers.length].name : drivers[i % drivers.length].driverName,
      performedByRole: isEng ? 'Engineer' : i % 2 === 0 ? 'Technician' : 'Driver',
      description: descriptionFor(activity, asset.facilityName),
      calibrationResult: isCalibration ? (i % 5 === 0 ? 'Pass with Notes' : i % 7 === 0 ? 'Fail' : 'Pass') : undefined,
      nextDueDate: isCalibration ? daysAhead(180 - (i * 3)) : undefined,
      linkedAssetId: asset.id, linkedAssetName: asset.facilityName,
      supportingDocument: { fileName: `${activity.toLowerCase().replace(/\s+/g, '-')}-${i + 1}.pdf`, uploadedAt: new Date().toISOString() },
      createdAt: date + 'T08:00:00Z', updatedAt: date + 'T09:00:00Z',
    });
    void performedAs;
  }
  rows.sort((a, b) => b.activityDate.localeCompare(a.activityDate));
  return rows;
}

function descriptionFor(t: MaintenanceActivityType, facility: string): string {
  switch (t) {
    case 'Gas Detector Calibration': return `Quarterly calibration of fixed gas detectors at ${facility}. Reference: ISA-12.13 spec.`;
    case 'Sensor Calibration':       return `Pressure & temperature sensor calibration at ${facility}. Field reading validated against bench reference.`;
    case 'Preventive Maintenance':   return `Routine PM on storage manifold valves at ${facility}. Torque check + seal inspection.`;
    case 'Corrective Maintenance':   return `Corrective replacement of damaged solenoid valve at ${facility}.`;
    case 'System Modification':      return `Approved modification to bulk piping layout at ${facility}. As-built drawings updated.`;
    case 'Material Change':          return `Material change — gasket compound updated to NBR-90 across the manifold at ${facility}.`;
    default:                          return `${t} at ${facility}.`;
  }
}

export const SEED_MAINTENANCE: MaintenanceRecord[] = seedRecords();
export function listMaintenance(): MaintenanceRecord[] { return SEED_MAINTENANCE; }
export function getMaintenance(id: string): MaintenanceRecord | undefined { return SEED_MAINTENANCE.find((r) => r.id === id); }
export function maintenanceForFacility(facilityId: string): MaintenanceRecord[] {
  return SEED_MAINTENANCE.filter((r) => r.facilityId === facilityId);
}
