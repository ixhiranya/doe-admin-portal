import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { listDrivers, driverCompliance, type GasDriver } from '../../services/gasRegister/drivers';
import { PERMIT_HOLDERS } from '../../services/gasRegister/assets';
import { cn } from '../../lib/utils';

// =============================================================================
// Drivers Master · List — BN 6 of the Gas Register SDD.
// Per SDD §3.6: read-only · fetched from ASATEEL · no manual add.
// =============================================================================

export function DriversListPage() {
  const drivers = useMemo(() => listDrivers(), []);
  const [search, setSearch] = useState('');
  const [holder, setHolder] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'Compliant' | 'Non-Compliant'>('all');

  const visible = useMemo(() => drivers.filter((d) => {
    if (holder && d.permitHolderId !== holder) return false;
    if (statusFilter !== 'all' && driverCompliance(d) !== statusFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      const hay = [d.id, d.driverName, d.idNumber, d.licenseNumber, d.licenseType, d.permitHolderName].join(' ').toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  }), [drivers, holder, statusFilter, search]);

  const counts = useMemo(() => ({
    total: drivers.length,
    compliant: drivers.filter((d) => driverCompliance(d) === 'Compliant').length,
    nonCompliant: drivers.filter((d) => driverCompliance(d) === 'Non-Compliant').length,
  }), [drivers]);

  return (
    <div className="max-w-[1400px] mx-auto px-6 pt-5 pb-10">
      <div className="flex items-center justify-between text-[12px] mb-5">
        <nav className="text-neutral-500">
          <Link to="/pps-dashboard" className="hover:text-doe-red">Home</Link>
          <span className="mx-2 text-neutral-300">›</span>
          <span>Gas Register</span>
          <span className="mx-2 text-neutral-300">›</span>
          <span className="text-ink-950 font-semibold">Drivers Master</span>
        </nav>
        <div className="font-sans text-[11px] tracking-wider text-neutral-500 uppercase">BN 6 · Gas Register SDD</div>
      </div>

      <div className="card overflow-hidden mb-6">
        <div className="relative px-6 py-5 bg-gradient-to-br from-[#1E2128] via-[#262A33] to-[#1E2128] text-white">
          <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 20% 30%, #E89B4C 0%, transparent 50%)' }} />
          <div className="relative flex items-center gap-6">
            <div className="w-12 h-12 rounded-xl bg-action-orange/90 grid place-items-center shadow-doe-md">🚛</div>
            <div className="flex-1">
              <div className="text-[10px] font-sans uppercase tracking-[0.22em] text-action-orange-soft">Drivers Master Data</div>
              <h1 className="font-display font-bold text-[22px] leading-tight mt-1">Authorised Gas Transport Drivers</h1>
              <p className="text-[12.5px] text-white/70 mt-1 max-w-[640px]">
                All drivers are fetched from <strong>ASATEEL</strong> and their training status from <strong>ADCDA</strong>.
                Manual addition is not permitted per SDD §3.6.
              </p>
            </div>
            <button className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-white text-ink-950 font-semibold text-[11.5px] hover:bg-neutral-50 shadow-doe-sm transition" title="Triggers ASATEEL sync (prototype: read-only)">
              <SyncIcon /> Fetch from ASATEEL
            </button>
          </div>
        </div>
        <div className="grid grid-cols-3 divide-x divide-neutral-100 border-t border-neutral-100 bg-white">
          <KpiCell value={counts.total.toString()} label="Total drivers" tone="ink" />
          <KpiCell value={counts.compliant.toString()} label="Compliant" tone="success" />
          <KpiCell value={counts.nonCompliant.toString()} label="Non-Compliant" tone="danger" />
        </div>
      </div>

      <div className="card p-3 mb-5 flex flex-wrap items-center gap-3">
        <div className="flex-1 min-w-[240px]">
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search driver / EID / licence / vehicle…"
            className="w-full px-3 py-2 text-[12.5px] border border-neutral-200 rounded-md focus:outline-none focus:border-action-orange" />
        </div>
        <FilterSelect label="Permit Holder" value={holder} onChange={setHolder}
          options={[{ value: '', label: 'All' }, ...PERMIT_HOLDERS.map((p) => ({ value: p.id, label: p.name }))]} />
        <div className="flex items-center gap-1.5 p-1 rounded-md bg-neutral-50 border border-neutral-100">
          {(['all', 'Compliant', 'Non-Compliant'] as const).map((s) => (
            <button key={s} onClick={() => setStatusFilter(s)} className={cn('px-2.5 py-1 rounded text-[11px] font-semibold transition',
              statusFilter === s ? 'bg-white shadow-doe-xs text-ink-950' : 'text-neutral-500 hover:text-ink-950')}>{s === 'all' ? 'All' : s}</button>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-neutral-100 shadow-doe-xs overflow-hidden">
        <div className="grid grid-cols-[1fr_160px_140px_140px_120px_120px] gap-2 px-4 py-2 text-[10px] font-sans uppercase tracking-[0.16em] text-neutral-500 border-b border-neutral-100">
          <div>Driver · ID</div>
          <div>Permit Holder</div>
          <div>License</div>
          <div>ADCDA Training</div>
          <div>Vehicles</div>
          <div className="text-center">Compliance</div>
        </div>
        {visible.map((d) => <Row key={d.id} d={d} />)}
      </div>
    </div>
  );
}

function Row({ d }: { d: GasDriver }) {
  const compliance = driverCompliance(d);
  const today = new Date().toISOString().slice(0, 10);
  const licExpired = d.licenseExpiryDate < today;
  const trainExpired = d.adcdaTrainingStatus === 'Expired' || (d.certificateExpiryDate && d.certificateExpiryDate < today);
  return (
    <Link to={`/gas-register/drivers/${d.id}`}
      className="grid grid-cols-[1fr_160px_140px_140px_120px_120px] gap-2 px-4 py-3 items-center border-b border-neutral-100 last:border-b-0 hover:bg-neutral-25 transition">
      <div className="min-w-0">
        <div className="text-[12.5px] font-semibold text-ink-950 truncate">{d.driverName}</div>
        <div className="text-[10.5px] font-mono text-neutral-500 truncate">{d.id} · {d.idNumber}</div>
      </div>
      <div className="text-[11.5px] text-ink-950 truncate">{d.permitHolderName}</div>
      <div>
        <div className="text-[11.5px] font-mono text-ink-950">{d.licenseNumber}</div>
        <div className={cn('text-[10px] mt-0.5', licExpired ? 'text-doe-red font-semibold' : 'text-neutral-500')}>
          {d.licenseType} · exp {formatDate(d.licenseExpiryDate)}
        </div>
      </div>
      <div>
        <span className={cn('inline-flex items-center px-1.5 h-5 rounded text-[10px] font-semibold',
          d.adcdaTrainingStatus === 'Valid' ? 'bg-emerald-50 text-emerald-700' :
          d.adcdaTrainingStatus === 'Expired' ? 'bg-rose-50 text-doe-red' : 'bg-neutral-100 text-neutral-600')}>
          {d.adcdaTrainingStatus}
        </span>
        {d.certificateExpiryDate && (
          <div className={cn('text-[10px] mt-0.5', trainExpired ? 'text-doe-red' : 'text-neutral-500')}>
            exp {formatDate(d.certificateExpiryDate)}
          </div>
        )}
      </div>
      <div className="text-[11px] text-neutral-700 font-mono">{d.linkedVehicles.join(', ')}</div>
      <div className="text-center">
        <span className={cn('inline-flex items-center px-2 h-5 rounded-full text-[10px] font-semibold',
          compliance === 'Compliant' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-doe-red')}>
          {compliance}
        </span>
      </div>
    </Link>
  );
}

function KpiCell({ value, label, tone }: { value: string; label: string; tone: 'ink' | 'success' | 'danger' }) {
  const text = tone === 'success' ? 'text-emerald-600' : tone === 'danger' ? 'text-doe-red' : 'text-ink-950';
  return (
    <div className="px-4 py-3">
      <div className="text-[9.5px] font-sans uppercase tracking-[0.18em] text-neutral-500">{label}</div>
      <div className={cn('font-display font-bold text-[20px] mt-0.5 tabular-nums', text)}>{value}</div>
    </div>
  );
}
function FilterSelect({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: { value: string; label: string }[] }) {
  return (
    <label className="flex items-center gap-2 text-[11px]">
      <span className="font-sans uppercase tracking-wider text-neutral-500">{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)}
        className="px-2 py-1.5 rounded-md border border-neutral-200 text-[12px] focus:outline-none focus:border-action-orange max-w-[200px] truncate">
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </label>
  );
}
function SyncIcon() {
  return <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10"/><path d="M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>;
}
function formatDate(iso: string): string { return iso ? new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'; }
