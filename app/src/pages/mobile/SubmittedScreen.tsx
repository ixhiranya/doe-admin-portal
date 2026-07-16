import { useParams, useSearchParams, useNavigate, Link } from 'react-router-dom';
import { useInspections } from '../../store/inspections';
import { useT } from '../../i18n';
import { TammScreen, TammBadge, TammButton } from '../../components/mobile/Tamm';
import { formatDateTime } from '../../lib/utils';
import { cn } from '../../lib/utils';

// ============================================================================
// SubmittedScreen (TAMM redesign) — confirmation shown after Submit.
// Outcome-coloured hero, body bullets, refs, summary, and CTAs.
// ============================================================================

export function SubmittedScreen() {
  const { id } = useParams();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const route = params.get('route') ?? 'retain';
  const ins = useInspections((s) => s.getById(id ?? ''));
  const t = useT();

  if (!ins) {
    return (
      <TammScreen tabBar={false}>
        <div className="p-6 text-center text-tamm-subtle text-[13px]">{t('common.noResults')}</div>
      </TammScreen>
    );
  }

  const escalated = route === 'escalate';
  const headlineKey = escalated ? 'm.done.escalated.title' : 'm.done.retained.title';

  return (
    <TammScreen tabBar={false}>
      {/* Hero — outcome coloured */}
      <div className={cn(
        'mx-5 mt-1 rounded-[20px] overflow-hidden relative text-white',
        escalated ? 'bg-tamm-brand' : 'bg-tamm-green',
      )} style={{
        backgroundImage: escalated
          ? 'linear-gradient(135deg, #6E1A2C 0%, #A8273E 100%)'
          : 'linear-gradient(135deg, #1F4F35 0%, #2D6E4A 100%)',
      }}>
        <div className="absolute -top-10 -end-10 w-32 h-32 rounded-full" style={{ background: 'radial-gradient(circle, rgba(255,255,255,0.22), transparent 70%)' }} />
        <div className="relative px-6 pt-7 pb-6 text-center">
          <div className="w-16 h-16 mx-auto rounded-full bg-white/20 grid place-items-center mb-3 ring-2 ring-white/30">
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
          </div>
          <div className="text-[22px] font-bold tracking-[-0.018em]" style={{ fontFamily: 'var(--font-display)' }}>{t(headlineKey)}</div>
          <div className="text-[12px] text-white/85 mt-1">
            {ins.inspectionNumber} · {formatDateTime(ins.endAt ?? ins.updatedAt)}
          </div>
        </div>
      </div>

      <div className="px-5 py-4 space-y-3">
        {escalated ? (
          <div className="rounded-[18px] bg-tamm-brandSoft ring-1 ring-tamm-brand/20 p-3">
            <ul className="text-[12px] text-tamm-ink space-y-1.5 list-disc ps-4">
              <li>{t('m.done.escalated.body1', { n: ins.violations.length })}</li>
              <li>{t('m.done.escalated.body2')}</li>
              {ins.violations.some((v) => v.severity === 'critical') && (
                <li className="font-semibold text-tamm-brand">{t('m.wiz.routeAlertNote')}</li>
              )}
              <li>{t('m.done.escalated.body3')}</li>
            </ul>
          </div>
        ) : (
          <div className="rounded-[18px] bg-tamm-infoSoft ring-1 ring-tamm-info/20 p-3">
            <ul className="text-[12px] text-tamm-ink space-y-1.5 list-disc ps-4">
              <li>{t('m.done.retained.body1')}</li>
              <li>{t('m.done.retained.body2', { date: ins.followUpDueAt?.slice(0, 10) ?? '—' })}</li>
              <li>{t('m.done.retained.body3')}</li>
            </ul>
          </div>
        )}

        {ins.linkedViolationIds && ins.linkedViolationIds.length > 0 && (
          <div className="rounded-[18px] bg-tamm-field ring-1 ring-tamm-line p-3">
            <div className="text-[10.5px] uppercase tracking-[0.14em] text-tamm-subtle font-semibold">{t('m.done.violationRefs')}</div>
            <div className="flex flex-wrap gap-1.5 mt-1.5">
              {ins.linkedViolationIds.map((vn) => (
                <span key={vn} className="px-2 py-0.5 rounded-md bg-tamm-surface border border-tamm-line font-mono text-[11px] text-tamm-ink">{vn}</span>
              ))}
            </div>
          </div>
        )}

        <div className="rounded-[18px] bg-tamm-surface ring-1 ring-tamm-line p-3 shadow-[0_1px_2px_rgba(50,32,8,0.04)]">
          <div className="text-[10.5px] uppercase tracking-[0.14em] text-tamm-subtle font-semibold">{t('m.done.summary')}</div>
          <div className="text-[14px] font-bold text-tamm-ink mt-0.5">{ins.buildingName}</div>
          <div className="text-[11px] text-tamm-subtle">{ins.buildingUid} · {ins.buildingAddress}</div>
          <div className="mt-2 flex items-center gap-1.5 flex-wrap">
            <TammBadge tone={escalated ? 'red' : 'blue'} size="md">{ins.status.replace(/_/g, ' ')}</TammBadge>
            {ins.overallOutcome && (
              <TammBadge tone={
                ins.overallOutcome.result === 'non_compliant' ? 'red' :
                ins.overallOutcome.result === 'compliant_with_warnings' ? 'amber' :
                'green'
              }>
                {ins.overallOutcome.result.replace(/_/g, ' ')}
              </TammBadge>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 mt-2">
          <TammButton variant="secondary" onClick={() => navigate('/mobile/home')}>{t('m.submit.backToHome')}</TammButton>
          <TammButton onClick={() => navigate(`/mobile/inspection/${ins.id}`)}>{t('m.submit.viewDetail')}</TammButton>
        </div>

        <div className="text-center text-[10.5px] text-tamm-subtle pt-1">
          {t('m.done.viewWeb')}{' '}
          <Link to="/inspections" className="text-tamm-brand font-semibold underline">/inspections</Link>.
        </div>
      </div>
    </TammScreen>
  );
}
