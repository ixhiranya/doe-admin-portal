// src/components/admin/FormulaBuilderModal.tsx
import { useMemo, useState } from 'react';
import { cn } from '../../lib/utils';
import {
  ENTITIES, PRODUCTS, TEMPLATES, OPERATORS, RETURN_TYPES,
  templateById, entityById, resolveTemplate,
} from '../../data/formulaEntities';
import { tokensToExpression, validateTokens, deriveFormulaType } from '../../lib/formula';
import type { Formula, FormulaToken } from '../../types/formula';

let uid = 0;
const nextId = () => `tok_${Date.now()}_${uid++}`;

function slugCode(name: string) {
  return 'FML_' + name.trim().toUpperCase().replace(/[^A-Z0-9]+/g, '_').replace(/^_+|_+$/g, '');
}

type Scope = 'self' | 'cross';

interface Props {
  nextFormulaId: string;                 // e.g. 'FML-1006' — display id for the new formula
  onClose: () => void;
  onCreate: (formula: Formula) => void;
}

export function FormulaBuilderModal({ nextFormulaId, onClose, onCreate }: Props) {
  // ---- Basic info ---------------------------------------------------
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [codeTouched, setCodeTouched] = useState(false);
  const [returnType, setReturnType] = useState('');
  const [baseTemplateId, setBaseTemplateId] = useState('');
  const [description, setDescription] = useState('');

  // ---- Expression tokens ------------------------------------------------
  const [tokens, setTokens] = useState<FormulaToken[]>([]);

  // ---- Field-picker wizard state ----------------------------------------
  const [scope, setScope] = useState<Scope | null>(null);
  const [crossEntityId, setCrossEntityId] = useState('');
  const [crossProductId, setCrossProductId] = useState('');
  const [fieldId, setFieldId] = useState('');
  const [numberValue, setNumberValue] = useState('');

  const baseTemplate = templateById(baseTemplateId);
  const resolvedCrossTemplate = crossEntityId && crossProductId ? resolveTemplate(crossEntityId, crossProductId) : undefined;
  const fieldOptions = scope === 'self' ? (baseTemplate?.fields ?? []) : (resolvedCrossTemplate?.fields ?? []);

  function handleName(v: string) {
    setName(v);
    if (!codeTouched) setCode(slugCode(v));
  }

  function chooseScope(next: Scope) {
    setScope(next);
    setFieldId('');
    setCrossEntityId('');
    setCrossProductId('');
  }

  function backToScope() {
    setScope(null);
    setFieldId('');
  }

  function insertField() {
    if (!fieldId) return;
    if (scope === 'self') {
      if (!baseTemplate) return;
      const field = baseTemplate.fields.find((f) => f.id === fieldId);
      if (!field) return;
      setTokens((t) => [...t, { id: nextId(), kind: 'field', scope: 'self', field: { fieldId: field.id, fieldLabel: field.label } }]);
    } else {
      if (!resolvedCrossTemplate) return;
      const field = resolvedCrossTemplate.fields.find((f) => f.id === fieldId);
      const entity = entityById(crossEntityId);
      if (!field || !entity) return;
      setTokens((t) => [...t, { id: nextId(), kind: 'field', scope: 'cross', field: { fieldId: field.id, fieldLabel: field.label, entityLabel: entity.name } }]);
    }
    setScope(null);
    setFieldId('');
    setCrossEntityId('');
    setCrossProductId('');
  }

  function insertOperator(value: string, label: string) {
    setTokens((t) => [...t, { id: nextId(), kind: 'operator', value, label }]);
  }

  function insertNumber() {
    if (!numberValue.trim()) return;
    setTokens((t) => [...t, { id: nextId(), kind: 'number', value: numberValue.trim() }]);
    setNumberValue('');
  }

  function removeToken(id: string) {
    setTokens((t) => t.filter((tok) => tok.id !== id));
  }

  const expression = useMemo(() => tokensToExpression(tokens), [tokens]);
  const formulaType = useMemo(() => deriveFormulaType(tokens), [tokens]);
  const expressionError = useMemo(() => validateTokens(tokens), [tokens]);

  const canSubmit = name.trim().length > 0 && code.trim().length > 0 && !!returnType && !!baseTemplateId && !expressionError;

  function handleCreate() {
    if (!canSubmit) return;
    const formula: Formula = {
      id: `formula_${Date.now()}`,
      formulaId: nextFormulaId,
      name: name.trim(),
      code: code.trim(),
      description: description.trim() || undefined,
      templateId: baseTemplateId,
      returnType,
      tokens,
      expression,
      type: formulaType,
      status: 'draft',
      enabled: true,
      updatedAt: new Date().toISOString(),
    };
    onCreate(formula);
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/40 grid place-items-center px-4" onClick={onClose}>
      <div
        className="bg-white rounded-xl shadow-xl max-w-[900px] w-full max-h-[92vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-neutral-200 flex items-center justify-between">
          <h2 className="text-[20px] font-bold text-ink-950">New Formula</h2>
          <button onClick={onClose} aria-label="Close" className="w-8 h-8 grid place-items-center text-neutral-400 hover:text-ink-950 text-lg">✕</button>
        </div>

        <div className="px-6 py-5 overflow-y-auto flex-1">
          {/* Row 1: Name / Code / Return type */}
          <div className="grid grid-cols-3 gap-4">
            <Field label="Formula Name" required>
              <input value={name} onChange={(e) => handleName(e.target.value)} placeholder="e.g. Late Renewal Penalty %"
                className="w-full px-3 h-10 border border-neutral-300 rounded-md text-[13px] focus:outline-none focus:ring-2 focus:ring-action-orange/40 focus:border-action-orange" />
            </Field>
            <Field label="Formula Code" required helper="Auto-generated from name. Editable.">
              <input value={code} onChange={(e) => { setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, '_')); setCodeTouched(true); }} placeholder="e.g. FML_LATE_RENEWAL_PCT"
                className="w-full px-3 h-10 border border-neutral-300 rounded-md text-[13px] font-mono focus:outline-none focus:ring-2 focus:ring-action-orange/40 focus:border-action-orange" />
            </Field>
            <Field label="Return Type" required>
              <select value={returnType} onChange={(e) => setReturnType(e.target.value)}
                className="w-full px-2.5 h-10 border border-neutral-300 rounded-md text-[13px] bg-white focus:outline-none focus:ring-2 focus:ring-action-orange/40 focus:border-action-orange">
                <option value="">Select return type</option>
                {RETURN_TYPES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
            </Field>
          </div>

          {/* Template ID */}
          <div className="mt-4">
            <Field label="Template ID" required helper="Template determines available fields for Self/Cross selection.">
              <select
                value={baseTemplateId}
                onChange={(e) => { setBaseTemplateId(e.target.value); setScope(null); setTokens([]); }}
                className="w-full px-2.5 h-10 border border-neutral-300 rounded-md text-[13px] bg-white focus:outline-none focus:ring-2 focus:ring-action-orange/40 focus:border-action-orange"
              >
                <option value="">Select template</option>
                {TEMPLATES.map((t) => <option key={t.id} value={t.id}>{t.id} · {t.name}</option>)}
              </select>
            </Field>
          </div>

          {/* Self / Cross decision, or the active picker */}
          {scope === null ? (
            <div className="mt-5 pt-4 border-t border-neutral-200">
              <div className="text-[11px] font-bold uppercase tracking-wide text-neutral-500 mb-2">Based on template</div>
              <label className="block text-[12px] font-bold text-ink-950 mb-2">
                Is this field Self or Cross-entity? <span className="text-red-500">*</span>
              </label>
              <div className="flex gap-3">
                <ScopeCard
                  active={false} disabled={!baseTemplateId}
                  onClick={() => chooseScope('self')}
                  icon={<PersonIcon />} iconBg="bg-sky-100 text-sky-600"
                  title="Self" subtitle="Field on this application"
                />
                <ScopeCard
                  active={false} disabled={!baseTemplateId}
                  onClick={() => chooseScope('cross')}
                  icon={<PeopleIcon />} iconBg="bg-emerald-100 text-emerald-600"
                  title="Cross" subtitle="Field on a related entity"
                />
              </div>
              {!baseTemplateId && <div className="text-[11.5px] text-neutral-400 mt-2">Select a Template ID above first.</div>}
            </div>
          ) : (
            <div className="mt-5 pt-4 border-t border-neutral-200">
              {scope === 'self' ? (
                <>
                  <div className="text-[11px] font-bold uppercase tracking-wide text-neutral-500 mb-2">Select field *</div>
                  <div className="flex flex-wrap items-end gap-2.5">
                    <div className="w-[260px]">
                      <label className="block text-[10.5px] uppercase tracking-wide text-neutral-500 mb-1">Field</label>
                      <select value={fieldId} onChange={(e) => setFieldId(e.target.value)}
                        className="w-full px-2.5 h-10 border border-neutral-300 rounded-md text-[13px] bg-white focus:outline-none focus:ring-2 focus:ring-action-orange/40 focus:border-action-orange">
                        <option value="">Select a field</option>
                        {fieldOptions.map((f) => <option key={f.id} value={f.id}>{f.label}</option>)}
                      </select>
                    </div>
                    <button onClick={insertField} disabled={!fieldId}
                      className={cn('h-10 px-4 rounded-md text-[13px] font-semibold text-white bg-action-orange', !fieldId && 'opacity-40 cursor-not-allowed')}>
                      Insert field
                    </button>
                    <button onClick={backToScope} className="h-10 px-4 rounded-md text-[13px] font-semibold border border-neutral-300 text-ink-950 hover:bg-neutral-50">
                      Back
                    </button>
                  </div>
                  <div className="text-[11.5px] text-neutral-500 mt-2">Fields come from Template {baseTemplateId} ({baseTemplate?.name}).</div>
                </>
              ) : (
                <>
                  <div className="text-[11px] font-bold uppercase tracking-wide text-neutral-500 mb-2">Select entity, product and template ID *</div>
                  <div className="flex flex-wrap items-end gap-2.5">
                    <div className="w-[190px]">
                      <label className="block text-[10.5px] uppercase tracking-wide text-neutral-500 mb-1">Entity</label>
                      <select value={crossEntityId} onChange={(e) => { setCrossEntityId(e.target.value); setFieldId(''); }}
                        className="w-full px-2.5 h-10 border border-neutral-300 rounded-md text-[13px] bg-white focus:outline-none focus:ring-2 focus:ring-action-orange/40 focus:border-action-orange">
                        <option value="">Select entity</option>
                        {ENTITIES.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
                      </select>
                    </div>
                    <div className="w-[170px]">
                      <label className="block text-[10.5px] uppercase tracking-wide text-neutral-500 mb-1">Product</label>
                      <select value={crossProductId} onChange={(e) => { setCrossProductId(e.target.value); setFieldId(''); }}
                        className="w-full px-2.5 h-10 border border-neutral-300 rounded-md text-[13px] bg-white focus:outline-none focus:ring-2 focus:ring-action-orange/40 focus:border-action-orange">
                        <option value="">Select a product</option>
                        {PRODUCTS.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                      </select>
                    </div>
                    <div className="w-[170px]">
                      <label className="block text-[10.5px] uppercase tracking-wide text-neutral-500 mb-1">Template ID</label>
                      <select value={resolvedCrossTemplate?.id ?? ''} disabled
                        className="w-full px-2.5 h-10 border border-neutral-300 rounded-md text-[13px] bg-neutral-50 text-neutral-600">
                        <option value="">{crossEntityId && crossProductId ? 'No match' : 'Select template'}</option>
                        {resolvedCrossTemplate && <option value={resolvedCrossTemplate.id}>{resolvedCrossTemplate.id}</option>}
                      </select>
                    </div>
                  </div>

                  {resolvedCrossTemplate && (
                    <div className="w-[260px] mt-3">
                      <label className="block text-[10.5px] uppercase tracking-wide text-neutral-500 mb-1">Field</label>
                      <select value={fieldId} onChange={(e) => setFieldId(e.target.value)}
                        className="w-full px-2.5 h-10 border border-neutral-300 rounded-md text-[13px] bg-white focus:outline-none focus:ring-2 focus:ring-action-orange/40 focus:border-action-orange">
                        <option value="">Select a field</option>
                        {fieldOptions.map((f) => <option key={f.id} value={f.id}>{f.label}</option>)}
                      </select>
                    </div>
                  )}

                  <div className="flex gap-2.5 mt-3">
                    <button onClick={insertField} disabled={!fieldId}
                      className={cn('h-10 px-4 rounded-md text-[13px] font-semibold text-white bg-action-orange', !fieldId && 'opacity-40 cursor-not-allowed')}>
                      Insert field
                    </button>
                    <button onClick={backToScope} className="h-10 px-4 rounded-md text-[13px] font-semibold border border-neutral-300 text-ink-950 hover:bg-neutral-50">
                      Back
                    </button>
                  </div>
                  <div className="text-[11.5px] text-neutral-500 mt-2">Select an entity, product and template, then click "Insert field" to add it to the expression.</div>
                </>
              )}
            </div>
          )}

          {/* Operators */}
          <div className="mt-5 pt-4 border-t border-neutral-200">
            <div className="text-[11px] font-bold uppercase tracking-wide text-neutral-500 mb-2">Add an operator to continue the expression</div>
            <div className="flex flex-wrap gap-2">
              {OPERATORS.map((op) => (
                <button key={op.value} onClick={() => insertOperator(op.value, op.label)}
                  className="px-3 py-2 rounded-md border border-neutral-300 text-[12.5px] font-mono text-ink-950 hover:border-action-orange hover:bg-orange-50 transition">
                  {op.label}
                </button>
              ))}
            </div>

            <div className="text-[11px] font-bold uppercase tracking-wide text-neutral-500 mt-4 mb-2">Or insert a constant</div>
            <div className="flex items-center gap-2.5">
              <input value={numberValue} onChange={(e) => setNumberValue(e.target.value)} placeholder="e.g. 100"
                className="w-[160px] px-3 h-10 border border-neutral-300 rounded-md text-[13px] font-mono focus:outline-none focus:ring-2 focus:ring-action-orange/40 focus:border-action-orange" />
              <button onClick={insertNumber} disabled={!numberValue.trim()}
                className={cn('h-10 px-4 rounded-md text-[13px] font-semibold border border-neutral-300 text-ink-950 hover:bg-neutral-50', !numberValue.trim() && 'opacity-40 cursor-not-allowed')}>
                Insert number
              </button>
              <div className="flex-1" />
              {scope !== null && (
                <button onClick={backToScope} className="text-[12.5px] font-semibold text-action-orange hover:underline">
                  + Add another field instead
                </button>
              )}
            </div>
          </div>

          {/* Expression tokens (chips) */}
          {tokens.length > 0 && (
            <div className="mt-4">
              <div className="text-[11px] font-bold uppercase tracking-wide text-neutral-500 mb-1.5">Expression tokens</div>
              <div className="flex flex-wrap gap-1.5 border border-neutral-200 rounded-md p-2.5 bg-neutral-50">
                {tokens.map((t) => <TokenChip key={t.id} token={t} onRemove={() => removeToken(t.id)} />)}
              </div>
            </div>
          )}

          {/* Description */}
          <div className="mt-4">
            <Field label="Description" helper="Shown to other admins in the list view.">
              <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3}
                placeholder="What this formula calculates and where it's used…"
                className="w-full px-3 py-2 border border-neutral-300 rounded-md text-[13px] focus:outline-none focus:ring-2 focus:ring-action-orange/40 focus:border-action-orange" />
            </Field>
          </div>

          {/* Expression preview */}
          <div className="mt-4">
            <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-neutral-500 mb-1.5">
              Expression Preview
              <span title="This is a live preview of the formula you're building." className="w-3.5 h-3.5 rounded-full border border-neutral-400 text-neutral-400 text-[9px] grid place-items-center cursor-help">i</span>
            </div>
            <div className="w-full px-3 py-2.5 border border-neutral-300 rounded-md text-[13px] font-mono bg-neutral-50 min-h-[42px] break-all">
              {expression ? <span className="text-ink-950">{expression}</span> : <span className="text-neutral-400">Expression will appear here as you build it</span>}
            </div>
            <div className="text-[11px] text-neutral-500 mt-1">The formula expression will be validated in the next step.</div>
            {expressionError && tokens.length > 0 && <div className="text-[11px] text-red-600 mt-1">{expressionError}</div>}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-neutral-200 flex items-center justify-end gap-3">
          <button onClick={onClose} className="h-10 px-5 rounded-md text-[13px] font-semibold border border-neutral-300 text-ink-950 hover:bg-neutral-50">
            Cancel
          </button>
          <button onClick={handleCreate} disabled={!canSubmit}
            className={cn('h-10 px-5 rounded-md text-[13px] font-semibold text-white bg-action-orange hover:bg-action-orange-dark', !canSubmit && 'opacity-40 cursor-not-allowed')}>
            Create
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Small local pieces ───────────────────────────────────────────────────

function Field({ label, required, helper, children }: { label: string; required?: boolean; helper?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[11px] font-bold uppercase tracking-wide text-neutral-500 mb-1.5">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
      {helper && <div className="text-[11px] text-neutral-500 mt-1">{helper}</div>}
    </div>
  );
}

function ScopeCard({ disabled, onClick, icon, iconBg, title, subtitle }: {
  active: boolean; disabled?: boolean; onClick: () => void; icon: React.ReactNode; iconBg: string; title: string; subtitle: string;
}) {
  return (
    <button onClick={onClick} disabled={disabled}
      className={cn(
        'flex-1 flex items-center gap-3 text-left px-4 py-3.5 rounded-lg border border-neutral-200 transition',
        disabled ? 'opacity-50 cursor-not-allowed' : 'hover:border-action-orange hover:bg-orange-50/40',
      )}>
      <span className={cn('w-9 h-9 rounded-md grid place-items-center shrink-0', iconBg)}>{icon}</span>
      <span>
        <div className="text-[13.5px] font-bold text-ink-950">{title}</div>
        <div className="text-[11.5px] text-neutral-500">{subtitle}</div>
      </span>
    </button>
  );
}

function TokenChip({ token, onRemove }: { token: FormulaToken; onRemove: () => void }) {
  let label: string;
  let cls: string;
  if (token.kind === 'field') {
    label = token.scope === 'cross' && token.field.entityLabel ? `${token.field.entityLabel}.${token.field.fieldLabel}` : token.field.fieldLabel;
    cls = token.scope === 'cross' ? 'bg-emerald-50 text-emerald-700' : 'bg-sky-50 text-sky-700';
  } else if (token.kind === 'operator') {
    label = token.value;
    cls = 'bg-neutral-200 text-neutral-700 font-mono';
  } else {
    label = token.value;
    cls = 'bg-orange-50 text-action-orange font-mono';
  }
  return (
    <span className={cn('inline-flex items-center gap-1 pl-2 pr-1 py-1 rounded-md text-[11.5px] font-semibold', cls)}>
      {label}
      <button onClick={onRemove} aria-label="Remove" className="w-4 h-4 grid place-items-center rounded hover:bg-black/10 text-[10px]">✕</button>
    </span>
  );
}

function PersonIcon() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 4-6 8-6s8 2 8 6"/></svg>;
}
function PeopleIcon() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="8" r="3.2"/><circle cx="17" cy="9" r="2.6"/><path d="M3 20c0-3.3 2.7-5.5 6-5.5s6 2.2 6 5.5"/><path d="M14.5 15c2.6.2 4.5 2.1 4.5 5"/></svg>;
}
