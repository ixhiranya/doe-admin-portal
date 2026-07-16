import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { listConnectionEvents, type ConnectionEvent, type ConnectionAction } from '../../services/gasRegister/connection';
import { PERMIT_HOLDERS } from '../../services/gasRegister/assets';
import { cn } from '../../lib/utils';

// =============================================================================
// Connection & Disconnection · List — BN 13 of the Gas Register SDD.
// =============================================================================

export function ConnectionListPage() {
  const all = useMemo(() => listConnectionEvents(), []);
  const [search, setSearch] = useState('');
  const [holder, setHolder] = useState('');
  const [action, setAction] = useState<'all' | ConnectionAction>('all');

  const visible = useMemo(() => all.filter((e) => {
    if (holder && e.permitHolderId !== holder) return false;
    if (action !== 'all' && e.action !== action) return false;
    if (search) {
      const q = search.toLowerCase();
      const hay = [e.id, e.customerName, e.permitHolderName, e.reason, e.action].join(' ').toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  }), [all, holder, action, search]);

  const counts = useMemo(() => ({
    total: all.length,
    connects: all.filter((e) => e.action === 'Connect').length,
    disconnects: all.filter((e) => e.action === 'Disconnect').length,
    suspends: all.filter((e) => e.action === 'Suspend').length,
    reconnects: all.filter((e) => e.action === 'Reconnect').length,
  }), [all]);

  return (
    <div className="max-w-[1400px] mx-auto px-6 pt-5 pb-10">
      <div className="flex items-center justify-between text-[12px] mb-5">
        <nav className="text-neutral-500">
          <Link to="/pps-dashboard" className="hover:text-doe-red">Home</Link>
          <span className="mx-2 text-neutral-300">›</span>
          <span>Gas Register</span>
          <span className="mx-2 text-neutral-300">›</span>
          <span className="text-ink-950 font-semibold">Connection & Disconnection</span>
        </nav>
        <div className="font-sans text-[11px] tracking-wider text-neutral-500 uppercase">BN 13 · Gas Register SDD</div>
      </div>

      <div className="card overflow-hidden mb-6">
        <div className="relative px-6 py-5 bg-gradient-to-br from-[#1E2128] via-[#262A33] to-[#1E2128] text-white">
          <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 70% 30%, #E11D48 0%, transparent 50%)' }} />
          <div className="relative flex items-center gap-6">
            <div className="w-12 h-12 rounded-xl bg-doe-red/90 grid place-items-center shadow-doe-md">🔌</div>
            <div className="flex-1">
              <div className="text-[10px] font-sans uppercase tracking-[0.22em] text-rose-200">Connection & Disconnection</div>
              <h1 className="font-display font-bold text-[22px] leading-tight mt-1">Supply State Log</h1>
              <p className="text-[12.5px] text-white/70 mt-1 max-w-[680px]">
                Complete history of <strong>Connect / Disconnect / Reconnect / Suspend</strong> actions per customer.
                Disconnected customers are hidden from the Outflow customer dropdown per SDD §3.13.
              </p>
            </div>
            <Link to="/gas-register/connection/new" className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-action-orange text-white font-semibold text-[11.5px] hover:bg-action-orange-dark shadow-doe-sm transition">
              <PlusIcon /> New Action
            </Link>
          </div>
        </div>
        <div className="grid grid-cols-5 divide-x divide-neutral-100 border-t border-neutral-100 bg-white">
          <KpiCell value={counts.total.toString()} label="Total events" tone="ink" />
          <KpiCell value={counts.connects.toString()} label="Connects" tone="success" />
          <KpiCell value={counts.disconnects.toString()} label="Disconnects" tone="danger" />
          <KpiCell value={counts.suspends.toString()} label="Suspends" tone="warning" />
          <KpiCell value={counts.reconnects.toString()} label="Reconnects" tone="info" />
        </div>
      </div>

      <div className="card p-3 mb-5 flex flex-wrap items-center gap-3">
        <div className="flex-1 min-w-[240px]">
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search customer / reason / event…"
            className="w-full px-3 py-2 text-[12.5px] border border-neutral-200 rounded-md focus:outline-none focus:border-action-orange" />
        </div>
        <FilterSelect label="Permit Holder" value={holder} onChange={setHolder}
          options={[{ value: '', label: 'All' }, ...PERMIT_HOLDERS.map((p) => ({ value: p.id, label: p.name }))]} />
        <div className="flex items-center gap-1.5 p-1 rounded-md bg-neutral-50 border border-neutral-100">
          {(['all', 'Connect', 'Disconnect', 'Reconnect', 'Suspend'] as const).map((a) => (
            <button key={a} onClick={() => setAction(a)} className={cn('px-2.5 py-1 rounded text-[11px] font-semibold transition',
              action === a ? 'bg-white shadow-doe-xs text-ink-950' : 'text-neutral-500 hover:text-ink-950')}>{a === 'all' ? 'All' : a}</button>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-neutral-100 shadow-doe-xs overflow-hidden">
        <div className="grid grid-cols-[110px_1fr_140px_140px_140px_120px] gap-2 px-4 py-2 text-[10px] font-sans uppercase tracking-[0.16em] text-neutral-500 border-b border-neutral-100">
          <div>Action</div>
          <div>Customer</div>
          <div>Reason</div>
          <div>Meter Reading</div>
          <div>Performed By</div>
          <div>Effective Date</div>
        </div>
        {visible.map((e) => <Row key={e.id} e={e} />)}
      </div>
    </div>
  );
}

function Row({ e }: { e: ConnectionEvent }) {
  return (
    <Link to={`/gas-register/connection/${e.id}`}
      className="grid grid-cols-[110px_1fr_140px_140px_140px_120px] gap-2 px-4 py-3 items-center border-b border-neutral-100 last:border-b-0 hover:bg-neutral-25 transition">
      <div>
        <span className={cn('inline-flex items-center px-2 h-5 rounded-full text-[10px] font-semibold',
          e.action === 'Connect'    ? 'bg-emerald-50 text-emerald-700' :
          e.action === 'Disconnect' ? 'bg-rose-50 text-doe-red' :
          e.action === 'Suspend'    ? 'bg-amber-50 text-amber-700' :
          'bg-info-soft text-info-500')}>
          {e.action}
        </span>
      </div>
      <div className="min-w-0">
        <div className="text-[12.5px] font-semibold text-ink-950 truncate">{e.customerName}</div>
        <div className="text-[10.5px] font-mono text-neutral-500 truncate">{e.id} · {e.permitHolderName}</div>
      </div>
      <div className="text-[11.5px] text-ink-950">{e.reason}</div>
      <div className="font-mono text-[11px] text-ink-950 tabular-nums">
        {e.meterReadingLiters !== undefined ? (
          <>
            <div>{e.meterReadingLiters.toLocaleString()} L</div>
            {e.meterReadingScm !== undefined && <div className="text-[10px] text-neutral-500">{e.meterReadingScm.toLocaleString()} SCM</div>}
          </>
        ) : '—'}
      </div>
      <div className="text-[11px] text-neutral-700 truncate">{e.performedBy}</div>
      <div className="text-[11px] text-neutral-700 tabular-nums">{formatDate(e.effectiveDate)}</div>
    </Link>
  );
}

function KpiCell({ value, label, tone }: { value: string; label: string; tone: 'ink' | 'success' | 'danger' | 'warning' | 'info' }) {
  const text =
    tone === 'success' ? 'text-emerald-600' :
    tone === 'danger'  ? 'text-doe-red' :
    tone === 'warning' ? 'text-amber-700' :
    tone === 'info'    ? 'text-info-500' :
    'text-ink-950';
  return (
    <div className="px-4 py-3">
      <div className="text-[9.5px] font-sans uppercase tracking-[0.18em] text-neutral-500">{label}</div>
      <div className={cn('font-display font-bold text-[18px] mt-0.5 tabular-nums', text)}>{value}</div>
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
function PlusIcon() { return <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>; }
function formatDate(iso: string): string { return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }); }
