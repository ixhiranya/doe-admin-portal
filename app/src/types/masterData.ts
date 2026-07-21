// =============================================================================
// PPS · Master Data — shared reference tables (Admin Modules → Master Data).
// -----------------------------------------------------------------------------
// Source of truth: "PPS — Data Design (Management Overview)" (tables 1, 2, 4,
// 6, 7, 21, 22) and the PPS Dashboard BRD (§1 products in scope, §16
// entity-to-product mapping). See src/services/masterData/seedData.ts for the
// field-by-field provenance notes.
//
// Naming: every type is prefixed `Md` (Master Data) to avoid clashing with the
// unrelated `Company` applicant-profile type already used by the onboarding
// module (src/types/index.ts).
// =============================================================================

/** table 1 · PRODUCT — the 12 petroleum products companies report on. */
export interface MdProduct {
  id: string;
  code: string;            // short machine-friendly name, e.g. "diesel"
  name: string;             // full product name shown to users
  defaultUomId: string;     // FK -> MdUom · the normal unit this product is measured in
  hasTpi: boolean;          // does this product require Third-Party Inspection data?
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

/**
 * table 2 · COMPANY — the entities (companies) that submit data, incl. parent
 * groups. `entityTypeId` is stored as free text ("Producer", "Distributor" …)
 * in the source data design; this module normalizes it into the MdEntityType
 * lookup below so it can be managed and reused the same way as every other
 * master list (see Inconsistencies note in the module README).
 */
export interface MdCompany {
  id: string;
  code: string;
  name: string;
  entityTypeId: string;         // FK -> MdEntityType
  parentCompanyId: string | null; // FK -> MdCompany (self), nullable
  isAggregate: boolean;          // true = one row stands in for many un-listed companies
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

/** table 4 · UOM — units of measure with same-dimension conversion factors. */
export type MdUomDimension = 'mass' | 'volume' | 'energy' | 'percent';

export interface MdUom {
  id: string;
  code: string;
  name: string;
  dimension: MdUomDimension;
  baseUomId: string | null;      // FK -> MdUom (self); null when this unit is itself the base
  conversionFactor: number;      // "1 of this unit" expressed in base units
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

/**
 * ENTITY_TYPE — normalized lookup for COMPANY.entity_type (Producer,
 * Distributor, Importer, Consumer, Aggregator …). Not one of the 11 masters
 * named in the Data Design doc; introduced here so "Entity Types" can be
 * managed as its own screen per the implementation brief. See Inconsistencies.
 */
export interface MdEntityType {
  id: string;
  code: string;
  name: string;
  description: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

/** table 6 · REGION — the 3 Emirate-of-Abu-Dhabi regions used to split volumes. */
export interface MdRegion {
  id: string;
  code: string;
  name: string;
  parentRegionId: string | null; // FK -> MdRegion (self)
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

/** table 7 · SEGMENT — customer / sales segments demand is broken down by. */
export interface MdSegment {
  id: string;
  code: string;
  name: string;
  segmentGroup: string;   // wider grouping, e.g. "End-use sector" or "Channel"
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

/** table 21 · ENTITY_GROUP — names a group of companies consolidated together. */
export interface MdEntityGroup {
  id: string;
  code: string;
  name: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

/** table 22 · ENTITY_GROUP_MEMBER — junction: which companies sit in which group. */
export interface MdEntityGroupMember {
  id: string;
  groupId: string;     // FK -> MdEntityGroup
  companyId: string;   // FK -> MdCompany
  createdAt: string;
}

export type MdEntityKind =
  | 'product' | 'company' | 'uom' | 'entityType'
  | 'region' | 'segment' | 'entityGroup' | 'entityGroupMember';
