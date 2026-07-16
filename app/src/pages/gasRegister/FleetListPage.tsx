import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  listFleet, sourceLabel, formatLiters, PERMIT_HOLDERS, VEHICLE_TYPES,
  type GasFleet, type AssetSource,
} from '../../services/gasRegister/fleet';
import { cn } from '../../lib/utils';

type SourceFilter = 'all' | AssetSource;
type TypeFilter = 'all' | string;

export function FleetListPage() {
  const all = useMemo(() => listFleet(), []);
  const [search, setSearch] = useState('');
  const [holder, setHolder] = useState<string>('');
  const [source, setSource] = useState<SourceFilter>('all');
  const [vehicleType, setVehicleType] = useState<TypeFilter>('all');

  const kpis = useMemo(() => {
    const totalCap = all.reduce((s, f) => s + f.vehicleDesignationCapacityLiters, 0);
    const tankers  = all.filter((f) => /TANKER|TRANSPORTER/i.test(f.typeOfVehicle)).length;
    const trucks   = all.filter((f) => /TRUCK/i.test(f.typeOfVehicle)).length;
    return { count: all.length, totalCap, tankers, trucks };
  }, [all]);

  const visible = useMemo(() => {
    return all.filter((f) => {
      if (holder && f.permitHolderId !== holder) return false;
      if (source !== 'all' && f.source !== source) return false;
      if (vehicleType !== 'all' && f.typeOfVehicle !== vehicleType) return false;
      if (search) {
        const q = search.toLowerCase();
        const hay = [f.id, f.plateNumber, f.trafficId, f.permitHolderName, f.typeOfVehicle, f.civilDefenceCertificateNumber].join(' ').toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [all, holder, source, vehicleType, search]);

  return (
    <div className="max-w-[1400px] mx-auto px-6 pt-5 pb-10">
      <div className="flex items-center justify-between text-[12px] mb-5">
        <nav className="text-neutral-500">
          <Link to="/pps-dashboard" className="hover:text-doe-red">Home</Link>
          <span className="mx-2 text-neutral-300">›</span>
          <span>Gas Register</span>
          <span className="mx-2 text-neutral-300">›</span>
          <span className="text-ink-950 font-semibold">Fleet Master</span>
        </nav>
        <div className="font-sans text-[11px] tracking-wider text-neutral-500 uppercase">
          Vehicles · Tankers · Cylinder carriers
        </div>
      </div>

      <div className="card overflow-hidden mb-6">
        <div className="relative px-6 py-6 bg-gradient-to-br from-[#1E2128] via-[#262A33] to-[#1E2128] text-white">
          <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 20% 30%, #E89B4C 0%, transparent 50%), radial-gradient(circle at 80% 70%, #0E76A8 0%, transparent 50%)' }} />
          <div className="relative flex items-center gap-6">
            <div className="w-14 h-14 rounded-xl bg-action-orange/90 grid place-items-center shadow-doe-md">
              <TruckIcon />
            </div>
            <div className="flex-1">
              <div className="text-[10px] font-sans uppercase tracking-[0.22em] text-action-orange-soft">Gas Register · Fleet Master</div>
              <h1 className="font-display font-bold text-[24px] leading-tight mt-1">Every gas transport vehicle on file.</h1>
              <p className="text-[12.5px] text-white/70 mt-1 max-w-[640px]">
                Tankers, cylinder carriers, and inspection vehicles registered against each permit holder, with Civil Defence certification and inspection history on record.
              </p>
            </div>
            {/* BN 4 · SDD §3.4 — Manual add is removed; only ASATEEL sync allowed. */}
            <div className="flex flex-col items-end gap-1">
              <button
                onClick={() => { /* prototype: synchronisation stub */ }}
                title="Synchronise the fleet list with ASATEEL"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-action-orange text-white font-semibold text-[11.5px] hover:bg-action-orange-dark shadow-doe-sm transition"
              >
                <RefreshIcon /> Fetch Data from ASATEEL
              </button>
              <span className="text-[9.5px] font-sans uppercase tracking-[0.16em] text-action-orange-soft">
                Manual add disabled · ASATEEL is source of truth
              </span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-4 divide-x divide-neutral-100 border-t border-neutral-100 bg-white">
          <Kpi value={kpis.count.toLocaleString()}     label="Vehicles on file"      tone="ink"   active={vehicleType === 'all'} onClick={() => setVehicleType('all')} />
          <Kpi value={kpis.trucks.toLocaleString()}    label="Cylinder trucks"        tone="info"  active={false}                  onClick={() => {}} />
          <Kpi value={kpis.tankers.toLocaleString()}   label="Bulk tankers"           tone="amber" active={false}                  onClick={() => {}} />
          <Kpi value={formatLiters(kpis.totalCap)}     label="Combined bulk capacity" tone="ink"   active={false}                  onClick={() => {}} />
        </div>
      </div>

      <div className="card p-3 mb-5 flex flex-wrap items-center gap-3">
        <div className="flex-1 min-w-[240px] relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" /></svg>
          </span>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by plate, traffic ID, permit holder, vehicle type, CDC number…"
            className="w-full pl-9 pr-3 py-2 text-[12.5px] border border-neutral-200 rounded-md focus:outline-none focus:border-action-orange"
          />
        </div>
        <label className="flex items-center gap-2 text-[11px]">
          <span className="font-sans uppercase tracking-wider text-neutral-500">Permit holder</span>
          <select value={holder} onChange={(e) => setHolder(e.target.value)} className="px-2 py-1.5 rounded-md border border-neutral-200 text-[12px] focus:outline-none focus:border-action-orange">
            <option value="">All</option>
            {PERMIT_HOLDERS.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </label>
        <label className="flex items-center gap-2 text-[11px]">
          <span className="font-sans uppercase tracking-wider text-neutral-500">Vehicle type</span>
          <select value={vehicleType} onChange={(e) => setVehicleType(e.target.value)} className="px-2 py-1.5 rounded-md border border-neutral-200 text-[12px] focus:outline-none focus:border-action-orange">
            <option value="all">All</option>
            {VEHICLE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </label>
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

      {visible.length === 0 ? (
        <div className="card p-10 text-center">
          <div className="text-4xl mb-2">🚛</div>
          <div className="font-display font-bold text-[15px] text-ink-950">No vehicles match these filters</div>
          <div className="text-[12px] text-neutral-500 mt-1">Try clearing the search or filters.</div>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-neutral-100 shadow-doe-xs overflow-hidden">
          <div className="px-4 py-2 border-b border-neutral-100 bg-neutral-25/60 flex items-center justify-between">
            <div className="text-[11px] text-neutral-500">
              Showing <span className="font-bold text-ink-950">{visible.length}</span> of {all.length} vehicles
            </div>
            <div className="text-[10px] font-sans uppercase tracking-[0.18em] text-neutral-400">
              Sorted by permit holder · plate
            </div>
          </div>
          <Header />
          <div>
            {visible.map((f) => <Row key={f.id} f={f} />)}
          </div>
        </div>
      )}
    </div>
  );
}

function Header() {
  return (
    <div className="grid grid-cols-[100px_1.4fr_160px_140px_140px_120px_110px] gap-2 px-4 py-2 text-[10px] font-sans uppercase tracking-[0.16em] text-neutral-500 border-b border-neutral-100 bg-white">
      <div>Plate</div>
      <div>Vehicle type</div>
      <div>Permit holder</div>
      <div>Source</div>
      <div>CDC number</div>
      <div className="text-right">Capacity</div>
      <div className="text-right">Inspection</div>
    </div>
  );
}

function Row({ f }: { f: GasFleet }) {
  return (
    <Link
      to={`/gas-register/fleet/${f.id}`}
      className="grid grid-cols-[100px_1.4fr_160px_140px_140px_120px_110px] gap-2 px-4 py-3 items-center border-b border-neutral-100 last:border-b-0 hover:bg-neutral-25 transition"
    >
      <div>
        <div className="font-display font-bold text-[14px] text-ink-950">{f.plateNumber}</div>
        <div className="text-[10.5px] font-mono text-neutral-500 mt-0.5">{f.id}</div>
      </div>
      <div className="min-w-0">
        <div className="text-[12.5px] font-semibold text-ink-950 truncate">{f.typeOfVehicle}</div>
        <div className="text-[10.5px] text-neutral-500 truncate mt-0.5">{f.unitType} · Traffic {f.trafficId}</div>
      </div>
      <div className="text-[12px] text-neutral-700 truncate">{f.permitHolderName}</div>
      <div><SourceChip s={f.source} /></div>
      <div className="font-mono text-[11.5px] text-ink-950 truncate">{f.civilDefenceCertificateNumber}</div>
      <div className="text-right font-mono text-[12px] text-ink-950 tabular-nums">
        {f.vehicleDesignationCapacityLiters > 0 ? formatLiters(f.vehicleDesignationCapacityLiters) : '—'}
      </div>
      <div className="text-right text-[11.5px] text-neutral-700 tabular-nums">{formatDate(f.dateOfInspection)}</div>
    </Link>
  );
}

function Kpi({ value, label, tone, active, onClick }: {
  value: string; label: string; tone: 'ink' | 'info' | 'amber'; active: boolean; onClick: () => void;
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
      <div className={cn('font-display font-bold text-[20px] mt-0.5', toneText)}>{value}</div>
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

function TruckIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="1" y="3" width="15" height="13" />
      <polygon points="16 8 20 8 23 11 23 16 16 16 16 8" />
      <circle cx="5.5" cy="18.5" r="2.5" />
      <circle cx="18.5" cy="18.5" r="2.5" />
    </svg>
  );
}

function RefreshIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="23 4 23 10 17 10" />
      <polyline points="1 20 1 14 7 14" />
      <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
    </svg>
  );
}
