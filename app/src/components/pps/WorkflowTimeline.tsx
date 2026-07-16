import { cn } from '../../lib/utils';
import { formatDateTime } from '../../lib/utils';
import { buildTimeline, type TimelineStage } from './workflow';
import type { Submission } from '../../types/pps';

// ============================================================================
// Reusable workflow timeline used on Submission Detail page (full variant)
// and Submissions list / Monitoring drawers (compact variant).
// Always renders all 5 stages so the layout is identical across submissions —
// stages that haven't occurred (or never will, like Returned for an approved
// straight-through submission) render in muted "upcoming" / "skipped" state.
// ============================================================================

export function WorkflowTimeline({
  submission,
  variant = 'full',
}: {
  submission: Submission;
  variant?: 'full' | 'compact';
}) {
  const stages = buildTimeline(submission);

  if (variant === 'compact') {
    return (
      <div className="flex items-center gap-1.5">
        {stages.map((s, i) => (
          <span key={s.key} className="flex items-center gap-1.5">
            <StageDot stage={s} size="sm" />
            {i < stages.length - 1 && <span className={cn('w-3 h-px', connectorColor(stages[i], stages[i+1]))} />}
          </span>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-5 gap-3 relative">
      {/* connector line behind the dots */}
      <div className="absolute left-3 right-3 top-3 h-px bg-neutral-100" />
      {stages.map((stage) => (
        <div key={stage.key} className="relative">
          <div className="flex items-center gap-2 mb-2">
            <StageDot stage={stage} size="md" />
          </div>
          <div className={cn('text-[12.5px] font-semibold',
            stage.state === 'current'   ? 'text-action-orange-deep' :
            stage.state === 'completed' ? 'text-ink-950' :
            stage.state === 'skipped'   ? 'text-neutral-400' :
                                          'text-neutral-500')}>
            {stage.label}
          </div>
          {stage.at && (
            <div className="text-[10.5px] font-mono text-neutral-500 mt-0.5">{formatDateTime(stage.at)}</div>
          )}
          {!stage.at && stage.state === 'skipped' && (
            <div className="text-[10.5px] font-mono text-neutral-400 mt-0.5">— skipped</div>
          )}
          {!stage.at && stage.state === 'upcoming' && (
            <div className="text-[10.5px] font-mono text-neutral-400 mt-0.5">— upcoming</div>
          )}
          {!stage.at && stage.state === 'current' && (
            <div className="text-[10.5px] font-mono text-action-orange-deep mt-0.5">— in progress</div>
          )}
          {stage.by && (
            <div className="text-[10.5px] text-neutral-500 mt-1">
              {stage.by}
              {stage.byRole ? <span className="text-neutral-400"> ({stage.byRole})</span> : null}
            </div>
          )}
          {stage.comment && (
            <div className="text-[11px] text-neutral-700 mt-1 italic">&ldquo;{stage.comment}&rdquo;</div>
          )}
        </div>
      ))}
    </div>
  );
}

function StageDot({ stage, size = 'md' }: { stage: TimelineStage; size?: 'sm' | 'md' }) {
  const sized = size === 'sm' ? 'w-3.5 h-3.5' : 'w-5 h-5';
  const inner = size === 'sm' ? 'w-1.5 h-1.5' : 'w-2 h-2';
  const ring =
    stage.state === 'completed' ? 'border-success-500 bg-white' :
    stage.state === 'current'   ? 'border-action-orange bg-white ring-2 ring-action-orange/20' :
    stage.state === 'skipped'   ? 'border-neutral-200 bg-neutral-50' :
                                  'border-neutral-200 bg-white';
  const dotBg =
    stage.state === 'completed' ? 'bg-success-500' :
    stage.state === 'current'   ? 'bg-action-orange' :
    stage.state === 'skipped'   ? 'bg-neutral-300' :
                                  'bg-neutral-200';
  return (
    <span className={cn('inline-grid place-items-center rounded-full border-2', sized, ring)}>
      <span className={cn('rounded-full', inner, dotBg)} />
    </span>
  );
}

function connectorColor(prev: TimelineStage, next: TimelineStage): string {
  if (prev.state === 'completed' && (next.state === 'completed' || next.state === 'current')) return 'bg-success-500';
  if (prev.state === 'completed') return 'bg-neutral-200';
  return 'bg-neutral-200';
}
