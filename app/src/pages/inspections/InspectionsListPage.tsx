import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useInspections } from '../../store/inspections';
import { useAuth } from '../../store/auth';
import { cn, formatDateTime } from '../../lib/utils';

// ============================================================================
// InspectionsListPage — web-side queue for the Mobile Inspection submissions.
// Shows everything the inspector pushed up from the mobile simulator. Section
// Head / Regulation Team / Senior Inspector see different KPIs.
// ============================================================================

type StatusFilter = 'all' | 'escalated' | 'in_review' | 'needs_cosign' | 'retained' | 'approved' | 'closed' | 'returned';

export function InspectionsListPage() {
  const user = useAuth((s) => s.user);
  const inspections = useInspections((s) => s.inspections);

  const [filter, setFilter] = useState<StatusFilter>('all');
  const [search, setSearch] = useState('');

  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    inspections.forEach((i) => { c[i.status] = (c[i.status] ?? 0) + 1; });
    return c;
  }, [inspections]);

  const visible = useMemo(() => {
    return inspections
      .slice()
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
      .filter((i) => {
        if (filter !== 'all' && i.status !== filter) return false;
        if (search) {
          const q = search.toLowerCase();
          const hay = `${i.inspectionNumber} ${i.buildingName} ${i.buildingUid} ${i.inspectorName} ${i.type}`.toLowerCase();
          if (!hay.includes(q)) return false;
        }
        return true;
      });
  }, [inspections, filter, search]);

  const criticalAwaitingCoSign = inspections.filter((i) => i.status === 'needs_cosign').length;

  return (
    <div className="max-w-[1400px] mx-auto px-6 pt-5 pb-10">
      {/* Breadcrumb */}
      <div className="flex items-center justify-between text-[12px] mb-5">
        <nav className="text-neutral-500">
          <Link to="/pps-dashboard" className="hover:text-doe-red">Home</Link>
          <span className="mx-2 text-neutral-300">›</span>
          <span className="text-ink-950 font-semibold">Mobile Inspections</span>
        </nav>
        <Link to="/mobile" className="text-[11px] uppercase tracking-wider text-doe-red font-semibold hover:underline">
          Open mobile simulator →
        </Link>
      </div>

      {/* Hero header */}
      <div className="card overflow-hidden mb-6">
        <div className="relative px-6 py-6 bg-gradient-to-br from-[#1E2128] via-[#262A33] to-[#1E2128] text-white">
          <div className="relative flex items-center gap-6">
            <div className="w-14 h-14 rounded-xl bg-action-orange/90 grid place-items-center shadow-doe-md">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="5" y="2" width="14" height="20" rx="2"/><line x1="12" y1="18" x2="12.01" y2="18"/></svg>
            </div>
            <div className="flex-1">
              <div className="text-[10px] uppercase tracking-[0.22em] text-action-orange-soft">DoE PPS · Mobile Inspection Field Submissions</div>
              <h1 className="font-display font-bold text-[24px] leading-tight mt-1">Inspection &amp; Enforcement Queue</h1>
              <p className="text-[12.5px] text-white/70 mt-1 max-w-[640px]">
                Every inspection submitted from the mobile app appears here. Section Head &amp; Regulation Team
                run the full review cycle: co-sign Critical findings, return for clarification, approve, or escalate to VAP.
              </p>
            </div>
            {criticalAwaitingCoSign > 0 && (
              <div className="bg-doe-red/85 px-3 py-2 rounded-lg">
                <div className="text-[10px] uppercase tracking-wider text-white/70">Critical · awaiting co-sign</div>
                <div className="text-[22px] font-bold leading-tight">{criticalAwaitingCoSign}</div>
              </div>
            )}
          </div>
        </div>

        {/* KPI tiles by status */}
        <div className="grid grid-cols-7 divide-x divide-neutral-100 border-t border-neutral-100 bg-white">
          <Kpi label="All"         value={inspections.length} active={filter === 'all'}        onClick={() => setFilter('all')}        tone="ink" />
          <Kpi label="Escalated"   value={counts.escalated ?? 0} active={filter === 'escalated'} onClick={() => setFilter('escalated')} tone="orange" />
          <Kpi label="In review"   value={counts.in_review ?? 0} active={filter === 'in_review'} onClick={() => setFilter('in_review')} tone="orange" />
          <Kpi label="Co-sign"     value={counts.needs_cosign ?? 0} active={filter === 'needs_cosign'} onClick={() => setFilter('needs_cosign')} tone="red" />
          <Kpi label="Retained"    value={counts.retained ?? 0} active={filter === 'retained'} onClick={() => setFilter('retained')} tone="blue" />
          <Kpi label="Returned"    value={counts.returned ?? 0} active={filter === 'returned'} onClick={() => setFilter('returned')} tone="amber" />
          <Kpi label="Approved/closed" value={(counts.approved ?? 0) + (counts.closed ?? 0)} active={filter === 'approved' || filter === 'closed'} onClick={() => setFilter('approved')} tone="green" />
        </div>
      </div>

      {/* Search bar */}
      <div className="flex items-center gap-2 mb-4">
        <div className="relative flex-1 max-w-md">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/></svg>
          </span>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by number, building, inspector…"
            className="w-full h-10 pl-8 pr-3 bg-white border border-neutral-200 rounded-md text-[13px] focus:outline-none focus:border-doe-red"
          />
        </div>
        <div className="text-[11.5px] text-neutral-500">{visible.length} of {inspections.length}</div>
      </div>

      {/* List */}
      {visible.length === 0 ? (
        <div className="bg-white rounded-xl border border-neutral-100 p-12 text-center">
          <div className="text-[15px] font-bold text-ink-950">No inspections match this filter.</div>
          <div className="text-[12.5px] text-neutral-500 mt-1">
            Open the <Link to="/mobile" className="text-doe-red underline">mobile simulator</Link>, sign in as inspector, and submit a field inspection to see it here.
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-neutral-100 overflow-hidden">
          <div className="grid grid-cols-[140px_minmax(0,1.5fr)_minmax(0,1fr)_120px_130px_140px_120px] gap-3 px-4 py-2.5 bg-neutral-50 text-[10.5px] font-semibold uppercase tracking-wider text-neutral-600">
            <div>Number</div>
            <div>Building</div>
            <div>Inspector</div>
            <div>Type</div>
            <div>Outcome</div>
            <div>Status</div>
            <div className="text-right">Updated</div>
          </div>
          {visible.map((i) => (
            <Link
              key={i.id}
              to={`/inspections/${i.id}`}
              className="grid grid-cols-[140px_minmax(0,1.5fr)_minmax(0,1fr)_120px_130px_140px_120px] gap-3 px-4 py-3 border-t border-neutral-50 hover:bg-action-orange-soft/30 transition items-center"
            >
              <div className="text-[12px] font-mono font-semibold text-ink-950 truncate">{i.inspectionNumber}</div>
              <div className="min-w-0">
                <div className="text-[12.5px] font-semibold text-ink-950 truncate">{i.buildingName}</div>
                <div className="text-[10.5px] text-neutral-500 truncate">{i.buildingUid} · {i.buildingAddress}</div>
              </div>
              <div className="text-[12px] text-ink-950 truncate">{i.inspectorName}</div>
              <div className="text-[11px] text-neutral-700 capitalize truncate">{i.type.replace(/_/g, ' ')}</div>
              <div>
                {i.overallOutcome ? (
                  <span className={cn(
                    'inline-flex items-center px-2 py-0.5 rounded-full text-[10.5px] font-semibold capitalize',
                    outcomeBadge(i.overallOutcome.result),
                  )}>{i.overallOutcome.result.replace(/_/g, ' ')}</span>
                ) : (
                  <span className="text-[10.5px] text-neutral-400">—</span>
                )}
                {i.violations.length > 0 && (
                  <div className="text-[10px] text-doe-red font-semibold mt-0.5">
                    {i.violations.length} violation{i.violations.length === 1 ? '' : 's'}
                    {i.violations.some((v) => v.severity === 'critical') && ' · ⚠ critical'}
                  </div>
                )}
              </div>
              <div>
                <span className={cn(
                  'inline-flex items-center px-2 py-0.5 rounded-full text-[10.5px] font-semibold capitalize',
                  statusBadge(i.status),
                )}>{i.status.replace(/_/g, ' ')}</span>
              </div>
              <div className="text-[10.5px] text-neutral-500 text-right">{formatDateTime(i.updatedAt)}</div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function Kpi({ label, value, active, onClick, tone }: { label: string; value: number; active: boolean; onClick: () => void; tone: 'ink' | 'green' | 'amber' | 'red' | 'orange' | 'blue' }) {
  const tones = {
    ink:    active ? 'bg-ink-950 text-white' : 'text-ink-950',
    green:  active ? 'bg-success-500 text-white' : 'text-success-500',
    amber:  active ? 'bg-warning-500 text-white' : 'text-warning-500',
    red:    active ? 'bg-doe-red text-white' : 'text-doe-red',
    orange: active ? 'bg-action-orange text-white' : 'text-action-orange-deep',
    blue:   active ? 'bg-info-500 text-white' : 'text-info-500',
  };
  return (
    <button onClick={onClick} className={cn('p-3 text-left transition flex flex-col gap-0.5', tones[tone], !active && 'hover:bg-neutral-50')}>
      <span className="text-[22px] font-bold leading-none">{value}</span>
      <span className="text-[10.5px] font-semibold uppercase tracking-wider opacity-90">{label}</span>
    </button>
  );
}

function statusBadge(s: string): string {
  switch (s) {
    case 'approved':     return 'bg-success-soft text-success-500';
    case 'retained':     return 'bg-info-soft text-info-500';
    case 'escalated':    return 'bg-action-orange-soft text-action-orange-deep';
    case 'in_review':    return 'bg-action-orange-soft text-action-orange-deep';
    case 'needs_cosign': return 'bg-doe-red-soft text-doe-red';
    case 'returned':     return 'bg-warning-soft text-warning-500';
    case 'closed':       return 'bg-neutral-100 text-neutral-700';
    case 'draft':        return 'bg-doe-red-soft text-doe-red';
    default:             return 'bg-neutral-100 text-neutral-700';
  }
}

function outcomeBadge(r: string): string {
  switch (r) {
    case 'compliant':              return 'bg-success-soft text-success-500';
    case 'compliant_with_warnings':return 'bg-warning-soft text-warning-500';
    case 'non_compliant':          return 'bg-doe-red-soft text-doe-red';
    default:                       return 'bg-neutral-100 text-neutral-600';
  }
}
