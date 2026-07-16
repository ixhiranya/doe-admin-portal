import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  listSuppliers, sourceLabel, PERMIT_HOLDERS,
  type GasSupplier, type AssetSource,
} from '../../services/gasRegister/suppliers';
import { cn } from '../../lib/utils';

type SourceFilter = 'all' | AssetSource;

export function SuppliersListPage() {
  const all = useMemo(() => listSuppliers(), []);
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [holder, setHolder] = useState<string>('');
  const [source, setSource] = useState<SourceFilter>('all');

  const kpis = useMemo(() => {
    const asateel = all.filter((s) => s.source === 'asateel').length;
    const permit  = all.filter((s) => s.source === 'petroleum_permit').length;
    const manual  = all.filter((s) => s.source === 'manual').length;
    return { count: all.length, asateel, permit, manual };
  }, [all]);

  const visible = useMemo(() => {
    return all.filter((s) => {
      if (holder && s.permitHolderId !== holder) return false;
      if (source !== 'all' && s.source !== source) return false;
      if (search) {
        const q = search.toLowerCase();
        const hay = [s.id, s.name, s.permitHolderName, s.tradeLicenceNumber, ...s.gasTypes].join(' ').toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [all, holder, source, search]);

  return (
    <div className="max-w-[1400px] mx-auto px-6 pt-5 pb-10">
      {/* Breadcrumb */}
      <div className="flex items-center justify-between text-[12px] mb-5">
        <nav className="text-neutral-500">
          <Link to="/pps-dashboard" className="hover:text-doe-red">Home</Link>
          <span className="mx-2 text-neutral-300">›</span>
          <span>Gas Register</span>
          <span className="mx-2 text-neutral-300">›</span>
          <span className="text-ink-950 font-semibold">Supplier Master</span>
        </nav>
        <div className="font-sans text-[11px] tracking-wider text-neutral-500 uppercase">
          Gas Suppliers · Trade-licenced
        </div>
      </div>

      {/* Hero */}
      <div className="card overflow-hidden mb-6">
        <div className="relative px-6 py-6 bg-gradient-to-br from-[#1E2128] via-[#262A33] to-[#1E2128] text-white">
          <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 20% 30%, #E89B4C 0%, transparent 50%), radial-gradient(circle at 80% 70%, #0E76A8 0%, transparent 50%)' }} />
          <div className="relative flex items-center gap-6">
            <div className="w-14 h-14 rounded-xl bg-action-orange/90 grid place-items-center shadow-doe-md">
              <SupplierIcon />
            </div>
            <div className="flex-1">
              <div className="text-[10px] font-sans uppercase tracking-[0.22em] text-action-orange-soft">Gas Register · Supplier Master</div>
              <h1 className="font-display font-bold text-[24px] leading-tight mt-1">Every gas supplier on file.</h1>
              <p className="text-[12.5px] text-white/70 mt-1 max-w-[640px]">
                Trade-licenced companies that supply gas to permit holders under a contract on record. Source is one of Asateel, an active petroleum permit, or direct entry.
              </p>
            </div>
            <button
              onClick={() => navigate('/gas-register/suppliers/new')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-action-orange text-white font-semibold text-[11.5px] hover:bg-action-orange-dark shadow-doe-sm transition"
            >
              <span className="text-[14px] leading-none">+</span> New supplier
            </button>
          </div>
        </div>

        {/* KPI strip — filter by source */}
        <div className="grid grid-cols-4 divide-x divide-neutral-100 border-t border-neutral-100 bg-white">
          <Kpi value={kpis.count}    label="Suppliers on file"     tone="ink"   active={source === 'all'}              onClick={() => setSource('all')} />
          <Kpi value={kpis.asateel}  label="Asateel"               tone="info"  active={source === 'asateel'}          onClick={() => setSource(source === 'asateel' ? 'all' : 'asateel')} />
          <Kpi value={kpis.permit}   label="Petroleum permit"      tone="amber" active={source === 'petroleum_permit'} onClick={() => setSource(source === 'petroleum_permit' ? 'all' : 'petroleum_permit')} />
          <Kpi value={kpis.manual}   label="Manual entry"          tone="ink"   active={source === 'manual'}           onClick={() => setSource(source === 'manual' ? 'all' : 'manual')} />
        </div>
      </div>

      {/* Filters */}
      <div className="card p-3 mb-5 flex flex-wrap items-center gap-3">
        <div className="flex-1 min-w-[240px] relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" /></svg>
          </span>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by supplier, permit holder, trade licence, gas type…"
            className="w-full pl-9 pr-3 py-2 text-[12.5px] border border-neutral-200 rounded-md focus:outline-none focus:border-action-orange"
          />
        </div>
        <label className="flex items-center gap-2 text-[11px]">
          <span className="font-sans uppercase tracking-wider text-neutral-500">Permit holder</span>
          <select
            value={holder}
            onChange={(e) => setHolder(e.target.value)}
            className="px-2 py-1.5 rounded-md border border-neutral-200 text-[12px] focus:outline-none focus:border-action-orange"
          >
            <option value="">All</option>
            {PERMIT_HOLDERS.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </label>
      </div>

      {/* List */}
      {visible.length === 0 ? (
        <div className="card p-10 text-center">
          <div className="text-4xl mb-2">🚚</div>
          <div className="font-display font-bold text-[15px] text-ink-950">No suppliers match these filters</div>
          <div className="text-[12px] text-neutral-500 mt-1">Try clearing the search or source filters.</div>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-neutral-100 shadow-doe-xs overflow-hidden">
          <div className="px-4 py-2 border-b border-neutral-100 bg-neutral-25/60 flex items-center justify-between">
            <div className="text-[11px] text-neutral-500">
              Showing <span className="font-bold text-ink-950">{visible.length}</span> of {all.length} suppliers
            </div>
            <div className="text-[10px] font-sans uppercase tracking-[0.18em] text-neutral-400">
              Sorted by permit holder · name
            </div>
          </div>
          <Header />
          <div>
            {visible.map((s) => <Row key={s.id} s={s} />)}
          </div>
        </div>
      )}
    </div>
  );
}

function Header() {
  return (
    <div className="grid grid-cols-[1.4fr_140px_140px_140px_130px] gap-2 px-4 py-2 text-[10px] font-sans uppercase tracking-[0.16em] text-neutral-500 border-b border-neutral-100 bg-white">
      <div>Supplier</div>
      <div>Permit holder</div>
      <div>Source</div>
      <div>Trade licence</div>
      <div className="text-right">Contract</div>
    </div>
  );
}

function Row({ s }: { s: GasSupplier }) {
  return (
    <Link
      to={`/gas-register/suppliers/${s.id}`}
      className="grid grid-cols-[1.4fr_140px_140px_140px_130px] gap-2 px-4 py-3 items-center border-b border-neutral-100 last:border-b-0 hover:bg-neutral-25 transition"
    >
      <div className="min-w-0">
        <div className="text-[13px] font-semibold text-ink-950 truncate">{s.name}</div>
        <div className="text-[11px] text-neutral-500 mt-0.5 truncate font-mono">
          {s.id} · {s.area}, {s.city}
        </div>
      </div>
      <div className="text-[12px] text-neutral-700 truncate">{s.permitHolderName}</div>
      <div><SourceChip s={s.source} /></div>
      <div className="font-mono text-[11.5px] text-ink-950 truncate">{s.tradeLicenceNumber}</div>
      <div className="text-right">
        <div className="text-[12px] text-ink-950 tabular-nums">{formatDate(s.dateOfContract)}</div>
        <div className="text-[10px] font-mono text-neutral-500 truncate">
          {s.gasTypes.length} gas type{s.gasTypes.length === 1 ? '' : 's'}
        </div>
      </div>
    </Link>
  );
}

function Kpi({ value, label, tone, active, onClick }: {
  value: number; label: string; tone: 'ink' | 'info' | 'amber'; active: boolean; onClick: () => void;
}) {
  const toneText = tone === 'info' ? 'text-info-500' : tone === 'amber' ? 'text-warning-500' : 'text-ink-950';
  const toneBar  = tone === 'info' ? 'bg-info-500'   : tone === 'amber' ? 'bg-warning-500'   : 'bg-ink-950';
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'relative text-left px-4 py-3 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-action-orange/40',
        active ? 'bg-neutral-50' : 'hover:bg-neutral-25/60',
      )}
    >
      <span className={cn('absolute inset-x-0 top-0 h-[3px] transition-opacity', toneBar, active ? 'opacity-100' : 'opacity-0')} />
      <div className="text-[9.5px] font-sans uppercase tracking-[0.18em] text-neutral-500">{label}</div>
      <div className={cn('font-display font-bold text-[20px] mt-0.5', toneText)}>{value.toLocaleString()}</div>
    </button>
  );
}

function SourceChip({ s }: { s: AssetSource }) {
  const meta: Record<AssetSource, { bg: string; text: string; ring: string }> = {
    asateel:           { bg: 'bg-info-soft',           text: 'text-info-500',          ring: 'ring-info-500/20' },
    petroleum_permit:  { bg: 'bg-action-orange-soft',  text: 'text-action-orange-deep', ring: 'ring-action-orange/25' },
    manual:            { bg: 'bg-neutral-100',         text: 'text-neutral-600',       ring: 'ring-neutral-300/30' },
  };
  const m = meta[s];
  return <span className={cn('inline-flex items-center px-2 h-5 rounded-full text-[9.5px] font-semibold uppercase tracking-[0.12em] ring-1', m.bg, m.text, m.ring)}>{sourceLabel(s)}</span>;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function SupplierIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="1" y="3" width="15" height="13" />
      <polygon points="16 8 20 8 23 11 23 16 16 16 16 8" />
      <circle cx="5.5" cy="18.5" r="2.5" />
      <circle cx="18.5" cy="18.5" r="2.5" />
    </svg>
  );
}
