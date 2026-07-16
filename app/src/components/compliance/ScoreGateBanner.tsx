// =============================================================================
// ScoreGateBanner — Score-to-Action gate (SDD §3.3) shown on permit detail
// pages when the licensee's score affects the next renewal / modification /
// issuance action.
//
// Bands:
//   ≥80%  Pass        → normal processing
//   60–79 Conditional → proceeds but requires Corrective Action Plan
//   40–59 Escalated   → paused; routed to Section Head
//   <40   Block       → action blocked
// =============================================================================
import { Link } from 'react-router-dom';
import { bandColor, type ComplianceScoreResult } from '../../services/compliance/scoring';
import { cn } from '../../lib/utils';

interface Props {
  result: ComplianceScoreResult;
  /** What action is being gated? — for narration only. */
  actionLabel?: string;
  /** Show a Compliance & Enforcement link */
  showLink?: boolean;
}

export function ScoreGateBanner({ result, actionLabel = 'renewal', showLink = true }: Props) {
  const colour = bandColor(result.band);
  const narration =
    result.action === 'pass'        ? `Compliance score is in the Pass band — ${actionLabel} proceeds without compliance intervention.` :
    result.action === 'conditional' ? `Score in the Conditional band — ${actionLabel} proceeds but the licensee must submit a Corrective Action Plan within 30 days.` :
    result.action === 'escalated'   ? `Score in the Escalated band — ${actionLabel} paused; routed to the DoE PPS Section Head for review.` :
    `Score in the Block band — ${actionLabel} blocked. All open Critical and Major violations must be closed before re-attempt.`;

  return (
    <div className={cn('rounded-md border ring-1 px-4 py-3 flex items-start gap-3', colour.bg, colour.ring,
      result.action === 'block' ? 'border-doe-red' : result.action === 'escalated' ? 'border-orange-400' : 'border-transparent')}>
      <span className={cn('mt-0.5 inline-flex items-center justify-center w-12 h-12 rounded-md font-display font-extrabold text-[18px] flex-shrink-0', colour.bg, colour.text, 'ring-1', colour.ring)}>
        {result.rate}%
      </span>
      <div className="flex-1 min-w-0">
        <div className={cn('text-[12.5px] font-semibold flex items-center gap-2 flex-wrap', colour.text)}>
          <span className={cn('w-1.5 h-1.5 rounded-full', colour.dot)} />
          Score-to-Action gate · {result.band}
          {result.capApplied && (
            <span className="inline-flex items-center px-1.5 h-4 rounded text-[9.5px] font-semibold uppercase tracking-wide bg-rose-50 text-doe-red ring-1 ring-doe-red/30">
              Open Major/Critical cap applied
            </span>
          )}
        </div>
        <div className="text-[12px] text-ink-950 mt-1 leading-relaxed">{narration}</div>
        <div className="text-[11px] text-neutral-600 mt-2 flex items-center gap-2 flex-wrap">
          <span>Built from {result.contributors.length} recent record{result.contributors.length === 1 ? '' : 's'}.</span>
          {result.openCriticalCount > 0 && (
            <span className="font-semibold text-doe-red">· {result.openCriticalCount} open Critical</span>
          )}
          {result.openMajorCount > 0 && (
            <span className="font-semibold text-amber-700">· {result.openMajorCount} open Major</span>
          )}
          {showLink && (
            <Link to="/compliance/violations" className="ml-auto text-action-orange-deep font-semibold hover:underline">
              Open violations register →
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
