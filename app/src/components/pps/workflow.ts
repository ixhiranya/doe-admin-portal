// ============================================================================
// Single source of truth for PPS submission workflow vocabulary.
//   - Status pill labels + colours
//   - Workflow timeline stage builder
// Every page (Submissions list, Submission Detail, Monitoring, Form) imports
// from here so terminology stays identical.
// ============================================================================

import type { Submission, SubmissionStatus, SubmissionWorkflowEvent } from '../../types/pps';

// ----- Canonical status labels ---------------------------------------------

export interface StatusMeta {
  label: string;          // short label for pills, table cells, monitoring grid
  longLabel: string;      // long-form label for page subtitles
  pillClass: string;      // tailwind classes for the soft pill background
  dotClass: string;       // tailwind class for the leading bullet dot
  monitoringDot: string;  // tailwind classes for the monitoring grid round badge
  monitoringGlyph: string;
}

export const STATUS_META: Record<SubmissionStatus, StatusMeta> = {
  draft: {
    label: 'Draft',
    longLabel: 'Draft · not yet submitted',
    pillClass: 'bg-neutral-100 text-neutral-700 border border-neutral-200',
    dotClass:  'bg-neutral-400',
    monitoringDot: 'bg-neutral-200 text-neutral-600',
    monitoringGlyph: 'd',
  },
  submitted: {
    label: 'Submitted',
    longLabel: 'Submitted · awaiting DoE review',
    pillClass: 'bg-lavender text-[#7B3FE4]',
    dotClass:  'bg-[#7B3FE4]',
    monitoringDot: 'bg-lavender text-[#7B3FE4]',
    monitoringGlyph: '▴',
  },
  in_review: {
    label: 'In DoE Review',
    longLabel: 'In DoE review',
    pillClass: 'bg-info-soft text-info-500',
    dotClass:  'bg-info-500',
    monitoringDot: 'bg-info-500 text-white',
    monitoringGlyph: '◐',
  },
  returned: {
    label: 'Returned',
    longLabel: 'Returned for clarification',
    pillClass: 'bg-warning-soft text-warning-500',
    dotClass:  'bg-warning-500',
    monitoringDot: 'bg-warning-500 text-white',
    monitoringGlyph: '↺',
  },
  resubmitted: {
    label: 'Re-submitted',
    longLabel: 'Re-submitted · awaiting re-review',
    pillClass: 'bg-info-soft text-info-500',
    dotClass:  'bg-info-500',
    monitoringDot: 'bg-info-500 text-white',
    monitoringGlyph: '↻',
  },
  approved: {
    label: 'Approved & Published',
    longLabel: 'Approved & published to dashboard',
    pillClass: 'bg-success-soft text-success-500',
    dotClass:  'bg-success-500',
    monitoringDot: 'bg-success-500 text-white',
    monitoringGlyph: '✓',
  },
  amendment_requested: {
    label: 'Amendment Requested',
    longLabel: 'Amendment requested · awaiting DoE review',
    pillClass: 'bg-action-orange-soft text-action-orange-deep',
    dotClass:  'bg-action-orange',
    monitoringDot: 'bg-action-orange text-white',
    monitoringGlyph: 'a',
  },
  rejected: {
    label: 'Rejected',
    longLabel: 'Rejected',
    pillClass: 'bg-danger-soft text-danger-500',
    dotClass:  'bg-danger-500',
    monitoringDot: 'bg-danger-500 text-white',
    monitoringGlyph: '!',
  },
};

// ----- Workflow timeline ---------------------------------------------------

export type StageKey = 'submitted' | 'doe_review' | 'returned' | 'resubmitted' | 'approved';

export interface TimelineStage {
  key: StageKey;
  label: string;            // canonical stage label (matches PDF terminology)
  state: 'completed' | 'current' | 'upcoming' | 'skipped';
  at?: string;
  by?: string;
  byRole?: string;
  comment?: string;
}

export const STAGE_LABELS: Record<StageKey, string> = {
  submitted:    'Submitted',
  doe_review:   'DoE Review',
  returned:     'Returned for Clarification',
  resubmitted:  'Re-submitted',
  approved:     'Approved & Published',
};

/**
 * Build the 5-stage timeline for any submission.
 *
 * Always returns 5 stages so the timeline shape stays identical across
 * submissions. If the submission never went through "Returned" / "Re-submitted",
 * those stages are marked `skipped` (rendered greyed-out and slimmer).
 */
export function buildTimeline(sub: Submission): TimelineStage[] {
  const events = sub.workflow;
  const eventByStage = (stage: SubmissionWorkflowEvent['stage']) => [...events].reverse().find((e) => e.stage === stage);

  const hasSubmitted   = !!eventByStage('submitted');
  const hasDoeReview   = !!eventByStage('doe_review');
  const hasReturned    = !!eventByStage('returned');
  const hasResubmitted = !!eventByStage('resubmitted');
  const hasApproved    = !!eventByStage('approved');

  const currentStatus = sub.status;
  // A stage is "current" when the submission is sitting in that stage waiting
  // for the next actor. Terminal states (approved/rejected) have no current
  // stage; everything they touched renders completed.
  const isCurrent = (stage: StageKey): boolean => {
    if (currentStatus === 'approved' || currentStatus === 'rejected') return false;
    if (currentStatus === 'submitted'           && stage === 'submitted')   return true;
    if (currentStatus === 'in_review'           && stage === 'doe_review')  return true;
    if (currentStatus === 'returned'            && stage === 'returned')    return true;
    if (currentStatus === 'resubmitted'         && stage === 'resubmitted') return true;
    if (currentStatus === 'amendment_requested' && stage === 'doe_review')  return true;
    return false;
  };

  function makeStage(key: StageKey, occurred: boolean): TimelineStage {
    const ev = eventByStage(key === 'doe_review' ? 'doe_review' : key);
    // Stage state rules:
    //   • current — the submission is parked in this stage right now
    //   • completed — an event for this stage exists in the audit trail
    //   • skipped — Returned / Re-submitted branch was never used
    //   • upcoming — has not happened yet for this submission
    const state: TimelineStage['state'] =
      isCurrent(key) ? 'current' :
      occurred       ? 'completed' :
      (key === 'returned' || key === 'resubmitted') && !hasReturned && (currentStatus === 'approved' || currentStatus === 'rejected') ? 'skipped' :
      'upcoming';
    return { key, label: STAGE_LABELS[key], state, at: ev?.at, by: ev?.by, byRole: ev?.byRole, comment: ev?.comment };
  }

  return [
    makeStage('submitted',   hasSubmitted),
    makeStage('doe_review',  hasDoeReview),
    makeStage('returned',    hasReturned),
    makeStage('resubmitted', hasResubmitted),
    makeStage('approved',    hasApproved),
  ];
}
