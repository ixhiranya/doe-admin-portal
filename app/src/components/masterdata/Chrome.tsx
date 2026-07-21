import { Link } from 'react-router-dom';
import { cn } from '../../lib/utils';

// =============================================================================
// PPS · Master Data — shared page chrome, styled to match the existing
// TechnicalSectionLayout / CustomersListPage conventions (breadcrumb strip +
// dark hero card + KPI strip). Reused across all 8 master screens so every
// module looks like it shipped from the same hand.
// =============================================================================

export interface Crumb { label: string; to?: string }

export function Breadcrumb({ items, tag }: { items: Crumb[]; tag?: string }) {
  return (
    <div className="flex items-center justify-between text-[12px] mb-5">
      <nav className="text-neutral-500">
        {items.map((c, i) => (
          <span key={i}>
            {c.to ? <Link to={c.to} className="hover:text-doe-red">{c.label}</Link> : <span className={i === items.length - 1 ? 'text-ink-950 font-semibold' : ''}>{c.label}</span>}
            {i < items.length - 1 && <span className="mx-2 text-neutral-300">›</span>}
          </span>
        ))}
      </nav>
      {tag && <div className="font-sans text-[11px] tracking-wider text-neutral-500 uppercase">{tag}</div>}
    </div>
  );
}

export function HeroHeader({
  badge, badgeBg = '#E89B4C', eyebrow, title, subtitle, actions, kpis,
}: {
  badge: string;
  badgeBg?: string;
  eyebrow: string;
  title: string;
  subtitle: string;
  actions?: React.ReactNode;
  kpis?: { label: string; value: string | number; tone?: 'ink' | 'info' | 'success' | 'warning' | 'danger' }[];
}) {
  return (
    <div className="card overflow-hidden mb-6">
      <div className="relative px-6 py-5 bg-gradient-to-br from-[#1E2128] via-[#262A33] to-[#1E2128] text-white">
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: `radial-gradient(circle at 80% 30%, ${badgeBg} 0%, transparent 50%)` }} />
        <div className="relative flex items-center gap-6 flex-wrap">
          <div className="w-12 h-12 rounded-xl grid place-items-center shadow-doe-md font-mono font-bold text-[13px] flex-shrink-0" style={{ background: badgeBg, color: '#fff' }}>
            {badge}
          </div>
          <div className="flex-1 min-w-[240px]">
            <div className="text-[10px] font-sans uppercase tracking-[0.22em]" style={{ color: badgeBg }}>{eyebrow}</div>
            <h1 className="font-display font-bold text-[22px] leading-tight mt-1">{title}</h1>
            <p className="text-[12.5px] text-white/70 mt-1 max-w-[680px]">{subtitle}</p>
          </div>
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </div>
      </div>
      {kpis && kpis.length > 0 && (
        <div className="grid divide-x divide-neutral-100 border-t border-neutral-100 bg-white" style={{ gridTemplateColumns: `repeat(${kpis.length}, minmax(0, 1fr))` }}>
          {kpis.map((k, i) => {
            const tone =
              k.tone === 'success' ? 'text-emerald-600' :
              k.tone === 'warning' ? 'text-amber-700' :
              k.tone === 'danger' ? 'text-doe-red' :
              k.tone === 'info' ? 'text-info-500' :
              'text-ink-950';
            return (
              <div key={i} className="px-4 py-3">
                <div className="text-[9.5px] font-sans uppercase tracking-[0.18em] text-neutral-500">{k.label}</div>
                <div className={cn('font-display font-bold text-[20px] mt-0.5 tabular-nums', tone)}>{k.value}</div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function EmptyState({ icon = '📄', title, message, actionLabel, onAction }: { icon?: string; title: string; message: string; actionLabel?: string; onAction?: () => void }) {
  return (
    <div className="card p-10 text-center">
      <div className="text-4xl mb-2">{icon}</div>
      <div className="font-display font-bold text-[15px] text-ink-950">{title}</div>
      <div className="text-[12px] text-neutral-500 mt-1">{message}</div>
      {actionLabel && onAction && (
        <button onClick={onAction} className="btn-primary text-[12px] mt-4 mx-auto">{actionLabel}</button>
      )}
    </div>
  );
}

export function LoadingState({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="card p-10 text-center">
      <div className="w-8 h-8 border-2 border-neutral-200 border-t-action-orange rounded-full animate-spin mx-auto mb-3" />
      <div className="text-[12px] text-neutral-500">{label}</div>
    </div>
  );
}

export function DeleteConfirmModal({
  open, title, message, busy, onCancel, onConfirm,
}: {
  open: boolean;
  title: string;
  message: React.ReactNode;
  busy?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 bg-ink-950/40 z-50 grid place-items-center p-6" onClick={onCancel}>
      <div className="bg-white rounded-xl shadow-doe-lg w-[440px] max-w-full p-6" onClick={(e) => e.stopPropagation()}>
        <div className="w-12 h-12 rounded-full grid place-items-center mx-auto mb-3 bg-danger-soft text-danger-500">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /><path d="M10 11v6M14 11v6" /><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" /></svg>
        </div>
        <h3 className="font-display text-[16px] font-bold text-ink-950 mb-1 text-center">{title}</h3>
        <div className="text-[12.5px] text-neutral-600 mb-5 leading-relaxed text-center">{message}</div>
        <div className="flex items-center justify-center gap-2">
          <button onClick={onCancel} className="btn-secondary text-[12.5px]" disabled={busy}>Cancel</button>
          <button onClick={onConfirm} className="btn-danger text-[12.5px]" disabled={busy}>{busy ? 'Deleting…' : 'Delete'}</button>
        </div>
      </div>
    </div>
  );
}

export function SearchInput({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div className="flex-1 min-w-[220px] relative">
      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" /></svg>
      </span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder ?? 'Search…'}
        className="w-full pl-9 pr-3 py-2 text-[12.5px] border border-neutral-200 rounded-md focus:outline-none focus:border-action-orange"
      />
    </div>
  );
}

export function FilterSelect({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: { value: string; label: string }[] }) {
  return (
    <label className="flex items-center gap-2 text-[11px]">
      <span className="font-sans uppercase tracking-wider text-neutral-500">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="px-2 py-1.5 rounded-md border border-neutral-200 text-[12px] focus:outline-none focus:border-action-orange max-w-[200px] truncate"
      >
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </label>
  );
}

export function SortIcon({ dir }: { dir: 'asc' | 'desc' | null }) {
  return (
    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"
      className={cn('inline-block ml-1 transition-transform', dir === 'desc' && 'rotate-180', !dir && 'opacity-30')}>
      <polyline points="18 15 12 9 6 15" />
    </svg>
  );
}

export function Pagination({
  page, pageSize, total, onPageChange, onPageSizeChange,
}: {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (p: number) => void;
  onPageSizeChange: (n: number) => void;
}) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(total, page * pageSize);
  return (
    <div className="px-4 py-2.5 border-t border-neutral-100 bg-white flex items-center justify-between flex-wrap gap-2">
      <div className="text-[11px] text-neutral-500">
        Showing <span className="font-semibold text-ink-950">{from}–{to}</span> of <span className="font-semibold text-ink-950">{total}</span>
      </div>
      <div className="flex items-center gap-3">
        <label className="flex items-center gap-1.5 text-[11px] text-neutral-500">
          Rows
          <select value={pageSize} onChange={(e) => onPageSizeChange(Number(e.target.value))} className="px-1.5 py-1 rounded-md border border-neutral-200 text-[11.5px] focus:outline-none focus:border-action-orange">
            {[10, 25, 50].map((n) => <option key={n} value={n}>{n}</option>)}
          </select>
        </label>
        <div className="flex items-center gap-1">
          <button onClick={() => onPageChange(1)} disabled={page <= 1} className="w-7 h-7 grid place-items-center rounded-md border border-neutral-200 text-[11px] disabled:opacity-40 hover:bg-neutral-50">«</button>
          <button onClick={() => onPageChange(page - 1)} disabled={page <= 1} className="w-7 h-7 grid place-items-center rounded-md border border-neutral-200 text-[11px] disabled:opacity-40 hover:bg-neutral-50">‹</button>
          <span className="text-[11.5px] text-neutral-600 px-2">Page {page} of {totalPages}</span>
          <button onClick={() => onPageChange(page + 1)} disabled={page >= totalPages} className="w-7 h-7 grid place-items-center rounded-md border border-neutral-200 text-[11px] disabled:opacity-40 hover:bg-neutral-50">›</button>
          <button onClick={() => onPageChange(totalPages)} disabled={page >= totalPages} className="w-7 h-7 grid place-items-center rounded-md border border-neutral-200 text-[11px] disabled:opacity-40 hover:bg-neutral-50">»</button>
        </div>
      </div>
    </div>
  );
}
