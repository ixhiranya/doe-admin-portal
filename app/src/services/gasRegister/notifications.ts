// =============================================================================
// Gas Register · BN 12 — Company Registration · DED Notifications &
// Permit-Renewal Reminders (SDD §3.12 / §3.12.1)
// -----------------------------------------------------------------------------
// Three responsibilities collapsed into one service:
//   1. PermitRecord — per permit holder, the Petroleum Trade Permit + Trade
//      Licence numbers and their expiry dates.
//   2. Reminder derivation — at 60 / 30 / 7 days before expiry, and on / after
//      expiry, the system "sends" an email to the permit holder (cc DOE PPS
//      Team) per the SDD §3.12.1 template.
//   3. DED notification log — an audit list of issuance / expiry events that
//      were notified to the Department of Economic Development per §3.12.
//
// Because this is a UI prototype, the "send" action is captured as a deterministic
// derivation from the seed data — every reminder + DED notification on screen
// is what the cron job would have generated had it run today.
// =============================================================================

import { PERMIT_HOLDERS } from './assets';

const TODAY_ISO = new Date().toISOString().slice(0, 10);
const DAY_MS = 86400000;

// ---------------------------------------------------------------------------
// 1. PermitRecord
// ---------------------------------------------------------------------------
export interface PermitRecord {
  permitHolderId: string;
  permitHolderName: string;
  permitNumber: string;             // Petroleum Trade Permit
  permitIssueDate: string;
  permitExpiryDate: string;
  tradeLicenceNumber: string;
  tradeLicenceExpiryDate: string;
  primaryContactEmail: string;
  primaryContactName: string;
}

// Seed — 7 records, one per permit holder, with a spread of statuses so the
// dashboard shows every band (valid, expiring soon, expired Trade Licence).
function offsetDate(days: number): string {
  return new Date(Date.now() + days * DAY_MS).toISOString().slice(0, 10);
}

export const PERMITS: PermitRecord[] = [
  { permitHolderId: 'PH-001', permitHolderName: 'ADNOC Distribution',         permitNumber: 'PTP-2024-001', permitIssueDate: '2024-06-01', permitExpiryDate: offsetDate(180), tradeLicenceNumber: 'CN-1000045', tradeLicenceExpiryDate: offsetDate(220), primaryContactEmail: 'pps.compliance@adnocdistribution.ae', primaryContactName: 'Khalid Al Hammadi' },
  { permitHolderId: 'PH-002', permitHolderName: 'Emirates Gas LLC',           permitNumber: 'PTP-2024-002', permitIssueDate: '2024-08-15', permitExpiryDate: offsetDate(45),  tradeLicenceNumber: 'CN-2000125', tradeLicenceExpiryDate: offsetDate(120), primaryContactEmail: 'permits@emiratesgas.ae',           primaryContactName: 'Saeed Al Mazrouei' },
  { permitHolderId: 'PH-003', permitHolderName: 'ADNOC LNG',                  permitNumber: 'PTP-2024-003', permitIssueDate: '2024-10-12', permitExpiryDate: offsetDate(20),  tradeLicenceNumber: 'CN-3000871', tradeLicenceExpiryDate: offsetDate(15),  primaryContactEmail: 'compliance@adnoclng.ae',            primaryContactName: 'Reema Al Marri' },
  { permitHolderId: 'PH-004', permitHolderName: 'Dolphin Energy',             permitNumber: 'PTP-2024-004', permitIssueDate: '2024-01-20', permitExpiryDate: offsetDate(5),   tradeLicenceNumber: 'CN-4002211', tradeLicenceExpiryDate: offsetDate(-12), primaryContactEmail: 'pps@dolphinenergy.ae',              primaryContactName: 'Mariam Al Ali' },
  { permitHolderId: 'PH-005', permitHolderName: 'ENOC / Emarat',              permitNumber: 'PTP-2024-005', permitIssueDate: '2024-03-08', permitExpiryDate: offsetDate(95),  tradeLicenceNumber: 'CN-5009017', tradeLicenceExpiryDate: offsetDate(60),  primaryContactEmail: 'gas.permits@enoc.com',              primaryContactName: 'Tariq Bin Hamad' },
  { permitHolderId: 'PH-006', permitHolderName: 'Petroleum Development Company', permitNumber: 'PTP-2024-006', permitIssueDate: '2024-05-19', permitExpiryDate: offsetDate(-8), tradeLicenceNumber: 'CN-6001188', tradeLicenceExpiryDate: offsetDate(140), primaryContactEmail: 'permits@pdcuae.ae',                 primaryContactName: 'Hessa Al Falasi' },
  { permitHolderId: 'PH-007', permitHolderName: 'Al Yasat Petroleum',         permitNumber: 'PTP-2024-007', permitIssueDate: '2024-12-01', permitExpiryDate: offsetDate(320), tradeLicenceNumber: 'CN-7004411', tradeLicenceExpiryDate: offsetDate(280), primaryContactEmail: 'admin@alyasat.ae',                  primaryContactName: 'Omar Al Suwaidi' },
];

void PERMIT_HOLDERS; // retained import for type-context

// ---------------------------------------------------------------------------
// 2. Reminders
// ---------------------------------------------------------------------------
export type ReminderKind = 'permit_renewal_60d' | 'permit_renewal_30d' | 'permit_renewal_7d' | 'permit_expired' | 'trade_licence_expired';
export type ReminderSeverity = 'info' | 'warning' | 'danger';

export interface Reminder {
  id: string;
  kind: ReminderKind;
  severity: ReminderSeverity;
  permitHolderId: string;
  permitHolderName: string;
  permitNumber: string;
  permitExpiryDate: string;
  tradeLicenceNumber: string;
  tradeLicenceExpiryDate: string;
  daysToExpiry: number;          // days from today to permit expiry (negative if expired)
  triggerDate: string;           // ISO — when this reminder fires (60/30/7d before or at expiry)
  recipient: string;
  blocked: boolean;              // true when Trade Licence has expired (renewal must be blocked)
}

function daysUntil(iso: string): number {
  return Math.round((new Date(iso).getTime() - Date.now()) / DAY_MS);
}

/** Derive reminders + DED notifications from the seed permit records. */
export function listReminders(): Reminder[] {
  const out: Reminder[] = [];
  for (const p of PERMITS) {
    const dPermit  = daysUntil(p.permitExpiryDate);
    const dLicence = daysUntil(p.tradeLicenceExpiryDate);
    const licenceExpired = dLicence < 0;

    const base = {
      permitHolderId: p.permitHolderId,
      permitHolderName: p.permitHolderName,
      permitNumber: p.permitNumber,
      permitExpiryDate: p.permitExpiryDate,
      tradeLicenceNumber: p.tradeLicenceNumber,
      tradeLicenceExpiryDate: p.tradeLicenceExpiryDate,
      daysToExpiry: dPermit,
      recipient: p.primaryContactEmail,
      blocked: licenceExpired,
    };

    if (dPermit < 0) {
      out.push({ ...base, id: `${p.permitHolderId}-permit_expired`, kind: 'permit_expired', severity: 'danger', triggerDate: p.permitExpiryDate });
    } else if (dPermit <= 7) {
      out.push({ ...base, id: `${p.permitHolderId}-renewal_7d`, kind: 'permit_renewal_7d', severity: 'danger', triggerDate: offsetDate(dPermit - 7) });
    } else if (dPermit <= 30) {
      out.push({ ...base, id: `${p.permitHolderId}-renewal_30d`, kind: 'permit_renewal_30d', severity: 'warning', triggerDate: offsetDate(dPermit - 30) });
    } else if (dPermit <= 60) {
      out.push({ ...base, id: `${p.permitHolderId}-renewal_60d`, kind: 'permit_renewal_60d', severity: 'info', triggerDate: offsetDate(dPermit - 60) });
    }

    if (licenceExpired) {
      out.push({ ...base, id: `${p.permitHolderId}-trade_licence_expired`, kind: 'trade_licence_expired', severity: 'danger', triggerDate: p.tradeLicenceExpiryDate });
    }
  }
  // Most urgent first
  return out.sort((a, b) => a.daysToExpiry - b.daysToExpiry);
}

export function reminderKindLabel(k: ReminderKind): string {
  switch (k) {
    case 'permit_renewal_60d':    return 'Permit renewal · 60-day reminder';
    case 'permit_renewal_30d':    return 'Permit renewal · 30-day reminder';
    case 'permit_renewal_7d':     return 'Permit renewal · 7-day final notice';
    case 'permit_expired':        return 'Permit EXPIRED — renewal overdue';
    case 'trade_licence_expired': return 'Trade Licence expired — renewal blocked';
  }
}

// ---------------------------------------------------------------------------
// 3. DED notification audit log
// ---------------------------------------------------------------------------
export type DedEventKind = 'permit_issued' | 'permit_renewed' | 'permit_expired' | 'permit_cancelled';

export interface DedNotification {
  id: string;
  kind: DedEventKind;
  permitHolderId: string;
  permitHolderName: string;
  permitNumber: string;
  emittedAt: string;             // ISO datetime
  acknowledgedAt?: string;       // when DED acknowledged
  payloadPreview: string;
}

let nCounter = 5_000;
const nId = () => `DED-${++nCounter}`;

export const DED_NOTIFICATIONS: DedNotification[] = [
  { id: nId(), kind: 'permit_issued',    permitHolderId: 'PH-001', permitHolderName: 'ADNOC Distribution', permitNumber: 'PTP-2024-001', emittedAt: '2024-06-01T09:00:00Z', acknowledgedAt: '2024-06-01T09:14:00Z', payloadPreview: 'Issuance · CN-1000045 · 1-year validity' },
  { id: nId(), kind: 'permit_renewed',   permitHolderId: 'PH-002', permitHolderName: 'Emirates Gas LLC',   permitNumber: 'PTP-2024-002', emittedAt: '2024-08-15T11:30:00Z', acknowledgedAt: '2024-08-15T11:45:00Z', payloadPreview: 'Renewal · CN-2000125 · 1-year extension' },
  { id: nId(), kind: 'permit_renewed',   permitHolderId: 'PH-005', permitHolderName: 'ENOC / Emarat',      permitNumber: 'PTP-2024-005', emittedAt: '2024-03-08T08:30:00Z', acknowledgedAt: '2024-03-08T09:10:00Z', payloadPreview: 'Renewal · CN-5009017 · 1-year extension' },
  { id: nId(), kind: 'permit_issued',    permitHolderId: 'PH-007', permitHolderName: 'Al Yasat Petroleum', permitNumber: 'PTP-2024-007', emittedAt: '2024-12-01T10:00:00Z', acknowledgedAt: '2024-12-01T10:08:00Z', payloadPreview: 'Issuance · CN-7004411 · 1-year validity' },
  { id: nId(), kind: 'permit_expired',   permitHolderId: 'PH-006', permitHolderName: 'Petroleum Development Company', permitNumber: 'PTP-2024-006', emittedAt: `${offsetDate(-8)}T00:01:00Z`, payloadPreview: 'Expiry · CN-6001188 · awaiting renewal' },
  { id: nId(), kind: 'permit_cancelled', permitHolderId: 'PH-004', permitHolderName: 'Dolphin Energy',     permitNumber: 'PTP-2023-099', emittedAt: '2024-12-15T09:00:00Z', acknowledgedAt: '2024-12-15T09:24:00Z', payloadPreview: 'Cancellation of legacy permit PTP-2023-099' },
];

export function listDedNotifications(): DedNotification[] {
  return DED_NOTIFICATIONS.slice().sort((a, b) => b.emittedAt.localeCompare(a.emittedAt));
}

// ---------------------------------------------------------------------------
// 4. Email-template renderer (SDD §3.12.1)
// ---------------------------------------------------------------------------
export interface EmailMessage {
  to: string;
  cc: string;
  subject: string;
  body: string;
}

export function renderRenewalEmail(r: Reminder): EmailMessage {
  return {
    to: r.recipient,
    cc: 'pps.compliance@doe.gov.ae',
    subject: `Reminder – Petroleum Trade Permit Renewal Required (Ref: ${r.permitNumber})`,
    body:
`Dear Permit Holder,

This is to inform you that your Petroleum Trade Permit is about to expire. Please log in to the DOE Unified Service Portal and submit the renewal application before the expiry date to ensure continuity of compliance.

Permit Reference: ${r.permitNumber}
Expiry Date: ${r.permitExpiryDate}

Best regards,
Department of Energy – PPS Team`,
  };
}

/** On-screen warning displayed to the Permit Holder when Trade Licence has expired (SDD §3.12). */
export const TRADE_LICENCE_EXPIRED_WARNING =
  'Your Trade Licence number has expired. Please renew the Trade Licence and update all documents in order to proceed with Permit renewal.';

// ---------------------------------------------------------------------------
// 5. Aggregates
// ---------------------------------------------------------------------------
export interface NotificationSummary {
  totalReminders: number;
  expiringIn7Days: number;
  expiringIn30Days: number;
  expiringIn60Days: number;
  expiredPermits: number;
  blockedRenewals: number;        // count where Trade Licence has expired
  dedNotificationsSent: number;
}

export function notificationSummary(): NotificationSummary {
  const r = listReminders();
  return {
    totalReminders: r.length,
    expiringIn7Days:  r.filter((x) => x.kind === 'permit_renewal_7d').length,
    expiringIn30Days: r.filter((x) => x.kind === 'permit_renewal_30d').length,
    expiringIn60Days: r.filter((x) => x.kind === 'permit_renewal_60d').length,
    expiredPermits:   r.filter((x) => x.kind === 'permit_expired').length,
    blockedRenewals:  r.filter((x) => x.blocked).length,
    dedNotificationsSent: DED_NOTIFICATIONS.length,
  };
}

export { TODAY_ISO };
