import { useEffect, useMemo, useRef, useState } from 'react';
import { cn } from '../../lib/utils';
import { InfrastructureMap, type MapMarker } from './InfrastructureMap';
import { operatorColor, type InfraSite } from '../../data/pps-modules';

// ============================================================================
// InfrastructureModule — interactive map (reusing the Diesel dashboard map) +
// a searchable / filterable / paginated infrastructure inventory, kept in sync:
// selecting a row highlights its marker (and pans to it); clicking a marker
// highlights + scrolls to its row. Reusable for any product's InfraSite[].
// ============================================================================

const PAGE_SIZE = 8;

export function InfrastructureModule({ productLabel, sites }: { productLabel: string; sites: InfraSite[] }) {
  const [q, setQ] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortKey, setSortKey] = useState<'name' | 'company' | 'status'>('name');
  const [sortAsc, setSortAsc] = useState(true);
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);   // index into `sites`
  const scrollRef = useRef<HTMLDivElement | null>(null);

  // Markers (in `sites` order, so the index lines up with the table selection).
  const markers: MapMarker[] = useMemo(() => sites.map((s) => ({
    name: s.name, coordinates: [s.lon, s.lat], color: operatorColor(s.company),
    type: s.type, emirate: s.location, operator: s.company, status: s.status,
  })), [sites]);

  const statuses = useMemo(() => Array.from(new Set(sites.map((s) => s.status))), [sites]);

  // Keep each row's original index for selection sync.
  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    let r = sites.map((s, i) => ({ s, i }));
    if (needle) r = r.filter(({ s }) => [s.company, s.name, s.type, s.location, s.status].some((v) => v.toLowerCase().includes(needle)));
    if (statusFilter !== 'all') r = r.filter(({ s }) => s.status === statusFilter);
    r.sort((a, b) => { const cmp = String(a.s[sortKey]).localeCompare(String(b.s[sortKey])); return sortAsc ? cmp : -cmp; });
    return r;
  }, [sites, q, statusFilter, sortKey, sortAsc]);

  const pageCount = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount - 1);
  const pageRows = rows.slice(safePage * PAGE_SIZE, safePage * PAGE_SIZE + PAGE_SIZE);

  // When a marker is clicked → bring its row onto the current page + scroll to it.
  useEffect(() => {
    if (selected == null) return;
    const pos = rows.findIndex((r) => r.i === selected);
    if (pos === -1) return;
    const targetPage = Math.floor(pos / PAGE_SIZE);
    setPage(targetPage);
    setTimeout(() => document.getElementById(`infra-row-${selected}`)?.scrollIntoView({ block: 'nearest', behavior: 'smooth' }), 60);
  }, [selected, rows]);

  function setSort(k: 'name' | 'company' | 'status') { if (sortKey === k) setSortAsc((v) => !v); else { setSortKey(k); setSortAsc(true); } }

  function exportCsv() {
    const header = ['Company', 'Infrastructure Name', 'Infrastructure Type', 'Location', 'Status', 'Longitude', 'Latitude'];
    const lines = [header, ...rows.map(({ s }) => [s.company, s.name, s.type, s.location, s.status, String(s.lon), String(s.lat)])];
    const csv = lines.map((row) => row.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
    const a = document.createElement('a'); a.href = url; a.download = `${productLabel.replace(/\W+/g, '-')}-infrastructure.csv`; a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-3 mb-6">
      {/* ===== MAP ===== */}
      <section className="card p-3">
        <div className="flex items-center justify-between px-1 mb-2.5 flex-wrap gap-2">
          <div>
            <h2 className="font-display text-[15px] font-bold text-ink-950">{productLabel} Infrastructure Map</h2>
            <p className="text-[11px] text-neutral-500">Select a site below or click a marker — the map and table stay in sync.</p>
          </div>
          <div className="flex items-center gap-2.5 text-[11px] text-neutral-600 flex-wrap">
            <Legend color="#3D7A8C" label="ADNOC Distribution" />
            <Legend color="#E89B4C" label="ENOC / Emarat" />
            <Legend color="#10b981" label="Independent / TPI" />
            <span className="inline-flex items-center h-5 px-2 rounded-full bg-[#3D7A8C]/12 text-[#2C5C6B] text-[10.5px] font-semibold tabular-nums">{sites.length} Sites</span>
          </div>
        </div>
        <InfrastructureMap productLabel={productLabel} height={380} markers={markers} selectedIndex={selected} onMarkerSelect={setSelected} />
      </section>

      {/* ===== TABLE ===== */}
      <section className="card overflow-hidden">
        <div className="px-5 py-3.5 border-b border-neutral-100 flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h2 className="font-display text-[16px] font-bold text-ink-950">Infrastructure Inventory</h2>
            <p className="text-[11.5px] text-neutral-500 mt-0.5">Storage, terminals and the distribution network for {productLabel}.</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative">
              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-neutral-400"><SearchIcon /></span>
              <input value={q} onChange={(e) => { setQ(e.target.value); setPage(0); }} placeholder="Search sites…" className="w-[200px] h-9 pl-8 pr-3 rounded-md border border-neutral-200 text-[12.5px] focus:outline-none focus:border-action-orange focus:ring-2 focus:ring-action-orange/15" />
            </div>
            <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(0); }} className="h-9 px-2.5 rounded-md border border-neutral-200 bg-white text-[12px]">
              <option value="all">All Status</option>
              {statuses.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
            <button onClick={exportCsv} className="btn-secondary h-9 text-[12.5px]"><DownloadIcon /> Export CSV</button>
          </div>
        </div>

        <div ref={scrollRef} className="max-h-[440px] overflow-auto">
          <table className="w-full text-[12.5px] min-w-[920px]">
            <thead className="sticky top-0 z-10 bg-neutral-50 text-[10px] font-sans uppercase tracking-[0.14em] text-neutral-500">
              <tr>
                <th className="text-left px-4 py-2.5"><SortBtn label="Company" active={sortKey === 'company'} asc={sortAsc} onClick={() => setSort('company')} /></th>
                <th className="text-left px-4 py-2.5"><SortBtn label="Infrastructure Name" active={sortKey === 'name'} asc={sortAsc} onClick={() => setSort('name')} /></th>
                <th className="text-left px-4 py-2.5">Type</th>
                <th className="text-left px-4 py-2.5">Location</th>
                <th className="text-left px-4 py-2.5"><SortBtn label="Status" active={sortKey === 'status'} asc={sortAsc} onClick={() => setSort('status')} /></th>
                <th className="text-right px-4 py-2.5">Longitude</th>
                <th className="text-right px-4 py-2.5">Latitude</th>
              </tr>
            </thead>
            <tbody>
              {pageRows.map(({ s, i }, ri) => (
                <tr
                  key={i}
                  id={`infra-row-${i}`}
                  onClick={() => setSelected(i)}
                  className={cn('border-t border-neutral-100 cursor-pointer transition-colors',
                    selected === i ? 'bg-action-orange-soft/50' : ri % 2 === 1 ? 'bg-neutral-25/50 hover:bg-neutral-50' : 'hover:bg-neutral-50')}
                >
                  <td className="px-4 py-2.5 whitespace-nowrap">
                    <span className="inline-flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full" style={{ background: operatorColor(s.company) }} />
                      <span className="font-medium text-ink-950">{s.company}</span>
                    </span>
                  </td>
                  <td className="px-4 py-2.5 font-medium text-ink-950 whitespace-nowrap">{s.name}</td>
                  <td className="px-4 py-2.5 text-neutral-700 whitespace-nowrap">{s.type}</td>
                  <td className="px-4 py-2.5 text-neutral-700 whitespace-nowrap">{s.location}</td>
                  <td className="px-4 py-2.5"><span className="chip-sm bg-success-soft text-success-500">● {s.status}</span></td>
                  <td className="px-4 py-2.5 text-right font-mono text-[11.5px] text-neutral-700">{s.lon.toFixed(4)}</td>
                  <td className="px-4 py-2.5 text-right font-mono text-[11.5px] text-neutral-700">{s.lat.toFixed(4)}</td>
                </tr>
              ))}
              {rows.length === 0 && <tr><td colSpan={7} className="px-4 py-10 text-center text-[12.5px] text-neutral-500">No sites match your filters.</td></tr>}
            </tbody>
          </table>
        </div>

        <div className="px-4 py-2.5 border-t border-neutral-100 flex items-center justify-between text-[11.5px] text-neutral-500">
          <span>{rows.length} of {sites.length} sites</span>
          <div className="flex items-center gap-1.5">
            <button disabled={safePage === 0} onClick={() => setPage((p) => Math.max(0, p - 1))} className="h-7 px-2.5 rounded-md border border-neutral-200 disabled:opacity-40 hover:bg-neutral-50">Prev</button>
            <span>Page {safePage + 1} of {pageCount}</span>
            <button disabled={safePage >= pageCount - 1} onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))} className="h-7 px-2.5 rounded-md border border-neutral-200 disabled:opacity-40 hover:bg-neutral-50">Next</button>
          </div>
        </div>
      </section>
    </div>
  );
}

function Legend({ color, label }: { color: string; label: string }) { return <span className="inline-flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full" style={{ background: color }} />{label}</span>; }
function SortBtn({ label, active, asc, onClick }: { label: string; active: boolean; asc: boolean; onClick: () => void }) {
  return <button onClick={onClick} className={cn('inline-flex items-center gap-1 hover:text-ink-950', active && 'text-ink-950')}>{label}<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className={cn('transition-transform', active && !asc && 'rotate-180', !active && 'opacity-30')}><polyline points="18 15 12 9 6 15"/></svg></button>;
}
function SearchIcon() { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>; }
function DownloadIcon() { return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>; }
