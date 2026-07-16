import { useMemo, useState } from 'react';
import { useApps } from '../../store/apps';
import {
  sliceCounts, workflowFunnel, buildMonthlyTrend, distributionByField,
  isIssued, daysUntil,
} from './dashboardData';
import {
  StatTile, ChartCard, StackedTrendChart, HorizontalBarChart, WorkflowFunnel, DrillGrid, FilterChips,
  StaggerGrid, StaggerItem, KpiRadial, KpiSegmentBar, KpiSplitStat, KpiMiniBars,
} from './components';
import { ServiceDashboardLayout, DashSectionRule } from './ServiceDashboardLayout';
import type { Application } from '../../types';
import { formatDate } from '../../lib/utils';
import { getService } from '../../services/registry';
import { getState } from '../../engine/workflow';

// ============================================================================
// NOC Dashboard — SDD §3.2 · teal tone
// ============================================================================

const STATUS_OPTIONS = ['Active', 'Expiring', 'Expired', 'Cancelled', 'Revoked', 'Open Workflow'];

export function NocDashboardPage() {
  const apps = useApps((s) => s.apps);
  const [statuses, setStatuses] = useState<string[]>([]);

  const noc = useMemo(() => apps.filter((a) => a.module === 'noc'), [apps]);
  const amc = useMemo(() => apps.filter((a) => a.module === 'amc'), [apps]);
  const slice = useMemo(() => sliceCounts(apps, 'noc'), [apps]);

  const buildingsWithBoth = useMemo(() => {
    const amcKeys = new Set(amc.filter(isIssued).map((a) => (a.fieldValues?.buildingNo || a.fieldValues?.premisesNumber || a.id)));
    return noc.filter(isIssued).filter((a) => amcKeys.has(a.fieldValues?.buildingNo || a.fieldValues?.premisesNumber || a.id)).length;
  }, [noc, amc]);

  const trend = useMemo(() => buildMonthlyTrend(noc, (a) => {
    if (!a.approvedOn) return null;
    const action = a.serviceId.split('.')[1];
    return action.charAt(0).toUpperCase() + action.slice(1);
  }), [noc]);

  const byGasSupply = useMemo(() => distributionByField(noc.filter(isIssued), 'gasSupplyCompany'), [noc]);
  const funnel = useMemo(() => workflowFunnel(apps, 'noc'), [apps]);

  const coverage = useMemo(() => {
    const cities = ['Abu Dhabi', 'Al Ain', 'Al Dhafra'];
    return cities.map((city) => ({
      monthLabel: city,
      AMC: amc.filter((a) => isIssued(a) && (a.fieldValues?.city || 'Abu Dhabi') === city).length,
      NOC: noc.filter((a) => isIssued(a) && (a.fieldValues?.city || 'Abu Dhabi') === city).length,
    }));
  }, [amc, noc]);

  // Monthly approvals for headline tile
  const monthlyApprovals = useMemo(() => {
    const out: { value: number }[] = [];
    const now = new Date();
    for (let m = 11; m >= 0; m--) {
      const start = new Date(now.getFullYear(), now.getMonth() - m, 1);
      const end = new Date(now.getFullYear(), now.getMonth() - m + 1, 1);
      out.push({ value: noc.filter((a) => a.approvedOn && new Date(a.approvedOn) >= start && new Date(a.approvedOn) < end && isIssued(a)).length });
    }
    return out;
  }, [noc]);

  const actionMix = useMemo(() => {
    const issued = (action: string) => noc.filter((a) => a.serviceId === `noc.${action}` && isIssued(a)).length;
    return [
      { label: 'Renew',  value: issued('renew'),  tone: 'emerald' as const },
      { label: 'Cancel', value: issued('cancel'), tone: 'amber'   as const },
      { label: 'Revoke', value: issued('revoke'), tone: 'rose'    as const },
    ];
  }, [noc]);

  const filtered = useMemo(() => noc.filter((a) => {
    if (statuses.length === 0) return true;
    return statuses.includes(statusFor(a));
  }), [noc, statuses]);

  return (
    <ServiceDashboardLayout
      tone="teal"
      module="No Objection Certificate"
      title="NOC Dashboard"
      subtitle="Operational state of the NOC service across the Emirate"
      breadcrumbLabel="NOC"
      filterBar={<FilterChips label="Status" options={STATUS_OPTIONS} value={statuses} onChange={setStatuses} />}
    >
      <section>
        <DashSectionRule>Headlines</DashSectionRule>
        <StaggerGrid className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-4 gap-2.5">
          <StaggerItem>
            <StatTile tone="teal" label="Active NOCs" value={slice.active} caption="Monthly approvals · 12m"
              viz={<KpiMiniBars data={monthlyApprovals} tone="teal" />}
              onClick={() => setStatuses(['Active'])} />
          </StaggerItem>
          <StaggerItem>
            <StatTile tone="emerald" label="NOC + AMC dual-coverage" value={buildingsWithBoth} caption="of NOC active total"
              viz={<KpiRadial value={buildingsWithBoth} total={Math.max(1, slice.active)} tone="emerald" subLabel="Both certificates active" />} />
          </StaggerItem>
          <StaggerItem>
            <StatTile tone="violet" label="YTD activity" value={slice.issuedYtd + slice.renewalsYtd} caption="Action mix · YTD"
              viz={<KpiSegmentBar segments={actionMix} />} />
          </StaggerItem>
          <StaggerItem>
            <StatTile tone="indigo" label="Avg Processing" value={slice.avgProcessingDays} unit="days" caption="Pipeline status"
              viz={<KpiSplitStat stats={[
                { label: 'Open',  value: slice.open,         tone: 'indigo' },
                { label: '<60d', value: slice.expiringSoon,  tone: 'amber'  },
              ]} />} />
          </StaggerItem>
        </StaggerGrid>
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        <div className="lg:col-span-2">
          <ChartCard title="Trend · 12 months" subtitle="Applications by action per month" height={260}>
            <StackedTrendChart data={trend} series={[
              { key: 'Renew',  label: 'Renewal',      color: '#0F766E' },
              { key: 'Cancel', label: 'Cancellation', color: '#F59E0B' },
              { key: 'Revoke', label: 'Revocation',   color: '#E11D48' },
            ]} />
          </ChartCard>
        </div>
        <ChartCard title="Coverage vs AMC · per City" subtitle="Buildings with both certificates active" height={260}>
          <StackedTrendChart data={coverage as any} series={[
            { key: 'AMC', label: 'AMC', color: '#3B82F6' },
            { key: 'NOC', label: 'NOC', color: '#0F766E' },
          ]} />
        </ChartCard>
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <ChartCard title="Distribution by Gas Supply Company" height={240}>
          <HorizontalBarChart data={byGasSupply} />
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
            { key: 'applicationNumber', label: 'NOC Reference', render: (r) => <span className="font-mono text-[11px]">{r.applicationNumber}</span>, width: '160px' },
            { key: 'building',          label: 'Building / Premises', render: (r) => <div className="text-[11.5px]"><div className="font-semibold text-ink-950">{r.fieldValues?.premisesName || r.company.name}</div><div className="text-neutral-500">{r.fieldValues?.buildingNo || '—'}</div></div> },
            { key: 'operator',          label: 'Gas Operator', render: (r) => r.company.name },
            { key: 'status',            label: 'Status', render: (r) => statusFor(r) },
            { key: 'issue',             label: 'Issue Date', render: (r) => formatDate(r.approvedOn) },
            { key: 'expiry',            label: 'Expiry Date', render: (r) => formatDate(r.certificate?.expiresAt) },
            { key: 'amcLinked',         label: 'Linked AMC', render: (r) => amcLinkedStatus(r, amc) },
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
    if (d === null) return 'Active';
    if (d < 0) return 'Expired';
    if (d <= 60) return 'Expiring';
    return 'Active';
  }
  if (cat === 'cancelled') return 'Cancelled';
  if (cat === 'rejected') return 'Rejected';
  return 'Open Workflow';
}

function amcLinkedStatus(noc: Application, allAmc: Application[]): React.ReactNode {
  const key = noc.fieldValues?.buildingNo || noc.fieldValues?.premisesNumber;
  if (!key) return <span className="text-neutral-400">Not on File</span>;
  const linked = allAmc.find((a) => (a.fieldValues?.buildingNo || a.fieldValues?.premisesNumber) === key && isIssued(a));
  if (!linked) return <span className="text-doe-red font-semibold">No AMC</span>;
  return <span className="text-emerald-600 font-semibold">Active</span>;
}
