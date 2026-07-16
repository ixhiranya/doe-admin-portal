import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  listEmployees, employeeSourceLabel, PERMIT_HOLDERS,
  type GasEmployee, type EmployeeSource, type Gender,
} from '../../services/gasRegister/employees';
import { cn } from '../../lib/utils';

type SourceFilter = 'all' | EmployeeSource;
type GenderFilter = 'all' | Gender;

export function EmployeesListPage() {
  const all = useMemo(() => listEmployees(), []);
  const [search, setSearch] = useState('');
  const [holder, setHolder] = useState<string>('');
  const [source, setSource] = useState<SourceFilter>('all');
  const [gender, setGender] = useState<GenderFilter>('all');

  const kpis = useMemo(() => {
    const male   = all.filter((e) => e.gender === 'Male').length;
    const female = all.filter((e) => e.gender === 'Female').length;
    const expiringSoon = all.filter((e) => {
      const days = (new Date(e.certificateExpiryDate).getTime() - Date.now()) / 86_400_000;
      return days >= 0 && days <= 90;
    }).length;
    return { count: all.length, male, female, expiringSoon };
  }, [all]);

  const visible = useMemo(() => {
    return all.filter((e) => {
      if (holder && e.permitHolderId !== holder) return false;
      if (source !== 'all' && e.source !== source) return false;
      if (gender !== 'all' && e.gender !== gender) return false;
      if (search) {
        const q = search.toLowerCase();
        const hay = [e.id, e.name, e.permitHolderName, e.jobId, e.emiratesId, e.section, e.professionInDetail, e.email].join(' ').toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [all, holder, source, gender, search]);

  return (
    <div className="max-w-[1400px] mx-auto px-6 pt-5 pb-10">
      <div className="flex items-center justify-between text-[12px] mb-5">
        <nav className="text-neutral-500">
          <Link to="/pps-dashboard" className="hover:text-doe-red">Home</Link>
          <span className="mx-2 text-neutral-300">›</span>
          <span>Gas Register</span>
          <span className="mx-2 text-neutral-300">›</span>
          <span className="text-ink-950 font-semibold">Employee Master</span>
        </nav>
        <div className="font-sans text-[11px] tracking-wider text-neutral-500 uppercase">
          Personnel · Permit-holder staff
        </div>
      </div>

      <div className="card overflow-hidden mb-6">
        <div className="relative px-6 py-6 bg-gradient-to-br from-[#1E2128] via-[#262A33] to-[#1E2128] text-white">
          <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 20% 30%, #E89B4C 0%, transparent 50%), radial-gradient(circle at 80% 70%, #0E76A8 0%, transparent 50%)' }} />
          <div className="relative flex items-center gap-6">
            <div className="w-14 h-14 rounded-xl bg-action-orange/90 grid place-items-center shadow-doe-md">
              <PeopleIcon />
            </div>
            <div className="flex-1">
              <div className="text-[10px] font-sans uppercase tracking-[0.22em] text-action-orange-soft">Gas Register · Employee Master</div>
              <h1 className="font-display font-bold text-[24px] leading-tight mt-1">Every gas-handling employee on file.</h1>
              <p className="text-[12.5px] text-white/70 mt-1 max-w-[640px]">
                Personnel working for permit holders, with their qualifications, gas-handling training, and certificate validity on record.
              </p>
            </div>
            {/* BN 5 · SDD §3.5 — Manual add is removed; only ASATEEL sync allowed. */}
            <div className="flex flex-col items-end gap-1">
              <button
                onClick={() => { /* prototype: synchronisation stub */ }}
                title="Synchronise the employee list with ASATEEL"
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
          <Kpi value={kpis.count}        label="Employees on file"     tone="ink"   active={gender === 'all'}    onClick={() => setGender('all')} />
          <Kpi value={kpis.male}         label="Male"                  tone="info"  active={gender === 'Male'}    onClick={() => setGender(gender === 'Male' ? 'all' : 'Male')} />
          <Kpi value={kpis.female}       label="Female"                tone="amber" active={gender === 'Female'}  onClick={() => setGender(gender === 'Female' ? 'all' : 'Female')} />
          <Kpi value={kpis.expiringSoon} label="Cert. expiring < 90d"  tone="red"   active={false}                onClick={() => {}} />
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
            placeholder="Search by name, job ID, Emirates ID, section, profession…"
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
        <div className="flex items-center gap-1.5 p-1 rounded-md bg-neutral-50 border border-neutral-100">
          {(['all', 'unified_platform', 'asateel', 'manual'] as const).map((s) => (
            <button
              key={s}
              onClick={() => setSource(s)}
              className={cn(
                'px-2.5 py-1 rounded text-[11px] font-semibold transition',
                source === s ? 'bg-white shadow-doe-xs text-ink-950' : 'text-neutral-500 hover:text-ink-950',
              )}
            >
              {s === 'all' ? 'All sources' : employeeSourceLabel(s as EmployeeSource)}
            </button>
          ))}
        </div>
      </div>

      {visible.length === 0 ? (
        <div className="card p-10 text-center">
          <div className="text-4xl mb-2">👷</div>
          <div className="font-display font-bold text-[15px] text-ink-950">No employees match these filters</div>
          <div className="text-[12px] text-neutral-500 mt-1">Try clearing the search or filters.</div>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-neutral-100 shadow-doe-xs overflow-hidden">
          <div className="px-4 py-2 border-b border-neutral-100 bg-neutral-25/60 flex items-center justify-between">
            <div className="text-[11px] text-neutral-500">
              Showing <span className="font-bold text-ink-950">{visible.length}</span> of {all.length} employees
            </div>
            <div className="text-[10px] font-sans uppercase tracking-[0.18em] text-neutral-400">
              Sorted by permit holder · name
            </div>
          </div>
          <Header />
          <div>
            {visible.map((e) => <Row key={e.id} e={e} />)}
          </div>
        </div>
      )}
    </div>
  );
}

function Header() {
  return (
    <div className="grid grid-cols-[1.4fr_160px_140px_110px_120px_120px] gap-2 px-4 py-2 text-[10px] font-sans uppercase tracking-[0.16em] text-neutral-500 border-b border-neutral-100 bg-white">
      <div>Employee</div>
      <div>Permit holder</div>
      <div>Section</div>
      <div>Source</div>
      <div className="text-right">Hired</div>
      <div className="text-right">Cert. expiry</div>
    </div>
  );
}

function Row({ e }: { e: GasEmployee }) {
  const days = Math.floor((new Date(e.certificateExpiryDate).getTime() - Date.now()) / 86_400_000);
  const certTone = days < 0 ? 'text-danger-500' : days < 90 ? 'text-warning-500' : 'text-ink-950';
  return (
    <Link
      to={`/gas-register/employees/${e.id}`}
      className="grid grid-cols-[1.4fr_160px_140px_110px_120px_120px] gap-2 px-4 py-3 items-center border-b border-neutral-100 last:border-b-0 hover:bg-neutral-25 transition"
    >
      <div className="min-w-0">
        <div className="text-[13px] font-semibold text-ink-950 truncate">{e.name}</div>
        <div className="text-[11px] text-neutral-500 mt-0.5 truncate font-mono">
          {e.id} · Job {e.jobId} · {e.gender}
        </div>
      </div>
      <div className="text-[12px] text-neutral-700 truncate">{e.permitHolderName}</div>
      <div className="text-[12px] text-neutral-700 truncate">{e.section}</div>
      <div><SourceChip s={e.source} /></div>
      <div className="text-right text-[12px] text-ink-950 tabular-nums">{formatDate(e.dateOfHiring)}</div>
      <div className={cn('text-right text-[12px] tabular-nums', certTone)}>{formatDate(e.certificateExpiryDate)}</div>
    </Link>
  );
}

function Kpi({ value, label, tone, active, onClick }: {
  value: number; label: string; tone: 'ink' | 'info' | 'amber' | 'red'; active: boolean; onClick: () => void;
}) {
  const toneText = tone === 'info' ? 'text-info-500' : tone === 'amber' ? 'text-warning-500' : tone === 'red' ? 'text-danger-500' : 'text-ink-950';
  const toneBar  = tone === 'info' ? 'bg-info-500'   : tone === 'amber' ? 'bg-warning-500'   : tone === 'red' ? 'bg-danger-500'   : 'bg-ink-950';
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

function SourceChip({ s }: { s: EmployeeSource }) {
  const meta: Record<EmployeeSource, { bg: string; text: string; ring: string }> = {
    asateel:          { bg: 'bg-info-soft',           text: 'text-info-500',          ring: 'ring-info-500/20' },
    unified_platform: { bg: 'bg-action-orange-soft',  text: 'text-action-orange-deep', ring: 'ring-action-orange/25' },
    manual:           { bg: 'bg-neutral-100',         text: 'text-neutral-600',       ring: 'ring-neutral-300/30' },
  };
  const m = meta[s];
  return (
    <span
      title={s === 'asateel' ? 'Fetched from ASATEEL' : s === 'unified_platform' ? 'Fetched from Unified Platform' : 'Manually entered'}
      className={cn('inline-flex items-center px-1.5 h-5 rounded-full text-[10px] font-semibold uppercase tracking-[0.08em] ring-1 whitespace-nowrap', m.bg, m.text, m.ring)}
    >
      {employeeSourceLabel(s)}
    </span>
  );
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function PeopleIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
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
