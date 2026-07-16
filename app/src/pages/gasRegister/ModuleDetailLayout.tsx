import { ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { cn } from '../../lib/utils';

// =============================================================================
// Shared chrome for the new Gas Register module detail pages
// (Driver / Engineer / Fleet Movement / Connection / Maintenance).
//
//   • Breadcrumb bar
//   • Gradient hero with module-tone accent · title · sub-title · status chip
//   • Optional KPI strip
//   • Two-column body (main + sidebar) provided by the caller
// =============================================================================

export interface ModuleDetailLayoutProps {
  // Breadcrumb
  parentLabel: string;
  parentHref: string;
  current: string;
  sddRef: string;
  backLabel?: string;
  // Hero
  iconText: string;                                    // 2-3 char monogram for the hero badge
  iconAccent: string;                                  // CSS color for the icon backdrop
  eyebrow: string;
  title: string;
  subtitle?: string;
  status?: { label: string; tone: 'success' | 'danger' | 'warning' | 'info' | 'neutral' };
  meta?: ReactNode;                                    // small chips beneath the title
  // KPIs
  kpis?: { label: string; value: ReactNode; tone?: 'ink' | 'info' | 'success' | 'warning' | 'danger' }[];
  // Body
  children: ReactNode;
}

export function ModuleDetailLayout(props: ModuleDetailLayoutProps) {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-neutral-25">
      {/* Breadcrumb */}
      <div className="border-b border-neutral-100 bg-white">
        <div className="max-w-[1200px] mx-auto px-6 py-3 flex items-center justify-between text-[12px]">
          <nav className="text-neutral-500">
            <Link to="/pps-dashboard" className="hover:text-doe-red">Home</Link>
            <span className="mx-2 text-neutral-300">›</span>
            <span>Gas Register</span>
            <span className="mx-2 text-neutral-300">›</span>
            <Link to={props.parentHref} className="hover:text-doe-red">{props.parentLabel}</Link>
            <span className="mx-2 text-neutral-300">›</span>
            <span className="text-ink-950 font-semibold">{props.current}</span>
          </nav>
          <button onClick={() => navigate(props.parentHref)} className="text-[11px] text-neutral-500 hover:text-doe-red">
            ‹ {props.backLabel ?? `Back to ${props.parentLabel}`}
          </button>
        </div>
      </div>

      <div className="max-w-[1200px] mx-auto px-6 pt-6 pb-10">
        {/* Hero card */}
        <div className="card overflow-hidden mb-5">
          <div className="relative px-6 py-5 bg-gradient-to-br from-[#1E2128] via-[#262A33] to-[#1E2128] text-white">
            <div className="absolute inset-0 opacity-10" style={{ backgroundImage: `radial-gradient(circle at 80% 30%, ${props.iconAccent} 0%, transparent 50%)` }} />
            <div className="relative flex items-start gap-5">
              <div className="w-14 h-14 rounded-xl grid place-items-center shadow-doe-md font-display font-bold text-[18px] flex-shrink-0"
                style={{ background: props.iconAccent, color: '#fff' }}>
                {props.iconText}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] font-sans uppercase tracking-[0.22em]" style={{ color: props.iconAccent }}>{props.eyebrow}</span>
                  <span className="text-[10px] font-mono text-white/50">· {props.sddRef}</span>
                </div>
                <h1 className="font-display font-bold text-[22px] leading-tight">{props.title}</h1>
                {props.subtitle && <p className="text-[12.5px] text-white/70 mt-1 max-w-[720px]">{props.subtitle}</p>}
                {(props.meta || props.status) && (
                  <div className="mt-3 flex items-center gap-2 text-[11px] flex-wrap">
                    {props.status && (
                      <span className={cn('inline-flex items-center gap-1.5 px-2.5 h-6 rounded-full text-[10.5px] font-semibold',
                        statusCls(props.status.tone))}>
                        <span className={cn('w-1.5 h-1.5 rounded-full', dotCls(props.status.tone))} />
                        {props.status.label}
                      </span>
                    )}
                    {props.meta}
                  </div>
                )}
              </div>
            </div>
          </div>
          {/* KPI strip */}
          {props.kpis && props.kpis.length > 0 && (
            <div className="grid divide-x divide-neutral-100 bg-white" style={{ gridTemplateColumns: `repeat(${props.kpis.length}, minmax(0, 1fr))` }}>
              {props.kpis.map((k, i) => {
                const tone =
                  k.tone === 'success' ? 'text-emerald-600' :
                  k.tone === 'danger'  ? 'text-doe-red' :
                  k.tone === 'warning' ? 'text-amber-700' :
                  k.tone === 'info'    ? 'text-info-500' :
                  'text-ink-950';
                return (
                  <div key={i} className="px-4 py-3">
                    <div className="text-[9.5px] font-sans uppercase tracking-[0.18em] text-neutral-500">{k.label}</div>
                    <div className={cn('font-display font-bold text-[20px] mt-0.5 tabular-nums leading-none', tone)}>{k.value}</div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Body */}
        {props.children}
      </div>
    </div>
  );
}

// ─── Shared content primitives used inside the detail body ─────────────────
export function DetailCard({ title, subtitle, children, className }: { title: string; subtitle?: string; children: ReactNode; className?: string }) {
  return (
    <div className={cn('card p-4', className)}>
      <div className="mb-3">
        <div className="text-[10.5px] font-sans uppercase tracking-[0.18em] text-neutral-500">{title}</div>
        {subtitle && <div className="text-[10.5px] text-neutral-500 mt-0.5">{subtitle}</div>}
      </div>
      {children}
    </div>
  );
}

export function Field({ label, value, mono, tone }: { label: string; value: ReactNode; mono?: boolean; tone?: 'success' | 'danger' | 'warning' }) {
  const valueCls =
    tone === 'success' ? 'text-emerald-700 font-semibold' :
    tone === 'danger'  ? 'text-doe-red font-semibold' :
    tone === 'warning' ? 'text-amber-700 font-semibold' :
    'text-ink-950';
  return (
    <div>
      <div className="text-[9.5px] font-sans uppercase tracking-wider text-neutral-500 mb-0.5">{label}</div>
      <div className={cn('text-[12.5px]', mono && 'font-mono', valueCls)}>{value || '—'}</div>
    </div>
  );
}

export function FieldGrid({ children, cols = 2 }: { children: ReactNode; cols?: 1 | 2 | 3 }) {
  return <div className={cn('grid gap-x-6 gap-y-3', cols === 1 ? 'grid-cols-1' : cols === 3 ? 'grid-cols-3' : 'grid-cols-2')}>{children}</div>;
}

// ─── tone utilities ─────────────────────────────────────────────────────────
function statusCls(tone: 'success' | 'danger' | 'warning' | 'info' | 'neutral'): string {
  switch (tone) {
    case 'success': return 'bg-emerald-50 text-emerald-700';
    case 'danger':  return 'bg-rose-50 text-doe-red';
    case 'warning': return 'bg-amber-50 text-amber-700';
    case 'info':    return 'bg-info-soft text-info-500';
    case 'neutral': return 'bg-neutral-100 text-neutral-700';
  }
}
function dotCls(tone: 'success' | 'danger' | 'warning' | 'info' | 'neutral'): string {
  switch (tone) {
    case 'success': return 'bg-emerald-500';
    case 'danger':  return 'bg-doe-red';
    case 'warning': return 'bg-amber-500';
    case 'info':    return 'bg-info-500';
    case 'neutral': return 'bg-neutral-400';
  }
}
