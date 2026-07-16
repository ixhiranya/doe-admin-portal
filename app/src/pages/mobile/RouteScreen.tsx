import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { INSPECTABLE_BUILDINGS, INSPECTOR_PLAN_STOPS, haversineMeters } from '../../data/inspections';
import { useT } from '../../i18n';
import { TammScreen, TammCard, TammBadge } from '../../components/mobile/Tamm';
import { cn } from '../../lib/utils';

// ============================================================================
// RouteScreen (TAMM redesign) — multi-stop trip planner.
// Hero card with totals + start CTA, vertical timeline of stops, an "add a
// stop" expander that lets you pick from unselected buildings. All wrapped
// in the cream TAMM background.
// ============================================================================

function nearestNeighbourRoute(start: { lat: number; lng: number }, stops: typeof INSPECTABLE_BUILDINGS) {
  const remaining = [...stops];
  const out: typeof INSPECTABLE_BUILDINGS = [];
  let cur = start;
  let totalKm = 0;
  const legs: number[] = [];
  while (remaining.length) {
    let bestIdx = 0;
    let bestDist = Infinity;
    remaining.forEach((s, i) => {
      const d = haversineMeters(cur, s.coords);
      if (d < bestDist) { bestDist = d; bestIdx = i; }
    });
    legs.push(bestDist / 1000);
    totalKm += bestDist / 1000;
    cur = remaining[bestIdx].coords;
    out.push(remaining[bestIdx]);
    remaining.splice(bestIdx, 1);
  }
  return { ordered: out, legs, totalKm };
}

export function RouteScreen() {
  const navigate = useNavigate();
  const t = useT();
  const origin = { lat: 24.45, lng: 54.40 };

  const initial = INSPECTOR_PLAN_STOPS
    .map((id) => INSPECTABLE_BUILDINGS.find((b) => b.id === id))
    .filter(Boolean) as typeof INSPECTABLE_BUILDINGS;

  const [selectedIds, setSelectedIds] = useState<string[]>(initial.map((b) => b.id));
  const [addOpen, setAddOpen] = useState(false);

  const selected = useMemo(
    () => selectedIds.map((id) => INSPECTABLE_BUILDINGS.find((b) => b.id === id)!).filter(Boolean),
    [selectedIds],
  );
  const unselected = useMemo(
    () => INSPECTABLE_BUILDINGS.filter((b) => !selectedIds.includes(b.id)),
    [selectedIds],
  );

  const route = useMemo(() => nearestNeighbourRoute(origin, selected), [selected]);
  const totalMinutes = Math.round(route.totalKm * 2.2);

  const removeStop = (id: string) => setSelectedIds(selectedIds.filter((x) => x !== id));
  const moveStop = (id: string, dir: -1 | 1) => {
    const idx = selectedIds.indexOf(id);
    const newIdx = idx + dir;
    if (newIdx < 0 || newIdx >= selectedIds.length) return;
    const arr = [...selectedIds];
    [arr[idx], arr[newIdx]] = [arr[newIdx], arr[idx]];
    setSelectedIds(arr);
  };

  return (
    <TammScreen
      title={t('m.route.title')}
      largeTitle
      leading="home"
    >
      {/* ── Hero summary card ── matches Home/Building/Wizard dark OS hero */}
      <div className="px-4 sm:px-6 mt-1">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-[20px] overflow-hidden text-white shadow-[0_18px_40px_-12px_rgba(11,14,18,0.40)] relative"
          style={{ backgroundImage: 'linear-gradient(155deg, #161B23 0%, #0B0E12 60%, #131822 100%)' }}
        >
          <div className="absolute -top-14 -end-14 w-52 h-52 rounded-full pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(37,99,235,0.25), transparent 70%)' }} />
          <div className="absolute -bottom-14 -start-10 w-44 h-44 rounded-full pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(200,16,46,0.16), transparent 70%)' }} />
          <div className="relative p-4">
            <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/75">
              {t('m.route.tspNote')}
            </div>
            <div className="text-[20px] font-bold mt-1.5 leading-tight tracking-[-0.018em]" style={{ fontFamily: 'var(--font-display)' }}>
              {selected.length === 0
                ? 'No stops yet'
                : `${selected.length} ${selected.length === 1 ? 'stop' : 'stops'} · ${route.totalKm.toFixed(1)} km`}
            </div>
            <div className="text-[12px] text-white/70 mt-0.5">
              ETA ~{totalMinutes} min · starting from DoE PPS HQ
            </div>

            <div className="mt-3.5 grid grid-cols-3 rounded-2xl bg-white/10 ring-1 ring-white/15 overflow-hidden">
              <MiniStat label="Stops" value={String(selected.length)} />
              <Sep />
              <MiniStat label="Distance" value={`${route.totalKm.toFixed(1)} km`} />
              <Sep />
              <MiniStat label="ETA" value={`${totalMinutes}m`} accent />
            </div>

            <div className="mt-3 flex gap-2">
              <button
                onClick={() => selected.length > 0 && navigate(`/mobile/building/${route.ordered[0].id}`)}
                disabled={selected.length === 0}
                className={cn(
                  'flex-1 h-12 rounded-2xl bg-white text-tamm-ink font-bold text-[14px] flex items-center justify-center gap-2 active:scale-[0.99] transition shadow-md',
                  selected.length === 0 && 'opacity-40 cursor-not-allowed',
                )}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C7.58 2 4 5.58 4 10c0 5.25 7 12 8 12s8-6.75 8-12c0-4.42-3.58-8-8-8m0 11a3 3 0 1 1 0-6 3 3 0 0 1 0 6"/></svg>
                {t('m.route.startNav')}
              </button>
              <button
                onClick={() => navigate('/mobile/map')}
                className="w-12 h-12 rounded-2xl bg-white/10 ring-1 ring-white/15 grid place-items-center active:scale-95 transition"
                title="Map"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"/></svg>
              </button>
            </div>
          </div>
        </motion.div>
      </div>

      {/* ── Stop list (timeline) ── */}
      {selected.length === 0 ? (
        <div className="px-6 mt-8 text-center text-tamm-subtle text-[13.5px]">
          Add buildings from the list below to build your route.
        </div>
      ) : (
        <TammCard
          title={t('m.route.stopOrder')}
          trailing={
            <button
              onClick={() => setSelectedIds([])}
              className="text-[11.5px] font-semibold text-tamm-brand"
            >Clear all</button>
          }
          padding="sm"
        >
          <div className="px-1 py-1 relative">
            {/* Timeline vertical line */}
            <div className="absolute start-[26px] top-6 bottom-6 w-[2px] bg-tamm-line rounded-full" />
            {route.ordered.map((b, idx) => {
              const km = route.legs[idx];
              const eta = Math.round(km * 2.2);
              const stopTone =
                b.complianceLevel === 'red'   ? 'bg-tamm-brand' :
                b.complianceLevel === 'amber' ? 'bg-tamm-amber' :
                                                'bg-tamm-green';
              return (
                <motion.div
                  key={b.id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.04 * idx }}
                  className="relative flex items-stretch gap-3 py-2"
                >
                  {/* Stop badge */}
                  <div className="relative shrink-0 w-9 grid place-items-center">
                    <div className={cn(
                      'w-9 h-9 rounded-full grid place-items-center text-white text-[13px] font-bold ring-[3px] ring-tamm-bg shadow-sm tabular-nums',
                      stopTone,
                    )}>
                      {idx + 1}
                    </div>
                  </div>
                  {/* Stop content */}
                  <button
                    onClick={() => navigate(`/mobile/building/${b.id}`)}
                    className="flex-1 min-w-0 text-start rounded-[14px] bg-tamm-field p-2.5 ring-1 ring-tamm-line active:bg-tamm-surface"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <div className="text-[13.5px] font-bold text-tamm-ink truncate">{b.name}</div>
                        <div className="text-[11px] text-tamm-subtle truncate">{b.uid} · {b.type.split(' — ')[0]}</div>
                      </div>
                      <div className="text-end shrink-0">
                        <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-tamm-subtle leading-none">
                          {idx === 0 ? 'from HQ' : t('m.route.from')}
                        </div>
                        <div className="text-[13px] font-bold tabular-nums text-tamm-ink mt-1 leading-none">{km.toFixed(1)} km</div>
                        <div className="text-[10px] text-tamm-subtle mt-0.5">~{eta}m</div>
                      </div>
                    </div>
                  </button>
                  {/* Up/Down/Remove */}
                  <div className="shrink-0 flex flex-col items-center gap-1 py-1">
                    <button
                      onClick={() => moveStop(b.id, -1)}
                      disabled={idx === 0}
                      className={cn(
                        'w-6 h-6 rounded-md grid place-items-center text-tamm-subtle hover:bg-tamm-field',
                        idx === 0 && 'opacity-25',
                      )}
                      title="Move up"
                    >
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><polyline points="18 15 12 9 6 15"/></svg>
                    </button>
                    <button
                      onClick={() => moveStop(b.id, 1)}
                      disabled={idx === selected.length - 1}
                      className={cn(
                        'w-6 h-6 rounded-md grid place-items-center text-tamm-subtle hover:bg-tamm-field',
                        idx === selected.length - 1 && 'opacity-25',
                      )}
                      title="Move down"
                    >
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
                    </button>
                    <button
                      onClick={() => removeStop(b.id)}
                      className="w-6 h-6 rounded-md grid place-items-center text-tamm-brand hover:bg-tamm-brandSoft"
                      title="Remove"
                    >
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </TammCard>
      )}

      {/* ── Add buildings ── */}
      <TammCard
        title={t('m.route.addBuildings')}
        trailing={
          <button onClick={() => setAddOpen(!addOpen)} className="text-[11.5px] font-semibold text-tamm-brand">
            {addOpen ? 'Collapse' : 'Expand'}
          </button>
        }
        padding="none"
      >
        {addOpen && unselected.length > 0 ? (
          unselected.map((b, i) => (
            <div key={b.id}>
              {i > 0 && <div className="ms-[68px] h-px bg-tamm-line" />}
              <button
                onClick={() => setSelectedIds([...selectedIds, b.id])}
                className="w-full flex items-center gap-3 px-4 py-3 text-start active:bg-tamm-field"
              >
                <span className={cn(
                  'w-10 h-10 rounded-[12px] grid place-items-center text-[11px] font-bold shrink-0',
                  b.complianceLevel === 'red'   ? 'bg-tamm-brandSoft text-tamm-brand' :
                  b.complianceLevel === 'amber' ? 'bg-tamm-amberSoft text-tamm-amber' :
                                                  'bg-tamm-greenSoft text-tamm-green',
                )}>
                  {b.complianceScore}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="text-[13.5px] font-bold text-tamm-ink truncate">{b.name}</div>
                  <div className="text-[11px] text-tamm-subtle truncate">{b.uid} · {b.city}</div>
                  {b.openViolations > 0 && (
                    <div className="mt-1">
                      <TammBadge tone="red">{b.openViolations} {b.openViolations === 1 ? 'violation' : 'violations'}</TammBadge>
                    </div>
                  )}
                </div>
                <span className="w-7 h-7 rounded-full bg-tamm-brandSoft text-tamm-brand grid place-items-center text-[14px] font-bold leading-none">+</span>
              </button>
            </div>
          ))
        ) : addOpen ? (
          <div className="px-4 py-5 text-center text-[12px] text-tamm-subtle">All buildings already in your plan.</div>
        ) : (
          <button
            onClick={() => setAddOpen(true)}
            className="w-full flex items-center gap-3 px-4 py-3.5 text-start active:bg-tamm-field"
          >
            <span className="w-10 h-10 rounded-[12px] bg-tamm-tintSoft text-tamm-tint grid place-items-center text-[16px] font-bold leading-none shrink-0">+</span>
            <div className="flex-1">
              <div className="text-[14px] font-bold text-tamm-ink">Add a stop</div>
              <div className="text-[11.5px] text-tamm-subtle">{unselected.length} buildings available</div>
            </div>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" className="text-tamm-line rtl-mirror"><polyline points="9 6 15 12 9 18"/></svg>
          </button>
        )}
      </TammCard>

      <div className="h-8" />
    </TammScreen>
  );
}

function MiniStat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="px-3 py-2.5">
      <div className={cn('text-[9.5px] font-semibold uppercase tracking-[0.14em]', accent ? 'text-tamm-tint' : 'text-white/55')}>{label}</div>
      <div className="text-[15px] font-bold leading-none mt-1 tracking-tight tabular-nums" style={{ fontFamily: 'var(--font-display)' }}>{value}</div>
    </div>
  );
}
function Sep() { return <div className="w-px bg-white/10 my-2" />; }
