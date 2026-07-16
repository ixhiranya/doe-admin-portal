import { useState } from 'react';
import { cn, formatDate } from '../../lib/utils';
import { StatusPill } from './StatusPill';
import type { Submission, SubmissionWorkflowEvent } from '../../types/pps';

// ============================================================================
// EntityWorkflowCard — Ahmed Al Mazrouei (Entity Submitter) only.
//
// A collapsible Submission Workflow. Collapsed = compact summary. Expanded = a
// HORIZONTAL 3-stage progress stepper (Submitted · DoE Review · Approved &
// Published) connected by a progress line — enterprise-grade (Azure DevOps /
// Jira / GitHub style), not a vertical timeline.
//
// DoE Review is the only stage with nested internal events; they sit behind a
// "View review activity (N)" disclosure to keep the stepper to one row.
// Colour coding: completed = green · current = blue · pending = grey.
// ============================================================================

type NodeState = 'completed' | 'current' | 'upcoming';

// Activity status colours (consistent across the system):
//   Submitted → Blue · In Review → Orange · Requested More Info → Amber
//   Re-submitted → Purple · Approved → Green · Rejected → Red
type Tone = 'blue' | 'orange' | 'amber' | 'purple' | 'green' | 'red' | 'grey';
const TONE: Record<Tone, string> = {
  blue: '#2563EB', orange: '#E89B4C', amber: '#D97706', purple: '#7B3FE4', green: '#059669', red: '#DC2626', grey: '#9CA3AF',
};

interface ActivityItem {
  label: string;
  at?: string;
  by?: string;
  byRole?: string;
  tone: Tone;
  comment?: string;
  detail?: string;   // small grey sub-line, e.g. "Email sent to Ahmed Al Mazrouei"
  sortAt?: string;   // overrides `at` for chronological ordering only
}
interface Stage {
  key: 'submitted' | 'review' | 'approved';
  label: string;
  state: NodeState;
  owner: string;
  date?: string;
  activity?: ActivityItem[]; // DoE Review only
}

const REVIEWER = { name: 'Khalid Al Qubaisi', role: 'DoE PPS Reviewer' };
const APPROVER = { name: 'Mariam Al Mansouri', role: 'DoE Approver' };

function latest(events: SubmissionWorkflowEvent[], stage: SubmissionWorkflowEvent['stage']) {
  return [...events].reverse().find((e) => e.stage === stage);
}

export function buildEntityWorkflow(sub: Submission, includeReminders = false): {
  stages: Stage[];
  currentStepLabel: string;
  lastUpdated?: string;
} {
  const events = sub.workflow;
  const submittedEv = latest(events, 'submitted');
  const reviewEv = latest(events, 'doe_review');
  const returnedEv = latest(events, 'returned');
  const resubEv = latest(events, 'resubmitted');
  const approvedEv = latest(events, 'approved');
  const status = sub.status;

  const hasReturned = !!returnedEv;
  const hasResub = !!resubEv;
  const isApproved = status === 'approved';
  const isRejected = status === 'rejected';
  const reviewDone = isApproved || isRejected;
  const reviewStarted = status === 'in_review' || hasReturned || hasResub || reviewDone || !!reviewEv;

  // ---- stage states ----
  const submittedState: NodeState = status === 'draft' ? 'upcoming' : 'completed';
  const reviewState: NodeState = reviewDone ? 'completed' : status === 'draft' ? 'upcoming' : 'current';
  const approvedState: NodeState = isApproved ? 'completed' : 'upcoming';

  // ---- DoE Review nested activity (only real events) ----
  const rejectedEv = latest(events, 'rejected');
  const activity: ActivityItem[] = [];
  if (reviewStarted) {
    activity.push({ label: 'Review Started', tone: 'orange', at: reviewEv?.at, sortAt: reviewEv?.at ?? submittedEv?.at ?? sub.submittedOn, by: reviewEv?.by ?? REVIEWER.name, byRole: reviewEv?.byRole ?? REVIEWER.role, comment: reviewEv?.comment });
  }
  if (hasReturned) {
    activity.push({ label: 'Requested More Information', tone: 'amber', at: returnedEv?.at, by: returnedEv?.by ?? REVIEWER.name, byRole: returnedEv?.byRole ?? REVIEWER.role, comment: returnedEv?.comment });
  }
  if (hasResub) {
    activity.push({ label: 'Entity Re-submitted', tone: 'purple', at: resubEv?.at, by: resubEv?.by ?? sub.submittedBy, byRole: 'Entity Submitter', comment: resubEv?.comment });
    activity.push({ label: 'Review Continued', tone: 'orange', at: resubEv?.at, by: REVIEWER.name, byRole: REVIEWER.role });
  }
  if (isApproved) {
    activity.push({ label: 'Final Review Completed', tone: 'green', at: approvedEv?.at, by: approvedEv?.by ?? APPROVER.name, byRole: APPROVER.role, comment: approvedEv?.comment });
  } else if (status === 'in_review') {
    activity.push({ label: 'Review In Progress', tone: 'orange', sortAt: reviewEv?.at ?? sub.submittedOn });
  } else if (isRejected) {
    activity.push({ label: 'Rejected', tone: 'red', at: rejectedEv?.at, by: rejectedEv?.by, byRole: rejectedEv?.byRole, comment: rejectedEv?.comment });
  }

  // Reminder audit trail (DoE Approver → entity). Visible to DoE roles only;
  // the entity submitter never sees reminder history (includeReminders=false).
  if (includeReminders && sub.reminders?.length) {
    for (const r of sub.reminders) {
      activity.push({ label: 'Reminder sent', tone: 'blue', at: r.at, by: r.by, byRole: r.byRole, detail: `${r.channel} sent to ${r.toName}` });
    }
    // Chronological order across all activity (events + reminders).
    activity.sort((a, b) => (a.sortAt ?? a.at ?? '').localeCompare(b.sortAt ?? b.at ?? ''));
  }

  const stages: Stage[] = [
    { key: 'submitted', label: 'Submitted', state: submittedState, owner: 'Entity Submitter', date: submittedEv?.at },
    { key: 'review', label: 'DoE Review', state: reviewState, owner: 'DoE Reviewer', date: reviewDone ? approvedEv?.at ?? latest(events, 'rejected')?.at : undefined, activity },
    { key: 'approved', label: 'Approved & Published', state: approvedState, owner: 'DoE Approver', date: approvedEv?.at },
  ];

  const currentStepLabel =
    status === 'draft' ? 'Draft — not yet submitted' :
    status === 'submitted' ? 'Awaiting DoE review' :
    status === 'in_review' ? 'In DoE review' :
    status === 'returned' ? 'Returned for clarification' :
    status === 'resubmitted' ? 'Re-submitted — under review' :
    status === 'approved' ? 'Approved & Published' :
    status === 'rejected' ? 'Rejected' : status;

  const lastUpdated = events.length ? events[events.length - 1].at : sub.submittedOn;

  return { stages, currentStepLabel, lastUpdated };
}

export function EntityWorkflowCard({ submission, includeReminders = false }: { submission: Submission; includeReminders?: boolean }) {
  const [expanded, setExpanded] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);
  const { stages, currentStepLabel, lastUpdated } = buildEntityWorkflow(submission, includeReminders);
  const pillLabel = submission.status === 'returned' ? 'Returned for Clarification' : undefined;
  const reviewActivity = stages.find((s) => s.key === 'review')?.activity ?? [];

  return (
    <div className="card p-5 mt-3">
      {/* ---- collapsed summary header (always visible) ---- */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <h3 className="font-display text-[15px] font-bold text-charcoal-900">Submission Workflow</h3>
            <StatusPill status={submission.status} label={pillLabel} />
          </div>
          <div className="text-[11.5px] text-neutral-600 mt-2">
            Current step: <strong className="text-ink-950">{currentStepLabel}</strong>
            {lastUpdated && <> · Last updated <strong className="text-ink-950">{formatDate(lastUpdated)}</strong></>}
          </div>
        </div>
        <button
          onClick={() => setExpanded((v) => !v)}
          className="text-[12px] text-info-500 font-semibold hover:underline flex items-center gap-1 flex-shrink-0 whitespace-nowrap"
          aria-expanded={expanded}
        >
          {expanded ? 'Collapse workflow' : 'View workflow'}
          <span className={cn('transition-transform', expanded && 'rotate-180')}>↓</span>
        </button>
      </div>

      {/* ---- expanded full-width horizontal stepper ---- */}
      <div className={cn('overflow-hidden transition-all duration-300 ease-in-out', expanded ? 'max-h-[640px] opacity-100' : 'max-h-0 opacity-0')}>
        <div className="mt-4 pt-4 border-t border-neutral-100">
          {/* edge-to-edge progress stepper: icons pinned left / centre / right,
              the connector stretches continuously across the full width. */}
          <div className="relative">
            {/* continuous connector — two segments meeting at the centre node */}
            <div className="absolute top-[11px] left-3 right-3 h-0.5 flex pointer-events-none">
              <div className={cn('flex-1 rounded-full', stages[0].state === 'completed' ? 'bg-success-500' : 'bg-neutral-200')} />
              <div className={cn('flex-1 rounded-full', stages[1].state === 'completed' ? 'bg-success-500' : 'bg-neutral-200')} />
            </div>
            <div className="grid grid-cols-3">
              {stages.map((stage, i) => {
                const align = i === 0 ? 'items-start text-left' : i === 1 ? 'items-center text-center' : 'items-end text-right';
                const justify = i === 0 ? 'justify-start' : i === 1 ? 'justify-center' : 'justify-end';
                return (
                  <div key={stage.key} className={cn('flex flex-col min-w-0', align)}>
                    <StageIcon state={stage.state} />
                    <div className="mt-2 min-w-0">
                      <div className={cn('flex items-center gap-2 flex-wrap', justify)}>
                        <span className={cn('text-[13px] font-semibold leading-tight', textForState(stage.state))}>{stage.label}</span>
                        <StateBadge state={stage.state} />
                      </div>
                      {stage.date && <div className="text-[11px] font-mono text-neutral-500 mt-1">{formatDate(stage.date)}</div>}
                      <div className="text-[11px] text-neutral-500 mt-0.5">{stage.owner}</div>
                      {stage.key === 'review' && stage.state === 'current' && reviewActivity.length === 0 && (
                        <div className="mt-1 text-[11px] text-neutral-400 italic">Awaiting DoE review</div>
                      )}
                      {stage.key === 'review' && reviewActivity.length > 0 && (
                        <button
                          onClick={() => setReviewOpen((v) => !v)}
                          className="mt-1.5 text-[11.5px] font-semibold text-info-500 hover:underline inline-flex items-center gap-1"
                          aria-expanded={reviewOpen}
                        >
                          <span className={cn('text-[8px] transition-transform duration-200', reviewOpen && 'rotate-180')}>▼</span>
                          {reviewOpen ? 'Hide Review Activity' : `Review Activity (${reviewActivity.length})`}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* optional expanded review activity — a compact timeline below the
              stepper, so it never cramps the middle column. */}
          {reviewActivity.length > 0 && (
            <div className={cn('overflow-hidden transition-all duration-200 ease-in-out', reviewOpen ? 'max-h-[420px] opacity-100 mt-3 pt-3 border-t border-neutral-100' : 'max-h-0 opacity-0')}>
              <div className="text-[10px] font-sans uppercase tracking-[0.16em] text-neutral-400 mb-1.5">DoE Review · Activity</div>
              <ActivityFeed items={reviewActivity} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Compact, borderless activity feed: a thin timeline connector with small
// coloured status dots, bold titles, grey reviewer • date metadata, and an
// optional per-row "View comment" disclosure. No cards / heavy borders.
function ActivityFeed({ items }: { items: ActivityItem[] }) {
  const [openComments, setOpenComments] = useState<Set<number>>(new Set());
  const toggle = (i: number) => setOpenComments((prev) => {
    const n = new Set(prev); n.has(i) ? n.delete(i) : n.add(i); return n;
  });
  return (
    <ol className="mt-3 ms-0.5">
      {items.map((it, i) => {
        const last = i === items.length - 1;
        const open = openComments.has(i);
        return (
          <li key={i} className={cn('relative ps-4', last ? 'pb-0' : 'pb-3.5')}>
            {/* thin connector */}
            {!last && <span className="absolute left-[4px] top-[10px] bottom-0 w-px bg-neutral-200" />}
            {/* small coloured status dot */}
            <span className="absolute left-0 top-[3px] w-[9px] h-[9px] rounded-full ring-2 ring-white" style={{ background: TONE[it.tone] }} />
            <div className="text-[12px] font-semibold text-ink-950 leading-tight">{it.label}</div>
            {(it.by || it.at) && (
              <div className="text-[10.5px] text-neutral-500 mt-0.5">
                {it.by && <span>{it.by}</span>}
                {it.by && it.at && <span className="text-neutral-300"> • </span>}
                {it.at && <span className="font-mono">{fmtActivityTime(it.at)}</span>}
              </div>
            )}
            {it.detail && <div className="text-[10.5px] text-neutral-500 mt-0.5">{it.detail}</div>}
            {it.comment && (
              <>
                <button
                  onClick={() => toggle(i)}
                  className="mt-1 text-[10.5px] font-semibold text-info-500 hover:underline inline-flex items-center gap-1"
                  aria-expanded={open}
                >
                  {open ? 'Hide comment' : 'View comment'}
                  <span className={cn('text-[8px] transition-transform duration-200', open && 'rotate-180')}>▼</span>
                </button>
                <div className={cn('overflow-hidden transition-all duration-200 ease-in-out', open ? 'max-h-40 opacity-100 mt-1' : 'max-h-0 opacity-0')}>
                  <div className="text-[11px] text-neutral-700 bg-neutral-50 rounded-md px-2.5 py-1.5 italic leading-relaxed">&ldquo;{it.comment}&rdquo;</div>
                </div>
              </>
            )}
          </li>
        );
      })}
    </ol>
  );
}

// "23 Jun 2026, 10:12 AM" — day-first date with a 12-hour clock for the feed.
function fmtActivityTime(iso?: string) {
  if (!iso) return '';
  const time = new Date(iso).toLocaleString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
  return `${formatDate(iso)}, ${time}`;
}

function textForState(state: NodeState) {
  return state === 'current' ? 'text-info-500' : state === 'completed' ? 'text-ink-950' : 'text-neutral-400';
}

function StateBadge({ state }: { state: NodeState }) {
  const meta =
    state === 'completed' ? { cls: 'bg-success-soft text-success-500', label: 'Completed' } :
    state === 'current' ? { cls: 'bg-info-soft text-info-500', label: 'Current' } :
    { cls: 'bg-neutral-100 text-neutral-500', label: 'Pending' };
  return <span className={cn('text-[9.5px] font-sans font-semibold uppercase tracking-wider px-2 h-[18px] inline-flex items-center rounded-full', meta.cls)}>{meta.label}</span>;
}

function StageIcon({ state }: { state: NodeState }) {
  if (state === 'completed') {
    return (
      <span className="relative z-10 inline-grid place-items-center w-6 h-6 rounded-full bg-success-500 text-white">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
      </span>
    );
  }
  if (state === 'current') {
    return (
      <span className="relative z-10 inline-grid place-items-center w-6 h-6 rounded-full border-2 border-info-500 bg-white ring-2 ring-info-500/20">
        <span className="w-2.5 h-2.5 rounded-full bg-info-500" />
      </span>
    );
  }
  return (
    <span className="relative z-10 inline-grid place-items-center w-6 h-6 rounded-full border-2 border-neutral-200 bg-white">
      <span className="w-2 h-2 rounded-full bg-neutral-200" />
    </span>
  );
}
