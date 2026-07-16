import type { Application } from '../types';
import { getService } from './registry';

// ============================================================================
// Building 360 — derived view over NOC + AMC + COC applications.
//
// Buildings are not a stored entity; they are joined on-the-fly from the
// applications submitted under each premises. The join key is a normalised
// blend of `premisesNumber` / `buildingNo` and `buildingName` so the three
// modules — which use slightly different field-id conventions — collapse
// into a single Building record.
// ============================================================================

export type CertModule = 'coc' | 'noc' | 'amc';
export type CertStatus = 'active' | 'pending' | 'expiring' | 'expired' | 'cancelled' | 'rejected' | 'none';

export interface CertSummary {
  module: CertModule;
  status: CertStatus;
  statusLabel: string;
  applicationId?: string;
  applicationNumber?: string;
  certificateNumber?: string;
  issuedAt?: string;
  expiresAt?: string;
  inFlight?: boolean;  // a separate workflow (modify/cancel/revoke) is open
}

export interface Building360 {
  id: string;
  name: string;
  premisesNumber: string;
  premisesType?: string;
  emirate?: string;
  city?: string;
  area?: string;
  sector?: string;
  plotNumber?: string;
  coordinates?: { lat: number; lng: number };
  coordinatesRaw?: string;
  detailedAddress?: string;
  dmtMepsRef?: string;
  // Contacts
  ownerName?: string;
  ownerEid?: string;
  ownerContact?: string;
  projectConsultant?: string;
  gasInstallContractor?: string;
  gasAmcContractor?: string;
  fmCompany?: string;
  fmContact?: string;
  tpiCompany?: string;
  tpiCocRef?: string;
  gasSupplyCompany?: string;
  gasSystemType?: string;
  gasMedium?: string;
  // Certificate status per module
  coc: CertSummary;
  noc: CertSummary;
  amc: CertSummary;
  // Applications linked to this building (sorted: most recent first)
  applications: Application[];
  // Derived
  complianceScore: number;        // 0-100
  complianceLevel: 'green' | 'amber' | 'red';
  lastActivityAt?: string;
}

// ----- Helpers --------------------------------------------------------------

function pick(fv: Record<string, string> | undefined, ...keys: string[]): string | undefined {
  if (!fv) return undefined;
  for (const k of keys) {
    if (fv[k] != null && fv[k] !== '') return fv[k];
  }
  return undefined;
}

// "24.488°N 54.604°E" → { lat: 24.488, lng: 54.604 }
function parseCoords(raw?: string): { lat: number; lng: number } | undefined {
  if (!raw) return undefined;
  const m = raw.match(/(-?\d+(?:\.\d+)?)\s*°?\s*([NS]?)\s*[, ]\s*(-?\d+(?:\.\d+)?)\s*°?\s*([EW]?)/i);
  if (!m) return undefined;
  let lat = parseFloat(m[1]);
  let lng = parseFloat(m[3]);
  if (m[2]?.toUpperCase() === 'S') lat = -lat;
  if (m[4]?.toUpperCase() === 'W') lng = -lng;
  if (isNaN(lat) || isNaN(lng)) return undefined;
  return { lat, lng };
}

function buildingKey(premisesNumber?: string, name?: string): string | undefined {
  const p = (premisesNumber ?? '').trim().toUpperCase();
  if (p) return p;
  const n = (name ?? '').trim().toUpperCase();
  return n || undefined;
}

// Determine the certificate status for a given module's applications on a
// building. We collapse the application set down to a single canonical status:
//   - If any app is `issued` → active (use that as the source of truth).
//   - Else if any is in a pending DOE-review state → pending.
//   - Else if any is rejected/cancelled → that.
//   - Else → none.
function summariseCert(module: CertModule, apps: Application[]): CertSummary {
  const issued = apps.filter((a) => a.state === 'issued').sort((a, b) => (b.approvedOn ?? b.updatedAt).localeCompare(a.approvedOn ?? a.updatedAt));
  const pending = apps.filter((a) => /^pending|returned|fee_pending/.test(a.state));
  const rejected = apps.filter((a) => a.state === 'rejected');
  const cancelled = apps.filter((a) => a.state === 'cancelled');
  const inFlight = pending.length > 0 && issued.length > 0;

  if (issued.length) {
    const a = issued[0];
    const svc = getService(a.serviceId);
    // A `cancel` issuance means the cert was cancelled, not active.
    const isCancellation = svc?.action === 'cancel' || svc?.action === 'revoke';
    if (isCancellation) {
      return {
        module,
        status: 'cancelled',
        statusLabel: svc?.action === 'revoke' ? 'Revoked' : 'Cancelled',
        applicationId: a.id,
        applicationNumber: a.applicationNumber,
        certificateNumber: a.certificate?.number,
        issuedAt: a.approvedOn ?? a.certificate?.issuedAt,
        inFlight,
      };
    }
    const expiresAt = a.certificate?.expiresAt ?? a.expiryDate;
    const now = Date.now();
    let status: CertStatus = 'active';
    let statusLabel = 'Active';
    if (expiresAt) {
      const ms = new Date(expiresAt).getTime() - now;
      const days = ms / (24 * 3600 * 1000);
      if (days < 0) { status = 'expired'; statusLabel = 'Expired'; }
      else if (days < 60) { status = 'expiring'; statusLabel = `Expiring in ${Math.round(days)}d`; }
    }
    return {
      module,
      status,
      statusLabel,
      applicationId: a.id,
      applicationNumber: a.applicationNumber,
      certificateNumber: a.certificate?.number,
      issuedAt: a.approvedOn ?? a.certificate?.issuedAt,
      expiresAt,
      inFlight,
    };
  }
  if (pending.length) {
    const a = pending[0];
    const svc = getService(a.serviceId);
    return {
      module,
      status: 'pending',
      statusLabel: svc?.action === 'cancel' ? 'Cancellation in progress' :
                   svc?.action === 'revoke' ? 'Revocation in progress' :
                   svc?.action === 'modify' ? 'Modification in progress' :
                   svc?.action === 'renew'  ? 'Renewal in progress' : 'Application under review',
      applicationId: a.id,
      applicationNumber: a.applicationNumber,
    };
  }
  if (rejected.length) {
    return { module, status: 'rejected', statusLabel: 'Last application rejected', applicationId: rejected[0].id, applicationNumber: rejected[0].applicationNumber };
  }
  if (cancelled.length) {
    return { module, status: 'cancelled', statusLabel: 'Cancelled', applicationId: cancelled[0].id, applicationNumber: cancelled[0].applicationNumber };
  }
  return { module, status: 'none', statusLabel: 'Not on record' };
}

// ----- Public: derive Building360 records -----------------------------------

export function deriveBuildings(apps: Application[]): Building360[] {
  const byKey = new Map<string, Application[]>();

  // Only premises-aware modules contribute. Gas/HOE are company-level
  // registrations and don't represent a building.
  const eligible = apps.filter((a) => a.module === 'coc' || a.module === 'noc' || a.module === 'amc');

  for (const a of eligible) {
    const fv = a.fieldValues ?? {};
    const premisesNo = pick(fv, 'premisesNumber', 'buildingNo');
    const name = pick(fv, 'buildingName', 'premisesName');
    const key = buildingKey(premisesNo, name);
    if (!key) continue;
    const bucket = byKey.get(key) ?? [];
    bucket.push(a);
    byKey.set(key, bucket);
  }

  const out: Building360[] = [];
  for (const [key, bucketApps] of byKey) {
    // Pick the richest field-value source — prefer COC, then NOC, then AMC.
    const preferOrder: Array<Application['module']> = ['coc', 'noc', 'amc'];
    const sample = preferOrder
      .flatMap((m) => bucketApps.filter((a) => a.module === m))[0] ?? bucketApps[0];
    const fv = sample.fieldValues ?? {};

    const coordsRaw = pick(fv, 'coordinates');
    const coords = parseCoords(coordsRaw) ?? (fv.latitude && fv.longitude ? { lat: parseFloat(fv.latitude), lng: parseFloat(fv.longitude) } : undefined);

    const cocApps = bucketApps.filter((a) => a.module === 'coc');
    const nocApps = bucketApps.filter((a) => a.module === 'noc');
    const amcApps = bucketApps.filter((a) => a.module === 'amc');

    const coc = summariseCert('coc', cocApps);
    const noc = summariseCert('noc', nocApps);
    const amc = summariseCert('amc', amcApps);

    const certs = [coc, noc, amc];
    const activeCount = certs.filter((c) => c.status === 'active' || c.status === 'expiring').length;
    const issueCount = certs.filter((c) => c.status === 'expired' || c.status === 'rejected' || c.status === 'cancelled').length;
    const complianceScore = Math.round((activeCount / 3) * 100);
    let complianceLevel: 'green' | 'amber' | 'red' = 'red';
    if (activeCount === 3) complianceLevel = 'green';
    else if (activeCount >= 1 && issueCount === 0) complianceLevel = 'amber';
    else if (issueCount > 0) complianceLevel = 'red';

    const applications = bucketApps.slice().sort((a, b) =>
      (b.submittedOn ?? b.createdAt).localeCompare(a.submittedOn ?? a.createdAt));
    const lastActivityAt = applications[0]?.updatedAt ?? applications[0]?.submittedOn;

    out.push({
      id: 'B-' + key.replace(/[^A-Z0-9]+/g, '-'),
      name: pick(fv, 'buildingName', 'premisesName') ?? '(Unnamed Premises)',
      premisesNumber: pick(fv, 'premisesNumber', 'buildingNo') ?? '—',
      premisesType: pick(fv, 'premisesType', 'buildingType'),
      emirate: pick(fv, 'emirate'),
      city: pick(fv, 'city'),
      area: pick(fv, 'area'),
      sector: pick(fv, 'sector', 'sectorNo'),
      plotNumber: pick(fv, 'plotNumber', 'plotNo'),
      coordinates: coords,
      coordinatesRaw: coordsRaw,
      detailedAddress: pick(fv, 'detailedAddress'),
      dmtMepsRef: pick(fv, 'dmtMepsRef'),
      ownerName: pick(fv, 'premisesOwnerName', 'ownerName'),
      ownerEid: pick(fv, 'premisesOwnerEid', 'ownerEid'),
      ownerContact: pick(fv, 'premisesOwnerContact', 'ownerContact'),
      projectConsultant: pick(fv, 'projectConsultant'),
      gasInstallContractor: pick(fv, 'gasInstallContractor', 'installContractor'),
      gasAmcContractor: pick(fv, 'gasAmcContractor', 'amcContractor'),
      fmCompany: pick(fv, 'fmCompany'),
      fmContact: pick(fv, 'fmContact'),
      tpiCompany: pick(fv, 'tpiCompany'),
      tpiCocRef: pick(fv, 'tpiCocRef'),
      gasSupplyCompany: pick(fv, 'gasSupplyCompany'),
      gasSystemType: pick(fv, 'gasSystemType'),
      gasMedium: pick(fv, 'gasMedium'),
      coc, noc, amc,
      applications,
      complianceScore,
      complianceLevel,
      lastActivityAt,
    });
  }

  // Sort: highest activity first, then by name
  out.sort((a, b) => {
    if (a.complianceLevel !== b.complianceLevel) {
      const order = { red: 0, amber: 1, green: 2 };
      return order[a.complianceLevel] - order[b.complianceLevel];
    }
    return a.name.localeCompare(b.name);
  });
  return out;
}

export function getBuilding(apps: Application[], buildingId: string): Building360 | undefined {
  return deriveBuildings(apps).find((b) => b.id === buildingId);
}

export const CERT_META: Record<CertModule, { label: string; shortLabel: string; tone: string; iconBg: string; iconText: string; describe: string }> = {
  coc: { label: 'Certificate of Completion', shortLabel: 'COC', tone: 'amber',   iconBg: 'bg-action-orange-soft', iconText: 'text-action-orange-deep', describe: 'Gas-system construction sign-off' },
  noc: { label: 'No Objection Certificate', shortLabel: 'NOC', tone: 'blue',    iconBg: 'bg-info-soft',          iconText: 'text-info-500',          describe: 'Permission to operate the gas system' },
  amc: { label: 'Annual Maintenance Contract', shortLabel: 'AMC', tone: 'purple', iconBg: 'bg-lavender',           iconText: 'text-[#7B3FE4]',         describe: 'Active maintenance contract with a registered contractor' },
};

export const STATUS_TONE: Record<CertStatus, { bg: string; fg: string; ring: string }> = {
  active:    { bg: 'bg-success-soft',  fg: 'text-success-500',     ring: 'ring-success-500/30' },
  expiring:  { bg: 'bg-warning-soft',  fg: 'text-warning-500',     ring: 'ring-warning-500/30' },
  pending:   { bg: 'bg-info-soft',     fg: 'text-info-500',        ring: 'ring-info-500/30' },
  expired:   { bg: 'bg-danger-soft',   fg: 'text-danger-500',      ring: 'ring-danger-500/30' },
  rejected:  { bg: 'bg-danger-soft',   fg: 'text-danger-500',      ring: 'ring-danger-500/30' },
  cancelled: { bg: 'bg-neutral-100',   fg: 'text-neutral-500',     ring: 'ring-neutral-200' },
  none:      { bg: 'bg-neutral-50',    fg: 'text-neutral-400',     ring: 'ring-neutral-200' },
};
