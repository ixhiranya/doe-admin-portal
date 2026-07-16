// =============================================================================
// ComplianceScoreBadge — shared score chip used wherever a licensee's score
// surfaces (Application detail header, Compliance Dashboard list, etc.)
// SDD §3.4 — score surfacing convention with colour band + value + tooltip.
// =============================================================================
import { Link } from 'react-router-dom';
import {
  bandColor, scoreBand, type ComplianceScoreResult,
} from '../../services/compliance/scoring';
import { cn } from '../../lib/utils';

interface Props {
  result: ComplianceScoreResult;
  /** Compact = inline chip; full = with label */
  variant?: 'compact' | 'full' | 'large';
  /** Optionally render as a link to the licensee's compliance dashboard view. */
  linkable?: boolean;
}

export function ComplianceScoreBadge({ result, variant = 'full', linkable = false }: Props) {
  const colour = bandColor(result.band);

  const inner = variant === 'large' ? (
    <div className={cn('rounded-lg ring-1 px-3 py-2 inline-flex items-center gap-3', colour.bg, colour.ring)}>
      <div className={cn('font-display font-extrabold text-[28px] leading-none tabular-nums', colour.text)}>
        {result.rate}<span className="text-[14px] align-top">%</span>
      </div>
      <div className="text-left">
        <div className="text-[9.5px] font-sans uppercase tracking-[0.18em] text-neutral-500">Compliance score</div>
        <div className={cn('text-[12px] font-semibold flex items-center gap-1.5', colour.text)}>
          <span className={cn('w-1.5 h-1.5 rounded-full', colour.dot)} />
          {result.band}
        </div>
      </div>
    </div>
  ) : variant === 'compact' ? (
    <span className={cn('inline-flex items-center gap-1.5 px-2 h-6 rounded-full ring-1 text-[11px] font-semibold whitespace-nowrap', colour.bg, colour.ring, colour.text)}>
      <span className={cn('w-1.5 h-1.5 rounded-full', colour.dot)} />
      {result.rate}% · {result.band}
    </span>
  ) : (
    <span className={cn('inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full ring-1 text-[11.5px] font-semibold whitespace-nowrap', colour.bg, colour.ring, colour.text)}>
      <span className={cn('w-1.5 h-1.5 rounded-full', colour.dot)} />
      {result.rate}% · {result.band}
    </span>
  );

  const tooltip = `${result.rate}% Compliance — ${result.band}. ${result.contributors.length} contributing record(s). ${result.openCriticalCount} open Critical, ${result.openMajorCount} open Major. ${result.capApplied ? 'Capped at 79% by open Major/Critical rule.' : ''}`;

  const node = <span title={tooltip}>{inner}</span>;
  if (!linkable) return node;
  return (
    <Link to={`/compliance/dashboard?licensee=${encodeURIComponent(result.licenseeId)}`}>
      {node}
    </Link>
  );
}

/** Tiny inline chip for table rows. */
export function ComplianceScoreInline({ result }: { result: ComplianceScoreResult }) {
  const colour = bandColor(result.band);
  return (
    <span className={cn('inline-flex items-center gap-1.5 px-2 h-5 rounded text-[10.5px] font-mono font-semibold whitespace-nowrap', colour.bg, colour.text, 'ring-1', colour.ring)} title={`${result.band} (raw ${result.rawRate}%)`}>
      {result.rate}%
    </span>
  );
}

/** Read-only display of which band a score falls into. */
export function ScoreBandPill({ rate }: { rate: number }) {
  const def = scoreBand(rate);
  const colour = bandColor(def.band);
  return (
    <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full ring-1 text-[10.5px] font-semibold uppercase tracking-wide', colour.bg, colour.text, colour.ring)}>
      {def.band}
    </span>
  );
}
