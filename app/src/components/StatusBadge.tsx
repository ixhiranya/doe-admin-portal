import type { StateDef } from '../types';
import { cn } from '../lib/utils';

const COLORS: Record<StateDef['category'], string> = {
  draft: 'bg-neutral-100 text-neutral-700',
  pending: 'bg-info-soft text-info-500',
  returned: 'bg-warning-soft text-warning-500',
  approved: 'bg-success-soft text-success-500',
  rejected: 'bg-danger-soft text-danger-500',
  cancelled: 'bg-neutral-100 text-neutral-500',
  payment: 'bg-action-orange-soft text-action-orange-deep',
  issued: 'bg-mint text-success-500',
};

export function StatusBadge({ state, className }: { state: StateDef; className?: string }) {
  return (
    <span className={cn(
      'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider whitespace-nowrap',
      COLORS[state.category],
      className,
    )}>
      <span
        className="inline-block w-1.5 h-1.5 rounded-full"
        style={{ background: 'currentColor', opacity: 0.7 }}
      />
      {state.label}
    </span>
  );
}
