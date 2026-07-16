import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  GAS_TYPES, PERMIT_HOLDERS, STORAGE_TYPES, INSPECTION_AUTHORITIES,
  type Ownership, type OperatedBy, type StorageType, formatLiters,
} from '../../services/gasRegister/assets';
import { cn } from '../../lib/utils';

// =============================================================================
// Asset Master · Create
// -----------------------------------------------------------------------------
// Four-step wizard, kept because the data falls into four obvious chunks:
//   1. Facility · 2. Owner · 3. Operator · 4. Storage methods
// • Stepper is light and always visible — done steps are clickable.
// • Next/Submit stays disabled until the current step validates.
// • Step 3 (Operator) is tinted differently from Step 2 (Owner) so the two
//   stakeholder screens don't blur together.
// • Submission is a mock — we navigate back to the list with a query flag.
// =============================================================================

type Draft = {
  // step 1
  permitHolderId: string;
  facilityName: string;
  totalCapacityLiters: string;
  gasTypes: string[];
  detailedAddress: string;
  city: 'Abu Dhabi' | 'Al Ain' | 'Al Dhafra' | '';
  area: string;
  lat: string;
  lng: string;
  safetyMeasures: string;
  inspectionAuthority: string;
  dateOfInspection: string;
  // step 2
  ownership: Ownership | '';
  ownerName: string;
  ownerEid: string;
  ownerEmail: string;
  ownerMobile: string;
  // step 3
  operatedBy: OperatedBy | '';
  operatorName: string;
  operatorEid: string;
  operatorEmail: string;
  operatorMobile: string;
  // step 4
  storageMethods: {
    name: string;
    areaSqM: string;
    capacityLiters: string;
    type: StorageType | '';
    productsStored: string[];
  }[];
};

const EMPTY: Draft = {
  permitHolderId: '', facilityName: '', totalCapacityLiters: '', gasTypes: [],
  detailedAddress: '', city: '', area: '', lat: '', lng: '',
  safetyMeasures: '', inspectionAuthority: '', dateOfInspection: '',
  ownership: '', ownerName: '', ownerEid: '', ownerEmail: '', ownerMobile: '',
  operatedBy: '', operatorName: '', operatorEid: '', operatorEmail: '', operatorMobile: '',
  storageMethods: [{ name: '', areaSqM: '', capacityLiters: '', type: '', productsStored: [] }],
};

const STEPS: { id: 1 | 2 | 3 | 4; label: string; hint: string }[] = [
  { id: 1, label: 'Facility',         hint: 'Name, address & gas types' },
  { id: 2, label: 'Owner',            hint: 'Who holds the title' },
  { id: 3, label: 'Operator',         hint: 'Who runs it day-to-day' },
  { id: 4, label: 'Storage methods',  hint: 'Tanks, cylinders & products' },
];

export function AssetCreatePage() {
  const navigate = useNavigate();
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [maxReached, setMaxReached] = useState<1 | 2 | 3 | 4>(1);

  const stepValid = useMemo(() => ({
    1: validateStep1(draft),
    2: validateStep2(draft),
    3: validateStep3(draft),
    4: validateStep4(draft),
  }), [draft]);

  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setDraft((d) => ({ ...d, [k]: v }));

  const goTo = (target: 1 | 2 | 3 | 4) => { if (target <= maxReached) setStep(target); };
  const next = () => {
    if (!stepValid[step]) return;
    const n = (step + 1) as 1 | 2 | 3 | 4;
    setStep(n);
    if (n > maxReached) setMaxReached(n);
  };
  const prev = () => { if (step > 1) setStep((step - 1) as 1 | 2 | 3 | 4); };
  const submit = () => navigate('/gas-register/assets?created=' + encodeURIComponent(draft.facilityName));

  return (
    <div className="min-h-screen bg-neutral-25">
      {/* Breadcrumb bar */}
      <div className="border-b border-neutral-100 bg-white">
        <div className="max-w-[1100px] mx-auto px-6 py-3 flex items-center justify-between text-[12px]">
          <nav className="text-neutral-500">
            <Link to="/pps-dashboard" className="hover:text-doe-red">Home</Link>
            <span className="mx-2 text-neutral-300">›</span>
            <span>Gas Register</span>
            <span className="mx-2 text-neutral-300">›</span>
            <Link to="/gas-register/assets" className="hover:text-doe-red">Asset Master</Link>
            <span className="mx-2 text-neutral-300">›</span>
            <span className="text-ink-950 font-semibold">New asset</span>
          </nav>
          <button type="button" onClick={() => navigate('/gas-register/assets')} className="text-[11px] text-neutral-500 hover:text-doe-red flex items-center gap-1">
            <span>‹</span> Back to register
          </button>
        </div>
      </div>

      <div className="max-w-[1100px] mx-auto px-6 py-8">
        {/* Title */}
        <div className="mb-6">
          <h1 className="font-display font-extrabold text-[28px] text-ink-950 leading-tight">Register a new storage facility</h1>
          <p className="text-[12.5px] text-neutral-500 mt-1.5">Capture the facility, its owner & operator, and the storage methods on site. You can revisit any step before submitting.</p>
        </div>

        {/* Stepper — light, segmented */}
        <Stepper step={step} maxReached={maxReached} stepValid={stepValid} onGoTo={goTo} />

        {/* Form card */}
        <div className="card mt-4 overflow-hidden">
          <div className="px-6 py-6">
            {step === 1 && <Step1 draft={draft} set={set} />}
            {step === 2 && <Step2 draft={draft} set={set} />}
            {step === 3 && <Step3 draft={draft} set={set} />}
            {step === 4 && <Step4 draft={draft} setDraft={setDraft} />}
          </div>
          <div className="px-6 py-3 border-t border-neutral-100 flex items-center justify-between bg-neutral-25/60">
            <button
              type="button"
              onClick={prev}
              disabled={step === 1}
              className="px-4 py-2 rounded-md text-[12.5px] font-semibold text-neutral-700 hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed"
            >← Previous</button>

            <Progress draft={draft} />

            {step < 4 ? (
              <button
                type="button"
                onClick={next}
                disabled={!stepValid[step]}
                title={stepValid[step] ? '' : 'Complete all required fields to continue'}
                className={cn(
                  'px-4 py-2 rounded-md text-[12.5px] font-semibold shadow-doe-sm transition',
                  stepValid[step] ? 'bg-action-orange text-white hover:bg-action-orange-dark' : 'bg-neutral-200 text-neutral-500 cursor-not-allowed',
                )}
              >Next →</button>
            ) : (
              <button
                type="button"
                onClick={submit}
                disabled={!stepValid[4]}
                className={cn(
                  'px-4 py-2 rounded-md text-[12.5px] font-semibold shadow-doe-sm transition',
                  stepValid[4] ? 'bg-success-500 text-white hover:opacity-90' : 'bg-neutral-200 text-neutral-500 cursor-not-allowed',
                )}
              >Submit asset</button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// Stepper — light, segmented, with connector progress bar
// ============================================================
function Stepper({ step, maxReached, stepValid, onGoTo }: {
  step: 1 | 2 | 3 | 4; maxReached: 1 | 2 | 3 | 4;
  stepValid: Record<1 | 2 | 3 | 4, boolean>;
  onGoTo: (s: 1 | 2 | 3 | 4) => void;
}) {
  const progressPct = ((step - 1) / (STEPS.length - 1)) * 100;
  return (
    <div className="card p-4">
      {/* Progress track */}
      <div className="relative h-[2px] bg-neutral-100 rounded-full mx-5 mb-3">
        <div className="absolute inset-y-0 left-0 bg-action-orange rounded-full transition-all" style={{ width: `${progressPct}%` }} />
      </div>
      <ol className="grid grid-cols-4 gap-2">
        {STEPS.map((s) => {
          const active = step === s.id;
          const reached = s.id <= maxReached;
          const done = reached && stepValid[s.id] && s.id < step;
          return (
            <li key={s.id}>
              <button
                type="button"
                onClick={() => onGoTo(s.id)}
                disabled={!reached}
                className={cn(
                  'w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition group',
                  reached ? 'cursor-pointer hover:bg-neutral-25' : 'cursor-not-allowed',
                )}
              >
                <span className={cn(
                  'w-7 h-7 rounded-full grid place-items-center shrink-0 text-[11px] font-bold transition',
                  done   ? 'bg-success-500 text-white' :
                  active ? 'bg-action-orange text-white ring-4 ring-action-orange/20' :
                  reached ? 'bg-white text-ink-950 ring-1 ring-neutral-200' :
                            'bg-neutral-100 text-neutral-400 ring-1 ring-neutral-200',
                )}>
                  {done ? <CheckIcon /> : s.id}
                </span>
                <div className="min-w-0">
                  <div className={cn('text-[12.5px] font-bold leading-tight',
                    active ? 'text-ink-950' : reached ? 'text-ink-950' : 'text-neutral-400')}>{s.label}</div>
                  <div className={cn('text-[10.5px] mt-0.5 leading-tight',
                    active ? 'text-action-orange-deep' : 'text-neutral-500')}>{s.hint}</div>
                </div>
              </button>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

function Progress({ draft }: { draft: Draft }) {
  const total = countRequired(draft);
  const done = countFilled(draft);
  const pct = Math.round((done / total) * 100);
  return (
    <div className="hidden md:flex items-center gap-2 text-[11px] text-neutral-500">
      <div className="w-28 h-1 rounded-full bg-neutral-200 overflow-hidden">
        <div className="h-full rounded-full bg-action-orange transition-all" style={{ width: `${pct}%` }} />
      </div>
      <span className="font-mono tabular-nums"><span className="font-bold text-ink-950">{pct}%</span> ready</span>
    </div>
  );
}

// ============================================================
// Step 1 — Facility
// ============================================================
function Step1({ draft, set }: { draft: Draft; set: <K extends keyof Draft>(k: K, v: Draft[K]) => void }) {
  return (
    <Form>
      <Group title="Facility identity">
        <Row>
          <Field label="Permit holder" required span={5}>
            <Select value={draft.permitHolderId} onChange={(v) => set('permitHolderId', v)} options={PERMIT_HOLDERS.map((p) => ({ value: p.id, label: p.name }))} placeholder="Select permit holder…" />
          </Field>
          <Field label="Facility name" required span={7}>
            <Input value={draft.facilityName} onChange={(v) => set('facilityName', v)} placeholder="e.g. Mussafah Bulk Storage Terminal" />
          </Field>
        </Row>
        <Row>
          <Field label="Type of gas" required span={8}>
            <Multiselect options={[...GAS_TYPES]} value={draft.gasTypes} onChange={(v) => set('gasTypes', v)} placeholder="Select one or more gas types" />
          </Field>
          <Field label="Total capacity (litres)" required span={4}>
            <Input value={draft.totalCapacityLiters} onChange={(v) => set('totalCapacityLiters', v.replace(/[^0-9]/g, ''))} placeholder="0" mono suffix={draft.totalCapacityLiters ? formatLiters(parseInt(draft.totalCapacityLiters, 10)) : ''} />
          </Field>
        </Row>
      </Group>

      <Group title="Location">
        <Row>
          <Field label="Detailed address" required span={8}>
            <Input value={draft.detailedAddress} onChange={(v) => set('detailedAddress', v)} placeholder="Plot, block, sector, city" />
          </Field>
          <Field label="City" required span={4}>
            <Select value={draft.city} onChange={(v) => set('city', v as Draft['city'])} options={[{ value: 'Abu Dhabi', label: 'Abu Dhabi' }, { value: 'Al Ain', label: 'Al Ain' }, { value: 'Al Dhafra', label: 'Al Dhafra' }]} placeholder="Select city…" />
          </Field>
        </Row>
        <Row>
          <Field label="Area / sub-region" span={4}>
            <Input value={draft.area} onChange={(v) => set('area', v)} placeholder="e.g. Mussafah, Al Falah" />
          </Field>
          <Field label="Latitude" required span={4}>
            <Input value={draft.lat} onChange={(v) => set('lat', v.replace(/[^0-9.\-]/g, ''))} placeholder="24.123456" mono />
          </Field>
          <Field label="Longitude" required span={4}>
            <Input value={draft.lng} onChange={(v) => set('lng', v.replace(/[^0-9.\-]/g, ''))} placeholder="54.123456" mono />
          </Field>
        </Row>
      </Group>

      <Group title="Inspection & safety">
        <Row>
          <Field label="Inspection authority" required span={7}>
            <Select value={draft.inspectionAuthority} onChange={(v) => set('inspectionAuthority', v)} options={INSPECTION_AUTHORITIES.map((i) => ({ value: i, label: i }))} placeholder="Select inspection authority…" />
          </Field>
          <Field label="Date of inspection" required span={5}>
            <Input value={draft.dateOfInspection} onChange={(v) => set('dateOfInspection', v)} type="date" />
          </Field>
        </Row>
        <Row>
          <Field label="Safety measures" required span={12}>
            <Textarea value={draft.safetyMeasures} onChange={(v) => set('safetyMeasures', v)} placeholder="Describe the fire suppression, gas detection, ESD systems, perimeter protection, etc." />
          </Field>
        </Row>
      </Group>
    </Form>
  );
}

// ============================================================
// Steps 2 & 3 — Owner / Operator (visually themed)
// ============================================================
function Step2({ draft, set }: { draft: Draft; set: <K extends keyof Draft>(k: K, v: Draft[K]) => void }) {
  return (
    <StakeholderStep
      role="owner"
      title="Owner details"
      intro="Who holds the title to this facility?"
      controlLabel="Ownership"
      controlValue={draft.ownership}
      onControlChange={(v) => set('ownership', v as Ownership)}
      controlOptions={[
        { value: 'owned',  label: 'Owned by permit holder' },
        { value: 'rented', label: 'Rented from third party' },
      ]}
      name={draft.ownerName}     onName={(v) => set('ownerName', v)}
      eid={draft.ownerEid}       onEid={(v) => set('ownerEid', formatEid(v))}
      mobile={draft.ownerMobile} onMobile={(v) => set('ownerMobile', v)}
      email={draft.ownerEmail}   onEmail={(v) => set('ownerEmail', v)}
    />
  );
}

function Step3({ draft, set }: { draft: Draft; set: <K extends keyof Draft>(k: K, v: Draft[K]) => void }) {
  return (
    <StakeholderStep
      role="operator"
      title="Operator details"
      intro="Who runs the day-to-day operations at the facility?"
      controlLabel="Operated by"
      controlValue={draft.operatedBy}
      onControlChange={(v) => set('operatedBy', v as OperatedBy)}
      controlOptions={[
        { value: 'self',   label: 'Permit holder operates it' },
        { value: 'others', label: 'A contracted third party' },
      ]}
      name={draft.operatorName}     onName={(v) => set('operatorName', v)}
      eid={draft.operatorEid}       onEid={(v) => set('operatorEid', formatEid(v))}
      mobile={draft.operatorMobile} onMobile={(v) => set('operatorMobile', v)}
      email={draft.operatorEmail}   onEmail={(v) => set('operatorEmail', v)}
    />
  );
}

function StakeholderStep({
  role, title, intro, controlLabel, controlValue, onControlChange, controlOptions,
  name, onName, eid, onEid, mobile, onMobile, email, onEmail,
}: {
  role: 'owner' | 'operator';
  title: string; intro: string;
  controlLabel: string; controlValue: string; onControlChange: (v: string) => void;
  controlOptions: { value: string; label: string }[];
  name: string; onName: (v: string) => void;
  eid: string; onEid: (v: string) => void;
  mobile: string; onMobile: (v: string) => void;
  email: string; onEmail: (v: string) => void;
}) {
  const theme = role === 'owner'
    ? { bar: 'bg-info-500',          chipText: 'text-info-500',          chipBg: 'bg-info-soft',          icon: <OwnerIcon /> }
    : { bar: 'bg-action-orange',     chipText: 'text-action-orange-deep', chipBg: 'bg-action-orange-soft', icon: <OperatorIcon /> };
  return (
    <Form>
      <div className="flex items-center gap-3 mb-5">
        <span className={cn('w-9 h-9 rounded-lg grid place-items-center', theme.chipBg, theme.chipText)}>{theme.icon}</span>
        <div>
          <h2 className="font-display font-bold text-[16px] text-ink-950">{title}</h2>
          <p className="text-[11.5px] text-neutral-500 mt-0.5">{intro}</p>
        </div>
      </div>

      <Group title={controlLabel}>
        <SegmentedControl value={controlValue} onChange={onControlChange} options={controlOptions} />
      </Group>

      <Group title="Person details">
        <Row>
          <Field label="Full name" required span={6}>
            <Input value={name} onChange={onName} placeholder="Full legal name" />
          </Field>
          <Field label="Emirates ID" required span={6}>
            <Input value={eid} onChange={onEid} placeholder="784-XXXX-XXXXXXX-X" mono />
          </Field>
        </Row>
        <Row>
          <Field label="Email" required span={7}>
            <Input value={email} onChange={onEmail} placeholder="name@company.ae" type="email" />
          </Field>
          <Field label="Mobile number" required span={5}>
            <Input value={mobile} onChange={onMobile} placeholder="+971 50 000 0000" mono />
          </Field>
        </Row>
      </Group>
    </Form>
  );
}

// ============================================================
// Step 4 — Storage methods
// ============================================================
function Step4({ draft, setDraft }: { draft: Draft; setDraft: React.Dispatch<React.SetStateAction<Draft>> }) {
  const addRow = () => setDraft((d) => ({ ...d, storageMethods: [...d.storageMethods, { name: '', areaSqM: '', capacityLiters: '', type: '', productsStored: [] }] }));
  const removeRow = (idx: number) => setDraft((d) => ({ ...d, storageMethods: d.storageMethods.filter((_, i) => i !== idx) }));
  const updateRow = (idx: number, patch: Partial<Draft['storageMethods'][0]>) =>
    setDraft((d) => ({ ...d, storageMethods: d.storageMethods.map((m, i) => i === idx ? { ...m, ...patch } : m) }));
  const totalCap = draft.storageMethods.reduce((s, m) => s + (parseInt(m.capacityLiters, 10) || 0), 0);
  const declaredCap = parseInt(draft.totalCapacityLiters, 10) || 0;
  return (
    <Form>
      <div className="flex items-baseline justify-between mb-5">
        <div>
          <h2 className="font-display font-bold text-[16px] text-ink-950">Storage methods</h2>
          <p className="text-[11.5px] text-neutral-500 mt-0.5">Add one row per tank, cylinder bank, pipeline manifold, or drum store on site.</p>
        </div>
        <div className="text-right">
          <div className="text-[10px] font-sans uppercase tracking-[0.18em] text-neutral-500">Combined</div>
          <div className="font-display font-bold text-[16px] text-ink-950 tabular-nums">{formatLiters(totalCap)}</div>
          {declaredCap > 0 && totalCap !== declaredCap && (
            <div className="text-[10.5px] text-warning-500 mt-0.5">vs declared {formatLiters(declaredCap)}</div>
          )}
        </div>
      </div>

      <div className="space-y-3">
        {draft.storageMethods.map((m, idx) => (
          <div key={idx} className="border border-neutral-100 rounded-lg p-4 bg-white">
            <div className="flex items-center justify-between mb-3">
              <div className="text-[10.5px] font-sans uppercase tracking-[0.18em] text-neutral-500">Method {idx + 1}</div>
              {draft.storageMethods.length > 1 && (
                <button onClick={() => removeRow(idx)} className="text-[11px] font-semibold text-neutral-500 hover:text-doe-red">Remove</button>
              )}
            </div>
            <Row>
              <Field label="Name" required span={5}>
                <Input value={m.name} onChange={(v) => updateRow(idx, { name: v })} placeholder="e.g. Bulk Tank A" />
              </Field>
              <Field label="Type" required span={3}>
                <Select value={m.type} onChange={(v) => updateRow(idx, { type: v as StorageType })} options={STORAGE_TYPES.map((s) => ({ value: s.id, label: s.label }))} placeholder="Select…" />
              </Field>
              <Field label="Area (m²)" required span={2}>
                <Input value={m.areaSqM} onChange={(v) => updateRow(idx, { areaSqM: v.replace(/[^0-9]/g, '') })} placeholder="0" mono />
              </Field>
              <Field label="Capacity (litres)" required span={2}>
                <Input value={m.capacityLiters} onChange={(v) => updateRow(idx, { capacityLiters: v.replace(/[^0-9]/g, '') })} placeholder="0" mono />
              </Field>
            </Row>
            <Row>
              <Field label="Products to be stored" required span={12}>
                <Multiselect options={[...GAS_TYPES]} value={m.productsStored} onChange={(v) => updateRow(idx, { productsStored: v })} placeholder="Select gas types stored in this method" />
              </Field>
            </Row>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={addRow}
        className="mt-3 px-3 py-2 rounded-md text-[12px] font-semibold text-ink-950 border border-dashed border-neutral-300 hover:border-action-orange hover:text-action-orange-dark hover:bg-action-orange-soft/40 transition w-full"
      >
        + Add another storage method
      </button>
    </Form>
  );
}

// ============================================================
// Validation
// ============================================================
function validateStep1(d: Draft): boolean {
  return !!d.permitHolderId && !!d.facilityName.trim() && !!d.totalCapacityLiters && d.gasTypes.length > 0
    && !!d.detailedAddress.trim() && !!d.city && !!d.lat && !!d.lng
    && !!d.safetyMeasures.trim() && !!d.inspectionAuthority && !!d.dateOfInspection;
}
function validateStep2(d: Draft): boolean {
  return !!d.ownership && !!d.ownerName.trim() && /^784/.test(d.ownerEid) && d.ownerEid.length >= 15
    && /@/.test(d.ownerEmail) && !!d.ownerMobile.trim();
}
function validateStep3(d: Draft): boolean {
  return !!d.operatedBy && !!d.operatorName.trim() && /^784/.test(d.operatorEid) && d.operatorEid.length >= 15
    && /@/.test(d.operatorEmail) && !!d.operatorMobile.trim();
}
function validateStep4(d: Draft): boolean {
  if (d.storageMethods.length === 0) return false;
  return d.storageMethods.every((m) => m.name.trim() && m.type && m.areaSqM && m.capacityLiters && m.productsStored.length > 0);
}

function countRequired(d: Draft): number {
  return 11 + 5 + 5 + d.storageMethods.length * 5;
}
function countFilled(d: Draft): number {
  let n = 0;
  if (d.permitHolderId) n++;
  if (d.facilityName.trim()) n++;
  if (d.totalCapacityLiters) n++;
  if (d.gasTypes.length) n++;
  if (d.detailedAddress.trim()) n++;
  if (d.city) n++;
  if (d.lat) n++;
  if (d.lng) n++;
  if (d.safetyMeasures.trim()) n++;
  if (d.inspectionAuthority) n++;
  if (d.dateOfInspection) n++;
  if (d.ownership) n++;
  if (d.ownerName.trim()) n++;
  if (d.ownerEid) n++;
  if (d.ownerEmail) n++;
  if (d.ownerMobile.trim()) n++;
  if (d.operatedBy) n++;
  if (d.operatorName.trim()) n++;
  if (d.operatorEid) n++;
  if (d.operatorEmail) n++;
  if (d.operatorMobile.trim()) n++;
  for (const m of d.storageMethods) {
    if (m.name.trim()) n++;
    if (m.type) n++;
    if (m.areaSqM) n++;
    if (m.capacityLiters) n++;
    if (m.productsStored.length) n++;
  }
  return n;
}

function formatEid(v: string) {
  const d = v.replace(/[^0-9]/g, '').slice(0, 15);
  const a = d.slice(0, 3);
  const b = d.slice(3, 7);
  const c = d.slice(7, 14);
  const e = d.slice(14, 15);
  return [a, b, c, e].filter(Boolean).join('-');
}

// ============================================================
// Form primitives — 12-col grid with explicit `span` so layout
// is consistent across every step and field combination.
// ============================================================
function Form({ children }: { children: React.ReactNode }) {
  return <div className="space-y-6">{children}</div>;
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <fieldset>
      <legend className="text-[10px] font-sans uppercase tracking-[0.18em] text-neutral-500 mb-2.5">{title}</legend>
      <div className="space-y-3">{children}</div>
    </fieldset>
  );
}

function Row({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-12 gap-4">{children}</div>;
}

function Field({ label, required, span, children }: { label: string; required?: boolean; span: 2 | 3 | 4 | 5 | 6 | 7 | 8 | 12; children: React.ReactNode }) {
  const spanCls = {
    2: 'col-span-12 md:col-span-2',
    3: 'col-span-12 md:col-span-3',
    4: 'col-span-12 md:col-span-4',
    5: 'col-span-12 md:col-span-5',
    6: 'col-span-12 md:col-span-6',
    7: 'col-span-12 md:col-span-7',
    8: 'col-span-12 md:col-span-8',
    12: 'col-span-12',
  }[span];
  return (
    <label className={cn('block', spanCls)}>
      <span className="block text-[10px] font-sans uppercase tracking-[0.18em] text-neutral-500 mb-1.5">
        {label}{required && <span className="text-doe-red ml-0.5">*</span>}
      </span>
      {children}
    </label>
  );
}

function Input({ value, onChange, placeholder, type = 'text', mono, suffix }: {
  value: string; onChange: (v: string) => void; placeholder?: string; type?: string; mono?: boolean; suffix?: string;
}) {
  return (
    <div className="relative">
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={cn(
          'w-full px-3 py-2 text-[13px] bg-white border border-neutral-200 rounded-md placeholder-neutral-400 transition',
          'focus:outline-none focus:border-action-orange focus:ring-2 focus:ring-action-orange/20',
          mono && 'font-mono',
          suffix && 'pr-24',
        )}
      />
      {suffix && (
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10.5px] font-mono text-neutral-500 pointer-events-none">{suffix}</span>
      )}
    </div>
  );
}

function Textarea({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      rows={3}
      className="w-full px-3 py-2 text-[13px] bg-white border border-neutral-200 rounded-md placeholder-neutral-400 focus:outline-none focus:border-action-orange focus:ring-2 focus:ring-action-orange/20 transition"
    />
  );
}

function Select({ value, onChange, options, placeholder }: {
  value: string; onChange: (v: string) => void; options: { value: string; label: string }[]; placeholder?: string;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full px-3 py-2 text-[13px] bg-white border border-neutral-200 rounded-md focus:outline-none focus:border-action-orange focus:ring-2 focus:ring-action-orange/20 transition"
    >
      <option value="" disabled>{placeholder ?? 'Select…'}</option>
      {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
}

function SegmentedControl({ value, onChange, options }: {
  value: string; onChange: (v: string) => void; options: { value: string; label: string }[];
}) {
  return (
    <div className="inline-flex p-0.5 rounded-md bg-neutral-50 border border-neutral-100">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={cn(
            'h-9 px-4 rounded text-[12.5px] font-semibold transition',
            value === o.value ? 'bg-white shadow-doe-xs text-ink-950' : 'text-neutral-500 hover:text-ink-950',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function Multiselect({ value, onChange, options, placeholder }: {
  value: string[]; onChange: (v: string[]) => void; options: string[]; placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const toggle = (opt: string) => onChange(value.includes(opt) ? value.filter((v) => v !== opt) : [...value, opt]);
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          'w-full text-left px-3 py-2 text-[13px] bg-white border border-neutral-200 rounded-md min-h-[40px]',
          'focus:outline-none focus:border-action-orange focus:ring-2 focus:ring-action-orange/20 transition',
        )}
      >
        {value.length === 0 ? (
          <span className="text-neutral-400">{placeholder ?? 'Select…'}</span>
        ) : (
          <div className="flex flex-wrap gap-1">
            {value.map((v) => (
              <span key={v} className="inline-flex items-center gap-1 px-2 h-6 rounded-full bg-info-soft text-info-500 text-[11px] font-semibold ring-1 ring-info-500/20">
                {v}
                <span
                  role="button"
                  onClick={(e) => { e.stopPropagation(); toggle(v); }}
                  className="text-info-500/60 hover:text-doe-red"
                >×</span>
              </span>
            ))}
          </div>
        )}
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute z-20 mt-1 w-full bg-white border border-neutral-100 rounded-md shadow-doe-lg max-h-[280px] overflow-auto">
            {options.map((o) => (
              <button
                key={o}
                type="button"
                onClick={() => toggle(o)}
                className={cn(
                  'w-full text-left px-3 py-2 text-[12.5px] hover:bg-neutral-25 flex items-center gap-2',
                  value.includes(o) && 'bg-neutral-25',
                )}
              >
                <span className={cn(
                  'w-4 h-4 rounded border flex-shrink-0 grid place-items-center',
                  value.includes(o) ? 'bg-info-500 border-info-500' : 'border-neutral-300',
                )}>
                  {value.includes(o) && <CheckIcon className="text-white" />}
                </span>
                {o}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ============================================================
// Icons
// ============================================================
function CheckIcon({ className }: { className?: string }) {
  return <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" className={className}><polyline points="20 6 9 17 4 12"/></svg>;
}

function OwnerIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="8" cy="15" r="4" />
      <path d="M10.85 12.15 19 4" />
      <path d="m18 5 2 2" />
      <path d="m15 8 2 2" />
    </svg>
  );
}

function OperatorIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
    </svg>
  );
}
