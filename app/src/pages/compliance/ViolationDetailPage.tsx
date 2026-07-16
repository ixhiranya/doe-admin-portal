// =============================================================================
// Compliance · Violation Detail
// -----------------------------------------------------------------------------
// SDD §4 — full violation record with:
//   • Hero with severity + state status + offence-count badge
//   • KPI strip: severity / offence / penalty / SLA / age
//   • Source + Linkage card
//   • Evidence attachments
//   • Decision route + outcome (with quick-action buttons when applicable)
//   • Penalty breakdown (Base × Offence × Severity)
//   • Appeal section (if applicable)
//   • Cross-Government Enforcement timeline (if applicable)
//   • Audit trail timeline (every state transition)
// =============================================================================
import { useMemo, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  getViolation, recordTransition,
  STATE_LABEL, SOURCE_LABEL, PERMIT_TYPE_LABEL,
  DECISION_ROUTE_LABEL, DECISION_OUTCOME_LABEL,
  formatAed, severityTone, ageDays, daysToPaymentSla,
} from '../../services/compliance/violations';
import {
  getViolationCode,
} from '../../services/compliance/catalogue';
import { computePenalty } from '../../services/compliance/penaltyEngine';
import { SEVERITY_LABEL, SEVERITY_LABEL_AR } from '../../services/compliance/severity';
import type {
  Violation, ViolationSeverity, ViolationState, ViolationAuditEntry,
  CrossGovEvent,
} from '../../types';
import { ModuleDetailLayout, DetailCard, Field, FieldGrid } from '../gasRegister/ModuleDetailLayout';
import { cn } from '../../lib/utils';

export function ViolationDetailPage() {
  const { violationId } = useParams<{ violationId: string }>();
  const navigate = useNavigate();
  // Track local revision count so re-fetching from the in-memory store re-runs
  // on every action button click.
  const [revision, setRevision] = useState(0);
  const v = useMemo(() => violationId ? getViolation(violationId) : undefined, [violationId, revision]);

  if (!v) {
    return (
      <div className="min-h-screen bg-neutral-25 grid place-items-center">
        <div className="card p-10 text-center max-w-md">
          <div className="text-4xl mb-2">🔎</div>
          <div className="font-display font-bold text-[15px] text-ink-950">Violation not found</div>
          <button onClick={() => navigate('/compliance/violations')} className="mt-4 btn-primary">Back to register</button>
        </div>
      </div>
    );
  }

  const code = getViolationCode(v.violationCodeId);
  const penalty = code ? computePenalty(code, v.offenceCount, v.severity) : null;
  const age = ageDays(v);
  const slaDays = daysToPaymentSla(v);
  const sevTone = severityTone(v.severity);

  const statusTone: 'success' | 'danger' | 'warning' | 'info' | 'neutral' =
    v.state === 'closed_resolved' || v.state === 'paid' ? 'success' :
    v.state === 'cross_gov_enforcement_triggered' || v.state === 'closed_overturned' ? 'danger' :
    v.state.startsWith('closed') ? 'neutral' :
    v.state === 'penalty_outstanding' || v.state === 'appeal_submitted' ? 'warning' :
    v.state === 'pending_committee_review' || v.state === 'pending_admin_decision' ? 'warning' :
    'info';

  const heroIconAccent =
    sevTone === 'danger' ? '#DC2626' :
    sevTone === 'warning' ? '#E89B4C' :
    sevTone === 'info' ? '#0E76A8' : '#6B7280';

  // ─── Action handlers ────────────────────────────────────────────────────
  const triage = () => {
    recordTransition({ violationId: v.id, toState: 'under_review', actor: 'Eng. F. Al Awadi', actorRole: 'engineer', reason: 'Picked up by Engineer for triage' });
    setRevision((r) => r + 1);
  };
  const routeAdmin = () => {
    recordTransition({ violationId: v.id, toState: 'pending_admin_decision', actor: 'Eng. F. Al Awadi', actorRole: 'engineer', reason: 'Below VAP threshold — routed to Section Head', patch: { decisionRoute: 'administrative' } });
    setRevision((r) => r + 1);
  };
  const routeVap = () => {
    recordTransition({ violationId: v.id, toState: 'pending_committee_review', actor: 'Eng. F. Al Awadi', actorRole: 'engineer', reason: 'Severity / amount above admin threshold', patch: { decisionRoute: 'vap_committee' } });
    setRevision((r) => r + 1);
  };
  const issueWarning = () => {
    recordTransition({ violationId: v.id, toState: 'decision_recorded', actor: 'Sec. Head A. Al Mansoori', actorRole: 'section_head', reason: 'Warning Letter issued', patch: { decisionOutcome: 'warning_letter', decisionAt: new Date().toISOString(), decisionBy: 'Sec. Head A. Al Mansoori' } });
    setRevision((r) => r + 1);
  };
  const imposePenalty = () => {
    const deadline = new Date(Date.now() + 30 * 86_400_000).toISOString();
    recordTransition({ violationId: v.id, toState: 'penalty_outstanding', actor: 'Sec. Head A. Al Mansoori', actorRole: 'section_head', reason: 'Standard penalty imposed; 30-day SLA started', patch: { decisionOutcome: 'penalty_imposed', decisionAt: new Date().toISOString(), decisionBy: 'Sec. Head A. Al Mansoori', paymentDeadline: deadline } });
    setRevision((r) => r + 1);
  };
  const noAction = () => {
    recordTransition({ violationId: v.id, toState: 'closed_no_action', actor: 'Sec. Head A. Al Mansoori', actorRole: 'section_head', reason: 'No regulatory action warranted', patch: { decisionOutcome: 'no_action', closureDate: new Date().toISOString() } });
    setRevision((r) => r + 1);
  };

  // What actions does the current state expose?
  const canTriage = v.state === 'identified';
  const canRoute  = v.state === 'under_review';
  const canDecide = v.state === 'pending_admin_decision';

  return (
    <ModuleDetailLayout
      parentLabel="Violations Register" parentHref="/compliance/violations"
      current={v.id} sddRef="SDD §4 · Compliance Module"
      iconText={v.severity[0].toUpperCase()} iconAccent={heroIconAccent}
      eyebrow={`${SOURCE_LABEL[v.source]} · ${PERMIT_TYPE_LABEL[v.permitType]}`}
      title={v.title}
      subtitle={`${v.licensee.name} · ${v.licensee.tradeLicenceNumber ?? '—'} · ${v.violationCode}`}
      status={{ label: STATE_LABEL[v.state], tone: statusTone }}
      meta={
        <>
          <span className="font-mono text-white/70">{v.id}</span>
          <span className="text-white/40">·</span>
          <span className="text-white/70">{SEVERITY_LABEL[v.severity]} ({SEVERITY_LABEL_AR[v.severity]})</span>
          <span className="text-white/40">·</span>
          <span className="text-white/70">Offence #{v.offenceCount}</span>
        </>
      }
      kpis={[
        { label: 'Severity',     value: SEVERITY_LABEL[v.severity], tone: sevTone === 'neutral' ? 'ink' : sevTone === 'danger' ? 'danger' : sevTone === 'warning' ? 'warning' : 'info' },
        { label: 'Offence',      value: `#${v.offenceCount}`,        tone: v.offenceCount === 1 ? 'ink' : v.offenceCount === 2 ? 'warning' : 'danger' },
        { label: 'Penalty',      value: v.penaltyAed > 0 ? formatAed(v.penaltyAed) : '—', tone: v.state === 'paid' || v.state === 'closed_resolved' ? 'success' : 'info' },
        { label: 'Payment SLA',  value: slaDays !== null ? (slaDays < 0 ? `${Math.abs(slaDays)}d overdue` : `${slaDays}d left`) : '—', tone: slaDays !== null && slaDays < 0 ? 'danger' : slaDays !== null && slaDays <= 7 ? 'warning' : 'ink' },
        { label: 'Age',          value: `${age}d`,                   tone: age > 30 ? 'warning' : 'ink' },
      ]}
    >
      {/* Action ribbon — shown when current state offers an action */}
      {(canTriage || canRoute || canDecide) && (
        <div className="card p-3 mb-4 flex items-center justify-between gap-3 flex-wrap bg-amber-50/40 border-amber-200">
          <div className="text-[12px]">
            <div className="font-semibold text-ink-950">Action required — {STATE_LABEL[v.state]}</div>
            <div className="text-[11px] text-neutral-600 mt-0.5">
              {canTriage && 'Pick up the violation to begin triage.'}
              {canRoute && 'Route to administrative decision (Section Head) or VAP Committee.'}
              {canDecide && 'Section Head decides: issue Warning Letter, impose Standard Penalty, or close as No Action.'}
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {canTriage && (
              <button onClick={triage} className="px-3 py-1.5 rounded-md text-[12px] font-semibold bg-action-orange text-white shadow-doe-sm hover:bg-action-orange-dark">
                Pick up & triage
              </button>
            )}
            {canRoute && (
              <>
                <button onClick={routeAdmin} className="px-3 py-1.5 rounded-md text-[12px] font-semibold bg-white border border-neutral-200 text-ink-950 hover:border-action-orange">
                  Route to admin
                </button>
                <button onClick={routeVap} className="px-3 py-1.5 rounded-md text-[12px] font-semibold bg-info-500 text-white shadow-doe-sm hover:opacity-90">
                  Refer to VAP Committee
                </button>
              </>
            )}
            {canDecide && (
              <>
                <button onClick={noAction} className="px-3 py-1.5 rounded-md text-[12px] font-semibold bg-white border border-neutral-200 text-neutral-700 hover:border-doe-red hover:text-doe-red">
                  No action
                </button>
                <button onClick={issueWarning} className="px-3 py-1.5 rounded-md text-[12px] font-semibold bg-amber-500 text-white shadow-doe-sm hover:opacity-90">
                  Issue Warning Letter
                </button>
                <button onClick={imposePenalty} className="px-3 py-1.5 rounded-md text-[12px] font-semibold bg-action-orange text-white shadow-doe-sm hover:bg-action-orange-dark">
                  Impose Standard Penalty
                </button>
              </>
            )}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* MAIN COLUMN */}
        <div className="lg:col-span-2 space-y-4">
          <DetailCard title="Violation Description">
            <div className="text-[13px] text-ink-950 leading-relaxed">{v.description}</div>
            <div className="mt-3 pt-3 border-t border-neutral-100 text-[11.5px] text-neutral-500" dir="rtl">
              {v.titleAr}
            </div>
          </DetailCard>

          <DetailCard title="Source & Linkage" subtitle="Where this violation originated and what it's bound to">
            <FieldGrid>
              <Field label="Source channel"     value={SOURCE_LABEL[v.source]} />
              <Field label="Source reference"   value={v.sourceReference} mono />
              <Field label="Permit type"        value={PERMIT_TYPE_LABEL[v.permitType]} />
              <Field label="Linked permit"      value={v.linkedPermitId ?? '—'} mono />
              {v.linkedBuildingId && <Field label="Linked building" value={v.linkedBuildingId} mono />}
              {v.linkedMaterialId && <Field label="Linked material" value={v.linkedMaterialId} mono />}
              <Field label="Catalogue version"  value={v.configVersionBound} mono />
            </FieldGrid>
          </DetailCard>

          <DetailCard title="Severity & Offence Count">
            <FieldGrid>
              <Field label="Auto-derived severity"  value={SEVERITY_LABEL[v.autoDerivedSeverity]} />
              <Field label="Final severity"         value={SEVERITY_LABEL[v.severity]} tone={sevTone === 'danger' ? 'danger' : sevTone === 'warning' ? 'warning' : undefined} />
              <Field label="Offence count (this code)" value={`#${v.offenceCount} within 24-month window`} tone={v.offenceCount >= 3 ? 'danger' : v.offenceCount === 2 ? 'warning' : undefined} />
              <Field label="Override reason"        value={v.severityOverrideReason ?? '—'} />
            </FieldGrid>
          </DetailCard>

          {penalty && v.penaltyAed > 0 && (
            <DetailCard title="Penalty Breakdown" subtitle="SDD §4.4 — Base × Offence-Count × Severity multiplier, capped at the code maximum">
              <div className="space-y-2 text-[12.5px]">
                <PenaltyRow label="Base penalty (catalogue)" value={formatAed(penalty.basePenaltyAed)} />
                <PenaltyRow label={`× Offence-count multiplier (#${v.offenceCount})`} value={`${penalty.offenceCountMultiplier.toFixed(1)}×`} />
                <PenaltyRow label={`× Severity multiplier (${SEVERITY_LABEL[v.severity]})`} value={`${penalty.severityMultiplier.toFixed(2)}×`} />
                <div className="pt-2 border-t border-neutral-100 flex items-center justify-between text-[12px]">
                  <span className="text-neutral-500">Raw computation</span>
                  <span className="font-mono text-ink-950">{formatAed(penalty.computedRawAed)}</span>
                </div>
                {penalty.capApplied && (
                  <div className="text-[11px] text-amber-700 italic">Capped at the code's maximum penalty.</div>
                )}
                <div className="pt-2 border-t border-neutral-100 flex items-center justify-between">
                  <span className="text-[11px] font-sans uppercase tracking-[0.18em] text-neutral-500">Final penalty</span>
                  <span className="font-display font-bold text-[18px] text-doe-red tabular-nums">{formatAed(penalty.computedPenaltyAed)}</span>
                </div>
              </div>
            </DetailCard>
          )}

          <DetailCard title={`Evidence Attachments`} subtitle={`${v.evidence.length} file${v.evidence.length === 1 ? '' : 's'} on record`}>
            {v.evidence.length === 0 ? (
              <div className="text-[12px] text-neutral-500">No evidence on file.</div>
            ) : (
              <div className="space-y-2">
                {v.evidence.map((e) => (
                  <div key={e.id} className="flex items-center gap-3 px-3 py-2 rounded-md border border-neutral-200 bg-white">
                    <span className="text-action-orange"><FileIcon /></span>
                    <div className="flex-1 min-w-0">
                      <div className="text-[12px] font-semibold text-ink-950 truncate">{e.fileName}</div>
                      <div className="text-[10.5px] text-neutral-500 mt-0.5">{e.fileType.replace('_', ' ')} · {e.sizeKb} KB · uploaded by {e.uploadedBy}</div>
                    </div>
                    <button className="px-2 py-1 rounded text-[10.5px] font-semibold text-neutral-500 hover:text-action-orange-deep hover:bg-neutral-50">Open</button>
                  </div>
                ))}
              </div>
            )}
          </DetailCard>

          {/* Cross-Gov Enforcement Timeline */}
          {v.crossGovEvents.length > 0 && (
            <DetailCard title="Cross-Government Enforcement" subtitle="SDD §6.1 — Block / Release calls dispatched via the API Gateway">
              <div className="space-y-2">
                {v.crossGovEvents.map((e) => <CrossGovRow key={e.id} e={e} />)}
              </div>
            </DetailCard>
          )}

          {/* Appeal section */}
          {v.appealStatus !== 'no_appeal' && (
            <DetailCard title="Appeal" subtitle={`Status: ${v.appealStatus.replace('_', ' ')}`}>
              <FieldGrid>
                <Field label="Submitted"        value={v.appealSubmittedAt ? formatDateTime(v.appealSubmittedAt) : '—'} />
                <Field label="Decided"          value={v.appealDecidedAt ? formatDateTime(v.appealDecidedAt) : '—'} />
                <Field label="Decided by"       value={v.appealDecisionBy ?? (v.appealDecidedAt ? 'Director Panel' : '—')} />
                <Field label="Outcome"          value={v.appealStatus.replace('_', ' ')}
                  tone={v.appealStatus === 'overturned' ? 'success' : v.appealStatus === 'reduced' ? 'warning' : v.appealStatus === 'upheld' ? 'danger' : undefined} />
              </FieldGrid>
              {v.appealReason && (
                <div className="mt-3 pt-3 border-t border-neutral-100">
                  <div className="text-[10px] font-sans uppercase tracking-[0.18em] text-neutral-500 mb-1">Licensee's stated reason</div>
                  <div className="text-[12.5px] text-ink-950 italic leading-relaxed">"{v.appealReason}"</div>
                </div>
              )}
            </DetailCard>
          )}
        </div>

        {/* SIDEBAR */}
        <div className="space-y-4">
          <DetailCard title="Licensee">
            <FieldGrid cols={1}>
              <Field label="Licensee"      value={v.licensee.name} />
              <Field label="Trade licence" value={v.licensee.tradeLicenceNumber ?? '—'} mono />
              <Field label="Primary rep."  value={v.licensee.primaryRepresentativeName ?? '—'} />
              <Field label="Email"         value={v.licensee.primaryEmail ?? '—'} mono />
              <Field label="Phone"         value={v.licensee.primaryPhone ?? '—'} mono />
            </FieldGrid>
          </DetailCard>

          <DetailCard title="Decision Route">
            <FieldGrid cols={1}>
              <Field label="Route"              value={DECISION_ROUTE_LABEL[v.decisionRoute]} />
              <Field label="Outcome"            value={v.decisionOutcome ? DECISION_OUTCOME_LABEL[v.decisionOutcome] : '—'} />
              <Field label="Decided at"         value={v.decisionAt ? formatDateTime(v.decisionAt) : '—'} />
              <Field label="Decided by"         value={v.decisionBy ?? '—'} />
              <Field label="VAP meeting"        value={v.vapMeetingId ?? '—'} mono />
            </FieldGrid>
          </DetailCard>

          {v.paymentDeadline && (
            <DetailCard title="Payment">
              <FieldGrid cols={1}>
                <Field label="Deadline"        value={formatDate(v.paymentDeadline)} tone={slaDays !== null && slaDays < 0 ? 'danger' : undefined} />
                <Field label="SLA"             value={slaDays !== null ? (slaDays < 0 ? `${Math.abs(slaDays)}d overdue` : `${slaDays}d remaining`) : '—'} tone={slaDays !== null && slaDays < 0 ? 'danger' : slaDays !== null && slaDays <= 7 ? 'warning' : undefined} />
                <Field label="Receipt #"       value={v.paymentReceiptNumber ?? '—'} mono />
                <Field label="Settled at"      value={v.paymentSettledAt ? formatDateTime(v.paymentSettledAt) : '—'} />
              </FieldGrid>
            </DetailCard>
          )}

          <DetailCard title="Audit Trail" subtitle={`${v.auditTrail.length} entr${v.auditTrail.length === 1 ? 'y' : 'ies'}`}>
            <ol className="relative pl-5 space-y-3">
              <div className="absolute left-[7px] top-1 bottom-1 w-px bg-neutral-200" />
              {[...v.auditTrail].reverse().map((a) => <AuditNode key={a.id} a={a} />)}
            </ol>
          </DetailCard>
        </div>
      </div>

      {/* Back link */}
      <div className="mt-6">
        <Link to="/compliance/violations" className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-neutral-500 hover:text-doe-red">
          ‹ Back to Violations Register
        </Link>
      </div>
    </ModuleDetailLayout>
  );
}

// ============================================================================
// Sub-components
// ============================================================================
function PenaltyRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-neutral-600">{label}</span>
      <span className="font-mono text-ink-950">{value}</span>
    </div>
  );
}

function AuditNode({ a }: { a: ViolationAuditEntry }) {
  return (
    <li className="relative">
      <span className="absolute -left-[18px] top-0.5 inline-flex items-center justify-center w-[10px] h-[10px] rounded-full bg-info-500 ring-4 ring-white" />
      <div className="text-[10px] font-mono text-neutral-500">{new Date(a.timestamp).toLocaleString('en-GB')}</div>
      <div className="text-[12px] font-semibold text-ink-950 leading-tight mt-0.5">{a.action}</div>
      <div className="text-[10.5px] text-neutral-600 mt-0.5">by {a.actor} · {a.actorRole}</div>
      {a.reason && <div className="text-[11px] text-neutral-500 italic mt-1 line-clamp-2">{a.reason}</div>}
    </li>
  );
}

function CrossGovRow({ e }: { e: CrossGovEvent }) {
  const auth = e.authority.toUpperCase();
  const opCls = e.operation === 'block' ? 'bg-rose-50 text-doe-red ring-doe-red/30' : 'bg-emerald-50 text-emerald-700 ring-emerald-500/30';
  return (
    <div className="flex items-start gap-3 px-3 py-2.5 rounded-md border border-neutral-200 bg-white">
      <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide ring-1', opCls)}>
        {e.operation}
      </span>
      <div className="flex-1 min-w-0">
        <div className="text-[12px] font-semibold text-ink-950">{auth}</div>
        <div className="text-[10.5px] text-neutral-500 mt-0.5">{new Date(e.emittedAt).toLocaleString('en-GB')} · response {e.responseCode ?? '—'}</div>
        <div className="text-[11px] text-neutral-700 italic mt-1">{e.reasonText}</div>
      </div>
    </div>
  );
}

function FileIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
    </svg>
  );
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}
function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

// Suppress unused-import warning on ViolationSeverity / ViolationState (used via types only)
void ({} as ViolationSeverity);
void ({} as ViolationState);
