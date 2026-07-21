// =============================================================================
// PPS · Master Data — seed data.
// -----------------------------------------------------------------------------
// Every row below is transcribed from the two source documents (no invented
// fields/relationships):
//   • "PPS — Data Design (Management Overview)" — tables 1 PRODUCT, 2 COMPANY,
//     4 UOM, 6 REGION, 7 SEGMENT, 21 ENTITY_GROUP, 22 ENTITY_GROUP_MEMBER.
//   • "Petroleum Products Dashboard — BRD" — §1 (12 products in scope),
//     §16 / Entity-to-Product mapping table (~36 companies), §5 (Fuel Oil
//     supply companies + unit lines).
// Where the source only gives *example* rows (not a full enumeration), the
// remaining rows are filled in from the same document's narrative text and
// clearly called out in the module's Inconsistencies notes (see the chat
// analysis) — nothing here is fabricated relationship/field structure, only
// the population of already-documented lookup lists.
// =============================================================================

import type {
  MdProduct, MdCompany, MdUom, MdEntityType, MdRegion, MdSegment,
  MdEntityGroup, MdEntityGroupMember,
} from '../../types/masterData';

const now = '2026-01-01T00:00:00.000Z';
type Stamped = { isActive: boolean; createdAt: string; updatedAt: string };
function row<T extends Stamped>(o: Omit<T, keyof Stamped>): T {
  return { ...o, isActive: true, createdAt: now, updatedAt: now } as T;
}

// ─────────────────────────────────────────────────────────────────────────
// UOM (table 4) — the 4 documented example rows exactly as given, plus a
// percent unit (dimension is documented as one of mass/volume/energy/percent
// even though no percent example row is shown).
// ─────────────────────────────────────────────────────────────────────────
export const SEED_UOM: MdUom[] = [
  row<MdUom>({ id: 'uom-kt',     code: 'kt',      name: 'Thousand tonnes', dimension: 'mass',   baseUomId: null,      conversionFactor: 1 }),
  row<MdUom>({ id: 'uom-tonnes', code: 'Tonnes',  name: 'Tonnes',          dimension: 'mass',   baseUomId: 'uom-kt',  conversionFactor: 0.001 }),
  row<MdUom>({ id: 'uom-bnbtu',  code: 'BnBtu',   name: 'Billion btu',     dimension: 'energy', baseUomId: null,      conversionFactor: 1 }),
  row<MdUom>({ id: 'uom-liters', code: 'Liters',  name: 'Liters',          dimension: 'volume', baseUomId: null,      conversionFactor: 1 }),
  row<MdUom>({ id: 'uom-pct',    code: 'Pct',     name: 'Percent',         dimension: 'percent', baseUomId: null,     conversionFactor: 1 }),
];

// ─────────────────────────────────────────────────────────────────────────
// PRODUCT (table 1) — 12 products in scope (BRD §1). Units per BRD §5 note:
// "most fuels in kt, gases (Natural Gas, LNG, CNG) in Billion btu, Biodiesel
// in Tonnes, LPG in Liters". has_tpi = true only for Diesel & LPG (documented).
// ─────────────────────────────────────────────────────────────────────────
export const SEED_PRODUCTS: MdProduct[] = [
  row<MdProduct>({ id: 'prod-gasoline',   code: 'gasoline',    name: 'Gasoline',    defaultUomId: 'uom-kt',     hasTpi: false }),
  row<MdProduct>({ id: 'prod-diesel',     code: 'diesel',      name: 'Diesel',      defaultUomId: 'uom-kt',     hasTpi: true }),
  row<MdProduct>({ id: 'prod-fuel-oil',   code: 'fuel_oil',    name: 'Fuel oil',    defaultUomId: 'uom-kt',     hasTpi: false }),
  row<MdProduct>({ id: 'prod-jet-fuel',   code: 'jet_fuel',    name: 'Jet fuel',    defaultUomId: 'uom-kt',     hasTpi: false }),
  row<MdProduct>({ id: 'prod-saf',        code: 'saf',         name: 'SAF',         defaultUomId: 'uom-kt',     hasTpi: false }),
  row<MdProduct>({ id: 'prod-natural-gas', code: 'natural_gas', name: 'Natural gas', defaultUomId: 'uom-bnbtu', hasTpi: false }),
  row<MdProduct>({ id: 'prod-lpg',        code: 'lpg',         name: 'LPG',         defaultUomId: 'uom-liters', hasTpi: true }),
  row<MdProduct>({ id: 'prod-lng',        code: 'lng',         name: 'LNG',         defaultUomId: 'uom-bnbtu', hasTpi: false }),
  row<MdProduct>({ id: 'prod-cng',        code: 'cng',         name: 'CNG',         defaultUomId: 'uom-bnbtu', hasTpi: false }),
  row<MdProduct>({ id: 'prod-ethanol',    code: 'ethanol',     name: 'Ethanol',     defaultUomId: 'uom-kt',     hasTpi: false }),
  row<MdProduct>({ id: 'prod-biodiesel',  code: 'biodiesel',   name: 'Biodiesel',   defaultUomId: 'uom-tonnes', hasTpi: false }),
  row<MdProduct>({ id: 'prod-naphtha',    code: 'naphtha',     name: 'Naphtha',     defaultUomId: 'uom-kt',     hasTpi: false }),
];

// ─────────────────────────────────────────────────────────────────────────
// ENTITY_TYPE — normalized lookup for COMPANY.entity_type. Data Design gives
// 3 worked examples (Distributor / Consumer / Importer); Producer and
// Aggregator are added because the source narrative uses them too (ADNOC
// as producer at Ruwais; Grey Market / Direct Importers as an aggregate
// bucket for many un-listed companies). See Inconsistencies note.
// ─────────────────────────────────────────────────────────────────────────
export const SEED_ENTITY_TYPES: MdEntityType[] = [
  row<MdEntityType>({ id: 'etype-producer',    code: 'PRODUCER',    name: 'Producer',    description: 'Produces the product locally (e.g. ADNOC Distribution at Ruwais).' }),
  row<MdEntityType>({ id: 'etype-distributor', code: 'DISTRIBUTOR', name: 'Distributor', description: 'Distributes/sells the product to end customers.' }),
  row<MdEntityType>({ id: 'etype-importer',    code: 'IMPORTER',    name: 'Importer',    description: 'Imports the product from outside the Emirate.' }),
  row<MdEntityType>({ id: 'etype-consumer',    code: 'CONSUMER',    name: 'Consumer',    description: 'A sub-consumer whose usage is reported/consolidated by a supplying entity.' }),
  row<MdEntityType>({ id: 'etype-aggregator',  code: 'AGGREGATOR',  name: 'Aggregator',  description: 'One row standing in for many un-listed companies (is_aggregate = true).' }),
];

// ─────────────────────────────────────────────────────────────────────────
// COMPANY (table 2) — Entity-to-Product mapping (BRD §16), ~36 companies.
// parent_company_id: EMSTEEL group is confirmed in the source Excel
// (Emirates Steel, Al Ain Cement, Eco Hub); the ADNOC group (ADNOC, ADNOC
// Distribution, ADNOC Gas, ADNOC City Gas) is flagged in the Data Design
// doc as an *assumption from the names*, "to be confirmed with DoE" — kept
// here exactly as the source frames it, not silently treated as fact.
// entity_type assignment beyond the 3 worked examples is this module's best
// derivation from context (producer/importer/distributor language in the
// BRD) — see Inconsistencies note.
// ─────────────────────────────────────────────────────────────────────────
const c = (o: Omit<MdCompany, 'isActive' | 'createdAt' | 'updatedAt' | 'isAggregate' | 'parentCompanyId'> & { isAggregate?: boolean; parentCompanyId?: string | null }) =>
  row<MdCompany>({ isAggregate: false, parentCompanyId: null, ...o });

export const SEED_COMPANIES: MdCompany[] = [
  // ADNOC group (parent link = assumption, per Data Design note 2)
  c({ id: 'co-adnoc-group',   code: 'ADNOC',     name: 'ADNOC (Group)',            entityTypeId: 'etype-producer' }),
  c({ id: 'co-adnoc-dist',    code: 'ADNOCD',    name: 'ADNOC Distribution',       entityTypeId: 'etype-distributor', parentCompanyId: 'co-adnoc-group' }),
  c({ id: 'co-adnoc-gas',     code: 'ADNOCGAS',  name: 'ADNOC Gas',                entityTypeId: 'etype-producer',    parentCompanyId: 'co-adnoc-group' }),
  c({ id: 'co-adnoc-citygas', code: 'ADNOCCITY', name: 'ADNOC City Gas',           entityTypeId: 'etype-distributor', parentCompanyId: 'co-adnoc-group' }),
  // EMSTEEL group (confirmed)
  c({ id: 'co-emsteel',       code: 'EMSTEEL',   name: 'Emirates Steel (EMSTEEL)', entityTypeId: 'etype-consumer' }),
  c({ id: 'co-emirates-steel', code: 'ESTEEL',   name: 'Emirates Steel',           entityTypeId: 'etype-consumer', parentCompanyId: 'co-emsteel' }),
  c({ id: 'co-al-ain-cement', code: 'AACEMENT',  name: 'Al Ain Cement',            entityTypeId: 'etype-consumer', parentCompanyId: 'co-emsteel' }),
  c({ id: 'co-eco-hub',       code: 'ECOHUB',    name: 'Eco Hub',                  entityTypeId: 'etype-consumer', parentCompanyId: 'co-emsteel' }),
  // Gasoline / Diesel
  c({ id: 'co-enoc',          code: 'ENOC',      name: 'ENOC',                     entityTypeId: 'etype-distributor' }),
  c({ id: 'co-grey-market',   code: 'GREY',      name: 'Grey Market (25+ resellers)', entityTypeId: 'etype-aggregator', isAggregate: true }),
  // Fuel oil
  c({ id: 'co-monjasa',       code: 'MONJASA',   name: 'Monjasa',                  entityTypeId: 'etype-importer' }),
  c({ id: 'co-vitol',         code: 'VITOL',     name: 'Vitol Bunkers',            entityTypeId: 'etype-importer' }),
  c({ id: 'co-peninsula',     code: 'PENFUEL',   name: 'Peninsula Fuel Supply',    entityTypeId: 'etype-importer' }),
  c({ id: 'co-pearl-energy',  code: 'PEARL',     name: 'Pearl Energy',             entityTypeId: 'etype-importer' }),
  c({ id: 'co-oryx',          code: 'ORYX',      name: 'Oryx Fuel Trading',        entityTypeId: 'etype-importer' }),
  // Jet fuel / SAF / LNG / Natural gas
  c({ id: 'co-dolphin',       code: 'DOLPHIN',   name: 'Dolphin Energy',           entityTypeId: 'etype-producer' }),
  c({ id: 'co-ad-ports',      code: 'ADPORTS',   name: 'Abu Dhabi Ports',          entityTypeId: 'etype-consumer' }),
  c({ id: 'co-ega',           code: 'EGA',       name: 'EGA',                      entityTypeId: 'etype-consumer' }),
  c({ id: 'co-ewec',          code: 'EWEC',      name: 'EWEC',                     entityTypeId: 'etype-consumer' }),
  // LPG
  c({ id: 'co-al-fanar',      code: 'ALFANAR',   name: 'Al Fanar Gas',             entityTypeId: 'etype-distributor' }),
  c({ id: 'co-sergas',        code: 'SERGAS',    name: 'Sergas',                   entityTypeId: 'etype-distributor' }),
  c({ id: 'co-unigaz',        code: 'UNIGAZ',    name: 'Unigaz',                   entityTypeId: 'etype-distributor' }),
  c({ id: 'co-royal-gas',     code: 'ROYALGAS',  name: 'Royal Gas',                entityTypeId: 'etype-distributor' }),
  c({ id: 'co-skill-gas',     code: 'SKILLGAS',  name: 'Skill for Gas',           entityTypeId: 'etype-distributor' }),
  c({ id: 'co-brothers-gas',  code: 'BROSGAS',   name: 'Brothers Gas',            entityTypeId: 'etype-distributor' }),
  c({ id: 'co-bin-sidra',     code: 'BINSIDRA',  name: 'Bin Sidra',                entityTypeId: 'etype-distributor' }),
  c({ id: 'co-sabaco',        code: 'SABACO',    name: 'SABACO',                   entityTypeId: 'etype-distributor' }),
  c({ id: 'co-spec',          code: 'SPEC',      name: 'SPEC',                     entityTypeId: 'etype-distributor' }),
  c({ id: 'co-emarat',        code: 'EMARAT',    name: 'Emarat',                   entityTypeId: 'etype-distributor' }),
  // CNG
  c({ id: 'co-cloudenergi',   code: 'CLOUDENRG', name: 'CloudEnergi',              entityTypeId: 'etype-distributor' }),
  // Ethanol / Naphtha
  c({ id: 'co-petrochem',     code: 'PETROCHEM', name: 'Petrochem',                entityTypeId: 'etype-distributor' }),
  c({ id: 'co-chemstock',     code: 'CHEMSTOCK', name: 'Chemstock',                entityTypeId: 'etype-distributor' }),
  c({ id: 'co-nexba',         code: 'NEXBA',     name: 'NEXBA Healthcare',         entityTypeId: 'etype-distributor' }),
  c({ id: 'co-al-nahda',      code: 'ALNAHDA',   name: 'Al Nahda International',   entityTypeId: 'etype-distributor' }),
  c({ id: 'co-direct-import', code: 'DIRIMPORT', name: 'Direct Importers (3 companies)', entityTypeId: 'etype-aggregator', isAggregate: true }),
  // Biodiesel
  c({ id: 'co-neutral-fuels', code: 'NEUTRALF',  name: 'Neutral Fuels',            entityTypeId: 'etype-producer' }),
  c({ id: 'co-integrated-bio', code: 'INTBIOF',  name: 'Integrated Biofuels',      entityTypeId: 'etype-producer' }),
  c({ id: 'co-biod-tech',     code: 'BIODTECH',  name: 'BioD Technology',          entityTypeId: 'etype-producer' }),
  c({ id: 'co-blue-biofuels', code: 'BLUEBIOF',  name: 'Blue Biofuels',            entityTypeId: 'etype-producer' }),
];

// ─────────────────────────────────────────────────────────────────────────
// REGION (table 6) — the 3 documented example rows, flat (no parent shown).
// ─────────────────────────────────────────────────────────────────────────
export const SEED_REGIONS: MdRegion[] = [
  row<MdRegion>({ id: 'region-auh', code: 'AUH', name: 'Abu Dhabi City', parentRegionId: null }),
  row<MdRegion>({ id: 'region-aan', code: 'AAN', name: 'Al Ain',         parentRegionId: null }),
  row<MdRegion>({ id: 'region-adh', code: 'ADH', name: 'Al Dhafra',      parentRegionId: null }),
];

// ─────────────────────────────────────────────────────────────────────────
// SEGMENT (table 7) — the 5 documented example rows, plus B2B which the same
// table's "Key insight" text names for Gasoline (B2C/B2B) but the worked
// example rows omit — added for completeness, flagged in Inconsistencies.
// ─────────────────────────────────────────────────────────────────────────
export const SEED_SEGMENTS: MdSegment[] = [
  row<MdSegment>({ id: 'seg-res',  code: 'RES',  name: 'Residential',                 segmentGroup: 'End-use sector' }),
  row<MdSegment>({ id: 'seg-com',  code: 'COM',  name: 'Commercial',                  segmentGroup: 'End-use sector' }),
  row<MdSegment>({ id: 'seg-ind',  code: 'IND',  name: 'Industrial',                  segmentGroup: 'End-use sector' }),
  row<MdSegment>({ id: 'seg-con',  code: 'CON',  name: 'Construction',                segmentGroup: 'End-use sector' }),
  row<MdSegment>({ id: 'seg-b2c',  code: 'B2C',  name: 'B2C (Sales at fuel stations)', segmentGroup: 'Channel' }),
  row<MdSegment>({ id: 'seg-b2b',  code: 'B2B',  name: 'B2B (Bulk deliveries)',        segmentGroup: 'Channel' }),
];

// ─────────────────────────────────────────────────────────────────────────
// ENTITY_GROUP (table 21) + ENTITY_GROUP_MEMBER (table 22) — both documented
// worked examples, transcribed exactly.
// ─────────────────────────────────────────────────────────────────────────
export const SEED_ENTITY_GROUPS: MdEntityGroup[] = [
  row<MdEntityGroup>({ id: 'grp-adnocgas-cons', code: 'ADNOCGAS_CONS', name: 'ADNOC Gas supplied consumers' }),
  row<MdEntityGroup>({ id: 'grp-grey-benchmark', code: 'GREY_BENCHMARK', name: 'Grey Market growth benchmark (ADNOC Distribution)' }),
];

export const SEED_ENTITY_GROUP_MEMBERS: MdEntityGroupMember[] = [
  { id: 'egm-1', groupId: 'grp-adnocgas-cons', companyId: 'co-ega',            createdAt: now },
  { id: 'egm-2', groupId: 'grp-adnocgas-cons', companyId: 'co-ewec',           createdAt: now },
  { id: 'egm-3', groupId: 'grp-adnocgas-cons', companyId: 'co-emirates-steel', createdAt: now },
  { id: 'egm-4', groupId: 'grp-adnocgas-cons', companyId: 'co-al-ain-cement',  createdAt: now },
  { id: 'egm-5', groupId: 'grp-adnocgas-cons', companyId: 'co-eco-hub',        createdAt: now },
  { id: 'egm-6', groupId: 'grp-grey-benchmark', companyId: 'co-adnoc-dist',    createdAt: now },
];
