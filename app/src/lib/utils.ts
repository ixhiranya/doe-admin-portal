import clsx, { type ClassValue } from 'clsx';

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

export function formatDate(iso?: string, opts: Intl.DateTimeFormatOptions = { day: '2-digit', month: 'short', year: 'numeric' }) {
  if (!iso) return '—';
  try { return new Intl.DateTimeFormat('en-GB', opts).format(new Date(iso)); }
  catch { return '—'; }
}

export function formatDateTime(iso?: string) {
  return formatDate(iso, { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export function formatBytes(n: number) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(2)} MB`;
}

export function formatAED(n: number) {
  return new Intl.NumberFormat('en-AE', { style: 'currency', currency: 'AED', maximumFractionDigits: 0 }).format(n);
}

export function daysBetween(a: string, b: string) {
  return Math.round((new Date(b).getTime() - new Date(a).getTime()) / (24 * 3600 * 1000));
}

// Ahmed Al Mazrouei (adnoc.dist.2) is an entity-submitter whose navigation is
// scoped to Petroleum Products → Submissions only, so he lands directly on the
// submissions screen instead of the centralized PPS dashboard.
export const AHMED_ID = 'adnoc.dist.2';
// Omar Al Suwaidi (pps.internal) is a DoE PPS Approver whose navigation is
// scoped to Petroleum Products only (PPS Dashboard · Submissions · Submission
// Monitoring). He lands on the PPS petroleum dashboard (Mariam's dashboard).
export const OMAR_ID = 'pps.internal';
// True for the finalized Petroleum-Products experience (Ahmed entity submitter +
// Omar internal approver). Drives the redesigned Submissions UX across roles.
export function usesFinalizedPps(userId?: string): boolean {
  return userId === AHMED_ID || userId === OMAR_ID;
}
export function ppsLandingPath(userId?: string): string {
  if (userId === AHMED_ID) return '/pps/submissions';
  if (userId === OMAR_ID) return '/pps/dashboard';
  return '/pps-dashboard';
}
