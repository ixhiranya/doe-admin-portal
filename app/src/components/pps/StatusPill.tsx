import { cn } from '../../lib/utils';
import { STATUS_META } from './workflow';
import type { SubmissionStatus } from '../../types/pps';

// ============================================================================
// Single status pill used in: Submissions list table, Detail page header,
// task cards, monitoring sub-views.
// ============================================================================

export function StatusPill({
  status,
  size = 'md',
  longLabel = false,
  label,
}: {
  status: SubmissionStatus;
  size?: 'sm' | 'md' | 'lg';
  longLabel?: boolean;
  label?: string;   // optional text override (keeps the status colour/dot)
}) {
  const meta = STATUS_META[status];
  if (!meta) return null;
  const sizeClass =
    size === 'lg' ? 'h-7 px-3 text-[12px]' :
    size === 'sm' ? 'h-5 px-2 text-[10px]' :
                    'h-6 px-2.5 text-[10.5px]';
  return (
    <span className={cn('inline-flex items-center gap-1.5 rounded-full font-semibold', meta.pillClass, sizeClass)}>
      <span className={cn('w-1.5 h-1.5 rounded-full', meta.dotClass)} />
      {label ?? (longLabel ? meta.longLabel : meta.label)}
    </span>
  );
}
