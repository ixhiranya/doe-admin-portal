// =============================================================================
// Gas Register · Fleet Movement — BN 11 of the Gas Register SDD.
// -----------------------------------------------------------------------------
// Fleet, driver and operator records come from ASATEEL. Gas System Companies
// submit an end-of-trip report adding the gas-specific quantity (in L or SCM),
// gas type and product type.
// =============================================================================

import { listFleet } from './fleet';
import { listDrivers } from './drivers';
import { listAssets, PERMIT_HOLDERS } from './assets';
import { listCustomers } from './customers';
import type { GasTypeId, ProductTypeId, Unit } from './technical';

export type MovementStatus = 'In Transit' | 'Delivered' | 'Pending Submission';

export interface FleetMovement {
  id: string;
  trafficId: string;                 // ASATEEL
  permissionNumber: string;          // ASATEEL
  permitHolderId: string;
  permitHolderName: string;
  driverId: string;
  driverName: string;
  operatorName: string;
  vehiclePlate: string;
  // Gas-specific (submitted by company)
  unit: Unit;                        // selected at submission time
  quantity: number;                  // captured in `unit`
  gasType: GasTypeId;
  productType: ProductTypeId;
  // Endpoints
  originFacilityId: string;
  originFacilityName: string;
  destinationCustomerId?: string;
  destinationName: string;
  movementDateTime: string;          // ISO
  routeReference: string;            // ASATEEL
  status: MovementStatus;
  createdAt: string;
}

let counter = 8000;
const sn = () => 'FM_' + (++counter);

const today = new Date();
function offsetHours(h: number): string {
  const d = new Date(today); d.setHours(today.getHours() - h);
  return d.toISOString();
}

function seedMovements(): FleetMovement[] {
  const fleet = listFleet();
  const drivers = listDrivers();
  const assets = listAssets();
  const customers = listCustomers();
  if (fleet.length === 0 || drivers.length === 0 || assets.length === 0) return [];
  const rows: FleetMovement[] = [];
  const gasTypes: GasTypeId[] = ['lpg', 'cng', 'propane', 'ng'];
  const productTypes: ProductTypeId[] = ['lpg_storage_tank', 'cng_decanting_point', 'cylinder_storage', 'sng_distribution'];
  const statuses: MovementStatus[] = ['Delivered', 'Delivered', 'In Transit', 'Pending Submission', 'Delivered', 'Delivered', 'In Transit'];

  for (let i = 0; i < 14; i++) {
    const fl = fleet[i % fleet.length];
    const drv = drivers[i % drivers.length];
    const origin = assets.find((a) => a.permitHolderId === fl.permitHolderId) ?? assets[i % assets.length];
    const destCustomer = customers[i % customers.length];
    const ph = PERMIT_HOLDERS.find((p) => p.id === fl.permitHolderId) ?? PERMIT_HOLDERS[0];

    rows.push({
      id: sn(),
      trafficId: `TID-${(31000 + i * 17).toString()}`,
      permissionNumber: `PERM-${(20240000 + i * 13).toString()}`,
      permitHolderId: ph.id,
      permitHolderName: ph.name,
      driverId: drv.id,
      driverName: drv.driverName,
      operatorName: ph.name,
      vehiclePlate: fl.plateNumber ?? `UAE-${(20100 + i * 17).toString().slice(-5)}`,
      unit: i % 3 === 0 ? 'SCM' : 'L',
      quantity: [8_500, 12_400, 22_000, 4_200, 18_500, 9_800, 15_600, 7_300, 6_400, 11_900, 14_200, 8_100, 5_500, 19_400][i],
      gasType: gasTypes[i % gasTypes.length],
      productType: productTypes[i % productTypes.length],
      originFacilityId: origin.id,
      originFacilityName: origin.facilityName,
      destinationCustomerId: destCustomer.id,
      destinationName: destCustomer.buildingName,
      movementDateTime: offsetHours(i * 6 + 2),
      routeReference: `RT-${(50000 + i * 19).toString()}`,
      status: statuses[i % statuses.length],
      createdAt: offsetHours(i * 6 + 1),
    });
  }
  return rows;
}

export const SEED_FLEET_MOVEMENTS: FleetMovement[] = seedMovements();
export function listFleetMovements(): FleetMovement[] { return SEED_FLEET_MOVEMENTS; }
export function getFleetMovement(id: string): FleetMovement | undefined {
  return SEED_FLEET_MOVEMENTS.find((m) => m.id === id);
}
