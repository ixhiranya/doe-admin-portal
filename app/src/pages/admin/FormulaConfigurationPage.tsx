// src/pages/admin/FormulaConfigurationPage.tsx
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { cn } from '../../lib/utils';
import { FormulaBuilderModal } from '../../components/admin/FormulaBuilderModal';
import type { Formula, FormulaStatus } from '../../types/formula';
import { RETURN_TYPES } from '../../data/formulaEntities';

// ---- Seed data — swap for a real formulas API later ------------------------
const SEED_FORMULAS: Formula[] = [
  {
    id: 'formula_seed_1',
    name: 'Late Renewal Penalty %',
    code: 'FML_LATE_RENEWAL_PCT',
    description: 'Penalty percentage applied when a renewal is submitted after the expiry date.',
    returnType: 'percentage',
    tokens: [],
    expression: 'daysOverdue * Company.riskRating / 100',
    dependencies: ['Company'],
    status: 'active',
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 6).toISOString(),
  },
  {
    id: 'formula_seed_2',
    name: 'Facility Compliance Index',
    code: 'FML_FACILITY_COMPLIANCE_INDEX',
    description: 'Weighted score combining audit history and open inspection findings.',
    returnType: 'number',
    tokens: [],
    expression: '( Facility.lastAuditScore + complianceScore ) / 2 - Inspection.findingCount',
    dependencies: ['Facility', 'Inspection'],
    status: 'active',
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2).toISOString(),
  },
  {
    id: 'formula_seed_3',
    name: 'Critical Finding Flag',
    code: 'FML_CRITICAL_FINDING_FLAG',
    description: 'Draft — flags a submission when severity crosses the review threshold.',
    returnType: 'boolean',
    tokens: [],
    expression: 'Inspection.severityWeight >= 8',
    dependencies: ['Inspection'],
    status: 'draft',
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 20).toISOString(),
  },
];

const STATUS_STYLES: Record<FormulaStatus, string> = {
  active: 'bg-success-soft text-success-500',
  inactive: 'bg-neutral-100 text-neutral-500',
  draft: 'bg-warning-soft text-warning-500',
};

const returnTypeLabel = (v: Formula['returnType']) => RETURN_TYPES.find((r) => r.value === v)?.label ?? v;

export function FormulaConfigurationPage() {
  const [formulas, setFormulas] = useState<Formula[]>(SEED_FORMULAS);
  const [query, setQuery] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Formula | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return formulas;
    return formulas.filter((f) =>
      f.name.toLowerCase().includes(q) ||
      f.code.toLowerCase().includes(q) ||
      f.expression.toLowerCase().includes(q));
  }, [formulas, query]);

  function openCreate() {
    setEditing(null);
    setModalOpen(true);
  }

  function openEdit(f: Formula) {
    setEditing(f);
    setModalOpen(true);
  }

  function handleSave(formula: Formula) {
    setFormulas((prev) => {
      const exists = prev.some((f) => f.id === formula.id);
      return exists ? prev.map((f) => (f.id === formula.id ? formula : f)) : [formula, ...prev];
    });
    setModalOpen(false);
    setEditing(null);
  }

  function toggleStatus(id: string) {
    setFormulas((prev) => prev.map((f) => {
      if (f.id !== id) return f;
      const next: FormulaStatus = f.status === 'active' ? 'inactive' : 'active';
      return { ...f, status: next };
    }));
  }

  function duplicateFormula(f: Formula) {
    const copy: Formula = {
      ...f,
      id: `formula_${Date.now()}`,
      name: `${f.name} (Copy)`,
      code: `${f.code}_COPY`,
      status: 'draft',
      updatedAt: new Date().toISOString(),
    };
    setFormulas((prev) => [copy, ...prev]);
  }

  function deleteFormula(id: string) {
    if (!confirm('Delete this formula? This cannot be undone.')) return;
    setFormulas((prev) => prev.filter((f) => f.id !== id));
  }

  return (
    <div className="max-w-[1400px] mx-auto px-6 pt-5 pb-10">
      {/* Breadcrumb */}
      <div className="flex items-center justify-between text-[12px] mb-5">
        <nav className="text-neutral-500">
          <Link to="/pps-dashboard" className="hover:text-doe-red">Home</Link>
          <span className="mx-2 text-neutral-300">›</span>
          <span className="text-ink-950 font-semibold">Formula Configuration</span>
        </nav>
      </div>

      {/* Hero */}
      <div className="card overflow-hidden mb-6">
        <div className="relative px-6 py-5 bg-gradient-to-br from-[#1E2128] via-[#262A33] to-[#1E2128] text-white">
          <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 80% 30%, #E89B4C 0%, transparent 50%)' }} />
          <div className="relative flex items-center gap-6">
            <div className="w-12 h-12 rounded-xl grid place-items-center shadow-doe-md font-mono font-bold text-[14px]" style={{ background: '#E89B4C', color: '#fff' }}>fx</div>
            <div className="flex-1">
              <div className="text-[10px] font-sans uppercase tracking-[0.22em] text-action-orange">ADMIN</div>
              <h1 className="font-display font-bold text-[22px] leading-tight mt-1">Formula Configuration</h1>
              <p className="text-[12.5px] text-white/70 mt-1 max-w-[640px]">
                Define and manage calculation formulas used across Compliance &amp; PPS, built visually from Self and Cross-entity fields.
              </p>
            </div>
            <button onClick={openCreate}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-action-orange text-white font-semibold text-[11.5px] hover:bg-action-orange-dark shadow-doe-sm transition">
              <PlusIcon /> New Formula
            </button>
          </div>
        </div>
        <div className="grid divide-x divide-neutral-100 border-t border-neutral-100 bg-white" style={{ gridTemplateColumns: 'repeat(3, minmax(0, 1fr))' }}>
          <div className="px-4 py-3">
            <div className="text-[9.5px] font-sans uppercase tracking-[0.18em] text-neutral-500">Total formulas</div>
            <div className="font-display font-bold text-[20px] mt-0.5 tabular-nums text-ink-950">{formulas.length}</div>
          </div>
          <div className="px-4 py-3">
            <div className="text-[9.5px] font-sans uppercase tracking-[0.18em] text-neutral-500">Active</div>
            <div className="font-display font-bold text-[20px] mt-0.5 tabular-nums text-success-500">{formulas.filter((f) => f.status === 'active').length}</div>
          </div>
          <div className="px-4 py-3">
            <div className="text-[9.5px] font-sans uppercase tracking-[0.18em] text-neutral-500">Draft</div>
            <div className="font-display font-bold text-[20px] mt-0.5 tabular-nums text-warning-500">{formulas.filter((f) => f.status === 'draft').length}</div>
          </div>
        </div>
      </div>

      {/* List */}
      <div className="bg-white rounded-xl border border-neutral-100 shadow-doe-xs overflow-hidden">
        <div className="px-4 py-2 border-b border-neutral-100 bg-neutral-25/60 flex items-center justify-between gap-3">
          <div className="text-[10.5px] font-sans uppercase tracking-[0.18em] text-neutral-500">Formula Configuration</div>
          <div className="flex items-center gap-2">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search name, code, expression…"
              className="w-[240px] px-2.5 h-7 border border-neutral-200 rounded-md text-[11.5px] focus:outline-none focus:border-action-orange"
            />
            <span className="text-[11px] text-neutral-500 whitespace-nowrap">{filtered.length} on file</span>
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="px-4 py-10 text-center text-[12px] text-neutral-500">
            {formulas.length === 0 ? 'No formulas yet — create one to get started.' : 'No formulas match your search.'}
          </div>
        ) : (
          <table className="w-full text-[12px]">
            <thead className="text-[9.5px] font-sans uppercase tracking-[0.16em] text-neutral-500 border-b border-neutral-100 bg-white">
              <tr>
                <th className="px-4 py-2 text-left font-semibold">Name</th>
                <th className="px-4 py-2 text-left font-semibold">Code</th>
                <th className="px-4 py-2 text-left font-semibold">Exp.</th>
                <th className="px-4 py-2 text-left font-semibold">Return Type</th>
                <th className="px-4 py-2 text-left font-semibold">Dep.</th>
                <th className="px-4 py-2 text-left font-semibold">Status</th>
                <th className="px-4 py-2 text-right font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {filtered.map((f) => (
                <tr key={f.id} className="hover:bg-neutral-25 transition align-top">
                  <td className="px-4 py-2.5">
                    <div className="text-ink-950 font-semibold">{f.name}</div>
                    {f.description && <div className="text-[10.5px] text-neutral-500 mt-0.5 max-w-[220px]">{f.description}</div>}
                  </td>
                  <td className="px-4 py-2.5 font-mono text-neutral-500 whitespace-nowrap">{f.code}</td>
                  <td className="px-4 py-2.5 font-mono text-[11px] text-neutral-700 max-w-[260px] break-all">{f.expression}</td>
                  <td className="px-4 py-2.5 whitespace-nowrap">{returnTypeLabel(f.returnType)}</td>
                  <td className="px-4 py-2.5">
                    {f.dependencies.length === 0 ? (
                      <span className="text-neutral-400 text-[11px]">Self only</span>
                    ) : (
                      <div className="flex flex-wrap gap-1">
                        {f.dependencies.map((d) => (
                          <span key={d} className="px-1.5 py-0.5 rounded-full bg-info-soft text-info-500 text-[10px] font-semibold">{d}</span>
                        ))}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-2.5">
                    <button onClick={() => toggleStatus(f.id)}
                      className={cn('px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider', STATUS_STYLES[f.status])}
                      title="Click to toggle active / inactive">
                      {f.status}
                    </button>
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center justify-end gap-2.5 text-[11px]">
                      <button onClick={() => openEdit(f)} className="text-action-orange-deep font-semibold hover:underline">Edit</button>
                      <button onClick={() => duplicateFormula(f)} className="text-neutral-600 hover:underline">Duplicate</button>
                      <button onClick={() => deleteFormula(f.id)} className="text-doe-red hover:underline">Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {modalOpen && (
        <FormulaBuilderModal
          initial={editing}
          onClose={() => { setModalOpen(false); setEditing(null); }}
          onSave={handleSave}
        />
      )}
    </div>
  );
}

function PlusIcon() {
  return <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>;
}
