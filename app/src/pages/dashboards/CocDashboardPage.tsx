import { useMemo, useState } from 'react';
import { useApps } from '../../store/apps';
import {
  sliceCounts, workflowFunnel, buildMonthlyTrend, distributionByField, topCompanies,
  isIssued, isInQueueOf, daysUntil,
} from './dashboardData';
import {
  StatTile, ChartCard, StackedTrendChart, DonutChart, HorizontalBarChart, WorkflowFunnel, DrillGrid, FilterChips,
  StaggerGrid, StaggerItem, KpiMiniBars, KpiSegmentBar, KpiSplitStat,
} from './components';
import { ServiceDashboardLayout, DashSectionRule } from './ServiceDashboardLayout';
import type { Application } from '../../types';
import { formatDate } from '../../lib/utils';
import { getService } from '../../services/registry';
import { getState } from '../../engine/workflow';

// ============================================================================
// COC Dashboard — SDD §3.3 · emerald tone
// ============================================================================

const STATUS_OPTIONS = ['Active', 'Open Workflow', 'Cancelled', 'Rejected'];

export function CocDashboardPage() {
  const apps = useApps((s) => s.apps);
  const [statuses, setStatuses] = useState<string[]>([]);

  const coc = useMemo(() => apps.filter((a) => a.module === 'coc'), [apps]);
  const slice = useMemo(() => sliceCounts(apps, 'coc'), [apps]);
  const pendingEng = useMemo(() => coc.filter((a) => isInQueueOf(a, 'engineer')).length, [coc]);
  const pendingSh  = useMemo(() => coc.filter((a) => isInQueueOf(a, 'section_head')).length, [coc]);
  const pendingDir = useMemo(() => coc.filter((a) => isInQueueOf(a, 'director')).length, [coc]);

  const trend = useMemo(() => buildMonthlyTrend(coc, (a) => {
    if (!a.approvedOn) return null;
    const action = a.serviceId.split('.')[1];
    return action.charAt(0).toUpperCase() + action.slice(1);
  }), [coc]);

  const byGasType = useMemo(() => distributionByField(coc.filter(isIssued), 'gasSystemType'), [coc]);
  const topTpi = useMemo(() => topCompanies(coc.filter(isIssued), 10), [coc]);
  const funnel = useMemo(() => workflowFunnel(apps, 'coc'), [apps]);

  const monthlyIssued = useMemo(() => {
    const out: { value: number }[] = [];
    const now = new Date();
    for (let m = 11; m >= 0; m--) {
      const start = new Date(now.getFullYear(), now.getMonth() - m, 1);
      const end = new Date(now.getFullYear(), now.getMonth() - m + 1, 1);
      out.push({ value: coc.filter((a) => a.approvedOn && new Date(a.approvedOn) >= start && new Date(a.approvedOn) < end && isIssued(a)).length });
    }
    return out;
  }, [coc]);

  const actionMix = useMemo(() => {
    const issued = (action: string) => coc.filter((a) => a.serviceId === `coc.${action}` && isIssued(a)).length;
    return [
      { label: 'Modify', value: issued('modify'), tone: 'violet' as const },
      { label: 'Cancel', value: issued('cancel'), tone: 'amber'  as const },
      { label: 'Reject', value: slice.rejected,   tone: 'rose'   as const },
    ];
  }, [coc, slice.rejected]);

  const filtered = useMemo(() => coc.filter((a) => {
    if (statuses.length === 0) return true;
    return statuses.includes(statusFor(a));
  }), [coc, statuses]);

  return (
    <ServiceDashboardLayout
      tone="emerald"
      module="Certificate of Completion"
      title="COC Dashboard"
      subtitle="Operational state of the Project Certificate of Completion service"
      breadcrumbLabel="COC"
      filterBar={<FilterChips label="Status" options={STATUS_OPTIONS} value={statuses} onChange={setStatuses} />}
    >
      <section>
        <DashSectionRule>Headlines</DashSectionRule>
        <StaggerGrid className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-4 gap-2.5">
          <StaggerItem>
            <StatTile tone="emerald" label="Issued COCs · YTD" value={slice.issuedYtd} caption="Monthly issuance · 12m"
              viz={<KpiMiniBars data={monthlyIssued} tone="emerald" />} />
          </StaggerItem>
          <StaggerItem>
            <StatTile tone="indigo" label="In Review · Queue" value={pendingEng + pendingSh + pendingDir} caption="Across 3 review tiers"
              viz={<KpiSplitStat stats={[
                { label: 'Eng.',  value: pendingEng, tone: 'indigo' },
                { label: 'SH',    value: pendingSh,  tone: 'amber' },
                { label: 'Dir.',  value: pendingDir, tone: 'rose' },
              ]} />} />
          </StaggerItem>
          <StaggerItem>
            <StatTile tone="violet" label="Lifecycle activity" value={slice.issuedYtd + slice.cancelsYtd} caption="Action mix · YTD"
              viz={<KpiSegmentBar segments={actionMix} />} />
          </StaggerItem>
          <StaggerItem>
            <StatTile tone="blue" label="Avg Processing" value={slice.avgProcessingDays} unit="days" caption="Trailing 90 days"
              viz={<KpiSplitStat stats={[
                { label: 'Open', value: slice.open,      tone: 'indigo' },
                { label: 'Done', value: slice.issuedYtd, tone: 'emerald' },
              ]} />} />
          </StaggerItem>
        </StaggerGrid>
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        <div className="lg:col-span-2">
          <ChartCard title="Trend · 12 months" subtitle="COCs by action" height={260}>
            <StackedTrendChart data={trend} series={[
              { key: 'Modify', label: 'Modification', color: '#7B3FE4' },
              { key: 'Cancel', label: 'Cancellation', color: '#F59E0B' },
            ]} />
          </ChartCard>
        </div>
        <ChartCard title="Distribution by Gas System Type" height={260}>
          <DonutChart data={byGasType} />
        </ChartCard>
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <ChartCard title="Top TPI Companies" subtitle="By COC count · trailing 12 months" height={240}>
          <HorizontalBarChart data={topTpi} />
        </ChartCard>
        <div className="bg-white border border-neutral-200 rounded-xl shadow-doe-sm p-4">
          <div className="text-[12.5px] font-semibold text-ink-950 mb-3">Workflow Funnel</div>
          <WorkflowFunnel stages={funnel} />
        </div>
      </section>

      <section>
        <DashSectionRule right={<span className="text-[11px] text-neutral-500">{filtered.length.toLocaleString()} records</span>}>Drill-Down</DashSectionRule>
        <DrillGrid
          rows={filtered}
          cols={[
            { key: 'applicationNumber', label: 'COC Reference', render: (r) => <span className="font-mono text-[11px]">{r.applicationNumber}</span>, width: '160px' },
            { key: 'building',          label: 'Building / Premises', render: (r) => <div className="text-[11.5px]"><div className="font-semibold text-ink-950">{r.fieldValues?.buildingName || r.company.name}</div><div className="text-neutral-500">{r.fieldValues?.premisesNumber || '—'}</div></div> },
            { key: 'gasSystemType',     label: 'Gas System Type', render: (r) => r.fieldValues?.gasSystemType ?? '—' },
            { key: 'tpiCompany',        label: 'TPI Company', render: (r) => r.fieldValues?.tpiCompany ?? '—' },
            { key: 'status',            label: 'Status', render: (r) => statusFor(r) },
            { key: 'issue',             label: 'Issue Date', render: (r) => formatDate(r.approvedOn) },
            { key: 'linkedNoc',         label: 'Linked NOC', render: (r) => <span className="text-[11px] text-neutral-500">{r.fieldValues?.dmtMepsRef ?? '—'}</span> },
          ]}
          rowHref={(r) => `/app/${r.id}`}
        />
      </section>
    </ServiceDashboardLayout>
  );
}

function statusFor(a: Application): string {
  const svc = getService(a.serviceId);
  if (!svc) return 'Other';
  const cat = getState(svc, a.state)?.category;
  if (cat === 'issued') {
    const d = daysUntil(a.certificate?.expiresAt || a.expiryDate);
    if (d !== null && d < 0) return 'Expired';
    return 'Active';
  }
  if (cat === 'cancelled') return 'Cancelled';
  if (cat === 'rejected') return 'Rejected';
  return 'Open Workflow';
}
