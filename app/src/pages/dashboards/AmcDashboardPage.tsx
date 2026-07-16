import { useMemo, useState } from 'react';
import { useApps } from '../../store/apps';
import {
  sliceCounts, workflowFunnel, buildMonthlyTrend, distributionByCity, distributionByBuildingType, topCompanies,
  isIssued, isOpenWorkflow, daysUntil,
} from './dashboardData';
import {
  StatTile, ChartCard, StackedTrendChart, HorizontalBarChart, DonutChart, WorkflowFunnel, DrillGrid, FilterChips,
  StaggerGrid, StaggerItem, KpiMiniBars, KpiRadial, KpiSegmentBar, KpiSplitStat,
} from './components';
import { ServiceDashboardLayout, DashSectionRule } from './ServiceDashboardLayout';
import type { Application } from '../../types';
import { formatDate } from '../../lib/utils';
import { getService } from '../../services/registry';
import { getState } from '../../engine/workflow';

// ============================================================================
// AMC Dashboard — SDD §3.1 · blue tone identity
// ============================================================================

const STATUS_OPTIONS = ['Active', 'Expiring', 'Expired', 'Cancelled', 'Revoked'];

export function AmcDashboardPage() {
  const apps = useApps((s) => s.apps);
  const [statuses, setStatuses] = useState<string[]>([]);
  const [openOnly, setOpenOnly] = useState(false);

  const amc = useMemo(() => apps.filter((a) => a.module === 'amc'), [apps]);

  const filtered = useMemo(() => amc.filter((a) => {
    if (openOnly && !isOpenWorkflow(a)) return false;
    if (statuses.length > 0) {
      const flag = statusFor(a);
      if (!statuses.includes(flag)) return false;
    }
    return true;
  }), [amc, statuses, openOnly]);

  const slice = useMemo(() => sliceCounts(apps, 'amc'), [apps]);
  const trend = useMemo(() => buildMonthlyTrend(amc, (a) => {
    if (!a.approvedOn) return null;
    const action = a.serviceId.split('.')[1];
    return action.charAt(0).toUpperCase() + action.slice(1);
  }), [amc]);

  const byCity = useMemo(() => distributionByCity(amc.filter(isIssued)), [amc]);
  const byType = useMemo(() => distributionByBuildingType(amc.filter(isIssued)), [amc]);
  const topMaintenance = useMemo(() => topCompanies(amc.filter(isIssued), 10), [amc]);
  const funnel = useMemo(() => workflowFunnel(apps, 'amc'), [apps]);

  // Monthly approval activity for the headline tile mini-bars
  const monthlyApprovals = useMemo(() => {
    const out: { value: number }[] = [];
    const now = new Date();
    for (let m = 11; m >= 0; m--) {
      const start = new Date(now.getFullYear(), now.getMonth() - m, 1);
      const end = new Date(now.getFullYear(), now.getMonth() - m + 1, 1);
      out.push({ value: amc.filter((a) => a.approvedOn && new Date(a.approvedOn) >= start && new Date(a.approvedOn) < end && isIssued(a)).length });
    }
    return out;
  }, [amc]);

  // Action mix
  const actionMix = useMemo(() => {
    const issued = (action: string) => amc.filter((a) => a.serviceId === `amc.${action}` && isIssued(a)).length;
    return [
      { label: 'Issue',  value: issued('issue'),  tone: 'blue'    as const },
      { label: 'Renew',  value: issued('renew'),  tone: 'emerald' as const },
      { label: 'Modify', value: issued('modify'), tone: 'violet'  as const },
    ];
  }, [amc]);

  return (
    <ServiceDashboardLayout
      tone="blue"
      module="Annual Maintenance Contract for Gas Systems"
      title="AMC Dashboard"
      subtitle="Operational state of the AMC service across the Emirate"
      breadcrumbLabel="AMC"
      filterBar={
        <>
          <FilterChips label="Status" options={STATUS_OPTIONS} value={statuses} onChange={setStatuses} />
          <label className="flex items-center gap-1.5 text-[11px] text-neutral-700">
            <input type="checkbox" checked={openOnly} onChange={(e) => setOpenOnly(e.target.checked)} className="accent-blue-600" />
            Open Workflows only
          </label>
        </>
      }
    >
      {/* ── KPI Tiles ── */}
      <section>
        <DashSectionRule>Headlines</DashSectionRule>
        <StaggerGrid className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-4 gap-2.5">
          <StaggerItem>
            <StatTile tone="blue" label="Active AMCs" value={slice.active} caption="Monthly approvals · 12m"
              viz={<KpiMiniBars data={monthlyApprovals} tone="blue" />}
              onClick={() => setStatuses(['Active'])} />
          </StaggerItem>
          <StaggerItem>
            <StatTile tone="amber" label="Expiring < 60 Days" value={slice.expiringSoon} caption="Renewal pipeline"
              viz={<KpiRadial value={slice.expiringSoon} total={Math.max(1, slice.active + slice.expiringSoon)} tone="amber" subLabel="of active total" />}
              onClick={() => setStatuses(['Expiring'])} />
          </StaggerItem>
          <StaggerItem>
            <StatTile tone="emerald" label="Issued · YTD" value={slice.issuedYtd} caption="Action mix · YTD"
              viz={<KpiSegmentBar segments={actionMix} />} />
          </StaggerItem>
          <StaggerItem>
            <StatTile tone="indigo" label="Avg Processing Time" value={slice.avgProcessingDays} unit="days" caption="Submission → issuance"
              viz={<KpiSplitStat stats={[
                { label: 'Open',  value: slice.open,         tone: 'indigo' },
                { label: 'Done',  value: slice.issuedYtd,    tone: 'emerald' },
              ]} />} />
          </StaggerItem>
        </StaggerGrid>
      </section>

      {/* ── Charts row 1 ── */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        <div className="lg:col-span-2">
          <ChartCard title="Trend · 12 months" subtitle="Applications by action per month" height={260}>
            <StackedTrendChart data={trend} series={[
              { key: 'Issue',  label: 'New',          color: '#3B82F6' },
              { key: 'Renew',  label: 'Renewal',      color: '#10B981' },
              { key: 'Modify', label: 'Modification', color: '#7B3FE4' },
              { key: 'Cancel', label: 'Cancellation', color: '#F59E0B' },
              { key: 'Revoke', label: 'Revocation',   color: '#E11D48' },
            ]} />
          </ChartCard>
        </div>
        <ChartCard title="Distribution by City" height={260}>
          <DonutChart data={byCity} />
        </ChartCard>
      </section>

      {/* ── Charts row 2 ── */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        <ChartCard title="Distribution by Building Type" height={240}>
          <HorizontalBarChart data={byType} colorByIndex />
        </ChartCard>
        <ChartCard title="Top Maintenance Companies" subtitle="By active AMC count" height={240}>
          <HorizontalBarChart data={topMaintenance} />
        </ChartCard>
        <div className="bg-white border border-neutral-200 rounded-xl shadow-doe-sm p-4">
          <div className="text-[12.5px] font-semibold text-ink-950 mb-3">Workflow Funnel</div>
          <WorkflowFunnel stages={funnel} />
        </div>
      </section>

      {/* ── Drill-Down ── */}
      <section>
        <DashSectionRule right={<span className="text-[11px] text-neutral-500">{filtered.length.toLocaleString()} records</span>}>Drill-Down</DashSectionRule>
        <DrillGrid
          rows={filtered}
          cols={[
            { key: 'applicationNumber', label: 'AMC Reference', render: (r) => <span className="font-mono text-[11px]">{r.applicationNumber}</span>, width: '160px' },
            { key: 'building',          label: 'Building / Premises', render: (r) => <div className="text-[11.5px]"><div className="font-semibold text-ink-950">{r.fieldValues?.premisesName || r.fieldValues?.buildingName || r.company.name}</div><div className="text-neutral-500">{r.fieldValues?.buildingNo || r.fieldValues?.premisesNumber || '—'}</div></div> },
            { key: 'maintenance',       label: 'Maintenance Company', render: (r) => r.company.name },
            { key: 'state',             label: 'Status', render: (r) => statusFor(r) },
            { key: 'issue',             label: 'Issue Date', render: (r) => formatDate(r.approvedOn) },
            { key: 'expiry',            label: 'Expiry Date', render: (r) => formatDate(r.certificate?.expiresAt) },
            { key: 'days',              label: 'Days Left', align: 'right', render: (r) => daysUntilCell(r) },
            { key: 'last',              label: 'Last Action', render: (r) => formatDate(r.updatedAt) },
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
  if (cat === 'pending' || cat === 'returned' || cat === 'payment' || cat === 'draft') return 'Open Workflow';
  return 'Other';
}

function daysUntilCell(a: Application) {
  const d = daysUntil(a.certificate?.expiresAt || a.expiryDate);
  if (d === null) return '—';
  if (d < 0) return <span className="text-doe-red font-semibold">{d}</span>;
  if (d <= 60) return <span className="text-amber-600 font-semibold">{d}</span>;
  return <span className="text-neutral-700">{d}</span>;
}
