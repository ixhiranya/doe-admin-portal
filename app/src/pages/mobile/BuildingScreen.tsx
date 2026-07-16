import { useParams, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { motion } from 'framer-motion';
import { INSPECTABLE_BUILDINGS, INSPECTION_TYPES, checklistFor, haversineMeters } from '../../data/inspections';
import { useInspections } from '../../store/inspections';
import { useAuth } from '../../store/auth';
import { useT } from '../../i18n';
import { TammScreen, TammButton } from '../../components/mobile/Tamm';
import { useMobileSim } from '../../components/mobile/MobileShell';
import { cn } from '../../lib/utils';

// ============================================================================
// BuildingScreen — "Inspector OS" Quick-Look.
// Dark dossier hero with a compliance score gauge, 2×2 permit health
// dashboard, property card, recent inspections, then a sticky start-inspection
// action bar that opens an inspection-type sheet.
// ============================================================================

const GEOFENCE_RADIUS_M = 50;

export function BuildingScreen() {
  const { id } = useParams();
  const navigate = useNavigate();
  const user = useAuth((s) => s.user);
  const createDraft = useInspections((s) => s.createDraft);
  const inspections = useInspections((s) => s.inspections);
  const t = useT();
  // The simulator reports the simulated device's effective width — not the
  // browser viewport — so we can switch between phone and tablet layouts
  // based on the device the inspector is actually using.
  const { deviceWidth } = useMobileSim();
  const isWide = deviceWidth >= 700;

  const b = INSPECTABLE_BUILDINGS.find((x) => x.id === id);

  // hooks must be called unconditionally — declare state before any early return
  const [farAway, setFarAway] = useState(false);
  const [overrideReason, setOverrideReason] = useState('');
  const [sheetOpen, setSheetOpen] = useState(false);
  const [selectedType, setSelectedType] = useState<string | null>(null);

  if (!b) {
    return (
      <TammScreen title="—" leading="back" tabBar={false}>
        <div className="p-6 text-center text-tamm-subtle text-[14px]">{t('common.noResults')}</div>
      </TammScreen>
    );
  }
  if (!user) return null;

  const typeLabels: Record<string, { label: string; desc: string }> = {
    routine:           { label: t('m.itype.routine'),         desc: t('m.itype.routineDesc') },
    re_inspection:     { label: t('m.itype.reinspection'),    desc: t('m.itype.reinspectionDesc') },
    complaint:         { label: t('m.itype.complaint'),       desc: t('m.itype.complaintDesc') },
    spot_check:        { label: t('m.itype.spotcheck'),       desc: t('m.itype.spotcheckDesc') },
    incident_response: { label: t('m.itype.incident'),        desc: t('m.itype.incidentDesc') },
    pre_approval:      { label: t('m.itype.preapproval'),     desc: t('m.itype.preapprovalDesc') },
  };

  const myPos = farAway
    ? { lat: b.coords.lat + 0.05, lng: b.coords.lng + 0.05 }
    : { lat: b.coords.lat + 0.0001, lng: b.coords.lng - 0.0001 };
  const distance = haversineMeters(myPos, b.coords);
  const inside = distance <= GEOFENCE_RADIUS_M;
  const needsOverride = !inside;
  const canStart = !!selectedType && (inside || (needsOverride && overrideReason.trim().length > 10));

  const existingForBuilding = inspections.filter((i) => i.buildingId === b.id).slice(0, 3);

  // compliance tone — used by hero gauge + glow
  const tone: 'red' | 'amber' | 'green' =
    b.complianceLevel === 'red' ? 'red' : b.complianceLevel === 'amber' ? 'amber' : 'green';
  const toneHex =
    tone === 'red'   ? '#E11D48' :
    tone === 'amber' ? '#D97706' :
                       '#10B981';
  const glow =
    tone === 'red'   ? 'rgba(225,29,72,0.35)' :
    tone === 'amber' ? 'rgba(217,119,6,0.30)' :
                       'rgba(16,185,129,0.30)';

  const start = () => {
    if (!selectedType) return;
    const tpl = checklistFor(selectedType);
    const newId = createDraft({
      type: selectedType as never,
      building: {
        id: b.id, uid: b.uid, name: b.name, address: b.address, city: b.city, type: b.type,
        commercialLicence: b.commercialLicence, coords: b.coords, permits: b.permits,
        openViolations: b.openViolations, openWarnings: b.openWarnings, complianceScore: b.complianceScore,
      },
      inspector: { id: user.id, name: user.name, role: user.role },
      checkIn: {
        lat: myPos.lat, lng: myPos.lng, distance,
        override: needsOverride, overrideReason: needsOverride ? overrideReason : undefined,
      },
      checklistTemplate: tpl,
    });
    navigate(`/mobile/inspection/${newId}/checklist`);
  };

  return (
    <TammScreen
      title={b.name}
      tabBar={false}
      leading="back"
      trailing={
        <button
          onClick={() => navigate('/mobile/home')}
          className="text-[13px] font-semibold text-tamm-brand"
        >
          {t('m.common.home')}
        </button>
      }
    >
      {/* ───────────── Dossier hero (dark, compact) ───────────── */}
      <div className="px-4 sm:px-6 pt-1">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative rounded-[20px] overflow-hidden text-white shadow-[0_18px_40px_-12px_rgba(11,14,18,0.40)]"
          style={{ backgroundImage: 'linear-gradient(155deg, #161B23 0%, #0B0E12 60%, #131822 100%)' }}
        >
          <div className="absolute -top-14 -end-14 w-52 h-52 rounded-full pointer-events-none" style={{ background: `radial-gradient(circle, ${glow}, transparent 70%)` }} />
          <div className="absolute -bottom-14 -start-10 w-44 h-44 rounded-full pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(37,99,235,0.14), transparent 70%)' }} />

          <div className={cn('relative', isWide ? 'p-6' : 'p-4')}>
            {/* Top row — type pill + risk badge */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="px-2 py-0.5 rounded-md bg-white/12 ring-1 ring-white/15 text-white text-[9.5px] font-bold uppercase tracking-[0.14em]">
                {b.type}
              </span>
              {b.riskFlag === 'critical_open' && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-tamm-brand text-white text-[9.5px] font-bold uppercase tracking-[0.14em]">
                  <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                  {t('m.building.criticalOpen')}
                </span>
              )}
              {b.riskFlag === 'reinspection' && (
                <span className="px-2 py-0.5 rounded-md bg-tamm-amber/85 text-white text-[9.5px] font-bold uppercase tracking-[0.14em]">
                  {t('m.itype.reinspection')}
                </span>
              )}
            </div>

            {/* Identity row — gauge on the left, name/address on the right.
                Same shape on phone and tablet; tablet just gets larger type. */}
            <div className="mt-4 flex items-start gap-4">
              <ScoreGauge score={b.complianceScore} tone={toneHex} />
              <div className="flex-1 min-w-0">
                <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/55">{b.city} · {b.uid}</div>
                <div
                  className={cn('font-bold leading-[1.15] mt-1 tracking-[-0.018em] line-clamp-2', isWide ? 'text-[28px]' : 'text-[20px]')}
                  style={{ fontFamily: 'var(--font-display)' }}
                >
                  {b.name}
                </div>
                <div className={cn('text-white/65 mt-1 truncate', isWide ? 'text-[13px]' : 'text-[11px]')}>{b.address}</div>
              </div>
            </div>

            {/* Horizontal stat strip — fills the bottom of the hero with a
                3-up row. On tablet the cards grow wider and the numbers get
                larger; the layout never wastes vertical space. */}
            <div className={cn('mt-4 grid grid-cols-3 rounded-xl bg-white/[0.06] ring-1 ring-white/10 overflow-hidden', isWide && 'gap-px')}>
              {isWide ? (
                <>
                  <HeroStatLarge label={t('m.building.violations')} icon="vio"  value={b.openViolations} accent={b.openViolations > 0 ? '#E11D48' : undefined} />
                  <HeroStatLarge label={t('m.building.warnings')}   icon="warn" value={b.openWarnings}   accent={b.openWarnings   > 0 ? '#D97706' : undefined} />
                  <HeroStatLarge label={t('m.building.actions')}    icon="act"  value={b.pendingActions} accent={b.pendingActions > 0 ? '#2563EB' : undefined} />
                </>
              ) : (
                <>
                  <HeroStat label={t('m.building.violations')} icon="vio" value={b.openViolations} accent={b.openViolations > 0 ? '#E11D48' : undefined} />
                  <HeroStat label={t('m.building.warnings')}   icon="warn" value={b.openWarnings}   accent={b.openWarnings   > 0 ? '#D97706' : undefined} />
                  <HeroStat label={t('m.building.actions')}    icon="act" value={b.pendingActions} accent={b.pendingActions > 0 ? '#2563EB' : undefined} />
                </>
              )}
            </div>
          </div>
        </motion.div>
      </div>

      {/* ───────────── Permit health dashboard ───────────── */}
      <SectionTitle title={t('m.building.permits')} />
      <div className={cn(isWide ? 'px-6' : 'px-4')}>
        {/* Phone: 2×2 grid. Tablet: single row of 4 tiles for at-a-glance scan. */}
        <div className={cn('grid gap-2', isWide ? 'grid-cols-4 gap-3' : 'grid-cols-2')}>
          <PermitCard label="AMC" sub="Annual Maintenance" status={b.permits.amc.status} expiry={b.permits.amc.expiry} t={t} />
          <PermitCard label="NOC" sub="No Objection"        status={b.permits.noc.status} expiry={b.permits.noc.expiry} t={t} />
          <PermitCard label="COC" sub="Completion"          status={b.permits.coc.status} expiry={b.permits.coc.expiry} t={t} />
          <PermitCard label="TPI CoC" sub="Conformity"       status={b.permits.tpiCoc?.status ?? 'not_on_file'} expiry={b.permits.tpiCoc?.expiry} t={t} />
        </div>
      </div>

      {/* ───────────── Property dossier ───────────── */}
      <SectionTitle title={t('m.building.property')} />
      <div className={cn(isWide ? 'px-6' : 'px-4')}>
        {/* Phone: single column of key-value rows. Tablet: split into two
            cards side by side — building identity / stakeholders. */}
        {isWide ? (
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-[18px] bg-tamm-surface ring-1 ring-tamm-line shadow-[0_1px_2px_rgba(11,14,18,0.04),0_8px_24px_rgba(11,14,18,0.04)] divide-y divide-tamm-line">
              <DossierRow label={t('m.building.uid')}     value={b.uid} mono />
              <DossierRow label={t('m.building.type')}    value={b.type} />
              <DossierRow label={t('m.building.city')}    value={b.city} />
              <DossierRow label={t('m.building.licence')} value={b.commercialLicence} mono />
            </div>
            <div className="rounded-[18px] bg-tamm-surface ring-1 ring-tamm-line shadow-[0_1px_2px_rgba(11,14,18,0.04),0_8px_24px_rgba(11,14,18,0.04)] divide-y divide-tamm-line">
              <DossierRow label={t('m.building.owner')}      value={b.ownerName ?? '—'} />
              <DossierRow label={t('m.building.fm')}         value={b.fmCompany ?? '—'} />
              <DossierRow label={t('m.building.contractor')} value={b.gasContractor ?? '—'} />
            </div>
          </div>
        ) : (
          <div className="rounded-[18px] bg-tamm-surface ring-1 ring-tamm-line shadow-[0_1px_2px_rgba(11,14,18,0.04),0_8px_24px_rgba(11,14,18,0.04)] divide-y divide-tamm-line">
            <DossierRow label={t('m.building.uid')}        value={b.uid} mono />
            <DossierRow label={t('m.building.type')}       value={b.type} />
            <DossierRow label={t('m.building.city')}       value={b.city} />
            <DossierRow label={t('m.building.licence')}    value={b.commercialLicence} mono />
            <DossierRow label={t('m.building.owner')}      value={b.ownerName ?? '—'} />
            <DossierRow label={t('m.building.fm')}         value={b.fmCompany ?? '—'} />
            <DossierRow label={t('m.building.contractor')} value={b.gasContractor ?? '—'} />
          </div>
        )}
      </div>

      {/* ───────────── Last inspection + recent ───────────── */}
      {(b.lastInspection || existingForBuilding.length > 0) && (
        <>
          <SectionTitle title={t('m.building.lastInspection')} />
          <div className="px-4">
            <div className="rounded-[18px] bg-tamm-surface ring-1 ring-tamm-line shadow-[0_1px_2px_rgba(11,14,18,0.04),0_8px_24px_rgba(11,14,18,0.04)] overflow-hidden divide-y divide-tamm-line">
              {b.lastInspection && (
                <div className="flex items-center gap-3 px-4 py-3.5">
                  <span className={cn('w-10 h-10 rounded-[12px] grid place-items-center shrink-0',
                    b.lastInspection.outcome === 'Compliant' ? 'bg-tamm-greenSoft text-tamm-green'
                    : b.lastInspection.outcome.includes('Warning') ? 'bg-tamm-amberSoft text-tamm-amber'
                    : 'bg-tamm-brandSoft text-tamm-brand'
                  )}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="text-[13.5px] font-bold text-tamm-ink truncate">{b.lastInspection.type}</div>
                    <div className="text-[11px] text-tamm-subtle truncate">{b.lastInspection.outcome}</div>
                  </div>
                  <div className="text-[11.5px] font-semibold text-tamm-subtle tabular-nums shrink-0">{b.lastInspection.date}</div>
                </div>
              )}
              {existingForBuilding.map((i) => (
                <button
                  key={i.id}
                  onClick={() => navigate(`/mobile/inspection/${i.id}`)}
                  className="w-full flex items-center gap-3 px-4 py-3 text-start active:bg-tamm-field"
                >
                  <span className="w-10 h-10 rounded-[12px] bg-tamm-field text-tamm-ink grid place-items-center text-[10px] font-bold shrink-0">
                    {i.status.slice(0, 3).toUpperCase()}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="text-[13px] font-bold text-tamm-ink truncate">{i.inspectionNumber}</div>
                    <div className="text-[11px] text-tamm-subtle truncate">{i.type.replace(/_/g, ' ')} · {i.inspectorName}</div>
                  </div>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" className="text-tamm-line rtl-mirror"><polyline points="9 6 15 12 9 18"/></svg>
                </button>
              ))}
            </div>
          </div>
        </>
      )}

      {/* spacer so sticky CTA never covers content */}
      <div className="h-32" />

      {/* ───────────── Sticky start-inspection bar ───────────── */}
      <div className="sticky bottom-0 z-30 px-4 pb-3 pt-2 bg-gradient-to-t from-tamm-bg via-tamm-bg to-tamm-bg/0">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-[18px] bg-tamm-ink text-white shadow-[0_18px_32px_-10px_rgba(11,14,18,0.55)] ring-1 ring-white/5 overflow-hidden"
        >
          {/* geofence strip */}
          <div className={cn(
            'px-3.5 py-2.5 flex items-center gap-2.5',
            inside ? 'bg-tamm-green/12' : 'bg-tamm-brand/12',
          )}>
            <span className={cn(
              'w-7 h-7 rounded-lg grid place-items-center shrink-0',
              inside ? 'bg-tamm-green text-white' : 'bg-tamm-brand text-white',
            )}>
              {inside ? (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
              ) : (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
              )}
            </span>
            <div className="flex-1 min-w-0">
              <div className="text-[11.5px] font-bold leading-tight">{t('m.building.metresFrom', { m: distance })}</div>
              <div className="text-[10px] text-white/65 leading-tight mt-0.5">
                {inside ? t('m.building.geofenceInside') : t('m.building.geofenceOutside')}
              </div>
            </div>
            <button
              onClick={() => setFarAway(!farAway)}
              className="text-[10.5px] text-white/70 underline shrink-0"
              title="Toggle simulated GPS"
            >
              {farAway ? t('m.building.simNear') : t('m.building.simFar')}
            </button>
          </div>

          {/* override textarea — only if outside */}
          {!inside && (
            <div className="px-3.5 py-2.5 bg-white/[0.04] border-b border-white/5">
              <label className="block text-[9.5px] font-bold uppercase tracking-[0.14em] text-white/55">
                {t('m.building.overrideLabel')}
              </label>
              <textarea
                value={overrideReason}
                onChange={(e) => setOverrideReason(e.target.value)}
                rows={2}
                placeholder={t('m.building.overridePlaceholder')}
                className="mt-1 w-full p-2 bg-black/30 rounded-lg text-[12px] text-white ring-1 ring-white/10 focus:outline-none focus:ring-tamm-brand placeholder:text-white/40"
              />
              <div className="text-[10px] text-white/45 mt-1">{t('m.building.overrideAudit', { n: overrideReason.length })}</div>
            </div>
          )}

          {/* Pick type + start — stacked on phone so the Start label never
              trims; side-by-side on tablet where there's plenty of width. */}
          <div className={cn('px-3.5 py-3', isWide ? 'flex items-center gap-2.5' : 'space-y-2')}>
            <button
              onClick={() => setSheetOpen(true)}
              className={cn(
                'w-full h-12 rounded-xl text-start px-3 flex items-center gap-2 transition active:scale-[0.99]',
                isWide && 'flex-1',
                selectedType ? 'bg-white/10 ring-1 ring-white/20' : 'bg-white/5 ring-1 ring-white/10',
              )}
            >
              <span className="w-7 h-7 rounded-lg bg-tamm-tintSoft text-tamm-tint grid place-items-center shrink-0">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
              </span>
              <span className="flex-1 min-w-0">
                <span className="block text-[9.5px] font-bold uppercase tracking-[0.14em] text-white/55">
                  {t('m.building.inspectionType')}
                </span>
                <span className="block text-[12.5px] font-semibold text-white truncate">
                  {selectedType ? typeLabels[selectedType]?.label : t('m.building.continuePickType')}
                </span>
              </span>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" className="text-white/55"><polyline points="6 9 12 15 18 9"/></svg>
            </button>
            <button
              onClick={start}
              disabled={!canStart}
              className={cn(
                'h-12 rounded-xl text-white text-[13.5px] font-bold tracking-tight transition active:scale-[0.97] inline-flex items-center justify-center gap-2',
                isWide ? 'px-5 shrink-0' : 'w-full px-4',
                canStart
                  ? 'bg-tamm-brand shadow-[0_8px_20px_-6px_rgba(200,16,46,0.55)]'
                  : 'bg-white/8 text-white/40',
              )}
            >
              {canStart && (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
              )}
              <span className="truncate">{t('m.building.checkInStart')}</span>
            </button>
          </div>
        </motion.div>
      </div>

      {/* ───────────── Type picker sheet ───────────── */}
      {sheetOpen && (
        <div className="fixed inset-0 z-50 bg-black/40" onClick={() => setSheetOpen(false)}>
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 32, stiffness: 320 }}
            onClick={(e) => e.stopPropagation()}
            className="absolute inset-x-0 bottom-0 bg-tamm-surface rounded-t-[24px] shadow-[0_-24px_48px_-8px_rgba(11,14,18,0.35)] max-h-[80vh] flex flex-col"
          >
            <button onClick={() => setSheetOpen(false)} className="py-2.5 grid place-items-center" aria-label="Close">
              <span className="w-10 h-1 rounded-full bg-tamm-line" />
            </button>
            <div className="px-5 pb-2 flex items-center justify-between">
              <div>
                <div className="text-[10.5px] font-bold uppercase tracking-[0.14em] text-tamm-subtle">{t('m.building.inspectionType')}</div>
                <div className="text-[18px] font-bold text-tamm-ink leading-tight tracking-[-0.018em]" style={{ fontFamily: 'var(--font-display)' }}>
                  {t('m.building.continuePickType')}
                </div>
              </div>
            </div>
            <div className="px-5 py-3 space-y-2 overflow-y-auto">
              {INSPECTION_TYPES.map((typ) => {
                const active = selectedType === typ.id;
                return (
                  <button
                    key={typ.id}
                    onClick={() => { setSelectedType(typ.id); setSheetOpen(false); }}
                    className={cn(
                      'w-full text-start rounded-[14px] p-3 ring-1 transition active:scale-[0.99] flex items-center gap-3',
                      active ? 'bg-tamm-brandSoft ring-tamm-brand/40' : 'bg-tamm-field ring-tamm-line',
                    )}
                  >
                    <span className={cn(
                      'w-9 h-9 rounded-[12px] grid place-items-center shrink-0',
                      active ? 'bg-tamm-brand text-white' : 'bg-tamm-surface text-tamm-ink ring-1 ring-tamm-line',
                    )}>
                      <TypeGlyph id={typ.id} />
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="text-[13.5px] font-bold text-tamm-ink truncate">{typeLabels[typ.id]?.label ?? typ.label}</div>
                      <div className="text-[11px] text-tamm-subtle leading-snug line-clamp-2">{typeLabels[typ.id]?.desc ?? typ.description}</div>
                    </div>
                    {active && (
                      <span className="w-6 h-6 rounded-full bg-tamm-brand text-white grid place-items-center shrink-0">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
            <div className="px-5 pt-2 pb-4 border-t border-tamm-line">
              <TammButton block size="lg" disabled={!selectedType} onClick={() => setSheetOpen(false)}>
                {t('m.common.confirm')}
              </TammButton>
            </div>
          </motion.div>
        </div>
      )}
    </TammScreen>
  );
}

// ============================================================================
// Score gauge — 270° arc with score in the middle
// ============================================================================
function ScoreGauge({ score, tone }: { score: number; tone: string }) {
  const size = 96;
  const stroke = 8;
  const r = (size - stroke) / 2;
  // 270° arc — from -135° to +135°
  const arcLength = 2 * Math.PI * r * 0.75;
  const offset = arcLength * (1 - score / 100);
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: 'rotate(135deg)' }}>
        <circle
          cx={size / 2} cy={size / 2} r={r}
          fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth={stroke} strokeLinecap="round"
          strokeDasharray={`${arcLength} ${2 * Math.PI * r}`}
        />
        <motion.circle
          cx={size / 2} cy={size / 2} r={r}
          fill="none" stroke={tone} strokeWidth={stroke} strokeLinecap="round"
          strokeDasharray={`${arcLength} ${2 * Math.PI * r}`}
          initial={{ strokeDashoffset: arcLength }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.2, ease: 'easeOut' }}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center">
        <div className="text-center">
          <div className="text-[28px] font-bold leading-none tabular-nums tracking-[-0.02em]" style={{ fontFamily: 'var(--font-display)', color: tone }}>
            {score}
          </div>
          <div className="text-[8px] font-bold uppercase tracking-[0.14em] text-white/55 mt-0.5">score</div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Permit health card — status pill + validity arc + days-to-expiry
// ============================================================================
function PermitCard({
  label, sub, status, expiry, t,
}: {
  label: string; sub: string; status: string; expiry?: string;
  t: (k: any, p?: any) => string;
}) {
  const tone: 'green' | 'amber' | 'red' | 'grey' =
    status === 'active'  ? 'green' :
    status === 'grace'   ? 'amber' :
    status === 'expired' ? 'red' :
                           'grey';

  const toneCls = {
    green: { ring: 'ring-tamm-line', stroke: '#10B981', soft: 'bg-tamm-greenSoft', text: 'text-tamm-green' },
    amber: { ring: 'ring-tamm-line', stroke: '#D97706', soft: 'bg-tamm-amberSoft', text: 'text-tamm-amber' },
    red:   { ring: 'ring-tamm-line', stroke: '#DC2626', soft: 'bg-tamm-brandSoft', text: 'text-tamm-brand' },
    grey:  { ring: 'ring-tamm-line', stroke: '#9CA3AF', soft: 'bg-tamm-field',     text: 'text-tamm-subtle' },
  }[tone];

  const statusLabel =
    status === 'active'  ? t('m.building.permitActive') :
    status === 'grace'   ? t('m.building.permitGrace') :
    status === 'expired' ? t('m.building.permitExpired') :
                           t('m.building.permitNotOnFile');

  // Days until expiry (approximate) — used to compute the validity bar
  let daysLeft: number | null = null;
  if (expiry) {
    const d = new Date(expiry).getTime() - Date.now();
    daysLeft = Math.round(d / (1000 * 60 * 60 * 24));
  }
  // Map days left into a 0–1 fraction for the bar (cap at 365 days)
  const frac = daysLeft === null ? 0 : Math.max(0, Math.min(1, daysLeft / 365));

  return (
    <div className={cn(
      'rounded-[16px] bg-tamm-surface ring-1 p-3 flex flex-col gap-2 shadow-[0_1px_2px_rgba(11,14,18,0.04)]',
      toneCls.ring,
    )}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="text-[14px] font-bold text-tamm-ink leading-none">{label}</div>
          <div className="text-[10.5px] text-tamm-subtle leading-tight mt-1 truncate">{sub}</div>
        </div>
        <span className={cn('px-1.5 py-0.5 rounded-md text-[9.5px] font-bold whitespace-nowrap', toneCls.soft, toneCls.text)}>
          {statusLabel}
        </span>
      </div>

      <div className="mt-auto">
        <div className="h-1.5 rounded-full bg-tamm-field overflow-hidden">
          <div
            className="h-full rounded-full transition-all"
            style={{ width: `${Math.max(8, frac * 100)}%`, background: toneCls.stroke }}
          />
        </div>
        <div className="flex items-center justify-between mt-1.5">
          <div className="text-[10px] text-tamm-subtle tabular-nums">{expiry ?? '—'}</div>
          {daysLeft !== null && (
            <div className={cn('text-[10px] font-bold tabular-nums', toneCls.text)}>
              {daysLeft < 0
                ? `${Math.abs(daysLeft)}d overdue`
                : daysLeft <= 30 ? `${daysLeft}d left`
                : `${daysLeft}d`}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Helpers
// ============================================================================
function SectionTitle({ title }: { title: string }) {
  return (
    <div className="px-5 pt-5 pb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-tamm-subtle">
      {title}
    </div>
  );
}

function HeroStat({
  label, value, icon, accent,
}: {
  label: string;
  value: number;
  icon: 'vio' | 'warn' | 'act';
  accent?: string;
}) {
  return (
    <div className="px-2.5 py-2 min-w-0">
      <div className="flex items-center gap-1.5">
        <span className="text-white/45 shrink-0" style={accent ? { color: accent } : undefined}>
          <StatIcon kind={icon} />
        </span>
        <span className="text-[8.5px] font-semibold uppercase tracking-[0.1em] text-white/55 truncate">
          {label}
        </span>
      </div>
      <div
        className="text-[18px] font-bold leading-tight mt-1 tabular-nums tracking-tight"
        style={{ fontFamily: 'var(--font-display)', color: accent ?? 'white' }}
      >
        {value}
      </div>
    </div>
  );
}

// Tablet variant — used inside a 3-column grid cell on wide devices. Icon +
// label sit side-by-side at the top, big number underneath. Heights match
// across the three cells thanks to the parent grid and no vertical padding
// disparity.
function HeroStatLarge({
  label, value, icon, accent,
}: {
  label: string;
  value: number;
  icon: 'vio' | 'warn' | 'act';
  accent?: string;
}) {
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <span
        className="w-11 h-11 rounded-[12px] grid place-items-center shrink-0"
        style={accent
          ? { background: accent + '24', color: accent }
          : { background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.55)' }}
      >
        <StatIcon kind={icon} />
      </span>
      <div className="flex-1 min-w-0">
        <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/55 truncate">{label}</div>
        <div
          className="text-[24px] font-bold leading-none mt-1 tabular-nums tracking-tight"
          style={{ fontFamily: 'var(--font-display)', color: accent ?? 'white' }}
        >
          {value}
        </div>
      </div>
    </div>
  );
}

function StatIcon({ kind }: { kind: 'vio' | 'warn' | 'act' }) {
  if (kind === 'vio') return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
  );
  if (kind === 'warn') return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
  );
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
  );
}

function DossierRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between px-4 py-3 gap-3">
      <div className="text-[12px] text-tamm-subtle">{label}</div>
      <div className={cn('text-[13px] font-semibold text-tamm-ink text-end truncate max-w-[60%]', mono && 'font-mono text-[12px]')}>
        {value}
      </div>
    </div>
  );
}

function TypeGlyph({ id }: { id: string }) {
  if (id === 'routine')           return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>;
  if (id === 're_inspection')     return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/></svg>;
  if (id === 'complaint')         return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>;
  if (id === 'spot_check')        return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>;
  if (id === 'incident_response') return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>;
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>;
}
