import { Link } from 'react-router-dom';
import { cn } from '../lib/utils';

export function PageHeader({
  title,
  subtitle,
  breadcrumbs,
  actions,
  className,
}: {
  title: string;
  subtitle?: string;
  breadcrumbs?: { label: string; to?: string }[];
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('max-w-[1280px] mx-auto px-6 pt-6 pb-4', className)}>
      {breadcrumbs && breadcrumbs.length > 0 && (
        <nav className="text-[11px] font-sans uppercase tracking-wider text-neutral-500 mb-2">
          {breadcrumbs.map((b, i) => (
            <span key={i}>
              {b.to ? <Link to={b.to} className="hover:text-doe-red">{b.label}</Link> : <span>{b.label}</span>}
              {i < breadcrumbs.length - 1 && <span className="mx-1.5 text-neutral-300">/</span>}
            </span>
          ))}
        </nav>
      )}
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-display text-[28px] font-bold text-ink-950 leading-tight">{title}</h1>
          {subtitle && <p className="text-neutral-500 text-[13.5px] mt-1 max-w-[720px]">{subtitle}</p>}
        </div>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>
    </div>
  );
}
