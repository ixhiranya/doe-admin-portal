import { Link } from 'react-router-dom';
import { cn } from '../../lib/utils';
import { buildingTypeLabel } from './BuildingTypeIcon';
import { CERT_META, type Building360, type CertSummary } from '../../services/buildings';

// ============================================================================
// Building 360 — Hero Tile Card
//
// A bold two-zone card. The top zone is a full-bleed coloured hero keyed to
// the compliance level — the building name reads in white, the score is the
// hero number (huge), and a status strap underlines what state the building
// is in. The bottom zone is a clean data layer with three cert "lights" and
// a small operator footer.
// ============================================================================

const HERO: Record<Building360['complianceLevel'], { gradient: string; chip: string; statusLabel: string; statusEmoji: string }> = {
  green: {
    gradient: 'from-success-500 via-success-500 to-success-dot',
    chip: 'bg-white/95 text-success-500',
    statusLabel: 'Fully Compliant',
    statusEmoji: '✓',
  },
  amber: {
    gradient: 'from-action-orange via-action-orange to-warning-500',
    chip: 'bg-white/95 text-action-orange-deep',
    statusLabel: 'Partial Coverage',
    statusEmoji: '⏳',
  },
  red: {
    gradient: 'from-doe-red via-doe-red to-danger-500',
    chip: 'bg-white/95 text-doe-red',
    statusLabel: 'Action Required',
    statusEmoji: '⚠',
  },
};

const TYPE_EMOJI: Record<string, string> = {
  Hospital: '🏥',  Mall: '🏬',  School: '🏫',  Hotel: '🏨',
  Tower: '🏢',     Office: '🏛️', Industrial: '🏭',
  Residential: '🏘️', Premises: '🏢',
};

export function BuildingCard({ b }: { b: Building360 }) {
  const typeLabel = buildingTypeLabel(b.premisesType);
  const emoji = TYPE_EMOJI[typeLabel] ?? '🏢';
  const hero = HERO[b.complianceLevel];
  const activeCount = [b.coc, b.noc, b.amc].filter((c) => c.status === 'active' || c.status === 'expiring').length;
  const operator = b.gasAmcContractor ?? b.gasInstallContractor;

  return (
    <Link
      to={`/buildings/${b.id}`}
      className="group block bg-white rounded-2xl overflow-hidden border border-neutral-100 hover:shadow-doe-lg hover:-translate-y-0.5 transition duration-200"
    >
      {/* =========== ZONE 1 — HERO (coloured) =========== */}
      <div className={cn('relative px-5 pt-5 pb-4 bg-gradient-to-br text-white overflow-hidden', hero.gradient)}>
        {/* Subtle pattern overlay */}
        <div
          className="absolute inset-0 opacity-25 pointer-events-none"
          style={{
            backgroundImage:
              'radial-gradient(circle at 100% 0%, rgba(255,255,255,0.35) 0%, transparent 50%), radial-gradient(circle at 0% 100%, rgba(255,255,255,0.15) 0%, transparent 50%)',
          }}
        />

        {/* Type icon watermark, gigantic, in corner */}
        <div className="absolute -right-2 -bottom-4 text-[110px] leading-none opacity-[0.10] select-none pointer-events-none">
          {emoji}
        </div>

        {/* Score chip + name */}
        <div className="relative flex items-start gap-3.5">
          <div className={cn('flex flex-col items-center justify-center w-[60px] h-[60px] rounded-2xl shadow-md ring-1 ring-white/40 shrink-0', hero.chip)}>
            <div className="font-display font-black text-[26px] leading-none tracking-tight">{b.complianceScore}</div>
            <div className="text-[8.5px] font-sans uppercase tracking-[0.18em] opacity-70 mt-0.5">/ 100</div>
          </div>
          <div className="min-w-0 flex-1 pt-0.5">
            <h3 className="font-display font-extrabold text-[17px] leading-[1.15] line-clamp-2 tracking-tight">
              {b.name}
            </h3>
            <div className="text-[10.5px] text-white/85 mt-1.5 flex items-center gap-1.5">
              <span className="opacity-95">{emoji}</span>
              <span className="font-semibold">{typeLabel}</span>
              <span className="text-white/40">·</span>
              <span>{b.city ?? '—'}</span>
              {b.area && (<><span className="text-white/40">·</span><span className="truncate">{b.area}</span></>)}
            </div>
          </div>
        </div>

        {/* Status strap */}
        <div className="relative mt-3.5 flex items-center justify-between gap-2 pt-2.5 border-t border-white/20">
          <div className="flex items-center gap-1.5">
            <span className="text-[12px] leading-none">{hero.statusEmoji}</span>
            <span className="font-display font-bold text-[11.5px] uppercase tracking-[0.14em]">{hero.statusLabel}</span>
          </div>
          <div className="font-sans text-[10px] uppercase tracking-[0.16em] text-white/85">
            {activeCount} / 3 active
          </div>
        </div>
      </div>

      {/* =========== ZONE 2 — Cert lights =========== */}
      <div className="px-5 pt-3 pb-3">
        <div className="grid grid-cols-3 gap-2">
          <CertLight cert={b.coc} />
          <CertLight cert={b.noc} />
          <CertLight cert={b.amc} />
        </div>
      </div>

      {/* =========== ZONE 3 — Footer =========== */}
      <div className="px-5 py-2.5 border-t border-neutral-100 bg-neutral-25/60 flex items-center gap-2">
        <span className="font-sans text-[9px] uppercase tracking-[0.16em] text-neutral-400 shrink-0">{b.premisesNumber}</span>
        <span className="text-neutral-200">|</span>
        <span className="flex-1 min-w-0 text-[10.5px] truncate text-neutral-600">
          {operator
            ? <>by <span className="text-ink-950 font-semibold">{operator}</span></>
            : <span className="italic text-neutral-400">no operator</span>}
        </span>
        <span className="text-[10px] text-neutral-400 group-hover:text-doe-red group-hover:translate-x-0.5 transition flex items-center gap-1 shrink-0">
          Open <span className="leading-none">›</span>
        </span>
      </div>
    </Link>
  );
}

// =============================================================================
// CertLight — a "status indicator" tile. The whole tile takes the status colour
// (background tint + text). Module letters across the top, status word below.
// Reads at a glance: green = good, amber = warning, red = bad, grey = absent.
// =============================================================================
function CertLight({ cert }: { cert: CertSummary }) {
  const meta = CERT_META[cert.module];
  const tone = statusTone(cert.status);

  return (
    <div className={cn('relative rounded-lg overflow-hidden ring-1 transition group-hover:ring-2 group-hover:ring-offset-1', tone.bg, tone.ring)}>
      <div className="px-2 py-2 text-center">
        <div className="flex items-center justify-center gap-1">
          <span className={cn('w-1.5 h-1.5 rounded-full', tone.dot, cert.status === 'pending' && 'animate-pulse')} />
          <span className={cn('text-[10px] font-mono font-extrabold tracking-[0.18em]', meta.iconText)}>
            {meta.shortLabel}
          </span>
        </div>
        <div className={cn('text-[11px] font-bold leading-tight mt-1', tone.text)}>
          {shortStatus(cert)}
        </div>
        {cert.inFlight && (
          <div className="text-[8.5px] font-mono mt-0.5 text-action-orange-deep flex items-center justify-center gap-0.5">
            <span>↻</span><span className="uppercase tracking-wider">open</span>
          </div>
        )}
      </div>
    </div>
  );
}

function statusTone(status: CertSummary['status']) {
  switch (status) {
    case 'active':
      return { bg: 'bg-success-soft/60', ring: 'ring-success-500/25', dot: 'bg-success-500', text: 'text-success-500' };
    case 'expiring':
      return { bg: 'bg-warning-soft/70', ring: 'ring-warning-500/30', dot: 'bg-warning-500', text: 'text-warning-500' };
    case 'pending':
      return { bg: 'bg-info-soft/70',    ring: 'ring-info-500/25',    dot: 'bg-info-500',    text: 'text-info-500' };
    case 'expired':
    case 'rejected':
      return { bg: 'bg-danger-soft/70',  ring: 'ring-danger-500/25',  dot: 'bg-danger-500',  text: 'text-danger-500' };
    case 'cancelled':
      return { bg: 'bg-neutral-100',     ring: 'ring-neutral-200',    dot: 'bg-neutral-400', text: 'text-neutral-500' };
    default:
      return { bg: 'bg-neutral-50',      ring: 'ring-neutral-100',    dot: 'bg-neutral-300', text: 'text-neutral-400' };
  }
}

function shortStatus(c: CertSummary): string {
  switch (c.status) {
    case 'active':    return 'Active';
    case 'expiring':  return c.statusLabel.replace(/^Expiring in /, '');
    case 'pending':   return 'Pending';
    case 'expired':   return 'Expired';
    case 'rejected':  return 'Rejected';
    case 'cancelled': return 'Cancelled';
    default:          return 'Not on file';
  }
}
