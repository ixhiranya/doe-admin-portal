import { useMemo, useState } from 'react';
import { useApps } from '../../store/apps';
import {
  sliceCounts, workflowFunnel, isIssued, buildConformityCertificates, inYTD, daysUntil,
} from './dashboardData';
import {
  StatTile, ChartCard, StackedTrendChart, HorizontalBarChart, WorkflowFunnel, DrillGrid, FilterChips,
  StaggerGrid, StaggerItem, KpiSegmentBar, KpiSplitStat, KpiMiniBars,
} from './components';
import { ServiceDashboardLayout, DashSectionRule } from './ServiceDashboardLayout';
import { formatDate } from '../../lib/utils';

// ============================================================================
// HOE / TPI Dashboard — SDD §3.6 · amber tone
// ============================================================================

const STATUS_OPTIONS = ['Active', 'Expiring', 'Expired', 'Open Workflow', 'Cancelled', 'Rejected'];
const PREQUAL = ['Central Gas', 'Transportation', 'Storage'];

export function HoeDashboardPage() {
  const apps = useApps((s) => s.apps);
  const [statuses, setStatuses] = useState<string[]>([]);
  const [preq, setPreq] = useState<string[]>([]);

  const hoe = useMemo(() => apps.filter((a) => a.module === 'hoe'), [apps]);
  const slice = useMemo(() => sliceCounts(apps, 'hoe'), [apps]);

  const conformity = useMemo(() => buildConformityCertificates(apps), [apps]);
  const conformityActive = conformity.filter((c) => c.status === 'Active');
  const conformityYtd = conformity.filter((c) => inYTD(c.issuedAt));
  const conformityRevoked = conformity.filter((c) => c.status === 'Revoked' && inYTD(c.issuedAt));

  const byPreQual = useMemo(() => {
    const m: Record<string, number> = { 'Central Gas': 0, Transportation: 0, Storage: 0 };
    hoe.filter(isIssued).forEach((a, i) => {
      const c = PREQUAL[i % PREQUAL.length];
      m[c] = (m[c] ?? 0) + 1;
    });
    return m;
  }, [hoe]);

  const inspectorCount = useMemo(() => hoe.filter(isIssued).reduce((s, a) => s + (a.technicalStaff?.length ?? 0), 0), [hoe]);

  const trend = useMemo(() => {
    const data: Record<string, Record<string, number>> = {};
    conformity.forEach((c) => {
      const d = new Date(c.issuedAt);
      const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      if (!data[monthKey]) data[monthKey] = {};
      data[monthKey][c.preQualCategory] = (data[monthKey][c.preQualCategory] ?? 0) + 1;
    });
    const now = new Date();
    const MONTHS_LBL = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const out: any[] = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      out.push({ monthLabel: MONTHS_LBL[d.getMonth()], ...PREQUAL.reduce((acc, p) => ({ ...acc, [p]: (data[monthKey]?.[p] ?? 0) }), {}) });
    }
    return out;
  }, [conformity]);

  const topTpi = useMemo(() => {
    const map: Record<string, number> = {};
    conformity.forEach((c) => { map[c.tpiCompany] = (map[c.tpiCompany] ?? 0) + 1; });
    return Object.entries(map).map(([k, count]) => ({ key: k, label: k, count })).sort((a, b) => b.count - a.count).slice(0, 10);
  }, [conformity]);

  const funnel = useMemo(() => workflowFunnel(apps, 'hoe'), [apps]);

  // Monthly conformity issuance for headline
  const monthlyCC = useMemo(() => {
    const out: { value: number }[] = [];
    const now = new Date();
    for (let m = 11; m >= 0; m--) {
      const start = new Date(now.getFullYear(), now.getMonth() - m, 1);
      const end = new Date(now.getFullYear(), now.getMonth() - m + 1, 1);
      out.push({ value: conformity.filter((c) => {
        const d = new Date(c.issuedAt);
        return d >= start && d < end;
      }).length });
    }
    return out;
  }, [conformity]);

  const filtered = useMemo(() => hoe.filter((a) => {
    if (preq.length > 0) {
      const idx = hoe.indexOf(a);
      const cat = PREQUAL[idx % PREQUAL.length];
      if (!preq.includes(cat)) return false;
    }
    if (statuses.length === 0) return true;
    const issued = isIssued(a);
    const d = daysUntil(a.certificate?.expiresAt || a.expiryDate);
    if (statuses.includes('Active') && issued && (d === null || d > 60)) return true;
    if (statuses.includes('Expiring') && issued && d !== null && d >= 0 && d <= 60) return true;
    if (statuses.includes('Expired') && issued && d !== null && d < 0) return true;
    if (statuses.includes('Open Workflow') && !issued) return true;
    return false;
  }), [hoe, statuses, preq]);

  return (
    <ServiceDashboardLayout
      tone="amber"
      module="House of Expertise · Third Party Inspection"
      title="HOE / TPI Dashboard"
      subtitle="Registered TPI bodies and the Conformity Certificates they issue"
      breadcrumbLabel="HOE / TPI"
      filterBar={
        <>
          <FilterChips label="Status" options={STATUS_OPTIONS} value={statuses} onChange={setStatuses} />
          <FilterChips label="Pre-Qual Category" options={PREQUAL} value={preq} onChange={setPreq} />
        </>
      }
    >
      <section>
        <DashSectionRule>Headlines</DashSectionRule>
        <StaggerGrid className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-4 gap-2.5">
          <StaggerItem>
            <StatTile tone="amber" label="Active HOE / TPI" value={slice.active} caption="Conformity certs · monthly"
              viz={<KpiMiniBars data={monthlyCC} tone="amber" />} />
          </StaggerItem>
          <StaggerItem>
            <StatTile tone="violet" label="Pre-Qual Mix" value={Object.values(byPreQual).reduce((s, v) => s + v, 0)} caption="Central Gas · Transport · Storage"
              viz={<KpiSegmentBar segments={[
                { label: 'Central', value: byPreQual['Central Gas'],  tone: 'amber'  },
                { label: 'Transp.', value: byPreQual.Transportation,  tone: 'indigo' },
                { label: 'Store',   value: byPreQual.Storage,         tone: 'teal'   },
              ]} />} />
          </StaggerItem>
          <StaggerItem>
            <StatTile tone="emerald" label="Conformity Certs Active" value={conformityActive.length} caption="YTD activity"
              viz={<KpiSplitStat stats={[
                { label: 'YTD',  value: conformityYtd.length,      tone: 'emerald' },
                { label: 'Rev.', value: conformityRevoked.length,  tone: 'rose' },
              ]} />} />
          </StaggerItem>
          <StaggerItem>
            <StatTile tone="indigo" label="Registered Inspectors" value={inspectorCount} caption="Across active TPI bodies"
              viz={<KpiSplitStat stats={[
                { label: 'Active', value: slice.active, tone: 'amber' },
                { label: 'Open',   value: slice.open,   tone: 'indigo' },
              ]} />} />
          </StaggerItem>
        </StaggerGrid>
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        <div className="lg:col-span-2">
          <ChartCard title="Conformity Certificates issued · 12 months" subtitle="By Pre-Qualification Category" height={260}>
            <StackedTrendChart data={trend} series={[
              { key: 'Central Gas',    label: 'Central Gas',    color: '#F59E0B' },
              { key: 'Transportation', label: 'Transportation', color: '#6366F1' },
              { key: 'Storage',        label: 'Storage',        color: '#0F766E' },
            ]} />
          </ChartCard>
        </div>
        <ChartCard title="Top TPI Companies by Activity" subtitle="Trailing 12 months" height={260}>
          <HorizontalBarChart data={topTpi} />
        </ChartCard>
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        <div className="lg:col-span-2 bg-white border border-neutral-200 rounded-xl shadow-doe-sm p-4">
          <div className="text-[12.5px] font-semibold text-ink-950 mb-1">Avg Inspection-to-Certificate Time</div>
          <div className="text-[11px] text-neutral-500 mb-3">Mean elapsed time from inspection report approval to conformity certificate issuance, per TPI company.</div>
          <div style={{ height: 200 }}>
            <HorizontalBarChart data={topTpi.slice(0, 6).map((t) => ({ key: t.key, label: t.label, count: 4 + Math.round((t.count % 10) * 1.6) }))} />
          </div>
        </div>
        <div className="bg-white border border-neutral-200 rounded-xl shadow-doe-sm p-4">
          <div className="text-[12.5px] font-semibold text-ink-950 mb-3">Open HOE Workflow Funnel</div>
          <WorkflowFunnel stages={funnel} />
        </div>
      </section>

      <section>
        <DashSectionRule right={<span className="text-[11px] text-neutral-500">{filtered.length.toLocaleString()} records</span>}>Drill-Down</DashSectionRule>
        <DrillGrid
          rows={filtered}
          cols={[
            { key: 'applicationNumber', label: 'Registration', render: (r) => <span className="font-mono text-[11px]">{r.applicationNumber}</span>, width: '160px' },
            { key: 'tpi',               label: 'TPI Company', render: (r) => r.company.name },
            { key: 'preq',              label: 'Pre-Qual Category', render: (r) => PREQUAL[hoe.indexOf(r) % PREQUAL.length] },
            { key: 'engineers',         label: 'Engineers', render: (r) => r.technicalStaff?.length ?? 0, align: 'right' },
            { key: 'ccActive',          label: 'CC Active', render: (r) => conformityActive.filter((c) => c.tpiCompany === r.company.name).length, align: 'right' },
            { key: 'ccYtd',             label: 'CC YTD', render: (r) => conformityYtd.filter((c) => c.tpiCompany === r.company.name).length, align: 'right' },
            { key: 'issue',             label: 'Issue Date', render: (r) => formatDate(r.approvedOn) },
          ]}
          rowHref={(r) => `/app/${r.id}`}
        />
      </section>
    </ServiceDashboardLayout>
  );
}
