import { useMemo, useState } from 'react';
import { cn } from '../../lib/utils';
import type { TpiSite, TpiColumn } from '../../data/pps-modules';

// ============================================================================
// TpisModule — third-party-inspector / infrastructure inventory table for a
// product. Column set is per-product (TpiColumn[]); the status column renders a
// chip, the "client" column is sortable. Search · status filter · sticky header
// · pagination · CSV export · horizontal scroll. Placeholder when no data yet.
// ============================================================================

const PAGE_SIZE = 10;

function statusChip(status: string) {
  const s = status.toLowerCase();
  if (s.includes('operational')) return 'bg-success-soft text-success-500';
  if (s.includes('under development')) return 'bg-info-soft text-info-500';
  if (s.includes('retired')) return 'bg-neutral-100 text-neutral-500';
  return 'bg-warning-soft text-warning-500';
}

export function TpisModule({ productLabel, sites, columns, preserveOrder, bare }: { productLabel: string; sites: TpiSite[]; columns: TpiColumn[]; preserveOrder?: boolean; bare?: boolean }) {
  const [q, setQ] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  // null = source (Excel) order; preserveOrder starts unsorted to match the sheet.
  const [sortAsc, setSortAsc] = useState<boolean | null>(preserveOrder ? null : true);
  const [page, setPage] = useState(0);

  const hasStatus = columns.some((c) => c.key === 'status');
  const sortKey: keyof TpiSite = columns.some((c) => c.key === 'client') ? 'client' : (columns[0]?.key ?? 'client');
  const statuses = useMemo(() => Array.from(new Set(sites.map((s) => s.status).filter(Boolean) as string[])), [sites]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    let rows = sites;
    if (needle) rows = rows.filter((s) => columns.some((c) => String(s[c.key] ?? '').toLowerCase().includes(needle)));
    if (statusFilter !== 'all') rows = rows.filter((s) => s.status === statusFilter);
    if (sortAsc === null) return rows;
    return [...rows].sort((a, b) => { const cmp = String(a[sortKey] ?? '').localeCompare(String(b[sortKey] ?? '')); return sortAsc ? cmp : -cmp; });
  }, [sites, q, statusFilter, sortAsc, columns, sortKey]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount - 1);
  const pageRows = filtered.slice(safePage * PAGE_SIZE, safePage * PAGE_SIZE + PAGE_SIZE);

  function exportCsv() {
    const header = columns.map((c) => c.label);
    const lines = [header, ...filtered.map((s) => columns.map((c) => String(s[c.key] ?? '')))];
    const csv = lines.map((row) => row.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
    const a = document.createElement('a'); a.href = url; a.download = `${productLabel.replace(/\W+/g, '-')}-tpis.csv`; a.click();
    URL.revokeObjectURL(url);
  }

  // Empty state — same structural card used before the data was supplied.
  if (sites.length === 0) {
    if (bare) return <div className="px-5 py-10 text-center text-[12.5px] text-neutral-500">No records.</div>;
    return (
      <div className="card overflow-hidden mb-6">
        <div className="px-5 py-3.5 border-b border-neutral-100">
          <h2 className="font-display text-[16px] font-bold text-ink-950">TPIs · {productLabel}</h2>
          <p className="text-[11.5px] text-neutral-500 mt-0.5">Third-party inspectors authorised to verify and audit {productLabel} submissions.</p>
        </div>
        <div className="p-10 text-center">
          <span className="inline-grid place-items-center w-12 h-12 rounded-xl bg-action-orange-soft text-action-orange-deep mx-auto mb-3"><ShieldIcon /></span>
          <div className="text-[13px] font-semibold text-ink-950">TPI workspace</div>
          <p className="text-[11.5px] text-neutral-500 mt-1 max-w-[460px] mx-auto leading-relaxed">
            Manage the third-party inspectors registered for {productLabel}. This workspace uses the same enterprise structure as the Players tab.
          </p>
        </div>
      </div>
    );
  }

  const minWidth = Math.max(920, columns.length * 160);

  // Bare mode (Omar's All Submissions tabs): only the table + pagination footer,
  // no card wrapper / header / search / status / export — parent card has those.
  const inner = (
    <>
      {/* table */}
      <div className="max-h-[520px] overflow-auto">
        <table className="w-full text-[12.5px]" style={{ minWidth }}>
          <thead className="sticky top-0 z-10 bg-neutral-50 text-[10px] font-sans uppercase tracking-[0.14em] text-neutral-500">
            <tr>
              {columns.map((c) => (
                <th key={String(c.key)} className="text-left px-4 py-2.5 whitespace-nowrap align-bottom">
                  {c.key === sortKey
                    ? <button onClick={() => setSortAsc((v) => (v === null ? true : !v))} className="inline-flex items-center gap-1 hover:text-ink-950">{c.label} <SortIcon asc={sortAsc} /></button>
                    : c.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pageRows.map((s, i) => (
              <tr key={i} className={cn('border-t border-neutral-100 align-top', i % 2 === 1 && 'bg-neutral-25/50')}>
                {columns.map((c) => {
                  const v = String(s[c.key] ?? '');
                  if (c.key === 'status') return <td key={String(c.key)} className="px-4 py-2.5 whitespace-nowrap">{v ? <span className={cn('chip-sm', statusChip(v))}>● {v}</span> : <span className="text-neutral-300">—</span>}</td>;
                  const strong = c.key === 'tpiName' || c.key === 'client' || c.key === 'projectName';
                  return <td key={String(c.key)} className={cn('px-4 py-2.5', strong ? 'font-medium text-ink-950' : 'text-neutral-700')}>{v || <span className="text-neutral-300">—</span>}</td>;
                })}
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={columns.length} className="px-4 py-10 text-center text-[12.5px] text-neutral-500">No records match your filters.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* pagination footer */}
      <div className="px-4 py-2.5 border-t border-neutral-100 flex items-center justify-between text-[11.5px] text-neutral-500">
        <span>{filtered.length} of {sites.length} site{sites.length === 1 ? '' : 's'}</span>
        <div className="flex items-center gap-1.5">
          <button disabled={safePage === 0} onClick={() => setPage((p) => Math.max(0, p - 1))} className="h-7 px-2.5 rounded-md border border-neutral-200 disabled:opacity-40 hover:bg-neutral-50">Prev</button>
          <span>Page {safePage + 1} of {pageCount}</span>
          <button disabled={safePage >= pageCount - 1} onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))} className="h-7 px-2.5 rounded-md border border-neutral-200 disabled:opacity-40 hover:bg-neutral-50">Next</button>
        </div>
      </div>
    </>
  );

  if (bare) return inner;

  return (
    <div className="card overflow-hidden mb-6">
      {/* header: title + search + status filter + export */}
      <div className="px-5 py-3.5 border-b border-neutral-100 flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h2 className="font-display text-[16px] font-bold text-ink-950">TPIs · {productLabel}</h2>
          <p className="text-[11.5px] text-neutral-500 mt-0.5">Third-party inspection and infrastructure records registered for {productLabel}.</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative">
            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-neutral-400"><SearchIcon /></span>
            <input value={q} onChange={(e) => { setQ(e.target.value); setPage(0); }} placeholder="Search TPIs…" className="w-[200px] h-9 pl-8 pr-3 rounded-md border border-neutral-200 text-[12.5px] focus:outline-none focus:border-action-orange focus:ring-2 focus:ring-action-orange/15" />
          </div>
          {hasStatus && (
            <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(0); }} className="h-9 px-2.5 rounded-md border border-neutral-200 bg-white text-[12px]">
              <option value="all">All Status</option>
              {statuses.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          )}
          <button onClick={exportCsv} className="btn-secondary h-9 text-[12.5px]"><DownloadIcon /> Export CSV</button>
        </div>
      </div>
      {inner}
    </div>
  );
}

function SearchIcon() { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>; }
function DownloadIcon() { return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>; }
function SortIcon({ asc }: { asc: boolean | null }) { return <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className={cn('transition-transform', asc === false && 'rotate-180', asc === null && 'opacity-30')}><polyline points="18 15 12 9 6 15"/></svg>; }
function ShieldIcon() { return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/></svg>; }
