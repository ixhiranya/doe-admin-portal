import { useMemo, useState } from 'react';
import { cn, formatDateTime } from '../../lib/utils';
import { useAuth } from '../../store/auth';
import { usePpsSubmissions } from '../../store/ppsSubmissions';
import { STAGE_LABELS } from './workflow';
import type { Submission, SubmissionWorkflowEvent, PpsComment } from '../../types/pps';

// ============================================================================
// AuditAndComments — mirrors NOC's tabbed audit-history + comments-thread UX
// on the PPS submission detail page.
//
//  • Audit History  → vertical timeline built from `sub.workflow` events, each
//                     enriched with an icon + colour-coded badge per action.
//  • Comments        → flat list with avatar + role chip + internal/external
//                     toggle + reply quoting. Live-wired to `addComment` on
//                     the PPS submissions store.
// ============================================================================

export function AuditAndComments({ submission, entityFlow = false }: { submission: Submission; entityFlow?: boolean }) {
  const user = useAuth((s) => s.user);
  const addComment = usePpsSubmissions((s) => s.addComment);
  const [tab, setTab] = useState<'audit' | 'comments'>('audit');
  const [newBody, setNewBody] = useState('');
  const [internal, setInternal] = useState(false);
  const [filter, setFilter] = useState<'all' | 'internal' | 'external'>('all');
  const [replyTo, setReplyTo] = useState<PpsComment | null>(null);
  const [error, setError] = useState<string | null>(null);

  const allComments = submission.comments ?? [];
  const isRegulator = user?.role === 'pps_reviewer' || user?.role === 'pps_approver';
  // Entity users never see internal notes (they aren't sent to applicants).
  const visibleComments = useMemo(() => {
    const base = isRegulator ? allComments : allComments.filter((c) => !c.internal);
    if (filter === 'all') return base;
    if (filter === 'internal') return base.filter((c) => c.internal);
    return base.filter((c) => !c.internal);
  }, [allComments, isRegulator, filter]);

  const auditEntries = useMemo(() => enrichAuditTimeline(submission, entityFlow), [submission, entityFlow]);

  function handlePost() {
    if (!user) { setError('Sign in required'); return; }
    if (!newBody.trim()) return;
    const result = addComment(submission.id, { id: user.id, name: user.name, role: user.role }, newBody, {
      internal,
      replyToId: replyTo?.id,
      entityTag: user.role === 'pps_entity' && user.company ? user.company.name.toUpperCase().slice(0, 14) : undefined,
    });
    if (!result.ok) { setError(result.error ?? 'Failed to post'); return; }
    setNewBody(''); setReplyTo(null); setError(null);
  }

  return (
    <section className="card p-5">
      <div className="flex items-center justify-between mb-3 border-b border-neutral-100 pb-2">
        <div className="flex items-center gap-1">
          <TabHead id="audit"    current={tab} onClick={setTab} icon={<ClockIcon />}   label="Audit History" badge={auditEntries.length} />
          <TabHead id="comments" current={tab} onClick={setTab} icon={<CommentIcon />} label="Comments"      badge={isRegulator ? allComments.length : allComments.filter((c) => !c.internal).length} />
        </div>
        <div className="text-[10.5px] font-mono text-neutral-500">Persistent across tabs · time in GST (UTC+4)</div>
      </div>

      {tab === 'audit'   && <AuditHistoryList entries={auditEntries} />}
      {tab === 'comments' && (
        <CommentsThread
          comments={visibleComments}
          allComments={allComments}
          isRegulator={isRegulator}
          filter={filter}
          setFilter={setFilter}
          replyTo={replyTo}
          setReplyTo={setReplyTo}
          newBody={newBody}
          setNewBody={setNewBody}
          internal={internal}
          setInternal={setInternal}
          onPost={handlePost}
          error={error}
          user={user ? { name: user.name, role: roleLabelFor(user.role) } : null}
        />
      )}
    </section>
  );
}

// ============================================================================
// Audit History tab
// ============================================================================

function AuditHistoryList({ entries }: { entries: AuditEntry[] }) {
  if (entries.length === 0) {
    return <div className="text-[12.5px] text-neutral-500 text-center py-8">No audit events yet. Once the submission is submitted, every transition will be recorded here.</div>;
  }
  return (
    <ol className="relative space-y-4 ml-2 pl-6 border-l-2 border-action-orange/15">
      {entries.map((t) => (
        <li key={t.id} className="relative">
          <span className={cn('absolute -left-[33px] top-1 w-6 h-6 rounded-full grid place-items-center ring-4 ring-white text-[11px] font-bold', t.iconBg)}>
            {t.icon}
          </span>
          <div className="bg-white border border-neutral-100 rounded-lg p-3 shadow-doe-xs">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-2">
                <strong className="text-[13px] text-ink-950">{t.title}</strong>
                <span className={cn('chip-sm uppercase tracking-wider', t.badgeCls)}>{t.badge}</span>
              </div>
              <div className="text-right">
                <div className="text-[11px] font-mono text-neutral-700">{formatDateTime(t.at)}</div>
                {t.relative && <div className="text-[10.5px] text-neutral-400">{t.relative}</div>}
              </div>
            </div>
            <div className="mt-1.5 flex items-center gap-2">
              <Avatar name={t.actor} size={20} />
              <div className="text-[11.5px] text-neutral-500">{t.actor}{t.actorRole ? ` · ${t.actorRole}` : ''}</div>
            </div>
            {t.note && (
              <div className="mt-2 text-[12px] text-neutral-700 bg-neutral-50 border border-neutral-100 rounded px-3 py-2 italic">&ldquo;{t.note}&rdquo;</div>
            )}
          </div>
        </li>
      ))}
    </ol>
  );
}

interface AuditEntry {
  id: string;
  title: string;
  badge: string;
  badgeCls: string;
  icon: string;
  iconBg: string;
  at: string;
  relative?: string;
  actor: string;
  actorRole?: string;
  note?: string;
}

function enrichAuditTimeline(sub: Submission, entityFlow = false): AuditEntry[] {
  // Entity (Ahmed) view: the audit history must mirror the 3-step workflow, so a
  // "DoE Review" event is always represented. If the stored trail jumps straight
  // from Submitted → Approved (a straight-through approval), synthesise the review
  // event so the timeline reads Submitted › DoE Review › Approved & Published.
  // Returned/Re-submitted trails already carry their own review events.
  let events = sub.workflow;
  if (entityFlow) {
    const hasReview = events.some((w) => w.stage === 'doe_review' || w.stage === 'returned' || w.stage === 'resubmitted');
    const submittedIdx = events.findIndex((w) => w.stage === 'submitted');
    const progressed = events.some((w) => w.stage === 'approved' || w.stage === 'rejected');
    if (!hasReview && submittedIdx !== -1 && progressed) {
      const reviewEvent: SubmissionWorkflowEvent = {
        at: events[submittedIdx].at,
        stage: 'doe_review',
        by: 'Khalid Al Qubaisi',
        byRole: 'DoE PPS Reviewer',
        comment: 'Initial review of the annual submission.',
      };
      events = [...events.slice(0, submittedIdx + 1), reviewEvent, ...events.slice(submittedIdx + 1)];
    }
  }
  return events.map((w, idx) => {
    const stageLabel = STAGE_LABELS[w.stage as keyof typeof STAGE_LABELS]
      ?? (w.stage === 'rejected' ? 'Rejected' : w.stage.charAt(0).toUpperCase() + w.stage.slice(1));
    let badge = 'EVENT', badgeCls = 'bg-neutral-100 text-neutral-700', icon = '·', iconBg = 'bg-neutral-200 text-neutral-700';
    if (w.stage === 'submitted')   { badge = 'SUBMITTED';   badgeCls = 'bg-info-soft text-info-500';       icon = '↑'; iconBg = 'bg-info-500 text-white'; }
    if (w.stage === 'doe_review')  { badge = 'IN REVIEW';   badgeCls = 'bg-lavender text-[#7B3FE4]';       icon = '⌕'; iconBg = 'bg-[#7B3FE4] text-white'; }
    if (w.stage === 'returned')    { badge = 'RETURNED';    badgeCls = 'bg-warning-soft text-warning-500'; icon = '↺'; iconBg = 'bg-warning-500 text-white'; }
    if (w.stage === 'resubmitted') { badge = 'RE-SUBMITTED';badgeCls = 'bg-info-soft text-info-500';       icon = '↺'; iconBg = 'bg-info-500 text-white'; }
    if (w.stage === 'approved')    { badge = 'APPROVED';    badgeCls = 'bg-success-soft text-success-500'; icon = '✓'; iconBg = 'bg-success-500 text-white'; }
    if (w.stage === 'rejected')    { badge = 'REJECTED';    badgeCls = 'bg-danger-soft text-danger-500';   icon = '✕'; iconBg = 'bg-danger-500 text-white'; }
    return {
      id: `audit-${idx}-${w.at}`,
      title: stageLabel,
      badge, badgeCls, icon, iconBg,
      at: w.at,
      relative: idx > 0 ? humanGap(events[idx - 1].at, w.at) : undefined,
      actor: w.by,
      actorRole: w.byRole,
      note: w.comment,
    } as AuditEntry;
  });
}

function humanGap(a: string, b: string): string {
  const diffMs = new Date(b).getTime() - new Date(a).getTime();
  if (!Number.isFinite(diffMs) || diffMs < 0) return '';
  const min = Math.round(diffMs / 60000);
  if (min < 60) return `${min}m later`;
  const h = Math.round(min / 60);
  if (h < 24) return `${h}h later`;
  const d = Math.round(h / 24);
  return `${d}d later`;
}

// ============================================================================
// Comments tab
// ============================================================================

function CommentsThread({
  comments, allComments, isRegulator, filter, setFilter, replyTo, setReplyTo,
  newBody, setNewBody, internal, setInternal, onPost, error, user,
}: {
  comments: PpsComment[];
  allComments: PpsComment[];
  isRegulator: boolean;
  filter: 'all' | 'internal' | 'external';
  setFilter: (f: 'all' | 'internal' | 'external') => void;
  replyTo: PpsComment | null;
  setReplyTo: (c: PpsComment | null) => void;
  newBody: string;
  setNewBody: (s: string) => void;
  internal: boolean;
  setInternal: (b: boolean) => void;
  onPost: () => void;
  error: string | null;
  user: { name: string; role: string } | null;
}) {
  const charLimit = 1000;
  const allCount      = isRegulator ? allComments.length : allComments.filter((c) => !c.internal).length;
  const internalCount = allComments.filter((c) => c.internal).length;
  const externalCount = allComments.filter((c) => !c.internal).length;

  return (
    <div>
      {/* Filter pills — internal pill only visible to regulators */}
      <div className="flex items-center gap-1 mb-4 text-[11.5px]">
        <FilterPill active={filter === 'all'}      onClick={() => setFilter('all')}>All · {allCount}</FilterPill>
        {isRegulator && <FilterPill active={filter === 'internal'} onClick={() => setFilter('internal')}>Internal · {internalCount}</FilterPill>}
        <FilterPill active={filter === 'external'} onClick={() => setFilter('external')}>External · {externalCount}</FilterPill>
      </div>

      {/* Thread */}
      <div className="space-y-3">
        {comments.map((c) => (
          <CommentItem
            key={c.id}
            comment={c}
            replyTarget={c.replyToId ? allComments.find((x) => x.id === c.replyToId) : undefined}
            onReply={() => setReplyTo(c)}
          />
        ))}
        {comments.length === 0 && (
          <div className="text-[12.5px] text-neutral-500 text-center py-8">No {filter === 'all' ? '' : filter + ' '}comments yet.</div>
        )}
      </div>

      {/* Composer */}
      {user ? (
        <div className="mt-6 pt-5 border-t border-neutral-100">
          {replyTo && (
            <div className="mb-2.5 flex items-center justify-between bg-neutral-50 border border-neutral-100 rounded-md px-3 py-2 text-[11.5px]">
              <div className="text-neutral-700">
                Replying to <strong>{replyTo.byUserName}</strong>: <span className="text-neutral-500 italic line-clamp-1">&ldquo;{replyTo.body}&rdquo;</span>
              </div>
              <button onClick={() => setReplyTo(null)} className="text-neutral-400 hover:text-neutral-700">×</button>
            </div>
          )}
          <div className="flex gap-3">
            <Avatar name={user.name} size={36} />
            <div className="flex-1">
              <div className={cn(
                'rounded-lg border bg-white transition focus-within:ring-2 overflow-hidden',
                internal
                  ? 'border-neutral-200 border-l-[3px] border-l-warning-500/70 focus-within:border-warning-500 focus-within:ring-warning-500/15'
                  : 'border-neutral-200 focus-within:border-action-orange focus-within:ring-action-orange/15',
              )}>
                {internal && (
                  <div className="flex items-center gap-1.5 px-3 pt-2 text-[10px] font-sans uppercase tracking-[0.16em] text-warning-500">
                    <LockSmall /> Internal note · not visible to the entity submitter
                  </div>
                )}
                <textarea
                  value={newBody}
                  onChange={(e) => setNewBody(e.target.value.slice(0, charLimit))}
                  placeholder={internal
                    ? 'Add an internal note for the next DoE reviewer…'
                    : isRegulator ? 'Reply to the entity submitter…' : 'Add a note for the DoE reviewer…'}
                  className="w-full p-3 bg-transparent border-0 text-[13px] min-h-[88px] focus:outline-none resize-none placeholder:text-neutral-400"
                />
                <div className="flex items-center justify-between gap-2 px-3 pb-2 border-t border-neutral-100 pt-2">
                  <div className="flex items-center gap-1 text-neutral-400">
                    <ToolbarBtn title="Bold"><strong>B</strong></ToolbarBtn>
                    <ToolbarBtn title="Italic"><em>I</em></ToolbarBtn>
                    <ToolbarBtn title="Attach"><AttachIcon /></ToolbarBtn>
                    <ToolbarBtn title="Mention">@</ToolbarBtn>
                  </div>
                  <div className="text-[10.5px] font-mono text-neutral-400">
                    {newBody.length} / {charLimit}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between mt-2.5 flex-wrap gap-2">
                <label className={cn('flex items-center gap-2 text-[12px] cursor-pointer select-none', isRegulator ? 'text-neutral-700' : 'text-neutral-400')}>
                  <input
                    type="checkbox"
                    checked={internal}
                    disabled={!isRegulator}
                    onChange={(e) => setInternal(e.target.checked)}
                    className="w-3.5 h-3.5 rounded border-neutral-300 text-warning-500 focus:ring-warning-500 disabled:opacity-40"
                  />
                  Post as <strong className={cn(internal && 'text-warning-500')}>{internal ? 'internal note' : 'public reply'}</strong>
                  <span className="text-neutral-400">·</span>
                  <span className="text-neutral-500">Posting as {user.name} ({user.role})</span>
                </label>
                <div className="flex items-center gap-2">
                  {error && <span className="text-[11.5px] text-danger-500">{error}</span>}
                  <button
                    onClick={() => { setNewBody(''); setReplyTo(null); }}
                    disabled={!newBody.trim() && !replyTo}
                    className="h-8 px-3 rounded-md bg-white border border-neutral-200 text-neutral-700 text-[12px] font-semibold hover:bg-neutral-50 disabled:opacity-40"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={onPost}
                    disabled={!newBody.trim()}
                    className={cn(
                      'h-8 px-3.5 rounded-md text-white text-[12px] font-semibold flex items-center gap-1.5 disabled:opacity-40',
                      internal ? 'bg-warning-500 hover:opacity-90' : 'bg-action-orange hover:bg-action-orange-dark',
                    )}
                  >
                    {internal ? 'Post internal note' : 'Post comment'} <SendIcon />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="mt-6 pt-5 border-t border-neutral-100 text-[12px] text-neutral-500 text-center">Sign in to add a comment.</div>
      )}
    </div>
  );
}

function CommentItem({ comment, replyTarget, onReply }: { comment: PpsComment; replyTarget?: PpsComment; onReply: () => void }) {
  const isInternal = comment.internal;
  const isEntity = comment.byUserRole === 'Entity Submitter';
  return (
    <div
      className={cn(
        'flex gap-3 rounded-lg p-3 transition relative',
        isInternal
          ? 'bg-white border border-neutral-100 border-l-[3px] border-l-warning-500/70'
          : 'bg-white border border-neutral-100',
      )}
    >
      <Avatar name={comment.byUserName} size={36} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap mb-1">
          <strong className="text-[13px] text-ink-950 leading-none">{comment.byUserName}</strong>
          <span className={cn(
            'inline-flex items-center h-5 px-2 rounded-full text-[10px] font-semibold uppercase tracking-wider',
            isEntity ? 'bg-info-soft text-info-500' : 'bg-neutral-100 text-neutral-700',
          )}>
            {comment.byUserRole}{comment.entityTag ? ` · ${comment.entityTag}` : ''}
          </span>
          {isInternal && (
            <span className="inline-flex items-center gap-1 h-5 px-2 rounded-full text-[10px] font-semibold uppercase tracking-wider bg-warning-soft text-warning-500">
              <LockSmall /> Internal
            </span>
          )}
          <span className="ml-auto text-[10.5px] font-mono text-neutral-500">{formatDateTime(comment.at)}</span>
        </div>

        {replyTarget && (
          <div className="my-2 border-l-2 border-action-orange/40 pl-2.5 text-[11.5px] text-neutral-500">
            <div className="flex items-center gap-1.5">
              <span className="font-semibold text-neutral-700">{replyTarget.byUserName}</span>
              <span className="text-neutral-400">·</span>
              <span className="italic">{replyTarget.byUserRole}</span>
            </div>
            <p className="line-clamp-2">{replyTarget.body}</p>
          </div>
        )}

        <p className="text-[13px] text-ink-950 leading-relaxed whitespace-pre-wrap">{comment.body}</p>

        <div className="mt-2 flex items-center gap-1 text-[11.5px] text-neutral-500">
          <CommentAction icon={<ReplyIcon />} onClick={onReply}>Reply</CommentAction>
          <CommentAction icon={<QuoteIcon />}>Quote</CommentAction>
          <CommentAction icon={<LinkIcon />}>Copy link</CommentAction>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Small UI primitives (Avatar / TabHead / FilterPill / icons)
// ============================================================================

function Avatar({ name, size = 32 }: { name: string; size?: number }) {
  const initials = name.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase();
  const palette = [
    { bg: 'bg-info-soft',          fg: 'text-info-500' },
    { bg: 'bg-action-orange-soft', fg: 'text-action-orange-deep' },
    { bg: 'bg-success-soft',       fg: 'text-success-500' },
    { bg: 'bg-lavender',           fg: 'text-[#7B3FE4]' },
    { bg: 'bg-doe-red-soft',       fg: 'text-doe-red' },
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) & 0xffff;
  const c = palette[hash % palette.length];
  return (
    <div
      className={cn('rounded-full grid place-items-center font-bold flex-shrink-0', c.bg, c.fg)}
      style={{ width: size, height: size, fontSize: Math.round(size * 0.32) }}
    >
      {initials}
    </div>
  );
}

function TabHead({ id, current, onClick, icon, label, badge }: { id: 'audit' | 'comments'; current: 'audit' | 'comments'; onClick: (id: 'audit' | 'comments') => void; icon: React.ReactNode; label: string; badge?: number }) {
  const active = current === id;
  return (
    <button
      onClick={() => onClick(id)}
      className={cn(
        'flex items-center gap-2 px-3.5 h-9 text-[12.5px] font-semibold border-b-2 -mb-[2px]',
        active ? 'border-action-orange text-ink-950' : 'border-transparent text-neutral-500 hover:text-ink-950',
      )}
    >
      <span className={cn(active ? 'text-action-orange' : 'text-neutral-400')}>{icon}</span>
      {label}
      {badge != null && (
        <span className={cn(
          'inline-flex items-center h-5 px-1.5 rounded-full text-[10px] font-bold',
          active ? 'bg-action-orange text-white' : 'bg-neutral-100 text-neutral-600',
        )}>
          {badge}
        </span>
      )}
    </button>
  );
}

function FilterPill({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'px-2.5 h-6 rounded-full font-semibold uppercase tracking-wider transition',
        active ? 'bg-ink-950 text-white' : 'bg-white border border-neutral-200 text-neutral-500 hover:text-ink-950',
      )}
    >
      {children}
    </button>
  );
}

function CommentAction({ icon, children, onClick }: { icon: React.ReactNode; children: React.ReactNode; onClick?: () => void }) {
  return (
    <button onClick={onClick} className="inline-flex items-center gap-1 h-6 px-1.5 rounded hover:bg-neutral-100 hover:text-ink-950">
      <span className="opacity-70">{icon}</span>
      {children}
    </button>
  );
}

function ToolbarBtn({ title, children }: { title: string; children: React.ReactNode }) {
  return <button type="button" title={title} className="w-7 h-7 rounded grid place-items-center text-[12px] hover:bg-neutral-100">{children}</button>;
}

function roleLabelFor(role: string): string {
  return ({
    pps_entity:   'Entity Submitter',
    pps_reviewer: 'DoE PPS Reviewer',
    pps_approver: 'DoE Approver',
  } as Record<string, string>)[role] ?? role;
}

// ----- Icons (inline so we don't add another dep) ---------------------------
function ClockIcon()   { return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>; }
function CommentIcon() { return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>; }
function LockSmall()   { return <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>; }
function ReplyIcon()   { return <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 17 4 12 9 7"/><path d="M20 18v-2a4 4 0 0 0-4-4H4"/></svg>; }
function QuoteIcon()   { return <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 21c3 0 7-1 7-8V5c0-1-1-2-2-2H4c-1 0-2 1-2 2v6c0 1 1 2 2 2h3"/><path d="M14 21c3 0 7-1 7-8V5c0-1-1-2-2-2h-4c-1 0-2 1-2 2v6c0 1 1 2 2 2h3"/></svg>; }
function LinkIcon()    { return <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 1 0-7-7l-2 2"/><path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l2-2"/></svg>; }
function AttachIcon()  { return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>; }
function SendIcon()    { return <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>; }

// keep unused import referenced for clarity (re-used in the data narrative)
void (null as unknown as SubmissionWorkflowEvent);
