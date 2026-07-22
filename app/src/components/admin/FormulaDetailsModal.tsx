// src/components/admin/FormulaDetailsModal.tsx
// Read-only "view details" popup — opened by clicking a row in the Formula
// Configuration list. Intentionally has no edit affordance.
import { returnTypeMeta, templateById } from '../../data/formulaEntities';
import { cn } from '../../lib/utils';
import type { Formula } from '../../types/formula';

interface Props {
  formula: Formula;
  onClose: () => void;
}

export function FormulaDetailsModal({ formula, onClose }: Props) {
  const rt = returnTypeMeta(formula.returnType);
  const template = templateById(formula.templateId);

  return (
    <div className="fixed inset-0 z-50 bg-black/40 grid place-items-center px-4" onClick={onClose}>
      <div
        className="bg-white rounded-xl shadow-xl max-w-[640px] w-full max-h-[88vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-neutral-200 flex items-start justify-between">
          <div>
            <div className="font-mono text-[11.5px] text-neutral-500">{formula.formulaId}</div>
            <h2 className="text-[19px] font-bold text-ink-950 mt-0.5">{formula.name}</h2>
          </div>
          <button onClick={onClose} aria-label="Close" className="w-8 h-8 grid place-items-center text-neutral-400 hover:text-ink-950 text-lg shrink-0">✕</button>
        </div>

        <div className="px-6 py-5 overflow-y-auto flex-1 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <DetailField label="Formula Code" mono value={formula.code} />
            <DetailField label="Return Type (Unit)">
              <span className={cn('px-2.5 py-0.5 rounded-full text-[11.5px] font-semibold', rt.chipClass)}>{rt.value}</span>
            </DetailField>
            <DetailField label="Template ID" mono value={`${formula.templateId}${template ? ` · ${template.name}` : ''}`} />
            <DetailField label="Type" value={formula.type === 'self' ? 'Self' : 'Cross'} />
            <DetailField label="Status">
              <span className={cn(
                'px-2.5 py-0.5 rounded-full text-[10.5px] font-bold uppercase tracking-wide',
                formula.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700',
              )}>
                {formula.status}
              </span>
            </DetailField>
            <DetailField label="Enabled" value={formula.enabled ? 'Yes' : 'No — soft-deleted'} />
          </div>

          <div>
            <div className="text-[11px] font-bold uppercase tracking-wide text-neutral-500 mb-1.5">Expression</div>
            <div className="w-full px-3 py-2.5 border border-neutral-200 rounded-md text-[13px] font-mono bg-neutral-50 break-all">
              {formula.expression || <span className="text-neutral-400">—</span>}
            </div>
          </div>

          <div>
            <div className="text-[11px] font-bold uppercase tracking-wide text-neutral-500 mb-1.5">Description</div>
            <div className="text-[13px] text-ink-950">
              {formula.description || <span className="text-neutral-400">No description provided.</span>}
            </div>
          </div>

          <div className="text-[11.5px] text-neutral-400 pt-2 border-t border-neutral-100">
            Last updated {new Date(formula.updatedAt).toLocaleString()}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-neutral-200 flex items-center justify-end">
          <button onClick={onClose} className="h-10 px-5 rounded-md text-[13px] font-semibold border border-neutral-300 text-ink-950 hover:bg-neutral-50">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

function DetailField({ label, value, mono, children }: { label: string; value?: string; mono?: boolean; children?: React.ReactNode }) {
  return (
    <div>
      <div className="text-[10.5px] font-bold uppercase tracking-wide text-neutral-500 mb-1">{label}</div>
      {children ?? <div className={cn('text-[13px] text-ink-950', mono && 'font-mono')}>{value}</div>}
    </div>
  );
}
