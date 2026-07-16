// =============================================================================
// BN 10 — Gas Supply · Monthly Outflow Submission (SDD §3.10 / §3.10.1)
// -----------------------------------------------------------------------------
// Per SDD requirements, the Daily Outflow Report supports multiple line items
// in a single submission. Each line item captures:
//   • Customer Type (radio: Residential / Commercial)
//   • Customer (filtered by type)
//   • Date
//   • Unit of Measurement (radio: Litres / SCM) — Quantity label/equivalent
//   • Quantity
//   • Type of Gas
//   • Product Type (includes "CNG decanting point")
//   • Asset (gas storage)
//   • Supporting Document (optional)
//   • Expired-contract warning + acknowledgment when the selected customer's
//     Expiry of Gas Sales Contract has passed (§3.10.1)
// =============================================================================
import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  listCustomers, listAssets, GAS_TYPES, formatLiters,
  type BusinessType,
} from '../../services/gasRegister/gasFlow';
import { customerLegacyBusinessType, contractExpired } from '../../services/gasRegister/customers';
import {
  PRODUCT_TYPES, convertVolume, formatVolumeDual, type Unit, type GasTypeId,
} from '../../services/gasRegister/technical';
import { cn } from '../../lib/utils';

// ---------------------------------------------------------------------------
// Row state
// ---------------------------------------------------------------------------
type Row = {
  id: number;
  customerType: BusinessType | '';
  customerId: string;
  date: string;
  unit: Unit | '';
  quantity: string;
  gasType: string;
  productTypeId: string;
  assetId: string;
  supportingDoc?: { fileName: string };
  expiredAcknowledged?: boolean;     // user must tick to proceed if contract expired
};

const emptyRow = (id: number): Row => ({
  id, customerType: '', customerId: '', date: '', unit: '', quantity: '',
  gasType: '', productTypeId: '', assetId: '', supportingDoc: undefined, expiredAcknowledged: false,
});

// Map free-string legacy gas labels to typed GasTypeId for conversion.
function legacyGasToId(label: string): GasTypeId {
  const lc = label.toLowerCase();
  if (lc.includes('propane')) return 'propane';
  if (lc.includes('butadiene')) return 'butadienes';
  if (lc.includes('butane')) return 'butane';
  if (lc.includes('benzol') || lc.includes('benzene')) return 'benzol';
  if (lc.includes('compressed') && lc.includes('natural')) return 'cng';
  if (lc.includes('natural gas') || lc.includes('lng') || lc.includes('methane')) return 'ng';
  if (lc.includes('lpg')) return 'lpg';
  return 'lpg';
}

export function OutflowCreatePage() {
  const navigate = useNavigate();
  const customers = useMemo(() => listCustomers(), []);
  const assets    = useMemo(() => listAssets(), []);

  const [rows, setRows] = useState<Row[]>([emptyRow(1)]);

  const addRow    = () => setRows((rs) => [...rs, emptyRow(Math.max(0, ...rs.map((r) => r.id)) + 1)]);
  const removeRow = (id: number) => setRows((rs) => rs.length > 1 ? rs.filter((r) => r.id !== id) : rs);
  const updateRow = (id: number, patch: Partial<Row>) => setRows((rs) => rs.map((r) => r.id === id ? { ...r, ...patch } : r));

  // Per-row helpers
  const rowVolumeInLiters = (r: Row) => {
    const qty = parseFloat(r.quantity) || 0;
    if (!r.unit) return 0;
    const gasId = r.gasType ? legacyGasToId(r.gasType) : 'lpg';
    return r.unit === 'SCM' ? convertVolume(qty, 'SCM', 'L', gasId) : qty;
  };
  const rowCustomerExpired = (r: Row): boolean => {
    if (!r.customerId) return false;
    const c = customers.find((cc) => cc.id === r.customerId);
    return !!c && contractExpired(c);
  };
  const rowValid = (r: Row): boolean =>
    !!r.customerType && !!r.customerId && !!r.date && !!r.unit && !!r.quantity && parseFloat(r.quantity) > 0 &&
    !!r.gasType && !!r.productTypeId && !!r.assetId &&
    (!rowCustomerExpired(r) || !!r.expiredAcknowledged);

  const allValid = rows.every(rowValid);
  const totalQtyLiters = rows.reduce((s, r) => s + rowVolumeInLiters(r), 0);

  const submit = () => navigate('/gas-register/outflow?created=' + rows.length);

  return (
    <div className="min-h-screen bg-neutral-25">
      <div className="border-b border-neutral-100 bg-white">
        <div className="max-w-[1400px] mx-auto px-6 py-3 flex items-center justify-between text-[12px]">
          <nav className="text-neutral-500">
            <Link to="/pps-dashboard" className="hover:text-doe-red">Home</Link>
            <span className="mx-2 text-neutral-300">›</span>
            <span>Gas Register</span>
            <span className="mx-2 text-neutral-300">›</span>
            <Link to="/gas-register/outflow" className="hover:text-doe-red">Daily Outflow</Link>
            <span className="mx-2 text-neutral-300">›</span>
            <span className="text-ink-950 font-semibold">Submit outflow</span>
          </nav>
          <button type="button" onClick={() => navigate('/gas-register/outflow')} className="text-[11px] text-neutral-500 hover:text-doe-red flex items-center gap-1">
            <span>‹</span> Back to outflow
          </button>
        </div>
      </div>

      <div className="max-w-[1400px] mx-auto px-6 py-8">
        <div className="mb-6 flex items-start justify-between gap-6 flex-wrap">
          <div>
            <h1 className="font-display font-extrabold text-[28px] text-ink-950 leading-tight">Submit daily outflow report</h1>
            <p className="text-[12.5px] text-neutral-500 mt-1.5">Add one row per delivery. Pick a unit per row; the equivalent is shown alongside the quantity. Per SDD §3.10.1, expired contracts require an explicit acknowledgment.</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <div className="text-[10px] font-sans uppercase tracking-[0.18em] text-neutral-500">Combined (in litres)</div>
              <div className="font-display font-bold text-[16px] text-ink-950 tabular-nums">{formatLiters(totalQtyLiters)}</div>
            </div>
            <button
              type="button"
              onClick={submit}
              disabled={!allValid}
              className={cn('px-4 py-2 rounded-md text-[12.5px] font-semibold shadow-doe-sm transition',
                allValid ? 'bg-action-orange text-white hover:bg-action-orange-dark' : 'bg-neutral-200 text-neutral-500 cursor-not-allowed')}
            >Submit {rows.length} row{rows.length === 1 ? '' : 's'}</button>
          </div>
        </div>

        <div className="space-y-4">
          {rows.map((r, idx) => {
            const scopedCustomers = r.customerType
              ? customers.filter((c) => customerLegacyBusinessType(c) === r.customerType && c.connectionStatus === 'Active')
              : customers.filter((c) => c.connectionStatus === 'Active');
            const selectedCustomer = customers.find((c) => c.id === r.customerId);
            const scopedAssets = selectedCustomer
              ? assets.filter((a) => a.permitHolderId === selectedCustomer.permitHolderId)
              : assets;
            const expired = rowCustomerExpired(r);
            const qty = parseFloat(r.quantity) || 0;
            const gasId = r.gasType ? legacyGasToId(r.gasType) : 'lpg';
            const dual = r.unit && qty > 0 ? formatVolumeDual(qty, r.unit, gasId) : '';

            const onPickFile = (e: React.ChangeEvent<HTMLInputElement>) => {
              const file = e.target.files?.[0];
              if (file) updateRow(r.id, { supportingDoc: { fileName: file.name } });
            };

            return (
              <div key={r.id} className={cn('card overflow-hidden', expired && 'border-doe-red')}>
                <div className="px-4 py-2.5 border-b border-neutral-100 bg-neutral-25/60 flex items-center justify-between">
                  <div className="text-[10.5px] font-sans uppercase tracking-[0.18em] text-neutral-500">Line item {idx + 1}</div>
                  <button onClick={() => removeRow(r.id)} disabled={rows.length === 1}
                    title={rows.length === 1 ? 'At least one row required' : `Remove line ${idx + 1}`}
                    className={cn('text-[11px] flex items-center gap-1 text-neutral-500 hover:text-doe-red transition',
                      rows.length === 1 && 'opacity-40 cursor-not-allowed')}>
                    <TrashIcon /> Remove
                  </button>
                </div>

                <div className="px-4 py-4 space-y-3">
                  {/* Identity */}
                  <Row>
                    <Field label="Customer type" required span={3}>
                      <SmallRadioPair value={r.customerType}
                        onChange={(v) => updateRow(r.id, { customerType: v as BusinessType, customerId: '', assetId: '', expiredAcknowledged: false })}
                        options={['Residential', 'Commercial']} />
                    </Field>
                    <Field label="Customer" required span={5}>
                      <Select value={r.customerId} onChange={(v) => updateRow(r.id, { customerId: v, assetId: '', expiredAcknowledged: false })}
                        options={scopedCustomers.map((c) => ({ value: c.id, label: c.buildingName }))}
                        placeholder={r.customerType ? 'Select customer…' : 'Pick a type first'}
                        disabled={!r.customerType} />
                    </Field>
                    <Field label="Date" required span={4}>
                      <Input type="date" value={r.date} onChange={(v) => updateRow(r.id, { date: v })} />
                    </Field>
                  </Row>

                  {/* Expired-contract warning (SDD §3.10.1) */}
                  {expired && selectedCustomer && (
                    <div className="rounded-md border border-doe-red bg-rose-50 px-3 py-2.5">
                      <div className="flex items-start gap-2">
                        <span className="text-[14px] leading-none mt-0.5">⚠️</span>
                        <div className="flex-1">
                          <div className="text-[12.5px] font-semibold text-doe-red">Customer contract has expired</div>
                          <div className="text-[11.5px] text-neutral-700 mt-0.5 leading-relaxed">
                            {selectedCustomer.buildingName}'s Gas Sales Contract expired on{' '}
                            <span className="font-mono">{selectedCustomer.expiryOfGasSalesContract}</span>.
                            Per SDD §3.10.1, you must acknowledge before submitting an outflow against an expired contract.
                          </div>
                          <label className="mt-2 flex items-start gap-2 cursor-pointer">
                            <input type="checkbox" checked={!!r.expiredAcknowledged}
                              onChange={(e) => updateRow(r.id, { expiredAcknowledged: e.target.checked })}
                              className="mt-0.5 accent-doe-red" />
                            <span className="text-[11.5px] text-ink-950">
                              I confirm this outflow is authorised despite the expired contract and will follow up with a contract renewal.
                            </span>
                          </label>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Quantity (BN 10 — UoM radio + dual display) */}
                  <Row>
                    <Field label="Unit of measurement" required span={3}>
                      <UnitRadio value={r.unit} onChange={(u) => updateRow(r.id, { unit: u })} />
                    </Field>
                    <Field
                      label={r.unit === 'SCM' ? 'Quantity (in SCM)' : r.unit === 'L' ? 'Quantity (in litres)' : 'Quantity'}
                      required span={3}>
                      {r.unit ? (
                        <Input
                          value={r.quantity}
                          onChange={(v) => updateRow(r.id, { quantity: v.replace(/[^0-9.]/g, '') })}
                          placeholder={r.unit === 'SCM' ? '0.00' : '0'}
                          mono
                          suffix={dual ? `≈ ${dual}` : ''}
                        />
                      ) : (
                        <div className="px-3 py-2 text-[12px] text-neutral-400 bg-neutral-25 border border-dashed border-neutral-200 rounded-md">Pick a unit first</div>
                      )}
                    </Field>
                    <Field label="Type of gas" required span={3}>
                      <Select value={r.gasType} onChange={(v) => updateRow(r.id, { gasType: v })}
                        options={[...GAS_TYPES].map((g) => ({ value: g, label: g }))}
                        placeholder="Select gas…" />
                    </Field>
                    <Field label="Product type" required span={3}>
                      <Select value={r.productTypeId} onChange={(v) => updateRow(r.id, { productTypeId: v })}
                        options={PRODUCT_TYPES.map((p) => ({ value: p.id, label: p.label }))}
                        placeholder="Select product type…" />
                    </Field>
                  </Row>

                  {/* Asset + Supporting doc */}
                  <Row>
                    <Field label="Asset (gas storage)" required span={6}>
                      <Select value={r.assetId} onChange={(v) => updateRow(r.id, { assetId: v })}
                        options={scopedAssets.map((a) => ({ value: a.id, label: a.facilityName }))}
                        placeholder={selectedCustomer ? 'Select asset…' : 'Pick a customer first'}
                        disabled={!selectedCustomer} />
                    </Field>
                    <Field label="Supporting document" span={6}>
                      <FileInput value={r.supportingDoc?.fileName} onChange={onPickFile} onClear={() => updateRow(r.id, { supportingDoc: undefined })} />
                    </Field>
                  </Row>
                </div>
              </div>
            );
          })}

          <div className="card p-3 flex items-center justify-between bg-neutral-25/60">
            <button type="button" onClick={addRow}
              className="px-3 py-2 rounded-md text-[12px] font-semibold text-ink-950 border border-dashed border-neutral-300 hover:border-action-orange hover:text-action-orange-dark hover:bg-action-orange-soft/40 transition">
              + Add another line item
            </button>
            <button type="button" onClick={submit} disabled={!allValid}
              className={cn('px-4 py-2 rounded-md text-[12.5px] font-semibold shadow-doe-sm transition',
                allValid ? 'bg-success-500 text-white hover:opacity-90' : 'bg-neutral-200 text-neutral-500 cursor-not-allowed')}>
              Submit outflow report
            </button>
          </div>

          {!allValid && (
            <div className="text-[11.5px] text-neutral-500">Complete every required field on every line, and acknowledge any expired-contract warnings, to enable submission.</div>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Atoms
// ============================================================================
function Row({ children }: { children: React.ReactNode }) { return <div className="grid grid-cols-12 gap-3">{children}</div>; }
function Field({ label, required, span, children }: { label: string; required?: boolean; span: 3 | 4 | 5 | 6 | 12; children: React.ReactNode }) {
  const map: Record<number, string> = { 3: 'col-span-12 md:col-span-3', 4: 'col-span-12 md:col-span-4', 5: 'col-span-12 md:col-span-5', 6: 'col-span-12 md:col-span-6', 12: 'col-span-12' };
  return (
    <label className={cn('block', map[span])}>
      <span className="block text-[10px] font-sans uppercase tracking-[0.18em] text-neutral-500 mb-1.5">
        {label}{required && <span className="text-doe-red ml-0.5">*</span>}
      </span>
      {children}
    </label>
  );
}
function Input({ value, onChange, placeholder, type = 'text', mono, suffix }: { value: string; onChange: (v: string) => void; placeholder?: string; type?: string; mono?: boolean; suffix?: string }) {
  return (
    <div className="relative">
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
        className={cn('w-full px-3 py-2 text-[13px] bg-white border border-neutral-200 rounded-md placeholder-neutral-400 focus:outline-none focus:border-action-orange focus:ring-2 focus:ring-action-orange/20 transition',
          mono && 'font-mono', suffix && 'pr-32')} />
      {suffix && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10.5px] font-mono text-neutral-500 pointer-events-none">{suffix}</span>}
    </div>
  );
}
function Select({ value, onChange, options, placeholder, disabled }: { value: string; onChange: (v: string) => void; options: { value: string; label: string }[]; placeholder?: string; disabled?: boolean }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} disabled={disabled}
      className={cn('w-full px-3 py-2 text-[13px] bg-white border border-neutral-200 rounded-md focus:outline-none focus:border-action-orange focus:ring-2 focus:ring-action-orange/20 transition truncate',
        disabled && 'opacity-50 cursor-not-allowed')}>
      <option value="" disabled>{placeholder ?? 'Select…'}</option>
      {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
}
function SmallRadioPair({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: string[] }) {
  return (
    <div className="flex items-center gap-3 px-1">
      {options.map((o) => (
        <label key={o} className="inline-flex items-center gap-1.5 cursor-pointer select-none">
          <span className={cn('w-3.5 h-3.5 rounded-full border-2 grid place-items-center transition',
            value === o ? 'border-action-orange' : 'border-neutral-300')}>
            {value === o && <span className="w-1.5 h-1.5 rounded-full bg-action-orange" />}
          </span>
          <input type="radio" name={`opt-${o}`} className="sr-only" checked={value === o} onChange={() => onChange(o)} />
          <span className={cn('text-[12px] text-ink-950', value === o && 'font-semibold')}>{o}</span>
        </label>
      ))}
    </div>
  );
}
function UnitRadio({ value, onChange }: { value: Unit | ''; onChange: (u: Unit) => void }) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {(['L', 'SCM'] as Unit[]).map((u) => {
        const selected = value === u;
        return (
          <label key={u}
            className={cn('cursor-pointer rounded-md border px-2 py-1.5 transition select-none flex items-center gap-1.5',
              selected ? 'border-action-orange bg-action-orange-soft' : 'border-neutral-200 hover:border-neutral-300 bg-white')}>
            <input type="radio" name="row-unit" value={u} checked={selected} onChange={() => onChange(u)} className="sr-only" />
            <span className={cn('w-3 h-3 rounded-full border-2 grid place-items-center',
              selected ? 'border-action-orange' : 'border-neutral-300')}>
              {selected && <span className="w-1 h-1 rounded-full bg-action-orange" />}
            </span>
            <span className={cn('text-[11.5px]', selected ? 'font-semibold text-ink-950' : 'text-neutral-700')}>
              {u === 'L' ? 'Litres' : 'SCM'}
            </span>
          </label>
        );
      })}
    </div>
  );
}
function FileInput({ value, onChange, onClear }: { value?: string; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void; onClear: () => void }) {
  if (value) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 border border-neutral-200 rounded-md bg-white">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="text-neutral-500">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" />
        </svg>
        <span className="text-[12px] text-ink-950 truncate flex-1 font-mono">{value}</span>
        <button type="button" onClick={onClear} className="text-[10.5px] text-neutral-500 hover:text-doe-red">Clear</button>
      </div>
    );
  }
  return (
    <label className="cursor-pointer block">
      <input type="file" className="sr-only" onChange={onChange} accept=".pdf,.png,.jpg,.jpeg,.docx,.xlsx" />
      <div className="px-3 py-2 border border-dashed border-neutral-300 rounded-md bg-neutral-25 text-[12px] text-neutral-500 hover:border-action-orange hover:text-action-orange-dark transition flex items-center gap-2">
        <span>📎</span><span>Attach delivery note (optional)</span>
      </div>
    </label>
  );
}
function TrashIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
      <path d="M10 11v6M14 11v6" />
      <path d="M9 6V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2" />
    </svg>
  );
}
