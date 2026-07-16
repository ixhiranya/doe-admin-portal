// =============================================================================
// Compliance · Penalty Engine — SDD §4.4
// -----------------------------------------------------------------------------
// Computes the AED penalty for a violation given the catalogue base amount,
// the offence-count multiplier, the severity-override multiplier (if any),
// and the optional per-code maximum cap.
//
//   Computed Penalty = Base × Offence-Count Multiplier × Severity Multiplier
//   capped by the catalogue's maxPenaltyAed where present.
// =============================================================================

import type { ViolationCode, ViolationSeverity } from '../../types';
import { SEVERITY_MULTIPLIER, offenceCountMultiplier } from './catalogue';

export interface PenaltyComputation {
  /** Base amount from the catalogue. */
  basePenaltyAed: number;
  /** Offence-count multiplier (1× / 2× / 3×). */
  offenceCountMultiplier: number;
  /** Severity multiplier — usually 1.0; overridden when Section Head bumps severity. */
  severityMultiplier: number;
  /** Pre-cap computation result. */
  computedRawAed: number;
  /** Final AED amount after the per-code cap is applied. */
  computedPenaltyAed: number;
  /** True if the cap was hit. */
  capApplied: boolean;
}

export function computePenalty(
  code: ViolationCode,
  offenceCount: number,
  severity: ViolationSeverity,
): PenaltyComputation {
  const base = code.basePenaltyAed;
  const offM = offenceCountMultiplier(offenceCount);
  // Severity multiplier is normalised against the code's default — overriding
  // up bumps the multiplier; overriding down reduces it.
  const overrideRatio = SEVERITY_MULTIPLIER[severity] / SEVERITY_MULTIPLIER[code.defaultSeverity] || 1;
  const sevM = isFinite(overrideRatio) && overrideRatio > 0 ? overrideRatio : 1;
  const raw = base * offM * sevM;
  const capped = code.maxPenaltyAed !== undefined ? Math.min(raw, code.maxPenaltyAed) : raw;
  return {
    basePenaltyAed: base,
    offenceCountMultiplier: offM,
    severityMultiplier: sevM,
    computedRawAed: Math.round(raw),
    computedPenaltyAed: Math.round(capped),
    capApplied: code.maxPenaltyAed !== undefined && raw > code.maxPenaltyAed,
  };
}

/** Pretty-format an AED amount. */
export function formatAed(n: number): string {
  return `AED ${n.toLocaleString('en-US')}`;
}
