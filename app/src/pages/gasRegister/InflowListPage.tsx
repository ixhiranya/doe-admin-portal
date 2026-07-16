import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { listInflow, formatLiters, PERMIT_HOLDERS, type DailyInflow } from '../../services/gasRegister/gasFlow';
import { cn } from '../../lib/utils';

export function InflowListPage() {
  const all = useMemo(() => listInflow(), []);
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [holder, setHolder] = useState<string>('');

  const kpis = useMemo(() => {
    const total = all.reduce((s, r) => s + r.volumeLiters, 0);
    const today = new Date().toISOString().slice(0, 10);
    const todayCount = all.filter((r) => r.date === today).length;
    const last7 = all.filter((r) => {
      const days = Math.floor((Date.now() - new Date(r.date).getTime()) / 86_400_000);
      return days >= 0 && days < 7;
    }).length;
    return { count: all.length, total, todayCount, last7 };
  }, [all]);

  const visible = useMemo(() => {
    return all.filter((r) => {
      if (holder && r.permitHolderId !== holder) return false;
      if (search) {
        const q = search.toLowerCase();
        const hay = [r.id, r.supplierName, r.assetName, r.gasType, r.permitHolderName].join(' ').toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [all, holder, search]);

  return (
    <div className="max-w-[1400px] mx-auto px-6 pt-5 pb-10">
      <div className="flex items-center justify-between text-[12px] mb-5">
        <nav className="text-neutral-500">
          <Link to="/pps-dashboard" className="hover:text-doe-red">Home</Link>
          <span className="mx-2 text-neutral-300">›</span>
          <span>Gas Register</span>
          <span className="mx-2 text-neutral-300">›</span>
          <span className="text-ink-950 font-semibold">Daily Inflow</span>
        </nav>
        <div className="font-sans text-[11px] tracking-wider text-neutral-500 uppercase">
          Gas received · From registered suppliers
        </div>
      </div>

      <div className="card overflow-hidden mb-6">
        <div className="relative px-6 py-6 bg-gradient-to-br from-[#1E2128] via-[#262A33] to-[#1E2128] text-white">
          <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 20% 30%, #E89B4C 0%, transparent 50%), radial-gradient(circle at 80% 70%, #0E76A8 0%, transparent 50%)' }} />
          <div className="relative flex items-center gap-6">
            <div className="w-14 h-14 rounded-xl bg-action-orange/90 grid place-items-center shadow-doe-md">
              <InflowIcon />
            </div>
            <div className="flex-1">
              <div className="text-[10px] font-sans uppercase tracking-[0.22em] text-action-orange-soft">Gas Register · Daily Inflow</div>
              <h1 className="font-display font-bold text-[24px] leading-tight mt-1">Gas received · daily log.</h1>
              <p className="text-[12.5px] text-white/70 mt-1 max-w-[640px]">
                Daily volumes purchased from registered suppliers and received into the permit holder's storage assets.
              </p>
            </div>
            <button
              onClick={() => navigate('/gas-register/inflow/new')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-action-orange text-white font-semibold text-[11.5px] hover:bg-action-orange-dark shadow-doe-sm transition"
            >
              <span className="text-[14px] leading-none">+</span> Submit inflow
            </button>
          </div>
        </div>

        <div className="grid grid-cols-4 divide-x divide-neutral-100 border-t border-neutral-100 bg-white">
          <Kpi value={kpis.count.toLocaleString()}    label="Submissions on file" tone="ink" />
          <Kpi value={formatLiters(kpis.total)}       label="Total volume received" tone="info" />
          <Kpi value={kpis.last7.toLocaleString()}    label="Last 7 days"          tone="amber" />
          <Kpi value={kpis.todayCount.toLocaleString()} label="Today"             tone="ink" />
        </div>
      </div>

      <div className="card p-3 mb-5 flex flex-wrap items-center gap-3">
        <div className="flex-1 min-w-[240px] relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" /></svg>
          </span>
          <input value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by supplier, asset, gas type, permit holder…"
            className="w-full pl-9 pr-3 py-2 text-[12.5px] border border-neutral-200 rounded-md focus:outline-none focus:border-action-orange" />
        </div>
        <label className="flex items-center gap-2 text-[11px]">
          <span className="font-sans uppercase tracking-wider text-neutral-500">Permit holder</span>
          <select value={holder} onChange={(e) => setHolder(e.target.value)} className="px-2 py-1.5 rounded-md border border-neutral-200 text-[12px] focus:outline-none focus:border-action-orange">
            <option value="">All</option>
            {PERMIT_HOLDERS.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </label>
      </div>

      {visible.length === 0 ? (
        <div className="card p-10 text-center">
          <div className="text-4xl mb-2">⬇️</div>
          <div className="font-display font-bold text-[15px] text-ink-950">No inflow records match these filters</div>
          <div className="text-[12px] text-neutral-500 mt-1">Try clearing the search or permit-holder filter.</div>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-neutral-100 shadow-doe-xs overflow-hidden">
          <div className="px-4 py-2 border-b border-neutral-100 bg-neutral-25/60 flex items-center justify-between">
            <div className="text-[11px] text-neutral-500">
              Showing <span className="font-bold text-ink-950">{visible.length}</span> of {all.length} submissions
            </div>
            <div className="text-[10px] font-sans uppercase tracking-[0.18em] text-neutral-400">Sorted by date · most recent first</div>
          </div>
          <Header />
          <div>
            {visible.map((r) => <Row key={r.id} r={r} />)}
          </div>
        </div>
      )}
    </div>
  );
}

function Header() {
  return (
    <div className="grid grid-cols-[110px_1.4fr_180px_160px_140px_120px] gap-2 px-4 py-2 text-[10px] font-sans uppercase tracking-[0.16em] text-neutral-500 border-b border-neutral-100 bg-white">
      <div>Date</div>
      <div>Supplier · Gas type</div>
      <div>Storage asset</div>
      <div>Permit holder</div>
      <div className="text-right">Volume</div>
      <div className="text-right">Submission ID</div>
    </div>
  );
}

function Row({ r }: { r: DailyInflow }) {
  return (
    <Link to={`/gas-register/inflow/${r.id}`}
      className="grid grid-cols-[110px_1.4fr_180px_160px_140px_120px] gap-2 px-4 py-3 items-center border-b border-neutral-100 last:border-b-0 hover:bg-neutral-25 transition">
      <div className="text-[12.5px] text-ink-950 tabular-nums">{formatDate(r.date)}</div>
      <div className="min-w-0">
        <div className="text-[12.5px] font-semibold text-ink-950 truncate">{r.supplierName}</div>
        <div className="text-[10.5px] text-neutral-500 truncate mt-0.5">{r.gasType}</div>
      </div>
      <div className="text-[12px] text-neutral-700 truncate">{r.assetName}</div>
      <div className="text-[12px] text-neutral-700 truncate">{r.permitHolderName}</div>
      <div className="text-right font-display font-bold text-[13px] text-ink-950 tabular-nums">{formatLiters(r.volumeLiters)}</div>
      <div className="text-right text-[10.5px] font-mono text-neutral-500">{r.id}</div>
    </Link>
  );
}

function Kpi({ value, label, tone }: { value: string; label: string; tone: 'ink' | 'info' | 'amber' }) {
  const toneText = tone === 'info' ? 'text-info-500' : tone === 'amber' ? 'text-warning-500' : 'text-ink-950';
  return (
    <div className="px-4 py-3">
      <div className="text-[9.5px] font-sans uppercase tracking-[0.18em] text-neutral-500">{label}</div>
      <div className={cn('font-display font-bold text-[20px] mt-0.5', toneText)}>{value}</div>
    </div>
  );
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function InflowIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 5v14" /><polyline points="19 12 12 19 5 12" />
    </svg>
  );
}
