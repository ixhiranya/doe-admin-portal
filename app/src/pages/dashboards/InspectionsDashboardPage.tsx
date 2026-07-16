import { useMemo, useState } from 'react';
import { useApps } from '../../store/apps';
import { buildInspections, buildViolations, inYTD } from './dashboardData';
import {
  StatTile, ChartCard, StackedTrendChart, HorizontalBarChart, DrillGrid, FilterChips,
  StaggerGrid, StaggerItem, KpiMiniBars, KpiSegmentBar, KpiSeverityDots, KpiSplitStat,
} from './components';
import { ServiceDashboardLayout, DashSectionRule } from './ServiceDashboardLayout';

// ============================================================================
// Inspections Dashboard — SDD §3.8 · indigo tone
// ============================================================================

const SOURCE_OPTIONS = ['DoE Field', 'TPI External'];
const OUTCOME_OPTIONS = ['Compliant', 'Compliant with Warnings', 'Non-Compliant'];
const SEVERITY_OPTIONS = ['Critical', 'Major', 'Minor', 'Warning'];

export function InspectionsDashboardPage() {
  const apps = useApps((s) => s.apps);
  const [sources, setSources] = useState<string[]>([]);
  const [outcomes, setOutcomes] = useState<string[]>([]);
  const [severities, setSeverities] = useState<string[]>([]);

  const inspections = useMemo(() => buildInspections(apps), [apps]);
  const violations  = useMemo(() => buildViolations(inspections), [inspections]);

  const filteredInsp = useMemo(() => inspections.filter((i) => {
    if (sources.length > 0 && !sources.includes(i.source)) return false;
    if (outcomes.length > 0 && !outcomes.includes(i.outcome)) return false;
    return true;
  }), [inspections, sources, outcomes]);

  const filteredVio = useMemo(() => violations.filter((v) => {
    if (severities.length > 0 && !severities.includes(v.severity)) return false;
    return true;
  }), [violations, severities]);

  const ytdInsp = inspections.filter((i) => inYTD(i.date));
  const doe = ytdInsp.filter((i) => i.source === 'DoE Field').length;
  const tpi = ytdInsp.filter((i) => i.source === 'TPI External').length;

  const last90 = Date.now() - 90 * 86400_000;
  const recentInsp = inspections.filter((i) => new Date(i.date).getTime() >= last90);
  const compliant     = recentInsp.filter((i) => i.outcome === 'Compliant').length;
  const compWithWarn  = recentInsp.filter((i) => i.outcome === 'Compliant with Warnings').length;
  const nonCompliant  = recentInsp.filter((i) => i.outcome === 'Non-Compliant').length;

  const openViolations = violations.filter((v) => v.status === 'Open').length;
  const criticalOpen   = violations.filter((v) => v.status === 'Open' && v.severity === 'Critical').length;
  const majorOpen      = violations.filter((v) => v.status === 'Open' && v.severity === 'Major').length;
  const minorOpen      = violations.filter((v) => v.status === 'Open' && v.severity === 'Minor').length;
  const pendingReview  = inspections.filter((i) => i.status === 'Pending Review').length;

  const trend = useMemo(() => {
    const now = new Date();
    const MONTHS_LBL = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const buckets: any[] = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const sliceM = inspections.filter((insp) => {
        const id = new Date(insp.date);
        return id.getFullYear() === d.getFullYear() && id.getMonth() === d.getMonth();
      });
      buckets.push({
        monthLabel: MONTHS_LBL[d.getMonth()],
        'DoE · Compliant':    sliceM.filter((i) => i.source === 'DoE Field' && i.outcome === 'Compliant').length,
        'DoE · Warnings':     sliceM.filter((i) => i.source === 'DoE Field' && i.outcome === 'Compliant with Warnings').length,
        'DoE · Non-Compliant':sliceM.filter((i) => i.source === 'DoE Field' && i.outcome === 'Non-Compliant').length,
        'TPI · Compliant':    sliceM.filter((i) => i.source === 'TPI External' && i.outcome === 'Compliant').length,
        'TPI · Warnings':     sliceM.filter((i) => i.source === 'TPI External' && i.outcome === 'Compliant with Warnings').length,
        'TPI · Non-Compliant':sliceM.filter((i) => i.source === 'TPI External' && i.outcome === 'Non-Compliant').length,
      });
    }
    return buckets;
  }, [inspections]);

  const violByCategory = useMemo(() => {
    const m: Record<string, number> = {};
    violations.forEach((v) => { m[v.category] = (m[v.category] ?? 0) + 1; });
    return Object.entries(m).map(([k, c]) => ({ key: k, label: k, count: c })).sort((a, b) => b.count - a.count).slice(0, 10);
  }, [violations]);

  const repeatOffenders = useMemo(() => {
    const m: Record<string, number> = {};
    violations.filter((v) => v.status === 'Open').forEach((v) => { m[v.buildingName] = (m[v.buildingName] ?? 0) + 1; });
    return Object.entries(m).map(([k, c]) => ({ key: k, label: k, count: c })).sort((a, b) => b.count - a.count).slice(0, 10);
  }, [violations]);

  const inspectorActivity = useMemo(() => {
    const m: Record<string, number> = {};
    recentInsp.forEach((i) => { m[i.inspector] = (m[i.inspector] ?? 0) + 1; });
    return Object.entries(m).map(([k, c]) => ({ key: k, label: k, count: c })).sort((a, b) => b.count - a.count).slice(0, 10);
  }, [recentInsp]);

  // Monthly inspection volume for headline
  const monthlyVolume = useMemo(() => {
    const now = new Date();
    const out: { value: number }[] = [];
    for (let m = 11; m >= 0; m--) {
      const start = new Date(now.getFullYear(), now.getMonth() - m, 1);
      const end = new Date(now.getFullYear(), now.getMonth() - m + 1, 1);
      out.push({ value: inspections.filter((i) => {
        const d = new Date(i.date);
        return d >= start && d < end;
      }).length });
    }
    return out;
  }, [inspections]);

  return (
    <ServiceDashboardLayout
      tone="indigo"
      module="Inspection Reports"
      title="Inspections Dashboard"
      subtitle="DoE field + TPI external inspections + Violations register"
      breadcrumbLabel="Inspections"
      filterBar={
        <>
          <FilterChips label="Source"   options={SOURCE_OPTIONS}   value={sources}    onChange={setSources} />
          <FilterChips label="Outcome"  options={OUTCOME_OPTIONS}  value={outcomes}   onChange={setOutcomes} />
          <FilterChips label="Severity" options={SEVERITY_OPTIONS} value={severities} onChange={setSeverities} />
        </>
      }
    >
      <section>
        <DashSectionRule>Headlines</DashSectionRule>
        <StaggerGrid className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-4 gap-2.5">
          <StaggerItem>
            <StatTile tone="indigo" label="Inspections · YTD" value={ytdInsp.length} caption="Monthly volume · 12m"
              viz={<KpiMiniBars data={monthlyVolume} tone="indigo" />} />
          </StaggerItem>
          <StaggerItem>
            <StatTile tone="teal" label="Source Mix · YTD" value={doe + tpi} caption="DoE Field · TPI External"
              viz={<KpiSplitStat stats={[
                { label: 'DoE', value: doe, tone: 'indigo' },
                { label: 'TPI', value: tpi, tone: 'teal' },
              ]} />} />
          </StaggerItem>
          <StaggerItem>
            <StatTile tone="emerald" label="Outcome · 90d" value={compliant + compWithWarn + nonCompliant} caption="Compliant · Warnings · Non-Compliant"
              viz={<KpiSegmentBar segments={[
                { label: 'OK',   value: compliant,    tone: 'emerald' },
                { label: 'Warn', value: compWithWarn, tone: 'amber' },
                { label: 'NC',   value: nonCompliant, tone: 'rose' },
              ]} />} />
          </StaggerItem>
          <StaggerItem>
            <StatTile tone="rose" label="Open Violations" value={openViolations} caption="By severity"
              viz={<KpiSeverityDots buckets={[
                { label: 'Critical', value: criticalOpen, tone: 'rose'  },
                { label: 'Major',    value: majorOpen,    tone: 'amber' },
                { label: 'Minor',    value: minorOpen,    tone: 'slate' },
              ]} />} />
          </StaggerItem>
        </StaggerGrid>
        <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-4 gap-2.5 mt-2.5">
          <StaggerItem>
            <StatTile tone="amber" label="Awaiting Reviewer" value={pendingReview} caption="Queue depth"
              viz={<KpiSplitStat stats={[
                { label: 'Queue', value: pendingReview, tone: 'amber' },
                { label: 'Done',  value: Math.max(0, ytdInsp.length - pendingReview), tone: 'emerald' },
              ]} />} />
          </StaggerItem>
          <StaggerItem>
            <StatTile tone="rose" label="Critical · Open" value={criticalOpen} caption="Headline severity"
              viz={<KpiSegmentBar segments={[
                { label: 'Crit', value: criticalOpen, tone: 'rose'  },
                { label: 'Maj',  value: majorOpen,    tone: 'amber' },
                { label: 'Min',  value: minorOpen,    tone: 'slate' },
              ]} />} />
          </StaggerItem>
          <StaggerItem>
            <StatTile tone="indigo" label="Avg Duration" value={2.4} unit="hrs" caption="Check-in → submission"
              viz={<KpiSplitStat stats={[
                { label: 'Avg.', value: 2, tone: 'indigo' },
                { label: 'Max.', value: 6, tone: 'amber'  },
              ]} />} />
          </StaggerItem>
          <StaggerItem>
            <StatTile tone="emerald" label="Compliant · 90d" value={compliant} caption="Outcome share"
              viz={<KpiSplitStat stats={[
                { label: 'OK',   value: compliant,    tone: 'emerald' },
                { label: 'NC',   value: nonCompliant, tone: 'rose'    },
              ]} />} />
          </StaggerItem>
        </div>
      </section>

      <section>
        <ChartCard title="Trend · 12 months" subtitle="Split by source and outcome" height={300}>
          <StackedTrendChart data={trend} series={[
            { key: 'DoE · Compliant',     label: 'DoE · Compliant',     color: '#10B981' },
            { key: 'DoE · Warnings',      label: 'DoE · Warnings',      color: '#F59E0B' },
            { key: 'DoE · Non-Compliant', label: 'DoE · Non-Compliant', color: '#EF4444' },
            { key: 'TPI · Compliant',     label: 'TPI · Compliant',     color: '#0F766E' },
            { key: 'TPI · Warnings',      label: 'TPI · Warnings',      color: '#E89B4C' },
            { key: 'TPI · Non-Compliant', label: 'TPI · Non-Compliant', color: '#7B3FE4' },
          ]} />
        </ChartCard>
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        <ChartCard title="Violations by Category" subtitle="Top 10 categories" height={240}>
          <HorizontalBarChart data={violByCategory} colorByIndex />
        </ChartCard>
        <ChartCard title="Repeat Offenders" subtitle="Top buildings · open violations" height={240}>
          <HorizontalBarChart data={repeatOffenders} colorByIndex />
        </ChartCard>
        <ChartCard title="Inspector Activity · 90d" subtitle="Inspections completed" height={240}>
          <HorizontalBarChart data={inspectorActivity} />
        </ChartCard>
      </section>

      <section>
        <DashSectionRule right={<span className="text-[11px] text-neutral-500">{filteredInsp.length.toLocaleString()} inspections</span>}>Drill-Down · Inspections</DashSectionRule>
        <DrillGrid
          rows={filteredInsp}
          cols={[
            { key: 'inspectionNumber', label: 'Inspection No.', render: (r) => <span className="font-mono text-[11px]">{r.inspectionNumber}</span>, width: '160px' },
            { key: 'building',         label: 'Building / Premises', render: (r) => <div className="text-[11.5px]"><div className="font-semibold text-ink-950">{r.buildingName}</div><div className="text-neutral-500">{r.premisesNumber}</div></div> },
            { key: 'source',           label: 'Source' },
            { key: 'type',             label: 'Type' },
            { key: 'date',             label: 'Date' },
            { key: 'inspector',        label: 'Inspector' },
            { key: 'outcome',          label: 'Outcome' },
            { key: 'violations',       label: 'Violations', align: 'right' },
            { key: 'status',           label: 'Status' },
          ]}
        />
      </section>

      <section>
        <DashSectionRule right={<span className="text-[11px] text-neutral-500">{filteredVio.length.toLocaleString()} violations</span>}>Drill-Down · Violations</DashSectionRule>
        <DrillGrid
          rows={filteredVio}
          cols={[
            { key: 'violationNumber', label: 'Violation No.', render: (r) => <span className="font-mono text-[11px]">{r.violationNumber}</span>, width: '160px' },
            { key: 'recordedAt',      label: 'Recorded' },
            { key: 'category',        label: 'Category' },
            { key: 'severity',        label: 'Severity' },
            { key: 'status',          label: 'Status' },
            { key: 'inspector',       label: 'Inspector' },
            { key: 'buildingName',    label: 'Building' },
            { key: 'city',            label: 'City' },
          ]}
        />
      </section>

      <section>
        <div className="rounded-lg border border-info-500/30 bg-info-soft/40 p-3 text-[11px] text-info-500 leading-relaxed">
          <strong className="uppercase tracking-wider mr-1">Note ·</strong>
          Inspections (§3.8) and the Violations Register (§4.14) are not yet wired to live service modules in this prototype; the dashboard's data is deterministically synthesised from the seeded application catalogue so the numbers tell a consistent story.
        </div>
      </section>
    </ServiceDashboardLayout>
  );
}
