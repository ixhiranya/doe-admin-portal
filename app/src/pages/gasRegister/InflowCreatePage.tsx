// =============================================================================
// BN 9 — Gas Supply · Monthly Inflow Submission (SDD §3.9 / §3.9.1)
// -----------------------------------------------------------------------------
// Per SDD requirements, the Submit Daily Inflow form must capture:
//   • Date
//   • Product Source (Supplier)
//   • Unit of Measurement (radio: Litres / SCM) — Volume label & equivalent
//     derive from the chosen unit
//   • Volume Purchased (in chosen unit) + automatic equivalent in the other
//   • Type of Gas
//   • Product Type (includes "CNG decanting point")
//   • Gas Storage (Asset)
//   • Supporting Document (optional)
//   • Over-capacity validation against the storage asset's declared capacity
// =============================================================================
import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  listSuppliers, listAssets, GAS_TYPES, formatLiters,
} from '../../services/gasRegister/gasFlow';
import {
  PRODUCT_TYPES, convertVolume, formatVolumeDual, type Unit, type GasTypeId,
} from '../../services/gasRegister/technical';
import { cn } from '../../lib/utils';

type Draft = {
  date: string;
  supplierId: string;
  unit: Unit | '';
  volume: string;                  // value in the chosen unit
  gasType: string;                 // legacy free-string gas type from assets.GAS_TYPES
  productTypeId: string;           // from technical.PRODUCT_TYPES
  assetId: string;
  supportingDoc?: { fileName: string; sizeKb: number };
};

const EMPTY: Draft = {
  date: '', supplierId: '', unit: '', volume: '', gasType: '',
  productTypeId: '', assetId: '', supportingDoc: undefined,
};

// Map the legacy free-string gas labels (from assets.GAS_TYPES) to the typed
// GasTypeId used by the Technical Master conversion factor. Falls back to LPG
// if no match is found.
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

export function InflowCreatePage() {
  const navigate = useNavigate();
  const [draft, setDraft] = useState<Draft>(EMPTY);

  const suppliers = useMemo(() => listSuppliers(), []);
  const assets    = useMemo(() => listAssets(), []);

  const selectedSupplier = suppliers.find((s) => s.id === draft.supplierId);
  const scopedAssets = selectedSupplier
    ? assets.filter((a) => a.permitHolderId === selectedSupplier.permitHolderId)
    : assets;
  const scopedGasTypes = (selectedSupplier?.gasTypes && selectedSupplier.gasTypes.length > 0)
    ? selectedSupplier.gasTypes
    : [...GAS_TYPES];

  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setDraft((d) => ({ ...d, [k]: v }));

  // ------------------- derived figures for live feedback ----------------------
  const selectedAsset = assets.find((a) => a.id === draft.assetId);
  const numericVolume = parseFloat(draft.volume) || 0;
  const gasTypeId = draft.gasType ? legacyGasToId(draft.gasType) : 'lpg';
  // Volume in litres (regardless of which unit the user entered) so we can
  // compare it against the asset's declared capacity, which is in litres.
  const volumeInLiters = draft.unit === 'SCM'
    ? convertVolume(numericVolume, 'SCM', 'L', gasTypeId)
    : numericVolume;
  const dualDisplay = draft.unit && numericVolume > 0
    ? formatVolumeDual(numericVolume, draft.unit, gasTypeId)
    : '';

  // SDD §3.9.1 — "the cumulative Inflow for the month, by Gas Type, shall be
  // reconciled against the storage capacity declared in Assets Master Data;
  // over-capacity submissions shall be flagged."
  const capacityLiters = selectedAsset?.totalCapacityLiters ?? 0;
  const overCapacity = capacityLiters > 0 && volumeInLiters > capacityLiters;
  const utilisationPct = capacityLiters > 0 ? (volumeInLiters / capacityLiters) * 100 : 0;

  const valid =
    !!draft.date &&
    !!draft.supplierId &&
    !!draft.unit &&
    !!draft.volume && numericVolume > 0 &&
    !!draft.gasType &&
    !!draft.productTypeId &&
    !!draft.assetId &&
    !overCapacity;

  const submit = () => navigate('/gas-register/inflow?created=1');

  // Fake "file upload" — in the prototype we just capture the file name.
  const onPickFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) set('supportingDoc', { fileName: file.name, sizeKb: Math.round(file.size / 1024) });
  };

  return (
    <div className="min-h-screen bg-neutral-25">
      <div className="border-b border-neutral-100 bg-white">
        <div className="max-w-[1100px] mx-auto px-6 py-3 flex items-center justify-between text-[12px]">
          <nav className="text-neutral-500">
            <Link to="/pps-dashboard" className="hover:text-doe-red">Home</Link>
            <span className="mx-2 text-neutral-300">›</span>
            <span>Gas Register</span>
            <span className="mx-2 text-neutral-300">›</span>
            <Link to="/gas-register/inflow" className="hover:text-doe-red">Daily Inflow</Link>
            <span className="mx-2 text-neutral-300">›</span>
            <span className="text-ink-950 font-semibold">Submit inflow</span>
          </nav>
          <button type="button" onClick={() => navigate('/gas-register/inflow')} className="text-[11px] text-neutral-500 hover:text-doe-red flex items-center gap-1">
            <span>‹</span> Back to inflow
          </button>
        </div>
      </div>

      <div className="max-w-[1100px] mx-auto px-6 py-8">
        <div className="mb-6 flex items-start justify-between gap-6 flex-wrap">
          <div>
            <h1 className="font-display font-extrabold text-[28px] text-ink-950 leading-tight">Submit daily inflow</h1>
            <p className="text-[12.5px] text-neutral-500 mt-1.5">Record a volume of gas received from a registered supplier into one of your storage assets. Per SDD §3.9, capture both the unit and the converted equivalent.</p>
          </div>
          <button
            type="button"
            onClick={submit}
            disabled={!valid}
            className={cn('px-4 py-2 rounded-md text-[12.5px] font-semibold shadow-doe-sm transition',
              valid ? 'bg-action-orange text-white hover:bg-action-orange-dark' : 'bg-neutral-200 text-neutral-500 cursor-not-allowed')}
          >Submit</button>
        </div>

        <div className="card overflow-hidden">
          <div className="px-6 py-6 space-y-5">
            {/* ─────────── Submission identity ─────────── */}
            <Group title="Submission">
              <Row>
                <Field label="Date" required span={3}>
                  <Input value={draft.date} onChange={(v) => set('date', v)} type="date" />
                </Field>
                <Field label="Product source (supplier)" required span={5}>
                  <Select value={draft.supplierId} onChange={(v) => { set('supplierId', v); set('gasType', ''); set('assetId', ''); }}
                    options={suppliers.map((s) => ({ value: s.id, label: `${s.name} · ${s.tradeLicenceNumber}` }))}
                    placeholder="Select supplier…" />
                </Field>
                <Field label="Type of gas" required span={4}>
                  <Select value={draft.gasType} onChange={(v) => set('gasType', v)}
                    options={scopedGasTypes.map((g) => ({ value: g, label: g }))}
                    placeholder={selectedSupplier ? 'Select gas type…' : 'Select supplier first…'}
                    disabled={!selectedSupplier} />
                </Field>
              </Row>
            </Group>

            {/* ─────────── BN 9: UoM radio + conditional volume ─────────── */}
            <Group title="Quantity">
              <Row>
                <Field label="Unit of measurement" required span={4}>
                  <UnitRadio value={draft.unit} onChange={(u) => set('unit', u)} />
                </Field>
                <Field
                  label={draft.unit === 'SCM' ? 'Volume purchased (in SCM)' : draft.unit === 'L' ? 'Volume purchased (in litres)' : 'Volume purchased'}
                  required span={4}>
                  {draft.unit ? (
                    <Input
                      value={draft.volume}
                      onChange={(v) => set('volume', v.replace(/[^0-9.]/g, ''))}
                      placeholder={draft.unit === 'SCM' ? '0.00' : '0'}
                      mono
                      suffix={dualDisplay ? `≈ ${dualDisplay}` : ''}
                    />
                  ) : (
                    <div className="px-3 py-2 text-[12px] text-neutral-400 bg-neutral-25 border border-dashed border-neutral-200 rounded-md">
                      Pick a unit first
                    </div>
                  )}
                </Field>
                <Field label="Product type" required span={4}>
                  <Select value={draft.productTypeId} onChange={(v) => set('productTypeId', v)}
                    options={PRODUCT_TYPES.map((p) => ({ value: p.id, label: p.label }))}
                    placeholder="Select product type…" />
                </Field>
              </Row>
            </Group>

            {/* ─────────── Storage + capacity validation ─────────── */}
            <Group title="Storage destination">
              <Row>
                <Field label="Gas storage (asset)" required span={6}>
                  <Select value={draft.assetId} onChange={(v) => set('assetId', v)}
                    options={scopedAssets.map((a) => ({ value: a.id, label: `${a.id} · ${a.facilityName}` }))}
                    placeholder={selectedSupplier ? 'Select gas storage…' : 'Select supplier first…'}
                    disabled={!selectedSupplier} />
                </Field>
                <Field label="Supporting document" span={6}>
                  <FileInput value={draft.supportingDoc?.fileName} onChange={onPickFile} onClear={() => set('supportingDoc', undefined)} />
                </Field>
              </Row>

              {selectedAsset && draft.unit && numericVolume > 0 && (
                <CapacityMeter
                  assetName={selectedAsset.facilityName}
                  capacityLiters={capacityLiters}
                  currentLiters={volumeInLiters}
                  utilisationPct={utilisationPct}
                  overCapacity={overCapacity}
                />
              )}
            </Group>

            {selectedSupplier && (
              <div className="text-[11.5px] text-neutral-500 bg-neutral-25 border border-neutral-100 rounded-md px-3 py-2">
                Gas storage and gas type dropdowns are scoped to the selected supplier's permit holder ({selectedSupplier.permitHolderName}).
              </div>
            )}
          </div>
          <div className="px-6 py-3 border-t border-neutral-100 flex items-center justify-end bg-neutral-25/60">
            <button type="button" onClick={submit} disabled={!valid}
              className={cn('px-4 py-2 rounded-md text-[12.5px] font-semibold shadow-doe-sm transition',
                valid ? 'bg-success-500 text-white hover:opacity-90' : 'bg-neutral-200 text-neutral-500 cursor-not-allowed')}>
              Submit inflow
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ===========================================================================
// Helpers / atoms
// ===========================================================================

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <fieldset>
      <legend className="text-[10px] font-sans uppercase tracking-[0.18em] text-neutral-500 mb-2.5">{title}</legend>
      <div className="space-y-3">{children}</div>
    </fieldset>
  );
}
function Row({ children }: { children: React.ReactNode }) { return <div className="grid grid-cols-12 gap-4">{children}</div>; }
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
      className={cn('w-full px-3 py-2 text-[13px] bg-white border border-neutral-200 rounded-md focus:outline-none focus:border-action-orange focus:ring-2 focus:ring-action-orange/20 transition',
        disabled && 'opacity-50 cursor-not-allowed')}>
      <option value="" disabled>{placeholder ?? 'Select…'}</option>
      {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
}

// SDD §3.9.1 — Unit of Measurement radio (Litres / SCM)
function UnitRadio({ value, onChange }: { value: Unit | ''; onChange: (u: Unit) => void }) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {(['L', 'SCM'] as Unit[]).map((u) => {
        const selected = value === u;
        return (
          <label key={u}
            className={cn('cursor-pointer rounded-md border px-3 py-2 transition select-none flex items-center gap-2',
              selected ? 'border-action-orange bg-action-orange-soft' : 'border-neutral-200 hover:border-neutral-300 bg-white')}>
            <input type="radio" name="unit" value={u} checked={selected} onChange={() => onChange(u)} className="sr-only" />
            <span className={cn('w-3.5 h-3.5 rounded-full border-2 grid place-items-center',
              selected ? 'border-action-orange' : 'border-neutral-300')}>
              {selected && <span className="w-1.5 h-1.5 rounded-full bg-action-orange" />}
            </span>
            <span className={cn('text-[12.5px]', selected ? 'font-semibold text-ink-950' : 'text-neutral-700')}>
              {u === 'L' ? 'Litres (L)' : 'Standard Cubic Metre (SCM)'}
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
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="text-neutral-500">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" />
        </svg>
        <span className="text-[12.5px] text-ink-950 truncate flex-1 font-mono">{value}</span>
        <button type="button" onClick={onClear} className="text-[11px] text-neutral-500 hover:text-doe-red">Clear</button>
      </div>
    );
  }
  return (
    <label className="cursor-pointer block">
      <input type="file" className="sr-only" onChange={onChange} accept=".pdf,.png,.jpg,.jpeg,.docx,.xlsx" />
      <div className="px-3 py-2 border border-dashed border-neutral-300 rounded-md bg-neutral-25 text-[12px] text-neutral-500 hover:border-action-orange hover:text-action-orange-dark transition flex items-center gap-2">
        <span>📎</span><span>Attach supplier invoice / supporting doc (optional)</span>
      </div>
    </label>
  );
}

// Live capacity validation per SDD §3.9.1.
function CapacityMeter({ assetName, capacityLiters, currentLiters, utilisationPct, overCapacity }: {
  assetName: string; capacityLiters: number; currentLiters: number; utilisationPct: number; overCapacity: boolean;
}) {
  const bandColor = overCapacity ? 'bg-doe-red' : utilisationPct >= 80 ? 'bg-amber-500' : 'bg-emerald-500';
  return (
    <div className={cn(
      'mt-1 rounded-md border px-3 py-3',
      overCapacity ? 'border-doe-red bg-rose-50' : 'border-neutral-100 bg-neutral-25',
    )}>
      <div className="flex items-center justify-between gap-3 text-[11.5px]">
        <div>
          <div className="font-sans uppercase tracking-[0.16em] text-[9.5px] text-neutral-500">Asset utilisation after submission</div>
          <div className="font-display font-semibold text-[13px] text-ink-950 mt-0.5">{assetName}</div>
        </div>
        <div className="text-right">
          <div className="font-mono text-[12px] text-ink-950">{formatLiters(currentLiters)} / {formatLiters(capacityLiters)}</div>
          <div className={cn('font-mono text-[11px]', overCapacity ? 'text-doe-red font-semibold' : 'text-neutral-500')}>{utilisationPct.toFixed(1)}%</div>
        </div>
      </div>
      <div className="mt-2 h-1.5 w-full bg-white rounded-full overflow-hidden border border-neutral-100">
        <div className={cn('h-full transition-all', bandColor)} style={{ width: `${Math.min(100, utilisationPct).toFixed(1)}%` }} />
      </div>
      {overCapacity && (
        <div className="mt-2 text-[11.5px] text-doe-red font-semibold flex items-start gap-1.5">
          <span>⚠️</span>
          <span>Volume exceeds the declared storage capacity of this asset. Reduce the quantity or pick a higher-capacity asset before submission.</span>
        </div>
      )}
    </div>
  );
}
