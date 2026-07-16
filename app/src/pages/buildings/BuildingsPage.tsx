import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useApps } from '../../store/apps';
import { deriveBuildings, type Building360 } from '../../services/buildings';
import { BuildingRow, BuildingsListHeader } from '../../components/buildings/BuildingRow';
import { BuildingMap } from '../../components/buildings/BuildingMap';
import { cn } from '../../lib/utils';

type View = 'list' | 'map';
type ComplianceFilter = 'all' | 'green' | 'amber' | 'red';
type QuickFilter = 'all' | 'expiring' | 'open';

export function BuildingsPage() {
  const apps = useApps((s) => s.apps);
  const buildings = useMemo(() => deriveBuildings(apps), [apps]);

  const [view, setView] = useState<View>('list');
  const [search, setSearch] = useState('');
  const [cityFilter, setCityFilter] = useState<string>('');
  const [typeFilter, setTypeFilter] = useState<string>('');
  const [complianceFilter, setComplianceFilter] = useState<ComplianceFilter>('all');
  const [quickFilter, setQuickFilter] = useState<QuickFilter>('all');

  const cities = useMemo(() => Array.from(new Set(buildings.map((b) => b.city).filter(Boolean))).sort() as string[], [buildings]);
  const types  = useMemo(() => Array.from(new Set(buildings.map((b) => b.premisesType).filter(Boolean))).sort() as string[], [buildings]);

  const visible = useMemo(() => {
    return buildings.filter((b) => {
      if (cityFilter && b.city !== cityFilter) return false;
      if (typeFilter && b.premisesType !== typeFilter) return false;
      if (complianceFilter !== 'all' && b.complianceLevel !== complianceFilter) return false;
      if (quickFilter === 'expiring' && ![b.coc, b.noc, b.amc].some((c) => c.status === 'expiring')) return false;
      if (quickFilter === 'open'     && ![b.coc, b.noc, b.amc].some((c) => c.inFlight || c.status === 'pending')) return false;
      if (search) {
        const q = search.toLowerCase();
        const hay = [b.name, b.premisesNumber, b.area, b.gasInstallContractor, b.gasAmcContractor, b.tpiCompany, b.ownerName].filter(Boolean).join(' ').toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [buildings, cityFilter, typeFilter, complianceFilter, quickFilter, search]);

  const selectCompliance = (lvl: ComplianceFilter) => { setComplianceFilter(lvl); setQuickFilter('all'); };
  const selectQuick = (q: Exclude<QuickFilter, 'all'>) => { setComplianceFilter('all'); setQuickFilter(q); };
  const resetKpiFilters = () => { setComplianceFilter('all'); setQuickFilter('all'); };
  const noKpiFilter = complianceFilter === 'all' && quickFilter === 'all';

  // KPIs
  const kpis = useMemo(() => {
    const total = buildings.length;
    const fully  = buildings.filter((b) => b.complianceLevel === 'green').length;
    const partial = buildings.filter((b) => b.complianceLevel === 'amber').length;
    const issues = buildings.filter((b) => b.complianceLevel === 'red').length;
    const expiringSoon = buildings.filter((b) => [b.coc, b.noc, b.amc].some((c) => c.status === 'expiring')).length;
    const openWorkflows = buildings.filter((b) => [b.coc, b.noc, b.amc].some((c) => c.inFlight || c.status === 'pending')).length;
    return { total, fully, partial, issues, expiringSoon, openWorkflows };
  }, [buildings]);

  return (
    <div className="max-w-[1400px] mx-auto px-6 pt-5 pb-10">
      {/* Breadcrumbs */}
      <div className="flex items-center justify-between text-[12px] mb-5">
        <nav className="text-neutral-500">
          <Link to="/pps-dashboard" className="hover:text-doe-red">Home</Link>
          <span className="mx-2 text-neutral-300">›</span>
          <span className="text-ink-950 font-semibold">Building 360</span>
        </nav>
        <div className="font-sans text-[11px] tracking-wider text-neutral-500 uppercase">
          Compliance · COC · NOC · AMC
        </div>
      </div>

      {/* Hero header */}
      <div className="card overflow-hidden mb-6">
        <div className="relative px-6 py-6 bg-gradient-to-br from-[#1E2128] via-[#262A33] to-[#1E2128] text-white">
          <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 20% 30%, #E89B4C 0%, transparent 50%), radial-gradient(circle at 80% 70%, #0E76A8 0%, transparent 50%)' }} />
          <div className="relative flex items-center gap-6">
            <div className="w-14 h-14 rounded-xl bg-action-orange/90 grid place-items-center shadow-doe-md">
              <BuildingsIcon />
            </div>
            <div className="flex-1">
              <div className="text-[10px] font-sans uppercase tracking-[0.22em] text-action-orange-soft">Premises Portfolio · Building 360</div>
              <h1 className="font-display font-bold text-[24px] leading-tight mt-1">Every premises. Every certificate. One view.</h1>
              <p className="text-[12.5px] text-white/70 mt-1 max-w-[640px]">
                Buildings derived from the latest COC, NOC and AMC records on file. Compliance status is calculated live; clicking any record opens the underlying application.
              </p>
            </div>
            <div className="hidden md:flex items-center gap-2 text-[11px]">
              <ToggleButton active={view === 'list'} onClick={() => setView('list')} icon={<ListIcon />} label="Portfolio" />
              <ToggleButton active={view === 'map'}  onClick={() => setView('map')}  icon={<MapIcon />}  label="Map" />
            </div>
          </div>
        </div>

        {/* KPI strip — each tile acts as a quick filter for the list/map below */}
        <div className="grid grid-cols-6 divide-x divide-neutral-100 border-t border-neutral-100 bg-white">
          <KpiCell value={kpis.total}         label="Buildings on file"  tone="ink"   active={noKpiFilter}                       onClick={resetKpiFilters} />
          <KpiCell value={kpis.fully}         label="Fully compliant"    tone="green" active={complianceFilter === 'green'}      onClick={() => selectCompliance('green')} />
          <KpiCell value={kpis.partial}       label="Partial coverage"   tone="amber" active={complianceFilter === 'amber'}      onClick={() => selectCompliance('amber')} />
          <KpiCell value={kpis.issues}        label="Action required"    tone="red"   active={complianceFilter === 'red'}        onClick={() => selectCompliance('red')} />
          <KpiCell value={kpis.expiringSoon}  label="Expiring < 60 days" tone="amber" active={quickFilter === 'expiring'}        onClick={() => selectQuick('expiring')} />
          <KpiCell value={kpis.openWorkflows} label="Open workflows"     tone="info"  active={quickFilter === 'open'}            onClick={() => selectQuick('open')} />
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
            placeholder="Search building, premises no., contractor, owner…"
            className="w-full pl-9 pr-3 py-2 text-[12.5px] border border-neutral-200 rounded-md focus:outline-none focus:border-action-orange"
          />
        </div>
        <FilterSelect label="City" value={cityFilter} onChange={setCityFilter} options={cities} />
        <FilterSelect label="Type" value={typeFilter} onChange={setTypeFilter} options={types} />
        <div className="flex items-center gap-1.5 p-1 rounded-md bg-neutral-50 border border-neutral-100">
          {(['all', 'green', 'amber', 'red'] as const).map((lvl) => (
            <button
              key={lvl}
              onClick={() => selectCompliance(lvl)}
              className={cn(
                'px-2.5 py-1 rounded text-[11px] font-semibold transition',
                complianceFilter === lvl ? 'bg-white shadow-doe-xs text-ink-950' : 'text-neutral-500 hover:text-ink-950',
              )}
            >
              {lvl === 'all'   ? `All (${buildings.length})` :
               lvl === 'green' ? `🟢 ${kpis.fully}` :
               lvl === 'amber' ? `🟡 ${kpis.partial}` :
                                 `🔴 ${kpis.issues}`}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1 md:hidden p-1 rounded-md bg-neutral-50 border border-neutral-100">
          <ToggleButton active={view === 'list'} onClick={() => setView('list')} icon={<ListIcon />} label="" />
          <ToggleButton active={view === 'map'}  onClick={() => setView('map')}  icon={<MapIcon />}  label="" />
        </div>
      </div>

      {/* Content */}
      {view === 'list' && (
        <>
          {visible.length === 0 ? (
            <EmptyState />
          ) : (
            <div className="bg-white rounded-xl border border-neutral-100 shadow-doe-xs overflow-hidden">
              <div className="px-4 py-2 border-b border-neutral-100 bg-neutral-25/60 flex items-center justify-between">
                <div className="text-[11px] text-neutral-500">
                  Showing <span className="font-bold text-ink-950">{visible.length}</span> of {buildings.length} buildings
                </div>
                <div className="text-[10px] font-sans uppercase tracking-[0.18em] text-neutral-400">
                  Sorted by compliance · risk first
                </div>
              </div>
              <BuildingsListHeader />
              <div>
                {visible.map((b) => <BuildingRow key={b.id} b={b} />)}
              </div>
            </div>
          )}
        </>
      )}

      {view === 'map' && (
        <BuildingMap buildings={visible} height={620} />
      )}
    </div>
  );
}

// ----- Small UI bits --------------------------------------------------------

function ToggleButton({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex items-center gap-1.5 px-3 py-1.5 rounded-md transition text-[11.5px] font-semibold',
        active
          ? 'bg-action-orange text-white shadow-doe-sm'
          : 'bg-white/10 text-white/80 hover:bg-white/20',
      )}
    >
      {icon}
      {label && <span>{label}</span>}
    </button>
  );
}

function KpiCell({ value, label, tone, active, onClick }: {
  value: number;
  label: string;
  tone: 'ink' | 'green' | 'amber' | 'red' | 'info';
  active?: boolean;
  onClick?: () => void;
}) {
  const toneText =
    tone === 'green' ? 'text-success-500' :
    tone === 'amber' ? 'text-warning-500' :
    tone === 'red'   ? 'text-danger-500' :
    tone === 'info'  ? 'text-info-500' :
                       'text-ink-950';
  const toneBar =
    tone === 'green' ? 'bg-success-500' :
    tone === 'amber' ? 'bg-warning-500' :
    tone === 'red'   ? 'bg-danger-500' :
    tone === 'info'  ? 'bg-info-500' :
                       'bg-ink-950';
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      title={active ? 'Click to clear this filter' : `Filter buildings by: ${label}`}
      className={cn(
        'relative text-left px-4 py-3 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-action-orange/40',
        active ? 'bg-neutral-50' : 'hover:bg-neutral-25/60',
      )}
    >
      <span className={cn('absolute inset-x-0 top-0 h-[3px] transition-opacity', toneBar, active ? 'opacity-100' : 'opacity-0')} />
      <div className="text-[9.5px] font-sans uppercase tracking-[0.18em] text-neutral-500">{label}</div>
      <div className={cn('font-display font-bold text-[22px] mt-0.5', toneText)}>{value}</div>
    </button>
  );
}

function FilterSelect({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: string[] }) {
  return (
    <label className="flex items-center gap-2 text-[11px]">
      <span className="font-sans uppercase tracking-wider text-neutral-500">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="px-2 py-1.5 rounded-md border border-neutral-200 text-[12px] focus:outline-none focus:border-action-orange"
      >
        <option value="">All</option>
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    </label>
  );
}

function EmptyState() {
  return (
    <div className="card p-10 text-center">
      <div className="text-4xl mb-2">🏢</div>
      <div className="font-display font-bold text-[15px] text-ink-950">No buildings match these filters</div>
      <div className="text-[12px] text-neutral-500 mt-1">Try clearing the search or compliance filters.</div>
    </div>
  );
}

function BuildingsIcon() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 21h18" />
      <path d="M5 21V7l8-4v18" />
      <path d="M19 21V11l-6-4" />
      <path d="M9 9v.01" /><path d="M9 12v.01" /><path d="M9 15v.01" /><path d="M9 18v.01" />
    </svg>
  );
}

function ListIcon() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>;
}
function MapIcon() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21 3 6" /><line x1="9" y1="3" x2="9" y2="18" /><line x1="15" y1="6" x2="15" y2="21" /></svg>;
}
