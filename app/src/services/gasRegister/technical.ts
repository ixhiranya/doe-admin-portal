// =============================================================================
// Gas Register · Technical Master Data — BN 8 of the Gas Register SDD.
// -----------------------------------------------------------------------------
// Shared configuration for the whole Gas Register:
//   • Type of Gas (incl. NG and CNG added per business feedback)
//   • Product Type (CNG decanting point added per business feedback)
//   • Unit of Measurement (Litres / SCM) + per-gas conversion factors
//   • Configurable per-(Category, Certificate) applicability flag (Section 3.14)
//
// All other Gas Register modules — Customers, Suppliers, Assets, Fleet, Inflow,
// Outflow, Fleet Movement, Maintenance, Reports, Dashboard — pull their gas-
// type and product-type dropdowns from this file so the catalog stays single-
// source-of-truth.
// =============================================================================

// ---------------------------------------------------------------------------
// 1. Type of Gas (SDD §3.8.1)
// ---------------------------------------------------------------------------
// NG, CNG and LPG are added per the business feedback. The chemistry-based
// values (PROPANE / BUTANE / BUTADIENES / BENZOL) are retained.
export type GasTypeId =
  | 'ng' | 'cng' | 'lpg'
  | 'propane' | 'butane' | 'butadienes' | 'benzol';

export interface GasTypeDef {
  id: GasTypeId;
  label: string;       // Display label used everywhere
  shortLabel: string;  // Tighter label for chips / badges
  state: 'gas' | 'liquefied';
  // Conversion factor from one Litre to SCM at standard conditions (15 °C,
  // 1 atm). Per the SDD §3.8.3 this is configurable per gas type. The values
  // below are reasonable industry approximations used by the prototype's
  // L ↔ SCM displays; production values should be sourced from the live
  // Technical Master Data administered by DOE.
  litresPerScm: number;
}

export const GAS_TYPES: GasTypeDef[] = [
  { id: 'ng',         label: 'NG (Natural Gas)',                                            shortLabel: 'NG',         state: 'gas',       litresPerScm: 1000   },
  { id: 'cng',        label: 'CNG (Compressed Natural Gas)',                                shortLabel: 'CNG',        state: 'gas',       litresPerScm: 250    },
  { id: 'lpg',        label: 'LPG (Liquefied Petroleum Gas)',                               shortLabel: 'LPG',        state: 'liquefied', litresPerScm: 4.07   },
  { id: 'propane',    label: 'Propane (Liquefied) / Liquefied Gases',                       shortLabel: 'PROPANE',    state: 'liquefied', litresPerScm: 3.95   },
  { id: 'butane',     label: 'Butane (Liquefied — not chemically pure) / Liquefied Gases',  shortLabel: 'BUTANE',     state: 'liquefied', litresPerScm: 4.20   },
  { id: 'butadienes', label: 'Butadienes (not chemically pure) / Liquefied Gases',          shortLabel: 'BUTADIENES', state: 'liquefied', litresPerScm: 3.86   },
  { id: 'benzol',     label: 'Benzol (Benzene) / Oils',                                     shortLabel: 'BENZOL',     state: 'liquefied', litresPerScm: 4.50   },
];

export function gasTypeById(id: GasTypeId): GasTypeDef | undefined {
  return GAS_TYPES.find((g) => g.id === id);
}

// ---------------------------------------------------------------------------
// 2. Product Type (SDD §3.8.2) — used by Storage Methods + Inflow + Outflow
// ---------------------------------------------------------------------------
// "CNG decanting point" added per business feedback.
export type ProductTypeId =
  | 'cng_decanting_point'
  | 'lpg_storage_tank'
  | 'sng_distribution'
  | 'cylinder_storage';

export interface ProductTypeDef {
  id: ProductTypeId;
  label: string;
}

export const PRODUCT_TYPES: ProductTypeDef[] = [
  { id: 'cng_decanting_point', label: 'CNG decanting point' },
  { id: 'lpg_storage_tank',    label: 'LPG Storage Tank'    },
  { id: 'sng_distribution',    label: 'SNG Distribution'    },
  { id: 'cylinder_storage',    label: 'Cylinder Storage'    },
];

export function productTypeById(id: ProductTypeId): ProductTypeDef | undefined {
  return PRODUCT_TYPES.find((p) => p.id === id);
}

// ---------------------------------------------------------------------------
// 3. Unit of Measurement (SDD §3.8.3)
// ---------------------------------------------------------------------------
export type Unit = 'L' | 'SCM';

export const UNITS: { id: Unit; label: string; description: string }[] = [
  { id: 'L',   label: 'Litres',               description: 'Default volumetric unit for liquid gases (LPG, BUTANE, PROPANE, BENZOL).' },
  { id: 'SCM', label: 'Standard Cubic Metre', description: 'Default volumetric unit for gaseous flows (NG, CNG); used in parallel with litres for storage + capacity.' },
];

/**
 * Convert a volume value between Litres and SCM using the configured
 * conversion factor for the given gas type. If the units are equal, returns
 * the input. If the gas-type factor is missing, falls back to 1:1 so the
 * prototype never throws.
 */
export function convertVolume(value: number, from: Unit, to: Unit, gasTypeId: GasTypeId | undefined): number {
  if (from === to) return value;
  const g = gasTypeById(gasTypeId ?? 'lpg');
  const factor = g?.litresPerScm ?? 1;
  if (from === 'L' && to === 'SCM') return value / factor;
  if (from === 'SCM' && to === 'L') return value * factor;
  return value;
}

/** Format a volume value with its unit and the converted equivalent in parens. */
export function formatVolumeDual(value: number, unit: Unit, gasTypeId?: GasTypeId): string {
  const other = unit === 'L' ? 'SCM' : 'L';
  const converted = convertVolume(value, unit, other, gasTypeId);
  const fmt = (n: number, u: Unit) =>
    u === 'L'
      ? (n >= 1000 ? `${(n / 1000).toLocaleString(undefined, { maximumFractionDigits: 2 })} kL` : `${Math.round(n).toLocaleString()} L`)
      : `${converted.toLocaleString(undefined, { maximumFractionDigits: 2 })} SCM`;
  return `${fmt(value, unit)} (${fmt(converted, other)})`;
}

// ---------------------------------------------------------------------------
// 4. Per-(Category, Certificate) Applicability (SDD §3.14.3)
// ---------------------------------------------------------------------------
// On initial deployment every certificate is Applicable=TRUE for every
// Category, but exposing this as configuration lets DOE retire individual
// (Category, Certificate) pairs in future without a code change.
import type { CertSlot } from './compliance';
import type { CustomerCategory } from './customers';

export type CertApplicability = Partial<Record<CustomerCategory, Partial<Record<CertSlot, boolean>>>>;

// Default — all 4 certs applicable for every category.
export const DEFAULT_CERT_APPLICABILITY: CertApplicability = {};
