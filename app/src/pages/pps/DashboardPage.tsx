import { useMemo, useState, useEffect, type ReactNode } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { datasetFor, PPS_PRODUCTS, RECENT_PRODUCT_SUBMISSIONS, productEntities } from '../../data/pps';
import { StackedBars } from '../../components/charts/StackedBars';
import { AreaLine } from '../../components/charts/AreaLine';
import { ProductPicker } from '../../components/pps/ProductPicker';
import { PlayersModule } from '../../components/pps/PlayersModule';
import { TpisModule } from '../../components/pps/TpisModule';
import { PLAYERS_BY_PRODUCT, TPIS_BY_PRODUCT, TPI_COLUMNS_BY_PRODUCT } from '../../data/pps-modules';
import { InfrastructureMap } from '../../components/pps/InfrastructureMap';
import { useAuth } from '../../store/auth';
import {
  StatTile,
  StaggerGrid,
  StaggerItem,
  MotionFadeIn,
  AnimatedNumber,
  KpiMiniBars,
  KpiSegmentBar,
  KpiSplitStat,
  KpiRadial,
  Pulse,
  LastRefreshed,
} from '../dashboards/components';
import { cn, OMAR_ID } from '../../lib/utils';

// ============================================================================
// Petroleum Products Submissions Dashboard (SDD §4.13)
// Redesigned to align with the centralized PPS Dashboard family — same compact
// header pattern, same StatTile + viz primitives, same per-module tone (orange
// for petroleum). KPIs and analytic content preserved unchanged.
// ============================================================================

export function PpsDashboardPage() {
  const navigate = useNavigate();
  const { productId } = useParams<{ productId?: string }>();
  const product = productId ? PPS_PRODUCTS.find((p) => p.id === productId) : PPS_PRODUCTS.find((p) => p.id === 'diesel');
  const ds = useMemo(() => datasetFor(product?.id ?? 'diesel', 2024), [product?.id]);

  const [range, setRange] = useState<'1M' | '3M' | 'YTD' | '2024' | '2019-24' | 'Custom'>('2024');
  const [chartMode, setChartMode] = useState<'Stacked' | 'Lines' | 'Δ vs forecast'>('Stacked');

  // POC (Omar · Gasoline only): Supply & Demand / Players view tabs on the
  // dashboard. Default = supply (current dashboard, unchanged). Players swaps the
  // body for the bare Gasoline Players table. Resets to supply on product change.
  const user = useAuth((s) => s.user);
  const isOmar = user?.id === OMAR_ID;
  // Category tabs on EVERY product dashboard for Omar. Tab availability mirrors the
  // PPS Submissions screens: Supply & Demand + Players everywhere, TPIs only for
  // LPG / Diesel. The header refinement + Gasoline label rename stay Gasoline-only.
  const showDashTabs = isOmar;
  const gasolineHeader = isOmar && product?.id === 'gasoline_98';
  const TPI_DASH_PRODUCTS = ['lpg', 'diesel'];
  const dashTabDefs = [
    ['supply', 'Supply & Demand'],
    ['players', 'Players'],
    ...(TPI_DASH_PRODUCTS.includes(product?.id ?? '') ? [['tpis', 'TPIs']] : []),
  ] as ['supply' | 'players' | 'tpis', string][];
  const [dashTab, setDashTab] = useState<'supply' | 'players' | 'tpis'>('supply');
  useEffect(() => { setDashTab('supply'); }, [product?.id]);
  const activeDashTab = dashTabDefs.some(([id]) => id === dashTab) ? dashTab : 'supply';
  const playersActive = showDashTabs && activeDashTab === 'players';
  const tpisActive = showDashTabs && activeDashTab === 'tpis';
  // Omar · Gasoline only: display "Gasoline" instead of the canonical "Gasoline (98)"
  // in every user-visible label on this dashboard. Data keys stay canonical.
  const displayProductLabel = gasolineHeader ? 'Gasoline' : product?.label ?? '';

  // Dashboard TPIs view (Omar) consolidates TPIs from every licensed entity, so it
  // adds an "Entity Name" column (after Client Name, before Petroleum Product
  // Supplier). This is dashboard-only — the Submissions TPIs config is untouched.
  // Each record is tagged with one of the product's real licensed entities,
  // assigned deterministically so the value is stable per record.
  const tpiEntityPool = useMemo(
    () => productEntities(product?.id ?? '').filter((e) => !/grey market/i.test(e)),
    [product?.id],
  );
  const tpiColumnsWithEntity = useMemo(() => {
    const base = TPI_COLUMNS_BY_PRODUCT[product?.label ?? ''] ?? TPI_COLUMNS_BY_PRODUCT.Diesel;
    const entityCol = { key: 'entityName' as const, label: 'Entity Name' };
    const idx = base.findIndex((c) => c.key === 'client');
    return idx === -1 ? [...base, entityCol] : [...base.slice(0, idx + 1), entityCol, ...base.slice(idx + 1)];
  }, [product?.label]);
  const tpiSitesWithEntity = useMemo(() => {
    const sites = TPIS_BY_PRODUCT[product?.label ?? ''] ?? [];
    if (!tpiEntityPool.length) return sites;
    return sites.map((s, i) => {
      const key = `${s.tpiName ?? ''}|${s.client ?? ''}|${i}`;
      let h = 0;
      for (let j = 0; j < key.length; j++) h = (h * 31 + key.charCodeAt(j)) >>> 0;
      return { ...s, entityName: tpiEntityPool[h % tpiEntityPool.length] };
    });
  }, [product?.label, tpiEntityPool]);

  if (!product || !ds) return <div className="p-6">Unknown product.</div>;

  // ---- Derived KPIs (UNCHANGED) -------------------------------------------
  const last = ds.series.find((s) => s.year === 2024)!;
  const prev = ds.series.find((s) => s.year === 2023)!;
  const productionDeltaPct = ((last.production - prev.production) / prev.production) * 100;
  const importsDeltaPct    = ((last.imports - prev.imports) / prev.imports) * 100;
  const totalLastYear      = last.production + last.imports;
  const totalPrev          = prev.production + prev.imports;
  const salesDeltaPct      = ((totalLastYear - totalPrev) / totalPrev) * 100;
  const importShareOfSupply = (last.imports / totalLastYear) * 100;

  const officialOps = ds.operators.filter((o) => o.isOfficial);
  const greyOp      = ds.operators.find((o) => !o.isOfficial);
  const greyMarketSharePct = greyOp ? (greyOp.shareKt / totalLastYear) * 100 : 0;
  const greyExceedsTarget = greyMarketSharePct > 10;

  const hhi = Math.round(ds.operators.reduce((s, o) => s + Math.pow((o.shareKt / totalLastYear) * 100, 2), 0));
  const hhiLabel = hhi >= 2500 ? 'HIGH' : hhi >= 1500 ? 'MODERATE' : 'LOW';

  // ---- Chart series ---------------------------------------------------------
  const last12Months = last.monthlyProductionKt.map((p, i) => ({
    label: String(19 + i),
    segments: [p, last.monthlyImportsKt[i]],
  }));
  const regionBars = ds.series.map((s) => ({
    label: String(s.year - 2000).padStart(2, '0'),
    segments: [s.salesByRegion['Abu Dhabi City'] / 1000, s.salesByRegion['Al Ain'] / 1000, s.salesByRegion['Al Dhafra'] / 1000],
  }));
  const sectorBars = ds.series.map((s) => ({
    label: String(s.year - 2000).padStart(2, '0'),
    segments: [s.salesBySector.commercial / 1000, s.salesBySector.construction / 1000],
  }));
  const seasonality = ds.seasonalityKt;
  const peakIdx     = seasonality.indexOf(Math.max(...seasonality));
  const peakTrough  = Math.max(...seasonality) - Math.min(...seasonality);

  // Production-monthly-trend mini-bars for the headline tile
  const productionSpark = last.monthlyProductionKt.slice(-12).map((v) => ({ value: Math.round(v) }));

  return (
    <div className="bg-neutral-25 min-h-full">
      {/* ───── HEADER (modern compact, orange tone) ───── */}
      {/* No overflow-hidden so the ProductPicker dropdown can extend below
          the header and float over the body content. */}
      <div className="relative bg-gradient-to-br from-orange-50 via-white to-white border-b border-neutral-100">
        <div className="absolute top-0 left-0 right-0 h-0.5 bg-action-orange" />
        <div className="max-w-[1440px] mx-auto px-6 pt-4 pb-3.5">
          {/* Breadcrumb */}
          <nav className="text-[10.5px] text-neutral-500 mb-1.5 flex items-center gap-1.5">
            <Link to="/pps-dashboard" className="hover:text-ink-950 transition">Home</Link>
            <span className="text-neutral-300">›</span>
            <span>Petroleum Products</span>
            <span className="text-neutral-300">›</span>
            <span className="text-ink-950 font-semibold">{displayProductLabel} Dashboard</span>
          </nav>

          <div className="flex items-center justify-between gap-6 flex-wrap">
            <div className="min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="inline-flex items-center px-1.5 h-4 rounded bg-action-orange-soft text-action-orange-deep text-[9px] font-mono font-bold tracking-wider uppercase">
                  {product.id.toUpperCase()}
                </span>
                <div className="text-[9.5px] font-sans uppercase tracking-[0.18em] text-neutral-500 truncate">
                  Petroleum Products Data Collection · Official Sector View
                </div>
              </div>
              <h1 className="font-display text-[17px] font-bold text-ink-950 leading-tight">
                {displayProductLabel} · 2024
              </h1>
              <div className="text-[11px] text-neutral-500 mt-0.5">
                Production · imports · operator share · regional &amp; sector sales · seasonality
              </div>
            </div>
            {gasolineHeader ? (
              // Omar · Gasoline: match the PPS Submissions header — the tight
              // ProductPicker (label renamed to "Gasoline"), a green-dot refresh
              // indicator, and the Export button aligned on one line, evenly spaced.
              <div className="flex items-center gap-3 flex-wrap text-[11px]">
                <ProductPicker tight eyebrow="Active product" value={product.id} onChange={(id) => navigate(`/pps/dashboard/${id}`)} labelOverride={(p) => (p.id === 'gasoline_98' ? 'Gasoline' : p.label)} />
                <span className="w-px h-5 bg-neutral-200" />
                <div className="flex items-center gap-1.5 text-neutral-500">
                  <Pulse />
                  <LastRefreshed />
                </div>
                <button className="h-9 px-3 rounded-md border border-neutral-200 bg-white text-ink-950 text-[11.5px] font-semibold hover:bg-neutral-50 transition flex items-center gap-1.5">Export</button>
              </div>
            ) : (
            <div className="flex items-center gap-2.5 flex-wrap text-[11px]">
              <ProductPicker value={product.id} onChange={(id) => navigate(`/pps/dashboard/${id}`)} />
              <span className="w-px h-4 bg-neutral-200" />
              <Pulse />
              <LastRefreshed />
              <button className="h-6 px-2 rounded border border-neutral-200 bg-white text-ink-950 text-[10.5px] font-semibold hover:bg-neutral-50 transition flex items-center gap-1">Export</button>
            </div>
            )}
          </div>

          {/* Filter row */}
          <div className="mt-3 flex items-center gap-2.5 flex-wrap text-[11px]">
            <div className="inline-flex p-0.5 rounded-md bg-white border border-neutral-200 shadow-doe-xs">
              {(['1M', '3M', 'YTD', '2024', '2019-24', 'Custom'] as const).map((r) => (
                <button
                  key={r}
                  onClick={() => setRange(r)}
                  className={cn(
                    'h-5 px-2 rounded text-[10.5px] font-semibold transition',
                    range === r
                      ? 'bg-action-orange text-white shadow-doe-xs'
                      : 'text-neutral-600 hover:text-ink-950',
                  )}
                >
                  {r}
                </button>
              ))}
            </div>
            <FilterChip label="Region" value="All Emirates" />
            <FilterChip label="Operator" value="All" />
            <button className="h-5 px-2 rounded text-[10.5px] border border-dashed border-neutral-300 text-neutral-500 hover:bg-white hover:border-action-orange hover:text-action-orange-deep transition">+ Add filter</button>
          </div>
        </div>
      </div>

      {/* ───── BODY ───── */}
      <div className="max-w-[1440px] mx-auto px-6 py-5 space-y-6">

        {/* Omar (all products): category tabs below the header, above the content.
            Availability (Supply & Demand / Players / TPIs) mirrors the Submissions
            screens per product. */}
        {showDashTabs && (
          <div className="border-b border-neutral-200 flex items-center gap-1 -mt-1">
            {dashTabDefs.map(([id, label]) => (
              <button
                key={id}
                onClick={() => setDashTab(id)}
                className={cn(
                  'relative h-10 px-3.5 text-[13px] transition-colors border-b-2 -mb-px',
                  activeDashTab === id
                    ? 'border-action-orange text-ink-950 font-semibold'
                    : 'border-transparent text-neutral-500 font-medium hover:text-ink-950',
                )}
              >
                {label}
              </button>
            ))}
          </div>
        )}

        {playersActive ? (
          // White table surface (matches the other PPS screens) so the rows stand
          // out from the neutral-25 dashboard background. Header/rows/borders inside
          // are unchanged — the bare module just gains a white card behind it. Props
          // mirror the Submissions Players render exactly.
          <div className="card overflow-hidden">
            <PlayersModule bare productLabel={product.label} players={PLAYERS_BY_PRODUCT[product.label] ?? []} preserveOrder={product.id === 'lpg' || product.id === 'diesel'} cleanLayout={product.id === 'lpg' || product.id === 'diesel' || product.id === 'natural_gas' || product.id === 'cng' || product.id === 'ethanol' || product.id === 'biodiesel' || product.id === 'fuel_oil' || product.id === 'jet_a1' || product.id === 'saf' || product.id === 'lng' || product.id === 'naphtha'} />
          </div>
        ) : tpisActive ? (
          // TPIs (LPG / Diesel only) — bare table on a white card, same as the
          // Submissions TPIs render.
          <div className="card overflow-hidden">
            <TpisModule bare productLabel={product.label} sites={tpiSitesWithEntity} columns={tpiColumnsWithEntity} preserveOrder={product.id === 'lpg' || product.id === 'diesel'} />
          </div>
        ) : (
        <>

        {/* ============ KPI ROW + OPERATORS PANEL ============ */}
        <section className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-3">
          <div>
            <SectionRule>Headlines</SectionRule>
            <StaggerGrid className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
              {/* Production — KpiMiniBars of monthly volumes */}
              <StaggerItem>
                <StatTile tone="orange" label="Production" value={last.production} suffix=" kt"
                  caption={`vs ${prev.production.toLocaleString()} kt in 2023`}
                  delta={{ value: Number(productionDeltaPct.toFixed(1)), label: 'YoY' }}
                  viz={<KpiMiniBars data={productionSpark} tone="orange" />}
                />
              </StaggerItem>
              {/* Imports — KpiRadial of import-share-of-supply */}
              <StaggerItem>
                <StatTile tone="indigo" label="Imports" value={last.imports} suffix=" kt"
                  caption="Share of supply"
                  delta={{ value: Number(importsDeltaPct.toFixed(1)), label: 'YoY' }}
                  viz={<KpiRadial value={Math.round(importShareOfSupply)} total={100} tone="indigo" subLabel="% of total supply" />}
                />
              </StaggerItem>
              {/* Sales — KpiSegmentBar of region split */}
              <StaggerItem>
                <StatTile tone="emerald" label="Sales" value={totalLastYear} suffix=" kt"
                  caption="100% reconciled"
                  delta={{ value: Number(salesDeltaPct.toFixed(1)), label: 'YoY' }}
                  viz={<KpiSegmentBar segments={[
                    { label: 'ADC',  value: Math.round(last.salesByRegion['Abu Dhabi City'] / 1000), tone: 'teal' },
                    { label: 'Ain',  value: Math.round(last.salesByRegion['Al Ain'] / 1000),        tone: 'emerald' },
                    { label: 'Dhf',  value: Math.round(last.salesByRegion['Al Dhafra'] / 1000),     tone: 'indigo' },
                  ]} />}
                />
              </StaggerItem>
              {/* Suppliers — KpiSplitStat (official vs grey) */}
              <StaggerItem>
                <StatTile tone="slate" label="Official suppliers" value={officialOps.length} unit="cos"
                  caption={`+1 YoY · ${greyOp ? `${greyMarketSharePct.toFixed(1)}% grey-market` : 'no grey market'}`}
                  viz={<KpiSplitStat stats={[
                    { label: 'Off.',  value: officialOps.length,                tone: 'emerald' },
                    { label: 'Grey',  value: greyOp ? 1 : 0,                    tone: greyExceedsTarget ? 'rose' : 'amber' },
                  ]} />}
                />
              </StaggerItem>
            </StaggerGrid>

            {/* ============ CHART ROW 1 ============ */}
            <SectionRule className="mt-5">Volumes &amp; Channels</SectionRule>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              <ChartCard
                title="Production and Import"
                subtitle="Stacked production + imports · monthly · Mt"
                badge={
                  <div className="flex items-center gap-1 bg-neutral-50 rounded-md p-0.5 flex-shrink-0 border border-neutral-200">
                    {(['Stacked', 'Lines', 'Δ vs forecast'] as const).map((m) => (
                      <button key={m} onClick={() => setChartMode(m)} className={cn('px-2 h-5 rounded text-[10px] font-semibold transition',
                        chartMode === m ? 'bg-ink-950 text-white' : 'text-neutral-500 hover:text-ink-950')}>{m}</button>
                    ))}
                    <span className="text-[9.5px] font-mono text-neutral-400 px-1.5">N=12</span>
                  </div>
                }
              >
                <StackedBars
                  bars={last12Months.map((b) => ({ label: b.label, segments: b.segments.map((v) => v / 1000) }))}
                  segmentColors={['#0F0F10', '#E89B4C']}
                  unit="MT"
                  height={240}
                  showValuesOnTop
                />
                <ChartLegend items={[
                  { color: '#0F0F10', label: 'Production' },
                  { color: '#E89B4C', label: 'Imports' },
                ]} />
              </ChartCard>

              <ChartCard
                title="Sales by region"
                subtitle="Abu Dhabi City · Al Ain · Al Dhafra · 12-yr trend"
                badge={<Eyebrow tone="teal">YR-OVER-YR</Eyebrow>}
              >
                <StackedBars
                  bars={regionBars}
                  segmentColors={['#0F766E', '#10B981', '#6366F1']}
                  unit=""
                  height={240}
                  showValuesOnTop
                  formatTotal={(n) => n.toFixed(2)}
                />
                <ChartLegend items={[
                  { color: '#0F766E', label: 'Abu Dhabi City' },
                  { color: '#10B981', label: 'Al Ain' },
                  { color: '#6366F1', label: 'Al Dhafra' },
                ]} />
              </ChartCard>
            </div>
          </div>

          {/* ============ OPERATORS PANEL ============ */}
          <MotionFadeIn className="row-span-2">
            <div className="relative h-full text-white rounded-xl p-3.5 overflow-hidden shadow-doe-md
                            bg-gradient-to-br from-ink-950 via-[#1E2128] to-[#11131A]">
              <div className="pointer-events-none absolute -top-14 -right-10 w-36 h-36 rounded-full bg-action-orange/20 blur-3xl" />
              <div className="pointer-events-none absolute -bottom-10 -left-6 w-28 h-28 rounded-full bg-blue-500/10 blur-3xl" />

              <div className="relative">
                <div className="flex items-center justify-between mb-0.5">
                  <h3 className="font-display text-[13px] font-bold tracking-tight">Operators · 2024</h3>
                  <div className="text-right text-[9.5px] font-mono">
                    <div className="text-white/80 tabular-nums">N = {totalLastYear.toLocaleString()}</div>
                    <div className="text-white/40">kt</div>
                  </div>
                </div>
                <p className="text-[10px] text-white/60 mb-3 leading-tight">Share of total {displayProductLabel.toLowerCase()} volume · grey-market included</p>

                {greyOp && (
                  <div className={cn(
                    'rounded-md p-2.5 mb-3 relative overflow-hidden',
                    greyExceedsTarget
                      ? 'bg-[#3D1F0E] ring-1 ring-action-orange/40'
                      : 'bg-[#0F2A1A] ring-1 ring-emerald-500/30',
                  )}>
                    {greyExceedsTarget && (
                      <span className="absolute left-0 top-0 bottom-0 w-1 bg-action-orange" />
                    )}
                    <div className="flex items-center justify-between mb-1">
                      <div className="text-[9px] font-sans uppercase tracking-[0.14em] text-action-orange">Grey-market share</div>
                      <div className="text-[9px] font-sans uppercase text-white/50">Target 10%</div>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="text-[11px] font-semibold text-white pr-2">
                        {greyMarketSharePct.toFixed(1)}% — {greyExceedsTarget ? 'above' : 'within'} 10% target
                      </div>
                      <div className="font-display text-[20px] font-bold text-action-orange leading-none tabular-nums">
                        <AnimatedNumber value={greyMarketSharePct} duration={1.0} format={(v) => v.toFixed(1)} suffix="%" />
                      </div>
                    </div>
                    <div className="text-[9.5px] text-white/60 mt-1 leading-tight">≈ AED 1.4 bn unregulated revenue · 12-mo trend −1.8 pp</div>
                    <div className="h-1 rounded-full bg-white/10 overflow-hidden mt-1.5">
                      <div className="h-full rounded-full bg-gradient-to-r from-action-orange to-[#F3B870]" style={{ width: `${Math.min(100, (greyMarketSharePct / 20) * 100)}%` }} />
                    </div>
                  </div>
                )}

                <div className="text-[9px] font-sans text-white/40 mb-1 uppercase tracking-wider">0 — {product.annualVolumeMt} Mt</div>
                <div className="h-2.5 flex rounded-full overflow-hidden bg-white/10 ring-1 ring-white/5">
                  {ds.operators.map((op, i) => (
                    <div key={op.id} className={cn(
                      i === 0 ? 'bg-[#5AB0C9]' :
                      op.isOfficial ? 'bg-[#3D7A8C]' :
                      'bg-action-orange',
                    )} style={{ width: `${(op.shareKt / totalLastYear) * 100}%` }} />
                  ))}
                </div>

                <div className="mt-3 space-y-2.5">
                  {ds.operators.map((op) => {
                    const pct = (op.shareKt / totalLastYear) * 100;
                    const dot = op.isOfficial ? (ds.operators.indexOf(op) === 0 ? '#5AB0C9' : '#3D7A8C') : '#E89B4C';
                    return (
                      <div key={op.id} className="flex items-baseline justify-between">
                        <div className="flex items-baseline gap-1.5 min-w-0">
                          <span className="w-1 h-1 rounded-full mt-1 flex-shrink-0" style={{ background: dot }} />
                          <div className="min-w-0">
                            <div className="text-[11px] font-semibold truncate">{op.name}</div>
                            <div className="text-[8.5px] font-sans uppercase tracking-wider text-white/40 mt-0.5 truncate">{op.isOfficial ? `LIC ${op.licenseNumber}` : op.licenseNumber}</div>
                          </div>
                        </div>
                        <div className="text-right flex-shrink-0 ml-2">
                          <div className="font-mono text-[11px] text-white tabular-nums">{op.shareKt.toLocaleString()}<span className="text-white/40 text-[9px] ml-0.5">kt</span></div>
                          <div className="text-[9px] font-mono text-white/50">{pct.toFixed(1)}%</div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="mt-3 pt-2.5 border-t border-white/10 flex items-baseline justify-between">
                  <span className="text-[10.5px] text-white/70">HHI concentration index</span>
                  <span className="flex items-center gap-1.5">
                    <span className="font-display text-[13px] font-bold tabular-nums">{hhi.toLocaleString()}</span>
                    <span className={cn('inline-flex items-center px-1.5 h-4 rounded-full text-[8.5px] font-semibold uppercase tracking-wider',
                      hhi >= 2500 ? 'bg-doe-red text-white' : hhi >= 1500 ? 'bg-amber-500 text-white' : 'bg-emerald-500 text-white')}>{hhiLabel}</span>
                  </span>
                </div>
              </div>
            </div>
          </MotionFadeIn>
        </section>

        {/* ============ CHART ROW 2 ============ */}
        <section>
          <SectionRule>Sales mix &amp; Seasonality</SectionRule>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            <ChartCard
              title="Sales by sector"
              titleSuffix={<sup className="text-[10px] text-neutral-400 ml-0.5">1)</sup>}
              subtitle="Commercial vs construction · 12-yr trend · Mt"
              badge={<Eyebrow tone="teal">YR-OVER-YR</Eyebrow>}
            >
              <StackedBars
                bars={sectorBars}
                segmentColors={['#0F766E', '#E89B4C']}
                unit=""
                height={220}
                showValuesOnTop
                formatTotal={(n) => n.toFixed(2)}
              />
              <ChartLegend items={[
                { color: '#0F766E', label: 'Commercial' },
                { color: '#E89B4C', label: 'Construction' },
              ]} />
            </ChartCard>

            <ChartCard
              title={`Seasonality · ${displayProductLabel.toLowerCase()}`}
              subtitle="Average monthly sales per quarter · 2019–2024 · kt"
              badge={<Eyebrow tone="orange">ALL OPS</Eyebrow>}
            >
              <AreaLine
                points={seasonality}
                xLabels={['Jan','Mar','May','Jul','Sep','Nov']}
                highlightIdx={peakIdx}
                height={200}
                fill="#FDF1E2"
                stroke="#E89B4C"
              />
              <div className="grid grid-cols-3 gap-2.5 mt-2.5">
                <Stat label="Δ Peak − Trough" value={`+${peakTrough.toLocaleString()} kt`} />
                <Stat label="Seasonality index" value="1.08" />
                <Stat label="YR vs LT avg" value="+3.4%" valueClass="text-emerald-600" />
              </div>
            </ChartCard>
          </div>
        </section>

        {/* ============ RECENT SUBMISSIONS ============ */}
        <section>
          <SectionRule right={<span className="text-[11px] text-neutral-500">Sorted by review priority</span>}>Recent submissions · {displayProductLabel.toLowerCase()}</SectionRule>
          <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden shadow-doe-sm">
            <div className="px-4 py-2.5 border-b border-neutral-100 flex items-center justify-between bg-neutral-25">
              <div className="text-[12px] text-neutral-500">Filings from licensed operators</div>
              <div className="flex items-center gap-1 bg-white rounded-md p-0.5 border border-neutral-200">
                {(['All','Pending','Late'] as const).map((f, i) => (
                  <button key={f} className={cn('px-2 h-6 rounded text-[10.5px] font-semibold',
                    i === 0 ? 'bg-ink-950 text-white' : 'text-neutral-500 hover:text-ink-950')}>{f}</button>
                ))}
              </div>
            </div>
            <table className="w-full">
              <thead className="bg-neutral-25 text-[9.5px] uppercase tracking-[0.14em] text-neutral-500 border-b border-neutral-100">
                <tr>
                  <th className="text-left px-3.5 py-1.5">Period</th>
                  <th className="text-left px-3.5 py-1.5">Operator</th>
                  <th className="text-left px-3.5 py-1.5">Region</th>
                  <th className="text-left px-3.5 py-1.5">Volume</th>
                  <th className="text-left px-3.5 py-1.5">Reconciliation</th>
                  <th className="text-left px-3.5 py-1.5">Status</th>
                </tr>
              </thead>
              <tbody>
                {RECENT_PRODUCT_SUBMISSIONS.map((r, i) => (
                  <tr key={i} className="border-t border-neutral-100 hover:bg-neutral-25 transition">
                    <td className="px-3.5 py-2">
                      <div className="text-[11px] font-semibold text-ink-950">{r.period}</div>
                      <div className="text-[9.5px] font-mono text-neutral-500">{r.range}</div>
                    </td>
                    <td className="px-3.5 py-2 text-[11px] text-ink-950">{r.operator}</td>
                    <td className="px-3.5 py-2 text-[11px] text-neutral-700">{r.region}</td>
                    <td className="px-3.5 py-2 font-mono text-[10.5px] text-ink-950 tabular-nums">{r.volumeKt}<span className="text-neutral-400 ml-1">kt</span></td>
                    <td className="px-3.5 py-2"><MiniTrend trend={r.trend} /></td>
                    <td className="px-3.5 py-2"><StatusPill status={r.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* ============ INFRASTRUCTURE MAP ============ */}
        <section>
          <SectionRule right={
            <div className="flex items-center gap-2.5 text-[11px] text-neutral-600 flex-wrap">
              <LegendDot color="bg-[#3D7A8C]" label="ADNOC Distribution" />
              <LegendDot color="bg-action-orange" label="ENOC / Emarat" />
              <LegendDot color="bg-emerald-500" label="Independent / TPI" />
              <LegendDot color="bg-ink-950" label="Terminal / Depot" />
              <Eyebrow tone="teal">12 SITES</Eyebrow>
            </div>
          }>
            {displayProductLabel} Infrastructure
          </SectionRule>
          <div className="bg-white rounded-xl border border-neutral-200 p-3 shadow-doe-sm">
            <div className="text-[11.5px] text-neutral-500 mb-3 px-1">
              Real OpenStreetMap base · drag to pan · scroll/buttons to zoom · click a marker for site details · switch to Satellite from the top-right control.
            </div>
            <InfrastructureMap productLabel={displayProductLabel} height={420} />
          </div>
        </section>

        {/* ============ FOOTNOTES ============ */}
        <div className="text-[11px] text-neutral-500 leading-relaxed border-t border-neutral-200 pt-3 mt-1">
          <strong className="text-neutral-700">Note 1.</strong> Commercial sector includes {displayProductLabel.toLowerCase()} used for transportation and off-grid power generation.
          Reconciled against TPI submissions and partner returns. Construction sector covers on-site generators, plant equipment, and seasonal infrastructure projects.
        </div>

        </>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// Local helpers — kept here so the rest of the dashboard family stays untouched
// ============================================================================

function SectionRule({ children, right, className }: { children: ReactNode; right?: ReactNode; className?: string }) {
  return (
    <div className={cn('flex items-end justify-between mb-2.5', className)}>
      <div className="text-[10.5px] font-sans uppercase tracking-[0.18em] text-neutral-500">{children}</div>
      {right}
    </div>
  );
}

function ChartCard({ title, titleSuffix, subtitle, badge, children }: { title: string; titleSuffix?: ReactNode; subtitle?: string; badge?: ReactNode; children: ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-neutral-200 shadow-doe-sm p-3.5">
      <div className="flex items-start justify-between mb-2 gap-2">
        <div>
          <h3 className="text-[12px] font-semibold text-ink-950">
            {title}
            {titleSuffix}
          </h3>
          {subtitle && <p className="text-[10.5px] text-neutral-500 leading-tight mt-0.5">{subtitle}</p>}
        </div>
        {badge}
      </div>
      {children}
    </div>
  );
}

function Eyebrow({ tone, children }: { tone: 'teal' | 'orange'; children: ReactNode }) {
  const cls = tone === 'teal'
    ? 'bg-teal-50 text-teal-700 ring-1 ring-teal-200'
    : 'bg-action-orange-soft text-action-orange-deep ring-1 ring-action-orange/25';
  return (
    <span className={cn('inline-flex items-center px-2 h-5 rounded-full text-[9.5px] font-semibold uppercase tracking-[0.14em]', cls)}>{children}</span>
  );
}

function ChartLegend({ items }: { items: Array<{ color: string; label: string }> }) {
  return (
    <div className="mt-2 flex items-center gap-4 text-[10.5px] text-neutral-600 flex-wrap">
      {items.map((it) => (
        <span key={it.label} className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-sm" style={{ background: it.color }} />
          {it.label}
        </span>
      ))}
    </div>
  );
}

function FilterChip({ label, value }: { label: string; value: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 h-6 px-2 rounded-md bg-white border border-neutral-200 text-[11px]">
      <span className="text-neutral-500">{label}:</span>
      <strong className="text-ink-950">{value}</strong>
      <button className="text-neutral-400 hover:text-doe-red transition-colors">×</button>
    </span>
  );
}

function Stat({ label, value, valueClass }: { label: string; value: string; valueClass?: string }) {
  return (
    <div className="border border-neutral-200 bg-neutral-25 rounded-lg p-2.5">
      <div className="text-[9px] font-sans uppercase tracking-[0.14em] text-neutral-500">{label}</div>
      <div className={cn('font-display text-[14px] font-bold mt-0.5 tabular-nums', valueClass ?? 'text-ink-950')}>{value}</div>
    </div>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={cn('w-2 h-2 rounded-full', color)} />
      <span className="text-neutral-600">{label}</span>
    </span>
  );
}

function MiniTrend({ trend }: { trend: 'up' | 'down' | 'flat' | 'flat-up' }) {
  const colors: Record<typeof trend, string> = { up: '#10B981', down: '#EF4444', flat: '#E89B4C', 'flat-up': '#10B981' };
  const points: Record<typeof trend, string> = {
    up:        '0,12 8,8 16,6 24,4 32,2',
    'flat-up': '0,8 8,8 16,7 24,6 32,4',
    flat:      '0,7 8,7 16,7 24,7 32,7',
    down:      '0,2 8,4 16,6 24,9 32,12',
  };
  return (
    <svg width="40" height="14" viewBox="0 0 40 14">
      <polyline fill="none" stroke={colors[trend]} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" points={points[trend]} />
    </svg>
  );
}

function StatusPill({ status }: { status: 'reconciled' | 'pending' | 'overdue-4d' }) {
  const map = {
    reconciled:  { cls: 'bg-emerald-50 text-emerald-700',  label: '● Reconciled' },
    pending:     { cls: 'bg-amber-50 text-amber-700',      label: '● Pending review' },
    'overdue-4d':{ cls: 'bg-rose-50 text-doe-red',         label: '● Overdue · 4d' },
  } as const;
  const c = map[status];
  return <span className={cn('inline-flex items-center h-5 px-2 rounded-full text-[10px] font-semibold', c.cls)}>{c.label}</span>;
}
