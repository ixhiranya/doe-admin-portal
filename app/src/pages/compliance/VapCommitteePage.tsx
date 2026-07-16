// =============================================================================
// Compliance · VAP Committee Workspace — SDD §5.3
// -----------------------------------------------------------------------------
// Secretary's home for the VAP Committee: upcoming meetings, agenda preview,
// roster, historical meetings with circulated minutes.
// =============================================================================
import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  listMeetings, scheduleAdHocMeeting, MEETING_STATE_LABEL, quorumReached,
  DEFAULT_ROSTER,
} from '../../services/compliance/vapCommittee';
import { listViolations, STATE_LABEL } from '../../services/compliance/violations';
import { SEVERITY_LABEL } from '../../services/compliance/severity';
import type { VapMeeting } from '../../types';
import { cn } from '../../lib/utils';

export function VapCommitteePage() {
  const [revision, setRevision] = useState(0);
  const meetings = listMeetings();
  void revision;

  const upcoming = meetings.find((m) => m.state === 'agenda_ready' || m.state === 'scheduled');
  const inProgress = meetings.find((m) => m.state === 'in_progress');
  const past = meetings.filter((m) => m.state === 'concluded' || m.state === 'minutes_circulated');
  const allViolations = listViolations();
  const pendingForVap = allViolations.filter((v) => v.state === 'pending_committee_review');
  const criticalOldOpen = allViolations.filter((v) =>
    v.state === 'pending_committee_review' &&
    v.severity === 'critical' &&
    (Date.now() - new Date(v.createdAt).getTime()) / 86_400_000 > 7,
  ).length;

  const scheduleAdHoc = () => {
    const when = new Date(Date.now() + 2 * 86_400_000);
    when.setUTCHours(10, 0, 0, 0);
    scheduleAdHocMeeting(when.toISOString());
    setRevision((r) => r + 1);
  };

  return (
    <div className="max-w-[1400px] mx-auto px-6 pt-5 pb-10">
      {/* Breadcrumb */}
      <nav className="text-[12px] text-neutral-500 mb-5">
        <Link to="/pps-dashboard" className="hover:text-doe-red">Home</Link>
        <span className="mx-2 text-neutral-300">›</span>
        <Link to="/compliance/violations" className="hover:text-doe-red">Compliance & Enforcement</Link>
        <span className="mx-2 text-neutral-300">›</span>
        <span className="text-ink-950 font-semibold">VAP Committee</span>
      </nav>

      {/* Hero */}
      <div className="card overflow-hidden mb-4">
        <div className="relative px-6 py-6 bg-gradient-to-br from-[#1E2128] via-[#262A33] to-[#1E2128] text-white">
          <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 20% 30%, #E89B4C 0%, transparent 50%), radial-gradient(circle at 80% 70%, #0E76A8 0%, transparent 50%)' }} />
          <div className="relative flex items-center gap-6">
            <div className="w-14 h-14 rounded-xl bg-info-500/90 grid place-items-center shadow-doe-md"><GavelIcon /></div>
            <div className="flex-1 min-w-0">
              <div className="text-[10px] font-sans uppercase tracking-[0.22em] text-blue-200">Violations & Penalties Committee · SDD §5.3</div>
              <h1 className="font-display font-bold text-[24px] leading-tight mt-1">VAP Committee workspace.</h1>
              <p className="text-[12.5px] text-white/70 mt-1 max-w-[720px]">
                Secretary's home for scheduling meetings, preparing agendas from open violations, recording in-meeting votes, and circulating bilingual minutes to the roster.
              </p>
            </div>
            <button onClick={scheduleAdHoc}
              className="px-3 py-1.5 rounded-md bg-action-orange text-white font-semibold text-[11.5px] hover:bg-action-orange-dark shadow-doe-sm">
              + Schedule ad-hoc meeting
            </button>
          </div>
        </div>

        {/* KPI strip */}
        <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-neutral-100 border-t border-neutral-100 bg-white">
          <Kpi label="Items on next agenda" value={upcoming?.agenda.length ?? 0} tone="info" />
          <Kpi label="Pending committee review" value={pendingForVap.length} tone="warning" />
          <Kpi label="Critical > 7 days old" value={criticalOldOpen} tone={criticalOldOpen > 0 ? 'danger' : 'ink'} />
          <Kpi label="Roster size · quorum" value={`${DEFAULT_ROSTER.filter((m) => m.role !== 'alternate').length} · ${Math.ceil(DEFAULT_ROSTER.filter((m) => m.role !== 'alternate').length / 2) + 1}`} tone="ink" />
        </div>
      </div>

      {/* Ad-hoc trigger banner — per SDD §5.3 rule */}
      {criticalOldOpen > 0 && (
        <div className="card p-3 mb-4 border-doe-red bg-rose-50/60 flex items-start gap-3">
          <span className="text-[16px] leading-none">⚠️</span>
          <div className="flex-1">
            <div className="text-[12.5px] font-semibold text-doe-red">Ad-hoc meeting recommended</div>
            <div className="text-[11.5px] text-neutral-700 mt-0.5">
              Per SDD §5.3, any Critical violation older than 7 days that has not been decided should trigger an ad-hoc meeting. <span className="font-semibold">{criticalOldOpen}</span> such item{criticalOldOpen === 1 ? '' : 's'} on file.
            </div>
          </div>
          <button onClick={scheduleAdHoc} className="px-3 py-1.5 rounded-md text-[11.5px] font-semibold bg-doe-red text-white hover:opacity-90">Schedule now</button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Upcoming / In-progress meeting card */}
        <div className="lg:col-span-2 space-y-4">
          {(inProgress || upcoming) && (
            <MeetingCard m={inProgress ?? upcoming!} primary />
          )}

          {/* Past meetings table */}
          <div className="card overflow-hidden">
            <div className="px-5 py-3 border-b border-neutral-100">
              <div className="text-[11px] font-sans uppercase tracking-[0.18em] text-neutral-500">Past Meetings</div>
              <div className="text-[11.5px] text-neutral-500 mt-0.5">{past.length} meeting{past.length === 1 ? '' : 's'} on record</div>
            </div>
            {past.length === 0 ? (
              <div className="px-5 py-10 text-center text-[12.5px] text-neutral-500">No past meetings yet.</div>
            ) : (
              <table className="w-full">
                <thead className="bg-neutral-25 text-[10px] uppercase tracking-[0.16em] text-neutral-500 border-b border-neutral-100">
                  <tr>
                    <th className="text-left px-5 py-2.5">Meeting</th>
                    <th className="text-left px-5 py-2.5">Date</th>
                    <th className="text-right px-5 py-2.5">Items</th>
                    <th className="text-right px-5 py-2.5">Attendance</th>
                    <th className="text-left px-5 py-2.5">Minutes</th>
                  </tr>
                </thead>
                <tbody>
                  {past.map((m) => (
                    <tr key={m.id} className="border-b border-neutral-100 last:border-b-0 hover:bg-neutral-25">
                      <td className="px-5 py-3">
                        <Link to={`/compliance/vap/${m.id}`} className="text-[12.5px] font-semibold text-action-orange-deep hover:underline">{m.meetingNumber}</Link>
                        <div className="text-[10.5px] text-neutral-500 mt-0.5 font-mono">{m.id}</div>
                      </td>
                      <td className="px-5 py-3 text-[12px] text-ink-950">{formatDateTime(m.scheduledAt)}</td>
                      <td className="px-5 py-3 text-right font-mono text-[12px] text-ink-950 tabular-nums">{m.agenda.length}</td>
                      <td className="px-5 py-3 text-right font-mono text-[12px] text-ink-950 tabular-nums">{m.attendedMemberIds.length} / {m.roster.filter((r) => r.role !== 'alternate').length}</td>
                      <td className="px-5 py-3 text-[11.5px]">
                        {m.minutesFileName
                          ? <Link to={`/compliance/vap/${m.id}/minutes`} className="font-mono text-info-500 hover:underline">{m.minutesFileName}</Link>
                          : <span className="text-neutral-400">—</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Sidebar: roster */}
        <div className="space-y-4">
          <div className="card overflow-hidden">
            <div className="px-5 py-3 border-b border-neutral-100">
              <div className="text-[11px] font-sans uppercase tracking-[0.18em] text-neutral-500">Committee Roster</div>
              <div className="text-[11.5px] text-neutral-500 mt-0.5">{DEFAULT_ROSTER.length} members ({DEFAULT_ROSTER.filter((m) => m.role === 'alternate').length} alternate)</div>
            </div>
            <div className="px-3 py-2 space-y-1">
              {DEFAULT_ROSTER.map((m) => (
                <div key={m.id} className="flex items-start gap-2.5 px-2 py-2 rounded-md hover:bg-neutral-25">
                  <div className="w-7 h-7 rounded-full bg-info-soft text-info-500 grid place-items-center font-display font-bold text-[10px] shrink-0">
                    {m.name.split(/\s+/).slice(0, 2).map((n) => n[0]).join('').slice(0, 2)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-[12px] font-semibold text-ink-950 truncate">{m.name}</div>
                    <div className="text-[10.5px] text-neutral-500 truncate">{m.organisation} · <span className="capitalize">{m.role.replace('_', ' ')}</span></div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="card overflow-hidden">
            <div className="px-5 py-3 border-b border-neutral-100">
              <div className="text-[11px] font-sans uppercase tracking-[0.18em] text-neutral-500">Pending agenda</div>
              <div className="text-[11.5px] text-neutral-500 mt-0.5">{pendingForVap.length} violation{pendingForVap.length === 1 ? '' : 's'} awaiting committee</div>
            </div>
            {pendingForVap.length === 0 ? (
              <div className="px-5 py-6 text-center text-[12px] text-neutral-500">Nothing pending committee review.</div>
            ) : (
              <div className="max-h-[320px] overflow-auto">
                {pendingForVap.slice(0, 10).map((v) => (
                  <Link key={v.id} to={`/compliance/violations/${v.id}`}
                    className="flex items-start gap-2 px-3 py-2 border-t border-neutral-100 first:border-t-0 hover:bg-neutral-25">
                    <span className={cn('inline-flex items-center w-12 justify-center px-1.5 h-4 rounded text-[9.5px] font-semibold uppercase tracking-wide',
                      v.severity === 'critical' ? 'bg-rose-50 text-doe-red' :
                      v.severity === 'major' ? 'bg-amber-50 text-amber-700' :
                      'bg-info-soft text-info-500')}>
                      {SEVERITY_LABEL[v.severity]}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="text-[11.5px] font-semibold text-ink-950 truncate">{v.title}</div>
                      <div className="text-[10px] text-neutral-500 mt-0.5 font-mono truncate">{v.id} · {v.licensee.name}</div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Atoms
// ============================================================================
function MeetingCard({ m, primary }: { m: VapMeeting; primary?: boolean }) {
  const dt = new Date(m.scheduledAt);
  const dateLabel = dt.toLocaleDateString('en-GB', { weekday: 'long', day: '2-digit', month: 'short', year: 'numeric' });
  const timeLabel = dt.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  const quorumOk = quorumReached(m);

  return (
    <div className={cn('card overflow-hidden', primary && 'border-info-500/30')}>
      <div className="relative px-5 py-4 bg-gradient-to-br from-[#0E76A8] to-[#0F4A5C] text-white">
        <div className="text-[10px] font-sans uppercase tracking-[0.22em] opacity-80">{MEETING_STATE_LABEL[m.state]} · {m.cadence}</div>
        <div className="font-display font-bold text-[18px] leading-tight mt-1">{m.meetingNumber}</div>
        <div className="text-[12.5px] text-white/80 mt-1">{dateLabel} · {timeLabel}</div>
        <div className="text-[11px] text-white/70 mt-0.5">{m.venue}</div>
      </div>
      <div className="grid grid-cols-3 divide-x divide-neutral-100 bg-white">
        <Kpi label="Items"          value={m.agenda.length}      tone="info" />
        <Kpi label="Quorum"         value={`${m.attendedMemberIds.length} / ${m.quorumMin}`} tone={quorumOk ? 'success' : 'warning'} />
        <Kpi label="Secretary"      value={m.secretaryName.split(' ').slice(-1)[0]} tone="ink" small />
      </div>
      <div className="px-5 py-3 border-t border-neutral-100 flex items-center justify-between gap-3 flex-wrap">
        <div className="text-[11.5px] text-neutral-500">{m.agenda.length} agenda item{m.agenda.length === 1 ? '' : 's'}</div>
        <Link to={`/compliance/vap/${m.id}`}
          className="px-3 py-1.5 rounded-md text-[11.5px] font-semibold bg-info-500 text-white shadow-doe-sm hover:opacity-90">
          {m.state === 'in_progress' ? 'Resume meeting' : m.state === 'agenda_ready' ? 'Open agenda' : 'Open meeting'} →
        </Link>
      </div>
    </div>
  );
}

function Kpi({ label, value, tone, small }: { label: string; value: string | number; tone: 'info' | 'warning' | 'danger' | 'success' | 'ink'; small?: boolean }) {
  const cls =
    tone === 'info'    ? 'text-info-500' :
    tone === 'warning' ? 'text-amber-700' :
    tone === 'danger'  ? 'text-doe-red' :
    tone === 'success' ? 'text-emerald-700' :
    'text-ink-950';
  return (
    <div className="px-4 py-3">
      <div className="text-[10px] font-sans uppercase tracking-[0.18em] text-neutral-500">{label}</div>
      <div className={cn('font-display font-bold mt-1 tabular-nums leading-none', cls, small ? 'text-[15px]' : 'text-[20px]')}>{value}</div>
    </div>
  );
}

function GavelIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m14 12-8.5 8.5a2.12 2.12 0 1 1-3-3L11 9" />
      <path d="m15 13 3-3" />
      <path d="m17 11 4-4" />
      <path d="m13 7 4-4" />
      <path d="M11 9 7 5" />
      <path d="M3 21h11" />
    </svg>
  );
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('en-GB', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}
