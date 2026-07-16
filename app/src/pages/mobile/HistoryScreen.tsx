import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useInspections } from '../../store/inspections';
import { useAuth } from '../../store/auth';
import { useLocale } from '../../store/locale';
import { useT } from '../../i18n';
import { TammScreen, TammBadge } from '../../components/mobile/Tamm';
import { cn } from '../../lib/utils';

// ============================================================================
// HistoryScreen (TAMM redesign) — past inspections grouped by date bucket.
// Large title, KPI strip, scope segmented control, status filter chips,
// then date-bucketed list rendered as white cards on cream.
// ============================================================================

type Scope = 'mine' | 'all';
type StatusFilter = 'all' | 'approved' | 'in_review' | 'returned' | 'closed';

export function HistoryScreen() {
  const navigate = useNavigate();
  const user = useAuth((s) => s.user);
  const inspections = useInspections((s) => s.inspections);
  const t = useT();
  const locale = useLocale((s) => s.locale);

  const [scope, setScope] = useState<Scope>('mine');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

  const list = useMemo(() => {
    let xs = inspections.slice().sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    if (scope === 'mine' && user) xs = xs.filter((i) => i.inspectorId === user.id);
    if (statusFilter !== 'all') {
      if (statusFilter === 'in_review') {
        xs = xs.filter((i) => i.status === 'in_review' || i.status === 'escalated' || i.status === 'needs_cosign');
      } else {
        xs = xs.filter((i) => i.status === statusFilter);
      }
    }
    return xs;
  }, [inspections, scope, statusFilter, user]);

  const mineAll = useMemo(() => user ? inspections.filter((i) => i.inspectorId === user.id) : [], [inspections, user]);
  const approved = mineAll.filter((i) => i.status === 'approved').length;
  const escalated = mineAll.filter((i) => ['escalated', 'in_review', 'needs_cosign'].includes(i.status)).length;

  const groups = useMemo(() => groupByDate(list, locale), [list, locale]);

  return (
    <TammScreen
      title={t('m.history.title')}
      largeTitle
      leading="home"
    >
      {/* KPI strip */}
      <div className="px-5 mt-1 grid grid-cols-3 gap-2">
        <KpiPill value={mineAll.length} label={t('m.history.records', { n: '' }).trim() || 'Records'} tone="ink" />
        <KpiPill value={approved} label={t('m.wiz.compliant')} tone="green" />
        <KpiPill value={escalated} label={t('m.home.needsAction')} tone="orange" />
      </div>

      {/* Scope segmented */}
      <div className="px-5 mt-4">
        <div className="flex items-center gap-1 p-1 bg-tamm-field rounded-xl ring-1 ring-tamm-line">
          {([
            ['mine', t('m.history.mine')],
            ['all',  t('m.history.all')],
          ] as const).map(([k, label]) => {
            const active = scope === k;
            return (
              <button
                key={k}
                onClick={() => setScope(k)}
                className={cn(
                  'flex-1 h-8 rounded-lg text-[12px] font-semibold transition',
                  active ? 'bg-tamm-surface text-tamm-ink shadow-[0_1px_2px_rgba(50,32,8,0.08)]' : 'text-tamm-subtle',
                )}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Status chip filter — horizontal scroll */}
      <div className="mt-3 px-5">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
          {([
            ['all',       t('m.map.filterAll'),  'bg-tamm-ink text-white'],
            ['approved',  'Approved',             'bg-tamm-green text-white'],
            ['in_review', 'In review',            'bg-tamm-tint text-white'],
            ['returned',  'Returned',             'bg-tamm-amber text-white'],
            ['closed',    'Closed',               'bg-tamm-subtle text-white'],
          ] as const).map(([k, label, activeCls]) => (
            <button
              key={k}
              onClick={() => setStatusFilter(k)}
              className={cn(
                'shrink-0 h-8 px-3 rounded-full text-[11.5px] font-bold transition',
                statusFilter === k ? activeCls : 'bg-tamm-field text-tamm-subtle ring-1 ring-tamm-line',
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      {list.length === 0 ? (
        <div className="px-6 py-16 text-center">
          <div className="mx-auto w-14 h-14 rounded-[16px] bg-tamm-field grid place-items-center mb-3 text-tamm-subtle">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3v5h5"/><path d="M3.05 13A9 9 0 1 0 6 5.3L3 8"/><polyline points="12 7 12 12 15 14"/></svg>
          </div>
          <div className="text-[15px] font-bold text-tamm-ink">{t('m.history.empty')}</div>
          <div className="text-[12.5px] text-tamm-subtle mt-1 max-w-[260px] mx-auto">{t('m.history.emptyBody')}</div>
        </div>
      ) : (
        <div className="px-5 mt-4 space-y-5 pb-2">
          {groups.map((g) => (
            <div key={g.bucket}>
              <div className="px-1 mb-2 flex items-center justify-between">
                <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-tamm-subtle">{g.label}</div>
                <div className="text-[10.5px] text-tamm-subtle font-semibold">{g.items.length}</div>
              </div>
              <div className="rounded-[18px] bg-tamm-surface ring-1 ring-tamm-line shadow-[0_1px_2px_rgba(50,32,8,0.04),0_8px_20px_rgba(50,32,8,0.05)] overflow-hidden">
                {g.items.map((i, idx) => (
                  <motion.div
                    key={i.id}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.02 * idx }}
                  >
                    {idx > 0 && <div className="ms-[68px] h-px bg-tamm-line" />}
                    <button
                      onClick={() => navigate(`/mobile/inspection/${i.id}`)}
                      className="w-full flex items-center gap-3 px-4 py-3 text-start active:bg-tamm-field"
                    >
                      <span className={cn('w-10 h-10 rounded-[12px] grid place-items-center shrink-0', statusTileTone(i.status))}>
                        <StatusGlyph s={i.status} />
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="text-[13.5px] font-bold text-tamm-ink truncate">{i.buildingName}</div>
                        <div className="text-[11px] text-tamm-subtle truncate">{i.inspectionNumber} · {i.type.replace(/_/g, ' ')}</div>
                        <div className="mt-1 flex items-center gap-1 flex-wrap">
                          <TammBadge tone={statusToBadgeTone(i.status)}>{i.status.replace(/_/g, ' ')}</TammBadge>
                          {i.violations.length > 0 && <TammBadge tone="red">⚠ {i.violations.length}</TammBadge>}
                          {i.overallOutcome && (
                            <TammBadge tone={
                              i.overallOutcome.result === 'non_compliant' ? 'red' :
                              i.overallOutcome.result === 'compliant_with_warnings' ? 'amber' :
                              'green'
                            }>
                              {i.overallOutcome.result.replace(/_/g, ' ')}
                            </TammBadge>
                          )}
                        </div>
                      </div>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" className="text-tamm-line self-center rtl-mirror"><polyline points="9 6 15 12 9 18"/></svg>
                    </button>
                  </motion.div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
      <div className="h-4" />
    </TammScreen>
  );
}

// ============================================================================
function KpiPill({
  value, label, tone,
}: {
  value: number;
  label: string;
  tone: 'ink' | 'green' | 'orange';
}) {
  const tones = {
    ink:    'bg-tamm-surface text-tamm-ink',
    green:  'bg-tamm-greenSoft text-tamm-green',
    orange: 'bg-tamm-tintSoft text-tamm-tint',
  };
  return (
    <div className={cn(
      'rounded-[14px] p-3 text-center ring-1 ring-tamm-line shadow-[0_1px_2px_rgba(50,32,8,0.04)]',
      tones[tone],
    )}>
      <div className="text-[22px] font-bold leading-none tracking-tight tabular-nums" style={{ fontFamily: 'var(--font-display)' }}>{value}</div>
      <div className="text-[10px] font-semibold uppercase tracking-[0.12em] opacity-85 mt-1">{label}</div>
    </div>
  );
}

// ============================================================================
function groupByDate(items: any[], locale: string) {
  const now = new Date();
  const today = now.toISOString().slice(0, 10);
  const ydate = new Date(now); ydate.setDate(ydate.getDate() - 1);
  const yesterday = ydate.toISOString().slice(0, 10);

  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - ((now.getDay() + 6) % 7));
  const weekStartIso = weekStart.toISOString().slice(0, 10);

  const buckets: Record<string, { label: string; items: any[] }> = {
    today:     { label: locale === 'ar' ? 'اليوم'              : 'Today',              items: [] },
    yesterday: { label: locale === 'ar' ? 'أمس'                : 'Yesterday',          items: [] },
    week:      { label: locale === 'ar' ? 'سابقاً هذا الأسبوع' : 'Earlier this week',  items: [] },
    older:     { label: locale === 'ar' ? 'أقدم'               : 'Older',              items: [] },
  };
  items.forEach((it) => {
    const d = (it.endAt ?? it.updatedAt).slice(0, 10);
    if (d === today)            buckets.today.items.push(it);
    else if (d === yesterday)   buckets.yesterday.items.push(it);
    else if (d >= weekStartIso) buckets.week.items.push(it);
    else                        buckets.older.items.push(it);
  });
  return Object.entries(buckets)
    .filter(([, g]) => g.items.length > 0)
    .map(([bucket, g]) => ({ bucket, label: g.label, items: g.items }));
}

function statusTileTone(s: string): string {
  switch (s) {
    case 'approved': return 'bg-tamm-greenSoft text-tamm-green';
    case 'retained': return 'bg-tamm-infoSoft text-tamm-info';
    case 'escalated': case 'in_review': case 'needs_cosign': return 'bg-tamm-tintSoft text-tamm-tint';
    case 'returned': return 'bg-tamm-amberSoft text-tamm-amber';
    case 'closed':   return 'bg-tamm-field text-tamm-subtle';
    case 'draft':    return 'bg-tamm-brandSoft text-tamm-brand';
    default:         return 'bg-tamm-field text-tamm-subtle';
  }
}

function statusToBadgeTone(s: string): 'green' | 'red' | 'amber' | 'orange' | 'blue' | 'grey' {
  switch (s) {
    case 'approved': return 'green';
    case 'returned': return 'amber';
    case 'escalated': case 'in_review': case 'needs_cosign': return 'orange';
    case 'retained': return 'blue';
    case 'closed':   return 'grey';
    case 'draft':    return 'red';
    default:         return 'grey';
  }
}

function StatusGlyph({ s }: { s: string }) {
  const glyph = ({
    approved: '✓', retained: '↩', escalated: '↗', in_review: '◐',
    needs_cosign: '✎', returned: '↺', closed: '·', draft: '◇',
  } as Record<string, string>)[s] ?? '·';
  return <span className="text-[14px] font-bold">{glyph}</span>;
}
