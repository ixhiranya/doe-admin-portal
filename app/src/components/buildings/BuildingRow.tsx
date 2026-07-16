import { Link } from 'react-router-dom';
import { cn } from '../../lib/utils';
import { buildingTypeLabel } from './BuildingTypeIcon';
import type { Building360, CertSummary } from '../../services/buildings';

// ============================================================================
// Building 360 — Editorial List Row
//
// Hierarchy: COMPANY (facility manager) owns BUILDINGS; each building's
// operational state is defined by three certificates (AMC + NOC + COC).
//
// Row anatomy (left → right, three zones):
//
//   ┌──────────────────────────┬──────────────────────────────┬─────────┐
//   │ IDENTITY                 │ CERTIFICATE SIGNALS          │ SCORE   │
//   │  • Building name (hero)  │  AMC · NOC · COC tiles       │  87     │
//   │  • Company (FM)          │  status + expiry date each   │  /100   │
//   │  • Type · City           │                              │  level  │
//   └──────────────────────────┴──────────────────────────────┴─────────┘
//
// Subdued palette — no full-bleed colour. Status carried by a small dot,
// a tone-coloured word, and a thin spine on the right edge of each row.
// ============================================================================

const LEVEL_SPINE: Record<Building360['complianceLevel'], string> = {
  green: 'bg-success-500',
  amber: 'bg-action-orange',
  red:   'bg-doe-red',
};
const LEVEL_TEXT: Record<Building360['complianceLevel'], string> = {
  green: 'text-success-500',
  amber: 'text-action-orange-deep',
  red:   'text-doe-red',
};
const LEVEL_LABEL: Record<Building360['complianceLevel'], string> = {
  green: 'Compliant',
  amber: 'Partial',
  red:   'At Risk',
};

export function BuildingsListHeader() {
  return (
    <div className="hidden lg:grid grid-cols-[minmax(280px,1.4fr)_minmax(420px,2fr)_120px] gap-6 items-center px-5 py-2.5 text-[9.5px] font-sans uppercase tracking-[0.2em] text-neutral-400 border-b border-neutral-100 bg-neutral-25/40">
      <div>Building · Company</div>
      <div>Operational Certificates</div>
      <div className="text-right">Compliance</div>
    </div>
  );
}

export function BuildingRow({ b }: { b: Building360 }) {
  const typeLabel = buildingTypeLabel(b.premisesType);
  const company = b.fmCompany ?? b.gasAmcContractor ?? b.gasInstallContractor;

  return (
    <Link
      to={`/buildings/${b.id}`}
      className="group relative grid grid-cols-1 lg:grid-cols-[minmax(280px,1.4fr)_minmax(420px,2fr)_120px] gap-6 items-center px-5 py-4 hover:bg-neutral-25 transition border-b border-neutral-100 last:border-b-0"
    >
      {/* ============================================================
          ZONE 1 — Identity
          ============================================================ */}
      <div className="min-w-0">
        <div className="flex items-baseline gap-2 mb-0.5">
          <h3 className="font-display font-bold text-[15px] text-ink-950 leading-snug truncate group-hover:text-doe-red transition" title={b.name}>
            {b.name}
          </h3>
          <span className="font-sans text-[9.5px] uppercase tracking-[0.16em] text-neutral-400 shrink-0">
            {b.premisesNumber}
          </span>
        </div>
        <div className="text-[11.5px] text-neutral-500 truncate">
          {typeLabel}
          <span className="text-neutral-300 mx-1.5">·</span>
          {b.city ?? '—'}
          {b.area && <><span className="text-neutral-300 mx-1.5">·</span>{b.area}</>}
        </div>
        <div className="text-[11px] mt-1.5 truncate flex items-center gap-1.5">
          <span className="text-[8.5px] font-sans font-bold uppercase tracking-[0.18em] text-neutral-300">Co</span>
          {company ? (
            <span className="text-ink-950 font-semibold truncate" title={company}>{company}</span>
          ) : (
            <span className="text-neutral-400 italic">No managing company</span>
          )}
        </div>
      </div>

      {/* ============================================================
          ZONE 2 — Operational certificate signals
          ============================================================ */}
      <div className="grid grid-cols-3 gap-3">
        <CertTile cert={b.amc} module="AMC" subtitle="Annual Maintenance" />
        <CertTile cert={b.noc} module="NOC" subtitle="No Objection"        />
        <CertTile cert={b.coc} module="COC" subtitle="Completion"          />
      </div>

      {/* ============================================================
          ZONE 3 — Compliance score
          ============================================================ */}
      <div className="flex items-center justify-end gap-3 self-stretch">
        <div className="text-right">
          <div className="flex items-baseline justify-end gap-0.5">
            <span className={cn('font-display font-bold text-[22px] leading-none', LEVEL_TEXT[b.complianceLevel])}>
              {b.complianceScore}
            </span>
            <span className="text-[10px] font-mono text-neutral-400">/100</span>
          </div>
          <div className={cn('text-[9.5px] font-sans uppercase tracking-[0.18em] mt-1', LEVEL_TEXT[b.complianceLevel])}>
            {LEVEL_LABEL[b.complianceLevel]}
          </div>
        </div>

        {/* Right-edge status spine — the only sustained block of colour */}
        <div className={cn('w-[3px] self-stretch rounded-full my-1', LEVEL_SPINE[b.complianceLevel])} />
      </div>
    </Link>
  );
}

// =============================================================================
// CertTile — one of three "operational signal" cells. Editorial layout: module
// abbrev at the top, a status word + dot in the middle, an expiry hint at the
// bottom. No coloured backgrounds — colour only on the dot + the status word.
// =============================================================================
function CertTile({ cert, module, subtitle }: { cert: CertSummary; module: string; subtitle: string }) {
  const tone = certTone(cert.status);
  const expiry = formatExpiry(cert);

  return (
    <div className={cn('relative rounded-lg px-3 py-2 ring-1', tone.bg, tone.ring)}>
      <div className="flex items-center gap-1.5">
        <span className={cn('text-[10px] font-mono font-extrabold tracking-[0.2em]', tone.heading)}>{module}</span>
        <span className="text-[9px] text-neutral-500 truncate">{subtitle}</span>
      </div>
      <div className="flex items-center gap-1.5 mt-1.5">
        <span className={cn(
          'w-1.5 h-1.5 rounded-full shrink-0',
          tone.dot,
          cert.status === 'pending' && 'animate-pulse',
        )} />
        <span className={cn('text-[12px] font-semibold leading-none', tone.text)}>
          {primaryStatus(cert)}
        </span>
      </div>
      <div className="text-[10.5px] text-neutral-600 mt-1 truncate" title={expiry.full ?? undefined}>
        {expiry.short}
      </div>
      {cert.inFlight && (
        <div className="absolute -top-1.5 right-2 px-1 py-px rounded-sm bg-white text-[8.5px] font-sans font-bold uppercase tracking-[0.14em] text-action-orange-deep flex items-center gap-0.5 shadow-doe-xs ring-1 ring-action-orange/30">
          <span>↻</span> open
        </div>
      )}
    </div>
  );
}

// Three-state tint system: green = good, orange = caution/pending, red = bad.
// Keeps the cells visually distinct at a glance while staying soft enough
// to read in a grid of many rows.
function certTone(status: CertSummary['status']) {
  switch (status) {
    case 'active':
      return {
        bg:      'bg-success-soft/60',
        ring:    'ring-success-500/15',
        dot:     'bg-success-500',
        text:    'text-success-500',
        heading: 'text-success-500',
      };
    case 'expiring':
    case 'pending':
      return {
        bg:      'bg-action-orange-soft/70',
        ring:    'ring-action-orange/20',
        dot:     status === 'pending' ? 'bg-info-500' : 'bg-action-orange',
        text:    'text-action-orange-deep',
        heading: 'text-action-orange-deep',
      };
    case 'expired':
    case 'rejected':
    case 'cancelled':
      return {
        bg:      'bg-doe-red-soft/60',
        ring:    'ring-doe-red/15',
        dot:     status === 'cancelled' ? 'bg-neutral-400' : 'bg-doe-red',
        text:    'text-doe-red',
        heading: 'text-doe-red',
      };
    default:  // 'none'
      return {
        bg:      'bg-doe-red-soft/40',
        ring:    'ring-doe-red/10',
        dot:     'bg-neutral-300',
        text:    'text-neutral-500',
        heading: 'text-doe-red/70',
      };
  }
}

// Headline status word — keeps text short for the dense row.
function primaryStatus(c: CertSummary): string {
  switch (c.status) {
    case 'active':    return 'Active';
    case 'expiring':  return 'Expiring';
    case 'pending':   return 'In Review';
    case 'expired':   return 'Expired';
    case 'rejected':  return 'Rejected';
    case 'cancelled': return 'Cancelled';
    default:          return 'Not on file';
  }
}

// Secondary line: an informative hint — expiry date, days remaining, or
// "pending DOE review" for in-flight certs.
function formatExpiry(c: CertSummary): { short: string; full?: string } {
  if (c.status === 'active' && c.expiresAt) {
    const days = (new Date(c.expiresAt).getTime() - Date.now()) / (24 * 3600 * 1000);
    return {
      short: `Valid until ${shortMonth(c.expiresAt)}`,
      full:  `Expires ${formatFullDate(c.expiresAt)} — ${Math.round(days)} days remaining`,
    };
  }
  if (c.status === 'expiring' && c.expiresAt) {
    const days = Math.round((new Date(c.expiresAt).getTime() - Date.now()) / (24 * 3600 * 1000));
    return {
      short: `${days} days left · renew soon`,
      full:  `Expires ${formatFullDate(c.expiresAt)}`,
    };
  }
  if (c.status === 'pending') {
    return { short: c.applicationNumber ? `Ref ${c.applicationNumber}` : 'Pending DOE review' };
  }
  if (c.status === 'expired')   return { short: c.expiresAt ? `Lapsed ${shortMonth(c.expiresAt)}` : 'Expired' };
  if (c.status === 'rejected')  return { short: c.applicationNumber ? `Rejected ${c.applicationNumber}` : 'Last app rejected' };
  if (c.status === 'cancelled') return { short: c.applicationNumber ? `Cancelled ${c.applicationNumber}` : 'Cancelled' };
  return { short: '—' };
}

function shortMonth(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { month: 'short', year: 'numeric' });
}
function formatFullDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' });
}
