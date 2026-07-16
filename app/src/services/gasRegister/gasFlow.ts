// =============================================================================
// Gas Register · Daily Gas Flow (Inflow & Outflow)
// -----------------------------------------------------------------------------
// Two submission types tracked separately:
//   • Inflow  — gas received by a permit holder from a registered supplier
//   • Outflow — gas delivered by a permit holder to a registered customer
// Both pull their FK lookups from the existing masters (Suppliers, Customers,
// Assets) so the dropdowns reuse the same data that already populates each
// master's list page.
// =============================================================================

import { GAS_TYPES, PERMIT_HOLDERS } from './assets';
import { listSuppliers } from './suppliers';
import { listCustomers, customerLegacyBusinessType } from './customers';
import { listAssets } from './assets';

export { GAS_TYPES, PERMIT_HOLDERS } from './assets';
export { listSuppliers } from './suppliers';
export { listCustomers } from './customers';
export { listAssets } from './assets';

export type BusinessType = 'Residential' | 'Commercial';

// ============================================================
// Inflow
// ============================================================
export interface DailyInflow {
  id: string;                       // INF_xxxx
  date: string;                     // ISO date
  supplierId: string;
  supplierName: string;
  volumeLiters: number;
  gasType: string;
  assetId: string;                  // gas storage
  assetName: string;
  permitHolderId: string;
  permitHolderName: string;
  createdAt: string;
}

let infCounter = 9000;
const infSn = () => 'INF_' + (++infCounter);

// Build seed inflow records from existing supplier + asset data so the
// references resolve in the UI.
function seedInflow(): DailyInflow[] {
  const suppliers = listSuppliers();
  const assets    = listAssets();
  const rows: DailyInflow[] = [];
  const today = new Date();
  for (let i = 0; i < 12; i++) {
    const supplier = suppliers[i % suppliers.length];
    // pick an asset belonging to the same permit holder if possible
    const asset = assets.find((a) => a.permitHolderId === supplier.permitHolderId) ?? assets[i % assets.length];
    const d = new Date(today);
    d.setDate(today.getDate() - i * 2);
    rows.push({
      id: infSn(),
      date: d.toISOString().slice(0, 10),
      supplierId: supplier.id, supplierName: supplier.name,
      volumeLiters: [12_000, 22_000, 38_000, 5_000, 18_000, 30_000, 8_500, 50_000, 24_000, 15_000, 9_000, 42_000][i],
      gasType: supplier.gasTypes[0] ?? 'LPG (Mixed) / Liquefied Gases',
      assetId: asset.id, assetName: asset.facilityName,
      permitHolderId: supplier.permitHolderId, permitHolderName: supplier.permitHolderName,
      createdAt: d.toISOString(),
    });
  }
  return rows;
}

export const SEED_INFLOW: DailyInflow[] = seedInflow();
export function listInflow(): DailyInflow[] { return SEED_INFLOW; }
export function getInflow(id: string): DailyInflow | undefined { return SEED_INFLOW.find((r) => r.id === id); }

// ============================================================
// Outflow
// ============================================================
export interface DailyOutflow {
  id: string;                       // OUT_xxxx
  date: string;
  customerType: BusinessType;
  customerId: string;
  customerName: string;
  quantityLiters: number;
  assetId: string;                  // source storage asset
  assetName: string;
  gasType: string;
  permitHolderId: string;
  permitHolderName: string;
  createdAt: string;
}

let outCounter = 7000;
const outSn = () => 'OUT_' + (++outCounter);

function seedOutflow(): DailyOutflow[] {
  const customers = listCustomers();
  const assets    = listAssets();
  const rows: DailyOutflow[] = [];
  const today = new Date();
  for (let i = 0; i < 14; i++) {
    const customer = customers[i % customers.length];
    const asset = assets.find((a) => a.permitHolderId === customer.permitHolderId) ?? assets[i % assets.length];
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const legacyType = customerLegacyBusinessType(customer);
    const baseQty = legacyType === 'Residential' ? [80, 120, 90, 60, 110][i % 5] : [800, 1_400, 2_500, 600, 1_800, 3_200][i % 6];
    rows.push({
      id: outSn(),
      date: d.toISOString().slice(0, 10),
      customerType: legacyType,
      customerId: customer.id, customerName: customer.buildingName,
      quantityLiters: baseQty,
      assetId: asset.id, assetName: asset.facilityName,
      gasType: (customer.gasAllocations[0]?.gasType as string) ?? 'lpg',
      permitHolderId: customer.permitHolderId, permitHolderName: customer.permitHolderName,
      createdAt: d.toISOString(),
    });
  }
  return rows;
}

export const SEED_OUTFLOW: DailyOutflow[] = seedOutflow();
export function listOutflow(): DailyOutflow[] { return SEED_OUTFLOW; }
export function getOutflow(id: string): DailyOutflow | undefined { return SEED_OUTFLOW.find((r) => r.id === id); }

export function formatLiters(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toLocaleString(undefined, { maximumFractionDigits: 2 })} ML`;
  if (n >= 1_000)     return `${(n / 1_000).toLocaleString(undefined, { maximumFractionDigits: 1 })} kL`;
  return `${n.toLocaleString()} L`;
}
