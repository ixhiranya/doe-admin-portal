// =============================================================================
// Gas Register · Connection & Disconnection Management — BN 13 of the SDD.
// -----------------------------------------------------------------------------
// Each customer / facility has a Connection Status (Active / Disconnected /
// Suspended) AND a history of state changes. A disconnected customer must not
// appear in the Outflow customer dropdown.
// =============================================================================

import { listCustomers } from './customers';
import { listAssets } from './assets';

export type ConnectionAction = 'Connect' | 'Disconnect' | 'Reconnect' | 'Suspend';
export type ConnectionReason = 'End of contract' | 'Non-payment' | 'Safety' | 'Customer request' | 'Regulatory order' | 'Other';

export interface ConnectionEvent {
  id: string;
  customerId: string;
  customerName: string;
  permitHolderId: string;
  permitHolderName: string;
  action: ConnectionAction;
  effectiveDate: string;             // ISO date
  reason: ConnectionReason;
  reasonNotes?: string;
  supportingDocument?: { fileName: string; uploadedAt: string };
  linkedAssetId?: string;
  linkedAssetName?: string;
  meterReadingLiters?: number;
  meterReadingScm?: number;
  performedBy: string;
  createdAt: string;
}

let counter = 4400;
const sn = () => 'CXN_' + (++counter);

const today = new Date();
function daysAgo(n: number): string {
  const d = new Date(today); d.setDate(today.getDate() - n);
  return d.toISOString().slice(0, 10);
}

function seedEvents(): ConnectionEvent[] {
  const customers = listCustomers();
  const assets = listAssets();
  if (customers.length === 0) return [];
  const rows: ConnectionEvent[] = [];
  const actions: ConnectionAction[] = ['Connect', 'Disconnect', 'Reconnect', 'Suspend', 'Connect'];
  const reasons: ConnectionReason[] = ['End of contract', 'Non-payment', 'Safety', 'Customer request', 'Regulatory order'];

  // Initial connection for every customer
  customers.forEach((c, i) => {
    rows.push({
      id: sn(),
      customerId: c.id, customerName: c.buildingName,
      permitHolderId: c.permitHolderId, permitHolderName: c.permitHolderName,
      action: 'Connect',
      effectiveDate: c.dateOfContract,
      reason: 'Customer request',
      linkedAssetId: assets.find((a) => a.permitHolderId === c.permitHolderId)?.id,
      linkedAssetName: assets.find((a) => a.permitHolderId === c.permitHolderId)?.facilityName,
      meterReadingLiters: 0,
      meterReadingScm: 0,
      performedBy: c.permitHolderName,
      createdAt: c.dateOfContract + 'T08:00:00Z',
    });
    // For Disconnected/Suspended customers add a follow-up event
    if (c.connectionStatus === 'Disconnected') {
      rows.push({
        id: sn(),
        customerId: c.id, customerName: c.buildingName,
        permitHolderId: c.permitHolderId, permitHolderName: c.permitHolderName,
        action: 'Disconnect',
        effectiveDate: daysAgo(120 - i * 4),
        reason: reasons[i % reasons.length],
        reasonNotes: 'Contract not renewed; supply terminated as agreed.',
        supportingDocument: { fileName: `disconnect-${c.id.toLowerCase()}.pdf`, uploadedAt: new Date().toISOString() },
        linkedAssetId: assets.find((a) => a.permitHolderId === c.permitHolderId)?.id,
        linkedAssetName: assets.find((a) => a.permitHolderId === c.permitHolderId)?.facilityName,
        meterReadingLiters: 14_220 + i * 110,
        meterReadingScm: 3_492 + i * 27,
        performedBy: c.permitHolderName,
        createdAt: daysAgo(120 - i * 4) + 'T11:00:00Z',
      });
    }
    if (c.connectionStatus === 'Suspended') {
      rows.push({
        id: sn(),
        customerId: c.id, customerName: c.buildingName,
        permitHolderId: c.permitHolderId, permitHolderName: c.permitHolderName,
        action: 'Suspend',
        effectiveDate: daysAgo(40),
        reason: 'Safety',
        reasonNotes: 'Inspection flagged temporary safety concern; supply paused.',
        supportingDocument: { fileName: `suspend-${c.id.toLowerCase()}.pdf`, uploadedAt: new Date().toISOString() },
        linkedAssetId: assets.find((a) => a.permitHolderId === c.permitHolderId)?.id,
        linkedAssetName: assets.find((a) => a.permitHolderId === c.permitHolderId)?.facilityName,
        meterReadingLiters: 5_811 + i * 80,
        meterReadingScm: 1_428 + i * 20,
        performedBy: c.permitHolderName,
        createdAt: daysAgo(40) + 'T09:00:00Z',
      });
    }
    void actions;
  });
  // Order most recent first
  rows.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return rows;
}

export const SEED_CONNECTION_EVENTS: ConnectionEvent[] = seedEvents();
export function listConnectionEvents(): ConnectionEvent[] { return SEED_CONNECTION_EVENTS; }
export function getConnectionEvent(id: string): ConnectionEvent | undefined { return SEED_CONNECTION_EVENTS.find((e) => e.id === id); }
export function eventsForCustomer(customerId: string): ConnectionEvent[] {
  return SEED_CONNECTION_EVENTS.filter((e) => e.customerId === customerId);
}
