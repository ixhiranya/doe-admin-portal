import { useParams, useNavigate, Routes, Route, Navigate } from 'react-router-dom';
import { useState } from 'react';
import { nanoid } from 'nanoid';
import { useInspections } from '../../store/inspections';
import { useAuth } from '../../store/auth';
import { VIOLATION_CATEGORIES } from '../../data/inspections';
import type { ChecklistItem, ChecklistOutcome, Severity, InspectionViolation, InspectionPhoto } from '../../types/inspection';
import {
  TammScreen, TammCard, TammRow, TammDivider, TammBadge, TammButton, TammSectionTitle,
} from '../../components/mobile/Tamm';
import { PhotoCapture, PhotoThumb } from '../../components/mobile/PhotoCapture';
import { SubmittedScreen } from './SubmittedScreen';
import { useT } from '../../i18n';
import { cn, formatDateTime } from '../../lib/utils';

// ============================================================================
// InspectionWizard (TAMM redesign) — multi-step inspection on the mobile.
//   /mobile/inspection/:id            → overview / read-only
//   /mobile/inspection/:id/checklist  → 7-section form
//   /mobile/inspection/:id/violation/:itemId  → per-item Violation Form
//   /mobile/inspection/:id/review     → review screen (overall outcome + submit)
// ============================================================================

export function InspectionWizard() {
  return (
    <Routes>
      <Route index             element={<InspectionOverview />} />
      <Route path="checklist"  element={<ChecklistStep />} />
      <Route path="violation/:itemId" element={<ViolationFormStep />} />
      <Route path="review"     element={<ReviewSubmitStep />} />
      <Route path="done"       element={<SubmittedScreen />} />
      <Route path="*" element={<Navigate to="" replace />} />
    </Routes>
  );
}

// =============================================================================
// InspectionOverview — read-only summary view
// =============================================================================
function InspectionOverview() {
  const { id } = useParams();
  const navigate = useNavigate();
  const ins = useInspections((s) => s.getById(id ?? ''));
  const t = useT();
  if (!ins) return <NotFound />;

  const outcomeTone: 'green' | 'amber' | 'red' =
    ins.overallOutcome?.result === 'non_compliant' ? 'red' :
    ins.overallOutcome?.result === 'compliant_with_warnings' ? 'amber' :
    'green';

  const completedItems = ins.checklist.filter((c) => c.outcome !== null).length;
  const compliantCount = ins.checklist.filter((c) => c.outcome === 'compliant').length;
  const warningCount   = ins.checklist.filter((c) => c.outcome === 'warning').length;
  const violationCount = ins.checklist.filter((c) => c.outcome === 'violation').length;

  const outcomeGlow =
    outcomeTone === 'red'   ? 'rgba(225,29,72,0.32)' :
    outcomeTone === 'amber' ? 'rgba(217,119,6,0.26)' :
                              'rgba(16,185,129,0.28)';
  const outcomeDot =
    outcomeTone === 'red'   ? '#E11D48' :
    outcomeTone === 'amber' ? '#D97706' :
                              '#10B981';
  const totalItems = ins.checklist.length;

  return (
    <TammScreen
      title={ins.inspectionNumber}
      tabBar={false}
      leading="home"
      trailing={<span className="w-6" />}
    >
      {/* Dark dossier hero — matches Home & Building OS aesthetic. */}
      <div className="px-4 sm:px-6 pt-1">
        <div
          className="relative rounded-[20px] overflow-hidden text-white shadow-[0_18px_40px_-12px_rgba(11,14,18,0.40)]"
          style={{ backgroundImage: 'linear-gradient(155deg, #161B23 0%, #0B0E12 60%, #131822 100%)' }}
        >
          <div className="absolute -top-14 -end-14 w-52 h-52 rounded-full pointer-events-none" style={{ background: `radial-gradient(circle, ${outcomeGlow}, transparent 70%)` }} />
          <div className="absolute -bottom-14 -start-10 w-44 h-44 rounded-full pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(37,99,235,0.14), transparent 70%)' }} />

          <div className="relative p-4">
            {/* Top row — status + outcome pills */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-white/12 ring-1 ring-white/15 text-[9.5px] font-bold uppercase tracking-[0.14em]">
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: outcomeDot }} />
                {ins.status.replace(/_/g, ' ')}
              </span>
              {ins.overallOutcome && (
                <span
                  className="px-2 py-0.5 rounded-md text-white text-[9.5px] font-bold uppercase tracking-[0.14em]"
                  style={{ background: outcomeDot }}
                >
                  {ins.overallOutcome.result.replace(/_/g, ' ')}
                </span>
              )}
              {ins.violations.length > 0 && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-tamm-brand/85 text-white text-[9.5px] font-bold uppercase tracking-[0.14em]">
                  ⚠ {ins.violations.length}
                </span>
              )}
            </div>

            {/* Type + building name */}
            <div className="mt-3">
              <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/55">
                {ins.type.replace(/_/g, ' ')} · {ins.buildingUid}
              </div>
              <div className="text-[20px] font-bold mt-1 leading-[1.15] tracking-[-0.018em] line-clamp-2" style={{ fontFamily: 'var(--font-display)' }}>
                {ins.buildingName}
              </div>
              <div className="text-[11px] text-white/65 mt-1 truncate">{ins.buildingAddress}</div>
            </div>

            {/* Outcome stats — horizontal */}
            <div className="mt-3 grid grid-cols-4 rounded-xl bg-white/[0.06] ring-1 ring-white/10 overflow-hidden">
              <WizMini label={t('m.wiz.compliant')} value={compliantCount} accent="#10B981" />
              <WizMini label={t('m.wiz.warning')}   value={warningCount}   accent={warningCount > 0 ? '#D97706' : undefined} />
              <WizMini label={t('m.wiz.violation')} value={violationCount} accent={violationCount > 0 ? '#E11D48' : undefined} />
              <WizMini label="Total" value={totalItems} />
            </div>
          </div>
        </div>
      </div>

      {/* In-progress / returned banner */}
      {(ins.status === 'draft' || ins.status === 'returned') && (
        <div className="px-5 mt-3">
          <div className={cn(
            'rounded-[18px] p-3 flex items-start gap-3 ring-1',
            ins.status === 'returned' ? 'bg-tamm-amberSoft ring-tamm-amber/30' : 'bg-tamm-brandSoft ring-tamm-brand/30',
          )}>
            <span className={cn(
              'w-9 h-9 rounded-[12px] grid place-items-center text-white shrink-0',
              ins.status === 'returned' ? 'bg-tamm-amber' : 'bg-tamm-brand',
            )}>
              {ins.status === 'returned' ? (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/></svg>
              ) : (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4z"/></svg>
              )}
            </span>
            <div className="flex-1 min-w-0">
              <div className="text-[13px] font-bold text-tamm-ink">
                {ins.status === 'returned' ? 'Returned by Section Head' : 'Draft in progress'}
              </div>
              <div className="text-[11.5px] text-tamm-subtle mt-0.5">
                {ins.status === 'returned' ? 'Please review comments and resubmit.' : `${completedItems}/${ins.checklist.length} checklist items complete.`}
              </div>
              <button
                onClick={() => navigate(`/mobile/inspection/${ins.id}/checklist`)}
                className="mt-2 h-9 px-3 rounded-lg bg-tamm-brand text-white text-[12.5px] font-bold active:scale-95 transition"
              >
                {ins.status === 'returned' ? 'Open & resubmit' : 'Continue inspection'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Building snapshot */}
      <TammCard title="Building snapshot" padding="none">
        <PropertyRow label={t('m.building.uid')} value={ins.buildingUid} />
        <TammDivider inset={false} />
        <PropertyRow label="Address" value={ins.buildingAddress} />
        <TammDivider inset={false} />
        <PropertyRow label="Inspection type" value={ins.type.replace(/_/g, ' ')} />
        <TammDivider inset={false} />
        <PropertyRow label="Inspector" value={ins.inspectorName} />
        <TammDivider inset={false} />
        <PropertyRow label="Check-in" value={formatDateTime(ins.checkInAt)} />
        {ins.endAt && (
          <>
            <TammDivider inset={false} />
            <PropertyRow label="Submitted" value={formatDateTime(ins.endAt)} />
          </>
        )}
      </TammCard>

      {/* Checklist summary */}
      <TammCard title={`Checklist · ${completedItems}/${ins.checklist.length}`}>
        <div className="space-y-2">
          {ins.checklist.map((c) => (
            <div key={c.id} className="flex items-start gap-2.5 py-1">
              <span className={cn(
                'w-6 h-6 rounded-md grid place-items-center text-[10px] font-bold shrink-0',
                outcomeBadge(c.outcome),
              )}>
                {c.outcome === 'compliant' ? '✓' :
                 c.outcome === 'violation' ? '✗' :
                 c.outcome === 'warning'   ? '!' :
                 c.outcome === 'na'        ? '−' : '·'}
              </span>
              <div className="flex-1 min-w-0">
                <div className="text-[12.5px] text-tamm-ink leading-snug">{c.description}</div>
                {c.observations && (
                  <div className="text-[11px] text-tamm-subtle mt-0.5 italic">"{c.observations}"</div>
                )}
              </div>
            </div>
          ))}
        </div>
      </TammCard>

      {/* Violations recorded */}
      {ins.violations.length > 0 && (
        <TammCard title={`Violations recorded · ${ins.violations.length}`} padding="sm">
          <div className="space-y-2">
            {ins.violations.map((v) => (
              <div key={v.id} className="rounded-[14px] border border-tamm-brand/20 bg-tamm-brandSoft/60 p-3 space-y-1.5">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <TammBadge tone={v.severity === 'critical' ? 'red' : v.severity === 'major' ? 'orange' : 'amber'}>{v.severity}</TammBadge>
                  {v.violationNumber && <span className="text-[11px] font-mono font-bold text-tamm-brand">{v.violationNumber}</span>}
                  {v.repeatOffenceCount && <TammBadge tone="orange">{v.repeatOffenceCount} repeat</TammBadge>}
                </div>
                <div className="text-[13px] font-bold text-tamm-ink">{v.category}</div>
                <div className="text-[11.5px] text-tamm-subtle leading-snug">{v.description}</div>
                {v.photos.length > 0 && (
                  <div className="flex gap-1.5 overflow-x-auto pt-1">
                    {v.photos.map((p) => <PhotoThumb key={p.id} photo={p} />)}
                  </div>
                )}
              </div>
            ))}
          </div>
        </TammCard>
      )}

      {/* Workflow trail */}
      <TammCard title="Workflow trail">
        <div className="space-y-3">
          {ins.workflow.slice().reverse().map((ev, i) => (
            <div key={i} className="flex gap-3">
              <div className="shrink-0 mt-1">
                <span className="w-2 h-2 rounded-full bg-tamm-tint block" />
                {i < ins.workflow.length - 1 && <span className="w-px h-7 bg-tamm-line block mx-auto" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[12px] font-bold text-tamm-ink capitalize">{ev.action.replace(/_/g, ' ')}</div>
                <div className="text-[10.5px] text-tamm-subtle">{ev.actorName} · {formatDateTime(ev.at)}</div>
                {ev.comment && <div className="text-[11px] text-tamm-ink mt-1 rounded-lg bg-tamm-field p-2">{ev.comment}</div>}
              </div>
            </div>
          ))}
        </div>
      </TammCard>

      <div className="h-8" />
    </TammScreen>
  );
}

function WizMini({ label, value, accent }: { label: string; value: number; accent?: string }) {
  return (
    <div className="px-2 py-2 min-w-0">
      <div className="text-[8.5px] font-semibold uppercase tracking-[0.1em] text-white/55 truncate">{label}</div>
      <div
        className="text-[17px] font-bold leading-tight mt-1 tabular-nums tracking-tight"
        style={{ fontFamily: 'var(--font-display)', color: accent ?? 'white' }}
      >
        {value}
      </div>
    </div>
  );
}

function PropertyRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between px-4 py-3 gap-3">
      <div className="text-[12.5px] text-tamm-subtle">{label}</div>
      <div className="text-[13px] font-semibold text-tamm-ink text-end truncate max-w-[60%]">{value}</div>
    </div>
  );
}

function outcomeBadge(o: string | null): string {
  if (o === 'compliant') return 'bg-tamm-green text-white';
  if (o === 'warning')   return 'bg-tamm-amber text-white';
  if (o === 'violation') return 'bg-tamm-brand text-white';
  if (o === 'na')        return 'bg-tamm-line text-tamm-ink';
  return 'bg-tamm-field text-tamm-subtle';
}

// =============================================================================
// ChecklistStep — the 7-section field inspection form
// =============================================================================
function ChecklistStep() {
  const { id } = useParams();
  const navigate = useNavigate();
  const user = useAuth((s) => s.user);
  const ins = useInspections((s) => s.getById(id ?? ''));
  const updateDraft = useInspections((s) => s.updateDraft);
  const updateItem = useInspections((s) => s.updateChecklistItem);
  const t = useT();
  const [photoTarget, setPhotoTarget] = useState<string | null>(null);

  if (!ins) return <NotFound />;
  if (!user) return null;

  const completedItems = ins.checklist.filter((c) => c.outcome !== null).length;
  const totalItems = ins.checklist.length;
  const violationItemsPending = ins.checklist.filter((c) => c.outcome === 'violation' && !ins.violations.find((v) => v.checklistItemId === c.id));
  const canReview = completedItems === totalItems && violationItemsPending.length === 0;

  return (
    <TammScreen
      title={t('m.wiz.checklistTitle')}
      tabBar={false}
      leading="back"
      trailing={
        <div className="text-end">
          <div className="text-[10.5px] text-tamm-subtle tabular-nums">{t('m.wiz.progress', { done: completedItems, total: totalItems })}</div>
          <div className="h-1.5 w-16 rounded-full bg-tamm-line mt-1 overflow-hidden">
            <div className="h-full bg-tamm-brand transition-all" style={{ width: `${(completedItems / totalItems) * 100}%` }} />
          </div>
        </div>
      }
    >
      <div className="px-5 pt-1 text-[12px] text-tamm-subtle truncate">{ins.inspectionNumber} · {ins.buildingName}</div>

      {/* Section 1: Header */}
      <TammCard title={t('m.wiz.section1')}>
        <KV label={t('m.wiz.inspectionNumber')} value={ins.inspectionNumber} />
        <KV label={t('m.building.uid')} value={ins.buildingUid} />
        <KV label={t('m.me.adId')} value={`${ins.inspectorName} · ${ins.inspectorId}`} />
        <KV label={t('m.home.eta')} value={formatDateTime(ins.checkInAt)} />
        <KV label={t('m.wiz.gpsDistance')} value={`${ins.geofenceDistanceMeters} m${ins.geofenceOverride ? ' · ' + t('m.wiz.gpsOverride') : ''}`} />
        <KV label={t('m.building.type')} value={ins.type.replace(/_/g, ' ')} />
      </TammCard>

      {/* Section 2: Pre-inspection verification */}
      <TammCard title={t('m.wiz.section2')}>
        <YesNo
          t={t}
          label={t('m.wiz.respPartyPresent')}
          value={ins.responsibleParty.length > 0}
          onYes={() => updateDraft(ins.id, { responsibleParty: [{ role: 'Facility Management', name: 'On-site contact', mobile: '+971 ...' }] })}
          onNo={() => updateDraft(ins.id, { responsibleParty: [] })}
        />
        <YesNo t={t} label={t('m.wiz.amcVisible')} value={ins.amcVisible} onYes={() => updateDraft(ins.id, { amcVisible: true })} onNo={() => updateDraft(ins.id, { amcVisible: false })} />
        <YesNo t={t} label={t('m.wiz.nocVisible')} value={ins.nocVisible} onYes={() => updateDraft(ins.id, { nocVisible: true })} onNo={() => updateDraft(ins.id, { nocVisible: false })} />
        <YesNo t={t} label={t('m.wiz.briefingGiven')} value={ins.briefingGiven} onYes={() => updateDraft(ins.id, { briefingGiven: true })} onNo={() => updateDraft(ins.id, { briefingGiven: false })} />
      </TammCard>

      {/* Section 3: Compliance checklist items */}
      <TammCard title={`${t('m.wiz.section3')} (${completedItems}/${totalItems})`}>
        <div className="space-y-2">
          {ins.checklist.map((c, idx) => (
            <ChecklistRow
              key={c.id}
              item={c}
              idx={idx + 1}
              onChange={(patch) => updateItem(ins.id, c.id, patch)}
              onPhoto={() => setPhotoTarget(c.id)}
              onOpenViolation={() => navigate(`/mobile/inspection/${ins.id}/violation/${c.id}`)}
              violationExists={!!ins.violations.find((v) => v.checklistItemId === c.id)}
              t={t}
            />
          ))}
        </div>
      </TammCard>

      {/* Section 4: open prior findings */}
      {ins.openWarningsAtCheckin + ins.openViolationsAtCheckin > 0 && (
        <TammCard title={t('m.wiz.section4')}>
          <div className="rounded-xl bg-tamm-infoSoft text-tamm-info text-[11.5px] p-3">
            {t('m.wiz.priorNote', { n: ins.openViolationsAtCheckin + ins.openWarningsAtCheckin })}
          </div>
        </TammCard>
      )}

      {/* Section 5: General observations */}
      <TammCard title={t('m.wiz.section5')}>
        <div className="space-y-2">
          <textarea
            rows={3}
            value={ins.generalObservations ?? ''}
            onChange={(e) => updateDraft(ins.id, { generalObservations: e.target.value })}
            placeholder={t('m.wiz.observationsPlaceholder')}
            className="w-full p-2.5 bg-tamm-field rounded-xl text-[12.5px] text-tamm-ink ring-1 ring-tamm-line focus:outline-none focus:bg-tamm-surface focus:ring-2 focus:ring-tamm-brand/30 placeholder:text-tamm-subtle"
          />
          <textarea
            rows={2}
            value={ins.recommendations ?? ''}
            onChange={(e) => updateDraft(ins.id, { recommendations: e.target.value })}
            placeholder={t('m.wiz.recommendationsPlaceholder')}
            className="w-full p-2.5 bg-tamm-field rounded-xl text-[12.5px] text-tamm-ink ring-1 ring-tamm-line focus:outline-none focus:bg-tamm-surface focus:ring-2 focus:ring-tamm-brand/30 placeholder:text-tamm-subtle"
          />
          <textarea
            rows={2}
            value={ins.internalNotes ?? ''}
            onChange={(e) => updateDraft(ins.id, { internalNotes: e.target.value })}
            placeholder={t('m.wiz.internalNotesPlaceholder')}
            className="w-full p-2.5 bg-tamm-field rounded-xl text-[12.5px] text-tamm-ink ring-1 ring-tamm-line focus:outline-none focus:bg-tamm-surface focus:ring-2 focus:ring-tamm-brand/30 placeholder:text-tamm-subtle"
          />
        </div>
      </TammCard>

      <div className="h-24" />

      {/* Footer review CTA — sticky bottom */}
      <div className="sticky bottom-0 z-30 bg-tamm-surface border-t border-tamm-line px-5 py-2.5 flex gap-3 items-center">
        <div className="flex-1 text-[11px] text-tamm-subtle">
          {violationItemsPending.length > 0 ? (
            <span className="text-tamm-brand font-semibold">{t('m.wiz.violationsPending', { n: violationItemsPending.length })}</span>
          ) : completedItems < totalItems ? (
            <span>{t('m.wiz.itemsRemaining', { n: totalItems - completedItems })}</span>
          ) : (
            <span className="text-tamm-green font-semibold">{t('m.wiz.allComplete')}</span>
          )}
        </div>
        <TammButton size="md" onClick={() => navigate(`/mobile/inspection/${ins.id}/review`)} disabled={!canReview}>
          {t('m.wiz.reviewSignOff')}
        </TammButton>
      </div>

      {/* Photo capture modal */}
      <PhotoCapture
        open={!!photoTarget}
        buildingName={ins.buildingName}
        buildingCoords={ins.buildingCoords}
        defaultCaption={
          (photoTarget && ins.checklist.find((c) => c.id === photoTarget)?.description) || ''
        }
        onClose={() => setPhotoTarget(null)}
        onCapture={(photo) => {
          if (!photoTarget) return;
          const item = ins.checklist.find((c) => c.id === photoTarget);
          if (!item) return;
          updateItem(ins.id, photoTarget, { photos: [...item.photos, photo] });
        }}
      />
    </TammScreen>
  );
}

interface ChecklistRowProps {
  item: ChecklistItem;
  idx: number;
  onChange: (patch: Partial<ChecklistItem>) => void;
  onPhoto: () => void;
  onOpenViolation: () => void;
  violationExists: boolean;
  t: (k: any, p?: any) => string;
}
function ChecklistRow({ item, idx, onChange, onPhoto, onOpenViolation, violationExists, t }: ChecklistRowProps) {
  const needsObs = item.outcome === 'warning' || item.outcome === 'violation';
  const needsPhoto = needsObs;
  const outcomeLabel: Record<ChecklistOutcome, string> = {
    compliant: t('m.wiz.compliant'),
    warning:   t('m.wiz.warning'),
    violation: t('m.wiz.violation'),
    na:        t('m.wiz.na'),
  };
  const severityLabel: Record<Severity, string> = {
    minor:    t('m.wiz.minor'),
    major:    t('m.wiz.major'),
    critical: t('m.wiz.critical'),
  };
  return (
    <div className={cn(
      'rounded-[14px] border bg-tamm-surface p-3 space-y-2.5',
      item.outcome === 'violation' ? 'border-tamm-brand' :
      item.outcome === 'warning'   ? 'border-tamm-amber' :
                                     'border-tamm-line',
    )}>
      <div className="flex items-start gap-2.5">
        <div className="w-6 h-6 rounded-md bg-tamm-field text-tamm-ink grid place-items-center text-[10px] font-bold shrink-0 mt-0.5 tabular-nums">
          {idx}
        </div>
        <div className="flex-1">
          <div className="text-[12.5px] font-semibold text-tamm-ink">{item.description}</div>
          {item.referenceClause && <div className="text-[10px] text-tamm-subtle mt-0.5 font-mono">{item.referenceClause}</div>}
        </div>
      </div>

      {/* Outcome chips */}
      <div className="grid grid-cols-4 gap-1.5">
        {(['compliant', 'warning', 'violation', 'na'] as ChecklistOutcome[]).map((o) => {
          const active = item.outcome === o;
          return (
            <button
              key={o}
              onClick={() => onChange({ outcome: o, ...(o === 'compliant' || o === 'na' ? { severity: undefined } : {}) })}
              className={cn(
                'h-12 rounded-[12px] text-[10.5px] font-bold transition border-2 px-1 flex flex-col items-center justify-center gap-0.5 active:scale-[0.97]',
                active ? outcomeButtonActive(o) : 'bg-tamm-surface border-tamm-line text-tamm-subtle',
              )}
            >
              <OutcomeGlyph outcome={o} active={active} />
              <span className="text-[10px] leading-none truncate w-full text-center">{outcomeLabel[o]}</span>
            </button>
          );
        })}
      </div>

      {needsObs && (
        <>
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[10.5px] uppercase tracking-[0.12em] text-tamm-subtle font-semibold">{t('m.wiz.severity')}</span>
            {(['minor', 'major', 'critical'] as Severity[]).map((s) => (
              <button
                key={s}
                onClick={() => onChange({ severity: s })}
                className={cn(
                  'px-2.5 h-7 rounded-full text-[10.5px] font-semibold transition',
                  item.severity === s ? severityActive(s) : 'bg-tamm-field text-tamm-subtle',
                )}
              >{severityLabel[s]}</button>
            ))}
          </div>
          <textarea
            rows={2}
            value={item.observations ?? ''}
            onChange={(e) => onChange({ observations: e.target.value })}
            placeholder={t('m.wiz.observationsPlaceholder')}
            className="w-full p-2 bg-tamm-field rounded-xl text-[12px] text-tamm-ink ring-1 ring-tamm-line focus:outline-none focus:bg-tamm-surface focus:ring-2 focus:ring-tamm-brand/30 placeholder:text-tamm-subtle"
          />
        </>
      )}

      {(needsPhoto || item.photos.length > 0) && (
        <div className="flex items-center gap-2 flex-wrap">
          {item.photos.map((p) => (
            <PhotoThumb
              key={p.id}
              photo={p}
              onRemove={() => onChange({ photos: item.photos.filter((x) => x.id !== p.id) })}
            />
          ))}
          <button
            onClick={onPhoto}
            className="w-16 h-16 rounded-lg border-2 border-dashed border-tamm-line grid place-items-center text-tamm-subtle"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
          </button>
        </div>
      )}

      {item.outcome === 'violation' && (
        <button
          onClick={onOpenViolation}
          className={cn(
            'w-full h-9 rounded-lg text-[11.5px] font-semibold transition',
            violationExists ? 'bg-tamm-greenSoft text-tamm-green' : 'bg-tamm-brand text-white',
          )}
        >
          {violationExists ? `✓ ${t('m.common.edit')}` : `${t('m.wiz.violation')} →`}
        </button>
      )}
    </div>
  );
}

// =============================================================================
// ViolationFormStep
// =============================================================================
function ViolationFormStep() {
  const { id, itemId } = useParams();
  const navigate = useNavigate();
  const user = useAuth((s) => s.user);
  const ins = useInspections((s) => s.getById(id ?? ''));
  const upsertVio = useInspections((s) => s.upsertViolation);
  const allIns = useInspections((s) => s.inspections);
  const t = useT();

  const item = ins?.checklist.find((c) => c.id === itemId);
  const existing = ins?.violations.find((v) => v.checklistItemId === itemId);

  const [category, setCategory] = useState(existing?.category ?? VIOLATION_CATEGORIES[0]);
  const [severity, setSeverity] = useState<Severity>(existing?.severity ?? item?.severity ?? 'major');
  const [description, setDescription] = useState(existing?.description ?? item?.observations ?? '');
  const [photos, setPhotos] = useState<InspectionPhoto[]>(existing?.photos ?? item?.photos ?? []);
  const [witnessStatement, setWitnessStatement] = useState(existing?.witnessStatement ?? '');
  const [witnessName, setWitnessName] = useState(existing?.witnessName ?? '');
  const [disposition, setDisposition] = useState<InspectionViolation['disposition']>(existing?.disposition ?? 'warning_letter');
  const [photoOpen, setPhotoOpen] = useState(false);

  if (!ins || !item || !user) return <NotFound />;

  const repeatCount = allIns.filter(
    (i) => i.buildingId === ins.buildingId && i.id !== ins.id &&
      i.violations.some((v) => v.category === category),
  ).length;

  const save = () => {
    const vio: InspectionViolation = {
      id: existing?.id ?? nanoid(8),
      checklistItemId: item.id,
      violationNumber: existing?.violationNumber,
      category,
      severity,
      description,
      photos,
      witnessStatement: witnessStatement || undefined,
      witnessName: witnessName || undefined,
      disposition,
      repeatOffenceCount: repeatCount || undefined,
    };
    upsertVio(ins.id, vio);
    navigate(`/mobile/inspection/${ins.id}/checklist`);
  };

  const severityLabel: Record<Severity, string> = {
    minor:    t('m.wiz.minor'),
    major:    t('m.wiz.major'),
    critical: t('m.wiz.critical'),
  };

  return (
    <TammScreen title={t('m.vio.title')} tabBar={false} leading="back">
      <div className="px-5 pt-1 text-[12px] text-tamm-subtle truncate">{ins.buildingName}</div>

      <div className="mx-5 mt-3 rounded-[14px] bg-tamm-brandSoft text-tamm-brand text-[11.5px] p-3 ring-1 ring-tamm-brand/20">
        {t('m.vio.registerNote')}
      </div>

      <TammCard title={t('m.vio.linkedItem')}>
        <div className="rounded-xl bg-tamm-field p-2.5 text-[12px] text-tamm-ink">{item.description}</div>
        {item.referenceClause && <div className="text-[10px] font-mono text-tamm-subtle mt-1">{item.referenceClause}</div>}
      </TammCard>

      <TammCard title={t('m.vio.category')}>
        <div className="text-[10.5px] text-tamm-subtle mb-2">{t('m.vio.categorySub')}</div>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="w-full h-11 px-3 bg-tamm-field rounded-xl text-[12.5px] text-tamm-ink ring-1 ring-tamm-line focus:outline-none focus:bg-tamm-surface focus:ring-2 focus:ring-tamm-brand/30"
        >
          {VIOLATION_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        {repeatCount > 0 && (
          <div className="rounded-lg bg-tamm-amberSoft text-tamm-amber text-[11px] font-semibold p-2 mt-2">
            {t('m.vio.repeatNote', { n: repeatCount + 1, suffix: ordinal(repeatCount + 1) })}
          </div>
        )}
      </TammCard>

      <TammCard title={t('m.wiz.severity')}>
        <div className="grid grid-cols-3 gap-1.5">
          {(['minor', 'major', 'critical'] as Severity[]).map((s) => (
            <button
              key={s}
              onClick={() => setSeverity(s)}
              className={cn(
                'h-11 rounded-lg text-[12px] font-bold transition',
                severity === s ? severityActive(s) : 'bg-tamm-field text-tamm-subtle ring-1 ring-tamm-line',
              )}
            >{severityLabel[s]}</button>
          ))}
        </div>
        {severity === 'critical' && (
          <div className="text-[11px] text-tamm-brand bg-tamm-brandSoft p-2 rounded-lg mt-2">
            {t('m.vio.criticalNote')}
          </div>
        )}
      </TammCard>

      <TammCard title={t('m.vio.description')}>
        <textarea
          rows={3}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder={t('m.vio.descriptionPlaceholder')}
          className="w-full p-2.5 bg-tamm-field rounded-xl text-[12.5px] text-tamm-ink ring-1 ring-tamm-line focus:outline-none focus:bg-tamm-surface focus:ring-2 focus:ring-tamm-brand/30 placeholder:text-tamm-subtle"
        />
      </TammCard>

      <TammCard title={t('m.vio.photos')}>
        <div className="text-[10.5px] text-tamm-subtle mb-2">{t('m.vio.photosRequired')}</div>
        <div className="flex items-center gap-2 flex-wrap">
          {photos.map((p) => (
            <PhotoThumb key={p.id} photo={p} onRemove={() => setPhotos(photos.filter((x) => x.id !== p.id))} />
          ))}
          <button
            onClick={() => setPhotoOpen(true)}
            className="w-16 h-16 rounded-lg border-2 border-dashed border-tamm-line grid place-items-center text-tamm-subtle"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
          </button>
        </div>
      </TammCard>

      <TammCard title={t('m.vio.witness')}>
        <div className="text-[10.5px] text-tamm-subtle mb-2">{t('m.vio.witnessOptional')}</div>
        <input
          value={witnessName}
          onChange={(e) => setWitnessName(e.target.value)}
          placeholder={t('m.vio.witnessNamePlaceholder')}
          className="w-full h-10 px-3 mb-2 bg-tamm-field rounded-xl text-[12.5px] text-tamm-ink ring-1 ring-tamm-line focus:outline-none focus:bg-tamm-surface focus:ring-2 focus:ring-tamm-brand/30 placeholder:text-tamm-subtle"
        />
        <textarea
          rows={2}
          value={witnessStatement}
          onChange={(e) => setWitnessStatement(e.target.value)}
          placeholder={t('m.vio.witnessStatementPlaceholder')}
          className="w-full p-2.5 bg-tamm-field rounded-xl text-[12.5px] text-tamm-ink ring-1 ring-tamm-line focus:outline-none focus:bg-tamm-surface focus:ring-2 focus:ring-tamm-brand/30 placeholder:text-tamm-subtle"
        />
      </TammCard>

      <TammCard title={t('m.vio.disposition')}>
        <div className="space-y-1.5">
          {([
            ['warning_letter',       t('m.vio.disp.warning')],
            ['admin_fine',           t('m.vio.disp.fine')],
            ['operations_cessation', t('m.vio.disp.cessation')],
            ['refer_vap',            t('m.vio.disp.vap')],
          ] as const).map(([k, label]) => (
            <button
              key={k}
              onClick={() => setDisposition(k)}
              className={cn(
                'w-full text-start rounded-xl p-2.5 ring-1 transition flex items-center gap-2',
                disposition === k ? 'ring-tamm-brand bg-tamm-brandSoft' : 'ring-tamm-line bg-tamm-field',
              )}
            >
              <span className={cn(
                'w-4 h-4 rounded-full border-2 shrink-0',
                disposition === k ? 'border-tamm-brand bg-tamm-brand' : 'border-tamm-line',
              )} />
              <span className="text-[12.5px] font-semibold text-tamm-ink">{label}</span>
            </button>
          ))}
        </div>
      </TammCard>

      <div className="h-24" />

      <div className="sticky bottom-0 z-30 bg-tamm-surface border-t border-tamm-line px-5 py-2.5 flex gap-2">
        <TammButton variant="secondary" onClick={() => navigate(`/mobile/inspection/${ins.id}/checklist`)}>{t('m.common.cancel')}</TammButton>
        <TammButton block onClick={save} disabled={!description.trim() || photos.length === 0}>
          {t('m.vio.save')}
        </TammButton>
      </div>

      <PhotoCapture
        open={photoOpen}
        buildingName={ins.buildingName}
        buildingCoords={ins.buildingCoords}
        defaultCaption={`Violation evidence · ${category}`}
        onClose={() => setPhotoOpen(false)}
        onCapture={(p) => setPhotos((arr) => [...arr, p])}
      />
    </TammScreen>
  );
}

// =============================================================================
// ReviewSubmitStep — overall outcome + sign-off + retain vs escalate
// =============================================================================
function ReviewSubmitStep() {
  const { id } = useParams();
  const navigate = useNavigate();
  const user = useAuth((s) => s.user);
  const ins = useInspections((s) => s.getById(id ?? ''));
  const submit = useInspections((s) => s.submit);
  const t = useT();

  const [route, setRoute] = useState<'retain' | 'escalate' | null>(null);
  const [note, setNote] = useState('');
  const [signed, setSigned] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  if (!ins || !user) return <NotFound />;

  const hasViolation = ins.violations.length > 0;
  const hasCritical = ins.violations.some((v) => v.severity === 'critical');
  const computedOutcome: 'compliant' | 'compliant_with_warnings' | 'non_compliant' =
    hasViolation ? 'non_compliant' :
    ins.checklist.some((c) => c.outcome === 'warning') ? 'compliant_with_warnings' :
    'compliant';

  const handleSubmit = () => {
    if (!route) return;
    setSubmitting(true);
    setSubmitError(null);
    const res = submit(ins.id, route, { id: user.id, name: user.name, role: user.role }, note || undefined);
    setSubmitting(false);
    if (!res.ok) {
      setSubmitError(res.error ?? t('m.wiz.submitFailed'));
      return;
    }
    navigate(`/mobile/inspection/${ins.id}/done?route=${route}`);
  };

  const outcomeLabel: Record<string, string> = {
    compliant: t('m.wiz.compliant'),
    compliant_with_warnings: `${t('m.wiz.compliant')} · ${t('m.wiz.warning')}`,
    non_compliant: t('m.wiz.violation'),
  };

  const outcomeAccent =
    computedOutcome === 'non_compliant' ? '#E11D48' :
    computedOutcome === 'compliant_with_warnings' ? '#D97706' :
                                                    '#10B981';
  const outcomeGlowR =
    computedOutcome === 'non_compliant' ? 'rgba(225,29,72,0.32)' :
    computedOutcome === 'compliant_with_warnings' ? 'rgba(217,119,6,0.26)' :
                                                    'rgba(16,185,129,0.26)';

  return (
    <TammScreen title={t('m.wiz.reviewSignOff')} tabBar={false} leading="back">
      <div className="px-5 pt-1 text-[12px] text-tamm-subtle truncate">{ins.inspectionNumber}</div>

      {/* Dark outcome hero — matches Home + Building OS aesthetic. */}
      <div className="px-4 sm:px-6 mt-3">
        <div
          className="relative rounded-[20px] overflow-hidden text-white shadow-[0_18px_40px_-12px_rgba(11,14,18,0.40)]"
          style={{ backgroundImage: 'linear-gradient(155deg, #161B23 0%, #0B0E12 60%, #131822 100%)' }}
        >
          <div className="absolute -top-14 -end-14 w-52 h-52 rounded-full pointer-events-none" style={{ background: `radial-gradient(circle, ${outcomeGlowR}, transparent 70%)` }} />

          <div className="relative p-4">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-white/12 ring-1 ring-white/15 text-[9.5px] font-bold uppercase tracking-[0.14em]">
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: outcomeAccent }} />
                {t('m.ins.outcome')}
              </span>
              <span
                className="px-2 py-0.5 rounded-md text-white text-[9.5px] font-bold uppercase tracking-[0.14em]"
                style={{ background: outcomeAccent }}
              >
                {outcomeLabel[computedOutcome]}
              </span>
            </div>
            <div className="mt-3 text-[22px] font-bold leading-[1.1] tracking-[-0.018em]" style={{ fontFamily: 'var(--font-display)' }}>
              {outcomeLabel[computedOutcome]}
            </div>
            <div className="text-[11px] text-white/65 mt-1 truncate">{ins.buildingName} · {ins.buildingUid}</div>

            <div className="mt-3 grid grid-cols-4 rounded-xl bg-white/[0.06] ring-1 ring-white/10 overflow-hidden">
              <WizMini label={t('m.wiz.compliant')} value={ins.checklist.filter((c) => c.outcome === 'compliant').length} accent="#10B981" />
              <WizMini label={t('m.wiz.warning')}   value={ins.checklist.filter((c) => c.outcome === 'warning').length}   accent={ins.checklist.some((c) => c.outcome === 'warning') ? '#D97706' : undefined} />
              <WizMini label={t('m.wiz.violation')} value={ins.checklist.filter((c) => c.outcome === 'violation').length} accent={ins.violations.length > 0 ? '#E11D48' : undefined} />
              <WizMini label={t('m.wiz.na')}        value={ins.checklist.filter((c) => c.outcome === 'na').length} />
            </div>
          </div>
        </div>
        {hasCritical && (
          <div className="mt-2.5 rounded-xl bg-tamm-brand text-white text-[12px] font-semibold p-3 flex items-start gap-2">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 mt-0.5"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
            <span>{t('m.wiz.critical')} — Senior Inspector co-sign will be required before approval.</span>
          </div>
        )}
      </div>

      <TammCard title="Inspector sign-off">
        <button
          onClick={() => setSigned(!signed)}
          className={cn(
            'w-full rounded-[14px] p-3 text-start transition ring-1',
            signed ? 'bg-tamm-infoSoft ring-tamm-info' : 'bg-tamm-field ring-tamm-line',
          )}
        >
          <div className="flex items-center gap-2.5">
            <div className={cn(
              'w-10 h-10 rounded-lg grid place-items-center shrink-0',
              signed ? 'bg-tamm-info text-white' : 'bg-tamm-surface text-tamm-subtle',
            )}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 12s3-8 9-8 9 8 9 8-3 8-9 8-9-8-9-8z"/><circle cx="12" cy="12" r="3"/>
              </svg>
            </div>
            <div>
              <div className="text-[12.5px] font-bold text-tamm-ink">
                {signed ? t('m.wiz.signoffPromptOn') : t('m.wiz.signoffPromptOff')}
              </div>
              <div className="text-[10.5px] text-tamm-subtle">{user.name} · {user.id}</div>
            </div>
          </div>
        </button>
      </TammCard>

      <TammCard title={t('m.ins.workflow')}>
        <button
          onClick={() => setRoute('retain')}
          disabled={hasCritical || ins.violations.length > 0}
          className={cn(
            'w-full rounded-[14px] p-3 mb-2 text-start ring-1 transition',
            route === 'retain' ? 'ring-tamm-info bg-tamm-infoSoft' : 'ring-tamm-line bg-tamm-field',
            (hasCritical || ins.violations.length > 0) && 'opacity-40 cursor-not-allowed',
          )}
        >
          <div className="flex items-center gap-2">
            <div className="text-[13px] font-bold text-tamm-ink flex-1">{t('m.submit.retained')}</div>
            <span className="px-2 py-0.5 rounded-md bg-tamm-info text-white text-[9px] font-bold uppercase tracking-wider">Team</span>
          </div>
          <div className="text-[11px] text-tamm-subtle mt-1 leading-snug">
            {t('m.wiz.routeRetainSub')}
          </div>
        </button>
        <button
          onClick={() => setRoute('escalate')}
          className={cn(
            'w-full rounded-[14px] p-3 text-start ring-1 transition',
            route === 'escalate' ? 'ring-tamm-brand bg-tamm-brandSoft' : 'ring-tamm-line bg-tamm-field',
          )}
        >
          <div className="flex items-center gap-2">
            <div className="text-[13px] font-bold text-tamm-ink flex-1">{t('m.submit.escalated')}</div>
            <span className="px-2 py-0.5 rounded-md bg-tamm-brand text-white text-[9px] font-bold uppercase tracking-wider">VAP</span>
          </div>
          <div className="text-[11px] text-tamm-subtle mt-1 leading-snug">
            {t('m.wiz.routeEscalateSub')}
            {hasCritical && <span className="block mt-0.5 text-tamm-brand font-semibold">{t('m.wiz.routeAlertNote')}</span>}
          </div>
        </button>
      </TammCard>

      <TammCard title={t('m.common.optional')}>
        <textarea
          rows={2}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder={t('m.wiz.notePlaceholder')}
          className="w-full p-2.5 bg-tamm-field rounded-xl text-[12.5px] text-tamm-ink ring-1 ring-tamm-line focus:outline-none focus:bg-tamm-surface focus:ring-2 focus:ring-tamm-brand/30 placeholder:text-tamm-subtle"
        />
      </TammCard>

      {submitError && (
        <div className="px-5 py-2 mt-3 mx-5 rounded-xl bg-tamm-brandSoft text-tamm-brand text-[12px] font-semibold">{submitError}</div>
      )}

      <div className="h-24" />

      <div className="sticky bottom-0 z-30 bg-tamm-surface border-t border-tamm-line px-5 py-2.5">
        <TammButton
          block
          size="lg"
          disabled={!route || !signed || submitting}
          onClick={handleSubmit}
        >
          {submitting ? '…' :
            route === 'escalate' ? `${t('m.common.confirm')} · ${t('m.submit.escalated')}` :
            route === 'retain'   ? `${t('m.common.confirm')} · ${t('m.submit.retained')}` :
                                   t('m.common.confirm')}
        </TammButton>
      </div>
    </TammScreen>
  );
}

function Stat({ n, l }: { n: number; l: string }) {
  return (
    <div className="rounded-lg bg-white/15 ring-1 ring-white/15 py-1.5">
      <div className="text-[18px] font-bold leading-none tabular-nums" style={{ fontFamily: 'var(--font-display)' }}>{n}</div>
      <div className="text-[9px] font-bold uppercase tracking-[0.12em] mt-1 opacity-80 truncate px-1">{l}</div>
    </div>
  );
}

// =============================================================================
// Small helpers
// =============================================================================

function KV({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-2 py-1.5 border-b border-tamm-line last:border-0">
      <div className="text-[11px] text-tamm-subtle uppercase tracking-[0.1em]">{label}</div>
      <div className="text-[12px] text-tamm-ink font-semibold text-end truncate max-w-[60%]">{value}</div>
    </div>
  );
}

function YesNo({
  label, value, onYes, onNo, t,
}: {
  label: string;
  value: boolean | null;
  onYes: () => void;
  onNo: () => void;
  t?: (k: any, p?: any) => string;
}) {
  const yes = t ? t('m.common.yes') : 'Yes';
  const no  = t ? t('m.common.no')  : 'No';
  return (
    <div className="flex items-center justify-between gap-2 py-2 border-b border-tamm-line last:border-0">
      <div className="text-[12px] text-tamm-ink flex-1">{label}</div>
      <div className="flex items-center gap-1">
        <button
          onClick={onYes}
          className={cn('h-8 w-12 rounded-lg text-[11.5px] font-semibold',
            value === true ? 'bg-tamm-green text-white' : 'bg-tamm-field text-tamm-subtle')}
        >{yes}</button>
        <button
          onClick={onNo}
          className={cn('h-8 w-12 rounded-lg text-[11.5px] font-semibold',
            value === false ? 'bg-tamm-brand text-white' : 'bg-tamm-field text-tamm-subtle')}
        >{no}</button>
      </div>
    </div>
  );
}

function outcomeButtonActive(o: ChecklistOutcome): string {
  switch (o) {
    case 'compliant': return 'bg-tamm-green text-white border-tamm-green shadow-[0_4px_12px_rgba(45,110,74,0.25)]';
    case 'warning':   return 'bg-tamm-amber text-white border-tamm-amber shadow-[0_4px_12px_rgba(184,119,27,0.25)]';
    case 'violation': return 'bg-tamm-brand text-white border-tamm-brand shadow-[0_4px_12px_rgba(168,39,62,0.25)]';
    case 'na':        return 'bg-tamm-ink text-white border-tamm-ink';
  }
}

function OutcomeGlyph({ outcome, active }: { outcome: ChecklistOutcome; active: boolean }) {
  const colorTone: Record<ChecklistOutcome, string> = {
    compliant: 'text-tamm-green',
    warning:   'text-tamm-amber',
    violation: 'text-tamm-brand',
    na:        'text-tamm-subtle',
  };
  const cls = active ? 'text-white' : colorTone[outcome];
  if (outcome === 'compliant') return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className={cls}><polyline points="20 6 9 17 4 12"/></svg>
  );
  if (outcome === 'warning') return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className={cls}><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/></svg>
  );
  if (outcome === 'violation') return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className={cls}><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
  );
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" className={cls}><line x1="5" y1="12" x2="19" y2="12"/></svg>
  );
}

function severityActive(s: Severity): string {
  switch (s) {
    case 'minor':    return 'bg-tamm-amberSoft text-tamm-amber';
    case 'major':    return 'bg-tamm-tint text-white';
    case 'critical': return 'bg-tamm-brand text-white';
  }
}

function ordinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return s[(v - 20) % 10] || s[v] || s[0];
}

function NotFound() {
  return (
    <TammScreen title="Not found" tabBar={false} leading="back">
      <div className="p-6 text-center text-tamm-subtle text-[13px]">This inspection record was not found.</div>
    </TammScreen>
  );
}
