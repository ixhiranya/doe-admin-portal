import { ReactNode, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, useInView, useMotionValue, useTransform, animate, AnimatePresence } from 'framer-motion';
import {
  AreaChart, Area,
  BarChart, Bar,
  LineChart, Line,
  PieChart, Pie, Cell,
  ResponsiveContainer,
  CartesianGrid, XAxis, YAxis, Tooltip, Legend,
} from 'recharts';
import { cn } from '../../lib/utils';
import type { AlertItem } from './dashboardData';

// ============================================================================
// Shared dashboard primitives. All charts use Recharts and re-use the DoE
// brand palette so every dashboard has a consistent visual language.
// ============================================================================

export const CHART_PALETTE = ['#E89B4C', '#3B82F6', '#10B981', '#7B3FE4', '#EF4444', '#0F766E', '#F59E0B', '#6366F1', '#14B8A6', '#EC4899'];

// ---------------------------------------------------------------------------
// SectionTitle — reused tracking-style label
// ---------------------------------------------------------------------------
export function DashSectionTitle({ children, right }: { children: ReactNode; right?: ReactNode }) {
  return (
    <div className="flex items-center justify-between mb-2.5">
      <div className="text-[10px] font-sans uppercase tracking-[0.18em] text-neutral-500">{children}</div>
      {right}
    </div>
  );
}

// ---------------------------------------------------------------------------
// KpiTile — large clickable headline figure with trend / delta
// ---------------------------------------------------------------------------
export interface KpiTileProps {
  label: string;
  value: ReactNode;
  unit?: string;
  hint?: string;
  delta?: { value: number; label?: string };
  tone?: 'default' | 'success' | 'warning' | 'danger' | 'info';
  size?: 'sm' | 'md' | 'lg';
  sparkline?: { value: number }[];
  onClick?: () => void;
  to?: string;
  icon?: ReactNode;
}

export function KpiTile({ label, value, unit, hint, delta, tone = 'default', size = 'md', sparkline, onClick, to, icon }: KpiTileProps) {
  const toneCls =
    tone === 'success' ? 'border-success-500/30 hover:border-success-500/60' :
    tone === 'warning' ? 'border-warning-500/30 hover:border-warning-500/60' :
    tone === 'danger'  ? 'border-doe-red/30 hover:border-doe-red/60' :
    tone === 'info'    ? 'border-info-500/30 hover:border-info-500/60' :
    'border-neutral-200 hover:border-neutral-300';
  const valueSize = size === 'lg' ? 'text-[34px]' : size === 'sm' ? 'text-[20px]' : 'text-[26px]';
  const inner = (
    <div className={cn('bg-white border rounded-xl p-4 shadow-doe-sm transition flex flex-col gap-2 cursor-pointer', toneCls)}>
      <div className="flex items-start justify-between gap-3">
        <div className="text-[10.5px] font-sans uppercase tracking-[0.14em] text-neutral-500 leading-tight">{label}</div>
        {icon && <div className="text-neutral-400 flex-shrink-0">{icon}</div>}
      </div>
      <div className="flex items-baseline gap-2 flex-wrap">
        <span className={cn('font-display font-bold text-ink-950 leading-none tabular-nums', valueSize)}>{value}</span>
        {unit && <span className="text-[12px] text-neutral-500">{unit}</span>}
      </div>
      {delta && (
        <div className={cn('flex items-center gap-1 text-[11px]', delta.value >= 0 ? 'text-success-500' : 'text-doe-red')}>
          <span>{delta.value >= 0 ? '↑' : '↓'}</span>
          <span className="font-semibold">{Math.abs(delta.value).toFixed(1)}%</span>
          {delta.label && <span className="text-neutral-500">{delta.label}</span>}
        </div>
      )}
      {sparkline && sparkline.length > 0 && (
        <div className="h-8 -mb-1 -mx-1">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={sparkline}>
              <defs>
                <linearGradient id={`spark-${label}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#E89B4C" stopOpacity={0.6} />
                  <stop offset="100%" stopColor="#E89B4C" stopOpacity={0} />
                </linearGradient>
              </defs>
              <Area type="monotone" dataKey="value" stroke="#E89B4C" strokeWidth={1.5} fill={`url(#spark-${label})`} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
      {hint && <div className="text-[11px] text-neutral-500">{hint}</div>}
    </div>
  );
  if (to) return <Link to={to} className="block focus:outline-none focus:ring-2 focus:ring-action-orange/30 rounded-xl">{inner}</Link>;
  if (onClick) return <button type="button" onClick={onClick} className="text-left w-full focus:outline-none focus:ring-2 focus:ring-action-orange/30 rounded-xl">{inner}</button>;
  return inner;
}

// ---------------------------------------------------------------------------
// ChartCard — card wrapper around a chart with title + optional title suffix
// ---------------------------------------------------------------------------
export function ChartCard({ title, subtitle, height = 240, titleSuffix, children }: { title: string; subtitle?: string; height?: number; titleSuffix?: ReactNode; children: ReactNode }) {
  return (
    <div className="bg-white border border-neutral-200 rounded-xl shadow-doe-sm p-4">
      <div className="flex items-start justify-between gap-3 mb-2">
        <div>
          <div className="text-[13px] font-semibold text-ink-950">{title}</div>
          {subtitle && <div className="text-[11px] text-neutral-500 mt-0.5">{subtitle}</div>}
        </div>
        {titleSuffix}
      </div>
      <div style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">{children as any}</ResponsiveContainer>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// StackedTrendChart — stacked column trend over 12 months
// ---------------------------------------------------------------------------
export function StackedTrendChart({ data, series, xKey = 'monthLabel' }: { data: any[]; series: { key: string; label: string; color?: string }[]; xKey?: string }) {
  return (
    <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
      <CartesianGrid strokeDasharray="3 3" stroke="#E7E5E4" vertical={false} />
      <XAxis dataKey={xKey} tick={{ fontSize: 10, fill: '#71717A' }} tickLine={false} axisLine={{ stroke: '#E7E5E4' }} />
      <YAxis tick={{ fontSize: 10, fill: '#71717A' }} tickLine={false} axisLine={false} width={28} allowDecimals={false} />
      <Tooltip cursor={{ fill: '#F5F5F4', opacity: 0.5 }} contentStyle={tooltipStyle} />
      <Legend wrapperStyle={{ fontSize: 11 }} iconType="square" iconSize={8} />
      {series.map((s, i) => (
        <Bar key={s.key} dataKey={s.key} name={s.label} stackId="a" fill={s.color ?? CHART_PALETTE[i % CHART_PALETTE.length]} radius={i === series.length - 1 ? [3, 3, 0, 0] : 0} />
      ))}
    </BarChart>
  );
}

// ---------------------------------------------------------------------------
// HorizontalBarChart — distribution chart (sorted)
// ---------------------------------------------------------------------------
export function HorizontalBarChart({ data, colorByIndex }: { data: { key: string; label: string; count: number }[]; colorByIndex?: boolean }) {
  return (
    <BarChart data={data} layout="vertical" margin={{ top: 0, right: 20, left: 0, bottom: 0 }}>
      <CartesianGrid strokeDasharray="3 3" stroke="#E7E5E4" horizontal={false} />
      <XAxis type="number" tick={{ fontSize: 10, fill: '#71717A' }} tickLine={false} axisLine={{ stroke: '#E7E5E4' }} allowDecimals={false} />
      <YAxis dataKey="label" type="category" tick={{ fontSize: 10.5, fill: '#3F3F46' }} width={130} tickLine={false} axisLine={false} />
      <Tooltip cursor={{ fill: '#F5F5F4', opacity: 0.5 }} contentStyle={tooltipStyle} />
      <Bar dataKey="count" radius={[0, 3, 3, 0]}>
        {data.map((_, i) => (
          <Cell key={i} fill={colorByIndex ? CHART_PALETTE[i % CHART_PALETTE.length] : '#3B82F6'} />
        ))}
      </Bar>
    </BarChart>
  );
}

// ---------------------------------------------------------------------------
// DonutChart — categorical distribution
// ---------------------------------------------------------------------------
export function DonutChart({ data, centerLabel, centerValue }: { data: { key: string; label: string; count: number }[]; centerLabel?: string; centerValue?: ReactNode }) {
  return (
    <PieChart>
      <Pie data={data} dataKey="count" nameKey="label" cx="50%" cy="50%" innerRadius={60} outerRadius={86} paddingAngle={2}>
        {data.map((_, i) => <Cell key={i} fill={CHART_PALETTE[i % CHART_PALETTE.length]} />)}
        {centerLabel && (
          <text x="50%" y="50%" textAnchor="middle" dominantBaseline="central" style={{ fontSize: 18, fontWeight: 700, fill: '#0F0F10' }}>{centerValue}</text>
        )}
      </Pie>
      <Tooltip contentStyle={tooltipStyle} />
      <Legend layout="vertical" align="right" verticalAlign="middle" wrapperStyle={{ fontSize: 11 }} iconType="circle" iconSize={8} />
    </PieChart>
  );
}

// ---------------------------------------------------------------------------
// TrendLineChart — single-metric line chart
// ---------------------------------------------------------------------------
export function TrendLineChart({ data, xKey, yKey, color = '#3B82F6' }: { data: any[]; xKey: string; yKey: string; color?: string }) {
  return (
    <LineChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
      <CartesianGrid strokeDasharray="3 3" stroke="#E7E5E4" vertical={false} />
      <XAxis dataKey={xKey} tick={{ fontSize: 10, fill: '#71717A' }} tickLine={false} axisLine={{ stroke: '#E7E5E4' }} />
      <YAxis tick={{ fontSize: 10, fill: '#71717A' }} tickLine={false} axisLine={false} width={28} />
      <Tooltip contentStyle={tooltipStyle} />
      <Line type="monotone" dataKey={yKey} stroke={color} strokeWidth={2} dot={{ r: 3, fill: color }} activeDot={{ r: 5 }} />
    </LineChart>
  );
}

// ---------------------------------------------------------------------------
// WorkflowFunnel — pure CSS horizontal bar list
// ---------------------------------------------------------------------------
export function WorkflowFunnel({ stages }: { stages: { stage: string; count: number }[] }) {
  const max = Math.max(1, ...stages.map((s) => s.count));
  return (
    <div className="space-y-2">
      {stages.length === 0 ? (
        <div className="text-[11.5px] text-neutral-500">No open workflows in this segment.</div>
      ) : stages.map((s, i) => (
        <div key={s.stage} className="flex items-center gap-3 text-[11.5px]">
          <div className="w-44 flex-shrink-0 text-neutral-700">{s.stage}</div>
          <div className="flex-1 h-5 bg-neutral-100 rounded-sm overflow-hidden">
            <div
              className="h-full rounded-sm"
              style={{ width: `${(s.count / max) * 100}%`, background: CHART_PALETTE[i % CHART_PALETTE.length] }}
            />
          </div>
          <div className="w-10 text-right font-mono font-semibold text-ink-950 tabular-nums">{s.count}</div>
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// DrillGrid — generic detail-grid below charts
// ---------------------------------------------------------------------------
export interface DrillCol<T> {
  key: keyof T | string;
  label: string;
  render?: (row: T) => ReactNode;
  align?: 'left' | 'right' | 'center';
  width?: string;
}

export function DrillGrid<T extends { id: string }>({ rows, cols, rowHref, emptyMessage = 'No records match the current filter.' }: { rows: T[]; cols: DrillCol<T>[]; rowHref?: (row: T) => string | undefined; emptyMessage?: string }) {
  if (rows.length === 0) {
    return <div className="bg-white border border-neutral-200 rounded-xl p-8 text-center text-[12px] text-neutral-500">{emptyMessage}</div>;
  }
  return (
    <div className="bg-white border border-neutral-200 rounded-xl shadow-doe-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-[11.5px]">
          <thead>
            <tr className="bg-neutral-50 border-b border-neutral-200">
              {cols.map((c) => (
                <th
                  key={String(c.key)}
                  style={{ width: c.width }}
                  className={cn('py-2.5 px-3 text-[10px] font-sans uppercase tracking-[0.12em] text-neutral-500 font-semibold whitespace-nowrap',
                    c.align === 'right' ? 'text-right' : c.align === 'center' ? 'text-center' : 'text-left')}
                >
                  {c.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {rows.slice(0, 50).map((row) => {
              const href = rowHref?.(row);
              const Inner = (
                <>
                  {cols.map((c) => (
                    <td
                      key={String(c.key)}
                      className={cn('py-2 px-3 align-top', c.align === 'right' ? 'text-right' : c.align === 'center' ? 'text-center' : 'text-left')}
                    >
                      {c.render ? c.render(row) : (row as any)[c.key as any] ?? '—'}
                    </td>
                  ))}
                </>
              );
              if (href) return <tr key={row.id} className="hover:bg-neutral-25 cursor-pointer transition" onClick={() => { window.location.assign(href); }}>{Inner}</tr>;
              return <tr key={row.id}>{Inner}</tr>;
            })}
          </tbody>
        </table>
      </div>
      {rows.length > 50 && (
        <div className="border-t border-neutral-100 px-4 py-2 text-[11px] text-neutral-500 bg-neutral-25">
          Showing first 50 of {rows.length.toLocaleString()} rows · refine filters or export to see more.
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// AlertList — used by Executive Landing alert panel
// ---------------------------------------------------------------------------
export function AlertList({ title, items, emptyText, footer }: { title: string; items: AlertItem[]; emptyText?: string; footer?: ReactNode }) {
  const toneDot = (t: AlertItem['tone']) =>
    t === 'red' ? 'bg-doe-red' : t === 'amber' ? 'bg-warning-500' : 'bg-info-500';
  return (
    <div className="bg-white border border-neutral-200 rounded-xl shadow-doe-sm flex flex-col">
      <div className="flex items-center justify-between px-3.5 py-2 border-b border-neutral-100">
        <div className="text-[11px] font-semibold text-ink-950">{title}</div>
        <div className="text-[11px] font-mono text-neutral-500">{items.length}</div>
      </div>
      {items.length === 0 ? (
        <div className="px-3.5 py-3 text-[11.5px] text-neutral-500">{emptyText ?? 'Nothing to flag.'}</div>
      ) : (
        <div className="flex-1 overflow-y-auto max-h-[260px] divide-y divide-neutral-100">
          {items.map((it) => {
            const inner = (
              <div className="px-3.5 py-2 flex items-start gap-2.5 hover:bg-neutral-25 transition">
                <span className={cn('w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0', toneDot(it.tone))} />
                <div className="flex-1 min-w-0">
                  <div className="text-[12px] font-semibold text-ink-950 truncate">{it.primary}</div>
                  {it.secondary && <div className="text-[11px] text-neutral-500 truncate">{it.secondary}</div>}
                </div>
                {it.metric && <div className="text-[11px] font-mono font-semibold text-ink-950 flex-shrink-0">{it.metric}</div>}
              </div>
            );
            if (it.href) return <Link key={it.id} to={it.href} className="block">{inner}</Link>;
            return <div key={it.id}>{inner}</div>;
          })}
        </div>
      )}
      {footer && <div className="border-t border-neutral-100 px-3.5 py-2 text-[11px] text-neutral-500">{footer}</div>}
    </div>
  );
}

// ---------------------------------------------------------------------------
// FilterChips — multi-select chip row used as the local filter rail
// ---------------------------------------------------------------------------
export function FilterChips<T extends string>({ label, options, value, onChange }: { label: string; options: T[]; value: T[]; onChange: (next: T[]) => void }) {
  function toggle(o: T) {
    if (value.includes(o)) onChange(value.filter((x) => x !== o));
    else onChange([...value, o]);
  }
  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      <span className="text-[10px] font-sans uppercase tracking-[0.14em] text-neutral-500 mr-1">{label}</span>
      {options.map((o) => {
        const on = value.includes(o);
        return (
          <button
            key={o}
            type="button"
            onClick={() => toggle(o)}
            className={cn(
              'inline-flex items-center h-6 px-2 rounded-full text-[10.5px] font-semibold transition',
              on ? 'bg-action-orange text-white shadow-sm' : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200',
            )}
          >
            {o}
          </button>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// LivePulse — a small "live" indicator with refresh cadence label
// ---------------------------------------------------------------------------
export function LivePulse({ cadence = '30s' }: { cadence?: string }) {
  return (
    <div className="inline-flex items-center gap-1.5 text-[10.5px] font-sans uppercase tracking-[0.16em] text-neutral-500">
      <span className="relative inline-flex w-1.5 h-1.5">
        <span className="absolute inset-0 rounded-full bg-success-500 animate-ping opacity-75" />
        <span className="relative w-1.5 h-1.5 rounded-full bg-success-500" />
      </span>
      Live · {cadence}
    </div>
  );
}

// ---------------------------------------------------------------------------
// LastRefreshed — auto-ticking clock
// ---------------------------------------------------------------------------
export function LastRefreshed() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(id);
  }, []);
  return (
    <div className="text-[10.5px] font-mono text-neutral-500">
      Refreshed {now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Shared tooltip styling
// ---------------------------------------------------------------------------
const tooltipStyle: React.CSSProperties = {
  background: '#0F0F10',
  border: 'none',
  borderRadius: 6,
  color: '#fff',
  fontSize: 11,
  padding: '6px 9px',
};

// Re-export Recharts primitives used by dashboard pages without extra imports
export { ResponsiveContainer, BarChart, Bar, AreaChart, Area, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend };

// ============================================================================
// Motion primitives — used by the redesigned Executive Landing dashboard
// ============================================================================

// ---------------------------------------------------------------------------
// AnimatedNumber — count-up tween triggered the first time it scrolls into view
// ---------------------------------------------------------------------------
export function AnimatedNumber({ value, format, duration = 1.0, prefix, suffix, className }: {
  value: number;
  format?: (v: number) => string;
  duration?: number;
  prefix?: string;
  suffix?: string;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement | null>(null);
  const inView = useInView(ref, { once: true, margin: '0px 0px -10% 0px' });
  const mv = useMotionValue(0);
  const display = useTransform(mv, (v) => (format ? format(v) : Math.round(v).toLocaleString()));
  const [text, setText] = useState<string>(format ? format(0) : '0');

  useEffect(() => {
    const unsub = display.on('change', (v) => setText(v));
    return () => unsub();
  }, [display]);

  useEffect(() => {
    if (!inView) return;
    const controls = animate(mv, value, { duration, ease: [0.16, 1, 0.3, 1] });
    return () => controls.stop();
  }, [inView, mv, value, duration]);

  return (
    <span ref={ref} className={cn('tabular-nums', className)}>
      {prefix}{text}{suffix}
    </span>
  );
}

// ---------------------------------------------------------------------------
// MotionFadeIn — single element fade + lift on first view
// ---------------------------------------------------------------------------
export function MotionFadeIn({ children, delay = 0, className }: { children: ReactNode; delay?: number; className?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '0px 0px -8% 0px' }}
      transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1], delay }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// StaggerGrid — wraps children in a staggered fade-in container
// ---------------------------------------------------------------------------
export function StaggerGrid({ children, className, delayStep = 0.05 }: { children: ReactNode; className?: string; delayStep?: number }) {
  return (
    <motion.div
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: '0px 0px -5% 0px' }}
      variants={{
        hidden: {},
        visible: { transition: { staggerChildren: delayStep } },
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export function StaggerItem({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <motion.div
      variants={{
        hidden: { opacity: 0, y: 16 },
        visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] } },
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// HeroKpiCard — large gradient hero with animated count-up + delta + sparkline
// ---------------------------------------------------------------------------
export interface HeroKpiCardProps {
  label: string;
  value: number;
  format?: (v: number) => string;
  suffix?: string;
  caption?: string;
  delta?: { value: number; label?: string };
  sparkline?: { value: number }[];
  tone?: 'dark' | 'orange' | 'success' | 'info' | 'danger';
  to?: string;
  cta?: string;
}

export function HeroKpiCard({ label, value, format, suffix, caption, delta, sparkline, tone = 'dark', to, cta }: HeroKpiCardProps) {
  const palette = {
    dark:    { bg: 'bg-gradient-to-br from-ink-950 via-[#1F2128] to-[#11131A]',                     text: 'text-white',     sub: 'text-white/65', stroke: '#E89B4C', glow: 'rgba(232,155,76,0.4)' },
    orange:  { bg: 'bg-gradient-to-br from-action-orange via-[#E0853D] to-[#C26C2A]',               text: 'text-white',     sub: 'text-white/80', stroke: '#FFFFFF', glow: 'rgba(255,255,255,0.4)' },
    success: { bg: 'bg-gradient-to-br from-[#0F766E] via-[#10B981] to-[#34D399]',                   text: 'text-white',     sub: 'text-white/80', stroke: '#FFFFFF', glow: 'rgba(255,255,255,0.4)' },
    info:    { bg: 'bg-gradient-to-br from-[#1E3A8A] via-[#3B82F6] to-[#60A5FA]',                   text: 'text-white',     sub: 'text-white/80', stroke: '#FFFFFF', glow: 'rgba(255,255,255,0.4)' },
    danger:  { bg: 'bg-gradient-to-br from-[#7F1D1D] via-doe-red to-[#E11D48]',                     text: 'text-white',     sub: 'text-white/80', stroke: '#FFFFFF', glow: 'rgba(255,255,255,0.4)' },
  }[tone];

  const inner = (
    <motion.div
      whileHover={{ y: -3, boxShadow: `0 30px 60px -30px ${palette.glow}` }}
      transition={{ duration: 0.3 }}
      className={cn('relative overflow-hidden rounded-2xl p-6 shadow-doe-lg cursor-pointer h-full', palette.bg, palette.text)}
    >
      {/* Decorative orb */}
      <div className="absolute -top-16 -right-16 w-48 h-48 rounded-full bg-white/10 blur-2xl" />
      <div className="absolute -bottom-20 -left-10 w-40 h-40 rounded-full bg-white/5 blur-3xl" />

      <div className="relative">
        <div className={cn('text-[11px] font-sans uppercase tracking-[0.2em] mb-3', palette.sub)}>{label}</div>
        <div className="flex items-baseline gap-2 mb-2">
          <span className="font-display font-bold text-[52px] leading-none">
            <AnimatedNumber value={value} format={format} duration={1.2} suffix={suffix} />
          </span>
        </div>
        {caption && <div className={cn('text-[12px] leading-relaxed mt-1', palette.sub)}>{caption}</div>}

        {delta && (
          <div className="flex items-center gap-1.5 mt-3">
            <span className={cn(
              'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold',
              delta.value >= 0 ? 'bg-success-500/20 text-emerald-200' : 'bg-doe-red/30 text-rose-200',
            )}>
              {delta.value >= 0 ? '▲' : '▼'} {Math.abs(delta.value).toFixed(1)}%
            </span>
            {delta.label && <span className={cn('text-[11px]', palette.sub)}>{delta.label}</span>}
          </div>
        )}

        {sparkline && sparkline.length > 0 && (
          <div className="h-12 mt-5 -mx-2 opacity-90">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={sparkline}>
                <defs>
                  <linearGradient id={`hero-spark-${label.replace(/\W/g, '')}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={palette.stroke} stopOpacity={0.5} />
                    <stop offset="100%" stopColor={palette.stroke} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <Area type="monotone" dataKey="value" stroke={palette.stroke} strokeWidth={2} fill={`url(#hero-spark-${label.replace(/\W/g, '')})`} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}

        {cta && (
          <div className="flex items-center gap-1.5 mt-5 text-[12px] font-semibold opacity-90 group">
            <span>{cta}</span>
            <span className="transition-transform group-hover:translate-x-1">→</span>
          </div>
        )}
      </div>
    </motion.div>
  );
  if (to) return <Link to={to} className="block h-full">{inner}</Link>;
  return inner;
}

// ---------------------------------------------------------------------------
// StatTile — modern light KPI tile with optional sparkline + accent stripe
// ---------------------------------------------------------------------------
// ----------------------------------------------------------------------------
// Module / metric colour identity — each KPI carries its own semantic colour
// (always the SAME colour everywhere it appears across the dashboard). Picked
// from a restrained, professional dashboard palette; never mixed for decoration.
// ----------------------------------------------------------------------------
export type StatTone = 'blue' | 'teal' | 'emerald' | 'violet' | 'orange' | 'indigo' | 'rose' | 'amber' | 'slate';

const TONE_TOKENS: Record<StatTone, { stroke: string; iconBg: string; iconText: string; deltaPos: string; deltaNeg: string; ring: string }> = {
  blue:    { stroke: '#3B82F6', iconBg: 'bg-blue-50',          iconText: 'text-blue-600',    deltaPos: 'text-emerald-600', deltaNeg: 'text-doe-red', ring: 'group-hover:ring-blue-200' },
  teal:    { stroke: '#0F766E', iconBg: 'bg-teal-50',          iconText: 'text-teal-700',    deltaPos: 'text-emerald-600', deltaNeg: 'text-doe-red', ring: 'group-hover:ring-teal-200' },
  emerald: { stroke: '#10B981', iconBg: 'bg-emerald-50',       iconText: 'text-emerald-600', deltaPos: 'text-emerald-600', deltaNeg: 'text-doe-red', ring: 'group-hover:ring-emerald-200' },
  violet:  { stroke: '#7B3FE4', iconBg: 'bg-violet-50',        iconText: 'text-violet-700',  deltaPos: 'text-emerald-600', deltaNeg: 'text-doe-red', ring: 'group-hover:ring-violet-200' },
  orange:  { stroke: '#E89B4C', iconBg: 'bg-action-orange-soft', iconText: 'text-action-orange-deep', deltaPos: 'text-emerald-600', deltaNeg: 'text-doe-red', ring: 'group-hover:ring-orange-200' },
  indigo:  { stroke: '#6366F1', iconBg: 'bg-indigo-50',        iconText: 'text-indigo-600',  deltaPos: 'text-emerald-600', deltaNeg: 'text-doe-red', ring: 'group-hover:ring-indigo-200' },
  rose:    { stroke: '#E11D48', iconBg: 'bg-rose-50',          iconText: 'text-doe-red',     deltaPos: 'text-emerald-600', deltaNeg: 'text-doe-red', ring: 'group-hover:ring-rose-200' },
  amber:   { stroke: '#F59E0B', iconBg: 'bg-amber-50',         iconText: 'text-amber-700',   deltaPos: 'text-emerald-600', deltaNeg: 'text-doe-red', ring: 'group-hover:ring-amber-200' },
  slate:   { stroke: '#0F0F10', iconBg: 'bg-neutral-100',      iconText: 'text-ink-950',     deltaPos: 'text-emerald-600', deltaNeg: 'text-doe-red', ring: 'group-hover:ring-neutral-200' },
};

export interface StatTileProps {
  label: string;
  value: number | string;
  format?: (v: number) => string;
  suffix?: string;
  unit?: string;
  caption?: string;
  delta?: { value: number; label?: string };
  /** Default visualisation if no `viz` slot is provided */
  sparkline?: { value: number }[];
  /** Custom visualisation slot rendered beneath the headline — pass any of the
      Kpi* helpers (KpiMiniBars, KpiRadial, KpiSegmentBar, KpiDonutMini,
      KpiSeverityDots, KpiSplitStat). Replaces the default sparkline. */
  viz?: ReactNode;
  tone?: StatTone;
  icon?: ReactNode;
  to?: string;
  onClick?: () => void;
}

export function StatTile({ label, value, format, suffix, unit, caption, delta, sparkline, viz, tone = 'slate', icon, to, onClick }: StatTileProps) {
  const t = TONE_TOKENS[tone];
  const numericValue = typeof value === 'number' ? value : null;
  const sparkId = `tile-spark-${tone}-${label.replace(/\W/g, '')}`;

  const card = (
    <div className={cn(
      'group relative h-full bg-white rounded-xl border border-neutral-200 overflow-hidden transition',
      'hover:border-neutral-300 hover:shadow-doe-sm',
      'focus-within:ring-2 ring-offset-0', t.ring,
    )}>
      {/* ROW 1: icon chip on the left, delta pill on the right.
          Label is moved to its OWN row beneath so it gets the full card
          width — critical when a 7-column row makes each tile narrow. */}
      <div className="px-3.5 pt-3.5 pb-1 flex items-center justify-between gap-2">
        {icon ? (
          <div className={cn('w-7 h-7 rounded-lg grid place-items-center flex-shrink-0', t.iconBg, t.iconText)}>
            {icon}
          </div>
        ) : <span />}
        {delta && (
          <div className={cn(
            'inline-flex items-center gap-0.5 px-1.5 h-5 rounded-md font-semibold text-[10px] tabular-nums flex-shrink-0',
            delta.value >= 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-doe-red',
          )}>
            {delta.value >= 0 ? '↑' : '↓'} {Math.abs(delta.value).toFixed(1)}%
          </div>
        )}
      </div>

      {/* ROW 2: label gets the full width, allowed to wrap to 2 lines. */}
      <div className="px-3.5 text-[10px] font-sans uppercase tracking-[0.14em] text-neutral-500 leading-tight line-clamp-2 min-h-[20px]" title={label}>
        {label}
      </div>

      {/* ROW 3: hero number */}
      <div className="px-3.5 pt-1 pb-1 flex items-baseline gap-1.5">
        {numericValue !== null ? (
          <span className="font-display font-bold text-[22px] text-ink-950 leading-none tabular-nums">
            <AnimatedNumber value={numericValue} format={format} duration={0.9} suffix={suffix} />
          </span>
        ) : (
          <span className="font-display font-bold text-[22px] text-ink-950 leading-none">{value}</span>
        )}
        {unit && <span className="text-[10.5px] text-neutral-500">{unit}</span>}
      </div>

      {/* CAPTION (optional) */}
      {(caption || delta?.label) && (
        <div className="px-3.5 pb-1 text-[10.5px] text-neutral-500 leading-tight truncate">
          {caption ?? delta?.label}
        </div>
      )}

      {/* BOTTOM: custom viz OR default sparkline */}
      {viz ? (
        <div className="px-3.5 pt-2 pb-3">{viz}</div>
      ) : sparkline && sparkline.length > 0 ? (
        <div className="h-10 -mb-px mt-1">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={sparkline} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id={sparkId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={t.stroke} stopOpacity={0.32} />
                  <stop offset="100%" stopColor={t.stroke} stopOpacity={0} />
                </linearGradient>
              </defs>
              <Area type="monotone" dataKey="value" stroke={t.stroke} strokeWidth={1.75} fill={`url(#${sparkId})`} dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      ) : <div className="h-2" /> }
    </div>
  );

  if (to) return <Link to={to} className="block h-full">{card}</Link>;
  if (onClick) return <button type="button" onClick={onClick} className="text-left w-full h-full">{card}</button>;
  return card;
}

// ============================================================================
// Tile-footer visualisations — each picks its own data shape, all tone-aware.
// ============================================================================

const TONE_STROKE: Record<StatTone, string> = {
  blue: '#3B82F6', teal: '#0F766E', emerald: '#10B981', violet: '#7B3FE4',
  orange: '#E89B4C', indigo: '#6366F1', rose: '#E11D48', amber: '#F59E0B', slate: '#0F0F10',
};

// ---------------------------------------------------------------------------
// KpiMiniBars — small column chart, last N bars; current bar highlighted
// ---------------------------------------------------------------------------
export function KpiMiniBars({ data, tone = 'slate', height = 36 }: { data: { value: number; label?: string }[]; tone?: StatTone; height?: number }) {
  const stroke = TONE_STROKE[tone];
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <div className="flex items-end gap-0.5 w-full" style={{ height }}>
      {data.map((d, i) => {
        const h = Math.max(2, (d.value / max) * 100);
        const isLast = i === data.length - 1;
        return (
          <motion.div
            key={i}
            initial={{ scaleY: 0 }}
            whileInView={{ scaleY: 1 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.025, duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
            style={{ height: `${h}%`, originY: 1, background: stroke, opacity: isLast ? 1 : 0.32 }}
            className="flex-1 rounded-sm"
            title={`${d.label ?? ''} ${d.value}`}
          />
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// KpiRadial — small ring on the right with percentage in centre
// ---------------------------------------------------------------------------
export function KpiRadial({ value, total, tone = 'slate', subLabel, size = 56 }: { value: number; total: number; tone?: StatTone; subLabel?: ReactNode; size?: number }) {
  const stroke = TONE_STROKE[tone];
  const ratio = total === 0 ? 0 : Math.min(1, value / total);
  const pct = Math.round(ratio * 100);
  const strokeW = 5;
  const r = (size - strokeW) / 2;
  const circ = 2 * Math.PI * r;
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const inView = useInView(wrapRef, { once: true });
  return (
    <div ref={wrapRef} className="flex items-center gap-3 w-full">
      <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle cx={size / 2} cy={size / 2} r={r} stroke="#F2F2F0" strokeWidth={strokeW} fill="none" />
          <motion.circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            stroke={stroke}
            strokeWidth={strokeW}
            strokeLinecap="round"
            fill="none"
            strokeDasharray={circ}
            initial={{ strokeDashoffset: circ }}
            animate={inView ? { strokeDashoffset: circ * (1 - ratio) } : { strokeDashoffset: circ }}
            transition={{ duration: 1.1, ease: [0.16, 1, 0.3, 1] }}
          />
        </svg>
        <div className="absolute inset-0 grid place-items-center">
          <span className="text-[11.5px] font-semibold text-ink-950 tabular-nums">{pct}%</span>
        </div>
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[10.5px] text-neutral-500 leading-tight">
          <span className="font-mono font-semibold text-ink-950">{value}</span>
          <span className="text-neutral-400 mx-1">of</span>
          <span className="font-mono text-neutral-700">{total}</span>
        </div>
        {subLabel && <div className="text-[10px] text-neutral-500 mt-0.5 leading-tight truncate">{subLabel}</div>}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// KpiSegmentBar — single thick horizontal bar split into proportions, w/ legend
// ---------------------------------------------------------------------------
export function KpiSegmentBar({ segments }: { segments: { label: string; value: number; tone: StatTone }[] }) {
  const rawTotal = segments.reduce((s, x) => s + x.value, 0);
  const total = Math.max(1, rawTotal);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const inView = useInView(wrapRef, { once: true });
  return (
    <div ref={wrapRef} className="w-full">
      {rawTotal === 0 ? (
        // Empty-state strip — clearly indicates "no data" without breaking the layout.
        <div className="h-2 w-full rounded-full bg-neutral-100" />
      ) : (
        <div className="flex h-2 w-full overflow-hidden rounded-full bg-neutral-100">
          {segments.map((s, i) => (
            <motion.div
              key={i}
              initial={{ width: 0 }}
              animate={inView ? { width: `${(s.value / total) * 100}%` } : { width: 0 }}
              transition={{ delay: i * 0.08, duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
              style={{ background: TONE_STROKE[s.tone] }}
              title={`${s.label}: ${s.value}`}
            />
          ))}
        </div>
      )}
      <div className="mt-2 grid grid-cols-3 gap-1.5 text-[10px]">
        {segments.slice(0, 3).map((s) => (
          <div key={s.label} className="min-w-0">
            <div className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: TONE_STROKE[s.tone] }} />
              <span className="text-neutral-500 uppercase tracking-wider text-[9px] truncate">{s.label}</span>
            </div>
            <div className="font-mono font-semibold text-ink-950 tabular-nums mt-0.5">{s.value}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// KpiDonutMini — small donut with legend strip on the right
// ---------------------------------------------------------------------------
export function KpiDonutMini({ segments, size = 52 }: { segments: { label: string; value: number; tone: StatTone }[]; size?: number }) {
  const rawTotal = segments.reduce((s, x) => s + x.value, 0);
  const total = Math.max(1, rawTotal);
  const strokeW = 6;
  const r = (size - strokeW) / 2;
  const circ = 2 * Math.PI * r;
  let offset = 0;
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const inView = useInView(wrapRef, { once: true });
  return (
    <div ref={wrapRef} className="flex items-center gap-3 w-full">
      <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle cx={size / 2} cy={size / 2} r={r} stroke="#F2F2F0" strokeWidth={strokeW} fill="none" />
          {rawTotal > 0 && segments.map((s, i) => {
            const dash = (s.value / total) * circ;
            const seg = (
              <motion.circle
                key={i}
                cx={size / 2}
                cy={size / 2}
                r={r}
                stroke={TONE_STROKE[s.tone]}
                strokeWidth={strokeW}
                fill="none"
                strokeDasharray={`${dash} ${circ - dash}`}
                strokeDashoffset={-offset}
                initial={{ strokeOpacity: 0 }}
                animate={inView ? { strokeOpacity: 1 } : { strokeOpacity: 0 }}
                transition={{ delay: i * 0.12, duration: 0.45 }}
              />
            );
            offset += dash;
            return seg;
          })}
        </svg>
      </div>
      <div className="flex-1 min-w-0 space-y-0.5">
        {segments.slice(0, 3).map((s) => (
          <div key={s.label} className="flex items-baseline gap-1.5 text-[10px]">
            <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: TONE_STROKE[s.tone] }} />
            <span className="text-neutral-500 truncate flex-1">{s.label}</span>
            <span className="font-mono font-semibold text-ink-950 tabular-nums">{s.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// KpiSeverityDots — coloured dot row representing buckets (e.g. severity tiers)
// ---------------------------------------------------------------------------
export function KpiSeverityDots({ buckets }: { buckets: { label: string; value: number; tone: StatTone }[] }) {
  return (
    <div className="grid grid-cols-3 gap-2">
      {buckets.map((b, i) => (
        <motion.div
          key={b.label}
          initial={{ opacity: 0, y: 4 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: i * 0.06, duration: 0.35 }}
          className="flex flex-col items-start gap-1 px-2 py-1.5 rounded-md border border-neutral-100 bg-neutral-25"
        >
          <span className="flex items-center gap-1.5 text-[9.5px] font-sans uppercase tracking-wider text-neutral-500">
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: TONE_STROKE[b.tone] }} />
            {b.label}
          </span>
          <span className="text-[15px] font-semibold text-ink-950 tabular-nums leading-none">
            <AnimatedNumber value={b.value} duration={0.7} />
          </span>
        </motion.div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// KpiSplitStat — two paired stats with proportional progress bars
// ---------------------------------------------------------------------------
export function KpiSplitStat({ stats }: { stats: { label: string; value: number; tone: StatTone }[] }) {
  const rawTotal = stats.reduce((s, x) => s + x.value, 0);
  const total = Math.max(1, rawTotal);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const inView = useInView(wrapRef, { once: true });
  return (
    <div ref={wrapRef} className="space-y-1.5">
      {stats.map((s, i) => (
        <div key={s.label} className="flex items-center gap-2">
          <div className="text-[10px] font-sans uppercase tracking-wider text-neutral-500 w-10 flex-shrink-0">{s.label}</div>
          <div className="flex-1 h-1.5 bg-neutral-100 rounded-full overflow-hidden">
            {rawTotal > 0 && (
              <motion.div
                initial={{ width: 0 }}
                animate={inView ? { width: `${(s.value / total) * 100}%` } : { width: 0 }}
                transition={{ delay: i * 0.08, duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
                className="h-full rounded-full"
                style={{ background: TONE_STROKE[s.tone] }}
              />
            )}
          </div>
          <div className="text-[11px] font-mono font-semibold text-ink-950 tabular-nums w-8 text-right">{s.value}</div>
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// RadialGauge — animated circular percentage gauge
// ---------------------------------------------------------------------------
export function RadialGauge({ value, size = 180, stroke = 16, label, sublabel, accent = '#E89B4C', track = '#E7E5E4' }: {
  value: number;            // 0..100
  size?: number;
  stroke?: number;
  label?: ReactNode;
  sublabel?: ReactNode;
  accent?: string;
  track?: string;
}) {
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const ref = useRef<SVGCircleElement | null>(null);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const inView = useInView(wrapRef, { once: true });
  const target = Math.max(0, Math.min(100, value));
  const offset = circumference * (1 - target / 100);

  return (
    <div ref={wrapRef} className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <defs>
          <linearGradient id="radial-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={accent} />
            <stop offset="100%" stopColor="#C26C2A" />
          </linearGradient>
        </defs>
        <circle cx={size / 2} cy={size / 2} r={radius} stroke={track} strokeWidth={stroke} fill="none" />
        <motion.circle
          ref={ref}
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="url(#radial-grad)"
          strokeWidth={stroke}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={inView ? { strokeDashoffset: offset } : { strokeDashoffset: circumference }}
          transition={{ duration: 1.4, ease: [0.16, 1, 0.3, 1] }}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">
        <div>
          <div className="font-display font-bold text-[44px] text-ink-950 leading-none tabular-nums">
            <AnimatedNumber value={target} duration={1.3} suffix="%" />
          </div>
          {label && <div className="text-[11px] font-sans uppercase tracking-[0.16em] text-neutral-500 mt-2">{label}</div>}
          {sublabel && <div className="text-[11px] text-neutral-500 mt-0.5">{sublabel}</div>}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Pulse — small status dot with breathing animation
// ---------------------------------------------------------------------------
export function Pulse({ color = '#10B981', size = 8 }: { color?: string; size?: number }) {
  return (
    <span className="relative inline-flex" style={{ width: size, height: size }}>
      <span className="absolute inset-0 rounded-full animate-ping" style={{ background: color, opacity: 0.6 }} />
      <span className="relative rounded-full" style={{ width: size, height: size, background: color }} />
    </span>
  );
}

// Re-export framer-motion bits used by pages
export { motion, AnimatePresence };
