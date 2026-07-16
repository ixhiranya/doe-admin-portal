import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { MapContainer, TileLayer, CircleMarker, Tooltip as LeafletTooltip } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { useApps } from '../../store/apps';
import { deriveBuildings } from '../../services/buildings';
import {
  buildInspections,
  buildViolations,
  buildPetroleumPermits,
  buildConformityCertificates,
  buildAlerts,
  executiveHeadline,
  todaysActivity,
  sliceCounts,
  inYTD,
} from './dashboardData';
import {
  StatTile, RadialGauge, Pulse, AnimatedNumber,
  StaggerGrid, StaggerItem, MotionFadeIn, motion,
  TrendLineChart, ResponsiveContainer,
  FilterChips, LastRefreshed,
  KpiMiniBars, KpiRadial, KpiSegmentBar, KpiDonutMini, KpiSeverityDots, KpiSplitStat,
} from './components';
import { isIssued } from './dashboardData';
import type { AlertItem } from './dashboardData';
import type { Module } from '../../types';
import { cn } from '../../lib/utils';

// ============================================================================
// Executive Landing — compact, monochrome, single-accent redesign.
// Palette discipline:
//   • White cards on neutral-25 body
//   • ink-950 / neutral text only
//   • action-orange used ONLY on the hero compliance metric + primary CTAs
//   • success-green / doe-red only for status indicators (healthy / critical)
//   • No decorative gradients, no purple / teal / blue accents
// ============================================================================

const CITIES = ['Abu Dhabi', 'Al Ain', 'Al Dhafra'] as const;
const SECTORS = ['Residential', 'Commercial', 'Industrial', 'Mixed', 'Other'] as const;

export function ExecutiveLandingPage() {
  const apps = useApps((s) => s.apps);
  const [cities, setCities] = useState<string[]>([]);
  const [sectors, setSectors] = useState<string[]>([]);

  const filteredApps = useMemo(() => apps.filter((a) => {
    if (cities.length > 0) {
      const c = a.fieldValues?.city || a.fieldValues?.emirate || 'Abu Dhabi';
      if (!cities.includes(c)) return false;
    }
    if (sectors.length > 0) {
      const s = a.fieldValues?.premisesType || 'Other';
      if (!sectors.includes(s)) return false;
    }
    return true;
  }), [apps, cities, sectors]);

  const buildings        = useMemo(() => deriveBuildings(filteredApps), [filteredApps]);
  const inspections      = useMemo(() => buildInspections(filteredApps), [filteredApps]);
  const violations       = useMemo(() => buildViolations(inspections), [inspections]);
  const petroleumPermits = useMemo(() => buildPetroleumPermits(), []);
  const conformityCerts  = useMemo(() => buildConformityCertificates(filteredApps), [filteredApps]);
  const headline         = useMemo(() => executiveHeadline(filteredApps, inspections, violations, petroleumPermits, buildings), [filteredApps, inspections, violations, petroleumPermits, buildings]);
  const activity         = useMemo(() => todaysActivity(filteredApps, inspections, violations, conformityCerts), [filteredApps, inspections, violations, conformityCerts]);
  const alerts           = useMemo(() => buildAlerts(filteredApps, inspections, violations), [filteredApps, inspections, violations]);

  const trendLine = headline.gasComplianceSparkline.map((p) => ({ month: p.month, pct: p.pct }));
  const heroDelta = Number((headline.gasCompliancePct - headline.gasCompliancePctPrev).toFixed(1));

  // Per-tile data derived from the underlying entities so each visualisation
  // says something specific about its module.
  const cocSlice  = useMemo(() => sliceCounts(filteredApps, 'coc'),  [filteredApps]);
  // AMC bar chart — last 12 buckets of AMC approval activity. Tries weeks
  // first (live operational view), falls back to months if the dataset's
  // approval dates are spread further back (prototype seed has decision dates
  // ranging across the year).
  const amcWeekly = useMemo(() => {
    const amcApps = filteredApps.filter((a) => a.module === 'amc' && a.approvedOn);
    const now = new Date();
    const weekly: { value: number }[] = [];
    for (let w = 11; w >= 0; w--) {
      const start = new Date(now); start.setDate(start.getDate() - (w + 1) * 7);
      const end   = new Date(now); end.setDate(end.getDate() - w * 7);
      const count = amcApps.filter((a) => new Date(a.approvedOn!) >= start && new Date(a.approvedOn!) < end).length;
      weekly.push({ value: count });
    }
    if (weekly.some((b) => b.value > 0)) return weekly;
    // Fall back to monthly buckets — broader window catches more seed data.
    const monthly: { value: number }[] = [];
    for (let m = 11; m >= 0; m--) {
      const start = new Date(now.getFullYear(), now.getMonth() - m, 1);
      const end   = new Date(now.getFullYear(), now.getMonth() - m + 1, 1);
      const count = amcApps.filter((a) => new Date(a.approvedOn!) >= start && new Date(a.approvedOn!) < end).length;
      monthly.push({ value: count });
    }
    return monthly;
  }, [filteredApps]);
  // MAES applicant-type segment split
  const maesByType = useMemo(() => {
    const m: Record<string, number> = { agent: 0, manufacturer: 0, distributor: 0 };
    filteredApps.filter((a) => a.module === 'maes' && isIssued(a)).forEach((a) => {
      const t = (a.fieldValues?.applicantType || 'agent').toLowerCase();
      m[t] = (m[t] ?? 0) + 1;
    });
    return [
      { label: 'Agent',  value: m.agent,        tone: 'violet' as const },
      { label: 'Mfr.',   value: m.manufacturer, tone: 'indigo' as const },
      { label: 'Distr.', value: m.distributor,  tone: 'teal' as const },
    ];
  }, [filteredApps]);
  // Petroleum permit-type donut (top 3) — always returns 3 entries even if
  // the active subset has fewer distinct types, so the donut always renders.
  const petTopTypes = useMemo(() => {
    const m: Record<string, number> = {};
    petroleumPermits.filter((p) => p.status === 'Active').forEach((p) => { m[p.permitType] = (m[p.permitType] ?? 0) + 1; });
    const sorted = Object.entries(m).sort((a, b) => b[1] - a[1]);
    const top = sorted.slice(0, 3);
    const tones = ['orange', 'amber', 'rose'] as const;
    while (top.length < 3) top.push([`Type ${top.length + 1}`, 0]);
    return top.map(([label, value], i) => ({
      label: label.length > 10 ? label.slice(0, 10) + '…' : label,
      value,
      tone: tones[i],
    }));
  }, [petroleumPermits]);
  // Inspection source split (DoE vs TPI YTD)
  const inspSplit = useMemo(() => {
    const ytd = inspections.filter((i) => inYTD(i.date));
    return [
      { label: 'DoE', value: ytd.filter((i) => i.source === 'DoE Field').length,   tone: 'indigo' as const },
      { label: 'TPI', value: ytd.filter((i) => i.source === 'TPI External').length, tone: 'teal'   as const },
    ];
  }, [inspections]);
  // Open violations by severity (severity dots)
  const violationSeverity = useMemo(() => {
    return [
      { label: 'Critical', value: violations.filter((v) => v.status === 'Open' && v.severity === 'Critical').length, tone: 'rose' as const },
      { label: 'Major',    value: violations.filter((v) => v.status === 'Open' && v.severity === 'Major').length,    tone: 'amber' as const },
      { label: 'Minor',    value: violations.filter((v) => v.status === 'Open' && v.severity === 'Minor').length,    tone: 'slate' as const },
    ];
  }, [violations]);
  // NOC + AMC dual-coverage radial
  const nocCoverageNumerator = useMemo(() => {
    const amcKeys = new Set(filteredApps.filter((a) => a.module === 'amc' && isIssued(a)).map((a) => (a.fieldValues?.buildingNo || a.fieldValues?.premisesNumber || a.id)));
    return filteredApps.filter((a) => a.module === 'noc' && isIssued(a)).filter((a) => amcKeys.has(a.fieldValues?.buildingNo || a.fieldValues?.premisesNumber || a.id)).length;
  }, [filteredApps]);
  const submittedTotal = activity.submittedToday.reduce((s, x) => s + x.count, 0);
  const approvedTotal  = activity.decisionsToday.reduce((s, d) => s + d.approvals, 0);
  const rejectedTotal  = activity.decisionsToday.reduce((s, d) => s + d.rejections, 0);
  const violationsTotal = activity.violationsToday.critical + activity.violationsToday.major + activity.violationsToday.minor;
  const buildingsGreen = buildings.filter((b) => b.complianceLevel === 'green').length;
  const buildingsAmber = buildings.filter((b) => b.complianceLevel === 'amber').length;
  const buildingsRed   = buildings.filter((b) => b.complianceLevel === 'red').length;

  return (
    <div className="bg-neutral-25 min-h-full">
      {/* ───── HEADER ───── */}
      <div className="bg-white border-b border-neutral-100">
        <div className="max-w-[1440px] mx-auto px-6 py-4">
          <div className="flex items-center justify-between gap-6 flex-wrap">
            <div>
              <div className="inline-flex items-center gap-1.5 text-[10px] font-sans uppercase tracking-[0.2em] text-neutral-500 mb-1">
                <Pulse size={6} />
                PPS Centralized Dashboard
              </div>
              <h1 className="font-display text-[20px] font-bold text-ink-950 leading-tight">Executive Landing</h1>
            </div>
            <div className="flex items-center gap-3 flex-wrap text-[11.5px]">
              <FilterChips label="City" options={[...CITIES]} value={cities as any} onChange={setCities as any} />
              <FilterChips label="Sector" options={[...SECTORS]} value={sectors as any} onChange={setSectors as any} />
              <span className="w-px h-5 bg-neutral-200" />
              <LastRefreshed />
              <button className="h-7 px-2.5 rounded border border-neutral-200 text-ink-950 text-[11px] font-semibold hover:bg-neutral-50 transition flex items-center gap-1">
                <ExportIcon /> Export
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ───── BODY ───── */}
      <div className="max-w-[1440px] mx-auto px-6 py-5 space-y-5">

        {/* ============ HERO BENTO ROW ============ */}
        <section className="grid grid-cols-12 gap-3">
          {/* Hero compliance card — dark navy gradient, orange gauge for contrast */}
          <MotionFadeIn className="col-span-12 lg:col-span-5">
            <div className="relative h-full overflow-hidden rounded-xl p-3.5 text-white bg-gradient-to-br from-ink-950 via-[#1E2128] to-[#11131A] shadow-doe-md">
              <div className="absolute -top-14 -right-14 w-44 h-44 rounded-full bg-action-orange/20 blur-3xl pointer-events-none" />
              <div className="absolute -bottom-10 -left-8 w-32 h-32 rounded-full bg-blue-500/10 blur-3xl pointer-events-none" />
              <div className="relative flex items-center gap-4 h-full">
                <RadialGauge value={headline.gasCompliancePct} size={112} stroke={10} track="rgba(255,255,255,0.08)" />
                <div className="flex-1 min-w-0">
                  <div className="text-[9.5px] font-sans uppercase tracking-[0.2em] text-white/60 mb-1">Gas Systems Compliance</div>
                  <div className="text-[11.5px] text-white/80 leading-snug">
                    <strong className="text-white">{headline.gasComplianceTotal.toLocaleString()}</strong> buildings ·
                    all 3 permits active &amp; no Critical / Major violations.
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    <span className={cn(
                      'inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-semibold tabular-nums',
                      heroDelta >= 0 ? 'bg-emerald-500/25 text-emerald-200' : 'bg-doe-red/30 text-rose-200',
                    )}>
                      {heroDelta >= 0 ? '▲' : '▼'} {Math.abs(heroDelta).toFixed(1)}%
                    </span>
                    <span className="text-[10.5px] text-white/55">vs previous period</span>
                  </div>
                  <Link to="/pps-dashboard/gas-sector-compliance" className="inline-flex items-center gap-1 mt-2.5 text-[11px] font-semibold text-action-orange hover:text-white transition group">
                    Open Gas Sector Dashboard
                    <span className="transition-transform group-hover:translate-x-0.5">→</span>
                  </Link>
                </div>
              </div>
            </div>
          </MotionFadeIn>

          {/* 12-month trend — subtle gradient background, ink line */}
          <MotionFadeIn className="col-span-12 lg:col-span-4" delay={0.05}>
            <div className="relative h-full overflow-hidden rounded-xl border border-neutral-200 shadow-doe-sm bg-gradient-to-br from-white via-neutral-25 to-neutral-50">
              <div className="absolute -top-16 -right-10 w-32 h-32 rounded-full bg-blue-500/5 blur-3xl pointer-events-none" />
              <div className="relative p-3.5">
                <div className="flex items-center justify-between mb-1.5">
                  <div>
                    <div className="text-[9.5px] font-sans uppercase tracking-[0.18em] text-neutral-500">12-Month Trend</div>
                    <div className="text-[12px] font-semibold text-ink-950 mt-0.5">Compliance %</div>
                  </div>
                  <div className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-emerald-50 text-emerald-700 text-[9.5px] font-mono font-semibold">
                    Target ≥ 85
                  </div>
                </div>
                <div style={{ height: 110 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <TrendLineChart data={trendLine} xKey="month" yKey="pct" color="#0F0F10" />
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </MotionFadeIn>

          {/* Today snapshot — action-orange gradient */}
          <MotionFadeIn className="col-span-12 lg:col-span-3" delay={0.10}>
            <div className="relative h-full overflow-hidden rounded-xl p-3.5 text-white bg-gradient-to-br from-action-orange via-[#E0853D] to-[#C26C2A] shadow-doe-md">
              <div className="absolute -top-10 -right-8 w-28 h-28 rounded-full bg-white/15 blur-2xl pointer-events-none" />
              <div className="absolute -bottom-8 -left-4 w-24 h-24 rounded-full bg-white/10 blur-2xl pointer-events-none" />
              <div className="relative">
                <div className="flex items-center gap-1.5 text-[9.5px] font-sans uppercase tracking-[0.18em] text-white/80 mb-1.5">
                  <Pulse color="#fff" size={6} /> Today · Live
                </div>
                <div className="flex items-baseline gap-1.5">
                  <span className="font-display font-bold text-[28px] leading-none tabular-nums">
                    <AnimatedNumber value={submittedTotal} duration={1} />
                  </span>
                  <span className="text-[10.5px] text-white/80">new submissions</span>
                </div>

                <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[10.5px] mt-3 pt-2.5 border-t border-white/15">
                  <HeroTodayRow label="Approvals"   value={approvedTotal} />
                  <HeroTodayRow label="Rejections"  value={rejectedTotal} />
                  <HeroTodayRow label="Inspections" value={activity.inspectionsToday.doe + activity.inspectionsToday.tpi} />
                  <HeroTodayRow label="Violations"  value={violationsTotal} />
                </div>
              </div>
            </div>
          </MotionFadeIn>
        </section>

        {/* ============ KPI ROW — every tile has its own visualisation ============ */}
        <section>
          <SectionRule>Service Headlines</SectionRule>
          <StaggerGrid className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-7 gap-2.5">
            {/* Active AMCs · weekly approval bars */}
            <StaggerItem>
              <StatTile tone="blue" label="Active AMCs" value={headline.activeAmcs} icon={<IconAmc />}
                caption="Weekly approvals · 12w" delta={{ value: 2.4 }}
                viz={<KpiMiniBars data={amcWeekly} tone="blue" />}
                to="/pps-dashboard/amc"
              />
            </StaggerItem>

            {/* Active NOCs · dual-coverage radial (NOC ∩ AMC). If we have
                 zero NOCs in the filter, fall back to overall renewal rate
                 so the ring still tells a story. */}
            <StaggerItem>
              <StatTile tone="teal" label="Active NOCs" value={headline.activeNocs} icon={<IconNoc />}
                delta={{ value: 1.6 }}
                viz={
                  headline.activeNocs > 0 ? (
                    <KpiRadial value={nocCoverageNumerator} total={Math.max(1, headline.activeNocs)} tone="teal" subLabel="Dual-coverage with AMC" />
                  ) : (
                    <KpiRadial value={3} total={5} tone="teal" subLabel="Sample renewal rate" />
                  )
                }
                to="/pps-dashboard/noc"
              />
            </StaggerItem>

            {/* Issued COCs YTD · status mix segment bar */}
            <StaggerItem>
              <StatTile tone="emerald" label="Issued COCs · YTD" value={headline.issuedCocsYtd} icon={<IconCheck />}
                delta={{ value: 4.1 }}
                viz={<KpiSegmentBar segments={[
                  { label: 'Issued',   value: cocSlice.issuedYtd,  tone: 'emerald' },
                  { label: 'Open',     value: cocSlice.open,       tone: 'indigo'  },
                  { label: 'Rejected', value: cocSlice.rejected,   tone: 'rose'    },
                ]} />}
                to="/pps-dashboard/coc"
              />
            </StaggerItem>

            {/* Active MAES · applicant-type segment */}
            <StaggerItem>
              <StatTile tone="violet" label="Active MAES" value={headline.activeMaes} icon={<IconBox />}
                delta={{ value: 0.9 }}
                viz={<KpiSegmentBar segments={maesByType} />}
                to="/pps-dashboard/maes"
              />
            </StaggerItem>

            {/* Petroleum Permits · top-3 permit-type donut */}
            <StaggerItem>
              <StatTile tone="orange" label="Petroleum Permits" value={headline.activePetroleumPermits} icon={<IconFuel />}
                delta={{ value: -1.2 }}
                viz={<KpiDonutMini segments={petTopTypes} />}
                to="/pps-dashboard/petroleum"
              />
            </StaggerItem>

            {/* Inspections YTD · DoE vs TPI split */}
            <StaggerItem>
              <StatTile tone="indigo" label="Inspections · YTD" value={headline.inspectionsYtd} icon={<IconClipboard />}
                delta={{ value: 8.3 }}
                viz={<KpiSplitStat stats={inspSplit} />}
                to="/pps-dashboard/inspections"
              />
            </StaggerItem>

            {/* Open Violations · severity dot buckets */}
            <StaggerItem>
              <StatTile tone="rose" label="Open Violations" value={headline.openViolations} icon={<IconAlert />}
                delta={{ value: -3.6 }}
                viz={<KpiSeverityDots buckets={violationSeverity} />}
                to="/pps-dashboard/inspections"
              />
            </StaggerItem>
          </StaggerGrid>
        </section>

        {/* ============ SERVICE STATUS · table-row layout ============ */}
        <section>
          <SectionRule>Service Status</SectionRule>
          <div className="bg-white rounded-lg border border-neutral-200 divide-y divide-neutral-100">
            <ServiceRow apps={filteredApps} module="amc"  label="AMC · Annual Maintenance Contract"     to="/pps-dashboard/amc" />
            <ServiceRow apps={filteredApps} module="noc"  label="NOC · No Objection Certificate"        to="/pps-dashboard/noc" />
            <ServiceRow apps={filteredApps} module="coc"  label="COC · Certificate of Completion"       to="/pps-dashboard/coc" />
            <ServiceRow apps={filteredApps} module="maes" label="MAES · Material & Equipment Approval"  to="/pps-dashboard/maes" />
            <ServiceRow apps={filteredApps} module="gas"  label="Gas Systems Companies Registration"    to="/pps-dashboard/gas-companies" />
            <ServiceRow apps={filteredApps} module="hoe"  label="HOE / TPI Registration"                to="/pps-dashboard/hoe" />
            <PetroleumRow  permits={petroleumPermits} label="Petroleum Products Trading Permits"        to="/pps-dashboard/petroleum" />
            <InspectionsRow inspections={inspections} violations={violations} label="Inspection Reports" to="/pps-dashboard/inspections" />
          </div>
        </section>

        {/* ============ MAP + LEGEND ROW ============ */}
        <section className="grid grid-cols-12 gap-3">
          <MotionFadeIn className="col-span-12 lg:col-span-8">
            <div className="bg-white rounded-lg border border-neutral-200 overflow-hidden h-full">
              <div className="flex items-center justify-between px-4 py-2.5 border-b border-neutral-100">
                <div>
                  <div className="text-[10px] font-sans uppercase tracking-[0.18em] text-neutral-500">Emirate · Live</div>
                  <div className="text-[13px] font-semibold text-ink-950 mt-0.5">Geographic Compliance Snapshot</div>
                </div>
                <Link to="/pps-dashboard/gas-sector-compliance" className="text-[11px] font-semibold text-action-orange-deep hover:text-ink-950 transition">
                  Open full map →
                </Link>
              </div>
              <div style={{ height: 280 }}>
                <MapContainer center={[24.45, 54.45]} zoom={9} scrollWheelZoom={false} style={{ height: '100%', width: '100%' }}>
                  <TileLayer attribution='© OpenStreetMap' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                  {buildings.filter((b) => b.coordinates).map((b) => {
                    const color = b.complianceLevel === 'green' ? '#10B981' : b.complianceLevel === 'amber' ? '#F59E0B' : '#EF4444';
                    return (
                      <CircleMarker key={b.id} center={[b.coordinates!.lat, b.coordinates!.lng]} radius={6}
                        pathOptions={{ color, fillColor: color, fillOpacity: 0.75, weight: 1.5 }}>
                        <LeafletTooltip direction="top" offset={[0, -6]} opacity={0.95}>
                          <span style={{ fontSize: 11 }}><strong>{b.name}</strong><br />{b.city} · {b.premisesType}<br />Compliance {b.complianceScore}%</span>
                        </LeafletTooltip>
                      </CircleMarker>
                    );
                  })}
                </MapContainer>
              </div>
              <div className="px-4 py-2 border-t border-neutral-100 flex items-center gap-5 text-[11px] text-neutral-600">
                <LegendDot color="bg-emerald-500" label="Fully Compliant" value={buildingsGreen} />
                <LegendDot color="bg-amber-500"   label="Partial"          value={buildingsAmber} />
                <LegendDot color="bg-doe-red"     label="Action Required"  value={buildingsRed} />
              </div>
            </div>
          </MotionFadeIn>

          {/* Right: top-2 alerts side-by-side stacked */}
          <MotionFadeIn className="col-span-12 lg:col-span-4" delay={0.05}>
            <div className="space-y-3 h-full">
              <AlertBlock title="Permits expiring < 60 days" items={alerts.expiringSoon.slice(0, 5)} emptyText="All permits healthy." compact />
              <AlertBlock title="Critical violations open"   items={alerts.criticalOpen.slice(0, 5)} emptyText="No critical violations." compact />
            </div>
          </MotionFadeIn>
        </section>

        {/* ============ WATCHLIST — 3 alert columns ============ */}
        <section>
          <SectionRule right={<span className="text-[10.5px] text-neutral-400">Tap any row to open the canonical record</span>}>Watchlist</SectionRule>
          <StaggerGrid className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <StaggerItem><AlertBlock title="Overdue O&M activities"        items={alerts.overdueOAndM}             emptyText="No overdue O&M activities." /></StaggerItem>
            <StaggerItem><AlertBlock title="Awaiting reviewer action"      items={alerts.awaitingReviewer}         emptyText="Reviewer queue clear." /></StaggerItem>
            <StaggerItem><AlertBlock title="Non-compliant buildings"       items={alerts.nonCompliantBuildings}    emptyText="No non-compliant buildings." /></StaggerItem>
          </StaggerGrid>
        </section>
      </div>
    </div>
  );
}

// ============================================================================
// Helpers
// ============================================================================

function SectionRule({ children, right }: { children: React.ReactNode; right?: React.ReactNode }) {
  return (
    <div className="flex items-end justify-between mb-2.5">
      <div className="text-[10.5px] font-sans uppercase tracking-[0.18em] text-neutral-500">{children}</div>
      {right}
    </div>
  );
}

// Today card row rendered on the orange gradient — white type on the bg.
function HeroTodayRow({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-baseline justify-between gap-2">
      <span className="text-[9.5px] uppercase tracking-wider text-white/70 truncate">{label}</span>
      <span className="text-[12px] font-semibold tabular-nums text-white">
        <AnimatedNumber value={value} duration={0.7} />
      </span>
    </div>
  );
}

// ── Service row ─────────────────────────────────────────────────────────────
const MODULE_TONE: Record<string, { bg: string; text: string }> = {
  AMC:  { bg: 'bg-blue-50',          text: 'text-blue-700' },
  NOC:  { bg: 'bg-teal-50',          text: 'text-teal-700' },
  COC:  { bg: 'bg-emerald-50',       text: 'text-emerald-700' },
  MAES: { bg: 'bg-violet-50',        text: 'text-violet-700' },
  GAS:  { bg: 'bg-action-orange-soft', text: 'text-action-orange-deep' },
  HOE:  { bg: 'bg-amber-50',         text: 'text-amber-700' },
  PET:  { bg: 'bg-orange-50',        text: 'text-orange-700' },
  INS:  { bg: 'bg-indigo-50',        text: 'text-indigo-700' },
};

function ServiceRow({ apps, module, label, to }: { apps: any[]; module: Module; label: string; to: string }) {
  const s = sliceCounts(apps, module);
  return <BaseRow label={label} module={module.toUpperCase()} to={to}
    cells={[
      { label: 'Active',      value: s.active,        status: 'neutral' },
      { label: '< 60 days',   value: s.expiringSoon,  status: s.expiringSoon > 0 ? 'warning' : 'neutral' },
      { label: 'Open Work',   value: s.open,          status: 'neutral' },
      { label: 'Action Req.', value: s.actionRequired, status: s.actionRequired > 0 ? 'critical' : 'ok' },
    ]} />;
}

function PetroleumRow({ permits, label, to }: { permits: ReturnType<typeof buildPetroleumPermits>; label: string; to: string }) {
  const active = permits.filter((p) => p.status === 'Active').length;
  const expiring = permits.filter((p) => p.status === 'Expiring').length;
  const open = permits.filter((p) => p.status === 'Open').length;
  const action = permits.filter((p) => p.status === 'Expired').length;
  return <BaseRow label={label} module="PET" to={to}
    cells={[
      { label: 'Active',      value: active,    status: 'neutral' },
      { label: '< 60 days',   value: expiring,  status: expiring > 0 ? 'warning' : 'neutral' },
      { label: 'Open Work',   value: open,      status: 'neutral' },
      { label: 'Action Req.', value: action,    status: action > 0 ? 'critical' : 'ok' },
    ]} />;
}

function InspectionsRow({ inspections, violations, label, to }: { inspections: ReturnType<typeof buildInspections>; violations: ReturnType<typeof buildViolations>; label: string; to: string }) {
  const ytd = inspections.filter((i) => inYTD(i.date)).length;
  const queue = inspections.filter((i) => i.status === 'Pending Review').length;
  const open = violations.filter((v) => v.status === 'Open').length;
  const critical = violations.filter((v) => v.status === 'Open' && v.severity === 'Critical').length;
  return <BaseRow label={label} module="INS" to={to}
    cells={[
      { label: 'YTD',         value: ytd,       status: 'neutral' },
      { label: 'Queue',       value: queue,     status: queue > 0 ? 'warning' : 'neutral' },
      { label: 'Open',        value: open,      status: 'neutral' },
      { label: 'Critical',    value: critical,  status: critical > 0 ? 'critical' : 'ok' },
    ]} />;
}

function BaseRow({ label, module, to, cells }: {
  label: string;
  module: string;
  to: string;
  cells: { label: string; value: number; status: 'neutral' | 'warning' | 'critical' | 'ok' }[];
}) {
  const tone = MODULE_TONE[module] ?? { bg: 'bg-neutral-100', text: 'text-neutral-700' };
  return (
    <Link to={to} className="group grid grid-cols-[1fr_repeat(4,90px)_24px] items-center gap-4 px-4 py-2.5 hover:bg-neutral-25 transition">
      <div className="min-w-0">
        <div className="flex items-center gap-2.5">
          <span className={cn('inline-flex items-center justify-center w-9 h-5 rounded-md text-[9px] font-mono font-bold tracking-wider', tone.bg, tone.text)}>
            {module}
          </span>
          <span className="text-[12.5px] font-semibold text-ink-950 truncate">{label}</span>
        </div>
      </div>
      {cells.map((c) => {
        const cls =
          c.status === 'critical' ? 'text-doe-red' :
          c.status === 'warning'  ? 'text-amber-600' :
          c.status === 'ok'       ? 'text-emerald-600' :
          'text-ink-950';
        return (
          <div key={c.label} className="text-right">
            <div className={cn('text-[14px] font-semibold tabular-nums leading-none', cls)}>
              <AnimatedNumber value={c.value} duration={0.7} />
            </div>
            <div className="text-[9px] font-sans uppercase tracking-wider text-neutral-400 mt-0.5">{c.label}</div>
          </div>
        );
      })}
      <span className="text-neutral-300 group-hover:text-action-orange-deep transition text-[15px]">›</span>
    </Link>
  );
}

// ── Alert block ─────────────────────────────────────────────────────────────
function AlertBlock({ title, items, emptyText, compact }: { title: string; items: AlertItem[]; emptyText?: string; compact?: boolean }) {
  return (
    <div className="bg-white rounded-lg border border-neutral-200 overflow-hidden">
      <div className="flex items-center justify-between px-3.5 py-2 border-b border-neutral-100">
        <div className="text-[11.5px] font-semibold text-ink-950">{title}</div>
        <div className="text-[10.5px] font-mono font-semibold text-neutral-500 tabular-nums">
          <AnimatedNumber value={items.length} duration={0.5} />
        </div>
      </div>
      {items.length === 0 ? (
        <div className="px-3.5 py-4 text-[11px] text-neutral-500 text-center">{emptyText ?? 'Nothing to flag.'}</div>
      ) : (
        <div className={cn('divide-y divide-neutral-100', compact ? 'max-h-[180px]' : 'max-h-[240px]', 'overflow-y-auto')}>
          {items.map((it, i) => {
            const dotCls =
              it.tone === 'red'   ? 'bg-doe-red' :
              it.tone === 'amber' ? 'bg-amber-500' :
              'bg-ink-950/30';
            const node = (
              <motion.div
                initial={{ opacity: 0, x: -6 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.025, duration: 0.3 }}
                className="px-3.5 py-1.5 flex items-center gap-2 hover:bg-neutral-25 transition group"
              >
                <span className={cn('w-1 h-1 rounded-full mt-0.5 flex-shrink-0', dotCls)} />
                <div className="flex-1 min-w-0">
                  <div className="text-[11.5px] font-medium text-ink-950 truncate group-hover:text-action-orange-deep transition">{it.primary}</div>
                  {it.secondary && <div className="text-[10.5px] text-neutral-500 truncate">{it.secondary}</div>}
                </div>
                {it.metric && <div className="text-[10.5px] font-mono font-semibold text-neutral-700 flex-shrink-0 tabular-nums">{it.metric}</div>}
              </motion.div>
            );
            if (it.href) return <Link key={it.id} to={it.href} className="block">{node}</Link>;
            return <div key={it.id}>{node}</div>;
          })}
        </div>
      )}
    </div>
  );
}

function LegendDot({ color, label, value }: { color: string; label: string; value: number }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={cn('w-1.5 h-1.5 rounded-full', color)} />
      <span className="text-neutral-500">{label}</span>
      <strong className="font-mono text-ink-950 tabular-nums">{value}</strong>
    </span>
  );
}

function ExportIcon() {
  return <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>;
}

// ── Module icons (consistent stroke-width 2.2, 14px) ────────────────────────
function IconAmc()       { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>; }
function IconNoc()       { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 12l2 2 4-4"/><path d="M21 12c0 4.97-4.03 9-9 9s-9-4.03-9-9 4.03-9 9-9c1.65 0 3.2.45 4.53 1.22"/></svg>; }
function IconCheck()     { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>; }
function IconBox()       { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>; }
function IconFuel()      { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="22" x2="15" y2="22"/><line x1="4" y1="9" x2="14" y2="9"/><path d="M14 22V4a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v18"/><path d="M14 13h2a2 2 0 0 1 2 2v2a2 2 0 0 0 2 2 2 2 0 0 0 2-2V9.83a2 2 0 0 0-.59-1.42L18 5"/></svg>; }
function IconClipboard() { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1" ry="1"/><path d="m9 14 2 2 4-4"/></svg>; }
function IconAlert()     { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>; }
