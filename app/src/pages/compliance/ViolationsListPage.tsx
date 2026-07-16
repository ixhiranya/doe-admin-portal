// =============================================================================
// Compliance · Violations Register — list page
// -----------------------------------------------------------------------------
// SDD §4.1 — single canonical register. KPI strip + filter bar + sortable
// table. Per-row severity pill, state chip, offence-count badge, age, penalty.
// Click → ViolationDetailPage.
// =============================================================================
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  listViolations, summary, STATE_LABEL, SOURCE_LABEL, PERMIT_TYPE_LABEL,
  formatAed, severityTone,
} from '../../services/compliance/violations';
import { SEVERITY_LABEL } from '../../services/compliance/severity';
import type {
  Violation, ViolationSeverity, ViolationSource, ViolationState, ViolationPermitType,
} from '../../types';
import { cn } from '../../lib/utils';

type SeverityFilter = 'all' | ViolationSeverity;
type SourceFilter   = 'all' | ViolationSource;
type StateFilter    = 'all' | 'open' | 'closed' | ViolationState;
type PermitFilter   = 'all' | ViolationPermitType;

export function ViolationsListPage() {
  const all = useMemo(() => listViolations(), []);
  const kpis = useMemo(() => summary(), []);
  const [search, setSearch]     = useState('');
  const [severity, setSeverity] = useState<SeverityFilter>('all');
  const [source, setSource]     = useState<SourceFilter>('all');
  const [stateF, setStateF]     = useState<StateFilter>('all');
  const [permit, setPermit]     = useState<PermitFilter>('all');

  const visible = useMemo(() => {
    return all.filter((v) => {
      if (severity !== 'all' && v.severity !== severity) return false;
      if (source !== 'all' && v.source !== source) return false;
      if (permit !== 'all' && v.permitType !== permit) return false;
      if (stateF === 'open' && (v.state.startsWith('closed') || v.state === 'paid')) return false;
      if (stateF === 'closed' && !v.state.startsWith('closed') && v.state !== 'paid') return false;
      if (stateF !== 'all' && stateF !== 'open' && stateF !== 'closed' && v.state !== stateF) return false;
      if (search) {
        const q = search.toLowerCase();
        const hay = [v.id, v.violationCode, v.title, v.licensee.name, v.licensee.tradeLicenceNumber ?? '', v.sourceReference].join(' ').toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [all, severity, source, stateF, permit, search]);

  return (
    <div className="max-w-[1400px] mx-auto px-6 pt-5 pb-10">
      {/* Breadcrumb */}
      <nav className="text-[12px] text-neutral-500 mb-5">
        <Link to="/pps-dashboard" className="hover:text-doe-red">Home</Link>
        <span className="mx-2 text-neutral-300">›</span>
        <span>Compliance & Enforcement</span>
        <span className="mx-2 text-neutral-300">›</span>
        <span className="text-ink-950 font-semibold">Violations Register</span>
      </nav>

      {/* Hero */}
      <div className="card overflow-hidden mb-4">
        <div className="relative px-6 py-6 bg-gradient-to-br from-[#1E2128] via-[#262A33] to-[#1E2128] text-white">
          <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 20% 30%, #DC2626 0%, transparent 50%), radial-gradient(circle at 80% 70%, #E89B4C 0%, transparent 50%)' }} />
          <div className="relative flex items-center gap-6">
            <div className="w-14 h-14 rounded-xl bg-doe-red/90 grid place-items-center shadow-doe-md"><ShieldIcon /></div>
            <div className="flex-1 min-w-0">
              <div className="text-[10px] font-sans uppercase tracking-[0.22em] text-rose-200">Compliance & Enforcement · Violations Register · SDD §4</div>
              <h1 className="font-display font-bold text-[24px] leading-tight mt-1">Every violation across the platform.</h1>
              <p className="text-[12.5px] text-white/70 mt-1 max-w-[720px]">
                Single canonical register fed by Mobile Inspection, TPI Conformity, Sampling Fails, Incident Reports and Compliance Assessments. Triage queue for DoE Engineers; auto-routed for administrative or VAP Committee decision.
              </p>
            </div>
          </div>
        </div>

        {/* KPI strip */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 divide-x divide-neutral-100 border-t border-neutral-100 bg-white">
          <Kpi label="Open"             value={kpis.open}                tone="info"    onClick={() => setStateF('open')}      active={stateF === 'open'} />
          <Kpi label="Critical (open)"  value={kpis.critical}            tone="danger"  onClick={() => setSeverity('critical')} active={severity === 'critical'} />
          <Kpi label="Pending VAP"      value={kpis.pendingVap}          tone="warning" onClick={() => setStateF('pending_committee_review')} active={stateF === 'pending_committee_review'} />
          <Kpi label="Penalty outstanding" value={kpis.penaltyOutstanding} tone="warning" onClick={() => setStateF('penalty_outstanding')} active={stateF === 'penalty_outstanding'} />
          <Kpi label="SLA breached"     value={kpis.slaBreach}           tone="danger" />
          <Kpi label="Outstanding AED"  value={formatAed(kpis.outstandingAed)} tone="ink" />
        </div>
      </div>

      {/* Filter bar */}
      <div className="card p-3 mb-4 flex items-center gap-3 flex-wrap">
        <div className="flex-1 min-w-[240px] relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" /></svg>
          </span>
          <input
            value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by ID, code, title, licensee, trade licence, source reference…"
            className="w-full pl-9 pr-3 py-2 text-[12.5px] border border-neutral-200 rounded-md focus:outline-none focus:border-action-orange"
          />
        </div>
        <Select label="Severity" value={severity} onChange={(v) => setSeverity(v as SeverityFilter)}
          options={[
            { value: 'all', label: 'All severities' },
            { value: 'critical', label: 'Critical' },
            { value: 'major', label: 'Major' },
            { value: 'minor', label: 'Minor' },
            { value: 'informational', label: 'Informational' },
          ]} />
        <Select label="Source" value={source} onChange={(v) => setSource(v as SourceFilter)}
          options={[
            { value: 'all', label: 'All sources' },
            { value: 'mobile_inspection', label: 'Mobile Inspection' },
            { value: 'tpi_conformity', label: 'TPI Conformity' },
            { value: 'sampling_fail', label: 'Sampling Fail' },
            { value: 'incident_report', label: 'Incident Report' },
            { value: 'compliance_assessment', label: 'Compliance Assessment' },
          ]} />
        <Select label="Permit type" value={permit} onChange={(v) => setPermit(v as PermitFilter)}
          options={[
            { value: 'all', label: 'All permit types' },
            { value: 'gas_company_registration', label: 'Gas Co. Registration' },
            { value: 'hoe_tpi_registration', label: 'HOE / TPI' },
            { value: 'amc', label: 'AMC' },
            { value: 'noc', label: 'NOC' },
            { value: 'coc', label: 'COC' },
            { value: 'maes', label: 'MAES' },
            { value: 'tadawel', label: 'Tadawel' },
          ]} />
        <button onClick={() => { setSearch(''); setSeverity('all'); setSource('all'); setStateF('all'); setPermit('all'); }}
          className="text-[11.5px] text-neutral-500 hover:text-doe-red px-2">Reset</button>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="px-4 py-2 border-b border-neutral-100 bg-neutral-25/60 flex items-center justify-between flex-wrap gap-2">
          <div className="text-[11px] text-neutral-500">
            Showing <span className="font-bold text-ink-950">{visible.length}</span> of {all.length} violations
          </div>
          <div className="flex items-center gap-1">
            <button className="px-3 py-1.5 rounded-md text-[11.5px] font-semibold bg-white border border-neutral-200 text-ink-950 hover:border-action-orange">Excel</button>
            <button className="px-3 py-1.5 rounded-md text-[11.5px] font-semibold bg-white border border-neutral-200 text-ink-950 hover:border-action-orange">PDF</button>
            <button className="px-3 py-1.5 rounded-md text-[11.5px] font-semibold bg-action-orange text-white shadow-doe-sm hover:bg-action-orange-dark">Export</button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1100px]">
            <thead className="bg-white text-[10px] uppercase tracking-[0.16em] text-neutral-500 border-b border-neutral-100">
              <tr>
                <th className="text-left px-4 py-2.5">Violation</th>
                <th className="text-left px-4 py-2.5">Licensee</th>
                <th className="text-left px-4 py-2.5">Source</th>
                <th className="text-center px-3 py-2.5">Severity</th>
                <th className="text-center px-3 py-2.5">Offence</th>
                <th className="text-left px-4 py-2.5">State</th>
                <th className="text-right px-4 py-2.5">Penalty</th>
                <th className="text-right px-4 py-2.5">Age</th>
              </tr>
            </thead>
            <tbody>
              {visible.length === 0 ? (
                <tr><td colSpan={8} className="px-5 py-12 text-center text-[12.5px] text-neutral-500">No violations match the current filters.</td></tr>
              ) : visible.map((v) => <Row key={v.id} v={v} />)}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Atoms
// ============================================================================
function Row({ v }: { v: Violation }) {
  const ageDays = Math.floor((Date.now() - new Date(v.createdAt).getTime()) / 86_400_000);
  return (
    <tr className="border-b border-neutral-100 last:border-b-0 hover:bg-neutral-25 transition">
      <td className="px-4 py-3">
        <Link to={`/compliance/violations/${v.id}`} className="block">
          <div className="font-mono text-[10.5px] text-neutral-500">{v.id}</div>
          <div className="text-[12.5px] font-semibold text-ink-950 leading-tight mt-0.5 truncate max-w-[280px]">{v.title}</div>
          <div className="text-[10.5px] text-neutral-500 mt-0.5">
            <span className="font-mono">{v.violationCode}</span> · {PERMIT_TYPE_LABEL[v.permitType]}
          </div>
        </Link>
      </td>
      <td className="px-4 py-3">
        <div className="text-[12px] text-ink-950 truncate max-w-[180px]">{v.licensee.name}</div>
        <div className="text-[10.5px] font-mono text-neutral-500 mt-0.5">{v.licensee.tradeLicenceNumber ?? '—'}</div>
      </td>
      <td className="px-4 py-3 text-[11.5px]">
        <div className="text-ink-950">{SOURCE_LABEL[v.source]}</div>
        <div className="font-mono text-[10.5px] text-neutral-500 mt-0.5">{v.sourceReference}</div>
      </td>
      <td className="px-3 py-3 text-center"><SeverityPill s={v.severity} /></td>
      <td className="px-3 py-3 text-center">
        <span className={cn('inline-flex items-center justify-center w-6 h-5 rounded text-[10px] font-bold',
          v.offenceCount === 1 ? 'bg-neutral-100 text-neutral-600' :
          v.offenceCount === 2 ? 'bg-amber-50 text-amber-700 ring-1 ring-amber-500/30' :
                                 'bg-rose-50 text-doe-red ring-1 ring-doe-red/30')}>
          {v.offenceCount}
        </span>
      </td>
      <td className="px-4 py-3"><StateChip s={v.state} /></td>
      <td className="px-4 py-3 text-right">
        {v.penaltyAed > 0
          ? <span className="font-mono text-[12px] text-ink-950 tabular-nums">{formatAed(v.penaltyAed)}</span>
          : <span className="text-[11px] text-neutral-400">—</span>}
      </td>
      <td className="px-4 py-3 text-right font-mono text-[11.5px] text-neutral-700 tabular-nums whitespace-nowrap">{ageDays}d</td>
    </tr>
  );
}

function SeverityPill({ s }: { s: ViolationSeverity }) {
  const tone = severityTone(s);
  const cls = tone === 'danger'  ? 'bg-rose-50 text-doe-red ring-doe-red/30'
            : tone === 'warning' ? 'bg-amber-50 text-amber-700 ring-amber-500/40'
            : tone === 'info'    ? 'bg-info-soft text-info-500 ring-info-500/30'
                                 : 'bg-neutral-100 text-neutral-600 ring-neutral-300';
  return (
    <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide ring-1 whitespace-nowrap', cls)}>
      {SEVERITY_LABEL[s]}
    </span>
  );
}

function StateChip({ s }: { s: ViolationState }) {
  const cls =
    s === 'identified' ? 'bg-info-soft text-info-500' :
    s === 'under_review' ? 'bg-info-soft text-info-500' :
    s === 'pending_admin_decision' ? 'bg-amber-50 text-amber-700' :
    s === 'pending_committee_review' ? 'bg-info-soft text-info-500' :
    s === 'decision_recorded' ? 'bg-emerald-50 text-emerald-700' :
    s === 'penalty_outstanding' ? 'bg-amber-50 text-amber-700' :
    s === 'cross_gov_enforcement_triggered' ? 'bg-rose-50 text-doe-red' :
    s === 'appeal_submitted' ? 'bg-orange-50 text-orange-700' :
    s === 'appeal_decided' ? 'bg-orange-50 text-orange-700' :
    s === 'paid' ? 'bg-emerald-50 text-emerald-700' :
    s === 'closed_resolved' ? 'bg-emerald-50 text-emerald-700' :
    s === 'closed_no_action' ? 'bg-neutral-100 text-neutral-600' :
    'bg-neutral-100 text-neutral-600';
  return (
    <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold whitespace-nowrap', cls)}>
      {STATE_LABEL[s]}
    </span>
  );
}

function Kpi({ label, value, tone, onClick, active }: {
  label: string; value: string | number; tone: 'info' | 'warning' | 'danger' | 'ink';
  onClick?: () => void; active?: boolean;
}) {
  const cls = tone === 'info' ? 'text-info-500' : tone === 'warning' ? 'text-amber-700' : tone === 'danger' ? 'text-doe-red' : 'text-ink-950';
  return (
    <button type="button" onClick={onClick} disabled={!onClick}
      className={cn('px-4 py-3 text-left transition', onClick && 'hover:bg-neutral-25', active && 'bg-neutral-25')}>
      <div className="text-[10px] font-sans uppercase tracking-[0.18em] text-neutral-500">{label}</div>
      <div className={cn('font-display font-bold mt-1 tabular-nums leading-none', cls, typeof value === 'string' ? 'text-[15px]' : 'text-[20px]')}>{value}</div>
    </button>
  );
}

function Select({ label, value, onChange, options }: {
  label: string; value: string; onChange: (v: string) => void; options: { value: string; label: string }[];
}) {
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

function ShieldIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}
