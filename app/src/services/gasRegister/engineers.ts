// =============================================================================
// Gas Register · Engineers Master — BN 7 of the Gas Register SDD.
// -----------------------------------------------------------------------------
// Per SDD §3.7: fetched from ASATEEL where available + from the DOE Engineer
// Registration module otherwise. Manual addition is not permitted.
// =============================================================================

import { PERMIT_HOLDERS } from './assets';

export type EngineerSource = 'asateel' | 'doe_engineer_registration';
export type EngineerProfession = 'Mechanical' | 'Civil' | 'Chemical' | 'Electrical' | 'Petroleum' | 'Other';
export type AdqccStatus = 'Valid' | 'Expired' | 'Not Available';

export interface GasEngineer {
  id: string;
  permitHolderId: string;
  permitHolderName: string;
  source: EngineerSource;
  name: string;
  idNumber: string;                 // Emirates ID
  profession: EngineerProfession;
  qualification: string;
  adqccStatus: AdqccStatus;
  certificateExpiryDate: string;
  govEntityConformity: 'ADCDA' | 'DOE' | 'ADCDA + DOE' | 'Not Verified';
  linkedFacilities: string[];       // asset / facility names
  email?: string;
  mobile?: string;
}

export function engineerCompliance(e: GasEngineer): 'Compliant' | 'Non-Compliant' {
  const today = new Date().toISOString().slice(0, 10);
  return e.adqccStatus === 'Valid' && e.certificateExpiryDate >= today ? 'Compliant' : 'Non-Compliant';
}

let counter = 5200;
const sn = () => 'ENG_' + (++counter);

const NAMES = [
  'Dr. Faisal Al Shamsi',     'Eng. Reem Al Dhaheri',    'Eng. Saeed Al Marri',
  'Eng. Mariam Al Hashemi',   'Eng. Khalifa Al Nuaimi',  'Eng. Hessa Al Mazrouei',
  'Eng. Yousef Al Hashemi',   'Eng. Sara Al Mansouri',   'Eng. Noura Al Otaiba',
  'Eng. Khalid Al Suwaidi',   'Eng. Layla Al Hammadi',   'Eng. Tarek Bin Hamad',
];

function eid(i: number): string {
  return `784-19${70 + (i % 25)}-${(2010000 + i * 31).toString().padStart(7, '0')}-${(i % 9)}`;
}

const today = new Date();
function addDays(n: number): string {
  const d = new Date(today); d.setDate(today.getDate() + n);
  return d.toISOString().slice(0, 10);
}
function addYears(y: number): string {
  const d = new Date(today); d.setFullYear(today.getFullYear() + y);
  return d.toISOString().slice(0, 10);
}

const PROFESSIONS: EngineerProfession[] = ['Mechanical', 'Civil', 'Chemical', 'Electrical', 'Petroleum'];
const QUALIFICATIONS = ['Bachelor’s', 'Master’s', 'PhD', 'Diploma', 'Post University'];

export const SEED_ENGINEERS: GasEngineer[] = NAMES.map((name, i) => {
  const adqcc: AdqccStatus = i === 3 ? 'Expired' : i === 9 ? 'Not Available' : 'Valid';
  return {
    id: sn(),
    permitHolderId: PERMIT_HOLDERS[i % PERMIT_HOLDERS.length].id,
    permitHolderName: PERMIT_HOLDERS[i % PERMIT_HOLDERS.length].name,
    source: (i % 4 === 0 ? 'doe_engineer_registration' : 'asateel') as EngineerSource,
    name,
    idNumber: eid(i),
    profession: PROFESSIONS[i % PROFESSIONS.length],
    qualification: QUALIFICATIONS[i % QUALIFICATIONS.length],
    adqccStatus: adqcc,
    certificateExpiryDate: adqcc === 'Expired' ? addDays(-120) : adqcc === 'Not Available' ? '' : addYears(2 + (i % 3)),
    govEntityConformity: i % 4 === 0 ? 'ADCDA + DOE' : i % 4 === 1 ? 'ADCDA' : i % 4 === 2 ? 'DOE' : 'Not Verified',
    linkedFacilities: i % 2 === 0 ? ['Mussafah Bulk Storage Terminal'] : ['Ruwais Catering Block', 'Saadiyat Cove Private Villa'],
    email: `engineer${i + 1}@${i % 4 === 0 ? 'doe.gov.ae' : 'asateel.ae'}`,
    mobile: `+971 50 ${(5500000 + i * 11111).toString().padStart(7, '0')}`,
  };
});

export function listEngineers(): GasEngineer[] { return SEED_ENGINEERS; }
export function getEngineer(id: string): GasEngineer | undefined { return SEED_ENGINEERS.find((e) => e.id === id); }
