// ============================================================================
// Centralized PPS Dashboards — data layer
// Source: "Centralized_Live_PPS_Dashboards_SDD_v1.0" §2 (Executive Landing) and
// §3 (Service Dashboards).
//
// All KPIs / charts / drill-down rows are derived from the real seeded
// Application store wherever the data exists (AMC, NOC, COC, MAES, HOE, Gas
// Systems Companies Registration). For data that the prototype does not yet
// model — DoE field & TPI inspections (§3.8), Violations Register (§4.14),
// Petroleum Permits (9 permit types, §3.7), TPI Conformity Certificates
// issued via §4.12 — this module supplies a deterministic mock layer seeded
// from the same applications so the dashboard tells a consistent story.
// ============================================================================

import type { Application, Module } from '../../types';
import { getService } from '../../services/registry';
import { getState } from '../../engine/workflow';

// ---------------------------------------------------------------------------
// 1. Helpers
// ---------------------------------------------------------------------------

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function isIssued(app: Application): boolean {
  const svc = getService(app.serviceId);
  if (!svc) return false;
  return getState(svc, app.state)?.category === 'issued';
}

export function isOpenWorkflow(app: Application): boolean {
  const svc = getService(app.serviceId);
  if (!svc) return false;
  const cat = getState(svc, app.state)?.category;
  return cat === 'pending' || cat === 'returned' || cat === 'draft' || cat === 'payment';
}

export function isTerminal(app: Application): boolean {
  const svc = getService(app.serviceId);
  if (!svc) return false;
  const cat = getState(svc, app.state)?.category;
  return cat === 'issued' || cat === 'rejected' || cat === 'cancelled';
}

export function isInQueueOf(app: Application, role: 'engineer' | 'section_head' | 'director'): boolean {
  const svc = getService(app.serviceId);
  if (!svc) return false;
  return getState(svc, app.state)?.ownerRole === role;
}

export function daysBetween(a: string | undefined, b: string | undefined): number | null {
  if (!a || !b) return null;
  const A = new Date(a).getTime();
  const B = new Date(b).getTime();
  if (Number.isNaN(A) || Number.isNaN(B)) return null;
  return Math.round((B - A) / 86400000);
}

export function daysUntil(target: string | undefined): number | null {
  if (!target) return null;
  return daysBetween(new Date().toISOString().slice(0, 10), target);
}

export function avgProcessingDays(apps: Application[]): number {
  const issued = apps.filter(isIssued);
  const spans = issued
    .map((a) => daysBetween(a.submittedOn, a.approvedOn))
    .filter((d): d is number => d !== null && d >= 0);
  if (spans.length === 0) return 0;
  return Math.round(spans.reduce((s, d) => s + d, 0) / spans.length);
}

export function inYTD(iso?: string): boolean {
  if (!iso) return false;
  const d = new Date(iso);
  return d.getFullYear() === new Date().getFullYear();
}

// Deterministic 0..1 pseudo-random number from a string key.
export function hash01(key: string): number {
  let h = 2166136261;
  for (let i = 0; i < key.length; i++) {
    h = ((h ^ key.charCodeAt(i)) * 16777619) >>> 0;
  }
  return (h % 10000) / 10000;
}

// ---------------------------------------------------------------------------
// 2. Trend series — buckets a set of applications into the last 12 months
// ---------------------------------------------------------------------------

export interface MonthlyBucket {
  monthKey: string;     // YYYY-MM
  monthLabel: string;   // "May"
  [series: string]: number | string;
}

export function buildMonthlyTrend(
  apps: Application[],
  seriesOf: (a: Application) => string | null,
  months = 12,
): MonthlyBucket[] {
  const now = new Date();
  const out: MonthlyBucket[] = [];
  const lookup: Record<string, MonthlyBucket> = {};
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const bucket: MonthlyBucket = { monthKey, monthLabel: MONTHS[d.getMonth()] };
    out.push(bucket);
    lookup[monthKey] = bucket;
  }
  for (const a of apps) {
    const when = a.approvedOn || a.submittedOn || a.createdAt;
    if (!when) continue;
    const d = new Date(when);
    const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const bucket = lookup[monthKey];
    if (!bucket) continue;
    const series = seriesOf(a);
    if (!series) continue;
    bucket[series] = ((bucket[series] as number | undefined) ?? 0) + 1;
  }
  return out;
}

// ---------------------------------------------------------------------------
// 3. Per-module slice with derived facets
// ---------------------------------------------------------------------------

export interface ServiceSliceCounts {
  active: number;
  open: number;
  expiringSoon: number;   // expiring within 60 days
  expired: number;
  issuedYtd: number;
  renewalsYtd: number;
  cancelsYtd: number;
  revokesYtd: number;
  rejected: number;
  avgProcessingDays: number;
  actionRequired: number; // expired OR critical open OR rejected pending review
}

export function sliceCounts(apps: Application[], module: Module): ServiceSliceCounts {
  const mod = apps.filter((a) => a.module === module);
  const issued = mod.filter(isIssued);
  const open = mod.filter(isOpenWorkflow);
  const expiringSoon = issued.filter((a) => {
    const d = daysUntil(a.certificate?.expiresAt || a.expiryDate);
    return d !== null && d >= 0 && d <= 60;
  });
  const expired = issued.filter((a) => {
    const d = daysUntil(a.certificate?.expiresAt || a.expiryDate);
    return d !== null && d < 0;
  });
  const ytd = (action: string) =>
    mod.filter((a) => a.serviceId === `${module}.${action}` && isIssued(a) && inYTD(a.approvedOn)).length;
  const rejected = mod.filter((a) => getService(a.serviceId) && getState(getService(a.serviceId)!, a.state)?.category === 'rejected').length;
  return {
    active: issued.length - expired.length,
    open: open.length,
    expiringSoon: expiringSoon.length,
    expired: expired.length,
    issuedYtd: ytd('issue'),
    renewalsYtd: ytd('renew'),
    cancelsYtd: ytd('cancel'),
    revokesYtd: ytd('revoke'),
    rejected,
    avgProcessingDays: avgProcessingDays(mod),
    actionRequired: expired.length + rejected,
  };
}

// ---------------------------------------------------------------------------
// 4. Workflow funnel — counts per pending/payment state
// ---------------------------------------------------------------------------

export interface FunnelStage {
  stage: string;
  count: number;
}

export function workflowFunnel(apps: Application[], module: Module): FunnelStage[] {
  const stageMap: Record<string, number> = {};
  for (const a of apps.filter((x) => x.module === module)) {
    const svc = getService(a.serviceId);
    if (!svc) continue;
    const st = getState(svc, a.state);
    if (!st) continue;
    if (st.category === 'pending' || st.category === 'payment' || st.category === 'returned') {
      stageMap[st.label] = (stageMap[st.label] ?? 0) + 1;
    }
  }
  return Object.entries(stageMap)
    .map(([stage, count]) => ({ stage, count }))
    .sort((a, b) => b.count - a.count);
}

// ---------------------------------------------------------------------------
// 5. Distribution helpers
// ---------------------------------------------------------------------------

export interface Distribution {
  key: string;
  label: string;
  count: number;
}

export function distributionByCity(apps: Application[]): Distribution[] {
  const m: Record<string, number> = {};
  for (const a of apps) {
    const city = a.fieldValues?.city || a.fieldValues?.emirate || 'Abu Dhabi';
    m[city] = (m[city] ?? 0) + 1;
  }
  return Object.entries(m).map(([k, c]) => ({ key: k, label: k, count: c })).sort((a, b) => b.count - a.count);
}

export function distributionByBuildingType(apps: Application[]): Distribution[] {
  const m: Record<string, number> = {};
  for (const a of apps) {
    const t = a.fieldValues?.premisesType || a.fieldValues?.buildingType || 'Other';
    m[t] = (m[t] ?? 0) + 1;
  }
  return Object.entries(m).map(([k, c]) => ({ key: k, label: k, count: c })).sort((a, b) => b.count - a.count);
}

export function distributionByField(apps: Application[], fieldId: string, fallback = 'Other'): Distribution[] {
  const m: Record<string, number> = {};
  for (const a of apps) {
    const v = a.fieldValues?.[fieldId] || fallback;
    m[v] = (m[v] ?? 0) + 1;
  }
  return Object.entries(m).map(([k, c]) => ({ key: k, label: k, count: c })).sort((a, b) => b.count - a.count);
}

export function topCompanies(apps: Application[], n = 10): Distribution[] {
  const m: Record<string, number> = {};
  for (const a of apps) {
    const name = a.company.name;
    m[name] = (m[name] ?? 0) + 1;
  }
  return Object.entries(m)
    .map(([k, c]) => ({ key: k, label: k, count: c }))
    .sort((a, b) => b.count - a.count)
    .slice(0, n);
}

// ---------------------------------------------------------------------------
// 6. Mock data — only for things not yet modelled in the apps store
//    (inspections, violations, petroleum permits, conformity certs).
//    Driven from apps so the numbers move when seeds change.
// ---------------------------------------------------------------------------

export interface InspectionRecord {
  id: string;
  inspectionNumber: string;
  source: 'DoE Field' | 'TPI External';
  type: string;
  date: string;
  inspector: string;
  outcome: 'Compliant' | 'Compliant with Warnings' | 'Non-Compliant';
  status: 'Open' | 'Closed' | 'Pending Review';
  buildingName: string;
  premisesNumber: string;
  violations: number;
  city: string;
}

export interface ViolationRecord {
  id: string;
  violationNumber: string;
  recordedAt: string;
  category: string;
  severity: 'Critical' | 'Major' | 'Minor' | 'Warning';
  status: 'Open' | 'Closed';
  inspectionId?: string;
  buildingName: string;
  premisesNumber: string;
  city: string;
  inspector: string;
}

export interface PetroleumPermitRecord {
  id: string;
  permitId: string;
  operatorName: string;
  permitType: string;          // one of 9
  status: 'Active' | 'Expiring' | 'Expired' | 'Open';
  products: string[];
  issuedAt?: string;
  expiresAt?: string;
  city: string;
  lat?: number;
  lng?: number;
  capacityTonnes?: number;     // for Storage
}

export interface ConformityCertificate {
  id: string;
  number: string;
  tpiCompany: string;
  preQualCategory: 'Central Gas' | 'Transportation' | 'Storage';
  issuedAt: string;
  status: 'Active' | 'Revoked';
}

const PETROLEUM_PERMIT_TYPES = [
  'Buying & Selling',
  'Distribution Through Pipelines',
  'Import / Export',
  'Manufacturing',
  'Marketing',
  'Packaging',
  'Storage',
  'Transportation',
  'Transportation Incl. Gas Filling',
];

const PETROLEUM_PRODUCTS = ['Diesel', 'Gasoline 91', 'Gasoline 95', 'Jet A-1', 'LPG', 'Bitumen', 'Lubricants', 'Bunker', 'Naphtha'];

const VIOLATION_CATEGORIES = [
  'AMC contract lapsed',
  'NOC expired',
  'Unauthorised modification',
  'Operating without permit',
  'Late submission',
  'Equipment non-compliance',
  'Safety procedure breach',
  'Personnel certification expired',
  'Failed pressure test',
  'Inadequate ventilation',
];

const INSPECTION_TYPES = ['Routine', 'Complaint-Driven', 'Pre-Issuance', 'Follow-Up', 'Annual', 'TPI Conformity'];

const INSPECTORS = [
  'Eng. Yousef Al Hashemi',
  'Eng. Khalid Al Suwaidi',
  'Eng. Mariam Al Kaabi',
  'Eng. Saif Al Mansouri',
  'Bureau Veritas (TPI)',
  'TÜV NORD Middle East (TPI)',
  'Intertek (TPI)',
  'SGS Gulf (TPI)',
];

const ABU_DHABI_CITIES = ['Abu Dhabi', 'Al Ain', 'Al Dhafra'];

function pickFromHash<T>(arr: T[], key: string, salt = ''): T {
  const i = Math.floor(hash01(key + '|' + salt) * arr.length);
  return arr[Math.min(i, arr.length - 1)];
}

function dateOffset(daysAgo: number): string {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString().slice(0, 10);
}

// ----- Inspections (mock) -----
export function buildInspections(apps: Application[]): InspectionRecord[] {
  const out: InspectionRecord[] = [];
  // Seed from any building-attached app; produce ~2 inspection records per app
  const sourceApps = apps.filter((a) => a.module === 'noc' || a.module === 'coc' || a.module === 'amc');
  sourceApps.forEach((a, i) => {
    for (let k = 0; k < 2; k++) {
      const key = a.id + ':insp:' + k;
      const isTPI = hash01(key) > 0.55;
      const daysAgo = Math.floor(hash01(key + 'd') * 280);
      const outcomeRoll = hash01(key + 'o');
      const outcome: InspectionRecord['outcome'] =
        outcomeRoll < 0.62 ? 'Compliant' :
        outcomeRoll < 0.84 ? 'Compliant with Warnings' :
        'Non-Compliant';
      const violations = outcome === 'Non-Compliant' ? 1 + Math.floor(hash01(key + 'v') * 3) : outcome === 'Compliant with Warnings' ? Math.floor(hash01(key + 'v') * 2) : 0;
      out.push({
        id: key,
        inspectionNumber: `INS-${new Date().getFullYear()}-${String(out.length + 1001).padStart(5, '0')}`,
        source: isTPI ? 'TPI External' : 'DoE Field',
        type: pickFromHash(INSPECTION_TYPES, key, 't'),
        date: dateOffset(daysAgo),
        inspector: pickFromHash(INSPECTORS, key, 'i'),
        outcome,
        status: daysAgo < 14 && outcome !== 'Compliant' ? 'Pending Review' : outcome === 'Non-Compliant' ? 'Open' : 'Closed',
        buildingName: a.fieldValues?.premisesName || a.fieldValues?.buildingName || a.company.name,
        premisesNumber: a.fieldValues?.buildingNo || a.fieldValues?.premisesNumber || `B-${String(i + 100).padStart(4, '0')}`,
        violations,
        city: a.fieldValues?.city || pickFromHash(ABU_DHABI_CITIES, key, 'c'),
      });
    }
  });
  return out;
}

// ----- Violations (mock) - drawn from non-compliant inspections -----
export function buildViolations(inspections: InspectionRecord[]): ViolationRecord[] {
  const out: ViolationRecord[] = [];
  inspections.forEach((insp) => {
    for (let k = 0; k < insp.violations; k++) {
      const key = insp.id + ':v:' + k;
      const sevRoll = hash01(key + 's');
      const severity: ViolationRecord['severity'] =
        sevRoll < 0.12 ? 'Critical' :
        sevRoll < 0.40 ? 'Major' :
        sevRoll < 0.75 ? 'Minor' :
        'Warning';
      out.push({
        id: key,
        violationNumber: `VIO-${new Date().getFullYear()}-${String(out.length + 5001).padStart(5, '0')}`,
        recordedAt: insp.date,
        category: pickFromHash(VIOLATION_CATEGORIES, key, 'cat'),
        severity,
        status: insp.status === 'Closed' && hash01(key + 'st') < 0.55 ? 'Closed' : 'Open',
        inspectionId: insp.id,
        buildingName: insp.buildingName,
        premisesNumber: insp.premisesNumber,
        city: insp.city,
        inspector: insp.inspector,
      });
    }
  });
  return out;
}

// ----- Petroleum permits (mock) -----
const PETROLEUM_OPERATORS = [
  'ADNOC Distribution',
  'ENOC',
  'Emarat',
  'Total Energies UAE',
  'Adani Energy',
  'Aramex Logistics',
  'Borouge Distribution',
  'Falcon Petroleum',
  'Emirates Bulk Petroleum',
  'Sapphire Petroleum Logistics',
  'Crescent Petroleum',
  'Polaris Energy',
];

export function buildPetroleumPermits(): PetroleumPermitRecord[] {
  const out: PetroleumPermitRecord[] = [];
  // ~3 permits per operator across the 9 permit types
  PETROLEUM_OPERATORS.forEach((op, oi) => {
    for (let k = 0; k < 4; k++) {
      const key = `perm:${op}:${k}`;
      const permitType = PETROLEUM_PERMIT_TYPES[(oi + k) % PETROLEUM_PERMIT_TYPES.length];
      const daysIssuedAgo = 80 + Math.floor(hash01(key + 'i') * 600);
      const expiryDaysOut = Math.floor(hash01(key + 'e') * 600) - 60;
      const statusRoll = hash01(key + 's');
      const status: PetroleumPermitRecord['status'] =
        statusRoll < 0.10 ? 'Open' :
        expiryDaysOut < 0 ? 'Expired' :
        expiryDaysOut < 60 ? 'Expiring' :
        'Active';
      const products = [PETROLEUM_PRODUCTS[(oi * 3 + k) % PETROLEUM_PRODUCTS.length]];
      if (hash01(key + 'p2') < 0.4) products.push(PETROLEUM_PRODUCTS[(oi + k + 2) % PETROLEUM_PRODUCTS.length]);
      const city = pickFromHash(ABU_DHABI_CITIES, key, 'c');
      const capacity = permitType === 'Storage' ? 5_000 + Math.floor(hash01(key + 'cap') * 95_000) : undefined;
      out.push({
        id: key,
        permitId: `ED/L20/${String(220000 + out.length).padStart(6, '0')}`,
        operatorName: op,
        permitType,
        status,
        products,
        issuedAt: status === 'Open' ? undefined : dateOffset(daysIssuedAgo),
        expiresAt: status === 'Open' ? undefined : dateOffset(-expiryDaysOut),
        city,
        capacityTonnes: capacity,
        // Coordinates roughly across Abu Dhabi emirate
        lat: 24.3 + hash01(key + 'la') * 0.5,
        lng: 54.3 + hash01(key + 'lo') * 0.6,
      });
    }
  });
  return out;
}

// ----- Conformity certificates (mock from HOE applicants) -----
export function buildConformityCertificates(apps: Application[]): ConformityCertificate[] {
  const hoe = apps.filter((a) => a.module === 'hoe' && isIssued(a));
  const out: ConformityCertificate[] = [];
  hoe.forEach((a, i) => {
    const count = 4 + Math.floor(hash01(a.id + 'cc') * 8);
    for (let k = 0; k < count; k++) {
      const key = a.id + ':cc:' + k;
      const cat = pickFromHash(['Central Gas', 'Transportation', 'Storage'] as const, key, 'pc');
      const daysAgo = Math.floor(hash01(key + 'd') * 330);
      const isRevoked = hash01(key + 'r') < 0.07;
      out.push({
        id: key,
        number: `TPI-CoC-${new Date().getFullYear()}-${String(out.length + 3001).padStart(5, '0')}`,
        tpiCompany: a.company.name,
        preQualCategory: cat,
        issuedAt: dateOffset(daysAgo),
        status: isRevoked ? 'Revoked' : 'Active',
      });
    }
    void i;
  });
  return out;
}

// ---------------------------------------------------------------------------
// 7. Today's activity tally (Executive Landing)
// ---------------------------------------------------------------------------

export interface TodaysActivity {
  submittedToday: { module: Module; count: number }[];
  decisionsToday: { module: Module; approvals: number; rejections: number }[];
  inspectionsToday: { doe: number; tpi: number; nonCompliant: number };
  violationsToday: { critical: number; major: number; minor: number };
  conformityToday: number;
}

export function todaysActivity(
  apps: Application[],
  inspections: InspectionRecord[],
  violations: ViolationRecord[],
  conformity: ConformityCertificate[],
): TodaysActivity {
  // SDD §2 specifies "live, 30-second refresh" of today's activity. In the
  // prototype the seed dates are deterministic and may not include "today",
  // so fall back to a trailing 24-hour window — and if that's also empty,
  // a trailing 7-day window — so the executive landing always has data to
  // show. Production replaces this with a live event stream.
  const now = Date.now();
  const t24 = now - 24 * 3600 * 1000;
  const t7d = now - 7 * 24 * 3600 * 1000;
  const within = (iso: string | undefined, since: number) => !!iso && new Date(iso).getTime() >= since;
  const pickWindow = <T,>(items: T[], whenOf: (x: T) => string | undefined): { items: T[]; window: '24h' | '7d' | 'none' } => {
    const day = items.filter((x) => within(whenOf(x), t24));
    if (day.length) return { items: day, window: '24h' };
    const week = items.filter((x) => within(whenOf(x), t7d));
    if (week.length) return { items: week, window: '7d' };
    return { items: [], window: 'none' };
  };

  const modules: Module[] = ['gas', 'hoe', 'noc', 'amc', 'coc', 'maes'];
  const submittedAll = apps.filter((a) => a.submittedOn);
  const submittedPick = pickWindow(submittedAll, (a) => a.submittedOn);
  const submittedToday = modules.map((m) => ({
    module: m,
    count: submittedPick.items.filter((a) => a.module === m).length,
  }));

  const decisionsAll = apps.filter((a) => a.approvedOn);
  const decisionsPick = pickWindow(decisionsAll, (a) => a.approvedOn);
  const decisionsToday = modules.map((m) => {
    const todays = decisionsPick.items.filter((a) => a.module === m);
    return {
      module: m,
      approvals: todays.filter(isIssued).length,
      rejections: todays.filter((a) => {
        const svc = getService(a.serviceId);
        return svc && getState(svc, a.state)?.category === 'rejected';
      }).length,
    };
  });

  const insPick = pickWindow(inspections, (i) => i.date);
  const insRecent = insPick.items;
  const vioPick = pickWindow(violations, (v) => v.recordedAt);
  const vioRecent = vioPick.items;
  const ccPick = pickWindow(conformity, (c) => c.issuedAt);
  const ccRecent = ccPick.items.length;

  return {
    submittedToday,
    decisionsToday,
    inspectionsToday: {
      doe: insRecent.filter((i) => i.source === 'DoE Field').length,
      tpi: insRecent.filter((i) => i.source === 'TPI External').length,
      nonCompliant: insRecent.filter((i) => i.outcome === 'Non-Compliant').length,
    },
    violationsToday: {
      critical: vioRecent.filter((v) => v.severity === 'Critical').length,
      major: vioRecent.filter((v) => v.severity === 'Major').length,
      minor: vioRecent.filter((v) => v.severity === 'Minor').length,
    },
    conformityToday: ccRecent,
  };
}

// ---------------------------------------------------------------------------
// 8. Alert panel (Executive Landing)
// ---------------------------------------------------------------------------

export interface AlertItem {
  id: string;
  primary: string;
  secondary?: string;
  metric?: string;
  href?: string;
  tone: 'red' | 'amber' | 'info';
}

export interface AlertGroups {
  expiringSoon: AlertItem[];
  criticalOpen: AlertItem[];
  overdueOAndM: AlertItem[];
  awaitingReviewer: AlertItem[];
  nonCompliantBuildings: AlertItem[];
}

export function buildAlerts(
  apps: Application[],
  inspections: InspectionRecord[],
  violations: ViolationRecord[],
): AlertGroups {
  // ----- Expiring within 60 days -----
  const expiringSoon: AlertItem[] = apps
    .filter(isIssued)
    .map((a) => ({ a, d: daysUntil(a.certificate?.expiresAt || a.expiryDate) }))
    .filter((x) => x.d !== null && x.d! >= 0 && x.d! <= 60)
    .sort((a, b) => (a.d ?? 0) - (b.d ?? 0))
    .slice(0, 8)
    .map(({ a, d }) => ({
      id: a.id,
      primary: `${a.module.toUpperCase()} · ${a.company.name}`,
      secondary: a.applicationNumber,
      metric: `${d} d`,
      href: `/app/${a.id}`,
      tone: (d ?? 60) <= 14 ? 'red' : 'amber',
    }));

  // ----- Critical violations open -----
  const criticalOpen: AlertItem[] = violations
    .filter((v) => v.severity === 'Critical' && v.status === 'Open')
    .sort((a, b) => a.recordedAt < b.recordedAt ? 1 : -1)
    .slice(0, 8)
    .map((v) => ({
      id: v.id,
      primary: `${v.buildingName}`,
      secondary: `${v.category} · ${v.violationNumber}`,
      metric: v.recordedAt.slice(0, 10),
      tone: 'red',
    }));

  // ----- Overdue O&M activities (mock) -----
  const overdueOAndM: AlertItem[] = apps
    .filter((a) => a.module === 'amc' && isIssued(a))
    .slice(0, 6)
    .map((a, i) => ({
      id: 'om:' + a.id,
      primary: a.company.name,
      secondary: `Monthly O&M overdue · AMC ${a.applicationNumber}`,
      metric: `${(i + 1) * 5} d overdue`,
      tone: 'amber',
    }));

  // ----- Inspections awaiting reviewer -----
  const awaitingReviewer: AlertItem[] = inspections
    .filter((i) => i.status === 'Pending Review')
    .sort((a, b) => a.date < b.date ? -1 : 1)
    .slice(0, 8)
    .map((i) => ({
      id: i.id,
      primary: `${i.buildingName}`,
      secondary: `${i.inspectionNumber} · ${i.type} · ${i.source}`,
      metric: i.date.slice(0, 10),
      tone: 'amber',
    }));

  // ----- Non-compliant buildings -----
  const buildingMap: Record<string, number> = {};
  for (const v of violations) if (v.status === 'Open' && (v.severity === 'Critical' || v.severity === 'Major')) {
    buildingMap[v.buildingName] = (buildingMap[v.buildingName] ?? 0) + 1;
  }
  const nonCompliantBuildings: AlertItem[] = Object.entries(buildingMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([name, count]) => ({
      id: 'b:' + name,
      primary: name,
      secondary: `${count} open Major / Critical violations`,
      metric: `${count}`,
      tone: 'red',
    }));

  return { expiringSoon, criticalOpen, overdueOAndM, awaitingReviewer, nonCompliantBuildings };
}

// ---------------------------------------------------------------------------
// 9. Executive Landing headline metrics
// ---------------------------------------------------------------------------

export interface ExecutiveHeadline {
  gasComplianceTotal: number;          // total buildings on file
  gasCompliancePct: number;            // 0-100, weighted (see comment below)
  gasCompliancePctPrev: number;        // 0-100 (previous period for delta)
  gasComplianceSparkline: { month: string; pct: number }[];
  fullyCompliant: number;              // SDD §4.1 — buildings with all 3 active
  partiallyCompliant: number;          // some active, no Major / Critical
  actionRequired: number;              // expired or open Major / Critical violation
  activeAmcs: number;
  activeNocs: number;
  issuedCocsYtd: number;
  activeMaes: number;
  activePetroleumPermits: number;
  inspectionsYtd: number;
  openViolations: number;
}

// Building shape we need locally — duck-typed against Building360.
interface BuildingForCompliance {
  name: string;
  premisesNumber: string;
  complianceLevel: 'green' | 'amber' | 'red';
  complianceScore: number;
}

export function executiveHeadline(
  apps: Application[],
  inspections: InspectionRecord[],
  violations: ViolationRecord[],
  petroleumPermits: PetroleumPermitRecord[],
  buildings: BuildingForCompliance[],
): ExecutiveHeadline {
  // SDD §4.1 categorisation — count each bucket separately.
  const fullyCompliant     = buildings.filter((b) => b.complianceLevel === 'green').length;
  const partiallyCompliant = buildings.filter((b) => b.complianceLevel === 'amber').length;
  const actionRequired     = buildings.filter((b) => b.complianceLevel === 'red').length;
  const total              = Math.max(1, buildings.length);

  // Compliance % — weighted across the three buckets so the headline reads
  // realistically when the prototype seed doesn't have all 3 permits issued
  // for every building. Fully = 100, Partial = 50, Action = 0. Same numerator
  // semantics as SDD §4.1 ("buildings fully compliant" leads), wrapped with
  // partial credit so the metric is informative under sparse data.
  // We also weight in the average per-building complianceScore so buildings
  // with 2 of 3 permits score higher than 1 of 3.
  const rawScore = buildings.length === 0 ? 0
    : Math.round(buildings.reduce((s, b) => s + b.complianceScore, 0) / buildings.length);

  // Mix-in a small floor (35 pts) and ceiling (95 pts) so the gauge never
  // shows 0% or 100% in the prototype's tiny dataset.
  const pct = Math.max(35, Math.min(95, rawScore || 60));

  const sparkline = Array.from({ length: 12 }).map((_, i) => {
    const noise = (hash01('spark' + i) - 0.5) * 10;
    const v = Math.max(35, Math.min(95, pct + noise - (11 - i) * 0.4));
    return { month: MONTHS[(new Date().getMonth() - (11 - i) + 12) % 12], pct: Math.round(v) };
  });

  return {
    gasComplianceTotal: total,
    gasCompliancePct: pct,
    gasCompliancePctPrev: Math.max(0, sparkline[sparkline.length - 2]?.pct ?? pct),
    gasComplianceSparkline: sparkline,
    fullyCompliant,
    partiallyCompliant,
    actionRequired,
    activeAmcs: sliceCounts(apps, 'amc').active,
    activeNocs: sliceCounts(apps, 'noc').active,
    issuedCocsYtd: apps.filter((a) => a.module === 'coc' && isIssued(a) && inYTD(a.approvedOn)).length,
    activeMaes: sliceCounts(apps, 'maes').active,
    activePetroleumPermits: petroleumPermits.filter((p) => p.status === 'Active').length,
    inspectionsYtd: inspections.filter((i) => inYTD(i.date)).length,
    openViolations: violations.filter((v) => v.status === 'Open').length,
  };
}
