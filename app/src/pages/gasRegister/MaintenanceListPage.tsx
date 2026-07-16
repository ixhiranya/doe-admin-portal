import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { listMaintenance, type MaintenanceRecord, type MaintenanceActivityType } from '../../services/gasRegister/maintenance';
import { PERMIT_HOLDERS } from '../../services/gasRegister/assets';
import { cn } from '../../lib/utils';

// =============================================================================
// Maintenance & Operational Records · List — BN 15 of the Gas Register SDD.
// =============================================================================

export function MaintenanceListPage() {
  const all = useMemo(() => listMaintenance(), []);
  const [search, setSearch] = useState('');
  const [holder, setHolder] = useState('');
  const [type, setType] = useState<'all' | MaintenanceActivityType>('all');

  const visible = useMemo(() => all.filter((r) => {
    if (holder && r.permitHolderId !== holder) return false;
    if (type !== 'all' && r.activityType !== type) return false;
    if (search) {
      const q = search.toLowerCase();
      const hay = [r.id, r.facilityName, r.permitHolderName, r.activityType, r.performedByName, r.description].join(' ').toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  }), [all, holder, type, search]);

  return (
    <div className="max-w-[1400px] mx-auto px-6 pt-5 pb-10">
      <div className="flex items-center justify-between text-[12px] mb-5">
        <nav className="text-neutral-500">
          <Link to="/pps-dashboard" className="hover:text-doe-red">Home</Link>
          <span className="mx-2 text-neutral-300">›</span>
          <span>Gas Register</span>
          <span className="mx-2 text-neutral-300">›</span>
          <span className="text-ink-950 font-semibold">Maintenance Records</span>
        </nav>
        <div className="font-sans text-[11px] tracking-wider text-neutral-500 uppercase">BN 15 · Gas Register SDD</div>
      </div>

      <div className="card overflow-hidden mb-6">
        <div className="relative px-6 py-5 bg-gradient-to-br from-[#1E2128] via-[#262A33] to-[#1E2128] text-white">
          <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 80% 30%, #6366F1 0%, transparent 50%)' }} />
          <div className="relative flex items-center gap-6">
            <div className="w-12 h-12 rounded-xl bg-indigo-600 grid place-items-center shadow-doe-md">🔧</div>
            <div className="flex-1">
              <div className="text-[10px] font-sans uppercase tracking-[0.22em] text-indigo-200">Maintenance & Operational</div>
              <h1 className="font-display font-bold text-[22px] leading-tight mt-1">Facility Activity Log</h1>
              <p className="text-[12.5px] text-white/70 mt-1 max-w-[680px]">
                System modifications, material changes, gas-detector and sensor calibration, preventive and corrective maintenance per SDD §3.15.
              </p>
            </div>
            <Link to="/gas-register/maintenance/new" className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-action-orange text-white font-semibold text-[11.5px] hover:bg-action-orange-dark shadow-doe-sm transition">
              <PlusIcon /> Submit Maintenance Record
            </Link>
          </div>
        </div>
      </div>

      <div className="card p-3 mb-5 flex flex-wrap items-center gap-3">
        <div className="flex-1 min-w-[240px]">
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search facility / engineer / activity…"
            className="w-full px-3 py-2 text-[12.5px] border border-neutral-200 rounded-md focus:outline-none focus:border-action-orange" />
        </div>
        <FilterSelect label="Permit Holder" value={holder} onChange={setHolder}
          options={[{ value: '', label: 'All' }, ...PERMIT_HOLDERS.map((p) => ({ value: p.id, label: p.name }))]} />
        <FilterSelect label="Activity" value={type} onChange={(v) => setType(v as any)}
          options={[{ value: 'all', label: 'All' }, ...(['System Modification', 'Material Change', 'Gas Detector Calibration', 'Sensor Calibration', 'Preventive Maintenance', 'Corrective Maintenance', 'Other'] as MaintenanceActivityType[]).map((t) => ({ value: t, label: t }))]} />
      </div>

      <div className="bg-white rounded-xl border border-neutral-100 shadow-doe-xs overflow-hidden">
        <div className="grid grid-cols-[1fr_160px_180px_120px_120px_120px] gap-2 px-4 py-2 text-[10px] font-sans uppercase tracking-[0.16em] text-neutral-500 border-b border-neutral-100">
          <div>Facility</div>
          <div>Activity</div>
          <div>Performed By</div>
          <div>Calibration</div>
          <div>Activity Date</div>
          <div>Next Due</div>
        </div>
        {visible.map((r) => <Row key={r.id} r={r} />)}
      </div>
    </div>
  );
}

function Row({ r }: { r: MaintenanceRecord }) {
  const today = new Date().toISOString().slice(0, 10);
  const overdue = r.nextDueDate && r.nextDueDate < today;
  return (
    <Link to={`/gas-register/maintenance/${r.id}`}
      className="grid grid-cols-[1fr_160px_180px_120px_120px_120px] gap-2 px-4 py-3 items-center border-b border-neutral-100 last:border-b-0 hover:bg-neutral-25 transition">
      <div className="min-w-0">
        <div className="text-[12.5px] font-semibold text-ink-950 truncate">{r.facilityName}</div>
        <div className="text-[10.5px] text-neutral-500 truncate">{r.permitHolderName}</div>
      </div>
      <div className="text-[11.5px] text-ink-950 truncate">{r.activityType}</div>
      <div className="min-w-0">
        <div className="text-[11.5px] text-ink-950 truncate">{r.performedByName}</div>
        <div className="text-[10px] text-neutral-500 mt-0.5">{r.performedByRole}</div>
      </div>
      <div>
        {r.calibrationResult ? (
          <span className={cn('inline-flex items-center px-1.5 h-5 rounded text-[10px] font-semibold',
            r.calibrationResult === 'Pass'           ? 'bg-emerald-50 text-emerald-700' :
            r.calibrationResult === 'Pass with Notes' ? 'bg-amber-50 text-amber-700' :
            r.calibrationResult === 'Fail'           ? 'bg-rose-50 text-doe-red' :
            'bg-neutral-100 text-neutral-600')}>{r.calibrationResult}</span>
        ) : <span className="text-[11px] text-neutral-400">—</span>}
      </div>
      <div className="text-[11px] text-neutral-700 tabular-nums">{formatDate(r.activityDate)}</div>
      <div className={cn('text-[11px] tabular-nums', overdue ? 'text-doe-red font-semibold' : 'text-neutral-700')}>
        {r.nextDueDate ? formatDate(r.nextDueDate) : '—'}
      </div>
    </Link>
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
function PlusIcon() { return <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>; }
function formatDate(iso: string): string { return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }); }
