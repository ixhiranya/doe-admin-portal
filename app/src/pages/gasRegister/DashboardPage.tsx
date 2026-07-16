import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  StatTile, StaggerGrid, StaggerItem, MotionFadeIn,
  ChartCard, StackedTrendChart, HorizontalBarChart, DonutChart, WorkflowFunnel,
  KpiMiniBars, KpiRadial, KpiSegmentBar, KpiSplitStat,
  Pulse, LastRefreshed, FilterChips,
} from '../dashboards/components';
import {
  listCustomers, CATEGORIES, listActiveCustomers, customerCompliance, aggregateCompliance,
  type CustomerCategory,
} from '../../services/gasRegister/customers';
import { CERTS, bandTone } from '../../services/gasRegister/compliance';
import { GAS_TYPES, PRODUCT_TYPES, formatVolumeDual } from '../../services/gasRegister/technical';
import { listInflow, listOutflow } from '../../services/gasRegister/gasFlow';
import { listSuppliers } from '../../services/gasRegister/suppliers';
import { listAssets } from '../../services/gasRegister/assets';
import { cn } from '../../lib/utils';

// =============================================================================
// Gas Register Dashboard — BN 17 of the Gas Register SDD.
// Centralised analytics with drill-down. KPIs at the top, Inflow vs Outflow
// chart by gas type, top-10 companies + customers, compliance heatmap per
// Category, certificate-expiry counters, and connection / disconnection.
// =============================================================================

const CITY_OPTIONS = ['Abu Dhabi', 'Al Ain', 'Al Dhafra'] as const;

export function GasRegisterDashboardPage() {
  const customers = useMemo(() => listCustomers(), []);
  const activeCustomers = useMemo(() => listActiveCustomers(), []);
  const inflow    = useMemo(() => listInflow(), []);
  const outflow   = useMemo(() => listOutflow(), []);
  const suppliers = useMemo(() => listSuppliers(), []);
  const assets    = useMemo(() => listAssets(), []);

  // ----- KPI counters (current month) ----------------------------------------
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
  const inflowThisMonth  = inflow.filter((r) => r.date >= monthStart);
  const outflowThisMonth = outflow.filter((r) => r.date >= monthStart);
  const inflowMonthLiters  = inflowThisMonth.reduce((s, r) => s + r.volumeLiters, 0);
  const outflowMonthLiters = outflowThisMonth.reduce((s, r) => s + r.quantityLiters, 0);

  const compliance = useMemo(() => aggregateCompliance(), []);
  const disconnectedThisMonth = customers.filter((c) => c.connectionStatus === 'Disconnected' || c.connectionStatus === 'Suspended').length;

  // ----- 12-month inflow vs outflow trend ------------------------------------
  const trend = useMemo(() => {
    const M = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const buckets: any[] = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const start = new Date(d).toISOString().slice(0, 10);
      const end = new Date(d.getFullYear(), d.getMonth() + 1, 1).toISOString().slice(0, 10);
      const inflowKL = inflow.filter((r) => r.date >= start && r.date < end).reduce((s, r) => s + r.volumeLiters, 0) / 1000;
      const outflowKL = outflow.filter((r) => r.date >= start && r.date < end).reduce((s, r) => s + r.quantityLiters, 0) / 1000;
      buckets.push({ monthLabel: M[d.getMonth()], Inflow: Math.round(inflowKL), Outflow: Math.round(outflowKL) });
    }
    return buckets;
  }, [inflow, outflow]);

  // ----- Inflow / Outflow per Gas Type --------------------------------------
  const flowByGasType = useMemo(() => {
    return GAS_TYPES.map((g) => {
      const inL  = inflow.filter((r) => r.gasType === g.id || r.gasType === g.label || r.gasType === g.shortLabel)
        .reduce((s, r) => s + r.volumeLiters, 0);
      const outL = outflow.filter((r) => r.gasType === g.id || r.gasType === g.label || r.gasType === g.shortLabel)
        .reduce((s, r) => s + r.quantityLiters, 0);
      return { gas: g.shortLabel, Inflow: Math.round(inL / 1000), Outflow: Math.round(outL / 1000) };
    }).filter((r) => r.Inflow > 0 || r.Outflow > 0);
  }, [inflow, outflow]);

  // ----- Top 10 by inflow (suppliers) ---------------------------------------
  const topInflowSuppliers = useMemo(() => {
    const m: Record<string, number> = {};
    inflow.forEach((r) => { m[r.supplierName] = (m[r.supplierName] ?? 0) + r.volumeLiters; });
    return Object.entries(m).map(([k, c]) => ({ key: k, label: k, count: Math.round(c / 1000) }))
      .sort((a, b) => b.count - a.count).slice(0, 10);
  }, [inflow]);

  // ----- Top 10 customers by outflow ----------------------------------------
  const topOutflowCustomers = useMemo(() => {
    const m: Record<string, number> = {};
    outflow.forEach((r) => { m[r.customerName] = (m[r.customerName] ?? 0) + r.quantityLiters; });
    return Object.entries(m).map(([k, c]) => ({ key: k, label: k, count: Math.round(c / 1000) }))
      .sort((a, b) => b.count - a.count).slice(0, 10);
  }, [outflow]);

  // ----- Compliance distribution donut -------------------------------------
  const complianceDist = useMemo(() => [
    { key: 'fc',  label: 'Fully Compliant', count: compliance.byBand['Fully Compliant'] },
    { key: 'mg',  label: 'Minor Gap',        count: compliance.byBand['Minor Gap'] },
    { key: 'ar',  label: 'At Risk',          count: compliance.byBand['At Risk'] },
    { key: 'nc',  label: 'Non-Compliant',    count: compliance.byBand['Non-Compliant'] },
  ], [compliance]);

  // ----- Certificate expiry counters (30/60/90 days) ------------------------
  const expiryCounters = useMemo(() => {
    let in30 = 0, in60 = 0, in90 = 0, expired = 0;
    customers.forEach((c) => {
      CERTS.forEach((cert) => {
        const state = c.certificates[cert.id];
        if (state.status !== 'YES' || !state.expiryDate) return;
        const d = Math.round((new Date(state.expiryDate).getTime() - Date.now()) / 86400000);
        if (d < 0) expired++;
        else if (d <= 30) in30++;
        else if (d <= 60) in60++;
        else if (d <= 90) in90++;
      });
    });
    return { in30, in60, in90, expired };
  }, [customers]);

  // ----- Compliance heatmap by Category ---------------------------------------
  const heatmap = useMemo(() => {
    return CATEGORIES.map((cat) => {
      const inCat = customers.filter((c) => c.category === cat.id);
      if (inCat.length === 0) return null;
      const rate = Math.round(inCat.reduce((s, c) => s + customerCompliance(c).rate, 0) / inCat.length);
      return { id: cat.id, label: cat.label, count: inCat.length, rate };
    }).filter(Boolean) as { id: CustomerCategory; label: string; count: number; rate: number }[];
  }, [customers]);

  // ----- Top permit holders by inflow + outflow ------------------------------
  const topCompanies = useMemo(() => {
    const m: Record<string, number> = {};
    inflow.forEach((r) => { m[r.permitHolderName] = (m[r.permitHolderName] ?? 0) + r.volumeLiters; });
    outflow.forEach((r) => { m[r.permitHolderName] = (m[r.permitHolderName] ?? 0) + r.quantityLiters; });
    return Object.entries(m).map(([k, c]) => ({ key: k, label: k, count: Math.round(c / 1000) }))
      .sort((a, b) => b.count - a.count).slice(0, 10);
  }, [inflow, outflow]);

  // ----- Monthly KPI sparkline data for headline tile -----------------------
  const inflowSpark = trend.map((b) => ({ value: b.Inflow }));

  // ----- Connection status segment ------------------------------------------
  const connectionMix = useMemo(() => [
    { label: 'Active',       value: customers.filter((c) => c.connectionStatus === 'Active').length,        tone: 'emerald' as const },
    { label: 'Disconnected', value: customers.filter((c) => c.connectionStatus === 'Disconnected').length,  tone: 'rose'    as const },
    { label: 'Suspended',    value: customers.filter((c) => c.connectionStatus === 'Suspended').length,     tone: 'amber'   as const },
  ], [customers]);

  return (
    <div className="bg-neutral-25 min-h-full">
      <div className="relative bg-gradient-to-br from-orange-50 via-white to-white border-b border-neutral-100">
        <div className="absolute top-0 left-0 right-0 h-0.5 bg-action-orange" />
        <div className="max-w-[1440px] mx-auto px-6 pt-4 pb-3.5">
          <nav className="text-[10.5px] text-neutral-500 mb-1.5 flex items-center gap-1.5">
            <Link to="/pps-dashboard" className="hover:text-ink-950 transition">Home</Link>
            <span className="text-neutral-300">›</span>
            <span>Gas Register</span>
            <span className="text-neutral-300">›</span>
            <span className="text-ink-950 font-semibold">Dashboard</span>
          </nav>
          <div className="flex items-center justify-between gap-6 flex-wrap">
            <div className="min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="inline-flex items-center px-1.5 h-4 rounded bg-action-orange-soft text-action-orange-deep text-[9px] font-mono font-bold tracking-wider uppercase">BN 17</span>
                <div className="text-[9.5px] font-sans uppercase tracking-[0.18em] text-neutral-500 truncate">Gas Register · Centralised Analytics</div>
              </div>
              <h1 className="font-display text-[17px] font-bold text-ink-950 leading-tight">Gas Register Dashboard</h1>
              <div className="text-[11px] text-neutral-500 mt-0.5">
                KPIs · inflow vs outflow · top-10 · compliance heatmap · certificate expiry · connection / disconnection
              </div>
            </div>
            <div className="flex items-center gap-2.5 flex-wrap text-[11px]">
              <FilterChips label="City" options={[...CITY_OPTIONS]} value={[]} onChange={() => {}} />
              <span className="w-px h-4 bg-neutral-200" />
              <Pulse />
              <LastRefreshed />
              <Link to="#" className="h-6 px-2 rounded border border-neutral-200 bg-white text-ink-950 text-[10.5px] font-semibold hover:bg-neutral-50 transition flex items-center gap-1">Export</Link>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-[1440px] mx-auto px-6 py-5 space-y-6">

        {/* ───── KPI HEADLINES ───── */}
        <section>
          <SectionRule>Headlines · Current Month</SectionRule>
          <StaggerGrid className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-2.5">
            <StaggerItem><StatTile tone="orange" label="Active Companies" value={new Set(customers.map((c) => c.permitHolderId)).size} caption="Permit holders on file"
              viz={<KpiSplitStat stats={[{ label: 'Sup.', value: suppliers.length, tone: 'orange' }, { label: 'Ast.', value: assets.length, tone: 'indigo' }]} />} /></StaggerItem>
            <StaggerItem><StatTile tone="indigo" label="Active Customers" value={activeCustomers.length} caption={`${disconnectedThisMonth} disconnected/suspended`}
              viz={<KpiSegmentBar segments={connectionMix} />} /></StaggerItem>
            <StaggerItem><StatTile tone="blue" label="Total Inflow · MTD" value={Math.round(inflowMonthLiters / 1000)} unit="kL" caption={formatVolumeDual(inflowMonthLiters, 'L', 'lpg')}
              viz={<KpiMiniBars data={inflowSpark} tone="blue" />} /></StaggerItem>
            <StaggerItem><StatTile tone="teal" label="Total Outflow · MTD" value={Math.round(outflowMonthLiters / 1000)} unit="kL" caption={formatVolumeDual(outflowMonthLiters, 'L', 'lpg')}
              viz={<KpiMiniBars data={trend.map((b) => ({ value: b.Outflow }))} tone="teal" />} /></StaggerItem>
            <StaggerItem><StatTile tone="emerald" label="Avg Compliance Rate" value={`${compliance.avg}%`} caption="Live, across all facilities"
              viz={<KpiRadial value={compliance.avg} total={100} tone="emerald" subLabel={`${compliance.byBand['Fully Compliant']} fully compliant`} />} /></StaggerItem>
            <StaggerItem><StatTile tone="rose" label="Certs Expiring · 30d" value={expiryCounters.in30} caption={`${expiryCounters.expired} expired · ${expiryCounters.in60} in 60d`}
              viz={<KpiSegmentBar segments={[
                { label: '30d', value: expiryCounters.in30, tone: 'rose' },
                { label: '60d', value: expiryCounters.in60, tone: 'amber' },
                { label: '90d', value: expiryCounters.in90, tone: 'emerald' },
              ]} />} /></StaggerItem>
          </StaggerGrid>
        </section>

        {/* ───── INFLOW vs OUTFLOW · 12-month trend ───── */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-3">
          <div className="lg:col-span-2">
            <ChartCard title="Gas Flow · 12-month trend" subtitle="Monthly Inflow vs Outflow · kL" height={260}>
              <StackedTrendChart data={trend} series={[
                { key: 'Inflow',  label: 'Inflow',  color: '#3B82F6' },
                { key: 'Outflow', label: 'Outflow', color: '#0F766E' },
              ]} />
            </ChartCard>
          </div>
          <ChartCard title="Compliance Distribution" subtitle="Across all facilities" height={260}>
            <DonutChart data={complianceDist} />
          </ChartCard>
        </section>

        {/* ───── PER GAS TYPE + TOP-10 ───── */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-3">
          <ChartCard title="Inflow vs Outflow by Gas Type" subtitle="kL · current period" height={240}>
            <StackedTrendChart data={flowByGasType.map((r) => ({ monthLabel: r.gas, ...r }))} series={[
              { key: 'Inflow',  label: 'Inflow',  color: '#3B82F6' },
              { key: 'Outflow', label: 'Outflow', color: '#0F766E' },
            ]} />
          </ChartCard>
          <ChartCard title="Top 10 Companies · combined volume" subtitle="kL across inflow + outflow" height={240}>
            <HorizontalBarChart data={topCompanies} />
          </ChartCard>
          <ChartCard title="Top 10 Customers · by Outflow" subtitle="kL · trailing period" height={240}>
            <HorizontalBarChart data={topOutflowCustomers} colorByIndex />
          </ChartCard>
        </section>

        {/* ───── COMPLIANCE HEATMAP ───── */}
        <section>
          <SectionRule right={<span className="text-[11px] text-neutral-500">Per category · live Compliance Rate from BN 14</span>}>
            Compliance Heatmap
          </SectionRule>
          <div className="bg-white rounded-xl border border-neutral-200 shadow-doe-sm p-4">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
              {heatmap.map((row) => {
                const band = row.rate === 100 ? 'Fully Compliant'
                  : row.rate >= 75 ? 'Minor Gap'
                  : row.rate >= 50 ? 'At Risk'
                  : 'Non-Compliant';
                const tone = bandTone(band as any);
                return (
                  <div key={row.id} className={cn('relative rounded-lg border p-3 hover:shadow-doe-sm transition', tone.pill)}>
                    <div className="text-[10px] font-sans uppercase tracking-wider opacity-90">{row.label}</div>
                    <div className="font-display font-bold text-[22px] mt-1 tabular-nums">{row.rate}%</div>
                    <div className="text-[10.5px] mt-1">
                      {row.count} facilit{row.count === 1 ? 'y' : 'ies'} · <span className="font-semibold">{band}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* ───── TOP SUPPLIERS + Connection summary ───── */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-3">
          <div className="lg:col-span-2">
            <ChartCard title="Top 10 Suppliers · by Inflow" subtitle="kL · trailing period" height={260}>
              <HorizontalBarChart data={topInflowSuppliers} />
            </ChartCard>
          </div>
          <div className="bg-white border border-neutral-200 rounded-xl shadow-doe-sm p-4">
            <div className="text-[12.5px] font-semibold text-ink-950 mb-1">Connection / Disconnection</div>
            <div className="text-[11px] text-neutral-500 mb-3">Current snapshot · per SDD §3.13</div>
            <MotionFadeIn>
              <WorkflowFunnel stages={[
                { stage: 'Active',       count: customers.filter((c) => c.connectionStatus === 'Active').length },
                { stage: 'Suspended',    count: customers.filter((c) => c.connectionStatus === 'Suspended').length },
                { stage: 'Disconnected', count: customers.filter((c) => c.connectionStatus === 'Disconnected').length },
                { stage: 'Expired',      count: customers.filter((c) => c.connectionStatus === 'Expired').length },
              ]} />
            </MotionFadeIn>
          </div>
        </section>

        {/* ───── CERT EXPIRY ALERTS ───── */}
        <section>
          <SectionRule>Certificate Expiry · Action Required</SectionRule>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
            {CERTS.map((cert) => {
              const items = customers
                .map((c) => ({ customer: c, state: c.certificates[cert.id] }))
                .filter((x) => x.state.status === 'YES' && x.state.expiryDate)
                .map((x) => ({ ...x, days: Math.round((new Date(x.state.expiryDate!).getTime() - Date.now()) / 86400000) }))
                .filter((x) => x.days >= 0 && x.days <= 90)
                .sort((a, b) => a.days - b.days)
                .slice(0, 5);
              return (
                <div key={cert.id} className="bg-white border border-neutral-200 rounded-xl shadow-doe-sm overflow-hidden">
                  <div className="px-3.5 py-2.5 border-b border-neutral-100">
                    <div className="text-[12.5px] font-semibold text-ink-950">{cert.label}</div>
                    <div className="text-[11px] text-neutral-500">{items.length} expiring in &lt;90d</div>
                  </div>
                  {items.length === 0 ? (
                    <div className="px-3.5 py-4 text-[11px] text-neutral-500 text-center">All certificates renewed.</div>
                  ) : (
                    <div className="divide-y divide-neutral-100">
                      {items.map(({ customer, days }) => (
                        <Link key={customer.id + cert.id} to={`/gas-register/customers/${customer.id}`} className="block px-3.5 py-2 hover:bg-neutral-25 transition">
                          <div className="flex items-center justify-between gap-2">
                            <div className="text-[11.5px] font-semibold text-ink-950 truncate">{customer.buildingName}</div>
                            <span className={cn('text-[10.5px] font-mono font-bold tabular-nums',
                              days <= 7 ? 'text-doe-red' : days <= 30 ? 'text-amber-600' : 'text-neutral-700')}>
                              {days}d
                            </span>
                          </div>
                          <div className="text-[10.5px] text-neutral-500 mt-0.5 truncate">{customer.permitHolderName} · {customer.area}</div>
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* ───── PRODUCT TYPE breakdown — per SDD business feedback ───── */}
        <section>
          <SectionRule right={<span className="text-[11px] text-neutral-500">Per Type of Gas + Product Type · SDD §3.8</span>}>
            Gas Catalog
          </SectionRule>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            <div className="bg-white border border-neutral-200 rounded-xl shadow-doe-sm p-4">
              <div className="text-[12.5px] font-semibold text-ink-950 mb-3">Type of Gas</div>
              <div className="grid grid-cols-2 gap-2">
                {GAS_TYPES.map((g) => (
                  <div key={g.id} className="flex items-center gap-2 px-2.5 py-1.5 rounded-md bg-neutral-25 border border-neutral-100">
                    <span className="inline-flex items-center px-1.5 h-4 rounded text-[9.5px] font-mono font-bold bg-action-orange-soft text-action-orange-deep">{g.shortLabel}</span>
                    <span className="text-[11px] text-neutral-700 truncate">{g.label.replace(/ \/ .*/, '')}</span>
                  </div>
                ))}
              </div>
              <div className="text-[10.5px] text-neutral-500 mt-3">
                NG &amp; CNG added per business feedback; LPG / Propane / Butane / Butadienes / Benzol retained.
              </div>
            </div>
            <div className="bg-white border border-neutral-200 rounded-xl shadow-doe-sm p-4">
              <div className="text-[12.5px] font-semibold text-ink-950 mb-3">Product Type</div>
              <div className="space-y-1.5">
                {PRODUCT_TYPES.map((p) => (
                  <div key={p.id} className="flex items-center justify-between px-2.5 py-2 rounded-md bg-neutral-25 border border-neutral-100">
                    <span className="text-[11.5px] text-ink-950 font-medium">{p.label}</span>
                    <span className="text-[9.5px] font-mono text-neutral-500 uppercase tracking-wider">{p.id}</span>
                  </div>
                ))}
              </div>
              <div className="text-[10.5px] text-neutral-500 mt-3">
                CNG decanting point added per business feedback.
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

// ============================================================
function SectionRule({ children, right }: { children: React.ReactNode; right?: React.ReactNode }) {
  return (
    <div className="flex items-end justify-between mb-2.5">
      <div className="text-[10.5px] font-sans uppercase tracking-[0.18em] text-neutral-500">{children}</div>
      {right}
    </div>
  );
}

