import type { User, Company, Application } from '../types';
import { nanoid } from 'nanoid';

// ============================================================================
// Seeded users. Convention:
//   Internal:  <module>.<role>      e.g. "gas.engineer", "hoe.director"
//   External:  <company-slug>       e.g. "acme", "bluefield"
//
// Password for ALL seeded users: "manage"
// Role is identified from the userid via this lookup table — no role picker.
// ============================================================================

export const SEED_PASSWORD = 'manage';

const acmeCompany: Company = {
  name: 'Acme Energy Services LLC',
  ownerName: 'Mohammed Al Mansouri',
  nationality: 'United Arab Emirates',
  authorizedRepresentative: 'Ahmed Al Suwaidi',
  businessActivity: 'Gas systems installation, maintenance, distribution',
  legalStatus: 'Limited Liability Company',
  establishmentDate: '2014-03-12',
  tradePermitNumber: 'CN-1107845',
  tradePermitIssueDate: '2014-03-15',
  tradePermitExpiryDate: '2026-03-14',
  address: 'M-44, Mussafah Industrial Area, Abu Dhabi',
  poBox: '38291',
  phone: '+971 2 555 0142',
  email: 'compliance@acme-energy.ae',
  website: 'https://acme-energy.ae',
};

const bluefieldCompany: Company = {
  name: 'Bluefield Industrial Contracting',
  ownerName: 'Sara Al Hashimi',
  nationality: 'United Arab Emirates',
  authorizedRepresentative: 'Khalid Bin Rashid',
  businessActivity: 'Gas pipeline installation and inspection services',
  legalStatus: 'Limited Liability Company',
  establishmentDate: '2018-07-04',
  tradePermitNumber: 'CN-2204120',
  tradePermitIssueDate: '2018-07-10',
  tradePermitExpiryDate: '2026-07-09',
  address: 'ICAD-II, Plot 7B, Abu Dhabi',
  poBox: '54120',
  phone: '+971 2 555 0188',
  email: 'admin@bluefield.ae',
  website: 'https://bluefield.ae',
};

export const SEED_USERS: User[] = [
  // -------- PPS internal staff — handle both Gas and HOE (TPI) under the
  //          Petroleum Products Sector. User IDs keep their descriptive
  //          gas.* / hoe.* aliases so existing demo bookmarks still work.
  {
    id: 'gas.engineer',
    name: 'Eng. Faisal Al Shamsi',
    email: 'f.alshamsi@doe.gov.ae',
    phone: '+971 50 555 1010',
    role: 'engineer',
    modules: ['gas', 'hoe', 'noc', 'amc', 'coc', 'maes'],
    userType: 'internal',
  },
  {
    id: 'gas.head',
    name: 'Hessa Al Mazrouei',
    email: 'h.almazrouei@doe.gov.ae',
    phone: '+971 50 555 1020',
    role: 'section_head',
    modules: ['gas', 'hoe', 'noc', 'amc', 'coc', 'maes'],
    userType: 'internal',
  },
  {
    id: 'gas.director',
    name: 'Dr. Khalifa Al Nuaimi',
    email: 'k.alnuaimi@doe.gov.ae',
    phone: '+971 50 555 1030',
    role: 'director',
    modules: ['gas', 'hoe', 'noc', 'amc', 'coc', 'maes'],
    userType: 'internal',
  },
  {
    id: 'hoe.engineer',
    name: 'Eng. Reem Al Dhaheri',
    email: 'r.aldhaheri@doe.gov.ae',
    role: 'engineer',
    modules: ['gas', 'hoe', 'noc', 'amc', 'coc', 'maes'],
    userType: 'internal',
  },
  {
    id: 'hoe.head',
    name: 'Saeed Al Marri',
    email: 's.almarri@doe.gov.ae',
    role: 'section_head',
    modules: ['gas', 'hoe', 'noc', 'amc', 'coc', 'maes'],
    userType: 'internal',
  },
  {
    id: 'hoe.director',
    name: 'Dr. Maitha Al Otaiba',
    email: 'm.alotaiba@doe.gov.ae',
    role: 'director',
    modules: ['gas', 'hoe', 'noc', 'amc', 'coc', 'maes'],
    userType: 'internal',
  },

  // -------- PPS — Petroleum Products Sector actors
  //          End-to-end submission workflow: entity submits ▸ reviewer
  //          approves/returns ▸ approver finalises & publishes.
  {
    id: 'pps.reviewer',
    name: 'Khalid Al Qubaisi',
    email: 'k.alqubaisi@doe.gov.ae',
    phone: '+971 50 555 2010',
    role: 'pps_reviewer',
    modules: ['pps'],
    userType: 'internal',
  },
  {
    id: 'pps.approver',
    name: 'Mariam Al Mansouri',
    email: 'm.almansouri@doe.gov.ae',
    phone: '+971 50 555 2020',
    role: 'pps_approver',
    modules: ['pps'],
    userType: 'internal',
  },
  // Petroleum Products · Internal User (DoE) — reuses the existing internal PPS
  // experience: Dashboard, Submissions (review queue), Submission Monitoring.
  {
    id: 'pps.internal',
    name: 'Omar Al Suwaidi',
    email: 'o.alsuwaidi@doe.gov.ae',
    phone: '+971 50 555 2030',
    role: 'pps_approver',
    modules: ['pps'],
    userType: 'internal',
    initials: 'OS',
  },

  // -------- DoE PPS Mobile Inspection actors (Doc 2 SDD §2)
  //          Inspector / Senior Inspector / Regulation Team. Section Head
  //          re-uses gas.head and Director re-uses gas.director above so the
  //          dashboards line up. These accounts open the mobile simulator
  //          and the matching review pages on the web side.
  {
    id: 'doe.inspector',
    name: 'Eng. Yousef Al Mehairbi',
    email: 'y.almehairbi@doe.gov.ae',
    phone: '+971 50 555 3010',
    role: 'inspector',
    modules: ['gas', 'hoe', 'noc', 'amc', 'coc', 'maes'],
    userType: 'internal',
  },
  {
    id: 'doe.inspector2',
    name: 'Eng. Noura Al Kaabi',
    email: 'n.alkaabi@doe.gov.ae',
    phone: '+971 50 555 3011',
    role: 'inspector',
    modules: ['gas', 'hoe', 'noc', 'amc', 'coc', 'maes'],
    userType: 'internal',
  },
  {
    id: 'doe.senior',
    name: 'Eng. Hamad Al Romaithi',
    email: 'h.alromaithi@doe.gov.ae',
    phone: '+971 50 555 3020',
    role: 'senior_inspector',
    modules: ['gas', 'hoe', 'noc', 'amc', 'coc', 'maes'],
    userType: 'internal',
  },
  {
    id: 'doe.regulation',
    name: 'Aisha Al Suwaidi',
    email: 'a.alsuwaidi@doe.gov.ae',
    phone: '+971 50 555 3030',
    role: 'regulation_team',
    modules: ['gas', 'hoe', 'noc', 'amc', 'coc', 'maes'],
    userType: 'internal',
  },

  {
    id: 'adnoc.dist',
    name: 'Fatima Al Hashemi',
    email: 'f.hashemi@adnocdistribution.ae',
    phone: '+971 50 444 1100',
    role: 'pps_entity',
    modules: ['pps'],
    userType: 'external',
    company: {
      name: 'ADNOC Distribution',
      ownerName: 'ADNOC Group',
      nationality: 'United Arab Emirates',
      authorizedRepresentative: 'Fatima Al Hashemi',
      businessActivity: 'Petroleum products retail, bulk distribution, infrastructure',
      legalStatus: 'Public Joint Stock Company',
      establishmentDate: '1973-01-01',
      tradePermitNumber: 'CN-1003248',
      tradePermitIssueDate: '1973-01-01',
      tradePermitExpiryDate: '2030-12-31',
      address: 'ADNOC HQ, Corniche Road, Abu Dhabi',
      poBox: '4188',
      phone: '+971 2 695 7777',
      email: 'compliance@adnocdistribution.ae',
    },
  },
  // Petroleum Products · Entity Submitter (ADNOC Distribution) — replicates the
  // full entity experience already designed for Fatima Al Hashemi.
  {
    id: 'adnoc.dist.2',
    name: 'Ahmed Al Mazrouei',
    email: 'a.almazrouei@adnocdistribution.ae',
    phone: '+971 50 444 1102',
    role: 'pps_entity',
    modules: ['pps'],
    userType: 'external',
    initials: 'AM',
    company: {
      name: 'ADNOC Distribution',
      ownerName: 'ADNOC Group',
      nationality: 'United Arab Emirates',
      authorizedRepresentative: 'Ahmed Al Mazrouei',
      businessActivity: 'Petroleum products retail, bulk distribution, infrastructure',
      legalStatus: 'Public Joint Stock Company',
      establishmentDate: '1973-01-01',
      tradePermitNumber: 'CN-1003248',
      tradePermitIssueDate: '1973-01-01',
      tradePermitExpiryDate: '2030-12-31',
      address: 'ADNOC HQ, Corniche Road, Abu Dhabi',
      poBox: '4188',
      phone: '+971 2 695 7777',
      email: 'compliance@adnocdistribution.ae',
    },
  },

  // -------- External applicants
  {
    id: 'acme',
    name: 'Ahmed Al Suwaidi',
    email: 'compliance@acme-energy.ae',
    phone: '+971 50 700 8801',
    role: 'applicant',
    modules: ['gas', 'hoe', 'noc', 'amc', 'coc', 'maes'],
    userType: 'external',
    company: acmeCompany,
  },
  {
    id: 'bluefield',
    name: 'Khalid Bin Rashid',
    email: 'admin@bluefield.ae',
    phone: '+971 50 700 9912',
    role: 'applicant',
    modules: ['gas', 'hoe', 'noc', 'amc', 'coc', 'maes'],
    userType: 'external',
    company: bluefieldCompany,
  },
  {
    id: 'fatima',
    name: 'Fatima Al Hashemi',
    email: 'fatima.h@centralgas.ae',
    phone: '+971 50 700 1234',
    role: 'applicant',
    modules: ['gas', 'hoe', 'noc', 'amc', 'coc', 'maes'],
    userType: 'external',
    company: {
      name: 'Central Gas Systems Co.',
      ownerName: 'Hashim Al Hashemi',
      nationality: 'United Arab Emirates',
      authorizedRepresentative: 'Fatima Al Hashemi',
      businessActivity: 'Gas systems consultancy, design and supervision',
      legalStatus: 'Limited Liability Company',
      establishmentDate: '2015-09-08',
      tradePermitNumber: 'CN-89412055',
      tradePermitIssueDate: '2015-09-10',
      tradePermitExpiryDate: '2026-09-09',
      address: 'Tower B-22, Al Maryah Island, Abu Dhabi',
      poBox: '12044',
      phone: '+971 2 555 0211',
      email: 'info@centralgas.ae',
      website: 'https://centralgas.ae',
    },
  },
];

// Demo login allow-list — the ONLY accounts shown in the login username dropdown
// and the Switch Demo User modal for now. The rest of SEED_USERS is kept intact
// (sample data + mobile sign-in depend on it) but hidden from the pickers.
// To restore the others, widen or remove this list.
export const LOGIN_VISIBLE_USER_IDS = ['pps.internal', 'adnoc.dist.2'];

// ----- Seed one in-flight sample application so the workflow is visible -----

function buildSampleApplications(): Application[] {
  const acme = SEED_USERS.find((u) => u.id === 'acme')!;
  const blue = SEED_USERS.find((u) => u.id === 'bluefield')!;
  const fatima = SEED_USERS.find((u) => u.id === 'fatima')!;

  function ago(days: number) { return new Date(Date.now() - days * 24 * 3600 * 1000).toISOString(); }
  function fwd(days: number) { return new Date(Date.now() + days * 24 * 3600 * 1000).toISOString(); }

  function mkTimeline(actor: User, action: string, toState: string, daysAgo = 0): any {
    return { id: nanoid(), at: ago(daysAgo), byUserId: actor.id, byUserName: actor.name, byUserRole: actor.role, action, toState };
  }

  // NOC sample premises — 12 realistic Abu Dhabi sites
  const nocPremises = [
    { type: 'Building (Mall)',       name: 'Yas Mall — Food Court Wing',        ptype: 'Mall',         bld: 'YM-FC-12',  city: 'Abu Dhabi', area: 'Yas Island',         sector: 'Yas West',  plot: 'P-1A',  coords: '24.488°N 54.604°E', gasType: 'Central LPG',  medium: 'LPG',       supply: 'ENOC',         install: 'Falcon Gas Engineering',  amc: 'Polaris Gas Solutions',     fm: 'EFS Facilities Management', fmContact: 'fm@efs.ae · +971 2 555 9001' },
    { type: 'Building (Hospital)',   name: 'Al Mafraq Hospital — Block A',      ptype: 'Hospital',     bld: 'AMH-A',     city: 'Abu Dhabi', area: 'Mafraq',             sector: 'Sector 5',  plot: 'P-14',  coords: '24.317°N 54.660°E', gasType: 'Central Medical', medium: 'LPG',    supply: 'ADGAS',        install: 'Delta Petroleum Services',amc: 'Crescent Gas & Allied',    fm: 'Etihad Facilities',          fmContact: 'fm@etihad.ae · +971 2 555 9002' },
    { type: 'Building (Residential)',name: 'Saadiyat Tower B-3',                ptype: 'Tower',        bld: 'STB-3',     city: 'Abu Dhabi', area: 'Saadiyat Island',    sector: 'Cultural',  plot: 'P-7B',  coords: '24.541°N 54.444°E', gasType: 'Central LPG',  medium: 'LPG',       supply: 'ENOC',         install: 'Omega Pipeline Contractors', amc: 'Vertex Gas Inspection',  fm: 'Aldar Facilities',           fmContact: 'fm@aldar.ae · +971 2 555 9003' },
    { type: 'Industrial',            name: 'KIZAD Plot 22 Industrial Plant',    ptype: 'Industrial',   bld: 'KZ-22',     city: 'Abu Dhabi', area: 'KIZAD',              sector: 'Zone B',    plot: 'P-22',  coords: '24.628°N 54.745°E', gasType: 'Process Gas',  medium: 'Natural Gas', supply: 'ADNOC Gas',  install: 'Nile Industrial Gas',     amc: 'Sapphire Petroleum',        fm: 'KIZAD Operations',           fmContact: 'fm@kizad.ae · +971 2 555 9004' },
    { type: 'Building (Hotel)',      name: 'Etihad Towers Hotel — Tower 1',     ptype: 'Hotel',        bld: 'ET-1',      city: 'Abu Dhabi', area: 'Corniche',           sector: 'West',      plot: 'P-3A',  coords: '24.464°N 54.328°E', gasType: 'Central LPG',  medium: 'LPG',       supply: 'ENOC',         install: 'Horizon Energy Services', amc: 'Polaris Gas Solutions',     fm: 'Etihad Facilities',          fmContact: 'fm@etihad.ae · +971 2 555 9005' },
    { type: 'Building (School)',     name: 'ADEK Al Falah Boys School',         ptype: 'School',       bld: 'AB-1',      city: 'Abu Dhabi', area: 'Al Falah',           sector: 'East',      plot: 'P-12C', coords: '24.470°N 54.566°E', gasType: 'Cylinder Bank', medium: 'LPG',     supply: 'ADGAS',        install: 'Pearl Industrial',        amc: 'Sunrise Energy Audit',      fm: 'ADEK FM',                    fmContact: 'fm@adek.ae · +971 2 555 9006' },
    { type: 'Building (Office)',     name: 'Capital Centre Tower B',            ptype: 'Office Tower', bld: 'CC-B',      city: 'Abu Dhabi', area: 'Capital Centre',     sector: 'Central',   plot: 'P-19',  coords: '24.422°N 54.434°E', gasType: 'Central LPG',  medium: 'LPG',       supply: 'ENOC',         install: 'Atlas Petrochemical',     amc: 'Vertex Gas Inspection',     fm: 'ADNEC Facilities',           fmContact: 'fm@adnec.ae · +971 2 555 9007' },
    { type: 'Industrial',            name: 'Mussafah ICAD-2 Bottling Plant',    ptype: 'Industrial',   bld: 'M-44',      city: 'Abu Dhabi', area: 'Mussafah',           sector: 'ICAD-2',    plot: 'P-7B',  coords: '24.354°N 54.501°E', gasType: 'LPG Bottling', medium: 'LPG',       supply: 'ADGAS',        install: 'Crescent Gas & Allied',   amc: 'Falcon Gas Engineering',    fm: 'SENAAT FM',                  fmContact: 'fm@senaat.ae · +971 2 555 9008' },
    { type: 'Building (Hospital)',   name: 'Al Ain Hospital New Wing',          ptype: 'Hospital',     bld: 'AAH-NW',    city: 'Al Ain',    area: 'Al Jimi',            sector: 'North',     plot: 'P-2',   coords: '24.213°N 55.748°E', gasType: 'Central Medical', medium: 'LPG',    supply: 'ENOC',         install: 'Delta Petroleum Services',amc: 'Polaris Gas Solutions',     fm: 'SEHA FM',                    fmContact: 'fm@seha.ae · +971 3 555 9009' },
    { type: 'Building (Mall)',       name: 'Bawabat Al Sharq Mall',             ptype: 'Mall',         bld: 'BAS-1',     city: 'Abu Dhabi', area: 'Bani Yas',           sector: 'Sector 4',  plot: 'P-1',   coords: '24.310°N 54.620°E', gasType: 'Central LPG',  medium: 'LPG',       supply: 'ENOC',         install: 'Omega Pipeline Contractors', amc: 'Sapphire Petroleum',     fm: 'Line FM',                    fmContact: 'fm@line.ae · +971 2 555 9010' },
    { type: 'Building (Residential)',name: 'Reem Island Marina Heights',        ptype: 'Tower',        bld: 'RIM-1',     city: 'Abu Dhabi', area: 'Al Reem Island',     sector: 'Marina',    plot: 'P-5A',  coords: '24.499°N 54.405°E', gasType: 'Central LPG',  medium: 'LPG',       supply: 'ENOC',         install: 'Atlas Petrochemical',     amc: 'Sunrise Energy Audit',      fm: 'Reem FM',                    fmContact: 'fm@reem.ae · +971 2 555 9011' },
    { type: 'Industrial',            name: 'Ruwais Refinery Catering Block',    ptype: 'Industrial',   bld: 'RRC-3',     city: 'Al Dhafra', area: 'Ruwais',             sector: 'East',      plot: 'P-11',  coords: '24.085°N 52.733°E', gasType: 'Catering LPG', medium: 'LPG',       supply: 'ADNOC Distribution', install: 'Nile Industrial Gas',  amc: 'Crescent Gas & Allied',    fm: 'ADNOC FM',                   fmContact: 'fm@adnoc.ae · +971 2 555 9012' },
  ];

  // AMC field values per AMC Enhancements SDD. Index `i` picks a deterministic
  // sample building so cards across the list show distinct premises.
  const amcBuildings = [
    { name: 'Burj Al Tabriz Tower',     premises: 'B-1207', city: 'Abu Dhabi City', plot: 'C-44',  makany: 'MK-44280091', emeter: 'EM-22014',  floors: '38', flats: '128', addr: 'Al Maryah Island, Abu Dhabi' },
    { name: 'Al Reem Lagoon Residences',premises: 'L-882',  city: 'Abu Dhabi City', plot: 'R-12',  makany: 'MK-77129923', emeter: 'EM-78214',  floors: '24', flats: '96',  addr: 'Al Reem Island, Abu Dhabi' },
    { name: 'Khalifa A Compound',       premises: 'KH-A22', city: 'Abu Dhabi City', plot: 'KA-08', makany: 'MK-22556001', emeter: 'EM-19844',  floors: '12', flats: '64',  addr: 'Khalifa City A, Abu Dhabi' },
    { name: 'Madinat Zayed Plaza',      premises: 'MZ-118', city: 'Al Dhafra',      plot: 'MZ-22', makany: 'MK-90017722', emeter: 'EM-44331',  floors: '8',  flats: '32',  addr: 'Madinat Zayed, Al Dhafra' },
    { name: 'Al Ain Hili Towers',       premises: 'AH-7',   city: 'Al Ain',         plot: 'AH-3',  makany: 'MK-33892206', emeter: 'EM-66120',  floors: '18', flats: '72',  addr: 'Al Hili, Al Ain' },
    { name: 'Mussafah Worker Complex',  premises: 'MW-44',  city: 'Abu Dhabi City', plot: 'M-117', makany: 'MK-11982240', emeter: 'EM-50012',  floors: '6',  flats: '240', addr: 'Mussafah Industrial, Abu Dhabi' },
    { name: 'Yas North Beach Hotel',    premises: 'YN-A1',  city: 'Abu Dhabi City', plot: 'Y-7',   makany: 'MK-55600133', emeter: 'EM-71028',  floors: '14', flats: '320', addr: 'Yas North, Abu Dhabi' },
    { name: 'Capital Park Offices',     premises: 'CP-77',  city: 'Abu Dhabi City', plot: 'CP-1',  makany: 'MK-66100874', emeter: 'EM-33094',  floors: '22', flats: '0',   addr: 'Capital Centre, ADNEC' },
    { name: 'Liwa Garden Villas',       premises: 'LG-1A',  city: 'Al Dhafra',      plot: 'LG-3',  makany: 'MK-44091277', emeter: 'EM-29117',  floors: '2',  flats: '24',  addr: 'Liwa Oasis, Al Dhafra' },
    { name: 'Ruwais Family Quarters',   premises: 'RFQ-12', city: 'Al Dhafra',      plot: 'R-19',  makany: 'MK-30022511', emeter: 'EM-85007',  floors: '4',  flats: '64',  addr: 'Ruwais Town, Al Dhafra' },
    { name: 'Al Mushrif Cultural Hall', premises: 'MCH-2',  city: 'Abu Dhabi City', plot: 'A-8',   makany: 'MK-12048377', emeter: 'EM-14029',  floors: '3',  flats: '0',   addr: 'Al Mushrif, Abu Dhabi' },
    { name: 'Saadiyat Eco Suites',      premises: 'SE-44',  city: 'Abu Dhabi City', plot: 'S-2',   makany: 'MK-99102488', emeter: 'EM-65007',  floors: '10', flats: '52',  addr: 'Saadiyat Island, Abu Dhabi' },
  ];

  function amcFieldValues(i: number): Record<string, string> {
    const b = amcBuildings[i % amcBuildings.length];
    return {
      buildingName: b.name, buildingNameAr: b.name + ' (AR)', premisesNumber: b.premises,
      buildingType: ['residential','commercial','mixed_use','hospitality','institutional'][i % 5],
      emirate: 'abu_dhabi', city: b.city, plotNo: b.plot, sectorNo: `S-${10 + (i * 3) % 50}`,
      makanyId: b.makany, electricMeter: b.emeter, hussantakId: `HSN-${5000 + i * 11}`,
      area: String(800 + i * 150), floors: b.floors, flats: b.flats, shops: String(2 + (i % 6)),
      latitude: (24.3 + (i % 7) * 0.05).toFixed(4), longitude: (54.4 + (i % 9) * 0.03).toFixed(4),
      detailedAddress: b.addr,
      guardName: 'Salem Al Yamahi', guardMobile: '+971 50 700 5500',
      propertyMgmt: 'Aldar Property Management', insuranceCo: 'Abu Dhabi National Insurance',

      // Maintenance company (mirrors the applicant's company info)
      email: 'compliance@maint-co.ae',
      emergencyContact: '+971 800 4357 (24/7)',
      customerService: '+971 2 555 0188',
      contractValue: String(12000 + (i * 850) % 20000),

      // System type uses the new "NG Central Gas System" for some samples to
      // showcase the SDD §1 enhancement
      systemType: i % 6 === 0 ? 'ng_central' : ['lpg_central','sng_central','lpg_plant','sng_plant','gas_cylinder'][i % 5],

      // For Cancel/Revoke
      cancellationReason: 'Maintenance company contract ended; new contractor engaged for the next AMC cycle.',
      submittedBy: i % 2 === 0 ? 'owner' : 'contractor',
      revocationReason: 'Repeated safety violations on the cathodic protection system flagged in the last two inspection cycles.',
    };
  }

  // COC field values per COC Enhancement SDD §1.4 (Modification form) and §2.4
  // (Cancellation form). Reuses the same realistic Abu Dhabi premises catalog
  // as the NOC module since a COC always pertains to a specific gas-system
  // installation at a premises.
  function cocFieldValues(i: number): Record<string, string> {
    const p = nocPremises[i % nocPremises.length];
    return {
      // Premises & Building
      buildingName: p.name, premisesType: p.ptype, premisesNumber: p.bld,
      emirate: 'Abu Dhabi', city: p.city, area: p.area, sector: p.sector,
      plotNumber: p.plot, coordinates: p.coords, dmtMepsRef: `MEPS-${20000 + i * 17}`,
      // Owner, Consultant & Contractor
      premisesOwnerName: 'Mohammed Al Mansouri',
      premisesOwnerEid: '784-1985-1234567-1',
      premisesOwnerContact: '+971 50 700 8801',
      projectConsultant: 'AECOM Middle East',
      gasInstallContractor: p.install,
      gasAmcContractor: p.amc,
      emergencyEmail: 'ops@premises.ae',
      fmCompany: p.fm,
      fmContact: p.fmContact,
      // Gas System & TPI
      tpiCompany: 'Bureau Veritas Middle East',
      tpiCocRef: `TPI-CoC-${2024 + (i % 3)}-${1000 + i * 7}`,
      tpiCocIssueDate: `2025-${String(((i % 12) + 1)).padStart(2, '0')}-15`,
      gasSystemType: p.gasType,
      gasMedium: p.medium,
      gasSupplyCompany: p.supply,
      // Modification / Cancellation context
      modificationReason: 'Update owner contact details and FM company following building hand-over to the new operations team.',
      cancellationReason: 'Premises operations discontinued — gas system decommissioned per board resolution dated 2026-04-15.',
    };
  }

  // -------------------------------------------------------------------------
  // MAES field values per "MAES Enhancements SDD" §1.4 (Main Info form) and
  // §2-§5 (Renewal / Modification / Cancellation / Revocation forms).
  //
  // MAES is company-level (not premises-level) — every applicant is a trade-
  // licenced Agent / Manufacturer / Distributor registering materials and
  // equipment used in gas systems. We seed twelve realistic Abu Dhabi material
  // suppliers so each MAES row can use a distinct one.
  // -------------------------------------------------------------------------
  const maesApplicants: Array<{
    type: 'agent' | 'manufacturer' | 'distributor';
    biz: string; lic: string; rep: string; mobile: string; email: string;
    addr: string; equipmentCount: number; maxExpiry: string;
  }> = [
    { type: 'agent',        biz: 'Falcon Gas Engineering LLC',     lic: '1147823', rep: 'Rashid Al Mansouri', mobile: '+971 50 555 7001', email: 'sales@falcongas.ae',      addr: 'Plot 27, ICAD-III, Abu Dhabi',      equipmentCount: 14, maxExpiry: '2028-03-15' },
    { type: 'manufacturer', biz: 'Delta Petroleum Services',       lic: '1238044', rep: 'Yusuf Khan',          mobile: '+971 50 555 7002', email: 'orders@deltapetro.ae',    addr: 'M-12 Mussafah, Abu Dhabi',          equipmentCount: 21, maxExpiry: '2027-11-30' },
    { type: 'distributor',  biz: 'Omega Pipeline Contractors',     lic: '1382001', rep: 'Mariam Al Suwaidi',   mobile: '+971 50 555 7003', email: 'info@omegapipe.ae',       addr: 'KIZAD South, Abu Dhabi',            equipmentCount:  9, maxExpiry: '2028-07-22' },
    { type: 'manufacturer', biz: 'Nile Industrial Gas Co.',        lic: '1467880', rep: 'Sherif El-Sayed',     mobile: '+971 50 555 7004', email: 'orders@nileindgas.ae',    addr: 'ICAD-II, Plot 14B, Abu Dhabi',      equipmentCount: 18, maxExpiry: '2029-01-10' },
    { type: 'agent',        biz: 'Horizon Energy Services',        lic: '1521098', rep: 'Aisha Al Dhaheri',    mobile: '+971 50 555 7005', email: 'sales@horizonenergy.ae',  addr: 'Hamdan Street, Abu Dhabi',          equipmentCount:  7, maxExpiry: '2027-09-05' },
    { type: 'distributor',  biz: 'Polaris Gas Solutions',          lic: '1604421', rep: 'Vikram Iyer',         mobile: '+971 50 555 7006', email: 'info@polarisgas.ae',      addr: 'Khalifa Industrial Zone, Abu Dhabi',equipmentCount: 12, maxExpiry: '2028-12-18' },
    { type: 'manufacturer', biz: 'Atlas Petrochemical Works',      lic: '1731122', rep: 'Layla Al Hammadi',    mobile: '+971 50 555 7007', email: 'tenders@atlaspc.ae',      addr: 'Ruwais Industrial Complex',         equipmentCount: 27, maxExpiry: '2029-04-30' },
    { type: 'agent',        biz: 'Crescent Gas & Allied Services', lic: '1812303', rep: 'Hamdan Al Otaiba',    mobile: '+971 50 555 7008', email: 'crescent@cgas.ae',        addr: 'Al Bahia, Abu Dhabi',               equipmentCount: 11, maxExpiry: '2028-06-12' },
    { type: 'distributor',  biz: 'Pearl Industrial Consulting',    lic: '1928455', rep: 'Noura Al Falasi',     mobile: '+971 50 555 7009', email: 'sales@pearlind.ae',       addr: 'Capital Gate, Abu Dhabi',           equipmentCount:  6, maxExpiry: '2027-08-21' },
    { type: 'manufacturer', biz: 'Sapphire Petroleum Logistics',   lic: '2018002', rep: 'Tarek Bin Hamad',     mobile: '+971 50 555 7010', email: 'logistics@sapphirep.ae',  addr: 'Mussafah ME-44',                    equipmentCount: 16, maxExpiry: '2028-10-08' },
    { type: 'agent',        biz: 'Vertex Gas Inspection LLC',      lic: '2110934', rep: 'Reema Al Marri',      mobile: '+971 50 555 7011', email: 'reema@vertexgas.ae',      addr: 'Yas South Industrial',              equipmentCount: 13, maxExpiry: '2029-02-19' },
    { type: 'distributor',  biz: 'Sunrise Energy Audit Co.',       lic: '2241006', rep: 'Mohammad Khalil',     mobile: '+971 50 555 7012', email: 'audit@sunriseenergy.ae',  addr: 'Reem Island, Abu Dhabi',            equipmentCount: 10, maxExpiry: '2028-05-25' },
  ];

  // Catalogue of realistic gas-system materials. Each MAES seed app draws
  // `equipmentCount` rows from this list starting at a deterministic offset so
  // every applicant ends up with a distinct slice and the per-material expiry
  // dates spread realistically across the next 18-36 months.
  const MAES_MATERIAL_CATALOG: Array<Omit<import('../types').MaesMaterial, 'id' | 'expiryDate' | 'status'>> = [
    { commercialName: 'Pressure Regulator PR-2000 Series',     modelNo: 'PR2000-AX',     materialType: 'Pressure Regulator',     testingLabs: 'TÜV NORD Middle East',         certificationBody: 'Bureau Veritas',     intlSafetyCertNo: 'COC-PR2000-2024-117',  manufacturerCountry: 'Germany',         labInspectionType: 'Type Examination · ATEX' },
    { commercialName: 'Emergency Shut-Off Valve ESOV-150',     modelNo: 'ESOV-150-FE',   materialType: 'Shut-Off Valve',          testingLabs: 'SGS Gulf',                      certificationBody: 'DEKRA',              intlSafetyCertNo: 'COC-ESOV150-2024-208', manufacturerCountry: 'Italy',           labInspectionType: 'Type Examination · PED' },
    { commercialName: 'Flame Arrestor FA-DN50',                modelNo: 'FA-DN50-SS316', materialType: 'Flame Arrestor',          testingLabs: 'Intertek Caleb Brett',          certificationBody: 'TÜV SÜD',            intlSafetyCertNo: 'COC-FADN50-2024-014',  manufacturerCountry: 'United Kingdom',  labInspectionType: 'Type Examination · ATEX' },
    { commercialName: 'Gas Solenoid Valve GSV-32',             modelNo: 'GSV-32-NC',     materialType: 'Solenoid Valve',          testingLabs: 'LR Lloyd’s Register',     certificationBody: 'Bureau Veritas',     intlSafetyCertNo: 'COC-GSV32-2024-088',   manufacturerCountry: 'United States',   labInspectionType: 'Performance Test' },
    { commercialName: 'Bulk LPG Storage Tank 25 m³',           modelNo: 'BLPG-25M3',     materialType: 'Bulk Storage Tank',       testingLabs: 'Bureau Veritas',                certificationBody: 'TÜV NORD',           intlSafetyCertNo: 'COC-BLPG25-2024-301',  manufacturerCountry: 'United Arab Emirates', labInspectionType: 'Pressure Vessel · ASME U' },
    { commercialName: 'Mass-Flow Gas Meter MFG-080',           modelNo: 'MFG-080-CR',    materialType: 'Gas Meter',               testingLabs: 'Emirates Metrology Institute',  certificationBody: 'NMi Certin',         intlSafetyCertNo: 'COC-MFG080-2024-422',  manufacturerCountry: 'Netherlands',     labInspectionType: 'MID Module B+D' },
    { commercialName: 'Composite LPG Cylinder 12 kg',          modelNo: 'CLPG-12-AC',    materialType: 'LPG Cylinder',            testingLabs: 'SGS Gulf',                      certificationBody: 'TÜV SÜD',            intlSafetyCertNo: 'COC-CLPG12-2024-118',  manufacturerCountry: 'Norway',          labInspectionType: 'Type Examination · ADR' },
    { commercialName: 'Pipeline Welding Fittings — Carbon Steel', modelNo: 'PWF-CS-A234', materialType: 'Pipeline Fitting',     testingLabs: 'Intertek Caleb Brett',          certificationBody: 'API',                intlSafetyCertNo: 'COC-PWFCS-2024-505',   manufacturerCountry: 'India',           labInspectionType: 'PMI + UT Mill Test' },
    { commercialName: 'Gas Leak Detector GLD-X4 Wireless',     modelNo: 'GLD-X4-WL',     materialType: 'Gas Detector',            testingLabs: 'TÜV Rheinland',                 certificationBody: 'CSA Group',          intlSafetyCertNo: 'COC-GLDX4-2024-077',   manufacturerCountry: 'Canada',          labInspectionType: 'Type Examination · ATEX Zone 1' },
    { commercialName: 'Cylinder Manifold Bank 4×80 kg',        modelNo: 'CMB-4X80',      materialType: 'Cylinder Manifold',       testingLabs: 'Bureau Veritas',                certificationBody: 'TÜV NORD',           intlSafetyCertNo: 'COC-CMB4X80-2024-220', manufacturerCountry: 'United Arab Emirates', labInspectionType: 'Hydrostatic Test · ASME' },
    { commercialName: 'Pressure Relief Valve PRV-200',         modelNo: 'PRV-200-SS',    materialType: 'Relief Valve',            testingLabs: 'SGS Gulf',                      certificationBody: 'DEKRA',              intlSafetyCertNo: 'COC-PRV200-2024-339',  manufacturerCountry: 'Germany',         labInspectionType: 'Type Examination · PED' },
    { commercialName: 'Medical Gas Outlet Station MGOS-O2',    modelNo: 'MGOS-O2-DIN',   materialType: 'Medical Gas Outlet',       testingLabs: 'Intertek Caleb Brett',          certificationBody: 'BSI',                intlSafetyCertNo: 'COC-MGOSO2-2024-094',  manufacturerCountry: 'France',          labInspectionType: 'Type Examination · ISO 7396-1' },
    { commercialName: 'Tanker Loading Arm 4-inch Bottom',      modelNo: 'TLA-4BTM',      materialType: 'Loading Arm',             testingLabs: 'Bureau Veritas',                certificationBody: 'API',                intlSafetyCertNo: 'COC-TLA4-2024-455',    manufacturerCountry: 'United States',   labInspectionType: 'Pressure Test + NDT' },
    { commercialName: 'Inert Gas Bullet 60 m³ (Nitrogen)',     modelNo: 'IGB-60-N2',     materialType: 'Inert Gas Bullet',        testingLabs: 'TÜV NORD',                      certificationBody: 'Bureau Veritas',     intlSafetyCertNo: 'COC-IGB60-2024-180',   manufacturerCountry: 'Italy',           labInspectionType: 'ASME U2 + PED' },
    { commercialName: 'Pipeline Coating Tape — Anti-Corrosion',modelNo: 'PCT-AC-50',     materialType: 'Coating / Tape',          testingLabs: 'SGS Gulf',                      certificationBody: 'TÜV SÜD',            intlSafetyCertNo: 'COC-PCTAC-2024-066',   manufacturerCountry: 'South Korea',     labInspectionType: 'Adhesion + Holiday Test' },
  ];

  // Build the per-application materials list deterministically.
  function maesMaterials(i: number, requestedCount: number, latestExpiryISO: string): import('../types').MaesMaterial[] {
    const count = Math.max(3, Math.min(MAES_MATERIAL_CATALOG.length, requestedCount));
    const baseLatest = new Date(latestExpiryISO);
    const out: import('../types').MaesMaterial[] = [];
    for (let k = 0; k < count; k++) {
      const cat = MAES_MATERIAL_CATALOG[(i * 3 + k) % MAES_MATERIAL_CATALOG.length];
      // Spread expiry dates between (latest − 18 months) and latest; one row hits exactly latest.
      const monthsBack = k === 0 ? 0 : ((k * 5 + i) % 18);
      const d = new Date(baseLatest);
      d.setMonth(d.getMonth() - monthsBack);
      out.push({
        id: nanoid(),
        ...cat,
        expiryDate: d.toISOString().slice(0, 10),
        status: 'active',
      });
    }
    return out;
  }

  function maesFieldValues(i: number): Record<string, string> {
    const a = maesApplicants[i % maesApplicants.length];
    return {
      // Main info (Issuance)
      applicantType: a.type,
      applicationDate: `2026-${String(((i % 5) + 1)).padStart(2, '0')}-${String(((i % 27) + 1)).padStart(2, '0')}`,
      activityArea: 'Abu Dhabi Emirate',
      fileNumber: `MAES-FILE-${10000 + i * 13}`,
      businessName: a.biz,
      tradeLicence: a.lic,
      licensedBy: 'Abu Dhabi Department of Economic Development',
      businessStartDate: `201${(i % 9) + 1}-0${(i % 9) + 1}-15`,
      businessType: 'Limited Liability Company',
      representativeName: a.rep,
      nationality: 'United Arab Emirates',
      mobile: a.mobile,
      address: a.addr,
      addressDetail: `${a.addr}, P.O. Box ${4000 + i * 17}`,
      phone: a.mobile,
      email: a.email,
      fax: `+971 2 555 80${String(i % 100).padStart(2, '0')}`,
      poBox: `${4000 + i * 17}`,
      establishmentDate: `201${(i % 9) + 1}-0${(i % 9) + 1}-15`,
      // Renewal / Modify references to the active MAES being acted on
      maesNumber: `MAES-CERT-2024-${20000 + i * 19}`,
      currentExpiry: '2027-02-28',
      // Systems & equipments roll-up
      equipmentCount: String(a.equipmentCount),
      maxExpiryDate: a.maxExpiry,
      addedCount: String((i % 3) + 1),
      updatedCount: String((i % 4) + 1),
      removedCount: String(i % 2),
      // Modification / Cancellation / Revocation context
      modificationType: i % 3 === 0 ? 'add,update' : i % 3 === 1 ? 'update' : 'add,update,remove',
      modificationReason: 'Add new flame-arrestor models (ATEX 2024 update) and refresh expiry dates on three existing pressure regulators per OEM bulletin.',
      cancellationScope: i % 2 === 0 ? 'partial' : 'full',
      cancellationReason: 'Selected material lines discontinued by the OEM; replacement parts will be filed under a separate modification once available.',
      revocationScope: i % 2 === 0 ? 'partial' : 'full',
      revocationReason: 'Random spot-check inspection found two material lines failing the Unified Gas Code clause 4.3 compliance threshold; certificate suspended pending corrective action.',
      totalMaterials: String(a.equipmentCount),
      cancelledCount: String(Math.max(1, Math.floor(a.equipmentCount / 4))),
      remainingCount: String(a.equipmentCount - Math.max(1, Math.floor(a.equipmentCount / 4))),
      revokedCount: String(Math.max(1, Math.floor(a.equipmentCount / 5))),
      renewalChanges: 'Re-tested 3 pressure regulators and 2 emergency shut-off valves under updated TÜV NORD protocol; OEM compliance sheets refreshed.',
    };
  }

  function nocFieldValues(i: number): Record<string, string> {
    const p = nocPremises[i % nocPremises.length];
    return {
      nocType: p.type, premisesName: p.name, premisesType: p.ptype, buildingNo: p.bld,
      emirate: 'Abu Dhabi', city: p.city, area: p.area, sector: p.sector, plotNo: p.plot, coordinates: p.coords,
      ownerName: 'Mohammed Al Mansouri', ownerEid: '784-1985-1234567-1', ownerContact: '+971 50 700 8801',
      projectConsultant: 'AECOM Middle East',
      installContractor: p.install, amcContractor: p.amc,
      emergencyContact: 'ops@premises.ae · +971 50 700 9999',
      tpiCompany: 'Bureau Veritas Middle East', tpiCocRef: `TPI-CoC-${2024 + (i % 3)}-${1000 + i * 7}`, tpiCocIssueDate: `2025-${String(((i % 12) + 1)).padStart(2, '0')}-15`,
      gasSystemType: p.gasType, gasMedium: p.medium, gasSupplyCompany: p.supply,
      fmCompany: p.fm, fmContact: p.fmContact,
      // For Cancel/Revoke
      cancellationReason: 'Premises operations discontinued — gas system decommissioned per board resolution dated 2026-04-15.',
      revocationReason: 'TPI CoC renewal lapsed; AMC contract expired and not renewed within mandated 30-day window.',
    };
  }

  // Extra company profiles for richer seed data
  const extraCompanies = [
    { name: 'Falcon Gas Engineering LLC',       permit: 'CN-3382044', owner: 'Rashid Al Mansouri', address: 'Plot 27, ICAD-III, Abu Dhabi' },
    { name: 'Delta Petroleum Services',          permit: 'CN-5510221', owner: 'Yusuf Khan',           address: 'M-12 Mussafah, Abu Dhabi' },
    { name: 'Omega Pipeline Contractors',        permit: 'CN-7782104', owner: 'Mariam Al Suwaidi',   address: 'KIZAD South, Abu Dhabi' },
    { name: 'Nile Industrial Gas Co.',           permit: 'CN-6610884', owner: 'Sherif El-Sayed',     address: 'ICAD-II, Plot 14B, Abu Dhabi' },
    { name: 'Horizon Energy Services',           permit: 'CN-4490213', owner: 'Aisha Al Dhaheri',    address: 'Hamdan Street, Abu Dhabi' },
    { name: 'Polaris Gas Solutions',             permit: 'CN-2207754', owner: 'Vikram Iyer',         address: 'Khalifa Industrial Zone, Abu Dhabi' },
    { name: 'Atlas Petrochemical Works',         permit: 'CN-9981203', owner: 'Layla Al Hammadi',    address: 'Ruwais Industrial Complex' },
    { name: 'Crescent Gas & Allied Services',    permit: 'CN-1118092', owner: 'Hamdan Al Otaiba',    address: 'Al Bahia, Abu Dhabi' },
    { name: 'Pearl Industrial Consulting',       permit: 'CN-8845121', owner: 'Noura Al Falasi',     address: 'Capital Gate, Abu Dhabi' },
    { name: 'Sapphire Petroleum Logistics',      permit: 'CN-3349902', owner: 'Tarek Bin Hamad',     address: 'Mussafah ME-44' },
    { name: 'Vertex Gas Inspection LLC',         permit: 'CN-5567103', owner: 'Reema Al Marri',      address: 'Yas South Industrial' },
    { name: 'Sunrise Energy Audit Co.',          permit: 'CN-1209331', owner: 'Mohammad Khalil',     address: 'Reem Island, Abu Dhabi' },
  ];

  function company(i: number, baseFrom: typeof acme.company) {
    const e = extraCompanies[i % extraCompanies.length];
    return { ...baseFrom!, name: e.name, tradePermitNumber: e.permit, ownerName: e.owner, address: e.address };
  }

  function appNo(prefix: string, year: number) {
    return `${prefix}-${year}-${Math.floor(Math.random() * 9000 + 1000)}`;
  }

  // Build the application-number prefix per service: GSO-ISS, GSO-RNW, GSO-MOD, GSO-CAN, GSO-REV, HOE-ISS
  function prefixFor(svcId: string) {
    const [mod, act] = svcId.split('.');
    const m =
      mod === 'gas' ? 'GSO' :
      mod === 'hoe' ? 'HOE' :
      mod === 'noc' ? 'NOC' :
      mod === 'amc' ? 'AMC' :
      mod === 'coc' ? 'COC' :
      mod === 'maes' ? 'MAES' :
      mod.toUpperCase();
    const a = act.toUpperCase().slice(0, 3);
    return `${m}-${a}`;
  }
  function feeFor(svcId: string) {
    switch (svcId) {
      case 'gas.issue':  return 5000;
      case 'gas.renew':  return 5000;
      case 'gas.modify': return 3000;
      case 'gas.cancel': return 1000;
      case 'gas.revoke': return 0;
      case 'hoe.issue':  return 4500;
      case 'hoe.renew':  return 4500;
      case 'hoe.modify': return 2500;
      // AMC fees are configurable per SDD §2.6.4 — currently 0 AED for go-live.
      case 'amc.issue':  return 0;
      case 'amc.renew':  return 0;
      case 'amc.modify': return 0;
      case 'amc.cancel': return 0;
      case 'amc.revoke': return 0;
      case 'hoe.cancel': return 800;
      case 'hoe.revoke': return 0;
      case 'noc.renew':  return 0;
      case 'noc.cancel': return 0;
      case 'noc.revoke': return 0;
      // COC fees are configurable per COC SDD §1.6.3 / §2.6.4 — currently 0 AED.
      case 'coc.modify': return 0;
      case 'coc.cancel': return 0;
      // MAES fees are configurable per MAES Enhancements SDD — currently 0 AED pending ADEO approval.
      case 'maes.issue':  return 0;
      case 'maes.renew':  return 0;
      case 'maes.modify': return 0;
      case 'maes.cancel': return 0;
      case 'maes.revoke': return 0;
      default:           return 4500;
    }
  }

  // Build generator
  function mk(
    svcId: 'gas.issue' | 'gas.renew' | 'gas.modify' | 'gas.cancel' | 'gas.revoke' |
           'hoe.issue' | 'hoe.renew' | 'hoe.modify' | 'hoe.cancel' | 'hoe.revoke' |
           'noc.renew' | 'noc.cancel' | 'noc.revoke' |
           'amc.issue' | 'amc.renew' | 'amc.modify' | 'amc.cancel' | 'amc.revoke' |
           'coc.modify' | 'coc.cancel' |
           'maes.issue' | 'maes.renew' | 'maes.modify' | 'maes.cancel' | 'maes.revoke',
    state: string,
    category: 'A' | 'B' | 'C' | 'D',
    applicant: User,
    daysOld: number,
    overrides: Partial<Application> = {},
    coIdx?: number,
  ): Application {
    const cycleYear = new Date(ago(daysOld)).getFullYear();
    const isPaid = state === 'issued';
    const isApproved = state === 'approved' || state === 'issued';
    const slaDue = state.startsWith('pending') ? fwd(Math.max(-3, Math.floor(Math.random() * 25) - 5)) : ago(0);
    const companyOverride = coIdx != null ? company(coIdx, applicant.company) : applicant.company!;
    const isNoc = svcId.startsWith('noc.');
    const isAmc = svcId.startsWith('amc.');
    const isCoc = svcId.startsWith('coc.');
    const isMaes = svcId.startsWith('maes.');
    // MAES — generate the per-material rows; apply per-state lifecycle status
    // (partial-cancellation rows tagged 'cancelled', partial-revocation rows
    // tagged 'revoked', full-cancel marks every row, etc.).
    let maesMaterialsForApp: import('../types').MaesMaterial[] | undefined;
    if (isMaes) {
      const idx = coIdx ?? 0;
      const applicant = maesApplicants[idx % maesApplicants.length];
      maesMaterialsForApp = maesMaterials(idx, applicant.equipmentCount, applicant.maxExpiry);
      const totalRows = maesMaterialsForApp.length;
      const isFullCancel = svcId === 'maes.cancel' && (idx % 2 !== 0); // matches `cancellationScope: full`
      const isFullRevoke = svcId === 'maes.revoke' && (idx % 2 !== 0);
      const isPartialCancel = svcId === 'maes.cancel' && !isFullCancel;
      const isPartialRevoke = svcId === 'maes.revoke' && !isFullRevoke;
      if (state === 'issued' && (svcId === 'maes.cancel' || svcId === 'maes.revoke')) {
        if (isFullCancel) maesMaterialsForApp.forEach((m) => (m.status = 'cancelled'));
        if (isFullRevoke) maesMaterialsForApp.forEach((m) => (m.status = 'revoked'));
        if (isPartialCancel) {
          const cancelN = Math.max(1, Math.floor(totalRows / 4));
          for (let k = 0; k < cancelN; k++) maesMaterialsForApp[k].status = 'cancelled';
        }
        if (isPartialRevoke) {
          const revokeN = Math.max(1, Math.floor(totalRows / 5));
          for (let k = 0; k < revokeN; k++) maesMaterialsForApp[k].status = 'revoked';
        }
      } else if (svcId === 'maes.renew' && state !== 'issued') {
        // Mark a couple of rows as pending renewal for visualization on returned / pending apps.
        for (let k = 0; k < Math.min(2, totalRows); k++) maesMaterialsForApp[k].status = 'pending-renewal';
      }
    }
    return {
      id: nanoid(),
      applicationNumber: appNo(prefixFor(svcId), cycleYear),
      serviceId: svcId,
      module: isMaes ? 'maes' : isCoc ? 'coc' : isAmc ? 'amc' : isNoc ? 'noc' : svcId.startsWith('gas.') ? 'gas' : 'hoe',
      fieldValues: isMaes ? maesFieldValues(coIdx ?? 0) : isCoc ? cocFieldValues(coIdx ?? 0) : isNoc ? nocFieldValues(coIdx ?? 0) : isAmc ? amcFieldValues(coIdx ?? 0) : undefined,
      materials: maesMaterialsForApp,
      state: state as any,
      category,
      applicantUserId: applicant.id,
      company: companyOverride,
      workshopAddress: companyOverride.address,
      areaOfOperations: 'Abu Dhabi Emirate',
      attachments: [],
      technicalStaff: [],
      referenceProjects: [],
      submittedOn: ago(daysOld),
      slaDueDate: slaDue,
      approvedOn: isApproved ? ago(Math.max(1, daysOld - 20)) : undefined,
      feePaid: isPaid,
      feeReceipt: isPaid ? { receiptNumber: `RC-${cycleYear}-${Math.floor(Math.random()*90000+10000)}`, paidAt: ago(Math.max(1, daysOld - 22)), amount: feeFor(svcId) } : undefined,
      certificate: state === 'issued' ? { number: `${prefixFor(svcId)}-CERT-${cycleYear}-${Math.floor(Math.random()*90000+10000)}`, issuedAt: ago(Math.max(1, daysOld - 22)), expiresAt: fwd(365 - (daysOld - 22)) } : undefined,
      timeline: [mkTimeline(applicant, 'Submit', 'pending_engineer', daysOld)],
      createdAt: ago(daysOld),
      updatedAt: ago(Math.max(0, daysOld - 5)),
      ...overrides,
    };
  }

  return [
    // ============ Gas applications (4) ============
    {
      id: nanoid(),
      applicationNumber: `GSO-2026-${Math.floor(Math.random() * 9000 + 1000)}`,
      serviceId: 'gas.issue',
      module: 'gas',
      state: 'pending_engineer',
      category: 'B',
      applicantUserId: acme.id,
      company: acme.company!,
      branchAddress: 'Plot 14, Khalifa Industrial Zone',
      workshopAddress: 'M-44 Mussafah Industrial Area, Workshop 12 & 13',
      areaOfOperations: 'Abu Dhabi Emirate — building installation, maintenance & filling stations',
      attachments: [
        sampleAttachment('articlesOfAssociation', 'Articles_of_Association_signed.pdf', acme.id),
        sampleAttachment('officeContract', 'Office_Tenancy_Contract_2025.pdf', acme.id),
        sampleAttachment('workshopContract', 'Workshop_Tenancy_M44.pdf', acme.id),
        sampleAttachment('adcdaIstifa', 'ADCDA_ISTIFAA_Certificate.pdf', acme.id),
        sampleAttachment('molList', 'MoL_Employee_List_Mar2025.xlsx', acme.id),
        sampleAttachment('orgChart', 'Org_Chart_2025.pdf', acme.id),
        sampleAttachment('assetRegister', 'Asset_Register_Tools_2025.xlsx', acme.id),
      ],
      technicalStaff: [],
      referenceProjects: [],
      submittedOn: ago(2),
      slaDueDate: fwd(20),
      timeline: [mkTimeline(acme, 'Submit', 'pending_engineer', 2)],
      createdAt: ago(2),
      updatedAt: ago(2),
    },
    {
      id: nanoid(),
      applicationNumber: `GSO-2026-${Math.floor(Math.random() * 9000 + 1000)}`,
      serviceId: 'gas.issue',
      module: 'gas',
      state: 'returned_to_applicant',
      category: 'A',
      applicantUserId: blue.id,
      company: blue.company!,
      workshopAddress: 'ICAD-II, Plot 7B, Abu Dhabi',
      areaOfOperations: 'Abu Dhabi Emirate',
      attachments: [],
      technicalStaff: [],
      referenceProjects: [],
      submittedOn: ago(60),
      slaDueDate: fwd(0),
      timeline: [mkTimeline(blue, 'Submit', 'pending_engineer', 60), mkTimeline(blue, 'Return for Modification', 'returned_to_applicant', 45)],
      createdAt: ago(60),
      updatedAt: ago(45),
    },
    {
      id: nanoid(),
      applicationNumber: `GSO-2025-${Math.floor(Math.random() * 9000 + 1000)}`,
      serviceId: 'gas.issue',
      module: 'gas',
      state: 'issued',
      category: 'C',
      applicantUserId: acme.id,
      company: {
        ...acme.company!,
        name: 'Smart Gas Service Sole Establishment',
        tradePermitNumber: 'CN-4692740',
      },
      workshopAddress: 'M-22 Mussafah',
      areaOfOperations: 'Abu Dhabi Emirate',
      attachments: [],
      technicalStaff: [],
      referenceProjects: [],
      submittedOn: ago(120),
      approvedOn: ago(70),
      slaDueDate: ago(95),
      feePaid: true,
      feeReceipt: { receiptNumber: 'RC-2025-44210', paidAt: ago(70), amount: 5000 },
      certificate: { number: 'GSO-CERT-2025-32104', issuedAt: ago(70), expiresAt: fwd(295) },
      timeline: [mkTimeline(acme, 'Submit', 'pending_engineer', 120)],
      createdAt: ago(120),
      updatedAt: ago(70),
    },
    {
      id: nanoid(),
      applicationNumber: `GSO-2025-${Math.floor(Math.random() * 9000 + 1000)}`,
      serviceId: 'gas.issue',
      module: 'gas',
      state: 'issued',
      category: 'D',
      applicantUserId: blue.id,
      company: blue.company!,
      workshopAddress: 'ICAD-II',
      areaOfOperations: 'Abu Dhabi Emirate',
      attachments: [],
      technicalStaff: [],
      referenceProjects: [],
      submittedOn: ago(180),
      approvedOn: ago(150),
      slaDueDate: ago(165),
      feePaid: true,
      feeReceipt: { receiptNumber: 'RC-2025-32905', paidAt: ago(150), amount: 5000 },
      certificate: { number: 'GSO-CERT-2025-12044', issuedAt: ago(150), expiresAt: fwd(215) },
      timeline: [mkTimeline(blue, 'Submit', 'pending_engineer', 180)],
      createdAt: ago(180),
      updatedAt: ago(150),
    },

    // ============ HOE applications (4) ============
    {
      id: nanoid(),
      applicationNumber: `HOE-2026-${Math.floor(Math.random() * 9000 + 1000)}`,
      serviceId: 'hoe.issue',
      module: 'hoe',
      state: 'pending_engineer',
      category: 'A',
      applicantUserId: fatima.id,
      company: fatima.company!,
      workshopAddress: 'Tower B-22, Al Maryah Island',
      areaOfOperations: 'Abu Dhabi Emirate · Design & supervision',
      attachments: [],
      technicalStaff: [],
      referenceProjects: [],
      submittedOn: ago(4),
      slaDueDate: fwd(2),
      timeline: [mkTimeline(fatima, 'Submit', 'pending_engineer', 4)],
      createdAt: ago(4),
      updatedAt: ago(4),
    },
    {
      id: nanoid(),
      applicationNumber: `HOE-2026-${Math.floor(Math.random() * 9000 + 1000)}`,
      serviceId: 'hoe.issue',
      module: 'hoe',
      state: 'returned_to_applicant',
      category: 'B',
      applicantUserId: blue.id,
      company: { ...blue.company!, name: 'Emirates PetroVehicles Consultancy', tradePermitNumber: 'CN-77820114' },
      workshopAddress: 'ICAD-II',
      areaOfOperations: 'Inspection services',
      attachments: [],
      technicalStaff: [],
      referenceProjects: [],
      submittedOn: ago(60),
      slaDueDate: fwd(0),
      timeline: [mkTimeline(blue, 'Submit', 'pending_engineer', 60)],
      createdAt: ago(60),
      updatedAt: ago(35),
    },
    {
      id: nanoid(),
      applicationNumber: `HOE-2026-${Math.floor(Math.random() * 9000 + 1000)}`,
      serviceId: 'hoe.issue',
      module: 'hoe',
      state: 'approved',
      category: 'C',
      applicantUserId: acme.id,
      company: { ...acme.company!, name: 'Gulf Storage Experts LLC', tradePermitNumber: 'CN-4692740' },
      workshopAddress: 'Mussafah',
      areaOfOperations: 'Storage facilities audit',
      attachments: [],
      technicalStaff: [],
      referenceProjects: [],
      submittedOn: ago(60),
      approvedOn: ago(8),
      timeline: [mkTimeline(acme, 'Submit', 'pending_engineer', 60)],
      createdAt: ago(60),
      updatedAt: ago(8),
    },
    {
      id: nanoid(),
      applicationNumber: `HOE-2026-${Math.floor(Math.random() * 9000 + 1000)}`,
      serviceId: 'hoe.issue',
      module: 'hoe',
      state: 'issued',
      category: 'A',
      applicantUserId: blue.id,
      company: { ...blue.company!, name: 'Al Noor Engineering Consultants', tradePermitNumber: 'CN-66103298' },
      workshopAddress: 'ICAD-I',
      areaOfOperations: 'Design & consultancy',
      attachments: [],
      technicalStaff: [],
      referenceProjects: [],
      submittedOn: ago(60),
      approvedOn: ago(20),
      feePaid: true,
      feeReceipt: { receiptNumber: 'RC-2026-12001', paidAt: ago(18), amount: 4500 },
      certificate: { number: 'HOE-CERT-2026-3001', issuedAt: ago(18), expiresAt: fwd(347) },
      timeline: [mkTimeline(blue, 'Submit', 'pending_engineer', 60)],
      createdAt: ago(60),
      updatedAt: ago(18),
    },

    // ============ Additional Gas applications (18 more) ============
    mk('gas.issue', 'pending_engineer',     'A', acme,    1,   {}, 0),
    mk('gas.issue', 'pending_engineer',     'B', blue,    3,   {}, 1),
    mk('gas.issue', 'pending_engineer',     'D', fatima,  6,   {}, 11),
    mk('gas.issue', 'pending_section_head', 'C', fatima,  10,  {}, 2),
    mk('gas.issue', 'pending_section_head', 'A', blue,    14,  {}, 10),
    mk('gas.issue', 'pending_director',     'A', acme,    18,  {}, 3),
    mk('gas.issue', 'pending_director',     'B', blue,    21,  {}, 4),
    mk('gas.issue', 'pending_director',     'C', fatima,  25,  {}, 9),
    mk('gas.issue', 'returned_to_applicant','C', acme,    35,  {}, 5),
    mk('gas.issue', 'returned_to_applicant','D', fatima,  42,  {}, 6),
    mk('gas.issue', 'returned_to_applicant','B', blue,    50,  {}, 8),
    mk('gas.issue', 'fee_pending',          'B', blue,    55,  {}, 7),
    mk('gas.issue', 'fee_pending',          'A', acme,    62,  {}, 8),
    mk('gas.issue', 'approved',             'A', acme,    78,  {}, 9),
    mk('gas.issue', 'issued',               'B', fatima,  95,  {}, 10),
    mk('gas.issue', 'issued',               'A', blue,    105, {}, 5),
    mk('gas.issue', 'issued',               'C', acme,    140, {}, 2),
    mk('gas.issue', 'rejected',             'D', blue,    110, {}, 11),

    // ============ Additional HOE applications (18 more) ============
    mk('hoe.issue', 'pending_engineer',     'A', fatima,  2,   {}, 11),
    mk('hoe.issue', 'pending_engineer',     'B', blue,    5,   {}, 10),
    mk('hoe.issue', 'pending_engineer',     'C', acme,    8,   {}, 0),
    mk('hoe.issue', 'pending_section_head', 'C', acme,    12,  {}, 9),
    mk('hoe.issue', 'pending_section_head', 'A', fatima,  15,  {}, 1),
    mk('hoe.issue', 'pending_director',     'A', fatima,  16,  {}, 8),
    mk('hoe.issue', 'pending_director',     'D', blue,    22,  {}, 7),
    mk('hoe.issue', 'pending_director',     'B', acme,    28,  {}, 2),
    mk('hoe.issue', 'returned_to_applicant','A', acme,    40,  {}, 6),
    mk('hoe.issue', 'returned_to_applicant','B', fatima,  48,  {}, 5),
    mk('hoe.issue', 'returned_to_applicant','D', blue,    58,  {}, 3),
    mk('hoe.issue', 'fee_pending',          'C', blue,    52,  {}, 4),
    mk('hoe.issue', 'fee_pending',          'A', acme,    65,  {}, 3),
    mk('hoe.issue', 'approved',             'B', fatima,  72,  {}, 2),
    mk('hoe.issue', 'issued',               'C', acme,    88,  {}, 1),
    mk('hoe.issue', 'issued',               'A', fatima,  130, {}, 6),
    mk('hoe.issue', 'issued',               'B', blue,    155, {}, 9),
    mk('hoe.issue', 'rejected',             'D', blue,    120, {}, 0),

    // ============ Gas RENEWAL applications ============
    mk('gas.renew', 'pending_engineer',     'A', acme,    2,   {}, 0),
    mk('gas.renew', 'pending_engineer',     'B', fatima,  5,   {}, 7),
    mk('gas.renew', 'pending_section_head', 'B', blue,    12,  {}, 1),
    mk('gas.renew', 'pending_director',     'C', acme,    18,  {}, 2),
    mk('gas.renew', 'returned_to_applicant','A', fatima,  25,  {}, 3),
    mk('gas.renew', 'fee_pending',          'D', blue,    32,  {}, 4),
    mk('gas.renew', 'issued',               'B', acme,    65,  {}, 5),
    mk('gas.renew', 'rejected',             'C', fatima,  90,  {}, 6),

    // ============ Gas MODIFICATION applications ============
    mk('gas.modify', 'pending_engineer',     'B', fatima,  3,   {}, 8),
    mk('gas.modify', 'pending_engineer',     'A', acme,    7,   {}, 9),
    mk('gas.modify', 'pending_section_head', 'C', blue,    14,  {}, 10),
    mk('gas.modify', 'pending_director',     'B', fatima,  22,  {}, 11),
    mk('gas.modify', 'returned_to_applicant','A', acme,    40,  {}, 0),
    mk('gas.modify', 'fee_pending',          'D', blue,    50,  {}, 1),
    mk('gas.modify', 'issued',               'B', fatima,  85,  {}, 2),

    // ============ Gas CANCELLATION applications ============
    mk('gas.cancel', 'pending_engineer',     'A', acme,    1,   {}, 3),
    mk('gas.cancel', 'pending_section_head', 'C', blue,    9,   {}, 4),
    mk('gas.cancel', 'pending_director',     'B', fatima,  17,  {}, 5),
    mk('gas.cancel', 'returned_to_applicant','A', acme,    30,  {}, 6),
    mk('gas.cancel', 'fee_pending',          'D', blue,    45,  {}, 7),
    mk('gas.cancel', 'issued',               'B', fatima,  75,  {}, 8),
    mk('gas.cancel', 'rejected',             'A', acme,    100, {}, 9),

    // ============ Gas REVOCATION (DOE-initiated) applications ============
    mk('gas.revoke', 'pending_section_head', 'A', acme,    2,   {}, 10),
    mk('gas.revoke', 'pending_section_head', 'B', blue,    6,   {}, 11),
    mk('gas.revoke', 'pending_director',     'C', fatima,  15,  {}, 0),
    mk('gas.revoke', 'returned_to_engineer', 'B', blue,    28,  {}, 1),
    mk('gas.revoke', 'returned_to_section_head', 'A', acme, 38, {}, 2),
    mk('gas.revoke', 'issued',               'D', fatima,  60,  {}, 3),
    mk('gas.revoke', 'rejected',             'C', blue,    95,  {}, 4),

    // ============ HOE RENEWAL applications ============
    mk('hoe.renew', 'pending_engineer',     'A', fatima,  2,   {}, 8),
    mk('hoe.renew', 'pending_engineer',     'B', acme,    5,   {}, 9),
    mk('hoe.renew', 'pending_section_head', 'C', blue,    12,  {}, 10),
    mk('hoe.renew', 'pending_director',     'A', fatima,  18,  {}, 11),
    mk('hoe.renew', 'returned_to_applicant','B', acme,    25,  {}, 0),
    mk('hoe.renew', 'fee_pending',          'C', blue,    32,  {}, 1),
    mk('hoe.renew', 'issued',               'A', fatima,  65,  {}, 2),
    mk('hoe.renew', 'rejected',             'B', acme,    90,  {}, 3),

    // ============ HOE MODIFICATION applications ============
    mk('hoe.modify', 'pending_engineer',     'A', acme,    3,   {}, 4),
    mk('hoe.modify', 'pending_engineer',     'B', fatima,  7,   {}, 5),
    mk('hoe.modify', 'pending_section_head', 'C', blue,    14,  {}, 6),
    mk('hoe.modify', 'pending_director',     'B', acme,    22,  {}, 7),
    mk('hoe.modify', 'returned_to_applicant','A', fatima,  40,  {}, 8),
    mk('hoe.modify', 'fee_pending',          'C', blue,    50,  {}, 9),
    mk('hoe.modify', 'issued',               'A', acme,    85,  {}, 10),

    // ============ HOE CANCELLATION applications ============
    mk('hoe.cancel', 'pending_engineer',     'A', fatima,  1,   {}, 11),
    mk('hoe.cancel', 'pending_section_head', 'C', acme,    9,   {}, 0),
    mk('hoe.cancel', 'pending_director',     'B', blue,    17,  {}, 1),
    mk('hoe.cancel', 'returned_to_applicant','A', fatima,  30,  {}, 2),
    mk('hoe.cancel', 'fee_pending',          'C', acme,    45,  {}, 3),
    mk('hoe.cancel', 'issued',               'B', blue,    75,  {}, 4),
    mk('hoe.cancel', 'rejected',             'A', fatima,  100, {}, 5),

    // ============ HOE REVOCATION (DOE-initiated) applications ============
    mk('hoe.revoke', 'pending_section_head', 'A', acme,    2,   {}, 6),
    mk('hoe.revoke', 'pending_section_head', 'B', blue,    6,   {}, 7),
    mk('hoe.revoke', 'pending_director',     'C', fatima,  15,  {}, 8),
    mk('hoe.revoke', 'returned_to_engineer', 'B', blue,    28,  {}, 9),
    mk('hoe.revoke', 'returned_to_section_head', 'A', acme, 38, {}, 10),
    mk('hoe.revoke', 'issued',               'C', fatima,  60,  {}, 11),
    mk('hoe.revoke', 'rejected',             'B', blue,    95,  {}, 0),

    // ============ NOC RENEWAL applications (premises-level) ============
    mk('noc.renew', 'pending_engineer',     'A', acme,    2,   {}, 0),
    mk('noc.renew', 'pending_engineer',     'B', fatima,  6,   {}, 1),
    mk('noc.renew', 'pending_approver',     'A', blue,    14,  {}, 2),
    mk('noc.renew', 'returned_to_applicant','C', acme,    25,  {}, 3),
    mk('noc.renew', 'returned_to_engineer', 'A', fatima,  35,  {}, 4),
    mk('noc.renew', 'fee_pending',          'B', blue,    50,  {}, 5),
    mk('noc.renew', 'issued',               'A', acme,    72,  {}, 6),
    mk('noc.renew', 'rejected',             'C', fatima,  95,  {}, 7),

    // ============ NOC CANCELLATION applications ============
    mk('noc.cancel', 'pending_engineer',     'A', acme,    3,   {}, 8),
    mk('noc.cancel', 'pending_approver',     'C', blue,    10,  {}, 9),
    mk('noc.cancel', 'returned_to_applicant','B', fatima,  22,  {}, 10),
    mk('noc.cancel', 'fee_pending',          'A', acme,    44,  {}, 11),
    mk('noc.cancel', 'issued',               'C', blue,    68,  {}, 0),
    mk('noc.cancel', 'rejected',             'B', fatima,  92,  {}, 1),

    // ============ NOC REVOCATION (DOE-initiated) applications ============
    mk('noc.revoke', 'pending_section_head', 'A', acme,    1,   {}, 2),
    mk('noc.revoke', 'pending_section_head', 'C', blue,    5,   {}, 3),
    mk('noc.revoke', 'returned_to_engineer', 'B', fatima,  18,  {}, 4),
    mk('noc.revoke', 'issued',               'A', acme,    45,  {}, 5),
    mk('noc.revoke', 'rejected',             'C', blue,    80,  {}, 6),

    // ============ AMC ISSUANCE applications ============
    mk('amc.issue', 'pending_engineer',           'A', acme,    1,   {}, 0),
    mk('amc.issue', 'pending_engineer',           'B', fatima,  4,   {}, 1),
    mk('amc.issue', 'pending_section_head',       'A', blue,    9,   {}, 2),
    mk('amc.issue', 'pending_director',           'C', acme,    16,  {}, 3),
    mk('amc.issue', 'returned_to_applicant',      'B', fatima,  24,  {}, 4),
    mk('amc.issue', 'fee_pending',                'A', blue,    40,  {}, 5),
    mk('amc.issue', 'pending_owner_signature',    'A', acme,    50,  {}, 6),
    mk('amc.issue', 'pending_company_signature', 'C', fatima,  58,  {}, 7),
    mk('amc.issue', 'issued',                     'A', blue,    85,  {}, 8),
    mk('amc.issue', 'rejected',                   'B', acme,   105,  {}, 9),

    // ============ AMC RENEWAL applications ============
    mk('amc.renew', 'pending_engineer',           'A', fatima,  2,   {}, 10),
    mk('amc.renew', 'pending_section_head',       'B', acme,    7,   {}, 11),
    mk('amc.renew', 'pending_director',           'C', blue,    14,  {}, 0),
    mk('amc.renew', 'returned_to_applicant',      'A', fatima,  22,  {}, 1),
    mk('amc.renew', 'fee_pending',                'B', acme,    38,  {}, 2),
    mk('amc.renew', 'pending_owner_signature',    'A', blue,    45,  {}, 3),
    mk('amc.renew', 'issued',                     'A', fatima,  72,  {}, 4),
    mk('amc.renew', 'rejected',                   'C', acme,    95,  {}, 5),

    // ============ AMC MODIFICATION applications ============
    mk('amc.modify', 'pending_engineer',          'A', acme,    3,   {}, 6),
    mk('amc.modify', 'pending_section_head',      'B', fatima,  11,  {}, 7),
    mk('amc.modify', 'pending_director',          'C', blue,    19,  {}, 8),
    mk('amc.modify', 'returned_to_applicant',     'A', acme,    32,  {}, 9),
    mk('amc.modify', 'fee_pending',               'B', fatima,  48,  {}, 10),
    mk('amc.modify', 'pending_company_signature', 'A', blue,    58,  {}, 11),
    mk('amc.modify', 'issued',                    'A', acme,    80,  {}, 0),

    // ============ AMC CANCELLATION applications (pre-DOE 2-party cross-approval) ============
    mk('amc.cancel', 'pending_counterparty',      'A', fatima,  1,   {}, 1),
    mk('amc.cancel', 'pending_engineer',          'A', acme,    6,   {}, 2),
    mk('amc.cancel', 'pending_section_head',      'B', blue,    13,  {}, 3),
    mk('amc.cancel', 'pending_director',          'C', fatima,  20,  {}, 4),
    mk('amc.cancel', 'returned_to_applicant',     'A', acme,    33,  {}, 5),
    mk('amc.cancel', 'fee_pending',               'B', blue,    50,  {}, 6),
    mk('amc.cancel', 'pending_owner_signature',   'A', fatima,  58,  {}, 7),
    mk('amc.cancel', 'issued',                    'A', acme,    78,  {}, 8),
    mk('amc.cancel', 'cancelled',                 'C', blue,    95,  {}, 9),

    // ============ AMC REVOCATION (DOE-initiated) applications ============
    mk('amc.revoke', 'pending_section_head',      'A', acme,    1,   {}, 10),
    mk('amc.revoke', 'pending_section_head',      'B', fatima,  5,   {}, 11),
    mk('amc.revoke', 'pending_director',          'A', blue,    13,  {}, 0),
    mk('amc.revoke', 'returned_to_engineer',      'C', acme,    22,  {}, 1),
    mk('amc.revoke', 'returned_to_section_head',  'A', fatima,  35,  {}, 2),
    mk('amc.revoke', 'issued',                    'A', blue,    62,  {}, 3),
    mk('amc.revoke', 'rejected',                  'B', acme,    88,  {}, 4),

    // ============ COC MODIFICATION applications (Certificate of Completion for Gas Systems) ============
    mk('coc.modify', 'pending_engineer',          'A', acme,    1,   {}, 0),
    mk('coc.modify', 'pending_engineer',          'B', fatima,  4,   {}, 1),
    mk('coc.modify', 'pending_section_head',      'A', blue,    9,   {}, 2),
    mk('coc.modify', 'returned_to_applicant',     'C', acme,    18,  {}, 3),
    mk('coc.modify', 'returned_to_engineer',      'B', fatima,  27,  {}, 4),
    mk('coc.modify', 'fee_pending',               'A', blue,    35,  {}, 5),
    mk('coc.modify', 'issued',                    'A', acme,    60,  {}, 6),
    mk('coc.modify', 'rejected',                  'C', fatima,  85,  {}, 7),

    // ============ COC CANCELLATION applications ============
    mk('coc.cancel', 'pending_engineer',          'A', acme,    2,   {}, 8),
    mk('coc.cancel', 'pending_section_head',      'B', fatima,  8,   {}, 9),
    mk('coc.cancel', 'returned_to_applicant',     'A', blue,    16,  {}, 10),
    mk('coc.cancel', 'returned_to_engineer',      'C', acme,    24,  {}, 11),
    mk('coc.cancel', 'fee_pending',               'A', fatima,  33,  {}, 0),
    mk('coc.cancel', 'issued',                    'B', blue,    55,  {}, 1),
    mk('coc.cancel', 'rejected',                  'A', acme,    78,  {}, 2),

    // ============ MAES ISSUANCE applications (3-tier review: Engineer → Section Head → Director) ============
    mk('maes.issue',  'pending_engineer',         'A', acme,    1,   {}, 0),
    mk('maes.issue',  'pending_engineer',         'B', fatima,  4,   {}, 1),
    mk('maes.issue',  'pending_section_head',     'A', blue,    9,   {}, 2),
    mk('maes.issue',  'pending_director',         'C', acme,    16,  {}, 3),
    mk('maes.issue',  'returned_to_applicant',    'B', fatima,  24,  {}, 4),
    mk('maes.issue',  'returned_to_engineer',     'A', acme,    30,  {}, 5),
    mk('maes.issue',  'returned_to_sh',           'C', blue,    36,  {}, 6),
    mk('maes.issue',  'fee_pending',              'A', fatima,  46,  {}, 7),
    mk('maes.issue',  'issued',                   'A', blue,    72,  {}, 8),
    mk('maes.issue',  'rejected',                 'B', acme,   100,  {}, 9),

    // ============ MAES RENEWAL applications (per-material expiry recalculation) ============
    mk('maes.renew',  'pending_engineer',         'A', fatima,  2,   {}, 10),
    mk('maes.renew',  'pending_section_head',     'B', acme,    8,   {}, 11),
    mk('maes.renew',  'pending_director',         'C', blue,    15,  {}, 0),
    mk('maes.renew',  'returned_to_applicant',    'A', fatima,  23,  {}, 1),
    mk('maes.renew',  'returned_to_engineer',     'B', acme,    34,  {}, 2),
    mk('maes.renew',  'fee_pending',              'B', blue,    44,  {}, 3),
    mk('maes.renew',  'issued',                   'A', fatima,  68,  {}, 4),
    mk('maes.renew',  'rejected',                 'C', acme,    92,  {}, 5),

    // ============ MAES MODIFICATION applications (add / update / remove materials) ============
    mk('maes.modify', 'pending_engineer',         'A', acme,    3,   {}, 6),
    mk('maes.modify', 'pending_section_head',     'B', fatima,  11,  {}, 7),
    mk('maes.modify', 'pending_director',         'C', blue,    19,  {}, 8),
    mk('maes.modify', 'returned_to_applicant',    'A', acme,    28,  {}, 9),
    mk('maes.modify', 'returned_to_sh',           'B', fatima,  37,  {}, 10),
    mk('maes.modify', 'fee_pending',              'B', blue,    48,  {}, 11),
    mk('maes.modify', 'issued',                   'A', acme,    74,  {}, 0),

    // ============ MAES CANCELLATION applications (partial vs full) ============
    mk('maes.cancel', 'pending_engineer',         'A', fatima,  2,   {}, 1),
    mk('maes.cancel', 'pending_section_head',     'B', acme,    9,   {}, 2),
    mk('maes.cancel', 'pending_director',         'C', blue,    17,  {}, 3),
    mk('maes.cancel', 'returned_to_applicant',    'A', fatima,  26,  {}, 4),
    mk('maes.cancel', 'returned_to_engineer',     'B', acme,    34,  {}, 5),
    mk('maes.cancel', 'fee_pending',              'A', blue,    45,  {}, 6),
    mk('maes.cancel', 'issued',                   'B', fatima,  70,  {}, 7),
    mk('maes.cancel', 'rejected',                 'C', acme,    96,  {}, 8),

    // ============ MAES REVOCATION (DOE-initiated; 2-tier internal: Section Head → Director) ============
    mk('maes.revoke', 'pending_section_head',     'A', acme,    1,   {}, 9),
    mk('maes.revoke', 'pending_section_head',     'B', fatima,  5,   {}, 10),
    mk('maes.revoke', 'pending_director',         'A', blue,    13,  {}, 11),
    mk('maes.revoke', 'returned_to_engineer',     'C', acme,    22,  {}, 0),
    mk('maes.revoke', 'returned_to_sh',           'A', fatima,  35,  {}, 1),
    mk('maes.revoke', 'issued',                   'A', blue,    62,  {}, 2),
    mk('maes.revoke', 'rejected',                 'B', acme,    88,  {}, 3),
  ];
}

function sampleAttachment(defId: string, filename: string, userId: string) {
  return {
    id: nanoid(),
    defId,
    filename,
    size: Math.floor(Math.random() * 900_000 + 100_000),
    uploadedAt: new Date().toISOString(),
    uploadedBy: userId,
  };
}

// ----- Persistence keys -----------------------------------------------------

export const STORAGE_KEYS = {
  USERS:    'doe.pps.users',
  APPS:     'doe.pps.applications',
  NOTIFS:   'doe.pps.notifications',
  AUTH:     'doe.pps.auth',
  DRAFTS:   'doe.pps.drafts',
  VERSION:  'doe.pps.seedVersion',
};

// Bump this whenever SEED_USERS or buildSampleApplications change shape/quantity
// so existing demo browsers pick up the new data on next load.
const SEED_VERSION = '17';

export function seedIfEmpty() {
  const storedVersion = localStorage.getItem(STORAGE_KEYS.VERSION);
  const stale = storedVersion !== SEED_VERSION;

  if (stale || !localStorage.getItem(STORAGE_KEYS.USERS)) {
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(SEED_USERS));
  }
  if (stale || !localStorage.getItem(STORAGE_KEYS.APPS)) {
    localStorage.setItem(STORAGE_KEYS.APPS, JSON.stringify(buildSampleApplications()));
  }
  if (stale || !localStorage.getItem(STORAGE_KEYS.NOTIFS)) {
    localStorage.setItem(STORAGE_KEYS.NOTIFS, JSON.stringify([]));
  }
  localStorage.setItem(STORAGE_KEYS.VERSION, SEED_VERSION);
}

export function resetSeed() {
  Object.values(STORAGE_KEYS).forEach((k) => localStorage.removeItem(k));
  seedIfEmpty();
}
