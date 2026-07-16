import { useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { useInspections } from '../../store/inspections';
import { useAuth } from '../../store/auth';
import { cn, formatDateTime } from '../../lib/utils';

// ============================================================================
// InspectionDetailPage — full read-out of a mobile-submitted inspection plus
// the action panel for the web review cycle (Doc 2 §7).
//   • Start review              · Section Head / Regulation Team
//   • Request co-sign           · auto-triggered when critical violation, but
//                                  also surfaced manually
//   • Co-sign                   · Senior Inspector (+ Section Head + Director)
//   • Return for clarification  · sends back to inspector with comments
//   • Approve                   · final approval (blocked while co-sign pending)
//   • Escalate to VAP           · pushes violations into the existing module
// ============================================================================

export function InspectionDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const ins = useInspections((s) => s.getById(id ?? ''));
  const user = useAuth((s) => s.user);

  const startReview        = useInspections((s) => s.startReview);
  const requestCoSign      = useInspections((s) => s.requestCoSign);
  const coSign             = useInspections((s) => s.coSign);
  const approve            = useInspections((s) => s.approve);
  const returnToInspector  = useInspections((s) => s.returnToInspector);
  const escalateToVap      = useInspections((s) => s.escalateToVap);
  const closeRetained      = useInspections((s) => s.closeRetained);

  const [actionDrawer, setActionDrawer] = useState<null | 'return' | 'approve' | 'coSign' | 'vap' | 'closeRetained'>(null);
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);

  if (!ins) {
    return (
      <div className="max-w-[1100px] mx-auto p-6">
        <Link to="/inspections" className="text-[12px] text-doe-red">← Back</Link>
        <div className="bg-white rounded-xl border border-neutral-100 p-10 mt-4 text-center">
          <div className="text-[15px] font-bold text-ink-950">Inspection not found.</div>
        </div>
      </div>
    );
  }
  if (!user) return null;

  const actor = { id: user.id, name: user.name, role: user.role };

  const isCritical    = ins.violations.some((v) => v.severity === 'critical');
  const isReturnable  = ['submitted', 'escalated', 'in_review', 'needs_cosign'].includes(ins.status);
  const isReviewable  = ['submitted', 'escalated'].includes(ins.status);
  const isApprovable  = ['in_review', 'escalated', 'submitted'].includes(ins.status) && (!isCritical || !!ins.coSignedAt);
  const canCoSign     = ins.status === 'needs_cosign' && ['senior_inspector', 'section_head', 'director'].includes(user.role);
  const isVapEligible = ins.violations.length > 0 && ['in_review', 'escalated', 'submitted'].includes(ins.status) && (!isCritical || !!ins.coSignedAt);
  const canCloseRetained = ins.status === 'retained' && ['senior_inspector', 'section_head', 'director'].includes(user.role);

  const runAction = (fn: () => { ok: boolean; error?: string }) => {
    setError(null);
    const res = fn();
    if (!res.ok) setError(res.error ?? 'Action failed');
    else { setActionDrawer(null); setNote(''); }
  };

  return (
    <div className="max-w-[1400px] mx-auto px-6 pt-5 pb-10">
      {/* Breadcrumb */}
      <div className="flex items-center justify-between text-[12px] mb-5">
        <nav className="text-neutral-500">
          <Link to="/pps-dashboard" className="hover:text-doe-red">Home</Link>
          <span className="mx-2 text-neutral-300">›</span>
          <Link to="/inspections" className="hover:text-doe-red">Mobile Inspections</Link>
          <span className="mx-2 text-neutral-300">›</span>
          <span className="text-ink-950 font-semibold">{ins.inspectionNumber}</span>
        </nav>
        <Link to={`/mobile/inspection/${ins.id}`} className="text-[11px] uppercase tracking-wider text-doe-red font-semibold hover:underline">
          Open on mobile simulator →
        </Link>
      </div>

      {/* Header card */}
      <div className="card overflow-hidden mb-5">
        <div className="px-6 py-5 bg-white border-b border-neutral-100 flex items-start gap-4 flex-wrap">
          <div className={cn(
            'w-14 h-14 rounded-xl grid place-items-center text-white text-[14px] font-bold shrink-0',
            isCritical ? 'bg-doe-red' : 'bg-action-orange',
          )}>
            {ins.inspectionNumber.split('-').slice(-1)[0]}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[10px] uppercase tracking-[0.2em] text-neutral-500">Field Inspection · {ins.type.replace(/_/g, ' ')}</div>
            <h1 className="font-display font-bold text-[22px] leading-tight mt-0.5">{ins.buildingName}</h1>
            <div className="text-[12.5px] text-neutral-600 mt-1">
              {ins.inspectionNumber} · {ins.buildingUid} · Submitted by <span className="font-semibold text-ink-950">{ins.inspectorName}</span> on {formatDateTime(ins.endAt ?? ins.updatedAt)}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <StatusPill status={ins.status} />
            {ins.overallOutcome && <OutcomePill outcome={ins.overallOutcome.result} />}
            {isCritical && <span className="px-2 py-1 rounded-md bg-doe-red text-white text-[10.5px] font-bold uppercase tracking-wider">⚠ Critical</span>}
          </div>
        </div>

        {/* Action bar */}
        <div className="bg-neutral-50 border-b border-neutral-100 px-6 py-3 flex items-center flex-wrap gap-2">
          {isReviewable && (
            <button
              onClick={() => runAction(() => startReview(ins.id, actor))}
              className="px-3 h-9 rounded-md bg-info-500 text-white text-[12px] font-semibold hover:bg-info-500/90"
            >Start review</button>
          )}
          {isCritical && ins.status === 'in_review' && !ins.coSignedAt && (
            <button
              onClick={() => runAction(() => requestCoSign(ins.id, actor))}
              className="px-3 h-9 rounded-md bg-action-orange text-white text-[12px] font-semibold hover:bg-action-orange-deep"
            >Request Senior Inspector co-sign</button>
          )}
          {canCoSign && (
            <button
              onClick={() => setActionDrawer('coSign')}
              className="px-3 h-9 rounded-md bg-success-500 text-white text-[12px] font-semibold hover:bg-success-500/90"
            >Co-sign (Senior Inspector)</button>
          )}
          {isApprovable && (
            <button
              onClick={() => setActionDrawer('approve')}
              className="px-3 h-9 rounded-md bg-doe-red text-white text-[12px] font-semibold hover:bg-doe-red-dark"
            >Approve</button>
          )}
          {isReturnable && (
            <button
              onClick={() => setActionDrawer('return')}
              className="px-3 h-9 rounded-md bg-white border border-warning-500 text-warning-500 text-[12px] font-semibold hover:bg-warning-soft"
            >Return for clarification</button>
          )}
          {isVapEligible && (
            <button
              onClick={() => setActionDrawer('vap')}
              className="px-3 h-9 rounded-md bg-ink-950 text-white text-[12px] font-semibold hover:bg-charcoal-900"
            >Escalate to VAP Committee</button>
          )}
          {canCloseRetained && (
            <button
              onClick={() => setActionDrawer('closeRetained')}
              className="px-3 h-9 rounded-md bg-info-500 text-white text-[12px] font-semibold hover:bg-info-500/90"
            >Close retained follow-up</button>
          )}
          {ins.status === 'approved' && (
            <span className="text-[11.5px] text-success-500 font-semibold">✓ Inspection approved &amp; closed by {ins.workflow.slice().reverse().find((w) => w.action === 'approve')?.actorName ?? '—'}</span>
          )}
          <div className="ml-auto text-[10.5px] uppercase tracking-wider text-neutral-500">
            Acting as <span className="text-ink-950 font-semibold">{user.name}</span> · {user.role.replace(/_/g, ' ')}
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-doe-red-soft text-doe-red border-b border-doe-red/20 px-6 py-2 text-[12px] font-semibold">{error}</div>
        )}
      </div>

      {/* Main grid */}
      <div className="grid grid-cols-[1fr_360px] gap-5">
        <div className="space-y-5">
          {/* Building snapshot */}
          <Card title="Building snapshot at check-in">
            <KVGrid items={[
              ['Building',            ins.buildingName],
              ['Building UID',        ins.buildingUid],
              ['Address',             ins.buildingAddress],
              ['Type',                ins.buildingType ?? '—'],
              ['Commercial Licence',  ins.commercialLicence ?? '—'],
              ['Open violations',     ins.openViolationsAtCheckin.toString()],
              ['Open warnings',       ins.openWarningsAtCheckin.toString()],
              ['Compliance Score',    ins.complianceScoreAtCheckin?.toString() ?? '—'],
            ]} />
            <div className="mt-3 grid grid-cols-4 gap-2">
              <PermitTile label="AMC" status={ins.permits.amc.status} expiry={ins.permits.amc.expiry} />
              <PermitTile label="NOC" status={ins.permits.noc.status} expiry={ins.permits.noc.expiry} />
              <PermitTile label="COC" status={ins.permits.coc.status} expiry={ins.permits.coc.expiry} />
              <PermitTile label="TPI CoC" status={ins.permits.tpiCoc?.status ?? 'not_on_file'} expiry={ins.permits.tpiCoc?.expiry} />
            </div>
          </Card>

          {/* Check-in */}
          <Card title="Check-in (geofence)">
            <KVGrid items={[
              ['Checked in at',    formatDateTime(ins.checkInAt)],
              ['Inspector',        `${ins.inspectorName} · ${ins.inspectorId}`],
              ['Coords',           `${ins.checkInLat.toFixed(5)}, ${ins.checkInLng.toFixed(5)}`],
              ['Distance to building', `${ins.geofenceDistanceMeters} m`],
              ['Geofence override', ins.geofenceOverride ? 'YES — flagged' : 'No'],
            ]} />
            {ins.geofenceOverride && ins.geofenceOverrideReason && (
              <div className="mt-2 rounded-lg bg-warning-soft p-2.5 text-[11.5px] text-warning-500">
                <strong>Override reason:</strong> {ins.geofenceOverrideReason}
              </div>
            )}
          </Card>

          {/* Pre-inspection */}
          <Card title="Pre-inspection verification">
            <KVGrid items={[
              ['Responsible party present', ins.responsibleParty.length > 0 ? 'Yes' : 'No'],
              ['AMC visible on premises',   yesNoText(ins.amcVisible)],
              ['NOC visible on premises',   yesNoText(ins.nocVisible)],
              ['Briefing given',            yesNoText(ins.briefingGiven)],
            ]} />
          </Card>

          {/* Checklist */}
          <Card title={`Compliance checklist · ${ins.checklist.length} items`}>
            <div className="space-y-1.5">
              {ins.checklist.map((c, idx) => (
                <div key={c.id} className={cn(
                  'rounded-lg border p-3',
                  c.outcome === 'violation' ? 'border-doe-red/40 bg-doe-red-soft/30' :
                  c.outcome === 'warning'   ? 'border-warning-500/30 bg-warning-soft/30' :
                  c.outcome === 'compliant' ? 'border-success-500/20 bg-success-soft/30' :
                  c.outcome === 'na'        ? 'border-neutral-200 bg-neutral-50' :
                                              'border-neutral-200 bg-white',
                )}>
                  <div className="flex items-baseline justify-between gap-2">
                    <div className="flex items-baseline gap-2 min-w-0">
                      <span className="text-[10.5px] font-mono text-neutral-500">{(idx + 1).toString().padStart(2, '0')}</span>
                      <span className="text-[12.5px] font-semibold text-ink-950">{c.description}</span>
                    </div>
                    <span className={cn(
                      'inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-semibold capitalize uppercase tracking-wider shrink-0',
                      outcomeBadgeCls(c.outcome),
                    )}>{c.outcome ?? 'pending'}{c.severity ? ` · ${c.severity}` : ''}</span>
                  </div>
                  {c.referenceClause && <div className="text-[10px] font-mono text-neutral-500 mt-1">{c.referenceClause}</div>}
                  {c.observations && <div className="text-[11.5px] text-neutral-700 mt-1.5">{c.observations}</div>}
                  {c.photos.length > 0 && (
                    <div className="mt-2 flex gap-1.5 overflow-x-auto">
                      {c.photos.map((p) => (
                        <img key={p.id} src={p.dataUrl} alt={p.caption} className="w-20 h-20 rounded-lg object-cover border border-neutral-200" title={p.caption} />
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </Card>

          {/* Violations */}
          {ins.violations.length > 0 && (
            <Card title={`Violations recorded · ${ins.violations.length}`}>
              <div className="space-y-2">
                {ins.violations.map((v) => (
                  <div key={v.id} className="rounded-lg border border-doe-red/30 bg-doe-red-soft/30 p-3 space-y-1.5">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-1.5">
                        <span className={cn(
                          'inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider',
                          v.severity === 'critical' ? 'bg-doe-red text-white' : v.severity === 'major' ? 'bg-action-orange text-white' : 'bg-warning-500 text-white',
                        )}>{v.severity}</span>
                        {v.violationNumber && <span className="text-[11px] font-mono font-semibold text-doe-red">{v.violationNumber}</span>}
                        {v.repeatOffenceCount && v.repeatOffenceCount > 0 && (
                          <span className="px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-warning-soft text-warning-500">{v.repeatOffenceCount} prior</span>
                        )}
                      </div>
                      <span className="text-[10.5px] text-neutral-600 capitalize">disposition: {v.disposition.replace(/_/g, ' ')}</span>
                    </div>
                    <div className="text-[13px] font-bold text-ink-950">{v.category}</div>
                    <div className="text-[12px] text-neutral-700">{v.description}</div>
                    {(v.witnessName || v.witnessStatement) && (
                      <div className="rounded bg-white border border-neutral-200 p-2 text-[11.5px]">
                        {v.witnessName && <div className="font-semibold text-ink-950">Witness: {v.witnessName}</div>}
                        {v.witnessStatement && <div className="text-neutral-700 mt-0.5">"{v.witnessStatement}"</div>}
                      </div>
                    )}
                    {v.photos.length > 0 && (
                      <div className="flex gap-1.5 overflow-x-auto pt-1">
                        {v.photos.map((p) => (
                          <img key={p.id} src={p.dataUrl} alt={p.caption} className="w-20 h-20 rounded-lg object-cover border border-neutral-200" title={p.caption} />
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
              {ins.linkedViolationIds && ins.linkedViolationIds.length > 0 && (
                <div className="mt-3 rounded-lg bg-neutral-50 p-2.5">
                  <div className="text-[10.5px] uppercase tracking-wider text-neutral-500 mb-1">Linked to centralized Violations Register</div>
                  <div className="flex flex-wrap gap-1.5">
                    {ins.linkedViolationIds.map((vn) => (
                      <Link
                        key={vn}
                        to="/compliance/violations"
                        className="px-2 py-0.5 rounded bg-white border border-neutral-200 font-mono text-[11px] text-doe-red hover:bg-doe-red-soft"
                      >{vn}</Link>
                    ))}
                  </div>
                </div>
              )}
            </Card>
          )}

          {ins.generalObservations || ins.recommendations || ins.internalNotes ? (
            <Card title="Observations &amp; recommendations">
              {ins.generalObservations && <Para label="General observations" text={ins.generalObservations} />}
              {ins.recommendations && <Para label="Recommendations" text={ins.recommendations} />}
              {ins.internalNotes && <Para label="Internal notes (DoE only)" text={ins.internalNotes} />}
            </Card>
          ) : null}
        </div>

        {/* Right rail */}
        <div className="space-y-5">
          {/* Workflow trail */}
          <Card title="Workflow trail">
            <div className="space-y-3">
              {ins.workflow.slice().reverse().map((ev, i) => (
                <div key={i} className="flex gap-2.5">
                  <div className="shrink-0 mt-1">
                    <span className="w-2 h-2 rounded-full bg-action-orange block" />
                    <span className="w-px h-8 bg-neutral-200 block mx-auto" />
                  </div>
                  <div className="flex-1 min-w-0 pb-2">
                    <div className="text-[11.5px] font-semibold text-ink-950 capitalize">{ev.action.replace(/_/g, ' ')}</div>
                    <div className="text-[10.5px] text-neutral-500">{ev.actorName} · {ev.actorRole.replace(/_/g, ' ')}</div>
                    <div className="text-[10px] text-neutral-400">{formatDateTime(ev.at)}</div>
                    {ev.comment && <div className="text-[11px] text-neutral-700 mt-1 rounded-md bg-neutral-50 p-1.5">{ev.comment}</div>}
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card title="Sign-off">
            <KVGrid items={[
              ['Inspector signed at', ins.inspectorSignedAt ? formatDateTime(ins.inspectorSignedAt) : '—'],
              ['Co-signed by',        ins.coSignerName ?? '—'],
              ['Co-signed at',        ins.coSignedAt ? formatDateTime(ins.coSignedAt) : '—'],
            ]} />
            {ins.followUpDueAt && (
              <div className="mt-2 rounded-lg bg-info-soft text-info-500 p-2 text-[11.5px]">
                Follow-up due {formatDateTime(ins.followUpDueAt)}{ins.followUpAssignedTo ? ` · ${ins.followUpAssignedTo}` : ''}
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* Action drawer */}
      {actionDrawer && (
        <div className="fixed inset-0 z-[100] bg-ink-950/40 grid place-items-center p-4" onClick={() => setActionDrawer(null)}>
          <div className="bg-white rounded-2xl shadow-doe-xl max-w-[480px] w-full overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="px-5 py-3 border-b border-neutral-100 flex items-center justify-between">
              <div className="text-[15px] font-bold text-ink-950">
                {actionDrawer === 'return'        && 'Return for clarification'}
                {actionDrawer === 'approve'       && 'Approve inspection'}
                {actionDrawer === 'coSign'        && 'Senior Inspector co-sign'}
                {actionDrawer === 'vap'           && 'Escalate to VAP Committee'}
                {actionDrawer === 'closeRetained' && 'Close retained follow-up'}
              </div>
              <button onClick={() => setActionDrawer(null)} className="text-neutral-500 hover:text-ink-950">✕</button>
            </div>
            <div className="p-5 space-y-3">
              <label className="block">
                <span className="text-[11.5px] font-semibold uppercase tracking-wider text-neutral-500">
                  {actionDrawer === 'return' ? 'Reason · mandatory' : 'Note · optional'}
                </span>
                <textarea
                  rows={4}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder={actionDrawer === 'return' ? 'Explain what needs to be corrected on the mobile side.' : 'Add a note for the workflow trail (optional).'}
                  className="mt-1 w-full p-2 border border-neutral-200 rounded-lg text-[12.5px] focus:outline-none focus:border-doe-red"
                />
              </label>
              <div className="flex justify-end gap-2">
                <button onClick={() => setActionDrawer(null)} className="px-3 h-9 rounded-md text-[12px] font-semibold text-neutral-700 hover:bg-neutral-50">Cancel</button>
                <button
                  onClick={() => {
                    if (actionDrawer === 'return')        runAction(() => returnToInspector(ins.id, actor, note));
                    if (actionDrawer === 'approve')       runAction(() => approve(ins.id, actor, note || undefined));
                    if (actionDrawer === 'coSign')        runAction(() => coSign(ins.id, actor, note || undefined));
                    if (actionDrawer === 'vap')           runAction(() => escalateToVap(ins.id, actor, note || undefined));
                    if (actionDrawer === 'closeRetained') runAction(() => closeRetained(ins.id, actor, note || undefined));
                  }}
                  className="px-4 h-9 rounded-md bg-doe-red text-white text-[12px] font-semibold hover:bg-doe-red-dark"
                >Confirm</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// =============================================================================
function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-neutral-100 overflow-hidden">
      <div className="px-4 py-2.5 border-b border-neutral-100 bg-neutral-50 text-[11px] font-semibold uppercase tracking-wider text-neutral-700">{title}</div>
      <div className="p-4">{children}</div>
    </div>
  );
}
function KVGrid({ items }: { items: [string, string][] }) {
  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
      {items.map(([k, v]) => (
        <div key={k} className="flex items-baseline justify-between gap-2 py-1 border-b border-neutral-50 last:border-0">
          <div className="text-[10.5px] uppercase tracking-wider text-neutral-500">{k}</div>
          <div className="text-[12px] font-semibold text-ink-950 text-right truncate">{v}</div>
        </div>
      ))}
    </div>
  );
}
function Para({ label, text }: { label: string; text: string }) {
  return (
    <div className="mb-2">
      <div className="text-[10.5px] uppercase tracking-wider text-neutral-500">{label}</div>
      <div className="text-[12.5px] text-ink-950 mt-0.5 whitespace-pre-wrap">{text}</div>
    </div>
  );
}
function StatusPill({ status }: { status: string }) {
  return (
    <span className={cn('px-2 py-1 rounded-md text-[10.5px] font-bold uppercase tracking-wider', statusCls(status))}>
      {status.replace(/_/g, ' ')}
    </span>
  );
}
function OutcomePill({ outcome }: { outcome: string }) {
  return (
    <span className={cn('px-2 py-1 rounded-md text-[10.5px] font-bold uppercase tracking-wider', outcomeCls(outcome))}>
      {outcome.replace(/_/g, ' ')}
    </span>
  );
}
function PermitTile({ label, status, expiry }: { label: string; status: string; expiry?: string }) {
  return (
    <div className="rounded-lg border border-neutral-200 p-2">
      <div className="flex items-center justify-between">
        <span className="text-[10.5px] font-bold text-ink-950 font-mono">{label}</span>
        <span className={cn('px-1.5 py-0.5 rounded text-[9.5px] font-semibold uppercase', permitCls(status))}>{status.replace('_', ' ')}</span>
      </div>
      <div className="text-[10px] text-neutral-500 mt-0.5">Exp: {expiry ?? '—'}</div>
    </div>
  );
}
function yesNoText(b: boolean | null): string { return b === null ? '—' : b ? 'Yes' : 'No'; }
function statusCls(s: string): string {
  switch (s) {
    case 'approved':     return 'bg-success-soft text-success-500';
    case 'retained':     return 'bg-info-soft text-info-500';
    case 'escalated': case 'in_review': return 'bg-action-orange-soft text-action-orange-deep';
    case 'needs_cosign': return 'bg-doe-red text-white';
    case 'returned':     return 'bg-warning-soft text-warning-500';
    case 'closed':       return 'bg-neutral-200 text-neutral-700';
    case 'draft':        return 'bg-doe-red-soft text-doe-red';
    default:             return 'bg-neutral-100 text-neutral-700';
  }
}
function outcomeCls(o: string): string {
  switch (o) {
    case 'compliant':              return 'bg-success-soft text-success-500';
    case 'compliant_with_warnings':return 'bg-warning-soft text-warning-500';
    case 'non_compliant':          return 'bg-doe-red-soft text-doe-red';
    default:                       return 'bg-neutral-100 text-neutral-700';
  }
}
function outcomeBadgeCls(o: string | null): string {
  if (o === 'compliant')  return 'bg-success-soft text-success-500';
  if (o === 'warning')    return 'bg-warning-soft text-warning-500';
  if (o === 'violation')  return 'bg-doe-red text-white';
  if (o === 'na')         return 'bg-neutral-200 text-neutral-700';
  return 'bg-neutral-100 text-neutral-500';
}
function permitCls(s: string): string {
  switch (s) {
    case 'active':  return 'bg-success-soft text-success-500';
    case 'grace':   return 'bg-warning-soft text-warning-500';
    case 'expired': return 'bg-doe-red-soft text-doe-red';
    default:        return 'bg-neutral-100 text-neutral-600';
  }
}
