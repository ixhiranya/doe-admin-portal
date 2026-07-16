import { useState, type ReactNode } from 'react';
import { cn } from '../lib/utils';

export function Accordion({
  title,
  description,
  children,
  defaultOpen = true,
  badge,
  status,
}: {
  title: string;
  description?: string;
  children: ReactNode;
  defaultOpen?: boolean;
  badge?: string;
  status?: 'ok' | 'warn' | 'error';
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="card overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-4 px-5 py-3.5 hover:bg-neutral-25"
      >
        <div className="text-left">
          <div className="flex items-center gap-2">
            <h3 className="font-display text-[15px] font-bold text-ink-950">{title}</h3>
            {badge && (
              <span className={cn('chip',
                status === 'error' ? 'bg-danger-soft text-danger-500' :
                status === 'warn' ? 'bg-warning-soft text-warning-500' :
                'bg-success-soft text-success-500')}>{badge}</span>
            )}
          </div>
          {description && <div className="text-[12px] text-neutral-500 mt-0.5">{description}</div>}
        </div>
        <span className={cn('transition-transform text-neutral-500', open && 'rotate-180')}>▾</span>
      </button>
      {open && <div className="border-t border-neutral-100 p-5">{children}</div>}
    </div>
  );
}
