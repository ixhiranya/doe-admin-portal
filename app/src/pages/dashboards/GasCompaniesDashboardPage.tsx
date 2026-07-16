import { useMemo, useState } from 'react';
import { useApps } from '../../store/apps';
import {
  sliceCounts, workflowFunnel, buildMonthlyTrend, distributionByField, isIssued, daysUntil,
} from './dashboardData';
import {
  StatTile, ChartCard, StackedTrendChart, HorizontalBarChart, WorkflowFunnel, DrillGrid, FilterChips,
  StaggerGrid, StaggerItem, KpiSegmentBar, KpiSplitStat, KpiMiniBars,
} from './components';
import { ServiceDashboardLayout, DashSectionRule } from './ServiceDashboardLayout';
import { formatDate } from '../../lib/utils';

// ============================================================================
// Gas Companies Dashboard — SDD §3.5 · slate (neutral / registration) tone
// ============================================================================

const STATUS_OPTIONS = ['Active', 'Expiring', 'Expired', 'Open Workflow', 'Cancelled', 'Rejected'];
const CATEGORIES = ['A', 'B', 'C', 'D'];

export function GasCompaniesDashboardPage() {
  const apps = useApps((s) => s.apps);
  const [statuses, setStatuses] = useState<string[]>([]);
  const [cats, setCats] = useState<string[]>([]);

  const gas = useMemo(() => apps.filter((a) => a.module === 'gas'), [apps]);
  const slice = useMemo(() => sliceCounts(apps, 'gas'), [apps]);

  const byCategory = useMemo(() => {
    const map: Record<string, number> = { A: 0, B: 0, C: 0, D: 0 };
    gas.filter(isIssued).forEach((a) => { map[a.category || 'D'] = (map[a.category || 'D'] ?? 0) + 1; });
    return map;
  }, [gas]);

  const engineerCount = useMemo(() => gas.filter(isIssued).reduce((s, a) => s + (a.technicalStaff?.filter((t) => t.staffType === 'Engineer').length ?? 0), 0), [gas]);
  const technicianCount = useMemo(() => gas.filter(isIssued).reduce((s, a) => s + (a.technicalStaff?.filter((t) => t.staffType === 'Technician').length ?? 0), 0), [gas]);

  const trend = useMemo(() => buildMonthlyTrend(gas, (a) => {
    if (!a.approvedOn) return null;
    return `Cat ${a.category || 'D'}`;
  }), [gas]);

  const byCity = useMemo(() => distributionByField(gas.filter(isIssued), 'city', 'Abu Dhabi'), [gas]);
  const funnel = useMemo(() => workflowFunnel(apps, 'gas'), [apps]);

  const monthlyApprovals = useMemo(() => {
    const out: { value: number }[] = [];
    const now = new Date();
    for (let m = 11; m >= 0; m--) {
      const start = new Date(now.getFullYear(), now.getMonth() - m, 1);
      const end = new Date(now.getFullYear(), now.getMonth() - m + 1, 1);
      out.push({ value: gas.filter((a) => a.approvedOn && new Date(a.approvedOn) >= start && new Date(a.approvedOn) < end && isIssued(a)).length });
    }
    return out;
  }, [gas]);

  const filtered = useMemo(() => gas.filter((a) => {
    if (cats.length > 0 && !cats.includes(a.category || 'D')) return false;
    if (statuses.length === 0) return true;
    const issued = isIssued(a);
    const d = daysUntil(a.certificate?.expiresAt || a.expiryDate);
    if (statuses.includes('Active') && issued && (d === null || d > 60)) return true;
    if (statuses.includes('Expiring') && issued && d !== null && d >= 0 && d <= 60) return true;
    if (statuses.includes('Expired') && issued && d !== null && d < 0) return true;
    if (statuses.includes('Open Workflow') && !issued) return true;
    return false;
  }), [gas, statuses, cats]);

  return (
    <ServiceDashboardLayout
      tone="slate"
      module="Gas Systems Companies Registration"
      title="Gas Companies Dashboard"
      subtitle="Population of registered Gas Operators and Contractors across Categories A / B / C / D"
      breadcrumbLabel="Gas Companies"
      filterBar={
        <>
          <FilterChips label="Status" options={STATUS_OPTIONS} value={statuses} onChange={setStatuses} />
          <FilterChips label="Category" options={CATEGORIES} value={cats} onChange={setCats} />
        </>
      }
    >
      <section>
        <DashSectionRule>Headlines</DashSectionRule>
        <StaggerGrid className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-4 gap-2.5">
          <StaggerItem>
            <StatTile tone="slate" label="Active Registrations" value={slice.active} caption="Monthly approvals · 12m"
              viz={<KpiMiniBars data={monthlyApprovals} tone="slate" />} />
          </StaggerItem>
          <StaggerItem>
            <StatTile tone="blue" label="Category Mix" value={Object.values(byCategory).reduce((s, v) => s + v, 0)} caption="A · B · C · D"
              viz={<KpiSegmentBar segments={[
                { label: 'A', value: byCategory.A, tone: 'blue'    },
                { label: 'B', value: byCategory.B, tone: 'emerald' },
                { label: 'C', value: byCategory.C, tone: 'violet'  },
              ]} />} />
          </StaggerItem>
          <StaggerItem>
            <StatTile tone="emerald" label="Technical Staff" value={engineerCount + technicianCount} caption="Engineers + Technicians"
              viz={<KpiSplitStat stats={[
                { label: 'Eng.',  value: engineerCount,   tone: 'emerald' },
                { label: 'Tech.', value: technicianCount, tone: 'indigo' },
              ]} />} />
          </StaggerItem>
          <StaggerItem>
            <StatTile tone="amber" label="Expiring < 60 days" value={slice.expiringSoon} caption="Open / Pipeline"
              viz={<KpiSplitStat stats={[
                { label: 'Open', value: slice.open,     tone: 'indigo' },
                { label: '<60', value: slice.expiringSoon, tone: 'amber'  },
              ]} />} />
          </StaggerItem>
        </StaggerGrid>
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        <div className="lg:col-span-2">
          <ChartCard title="Trend · 12 months · by Category" subtitle="Applications approved per month" height={260}>
            <StackedTrendChart data={trend} series={[
              { key: 'Cat A', label: 'Category A', color: '#3B82F6' },
              { key: 'Cat B', label: 'Category B', color: '#10B981' },
              { key: 'Cat C', label: 'Category C', color: '#7B3FE4' },
              { key: 'Cat D', label: 'Category D', color: '#F59E0B' },
            ]} />
          </ChartCard>
        </div>
        <ChartCard title="Distribution by Emirate" height={260}>
          <HorizontalBarChart data={byCity} colorByIndex />
        </ChartCard>
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <ChartCard title="Engineer Pool" subtitle="Total technical staff across active registrations" height={220}>
          <HorizontalBarChart data={[
            { key: 'eng', label: 'Engineers',   count: engineerCount },
            { key: 'tec', label: 'Technicians', count: technicianCount },
          ]} colorByIndex />
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
            { key: 'applicationNumber', label: 'Registration', render: (r) => <span className="font-mono text-[11px]">{r.applicationNumber}</span>, width: '160px' },
            { key: 'company',           label: 'Company Name', render: (r) => r.company.name },
            { key: 'category',          label: 'Category', render: (r) => <span className="inline-flex h-5 min-w-[20px] px-1.5 items-center justify-center rounded bg-neutral-100 text-neutral-700 text-[10.5px] font-mono font-bold">{r.category}</span>, align: 'center', width: '80px' },
            { key: 'issue',             label: 'Issue Date', render: (r) => formatDate(r.approvedOn) },
            { key: 'expiry',            label: 'Expiry', render: (r) => formatDate(r.certificate?.expiresAt) },
            { key: 'engineers',         label: 'Engineers', render: (r) => (r.technicalStaff?.filter((t) => t.staffType === 'Engineer').length ?? 0), align: 'right' },
            { key: 'amc',               label: 'Active AMC Count', render: (r) => {
              const count = apps.filter((a) => a.module === 'amc' && isIssued(a) && a.company.name === r.company.name).length;
              return count;
            }, align: 'right' },
          ]}
          rowHref={(r) => `/app/${r.id}`}
        />
      </section>
    </ServiceDashboardLayout>
  );
}
