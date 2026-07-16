import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { listFleetMovements, type FleetMovement } from '../../services/gasRegister/fleetMovement';
import { PERMIT_HOLDERS } from '../../services/gasRegister/assets';
import { formatVolumeDual, gasTypeById, productTypeById } from '../../services/gasRegister/technical';
import { cn } from '../../lib/utils';

// =============================================================================
// Fleet Movement · List — BN 11 of the Gas Register SDD.
// All driver/operator/vehicle data is fetched from ASATEEL. Gas-specific quantity
// + gas/product type + unit are submitted by the Gas System Company.
// =============================================================================

export function FleetMovementListPage() {
  const all = useMemo(() => listFleetMovements(), []);
  const [search, setSearch] = useState('');
  const [holder, setHolder] = useState('');
  const [status, setStatus] = useState<'all' | FleetMovement['status']>('all');

  const visible = useMemo(() => all.filter((m) => {
    if (holder && m.permitHolderId !== holder) return false;
    if (status !== 'all' && m.status !== status) return false;
    if (search) {
      const q = search.toLowerCase();
      const hay = [m.id, m.trafficId, m.permissionNumber, m.driverName, m.operatorName, m.vehiclePlate, m.originFacilityName, m.destinationName].join(' ').toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  }), [all, holder, status, search]);

  const counts = useMemo(() => ({
    total: all.length,
    delivered: all.filter((m) => m.status === 'Delivered').length,
    inTransit: all.filter((m) => m.status === 'In Transit').length,
    pending: all.filter((m) => m.status === 'Pending Submission').length,
  }), [all]);

  return (
    <div className="max-w-[1400px] mx-auto px-6 pt-5 pb-10">
      <div className="flex items-center justify-between text-[12px] mb-5">
        <nav className="text-neutral-500">
          <Link to="/pps-dashboard" className="hover:text-doe-red">Home</Link>
          <span className="mx-2 text-neutral-300">›</span>
          <span>Gas Register</span>
          <span className="mx-2 text-neutral-300">›</span>
          <span className="text-ink-950 font-semibold">Fleet Movement</span>
        </nav>
        <div className="font-sans text-[11px] tracking-wider text-neutral-500 uppercase">BN 11 · Gas Register SDD</div>
      </div>

      <div className="card overflow-hidden mb-6">
        <div className="relative px-6 py-5 bg-gradient-to-br from-[#1E2128] via-[#262A33] to-[#1E2128] text-white">
          <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 30% 30%, #0F766E 0%, transparent 50%)' }} />
          <div className="relative flex items-center gap-6">
            <div className="w-12 h-12 rounded-xl bg-teal-700 grid place-items-center shadow-doe-md">🛣️</div>
            <div className="flex-1">
              <div className="text-[10px] font-sans uppercase tracking-[0.22em] text-teal-200">Fleet Movement</div>
              <h1 className="font-display font-bold text-[22px] leading-tight mt-1">Gas Transportation Movements</h1>
              <p className="text-[12.5px] text-white/70 mt-1 max-w-[680px]">
                Driver / operator / vehicle / route data fetched from <strong>ASATEEL</strong>. Gas-specific quantity
                (in L or SCM), gas type and product type are submitted via the end-of-trip report (BN 11).
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-white text-ink-950 font-semibold text-[11.5px] hover:bg-neutral-50 shadow-doe-sm transition">
                <SyncIcon /> Fetch from ASATEEL
              </button>
              <Link to="/gas-register/fleet-movement/new" className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-action-orange text-white font-semibold text-[11.5px] hover:bg-action-orange-dark shadow-doe-sm transition">
                <PlusIcon /> Submit Movement Report
              </Link>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-4 divide-x divide-neutral-100 border-t border-neutral-100 bg-white">
          <KpiCell value={counts.total.toString()} label="Total movements" tone="ink" />
          <KpiCell value={counts.delivered.toString()} label="Delivered" tone="success" />
          <KpiCell value={counts.inTransit.toString()} label="In Transit" tone="info" />
          <KpiCell value={counts.pending.toString()} label="Pending Submission" tone="warning" />
        </div>
      </div>

      <div className="card p-3 mb-5 flex flex-wrap items-center gap-3">
        <div className="flex-1 min-w-[240px]">
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search traffic ID / permission / driver / plate…"
            className="w-full px-3 py-2 text-[12.5px] border border-neutral-200 rounded-md focus:outline-none focus:border-action-orange" />
        </div>
        <FilterSelect label="Permit Holder" value={holder} onChange={setHolder}
          options={[{ value: '', label: 'All' }, ...PERMIT_HOLDERS.map((p) => ({ value: p.id, label: p.name }))]} />
        <div className="flex items-center gap-1.5 p-1 rounded-md bg-neutral-50 border border-neutral-100">
          {(['all', 'Delivered', 'In Transit', 'Pending Submission'] as const).map((s) => (
            <button key={s} onClick={() => setStatus(s)} className={cn('px-2.5 py-1 rounded text-[11px] font-semibold transition',
              status === s ? 'bg-white shadow-doe-xs text-ink-950' : 'text-neutral-500 hover:text-ink-950')}>{s === 'all' ? 'All' : s}</button>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-neutral-100 shadow-doe-xs overflow-hidden">
        <div className="grid grid-cols-[140px_1fr_140px_140px_160px_120px_120px] gap-2 px-4 py-2 text-[10px] font-sans uppercase tracking-[0.16em] text-neutral-500 border-b border-neutral-100">
          <div>Traffic ID</div>
          <div>Driver · Plate</div>
          <div>Gas Type</div>
          <div>Quantity</div>
          <div>Origin → Destination</div>
          <div>Date / Time</div>
          <div>Status</div>
        </div>
        {visible.map((m) => <Row key={m.id} m={m} />)}
      </div>
    </div>
  );
}

function Row({ m }: { m: FleetMovement }) {
  const gas = gasTypeById(m.gasType);
  const product = productTypeById(m.productType);
  return (
    <Link to={`/gas-register/fleet-movement/${m.id}`}
      className="grid grid-cols-[140px_1fr_140px_140px_160px_120px_120px] gap-2 px-4 py-3 items-center border-b border-neutral-100 last:border-b-0 hover:bg-neutral-25 transition">
      <div className="font-mono text-[11px] text-ink-950 truncate">{m.trafficId}</div>
      <div className="min-w-0">
        <div className="text-[12.5px] font-semibold text-ink-950 truncate">{m.driverName}</div>
        <div className="text-[10.5px] font-mono text-neutral-500 truncate">{m.vehiclePlate} · {m.permissionNumber}</div>
      </div>
      <div>
        <div className="text-[11.5px] text-ink-950">{gas?.shortLabel ?? m.gasType}</div>
        <div className="text-[10px] text-neutral-500 mt-0.5 truncate">{product?.label}</div>
      </div>
      <div className="font-mono text-[11.5px] text-ink-950 tabular-nums">
        {formatVolumeDual(m.quantity, m.unit, m.gasType)}
      </div>
      <div className="min-w-0">
        <div className="text-[11px] text-ink-950 truncate">{m.originFacilityName}</div>
        <div className="text-[10px] text-neutral-500 mt-0.5 truncate">→ {m.destinationName}</div>
      </div>
      <div className="text-[10.5px] text-neutral-700">{formatDateTime(m.movementDateTime)}</div>
      <div>
        <span className={cn('inline-flex items-center px-2 h-5 rounded-full text-[10px] font-semibold',
          m.status === 'Delivered'        ? 'bg-emerald-50 text-emerald-700' :
          m.status === 'In Transit'       ? 'bg-info-soft text-info-500' :
          'bg-amber-50 text-amber-700')}>
          {m.status}
        </span>
      </div>
    </Link>
  );
}

function KpiCell({ value, label, tone }: { value: string; label: string; tone: 'ink' | 'success' | 'info' | 'warning' }) {
  const text = tone === 'success' ? 'text-emerald-600' : tone === 'info' ? 'text-info-500' : tone === 'warning' ? 'text-amber-700' : 'text-ink-950';
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
function PlusIcon() { return <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>; }
function formatDateTime(iso: string): string { return new Date(iso).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }); }
