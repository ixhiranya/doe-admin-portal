import { useMemo, useState } from 'react';
import { MapContainer, TileLayer, CircleMarker, Tooltip as LeafletTooltip } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { buildPetroleumPermits, inYTD } from './dashboardData';
import {
  StatTile, ChartCard, StackedTrendChart, HorizontalBarChart, DonutChart, WorkflowFunnel, DrillGrid, FilterChips, TrendLineChart,
  StaggerGrid, StaggerItem, KpiSegmentBar, KpiSplitStat, KpiMiniBars, ResponsiveContainer,
} from './components';
import { ServiceDashboardLayout, DashSectionRule } from './ServiceDashboardLayout';
import { cn } from '../../lib/utils';

// ============================================================================
// Petroleum Permits Dashboard — SDD §3.7 · orange tone
// ============================================================================

const PERMIT_TYPES = [
  'Buying & Selling',
  'Distribution Through Pipelines',
  'Import / Export',
  'Manufacturing',
  'Marketing',
  'Packaging',
  'Storage',
  'Transportation',
  'Transportation Incl. Gas Filling',
];

const STATUS_OPTIONS = ['Active', 'Expiring', 'Expired', 'Open'];

export function PetroleumDashboardPage() {
  const allPermits = useMemo(() => buildPetroleumPermits(), []);
  const [types, setTypes] = useState<string[]>([]);
  const [statuses, setStatuses] = useState<string[]>([]);

  const filtered = useMemo(() => allPermits.filter((p) => {
    if (types.length > 0 && !types.includes(p.permitType)) return false;
    if (statuses.length > 0 && !statuses.includes(p.status)) return false;
    return true;
  }), [allPermits, types, statuses]);

  const active = allPermits.filter((p) => p.status === 'Active');
  const expiring = allPermits.filter((p) => p.status === 'Expiring').length;
  const expired = allPermits.filter((p) => p.status === 'Expired').length;
  const open = allPermits.filter((p) => p.status === 'Open').length;
  const issuedYtd = allPermits.filter((p) => p.issuedAt && inYTD(p.issuedAt)).length;
  const avgProcessing = 18;

  const trend = useMemo(() => {
    const now = new Date();
    const M = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const buckets: any[] = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const bucket: any = { monthLabel: M[d.getMonth()] };
      PERMIT_TYPES.forEach((t) => {
        bucket[t] = allPermits.filter((p) => {
          if (p.permitType !== t || !p.issuedAt) return false;
          const id = new Date(p.issuedAt);
          return id.getFullYear() === d.getFullYear() && id.getMonth() === d.getMonth();
        }).length;
      });
      buckets.push(bucket);
    }
    return buckets;
  }, [allPermits]);

  const byProduct = useMemo(() => {
    const m: Record<string, number> = {};
    active.forEach((p) => p.products.forEach((prod) => { m[prod] = (m[prod] ?? 0) + 1; }));
    return Object.entries(m).map(([k, c]) => ({ key: k, label: k, count: c })).sort((a, b) => b.count - a.count);
  }, [active]);

  const byOperator = useMemo(() => {
    const m: Record<string, number> = {};
    active.forEach((p) => { m[p.operatorName] = (m[p.operatorName] ?? 0) + 1; });
    return Object.entries(m).map(([k, c]) => ({ key: k, label: k, count: c })).sort((a, b) => b.count - a.count).slice(0, 15);
  }, [active]);

  const tradingVolume = useMemo(() => {
    const M = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    return M.map((m, i) => ({ month: m, value: 18_000 + Math.round(Math.sin(i / 2) * 4_000 + i * 380) }));
  }, []);

  const funnel = [
    { stage: 'Submitted',                      count: open + 4 },
    { stage: 'L&C Specialist Review',          count: Math.max(2, Math.round(open * 0.7)) },
    { stage: 'Reviewer Departments',           count: Math.max(1, Math.round(open * 0.5)) },
    { stage: 'Approver Departments',           count: Math.max(1, Math.round(open * 0.3)) },
    { stage: 'Trading Regulatory Committee',   count: Math.max(0, Math.round(open * 0.15)) },
    { stage: 'Payment Pending',                count: Math.max(0, Math.round(open * 0.10)) },
  ];

  // Monthly issuance for headline tile
  const monthlyIssued = useMemo(() => {
    const out: { value: number }[] = [];
    const now = new Date();
    for (let m = 11; m >= 0; m--) {
      const start = new Date(now.getFullYear(), now.getMonth() - m, 1);
      const end = new Date(now.getFullYear(), now.getMonth() - m + 1, 1);
      out.push({ value: allPermits.filter((p) => p.issuedAt && new Date(p.issuedAt) >= start && new Date(p.issuedAt) < end).length });
    }
    return out;
  }, [allPermits]);

  return (
    <ServiceDashboardLayout
      tone="orange"
      module="Petroleum Products Trading Permits"
      title="Petroleum Permits Dashboard"
      subtitle="Operational state of trading permits across all 9 permit types"
      breadcrumbLabel="Petroleum"
      filterBar={
        <>
          <FilterChips label="Status" options={STATUS_OPTIONS} value={statuses} onChange={setStatuses} />
          <FilterChips label="Permit Type" options={PERMIT_TYPES} value={types} onChange={setTypes} />
        </>
      }
    >
      <section>
        <DashSectionRule>Headlines</DashSectionRule>
        <StaggerGrid className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-4 gap-2.5">
          <StaggerItem>
            <StatTile tone="orange" label="Active Permits" value={active.length} caption="Monthly issuance · 12m"
              viz={<KpiMiniBars data={monthlyIssued} tone="orange" />} />
          </StaggerItem>
          <StaggerItem>
            <StatTile tone="indigo" label="Pipeline" value={open + expiring + expired} caption="Open / Expiring / Expired"
              viz={<KpiSegmentBar segments={[
                { label: 'Open',    value: open,     tone: 'indigo' },
                { label: '<60d',    value: expiring, tone: 'amber'  },
                { label: 'Expired', value: expired,  tone: 'rose'   },
              ]} />} />
          </StaggerItem>
          <StaggerItem>
            <StatTile tone="emerald" label="Issued · YTD" value={issuedYtd} caption="Operators on file"
              viz={<KpiSplitStat stats={[
                { label: 'YTD',  value: issuedYtd,                                tone: 'emerald' },
                { label: 'Ops.', value: new Set(allPermits.map((p) => p.operatorName)).size, tone: 'indigo' },
              ]} />} />
          </StaggerItem>
          <StaggerItem>
            <StatTile tone="teal" label="Avg Processing" value={avgProcessing} unit="days" caption="9 permit types"
              viz={<KpiSplitStat stats={[
                { label: 'Types',  value: 9, tone: 'orange' },
                { label: 'Prod.',  value: byProduct.length, tone: 'teal' },
              ]} />} />
          </StaggerItem>
        </StaggerGrid>
      </section>

      {/* Permit-type chips */}
      <section>
        <DashSectionRule>By Permit Type</DashSectionRule>
        <div className="grid grid-cols-3 md:grid-cols-5 xl:grid-cols-9 gap-2">
          {PERMIT_TYPES.map((t) => {
            const count = active.filter((p) => p.permitType === t).length;
            const on = types.includes(t);
            return (
              <button
                key={t}
                onClick={() => setTypes(on ? types.filter((x) => x !== t) : [...types, t])}
                className={cn(
                  'rounded-md border bg-white shadow-doe-sm py-2 px-2.5 text-left transition',
                  on ? 'border-action-orange' : 'border-neutral-200 hover:border-neutral-300',
                )}
              >
                <div className="text-[10px] text-neutral-500 uppercase tracking-wider leading-tight">{t}</div>
                <div className="text-[16px] font-bold text-ink-950 tabular-nums mt-0.5">{count}</div>
              </button>
            );
          })}
        </div>
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        <div className="lg:col-span-2">
          <ChartCard title="Permits Issued · 12 months" subtitle="Stacked by permit type" height={260}>
            <StackedTrendChart data={trend} series={PERMIT_TYPES.map((t) => ({ key: t, label: t }))} />
          </ChartCard>
        </div>
        <ChartCard title="Distribution by Petroleum Product" height={260}>
          <DonutChart data={byProduct} />
        </ChartCard>
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <ChartCard title="Top Operators · by Active Permit Count" height={240}>
          <HorizontalBarChart data={byOperator} />
        </ChartCard>
        <ChartCard title="Trading Volume" subtitle="Self-reported · all products combined (m³)" height={240}>
          <ResponsiveContainer width="100%" height="100%">
            <TrendLineChart data={tradingVolume} xKey="month" yKey="value" color="#E89B4C" />
          </ResponsiveContainer>
        </ChartCard>
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        <div className="lg:col-span-2 bg-white border border-neutral-200 rounded-xl shadow-doe-sm overflow-hidden">
          <div className="px-3.5 py-2.5 border-b border-neutral-100 flex items-center justify-between">
            <div className="text-[12.5px] font-semibold text-ink-950">Petroleum Licensees · Heat Map</div>
            <div className="text-[10.5px] text-neutral-500">Coloured by compliance status</div>
          </div>
          <div style={{ height: 320 }}>
            <MapContainer center={[24.45, 54.45]} zoom={9} scrollWheelZoom={false} style={{ height: '100%', width: '100%' }}>
              <TileLayer attribution='© OpenStreetMap' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
              {filtered.filter((p) => p.lat && p.lng).map((p) => {
                const color = p.status === 'Active' ? '#10B981' : p.status === 'Expiring' ? '#F59E0B' : p.status === 'Expired' ? '#EF4444' : '#3B82F6';
                return (
                  <CircleMarker key={p.id} center={[p.lat!, p.lng!]} radius={6} pathOptions={{ color, fillColor: color, fillOpacity: 0.7, weight: 1 }}>
                    <LeafletTooltip direction="top" offset={[0, -6]}>
                      <span style={{ fontSize: 11 }}>
                        <strong>{p.operatorName}</strong><br />
                        {p.permitType}<br />
                        Status {p.status}
                      </span>
                    </LeafletTooltip>
                  </CircleMarker>
                );
              })}
            </MapContainer>
          </div>
        </div>
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
            { key: 'permitId',     label: 'Permit ID', render: (r) => <span className="font-mono text-[11px]">{r.permitId}</span>, width: '160px' },
            { key: 'operatorName', label: 'Operator', render: (r) => r.operatorName },
            { key: 'permitType',   label: 'Permit Type', render: (r) => r.permitType },
            { key: 'status',       label: 'Status' },
            { key: 'products',     label: 'Products', render: (r) => r.products.join(', ') },
            { key: 'issuedAt',     label: 'Issue Date', render: (r) => r.issuedAt ?? '—' },
            { key: 'expiresAt',    label: 'Expiry Date', render: (r) => r.expiresAt ?? '—' },
            { key: 'city',         label: 'City' },
          ]}
        />
      </section>

      <section>
        <div className="rounded-lg border border-info-500/30 bg-info-soft/40 p-3 text-[11px] text-info-500 leading-relaxed">
          <strong className="uppercase tracking-wider mr-1">Note ·</strong>
          Petroleum Permits + the underlying Petroleum Products Dashboard are modelled in the prototype with synthesised
          records. Production data is sourced from the live Petroleum Permits module (SDD §3.7) and the Petroleum Products Dashboard (§4.13).
        </div>
      </section>
    </ServiceDashboardLayout>
  );
}
