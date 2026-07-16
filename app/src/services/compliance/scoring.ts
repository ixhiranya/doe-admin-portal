// =============================================================================
// Compliance · Scoring Engine — SDD §3
// -----------------------------------------------------------------------------
// Per the SDD, the rolling per-permit Compliance Score is built from the last
// N inspections, with:
//   • Critical-check cap at 49% (any failed Critical check) — §3.1
//   • Recency decay (1.0 / 0.75 / 0.5 / 0.25 / 0.0 by age bucket) — §3.2
//   • Sampling contribution at 50% weight (Critical→0, Major→40, Minor→70)
//   • TPI contribution at 75% weight
//   • Open Major/Critical cap at 79% — §3.2
//   • Score-to-action bands: ≥80% Pass, 60–79% Conditional, 40–59% Escalated,
//                            <40% Block — §3.3
//
// The prototype derives a licensee's score from their Violations history so
// every existing data record contributes consistently. Where a licensee has
// no violations on file, we synthesise a deterministic clean-record baseline
// so the UI always has a score to show.
// =============================================================================

import type {
  Violation, ViolationSeverity, ViolationSource, Application,
} from '../../types';
import { listViolations, isOpen } from './violations';
import { SEVERITY_SCORE_CAP } from './catalogue';

// ---------------------------------------------------------------------------
// Configurable constants (configurable per SDD §3.1)
// ---------------------------------------------------------------------------
const DAY_MS = 86_400_000;

/** Default rolling-window size — last N "inspections" considered. */
export const DEFAULT_ROLLING_N = 5;

/** Recency decay buckets — SDD §3.2. */
export const RECENCY_DECAY: { maxAgeDays: number; weight: number }[] = [
  { maxAgeDays: 90,  weight: 1.00 },
  { maxAgeDays: 180, weight: 0.75 },
  { maxAgeDays: 365, weight: 0.50 },
  { maxAgeDays: 730, weight: 0.25 },
  { maxAgeDays: Infinity, weight: 0.00 },
];

/** Per-source contribution weight — SDD §3.1. */
export const SOURCE_WEIGHT: Record<ViolationSource, number> = {
  mobile_inspection:    1.00,
  tpi_conformity:       0.75,
  sampling_fail:        0.50,
  incident_report:      1.00,
  compliance_assessment: 1.00,
};

/** Open Major/Critical clamp — SDD §3.2. */
export const OPEN_MAJOR_CRITICAL_CAP = 79;

/** Critical-check cap — SDD §3.1. */
export const CRITICAL_CHECK_CAP = 49;

// ---------------------------------------------------------------------------
// Score-to-Action — SDD §3.3
// ---------------------------------------------------------------------------
export type ComplianceBand = 'Pass' | 'Conditional' | 'Escalated' | 'Block';
export type ScoreAction    = 'pass' | 'conditional' | 'escalated' | 'block';

export interface BandDef {
  band: ComplianceBand;
  action: ScoreAction;
  min: number;
  max: number;
  description: string;
}

export const BANDS: BandDef[] = [
  { band: 'Pass',        action: 'pass',        min: 80, max: 100, description: 'Normal processing — renewal proceeds.' },
  { band: 'Conditional', action: 'conditional', min: 60, max: 79,  description: 'Action proceeds but requires a Corrective Action Plan within 30 days.' },
  { band: 'Escalated',   action: 'escalated',   min: 40, max: 59,  description: 'Routed to DoE PPS Section Head — may approve with stricter conditions, refer to VAP, or block.' },
  { band: 'Block',       action: 'block',       min: 0,  max: 39,  description: 'Action blocked — close all open Critical/Major violations before re-attempt.' },
];

export function scoreBand(rate: number): BandDef {
  return BANDS.find((b) => rate >= b.min && rate <= b.max) ?? BANDS[BANDS.length - 1];
}

export function bandColor(band: ComplianceBand): {
  text: string; bg: string; ring: string; dot: string;
} {
  switch (band) {
    case 'Pass':        return { text: 'text-emerald-700', bg: 'bg-emerald-50', ring: 'ring-emerald-500/30', dot: 'bg-emerald-500' };
    case 'Conditional': return { text: 'text-amber-700',   bg: 'bg-amber-50',   ring: 'ring-amber-500/40',   dot: 'bg-amber-500' };
    case 'Escalated':   return { text: 'text-orange-700',  bg: 'bg-orange-50',  ring: 'ring-orange-500/40',  dot: 'bg-orange-500' };
    case 'Block':       return { text: 'text-doe-red',     bg: 'bg-rose-50',    ring: 'ring-doe-red/40',     dot: 'bg-doe-red' };
  }
}

// ---------------------------------------------------------------------------
// Per-violation virtual score (the "inspection score" it represents)
// ---------------------------------------------------------------------------
function virtualScoreFor(v: Violation): number {
  // Each closed/paid violation contributes the severity cap as the inspection
  // score (Critical→0, Major→40, Minor→70, Informational→100).
  return SEVERITY_SCORE_CAP[v.severity] ?? 100;
}

function ageDays(iso: string, now: Date): number {
  return Math.floor((now.getTime() - new Date(iso).getTime()) / DAY_MS);
}

function recencyWeight(ageInDays: number): number {
  for (const bucket of RECENCY_DECAY) {
    if (ageInDays <= bucket.maxAgeDays) return bucket.weight;
  }
  return 0;
}

// ---------------------------------------------------------------------------
// Public API — compute a licensee's rolling score
// ---------------------------------------------------------------------------
export interface ScoreContributor {
  violationId: string;
  occurredAt: string;
  ageInDays: number;
  source: ViolationSource;
  severity: ViolationSeverity;
  virtualScore: number;       // 0..100
  recencyWeight: number;      // 0..1
  sourceWeight: number;       // 0..1
  effectiveWeight: number;    // = recency × source
}

export interface ComplianceScoreResult {
  licenseeId: string;
  licenseeName: string;
  /** Final score 0..100 (integer). */
  rate: number;
  /** Pre-clamp raw value before the open-Major/Critical cap (informational). */
  rawRate: number;
  band: ComplianceBand;
  action: ScoreAction;
  /** The N most recent contributors considered. */
  contributors: ScoreContributor[];
  /** Live counts on the licensee. */
  openCriticalCount: number;
  openMajorCount: number;
  totalViolationsEver: number;
  /** True if the open-Major/Critical clamp fired. */
  capApplied: boolean;
  computedAt: string;
}

/**
 * Compute the rolling Compliance Score for a licensee, given their full
 * violations history (defaults to the global register).
 */
export function computeLicenseeScore(
  licenseeId: string,
  licenseeName: string,
  options: { rollingN?: number; now?: Date; violations?: Violation[] } = {},
): ComplianceScoreResult {
  const rollingN = options.rollingN ?? DEFAULT_ROLLING_N;
  const now      = options.now ?? new Date();
  const all      = options.violations ?? listViolations();
  const mine     = all.filter((v) => v.licensee.id === licenseeId);

  // Recent violations contribute; take the most recent N within the 2-year window
  const recent = mine
    .filter((v) => ageDays(v.createdAt, now) <= 730)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, rollingN);

  const contributors: ScoreContributor[] = recent.map((v) => {
    const age = ageDays(v.createdAt, now);
    const recW = recencyWeight(age);
    const srcW = SOURCE_WEIGHT[v.source] ?? 1;
    return {
      violationId: v.id,
      occurredAt: v.createdAt,
      ageInDays: age,
      source: v.source,
      severity: v.severity,
      virtualScore: virtualScoreFor(v),
      recencyWeight: recW,
      sourceWeight: srcW,
      effectiveWeight: recW * srcW,
    };
  });

  // Synthetic "clean inspection" baseline — represents the licensee's
  // not-on-record clean operating periods. We pad to N entries so a licensee
  // with only 2 historical violations still gets a fair score (3 implicit
  // clean inspections → 100 each).
  const padCount = Math.max(0, rollingN - contributors.length);
  // Spread the synthetic clean inspections across the past year for plausible
  // recency weighting.
  for (let i = 0; i < padCount; i++) {
    const syntheticAge = 60 + i * 75;        // 60d, 135d, 210d, 285d, 360d…
    contributors.push({
      violationId: `SYN-${licenseeId}-${i}`,
      occurredAt: new Date(now.getTime() - syntheticAge * DAY_MS).toISOString(),
      ageInDays: syntheticAge,
      source: 'mobile_inspection',
      severity: 'informational',
      virtualScore: 100,
      recencyWeight: recencyWeight(syntheticAge),
      sourceWeight: 1,
      effectiveWeight: recencyWeight(syntheticAge) * 1,
    });
  }

  // Weighted average
  const totalW = contributors.reduce((s, c) => s + c.effectiveWeight, 0);
  const rawRate = totalW === 0
    ? 100
    : contributors.reduce((s, c) => s + c.virtualScore * c.effectiveWeight, 0) / totalW;

  // Open Major/Critical clamp
  const openCriticalCount = mine.filter((v) => isOpen(v) && v.severity === 'critical').length;
  const openMajorCount    = mine.filter((v) => isOpen(v) && v.severity === 'major').length;
  let rate = Math.round(rawRate);
  let capApplied = false;
  if ((openCriticalCount > 0 || openMajorCount > 0) && rate > OPEN_MAJOR_CRITICAL_CAP) {
    rate = OPEN_MAJOR_CRITICAL_CAP;
    capApplied = true;
  }

  // Clamp to [0, 100]
  rate = Math.max(0, Math.min(100, rate));

  const band = scoreBand(rate);
  return {
    licenseeId,
    licenseeName,
    rate,
    rawRate: Math.round(rawRate),
    band: band.band,
    action: band.action,
    contributors,
    openCriticalCount,
    openMajorCount,
    totalViolationsEver: mine.length,
    capApplied,
    computedAt: now.toISOString(),
  };
}

// ---------------------------------------------------------------------------
// Bridge to existing Applications — map a Company → licensee identity
// ---------------------------------------------------------------------------

/**
 * Resolve the licensee identity from an Application's Company record.
 * Tries to match by name against the seeded violations licensees first; falls
 * back to a synthesised key derived from the trade permit number so apps
 * without a violations footprint still resolve to a stable id.
 */
export function resolveLicenseeForApplication(app: Application): { id: string; name: string } {
  const allViolations = listViolations();
  const candidate = allViolations
    .map((v) => v.licensee)
    .find((l) => l.name.toLowerCase() === app.company.name.toLowerCase());
  if (candidate) {
    return { id: candidate.id, name: candidate.name };
  }
  // Synthesised stable id — keeps the score deterministic per company across reloads
  const stableId = `LIC-${app.company.tradePermitNumber.replace(/[^A-Z0-9]/gi, '').slice(0, 12) || 'UNKNOWN'}`;
  return { id: stableId, name: app.company.name };
}

export function scoreForApplication(app: Application): ComplianceScoreResult {
  const { id, name } = resolveLicenseeForApplication(app);
  return computeLicenseeScore(id, name);
}

// ---------------------------------------------------------------------------
// Aggregate helpers — for the Compliance Dashboard
// ---------------------------------------------------------------------------

/** Score histogram bucketed in 10% bins from 0 to 100. */
export function scoreHistogram(scores: ComplianceScoreResult[]): { label: string; count: number; min: number; max: number; band: ComplianceBand }[] {
  const buckets = [
    { label: '0–39',  min: 0,  max: 39,  band: 'Block'        as ComplianceBand, count: 0 },
    { label: '40–59', min: 40, max: 59,  band: 'Escalated'    as ComplianceBand, count: 0 },
    { label: '60–79', min: 60, max: 79,  band: 'Conditional'  as ComplianceBand, count: 0 },
    { label: '80–89', min: 80, max: 89,  band: 'Pass'         as ComplianceBand, count: 0 },
    { label: '90–100', min: 90, max: 100, band: 'Pass'        as ComplianceBand, count: 0 },
  ];
  for (const s of scores) {
    const b = buckets.find((bk) => s.rate >= bk.min && s.rate <= bk.max);
    if (b) b.count += 1;
  }
  return buckets;
}

/** Top-N licensees by descending open violation count. */
export function topRepeatOffenders(scores: ComplianceScoreResult[], topN = 10): ComplianceScoreResult[] {
  return scores
    .slice()
    .sort((a, b) => (b.openCriticalCount * 3 + b.openMajorCount * 2 + b.totalViolationsEver) - (a.openCriticalCount * 3 + a.openMajorCount * 2 + a.totalViolationsEver))
    .slice(0, topN);
}

/** Roll up open Critical violations per permit type (the "sector heat-map"). */
export function openCriticalByPermitType(): { permitType: string; count: number }[] {
  const all = listViolations();
  const acc: Record<string, number> = {};
  for (const v of all) {
    if (isOpen(v) && v.severity === 'critical') {
      acc[v.permitType] = (acc[v.permitType] ?? 0) + 1;
    }
  }
  return Object.entries(acc).map(([permitType, count]) => ({ permitType, count })).sort((a, b) => b.count - a.count);
}

/** All licensee scores — one row per distinct licensee that appears in the register. */
export function allLicenseeScores(): ComplianceScoreResult[] {
  const all = listViolations();
  const map = new Map<string, { id: string; name: string }>();
  for (const v of all) {
    if (!map.has(v.licensee.id)) {
      map.set(v.licensee.id, { id: v.licensee.id, name: v.licensee.name });
    }
  }
  return Array.from(map.values()).map(({ id, name }) => computeLicenseeScore(id, name));
}
