// =============================================================================
// Compliance & Enforcement Dashboard — SDD §7 + §4.17
// -----------------------------------------------------------------------------
// Visual landing for the module. KPI tiles, score-distribution histogram,
// sector heat-map of open Criticals, top repeat-offenders, recent VAP activity.
// Drills through to the underlying records.
// =============================================================================
import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  listViolations, summary, formatAed, STATE_LABEL, PERMIT_TYPE_LABEL,
} from '../../services/compliance/violations';
import { SEVERITY_LABEL, severityTone } from '../../services/compliance/severity';
import {
  allLicenseeScores, scoreHistogram, topRepeatOffenders, openCriticalByPermitType,
  bandColor,
} from '../../services/compliance/scoring';
import {
  listMeetings, MEETING_STATE_LABEL,
} from '../../services/compliance/vapCommittee';
import { ComplianceScoreInline } from '../../components/compliance/ComplianceScoreBadge';
import type { Violation, ViolationSeverity } from '../../types';
import { cn } from '../../lib/utils';

export function ComplianceDashboardPage() {
  const allViolations  = useMemo(() => listViolations(), []);
  const kpis           = useMemo(() => summary(), []);
  const scores         = useMemo(() => allLicenseeScores(), []);
  const histogram      = useMemo(() => scoreHistogram(scores), [scores]);
  const offenders      = useMemo(() => topRepeatOffenders(scores, 8), [scores]);
  const heatMap        = useMemo(() => openCriticalByPermitType(), []);
  const meetings       = useMemo(() => listMeetings(), []);
  const upcomingMtg    = meetings.find((m) => m.state === 'agenda_ready' || m.state === 'scheduled' || m.state === 'in_progress');

  const avgScore = scores.length === 0 ? 0 : Math.round(scores.reduce((s, x) => s + x.rate, 0) / scores.length);

  return (
    <div className="max-w-[1400px] mx-auto px-6 pt-5 pb-10">
      {/* Breadcrumb */}
      <nav className="text-[12px] text-neutral-500 mb-5">
        <Link to="/pps-dashboard" className="hover:text-doe-red">Home</Link>
        <span className="mx-2 text-neutral-300">›</span>
        <span>Compliance & Enforcement</span>
        <span className="mx-2 text-neutral-300">›</span>
        <span className="text-ink-950 font-semibold">Dashboard</span>
      </nav>

      {/* Hero */}
      <div className="card overflow-hidden mb-4">
        <div className="relative px-6 py-6 bg-gradient-to-br from-[#1E2128] via-[#262A33] to-[#1E2128] text-white">
          <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 20% 30%, #E89B4C 0%, transparent 50%), radial-gradient(circle at 80% 70%, #0E76A8 0%, transparent 50%)' }} />
          <div className="relative flex items-center gap-6">
            <div className="w-14 h-14 rounded-xl bg-doe-red/90 grid place-items-center shadow-doe-md"><DashboardIcon /></div>
            <div className="flex-1 min-w-0">
              <div className="text-[10px] font-sans uppercase tracking-[0.22em] text-rose-200">Compliance & Enforcement · SDD §7</div>
              <h1 className="font-display font-bold text-[24px] leading-tight mt-1">Live compliance and enforcement.</h1>
              <p className="text-[12.5px] text-white/70 mt-1 max-w-[720px]">
                Open violations, fines outstanding, active knockouts, repeat-offender heat-map, and the latest VAP Committee activity — all derived live from the Violations Register and the Scoring Engine.
              </p>
            </div>
          </div>
        </div>

        {/* KPI strip */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 divide-x divide-neutral-100 border-t border-neutral-100 bg-white">
          <Kpi label="Open violations"     value={kpis.open}                                tone="info" />
          <Kpi label="Critical open"       value={kpis.critical}                            tone="danger" />
          <Kpi label="Outstanding AED"     value={formatAed(kpis.outstandingAed)}           tone="warning" small />
          <Kpi label="SLA breached"        value={kpis.slaBreach}                           tone="danger" />
          <Kpi label="Avg compliance"      value={`${avgScore}%`}                            tone={avgScore >= 80 ? 'success' : avgScore >= 60 ? 'warning' : 'danger'} />
          <Kpi label="Total penalties"     value={formatAed(kpis.totalPenaltyAed)}          tone="ink" small />
        </div>
      </div>

      {/* Top row — score distribution + permit-type heat-map */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        {/* Score distribution histogram */}
        <div className="card overflow-hidden">
          <div className="px-5 py-3 border-b border-neutral-100">
            <div className="text-[11px] font-sans uppercase tracking-[0.18em] text-neutral-500">Score distribution</div>
            <div className="text-[11.5px] text-neutral-500 mt-0.5">{scores.length} licensee{scores.length === 1 ? '' : 's'} on file · band per SDD §3.3</div>
          </div>
          <div className="p-5">
            <ScoreHistogram data={histogram} />
            <div className="mt-3 grid grid-cols-4 gap-2 text-[10.5px]">
              {(['Block', 'Escalated', 'Conditional', 'Pass'] as const).map((band) => {
                const colour = bandColor(band);
                const count = scores.filter((s) => s.band === band).length;
                return (
                  <div key={band} className={cn('px-2 py-1.5 rounded ring-1', colour.bg, colour.ring)}>
                    <div className="flex items-center gap-1.5">
                      <span className={cn('w-1.5 h-1.5 rounded-full', colour.dot)} />
                      <span className={cn('font-semibold', colour.text)}>{band}</span>
                    </div>
                    <div className="text-[10px] text-neutral-500 mt-0.5">{count} licensee{count === 1 ? '' : 's'}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Sector heat-map */}
        <div className="card overflow-hidden">
          <div className="px-5 py-3 border-b border-neutral-100">
            <div className="text-[11px] font-sans uppercase tracking-[0.18em] text-neutral-500">Open Critical violations by permit type</div>
            <div className="text-[11.5px] text-neutral-500 mt-0.5">Where the regulator's attention is most urgent right now</div>
          </div>
          <div className="p-5">
            {heatMap.length === 0 ? (
              <div className="py-6 text-center text-[12.5px] text-emerald-700">No open Criticals across any permit type. ✓</div>
            ) : (
              <div className="space-y-2">
                {heatMap.map((row, i) => {
                  const max = heatMap[0].count;
                  return (
                    <div key={row.permitType} className="flex items-center gap-3">
                      <div className="w-44 text-[12px] text-ink-950 truncate">{PERMIT_TYPE_LABEL[row.permitType as keyof typeof PERMIT_TYPE_LABEL] ?? row.permitType}</div>
                      <div className="flex-1 h-5 bg-neutral-100 rounded-md overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-rose-300 to-doe-red rounded-md transition-all"
                          style={{ width: `${(row.count / max) * 100}%` }}
                        />
                      </div>
                      <div className="w-10 text-right font-mono text-[12px] text-ink-950 tabular-nums">{row.count}</div>
                      <span className={cn('inline-flex items-center justify-center w-6 h-5 rounded text-[9.5px] font-bold',
                        i === 0 ? 'bg-rose-50 text-doe-red' : 'bg-neutral-100 text-neutral-600')}>
                        #{i + 1}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Middle row — top repeat offenders + recent violations */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
        <div className="lg:col-span-2 card overflow-hidden">
          <div className="px-5 py-3 border-b border-neutral-100 flex items-center justify-between">
            <div>
              <div className="text-[11px] font-sans uppercase tracking-[0.18em] text-neutral-500">Top repeat offenders</div>
              <div className="text-[11.5px] text-neutral-500 mt-0.5">Weighted by open Critical (×3) + open Major (×2) + lifetime violations</div>
            </div>
            <Link to="/compliance/violations" className="text-[11px] text-action-orange-deep font-semibold hover:underline">Open register →</Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-neutral-25 text-[10px] uppercase tracking-[0.16em] text-neutral-500 border-b border-neutral-100">
                <tr>
                  <th className="text-left px-4 py-2.5">Licensee</th>
                  <th className="text-right px-3 py-2.5">Score</th>
                  <th className="text-right px-3 py-2.5">Open Critical</th>
                  <th className="text-right px-3 py-2.5">Open Major</th>
                  <th className="text-right px-3 py-2.5">Total</th>
                </tr>
              </thead>
              <tbody>
                {offenders.map((s, i) => (
                  <tr key={s.licenseeId} className="border-b border-neutral-100 last:border-b-0 hover:bg-neutral-25">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <span className={cn('inline-flex items-center justify-center w-6 h-6 rounded-full text-[10.5px] font-bold',
                          i === 0 ? 'bg-doe-red text-white' : i < 3 ? 'bg-rose-100 text-doe-red' : 'bg-neutral-100 text-neutral-600')}>
                          {i + 1}
                        </span>
                        <div>
                          <div className="text-[12.5px] font-semibold text-ink-950">{s.licenseeName}</div>
                          <div className="text-[10.5px] font-mono text-neutral-500 mt-0.5">{s.licenseeId}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3 text-right"><ComplianceScoreInline result={s} /></td>
                    <td className={cn('px-3 py-3 text-right font-mono text-[12px] tabular-nums', s.openCriticalCount > 0 ? 'text-doe-red font-semibold' : 'text-neutral-400')}>
                      {s.openCriticalCount}
                    </td>
                    <td className={cn('px-3 py-3 text-right font-mono text-[12px] tabular-nums', s.openMajorCount > 0 ? 'text-amber-700 font-semibold' : 'text-neutral-400')}>
                      {s.openMajorCount}
                    </td>
                    <td className="px-3 py-3 text-right font-mono text-[12px] text-ink-950 tabular-nums">{s.totalViolationsEver}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent violations sidebar */}
        <div className="card overflow-hidden">
          <div className="px-5 py-3 border-b border-neutral-100 flex items-center justify-between">
            <div>
              <div className="text-[11px] font-sans uppercase tracking-[0.18em] text-neutral-500">Latest activity</div>
              <div className="text-[11.5px] text-neutral-500 mt-0.5">Most recent violations on the register</div>
            </div>
          </div>
          <div className="max-h-[420px] overflow-auto">
            {allViolations.slice(0, 8).map((v) => <RecentRow key={v.id} v={v} />)}
          </div>
        </div>
      </div>

      {/* Bottom row — VAP queue */}
      <div className="card overflow-hidden">
        <div className="px-5 py-3 border-b border-neutral-100 flex items-center justify-between flex-wrap gap-2">
          <div>
            <div className="text-[11px] font-sans uppercase tracking-[0.18em] text-neutral-500">VAP Committee activity</div>
            <div className="text-[11.5px] text-neutral-500 mt-0.5">{kpis.pendingVap} item{kpis.pendingVap === 1 ? '' : 's'} awaiting committee review · next meeting {upcomingMtg ? new Date(upcomingMtg.scheduledAt).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : 'TBC'}</div>
          </div>
          <Link to="/compliance/vap" className="px-3 py-1.5 rounded-md text-[11.5px] font-semibold bg-info-500 text-white shadow-doe-sm hover:opacity-90">
            Open VAP workspace →
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-neutral-25 text-[10px] uppercase tracking-[0.16em] text-neutral-500 border-b border-neutral-100">
              <tr>
                <th className="text-left px-5 py-2.5">Meeting</th>
                <th className="text-left px-5 py-2.5">State</th>
                <th className="text-left px-5 py-2.5">Scheduled</th>
                <th className="text-right px-5 py-2.5">Agenda</th>
                <th className="text-right px-5 py-2.5">Attendance</th>
              </tr>
            </thead>
            <tbody>
              {meetings.slice(0, 5).map((m) => (
                <tr key={m.id} className="border-b border-neutral-100 last:border-b-0 hover:bg-neutral-25">
                  <td className="px-5 py-3">
                    <Link to={`/compliance/vap/${m.id}`} className="text-[12.5px] font-semibold text-action-orange-deep hover:underline">{m.meetingNumber}</Link>
                  </td>
                  <td className="px-5 py-3 text-[11.5px]">{MEETING_STATE_LABEL[m.state]}</td>
                  <td className="px-5 py-3 text-[12px] text-ink-950">{new Date(m.scheduledAt).toLocaleString('en-GB', { weekday: 'short', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</td>
                  <td className="px-5 py-3 text-right font-mono text-[12px] text-ink-950 tabular-nums">{m.agenda.length}</td>
                  <td className="px-5 py-3 text-right font-mono text-[12px] text-ink-950 tabular-nums">{m.attendedMemberIds.length} / {m.roster.filter((r) => r.role !== 'alternate').length}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Sub-components
// ============================================================================
function RecentRow({ v }: { v: Violation }) {
  const tone = severityTone(v.severity);
  const sevCls =
    tone === 'danger' ? 'bg-rose-50 text-doe-red' :
    tone === 'warning' ? 'bg-amber-50 text-amber-700' :
    tone === 'info' ? 'bg-info-soft text-info-500' :
    'bg-neutral-100 text-neutral-600';
  return (
    <Link to={`/compliance/violations/${v.id}`}
      className="flex items-start gap-2.5 px-3 py-2.5 border-t border-neutral-100 first:border-t-0 hover:bg-neutral-25">
      <span className={cn('inline-flex items-center w-14 justify-center px-1.5 h-4 rounded text-[9.5px] font-semibold uppercase tracking-wide', sevCls)}>
        {SEVERITY_LABEL[v.severity as ViolationSeverity]}
      </span>
      <div className="min-w-0 flex-1">
        <div className="text-[11.5px] font-semibold text-ink-950 leading-tight line-clamp-2">{v.title}</div>
        <div className="text-[10px] text-neutral-500 mt-0.5">
          <span className="font-mono">{v.id}</span>
          <span className="mx-1.5 text-neutral-300">·</span>
          {v.licensee.name}
        </div>
        <div className="text-[9.5px] text-neutral-400 mt-0.5">{STATE_LABEL[v.state]}</div>
      </div>
    </Link>
  );
}

function ScoreHistogram({ data }: { data: { label: string; count: number; band: string }[] }) {
  const max = Math.max(1, ...data.map((d) => d.count));
  return (
    <div className="grid grid-cols-5 items-end gap-3 h-[160px]">
      {data.map((d) => {
        const height = (d.count / max) * 100;
        const colour =
          d.band === 'Block'        ? 'from-doe-red to-rose-400'   :
          d.band === 'Escalated'    ? 'from-orange-500 to-orange-300' :
          d.band === 'Conditional'  ? 'from-amber-500 to-amber-300' :
                                      'from-emerald-500 to-emerald-300';
        return (
          <div key={d.label} className="flex flex-col items-center justify-end h-full gap-1.5">
            <div className="font-mono text-[10px] text-ink-950 font-semibold tabular-nums">{d.count}</div>
            <div className="w-full bg-neutral-100 rounded-md overflow-hidden h-full flex items-end">
              <div className={cn('w-full rounded-md bg-gradient-to-t transition-all', colour)} style={{ height: `${Math.max(2, height)}%` }} />
            </div>
            <div className="text-[10px] text-neutral-500 font-mono">{d.label}</div>
          </div>
        );
      })}
    </div>
  );
}

function Kpi({ label, value, tone, small }: {
  label: string; value: string | number; tone: 'info' | 'warning' | 'danger' | 'success' | 'ink'; small?: boolean;
}) {
  const cls =
    tone === 'info'    ? 'text-info-500' :
    tone === 'warning' ? 'text-amber-700' :
    tone === 'danger'  ? 'text-doe-red' :
    tone === 'success' ? 'text-emerald-700' :
    'text-ink-950';
  return (
    <div className="px-4 py-3">
      <div className="text-[10px] font-sans uppercase tracking-[0.18em] text-neutral-500">{label}</div>
      <div className={cn('font-display font-bold mt-1 tabular-nums leading-none', cls, small ? 'text-[14px]' : 'text-[20px]')}>{value}</div>
    </div>
  );
}

function DashboardIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3"  y="3"  width="7" height="9" />
      <rect x="14" y="3"  width="7" height="5" />
      <rect x="14" y="12" width="7" height="9" />
      <rect x="3"  y="16" width="7" height="5" />
    </svg>
  );
}
