// Building-type icon resolver. Maps the free-text "premises type" (from
// NOC / AMC / COC seed data) onto a recognisable SVG glyph so cards and
// hero panels can be scanned at a glance.

type Kind = 'hospital' | 'mall' | 'school' | 'hotel' | 'tower' | 'office' | 'industrial' | 'residential' | 'generic';

function classify(type?: string): Kind {
  const t = (type ?? '').toLowerCase();
  if (/hospital|medical|clinic/.test(t)) return 'hospital';
  if (/mall|retail|shop/.test(t)) return 'mall';
  if (/school|university|academy|college/.test(t)) return 'school';
  if (/hotel|hospitality|resort/.test(t)) return 'hotel';
  if (/office|commercial|tower/.test(t)) return 'office';
  if (/industrial|plant|workshop|factory/.test(t)) return 'industrial';
  if (/villa|residential|apartment|tower|housing/.test(t)) return 'tower';
  return 'generic';
}

const KIND_META: Record<Kind, { label: string; bg: string; fg: string; emoji: string }> = {
  hospital:    { label: 'Hospital',    bg: 'bg-doe-red-soft',          fg: 'text-doe-red',         emoji: '🏥' },
  mall:        { label: 'Mall',        bg: 'bg-action-orange-soft',    fg: 'text-action-orange-deep', emoji: '🏬' },
  school:      { label: 'School',      bg: 'bg-info-soft',             fg: 'text-info-500',        emoji: '🏫' },
  hotel:       { label: 'Hotel',       bg: 'bg-cream',                 fg: 'text-action-orange-deep', emoji: '🏨' },
  tower:       { label: 'Residential', bg: 'bg-lavender',              fg: 'text-[#7B3FE4]',       emoji: '🏢' },
  office:      { label: 'Office',      bg: 'bg-mint',                  fg: 'text-success-500',     emoji: '🏛️' },
  industrial:  { label: 'Industrial',  bg: 'bg-neutral-100',           fg: 'text-neutral-700',     emoji: '🏭' },
  residential: { label: 'Residential', bg: 'bg-peach',                 fg: 'text-action-orange-deep', emoji: '🏘️' },
  generic:     { label: 'Premises',    bg: 'bg-neutral-50',            fg: 'text-neutral-500',     emoji: '🏢' },
};

export function BuildingTypeAvatar({ type, size = 40 }: { type?: string; size?: number }) {
  const kind = classify(type);
  const meta = KIND_META[kind];
  return (
    <div
      className={`${meta.bg} ${meta.fg} rounded-xl grid place-items-center shrink-0 ring-1 ring-white/40`}
      style={{ width: size, height: size, fontSize: size * 0.55 }}
      title={meta.label}
    >
      <span>{meta.emoji}</span>
    </div>
  );
}

export function buildingTypeLabel(type?: string): string {
  return KIND_META[classify(type)].label;
}
