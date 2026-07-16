import type {
  PpsProduct, PpsDataset, Operator, Submission, SubmissionTask,
  SubmissionSection, Region, SubmissionStatus,
} from '../types/pps';
import { PRODUCT_DRAFTS } from './pps-fields';

// ============================================================================
// PPS seed data — 12 fuels split between Distributor and Supplier model.
// All volumes are in kilotonnes (kt) unless flagged otherwise.
// 12-year time series 2019–2030 (history through 2024, forecast 2025–2030).
// ============================================================================

export const PPS_PRODUCTS: PpsProduct[] = [
  { id: 'natural_gas', label: 'Natural Gas',  model: 'distributor', annualVolumeMt: 4.06, unit: 'Mt' },
  { id: 'gasoline_98', label: 'Gasoline (98)',model: 'distributor', annualVolumeMt: 2.71, unit: 'Mt' },
  { id: 'diesel',      label: 'Diesel',       model: 'distributor', annualVolumeMt: 2.19, unit: 'Mt', greyMarketSharePct: 17.3 },
  { id: 'lpg',         label: 'LPG',          model: 'distributor', annualVolumeMt: 1.13, unit: 'Mt' },
  { id: 'ethanol',     label: 'Ethanol',      model: 'distributor', annualVolumeMt: 0.24, unit: 'Mt' },
  { id: 'cng',         label: 'CNG',          model: 'distributor', annualVolumeMt: 0.23, unit: 'Mt' },
  { id: 'biodiesel',   label: 'Biodiesel',    model: 'distributor', annualVolumeMt: 0.11, unit: 'Mt' },
  { id: 'lng',         label: 'LNG',          model: 'supplier',    annualVolumeMt: 2.28, unit: 'Mt' },
  { id: 'fuel_oil',    label: 'Fuel Oil',     model: 'supplier',    annualVolumeMt: 2.13, unit: 'Mt' },
  { id: 'jet_a1',      label: 'Jet A-1',      model: 'supplier',    annualVolumeMt: 1.78, unit: 'Mt' },
  { id: 'naphtha',     label: 'Naphtha',      model: 'supplier',    annualVolumeMt: 0.77, unit: 'Mt' },
  { id: 'saf',         label: 'SAF',          model: 'supplier',    annualVolumeMt: 0.05, unit: 'Mt' },
];

export function getProduct(id: string): PpsProduct | undefined {
  return PPS_PRODUCTS.find((p) => p.id === id);
}

// ----- BRD master product order + entity→product mapping ---------------------
// Source: "PPS Baseline dashboard BRD" — §master sequence + §16 Entity-to-Product
// Mapping. Used ONLY to order/filter the Entity User's product-selection dropdown
// on the submission screen (DOE internal screens keep the full default list).
export const PPS_PRODUCT_ORDER: string[] = [
  'gasoline_98', 'diesel', 'fuel_oil', 'jet_a1', 'saf', 'natural_gas',
  'lpg', 'lng', 'cng', 'ethanol', 'biodiesel', 'naphtha',
];

export const ENTITY_PRODUCTS: Record<string, string[]> = {
  // ADNOC Distribution (Fatima Al Hashemi) is mapped to all 12 petroleum products
  // — shown in master order. (Other entities keep their BRD §16 subsets.)
  'ADNOC Distribution':        ['gasoline_98', 'diesel', 'fuel_oil', 'jet_a1', 'saf', 'natural_gas', 'lpg', 'lng', 'cng', 'ethanol', 'biodiesel', 'naphtha'],
  'ENOC':                      ['gasoline_98', 'diesel'],
  'Monjasa':                   ['fuel_oil'],
  'ADNOC':                     ['jet_a1', 'saf', 'lng'],
  'ADNOC Gas':                 ['natural_gas'],
  'Distribution (Petrochem)':  ['ethanol', 'naphtha'],
  'Distribution by Petrochem': ['ethanol', 'naphtha'],
  'Neutral Fuels':             ['biodiesel'],
};

/** Product ids visible to an entity, in BRD master order. Unknown entity → all. */
export function entityProductIds(entityName?: string): string[] {
  const mapped = entityName ? ENTITY_PRODUCTS[entityName] : undefined;
  const allow = mapped ? new Set(mapped) : null;
  return PPS_PRODUCT_ORDER.filter((id) => !allow || allow.has(id));
}

// Inverse mapping — the entities authorised to submit each product (BRD §16
// Entity-to-Product Mapping). Drives the entity filter in "All submissions".
export const PRODUCT_ENTITIES: Record<string, string[]> = {
  gasoline_98: ['ADNOC Distribution', 'ENOC'],
  diesel:      ['ADNOC Distribution', 'ENOC', 'Grey Market (25+ resellers)'],
  fuel_oil:    ['Monjasa', 'Vitol Bunkers', 'Peninsula Fuel Supply', 'Pearl Energy', 'Oryx Fuel Trading'],
  jet_a1:      ['ADNOC'],
  saf:         ['ADNOC'],
  lng:         ['ADNOC'],
  natural_gas: ['ADNOC Gas', 'ADNOC City Gas', 'Dolphin Energy', 'Abu Dhabi Ports', 'EGA', 'EWEC', 'Emirates Steel', 'Al Ain Cement', 'Eco Hub'],
  lpg:         ['ADNOC Distribution', 'Al Fanar Gas', 'Sergas', 'Unigaz', 'Royal Gas', 'Skill for Gas', 'Brothers Gas', 'Bin Sidra', 'SABACO', 'SPEC', 'Emarat'],
  cng:         ['ADNOC Distribution', 'CloudEnergi'],
  ethanol:     ['Petrochem', 'Chemstock', 'NEXBA Healthcare', 'Al Nahda International', 'Direct Importers (3 companies)'],
  biodiesel:   ['Neutral Fuels', 'Integrated Biofuels', 'BioD Technology', 'Blue Biofuels'],
  naphtha:     ['Petrochem'],
};

/** Entities authorised to submit a product, in BRD order. */
export function productEntities(productId: string): string[] {
  return PRODUCT_ENTITIES[productId] ?? [];
}

// ----- Time-series generator (deterministic per product) ---------------------

function seriesFor(product: PpsProduct): PpsDataset['series'] {
  const baseYear = 2019;
  const endYear  = 2030;
  // Base scale derived from the product's annual volume (Mt → kt) for 2024
  const base2024kt = Math.round(product.annualVolumeMt * 1000);
  // Determine growth assumption per product family
  const growth =
    product.id === 'saf' ? 0.55 :
    product.id === 'biodiesel' ? 0.20 :
    product.id === 'ethanol' ? 0.10 :
    product.id === 'cng' ? 0.06 :
    product.id === 'naphtha' ? 0.04 :
    product.id === 'lng' ? 0.06 :
    product.id === 'natural_gas' ? 0.045 :
    0.035;

  const importShare =
    product.id === 'diesel'   ? 0.176 :
    product.id === 'gasoline_98' ? 0.10 :
    product.id === 'naphtha'  ? 0.05 :
    product.id === 'fuel_oil' ? 0.15 :
    product.id === 'jet_a1'   ? 0.18 :
    product.id === 'lpg'      ? 0.12 :
    product.id === 'saf'      ? 0.85 :
    product.id === 'biodiesel'? 0.55 :
    0.08;

  const series: PpsDataset['series'] = [];
  for (let y = baseYear; y <= endYear; y++) {
    const dy = y - 2024;
    const total = Math.round(base2024kt * Math.pow(1 + growth, dy));
    const imports = Math.round(total * importShare);
    const production = total - imports;
    // Region split (approx)
    const adc = Math.round(total * 0.52);
    const ai  = Math.round(total * 0.27);
    const ad  = total - adc - ai;
    // Sector split (commercial vs construction) — only applicable to liquid fuels
    const commercial = Math.round(total * 0.62);
    const construction = total - commercial;
    // Monthly distribution (sums to production / imports respectively)
    const monthlyProductionKt = monthlyDistribute(production, [0.84, 0.87, 0.90, 0.93, 0.97, 1.00, 1.02, 1.04, 1.07, 1.09, 1.11, 1.14], 0.97);
    const monthlyImportsKt    = monthlyDistribute(imports, [0.95, 0.97, 1.00, 1.01, 1.02, 1.01, 0.99, 0.98, 1.01, 1.04, 1.05, 1.07], 1.01);
    series.push({
      year: y,
      production,
      imports,
      salesByRegion: { 'Abu Dhabi City': adc, 'Al Ain': ai, 'Al Dhafra': ad },
      salesBySector: { commercial, construction },
      monthlyProductionKt,
      monthlyImportsKt,
    });
  }
  return series;
}

function monthlyDistribute(total: number, weights: number[], scale: number) {
  const weightSum = weights.reduce((s, w) => s + w, 0);
  return weights.map((w) => Math.round((total / weightSum) * w * scale * 100) / 100);
}

// ----- Operators per product (most-recent-year) ------------------------------

function operatorsFor(product: PpsProduct, year: number): Operator[] {
  // Inject realistic share splits per fuel; sums equal the dataset year total
  const last = seriesFor(product).find((s) => s.year === year)!;
  const totalKt = last.production + last.imports;
  const greyKt = product.greyMarketSharePct
    ? Math.round(totalKt * (product.greyMarketSharePct / 100))
    : 0;

  switch (product.id) {
    case 'diesel': {
      const adnoc = totalKt - greyKt - 10;
      return [
        { id: 'op-001', name: 'ADNOC Distribution', licenseNumber: 'OP-001', shareKt: adnoc, isOfficial: true },
        { id: 'grey',   name: 'Grey market',        licenseNumber: 'UNREGULATED · TPI EST.', shareKt: greyKt, isOfficial: false },
        { id: 'op-003', name: 'ENOC',               licenseNumber: 'OP-003', shareKt: 10,    isOfficial: true },
      ];
    }
    case 'gasoline_98': return [
      { id: 'op-001', name: 'ADNOC Distribution', licenseNumber: 'OP-001', shareKt: Math.round(totalKt * 0.72), isOfficial: true },
      { id: 'op-002', name: 'Emarat',             licenseNumber: 'OP-002', shareKt: Math.round(totalKt * 0.22), isOfficial: true },
      { id: 'op-003', name: 'ENOC',               licenseNumber: 'OP-003', shareKt: Math.round(totalKt * 0.06), isOfficial: true },
    ];
    case 'lpg': return [
      { id: 'op-001', name: 'ADNOC Distribution', licenseNumber: 'OP-001', shareKt: Math.round(totalKt * 0.84), isOfficial: true },
      { id: 'op-004', name: 'Emirates Gas',       licenseNumber: 'OP-004', shareKt: Math.round(totalKt * 0.12), isOfficial: true },
      { id: 'op-005', name: 'ENOC',               licenseNumber: 'OP-005', shareKt: Math.round(totalKt * 0.04), isOfficial: true },
    ];
    case 'natural_gas': return [
      { id: 'op-100', name: 'ADNOC Gas',          licenseNumber: 'OP-100', shareKt: Math.round(totalKt * 0.93), isOfficial: true },
      { id: 'op-101', name: 'Dolphin Energy',     licenseNumber: 'OP-101', shareKt: Math.round(totalKt * 0.07), isOfficial: true },
    ];
    case 'lng': return [
      { id: 'op-200', name: 'ADNOC LNG',          licenseNumber: 'OP-200', shareKt: Math.round(totalKt * 1),    isOfficial: true },
    ];
    case 'jet_a1': return [
      { id: 'op-300', name: 'ADNOC Distribution', licenseNumber: 'OP-001', shareKt: Math.round(totalKt * 0.96), isOfficial: true },
      { id: 'op-301', name: 'Air BP',             licenseNumber: 'OP-301', shareKt: Math.round(totalKt * 0.04), isOfficial: true },
    ];
    case 'saf': return [
      { id: 'op-400', name: 'Masdar',             licenseNumber: 'OP-400', shareKt: Math.round(totalKt * 0.65), isOfficial: true },
      { id: 'op-401', name: 'Boeing-Etihad SAF',  licenseNumber: 'OP-401', shareKt: Math.round(totalKt * 0.35), isOfficial: true },
    ];
    default: return [
      { id: 'op-001', name: 'ADNOC Distribution', licenseNumber: 'OP-001', shareKt: Math.round(totalKt * 0.78), isOfficial: true },
      { id: 'op-003', name: 'ENOC',               licenseNumber: 'OP-003', shareKt: Math.round(totalKt * 0.22), isOfficial: true },
    ];
  }
}

export function datasetFor(productId: string, year = 2024): PpsDataset | undefined {
  const product = getProduct(productId);
  if (!product) return undefined;
  const series = seriesFor(product);
  const operators = operatorsFor(product, year);
  const last = series.find((s) => s.year === year)!;
  // 12-month seasonality (avg over history)
  const months = Array.from({ length: 12 }, (_, m) => {
    const total = series
      .filter((s) => s.year <= year)
      .reduce((sum, s) => sum + s.monthlyProductionKt[m] + s.monthlyImportsKt[m], 0);
    return Math.round(total / series.filter((s) => s.year <= year).length);
  });
  return { product, series, operators, seasonalityKt: months };
}

// ============================================================================
// Submissions — entity view
// ============================================================================

// Generic section generator that produces the standard 4 sections for any
// product (1.1 Supply, 2.1 Demand by region, 2.2 Demand by sector, 2.4
// Seasonality). LPG also gets an additional 2.3 Bulk-vs-Cylinder section.
export function productSections(productId: string, years: number[]): SubmissionSection[] {
  const product = getProduct(productId);
  if (!product) return [];
  const series = seriesFor(product);
  const yearSeries = (extract: (s: AnnualSlice) => number) =>
    years.map((y) => {
      const s = series.find((x) => x.year === y);
      return s ? extract(s) : 0;
    });

  const localProd  = yearSeries((s) => s.production);
  const imports    = yearSeries((s) => s.imports);
  const totalSupply = localProd.map((v, i) => v + imports[i]);

  const regionAdc = yearSeries((s) => s.salesByRegion['Abu Dhabi City']);
  const regionAi  = yearSeries((s) => s.salesByRegion['Al Ain']);
  const regionAd  = yearSeries((s) => s.salesByRegion['Al Dhafra']);
  const regionTotal = regionAdc.map((v, i) => v + regionAi[i] + regionAd[i]);

  const sectorCom = yearSeries((s) => s.salesBySector.commercial);
  const sectorCon = yearSeries((s) => s.salesBySector.construction);
  const sectorTotal = sectorCom.map((v, i) => v + sectorCon[i]);

  const sections: SubmissionSection[] = [
    {
      id: '1-1', number: '1.1',
      title: `Supply of ${product.label} to the Emirate of Abu Dhabi`,
      description: `Annual volumes · ${years[0]}–${years[years.length - 1]} · unit: kilotonne (kt)`,
      reconciled: true,
      rows: [
        { field: 'Local production / transfer', values: localProd },
        { field: 'Imports',                     values: imports },
        { field: `Total supply from ${product.id === 'natural_gas' ? 'ADNOC Gas' : 'ADNOC'}`, values: totalSupply, isFormula: true },
      ],
    },
    {
      id: '2-1', number: '2.1',
      title: 'Demand by region',
      description: `Total ${product.label} volumes sold into each of the three regions of Abu Dhabi.`,
      rows: [
        { field: 'Abu Dhabi City', values: regionAdc },
        { field: 'Al Ain',         values: regionAi },
        { field: 'Al Dhafra',      values: regionAd },
        { field: 'Total demand by region', values: regionTotal, isFormula: true },
      ],
    },
    {
      id: '2-2', number: '2.2',
      title: 'Demand by sector',
      description: `${product.label}-specific split between Commercial / transport and Construction / industrial end-use.`,
      rows: [
        { field: 'Commercial · transport',     values: sectorCom },
        { field: 'Construction · industrial',  values: sectorCon },
        { field: 'Total demand by sector',     values: sectorTotal, isFormula: true },
      ],
    },
  ];

  if (productId === 'lpg') {
    sections.push({
      id: '2-3', number: '2.3',
      title: 'Demand by product form, region & sector',
      description: 'LPG-specific · split by Bulk (industrial) vs Cylinder (residential/commercial) — feeds dashboard sector mix',
      rows: [],  // rendered as a separate matrix on the detail page
    });
  }

  sections.push({
    id: '2-4', number: '2.4',
    title: `Seasonal trends · quarterly volumes sold (${Math.max(...years.filter((y) => y <= 2024))})`,
    description: 'Quarterly totals for the most-recent historical year. Feeds the seasonal line chart on the PPS dashboard.',
    rows: [],  // quarterly matrix rendered separately for LPG; placeholder for others
  });

  return sections;
}

// Re-import the AnnualSlice type so the generator above type-checks; defined
// here at the bottom to keep the public type list at the top.
import type { AnnualSlice } from '../types/pps';

export const PPS_SUBMISSIONS: Submission[] = [
  {
    id: 'sub-lpg-2025-draft',
    ref: 'SUB-LPG-2025-ADNOC-003',
    productId: 'lpg',
    productLabel: 'LPG',
    productLabelLong: 'Liquefied Petroleum Gas',
    productModel: 'distributor',
    entityId: 'adnoc-dist',
    entityName: 'ADNOC Distribution',
    formType: 'Producer · Bulk + Cylinder',
    periodLabel: '2025 annual',
    cycleYear: 2025,
    years: [2019, 2020, 2021, 2022, 2023, 2024, 2025, 2026, 2027, 2028, 2029, 2030],
    submittedBy: 'Fatima Al Hashemi',
    version: 'v0.3 (draft)',
    status: 'draft',
    workflow: [],
    sections: undefined as any,  // populated below
    draftCompletePct: 42,
  },
  {
    id: 'sub-gas-2025',
    ref: 'SUB-GAS-2025-ADNOC-001',
    productId: 'gasoline_98',
    productLabel: 'Gasoline',
    productLabelLong: 'Gasoline (98)',
    productModel: 'distributor',
    entityId: 'adnoc-dist',
    entityName: 'ADNOC Distribution',
    formType: 'Producer',
    periodLabel: '2025 annual',
    cycleYear: 2025,
    years: [2019,2020,2021,2022,2023,2024,2025,2026,2027,2028,2029,2030],
    submittedBy: 'Fatima Al Hashemi',
    submittedOn: '2026-03-12T11:08:00Z',
    version: 'v1',
    status: 'approved',
    workflow: [
      { at: '2026-03-12T11:08:00Z', stage: 'submitted',  by: 'Fatima Al Hashemi' },
      { at: '2026-03-15T09:00:00Z', stage: 'doe_review', by: 'Khalid Al Qubaisi', byRole: 'DoE PPS' },
      { at: '2026-03-18T13:30:00Z', stage: 'approved',   by: 'Mariam Al Mansouri', byRole: 'DoE' },
    ],
    sections: undefined as any,  // populated below
  },
  {
    id: 'sub-dsl-2025',
    ref: 'SUB-DSL-2025-ADNOC-001',
    productId: 'diesel',
    productLabel: 'Diesel',
    productLabelLong: 'Diesel',
    productModel: 'distributor',
    entityId: 'adnoc-dist',
    entityName: 'ADNOC Distribution',
    formType: 'Producer',
    periodLabel: '2025 annual',
    cycleYear: 2025,
    years: [2019,2020,2021,2022,2023,2024,2025,2026,2027,2028,2029,2030],
    submittedBy: 'Fatima Al Hashemi',
    submittedOn: '2026-03-26T09:42:00Z',
    version: 'v1',
    status: 'in_review',
    workflow: [
      { at: '2026-03-26T09:42:00Z', stage: 'submitted',  by: 'Fatima Al Hashemi' },
      { at: '2026-03-28T10:00:00Z', stage: 'doe_review', by: 'Khalid Al Qubaisi', byRole: 'DoE PPS' },
    ],
    sections: undefined as any,  // populated below
  },
  {
    id: 'sub-lpg-2024',
    ref: 'SUB-LPG-2024-ADNOC-002',
    productId: 'lpg',
    productLabel: 'LPG',
    productLabelLong: 'Liquefied Petroleum Gas',
    productModel: 'distributor',
    entityId: 'adnoc-dist',
    entityName: 'ADNOC Distribution',
    formType: 'Producer · Bulk + Cylinder',
    periodLabel: '2024 annual',
    cycleYear: 2024,
    years: [2019,2020,2021,2022,2023,2024,2025,2026,2027,2028,2029,2030],
    submittedBy: 'Fatima Al Hashemi',
    submittedOn: '2025-03-14T16:02:00Z',
    version: 'v2 (amended)',
    status: 'approved',
    workflow: [
      { at: '2025-03-02T14:32:00Z', stage: 'submitted',  by: 'Fatima Al Hashemi (v1)' },
      { at: '2025-03-05T09:14:00Z', stage: 'doe_review', by: 'Khalid Al Qubaisi', byRole: 'DoE PPS' },
      { at: '2025-03-07T11:48:00Z', stage: 'returned',   by: 'Khalid Al Qubaisi', byRole: 'DoE PPS', comment: 'Q3 cylinder volume variance > 20%' },
      { at: '2025-03-14T16:02:00Z', stage: 'resubmitted',by: 'Fatima Al Hashemi (v2)' },
      { at: '2025-03-18T10:21:00Z', stage: 'approved',   by: 'Mariam Al Mansouri', byRole: 'DoE' },
    ],
    sections: undefined as any,  // populated below
    reviewRemarks: [
      {
        at: '2025-03-07T11:48:00Z',
        by: 'Khalid Al Qubaisi',
        byRole: 'DoE PPS',
        kind: 'returned',
        title: 'Returned for clarification',
        body: 'Cylinder LPG · Q3 2024 entered as 148 kt is 28% below the 2023 Q3 baseline (206 kt). Please reconcile against ADNOC Distribution wholesale records and re-submit with a supporting note.',
      },
      {
        at: '2025-03-14T16:02:00Z',
        by: 'Fatima Al Hashemi',
        kind: 'resubmitted',
        title: 'Re-submitted (v2)',
        body: 'Cylinder Q3 volume reconciled against the wholesale ledger after maintenance shutdown at Mussafah Filling Plant (12–24 Aug 2024) was excluded in v1.',
        fromValue: '148 kt',
        toValue: '204 kt',
      },
      {
        at: '2025-03-18T10:21:00Z',
        by: 'Mariam Al Mansouri',
        byRole: 'DoE',
        kind: 'approved',
        title: 'Approved & published',
        body: 'Variance resolved and aligned with TPI partner returns (±1.2%). Submission v2 published to the PPS dashboard for analytics use.',
      },
    ],
    comments: [
      { id: 'c1', at: '2025-03-02T14:38:00Z', byUserId: 'adnoc.dist', byUserName: 'Fatima Al Hashemi', byUserRole: 'Entity Submitter', entityTag: 'ADNOC DIST.', internal: false,
        body: 'Submitted with the LPG 2024 actuals + 2025-2030 forecast. Q3 cylinder figure reflects the August maintenance window at Mussafah — flagged in the supporting note for the reviewer.' },
      { id: 'c2', at: '2025-03-05T09:18:00Z', byUserId: 'pps.reviewer', byUserName: 'Khalid Al Qubaisi', byUserRole: 'DoE PPS Reviewer', internal: true, replyToId: 'c1',
        body: 'Tagged for variance review — Q3 cylinder is the only outlier, otherwise reconciles cleanly with TPI partner returns. Will request a brief note before returning.' },
      { id: 'c3', at: '2025-03-07T12:02:00Z', byUserId: 'pps.reviewer', byUserName: 'Khalid Al Qubaisi', byUserRole: 'DoE PPS Reviewer', internal: false, replyToId: 'c1',
        body: 'Returned the submission for clarification on the Q3 cylinder figure. Please attach the wholesale-ledger extract showing the Mussafah outage period when re-submitting.' },
      { id: 'c4', at: '2025-03-14T16:05:00Z', byUserId: 'adnoc.dist', byUserName: 'Fatima Al Hashemi', byUserRole: 'Entity Submitter', entityTag: 'ADNOC DIST.', internal: false,
        body: 'Re-submitted as v2 with the corrected Q3 cylinder (204 kt) and wholesale-ledger extract attached. Variance is now within 4% of the 2023 baseline.' },
      { id: 'c5', at: '2025-03-17T11:45:00Z', byUserId: 'pps.approver', byUserName: 'Mariam Al Mansouri', byUserRole: 'DoE Approver', internal: true,
        body: 'Reconciliation confirmed against TPI returns (±1.2%). Approving for dashboard publication.' },
    ],
  },
];

// ---------------------------------------------------------------------------
// Per-product 2025 draft seeds — one per Product + Entity template so that each
// product's "New submission" opens a real (deterministic) draft. LPG already
// has its own draft above; the other 11 are generated from PRODUCT_DRAFTS.
// ---------------------------------------------------------------------------
const DRAFT_YEARS = [2019, 2020, 2021, 2022, 2023, 2024, 2025, 2026, 2027, 2028, 2029, 2030];
Object.values(PRODUCT_DRAFTS)
  .filter((m) => m.productId !== 'lpg')
  .forEach((m, i) => {
    PPS_SUBMISSIONS.push({
      id: m.draftId,
      ref: `SUB-${m.productLabel.toUpperCase().replace(/[^A-Z0-9]+/g, '')}-2025-${m.entityName.split(' ')[0].toUpperCase()}-${String(100 + i)}`,
      productId: m.productId,
      productLabel: m.productLabel,
      productLabelLong: m.productLabelLong,
      productModel: m.productModel,
      entityId: m.entityId,
      entityName: m.entityName,
      formType: m.formType,
      periodLabel: '2025 annual',
      cycleYear: 2025,
      years: DRAFT_YEARS,
      submittedBy: m.entityName,
      version: 'v0.1 (draft)',
      status: 'draft',
      workflow: [],
      sections: undefined as any,
      draftCompletePct: 0,
    });
  });

// ---------------------------------------------------------------------------
// Per-product submission HISTORY — gives every product multiple records across
// statuses (Draft / Submitted / In DoE Review / Returned / Approved) with
// realistic dates, versions and workflow progress. Skips (product, year) pairs
// already covered by the hand-authored records above (e.g. lpg-2024, gas-2025,
// dsl-2025) to avoid duplicates.
// ---------------------------------------------------------------------------
const HIST_SKIP_2024 = new Set(['lpg']);              // lpg-2024 already exists
const HIST_SKIP_2025 = new Set(['gasoline_98', 'diesel']); // gas-2025 / dsl-2025 exist
const HIST_STATUS_CYCLE: SubmissionStatus[] = ['submitted', 'in_review', 'returned', 'approved'];

function histProgress(status: SubmissionStatus, cycleYear: number, entity: string) {
  const y = cycleYear + 1;
  const submittedAt = `${y}-03-12T10:08:00Z`;
  const reviewAt = `${y}-03-16T09:00:00Z`;
  const finalAt = `${y}-03-20T13:30:00Z`;
  const wf: Submission['workflow'] = [{ at: submittedAt, stage: 'submitted', by: entity }];
  let version = 'v1';
  let remarks: Submission['reviewRemarks'] = [];
  if (status !== 'submitted') {
    wf.push({ at: reviewAt, stage: 'doe_review', by: 'Khalid Al Qubaisi', byRole: 'DoE PPS' });
  }
  if (status === 'returned') {
    wf.push({ at: finalAt, stage: 'returned', by: 'Khalid Al Qubaisi', byRole: 'DoE PPS', comment: 'Q3 volume variance > 20% vs prior year — please reconcile and re-submit.' });
    remarks = [{ at: finalAt, by: 'Khalid Al Qubaisi', byRole: 'DoE PPS', kind: 'returned', title: 'Returned for clarification', body: 'Q3 volume variance exceeds 20% versus the prior year. Please reconcile against internal records and re-submit with a supporting note.' }];
  }
  if (status === 'approved') {
    wf.push({ at: finalAt, stage: 'approved', by: 'Mariam Al Mansouri', byRole: 'DoE' });
  }
  if (status === 'rejected') {
    wf.push({ at: finalAt, stage: 'rejected', by: 'Mariam Al Mansouri', byRole: 'DoE' });
    remarks = [{ at: finalAt, by: 'Mariam Al Mansouri', byRole: 'DoE', kind: 'returned', title: 'Submission rejected',
      body: 'Submission rejected — reported volumes could not be reconciled with TPI partner returns and exceed the ±5% tolerance. Create an amendment with corrected figures and re-submit.' }];
  }
  return { wf, submittedOn: submittedAt, version, remarks };
}

type DraftMetaT = (typeof PRODUCT_DRAFTS)[keyof typeof PRODUCT_DRAFTS];
function pushHist(m: DraftMetaT, cycleYear: number, status: SubmissionStatus, suffix: string, refSeq: number, versionOverride?: string) {
  const h = histProgress(status, cycleYear, m.entityName);
  PPS_SUBMISSIONS.push({
    id: `sub-${m.productId}-${suffix}`,
    ref: `SUB-${m.productLabel.toUpperCase().replace(/[^A-Z0-9]+/g, '')}-${cycleYear}-${m.entityName.split(' ')[0].toUpperCase()}-${String(200 + refSeq)}`,
    productId: m.productId,
    productLabel: m.productLabel,
    productLabelLong: m.productLabelLong,
    productModel: m.productModel,
    entityId: m.entityId,
    entityName: m.entityName,
    formType: m.formType,
    periodLabel: `${cycleYear} annual`,
    cycleYear,
    years: DRAFT_YEARS,
    submittedBy: m.entityName,
    submittedOn: h.submittedOn,
    version: versionOverride ?? h.version,
    status,
    workflow: h.wf,
    sections: undefined as any,
    reviewRemarks: h.remarks,
  });
}

Object.values(PRODUCT_DRAFTS).forEach((m, idx) => {
  if (!HIST_SKIP_2025.has(m.productId)) pushHist(m, 2025, HIST_STATUS_CYCLE[idx % 4], '2025f', idx * 3 + 1);
  if (!HIST_SKIP_2024.has(m.productId)) pushHist(m, 2024, 'approved', '2024h', idx * 3 + 2, 'v2 (amended)');
  pushHist(m, 2023, 'approved', '2023h', idx * 3 + 3);
});

// Every product gets a full 5-status set (adds Rejected + In DoE Review + a fresh
// Submitted) so every product's All-submissions table shows all five statuses.
Object.values(PRODUCT_DRAFTS).forEach((m, idx) => {
  pushHist(m, 2024, 'rejected', 'rej', 400 + idx);
  pushHist(m, 2025, 'in_review', 'rev', 420 + idx, 'v2 (amended)');
  pushHist(m, 2026, 'submitted', 'sub', 440 + idx);
});

// Populate each seeded submission's sections using the generic generator.
PPS_SUBMISSIONS.forEach((sub) => {
  sub.sections = productSections(sub.productId, sub.years);
});

// LPG demand by form / region / sector (BRD §2.3 figures from the screenshot)
export const LPG_DEMAND_MATRIX: { region: Region; bulkIndustrial: number; bulkCommercial: number; cylinderResidential: number; cylinderCommercial: number }[] = [
  { region: 'Abu Dhabi City', bulkIndustrial: 342, bulkCommercial: 184, cylinderResidential: 418, cylinderCommercial: 112 },
  { region: 'Al Ain',         bulkIndustrial: 114, bulkCommercial: 78,  cylinderResidential: 198, cylinderCommercial: 56  },
  { region: 'Al Dhafra',      bulkIndustrial: 168, bulkCommercial: 42,  cylinderResidential: 92,  cylinderCommercial: 28  },
];

// LPG seasonality (BRD §2.4 — quarterly volumes for 2024, kt)
export const LPG_SEASONAL_MATRIX = [
  { form: 'Bulk LPG',     q1: 262, q2: 198, q3: 184, q4: 284 },
  { form: 'Cylinder LPG', q1: 248, q2: 196, q3: 204, q4: 256 },
];

// Review remarks & amendment trail for LPG 2024 (v1 → v2)
export const LPG_2024_REVIEW_REMARKS = [
  {
    at: '2025-03-07T11:48:00Z',
    by: 'Khalid Al Qubaisi',
    byRole: 'DoE PPS',
    kind: 'returned' as const,
    title: 'Returned for clarification',
    body: 'Cylinder LPG · Q3 2024 entered as 148 kt is 28% below the 2023 Q3 baseline (206 kt). Please reconcile against ADNOC Distribution wholesale records and re-submit with a supporting note.',
  },
  {
    at: '2025-03-14T16:02:00Z',
    by: 'Fatima Al Hashemi',
    kind: 'resubmitted' as const,
    title: 'Re-submitted (v2)',
    body: 'Cylinder Q3 volume reconciled against the wholesale ledger after maintenance shutdown at Mussafah Filling Plant (12–24 Aug 2024) was excluded in v1.',
    fromValue: '148 kt',
    toValue: '204 kt',
  },
  {
    at: '2025-03-18T10:21:00Z',
    by: 'Mariam Al Mansouri',
    byRole: 'DoE',
    kind: 'approved' as const,
    title: 'Approved & published',
    body: 'Variance resolved and aligned with TPI partner returns (±1.2%). Submission v2 published to the PPS dashboard for analytics use.',
  },
];

// Two product-specific pending-task cards per product (so the section is never
// half-empty): an overdue 2025 draft (Continue draft) + a not-started 2026 cycle
// (Start). Same card design as before.
export const PPS_SUBMISSION_TASKS: SubmissionTask[] = Object.values(PRODUCT_DRAFTS).flatMap((m, i) => {
  const draftPct = m.productId === 'lpg' ? 42 : 20 + ((i * 13) % 60);
  return [
    {
      id: `task-${m.productId}-2025`,
      productId: m.productId,
      productLabel: m.productLabel,
      cycleYear: 2025,
      formType: `${m.formType} · 12 year-cols`,
      dueOn: '2026-04-30T00:00:00Z',
      status: 'overdue',
      draftPct,
      remindersSent: 2,
      notes: 'Reminder 1 sent 23 Apr · Reminder 2 sent 28 Apr · Delay notification sent 1 May (CC: Khalid Al Qubaisi, DoE PPS).',
    },
    {
      id: `task-${m.productId}-2026`,
      productId: m.productId,
      productLabel: m.productLabel,
      cycleYear: 2026,
      formType: `${m.formType} · 12 year-cols`,
      dueOn: '2026-07-31T00:00:00Z',
      status: 'not_started',
      notes: `${m.entityName} system integration is available — data can be auto-populated on form open.`,
    },
  ];
});

// ----- Recent submissions strip on the regulator dashboard -------------------

export const RECENT_PRODUCT_SUBMISSIONS = [
  { period: '2024 Q4', range: 'Oct – Dec', operator: 'ADNOC Distribution',      region: 'Abu Dhabi City' as Region, volumeKt: 552, trend: 'flat-up'    as const, status: 'reconciled'    as const },
  { period: '2024 Q4', range: 'Oct – Dec', operator: 'ENOC',                    region: 'Al Dhafra' as Region,      volumeKt: 3.2, trend: 'down'       as const, status: 'pending'       as const },
  { period: '2024 Q4', range: 'Oct – Dec', operator: 'Grey-market reconciliation', region: 'Al Dhafra' as Region,   volumeKt: 96,  trend: 'flat'       as const, status: 'overdue-4d'    as const },
  { period: '2024 Q3', range: 'Jul – Sep', operator: 'ADNOC Distribution',      region: 'Al Ain' as Region,         volumeKt: 202, trend: 'up'         as const, status: 'reconciled'    as const },
  { period: '2024 Q3', range: 'Jul – Sep', operator: 'ADNOC Distribution',      region: 'Abu Dhabi City' as Region, volumeKt: 510, trend: 'flat'       as const, status: 'reconciled'    as const },
];
