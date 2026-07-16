import { useMemo, useState } from 'react';
import { useApps } from '../../store/apps';
import {
  sliceCounts, workflowFunnel, buildMonthlyTrend, isIssued, daysUntil,
} from './dashboardData';
import {
  StatTile, ChartCard, StackedTrendChart, DonutChart, HorizontalBarChart, WorkflowFunnel, DrillGrid, FilterChips,
  StaggerGrid, StaggerItem, KpiSegmentBar, KpiSplitStat, KpiMiniBars,
} from './components';
import { ServiceDashboardLayout, DashSectionRule } from './ServiceDashboardLayout';
import { formatDate } from '../../lib/utils';

// ============================================================================
// MAES Dashboard — SDD §3.4 · violet tone
// ============================================================================

const STATUS_OPTIONS = ['Active', 'Expiring', 'Expired', 'Cancelled', 'Revoked'];
const APPLICANT_TYPE = ['agent', 'manufacturer', 'distributor'];

export function MaesDashboardPage() {
  const apps = useApps((s) => s.apps);
  const [statuses, setStatuses] = useState<string[]>([]);
  const [appType, setAppType] = useState<string[]>([]);

  const maes = useMemo(() => apps.filter((a) => a.module === 'maes'), [apps]);
  const slice = useMemo(() => sliceCounts(apps, 'maes'), [apps]);

  const today = new Date().toISOString().slice(0, 10);
  const allMaterials = useMemo(() => maes.flatMap((a) => (a.materials ?? []).map((m) => ({ ...m, parent: a }))), [maes]);
  const materialsLive = useMemo(() => allMaterials.filter((m) => m.status !== 'cancelled' && m.status !== 'revoked' && m.expiryDate >= today), [allMaterials, today]);
  const expiring30 = useMemo(() => materialsLive.filter((m) => {
    const d = daysUntil(m.expiryDate);
    return d !== null && d >= 0 && d <= 30;
  }), [materialsLive]);

  const byApplicantType = useMemo(() => {
    const m: Record<string, number> = { agent: 0, manufacturer: 0, distributor: 0 };
    maes.filter(isIssued).forEach((a) => {
      const t = (a.fieldValues?.applicantType || 'agent').toLowerCase();
      m[t] = (m[t] ?? 0) + 1;
    });
    return m;
  }, [maes]);

  const trend = useMemo(() => buildMonthlyTrend(maes, (a) => {
    if (!a.approvedOn) return null;
    const t = (a.fieldValues?.applicantType || 'agent').toLowerCase();
    return t.charAt(0).toUpperCase() + t.slice(1);
  }), [maes]);

  const materialDist: { key: string; label: string; count: number }[] = useMemo(() => {
    const map: Record<string, number> = {};
    for (const m of materialsLive) {
      map[m.materialType] = (map[m.materialType] ?? 0) + 1;
    }
    return Object.entries(map).map(([k, c]) => ({ key: k, label: k, count: c })).sort((a, b) => b.count - a.count).slice(0, 10);
  }, [materialsLive]);

  const countryDist: { key: string; label: string; count: number }[] = useMemo(() => {
    const map: Record<string, number> = {};
    for (const m of materialsLive) {
      map[m.manufacturerCountry] = (map[m.manufacturerCountry] ?? 0) + 1;
    }
    return Object.entries(map).map(([k, c]) => ({ key: k, label: k, count: c })).sort((a, b) => b.count - a.count);
  }, [materialsLive]);

  const topManufacturers: { key: string; label: string; count: number }[] = useMemo(() => {
    const map: Record<string, number> = {};
    for (const m of materialsLive) {
      const owner = m.parent.company.name;
      map[owner] = (map[owner] ?? 0) + 1;
    }
    return Object.entries(map).map(([k, c]) => ({ key: k, label: k, count: c })).sort((a, b) => b.count - a.count).slice(0, 15);
  }, [materialsLive]);

  const funnel = useMemo(() => workflowFunnel(apps, 'maes'), [apps]);

  // Monthly approvals
  const monthlyApprovals = useMemo(() => {
    const out: { value: number }[] = [];
    const now = new Date();
    for (let m = 11; m >= 0; m--) {
      const start = new Date(now.getFullYear(), now.getMonth() - m, 1);
      const end = new Date(now.getFullYear(), now.getMonth() - m + 1, 1);
      out.push({ value: maes.filter((a) => a.approvedOn && new Date(a.approvedOn) >= start && new Date(a.approvedOn) < end && isIssued(a)).length });
    }
    return out;
  }, [maes]);

  const filtered = useMemo(() => maes.filter((a) => {
    if (appType.length > 0 && !appType.includes((a.fieldValues?.applicantType || '').toLowerCase())) return false;
    if (statuses.length === 0) return true;
    const issued = isIssued(a);
    const exp = daysUntil(a.certificate?.expiresAt || a.expiryDate);
    if (statuses.includes('Active')   && issued && (exp === null || exp > 60)) return true;
    if (statuses.includes('Expiring') && issued && exp !== null && exp >= 0 && exp <= 60) return true;
    if (statuses.includes('Expired')  && issued && exp !== null && exp < 0) return true;
    return false;
  }), [maes, statuses, appType]);

  return (
    <ServiceDashboardLayout
      tone="violet"
      module="Material & Equipment Approval System"
      title="MAES Dashboard"
      subtitle="Certificate-level and per-material expiry model"
      breadcrumbLabel="MAES"
      filterBar={
        <>
          <FilterChips label="Status" options={STATUS_OPTIONS} value={statuses} onChange={setStatuses} />
          <FilterChips label="Applicant Type" options={APPLICANT_TYPE} value={appType} onChange={setAppType} />
        </>
      }
    >
      <section>
        <DashSectionRule>Headlines</DashSectionRule>
        <StaggerGrid className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-4 gap-2.5">
          <StaggerItem>
            <StatTile tone="violet" label="Active MAES Certs" value={slice.active} caption="Monthly approvals · 12m"
              viz={<KpiMiniBars data={monthlyApprovals} tone="violet" />} />
          </StaggerItem>
          <StaggerItem>
            <StatTile tone="indigo" label="Materials Registered" value={materialsLive.length} caption="Live in-date materials"
              viz={<KpiSplitStat stats={[
                { label: 'Live',  value: materialsLive.length, tone: 'indigo' },
                { label: '<30d', value: expiring30.length,    tone: 'amber' },
              ]} />} />
          </StaggerItem>
          <StaggerItem>
            <StatTile tone="teal" label="Applicant Mix" value={Object.values(byApplicantType).reduce((s, v) => s + v, 0)} caption="Agent · Manufacturer · Distributor"
              viz={<KpiSegmentBar segments={[
                { label: 'Agent',  value: byApplicantType.agent || 0,        tone: 'violet' },
                { label: 'Mfr.',   value: byApplicantType.manufacturer || 0, tone: 'indigo' },
                { label: 'Distr.', value: byApplicantType.distributor || 0,  tone: 'teal' },
              ]} />} />
          </StaggerItem>
          <StaggerItem>
            <StatTile tone="emerald" label="Issued · YTD" value={slice.issuedYtd} caption="Pipeline"
              viz={<KpiSplitStat stats={[
                { label: 'Open',  value: slice.open,         tone: 'indigo' },
                { label: 'Done',  value: slice.issuedYtd,    tone: 'emerald' },
              ]} />} />
          </StaggerItem>
        </StaggerGrid>
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        <div className="lg:col-span-2">
          <ChartCard title="Trend · in-date materials by Applicant Type" subtitle="Per month · last 12 months" height={260}>
            <StackedTrendChart data={trend} series={[
              { key: 'Agent',        label: 'Agent',        color: '#7B3FE4' },
              { key: 'Manufacturer', label: 'Manufacturer', color: '#6366F1' },
              { key: 'Distributor',  label: 'Distributor',  color: '#0F766E' },
            ]} />
          </ChartCard>
        </div>
        <ChartCard title="Distribution by Country of Origin" height={260}>
          <DonutChart data={countryDist} />
        </ChartCard>
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        <ChartCard title="Distribution by Material Type" height={240}>
          <HorizontalBarChart data={materialDist} colorByIndex />
        </ChartCard>
        <ChartCard title="Top Manufacturers (OEM)" subtitle="By in-date material count" height={240}>
          <HorizontalBarChart data={topManufacturers} />
        </ChartCard>
        <div className="bg-white border border-neutral-200 rounded-xl shadow-doe-sm p-4">
          <div className="text-[12.5px] font-semibold text-ink-950 mb-3">Workflow Funnel</div>
          <WorkflowFunnel stages={funnel} />
        </div>
      </section>

      <section>
        <DashSectionRule right={<span className="text-[11px] text-neutral-500">{filtered.length.toLocaleString()} records</span>}>Drill-Down · Certificates</DashSectionRule>
        <DrillGrid
          rows={filtered}
          cols={[
            { key: 'applicationNumber', label: 'Certificate Reference', render: (r) => <span className="font-mono text-[11px]">{r.applicationNumber}</span>, width: '170px' },
            { key: 'applicantType',     label: 'Applicant Type', render: (r) => (r.fieldValues?.applicantType ?? '—').replace(/^\w/, (c) => c.toUpperCase()) },
            { key: 'applicantName',     label: 'Applicant', render: (r) => r.company.name },
            { key: 'materialCount',     label: 'Materials (in-date / total)', render: (r) => {
              const list = r.materials ?? [];
              const inDate = list.filter((m) => m.status !== 'cancelled' && m.status !== 'revoked' && m.expiryDate >= today).length;
              return <span className="font-mono text-[11px]">{inDate} / {list.length}</span>;
            }},
            { key: 'certExpiry',        label: 'Certificate Expiry (MAX)', render: (r) => formatDate(r.certificate?.expiresAt || r.expiryDate) },
            { key: 'status',            label: 'Status', render: (r) => {
              const issued = isIssued(r);
              const d = daysUntil(r.certificate?.expiresAt || r.expiryDate);
              if (!issued) return 'Open Workflow';
              if (d === null) return 'Active';
              if (d < 0) return 'Expired';
              if (d <= 60) return 'Expiring';
              return 'Active';
            }},
          ]}
          rowHref={(r) => `/app/${r.id}`}
        />
      </section>
    </ServiceDashboardLayout>
  );
}
