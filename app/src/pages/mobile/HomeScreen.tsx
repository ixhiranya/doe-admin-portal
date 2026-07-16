import { useNavigate } from 'react-router-dom';
import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../store/auth';
import { useInspections } from '../../store/inspections';
import { useLocale } from '../../store/locale';
import { useT } from '../../i18n';
import { INSPECTABLE_BUILDINGS, INSPECTOR_PLAN_STOPS, haversineMeters } from '../../data/inspections';
import { TammScreen } from '../../components/mobile/Tamm';
import { cn, formatDateTime } from '../../lib/utils';

// ============================================================================
// HomeScreen — Inspector OS, take 2.
//
// Layout:
//   1. Top bar — avatar + bell with alert count.
//   2. Greeting (date + name).
//   3. MISSION DECK — the dark "MISSION · LIVE" card *itself* is horizontally
//      swipeable. Each card is one of today's planned stops, with all its
//      details (distance/ETA from current location, score, risk, action).
//   4. Alert center — prioritized white list card.
//   5. Quick actions grid.
//   6. Recent activity list.
// ============================================================================

export function HomeScreen() {
  const navigate = useNavigate();
  const user = useAuth((s) => s.user);
  const inspections = useInspections((s) => s.inspections);
  const t = useT();
  const locale = useLocale((s) => s.locale);

  if (!user) return null;

  // ── Plan / completion maths
  const plan = useMemo(
    () => INSPECTOR_PLAN_STOPS.map((id) => INSPECTABLE_BUILDINGS.find((b) => b.id === id)).filter(Boolean) as typeof INSPECTABLE_BUILDINGS,
    [],
  );
  const my = useMemo(() => inspections.filter((i) => i.inspectorId === user.id), [inspections, user.id]);
  const myActive = my.filter((i) => ['draft', 'returned'].includes(i.status));
  const activeDraft = myActive[0];
  const recent = my.slice().sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, 4);

  // Simulated "current location" — last completed stop if any, else HQ
  const origin = { lat: 24.45, lng: 54.40 };
  const todayKey = new Date().toISOString().slice(0, 10);
  const completedIds = useMemo(() => new Set(
    my.filter((i) => i.status !== 'draft' && i.endAt?.slice(0, 10) === todayKey).map((i) => i.buildingId),
  ), [my, todayKey]);
  const lastDone = [...plan].reverse().find((b) => completedIds.has(b.id));
  const myLocation = lastDone ? lastDone.coords : origin;

  const stopsCompleted = plan.filter((b) => completedIds.has(b.id)).length;
  const stopsTotal = plan.length;
  const currentStopIdx = plan.findIndex((b) => !completedIds.has(b.id));

  // Per-card distance/ETA — relative to current location
  const enrichedStops = useMemo(() => plan.map((b, i) => {
    const distance = haversineMeters(myLocation, b.coords) / 1000;
    const minutes = Math.max(1, Math.round(distance * 2.2));
    const done = completedIds.has(b.id);
    const current = i === currentStopIdx;
    const eta = (() => {
      const now = new Date();
      now.setMinutes(now.getMinutes() + minutes);
      return now.toLocaleTimeString(locale === 'ar' ? 'ar-AE' : 'en-GB', { hour: '2-digit', minute: '2-digit' });
    })();
    return { ...b, distance, minutes, eta, done, current, index: i };
  }), [plan, myLocation, completedIds, currentStopIdx, locale]);

  // Action queue
  const actionItems = useMemo(() => {
    type Alert = {
      id: string; kind: 'returned' | 'critical' | 'draft'; severity: 1 | 2 | 3;
      title: string; sub: string; tone: 'red' | 'amber' | 'orange';
      onTap: () => void; meta?: string;
    };
    const items: Alert[] = [];
    my.filter((i) => i.status === 'returned').forEach((i) => items.push({
      id: 'rt-' + i.id, kind: 'returned', severity: 2,
      title: i.buildingName,
      sub: t('m.home.action.returnedSub'),
      tone: 'amber', meta: formatDateTime(i.updatedAt).split(',')[0],
      onTap: () => navigate(`/mobile/inspection/${i.id}/checklist`),
    }));
    plan.forEach((b) => {
      if (b.riskFlag === 'critical_open' && !completedIds.has(b.id)) {
        items.push({
          id: 'cr-' + b.id, kind: 'critical', severity: 1,
          title: b.name,
          sub: t('m.home.action.criticalSub', { n: b.openViolations }),
          tone: 'red', meta: b.uid,
          onTap: () => navigate(`/mobile/building/${b.id}`),
        });
      }
    });
    if (activeDraft) items.push({
      id: 'dr-' + activeDraft.id, kind: 'draft', severity: 3,
      title: activeDraft.buildingName,
      sub: activeDraft.inspectionNumber,
      tone: 'orange',
      meta: t('m.home.action.draftTitle', { ref: '' }).replace(/[·\s]*$/g, '').trim(),
      onTap: () => navigate(`/mobile/inspection/${activeDraft.id}/checklist`),
    });
    items.sort((a, b) => a.severity - b.severity);
    return items;
  }, [my, plan, completedIds, activeDraft, navigate, t]);

  // Date / name
  const dateLocale = locale === 'ar' ? 'ar-AE' : 'en-GB';
  const todayDate = new Date().toLocaleDateString(dateLocale, { weekday: 'long', day: 'numeric', month: 'long' });
  const firstName = user.name.replace(/^(Eng\.|Dr\.|Mr\.|Mrs\.|Ms\.)\s+/i, '').split(' ')[0];
  const initials = user.name.split(' ').map((p) => p[0]).slice(0, 2).join('');
  const hour = new Date().getHours();
  const greeting = hour < 12 ? t('m.home.greetingMorning') : hour < 17 ? t('m.home.greetingAfternoon') : t('m.home.greetingEvening');

  return (
    <TammScreen
      leading={
        <button
          onClick={() => navigate('/mobile/me')}
          className="flex items-center gap-2 -ms-1 active:opacity-70"
        >
          <span className="w-9 h-9 rounded-full bg-tamm-ink text-white grid place-items-center font-bold text-[12px]" style={{ fontFamily: 'var(--font-display)' }}>
            {initials}
          </span>
        </button>
      }
      trailing={
        <button
          onClick={() => navigate('/mobile/history')}
          className="w-9 h-9 -me-1 grid place-items-center text-tamm-ink relative"
          aria-label="Notifications"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>
          </svg>
          {actionItems.length > 0 && (
            <span className="absolute top-0.5 end-0.5 min-w-[14px] h-[14px] px-1 rounded-full bg-tamm-brand text-white text-[8.5px] font-bold ring-2 ring-tamm-bg grid place-items-center">
              {actionItems.length}
            </span>
          )}
        </button>
      }
    >
      {/* Greeting */}
      <div className="px-5 sm:px-7 md:px-9 pt-1 pb-3">
        <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-tamm-subtle">{todayDate}</div>
        <div className="text-[22px] sm:text-[26px] font-bold text-tamm-ink leading-tight mt-1 tracking-[-0.02em]" style={{ fontFamily: 'var(--font-display)' }}>
          {greeting}, {firstName}.
        </div>
      </div>

      {/* ───────────── MISSION DECK — the dark card itself is swipeable ───────────── */}
      <MissionDeck
        stops={enrichedStops}
        totalDone={stopsCompleted}
        totalStops={stopsTotal}
        activeDraft={activeDraft}
        t={t}
        todayDate={todayDate}
        onInspect={(stop) => {
          if (activeDraft && activeDraft.buildingId === stop.id) {
            navigate(`/mobile/inspection/${activeDraft.id}/checklist`);
          } else {
            navigate(`/mobile/building/${stop.id}`);
          }
        }}
        onEditPlan={() => navigate('/mobile/route')}
      />

      {/* ───────────── Alert center (white list) ───────────── */}
      {actionItems.length > 0 && (
        <AlertCenter items={actionItems} t={t} />
      )}

      {/* ───────────── Quick actions ───────────── */}
      <div className="mt-6">
        <div className="px-5 sm:px-7 md:px-9 mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-tamm-subtle">
          {t('m.home.shortcuts')}
        </div>
        <div className="px-4 sm:px-6 md:px-8 grid grid-cols-4 gap-2 sm:gap-3">
          <QuickAction tone="blue"   label={t('m.home.shortcutsMap')}      to="/mobile/map"     icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C7.58 2 4 5.58 4 10c0 5.25 7 12 8 12s8-6.75 8-12c0-4.42-3.58-8-8-8m0 11a3 3 0 1 1 0-6 3 3 0 0 1 0 6"/></svg>} navigate={navigate}/>
          <QuickAction tone="orange" label={t('m.home.shortcutsRoute')}    to="/mobile/route"   icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><circle cx="6" cy="19" r="3"/><circle cx="18" cy="5" r="3"/><path d="M9 19h4.5a3.5 3.5 0 0 0 0-7h-3a3.5 3.5 0 0 1 0-7H15" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round"/></svg>} navigate={navigate}/>
          <QuickAction tone="green"  label={t('m.home.shortcutsHistory')}  to="/mobile/history" icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a10 10 0 1 0 7.07 17.07 1 1 0 0 0-1.41-1.42A8 8 0 1 1 12 4v5l4 2-1 1.7-5-2.5V2z"/></svg>} navigate={navigate}/>
          <QuickAction tone="ink"    label={t('m.home.shortcutsProfile')}  to="/mobile/me"      icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0z"/></svg>} navigate={navigate}/>
        </div>
      </div>

      {/* ───────────── Recent activity ───────────── */}
      {recent.length > 0 && (
        <div className="mt-6">
          <div className="px-5 sm:px-7 md:px-9 mb-2 flex items-center justify-between">
            <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-tamm-subtle">
              {t('m.home.recentActivity')}
            </div>
            <button onClick={() => navigate('/mobile/history')} className="text-[11.5px] font-semibold text-tamm-brand">
              {t('m.home.viewAll')}
            </button>
          </div>
          <div className="px-4 sm:px-6 md:px-8">
            <div className="rounded-[18px] bg-tamm-surface ring-1 ring-tamm-line shadow-[0_1px_2px_rgba(11,14,18,0.04),0_8px_24px_rgba(11,14,18,0.04)] overflow-hidden divide-y divide-tamm-line">
              {recent.map((i) => (
                <button
                  key={i.id}
                  onClick={() => navigate(`/mobile/inspection/${i.id}`)}
                  className="w-full flex items-center gap-3 px-4 py-3 text-start active:bg-tamm-field"
                >
                  <span className={cn(
                    'w-9 h-9 rounded-lg grid place-items-center shrink-0 text-[12px] font-bold',
                    statusTileTone(i.status),
                  )}>
                    {statusGlyph(i.status)}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="text-[13.5px] font-bold text-tamm-ink truncate">{i.buildingName}</div>
                    <div className="text-[11px] text-tamm-subtle truncate">{i.inspectionNumber} · {i.status.replace(/_/g, ' ')}</div>
                  </div>
                  <div className="text-[10.5px] text-tamm-subtle shrink-0">{formatDateTime(i.updatedAt).split(',')[0]}</div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="h-8" />
    </TammScreen>
  );
}

// ============================================================================
// MissionDeck — horizontal swipeable stack where every card IS the dark
// mission-control hero, one card per planned stop. Uses CSS scroll-snap.
// ============================================================================

interface EnrichedStop {
  id: string;
  uid: string;
  name: string;
  type: string;
  address: string;
  city: string;
  complianceLevel: 'green' | 'amber' | 'red';
  complianceScore: number;
  riskFlag?: string;
  openViolations: number;
  distance: number;   // km from current location
  minutes: number;
  eta: string;        // arrival HH:MM
  done: boolean;
  current: boolean;
  index: number;
}

function MissionDeck({
  stops, totalDone, totalStops, activeDraft, t, todayDate, onInspect, onEditPlan,
}: {
  stops: EnrichedStop[];
  totalDone: number;
  totalStops: number;
  activeDraft: any;
  t: (k: any, p?: any) => string;
  todayDate: string;
  onInspect: (s: EnrichedStop) => void;
  onEditPlan: () => void;
}) {
  // [activeIdx, direction] — direction tells AnimatePresence which way to
  // slide the new center card in (+1 = swipe-left advance, -1 = swipe-right back).
  const [[activeIdx, direction], setIdxDir] = useState<[number, number]>(() => {
    const i = stops.findIndex((s) => s.current);
    return [i >= 0 ? i : 0, 0];
  });

  if (stops.length === 0) {
    return (
      <div className="px-4 sm:px-6 md:px-8">
        <div className="rounded-[20px] bg-tamm-surface ring-1 ring-tamm-line p-6 text-center text-tamm-subtle text-[13px]">
          {t('m.home.noPlan')}
        </div>
      </div>
    );
  }

  const advance = () => setIdxDir(([i]) => [(i + 1) % stops.length, 1]);
  const back    = () => setIdxDir(([i]) => [(i - 1 + stops.length) % stops.length, -1]);
  const jumpTo  = (i: number) => setIdxDir(([prev]) => [i, i > prev ? 1 : -1]);

  const centerStop = stops[activeIdx];
  const prevStop   = stops[(activeIdx - 1 + stops.length) % stops.length];
  const nextStop   = stops[(activeIdx + 1) % stops.length];

  return (
    <div className="px-4 sm:px-6 md:px-8">
      <div
        className="relative mx-auto w-full max-w-[460px]"
        style={{ height: 340 }}
      >
        {/* Left peek (prev). Static x position; only its content morphs when
            the active stop changes. */}
        {stops.length >= 3 && (
          <PeekCard side="left" stop={prevStop} totalStops={totalStops} totalDone={totalDone} t={t} todayDate={todayDate} />
        )}
        {/* Right peek (next) */}
        {stops.length >= 2 && (
          <PeekCard side="right" stop={nextStop} totalStops={totalStops} totalDone={totalDone} t={t} todayDate={todayDate} />
        )}

        {/* Active center — AnimatePresence handles the slide-in / slide-out
            so swiping feels continuous rather than snapping. */}
        <AnimatePresence initial={false} custom={direction}>
          <ActiveCard
            key={centerStop.id}
            stop={centerStop}
            direction={direction}
            totalStops={totalStops}
            totalDone={totalDone}
            activeDraft={activeDraft}
            t={t}
            todayDate={todayDate}
            onSwipeNext={advance}
            onSwipePrev={back}
            onInspect={() => onInspect(centerStop)}
            onEditPlan={onEditPlan}
          />
        </AnimatePresence>
      </div>

      {/* Pagination dots */}
      <div className="mt-3 flex items-center justify-center gap-1.5">
        {stops.map((s, i) => (
          <button
            key={s.id}
            onClick={() => jumpTo(i)}
            className={cn(
              'h-1.5 rounded-full transition-all',
              i === activeIdx
                ? 'w-7 bg-tamm-brand'
                : s.done
                ? 'w-1.5 bg-tamm-green/70'
                : 'w-1.5 bg-tamm-line',
            )}
            aria-label={`Go to stop ${i + 1}`}
          />
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// CardVisual — pure presentational view of one stop card. Used by both
// ActiveCard (center, draggable) and PeekCard (sides, static).
// ============================================================================
function CardVisual({
  stop, totalStops, totalDone, activeDraft, t, todayDate,
  onInspect, onEditPlan, onSwipeNext,
}: {
  stop: EnrichedStop;
  totalStops: number;
  totalDone: number;
  activeDraft: any;
  t: (k: any, p?: any) => string;
  todayDate: string;
  onInspect?: () => void;
  onEditPlan?: () => void;
  onSwipeNext?: () => void;
}) {
  const isResumable = activeDraft && activeDraft.buildingId === stop.id;
  const overallPct = totalStops > 0 ? totalDone / totalStops : 0;
  const scoreTone =
    stop.complianceLevel === 'red'   ? 'bg-tamm-brand/20 text-white ring-tamm-brand/40' :
    stop.complianceLevel === 'amber' ? 'bg-tamm-amber/25 text-white ring-tamm-amber/40' :
                                       'bg-tamm-green/25 text-white ring-tamm-green/40';
  const glow =
    stop.complianceLevel === 'red'   ? 'rgba(200,16,46,0.32)' :
    stop.complianceLevel === 'amber' ? 'rgba(217,119,6,0.26)' :
                                       'rgba(16,185,129,0.26)';

  return (
    <div className="relative h-full rounded-[24px] overflow-hidden text-white shadow-[0_24px_48px_-16px_rgba(11,14,18,0.45)] flex flex-col">
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ backgroundImage: 'linear-gradient(155deg, #161B23 0%, #0B0E12 60%, #1A0E13 100%)' }}
      />
      <div className="absolute -top-14 -end-14 w-56 h-56 rounded-full pointer-events-none" style={{ background: `radial-gradient(circle, ${glow}, transparent 70%)` }} />
      <div className="absolute -bottom-16 -start-12 w-48 h-48 rounded-full pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(37,99,235,0.14), transparent 70%)' }} />

      <div className="relative p-4 sm:p-5 flex flex-col h-full">
        {/* Top status row — status pill (LIVE / COMPLIANT / UP NEXT),
            STOP X OF Y chip in the middle, edit-plan link on the right. */}
        <div className="flex items-center justify-between gap-2">
          <div className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-white/65">
            {stop.done ? (
              <>
                <span className="w-1.5 h-1.5 rounded-full bg-tamm-green" />
                {t('m.wiz.compliant')}
              </>
            ) : stop.current ? (
              <>
                <span className="w-1.5 h-1.5 rounded-full bg-tamm-brand animate-pulse" />
                {t('m.home.missionLive')}
              </>
            ) : (
              <>
                <span className="w-1.5 h-1.5 rounded-full bg-white/40" />
                {t('m.home.upNextPill')}
              </>
            )}
          </div>
          <span className="px-2 py-0.5 rounded-full bg-white/8 ring-1 ring-white/10 text-[9.5px] font-bold uppercase tracking-[0.14em] text-white/65 tabular-nums whitespace-nowrap">
            {t('m.home.stopOf', { n: stop.index + 1, total: totalStops })}
          </span>
          {onEditPlan && (
            <button
              onClick={onEditPlan}
              className="text-[10.5px] font-semibold text-white/55 underline-offset-2 hover:underline ms-auto"
            >
              {t('m.home.editPlan')}
            </button>
          )}
        </div>

        {/* Building row — badge + name + score. The stop-of-Y chip has moved
            to the header above, so this row is just the building identity. */}
        <div className="mt-4 flex items-start gap-3.5">
          <StopBadge stop={stop} />
          <div className="flex-1 min-w-0">
            <div className="text-[19px] font-bold leading-[1.15] tracking-[-0.018em] line-clamp-2" style={{ fontFamily: 'var(--font-display)' }}>
              {stop.name}
            </div>
            <div className="text-[11.5px] text-white/65 mt-1 truncate">{stop.uid} · {stop.city}</div>
          </div>
          <span className={cn(
            'shrink-0 rounded-md px-2 py-1 ring-1 text-[12.5px] font-bold tabular-nums',
            scoreTone,
          )}>
            {stop.complianceScore}
          </span>
        </div>

        <div className="mt-4 grid grid-cols-3 rounded-xl bg-white/[0.06] ring-1 ring-white/10 overflow-hidden">
          <Mini label={t('m.home.toGo')} value={stop.distance.toFixed(1)} unit="km" />
          <Mini label={t('m.home.eta')} value={stop.eta} />
          <Mini label={t('m.home.stopsProgressLabel')} value={`${Math.round(overallPct * 100)}%`} accent={overallPct > 0} />
        </div>

        <div className="mt-3 min-h-[28px] flex items-center">
          {stop.riskFlag === 'critical_open' ? (
            <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-tamm-brand/20 ring-1 ring-tamm-brand/40 text-[10.5px] font-bold uppercase tracking-[0.12em]">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" className="text-tamm-brand"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
              <span className="text-tamm-brand">{t('m.building.criticalOpen')}</span>
              {stop.openViolations > 0 && (
                <span className="text-white/75">· {stop.openViolations} open</span>
              )}
            </div>
          ) : (
            <div className="text-[11px] text-white/45 truncate">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="inline -mt-0.5 me-1"><path d="M12 22s-8-4.5-8-12a8 8 0 1 1 16 0c0 7.5-8 12-8 12z"/><circle cx="12" cy="10" r="3"/></svg>
              {stop.address || `${stop.uid} · ${stop.type.split(' — ')[0]}`}
            </div>
          )}
        </div>

        <div className="mt-auto pt-3 flex gap-2">
          {stop.done ? (
            // Compliant state: full-width pill, no orphan chevron next to it
            <div className="flex-1 h-11 rounded-xl bg-tamm-green/15 ring-1 ring-tamm-green/40 text-tamm-green text-[13px] font-bold tracking-tight flex items-center justify-center gap-2">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
              {t('m.wiz.compliant')}
            </div>
          ) : (
            <>
              <button
                onClick={onInspect}
                className={cn(
                  'flex-1 h-11 rounded-xl font-bold text-[13px] tracking-tight active:scale-[0.98] transition',
                  stop.current
                    ? 'bg-tamm-brand text-white shadow-[0_10px_22px_-6px_rgba(200,16,46,0.6)]'
                    : 'bg-white/10 ring-1 ring-white/15 text-white',
                )}
              >
                {isResumable
                  ? t('m.home.resume', { ref: activeDraft.inspectionNumber })
                  : stop.current
                  ? t('m.home.inspectThisStop')
                  : t('m.map.openBuilding')}
              </button>
              {onSwipeNext && (
                <button
                  onClick={onSwipeNext}
                  className="w-11 h-11 rounded-xl bg-white/8 ring-1 ring-white/10 grid place-items-center text-white/85 active:scale-95 transition"
                  aria-label="Next stop in the deck"
                  title="Next"
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="rtl-mirror"><polyline points="9 6 15 12 9 18"/></svg>
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// PeekCard — non-interactive side card. Slides into its peek position on
// mount and morphs its content when the active stop changes.
// ============================================================================
function PeekCard({
  side, stop, totalStops, totalDone, t, todayDate,
}: {
  side: 'left' | 'right';
  stop: EnrichedStop;
  totalStops: number;
  totalDone: number;
  t: (k: any, p?: any) => string;
  todayDate: string;
}) {
  return (
    <motion.div
      className="absolute inset-0 pointer-events-none"
      initial={{ x: side === 'left' ? '-86%' : '86%', scale: 0.92, opacity: 0 }}
      animate={{ x: side === 'left' ? '-86%' : '86%', scale: 0.92, opacity: 0.55 }}
      transition={{ type: 'spring', stiffness: 280, damping: 28 }}
      style={{ zIndex: 5 }}
    >
      <AnimatePresence initial={false}>
        <motion.div
          key={stop.id}
          className="absolute inset-0 h-full"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18, ease: 'easeOut' }}
        >
          <CardVisual
            stop={stop}
            totalStops={totalStops}
            totalDone={totalDone}
            activeDraft={null}
            t={t}
            todayDate={todayDate}
          />
        </motion.div>
      </AnimatePresence>
    </motion.div>
  );
}

// ============================================================================
// ActiveCard — center card. Drag-enabled and rendered inside AnimatePresence
// so its slide-out / slide-in are continuous when the active stop changes.
// ============================================================================
function ActiveCard({
  stop, direction, totalStops, totalDone, activeDraft, t, todayDate,
  onSwipeNext, onSwipePrev, onInspect, onEditPlan,
}: {
  stop: EnrichedStop;
  direction: number;     // +1 = advance (slide left), -1 = back (slide right)
  totalStops: number;
  totalDone: number;
  activeDraft: any;
  t: (k: any, p?: any) => string;
  todayDate: string;
  onSwipeNext: () => void;
  onSwipePrev: () => void;
  onInspect: () => void;
  onEditPlan: () => void;
}) {
  // No useMotionValue here — letting framer-motion drive `x` purely via the
  // variants + drag pipeline so AnimatePresence's enter/exit animations
  // actually run (a style.x motion value would override the animate target).
  return (
    <motion.div
      className="absolute inset-0 select-none"
      custom={direction}
      variants={{
        enter:  (dir: number) => ({ x: dir > 0 ? '110%' : '-110%', opacity: 0, scale: 0.94 }),
        center: { x: 0, opacity: 1, scale: 1 },
        exit:   (dir: number) => ({ x: dir > 0 ? '-110%' : '110%', opacity: 0, scale: 0.94 }),
      }}
      initial="enter"
      animate="center"
      exit="exit"
      transition={{ type: 'spring', stiffness: 320, damping: 32, mass: 0.9 }}
      style={{ zIndex: 10 }}
      drag="x"
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.4}
      onDragEnd={(_, info) => {
        const THRESHOLD = 80;
        if (info.offset.x < -THRESHOLD || info.velocity.x < -500) onSwipeNext();
        else if (info.offset.x > THRESHOLD || info.velocity.x > 500) onSwipePrev();
      }}
    >
      <CardVisual
        stop={stop}
        totalStops={totalStops}
        totalDone={totalDone}
        activeDraft={activeDraft}
        t={t}
        todayDate={todayDate}
        onInspect={onInspect}
        onEditPlan={onEditPlan}
        onSwipeNext={onSwipeNext}
      />
    </motion.div>
  );
}

function StopBadge({ stop }: { stop: EnrichedStop }) {
  const cls = stop.done
    ? 'bg-tamm-green text-white'
    : stop.current
    ? 'bg-tamm-brand text-white'
    : 'bg-white/10 text-white ring-1 ring-white/15';
  return (
    <span className={cn('w-12 h-12 rounded-2xl grid place-items-center text-[18px] font-bold tabular-nums shrink-0', cls)}
      style={{ fontFamily: 'var(--font-display)' }}>
      {stop.done ? (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
      ) : (
        stop.index + 1
      )}
    </span>
  );
}

// ============================================================================
// AlertCenter — prioritized white card list with severity-toned rows.
// ============================================================================
function AlertCenter({
  items, t,
}: {
  items: { id: string; kind: 'returned' | 'critical' | 'draft'; tone: 'red' | 'amber' | 'orange'; title: string; sub: string; onTap: () => void; meta?: string }[];
  t: (k: any, p?: any) => string;
}) {
  const top = items[0];
  const accentBar =
    top.tone === 'red' ? 'bg-tamm-brand'
    : top.tone === 'amber' ? 'bg-tamm-amber'
    : 'bg-tamm-tint';
  return (
    <div className="mt-6">
      <div className="px-5 sm:px-7 md:px-9 mb-2 flex items-center justify-between">
        <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-tamm-subtle inline-flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-tamm-brand animate-pulse" />
          {t('m.home.needsActionTitle', { count: items.length })}
        </div>
        <span className="text-[10.5px] font-bold text-tamm-subtle tabular-nums">{items.length}</span>
      </div>
      <div className="px-4 sm:px-6 md:px-8">
        <div className="rounded-[18px] bg-tamm-surface ring-1 ring-tamm-line overflow-hidden shadow-[0_1px_2px_rgba(11,14,18,0.04),0_8px_24px_rgba(11,14,18,0.04)]">
          <div className={cn('h-0.5 w-full', accentBar)} />
          <div className="divide-y divide-tamm-line">
            {items.map((a) => (
              <button
                key={a.id}
                onClick={a.onTap}
                className="w-full flex items-center gap-3 px-4 py-3 text-start active:bg-tamm-field"
              >
                <span className={cn(
                  'w-10 h-10 rounded-[12px] grid place-items-center shrink-0',
                  a.tone === 'red' ? 'bg-tamm-brandSoft text-tamm-brand'
                  : a.tone === 'amber' ? 'bg-tamm-amberSoft text-tamm-amber'
                  : 'bg-tamm-tintSoft text-tamm-tint',
                )}>
                  {a.kind === 'returned' && <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/></svg>}
                  {a.kind === 'critical' && <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>}
                  {a.kind === 'draft' && <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4z"/></svg>}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className={cn(
                      'text-[9.5px] font-bold uppercase tracking-[0.14em]',
                      a.tone === 'red' ? 'text-tamm-brand'
                      : a.tone === 'amber' ? 'text-tamm-amber'
                      : 'text-tamm-tint',
                    )}>{a.kind}</span>
                    {a.meta && <span className="text-[10px] text-tamm-subtle truncate">· {a.meta}</span>}
                  </div>
                  <div className="text-[13.5px] font-bold text-tamm-ink truncate mt-0.5">{a.title}</div>
                  <div className="text-[11px] text-tamm-subtle truncate">{a.sub}</div>
                </div>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" className="text-tamm-line shrink-0 rtl-mirror"><polyline points="9 6 15 12 9 18"/></svg>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Local widgets
// ============================================================================
function Mini({ label, value, unit, accent }: { label: string; value: string; unit?: string; accent?: boolean }) {
  return (
    <div className="px-2 py-2 min-w-0">
      <div className="text-[8.5px] font-semibold uppercase tracking-[0.1em] text-white/50 truncate">{label}</div>
      <div className="text-[13px] sm:text-[13.5px] font-bold leading-tight mt-1 tabular-nums tracking-tight truncate" style={{ fontFamily: 'var(--font-display)' }}>
        <span className={accent ? 'text-tamm-brand' : ''}>{value}</span>
        {unit && <span className="text-[9px] text-white/55 font-semibold ms-0.5">{unit}</span>}
      </div>
    </div>
  );
}

function QuickAction({
  tone, label, to, icon, navigate,
}: {
  tone: 'blue' | 'orange' | 'green' | 'ink';
  label: string;
  to: string;
  icon: React.ReactNode;
  navigate: (to: string) => void;
}) {
  const tones = {
    blue:   'bg-tamm-infoSoft text-tamm-info',
    orange: 'bg-tamm-tintSoft text-tamm-tint',
    green:  'bg-tamm-greenSoft text-tamm-green',
    ink:    'bg-tamm-ink text-white',
  } as const;
  return (
    <button
      onClick={() => navigate(to)}
      className="flex flex-col items-center gap-1.5 active:scale-[0.96] transition rounded-[16px] py-3 sm:py-4 bg-tamm-surface ring-1 ring-tamm-line shadow-[0_1px_2px_rgba(11,14,18,0.04)]"
    >
      <span className={cn('w-10 h-10 sm:w-12 sm:h-12 rounded-[12px] grid place-items-center', tones[tone])}>
        {icon}
      </span>
      <span className="text-[10.5px] sm:text-[11.5px] font-semibold text-tamm-ink leading-tight max-w-[80px] line-clamp-1">{label}</span>
    </button>
  );
}

function statusTileTone(s: string): string {
  switch (s) {
    case 'approved': return 'bg-tamm-greenSoft text-tamm-green';
    case 'retained': return 'bg-tamm-infoSoft text-tamm-info';
    case 'escalated':
    case 'in_review':
    case 'needs_cosign': return 'bg-tamm-tintSoft text-tamm-tint';
    case 'returned': return 'bg-tamm-amberSoft text-tamm-amber';
    case 'closed':   return 'bg-tamm-field text-tamm-subtle';
    case 'draft':    return 'bg-tamm-brandSoft text-tamm-brand';
    default:         return 'bg-tamm-field text-tamm-subtle';
  }
}
function statusGlyph(s: string): string {
  return ({
    approved: '✓', retained: '↩', escalated: '↗', in_review: '◐',
    needs_cosign: '✎', returned: '↺', closed: '·', draft: '◇',
  } as Record<string, string>)[s] ?? '·';
}
