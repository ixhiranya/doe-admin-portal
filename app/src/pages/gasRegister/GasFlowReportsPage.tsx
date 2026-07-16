// =============================================================================
// Gas Register · Reports (BN 16 of the Gas Register SDD §3.16)
// -----------------------------------------------------------------------------
// All 5 SDD-mandated reports in a unified workspace:
//   1. Gas Flow Summary (inflow vs outflow per gas type)
//   2. Gas Usage Summary (outflow per gas type)
//   3. Company-Wise Customer & Gas Summary
//   4. Company Gas Inventory & Supply
//   5. Compliance Report (per facility · 4-cert tracking from §3.14)
//
// Layout strategy (redesigned to fix overlap + alignment):
//   • Single shared "Reports" hero with KPI strip below
//   • Tabs and filters live in independent rows (no horizontal collision)
//   • SVG-based bar charts with axis ticks, rotated x-labels, and a wide
//     left margin so long gas-type names + value labels never overlap
//   • Tables use min-width + sticky-friendly headers + uniform padding
// =============================================================================
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  listInflow, listOutflow, listCustomers, formatLiters,
} from '../../services/gasRegister/gasFlow';
import {
  categoryLabel, customerCompliance, type CustomerCategory,
} from '../../services/gasRegister/customers';
import { CERTS, type ComplianceBand } from '../../services/gasRegister/compliance';
import { cn } from '../../lib/utils';

type Tab = 'flow' | 'usage' | 'company' | 'inventory' | 'compliance';

const TABS: { id: Tab; label: string; badge: string }[] = [
  { id: 'flow',       label: 'Gas Flow Summary',               badge: '§3.16.1' },
  { id: 'usage',      label: 'Gas Usage by Licensee',          badge: '§3.16.2' },
  { id: 'company',    label: 'Company-wise Customer & Supply', badge: '§3.16.3' },
  { id: 'inventory',  label: 'Company Inventory & Supply',     badge: '§3.16.4' },
  { id: 'compliance', label: 'Compliance Report',              badge: '§3.16.5' },
];

export function GasFlowReportsPage() {
  const inflow    = useMemo(() => listInflow(), []);
  const outflow   = useMemo(() => listOutflow(), []);
  const customers = useMemo(() => listCustomers(), []);
  const [tab, setTab]   = useState<Tab>('flow');
  const [from, setFrom] = useState('2025-05-01');
  const [to,   setTo]   = useState('2026-05-19');

  // Filter by date range
  const inRange   = (iso: string) => iso >= from && iso <= to;
  const inflowF   = inflow.filter((r) => inRange(r.date));
  const outflowF  = outflow.filter((r) => inRange(r.date));

  // Aggregate by gas type for the flow/usage charts
  const flowByGas = useMemo(() => {
    const acc: Record<string, { inflow: number; outflow: number }> = {};
    for (const r of inflowF)  { acc[r.gasType] ??= { inflow: 0, outflow: 0 }; acc[r.gasType].inflow  += r.volumeLiters; }
    for (const r of outflowF) { acc[r.gasType] ??= { inflow: 0, outflow: 0 }; acc[r.gasType].outflow += r.quantityLiters; }
    return Object.entries(acc).map(([gas, v]) => ({ gas, ...v })).sort((a, b) => (b.inflow + b.outflow) - (a.inflow + a.outflow));
  }, [inflowF, outflowF]);

  // Aggregate by permit holder (company)
  const byCompany = useMemo(() => {
    const acc: Record<string, { name: string; procured: number; supplied: number; customerCount: number }> = {};
    for (const r of inflowF) {
      acc[r.permitHolderId] ??= { name: r.permitHolderName, procured: 0, supplied: 0, customerCount: 0 };
      acc[r.permitHolderId].procured += r.volumeLiters;
    }
    for (const r of outflowF) {
      acc[r.permitHolderId] ??= { name: r.permitHolderName, procured: 0, supplied: 0, customerCount: 0 };
      acc[r.permitHolderId].supplied += r.quantityLiters;
    }
    for (const c of customers) {
      if (acc[c.permitHolderId]) acc[c.permitHolderId].customerCount += 1;
    }
    return Object.entries(acc).map(([id, v]) => ({ id, ...v, stored: v.procured - v.supplied })).sort((a, b) => b.supplied - a.supplied);
  }, [inflowF, outflowF, customers]);

  // Period totals for KPI strip
  const totals = useMemo(() => {
    const inSum  = inflowF.reduce((s, r) => s + r.volumeLiters, 0);
    const outSum = outflowF.reduce((s, r) => s + r.quantityLiters, 0);
    return {
      inflow: inSum,
      outflow: outSum,
      stored: inSum - outSum,
      companies: byCompany.length,
      customers: customers.length,
    };
  }, [inflowF, outflowF, byCompany, customers]);

  return (
    <div className="max-w-[1400px] mx-auto px-6 pt-5 pb-10">
      {/* Breadcrumb */}
      <nav className="text-[12px] text-neutral-500 mb-5">
        <Link to="/pps-dashboard" className="hover:text-doe-red">Home</Link>
        <span className="mx-2 text-neutral-300">›</span>
        <span>Gas Register</span>
        <span className="mx-2 text-neutral-300">›</span>
        <span>Gas Flow</span>
        <span className="mx-2 text-neutral-300">›</span>
        <span className="text-ink-950 font-semibold">Reports</span>
      </nav>

      {/* Hero */}
      <div className="card overflow-hidden mb-4">
        <div className="relative px-6 py-6 bg-gradient-to-br from-[#1E2128] via-[#262A33] to-[#1E2128] text-white">
          <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 20% 30%, #E89B4C 0%, transparent 50%), radial-gradient(circle at 80% 70%, #0E76A8 0%, transparent 50%)' }} />
          <div className="relative flex items-center gap-6">
            <div className="w-14 h-14 rounded-xl bg-action-orange/90 grid place-items-center shadow-doe-md"><ChartIcon /></div>
            <div className="flex-1 min-w-0">
              <div className="text-[10px] font-sans uppercase tracking-[0.22em] text-action-orange-soft">Gas Register · Reports · BN 16</div>
              <h1 className="font-display font-bold text-[24px] leading-tight mt-1">Gas flow analytics.</h1>
              <p className="text-[12.5px] text-white/70 mt-1 max-w-[680px]">
                All five SDD-mandated reports — inflow / outflow, gas usage by licensee, company-wise customer breakdown, inventory & supply, and the 4-certificate Compliance Report — in one workspace.
              </p>
            </div>
          </div>
        </div>

        {/* KPI strip */}
        <div className="grid grid-cols-2 lg:grid-cols-5 divide-x divide-neutral-100 border-t border-neutral-100 bg-white">
          <Kpi label="Inflow"    value={formatLiters(totals.inflow)}   tone="info" />
          <Kpi label="Outflow"   value={formatLiters(totals.outflow)}  tone="amber" />
          <Kpi label="Net stored" value={formatLiters(totals.stored)}  tone={totals.stored < 0 ? 'red' : 'ink'} />
          <Kpi label="Companies" value={totals.companies}              tone="ink" />
          <Kpi label="Customers" value={totals.customers}              tone="ink" />
        </div>
      </div>

      {/* Date range + export — own row so it never collides with tabs */}
      <div className="card mb-4 p-3 flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2 text-[11.5px]">
          <span className="font-sans uppercase tracking-[0.18em] text-[10px] text-neutral-500">Date range</span>
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)}
            className="px-2.5 py-1.5 border border-neutral-200 rounded-md text-[12px] focus:outline-none focus:border-action-orange" />
          <span className="text-neutral-400">–</span>
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)}
            className="px-2.5 py-1.5 border border-neutral-200 rounded-md text-[12px] focus:outline-none focus:border-action-orange" />
        </div>
        <div className="flex items-center gap-1">
          <button className="px-3 py-1.5 rounded-md text-[11.5px] font-semibold bg-white border border-neutral-200 text-ink-950 hover:border-action-orange">Excel</button>
          <button className="px-3 py-1.5 rounded-md text-[11.5px] font-semibold bg-white border border-neutral-200 text-ink-950 hover:border-action-orange">PDF</button>
          <button className="px-3 py-1.5 rounded-md text-[11.5px] font-semibold bg-action-orange text-white hover:bg-action-orange-dark shadow-doe-sm">Export</button>
        </div>
      </div>

      {/* Tabs — own row, wraps on narrow viewports */}
      <div className="card mb-4 overflow-hidden">
        <div className="flex flex-wrap">
          {TABS.map((t) => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={cn('relative px-4 py-3 text-[12.5px] font-semibold transition flex items-center gap-2 border-b-2',
                tab === t.id ? 'text-action-orange-deep border-action-orange' : 'text-neutral-500 hover:text-ink-950 border-transparent')}>
              {t.label}
              <span className={cn('font-mono text-[10px] px-1.5 py-0.5 rounded-full',
                tab === t.id ? 'bg-action-orange-soft text-action-orange-deep' : 'bg-neutral-100 text-neutral-500')}>
                {t.badge}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      {tab === 'flow'       && <FlowChart data={flowByGas} mode="grouped" subtitle="Gas received vs delivered per gas type across the selected period." />}
      {tab === 'usage'      && <FlowChart data={flowByGas} mode="usage"   subtitle="Net gas usage (outflow) by gas type across the selected period." />}
      {tab === 'company'    && <CompanyWiseTab byCompany={byCompany} />}
      {tab === 'inventory'  && <InventoryTab byCompany={byCompany} outflow={outflowF} />}
      {tab === 'compliance' && <ComplianceReportTab customers={customers} />}
    </div>
  );
}

// ============================================================================
// Hero KPI tile
// ============================================================================
function Kpi({ label, value, tone }: { label: string; value: string | number; tone: 'ink' | 'info' | 'amber' | 'red' }) {
  const cls = tone === 'info' ? 'text-info-500' : tone === 'amber' ? 'text-amber-700' : tone === 'red' ? 'text-doe-red' : 'text-ink-950';
  return (
    <div className="px-4 py-3">
      <div className="text-[10px] font-sans uppercase tracking-[0.18em] text-neutral-500">{label}</div>
      <div className={cn('font-display font-bold text-[20px] mt-1 tabular-nums leading-none', cls)}>{value}</div>
    </div>
  );
}

// ============================================================================
// Tab 1 & 2 — SVG bar chart (overlap-free)
// ----------------------------------------------------------------------------
// Replaces the old absolute-positioned div chart with a proper SVG so:
//   • The plot area has a fixed left/bottom margin (no inline-style overlap)
//   • X-axis labels are rotated 30° for long gas-type names
//   • Each bar carries a top label with its value (no underflow with axis)
//   • Ticks are derived from the max value so the y-axis always uses 5 ticks
// ============================================================================
function FlowChart({ data, mode, subtitle }: {
  data: { gas: string; inflow: number; outflow: number }[];
  mode: 'grouped' | 'usage';
  subtitle: string;
}) {
  const W = 1200;        // SVG viewBox width
  const H = 380;         // SVG viewBox height
  const ML = 78;         // left margin (y-axis labels)
  const MR = 32;         // right margin
  const MT = 28;         // top margin (top value labels)
  const MB = 96;         // bottom margin (rotated x-axis labels + value)
  const innerW = W - ML - MR;
  const innerH = H - MT - MB;

  const max = Math.max(1, ...data.flatMap((d) => [d.inflow, d.outflow]));
  // Round max up to a nice number for ticks
  const niceMax = niceCeil(max);
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((t) => niceMax * t);

  const groupWidth = data.length > 0 ? innerW / data.length : 0;
  const barWidth   = mode === 'grouped' ? Math.min(22, groupWidth / 3) : Math.min(34, groupWidth / 2);

  return (
    <div className="card p-5">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <div className="text-[11px] font-sans uppercase tracking-[0.18em] text-neutral-500">
            {mode === 'grouped' ? 'Gas flow by gas type' : 'Gas usage by gas type'}
          </div>
          <div className="text-[12px] text-neutral-500 mt-0.5">{subtitle}</div>
        </div>
        <div className="flex items-center gap-3 text-[11px]">
          {mode === 'grouped' && (
            <span className="inline-flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-sm bg-gradient-to-t from-[#5089A0] to-[#7DAFE0]" />
              Inflow
            </span>
          )}
          <span className="inline-flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm bg-gradient-to-t from-[#D08338] to-[#E89B4C]" />
            {mode === 'grouped' ? 'Outflow' : 'Usage'}
          </span>
        </div>
      </div>

      {data.length === 0 ? (
        <div className="py-12 text-center text-[12.5px] text-neutral-500">No data in the selected date range.</div>
      ) : (
        <div className="overflow-x-auto">
          <svg viewBox={`0 0 ${W} ${H}`} width="100%" preserveAspectRatio="xMidYMid meet" style={{ minWidth: 600 }}>
            {/* Y-axis grid + tick labels */}
            {ticks.map((t, i) => {
              const y = MT + innerH * (1 - t / niceMax);
              return (
                <g key={i}>
                  <line x1={ML} x2={W - MR} y1={y} y2={y} stroke="#E5E7EB" strokeWidth={1} />
                  <text x={ML - 8} y={y + 4} textAnchor="end" fontSize="10" fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace" fill="#9CA3AF">
                    {formatLiters(Math.round(t))}
                  </text>
                </g>
              );
            })}

            {/* X-axis baseline */}
            <line x1={ML} x2={W - MR} y1={MT + innerH} y2={MT + innerH} stroke="#9CA3AF" strokeWidth={1} />

            {/* Bars */}
            {data.map((d, idx) => {
              const groupX = ML + idx * groupWidth + groupWidth / 2;
              const inflowH  = (d.inflow  / niceMax) * innerH;
              const outflowH = (d.outflow / niceMax) * innerH;
              const labelGas = shortGasLabel(d.gas);

              if (mode === 'grouped') {
                const inX  = groupX - barWidth - 2;
                const outX = groupX + 2;
                return (
                  <g key={d.gas}>
                    {/* Inflow bar */}
                    <rect x={inX} y={MT + innerH - inflowH} width={barWidth} height={inflowH}
                      fill="url(#bar-inflow)" rx="3" />
                    {d.inflow > 0 && (
                      <text x={inX + barWidth / 2} y={MT + innerH - inflowH - 6} textAnchor="middle"
                        fontSize="9.5" fontFamily="ui-monospace, monospace" fill="#5089A0">
                        {formatLiters(d.inflow)}
                      </text>
                    )}
                    {/* Outflow bar */}
                    <rect x={outX} y={MT + innerH - outflowH} width={barWidth} height={outflowH}
                      fill="url(#bar-outflow)" rx="3" />
                    {d.outflow > 0 && (
                      <text x={outX + barWidth / 2} y={MT + innerH - outflowH - 6} textAnchor="middle"
                        fontSize="9.5" fontFamily="ui-monospace, monospace" fill="#D08338">
                        {formatLiters(d.outflow)}
                      </text>
                    )}
                    {/* X-axis label (rotated) */}
                    <text x={groupX} y={MT + innerH + 16} textAnchor="end" fontSize="11" fill="#111827"
                      transform={`rotate(-30 ${groupX} ${MT + innerH + 16})`}>
                      {labelGas}
                    </text>
                  </g>
                );
              }

              // Usage mode: single bar centred
              const x = groupX - barWidth / 2;
              return (
                <g key={d.gas}>
                  <rect x={x} y={MT + innerH - outflowH} width={barWidth} height={outflowH}
                    fill="url(#bar-outflow)" rx="3" />
                  {d.outflow > 0 && (
                    <text x={groupX} y={MT + innerH - outflowH - 6} textAnchor="middle"
                      fontSize="9.5" fontFamily="ui-monospace, monospace" fill="#D08338">
                      {formatLiters(d.outflow)}
                    </text>
                  )}
                  <text x={groupX} y={MT + innerH + 16} textAnchor="end" fontSize="11" fill="#111827"
                    transform={`rotate(-30 ${groupX} ${MT + innerH + 16})`}>
                    {labelGas}
                  </text>
                </g>
              );
            })}

            <defs>
              <linearGradient id="bar-inflow" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor="#7DAFE0" />
                <stop offset="100%" stopColor="#5089A0" />
              </linearGradient>
              <linearGradient id="bar-outflow" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor="#F3B870" />
                <stop offset="100%" stopColor="#D08338" />
              </linearGradient>
            </defs>
          </svg>
        </div>
      )}
    </div>
  );
}

/** Round up to a "nice" number for chart y-axis ticks. */
function niceCeil(n: number): number {
  if (n <= 0) return 1;
  const pow = Math.pow(10, Math.floor(Math.log10(n)));
  const norm = n / pow;
  const nice = norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 5 ? 5 : 10;
  return nice * pow;
}

/** Trim long legacy gas labels for axis display (full name stays in title). */
function shortGasLabel(label: string): string {
  // "LPG (Mixed) / Liquefied Gases" → "LPG (Mixed)"
  // "Propane (Liquefied) / Liquefied Gases" → "Propane"
  const beforeSlash = label.split('/')[0].trim();
  if (beforeSlash.length <= 22) return beforeSlash;
  return beforeSlash.slice(0, 20) + '…';
}

// ============================================================
// Tab 3: Company Wise Customer & Gas Summary
// ============================================================
function CompanyWiseTab({ byCompany }: { byCompany: { id: string; name: string; supplied: number; customerCount: number }[] }) {
  const totalCustomers = byCompany.reduce((s, c) => s + c.customerCount, 0);
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <div className="card overflow-hidden">
        <div className="px-5 py-3 border-b border-neutral-100">
          <div className="text-[11px] font-sans uppercase tracking-[0.18em] text-neutral-500">Company-wise customer & gas summary</div>
          <div className="text-[11.5px] text-neutral-500 mt-0.5">Per-licensee roll-up of customers + delivered gas volumes.</div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-neutral-25 text-[10px] uppercase tracking-[0.16em] text-neutral-500 border-b border-neutral-100">
              <tr>
                <th className="text-left px-5 py-2.5">Company</th>
                <th className="text-right px-5 py-2.5 whitespace-nowrap">Customers</th>
                <th className="text-right px-5 py-2.5 whitespace-nowrap">Gas supplied</th>
              </tr>
            </thead>
            <tbody>
              {byCompany.length === 0 ? (
                <tr><td colSpan={3} className="px-5 py-6 text-center text-[12.5px] text-neutral-500">No data in the selected date range.</td></tr>
              ) : byCompany.map((c) => (
                <tr key={c.id} className="border-b border-neutral-100 last:border-b-0">
                  <td className="px-5 py-3 text-[13px] text-ink-950">{c.name}</td>
                  <td className="px-5 py-3 font-mono text-[12.5px] text-ink-950 text-right tabular-nums">{c.customerCount}</td>
                  <td className="px-5 py-3 font-mono text-[12.5px] text-ink-950 text-right tabular-nums whitespace-nowrap">{formatLiters(c.supplied)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="px-5 py-3 border-b border-neutral-100">
          <div className="text-[11px] font-sans uppercase tracking-[0.18em] text-neutral-500">Customer share by company</div>
          <div className="text-[11.5px] text-neutral-500 mt-0.5">{totalCustomers} customer{totalCustomers === 1 ? '' : 's'} across {byCompany.length} permit holder{byCompany.length === 1 ? '' : 's'}</div>
        </div>
        <div className="p-5 flex items-start gap-6 flex-wrap">
          <PieChart segments={byCompany.map((c, i) => ({ label: c.name, value: c.customerCount, color: PIE_COLORS[i % PIE_COLORS.length] }))} size={200} />
          <div className="space-y-1.5 text-[12px] flex-1 min-w-0">
            {byCompany.map((c, i) => (
              <div key={c.id} className="flex items-center gap-2.5">
                <span className="w-3 h-3 rounded-sm shrink-0" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                <span className="text-ink-950 truncate flex-1">{c.name}</span>
                <span className="font-mono text-neutral-500 ml-2 tabular-nums shrink-0">{c.customerCount}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// Tab 4: Company Gas Inventory & Supply
// ============================================================
function InventoryTab({ byCompany, outflow }: {
  byCompany: { id: string; name: string; procured: number; stored: number; supplied: number }[];
  outflow: ReturnType<typeof listOutflow>;
}) {
  const [selectedId, setSelectedId] = useState<string>(byCompany[0]?.id ?? '');
  const selected = byCompany.find((c) => c.id === selectedId) ?? byCompany[0];
  const perCustomer = useMemo(() => {
    const list = outflow.filter((o) => o.permitHolderId === selected?.id);
    const acc: Record<string, { name: string; supplied: number }> = {};
    for (const o of list) {
      acc[o.customerId] ??= { name: o.customerName, supplied: 0 };
      acc[o.customerId].supplied += o.quantityLiters;
    }
    return Object.entries(acc).map(([id, v]) => ({ id, ...v })).sort((a, b) => b.supplied - a.supplied);
  }, [outflow, selected]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <div className="card overflow-hidden">
        <div className="px-5 py-3 border-b border-neutral-100">
          <div className="text-[11px] font-sans uppercase tracking-[0.18em] text-neutral-500">Company gas inventory & supply</div>
          <div className="text-[11.5px] text-neutral-500 mt-0.5">Click any row to drill down into customer-wise supply on the right.</div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-neutral-25 text-[10px] uppercase tracking-[0.16em] text-neutral-500 border-b border-neutral-100">
              <tr>
                <th className="text-left px-5 py-2.5">Company</th>
                <th className="text-right px-5 py-2.5 whitespace-nowrap">Procured</th>
                <th className="text-right px-5 py-2.5 whitespace-nowrap">Stored</th>
                <th className="text-right px-5 py-2.5 whitespace-nowrap">Supplied</th>
              </tr>
            </thead>
            <tbody>
              {byCompany.length === 0 ? (
                <tr><td colSpan={4} className="px-5 py-6 text-center text-[12.5px] text-neutral-500">No data in the selected date range.</td></tr>
              ) : byCompany.map((c) => (
                <tr
                  key={c.id}
                  onClick={() => setSelectedId(c.id)}
                  className={cn('border-b border-neutral-100 last:border-b-0 cursor-pointer transition',
                    c.id === selected?.id ? 'bg-action-orange-soft/50' : 'hover:bg-neutral-25')}
                >
                  <td className="px-5 py-3 text-[13px] font-semibold text-action-orange-deep">{c.name}</td>
                  <td className="px-5 py-3 font-mono text-[12.5px] text-ink-950 text-right tabular-nums whitespace-nowrap">{formatLiters(c.procured)}</td>
                  <td className={cn('px-5 py-3 font-mono text-[12.5px] text-right tabular-nums whitespace-nowrap', c.stored < 0 ? 'text-doe-red' : 'text-ink-950')}>
                    {formatLiters(c.stored)}
                  </td>
                  <td className="px-5 py-3 font-mono text-[12.5px] text-ink-950 text-right tabular-nums whitespace-nowrap">{formatLiters(c.supplied)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="px-5 py-3 border-b border-neutral-100">
          <div className="text-[11px] font-sans uppercase tracking-[0.18em] text-neutral-500">Customer-wise supply</div>
          <div className="text-[11.5px] text-neutral-500 mt-0.5">{selected?.name ?? '—'} · {perCustomer.length} customer{perCustomer.length === 1 ? '' : 's'}</div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-neutral-25 text-[10px] uppercase tracking-[0.16em] text-neutral-500 border-b border-neutral-100">
              <tr>
                <th className="text-left px-5 py-2.5">Customer</th>
                <th className="text-right px-5 py-2.5 whitespace-nowrap">Gas supplied</th>
              </tr>
            </thead>
            <tbody>
              {perCustomer.length === 0 ? (
                <tr><td colSpan={2} className="px-5 py-6 text-center text-[12.5px] text-neutral-500">No deliveries from this company in range.</td></tr>
              ) : perCustomer.map((c) => (
                <tr key={c.id} className="border-b border-neutral-100 last:border-b-0">
                  <td className="px-5 py-3 text-[13px] text-ink-950">{c.name}</td>
                  <td className="px-5 py-3 font-mono text-[12.5px] text-ink-950 text-right tabular-nums whitespace-nowrap">{formatLiters(c.supplied)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// Pie chart
// ============================================================
const PIE_COLORS = ['#0E76A8', '#E89B4C', '#22A745', '#DC2626', '#7B3FE4', '#0F4A5C', '#6B7280'];

function PieChart({ segments, size }: { segments: { label: string; value: number; color: string }[]; size: number }) {
  const total = segments.reduce((s, x) => s + x.value, 0);
  if (total === 0) return <div className="text-[12px] text-neutral-500">No data</div>;
  const r = size / 2;
  let acc = 0;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="shrink-0">
      {segments.map((seg, i) => {
        const a0 = (acc / total) * Math.PI * 2;
        acc += seg.value;
        const a1 = (acc / total) * Math.PI * 2;
        const large = a1 - a0 > Math.PI ? 1 : 0;
        const x0 = r + r * Math.sin(a0);
        const y0 = r - r * Math.cos(a0);
        const x1 = r + r * Math.sin(a1);
        const y1 = r - r * Math.cos(a1);
        const d = segments.length === 1
          ? `M ${r} 0 A ${r} ${r} 0 1 1 ${r - 0.01} 0 Z`
          : `M ${r} ${r} L ${x0} ${y0} A ${r} ${r} 0 ${large} 1 ${x1} ${y1} Z`;
        return <path key={i} d={d} fill={seg.color} />;
      })}
    </svg>
  );
}

function ChartIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="20" x2="12" y2="10"/>
      <line x1="18" y1="20" x2="18" y2="4"/>
      <line x1="6" y1="20" x2="6" y2="16"/>
    </svg>
  );
}

// ============================================================
// Tab 5: Compliance Report (BN 16 · SDD §3.16.5)
// ============================================================
function ComplianceReportTab({ customers }: { customers: ReturnType<typeof listCustomers> }) {
  const [fCategory, setFCategory]   = useState<CustomerCategory | ''>('');
  const [fBuilding, setFBuilding]   = useState<string>('');
  const [fCompany,  setFCompany]    = useState<string>('');
  const [fCity,     setFCity]       = useState<string>('');
  const [fArea,     setFArea]       = useState<string>('');
  const [fBand,     setFBand]       = useState<ComplianceBand | ''>('');
  const [fExpiryWithinDays, setFExpiryWithinDays] = useState<number>(60);

  const opts = useMemo(() => {
    const cats     = Array.from(new Set(customers.map((c) => c.category))) as CustomerCategory[];
    const blds     = Array.from(new Set(customers.map((c) => c.buildingType))).sort();
    const cos      = Array.from(new Set(customers.map((c) => c.permitHolderName))).sort();
    const cities   = Array.from(new Set(customers.map((c) => c.city))).sort();
    const areas    = Array.from(new Set(customers.map((c) => c.area))).sort();
    return { cats, blds, cos, cities, areas };
  }, [customers]);

  const enriched = useMemo(() => customers.map((c) => ({ c, result: customerCompliance(c) })), [customers]);

  const filtered = useMemo(() => {
    return enriched.filter(({ c, result }) => {
      if (fCategory && c.category !== fCategory) return false;
      if (fBuilding && c.buildingType !== fBuilding) return false;
      if (fCompany  && c.permitHolderName !== fCompany) return false;
      if (fCity     && c.city !== fCity) return false;
      if (fArea     && c.area !== fArea) return false;
      if (fBand     && result.band !== fBand) return false;
      return true;
    });
  }, [enriched, fCategory, fBuilding, fCompany, fCity, fArea, fBand]);

  const totals = useMemo(() => {
    const buckets: Record<ComplianceBand, number> = { 'Fully Compliant': 0, 'Minor Gap': 0, 'At Risk': 0, 'Non-Compliant': 0 };
    for (const { result } of filtered) buckets[result.band] += 1;
    const avg = filtered.length === 0 ? 0 : Math.round(filtered.reduce((s, x) => s + x.result.rate, 0) / filtered.length);
    return { buckets, avg };
  }, [filtered]);

  const resetFilters = () => {
    setFCategory(''); setFBuilding(''); setFCompany(''); setFCity(''); setFArea(''); setFBand(''); setFExpiryWithinDays(60);
  };

  return (
    <div className="space-y-4">
      {/* KPI strip — full width, 5 columns, no overlap */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        <KpiTile label="Facilities" value={filtered.length} tone="info" />
        <KpiTile label="Avg compliance" value={`${totals.avg}%`} tone={totals.avg >= 75 ? 'success' : totals.avg >= 50 ? 'warning' : 'danger'} />
        <KpiTile label="Fully compliant" value={totals.buckets['Fully Compliant']} tone="success" />
        <KpiTile label="Minor gap / At risk" value={totals.buckets['Minor Gap'] + totals.buckets['At Risk']} tone="warning" />
        <KpiTile label="Non-compliant" value={totals.buckets['Non-Compliant']} tone="danger" />
      </div>

      {/* Filter strip */}
      <div className="card p-4">
        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
          <div className="text-[11px] font-sans uppercase tracking-[0.18em] text-neutral-500">Compliance filters · SDD §3.16.5</div>
          <button type="button" onClick={resetFilters} className="text-[11px] text-neutral-500 hover:text-doe-red">Reset filters</button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <ComplianceSelect label="Category" value={fCategory} onChange={(v) => setFCategory(v as CustomerCategory | '')}
            options={[{ value: '', label: 'All categories' }, ...opts.cats.map((c) => ({ value: c, label: categoryLabel(c) }))]} />
          <ComplianceSelect label="Building Type" value={fBuilding} onChange={setFBuilding}
            options={[{ value: '', label: 'All building types' }, ...opts.blds.map((b) => ({ value: b, label: b }))]} />
          <ComplianceSelect label="Gas Systems Company" value={fCompany} onChange={setFCompany}
            options={[{ value: '', label: 'All companies' }, ...opts.cos.map((b) => ({ value: b, label: b }))]} />
          <ComplianceSelect label="Emirate" value={fCity} onChange={setFCity}
            options={[{ value: '', label: 'All emirates' }, ...opts.cities.map((b) => ({ value: b, label: b }))]} />
          <ComplianceSelect label="Area" value={fArea} onChange={setFArea}
            options={[{ value: '', label: 'All areas' }, ...opts.areas.map((b) => ({ value: b, label: b }))]} />
          <ComplianceSelect label="Compliance Status" value={fBand} onChange={(v) => setFBand(v as ComplianceBand | '')}
            options={[
              { value: '', label: 'All statuses' },
              { value: 'Fully Compliant', label: 'Fully Compliant (100%)' },
              { value: 'Minor Gap', label: 'Minor Gap (75–99%)' },
              { value: 'At Risk', label: 'At Risk (50–74%)' },
              { value: 'Non-Compliant', label: 'Non-Compliant (<50%)' },
            ]} />
          <div className="sm:col-span-2 lg:col-span-2">
            <label className="block text-[10px] font-sans uppercase tracking-[0.18em] text-neutral-500 mb-1.5">Highlight certs expiring within</label>
            <div className="flex items-center gap-1.5">
              {[30, 60, 90].map((d) => (
                <button key={d} type="button" onClick={() => setFExpiryWithinDays(d)}
                  className={cn('px-3 py-1.5 rounded-md text-[11.5px] font-semibold transition',
                    fExpiryWithinDays === d ? 'bg-action-orange text-white shadow-doe-sm' : 'bg-neutral-25 text-ink-950 border border-neutral-200 hover:border-action-orange')}>
                  {d} days
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Compliance table */}
      <div className="card overflow-hidden">
        <div className="px-5 py-3 border-b border-neutral-100 flex items-center justify-between flex-wrap gap-2">
          <div>
            <div className="text-[11px] font-sans uppercase tracking-[0.18em] text-neutral-500">Compliance Report (facility level)</div>
            <div className="text-[11.5px] text-neutral-500 mt-0.5">Same column structure as the "Customers Data Base and Compliance" master sheet with derived Rate + Status (§3.16.5).</div>
          </div>
          <div className="text-[11px] text-neutral-500">Showing <span className="font-bold text-ink-950">{filtered.length}</span> facilities</div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1100px]">
            <thead className="bg-neutral-25 text-[10px] uppercase tracking-[0.16em] text-neutral-500 border-b border-neutral-100">
              <tr>
                <th className="text-left px-4 py-2.5">Facility</th>
                <th className="text-left px-4 py-2.5">Category · Building</th>
                <th className="text-left px-4 py-2.5">Company</th>
                <th className="text-left px-4 py-2.5">Area · Emirate</th>
                {CERTS.map((c) => (
                  <th key={c.id} className="text-center px-3 py-2.5 whitespace-nowrap" title={c.source}>{c.shortLabel}</th>
                ))}
                <th className="text-right px-4 py-2.5 whitespace-nowrap">Rate</th>
                <th className="text-left px-4 py-2.5">Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={10} className="px-5 py-8 text-center text-[12.5px] text-neutral-500">No facilities match the current filters.</td></tr>
              ) : filtered.map(({ c, result }) => (
                <tr key={c.id} className="border-b border-neutral-100 last:border-b-0 hover:bg-neutral-25 align-top">
                  <td className="px-4 py-3">
                    <div className="text-[12.5px] font-semibold text-ink-950 leading-tight">{c.buildingName}</div>
                    <div className="text-[10.5px] font-mono text-neutral-500 mt-0.5">{c.id}</div>
                  </td>
                  <td className="px-4 py-3 text-[12px] text-ink-950">
                    <div className="font-semibold">{categoryLabel(c.category)}</div>
                    <div className="text-[10.5px] text-neutral-500">{c.buildingType}</div>
                  </td>
                  <td className="px-4 py-3 text-[12px] text-ink-950">{c.permitHolderName}</td>
                  <td className="px-4 py-3 text-[12px] text-ink-950">
                    <div>{c.area}</div>
                    <div className="text-[10.5px] text-neutral-500">{c.city}</div>
                  </td>
                  {result.evaluations.map((e) => (
                    <td key={e.slot} className="px-3 py-3 text-center">
                      <CertChip evaluation={e} highlightWithin={fExpiryWithinDays} />
                    </td>
                  ))}
                  <td className="px-4 py-3 text-right">
                    <div className="font-mono font-semibold text-[13px] text-ink-950 tabular-nums">{result.rate}%</div>
                  </td>
                  <td className="px-4 py-3">
                    <BandPill band={result.band} expiringSoon={result.anyExpiringSoon} expired={result.anyExpired} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function KpiTile({ label, value, tone }: { label: string; value: string | number; tone: 'info' | 'success' | 'warning' | 'danger' }) {
  const map = {
    info:    'border-info-500/40    bg-info-soft   text-info-500',
    success: 'border-emerald-500/40 bg-emerald-50  text-emerald-700',
    warning: 'border-amber-500/40   bg-amber-50    text-amber-700',
    danger:  'border-doe-red/40     bg-rose-50     text-doe-red',
  } as const;
  return (
    <div className={cn('rounded-lg border px-4 py-3', map[tone])}>
      <div className="text-[10px] font-sans uppercase tracking-[0.18em] opacity-70">{label}</div>
      <div className="mt-1 font-display font-bold text-[22px] leading-none tabular-nums">{value}</div>
    </div>
  );
}

function ComplianceSelect({ label, value, onChange, options }: {
  label: string; value: string; onChange: (v: string) => void; options: { value: string; label: string }[];
}) {
  return (
    <div>
      <label className="block text-[10px] font-sans uppercase tracking-[0.18em] text-neutral-500 mb-1.5">{label}</label>
      <select value={value} onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 text-[12.5px] bg-white border border-neutral-200 rounded-md focus:outline-none focus:border-action-orange focus:ring-2 focus:ring-action-orange/20 transition">
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );
}

function CertChip({ evaluation, highlightWithin }: { evaluation: { valid: 0 | 1; expiringSoon: boolean; expired: boolean; daysToExpiry: number | null }; highlightWithin: number }) {
  if (evaluation.expired) {
    return <span title={`Expired ${Math.abs(evaluation.daysToExpiry ?? 0)} days ago`}
      className="inline-flex items-center justify-center w-6 h-5 rounded text-[9.5px] font-semibold bg-rose-50 text-doe-red ring-1 ring-doe-red/30">✕</span>;
  }
  if (evaluation.valid === 0) {
    return <span title="Not valid (status blank or invalid)"
      className="inline-flex items-center justify-center w-6 h-5 rounded text-[9.5px] font-semibold bg-neutral-100 text-neutral-500 ring-1 ring-neutral-300">—</span>;
  }
  const userHighlightExpiring = evaluation.daysToExpiry !== null && evaluation.daysToExpiry >= 0 && evaluation.daysToExpiry <= highlightWithin;
  if (evaluation.expiringSoon || userHighlightExpiring) {
    return <span title={`Expires in ${evaluation.daysToExpiry} days`}
      className="inline-flex items-center justify-center w-6 h-5 rounded text-[9.5px] font-semibold bg-amber-50 text-amber-700 ring-1 ring-amber-500/40">⚠</span>;
  }
  return <span title={`Valid · expires in ${evaluation.daysToExpiry} days`}
    className="inline-flex items-center justify-center w-6 h-5 rounded text-[9.5px] font-semibold bg-emerald-50 text-emerald-700 ring-1 ring-emerald-500/30">✓</span>;
}

function BandPill({ band, expiringSoon, expired }: { band: ComplianceBand; expiringSoon: boolean; expired: boolean }) {
  const map: Record<ComplianceBand, string> = {
    'Fully Compliant': 'bg-emerald-50 text-emerald-700 ring-emerald-500/30',
    'Minor Gap':       'bg-amber-50   text-amber-700  ring-amber-500/40',
    'At Risk':         'bg-orange-50  text-orange-700 ring-orange-500/40',
    'Non-Compliant':   'bg-rose-50    text-doe-red    ring-doe-red/40',
  };
  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-[10.5px] font-semibold uppercase tracking-wide ring-1 whitespace-nowrap', map[band])}>
        {band}
      </span>
      {expired && (
        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9.5px] font-semibold bg-rose-50 text-doe-red ring-1 ring-doe-red/40 whitespace-nowrap">Expired cert</span>
      )}
      {!expired && expiringSoon && (
        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9.5px] font-semibold bg-amber-50 text-amber-700 ring-1 ring-amber-500/40 whitespace-nowrap">Expiring soon</span>
      )}
    </div>
  );
}
