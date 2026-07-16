import { useMemo, useState } from 'react';
import { cn } from '../../lib/utils';
import type { PlayerCompany } from '../../data/pps-modules';

// ============================================================================
// PlayersModule — enterprise master-data grid of market participants for a
// product (reusable: pass any product's PlayerCompany[]). Multiple contacts for
// the same company share a single merged company cell. Search · sort · sticky
// header · pagination · CSV export · clickable email/phone.
// ============================================================================

interface FlatRow { company: string; role: string; volumeKt?: number; name: string; email: string; phone: string; }

const PAGE_SIZE = 10;
function fmtVolume(v?: number) { return v == null ? '' : v.toLocaleString('en-US', { maximumFractionDigits: 1 }); }

export function PlayersModule({ productLabel, players, preserveOrder, cleanLayout, bare }: { productLabel: string; players: PlayerCompany[]; preserveOrder?: boolean; cleanLayout?: boolean; bare?: boolean }) {
  const [q, setQ] = useState('');
  // null = source (Excel) order; true/false = sorted asc/desc. preserveOrder
  // starts unsorted so the table matches the sheet's row order.
  const [sortAsc, setSortAsc] = useState<boolean | null>(preserveOrder ? null : true);
  const [page, setPage] = useState(0);

  // Flatten to one row per contact; companies with no listed contact still get a
  // single row (empty Point of Contact / Email).
  const flat: FlatRow[] = useMemo(() => players.flatMap((c) => {
    const base = { company: c.company, role: c.role, volumeKt: c.volumeKt };
    return c.contacts.length
      ? c.contacts.map((ct) => ({ ...base, name: ct.name, email: ct.email, phone: ct.phone ?? '' }))
      : [{ ...base, name: '', email: '', phone: '' }];
  }), [players]);

  // Columns adapt to the data: Volume (after Role) when any company has it; Phone
  // when any contact has it. Gasoline (phone, no volume) renders unchanged.
  const hasVolume = useMemo(() => players.some((c) => c.volumeKt != null), [players]);
  const hasPhone = useMemo(() => flat.some((r) => r.phone), [flat]);
  const colCount = 4 + (hasVolume ? 1 : 0) + (hasPhone ? 1 : 0);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const rows = needle ? flat.filter((r) => [r.company, r.role, r.name, r.email, r.phone].some((v) => v.toLowerCase().includes(needle))) : flat;
    if (sortAsc === null) return rows;
    return [...rows].sort((a, b) => sortAsc ? a.company.localeCompare(b.company) : b.company.localeCompare(a.company));
  }, [flat, q, sortAsc]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount - 1);
  const pageRows = filtered.slice(safePage * PAGE_SIZE, safePage * PAGE_SIZE + PAGE_SIZE);

  // Group the visible page rows by company so the company cell merges (rowSpan).
  const groups: { company: string; role: string; volumeKt?: number; rows: FlatRow[] }[] = [];
  for (const r of pageRows) {
    const last = groups[groups.length - 1];
    if (last && last.company === r.company) last.rows.push(r);
    else groups.push({ company: r.company, role: r.role, volumeKt: r.volumeKt, rows: [r] });
  }

  function exportCsv() {
    const header = ['Company', 'Role', ...(hasVolume ? ['Volume in 2024 (kt)'] : []), 'Point of Contact Name', 'Email', ...(hasPhone ? ['Phone Number'] : [])];
    const lines = [header, ...filtered.map((r) => [r.company, r.role, ...(hasVolume ? [fmtVolume(r.volumeKt)] : []), r.name, r.email, ...(hasPhone ? [r.phone] : [])])];
    const csv = lines.map((row) => row.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
    const a = document.createElement('a'); a.href = url; a.download = `${productLabel.replace(/\W+/g, '-')}-players.csv`; a.click();
    URL.revokeObjectURL(url);
  }

  // Bare mode (Omar's All Submissions tabs): only the table + pagination footer,
  // no card wrapper / header / search / export — the parent card already has those.
  const inner = (
    <>
      {/* table */}
      <div className="max-h-[520px] overflow-auto">
        <table className="w-full text-[12.5px] min-w-[760px]">
          <thead className="sticky top-0 z-10 bg-neutral-50 text-[10px] font-sans uppercase tracking-[0.14em] text-neutral-500">
            <tr>
              <th className="text-left px-4 py-2.5">
                <button onClick={() => setSortAsc((v) => (v === null ? true : !v))} className="inline-flex items-center gap-1 hover:text-ink-950">Company <SortIcon asc={sortAsc} /></button>
              </th>
              <th className="text-left px-4 py-2.5">Role</th>
              {hasVolume && <th className="text-left px-4 py-2.5 whitespace-nowrap">Volume in 2024 (kt)</th>}
              <th className="text-left px-4 py-2.5">Point of Contact</th>
              <th className="text-left px-4 py-2.5">Email</th>
              {hasPhone && <th className="text-left px-4 py-2.5">Phone</th>}
            </tr>
          </thead>
          <tbody>
            {groups.map((g, gi) => g.rows.map((r, ri) => (
              <tr key={`${gi}-${ri}`} className={cn('border-t border-neutral-100', ri === 0 && gi > 0 && 'border-t-2', gi % 2 === 1 && 'bg-neutral-25/50')}>
                {ri === 0 && (
                  <td rowSpan={g.rows.length} className={cn('px-4 py-3 bg-white', cleanLayout ? 'align-middle' : 'align-top border-r border-neutral-100')}>
                    {cleanLayout ? (
                      <span className="font-semibold text-ink-950 leading-tight">{g.company}</span>
                    ) : (
                      <div className="flex items-start gap-2.5">
                        <span className="w-8 h-8 rounded-md bg-action-orange-soft text-action-orange-deep grid place-items-center font-mono font-bold text-[10px] flex-shrink-0">{g.company.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase()}</span>
                        <span className="font-semibold text-ink-950 leading-tight">{g.company}</span>
                      </div>
                    )}
                  </td>
                )}
                {ri === 0 && <td rowSpan={g.rows.length} className={cn('px-4 py-3 text-neutral-700', cleanLayout ? 'align-middle' : 'align-top border-r border-neutral-100')}>{g.role}</td>}
                {hasVolume && ri === 0 && <td rowSpan={g.rows.length} className={cn('px-4 py-3 text-left font-mono tabular-nums text-[12px] text-ink-950', cleanLayout ? 'align-middle' : 'align-top border-r border-neutral-100')}>{fmtVolume(g.volumeKt)}</td>}
                <td className="px-4 py-2.5 text-ink-950 font-medium whitespace-nowrap">{r.name || <span className="text-neutral-300">—</span>}</td>
                <td className="px-4 py-2.5">{r.email ? <a href={`mailto:${r.email}`} className="text-info-500 hover:underline">{r.email}</a> : <span className="text-neutral-300">—</span>}</td>
                {hasPhone && <td className="px-4 py-2.5 whitespace-nowrap">{!r.phone ? <span className="text-neutral-300">—</span> : /\d/.test(r.phone) ? <a href={`tel:${r.phone}`} className="text-info-500 hover:underline font-mono text-[11.5px]">{r.phone}</a> : <span className="text-neutral-400 text-[11.5px]">{r.phone}</span>}</td>}
              </tr>
            )))}
            {filtered.length === 0 && (
              <tr><td colSpan={colCount} className="px-4 py-10 text-center text-[12.5px] text-neutral-500">No players match your search.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* pagination footer */}
      <div className="px-4 py-2.5 border-t border-neutral-100 flex items-center justify-between text-[11.5px] text-neutral-500">
        <span>{filtered.length} contact{filtered.length === 1 ? '' : 's'} · {players.length} compan{players.length === 1 ? 'y' : 'ies'}</span>
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
      {/* header: title + search + export */}
      <div className="px-5 py-3.5 border-b border-neutral-100 flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h2 className="font-display text-[16px] font-bold text-ink-950">Players · {productLabel}</h2>
          <p className="text-[11.5px] text-neutral-500 mt-0.5">Market participants, licensed operators and their points of contact.</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-neutral-400"><SearchIcon /></span>
            <input value={q} onChange={(e) => { setQ(e.target.value); setPage(0); }} placeholder="Search players…" className="w-[220px] h-9 pl-8 pr-3 rounded-md border border-neutral-200 text-[12.5px] focus:outline-none focus:border-action-orange focus:ring-2 focus:ring-action-orange/15" />
          </div>
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
