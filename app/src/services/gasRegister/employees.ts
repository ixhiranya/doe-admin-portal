// =============================================================================
// Gas Register · Employee Master
// -----------------------------------------------------------------------------
// Personnel working for a permit holder, with their gas-handling training
// credentials recorded. The list view's "Source" column matches the legacy
// system's vocabulary (FETCHED_FROM_UP / FETCHED_FROM_ASATEEL / MANUAL).
// =============================================================================

import { PERMIT_HOLDERS } from './assets';

export { PERMIT_HOLDERS } from './assets';

export type EmployeeSource = 'unified_platform' | 'asateel' | 'manual';
export type Gender = 'Male' | 'Female';

export function employeeSourceLabel(s: EmployeeSource): string {
  return s === 'unified_platform' ? 'UP'
       : s === 'asateel'          ? 'ASATEEL'
                                  : 'Manual';
}

export interface EmployeeAttachment {
  name: string;        // e.g. "Training certificate issued by ADQCC"
  fileName: string;    // e.g. "1088519.png"
  uploadedAt: string;
}

export interface GasEmployee {
  id: string;                          // EMP_xxxx
  permitHolderId: string;
  permitHolderName: string;
  source: EmployeeSource;
  jobId: string;
  name: string;
  emiratesId: string;                  // "ID number"
  gender: Gender;
  mobile: string;
  email: string;
  dateOfBirth: string;
  dateOfHiring: string;
  section: string;
  professionInDetail: string;
  qualification: string;
  trainingInGas: string;
  monthlyWorkingHours: number;
  certificateExpiryDate: string;
  attachments: EmployeeAttachment[];
  createdAt: string;
  updatedAt: string;
}

export const SECTIONS = [
  'Sales, Marketing and Development Managers',
  'Operations Management',
  'Maintenance & Technical Services',
  'Health, Safety & Environment',
  'Engineering & Design',
  'Logistics & Fleet',
  'Quality & Inspection',
  'Field Operators',
] as const;

export const QUALIFICATIONS = [
  'Primary',
  'Preparatory',
  'Secondary',
  'Diploma',
  'Bachelor’s',
  'Master’s',
  'PhD',
] as const;

// ============================================================
// Seed dataset
// ============================================================
let counter = 1300;
const sn = () => 'EMP_' + (++counter);

export const SEED_EMPLOYEES: GasEmployee[] = [
  {
    id: sn(),
    permitHolderId: 'PH-006', permitHolderName: 'Petroleum Development Company',
    source: 'asateel',
    jobId: '68', name: 'MOHAMED KANI FAKKIR MOHIDEEN FAKKIR MOHIDEEN',
    emiratesId: '784-1992-6393518-3', gender: 'Male',
    mobile: '—', email: '—',
    dateOfBirth: '1992-01-21', dateOfHiring: '2023-11-01',
    section: 'Maintenance & Technical Services',
    professionInDetail: 'Senior Gas Technician',
    qualification: 'Diploma',
    trainingInGas: 'ADQCC certified gas system installer (initial + refresher 2024)',
    monthlyWorkingHours: 192,
    certificateExpiryDate: '2026-11-12',
    attachments: [{ name: 'Training certificate issued by Abu Dhabi Quality and Conformity Council', fileName: 'adqcc-mohideen-2024.pdf', uploadedAt: '2024-03-04T09:00:00Z' }],
    createdAt: '2023-11-01T08:00:00Z', updatedAt: '2024-03-04T09:00:00Z',
  },
  {
    id: sn(),
    permitHolderId: 'PH-006', permitHolderName: 'Petroleum Development Company',
    source: 'asateel',
    jobId: '69', name: 'MUZAFAR HUSSAIN MUHAMMAD TUFAIL',
    emiratesId: '784-1992-9764298-7', gender: 'Male',
    mobile: '—', email: '—',
    dateOfBirth: '1992-03-25', dateOfHiring: '2023-11-01',
    section: 'Field Operators',
    professionInDetail: 'Gas Field Operator',
    qualification: 'Secondary',
    trainingInGas: 'Cylinder handling & emergency response (annual recertification)',
    monthlyWorkingHours: 200,
    certificateExpiryDate: '2026-09-30',
    attachments: [{ name: 'Cylinder handling training certificate', fileName: 'cyl-handling-tufail.pdf', uploadedAt: '2024-04-12T09:00:00Z' }],
    createdAt: '2023-11-01T08:00:00Z', updatedAt: '2024-04-12T09:00:00Z',
  },
  {
    id: sn(),
    permitHolderId: 'PH-002', permitHolderName: 'Emirates Gas LLC',
    source: 'unified_platform',
    jobId: 'Mark 1', name: 'Mark Jhon',
    emiratesId: '12341', gender: 'Male',
    mobile: '+971 98 181 8181', email: 'sdfa@innovatechs.com',
    dateOfBirth: '2026-02-12', dateOfHiring: '2026-04-21',
    section: 'Sales, Marketing and Development Managers',
    professionInDetail: 'Assistant Manager, Commercial',
    qualification: 'Preparatory',
    trainingInGas: 'mar12',
    monthlyWorkingHours: 8,
    certificateExpiryDate: '2026-04-14',
    attachments: [{ name: 'Training certificate issued by Abu Dhabi Quality and Conformity Council', fileName: '1088519.png', uploadedAt: '2026-04-21T09:00:00Z' }],
    createdAt: '2026-04-21T08:00:00Z', updatedAt: '2026-04-21T09:00:00Z',
  },
  {
    id: sn(),
    permitHolderId: 'PH-002', permitHolderName: 'Emirates Gas LLC',
    source: 'unified_platform',
    jobId: '8', name: 'jh',
    emiratesId: '8', gender: 'Male',
    mobile: '+971 67 878 7898', email: 'jhhvuy@innovatechs.com',
    dateOfBirth: '2026-04-22', dateOfHiring: '2026-04-29',
    section: 'Operations Management',
    professionInDetail: 'Operations Trainee',
    qualification: 'Secondary',
    trainingInGas: 'Initial induction · pending refresher',
    monthlyWorkingHours: 160,
    certificateExpiryDate: '2027-04-22',
    attachments: [],
    createdAt: '2026-04-22T08:00:00Z', updatedAt: '2026-04-29T09:00:00Z',
  },
  {
    id: sn(),
    permitHolderId: 'PH-001', permitHolderName: 'ADNOC Distribution',
    source: 'asateel',
    jobId: '89', name: 'MOHAMMED ABDUL GAFOOR MAJEED',
    emiratesId: '784-1986-5931085-2', gender: 'Male',
    mobile: '+971 50 421 7788', email: 'gafoor@innovatechs.com',
    dateOfBirth: '1986-03-25', dateOfHiring: '2008-11-23',
    section: 'Quality & Inspection',
    professionInDetail: 'Senior Gas Inspector',
    qualification: 'Bachelor’s',
    trainingInGas: 'TPI inspector training + biennial recertification',
    monthlyWorkingHours: 192,
    certificateExpiryDate: '2026-12-31',
    attachments: [{ name: 'TPI Inspector Certification', fileName: 'tpi-gafoor.pdf', uploadedAt: '2024-12-05T09:00:00Z' }],
    createdAt: '2008-11-23T08:00:00Z', updatedAt: '2024-12-05T09:00:00Z',
  },
  {
    id: sn(),
    permitHolderId: 'PH-001', permitHolderName: 'ADNOC Distribution',
    source: 'asateel',
    jobId: '86', name: 'TAREQ MOHAMMED ALSOULAIMAN',
    emiratesId: '784-1992-1932226-2', gender: 'Male',
    mobile: '+971 50 882 3344', email: 'tareq@innovatechs.com',
    dateOfBirth: '1992-02-26', dateOfHiring: '2022-10-04',
    section: 'Engineering & Design',
    professionInDetail: 'Gas Systems Engineer',
    qualification: 'Bachelor’s',
    trainingInGas: 'Gas systems design (MOHRE-recognised) + ADQCC top-up 2024',
    monthlyWorkingHours: 192,
    certificateExpiryDate: '2026-10-04',
    attachments: [{ name: 'Engineering qualification — ADQCC equivalency', fileName: 'eng-equiv-tareq.pdf', uploadedAt: '2024-06-18T09:00:00Z' }],
    createdAt: '2022-10-04T08:00:00Z', updatedAt: '2024-06-18T09:00:00Z',
  },
  {
    id: sn(),
    permitHolderId: 'PH-005', permitHolderName: 'ENOC / Emarat',
    source: 'manual',
    jobId: '24155', name: 'SHAHID IQBAL MUHAMMAD ASLAM',
    emiratesId: '784-1987-1374920-2', gender: 'Male',
    mobile: '—', email: '—',
    dateOfBirth: '1987-11-04', dateOfHiring: '2010-01-01',
    section: 'Logistics & Fleet',
    professionInDetail: 'Tanker Driver / Hazmat',
    qualification: 'Secondary',
    trainingInGas: 'Hazmat road transport (DOE-registered) + annual drill',
    monthlyWorkingHours: 220,
    certificateExpiryDate: '2025-12-31',
    attachments: [],
    createdAt: '2010-01-01T08:00:00Z', updatedAt: '2025-01-12T09:00:00Z',
  },
  {
    id: sn(),
    permitHolderId: 'PH-006', permitHolderName: 'Petroleum Development Company',
    source: 'asateel',
    jobId: '17', name: 'RAZIA SULTANA DAUD ANSARI',
    emiratesId: '784-1993-3714820-1', gender: 'Female',
    mobile: '+971 56 841 8573', email: '—',
    dateOfBirth: '1993-02-04', dateOfHiring: '2023-11-01',
    section: 'Health, Safety & Environment',
    professionInDetail: 'HSE Officer',
    qualification: 'Bachelor’s',
    trainingInGas: 'HSE for gas installations · NEBOSH IGC + ADQCC top-up',
    monthlyWorkingHours: 168,
    certificateExpiryDate: '2027-02-15',
    attachments: [{ name: 'NEBOSH IGC certificate', fileName: 'nebosh-ansari.pdf', uploadedAt: '2024-02-20T09:00:00Z' }],
    createdAt: '2023-11-01T08:00:00Z', updatedAt: '2024-02-20T09:00:00Z',
  },
  {
    id: sn(),
    permitHolderId: 'PH-006', permitHolderName: 'Petroleum Development Company',
    source: 'unified_platform',
    jobId: '1', name: 'qwerty',
    emiratesId: '11', gender: 'Male',
    mobile: '+971 98 765 4567', email: 'a@innovatechs.com',
    dateOfBirth: '2004-10-31', dateOfHiring: '2025-10-01',
    section: 'Operations Management',
    professionInDetail: 'Trainee Operator',
    qualification: 'Diploma',
    trainingInGas: 'Pending initial training',
    monthlyWorkingHours: 160,
    certificateExpiryDate: '2026-10-01',
    attachments: [],
    createdAt: '2025-10-01T08:00:00Z', updatedAt: '2025-10-01T09:00:00Z',
  },
  {
    id: sn(),
    permitHolderId: 'PH-006', permitHolderName: 'Petroleum Development Company',
    source: 'asateel',
    jobId: '16', name: 'AZHAGIRI NAGARAJAN',
    emiratesId: '784-1990-6428390-8', gender: 'Male',
    mobile: '—', email: '—',
    dateOfBirth: '1990-09-30', dateOfHiring: '2023-11-01',
    section: 'Maintenance & Technical Services',
    professionInDetail: 'Maintenance Technician',
    qualification: 'Diploma',
    trainingInGas: 'Maintenance technician — gas installations (ADQCC)',
    monthlyWorkingHours: 192,
    certificateExpiryDate: '2026-08-30',
    attachments: [{ name: 'Maintenance technician certificate', fileName: 'maint-nagarajan.pdf', uploadedAt: '2024-09-15T09:00:00Z' }],
    createdAt: '2023-11-01T08:00:00Z', updatedAt: '2024-09-15T09:00:00Z',
  },
];

export function listEmployees(): GasEmployee[] { return SEED_EMPLOYEES; }
export function getEmployee(id: string): GasEmployee | undefined { return SEED_EMPLOYEES.find((e) => e.id === id); }
