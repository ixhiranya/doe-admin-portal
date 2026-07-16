// =============================================================================
// Gas Register · Compliance & Certificate Validity Tracking — BN 14 of the SDD.
// -----------------------------------------------------------------------------
// Tracks four certificates per customer / facility and computes an overall
// Compliance Rate. The formula, banding and overlays below are an exact
// implementation of SDD §3.14.
//
//   Compliance Rate (%) = ( Σ V_i ) / N × 100
//     where V_i = 1 if Status_i = "YES" AND Expiry_Date_i is present AND
//                       Expiry_Date_i >= Today
//                 0 otherwise
//
//   Banding:
//     100%        Fully Compliant   (green)
//     75% – 99%   Minor Gap         (yellow)
//     50% – 74%   At Risk           (amber)
//     <50%        Non-Compliant     (red)
//
//   Expiring Soon overlay: 0 < (Expiry_Date_i − Today) ≤ 30 days  → amber chip
//   Expired overlay:       Status=YES AND Expiry_Date_i < Today  → red chip
// =============================================================================

// ---------------------------------------------------------------------------
// 1. Cert taxonomy
// ---------------------------------------------------------------------------
export type CertSlot = 'istifaa' | 'doeNoc' | 'amcGas' | 'gasTpiCoc';

export interface CertDef {
  id: CertSlot;
  label: string;
  shortLabel: string;
  source: string;                            // Source-of-truth integration
  expiryWindowStart: string;                 // First valid Expiry_Date allowed (per SDD §3.14.1)
  expiryWindowEnd: string;                   // Last valid Expiry_Date allowed
  validityYears: number;                     // Typical validity from issuance
}

// Validity windows are taken directly from the master sheet "Customers Data
// Base and Compliance — Template" per SDD §3.14.1.
export const CERTS: CertDef[] = [
  { id: 'istifaa',   label: 'ISTIFAA',     shortLabel: 'ISTIFAA',  source: 'ADCDA integration',           expiryWindowStart: '2024-01-01', expiryWindowEnd: '2030-01-01', validityYears: 6 },
  { id: 'doeNoc',    label: 'DOE NOC',     shortLabel: 'DOE NOC',  source: 'DOE Licence module',          expiryWindowStart: '2024-01-01', expiryWindowEnd: '2028-01-01', validityYears: 4 },
  { id: 'amcGas',    label: 'AMC Gas',     shortLabel: 'AMC',      source: 'DOE AMC module',              expiryWindowStart: '2024-01-01', expiryWindowEnd: '2028-01-01', validityYears: 4 },
  { id: 'gasTpiCoc', label: 'GAS TPI COC', shortLabel: 'TPI COC',  source: 'TPI integration / manual',    expiryWindowStart: '2024-01-01', expiryWindowEnd: '2028-01-01', validityYears: 4 },
];

export function certById(id: CertSlot): CertDef | undefined {
  return CERTS.find((c) => c.id === id);
}

// ---------------------------------------------------------------------------
// 2. Per-record state
// ---------------------------------------------------------------------------
export interface CertState {
  status: 'YES' | 'NO' | null;   // null means blank — treated as invalid (V_i = 0)
  expiryDate: string | null;     // ISO date or null — null means blank (V_i = 0)
}

/** A customer's / facility's complete certificate set. */
export type CertSet = Record<CertSlot, CertState>;

export function emptyCertSet(): CertSet {
  return {
    istifaa:   { status: null, expiryDate: null },
    doeNoc:    { status: null, expiryDate: null },
    amcGas:    { status: null, expiryDate: null },
    gasTpiCoc: { status: null, expiryDate: null },
  };
}

// ---------------------------------------------------------------------------
// 3. Live computation — SDD §3.14.2 / §3.14.4 / §3.14.5
// ---------------------------------------------------------------------------

export interface CertEvaluation {
  slot: CertSlot;
  valid: 0 | 1;
  expiringSoon: boolean;   // 0 < (Expiry − Today) ≤ 30 d
  expired: boolean;        // Status=YES AND Expiry < Today
  daysToExpiry: number | null;
}

export type ComplianceBand = 'Fully Compliant' | 'Minor Gap' | 'At Risk' | 'Non-Compliant';

export interface ComplianceResult {
  rate: number;                  // 0..100, integer
  band: ComplianceBand;
  evaluations: CertEvaluation[];
  applicableCount: number;       // N — number of certs applicable (default 4)
  validCount: number;            // Σ V_i
  anyExpiringSoon: boolean;
  anyExpired: boolean;
}

/**
 * Determine the today date in "Asia/Dubai" terms — for the prototype we use
 * the local date which is close enough; production should query the platform
 * time-zone service.
 */
function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Evaluate a single certificate against today.
 */
export function evaluateCert(slot: CertSlot, state: CertState): CertEvaluation {
  const today = todayISO();
  const hasStatusYes = state.status === 'YES';
  const hasExpiry    = !!state.expiryDate;
  const expiryISO    = state.expiryDate ?? '';
  const dExp = hasExpiry ? Math.round((new Date(expiryISO).getTime() - new Date(today).getTime()) / 86400000) : null;
  const isInFuture = hasExpiry && expiryISO >= today;
  const valid: 0 | 1 = (hasStatusYes && hasExpiry && isInFuture) ? 1 : 0;
  const expired      = hasStatusYes && hasExpiry && !isInFuture;
  const expiringSoon = valid === 1 && dExp !== null && dExp > 0 && dExp <= 30;
  return { slot, valid, expiringSoon, expired, daysToExpiry: dExp };
}

/**
 * Live Compliance computation for a CertSet. `applicable` is a 4-entry map
 * — defaults to all true if missing (initial deployment per SDD §3.14.3).
 */
export function computeCompliance(
  set: CertSet,
  applicable?: Partial<Record<CertSlot, boolean>>,
): ComplianceResult {
  const evaluations = CERTS.map((c) => evaluateCert(c.id, set[c.id]));
  const applicableSlots = CERTS.filter((c) => applicable?.[c.id] !== false);
  const N = applicableSlots.length;
  const sumV = applicableSlots.reduce((s, c) => s + (evaluations.find((e) => e.slot === c.id)!.valid), 0);
  const rate = N === 0 ? 0 : Math.round((sumV / N) * 100);

  const band: ComplianceBand =
    rate === 100          ? 'Fully Compliant' :
    rate >= 75            ? 'Minor Gap'       :
    rate >= 50            ? 'At Risk'         :
                            'Non-Compliant';

  return {
    rate,
    band,
    evaluations,
    applicableCount: N,
    validCount: sumV,
    anyExpiringSoon: evaluations.some((e) => e.expiringSoon),
    anyExpired:      evaluations.some((e) => e.expired),
  };
}

/**
 * Tailwind colour tokens per compliance band — used by the UI to colour pills,
 * heatmap cells, dashboard tiles.
 */
export function bandTone(band: ComplianceBand): { pill: string; dot: string; ring: string; label: string } {
  switch (band) {
    case 'Fully Compliant':
      return { pill: 'bg-emerald-50 text-emerald-700',  dot: 'bg-emerald-500', ring: 'ring-emerald-300', label: 'Green' };
    case 'Minor Gap':
      return { pill: 'bg-yellow-50 text-yellow-700',    dot: 'bg-yellow-500',  ring: 'ring-yellow-300',  label: 'Yellow' };
    case 'At Risk':
      return { pill: 'bg-amber-50 text-amber-700',      dot: 'bg-amber-500',   ring: 'ring-amber-300',   label: 'Amber' };
    case 'Non-Compliant':
      return { pill: 'bg-rose-50 text-doe-red',         dot: 'bg-doe-red',     ring: 'ring-rose-300',    label: 'Red' };
  }
}

/**
 * Cert-state convenience builders for seed data — produce realistic mixes
 * without each call site doing date arithmetic.
 */
export function certActive(yearsFromNow: number = 2): CertState {
  const d = new Date();
  d.setFullYear(d.getFullYear() + yearsFromNow);
  return { status: 'YES', expiryDate: d.toISOString().slice(0, 10) };
}
export function certExpiringSoon(daysFromNow: number = 14): CertState {
  const d = new Date();
  d.setDate(d.getDate() + daysFromNow);
  return { status: 'YES', expiryDate: d.toISOString().slice(0, 10) };
}
export function certExpired(daysAgo: number = 60): CertState {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return { status: 'YES', expiryDate: d.toISOString().slice(0, 10) };
}
export function certMissing(): CertState {
  return { status: 'NO', expiryDate: null };
}
