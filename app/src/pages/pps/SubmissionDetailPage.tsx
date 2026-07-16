import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { LPG_DEMAND_MATRIX, LPG_SEASONAL_MATRIX } from '../../data/pps';
import { useAuth } from '../../store/auth';
import { usePpsSubmissions, getAvailableTransitions } from '../../store/ppsSubmissions';
import { cn, AHMED_ID, OMAR_ID } from '../../lib/utils';
import { formatDate, formatDateTime } from '../../lib/utils';
import { StatusPill } from '../../components/pps/StatusPill';
import { SuccessModal } from '../../components/pps/SuccessModal';
import { WorkflowTimeline } from '../../components/pps/WorkflowTimeline';
import { EntityWorkflowCard } from '../../components/pps/EntityWorkflowCard';
import { SubmissionCompareView } from '../../components/pps/SubmissionCompareView';
import { AuditAndComments } from '../../components/pps/AuditAndComments';
import { STATUS_META } from '../../components/pps/workflow';
import { TemplateReadOnlySections, LpgReadOnlySections } from './SubmissionFormPage';
import { getEntityTemplate, REPORT_END_YEAR } from '../../data/pps-fields';
import type { PpsTransitionDef, PpsTransitionId, ReviewRemark, Submission } from '../../types/pps';

// Omar's Action Required items are surfaced as "Returned for Clarification" (see
// OmarActionCard). This builds the matching returned-state VIEW of a submission —
// status badge, 3-step workflow (Submitted → Reviewed → Returned → awaiting entity),
// audit trail, reviewer remark and Comments-tab entry — from a `submitted` record,
// WITHOUT mutating the store or any form values. Display-only; the real submission
// (and its review actions) are unchanged.
function buildReturnedView(s: Submission): Submission {
  const submittedAt = s.submittedOn ?? s.workflow.find((w) => w.stage === 'submitted')?.at ?? s.workflow[0]?.at ?? s.submittedOn ?? '';
  const baseMs = submittedAt ? new Date(submittedAt).getTime() : 0;
  const reviewAt   = baseMs ? new Date(baseMs + 2 * 24 * 3600 * 1000).toISOString() : submittedAt;
  const returnedAt = baseMs ? new Date(baseMs + 4 * 24 * 3600 * 1000).toISOString() : submittedAt;
  const comment = 'Please clarify the Q3 distributor volume variance against your internal records and re-submit with a supporting note.';
  const reviewer = 'Omar Al Suwaidi';
  const reviewerRole = 'DoE PPS Approver';
  return {
    ...s,
    status: 'returned',
    workflow: [
      { at: submittedAt, stage: 'submitted',  by: s.submittedBy ?? s.entityName, byRole: 'Entity Submitter' },
      { at: reviewAt,    stage: 'doe_review', by: reviewer, byRole: reviewerRole },
      { at: returnedAt,  stage: 'returned',   by: reviewer, byRole: reviewerRole, comment },
    ],
    reviewRemarks: [
      ...(s.reviewRemarks ?? []),
      { at: returnedAt, by: reviewer, byRole: reviewerRole, kind: 'returned', title: 'Returned for clarification', body: comment },
    ],
    comments: [
      ...(s.comments ?? []),
      { id: `clarif-${s.id}`, at: returnedAt, byUserId: OMAR_ID, byUserName: reviewer, byUserRole: reviewerRole, internal: false, body: comment },
    ],
  };
}

// DoE-side review decisions. Each decision is recorded against the actual
// signed-in reviewer (name + role) so the audit trail is accurate.
type ReviewActionDef = {
  key: 'approve' | 'info' | 'reject';
  transitionId: PpsTransitionId;
  label: string;
  modalTitle: string;
  modalDesc: string;
  modalTone: 'info' | 'warning';      // header banner tone (warning = reject)
  requiresText: boolean;
  requiredError?: string;             // inline validation message when mandatory + empty
  commentLabel: string;               // textarea label
  commentHelper: string;              // helper text under the textarea
  confirmLabel: string;
  variant: 'primary' | 'danger';
  success: { title: string; message: string; tone: 'success' | 'danger' | 'info' };
};
// Every decision dialog captures reviewer comments into the audit trail. Approve
// comments are optional; Reject + Request-More-Info comments are mandatory.
const REVIEW_ACTIONS: ReviewActionDef[] = [
  { key: 'approve', transitionId: 'approve', label: 'Approve', modalTitle: 'Approve Submission', modalTone: 'info',
    modalDesc: 'This submission will be approved and published to the PPS Dashboard.',
    requiresText: false,
    commentLabel: 'Approval Comments (Optional)',
    commentHelper: 'These comments will be recorded in the audit history and will be visible to authorized users.',
    confirmLabel: 'Approve & Publish', variant: 'primary',
    success: { title: 'Submission approved & published', message: 'The submission has been approved and published to the PPS Dashboard.', tone: 'success' } },
  { key: 'info', transitionId: 'return_for_clarification', label: 'Request More Info', modalTitle: 'Request More Information', modalTone: 'info',
    modalDesc: 'Describe the additional information or clarification required from the entity before the submission can proceed.',
    requiresText: true, requiredError: 'Please describe the information required.',
    commentLabel: 'Requested Information',
    commentHelper: 'This request will be sent to the entity submitter and recorded in the audit trail.',
    confirmLabel: 'Submit Request', variant: 'primary',
    success: { title: 'Request sent', message: 'Request for additional information sent successfully.', tone: 'info' } },
  { key: 'reject', transitionId: 'reject', label: 'Reject', modalTitle: 'Reject Submission', modalTone: 'warning',
    modalDesc: 'This submission will be rejected and cannot proceed until the entity submits a new application.',
    requiresText: true, requiredError: 'Rejection reason is required.',
    commentLabel: 'Rejection Reason',
    commentHelper: 'Provide a clear reason for rejection. This information will be shared with the submitting entity and recorded in the audit trail.',
    confirmLabel: 'Reject Submission', variant: 'danger',
    success: { title: 'Submission rejected', message: 'The submission has been rejected.', tone: 'danger' } },
];

export function PpsSubmissionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const user = useAuth((s) => s.user);
  const sub = usePpsSubmissions((s) => s.getById(id ?? ''));
  const runTransition = usePpsSubmissions((s) => s.runTransition);
  const saveDraft = usePpsSubmissions((s) => s.saveDraft);
  const [pendingT, setPendingT] = useState<PpsTransitionDef | null>(null);
  const [comment, setComment] = useState('');
  const [actionError, setActionError] = useState<string | null>(null);
  const [reviewAction, setReviewAction] = useState<ReviewActionDef | null>(null);
  const [reviewText, setReviewText] = useState('');
  const [reviewError, setReviewError] = useState<string | null>(null);
  const [success, setSuccess] = useState<ReviewActionDef['success'] | null>(null);
  // LPG-only experiment (approver): the workflow card starts collapsed.
  const [wfExpanded, setWfExpanded] = useState(false);
  // Sticky review header — activates its pinned styling once the reviewer starts
  // scrolling. Used only on the Submitted review screen (see stickyHeader).
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 4);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);
  // v1 ↔ v2 comparison mode (Omar only). Same-page swap; scroll position is
  // preserved across enter/exit.
  const [compareMode, setCompareMode] = useState(false);
  const enterCompare = () => { const y = window.scrollY; setCompareMode(true); requestAnimationFrame(() => window.scrollTo(0, y)); };
  const exitCompare = () => { const y = window.scrollY; setCompareMode(false); requestAnimationFrame(() => window.scrollTo(0, y)); };
  if (!sub) return <div className="p-6">Submission not found.</div>;

  // Revised reporting period (2019–2026): clamp the seeded year columns and mark
  // 2026 as the single current/editable column for the bespoke read-only tables.
  const years = sub.years.filter((y) => y <= REPORT_END_YEAR);
  const forecastFromIdx = Math.max(0, years.indexOf(REPORT_END_YEAR));
  // Finalized View experience: the collapsible 3-step workflow, clarification
  // banner, exact read-only form mirror, no reconciliation UI, and workflow-
  // mirrored audit history. Applies to the entity submitter (Ahmed) and the
  // internal DoE PPS Approver (Omar). `isOmar` gates internal-only behaviour
  // (entity write-actions hidden); Mariam keeps her existing approver view.
  const isOmar = user?.id === OMAR_ID;
  const finalizedUx = user?.id === AHMED_ID || isOmar;
  // Omar's Action Required badges `submitted` items as "Returned for Clarification"
  // (OmarActionCard). Render the matching returned state on the review screen so the
  // list and detail agree. `sub` (real, still `submitted`) drives the review actions
  // and form; `displaySub` drives status badge / workflow / audit / comments only.
  const showReturnedForOmar = isOmar && sub.status === 'submitted';
  const displaySub = showReturnedForOmar ? buildReturnedView(sub) : sub;
  // LPG-only · DoE Approver (Mariam): collapse the Submission Workflow by default.
  const lpgApproverWorkflow = sub.productId === 'lpg' && user?.role === 'pps_approver';
  // Generic products (everything except the bespoke LPG form) render a 1:1
  // read-only mirror of their Submission Form straight from the entity template.
  const roTemplate = getEntityTemplate(sub.productId);
  const availableTransitions = user ? getAvailableTransitions(sub, user.role) : [];
  const reviewable = ['submitted', 'in_review', 'resubmitted'].includes(sub.status);
  // Sticky review/view header — enabled for Omar Al Suwaidi (DoE PPS Approver)
  // ONLY, across ALL products and ALL statuses. Excludes Ahmed, Mariam, and every
  // other role (gated on the user id, not the role).
  const stickyHeader = isOmar;
  // v1 ↔ v2 comparison is available to Omar only, once a clarification cycle has
  // produced a re-submitted (v2) version (a `returned` event exists).
  const canCompare = isOmar && sub.workflow.some((w) => w.stage === 'returned');
  const v1SubmittedAt = [...sub.workflow].find((w) => w.stage === 'submitted')?.at;
  const v2SubmittedAt = [...sub.workflow].reverse().find((w) => w.stage === 'resubmitted')?.at ?? sub.submittedOn;

  function openTransition(t: PpsTransitionDef) {
    setComment('');
    setActionError(null);
    setPendingT(t);
  }
  function confirmTransition() {
    if (!pendingT || !user) return;
    const result = runTransition(sub!.id, pendingT.id, { id: user.id, name: user.name, role: user.role }, comment.trim() || undefined);
    if (!result.ok) { setActionError(result.error ?? 'Action failed.'); return; }
    setPendingT(null);
  }

  function openReview(a: ReviewActionDef) {
    setReviewText('');
    setReviewError(null);
    setReviewAction(a);
  }
  function confirmReview() {
    if (!reviewAction || !user) return;
    // Mandatory-comment validation (Reject + Request More Info) — keep the dialog
    // open with an inline error until a valid reason is entered.
    if (reviewAction.requiresText && !reviewText.trim()) {
      setReviewError(reviewAction.requiredError ?? 'A comment is required.');
      return;
    }
    // Record the decision against the actual signed-in reviewer so the audit
    // trail shows the real name + role + comment + resulting status.
    const result = runTransition(sub!.id, reviewAction.transitionId, { id: user.id, name: user.name, role: user.role }, reviewText.trim() || undefined);
    if (!result.ok) { setReviewError(result.error ?? 'Action failed.'); return; }
    const s = reviewAction.success;
    setReviewAction(null);
    setSuccess(s);
  }

  // Demo-mode draft actions on the View (all products, no role/state checks).
  function demoSaveDraft() {
    saveDraft(sub!.id, {});
    setSuccess({ title: 'Draft saved', message: 'Your draft has been saved.', tone: 'success' });
  }
  function demoSubmit() {
    const now = new Date().toISOString();
    const actor = sub!.entityName || 'ADNOC Distribution';
    saveDraft(sub!.id, {
      status: 'submitted',
      submittedOn: now,
      submittedBy: actor,
      version: 'v1',
      workflow: [{ at: now, stage: 'submitted', by: actor }],
      reviewRemarks: [],
    });
    setSuccess({ title: 'Submission received', message: 'Submission successful — sent to DoE for review.', tone: 'success' });
  }
  // Rejected → start an amendment: reset to an editable draft (v2 amended) and
  // open the form so the entity can correct and re-submit.
  function createAmendment() {
    saveDraft(sub!.id, { status: 'draft', version: 'v2 (amended)', workflow: [], submittedOn: undefined, draftCompletePct: 0 });
    navigate(`/pps/submissions/${sub!.id}/edit`);
  }

  return (
    <div className={cn('max-w-[1400px] mx-auto px-6 pb-12 bg-neutral-25 min-h-screen', stickyHeader ? 'pt-2' : 'pt-5')}>
      {/* Sticky review header (Submitted review screen only) — breadcrumbs, title,
          status badge and action CTAs stay pinned + gain a white bar with a
          subtle shadow once scrolling begins. Everything else scrolls beneath. */}
      <div className={cn(stickyHeader && cn(
        'sticky top-28 z-30 -mx-6 px-6 py-3 transition-all duration-200 ease-out',
        scrolled ? 'bg-white shadow-doe-sm border-b border-neutral-100' : 'bg-transparent',
      ))}>
      <nav className={cn('text-[11.5px] text-neutral-500 flex items-center gap-1.5 font-sans uppercase tracking-[0.16em]', stickyHeader ? 'mb-2.5' : 'mb-3')}>
        <button onClick={() => navigate(`/pps/submissions?product=${sub.productId}`)} className="hover:text-doe-red">← All submissions</button>
        <span className="text-neutral-300">·</span>
        {/* Once the sticky header activates, swap the last crumb (period) for the
            submitting entity name to give reviewers more context. */}
        <span>Submission · {sub.productLabel} · {stickyHeader && scrolled ? sub.entityName : `${sub.cycleYear} annual`}</span>
      </nav>

      <div className={cn('flex items-start justify-between gap-4 flex-wrap', !stickyHeader && 'mb-4')}>
        <div>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="font-display text-[26px] font-bold text-charcoal-900 leading-tight">{sub.productLabel} · {sub.cycleYear} annual submission</h1>
            <StatusPill status={displaySub.status} label={displaySub.status === 'returned' ? 'Returned for Clarification' : undefined} />
            {compareMode && <span className="inline-flex items-center h-6 px-2.5 rounded-full text-[11px] font-semibold bg-action-orange-soft text-action-orange-deep">Comparing Version 1 ↔ Version 2</span>}
          </div>
          {compareMode ? (
            <div className="text-[12px] text-neutral-600 mt-1.5 flex items-center gap-2 flex-wrap">
              <span>Version 1 submitted on <strong className="text-ink-950">{v1SubmittedAt ? formatDate(v1SubmittedAt) : '—'}</strong></span>
              <span className="text-neutral-400">↓</span>
              <span>Version 2 re-submitted on <strong className="text-ink-950">{v2SubmittedAt ? formatDate(v2SubmittedAt) : '—'}</strong></span>
            </div>
          ) : (sub.status === 'approved' || sub.status === 'in_review' || sub.status === 'draft') && (
          <p className="text-[12.5px] text-neutral-700 mt-1.5">
            {sub.status === 'approved' && (
              <>Approved by DoE on {formatDate(latestEvent(sub.workflow, 'approved')?.at)} · {sub.version} ({sub.workflow.filter((w) => w.stage === 'returned').length} amendment{sub.workflow.filter((w) => w.stage === 'returned').length !== 1 ? 's' : ''}) · published to PPS dashboard {formatDate(latestEvent(sub.workflow, 'approved')?.at)}</>
            )}
            {sub.status === 'in_review' && (<>Submitted {formatDate(sub.submittedOn)} · currently with DoE PPS reviewers · {sub.version}</>)}
            {sub.status === 'draft' && (<>Draft {sub.draftCompletePct ?? 0}% complete · save and submit before the cycle deadline.</>)}
          </p>
          )}
        </div>
        <div className="flex items-center gap-2 flex-wrap justify-end">
          {compareMode ? (
            <>
              <button className="btn-secondary"><DocIcon /> Download Comparison Report</button>
              <button onClick={exitCompare} className="btn-primary">Exit Comparison</button>
            </>
          ) : (
          <>
          <button className="btn-secondary">
            <DocIcon /> Download PDF
          </button>
          {/* v1 ↔ v2 comparison — Omar (DoE PPS Approver) only, once a v2 exists. */}
          {canCompare && (
            <button onClick={enterCompare} className="btn-secondary">
              <CompareIcon /> Compare v1 ↔ v{sub.workflow.filter((w) => w.stage === 'returned').length + 1}
            </button>
          )}
          {/* Status-driven ENTITY write actions (create / edit / submit / re-submit
              / amend). Hidden for the internal DoE PPS Approver (Omar) — updating
              and re-submitting a returned application is the entity's job, not the
              approver's. Omar keeps View · Review Comments · Download PDF · Audit. */}
          {!isOmar && sub.status === 'draft' && (
            <>
              <button onClick={() => navigate(`/pps/submissions?product=${sub.productId}`)} className="h-9 px-3.5 rounded-md border border-danger-500/30 bg-white text-danger-500 text-[12.5px] font-semibold hover:bg-danger-soft/30">Discard draft</button>
              <button onClick={demoSaveDraft} className="btn-secondary">Save draft</button>
              <button onClick={demoSubmit} className="btn-primary">Submit to DoE <span className="ml-1">→</span></button>
            </>
          )}
          {!isOmar && sub.status === 'returned' && (
            <>
              <button onClick={() => navigate(`/pps/submissions/${sub.id}/edit`)} className="btn-secondary"><EditIcon /> Edit Submission</button>
              <button onClick={demoSaveDraft} className="btn-secondary">Save Draft</button>
              <button onClick={demoSubmit} className="btn-primary">Re-submit to DoE <span className="ml-1">→</span></button>
            </>
          )}
          {!isOmar && sub.status === 'rejected' && (
            <button onClick={createAmendment} className="btn-primary"><EditIcon /> Create Amendment / Resubmit</button>
          )}
          {/* DoE approver review actions — shown ONLY to the PPS DoE Approver
              (Mariam Al Mansouri) and only while the submission is awaiting a DoE
              decision (submitted / in DoE review / resubmitted). Standard order is
              identical across all 12 products: left→right Reject · Request More Info
              · Approve (Approve rightmost), with Download PDF to their left. */}
          {reviewable && user?.role === 'pps_approver' && (
            [...REVIEW_ACTIONS].reverse().map((a) => (
              <button
                key={a.key}
                onClick={() => openReview(a)}
                className={cn(
                  a.key === 'approve' ? 'btn-primary' :
                  a.key === 'reject' ? 'h-9 px-3.5 rounded-md bg-danger-500 hover:bg-danger-600 text-white text-[12.5px] font-semibold flex items-center gap-1.5' :
                  'btn bg-white border border-action-orange text-action-orange-deep hover:bg-action-orange-soft',
                )}
              >
                {a.key === 'approve' ? <CheckIcon /> : a.key === 'info' ? <ReturnIcon /> : null}
                {a.label}
              </button>
            ))
          )}
          </>
          )}
        </div>
      </div>
      </div>{/* /sticky review header */}

      {/* ============== COMPARISON MODE (Omar) — lazily mounted ============== */}
      {compareMode ? (
        <SubmissionCompareView sub={sub} reviewerName={user?.name ?? 'Omar Al Suwaidi'} onExit={exitCompare} />
      ) : (
      <>
      {/* ============== TOP META BAR ============== */}
      <div className="card grid grid-cols-5 divide-x divide-neutral-100">
        <Meta label="Submission ID" value={sub.ref} mono />
        <Meta label="Entity"        value={sub.entityName} />
        <Meta label="Form template" value={sub.formType} />
        <Meta label="Period"        value={`${sub.years[0]} → ${sub.years[sub.years.length - 1]}`} mono />
        <Meta label="Submitted by"  value={sub.submittedBy} />
      </div>

      {/* ============== WORKFLOW (timeline/status — shown for all roles) ============== */}
      {finalizedUx ? (
        // Ahmed (Entity Submitter): collapsible 3-step workflow with DoE Review
        // child events and status-driven highlighting. Reminder history is shown
        // to the DoE Approver (Omar) only — the entity never sees it.
        <EntityWorkflowCard submission={displaySub} includeReminders={isOmar} />
      ) : lpgApproverWorkflow ? (
        // LPG-only experiment (DoE Approver): collapsed-by-default summary that
        // expands smoothly to reveal the unchanged full timeline.
        <div className="card p-5 mt-3">
          <div className="flex items-center justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 flex-wrap">
                <h3 className="font-display text-[15px] font-bold text-charcoal-900">Submission Workflow</h3>
                <StatusPill status={sub.status} />
              </div>
              <div className="text-[11.5px] text-neutral-600 mt-2 whitespace-nowrap">Submission date: <strong className="text-ink-950">{sub.submittedOn ? formatDateTime(sub.submittedOn) : '—'}</strong></div>
              <div className="text-[11.5px] text-neutral-600 mt-0.5 whitespace-nowrap">Submitted by: <strong className="text-ink-950">{sub.submittedBy ?? sub.entityName}</strong></div>
            </div>
            <button
              onClick={() => setWfExpanded((v) => !v)}
              className="text-[12px] text-info-500 font-semibold hover:underline flex items-center gap-1 flex-shrink-0 whitespace-nowrap"
            >
              {wfExpanded ? 'Collapse workflow' : 'Expand workflow'}
              <span className={cn('transition-transform', wfExpanded && 'rotate-180')}>↓</span>
            </button>
          </div>
          {/* Smooth expand via max-height transition (reliable, no JS measurement).
              The timeline design itself is unchanged. */}
          <div className={cn('overflow-hidden transition-all duration-300 ease-in-out', wfExpanded ? 'max-h-[900px] opacity-100' : 'max-h-0 opacity-0')}>
            <div className="mt-4 pt-4 border-t border-neutral-100">
              <WorkflowTimeline submission={sub} variant="full" />
            </div>
          </div>
        </div>
      ) : (
        <div className="card p-5 mt-3">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-display text-[15px] font-bold text-charcoal-900">Submission workflow</h3>
              <p className="text-[11.5px] text-neutral-500">Submitted › DoE Review › Returned for Clarification › Re-submitted › Approved &amp; Published · all events recorded in audit trail</p>
            </div>
            <button className="text-[12px] text-info-500 font-semibold hover:underline">View full audit log →</button>
          </div>
          <WorkflowTimeline submission={sub} variant="full" />
        </div>
      )}

      {/* ============== RETURNED-FOR-CLARIFICATION BANNER (Ahmed only) ============== */}
      {finalizedUx && displaySub.status === 'returned' && <ClarificationBanner sub={displaySub} />}

      {/* ============== TEMPLATE-DRIVEN READ-ONLY SECTIONS (generic products) ==============
          A 1:1 read-only mirror of the entity's Submission Form — same sections,
          row hierarchy, region×segment grouping, seasonal split, sub-sectors and
          auto totals, reusing the exact form components in readOnly mode. */}
      {roTemplate && <div className="mt-3"><TemplateReadOnlySections template={roTemplate} /></div>}

      {/* ============== LPG READ-ONLY FORM MIRROR (Ahmed) ==============
          Exact read-only render of the LPG Submission Form — sections 1.1 → 2.4
          from the same reference + components, replacing the older bespoke
          tables + placeholder 2.3/2.4 below. */}
      {!roTemplate && finalizedUx && <LpgReadOnlySections sub={sub} />}

      {/* ============== YEAR-GRID SECTIONS (LPG bespoke form: 1.1, 2.1, 2.2) ============== */}
      {!roTemplate && !finalizedUx && sub.sections.filter((s) => s.rows.length > 0).map((section) => (
        <div key={section.id} className="card mt-3 p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-start gap-3">
              <SectionBadge number={section.number} />
              <div>
                <h3 className="font-display text-[15px] font-bold text-charcoal-900">{section.title}</h3>
                <p className="text-[11.5px] text-neutral-500 mt-0.5">{section.description}</p>
              </div>
            </div>
            {!finalizedUx && section.reconciled && <span className="chip-sm bg-success-soft text-success-500">● Reconciled</span>}
          </div>
          <div className="border border-neutral-100 rounded-lg overflow-x-auto">
            <table className="w-full text-[12px]">
              <thead className="bg-neutral-50 text-[10px] font-sans uppercase tracking-[0.14em] text-neutral-500">
                <tr>
                  <th className="text-left px-3 py-2.5 w-[260px]">Field</th>
                  {years.map((y, i) => (
                    <th key={y} className={cn('text-right px-3 py-2.5', i >= forecastFromIdx && 'text-action-orange-deep')}>{y}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {section.rows.map((row, ri) => (
                  <tr key={`${row.field}-${ri}`} className="border-t border-neutral-100">
                    <td className="px-3 py-2.5">
                      <div className="text-[12.5px] text-ink-950">{row.field}</div>
                      {row.isFormula && <div className="text-[9.5px] font-sans uppercase tracking-wider text-neutral-400">f auto</div>}
                    </td>
                    {row.values.slice(0, years.length).map((v, i) => (
                      <td key={i} className={cn('text-right px-3 py-2.5 font-mono', row.isFormula ? 'text-action-orange-deep' : i >= forecastFromIdx ? 'text-action-orange-deep' : 'text-ink-950')}>
                        {v?.toLocaleString() ?? '—'}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}

      {/* ============== SECTION 2.3 — LPG Demand by form / region / sector ============== */}
      {!finalizedUx && sub.productId === 'lpg' && (
        <div className="card mt-3 p-5">
          <div className="flex items-start gap-3 mb-3">
            <SectionBadge number="2.3" />
            <div>
              <h3 className="font-display text-[15px] font-bold text-ink-950">Demand by product form, region &amp; sector</h3>
              <p className="text-[11.5px] text-neutral-500 mt-0.5">LPG-specific · split by Bulk (industrial) vs Cylinder (residential/commercial) — feeds dashboard sector mix</p>
            </div>
            {!finalizedUx && <span className="ml-auto text-[10.5px] font-sans uppercase tracking-wider text-neutral-500">2024 actual shown · open for full series</span>}
          </div>
          <div className="border border-neutral-100 rounded-lg overflow-hidden">
            <table className="w-full text-[12.5px]">
              <thead className="bg-neutral-50 text-[10px] font-sans uppercase tracking-[0.14em] text-neutral-500">
                <tr>
                  <th className="text-left px-3 py-2.5">Region / segment</th>
                  <th className="text-right px-3 py-2.5">Bulk · industrial</th>
                  <th className="text-right px-3 py-2.5">Bulk · commercial</th>
                  <th className="text-right px-3 py-2.5">Cylinder · residential</th>
                  <th className="text-right px-3 py-2.5">Cylinder · commercial</th>
                  <th className="text-right px-3 py-2.5">Subtotal (kt)</th>
                </tr>
              </thead>
              <tbody>
                {LPG_DEMAND_MATRIX.map((r) => {
                  const subtotal = r.bulkIndustrial + r.bulkCommercial + r.cylinderResidential + r.cylinderCommercial;
                  return (
                    <tr key={r.region} className="border-t border-neutral-100">
                      <td className="px-3 py-2.5 text-ink-950 font-semibold">{r.region}</td>
                      <td className="px-3 py-2.5 text-right font-mono">{r.bulkIndustrial}</td>
                      <td className="px-3 py-2.5 text-right font-mono">{r.bulkCommercial}</td>
                      <td className="px-3 py-2.5 text-right font-mono">{r.cylinderResidential}</td>
                      <td className="px-3 py-2.5 text-right font-mono">{r.cylinderCommercial}</td>
                      <td className="px-3 py-2.5 text-right font-mono font-semibold">{subtotal.toLocaleString()}</td>
                    </tr>
                  );
                })}
                {(() => {
                  const totals = LPG_DEMAND_MATRIX.reduce((acc, r) => ({
                    bulkIndustrial: acc.bulkIndustrial + r.bulkIndustrial,
                    bulkCommercial: acc.bulkCommercial + r.bulkCommercial,
                    cylinderResidential: acc.cylinderResidential + r.cylinderResidential,
                    cylinderCommercial: acc.cylinderCommercial + r.cylinderCommercial,
                  }), { bulkIndustrial: 0, bulkCommercial: 0, cylinderResidential: 0, cylinderCommercial: 0 });
                  const grand = totals.bulkIndustrial + totals.bulkCommercial + totals.cylinderResidential + totals.cylinderCommercial;
                  return (
                    <tr className="border-t border-neutral-100 bg-neutral-25">
                      <td className="px-3 py-2.5 text-ink-950 font-semibold">Total volumes sold <span className="text-[9.5px] font-sans uppercase tracking-wider text-neutral-400 ml-1">f auto</span></td>
                      <td className="px-3 py-2.5 text-right font-mono font-semibold">{totals.bulkIndustrial}</td>
                      <td className="px-3 py-2.5 text-right font-mono font-semibold">{totals.bulkCommercial}</td>
                      <td className="px-3 py-2.5 text-right font-mono font-semibold">{totals.cylinderResidential}</td>
                      <td className="px-3 py-2.5 text-right font-mono font-semibold">{totals.cylinderCommercial}</td>
                      <td className="px-3 py-2.5 text-right font-mono font-semibold">{grand.toLocaleString()}</td>
                    </tr>
                  );
                })()}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ============== SECTION 2.4 — Seasonality (LPG) ============== */}
      {!finalizedUx && sub.productId === 'lpg' && (
        <div className="card mt-3 p-5">
          <div className="flex items-start gap-3 mb-3">
            <SectionBadge number="2.4" />
            <div>
              <h3 className="font-display text-[15px] font-bold text-ink-950">Seasonal trends · quarterly volumes sold (2024)</h3>
              <p className="text-[11.5px] text-neutral-500 mt-0.5">Feeds the seasonal line chart on the PPS dashboard (4-quarter average)</p>
            </div>
            {!finalizedUx && <span className="ml-auto text-[10.5px] font-sans uppercase tracking-wider text-neutral-500">Unit · kt · 4 quarters</span>}
          </div>
          <div className="border border-neutral-100 rounded-lg overflow-hidden">
            <table className="w-full text-[12.5px]">
              <thead className="bg-neutral-50 text-[10px] font-sans uppercase tracking-[0.14em] text-neutral-500">
                <tr>
                  <th className="text-left px-3 py-2.5">Form</th>
                  <th className="text-right px-3 py-2.5">Q1 (Jan – Mar)</th>
                  <th className="text-right px-3 py-2.5">Q2 (Apr – Jun)</th>
                  <th className="text-right px-3 py-2.5">Q3 (Jul – Sep)</th>
                  <th className="text-right px-3 py-2.5">Q4 (Oct – Dec)</th>
                  <th className="text-right px-3 py-2.5">Year total</th>
                </tr>
              </thead>
              <tbody>
                {LPG_SEASONAL_MATRIX.map((r) => {
                  const yearTotal = r.q1 + r.q2 + r.q3 + r.q4;
                  return (
                    <tr key={r.form} className="border-t border-neutral-100">
                      <td className="px-3 py-2.5 text-ink-950 font-semibold">{r.form}</td>
                      <td className="px-3 py-2.5 text-right font-mono">{r.q1}</td>
                      <td className="px-3 py-2.5 text-right font-mono">{r.q2}</td>
                      <td className="px-3 py-2.5 text-right font-mono">{r.q3}</td>
                      <td className="px-3 py-2.5 text-right font-mono">{r.q4}</td>
                      <td className="px-3 py-2.5 text-right font-mono font-semibold">{yearTotal.toLocaleString()}</td>
                    </tr>
                  );
                })}
                {(() => {
                  const totals = LPG_SEASONAL_MATRIX.reduce((acc, r) => ({
                    q1: acc.q1 + r.q1, q2: acc.q2 + r.q2, q3: acc.q3 + r.q3, q4: acc.q4 + r.q4,
                  }), { q1: 0, q2: 0, q3: 0, q4: 0 });
                  const grand = totals.q1 + totals.q2 + totals.q3 + totals.q4;
                  return (
                    <tr className="border-t border-neutral-100 bg-neutral-25">
                      <td className="px-3 py-2.5 text-ink-950 font-semibold">All LPG <span className="text-[9.5px] font-sans uppercase tracking-wider text-neutral-400 ml-1">f auto</span></td>
                      <td className="px-3 py-2.5 text-right font-mono font-semibold">{totals.q1}</td>
                      <td className="px-3 py-2.5 text-right font-mono font-semibold">{totals.q2}</td>
                      <td className="px-3 py-2.5 text-right font-mono font-semibold">{totals.q3}</td>
                      <td className="px-3 py-2.5 text-right font-mono font-semibold">{totals.q4}</td>
                      <td className="px-3 py-2.5 text-right font-mono font-semibold">{grand.toLocaleString()}</td>
                    </tr>
                  );
                })()}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <TransitionModal
        open={pendingT != null}
        transition={pendingT}
        comment={comment}
        setComment={setComment}
        error={actionError}
        onCancel={() => setPendingT(null)}
        onConfirm={confirmTransition}
      />

      <ReviewActionModal
        action={reviewAction}
        text={reviewText}
        setText={setReviewText}
        error={reviewError}
        clearError={() => setReviewError(null)}
        onCancel={() => setReviewAction(null)}
        onConfirm={confirmReview}
        showAttachments={isOmar}
      />

      <SuccessModal
        open={success != null}
        title={success?.title ?? ''}
        message={success?.message ?? ''}
        tone={success?.tone ?? 'success'}
        onClose={() => setSuccess(null)}
      />

      {/* ============== REVIEW REMARKS & AMENDMENT TRAIL (incl. rejection remarks) ============== */}
      {displaySub.reviewRemarks && displaySub.reviewRemarks.length > 0 && (
        <div className="card mt-3 p-5">
          <div className="flex items-start gap-3 mb-4">
            <div className="w-9 h-9 rounded-md bg-action-orange-soft text-action-orange-deep grid place-items-center flex-shrink-0">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
            </div>
            <div>
              <h3 className="font-display text-[15px] font-bold text-ink-950">Review remarks &amp; amendment trail</h3>
              <p className="text-[11.5px] text-neutral-500 mt-0.5">All comments and value changes since v1 · audit-logged</p>
            </div>
          </div>
          <div className="space-y-3">
            {displaySub.reviewRemarks.map((r) => <RemarkBlock key={r.at} remark={r} />)}
          </div>
        </div>
      )}

      {/* ============== AUDIT HISTORY & COMMENTS (mirrors NOC) ============== */}
      <div className="mt-3">
        <AuditAndComments submission={displaySub} entityFlow={finalizedUx} />
      </div>
      </>
      )}
    </div>
  );
}

// Returned-for-Clarification banner (Ahmed only) — a prominent amber information
// banner surfacing the DoE reviewer's clarification request: comment, the
// sections to update (parsed from the comment), reviewer + date, and the
// response deadline. All values come from the submission's real review data.
function ClarificationBanner({ sub }: { sub: import('../../types/pps').Submission }) {
  const remark = sub.reviewRemarks?.slice().reverse().find((r) => r.kind === 'returned');
  const event = [...sub.workflow].reverse().find((e) => e.stage === 'returned');
  const reviewer = remark?.by ?? event?.by ?? 'Khalid Al Qubaisi';
  const reviewerRole = remark?.byRole ?? event?.byRole ?? 'DoE PPS Reviewer';
  const reviewDate = remark?.at ?? event?.at;
  const deadline = `${sub.cycleYear + 1}-07-31T00:00:00Z`;
  const comment = remark?.body ?? event?.comment ??
    `Please verify the Q3 distributor volume reconciliation and update the supporting demand breakdown. The values reported for ${sub.cycleYear + 1} do not match the uploaded evidence. Kindly update Section 1.1 and re-submit before ${formatDate(deadline)}.`;
  const sections = Array.from(new Set((comment.match(/Section\s+(\d+\.\d+)/gi) ?? []).map((m) => m.replace(/Section\s+/i, ''))));

  return (
    <div className="card mt-3 overflow-hidden border-warning-500/30">
      <div className="bg-warning-soft/50 border-s-4 border-warning-500 p-4">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-full bg-warning-500/15 text-warning-500 grid place-items-center flex-shrink-0">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-display text-[15px] font-bold text-ink-950">Clarification Requested by DoE</h3>
              <span className="chip-sm bg-warning-500 text-white">● Action required</span>
            </div>
            <p className="text-[12.5px] text-neutral-700 leading-relaxed mt-2 italic">&ldquo;{comment}&rdquo;</p>
            {sections.length > 0 && (
              <div className="flex items-center gap-2 mt-3 flex-wrap">
                <span className="text-[10.5px] font-sans uppercase tracking-[0.14em] text-neutral-500">Sections to update</span>
                {sections.map((n) => <span key={n} className="chip-sm bg-white border border-warning-500/40 text-warning-500 font-mono">{n}</span>)}
              </div>
            )}
            <div className="flex items-center gap-x-4 gap-y-1 flex-wrap mt-3 pt-3 border-t border-warning-500/20 text-[11.5px] text-neutral-600">
              <span>Requested by <strong className="text-ink-950">{reviewer}</strong> <span className="text-neutral-400">· {reviewerRole}</span></span>
              {reviewDate && <span className="font-mono">{formatDateTime(reviewDate)}</span>}
              <span className="ms-auto inline-flex items-center gap-1.5 font-semibold text-warning-500">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                Respond before {formatDate(deadline)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function RemarkBlock({ remark }: { remark: ReviewRemark }) {
  const tone =
    remark.kind === 'returned'    ? { border: 'border-action-orange/30', bg: 'bg-action-orange/5',  badge: 'bg-action-orange/15 text-action-orange-deep', label: 'Returned' } :
    remark.kind === 'resubmitted' ? { border: 'border-info-500/30',      bg: 'bg-info-soft/40',     badge: 'bg-info-soft text-info-500',                  label: 'Re-submitted' } :
                                    { border: 'border-success-500/30',   bg: 'bg-success-soft/40',  badge: 'bg-success-soft text-success-500',            label: 'Approved' };
  return (
    <div className={cn('rounded-lg border p-4', tone.border, tone.bg)}>
      <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
        <div className="flex items-center gap-2 text-[12px]">
          <span className="font-mono text-neutral-500">{formatDateTime(remark.at)}</span>
          <span className="text-neutral-400">·</span>
          <span className="font-semibold text-ink-950">{remark.by}</span>
          {remark.byRole && <span className="text-neutral-500">({remark.byRole})</span>}
        </div>
        <span className={cn('chip-sm', tone.badge)}>● {tone.label}</span>
      </div>
      <div className="text-[12.5px] font-semibold text-ink-950 mb-1">{remark.title}</div>
      <p className="text-[12px] text-neutral-700 leading-relaxed">{remark.body}</p>
      {remark.fromValue && remark.toValue && (
        <div className="mt-2.5 inline-flex items-center gap-2 text-[11.5px] font-mono">
          <span className="px-2 py-0.5 rounded bg-white border border-neutral-100 text-neutral-500 line-through">{remark.fromValue}</span>
          <span className="text-neutral-400">→</span>
          <span className="px-2 py-0.5 rounded bg-success-soft text-success-500 font-semibold">{remark.toValue}</span>
        </div>
      )}
    </div>
  );
}

// ====================================================================== Pieces

function latestEvent(events: import('../../types/pps').SubmissionWorkflowEvent[], stage: import('../../types/pps').SubmissionWorkflowEvent['stage']) {
  return [...events].reverse().find((e) => e.stage === stage);
}

function Meta({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="px-5 py-3">
      <div className="text-[9.5px] font-sans uppercase tracking-[0.18em] text-neutral-500">{label}</div>
      <div className={cn('text-[13px] mt-0.5 text-ink-950', mono && 'font-mono')}>{value}</div>
    </div>
  );
}

function SectionBadge({ number }: { number: string }) {
  return (
    <div className="w-9 h-9 rounded-md bg-ink-950 text-white grid place-items-center font-mono font-bold text-[12px] flex-shrink-0">
      {number}
    </div>
  );
}

function DocIcon()     { return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>; }
function CompareIcon() { return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/></svg>; }
function EditIcon()    { return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>; }
function CheckIcon()   { return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>; }
function ReturnIcon()  { return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 14 4 9 9 4"/><path d="M20 20v-7a4 4 0 0 0-4-4H4"/></svg>; }

// Optional attachment uploader for the review-decision dialogs (Omar only).
// Drag-and-drop + browse, multi-file, removable chips. Files are held locally
// for the review session (prototype — no upload backend wired).
const ATTACH_ACCEPT = '.pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.zip';
function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
function ReviewAttachments() {
  const [files, setFiles] = useState<File[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);
  function addFiles(list: FileList | null) {
    if (!list || !list.length) return;
    setFiles((prev) => {
      const seen = new Set(prev.map((f) => `${f.name}:${f.size}`));
      const next = Array.from(list).filter((f) => !seen.has(`${f.name}:${f.size}`));
      return [...prev, ...next];
    });
  }
  return (
    <div className="mt-4">
      <label className="block text-[11.5px] font-semibold text-ink-950 mb-1">
        Attachment <span className="font-normal text-neutral-400">(optional)</span>
      </label>
      <div
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => { e.preventDefault(); setDragOver(false); addFiles(e.dataTransfer.files); }}
        className={cn('rounded-lg border border-dashed px-4 py-1 text-center cursor-pointer transition-colors',
          dragOver ? 'border-action-orange bg-action-orange-soft/30' : 'border-neutral-300 bg-neutral-25 hover:border-neutral-400')}
      >
        <span className="inline-grid place-items-center w-6 h-6 rounded-full bg-white border border-neutral-200 text-neutral-500 mx-auto">
          <UploadIcon />
        </span>
        <div className="text-[12px] text-neutral-600 mt-0.5">
          <span className="font-semibold text-ink-950">Drag &amp; drop</span> files here
        </div>
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); inputRef.current?.click(); }}
          className="mt-0.5 inline-flex items-center gap-1.5 h-7 px-3 rounded-md border border-neutral-200 bg-white text-[11.5px] font-semibold text-ink-950 hover:border-action-orange hover:text-action-orange-deep transition-colors"
        >
          Browse files
        </button>
        <div className="text-[10px] text-neutral-400 mt-0.5 tracking-wide">PDF · DOC · DOCX · XLS · XLSX · PNG · JPG · JPEG · ZIP</div>
      </div>
      <input ref={inputRef} type="file" multiple accept={ATTACH_ACCEPT} className="hidden" onChange={(e) => { addFiles(e.target.files); e.target.value = ''; }} />
      <div className="text-[11px] text-neutral-500 mt-1.5 leading-relaxed">
        Upload supporting documents, annotated files, or screenshots to provide additional context for this review decision.
      </div>
      {files.length > 0 && (
        <div className="mt-2.5 space-y-1.5">
          {files.map((f, i) => (
            <div key={`${f.name}-${i}`} className="flex items-center gap-2.5 rounded-md border border-neutral-100 bg-white px-2.5 py-2">
              <span className="inline-grid place-items-center w-7 h-7 rounded-md bg-neutral-50 text-neutral-500 flex-shrink-0"><FileIcon /></span>
              <div className="flex-1 min-w-0">
                <div className="text-[12px] font-medium text-ink-950 truncate">{f.name}</div>
                <div className="text-[10.5px] text-neutral-500">{formatFileSize(f.size)}</div>
              </div>
              <button
                type="button"
                onClick={() => setFiles((prev) => prev.filter((_, idx) => idx !== i))}
                className="text-neutral-400 hover:text-danger-500 text-[16px] leading-none px-1 flex-shrink-0"
                aria-label={`Remove ${f.name}`}
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function UploadIcon() { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>; }
function FileIcon() { return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>; }

// Shared decision dialog for all three review actions (Approve · Request More
// Info · Reject). Same layout/typography/buttons; only the copy, comment-field
// requiredness, and header tone vary. Every action captures reviewer comments
// into the audit trail.
function ReviewActionModal({ action, text, setText, error, clearError, onCancel, onConfirm, showAttachments }: { action: ReviewActionDef | null; text: string; setText: (v: string) => void; error: string | null; clearError: () => void; onCancel: () => void; onConfirm: () => void; showAttachments?: boolean }) {
  if (!action) return null;
  const isWarning = action.modalTone === 'warning';
  return (
    <div className="fixed inset-0 bg-ink-950/40 z-50 grid place-items-center p-6">
      <div className="bg-white rounded-xl shadow-doe-lg w-[480px] max-w-full p-5">
        <h3 className="font-display text-[17px] font-bold text-ink-950 mb-1">{action.modalTitle}</h3>
        <div className={cn('text-[12.5px] rounded-md p-3 mb-4 leading-relaxed',
          isWarning ? 'bg-danger-soft/50 text-danger-600 border border-danger-500/20' : 'bg-neutral-50 text-neutral-600 border border-neutral-100')}>
          {action.modalDesc}
        </div>
        <div>
          <label className="block text-[11.5px] font-semibold text-ink-950 mb-1">
            {action.commentLabel}{action.requiresText && <span className="text-doe-red"> *</span>}
          </label>
          <textarea
            value={text}
            onChange={(e) => { setText(e.target.value); if (error) clearError(); }}
            rows={4}
            placeholder={action.key === 'approve' ? 'Add any comments for the audit history…' : 'Type the information or reason for the entity…'}
            className={cn('w-full px-3 py-2 border rounded-md text-[12.5px] focus:outline-none focus:ring-2',
              error ? 'border-danger-500 focus:border-danger-500 focus:ring-danger-500/15' : 'border-neutral-200 focus:border-action-orange focus:ring-action-orange/15')}
          />
          {error
            ? <div className="text-[11.5px] text-danger-500 mt-1.5 font-medium">{error}</div>
            : <div className="text-[11px] text-neutral-500 mt-1.5 leading-relaxed">{action.commentHelper}</div>}
        </div>
        {/* Optional attachments — DoE PPS Approver (Omar) only. Supporting docs
            for the review decision; not required for any action. */}
        {showAttachments && <ReviewAttachments />}
        <div className="flex items-center justify-end gap-2 mt-4">
          <button onClick={onCancel} className="btn-secondary">Cancel</button>
          <button
            onClick={onConfirm}
            className={cn(
              action.variant === 'danger' ? 'h-9 px-3.5 rounded-md bg-danger-500 hover:bg-danger-600 text-white text-[12.5px] font-semibold' : 'btn-primary')}
          >
            {action.confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

function TransitionModal({ open, transition, comment, setComment, error, onCancel, onConfirm }: { open: boolean; transition: PpsTransitionDef | null; comment: string; setComment: (v: string) => void; error: string | null; onCancel: () => void; onConfirm: () => void }) {
  if (!open || !transition) return null;
  return (
    <div className="fixed inset-0 bg-ink-950/40 z-50 grid place-items-center p-6">
      <div className="bg-white rounded-xl shadow-doe-lg w-[480px] max-w-full p-5">
        <h3 className="font-display text-[17px] font-bold text-ink-950 mb-1">{transition.label}</h3>
        <p className="text-[12.5px] text-neutral-500 mb-4">Confirm this action. It will be recorded in the audit trail and may trigger notifications.</p>
        {transition.requiresComment && (
          <div>
            <label className="block text-[11.5px] font-semibold text-ink-950 mb-1">
              {transition.commentLabel ?? 'Comment'} {transition.commentRequired && <span className="text-doe-red">*</span>}
            </label>
            <textarea value={comment} onChange={(e) => setComment(e.target.value)} rows={4} placeholder="Type your note for the audit trail…" className="w-full px-3 py-2 border border-neutral-200 rounded-md text-[12.5px] focus:outline-none focus:border-action-orange focus:ring-2 focus:ring-action-orange/15" />
          </div>
        )}
        {error && <div className="text-[12px] text-danger-500 mt-2">{error}</div>}
        <div className="flex items-center justify-end gap-2 mt-4">
          <button onClick={onCancel} className="btn-secondary">Cancel</button>
          <button onClick={onConfirm} className={cn(transition.variant === 'danger' ? 'h-9 px-3.5 rounded-md bg-danger-500 hover:bg-danger-600 text-white text-[12.5px] font-semibold' : 'btn-primary')}>{transition.label}</button>
        </div>
      </div>
    </div>
  );
}
