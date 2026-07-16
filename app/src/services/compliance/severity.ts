// =============================================================================
// Compliance · Severity Derivation + Repeat-Offence Counter — SDD §4.3
// -----------------------------------------------------------------------------
// Two responsibilities:
//   1. autoDeriveSeverity(code, sourceContext)  — initial severity given the
//      source-channel signal (e.g. a Critical fail from sampling lands as
//      Critical regardless of the catalogue default).
//   2. countPriorOffences(licenseeId, violationCodeId, history)  — how many
//      times this licensee has been recorded against this code in the
//      configurable repeat-offence window.
//   3. applyRepeatEscalation(baseSeverity, offenceCount)  — escalate Minor →
//      Major on 2nd, Minor → Critical on 3rd (default two-step rule).
// =============================================================================

import type {
  Violation, ViolationCode, ViolationSeverity, ViolationSource,
} from '../../types';
import { REPEAT_OFFENCE_WINDOW_MONTHS } from './catalogue';

const MS_PER_MONTH = 30 * 86_400_000;

/** Initial severity from the source channel signal. */
export function autoDeriveSeverity(
  code: ViolationCode,
  source: ViolationSource,
  // Some source channels carry an explicit override (e.g. sampling reports a
  // severity in their Approved-Fail payload — Critical / Major / Minor).
  sourceSeverityHint?: ViolationSeverity,
): ViolationSeverity {
  if (sourceSeverityHint) return sourceSeverityHint;
  // If the source is incident report, bump anything Minor up to Major.
  if (source === 'incident_report' && code.defaultSeverity === 'minor') return 'major';
  return code.defaultSeverity;
}

/** Count prior offences for this licensee + code within the window. */
export function countPriorOffences(
  licenseeId: string,
  violationCodeId: string,
  history: Violation[],
  now: Date = new Date(),
): number {
  const windowStart = new Date(now.getTime() - REPEAT_OFFENCE_WINDOW_MONTHS * MS_PER_MONTH);
  return history.filter((v) =>
    v.licensee.id === licenseeId &&
    v.violationCodeId === violationCodeId &&
    v.state !== 'closed_overturned' &&        // overturned violations excluded
    new Date(v.createdAt) >= windowStart,
  ).length;
}

/** Two-step repeat-escalation per SDD §4.3 (configurable in production). */
export function applyRepeatEscalation(
  baseSeverity: ViolationSeverity,
  offenceCount: number,
): ViolationSeverity {
  if (offenceCount <= 1) return baseSeverity;
  if (baseSeverity === 'minor') {
    if (offenceCount === 2) return 'major';
    return 'critical';
  }
  if (baseSeverity === 'major') {
    return 'critical';
  }
  return baseSeverity;
}

/** Full pipeline: source signal → catalogue default → repeat-escalation. */
export function deriveFinalSeverity(
  code: ViolationCode,
  source: ViolationSource,
  offenceCount: number,
  sourceHint?: ViolationSeverity,
): { autoDerived: ViolationSeverity; finalSeverity: ViolationSeverity } {
  const autoDerived = autoDeriveSeverity(code, source, sourceHint);
  const finalSeverity = applyRepeatEscalation(autoDerived, offenceCount);
  return { autoDerived, finalSeverity };
}

// ---------------------------------------------------------------------------
// Display helpers
// ---------------------------------------------------------------------------
export const SEVERITY_LABEL: Record<ViolationSeverity, string> = {
  critical: 'Critical',
  major: 'Major',
  minor: 'Minor',
  informational: 'Informational',
};

export const SEVERITY_LABEL_AR: Record<ViolationSeverity, string> = {
  critical: 'حرجة',
  major: 'كبيرة',
  minor: 'بسيطة',
  informational: 'إعلامية',
};

export function severityTone(s: ViolationSeverity): 'danger' | 'warning' | 'info' | 'neutral' {
  switch (s) {
    case 'critical': return 'danger';
    case 'major':    return 'warning';
    case 'minor':    return 'info';
    case 'informational': return 'neutral';
  }
}
