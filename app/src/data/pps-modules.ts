import dieselTpis from './diesel-tpis.json';
import lpgTpis from './lpg-tpis.json';
// ============================================================================
// PPS module datasets — Players (market participants) and Infrastructure
// inventory, keyed by product so the same reusable module components can later
// be pointed at other products (only the data source changes).
//
// Gasoline data is transcribed from the market-model workbook tabs
//   "Gasoline | Players"  and  "Gasoline | Infrastructure".
// ============================================================================

export interface PlayerContact { name: string; email: string; phone?: string; }
export interface PlayerCompany { company: string; role: string; volumeKt?: number; contacts: PlayerContact[]; }

// Infrastructure / TPI inventory row — a flexible superset; each product's
// column config (TPI_COLUMNS_BY_PRODUCT) selects which fields to show.
export interface TpiSite {
  status?: string;
  client?: string;
  location?: string;
  type?: string;            // Diesel: Infrastructure Type
  product?: string;         // Diesel: Petroleum Product
  capacity?: string;
  // LPG extras:
  tpiName?: string;
  projectName?: string;
  projectScope?: string;
  inspectionYear?: string;
  supplier?: string;        // Petroleum Product Supplier
  infraName?: string;       // Infrastructure Name
  productCovered?: string;  // Petroleum Product Covered
  demand?: string;          // Petroleum Product Demand
  entityName?: string;      // Licensed entity (rendered only on the PPS Dashboard TPIs view for Omar)
}

export interface TpiColumn { key: keyof TpiSite; label: string; }

// Per-product TPIs table columns (order + labels).
export const TPI_COLUMNS_BY_PRODUCT: Record<string, TpiColumn[]> = {
  Diesel: [
    { key: 'tpiName',        label: 'TPI Name' },
    { key: 'projectName',    label: 'Project Name' },
    { key: 'projectScope',   label: 'Project Scope' },
    { key: 'inspectionYear', label: 'Inspection Completion Year' },
    { key: 'status',         label: 'Infrastructure Status' },
    { key: 'client',         label: 'Client Name' },
    { key: 'supplier',       label: 'Petroleum Product Supplier' },
    { key: 'location',       label: 'Location' },
    { key: 'infraName',      label: 'Infrastructure Name' },
    { key: 'productCovered', label: 'Petroleum Product Coverage' },
    { key: 'capacity',       label: 'Capacity' },
  ],
  LPG: [
    { key: 'tpiName',        label: 'TPI Name' },
    { key: 'projectName',    label: 'Project Name' },
    { key: 'projectScope',   label: 'Project Scope' },
    { key: 'inspectionYear', label: 'Inspection Completion Year' },
    { key: 'status',         label: 'Infrastructure Status' },
    { key: 'client',         label: 'Client Name' },
    { key: 'supplier',       label: 'Petroleum Product Supplier' },
    { key: 'location',       label: 'Location' },
    { key: 'infraName',      label: 'Infrastructure Name' },
    { key: 'productCovered', label: 'Petroleum Product Coverage' },
    { key: 'capacity',       label: 'Capacity' },
    { key: 'demand',         label: 'Petroleum Product Demand' },
  ],
};

export interface InfraSite {
  company: string;
  name: string;        // infrastructure name
  type: string;        // infrastructure type
  location: string;
  status: string;      // operational status
  lon: number;
  lat: number;
}

// Operator → marker colour (mirrors the dashboard infrastructure legend).
export function operatorColor(company: string): string {
  if (/adnoc distribution/i.test(company)) return '#3D7A8C';
  if (/enoc|emarat/i.test(company)) return '#E89B4C';
  if (/terminal|depot/i.test(company)) return '#0B0E12';
  return '#10b981';
}

export const PLAYERS_BY_PRODUCT: Record<string, PlayerCompany[]> = {
  'Gasoline (98)': [
    {
      company: 'ADNOC Distribution',
      role: 'Production / Distribution in Abu Dhabi',
      contacts: [
        { name: 'Shakeel Khan',   email: 'shakeelk@adnocdistribution.ae',        phone: '+971529679324' },
        { name: 'Akshay Khaitan', email: 'akshay.khaitan@adnocdistribution.ae',  phone: '+971557729234' },
      ],
    },
    {
      company: 'ENOC',
      role: 'Distribution in Abu Dhabi',
      contacts: [
        { name: 'Zaid Alqufaidi', email: 'zaid@enoc.com', phone: '+971506459161' },
      ],
    },
  ],

  // Diesel | Players — exact data from the "Diesel | Players" Excel tab.
  Diesel: [
    { company: "ADNOC Distribution", role: "Production / Distribution in Abu Dhabi", volumeKt: 1809, contacts: [
      { name: "Shakeel Khan", email: "shakeelk@adnocdistribution.ae", phone: "+971529679324" },
      { name: "Akshay Khaitan", email: "akshay.khaitan@adnocdistribution.ae", phone: "+971557729234" },
    ]},
    { company: "ENOC", role: "Distribution in Abu Dhabi", volumeKt: 8.6, contacts: [
      { name: "Zaid Alqufaidi", email: "zaid@enoc.com", phone: "+971506459161" },
    ]},
    { company: "Safeen", role: "Grey market resellers", volumeKt: 150, contacts: [
      { name: "", email: "", phone: "800102030" },
    ]},
    { company: "Multiface", role: "Grey market resellers", volumeKt: 53, contacts: [
      { name: "", email: "", phone: "+971551525765" },
    ]},
    { company: "Commander Diesel Trading", role: "Grey market resellers", volumeKt: 34, contacts: [
      { name: "MOHAMMAD ALRAHAHLEH", email: "info@commanderdiesel.com", phone: "025512620" },
    ]},
    { company: "Tajvand", role: "Grey market resellers", volumeKt: 28, contacts: [
      { name: "", email: "", phone: "67447272" },
    ]},
    { company: "Al Bader Diesel Trading", role: "Grey market resellers", volumeKt: 20, contacts: [
      { name: "MOHAMMED AL MALIHI", email: "albaderdiesel@outlook.com", phone: "025516505" },
    ]},
    { company: "Welcome Diesel Trading LLC", role: "Grey market resellers", volumeKt: 14, contacts: [
      { name: "Sara Biji", email: "welcomedt@gmail.com", phone: "043333315" },
    ]},
    { company: "Pearl Energy Fuel Trading", role: "Grey market resellers", volumeKt: 12, contacts: [
      { name: "BAILU PULLIKAL BAIJU", email: "pearlbunkering@gmail.com", phone: "+97167473757" },
    ]},
    { company: "Oryx Fuel Trading LLC", role: "Grey market resellers", volumeKt: 12, contacts: [
      { name: "Sadik Ali Moahmed Rafi", email: "", phone: "+971565465645" },
    ]},
    { company: "Star Gate Energy", role: "Grey market resellers", volumeKt: 9.1, contacts: [
      { name: "ABDUL RAHMAN ALKHALF", email: "hussam@gateenergy-ae.com", phone: "065957373" },
    ]},
    { company: "Blue Ocean Fuel Supply Services", role: "Grey market resellers", volumeKt: 7.6, contacts: [
      { name: "SUNI RASHEED MOHAMMED", email: "info@blueoceanfuel.com", phone: "+971544110111" },
    ]},
    { company: "UBS Fuel Trading", role: "Grey market resellers", volumeKt: 6, contacts: [
      { name: "SUJITH THOPPIL SUKUMARAN", email: "info@ubsfueltrading.com", phone: "067434410" },
    ]},
    { company: "Highway diesel", role: "Grey market resellers", volumeKt: 5.7, contacts: [
      { name: "", email: "", phone: "04 342 2751" },
    ]},
    { company: "Siraj Diesel Trading", role: "Grey market resellers", volumeKt: 5, contacts: [
      { name: "PRAVEEN NALUPURAKKAL PRABHAKARAN", email: "siraj.dieseltrading@gmail.com", phone: "+97167489695" },
    ]},
    { company: "Shakil Diesel Trading", role: "Grey market resellers", volumeKt: 4.5, contacts: [
      { name: "", email: "", phone: "+9710508277699" },
    ]},
    { company: "Great Fuel Supply Services LLC", role: "Grey market resellers", volumeKt: 3.8, contacts: [
      { name: "REJU Vijayan", email: "greatfuel.sss@gmail.com", phone: "+971504410935" },
    ]},
    { company: "Monjasa", role: "Grey market resellers", volumeKt: 2.8, contacts: [
      { name: "Casper Borgen", email: "cab@monjasa.com", phone: "+97144208622" },
    ]},
    { company: "Abu Hussam diesel trading", role: "Grey market resellers", volumeKt: 2.3, contacts: [
      { name: "", email: "", phone: "+971526384172" },
    ]},
    { company: "Max diesel", role: "Grey market resellers", volumeKt: 2.3, contacts: [
      { name: "", email: "", phone: "+971567311322" },
    ]},
    { company: "Reem Al Mala", role: "Grey market resellers", volumeKt: 1.8, contacts: [
      { name: "", email: "", phone: "+971 4 262 6624" },
    ]},
    { company: "New Mid Asia Bulk Fuel supply services", role: "Grey market resellers", volumeKt: 1.9, contacts: [
      { name: "MANESH MANOHAR", email: "operations@midasiabulk.com", phone: "+97144291255" },
    ]},
    { company: "Signature", role: "Grey market resellers", volumeKt: 0.9, contacts: [
      { name: "", email: "", phone: "+971554918000" },
    ]},
    { company: "Mazout Diesel Fuel Trading", role: "Grey market resellers", volumeKt: 0.6, contacts: [
      { name: "Zwid Ali Mahjob", email: "INFO@MAZOUTDTF.COM", phone: "504160363" },
    ]},
    { company: "Zigma diesel trading", role: "Grey market resellers", volumeKt: 0.5, contacts: [
      { name: "Sunil p mathew", email: "zigmadieseltrading@gmail.com", phone: "+971525215100" },
    ]},
    { company: "Tens fuel supply services", role: "Grey market resellers", volumeKt: 0.4, contacts: [
      { name: "ARUN KUMAR RAJENDRA KUMAR", email: "info@tensfuel.com", phone: "65249877" },
    ]},
    { company: "Najem", role: "Grey market resellers", volumeKt: 0.2, contacts: [
      { name: "", email: "", phone: "+971509315131" },
    ]},
    { company: "Moon light diesel trading", role: "Grey market resellers", volumeKt: 0.1, contacts: [
      { name: "PRADEEP PRABHAKARAN", email: "pradeep@imperialgulf.com", phone: "+97143331484" },
    ]},
  ],

  // Natural Gas | Players — transcribed from the market-model "Natural Gas |
  // Players" tab.
  'Natural Gas': [
    { company: 'ADNOC Gas',      role: 'Natural gas production and distribution to large industrial end users (e.g., EGA, EWEC, EMSTEEL)', contacts: [{ name: 'Mohamed Alameri (ADNOC Main)', email: 'mooalameri@adnoc.ae', phone: 'Not available' }] },
    { company: 'ADNOC City Gas', role: 'Natural gas distribution to residential, commercial and small industrial end users',              contacts: [{ name: 'Mohamed Alameri (ADNOC Main)', email: 'mooalameri@adnoc.ae', phone: 'Not available' }] },
    { company: 'Abu Dhabi Ports', role: 'Natural gas distribution in industrial zones (e.g., KEZAD)',                                      contacts: [{ name: 'Basim Basheer',                email: 'basim.basheer@adports.ae', phone: '+97125109798' }] },
    { company: 'Dolphin Energy',  role: 'Import of natural gas from Qatar with distribution to some power plants in Abu Dhabi City',       contacts: [{ name: 'Noura Al Mashjari',            email: 'Noura.AlMashjari@dolphinenergy.com', phone: '+97126995535' }] },
  ],

  // CNG | Players — exact transcription of the "CNG | Players" Excel tab.
  CNG: [
    { company: 'ADNOC Distribution', role: 'CNG distribution in Abu Dhabi', contacts: [
      { name: 'Shakeel Khan',   email: 'shakeelk@adnocdistribution.ae',       phone: '+971529679324' },
      { name: 'Akshay Khaitan', email: 'akshay.khaitan@adnocdistribution.ae', phone: '+971557729234' },
    ]},
    { company: 'CloudEnergi',        role: 'CNG distribution in Abu Dhabi', contacts: [
      { name: 'Amr Samy Gharib', email: 'amr.samy@cloudenergi.com', phone: '+971552992079' },
    ]},
  ],

  // Ethanol | Players — exact transcription of the "Ethanol | Players" Excel tab.
  Ethanol: [
    { company: 'Petrochem',                  role: 'Distribution in Abu Dhabi (import from other emirates)', contacts: [
      { name: 'Not available',  email: 'sales@petrocheme.com',           phone: '+97144179300' },
    ]},
    { company: 'Chemstock',                  role: 'Distribution in Abu Dhabi (import from other emirates)', contacts: [
      { name: 'Mridula Murli',  email: 'mridula@chemstock.ae',           phone: '+971558446633' },
    ]},
    { company: 'NEXBA Healthcare Supplies',  role: 'Distribution in Abu Dhabi (import from other emirates)', contacts: [
      { name: 'No information',  email: 'marketing@nexbahealthcare.com',  phone: '+97126670777' },
    ]},
    { company: 'Al Nahda International',      role: 'Distribution in Abu Dhabi (import from other emirates)', contacts: [
      { name: 'No information',  email: 'admin@alnahdainternational.com', phone: '+97148831314' },
    ]},
    { company: 'City Pharmacy Company',      role: 'Direct import (through Abu Dhabi Customs)', contacts: [
      { name: 'No information',  email: 'shipments@citypharmacy.com',     phone: '+971506132585' },
    ]},
    { company: 'Asia Petrochemicals LLC',    role: 'Direct import (through Abu Dhabi Customs)', contacts: [
      { name: 'No information',  email: 'info@asia-petrochem.com',        phone: '+97142384533' },
    ]},
    { company: 'Winner Manufacturing',       role: 'Direct import (through Abu Dhabi Customs)', contacts: [
      { name: 'No information',  email: 'mylyn@ariscosmetics.com',        phone: '+971502826895' },
    ]},
  ],

  // Biodiesel | Players — exact transcription of the "Biodiesel | Players" Excel tab.
  // Name / Email / Phone columns differ in length; paired by index with blanks where a column is shorter.
  Biodiesel: [
    { company: 'Neutral Fuels',       role: 'Production and distribution in Abu Dhabi', contacts: [
      { name: 'Danielle Fisher', email: 'danielle.fisher@neutralfuels.com', phone: '+9714584037' },
      { name: '',                email: 'alamoudi@me.com' },
      { name: '',                email: 'hatem.alamoudi@neutralfuels.com' },
    ]},
    { company: 'BioD Technology',     role: 'Production and distribution in Abu Dhabi', contacts: [
      { name: 'Roxanne Soriano', email: 'sustainability@biodtechnology.com', phone: '+9714352408' },
      { name: 'Manoj Vig',       email: 'manoj.vig@biodtechnology.com' },
      { name: '',                email: 'info@biodtechnoloho.com' },
    ]},
    { company: 'Blue Biofuels',       role: 'Production in Abu Dhabi / Export to Dubai and International markets', contacts: [
      { name: 'Mohamed Iqbal',   email: 'm.iqbal@biofuels.ae', phone: '+9715653394' },
      { name: '',                email: 'mohd.hijji.96@gmail.com' },
      { name: '',                email: 'M.Iqbal@biofuels.ae' },
    ]},
    { company: 'Integrated Biofuels', role: 'Production in Dubai / Distribution in Abu Dhabi', contacts: [
      { name: 'Tamer Alhalabi',  email: 'tamer.alhalabi@lootahbiofuels.com', phone: '+9715231173' },
      { name: '',                email: 'husain.naser@gmail.com' },
    ]},
  ],

  // Fuel Oil | Players — exact transcription of the "Fuel Oil | Players" Excel tab.
  'Fuel Oil': [
    { company: 'Monjasa',           role: 'Ship to ship bunkering',  contacts: [
      { name: 'Casper Borgen',          email: 'cab@monjasa.com',           phone: '+971564948226' },
    ]},
    { company: 'Vitol Bunkers',     role: 'Ship to ship bunkering',  contacts: [
      { name: 'Rishav',                 email: 'rbh@vitol.com',             phone: '+971501012385' },
    ]},
    { company: 'Peninsula',         role: 'Ship to ship bunkering',  contacts: [
      { name: 'Guillermo Cancela',      email: 'gcancela@peninsula360.com', phone: '+34668131363' },
    ]},
    { company: 'Pearl Energy',      role: 'Truck to ship bunkering', contacts: [
      { name: 'Bailu Pullikal Baiju',   email: 'pearlbunkering@gmail.com',  phone: '+97167473757' },
    ]},
    { company: 'Oryx Fuel Trading', role: 'Truck to ship bunkering', contacts: [
      { name: 'Sadik Ali Moahmed Rafi', email: '',                         phone: '+971565465645' },
    ]},
  ],

  // Jet Fuel | Players — exact transcription of the "Jet Fuel | Players" Excel tab.
  // Keyed by the canonical product label 'Jet A-1'; the UI renames it to "Jet Fuel" for Ahmed.
  'Jet A-1': [
    { company: 'ADNOC', role: 'Jet fuel production', contacts: [
      { name: 'Mohamed Alameri (ADNOC Main)', email: 'mooalameri@adnoc.ae', phone: 'Not available' },
    ]},
  ],

  // SAF | Players — exact transcription of the "SAF | Players" Excel tab.
  SAF: [
    { company: 'ADNOC', role: 'SAF production', contacts: [
      { name: 'Mohamed Alameri (ADNOC Main)', email: 'mooalameri@adnoc.ae', phone: 'Not available' },
    ]},
  ],

  // LNG | Players — exact transcription of the "LNG | Players" Excel tab.
  LNG: [
    { company: 'ADNOC', role: 'LNG production and export', contacts: [
      { name: 'Mohamed Alameri (ADNOC Main)', email: 'mooalameri@adnoc.ae', phone: 'Not available' },
    ]},
  ],

  // Naphtha | Players — exact transcription of the "Naphtha | Players" Excel tab.
  Naphtha: [
    { company: 'Petrochem', role: 'Importer and distributor of naphtha', contacts: [
      { name: 'Not available', email: 'sales@petrocheme.com', phone: '+97144179300' },
    ]},
    { company: 'Jotun',     role: 'End user (paint manufacturer)',  contacts: [
      { name: 'Not available', email: 'csd@jotunadh.ae',     phone: '+97125510300' },
    ]},
    { company: 'EMOCHEM',   role: 'End user (petrochemicals)',      contacts: [
      { name: 'Not available', email: 'emochem@emochem.ae',  phone: '+97125555215' },
    ]},
  ],

  // LPG | Players — exact transcription of the "LPG | Players" Excel tab.
  LPG: [
    { company: "ADNOC Distribution", role: "Production in Abu Dhabi / Distribution of cylinders in Abu Dhabi", contacts: [
      { name: "Shakeel Khan", email: "shakeelk@adnocdistribution.ae", phone: "+971529679324" },
      { name: "Akshay Khaitan", email: "akshay.khaitan@adnocdistribution.ae", phone: "+971557729234" },
    ]},
    { company: "Al Fanar Gas", role: "LPG bulk distribution in Abu Dhabi", contacts: [
      { name: "Fanica Scarlet", email: "Scarlet@alfanargas.com", phone: "+971505176684" },
      { name: "", email: "Prasad.Salian@alfanargas.com" },
    ]},
    { company: "Sergas", role: "LPG bulk distribution in Abu Dhabi", contacts: [
      { name: "Ikram Aziz", email: "ikram@sergas.com", phone: "+971501514381" },
      { name: "Mondher Jedidi", email: "mondher@sergas.com", phone: "+971569900374" },
      { name: "", email: "damak@sergas.com", phone: "+971504421246" },
    ]},
    { company: "Brothers Gas", role: "LPG bulk distribution in Abu Dhabi", contacts: [
      { name: "Mohamed Abouzeid Abdelaziz", email: "abouzeid@brothersgas.ae", phone: "+971501063759" },
      { name: "", email: "m.hamdy@brothersgas.ae" },
    ]},
    { company: "SABACO", role: "LPG bulk distribution in Abu Dhabi", contacts: [
      { name: "Mohamed Moussa", email: "gas_service@sabacome.com", phone: "+971509072403" },
    ]},
    { company: "Royal Development For Gas Works", role: "LPG bulk distribution in Abu Dhabi", contacts: [
      { name: "Sabahat Modood Khan", email: "s.khan@royalgas.ae", phone: "+97126323236" },
      { name: "Waleed Mohamed", email: "waleed.mohamed@royalgas.com", phone: "+971545831843" },
    ]},
    { company: "SPEC", role: "LPG bulk distribution in Abu Dhabi", contacts: [
      { name: "Subair NK", email: "sales@specenergyme.com", phone: "+971502035475" },
      { name: "", email: "", phone: "+971569955626" },
    ]},
    { company: "Bin Sidra Group", role: "LPG bulk distribution in Abu Dhabi", contacts: [
      { name: "Mohamed Ibrahim", email: "m.ibrahim@binsidragas.com", phone: "+971547992558" },
    ]},
    { company: "Skill for gas works", role: "LPG bulk distribution in Abu Dhabi", contacts: [
      { name: "Rouni Jabra Neemah", email: "rouni@skillgas.ae", phone: "+971509449864" },
    ]},
    { company: "Unigaz", role: "LPG bulk distribution in Abu Dhabi", contacts: [
      { name: "Faysal Zantout", email: "faysal.zantout@unigaz.net", phone: "+971565349677" },
    ]},
    { company: "Emarat", role: "LPG bulk and cylinder distribution in Abu Dhabi (expected from 2026/2027)", contacts: [
      { name: "Heba", email: "ceooffice@emarat.ae", phone: "04-4061 204" },
    ]},
    { company: "MILKY WAY TRADING ESTABLISHMENT", role: "LPG cylinders resellers", contacts: [
      { name: "", email: "milkywaytrd@gmail.com", phone: "+971563232170" },
    ]},
    { company: "BADA AL MUTAWIA TRADING ESTABLISHMENT", role: "LPG cylinders resellers", contacts: [
      { name: "", email: "bmtgas@yahoo.com", phone: "+971554992624" },
    ]},
    { company: "AL HAMLY TRADING & TECHNICAL SERVICES  L.L.C.", role: "LPG cylinders resellers", contacts: [
      { name: "", email: "hamilytradingllc@gmail.com", phone: "+971507127845" },
    ]},
    { company: "AL THURAYYA  CYLINDER DISTRIBUTION", role: "LPG cylinders resellers", contacts: [
      { name: "", email: "milkywaytrd@gmail.com", phone: "+971563232170" },
    ]},
    { company: "ABU DHABI GAS L.L.C.", role: "LPG cylinders resellers", contacts: [
      { name: "", email: "zayed@bachuae.com", phone: "+971566882000" },
      { name: "", email: "", phone: "+971566886787" },
    ]},
    { company: "AL MINHALI NATURAL GAS ESTABLISHMENT", role: "LPG cylinders resellers", contacts: [
      { name: "Salam", email: "valaptilsalam@gmail.com", phone: "+971506122536" },
      { name: "", email: "info@almenhaligas.com" },
    ]},
    { company: "MOHAMMAD ALI AL MANSOURI GAS DISTRIBUTION", role: "LPG cylinders resellers", contacts: [
      { name: "", email: "m.almansouri1990@icloud.com", phone: "+971502255459" },
    ]},
    { company: "MOHAMMED AL SHAMSI  HOUSE GAS   - L.L.C", role: "LPG cylinders resellers", contacts: [
      { name: "Ahmed El Mansoori", email: "almansoori689@gmail.com", phone: "+971566665565" },
      { name: "", email: "mohammedalshamsitradinggas2022@gmail.com" },
    ]},
    { company: "AL FARAH GAS CYLINDER DISTRIBUTION", role: "LPG cylinders resellers", contacts: [
      { name: "", email: "hr@alfarah.info", phone: "+971505824894" },
      { name: "", email: "", phone: "+971508136662" },
    ]},
    { company: "AL MARFA GAS DISTRIBUTION ESTABLISHMENT", role: "LPG cylinders resellers", contacts: [
      { name: "Mohamed Ahmed", email: "almirfagas@gmail.com", phone: "+971561789726" },
    ]},
    { company: "WAHEED GAS DISTRIBUTION EST.", role: "LPG cylinders resellers", contacts: [
      { name: "Mohamed Amir", email: "saeedrehan7799@gmail.com", phone: "+971509947277" },
      { name: "", email: "waheedgas@yahoo.com" },
    ]},
    { company: "SADART AL MOSTAQBAL GAS CYLINDER EST.", role: "LPG cylinders resellers", contacts: [
      { name: "", email: "paknation27@gmail.com", phone: "+971506433873" },
      { name: "", email: "", phone: "+971037825840" },
      { name: "", email: "", phone: "+971558520307" },
    ]},
    { company: "MUBAZARA GAS DISTRIBUTION", role: "LPG cylinders resellers", contacts: [
      { name: "", email: "mubazaragasdistribution@gmail.com", phone: "+971522450215" },
    ]},
    { company: "TARISH ATIQ ALQUEBAISY GAS DISTRIBUTION ESTABLISHMENT - BRANCH", role: "LPG cylinders resellers", contacts: [
      { name: "", email: "tarishgas@gmail.com", phone: "+971561112211" },
    ]},
  ],
};

export const INFRASTRUCTURE_BY_PRODUCT: Record<string, InfraSite[]> = {
  'Gasoline (98)': [
    { company: 'ADNOC Distribution', name: 'Al Faya Shahinat - 2 (763)',  type: "ADNOC D.'s fuel station", location: 'Abu Dhabi City', status: 'Operational', lon: 55.070141, lat: 24.805969 },
    { company: 'ADNOC Distribution', name: 'Al Ghadeer North (119)',      type: "ADNOC D.'s fuel station", location: 'Abu Dhabi City', status: 'Operational', lon: 54.940668, lat: 24.887017 },
    { company: 'ADNOC Distribution', name: 'Seih Al Sedirah- West (724)', type: "ADNOC D.'s fuel station", location: 'Abu Dhabi City', status: 'Operational', lon: 54.982397, lat: 24.818273 },
    { company: 'ADNOC Distribution', name: 'Seih Al Sedirah- East (723)', type: "ADNOC D.'s fuel station", location: 'Abu Dhabi City', status: 'Operational', lon: 54.96917,  lat: 24.794184 },
    { company: 'ADNOC Distribution', name: 'Khalifa Ind. City (662)',     type: "ADNOC D.'s fuel station", location: 'Abu Dhabi City', status: 'Operational', lon: 54.829867, lat: 24.740778 },
    { company: 'ADNOC Distribution', name: 'Al Faya Shahinat - 4 (677)',  type: "ADNOC D.'s fuel station", location: 'Abu Dhabi City', status: 'Operational', lon: 55.075048, lat: 24.506686 },
    { company: 'ADNOC Distribution', name: 'Kizad (689)',                 type: "ADNOC D.'s fuel station", location: 'Abu Dhabi City', status: 'Operational', lon: 54.711777, lat: 24.773993 },
    { company: 'ADNOC Distribution', name: 'Telal Sweihan (614)',         type: "ADNOC D.'s fuel station", location: 'Abu Dhabi City', status: 'Operational', lon: 55.190894, lat: 24.436974 },
    { company: 'ADNOC Distribution', name: 'Taweela Fisherman (690)',     type: "ADNOC D.'s fuel station", location: 'Abu Dhabi City', status: 'Operational', lon: 54.686555, lat: 24.787258 },
    { company: 'ADNOC Distribution', name: 'Tawazun (718)',               type: "ADNOC D.'s fuel station", location: 'Abu Dhabi City', status: 'Operational', lon: 54.880294, lat: 24.5977 },
    { company: 'ADNOC Distribution', name: 'Mina Al Sader (873)',         type: "ADNOC D.'s fuel station", location: 'Abu Dhabi City', status: 'Operational', lon: 54.680617, lat: 24.756759 },
    { company: 'ADNOC Distribution', name: 'Samha - South West (888)',    type: "ADNOC D.'s fuel station", location: 'Abu Dhabi City', status: 'Operational', lon: 54.759687, lat: 24.671018 },
    { company: 'ADNOC Distribution', name: 'Samha - (South East) (887)',  type: "ADNOC D.'s fuel station", location: 'Abu Dhabi City', status: 'Operational', lon: 54.762119, lat: 24.66925 },
    { company: 'ADNOC Distribution', name: 'Military Base (778)',         type: "ADNOC D.'s fuel station", location: 'Abu Dhabi City', status: 'Operational', lon: 54.841902, lat: 24.553881 },
    { company: 'ADNOC Distribution', name: 'Al Rahba (612)',              type: "ADNOC D.'s fuel station", location: 'Abu Dhabi City', status: 'Operational', lon: 54.70455,  lat: 24.59902 },
    { company: 'ADNOC Distribution', name: 'Qutouf (165)',                type: "ADNOC D.'s fuel station", location: 'Abu Dhabi City', status: 'Operational', lon: 54.687759, lat: 24.582549 },
    { company: 'ADNOC Distribution', name: 'Al Shahama (954)',            type: "ADNOC D.'s fuel station", location: 'Abu Dhabi City', status: 'Operational', lon: 54.694487, lat: 24.557181 },
    { company: 'ADNOC Distribution', name: 'Al Hilila (916)',             type: "ADNOC D.'s fuel station", location: 'Abu Dhabi City', status: 'Operational', lon: 54.832544, lat: 24.4358 },
    { company: 'ADNOC Distribution', name: 'Al Mearad (686)',             type: "ADNOC D.'s fuel station", location: 'Abu Dhabi City', status: 'Operational', lon: 54.832381, lat: 24.433826 },
    { company: 'ADNOC Distribution', name: 'Shahama (861)',               type: "ADNOC D.'s fuel station", location: 'Abu Dhabi City', status: 'Operational', lon: 54.677219, lat: 24.527085 },
    { company: 'ADNOC Distribution', name: 'New Shahama (117)',           type: "ADNOC D.'s fuel station", location: 'Abu Dhabi City', status: 'Operational', lon: 54.687089, lat: 24.515638 },
    { company: 'ADNOC Distribution', name: 'Al Widayhi (166)',            type: "ADNOC D.'s fuel station", location: 'Abu Dhabi City', status: 'Operational', lon: 54.669302, lat: 24.521465 },
    { company: 'ADNOC Distribution', name: 'Al Faya Shahinat - 3 (764)',  type: "ADNOC D.'s fuel station", location: 'Abu Dhabi City', status: 'Operational', lon: 55.075404, lat: 24.50686 },
    { company: 'ADNOC Distribution', name: 'Al Bahia North (164)',        type: "ADNOC D.'s fuel station", location: 'Abu Dhabi City', status: 'Operational', lon: 54.636952, lat: 24.541663 },
  ],
};

// TPI / infrastructure inventory by product — transcribed from the market-model
// "Diesel | Infrastructure" tab (storage sites · Abu Dhabi · Diesel).
export const TPIS_BY_PRODUCT: Record<string, TpiSite[]> = {
  Diesel: dieselTpis as TpiSite[],

  // LPG | TPIs — exact data from the "LPG | TPIs" Excel tab (1322 records).
  LPG: lpgTpis as TpiSite[],
};
