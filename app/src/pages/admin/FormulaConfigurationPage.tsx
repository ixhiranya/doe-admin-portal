// src/pages/admin/FormulaConfigurationPage.tsx
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { cn } from '../../lib/utils';
import { FormulaBuilderModal } from '../../components/admin/FormulaBuilderModal';
import { FormulaDetailsModal } from '../../components/admin/FormulaDetailsModal';
import type { Formula } from '../../types/formula';
import { returnTypeMeta } from '../../data/formulaEntities';

const PAGE_SIZE = 5;

// ---- Seed data — swap for a real formulas API later ------------------------
const SEED_FORMULAS: Formula[] = [
  {
    id: 'seed_1', formulaId: 'FML-1001', name: 'Total LPG Sales', code: 'FML_TOTAL_LPG',
    description: 'Sum of cylinder and bulk LPG sales for the reporting period.',
    templateId: 'TMP-001', returnType: 'kt', inputType: 'visual',
    tokens: [
      { id: 't1', kind: 'field', scope: 'self', field: { fieldId: 'total_supply', fieldLabel: 'Total Supply' } },
    ],
    expression: 'total_supply', type: 'self', status: 'active', enabled: true,
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 6).toISOString(),
  },
  {
    id: 'seed_2', formulaId: 'FML-1002', name: 'Gasoline Import', code: 'FML_GAS_IMPORT',
    description: 'Cross-entity import volume pulled from the Grey Market diesel form.',
    templateId: 'TMP-002', returnType: 'litres', inputType: 'visual',
    tokens: [
      { id: 't1', kind: 'field', scope: 'cross', field: { fieldId: 'grey_imports', fieldLabel: 'Grey Market Imports', entityLabel: 'Grey Market' } },
    ],
    expression: 'Grey Market.grey_imports', type: 'cross', status: 'draft', enabled: true,
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5).toISOString(),
  },
  {
    id: 'seed_3', formulaId: 'FML-1003', name: 'Diesel Consumption', code: 'FML_DIESEL_CONS',
    description: 'Total diesel demand across Abu Dhabi City, Al Ain and Al Dhafra.',
    templateId: 'TMP-003', returnType: 'kt', inputType: 'visual',
    tokens: [
      { id: 't1', kind: 'field', scope: 'self', field: { fieldId: 'total_lpg_supply', fieldLabel: 'Total LPG Supply' } },
    ],
    expression: 'total_lpg_supply', type: 'self', status: 'active', enabled: true,
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 4).toISOString(),
  },
  {
    id: 'seed_4', formulaId: 'FML-1004', name: 'Natural Gas Supply', code: 'FML_NG_SUPPLY',
    description: 'Cross-entity contracted volume for EMSTEEL natural gas.',
    templateId: 'TMP-004', returnType: 'bnbtu', inputType: 'visual',
    tokens: [
      { id: 't1', kind: 'field', scope: 'cross', field: { fieldId: 'contracted_volume', fieldLabel: 'Contracted Volume', entityLabel: 'EMSTEEL' } },
    ],
    expression: 'EMSTEEL.contracted_volume', type: 'cross', status: 'active', enabled: true,
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3).toISOString(),
  },
  {
    id: 'seed_5', formulaId: 'FML-1005', name: 'Jet Fuel Distribution', code: 'FML_JET_DIST',
    description: 'Draft — distribution formula pending template finalisation.',
    templateId: 'TMP-005', returnType: 'barrels', inputType: 'visual',
    tokens: [
      { id: 't1', kind: 'field', scope: 'self', field: { fieldId: 'facility_consumption', fieldLabel: 'Facility Consumption' } },
    ],
    expression: 'facility_consumption', type: 'self', status: 'draft', enabled: true,
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 20).toISOString(),
  },
  {
    id: 'seed_6', formulaId: 'FML-1006', name: 'Local Production Share', code: 'FML_LOCAL_PROD_SHARE',
    description: 'Local production as a share of total supply.',
    templateId: 'TMP-001', returnType: 'pct', inputType: 'expression',
    tokens: [],
    expression: '$ADNOC.diesel.local_production', type: 'self', status: 'active', enabled: true,
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 8).toISOString(),
  },
  {
    id: 'seed_7', formulaId: 'FML-1007', name: 'Cross-Entity Commercial Total', code: 'FML_CROSS_COMMERCIAL',
    description: 'Combined commercial volume across ADNOC and ENOC diesel forms.',
    templateId: 'TMP-004', returnType: 'kt', inputType: 'expression',
    tokens: [],
    expression: '$ADNOC.diesel.commercial + $ENOC.diesel.commercial', type: 'cross', status: 'active', enabled: true,
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 9).toISOString(),
  },
  {
    id: 'seed_8', formulaId: 'FML-1008', name: 'Bulk to Cylinder Ratio', code: 'FML_BULK_CYL_RATIO',
    description: 'Draft — ratio of bulk LPG sales to cylinder sales.',
    templateId: 'TMP-003', returnType: 'pct', inputType: 'expression',
    tokens: [],
    expression: '$ADNOC.lpg.bulk_sales / $ADNOC.lpg.cylinder_sales', type: 'self', status: 'draft', enabled: false,
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 30).toISOString(),
  },
  {
    id: 'seed_9', formulaId: 'FML-1009', name: 'Residential Demand (Grey Market)', code: 'FML_GREY_RESIDENTIAL',
    description: 'Residential diesel demand reported under the Grey Market template.',
    templateId: 'TMP-002', returnType: 'litres', inputType: 'visual',
    tokens: [
      { id: 't1', kind: 'field', scope: 'self', field: { fieldId: 'residential', fieldLabel: 'Residential' } },
    ],
    expression: 'residential', type: 'self', status: 'active', enabled: true,
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 1).toISOString(),
  },
];

export function FormulaConfigurationPage() {
  const [formulas, setFormulas] = useState<Formula[]>(SEED_FORMULAS);
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [detailsFormula, setDetailsFormula] = useState<Formula | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return formulas;
    return formulas.filter((f) =>
      f.name.toLowerCase().includes(q) ||
      f.code.toLowerCase().includes(q) ||
      returnTypeMeta(f.returnType).label.toLowerCase().includes(q));
  }, [formulas, query]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageSafe = Math.min(page, totalPages);
  const pageRows = filtered.slice((pageSafe - 1) * PAGE_SIZE, pageSafe * PAGE_SIZE);

  // Keep the `page` state itself in sync (not just the derived `pageSafe`
  // used for rendering) so it can't drift out of range after filtering,
  // deleting, etc.
  useEffect(() => {
    if (page !== pageSafe) setPage(pageSafe);
  }, [page, pageSafe]);

  const activeCount = formulas.filter((f) => f.status === 'active').length;
  const draftCount = formulas.filter((f) => f.status === 'draft').length;

  function nextFormulaId() {
    const nums = formulas.map((f) => parseInt(f.formulaId.replace('FML-', ''), 10)).filter((n) => !isNaN(n));
    const next = (nums.length ? Math.max(...nums) : 1000) + 1;
    return `FML-${next}`;
  }

  function handleCreate(formula: Formula) {
    setFormulas((prev) => [formula, ...prev]);
    setModalOpen(false);
    setQuery('');
    setPage(1);
  }

  function toggleEnabled(id: string) {
    setFormulas((prev) => prev.map((f) => (f.id === id ? { ...f, enabled: !f.enabled } : f)));
  }

  return (
    <div className="max-w-[1400px] mx-auto px-6 pt-5 pb-10">
      {/* Breadcrumb */}
      <div className="flex items-center text-[13px] mb-4 text-neutral-500 gap-2">
        <Link to="/pps-dashboard" className="hover:text-doe-red">Home</Link>
        <span className="text-neutral-300">›</span>
        <Link to="/admin" className="hover:text-doe-red">Admin Modules</Link>
        <span className="text-neutral-300">›</span>
        <span className="text-ink-950 font-semibold">Formula Configuration</span>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between mb-5">
        <div>
          <h1 className="font-display font-bold text-[26px] text-ink-950">Formula Configuration</h1>
          <p className="text-[13.5px] text-neutral-500 mt-1">Manage reusable calculation formulas used across Compliance &amp; PPS.</p>
        </div>
        <button onClick={() => setModalOpen(true)}
          className="inline-flex items-center gap-1.5 px-4 h-10 rounded-md bg-action-orange text-white font-semibold text-[13px] hover:bg-action-orange-dark transition shrink-0">
          <PlusIcon /> New Formula
        </button>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <KpiCard icon={<DocIcon />} iconBg="bg-violet-100 text-violet-600" label="Total Formulas" value={formulas.length} caption="All formulas in the system" />
        <KpiCard icon={<CheckIcon />} iconBg="bg-emerald-100 text-emerald-600" label="Active" value={activeCount} valueClass="text-emerald-600" caption="Currently active formulas" />
        <KpiCard icon={<WarnIcon />} iconBg="bg-amber-100 text-amber-600" label="Draft" value={draftCount} valueClass="text-amber-500" caption="Draft formulas" />
      </div>

      {/* Search + filter */}
      <div className="flex items-center justify-between gap-3 mb-4">
        <div className="relative flex-1 max-w-[420px]">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400"><SearchIcon /></span>
          <input
            value={query}
            onChange={(e) => { setQuery(e.target.value); setPage(1); }}
            placeholder="Search by name, code, return type…"
            className="w-full pl-9 pr-3 h-10 border border-neutral-300 rounded-md text-[13px] focus:outline-none focus:ring-2 focus:ring-action-orange/30 focus:border-action-orange"
          />
        </div>
        <button className="inline-flex items-center gap-1.5 px-3.5 h-10 rounded-md border border-neutral-300 text-[13px] font-semibold text-ink-950 hover:bg-neutral-50">
          <FilterIcon /> Filter
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden">
        <table className="w-full text-[13px]">
          <thead className="text-[10.5px] font-bold uppercase tracking-wide text-neutral-500 border-b border-neutral-200">
            <tr>
              <th className="px-5 py-3 text-left">Formula ID</th>
              <th className="px-5 py-3 text-left">Name</th>
              <th className="px-5 py-3 text-left">Code</th>
              <th className="px-5 py-3 text-left">Return Type (Unit)</th>
              <th className="px-5 py-3 text-left">Template ID</th>
              <th className="px-5 py-3 text-left">Type</th>
              <th className="px-5 py-3 text-left">Status</th>
              <th className="px-5 py-3 text-left">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {pageRows.map((f) => {
              const rt = returnTypeMeta(f.returnType);
              return (
                <tr
                  key={f.id}
                  onClick={() => setDetailsFormula(f)}
                  className={cn('hover:bg-neutral-25 transition cursor-pointer', !f.enabled && 'opacity-50')}
                >
                  <td className="px-5 py-3.5 font-mono text-[12.5px] text-ink-950 whitespace-nowrap">{f.formulaId}</td>
                  <td className="px-5 py-3.5 text-ink-950 font-medium whitespace-nowrap">{f.name}</td>
                  <td className="px-5 py-3.5 font-mono text-[12px] text-neutral-500 whitespace-nowrap">{f.code}</td>
                  <td className="px-5 py-3.5">
                    <span className={cn('px-2.5 py-0.5 rounded-full text-[11.5px] font-semibold', rt.chipClass)}>{rt.value}</span>
                  </td>
                  <td className="px-5 py-3.5 font-mono text-[12.5px] text-neutral-600 whitespace-nowrap">{f.templateId}</td>
                  <td className="px-5 py-3.5 text-ink-950 whitespace-nowrap">{f.type === 'self' ? 'Self' : 'Cross'}</td>
                  <td className="px-5 py-3.5">
                    <span className={cn(
                      'px-2.5 py-0.5 rounded-full text-[10.5px] font-bold uppercase tracking-wide',
                      f.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700',
                    )}>
                      {f.status}
                    </span>
                  </td>
                  <td className="px-5 py-3.5">
                    <button
                      onClick={(e) => { e.stopPropagation(); toggleEnabled(f.id); }}
                      role="switch" aria-checked={f.enabled} title="Toggle to enable/disable (soft delete)"
                      className={cn('relative w-10 rounded-full transition', f.enabled ? 'bg-sky-500' : 'bg-neutral-300')}
                      style={{ height: '22px' }}>
                      <span className={cn('absolute top-[3px] w-4 h-4 rounded-full bg-white shadow transition-all', f.enabled ? 'left-[21px]' : 'left-[3px]')} />
                    </button>
                  </td>
                </tr>
              );
            })}
            {pageRows.length === 0 && (
              <tr><td colSpan={8} className="px-5 py-10 text-center text-neutral-500">No formulas match your search.</td></tr>
            )}
          </tbody>
        </table>

        {/* Footer / pagination */}
        <div className="flex items-center justify-between px-5 py-3 border-t border-neutral-200 text-[12.5px] text-neutral-500">
          <span>Showing {pageRows.length === 0 ? 0 : (pageSafe - 1) * PAGE_SIZE + 1} to {(pageSafe - 1) * PAGE_SIZE + pageRows.length} of {filtered.length} entries</span>
          <div className="flex items-center gap-1.5">
            <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={pageSafe === 1}
              className="w-8 h-8 grid place-items-center rounded-md border border-neutral-300 disabled:opacity-40">‹</button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
              <button key={n} onClick={() => setPage(n)}
                className={cn('w-8 h-8 grid place-items-center rounded-md border text-[12.5px] font-semibold',
                  n === pageSafe ? 'border-action-orange text-action-orange' : 'border-neutral-300 text-ink-950 hover:bg-neutral-50')}>
                {n}
              </button>
            ))}
            <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={pageSafe === totalPages}
              className="w-8 h-8 grid place-items-center rounded-md border border-neutral-300 disabled:opacity-40">›</button>
          </div>
        </div>
      </div>

      {modalOpen && (
        <FormulaBuilderModal
          nextFormulaId={nextFormulaId()}
          onClose={() => setModalOpen(false)}
          onCreate={handleCreate}
        />
      )}

      {detailsFormula && (
        <FormulaDetailsModal
          formula={detailsFormula}
          onClose={() => setDetailsFormula(null)}
        />
      )}
    </div>
  );
}

// ─── Small local pieces ───────────────────────────────────────────────────

function KpiCard({ icon, iconBg, label, value, valueClass, caption }: {
  icon: React.ReactNode; iconBg: string; label: string; value: number; valueClass?: string; caption: string;
}) {
  return (
    <div className="bg-white border border-neutral-200 rounded-xl p-4 flex items-start gap-3.5">
      <span className={cn('w-11 h-11 rounded-lg grid place-items-center shrink-0', iconBg)}>{icon}</span>
      <div>
        <div className="text-[10.5px] font-bold uppercase tracking-wide text-neutral-500">{label}</div>
        <div className={cn('font-display font-bold text-[26px] leading-tight mt-0.5', valueClass ?? 'text-ink-950')}>{value}</div>
        <div className="text-[12px] text-neutral-500 mt-0.5">{caption}</div>
      </div>
    </div>
  );
}

function PlusIcon() { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>; }
function SearchIcon() { return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>; }
function FilterIcon() { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>; }
function DocIcon() { return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>; }
function CheckIcon() { return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="8 12 11 15 16 9"/></svg>; }
function WarnIcon() { return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>; }
