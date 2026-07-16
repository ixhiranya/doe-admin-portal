// =============================================================================
// Compliance · VAP Meeting Detail / In-Meeting Voting Console — SDD §5.3
// -----------------------------------------------------------------------------
// Secretary's console during a meeting:
//   • Attendance tracking (mark members present / absent)
//   • Quorum indicator
//   • Per-agenda-item voting console with discussion-summary capture
//   • Per-member vote chips
//   • Final decision button (writes to the linked Violation's state machine)
//   • Conclude meeting → generates minutes
// =============================================================================
import { useMemo, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import {
  getMeeting, startMeeting, recordVote, recordItemDecision, concludeMeeting,
  markAttendance, MEETING_STATE_LABEL, VOTE_LABEL, quorumReached,
} from '../../services/compliance/vapCommittee';
import {
  getViolation, formatAed, severityTone, PERMIT_TYPE_LABEL, STATE_LABEL,
} from '../../services/compliance/violations';
import { SEVERITY_LABEL, SEVERITY_LABEL_AR } from '../../services/compliance/severity';
import type {
  VapMeeting, VapAgendaItem, VapMember, Violation, ViolationSeverity,
} from '../../types';
import { cn } from '../../lib/utils';

type DecisionOption = NonNullable<VapAgendaItem['finalDecision']>;

export function VapMeetingDetailPage() {
  const { meetingId } = useParams<{ meetingId: string }>();
  const navigate = useNavigate();
  const [revision, setRevision] = useState(0);
  const m = useMemo(() => meetingId ? getMeeting(meetingId) : undefined, [meetingId, revision]);
  const [openItemId, setOpenItemId] = useState<string | null>(null);
  const [discussionDrafts, setDiscussionDrafts] = useState<Record<string, string>>({});

  if (!m) {
    return (
      <div className="min-h-screen bg-neutral-25 grid place-items-center">
        <div className="card p-10 text-center">
          <div className="font-display font-bold text-[15px] text-ink-950">Meeting not found</div>
          <button onClick={() => navigate('/compliance/vap')} className="mt-4 btn-primary">Back to VAP Committee</button>
        </div>
      </div>
    );
  }

  const quorumOk = quorumReached(m);
  const dt = new Date(m.scheduledAt);
  const dateLabel = dt.toLocaleDateString('en-GB', { weekday: 'long', day: '2-digit', month: 'short', year: 'numeric' });
  const timeLabel = dt.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  const inProgress = m.state === 'in_progress';
  const concluded  = m.state === 'concluded' || m.state === 'minutes_circulated';

  const toggleAttendance = (memberId: string) => {
    const next = m.attendedMemberIds.includes(memberId)
      ? m.attendedMemberIds.filter((id) => id !== memberId)
      : [...m.attendedMemberIds, memberId];
    markAttendance(m.id, next);
    setRevision((r) => r + 1);
  };

  const begin = () => { startMeeting(m.id); setRevision((r) => r + 1); };
  const conclude = () => {
    if (!confirm('Conclude meeting and generate minutes? Any items without a recorded decision will be returned to the queue as deferred.')) return;
    // Auto-defer items without a decision
    for (const ai of m.agenda) {
      if (!ai.finalDecision) {
        recordItemDecision(m.id, ai.id, 'deferred', 'Auto-deferred at meeting close', 'VAP Committee');
      }
    }
    concludeMeeting(m.id);
    setRevision((r) => r + 1);
  };

  const castVote = (itemId: string, memberId: string, memberName: string, vote: DecisionOption) => {
    recordVote(m.id, itemId, { memberId, memberName, vote });
    setRevision((r) => r + 1);
  };

  const decideItem = (itemId: string, outcome: DecisionOption) => {
    const summary = discussionDrafts[itemId] || 'Reviewed evidence pack. Decision recorded.';
    recordItemDecision(m.id, itemId, outcome, summary, 'VAP Committee');
    setRevision((r) => r + 1);
  };

  // KPI roll-up
  const decidedCount = m.agenda.filter((a) => a.finalDecision && a.finalDecision !== 'deferred').length;
  const deferredCount = m.agenda.filter((a) => a.finalDecision === 'deferred').length;

  return (
    <div className="max-w-[1400px] mx-auto px-6 pt-5 pb-10">
      {/* Breadcrumb */}
      <nav className="text-[12px] text-neutral-500 mb-5">
        <Link to="/pps-dashboard" className="hover:text-doe-red">Home</Link>
        <span className="mx-2 text-neutral-300">›</span>
        <Link to="/compliance/violations" className="hover:text-doe-red">Compliance & Enforcement</Link>
        <span className="mx-2 text-neutral-300">›</span>
        <Link to="/compliance/vap" className="hover:text-doe-red">VAP Committee</Link>
        <span className="mx-2 text-neutral-300">›</span>
        <span className="text-ink-950 font-semibold">{m.meetingNumber}</span>
      </nav>

      {/* Hero */}
      <div className="card overflow-hidden mb-4">
        <div className="relative px-6 py-5 bg-gradient-to-br from-[#1E2128] via-[#262A33] to-[#1E2128] text-white">
          <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 20% 30%, #E89B4C 0%, transparent 50%), radial-gradient(circle at 80% 70%, #0E76A8 0%, transparent 50%)' }} />
          <div className="relative flex items-start gap-5 flex-wrap">
            <div className="w-14 h-14 rounded-xl bg-info-500/90 grid place-items-center shadow-doe-md font-display font-bold text-[18px]">
              VAP
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[10px] font-sans uppercase tracking-[0.22em] text-blue-200">{MEETING_STATE_LABEL[m.state]} · {m.cadence}</div>
              <h1 className="font-display font-bold text-[22px] leading-tight mt-1">{m.meetingNumber}</h1>
              <p className="text-[12.5px] text-white/80 mt-1">{dateLabel} · {timeLabel} · {m.venue}</p>
              <div className="mt-3 flex items-center gap-2 text-[11px] flex-wrap">
                <span className={cn('inline-flex items-center gap-1.5 px-2.5 h-6 rounded-full font-semibold',
                  quorumOk ? 'bg-emerald-200 text-emerald-800' : 'bg-amber-200 text-amber-800')}>
                  <span className={cn('w-1.5 h-1.5 rounded-full', quorumOk ? 'bg-emerald-600' : 'bg-amber-600')} />
                  {quorumOk ? 'Quorum reached' : 'Quorum not reached'} ({m.attendedMemberIds.length}/{m.quorumMin})
                </span>
                <span className="text-white/40">·</span>
                <span className="text-white/80">Secretary: {m.secretaryName}</span>
                {m.chairName && (<><span className="text-white/40">·</span><span className="text-white/80">Chair: {m.chairName}</span></>)}
              </div>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {m.state === 'agenda_ready' && (
                <button onClick={begin} disabled={!quorumOk}
                  className={cn('px-3 py-1.5 rounded-md text-[12px] font-semibold shadow-doe-sm',
                    quorumOk ? 'bg-white text-info-500 hover:opacity-90' : 'bg-white/20 text-white/60 cursor-not-allowed')}>
                  ▶ Start meeting
                </button>
              )}
              {inProgress && (
                <button onClick={conclude}
                  className="px-3 py-1.5 rounded-md text-[12px] font-semibold bg-action-orange text-white shadow-doe-sm hover:bg-action-orange-dark">
                  ⏹ Conclude & generate minutes
                </button>
              )}
              {concluded && m.minutesFileName && (
                <Link to={`/compliance/vap/${m.id}/minutes`}
                  className="px-3 py-1.5 rounded-md text-[12px] font-semibold bg-white text-info-500 shadow-doe-sm hover:opacity-90 inline-flex items-center gap-1.5">
                  📄 View minutes
                </Link>
              )}
            </div>
          </div>
        </div>

        {/* KPI strip */}
        <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-neutral-100 border-t border-neutral-100 bg-white">
          <Stat label="Agenda items" value={m.agenda.length} tone="info" />
          <Stat label="Decided"      value={decidedCount}    tone="success" />
          <Stat label="Deferred"     value={deferredCount}   tone="warning" />
          <Stat label="Attendance"   value={`${m.attendedMemberIds.length} / ${m.roster.filter((r) => r.role !== 'alternate').length}`} tone={quorumOk ? 'success' : 'warning'} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-4">
        {/* Agenda items */}
        <div className="space-y-3">
          {m.agenda.length === 0 ? (
            <div className="card p-10 text-center text-[12.5px] text-neutral-500">No agenda items.</div>
          ) : m.agenda.map((a) => {
            const v = getViolation(a.violationId);
            if (!v) return null;
            const isOpen = openItemId === a.id;
            return (
              <AgendaItemCard
                key={a.id}
                a={a}
                v={v}
                open={isOpen}
                draft={discussionDrafts[a.id] ?? ''}
                onToggleOpen={() => setOpenItemId(isOpen ? null : a.id)}
                onDraftChange={(t) => setDiscussionDrafts((d) => ({ ...d, [a.id]: t }))}
                onVote={(memberId, name, v) => castVote(a.id, memberId, name, v)}
                onDecide={(outcome) => decideItem(a.id, outcome)}
                roster={m.roster}
                attendedIds={m.attendedMemberIds}
                disabled={concluded || !inProgress}
              />
            );
          })}
        </div>

        {/* Sidebar — attendance */}
        <div className="space-y-4">
          <div className="card overflow-hidden">
            <div className="px-5 py-3 border-b border-neutral-100">
              <div className="text-[11px] font-sans uppercase tracking-[0.18em] text-neutral-500">Attendance</div>
              <div className="text-[11.5px] text-neutral-500 mt-0.5">Tap to toggle present / absent. Quorum is {m.quorumMin} core members.</div>
            </div>
            <div className="px-3 py-2 space-y-1">
              {m.roster.map((mem) => {
                const present = m.attendedMemberIds.includes(mem.id);
                return (
                  <button key={mem.id} onClick={() => toggleAttendance(mem.id)} disabled={concluded}
                    className={cn('w-full flex items-center gap-2.5 px-2 py-2 rounded-md text-left transition',
                      present ? 'bg-emerald-50' : 'hover:bg-neutral-25',
                      concluded && 'opacity-70 cursor-not-allowed')}>
                    <div className={cn('w-7 h-7 rounded-full grid place-items-center font-display font-bold text-[10px] shrink-0',
                      present ? 'bg-emerald-100 text-emerald-700' : 'bg-neutral-100 text-neutral-500')}>
                      {mem.name.split(/\s+/).slice(0, 2).map((n) => n[0]).join('').slice(0, 2)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-[12px] font-semibold text-ink-950 truncate">{mem.name}</div>
                      <div className="text-[10.5px] text-neutral-500 truncate">{mem.organisation} · <span className="capitalize">{mem.role.replace('_', ' ')}</span></div>
                    </div>
                    <span className={cn('text-[10px] font-bold uppercase tracking-wider',
                      present ? 'text-emerald-700' : 'text-neutral-400')}>
                      {present ? 'Present' : 'Absent'}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Agenda item card
// ============================================================================
function AgendaItemCard({
  a, v, open, draft, onToggleOpen, onDraftChange, onVote, onDecide, roster, attendedIds, disabled,
}: {
  a: VapAgendaItem;
  v: Violation;
  open: boolean;
  draft: string;
  onToggleOpen: () => void;
  onDraftChange: (t: string) => void;
  onVote: (memberId: string, memberName: string, vote: DecisionOption) => void;
  onDecide: (outcome: DecisionOption) => void;
  roster: VapMember[];
  attendedIds: string[];
  disabled: boolean;
}) {
  const decided = !!a.finalDecision;
  const sevTone = severityTone(v.severity);
  const sevCls = sevTone === 'danger' ? 'bg-rose-50 text-doe-red ring-doe-red/30'
              : sevTone === 'warning' ? 'bg-amber-50 text-amber-700 ring-amber-500/40'
              : sevTone === 'info'    ? 'bg-info-soft text-info-500 ring-info-500/30'
                                      : 'bg-neutral-100 text-neutral-600 ring-neutral-300';

  return (
    <div className={cn('card overflow-hidden', open && 'ring-1 ring-info-500/30')}>
      {/* Header */}
      <button onClick={onToggleOpen} className="w-full text-left px-4 py-3 hover:bg-neutral-25 flex items-start gap-3 transition">
        <div className="w-7 h-7 rounded-full bg-info-soft text-info-500 grid place-items-center font-display font-bold text-[12px] shrink-0">
          {a.presentationOrder}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide ring-1 whitespace-nowrap', sevCls)}>
              {SEVERITY_LABEL[v.severity]}
            </span>
            <span className="font-mono text-[10.5px] text-neutral-500">{v.id}</span>
            <span className="text-neutral-300">·</span>
            <span className="text-[10.5px] text-neutral-500">{PERMIT_TYPE_LABEL[v.permitType]}</span>
            <span className="text-neutral-300">·</span>
            <span className="text-[10.5px] text-neutral-500">Offence #{v.offenceCount}</span>
            {decided && (
              <span className="ml-auto inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide ring-1 bg-emerald-50 text-emerald-700 ring-emerald-500/30">
                {VOTE_LABEL[a.finalDecision!]}
              </span>
            )}
          </div>
          <div className="text-[13px] font-semibold text-ink-950 leading-tight">{v.title}</div>
          <div className="text-[11px] text-neutral-500 mt-0.5">{v.licensee.name} · {STATE_LABEL[v.state]}</div>
        </div>
        <span className="text-neutral-400">{open ? '▼' : '▶'}</span>
      </button>

      {open && (
        <div className="border-t border-neutral-100 px-4 py-4 space-y-4 bg-neutral-25/40">
          {/* Violation summary */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <div className="text-[10px] font-sans uppercase tracking-[0.18em] text-neutral-500 mb-1">Description</div>
              <div className="text-[12px] text-ink-950 leading-relaxed">{v.description}</div>
              <div className="text-[10.5px] text-neutral-500 italic mt-1.5" dir="rtl">{v.titleAr} ({SEVERITY_LABEL_AR[v.severity as ViolationSeverity]})</div>
            </div>
            <div>
              <div className="text-[10px] font-sans uppercase tracking-[0.18em] text-neutral-500 mb-1">Key data</div>
              <dl className="grid grid-cols-[110px_1fr] gap-y-1 text-[11.5px]">
                <dt className="text-neutral-500">Code</dt>
                <dd className="font-mono text-ink-950">{v.violationCode}</dd>
                <dt className="text-neutral-500">Source</dt>
                <dd className="text-ink-950">{v.sourceReference}</dd>
                <dt className="text-neutral-500">Linked permit</dt>
                <dd className="font-mono text-ink-950">{v.linkedPermitId ?? '—'}</dd>
                <dt className="text-neutral-500">Penalty</dt>
                <dd className="font-mono text-doe-red font-semibold">{v.penaltyAed > 0 ? formatAed(v.penaltyAed) : '—'}</dd>
                <dt className="text-neutral-500">Detail</dt>
                <dd><Link to={`/compliance/violations/${v.id}`} className="text-info-500 hover:underline">Open full record →</Link></dd>
              </dl>
            </div>
          </div>

          {/* Discussion */}
          <div>
            <label className="text-[10px] font-sans uppercase tracking-[0.18em] text-neutral-500 mb-1 block">Discussion summary</label>
            <textarea
              value={decided ? (a.discussionSummary ?? '') : draft}
              onChange={(e) => onDraftChange(e.target.value)}
              disabled={decided || disabled}
              rows={3}
              placeholder="Capture the discussion before recording the decision…"
              className="w-full px-3 py-2 text-[12.5px] bg-white border border-neutral-200 rounded-md focus:outline-none focus:border-action-orange focus:ring-2 focus:ring-action-orange/20 transition disabled:bg-neutral-25 disabled:text-neutral-500"
            />
          </div>

          {/* Vote tally */}
          <div>
            <div className="text-[10px] font-sans uppercase tracking-[0.18em] text-neutral-500 mb-2">
              Per-member vote ({a.votes.length} cast)
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {roster.filter((r) => r.role !== 'alternate' && attendedIds.includes(r.id)).map((mem) => {
                const myVote = a.votes.find((vt) => vt.memberId === mem.id);
                return (
                  <div key={mem.id} className="flex items-center gap-2 px-2 py-1.5 bg-white border border-neutral-200 rounded-md">
                    <div className="w-6 h-6 rounded-full bg-info-soft text-info-500 grid place-items-center font-display font-bold text-[9px] shrink-0">
                      {mem.name.split(/\s+/).slice(0, 2).map((n) => n[0]).join('').slice(0, 2)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[11px] font-semibold text-ink-950 truncate">{mem.name.split(' ').slice(-2).join(' ')}</div>
                    </div>
                    {decided || disabled ? (
                      <span className="text-[10px] font-semibold text-neutral-700">
                        {myVote ? VOTE_LABEL[myVote.vote] : '—'}
                      </span>
                    ) : (
                      <select value={myVote?.vote ?? ''} onChange={(e) => e.target.value && onVote(mem.id, mem.name, e.target.value as DecisionOption)}
                        className="px-1.5 py-0.5 text-[10.5px] border border-neutral-200 rounded">
                        <option value="">— vote —</option>
                        {(['penalty_imposed', 'warning_letter', 'no_action', 'referred_investigation', 'deferred'] as DecisionOption[]).map((vo) => (
                          <option key={vo} value={vo}>{VOTE_LABEL[vo]}</option>
                        ))}
                      </select>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Final decision row */}
          {!decided && (
            <div className="flex items-center justify-end gap-2 flex-wrap pt-2 border-t border-neutral-100">
              {(['no_action', 'warning_letter', 'penalty_imposed', 'referred_investigation', 'deferred'] as DecisionOption[]).map((vo) => (
                <button key={vo} onClick={() => onDecide(vo)} disabled={disabled}
                  className={cn('px-3 py-1.5 rounded-md text-[11.5px] font-semibold transition',
                    vo === 'penalty_imposed' ? 'bg-doe-red text-white shadow-doe-sm hover:opacity-90' :
                    vo === 'warning_letter'  ? 'bg-amber-500 text-white shadow-doe-sm hover:opacity-90' :
                    vo === 'no_action'       ? 'bg-emerald-600 text-white shadow-doe-sm hover:opacity-90' :
                    vo === 'referred_investigation' ? 'bg-info-500 text-white shadow-doe-sm hover:opacity-90' :
                                                'bg-white border border-neutral-200 text-ink-950 hover:border-action-orange',
                    disabled && 'opacity-50 cursor-not-allowed')}>
                  {VOTE_LABEL[vo]}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: string | number; tone: 'info' | 'success' | 'warning' | 'danger' | 'ink' }) {
  const cls =
    tone === 'info'    ? 'text-info-500' :
    tone === 'success' ? 'text-emerald-700' :
    tone === 'warning' ? 'text-amber-700' :
    tone === 'danger'  ? 'text-doe-red' :
    'text-ink-950';
  return (
    <div className="px-4 py-3">
      <div className="text-[10px] font-sans uppercase tracking-[0.18em] text-neutral-500">{label}</div>
      <div className={cn('font-display font-bold text-[20px] mt-1 tabular-nums leading-none', cls)}>{value}</div>
    </div>
  );
}
