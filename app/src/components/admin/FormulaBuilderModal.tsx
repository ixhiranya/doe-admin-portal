// src/components/admin/FormulaBuilderModal.tsx
import { useMemo, useState } from 'react';
import { cn } from '../../lib/utils';
import { CROSS_ENTITIES, OPERATORS, RETURN_TYPES, SELF_ENTITY, entityById } from '../../data/formulaEntities';
import { tokenDependencies, tokensToExpression, validateTokens } from '../../lib/formula';
import type { Formula, FormulaToken, FormulaReturnType } from '../../types/formula';

let uid = 0;
const nextId = () => `tok_${Date.now()}_${uid++}`;

function slugCode(name: string) {
  return 'FML_' + name.trim().toUpperCase().replace(/[^A-Z0-9]+/g, '_').replace(/^_+|_+$/g, '');
}

// Builder step — mirrors the requested flow: pick Self/Cross → pick field → pick operator.
type Step = 'scope' | 'field' | 'operator';

interface Props {
  initial?: Formula | null;     // pass an existing formula to edit, omit/null to create
  onClose: () => void;
  onSave: (formula: Formula) => void;
}

export function FormulaBuilderModal({ initial, onClose, onSave }: Props) {
  const isEdit = !!initial;

  // ---- Basic info -----------------------------------------------------
  const [name, setName] = useState(initial?.name ?? '');
  const [code, setCode] = useState(initial?.code ?? '');
  const [codeTouched, setCodeTouched] = useState(isEdit);
  const [description, setDescription] = useState(initial?.description ?? '');
  const [returnType, setReturnType] = useState<FormulaReturnType>(initial?.returnType ?? 'number');

  // ---- Expression tokens ------------------------------------------------
  const [tokens, setTokens] = useState<FormulaToken[]>(initial?.tokens ?? []);

  // ---- "Add to expression" wizard state --------------------------------
  const [step, setStep] = useState<Step>('scope');
  const [scope, setScope] = useState<'self' | 'cross'>('self');
  const [crossEntityId, setCrossEntityId] = useState(CROSS_ENTITIES[0]?.id ?? '');
  const [fieldId, setFieldId] = useState('');
  const [numberValue, setNumberValue] = useState('');

  const currentEntity = scope === 'self' ? SELF_ENTITY : entityById(crossEntityId);
  const fieldOptions = currentEntity?.fields ?? [];

  function handleName(v: string) {
    setName(v);
    if (!codeTouched) setCode(slugCode(v));
  }

  function chooseScope(next: 'self' | 'cross') {
    setScope(next);
    setFieldId('');
    setStep('field');
  }

  function addField() {
    const entity = scope === 'self' ? SELF_ENTITY : entityById(crossEntityId);
    const field = entity?.fields.find((f) => f.id === fieldId);
    if (!entity || !field) return;
    setTokens((t) => [
      ...t,
      {
        id: nextId(),
        kind: 'field',
        scope,
        field: { entityId: entity.id, entityLabel: entity.label, fieldId: field.id, fieldLabel: field.label, dataType: field.dataType },
      },
    ]);
    setFieldId('');
    setStep('operator');
  }

  function addOperator(value: string, label: string) {
    setTokens((t) => [...t, { id: nextId(), kind: 'operator', value, label }]);
    setStep('scope');
    setScope('self');
  }

  function addParen(value: '(' | ')') {
    setTokens((t) => [...t, { id: nextId(), kind: 'paren', value }]);
  }

  function addNumber() {
    if (numberValue.trim() === '') return;
    setTokens((t) => [...t, { id: nextId(), kind: 'number', value: numberValue.trim() }]);
    setNumberValue('');
    setStep('operator');
  }

  function removeToken(id: string) {
    setTokens((t) => t.filter((tok) => tok.id !== id));
  }

  function resetExpression() {
    setTokens([]);
    setStep('scope');
    setScope('self');
  }

  const expression = useMemo(() => tokensToExpression(tokens), [tokens]);
  const dependencies = useMemo(() => tokenDependencies(tokens), [tokens]);
  const expressionError = useMemo(() => validateTokens(tokens), [tokens]);

  const canSubmit = name.trim().length > 0 && code.trim().length > 0 && !expressionError;

  function handleSubmit() {
    if (!canSubmit) return;
    const formula: Formula = {
      id: initial?.id ?? `formula_${Date.now()}`,
      name: name.trim(),
      code: code.trim(),
      description: description.trim() || undefined,
      returnType,
      tokens,
      expression,
      dependencies,
      status: initial?.status ?? 'active',
      updatedAt: new Date().toISOString(),
    };
    onSave(formula);
  }

  return (
    <div className="fixed inset-0 z-50 bg-ink-950/50 grid place-items-center px-4" onClick={onClose}>
      <div
        className="bg-white rounded-xl shadow-doe-lg max-w-[760px] w-full max-h-[92vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-3 border-b border-neutral-100 flex items-center justify-between">
          <div>
            <div className="text-[10px] font-sans uppercase tracking-[0.18em] text-neutral-500">Admin · Formula Configuration</div>
            <div className="text-[15px] font-display font-bold text-ink-950 mt-0.5">
              {isEdit ? 'Edit Formula' : 'Visual Formula Builder'}
            </div>
            <div className="text-[11px] text-neutral-500 mt-0.5">
              Pick Self or Cross-entity fields, chain them with operators, then save.
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 grid place-items-center text-neutral-500 hover:text-ink-950">✕</button>
        </div>

        <div className="px-5 py-4 overflow-y-auto flex-1 space-y-5">
          {/* ---- Basic info ---- */}
          <div>
            <FormField label="Formula Name" required>
              <input
                value={name}
                onChange={(e) => handleName(e.target.value)}
                placeholder="e.g. Late Renewal Penalty %"
                className="w-full px-3 h-9 border border-neutral-200 rounded-md text-[12.5px] focus:outline-none focus:border-action-orange"
              />
            </FormField>

            <div className="grid grid-cols-2 gap-3 mt-3.5">
              <FormField label="Formula Code" required helper="Auto-filled from name, editable.">
                <input
                  value={code}
                  onChange={(e) => { setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, '_')); setCodeTouched(true); }}
                  placeholder="FML_LATE_RENEWAL_PCT"
                  className="w-full px-3 h-9 border border-neutral-200 rounded-md text-[12.5px] font-mono focus:outline-none focus:border-action-orange"
                />
              </FormField>
              <FormField label="Return Type" required>
                <select
                  value={returnType}
                  onChange={(e) => setReturnType(e.target.value as FormulaReturnType)}
                  className="w-full px-2 h-9 border border-neutral-200 rounded-md text-[12.5px] focus:outline-none focus:border-action-orange"
                >
                  {RETURN_TYPES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
                </select>
              </FormField>
            </div>

            <FormField label="Description" helper="Optional — shown to other admins in the list view.">
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                placeholder="What this formula calculates and where it's used"
                className="w-full px-3 py-1.5 border border-neutral-200 rounded-md text-[12.5px] focus:outline-none focus:border-action-orange mt-3.5"
              />
            </FormField>
          </div>

          {/* ---- Expression builder ---- */}
          <div className="border border-neutral-200 rounded-lg overflow-hidden">
            <div className="px-4 py-2.5 bg-neutral-25 border-b border-neutral-100 flex items-center justify-between">
              <div className="text-[10.5px] font-sans uppercase tracking-[0.18em] text-neutral-500">Exp. Builder</div>
              {tokens.length > 0 && (
                <button onClick={resetExpression} className="text-[11px] text-doe-red hover:underline">Clear all</button>
              )}
            </div>

            <div className="p-4 space-y-4">
              {step === 'scope' && (
                <div>
                  <div className="text-[11px] font-semibold text-ink-950 mb-2">1 · Is this field Self or Cross-entity?</div>
                  <div className="flex gap-2">
                    <ScopeButton active={false} onClick={() => chooseScope('self')} title="Self" subtitle="Field on this application" />
                    <ScopeButton active={false} onClick={() => chooseScope('cross')} title="Cross" subtitle="Field on a related entity" />
                  </div>
                </div>
              )}

              {step === 'field' && (
                <div>
                  <div className="text-[11px] font-semibold text-ink-950 mb-2">
                    2 · Choose the {scope === 'cross' ? 'entity and ' : ''}field
                  </div>
                  <div className="flex gap-2 flex-wrap items-end">
                    {scope === 'cross' && (
                      <div className="w-[190px]">
                        <label className="block text-[10px] uppercase tracking-wider text-neutral-500 mb-1">Entity</label>
                        <select
                          value={crossEntityId}
                          onChange={(e) => { setCrossEntityId(e.target.value); setFieldId(''); }}
                          className="w-full px-2 h-9 border border-neutral-200 rounded-md text-[12.5px] focus:outline-none focus:border-action-orange"
                        >
                          {CROSS_ENTITIES.map((e) => <option key={e.id} value={e.id}>{e.label}</option>)}
                        </select>
                      </div>
                    )}
                    <div className="w-[220px]">
                      <label className="block text-[10px] uppercase tracking-wider text-neutral-500 mb-1">Field</label>
                      <select
                        value={fieldId}
                        onChange={(e) => setFieldId(e.target.value)}
                        className="w-full px-2 h-9 border border-neutral-200 rounded-md text-[12.5px] focus:outline-none focus:border-action-orange"
                      >
                        <option value="">Select a field…</option>
                        {fieldOptions.map((f) => <option key={f.id} value={f.id}>{f.label}</option>)}
                      </select>
                    </div>
                    <button onClick={addField} disabled={!fieldId}
                      className={cn('btn-primary text-[12px] h-9', !fieldId && 'opacity-50 cursor-not-allowed')}>
                      Insert field
                    </button>
                    <button onClick={() => setStep('scope')} className="btn-secondary text-[12px] h-9">Back</button>
                  </div>
                </div>
              )}

              {step === 'operator' && (
                <div>
                  <div className="text-[11px] font-semibold text-ink-950 mb-2">3 · Add an operator to continue the expression</div>
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {OPERATORS.map((op) => (
                      <button key={op.value} onClick={() => addOperator(op.value, op.label)}
                        className="px-2.5 py-1.5 rounded-md border border-neutral-200 text-[11.5px] font-mono hover:border-action-orange hover:bg-action-orange-soft transition">
                        {op.label}
                      </button>
                    ))}
                    <button onClick={() => addParen('(')} className="px-2.5 py-1.5 rounded-md border border-neutral-200 text-[11.5px] font-mono hover:border-action-orange hover:bg-action-orange-soft transition">( </button>
                    <button onClick={() => addParen(')')} className="px-2.5 py-1.5 rounded-md border border-neutral-200 text-[11.5px] font-mono hover:border-action-orange hover:bg-action-orange-soft transition"> )</button>
                  </div>
                  <div className="flex items-end gap-2">
                    <div className="w-[140px]">
                      <label className="block text-[10px] uppercase tracking-wider text-neutral-500 mb-1">Or insert a constant</label>
                      <input value={numberValue} onChange={(e) => setNumberValue(e.target.value)} placeholder="e.g. 100"
                        className="w-full px-3 h-9 border border-neutral-200 rounded-md text-[12.5px] font-mono focus:outline-none focus:border-action-orange" />
                    </div>
                    <button onClick={addNumber} disabled={!numberValue.trim()}
                      className={cn('btn-secondary text-[12px] h-9', !numberValue.trim() && 'opacity-50 cursor-not-allowed')}>
                      Insert number
                    </button>
                    <div className="flex-1" />
                    <button onClick={() => setStep('scope')} className="text-[11.5px] text-action-orange-deep font-semibold hover:underline">
                      + Add another field instead →
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Live token chips */}
            <div className="px-4 pb-4">
              <label className="block text-[10px] uppercase tracking-wider text-neutral-500 mb-1.5">Expression tokens</label>
              {tokens.length === 0 ? (
                <div className="text-[11.5px] text-neutral-400 border border-dashed border-neutral-200 rounded-md px-3 py-3 text-center">
                  Nothing added yet — start with step 1 above.
                </div>
              ) : (
                <div className="flex flex-wrap gap-1.5 border border-neutral-200 rounded-md px-2.5 py-2.5 bg-neutral-25/60">
                  {tokens.map((t) => (
                    <TokenChip key={t.id} token={t} onRemove={() => removeToken(t.id)} />
                  ))}
                </div>
              )}
            </div>

            {/* exp. — generated expression preview, per the sketch */}
            <div className="px-4 pb-4">
              <label className="block text-[10px] uppercase tracking-wider text-neutral-500 mb-1.5">exp.</label>
              <div className="w-full px-3 py-2 border border-neutral-200 rounded-md text-[12.5px] font-mono bg-white min-h-[36px] break-all">
                {expression || <span className="text-neutral-400">Expression will appear here as you build it</span>}
              </div>
              {expressionError && tokens.length > 0 && (
                <div className="text-[11px] text-doe-red mt-1">{expressionError}</div>
              )}
            </div>

            {/* Dependencies */}
            <div className="px-4 pb-4">
              <label className="block text-[10px] uppercase tracking-wider text-neutral-500 mb-1.5">Dependencies</label>
              {dependencies.length === 0 ? (
                <span className="text-[11.5px] text-neutral-400">None — this formula only uses fields on Self.</span>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {dependencies.map((d) => (
                    <span key={d} className="px-2 py-0.5 rounded-full bg-info-soft text-info-500 text-[10.5px] font-semibold">{d}</span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-neutral-100 flex items-center justify-end gap-2">
          <button onClick={onClose} className="btn-secondary text-[12px]">Cancel</button>
          <button onClick={handleSubmit} disabled={!canSubmit}
            className={cn('btn-primary text-[12px]', !canSubmit && 'opacity-50 cursor-not-allowed')}>
            {isEdit ? 'Save Changes' : 'Create Formula'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Small local pieces ───────────────────────────────────────────────────

function FormField({ label, required, helper, children }: { label: string; required?: boolean; helper?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[10.5px] font-sans uppercase tracking-wider text-neutral-500 mb-1">
        {label}{required && <span className="text-doe-red ml-0.5">*</span>}
      </label>
      {children}
      {helper && <div className="text-[10.5px] text-neutral-500 mt-1">{helper}</div>}
    </div>
  );
}

function ScopeButton({ active, onClick, title, subtitle }: { active: boolean; onClick: () => void; title: string; subtitle: string }) {
  return (
    <button onClick={onClick}
      className={cn(
        'flex-1 text-left px-3.5 py-2.5 rounded-lg border transition',
        active ? 'border-action-orange bg-action-orange-soft' : 'border-neutral-200 hover:border-action-orange hover:bg-action-orange-soft/50',
      )}>
      <div className="text-[12.5px] font-semibold text-ink-950">{title}</div>
      <div className="text-[10.5px] text-neutral-500">{subtitle}</div>
    </button>
  );
}

function TokenChip({ token, onRemove }: { token: FormulaToken; onRemove: () => void }) {
  let label: string;
  let cls: string;
  if (token.kind === 'field') {
    label = token.scope === 'cross' ? `${token.field.entityLabel}.${token.field.fieldLabel}` : token.field.fieldLabel;
    cls = token.scope === 'cross' ? 'bg-info-soft text-info-500' : 'bg-mint text-success-500';
  } else if (token.kind === 'operator') {
    label = token.value;
    cls = 'bg-neutral-100 text-neutral-700 font-mono';
  } else if (token.kind === 'number') {
    label = token.value;
    cls = 'bg-action-orange-soft text-action-orange-deep font-mono';
  } else {
    label = token.value;
    cls = 'bg-neutral-100 text-neutral-500 font-mono';
  }
  return (
    <span className={cn('inline-flex items-center gap-1 pl-2 pr-1 py-1 rounded-md text-[11.5px] font-semibold', cls)}>
      {label}
      <button onClick={onRemove} className="w-4 h-4 grid place-items-center rounded hover:bg-black/10 text-[10px]">✕</button>
    </span>
  );
}
