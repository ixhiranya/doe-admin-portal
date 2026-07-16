import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { listEngineers, engineerCompliance, type GasEngineer, type EngineerProfession } from '../../services/gasRegister/engineers';
import { PERMIT_HOLDERS } from '../../services/gasRegister/assets';
import { cn } from '../../lib/utils';

// =============================================================================
// Engineers Master · List — BN 7 of the Gas Register SDD.
// Source: ASATEEL or DOE Engineer Registration · no manual add.
// =============================================================================

export function EngineersListPage() {
  const engineers = useMemo(() => listEngineers(), []);
  const [search, setSearch] = useState('');
  const [holder, setHolder] = useState('');
  const [profession, setProfession] = useState<'all' | EngineerProfession>('all');

  const visible = useMemo(() => engineers.filter((e) => {
    if (holder && e.permitHolderId !== holder) return false;
    if (profession !== 'all' && e.profession !== profession) return false;
    if (search) {
      const q = search.toLowerCase();
      const hay = [e.id, e.name, e.idNumber, e.qualification, e.permitHolderName, e.profession].join(' ').toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  }), [engineers, holder, profession, search]);

  const counts = useMemo(() => ({
    total: engineers.length,
    compliant: engineers.filter((e) => engineerCompliance(e) === 'Compliant').length,
    nonCompliant: engineers.filter((e) => engineerCompliance(e) === 'Non-Compliant').length,
  }), [engineers]);

  return (
    <div className="max-w-[1400px] mx-auto px-6 pt-5 pb-10">
      <div className="flex items-center justify-between text-[12px] mb-5">
        <nav className="text-neutral-500">
          <Link to="/pps-dashboard" className="hover:text-doe-red">Home</Link>
          <span className="mx-2 text-neutral-300">›</span>
          <span>Gas Register</span>
          <span className="mx-2 text-neutral-300">›</span>
          <span className="text-ink-950 font-semibold">Engineers Master</span>
        </nav>
        <div className="font-sans text-[11px] tracking-wider text-neutral-500 uppercase">BN 7 · Gas Register SDD</div>
      </div>

      <div className="card overflow-hidden mb-6">
        <div className="relative px-6 py-5 bg-gradient-to-br from-[#1E2128] via-[#262A33] to-[#1E2128] text-white">
          <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 20% 30%, #7B3FE4 0%, transparent 50%)' }} />
          <div className="relative flex items-center gap-6">
            <div className="w-12 h-12 rounded-xl bg-[#7B3FE4]/90 grid place-items-center shadow-doe-md">👷</div>
            <div className="flex-1">
              <div className="text-[10px] font-sans uppercase tracking-[0.22em] text-violet-200">Engineers Master Data</div>
              <h1 className="font-display font-bold text-[22px] leading-tight mt-1">Qualified Gas Engineers</h1>
              <p className="text-[12.5px] text-white/70 mt-1 max-w-[640px]">
                Fetched from <strong>ASATEEL</strong> or <strong>DOE Engineer Registration</strong> · ADQCC certification +
                government-entity conformity tracking per SDD §3.7.
              </p>
            </div>
            <button className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-white text-ink-950 font-semibold text-[11.5px] hover:bg-neutral-50 shadow-doe-sm transition">
              <SyncIcon /> Fetch from ASATEEL
            </button>
          </div>
        </div>
        <div className="grid grid-cols-3 divide-x divide-neutral-100 border-t border-neutral-100 bg-white">
          <KpiCell value={counts.total.toString()} label="Total engineers" tone="ink" />
          <KpiCell value={counts.compliant.toString()} label="ADQCC Compliant" tone="success" />
          <KpiCell value={counts.nonCompliant.toString()} label="Action Required" tone="danger" />
        </div>
      </div>

      <div className="card p-3 mb-5 flex flex-wrap items-center gap-3">
        <div className="flex-1 min-w-[240px]">
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search engineer / EID / qualification…"
            className="w-full px-3 py-2 text-[12.5px] border border-neutral-200 rounded-md focus:outline-none focus:border-action-orange" />
        </div>
        <FilterSelect label="Permit Holder" value={holder} onChange={setHolder}
          options={[{ value: '', label: 'All' }, ...PERMIT_HOLDERS.map((p) => ({ value: p.id, label: p.name }))]} />
        <FilterSelect label="Profession" value={profession} onChange={(v) => setProfession(v as any)}
          options={[{ value: 'all', label: 'All' }, ...(['Mechanical', 'Civil', 'Chemical', 'Electrical', 'Petroleum', 'Other'] as EngineerProfession[]).map((p) => ({ value: p, label: p }))]} />
      </div>

      <div className="bg-white rounded-xl border border-neutral-100 shadow-doe-xs overflow-hidden">
        <div className="grid grid-cols-[1fr_160px_140px_140px_140px_120px] gap-2 px-4 py-2 text-[10px] font-sans uppercase tracking-[0.16em] text-neutral-500 border-b border-neutral-100">
          <div>Engineer · ID</div>
          <div>Permit Holder</div>
          <div>Profession</div>
          <div>ADQCC</div>
          <div>Gov Conformity</div>
          <div className="text-center">Compliance</div>
        </div>
        {visible.map((e) => <Row key={e.id} e={e} />)}
      </div>
    </div>
  );
}

function Row({ e }: { e: GasEngineer }) {
  const compliance = engineerCompliance(e);
  return (
    <Link to={`/gas-register/engineers/${e.id}`}
      className="grid grid-cols-[1fr_160px_140px_140px_140px_120px] gap-2 px-4 py-3 items-center border-b border-neutral-100 last:border-b-0 hover:bg-neutral-25 transition">
      <div className="min-w-0">
        <div className="text-[12.5px] font-semibold text-ink-950 truncate">{e.name}</div>
        <div className="text-[10.5px] font-mono text-neutral-500 truncate">{e.id} · {e.idNumber}</div>
      </div>
      <div className="text-[11.5px] text-ink-950 truncate">{e.permitHolderName}</div>
      <div>
        <div className="text-[11.5px] text-ink-950">{e.profession}</div>
        <div className="text-[10px] text-neutral-500 mt-0.5 truncate">{e.qualification}</div>
      </div>
      <div>
        <span className={cn('inline-flex items-center px-1.5 h-5 rounded text-[10px] font-semibold',
          e.adqccStatus === 'Valid' ? 'bg-emerald-50 text-emerald-700' :
          e.adqccStatus === 'Expired' ? 'bg-rose-50 text-doe-red' : 'bg-neutral-100 text-neutral-600')}>
          {e.adqccStatus}
        </span>
        {e.certificateExpiryDate && <div className="text-[10px] text-neutral-500 mt-0.5">exp {formatDate(e.certificateExpiryDate)}</div>}
      </div>
      <div className="text-[11px] text-neutral-700">{e.govEntityConformity}</div>
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
        className="px-2 py-1.5 rounded-md border border-neutral-200 text-[12px] focus:outline-none focus:border-action-orange">
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </label>
  );
}
function SyncIcon() {
  return <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10"/><path d="M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>;
}
function formatDate(iso: string): string { return iso ? new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'; }
