// ============================================================================
// PPS form-field templates registry.
//
// Each Product + Entity is an INDEPENDENT submission template, extracted from
// its tab in the market-model workbook (see _extract_templates.py in
// "Dashboard Source Files"). LPG · ADNOC Distribution is the master/reference
// and keeps its bespoke render path; every other product is rendered generically
// from the section-based template JSON below.
// ============================================================================

import gasoline from './gasoline-adnoc.json';
import diesel from './diesel-adnoc.json';
import cng from './cng-adnoc.json';
import naturalGas from './natural-gas-adnoc.json';
import fuelOil from './fuel-oil-monjasa.json';
import jetFuel from './jet-fuel-adnoc.json';
import saf from './saf-adnoc.json';
import lng from './lng-adnoc.json';
import ethanol from './ethanol-petrochem.json';
import biodiesel from './biodiesel-neutral-fuels.json';
import naphtha from './naphtha-petrochem.json';

// ---- Types -----------------------------------------------------------------

export interface TemplateRow {
  label: string;
  values: (number | null)[];
  auto?: boolean;
  mandatory?: boolean;
}
export interface SeasonalCategory {
  label: string;
  qByYear: Record<string, number[]>;   // year -> [Q1, Q2, Q3, Q4]
}
export interface RegionGroup {
  region: string;
  segments: { label: string; values: (number | null)[] }[];
}
export interface EndUsers {
  standalone: { label: string; values: (number | null)[] }[];
  regionGroups: { region: string; segments: { label: string; values: (number | null)[] }[] }[];
}
// Qualitative (non-numeric) section payload — free-text field lists (e.g. key
// ports) or small label/answer matrices (key demand drivers Q&A, latest tech
// Area/Status). Rendered by QualitativeSection in both the form and read-only View.
export interface QualitativeData {
  kind: 'fields' | 'table';
  fields?: { label: string; value?: string; multiline?: boolean; placeholder?: string }[];
  columns?: string[];
  inputCols?: boolean[];           // per-column: true = editable input, false = static label
  colTypes?: ('label' | 'text' | 'select' | 'textarea')[];  // per-column control (overrides inputCols)
  colOptions?: (string[] | null)[];      // options for 'select' columns
  colPlaceholders?: (string | null)[];   // placeholder/helper text for 'text'/'textarea' columns
  rows?: { cells: string[] }[];    // cells[i] = default/label text for column i
  colWidths?: (string | null)[];   // optional CSS width per column (null = auto); enables table-fixed layout
  addable?: boolean;               // table: show an "+ Add row" control (form only) to append blank rows
  addLabel?: string;               // label for the add-row control (default "Add row")
}
export interface TemplateSection {
  no: string;
  title: string;
  kind: 'grid' | 'seasonal' | 'qualitative';
  columns: (number | string)[];
  forecastFromIdx: number;
  rows: TemplateRow[];
  subSectors?: string[];
  subSectorValues?: string[];      // optional default values for the sub-sector fields (prefill)
  seasonalCategories?: SeasonalCategory[];
  regionGroups?: RegionGroup[];
  endUsers?: EndUsers;
  totalLabel?: string;             // override for the region×segment auto-total row label
  qualitative?: QualitativeData;
  description?: string;            // override for the section-card sub-title description
}
export interface EntityTemplate {
  productId: string;
  product: string;
  entityTab: string;
  entityName: string;
  formType: string;
  sourceFile: string;
  reportingUnit: string;
  years: number[];
  sections: TemplateSection[];
}

// ---- Template lookup (11 generic products; LPG is bespoke) ------------------

const TEMPLATES: Record<string, EntityTemplate> = {
  gasoline_98: gasoline as unknown as EntityTemplate,
  diesel:      diesel as unknown as EntityTemplate,
  cng:         cng as unknown as EntityTemplate,
  natural_gas: naturalGas as unknown as EntityTemplate,
  fuel_oil:    fuelOil as unknown as EntityTemplate,
  jet_a1:      jetFuel as unknown as EntityTemplate,
  saf:         saf as unknown as EntityTemplate,
  lng:         lng as unknown as EntityTemplate,
  ethanol:     ethanol as unknown as EntityTemplate,
  biodiesel:   biodiesel as unknown as EntityTemplate,
  naphtha:     naphtha as unknown as EntityTemplate,
};

// ---- Revised reporting period -------------------------------------------
// Per the latest BRD the annual reporting range is 2019–2026 (was 2019–2030):
//   • 2019–2025 → historical, pre-populated, read-only
//   • 2026      → current reporting year, editable by the entity submitter
// 2027–2030 are removed from every table/calculation. `REPORT_END_YEAR` is the
// last (current) reporting year; `forecastFromIdx` is repurposed to mark that
// single editable column (everything before it is historical/read-only).
export const REPORT_END_YEAR = 2026;

// Keep only the entries of a values array that align to years <= REPORT_END_YEAR
// (value arrays run parallel to the template's original `years`).
function clampToPeriod<T>(originalYears: number[], arr: T[]): T[] {
  return arr.filter((_, i) => Number(originalYears[i]) <= REPORT_END_YEAR);
}

function trimTemplate(t: EntityTemplate): EntityTemplate {
  const years = t.years.filter((y) => Number(y) <= REPORT_END_YEAR);
  const forecastFromIdx = Math.max(0, years.indexOf(REPORT_END_YEAR));
  const sections = t.sections.map((s) => ({
    ...s,
    columns: s.columns.filter((c) => typeof c !== 'number' || c <= REPORT_END_YEAR),
    forecastFromIdx,
    rows: s.rows.map((r) => ({ ...r, values: clampToPeriod(t.years, r.values) })),
    seasonalCategories: s.seasonalCategories?.map((c) => ({
      label: c.label,
      qByYear: Object.fromEntries(Object.entries(c.qByYear).filter(([y]) => Number(y) <= REPORT_END_YEAR)),
    })),
    regionGroups: s.regionGroups?.map((g) => ({
      region: g.region,
      segments: g.segments.map((seg) => ({ label: seg.label, values: clampToPeriod(t.years, seg.values) })),
    })),
    endUsers: s.endUsers ? {
      standalone: s.endUsers.standalone.map((r) => ({ label: r.label, values: clampToPeriod(t.years, r.values) })),
      regionGroups: s.endUsers.regionGroups.map((g) => ({ region: g.region, segments: g.segments.map((seg) => ({ label: seg.label, values: clampToPeriod(t.years, seg.values) })) })),
    } : undefined,
  }));
  return { ...t, years, sections };
}

// Pre-trim every template once to the revised reporting period.
const TRIMMED_TEMPLATES: Record<string, EntityTemplate> = Object.fromEntries(
  Object.entries(TEMPLATES).map(([k, v]) => [k, trimTemplate(v)]),
);

/** Returns the generic template for a product, or null for LPG (bespoke). */
export function getEntityTemplate(productId: string): EntityTemplate | null {
  return TRIMMED_TEMPLATES[productId] ?? null;
}

// ---- Per-product draft + entity binding (all 12) ---------------------------

export interface ProductDraftMeta {
  productId: string;
  draftId: string;            // deterministic draft submission id
  productLabel: string;
  productLabelLong: string;
  productModel: 'distributor' | 'supplier';
  entityId: string;
  entityName: string;
  formType: string;
}

export const PRODUCT_DRAFTS: Record<string, ProductDraftMeta> = {
  lpg:         { productId: 'lpg',         draftId: 'sub-lpg-2025-draft',         productLabel: 'LPG',          productLabelLong: 'Liquefied Petroleum Gas', productModel: 'distributor', entityId: 'adnoc-dist',   entityName: 'ADNOC Distribution',          formType: 'Producer · Bulk + Cylinder' },
  gasoline_98: { productId: 'gasoline_98', draftId: 'sub-gasoline_98-2025-draft', productLabel: 'Gasoline',     productLabelLong: 'Gasoline (98)',           productModel: 'distributor', entityId: 'adnoc-dist',   entityName: 'ADNOC Distribution',          formType: 'Distributor' },
  diesel:      { productId: 'diesel',      draftId: 'sub-diesel-2025-draft',      productLabel: 'Diesel',       productLabelLong: 'Diesel',                  productModel: 'distributor', entityId: 'adnoc-dist',   entityName: 'ADNOC Distribution',          formType: 'Distributor' },
  cng:         { productId: 'cng',         draftId: 'sub-cng-2025-draft',         productLabel: 'CNG',          productLabelLong: 'Compressed Natural Gas',  productModel: 'distributor', entityId: 'adnoc-dist',   entityName: 'ADNOC Distribution',          formType: 'Distributor' },
  natural_gas: { productId: 'natural_gas', draftId: 'sub-natural_gas-2025-draft', productLabel: 'Natural Gas',  productLabelLong: 'Natural Gas',             productModel: 'distributor', entityId: 'adnoc-gas',    entityName: 'ADNOC Gas',                   formType: 'Distributor' },
  fuel_oil:    { productId: 'fuel_oil',    draftId: 'sub-fuel_oil-2025-draft',    productLabel: 'Fuel Oil',     productLabelLong: 'Fuel Oil',                productModel: 'supplier',    entityId: 'monjasa',      entityName: 'Monjasa',                     formType: 'Supplier' },
  jet_a1:      { productId: 'jet_a1',      draftId: 'sub-jet_a1-2025-draft',      productLabel: 'Jet A-1',      productLabelLong: 'Jet A-1',                 productModel: 'supplier',    entityId: 'adnoc',        entityName: 'ADNOC',                       formType: 'Supplier' },
  saf:         { productId: 'saf',         draftId: 'sub-saf-2025-draft',         productLabel: 'SAF',          productLabelLong: 'Sustainable Aviation Fuel', productModel: 'supplier',  entityId: 'adnoc',        entityName: 'ADNOC',                       formType: 'Supplier' },
  lng:         { productId: 'lng',         draftId: 'sub-lng-2025-draft',         productLabel: 'LNG',          productLabelLong: 'Liquefied Natural Gas',   productModel: 'supplier',    entityId: 'adnoc',        entityName: 'ADNOC',                       formType: 'Supplier' },
  ethanol:     { productId: 'ethanol',     draftId: 'sub-ethanol-2025-draft',     productLabel: 'Ethanol',      productLabelLong: 'Ethanol',                 productModel: 'distributor', entityId: 'petrochem',    entityName: 'Distribution (Petrochem)',    formType: 'Distributor' },
  biodiesel:   { productId: 'biodiesel',   draftId: 'sub-biodiesel-2025-draft',   productLabel: 'Biodiesel',    productLabelLong: 'Biodiesel',               productModel: 'distributor', entityId: 'neutral-fuels',entityName: 'Neutral Fuels',               formType: 'Distributor' },
  naphtha:     { productId: 'naphtha',     draftId: 'sub-naphtha-2025-draft',     productLabel: 'Naphtha',      productLabelLong: 'Naphtha',                 productModel: 'supplier',    entityId: 'petrochem',    entityName: 'Distribution by Petrochem',   formType: 'Supplier' },
};

/** Draft route for the product currently selected in the dropdown. */
export function draftRouteFor(productId: string): string {
  const meta = PRODUCT_DRAFTS[productId] ?? PRODUCT_DRAFTS.lpg;
  return `/pps/submissions/${meta.draftId}/edit`;
}
