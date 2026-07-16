// =============================================================================
// Gas Register · Drivers Master — BN 6 of the Gas Register SDD.
// -----------------------------------------------------------------------------
// Per SDD §3.6: every record is fetched from ASATEEL (drivers) + ADCDA (training
// status). Manual addition is NOT permitted.
// =============================================================================

import { PERMIT_HOLDERS } from './assets';

export type DriverLicenseType = 'Light' | 'Heavy' | 'Hazardous Materials' | 'Multi-Class';
export type DriverTrainingStatus = 'Valid' | 'Expired' | 'Not Available';

export interface GasDriver {
  id: string;
  permitHolderId: string;
  permitHolderName: string;
  source: 'asateel';
  driverName: string;
  idNumber: string;                // Emirates ID
  nationality: string;
  licenseType: DriverLicenseType;
  licenseNumber: string;
  licenseExpiryDate: string;
  adcdaTrainingStatus: DriverTrainingStatus;
  certificateExpiryDate: string;
  linkedVehicles: string[];        // plate numbers
  mobile: string;
  email?: string;
  // Computed (read-only)
  // Compliant when both licence and ADCDA training are valid and not expired
}

export function driverCompliance(d: GasDriver): 'Compliant' | 'Non-Compliant' {
  const today = new Date().toISOString().slice(0, 10);
  const licValid = d.licenseExpiryDate >= today;
  const trainValid = d.adcdaTrainingStatus === 'Valid' && d.certificateExpiryDate >= today;
  return licValid && trainValid ? 'Compliant' : 'Non-Compliant';
}

let counter = 7100;
const sn = () => 'DRV_' + (++counter);

const NAMES = [
  'Mohammed Saif Al Mansoori', 'Ali Hassan Al Hammadi', 'Ahmed Rashid Al Suwaidi',
  'Khalid Saeed Al Falasi', 'Yousef Mubarak Al Otaibi', 'Sultan Faisal Al Mazrouei',
  'Rashid Khalifa Al Marri', 'Omar Hamdan Al Shamsi', 'Saif Saeed Al Dhaheri',
  'Ibrahim Khalfan Al Kaabi',
];

function eid(i: number): string {
  return `784-19${70 + (i % 30)}-${(1234567 + i).toString().padStart(7, '0')}-${(i % 9)}`;
}

const today = new Date();
function addYears(y: number): string {
  const d = new Date(today); d.setFullYear(today.getFullYear() + y);
  return d.toISOString().slice(0, 10);
}
function addDays(n: number): string {
  const d = new Date(today); d.setDate(today.getDate() + n);
  return d.toISOString().slice(0, 10);
}

export const SEED_DRIVERS: GasDriver[] = NAMES.map((name, i) => ({
  id: sn(),
  permitHolderId: PERMIT_HOLDERS[i % PERMIT_HOLDERS.length].id,
  permitHolderName: PERMIT_HOLDERS[i % PERMIT_HOLDERS.length].name,
  source: 'asateel',
  driverName: name,
  idNumber: eid(i),
  nationality: ['United Arab Emirates', 'Pakistan', 'India', 'Bangladesh', 'Egypt'][i % 5],
  licenseType: (['Light', 'Heavy', 'Hazardous Materials', 'Multi-Class'] as DriverLicenseType[])[i % 4],
  licenseNumber: `DL-${(2400000 + i * 13).toString().padStart(7, '0')}`,
  // Mix of valid/expiring/expired
  licenseExpiryDate: i === 2 ? addDays(-30) : i === 5 ? addDays(45) : addYears(2 + (i % 3)),
  adcdaTrainingStatus: i === 4 ? 'Expired' : i === 7 ? 'Not Available' : 'Valid',
  certificateExpiryDate: i === 4 ? addDays(-90) : i === 8 ? addDays(20) : addYears(1 + (i % 2)),
  linkedVehicles: [`UAE-${(20100 + i * 17).toString().slice(-5)}`, ...(i % 3 === 0 ? [`UAE-${(20100 + i * 31).toString().slice(-5)}`] : [])],
  mobile: `+971 50 ${(7000000 + i * 7777).toString().padStart(7, '0')}`,
  email: `driver${i + 1}@asateel.ae`,
}));

export function listDrivers(): GasDriver[] { return SEED_DRIVERS; }
export function getDriver(id: string): GasDriver | undefined { return SEED_DRIVERS.find((d) => d.id === id); }
