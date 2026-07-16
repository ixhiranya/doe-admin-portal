import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  listAssets, assetCompleteness, inspectionStatus, sourceLabel, storageTypeLabel, formatLiters,
  PERMIT_HOLDERS, type GasAsset, type AssetSource,
} from '../../services/gasRegister/assets';
import { AssetMap } from '../../components/gasRegister/AssetMap';
import { cn } from '../../lib/utils';

// =============================================================================
// Gas Register · Assets — list & map
// -----------------------------------------------------------------------------
// The legacy screen showed a wide unsorted table with low-information columns.
// This rebuild keeps every piece of data but layers it so the eye lands on the
// thing that matters first (capacity + inspection status) and demotes serials
// to a hover detail. Each KPI tile doubles as a filter, mirroring the Building
// 360 pattern we already ship.
// =============================================================================

type View = 'list' | 'map';
type SourceFilter = 'all' | AssetSource;
type StatusFilter = 'all' | 'incomplete' | 'inspection_due';

export function AssetsListPage() {
  const all = useMemo(() => listAssets(), []);
  const navigate = useNavigate();

  const [view, setView] = useState<View>('list');
  const [search, setSearch] = useState('');
  const [holder, setHolder] = useState<string>('');
  const [city, setCity] = useState<string>('');
  const [source, setSource] = useState<SourceFilter>('all');
  const [status, setStatus] = useState<StatusFilter>('all');

  // KPIs — these double as quick filters
  const kpis = useMemo(() => {
    const incomplete = all.filter((a) => assetCompleteness(a) < 100).length;
    const due = all.filter((a) => inspectionStatus(a) !== 'current').length;
    const totalCap = all.reduce((s, a) => s + a.totalCapacityLiters, 0);
    return {
      count: all.length,
      capacity: totalCap,
      incomplete,
      due,
    };
  }, [all]);

  const cities = useMemo(() => Array.from(new Set(all.map((a) => a.city))).sort(), [all]);

  const visible = useMemo(() => {
    return all.filter((a) => {
      if (holder && a.permitHolderId !== holder) return false;
      if (city && a.city !== city) return false;
      if (source !== 'all' && a.source !== source) return false;
      if (status === 'incomplete' && assetCompleteness(a) >= 100) return false;
      if (status === 'inspection_due' && inspectionStatus(a) === 'current') return false;
      if (search) {
        const q = search.toLowerCase();
        const hay = [a.id, a.facilityName, a.permitHolderName, a.area, a.detailedAddress, ...a.gasTypes].join(' ').toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [all, holder, city, source, status, search]);

  const resetKpiFilters = () => { setStatus('all'); };
  const noKpiFilter = status === 'all';

  return (
    <div className="max-w-[1400px] mx-auto px-6 pt-5 pb-10">
        {/* Breadcrumb */}
        <div className="flex items-center justify-between text-[12px] mb-5">
          <nav className="text-neutral-500">
            <Link to="/pps-dashboard" className="hover:text-doe-red">Home</Link>
            <span className="mx-2 text-neutral-300">›</span>
            <span className="text-neutral-500">Gas Register</span>
            <span className="mx-2 text-neutral-300">›</span>
            <span className="text-ink-950 font-semibold">Asset Master</span>
          </nav>
          <div className="font-sans text-[11px] tracking-wider text-neutral-500 uppercase">
            Storage Facilities · Tanks · Cylinders · Pipelines
          </div>
        </div>

        {/* Hero — same chrome as Building 360 */}
        <div className="card overflow-hidden mb-6">
          <div className="relative px-6 py-6 bg-gradient-to-br from-[#1E2128] via-[#262A33] to-[#1E2128] text-white">
            <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 20% 30%, #E89B4C 0%, transparent 50%), radial-gradient(circle at 80% 70%, #0E76A8 0%, transparent 50%)' }} />
            <div className="relative flex items-center gap-6">
              <div className="w-14 h-14 rounded-xl bg-action-orange/90 grid place-items-center shadow-doe-md">
                <TankIcon />
              </div>
              <div className="flex-1">
                <div className="text-[10px] font-sans uppercase tracking-[0.22em] text-action-orange-soft">Gas Register · Asset Master</div>
                <h1 className="font-display font-bold text-[24px] leading-tight mt-1">Every storage facility. One register.</h1>
                <p className="text-[12.5px] text-white/70 mt-1 max-w-[640px]">
                  Bulk tanks, cylinder banks, pipeline manifolds and inert-gas bullets on file with the Department of Energy. Sourced from Asateel, active petroleum permits, and direct submissions from permit holders.
                </p>
              </div>
              <div className="hidden md:flex items-center gap-2 text-[11px]">
                <ToggleButton active={view === 'list'} onClick={() => setView('list')} icon={<ListIcon />} label="Register" />
                <ToggleButton active={view === 'map'}  onClick={() => setView('map')}  icon={<MapIcon />}  label="Map" />
                <button
                  onClick={() => navigate('/gas-register/assets/new')}
                  className="ml-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-action-orange text-white font-semibold text-[11.5px] hover:bg-action-orange-dark shadow-doe-sm transition"
                >
                  <PlusIcon /> New asset
                </button>
              </div>
            </div>
          </div>

          {/* KPI strip — clickable tiles */}
          <div className="grid grid-cols-4 divide-x divide-neutral-100 border-t border-neutral-100 bg-white">
            <KpiCell value={kpis.count.toLocaleString()}             label="Assets on file"     tone="ink"   active={noKpiFilter}                onClick={resetKpiFilters} />
            <KpiCell value={formatLiters(kpis.capacity)}             label="Total capacity"     tone="info"  active={false}                       onClick={resetKpiFilters} />
            <KpiCell value={kpis.incomplete.toLocaleString()}        label="Incomplete records" tone="amber" active={status === 'incomplete'}     onClick={() => setStatus(status === 'incomplete' ? 'all' : 'incomplete')} />
            <KpiCell value={kpis.due.toLocaleString()}               label="Inspection due"     tone="red"   active={status === 'inspection_due'} onClick={() => setStatus(status === 'inspection_due' ? 'all' : 'inspection_due')} />
          </div>
        </div>

        {/* Filters bar */}
        <div className="card p-3 mb-5 flex flex-wrap items-center gap-3">
          <div className="flex-1 min-w-[240px] relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" /></svg>
            </span>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by facility, permit holder, area, gas type…"
              className="w-full pl-9 pr-3 py-2 text-[12.5px] border border-neutral-200 rounded-md focus:outline-none focus:border-action-orange"
            />
          </div>
          <FilterSelect label="Permit holder" value={holder} onChange={setHolder} options={PERMIT_HOLDERS.map((p) => ({ value: p.id, label: p.name }))} />
          <FilterSelect label="City" value={city} onChange={setCity} options={cities.map((c) => ({ value: c, label: c }))} />
          <div className="flex items-center gap-1.5 p-1 rounded-md bg-neutral-50 border border-neutral-100">
            {(['all', 'asateel', 'petroleum_permit', 'manual'] as const).map((s) => (
              <button
                key={s}
                onClick={() => setSource(s)}
                className={cn(
                  'px-2.5 py-1 rounded text-[11px] font-semibold transition',
                  source === s ? 'bg-white shadow-doe-xs text-ink-950' : 'text-neutral-500 hover:text-ink-950',
                )}
              >
                {s === 'all' ? 'All sources' : sourceLabel(s as AssetSource)}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        {view === 'list' && (
          visible.length === 0 ? <EmptyState /> : (
            <div className="bg-white rounded-xl border border-neutral-100 shadow-doe-xs overflow-hidden">
              <div className="px-4 py-2 border-b border-neutral-100 bg-neutral-25/60 flex items-center justify-between">
                <div className="text-[11px] text-neutral-500">
                  Showing <span className="font-bold text-ink-950">{visible.length}</span> of {all.length} assets
                </div>
                <div className="text-[10px] font-sans uppercase tracking-[0.18em] text-neutral-400">
                  Sorted by permit holder · facility name
                </div>
              </div>
              <Header />
              <div>
                {visible.map((a) => <AssetRow key={a.id} a={a} />)}
              </div>
            </div>
          )
        )}

        {view === 'map' && <AssetMap assets={visible} height={620} />}
    </div>
  );
}

// ============================================================
// Row + header
// ============================================================
function Header() {
  return (
    <div className="grid grid-cols-[1fr_180px_140px_180px_120px_120px] gap-2 px-4 py-2 text-[10px] font-sans uppercase tracking-[0.16em] text-neutral-500 border-b border-neutral-100 bg-white">
      <div>Facility</div>
      <div>Permit holder</div>
      <div>Source</div>
      <div>Gas types</div>
      <div className="text-right">Capacity</div>
      <div className="text-right">Status</div>
    </div>
  );
}

function AssetRow({ a }: { a: GasAsset }) {
  const completeness = assetCompleteness(a);
  const ins = inspectionStatus(a);
  return (
    <Link
      to={`/gas-register/assets/${a.id}`}
      className="grid grid-cols-[1fr_180px_140px_180px_120px_120px] gap-2 px-4 py-3 items-center border-b border-neutral-100 last:border-b-0 hover:bg-neutral-25 transition"
    >
      <div className="min-w-0">
        <div className="text-[13px] font-semibold text-ink-950 truncate">{a.facilityName}</div>
        <div className="text-[11px] text-neutral-500 mt-0.5 truncate font-mono">
          {a.id} · {a.area}, {a.city}
        </div>
      </div>
      <div className="text-[12px] text-neutral-700 truncate">{a.permitHolderName}</div>
      <div>
        <SourceChip s={a.source} />
      </div>
      <div className="flex flex-wrap gap-1">
        {a.gasTypes.slice(0, 2).map((g) => (
          <span key={g} className="inline-flex items-center px-1.5 h-5 rounded-full bg-[#0F4A5C]/8 text-[#0F4A5C] text-[9.5px] font-semibold ring-1 ring-[#0F4A5C]/15">
            {shortGas(g)}
          </span>
        ))}
        {a.gasTypes.length > 2 && (
          <span className="inline-flex items-center px-1.5 h-5 rounded-full bg-neutral-100 text-neutral-600 text-[9.5px] font-semibold">+{a.gasTypes.length - 2}</span>
        )}
      </div>
      <div className="text-right">
        <div className="font-display font-bold text-[14px] text-ink-950">{formatLiters(a.totalCapacityLiters)}</div>
        <div className="text-[10px] font-mono text-neutral-500">{a.storageMethods.length} method{a.storageMethods.length === 1 ? '' : 's'}</div>
      </div>
      <div className="text-right">
        <CompletenessPill v={completeness} />
        <div className="mt-1">
          <InspectionDot status={ins} />
        </div>
      </div>
    </Link>
  );
}

// ============================================================
// Small UI bits
// ============================================================
function ToggleButton({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex items-center gap-1.5 px-3 py-1.5 rounded-md transition text-[11.5px] font-semibold',
        active ? 'bg-action-orange text-white shadow-doe-sm' : 'bg-white/10 text-white/80 hover:bg-white/20',
      )}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}

function KpiCell({ value, label, tone, active, onClick }: {
  value: string; label: string; tone: 'ink' | 'info' | 'amber' | 'red'; active: boolean; onClick: () => void;
}) {
  const toneText =
    tone === 'info'  ? 'text-info-500' :
    tone === 'amber' ? 'text-warning-500' :
    tone === 'red'   ? 'text-danger-500' :
                       'text-ink-950';
  const toneBar =
    tone === 'info'  ? 'bg-info-500' :
    tone === 'amber' ? 'bg-warning-500' :
    tone === 'red'   ? 'bg-danger-500' :
                       'bg-ink-950';
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
      <div className={cn('font-display font-bold text-[20px] mt-0.5', toneText)}>{value}</div>
    </button>
  );
}

function FilterSelect({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: { value: string; label: string }[] }) {
  return (
    <label className="flex items-center gap-2 text-[11px]">
      <span className="font-sans uppercase tracking-wider text-neutral-500">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="px-2 py-1.5 rounded-md border border-neutral-200 text-[12px] focus:outline-none focus:border-action-orange"
      >
        <option value="">All</option>
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </label>
  );
}

function SourceChip({ s }: { s: AssetSource }) {
  const meta: Record<AssetSource, { bg: string; text: string; ring: string; label: string }> = {
    asateel:           { bg: 'bg-info-soft',           text: 'text-info-500',          ring: 'ring-info-500/20',          label: 'Asateel' },
    petroleum_permit:  { bg: 'bg-action-orange-soft',  text: 'text-action-orange-deep', ring: 'ring-action-orange/25',     label: 'Petroleum Permit' },
    manual:            { bg: 'bg-neutral-100',         text: 'text-neutral-600',       ring: 'ring-neutral-300/30',       label: 'Manual entry' },
  };
  const m = meta[s];
  return <span className={cn('inline-flex items-center px-2 h-5 rounded-full text-[9.5px] font-semibold uppercase tracking-[0.12em] ring-1', m.bg, m.text, m.ring)}>{m.label}</span>;
}

function CompletenessPill({ v }: { v: number }) {
  const tone = v >= 100 ? 'bg-success-soft text-success-500' : v >= 70 ? 'bg-warning-soft text-warning-500' : 'bg-danger-soft text-danger-500';
  return <span className={cn('inline-flex items-center justify-center min-w-[42px] h-5 rounded-full text-[10px] font-bold tabular-nums', tone)}>{v}%</span>;
}

function InspectionDot({ status }: { status: 'current' | 'due-soon' | 'overdue' }) {
  const meta = {
    'current':  { dot: 'bg-success-500', label: 'Inspection current' },
    'due-soon': { dot: 'bg-warning-500', label: 'Inspection due soon' },
    'overdue':  { dot: 'bg-danger-500',  label: 'Inspection overdue' },
  }[status];
  return (
    <span className="inline-flex items-center gap-1 text-[10px] text-neutral-500 font-sans uppercase tracking-wider">
      <span className={cn('w-1.5 h-1.5 rounded-full', meta.dot)} />
      {status === 'current' ? 'OK' : status === 'due-soon' ? 'Due soon' : 'Overdue'}
    </span>
  );
}

function EmptyState() {
  return (
    <div className="card p-10 text-center">
      <div className="text-4xl mb-2">🗄️</div>
      <div className="font-display font-bold text-[15px] text-ink-950">No assets match these filters</div>
      <div className="text-[12px] text-neutral-500 mt-1">Try clearing the search, source, or status filters.</div>
    </div>
  );
}

// "Propane (Liquefied) / Liquefied Gases" → "PROPANE"
function shortGas(g: string): string {
  const first = g.split(/[\s/(]/)[0];
  return first.toUpperCase();
}

// ----- Icons --------------------------------------------------
function TankIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="6" width="16" height="14" rx="3" />
      <path d="M4 10h16" />
      <path d="M9 14v3M15 14v3" />
    </svg>
  );
}
function ListIcon() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>;
}
function MapIcon() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21 3 6" /><line x1="9" y1="3" x2="9" y2="18" /><line x1="15" y1="6" x2="15" y2="21" /></svg>;
}
function PlusIcon() {
  return <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>;
}
