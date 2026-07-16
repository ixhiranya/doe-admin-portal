import { useMemo, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence, useMotionValue } from 'framer-motion';
import { INSPECTABLE_BUILDINGS } from '../../data/inspections';
import { useT } from '../../i18n';
import { TammTabBar, TammBadge, TammButton } from '../../components/mobile/Tamm';
import { cn } from '../../lib/utils';

// ============================================================================
// MapScreen (TAMM redesign) — warm sand-toned map with a draggable white sheet.
// Top: floating Home pill (start) + map controls (end). Bottom: white card
// with a drag handle, segmented filter, search field, building list. Markers
// pop using DoE tone colours over a cream/sand background to match the rest
// of the TAMM-styled mobile app.
// ============================================================================

type ComplianceFilter = 'all' | 'green' | 'amber' | 'red';

export function MapScreen() {
  const navigate = useNavigate();
  const t = useT();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<ComplianceFilter>('all');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [scheduledFor, setScheduledFor] = useState<{ buildingId: string; kind: 'today' | 'pick' } | null>(null);
  const [multiSelect, setMultiSelect] = useState(false);
  const [bulkIds, setBulkIds] = useState<string[]>([]);
  const [bulkActionOpen, setBulkActionOpen] = useState<'today' | 'pick' | null>(null);

  const toggleBulk = (id: string) =>
    setBulkIds((arr) => (arr.includes(id) ? arr.filter((x) => x !== id) : [...arr, id]));
  const exitMultiSelect = () => { setMultiSelect(false); setBulkIds([]); };

  const visible = useMemo(() => {
    return INSPECTABLE_BUILDINGS.filter((b) => {
      if (filter !== 'all' && b.complianceLevel !== filter) return false;
      if (search) {
        const q = search.toLowerCase();
        if (!(b.name.toLowerCase().includes(q) || b.uid.toLowerCase().includes(q) || b.address.toLowerCase().includes(q))) return false;
      }
      return true;
    });
  }, [filter, search]);

  const bounds = useMemo(() => {
    const lats = INSPECTABLE_BUILDINGS.map((b) => b.coords.lat);
    const lngs = INSPECTABLE_BUILDINGS.map((b) => b.coords.lng);
    return {
      minLat: Math.min(...lats) - 0.02, maxLat: Math.max(...lats) + 0.02,
      minLng: Math.min(...lngs) - 0.02, maxLng: Math.max(...lngs) + 0.02,
    };
  }, []);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const sheetY = useMotionValue(0);
  const [expanded, setExpanded] = useState(true);
  const peekOffsetPx = 220;
  const toggleSheet = () => {
    const target = expanded ? peekOffsetPx : 0;
    sheetY.set(target);
    setExpanded(!expanded);
  };

  const selected = selectedId ? visible.find((b) => b.id === selectedId) : null;

  return (
    <div className="h-full flex flex-col relative bg-tamm-bg">
      {/* ── Map area (upper 55%) — sand/cream backdrop with white streets,
          olive parks, and DoE-tone markers. */}
      <div ref={containerRef} className="relative shrink-0 overflow-hidden" style={{ height: '55%' }}>
        {/* Cool map backdrop — matches the Inspector OS palette */}
        <div
          className="absolute inset-0"
          style={{ background: 'radial-gradient(circle at 32% 35%, #EEF1F7 0%, #DDE2EC 50%, #C5CCDA 100%)' }}
        />
        {/* Subtle water hint at the top */}
        <div className="absolute inset-x-0 top-0 h-20" style={{ background: 'linear-gradient(180deg, #B7C8DB, transparent)' }} />

        {/* Streets + parks */}
        <svg className="absolute inset-0 w-full h-full" preserveAspectRatio="none" viewBox="0 0 400 700">
          <g stroke="#FFFFFF" fill="none" strokeLinecap="round">
            <path d="M-20 120 L 220 100 L 420 160" strokeWidth="14" opacity="0.95" />
            <path d="M30 280 L 240 260 L 430 310" strokeWidth="14" opacity="0.95" />
            <path d="M0 460 L 200 440 L 420 480" strokeWidth="12" opacity="0.95" />
            <path d="M-20 620 L 200 600 L 420 640" strokeWidth="10" opacity="0.95" />
            <path d="M160 -10 L 170 280 L 185 690" strokeWidth="10" opacity="0.85" />
            <path d="M310 -10 L 320 690" strokeWidth="8" opacity="0.85" />
          </g>
          <g stroke="#C8102E" fill="none" strokeLinecap="round" strokeDasharray="2 5">
            <path d="M-20 120 L 220 100 L 420 160" strokeWidth="1.2" opacity="0.45" />
            <path d="M30 280 L 240 260 L 430 310" strokeWidth="1.2" opacity="0.45" />
          </g>
          {/* Parks (cool sage) */}
          <g fill="#9FB99B" opacity="0.5">
            <ellipse cx="60" cy="220" rx="50" ry="32" />
            <ellipse cx="350" cy="380" rx="45" ry="28" />
            <ellipse cx="220" cy="540" rx="60" ry="36" />
          </g>
        </svg>

        {/* Markers */}
        {visible.map((b, i) => {
          const x = ((b.coords.lng - bounds.minLng) / (bounds.maxLng - bounds.minLng)) * 100;
          const y = 100 - ((b.coords.lat - bounds.minLat) / (bounds.maxLat - bounds.minLat)) * 100;
          const tone =
            b.complianceLevel === 'red' ? '#A8273E' :
            b.complianceLevel === 'amber' ? '#B8771B' :
            '#2D6E4A';
          const isSelected = selectedId === b.id;
          return (
            <motion.button
              key={b.id}
              onClick={() => setSelectedId(b.id)}
              className="absolute -translate-x-1/2 -translate-y-full z-10"
              style={{ left: `${x}%`, top: `${y * 0.55 + 10}%` }}
              initial={{ scale: 0, y: -8 }}
              animate={{ scale: isSelected ? 1.18 : 1, y: 0 }}
              transition={{ delay: 0.05 * i, type: 'spring', stiffness: 280, damping: 20 }}
            >
              {b.riskFlag && (
                <span className="absolute -top-1 left-1/2 -translate-x-1/2 w-3 h-3 rounded-full bg-tamm-brand ring-2 ring-white text-white text-[7px] font-bold grid place-items-center">
                  !
                </span>
              )}
              <span
                className="block w-8 h-8 rounded-full ring-[3px] ring-white grid place-items-center"
                style={{
                  background: tone,
                  boxShadow: isSelected ? `0 0 0 6px ${tone}33` : '0 6px 14px rgba(50,32,8,0.18)',
                }}
              >
                <span className="block w-2 h-2 rounded-full bg-white" />
              </span>
              <span
                className="block w-2.5 h-2.5 rotate-45 -mt-1 mx-auto ring-2 ring-white"
                style={{ background: tone }}
              />
            </motion.button>
          );
        })}

        {/* My location */}
        <div className="absolute left-1/2 z-10" style={{ top: '38%' }}>
          <div className="-translate-x-1/2 -translate-y-1/2 relative">
            <motion.span
              className="absolute -inset-3 rounded-full bg-tamm-info/25"
              animate={{ scale: [1, 1.6, 1], opacity: [0.6, 0, 0.6] }}
              transition={{ duration: 2.2, repeat: Infinity }}
            />
            <span className="relative block w-4 h-4 rounded-full bg-tamm-info ring-[3px] ring-white shadow-lg" />
          </div>
        </div>

        {/* Floating map controls — end (right in LTR, left in RTL) */}
        <div className="absolute top-3 end-3 z-20 flex flex-col gap-1.5">
          <MapButton title="Recenter">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3" /><path d="M12 1v6m0 6v6m11-7h-6m-6 0H1" /></svg>
          </MapButton>
          <MapButton title="Layer">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 2 7 12 12 22 7 12 2" /><polyline points="2 17 12 22 22 17" /><polyline points="2 12 12 17 22 12" /></svg>
          </MapButton>
        </div>

        {/* Home pill — start (left in LTR, right in RTL) */}
        <button
          onClick={() => navigate('/mobile/home')}
          className="absolute top-3 start-3 z-20 ps-2.5 pe-3 py-1.5 rounded-full bg-tamm-surface/95 backdrop-blur-md shadow-[0_4px_10px_rgba(50,32,8,0.12)] ring-1 ring-tamm-line flex items-center gap-1.5 text-[12px] font-semibold text-tamm-brand active:scale-95 transition"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" className="rtl-mirror"><polyline points="15 18 9 12 15 6" /></svg>
          {t('m.common.home')}
        </button>

        {/* Selected building preview — pops up above the sheet */}
        {selected && !multiSelect && (
          <motion.div
            initial={{ y: 30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="absolute start-3 end-3 bottom-[calc(45%+12px)] z-20 rounded-[18px] bg-tamm-surface shadow-[0_12px_28px_rgba(50,32,8,0.18)] ring-1 ring-tamm-line overflow-hidden"
            style={{ maxWidth: 380, marginInline: 'auto' }}
          >
            <button
              onClick={() => navigate(`/mobile/building/${selected.id}`)}
              className="w-full flex items-center gap-3 p-3 text-start active:bg-tamm-field"
            >
              <ComplianceTile level={selected.complianceLevel} score={selected.complianceScore} />
              <div className="flex-1 min-w-0">
                <div className="text-[13.5px] font-bold text-tamm-ink truncate">{selected.name}</div>
                <div className="text-[11px] text-tamm-subtle truncate">{selected.uid} · {selected.type}</div>
                <div className="mt-1.5 flex items-center gap-1.5 flex-wrap">
                  {(['amc', 'noc', 'coc'] as const).map((k) => (
                    <PermitDot key={k} label={k.toUpperCase()} status={selected.permits[k].status} />
                  ))}
                  {selected.openViolations > 0 && (
                    <TammBadge tone="red">{selected.openViolations} ⚠</TammBadge>
                  )}
                </div>
              </div>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" className="text-tamm-line self-center rtl-mirror"><polyline points="9 6 15 12 9 18" /></svg>
            </button>

            {/* Quick-schedule actions */}
            <div className="border-t border-tamm-line grid grid-cols-2 divide-x divide-tamm-line">
              <button
                onClick={() => setScheduledFor({ buildingId: selected.id, kind: 'today' })}
                className="h-11 flex items-center justify-center gap-1.5 text-[12.5px] font-bold text-tamm-brand active:bg-tamm-brandSoft"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
                {t('m.map.addToToday')}
              </button>
              <button
                onClick={() => setScheduledFor({ buildingId: selected.id, kind: 'pick' })}
                className="h-11 flex items-center justify-center gap-1.5 text-[12.5px] font-bold text-tamm-ink active:bg-tamm-field"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>
                {t('m.map.scheduleFor')}
              </button>
            </div>
          </motion.div>
        )}

        {/* Confirmation toast — 'Added' or schedule date picker */}
        {scheduledFor && (
          <ScheduleToast
            building={INSPECTABLE_BUILDINGS.find((b) => b.id === scheduledFor.buildingId)!}
            kind={scheduledFor.kind}
            onClose={() => setScheduledFor(null)}
          />
        )}
      </div>

      {/* ── Bottom sheet — white TAMM surface */}
      <motion.div
        style={{ y: sheetY }}
        className="bg-tamm-surface rounded-t-[22px] shadow-[0_-12px_28px_rgba(50,32,8,0.10)] flex-1 min-h-0 flex flex-col ring-1 ring-tamm-line ring-b-0"
        initial={false}
      >
        {/* Handle */}
        <button onClick={toggleSheet} className="py-2 grid place-items-center" aria-label="Toggle sheet">
          <span className="w-9 h-1 rounded-full bg-tamm-line" />
        </button>

        {/* Sticky header — title, select toggle, search, segmented filter */}
        <div className="px-4 pb-2.5 space-y-2.5">
          <div className="flex items-center gap-2">
            <div className="flex-1 text-center">
              <div className="text-[16.5px] font-bold text-tamm-ink leading-none" style={{ fontFamily: 'var(--font-display)' }}>
                {t('m.map.title')}
              </div>
              <div className="text-[11px] text-tamm-subtle mt-0.5">
                {t('m.map.results', { visible: visible.length, total: INSPECTABLE_BUILDINGS.length })}
              </div>
            </div>
            <button
              onClick={() => (multiSelect ? exitMultiSelect() : setMultiSelect(true))}
              className={cn(
                'shrink-0 h-7 px-2.5 rounded-full text-[11px] font-bold transition',
                multiSelect ? 'bg-tamm-brand text-white' : 'bg-tamm-field text-tamm-ink ring-1 ring-tamm-line',
              )}
            >
              {multiSelect ? `${t('m.common.cancel')} (${bulkIds.length})` : 'Select'}
            </button>
          </div>

          <div className="relative">
            <span className="absolute start-3 top-1/2 -translate-y-1/2 text-tamm-subtle">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" /></svg>
            </span>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('m.map.searchPlaceholder')}
              className="w-full h-10 ps-9 pe-3 bg-tamm-field rounded-xl text-[13.5px] text-tamm-ink focus:outline-none focus:bg-tamm-surface focus:ring-2 focus:ring-tamm-brand/30 placeholder:text-tamm-subtle"
            />
          </div>

          <FilterSegmented value={filter} onChange={setFilter} t={t} />
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto px-4 pb-3">
          <div className="space-y-2">
            {visible.map((b, idx) => {
              const checked = bulkIds.includes(b.id);
              return (
                <motion.button
                  key={b.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.03 * idx }}
                  onClick={() => (multiSelect ? toggleBulk(b.id) : navigate(`/mobile/building/${b.id}`))}
                  onMouseEnter={() => !multiSelect && setSelectedId(b.id)}
                  className={cn(
                    'w-full text-start rounded-[18px] p-3 flex items-center gap-3 active:scale-[0.99] transition ring-1',
                    multiSelect && checked
                      ? 'bg-tamm-brandSoft ring-tamm-brand/40'
                      : 'bg-tamm-surface ring-tamm-line',
                  )}
                >
                  {multiSelect && (
                    <span className={cn(
                      'w-6 h-6 rounded-md border-2 shrink-0 grid place-items-center transition',
                      checked ? 'bg-tamm-brand border-tamm-brand text-white' : 'border-tamm-line bg-tamm-surface',
                    )}>
                      {checked && (
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                      )}
                    </span>
                  )}
                  <ComplianceTile level={b.complianceLevel} score={b.complianceScore} />
                  <div className="flex-1 min-w-0">
                    <div className="text-[14px] font-bold text-tamm-ink truncate">{b.name}</div>
                    <div className="text-[11px] text-tamm-subtle truncate">{b.uid} · {b.address}</div>
                    <div className="mt-1.5 flex items-center gap-1.5 flex-wrap">
                      {(['amc', 'noc', 'coc'] as const).map((k) => (
                        <PermitDot key={k} label={k.toUpperCase()} status={b.permits[k].status} />
                      ))}
                      {b.openViolations > 0 && <TammBadge tone="red">{b.openViolations} ⚠</TammBadge>}
                    </div>
                  </div>
                  {!multiSelect && (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" className="text-tamm-line self-center rtl-mirror"><polyline points="9 6 15 12 9 18" /></svg>
                  )}
                </motion.button>
              );
            })}
          </div>
        </div>
      </motion.div>

      {/* Floating bulk action bar */}
      <AnimatePresence>
        {multiSelect && bulkIds.length > 0 && (
          <motion.div
            initial={{ y: 60, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 60, opacity: 0 }}
            className="absolute start-3 end-3 bottom-[72px] z-30 rounded-[18px] bg-tamm-ink text-white shadow-[0_18px_36px_rgba(0,0,0,0.22)] flex items-center gap-2 px-3 py-2.5"
          >
            <div className="flex-1 min-w-0">
              <div className="text-[13.5px] font-bold">
                {bulkIds.length} {bulkIds.length === 1 ? 'building' : 'buildings'} selected
              </div>
              <div className="text-[10.5px] text-white/65 truncate">
                {bulkIds
                  .slice(0, 3)
                  .map((id) => INSPECTABLE_BUILDINGS.find((b) => b.id === id)?.name)
                  .filter(Boolean)
                  .join(' · ')}
                {bulkIds.length > 3 ? ` · +${bulkIds.length - 3}` : ''}
              </div>
            </div>
            <button
              onClick={() => setBulkActionOpen('today')}
              className="h-10 px-3 rounded-xl bg-tamm-brand text-white text-[12px] font-bold active:scale-95"
            >
              {t('m.map.addToToday')}
            </button>
            <button
              onClick={() => setBulkActionOpen('pick')}
              className="h-10 px-3 rounded-xl bg-white/15 ring-1 ring-white/20 text-white text-[12px] font-bold active:scale-95"
            >
              {t('m.map.scheduleFor')}
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {bulkActionOpen && (
          <BulkScheduleSheet
            count={bulkIds.length}
            ids={bulkIds}
            kind={bulkActionOpen}
            onClose={() => { setBulkActionOpen(null); exitMultiSelect(); }}
          />
        )}
      </AnimatePresence>

      <TammTabBar />
    </div>
  );
}

// ----------------------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------------------

function MapButton({ children, title }: { children: React.ReactNode; title: string }) {
  return (
    <button
      title={title}
      className="w-10 h-10 rounded-xl bg-tamm-surface/95 backdrop-blur-md shadow-[0_4px_10px_rgba(50,32,8,0.12)] ring-1 ring-tamm-line grid place-items-center text-tamm-ink active:scale-95 transition"
    >
      {children}
    </button>
  );
}

function PermitDot({ label, status }: { label: string; status: string }) {
  const tone =
    status === 'active' ? '#2D6E4A' :
    status === 'grace' ? '#B8771B' :
    status === 'expired' ? '#A8273E' :
    '#9C9588';
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-mono font-semibold text-tamm-subtle">
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: tone }} />
      {label}
    </span>
  );
}

function ComplianceTile({ level, score }: { level: 'green' | 'amber' | 'red'; score: number }) {
  const cls =
    level === 'red'   ? 'bg-tamm-brandSoft text-tamm-brand' :
    level === 'amber' ? 'bg-tamm-amberSoft text-tamm-amber' :
                        'bg-tamm-greenSoft text-tamm-green';
  return (
    <span className={cn('w-11 h-11 rounded-[14px] grid place-items-center font-bold text-[13px] shrink-0', cls)}>
      {score}
    </span>
  );
}

function FilterSegmented({
  value, onChange, t,
}: {
  value: ComplianceFilter;
  onChange: (v: ComplianceFilter) => void;
  t: ReturnType<typeof useT>;
}) {
  const options: { v: ComplianceFilter; label: string }[] = [
    { v: 'all',   label: t('m.map.filterAll') },
    { v: 'green', label: t('m.map.filterCompliant') },
    { v: 'amber', label: t('m.map.filterPartial') },
    { v: 'red',   label: t('m.map.filterAction') },
  ];
  return (
    <div className="flex items-center gap-1 p-1 bg-tamm-field rounded-xl ring-1 ring-tamm-line">
      {options.map((o) => {
        const active = value === o.v;
        return (
          <button
            key={o.v}
            onClick={() => onChange(o.v)}
            className={cn(
              'flex-1 h-8 rounded-lg text-[12px] font-semibold transition',
              active ? 'bg-tamm-surface text-tamm-ink shadow-[0_1px_2px_rgba(50,32,8,0.08)]' : 'text-tamm-subtle',
            )}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

// ============================================================================
// ScheduleToast — confirmation toast (today) or date-picker sheet (pick).
// ============================================================================

function ScheduleToast({
  building, kind, onClose,
}: {
  building: typeof INSPECTABLE_BUILDINGS[number];
  kind: 'today' | 'pick';
  onClose: () => void;
}) {
  const t = useT();
  const [picked, setPicked] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().slice(0, 10);
  });

  const persist = (date: string) => {
    try {
      const raw = localStorage.getItem('doe.pps.mobile.scheduled');
      const list = raw ? JSON.parse(raw) : [];
      list.push({ buildingId: building.id, date, addedAt: new Date().toISOString() });
      localStorage.setItem('doe.pps.mobile.scheduled', JSON.stringify(list));
    } catch { /* ignore */ }
  };

  if (kind === 'today') {
    setTimeout(() => { persist(new Date().toISOString().slice(0, 10)); onClose(); }, 1100);
  }

  return (
    <div className="absolute inset-x-0 bottom-0 z-30 grid place-items-end p-3 pointer-events-none">
      <motion.div
        initial={{ y: 40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="pointer-events-auto w-full max-w-[360px] rounded-[18px] bg-tamm-surface shadow-[0_16px_36px_rgba(50,32,8,0.22)] ring-1 ring-tamm-line overflow-hidden"
      >
        {kind === 'today' ? (
          <div className="p-4 flex items-center gap-3">
            <span className="w-10 h-10 rounded-xl bg-tamm-green text-white grid place-items-center">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
            </span>
            <div className="flex-1 min-w-0">
              <div className="text-[13.5px] font-bold text-tamm-ink">Added to today</div>
              <div className="text-[11.5px] text-tamm-subtle truncate">{building.name}</div>
            </div>
          </div>
        ) : (
          <div className="p-4 space-y-3">
            <div>
              <div className="text-[13.5px] font-bold text-tamm-ink">Schedule inspection</div>
              <div className="text-[11.5px] text-tamm-subtle mt-0.5 truncate">{building.name}</div>
            </div>
            <input
              type="date"
              value={picked}
              min={new Date().toISOString().slice(0, 10)}
              onChange={(e) => setPicked(e.target.value)}
              className="w-full h-11 px-3 rounded-xl bg-tamm-field text-[14px] font-medium text-tamm-ink ring-1 ring-tamm-line focus:outline-none focus:bg-tamm-surface focus:ring-2 focus:ring-tamm-brand/30"
            />
            <div className="flex gap-2">
              <TammButton variant="secondary" onClick={onClose} block>
                {t('m.common.cancel')}
              </TammButton>
              <TammButton variant="primary" onClick={() => { persist(picked); onClose(); }} block>
                {t('m.common.confirm')}
              </TammButton>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}

// ============================================================================
// BulkScheduleSheet — multi-select confirmation / date picker.
// ============================================================================

function BulkScheduleSheet({
  count, ids, kind, onClose,
}: {
  count: number;
  ids: string[];
  kind: 'today' | 'pick';
  onClose: () => void;
}) {
  const t = useT();
  const [picked, setPicked] = useState<string>(() => {
    const d = new Date(); d.setDate(d.getDate() + 1);
    return d.toISOString().slice(0, 10);
  });

  const persist = (date: string) => {
    try {
      const raw = localStorage.getItem('doe.pps.mobile.scheduled');
      const list = raw ? JSON.parse(raw) : [];
      ids.forEach((id) => list.push({ buildingId: id, date, addedAt: new Date().toISOString() }));
      localStorage.setItem('doe.pps.mobile.scheduled', JSON.stringify(list));
    } catch { /* ignore */ }
  };

  if (kind === 'today') {
    persist(new Date().toISOString().slice(0, 10));
    setTimeout(onClose, 1100);
  }

  return (
    <div className="absolute inset-0 z-40 bg-black/30 grid place-items-end p-3" onClick={onClose}>
      <motion.div
        initial={{ y: 60, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 60, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-[420px] mx-auto rounded-[20px] bg-tamm-surface shadow-[0_24px_48px_rgba(0,0,0,0.28)] ring-1 ring-tamm-line overflow-hidden"
      >
        {kind === 'today' ? (
          <div className="p-4 flex items-center gap-3">
            <span className="w-11 h-11 rounded-xl bg-tamm-green text-white grid place-items-center">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
            </span>
            <div className="flex-1 min-w-0">
              <div className="text-[14px] font-bold text-tamm-ink">
                Added {count} {count === 1 ? 'building' : 'buildings'} to today
              </div>
              <div className="text-[11.5px] text-tamm-subtle truncate">
                {ids
                  .map((id) => INSPECTABLE_BUILDINGS.find((b) => b.id === id)?.name)
                  .filter(Boolean)
                  .slice(0, 2)
                  .join(', ')}
                {count > 2 ? `, +${count - 2}` : ''}
              </div>
            </div>
          </div>
        ) : (
          <div className="p-4 space-y-3">
            <div>
              <div className="text-[15px] font-bold text-tamm-ink">
                Schedule {count} {count === 1 ? 'building' : 'buildings'}
              </div>
              <div className="text-[11.5px] text-tamm-subtle mt-0.5 truncate">
                {ids
                  .map((id) => INSPECTABLE_BUILDINGS.find((b) => b.id === id)?.name)
                  .filter(Boolean)
                  .slice(0, 3)
                  .join(' · ')}
              </div>
            </div>
            <input
              type="date"
              value={picked}
              min={new Date().toISOString().slice(0, 10)}
              onChange={(e) => setPicked(e.target.value)}
              className="w-full h-11 px-3 rounded-xl bg-tamm-field text-[14px] font-medium text-tamm-ink ring-1 ring-tamm-line focus:outline-none focus:bg-tamm-surface focus:ring-2 focus:ring-tamm-brand/30"
            />
            <div className="flex gap-2">
              <TammButton variant="secondary" onClick={onClose} block>{t('m.common.cancel')}</TammButton>
              <TammButton variant="primary" onClick={() => { persist(picked); onClose(); }} block>
                {t('m.common.confirm')}
              </TammButton>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}
