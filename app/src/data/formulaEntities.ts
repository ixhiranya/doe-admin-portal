// src/data/formulaEntities.ts
// ============================================================================
// Hard-coded catalog behind the Formula Configuration builder.
//
//   PRODUCT   — the 12 petroleum products (mirrors the PPS data model's
//               PRODUCT master table)
//   ENTITY    — companies that submit data (mirrors COMPANY master table)
//   TEMPLATE  — one reusable form per (entity, product) pair, carrying its
//               own list of fields (mirrors FORM_TEMPLATE + FORM_FIELD)
//
// A formula is always built "against" one base Template (chosen at the top
// of the New Formula modal) — that template's fields are the "Self" fields.
// Picking "Cross" lets the builder resolve a *different* template from an
// Entity + Product combination and pull a field from there instead.
// Swap this file for a real metadata API later without touching the UI.
// ============================================================================

export interface CatalogField {
  id: string;      // field_code, e.g. 'imports'
  label: string;    // label shown to users, e.g. 'Imports'
}

export interface Product {
  id: string;
  name: string;
}

export interface Entity {
  id: string;
  name: string;
  code: string;   // short token used in expressions, e.g. 'ADNOC' -> $ADNOC.field
}

export interface Template {
  id: string;         // e.g. 'TMP-001'
  entityId: string;
  productId: string;
  name: string;        // e.g. 'Diesel — ADNOC Distribution'
  fields: CatalogField[];
}

export const PRODUCTS: Product[] = [
  { id: 'diesel',       name: 'Diesel' },
  { id: 'lpg',          name: 'LPG' },
  { id: 'natural_gas',  name: 'Natural Gas' },
];

export const ENTITIES: Entity[] = [
  { id: 'adnoc_dist', name: 'ADNOC Distribution', code: 'ADNOC' },
  { id: 'enoc',        name: 'ENOC',              code: 'ENOC' },
  { id: 'grey_market', name: 'Grey Market',        code: 'GREY_MKT' },
  { id: 'emsteel',     name: 'EMSTEEL',            code: 'EMSTEEL' },
];

export const TEMPLATES: Template[] = [
  {
    id: 'TMP-001',
    entityId: 'adnoc_dist',
    productId: 'diesel',
    name: 'Diesel — ADNOC Distribution',
    fields: [
      { id: 'local_production',  label: 'Local Production / Transfer' },
      { id: 'imports',           label: 'Imports' },
      { id: 'total_supply',      label: 'Total Supply' },
      { id: 'abu_dhabi_city',    label: 'Abu Dhabi City' },
      { id: 'al_ain',            label: 'Al Ain' },
      { id: 'al_dhafra',         label: 'Al Dhafra' },
      { id: 'total_demand',      label: 'Total Demand' },
    ],
  },
  {
    id: 'TMP-002',
    entityId: 'grey_market',
    productId: 'diesel',
    name: 'Diesel — Grey Market',
    fields: [
      { id: 'grey_imports',   label: 'Grey Market Imports' },
      { id: 'grey_sales',     label: 'Grey Market Sales' },
      { id: 'commercial',     label: 'Commercial' },
      { id: 'residential',    label: 'Residential' },
    ],
  },
  {
    id: 'TMP-003',
    entityId: 'adnoc_dist',
    productId: 'lpg',
    name: 'LPG — ADNOC Distribution',
    fields: [
      { id: 'cylinder_sales',   label: 'Cylinder Sales' },
      { id: 'bulk_sales',       label: 'Bulk Sales' },
      { id: 'total_lpg_supply', label: 'Total LPG Supply' },
    ],
  },
  {
    id: 'TMP-004',
    entityId: 'enoc',
    productId: 'diesel',
    name: 'Diesel — ENOC',
    fields: [
      { id: 'local_production',  label: 'Local Production / Transfer' },
      { id: 'imports',           label: 'Imports' },
      { id: 'total_supply',      label: 'Total Supply' },
      { id: 'commercial',        label: 'Commercial' },
    ],
  },
  {
    id: 'TMP-005',
    entityId: 'emsteel',
    productId: 'natural_gas',
    name: 'Natural Gas — EMSTEEL',
    fields: [
      { id: 'facility_consumption', label: 'Facility Consumption' },
      { id: 'contracted_volume',    label: 'Contracted Volume' },
    ],
  },
];

export const OPERATORS: { value: string; label: string }[] = [
  { value: '+',   label: '+ Add' },
  { value: '-',   label: '− Subtract' },
  { value: '*',   label: '× Multiply' },
  { value: '/',   label: '÷ Divide' },
  { value: '==',  label: '= Equals' },
  { value: '!=',  label: '≠ Not equal' },
  { value: '>',   label: '> Greater than' },
  { value: '<',   label: '< Less than' },
  { value: '>=',  label: '≥ Greater or equal' },
  { value: '<=',  label: '≤ Less or equal' },
  { value: 'AND', label: 'AND' },
  { value: 'OR',  label: 'OR' },
  { value: '(',   label: '(' },
  { value: ')',   label: ')' },
];

// Return type = the unit the formula's result is expressed in. Colors match
// the chips shown in the list table's "Return Type (Unit)" column.
export const RETURN_TYPES: { value: string; label: string; chipClass: string }[] = [
  { value: 'kt',      label: 'kt (kilotonnes)',   chipClass: 'bg-sky-50 text-sky-700' },
  { value: 'litres',  label: 'Litres',             chipClass: 'bg-violet-50 text-violet-700' },
  { value: 'bnbtu',   label: 'BnBtu (Billion Btu)', chipClass: 'bg-emerald-50 text-emerald-700' },
  { value: 'barrels', label: 'Barrels',             chipClass: 'bg-amber-50 text-amber-700' },
  { value: 'pct',     label: 'Percentage',          chipClass: 'bg-rose-50 text-rose-700' },
  { value: 'aed',     label: 'AED (Currency)',       chipClass: 'bg-neutral-100 text-neutral-700' },
];

export function returnTypeMeta(value: string) {
  return RETURN_TYPES.find((r) => r.value === value) ?? { value, label: value, chipClass: 'bg-neutral-100 text-neutral-700' };
}

export function templateById(id: string): Template | undefined {
  return TEMPLATES.find((t) => t.id === id);
}

export function entityById(id: string): Entity | undefined {
  return ENTITIES.find((e) => e.id === id);
}

export function entityByCode(code: string): Entity | undefined {
  return ENTITIES.find((e) => e.code.toLowerCase() === code.toLowerCase());
}

// All fields available on an entity, pooled across every template that
// belongs to it (deduped by field id) — used by the Expression Editor's
// "." autocomplete, which isn't scoped to a single product/template.
export function fieldsForEntity(entityId: string): CatalogField[] {
  const seen = new Map<string, CatalogField>();
  for (const t of TEMPLATES) {
    if (t.entityId !== entityId) continue;
    for (const f of t.fields) if (!seen.has(f.id)) seen.set(f.id, f);
  }
  return [...seen.values()];
}

export function productById(id: string): Product | undefined {
  return PRODUCTS.find((p) => p.id === id);
}

// Resolve the single template for an (entity, product) pair — this is what
// makes the Template ID field "reflect" once both Cross dropdowns are set.
export function resolveTemplate(entityId: string, productId: string): Template | undefined {
  return TEMPLATES.find((t) => t.entityId === entityId && t.productId === productId);
}

// Products this entity actually has a template for — powers the Expression
// Editor's $entity.<product> autocomplete step.
export function productsForEntity(entityId: string): Product[] {
  const ids = new Set(TEMPLATES.filter((t) => t.entityId === entityId).map((t) => t.productId));
  return PRODUCTS.filter((p) => ids.has(p.id));
}

// Template(s) matching an (entity, product) pair — usually just one, but
// returned as a list so the editor stays correct if that ever changes.
export function templatesFor(entityId: string, productId: string): Template[] {
  return TEMPLATES.filter((t) => t.entityId === entityId && t.productId === productId);
}
