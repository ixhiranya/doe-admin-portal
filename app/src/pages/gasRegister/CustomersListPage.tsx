import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  listCustomers, sourceLabel, PERMIT_HOLDERS, CATEGORIES,
  categoryLabel, categoryUsesEid, customerCompliance, customerIdentifier,
  contractExpiringSoon, contractExpired,
  type GasCustomer, type AssetSource, type CustomerCategory,
} from '../../services/gasRegister/customers';
import { bandTone } from '../../services/gasRegister/compliance';
import { formatVolumeDual } from '../../services/gasRegister/technical';
import { cn } from '../../lib/utils';
import { useT } from '../../i18n';

// =============================================================================
// Gas Register · Customers — list (BN 1 of the Gas Register SDD).
// Columns per SDD §3.1: Customer ID · Customer Name · Category · Building Type
// · Account ID · Emirates ID / Commercial Licence Number · Contact · Total
// Capacity · Date of Contract · Expiry of Gas Sales Contract · Compliance
// Status (computed live from the 4-cert set, BN 14).
// =============================================================================

type SourceFilter = 'all' | AssetSource;
type CategoryFilter = 'all' | CustomerCategory;

export function CustomersListPage() {
  const all = useMemo(() => listCustomers(), []);
  const navigate = useNavigate();
  const t = useT();

  const [search, setSearch] = useState('');
  const [holder, setHolder] = useState<string>('');
  const [city, setCity] = useState<string>('');
  const [source, setSource] = useState<SourceFilter>('all');
  const [category, setCategory] = useState<CategoryFilter>('all');

  const compliances = useMemo(() => new Map(all.map((c) => [c.id, customerCompliance(c)])), [all]);

  const kpis = useMemo(() => {
    const total = all.length;
    const active = all.filter((c) => c.connectionStatus === 'Active').length;
    const disconnected = all.filter((c) => c.connectionStatus === 'Disconnected' || c.connectionStatus === 'Suspended').length;
    const avgRate = total === 0 ? 0
      : Math.round(all.reduce((s, c) => s + compliances.get(c.id)!.rate, 0) / total);
    return { total, active, disconnected, avgRate };
  }, [all, compliances]);

  const cities = useMemo(() => Array.from(new Set(all.map((c) => c.city))).sort(), [all]);

  const visible = useMemo(() => {
    return all.filter((c) => {
      if (holder && c.permitHolderId !== holder) return false;
      if (city && c.city !== city) return false;
      if (source !== 'all' && c.source !== source) return false;
      if (category !== 'all' && c.category !== category) return false;
      if (search) {
        const q = search.toLowerCase();
        const hay = [
          c.id, c.buildingName, c.ownerOrFmName, c.permitHolderName, c.area, c.detailedAddress,
          c.accountId, c.ownerOrFmEmail, c.emiratesId, c.tradeLicenceNumber, c.commercialName,
          categoryLabel(c.category), c.buildingType,
        ].filter(Boolean).join(' ').toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [all, holder, city, source, category, search]);

  return (
    <div className="max-w-[1400px] mx-auto px-6 pt-5 pb-10">
      {/* Breadcrumb */}
      <div className="flex items-center justify-between text-[12px] mb-5">
        <nav className="text-neutral-500">
          <Link to="/pps-dashboard" className="hover:text-doe-red">{t('dashboard.breadcrumbHome')}</Link>
          <span className="mx-2 text-neutral-300">›</span>
          <span className="text-neutral-500">Gas Register</span>
          <span className="mx-2 text-neutral-300">›</span>
          <span className="text-ink-950 font-semibold">{t('customers.breadcrumb')}</span>
        </nav>
        <div className="font-sans text-[11px] tracking-wider text-neutral-500 uppercase">
          BN 1 · Gas Register SDD
        </div>
      </div>

      {/* Hero */}
      <div className="card overflow-hidden mb-6">
        <div className="relative px-6 py-5 bg-gradient-to-br from-[#1E2128] via-[#262A33] to-[#1E2128] text-white">
          <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 20% 30%, #E89B4C 0%, transparent 50%), radial-gradient(circle at 80% 70%, #0E76A8 0%, transparent 50%)' }} />
          <div className="relative flex items-center gap-6">
            <div className="w-12 h-12 rounded-xl bg-action-orange/90 grid place-items-center shadow-doe-md">
              <UsersIcon />
            </div>
            <div className="flex-1">
              <div className="text-[10px] font-sans uppercase tracking-[0.22em] text-action-orange-soft">Customers Master Data</div>
              <h1 className="font-display font-bold text-[22px] leading-tight mt-1">Gas Customers Registry</h1>
              <p className="text-[12.5px] text-white/70 mt-1 max-w-[640px]">
                Central registry of all gas consumers across the 10 SDD-defined categories.
                EID identification for Residential / Villas Palaces; Trade Licence for every other category.
              </p>
            </div>
            <button
              onClick={() => navigate('/gas-register/customers/new')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-action-orange text-white font-semibold text-[11.5px] hover:bg-action-orange-dark shadow-doe-sm transition"
            >
              <PlusIcon /> Add New Customer
            </button>
          </div>
        </div>

        {/* KPI strip */}
        <div className="grid grid-cols-4 divide-x divide-neutral-100 border-t border-neutral-100 bg-white">
          <KpiCell value={kpis.total.toLocaleString()}        label="Total customers"         tone="ink" />
          <KpiCell value={kpis.active.toLocaleString()}       label="Active connections"      tone="success" />
          <KpiCell value={kpis.disconnected.toLocaleString()} label="Disconnected / Suspended" tone="danger" />
          <KpiCell value={`${kpis.avgRate}%`}                 label="Avg Compliance Rate"     tone="info" />
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
            placeholder="Search customer / building / account / licence / EID…"
            className="w-full pl-9 pr-3 py-2 text-[12.5px] border border-neutral-200 rounded-md focus:outline-none focus:border-action-orange"
          />
        </div>
        <FilterSelect label="Category" value={category} onChange={(v) => setCategory(v as CategoryFilter)} options={[{ value: 'all', label: 'All categories' }, ...CATEGORIES.map((c) => ({ value: c.id, label: c.label }))]} />
        <FilterSelect label="Permit holder" value={holder} onChange={setHolder} options={[{ value: '', label: 'All' }, ...PERMIT_HOLDERS.map((p) => ({ value: p.id, label: p.name }))]} />
        <FilterSelect label="City" value={city} onChange={setCity} options={[{ value: '', label: 'All' }, ...cities.map((c) => ({ value: c, label: c }))]} />
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
              {s === 'all' ? 'All sources' : sourceLabel(s)}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      {visible.length === 0 ? (
        <div className="card p-10 text-center">
          <div className="text-4xl mb-2">👥</div>
          <div className="font-display font-bold text-[15px] text-ink-950">No matching customers</div>
          <div className="text-[12px] text-neutral-500 mt-1">Adjust filters or add a new customer.</div>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-neutral-100 shadow-doe-xs overflow-hidden">
          <div className="px-4 py-2 border-b border-neutral-100 bg-neutral-25/60 flex items-center justify-between">
            <div className="text-[11px] text-neutral-500">
              Showing <span className="font-bold text-ink-950">{visible.length}</span> of {all.length}
            </div>
            <div className="text-[10px] font-sans uppercase tracking-[0.18em] text-neutral-400">
              Sorted by category · most recent first
            </div>
          </div>
          <Header />
          <div>
            {visible.map((c) => <Row key={c.id} c={c} />)}
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================
function Header() {
  return (
    <div className="grid grid-cols-[1fr_180px_140px_120px_120px_120px] gap-2 px-4 py-2 text-[10px] font-sans uppercase tracking-[0.16em] text-neutral-500 border-b border-neutral-100 bg-white">
      <div>Customer · Building</div>
      <div>Category · Building Type</div>
      <div>Identifier</div>
      <div className="text-right">Capacity</div>
      <div className="text-right">Contract</div>
      <div className="text-center">Compliance</div>
    </div>
  );
}

function Row({ c }: { c: GasCustomer }) {
  const compliance = customerCompliance(c);
  const tone = bandTone(compliance.band);
  const expiringContract = contractExpiringSoon(c);
  const expiredContract = contractExpired(c);
  return (
    <Link
      to={`/gas-register/customers/${c.id}`}
      className="grid grid-cols-[1fr_180px_140px_120px_120px_120px] gap-2 px-4 py-3 items-center border-b border-neutral-100 last:border-b-0 hover:bg-neutral-25 transition"
    >
      <div className="min-w-0">
        <div className="text-[13px] font-semibold text-ink-950 truncate">{c.buildingName}</div>
        <div className="text-[10.5px] text-neutral-500 mt-0.5 truncate">
          <span className="font-mono">{c.id}</span>
          <span className="text-neutral-300 mx-1">·</span>
          {c.area}, {c.city}
          {c.connectionStatus !== 'Active' && (
            <span className={cn('ml-2 inline-flex items-center px-1.5 h-4 rounded text-[9px] font-semibold uppercase tracking-wider',
              c.connectionStatus === 'Disconnected' ? 'bg-rose-50 text-doe-red' :
              c.connectionStatus === 'Suspended' ? 'bg-amber-50 text-amber-700' :
              'bg-neutral-100 text-neutral-600')}>
              {c.connectionStatus}
            </span>
          )}
        </div>
      </div>
      <div className="min-w-0">
        <div className="text-[12px] text-ink-950 truncate">{categoryLabel(c.category)}</div>
        <div className="text-[10.5px] text-neutral-500 mt-0.5 truncate">{c.buildingType}</div>
      </div>
      <div className="min-w-0">
        <div className="text-[11px] font-mono text-ink-950 truncate">{customerIdentifier(c)}</div>
        <div className="text-[10px] text-neutral-500 mt-0.5 truncate">
          {categoryUsesEid(c.category) ? 'EID' : 'Trade Licence'}
          <span className="text-neutral-300 mx-1">·</span>
          {c.accountId}
        </div>
      </div>
      <div className="text-right">
        <div className="font-display font-bold text-[13px] text-ink-950 tabular-nums">
          {formatVolumeDual(c.totalCapacityLiters, 'L', c.gasTypes[0])}
        </div>
        <div className="text-[10px] font-mono text-neutral-500">{c.gasTypes.length} gas type{c.gasTypes.length === 1 ? '' : 's'}</div>
      </div>
      <div className="text-right">
        <div className={cn('text-[11.5px] tabular-nums', expiredContract ? 'text-doe-red' : expiringContract ? 'text-amber-600 font-semibold' : 'text-ink-950')}>
          {c.expiryOfGasSalesContract ? formatDate(c.expiryOfGasSalesContract) : '—'}
        </div>
        <div className="text-[10px] font-mono text-neutral-500">since {formatDate(c.dateOfContract)}</div>
      </div>
      <div className="text-center">
        <span className={cn('inline-flex items-center gap-1 px-2 h-6 rounded-full text-[10.5px] font-semibold', tone.pill)}>
          <span className={cn('w-1.5 h-1.5 rounded-full', tone.dot)} />
          {compliance.rate}%
        </span>
        <div className="text-[9.5px] text-neutral-500 mt-1 leading-tight">
          {compliance.band}
          {compliance.anyExpiringSoon && <span className="ml-1 text-amber-600">· Expiring</span>}
          {compliance.anyExpired && <span className="ml-1 text-doe-red">· Expired</span>}
        </div>
      </div>
    </Link>
  );
}

// ============================================================
function KpiCell({ value, label, tone }: { value: string; label: string; tone: 'ink' | 'success' | 'danger' | 'info' }) {
  const toneText =
    tone === 'success' ? 'text-emerald-600' :
    tone === 'danger'  ? 'text-doe-red' :
    tone === 'info'    ? 'text-info-500' :
    'text-ink-950';
  return (
    <div className="px-4 py-3">
      <div className="text-[9.5px] font-sans uppercase tracking-[0.18em] text-neutral-500">{label}</div>
      <div className={cn('font-display font-bold text-[20px] mt-0.5 tabular-nums', toneText)}>{value}</div>
    </div>
  );
}

function FilterSelect({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: { value: string; label: string }[] }) {
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

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function UsersIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
      <circle cx="8.5" cy="7" r="4"/>
      <path d="M22 21v-2a4 4 0 0 0-3-3.87"/>
      <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
    </svg>
  );
}
function PlusIcon() {
  return <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>;
}
