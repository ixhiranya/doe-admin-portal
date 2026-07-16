import { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { LivePulse, LastRefreshed, StatTone } from './components';
import { cn } from '../../lib/utils';

// ============================================================================
// Shared page-frame for every service-specific dashboard (§3 of the SDD).
// Compact, modern header: breadcrumb + title + filters + live indicator all on
// one row to match the Executive Landing density. Each dashboard passes its
// module tone so the page carries an accent strip + per-module identity.
// ============================================================================

const TONE_GRADIENT: Record<StatTone, string> = {
  blue:    'from-blue-50    via-white to-white',
  teal:    'from-teal-50    via-white to-white',
  emerald: 'from-emerald-50 via-white to-white',
  violet:  'from-violet-50  via-white to-white',
  orange:  'from-orange-50  via-white to-white',
  indigo:  'from-indigo-50  via-white to-white',
  rose:    'from-rose-50    via-white to-white',
  amber:   'from-amber-50   via-white to-white',
  slate:   'from-neutral-50 via-white to-white',
};

const TONE_STRIPE: Record<StatTone, string> = {
  blue:    'bg-blue-500',
  teal:    'bg-teal-600',
  emerald: 'bg-emerald-500',
  violet:  'bg-violet-600',
  orange:  'bg-action-orange',
  indigo:  'bg-indigo-500',
  rose:    'bg-doe-red',
  amber:   'bg-amber-500',
  slate:   'bg-ink-950',
};

const TONE_PILL: Record<StatTone, string> = {
  blue:    'bg-blue-50    text-blue-700',
  teal:    'bg-teal-50    text-teal-700',
  emerald: 'bg-emerald-50 text-emerald-700',
  violet:  'bg-violet-50  text-violet-700',
  orange:  'bg-action-orange-soft text-action-orange-deep',
  indigo:  'bg-indigo-50  text-indigo-700',
  rose:    'bg-doe-red-soft text-doe-red',
  amber:   'bg-amber-50   text-amber-700',
  slate:   'bg-neutral-100 text-neutral-700',
};

export function ServiceDashboardLayout({
  module, title, subtitle, breadcrumbLabel, refreshCadence, filterBar, tone = 'slate', children,
}: {
  module: string;
  title: string;
  subtitle: string;
  breadcrumbLabel: string;
  refreshCadence?: string;
  filterBar?: ReactNode;
  tone?: StatTone;
  children: ReactNode;
}) {
  return (
    <div className="bg-neutral-25 min-h-full">
      {/* ── HEADER ──
          No overflow-hidden so floating panels (filter dropdowns, product
          pickers) can extend below the header into the body. */}
      <div className={cn('relative bg-gradient-to-br border-b border-neutral-100', TONE_GRADIENT[tone])}>
        <div className={cn('absolute top-0 left-0 right-0 h-0.5', TONE_STRIPE[tone])} />
        <div className="max-w-[1440px] mx-auto px-6 pt-5 pb-4">
          {/* Breadcrumb */}
          <nav className="text-[11px] text-neutral-500 mb-2 flex items-center gap-1.5">
            <Link to="/pps-dashboard" className="hover:text-ink-950 transition">PPS Dashboard</Link>
            <span className="text-neutral-300">›</span>
            <span className="text-ink-950 font-semibold">{breadcrumbLabel}</span>
          </nav>

          <div className="flex items-center justify-between gap-6 flex-wrap">
            <div className="min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className={cn('inline-flex items-center px-2 h-5 rounded-md text-[9.5px] font-mono font-bold tracking-wider uppercase', TONE_PILL[tone])}>
                  {breadcrumbLabel}
                </span>
                <div className="text-[10.5px] font-sans uppercase tracking-[0.18em] text-neutral-500 truncate">{module}</div>
              </div>
              <h1 className="font-display text-[20px] font-bold text-ink-950 leading-tight">{title}</h1>
              <div className="text-[12px] text-neutral-500 mt-0.5">{subtitle}</div>
            </div>
            <div className="flex items-center gap-3 flex-wrap text-[11.5px]">
              <LivePulse cadence={refreshCadence ?? '5m'} />
              <span className="w-px h-4 bg-neutral-200" />
              <LastRefreshed />
              <Link to="#" className="h-7 px-2.5 rounded border border-neutral-200 bg-white text-ink-950 text-[11px] font-semibold hover:bg-neutral-50 transition flex items-center gap-1">Export</Link>
            </div>
          </div>

          {filterBar && (
            <div className="mt-3.5 flex items-center gap-5 flex-wrap text-[11.5px]">
              {filterBar}
            </div>
          )}
        </div>
      </div>

      {/* ── BODY ── */}
      <div className="max-w-[1440px] mx-auto px-6 py-5 space-y-5">
        {children}
      </div>
    </div>
  );
}

export function DashSectionRule({ children, right }: { children: ReactNode; right?: ReactNode }) {
  return (
    <div className="flex items-end justify-between mb-2.5">
      <div className="text-[10.5px] font-sans uppercase tracking-[0.18em] text-neutral-500">{children}</div>
      {right}
    </div>
  );
}

// Backwards-compat re-export for pages that still import the old name
export { DashSectionRule as DashSectionTitle };
