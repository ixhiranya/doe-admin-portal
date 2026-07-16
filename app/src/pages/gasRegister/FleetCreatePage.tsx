import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { PERMIT_HOLDERS, VEHICLE_TYPES, UNIT_TYPES, formatLiters } from '../../services/gasRegister/fleet';
import { cn } from '../../lib/utils';

type Draft = {
  permitHolderId: string;
  plateNumber: string;
  trafficId: string;
  typeOfVehicle: string;
  unitType: string;
  vehicleDesignationCapacityLiters: string;
  civilDefenceCertificateNumber: string;
  dateOfInspection: string;
  cdcFileName: string;
  inspectionFileName: string;
};

const EMPTY: Draft = {
  permitHolderId: '', plateNumber: '', trafficId: '', typeOfVehicle: '', unitType: '',
  vehicleDesignationCapacityLiters: '', civilDefenceCertificateNumber: '', dateOfInspection: '',
  cdcFileName: '', inspectionFileName: '',
};

const STEPS: { id: 1 | 2; label: string; hint: string }[] = [
  { id: 1, label: 'Vehicle',     hint: 'Plate, traffic ID, type & capacity' },
  { id: 2, label: 'Inspection',  hint: 'Civil Defence & inspection documents' },
];

export function FleetCreatePage() {
  const navigate = useNavigate();
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [step, setStep] = useState<1 | 2>(1);
  const [maxReached, setMaxReached] = useState<1 | 2>(1);

  const stepValid = useMemo(() => ({
    1: !!draft.permitHolderId && !!draft.plateNumber.trim() && !!draft.trafficId.trim()
       && !!draft.typeOfVehicle && !!draft.unitType,
    2: !!draft.civilDefenceCertificateNumber.trim() && !!draft.dateOfInspection,
  }), [draft]);

  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setDraft((d) => ({ ...d, [k]: v }));
  const goTo = (target: 1 | 2) => { if (target <= maxReached) setStep(target); };
  const next = () => {
    if (!stepValid[step]) return;
    setStep(2);
    if (2 > maxReached) setMaxReached(2);
  };
  const prev = () => { if (step > 1) setStep(1); };
  const submit = () => navigate('/gas-register/fleet?created=' + encodeURIComponent(draft.plateNumber));

  return (
    <div className="min-h-screen bg-neutral-25">
      <div className="border-b border-neutral-100 bg-white">
        <div className="max-w-[1100px] mx-auto px-6 py-3 flex items-center justify-between text-[12px]">
          <nav className="text-neutral-500">
            <Link to="/pps-dashboard" className="hover:text-doe-red">Home</Link>
            <span className="mx-2 text-neutral-300">›</span>
            <span>Gas Register</span>
            <span className="mx-2 text-neutral-300">›</span>
            <Link to="/gas-register/fleet" className="hover:text-doe-red">Fleet Master</Link>
            <span className="mx-2 text-neutral-300">›</span>
            <span className="text-ink-950 font-semibold">New vehicle</span>
          </nav>
          <button type="button" onClick={() => navigate('/gas-register/fleet')} className="text-[11px] text-neutral-500 hover:text-doe-red flex items-center gap-1">
            <span>‹</span> Back to fleet
          </button>
        </div>
      </div>

      <div className="max-w-[1100px] mx-auto px-6 py-8">
        <div className="mb-6">
          <h1 className="font-display font-extrabold text-[28px] text-ink-950 leading-tight">Register a new vehicle</h1>
          <p className="text-[12.5px] text-neutral-500 mt-1.5">Capture the vehicle identity and its current Civil Defence certification.</p>
        </div>

        <div className="card p-4">
          <div className="relative h-[2px] bg-neutral-100 rounded-full mx-5 mb-3">
            <div className="absolute inset-y-0 left-0 bg-action-orange rounded-full transition-all" style={{ width: `${((step - 1) / 1) * 100}%` }} />
          </div>
          <ol className="grid grid-cols-2 gap-2">
            {STEPS.map((s) => {
              const active = step === s.id;
              const reached = s.id <= maxReached;
              const done = reached && stepValid[s.id] && s.id < step;
              return (
                <li key={s.id}>
                  <button type="button" onClick={() => goTo(s.id)} disabled={!reached}
                    className={cn('w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition',
                      reached ? 'cursor-pointer hover:bg-neutral-25' : 'cursor-not-allowed')}>
                    <span className={cn('w-7 h-7 rounded-full grid place-items-center shrink-0 text-[11px] font-bold transition',
                      done ? 'bg-success-500 text-white' :
                      active ? 'bg-action-orange text-white ring-4 ring-action-orange/20' :
                      reached ? 'bg-white text-ink-950 ring-1 ring-neutral-200' :
                                'bg-neutral-100 text-neutral-400 ring-1 ring-neutral-200')}>
                      {done ? <CheckIcon /> : s.id}
                    </span>
                    <div className="min-w-0">
                      <div className={cn('text-[12.5px] font-bold leading-tight', reached ? 'text-ink-950' : 'text-neutral-400')}>{s.label}</div>
                      <div className={cn('text-[10.5px] mt-0.5 leading-tight', active ? 'text-action-orange-deep' : 'text-neutral-500')}>{s.hint}</div>
                    </div>
                  </button>
                </li>
              );
            })}
          </ol>
        </div>

        <div className="card mt-4 overflow-hidden">
          <div className="px-6 py-6">
            {step === 1 && <Step1 draft={draft} set={set} />}
            {step === 2 && <Step2 draft={draft} set={set} />}
          </div>
          <div className="px-6 py-3 border-t border-neutral-100 flex items-center justify-between bg-neutral-25/60">
            <button type="button" onClick={prev} disabled={step === 1}
              className="px-4 py-2 rounded-md text-[12.5px] font-semibold text-neutral-700 hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed">← Previous</button>
            {step < 2 ? (
              <button type="button" onClick={next} disabled={!stepValid[1]}
                className={cn('px-4 py-2 rounded-md text-[12.5px] font-semibold shadow-doe-sm transition',
                  stepValid[1] ? 'bg-action-orange text-white hover:bg-action-orange-dark' : 'bg-neutral-200 text-neutral-500 cursor-not-allowed')}>Next →</button>
            ) : (
              <button type="button" onClick={submit} disabled={!stepValid[2]}
                className={cn('px-4 py-2 rounded-md text-[12.5px] font-semibold shadow-doe-sm transition',
                  stepValid[2] ? 'bg-success-500 text-white hover:opacity-90' : 'bg-neutral-200 text-neutral-500 cursor-not-allowed')}>Submit vehicle</button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Step1({ draft, set }: { draft: Draft; set: <K extends keyof Draft>(k: K, v: Draft[K]) => void }) {
  return (
    <Form>
      <Group title="Vehicle identity">
        <Row>
          <Field label="Permit holder" required span={8}>
            <Select value={draft.permitHolderId} onChange={(v) => set('permitHolderId', v)}
              options={PERMIT_HOLDERS.map((p) => ({ value: p.id, label: p.name }))} placeholder="Select permit holder…" />
          </Field>
          <Field label="Plate number" required span={4}>
            <Input value={draft.plateNumber} onChange={(v) => set('plateNumber', v.toUpperCase())} placeholder="e.g. AD-87421" mono />
          </Field>
        </Row>
        <Row>
          <Field label="Traffic ID" required span={4}>
            <Input value={draft.trafficId} onChange={(v) => set('trafficId', v.replace(/[^0-9]/g, ''))} placeholder="2014998771" mono />
          </Field>
          <Field label="Type of vehicle" required span={5}>
            <Select value={draft.typeOfVehicle} onChange={(v) => set('typeOfVehicle', v)}
              options={VEHICLE_TYPES.map((t) => ({ value: t, label: t }))} placeholder="Select vehicle type…" />
          </Field>
          <Field label="Unit type" required span={3}>
            <Select value={draft.unitType} onChange={(v) => set('unitType', v)}
              options={UNIT_TYPES.map((t) => ({ value: t, label: t }))} placeholder="Select…" />
          </Field>
        </Row>
        <Row>
          <Field label="Vehicle designation capacity (litres)" span={12}>
            <Input value={draft.vehicleDesignationCapacityLiters}
              onChange={(v) => set('vehicleDesignationCapacityLiters', v.replace(/[^0-9]/g, ''))}
              placeholder="Leave blank for non-bulk vehicles"
              mono
              suffix={draft.vehicleDesignationCapacityLiters ? formatLiters(parseInt(draft.vehicleDesignationCapacityLiters, 10)) : ''} />
          </Field>
        </Row>
      </Group>
    </Form>
  );
}

function Step2({ draft, set }: { draft: Draft; set: <K extends keyof Draft>(k: K, v: Draft[K]) => void }) {
  return (
    <Form>
      <Group title="Civil Defence certification">
        <Row>
          <Field label="Civil Defence certificate number" required span={6}>
            <Input value={draft.civilDefenceCertificateNumber} onChange={(v) => set('civilDefenceCertificateNumber', v.toUpperCase())} placeholder="CDC-XXXXX" mono />
          </Field>
          <Field label="Date of inspection" required span={6}>
            <Input value={draft.dateOfInspection} onChange={(v) => set('dateOfInspection', v)} type="date" />
          </Field>
        </Row>
      </Group>

      <Group title="Documents">
        <Row>
          <Field label="Civil Defence Certificate" span={12}>
            <FilePicker fileName={draft.cdcFileName} onChange={(v) => set('cdcFileName', v)} />
          </Field>
        </Row>
        <Row>
          <Field label="Inspection Report" span={12}>
            <FilePicker fileName={draft.inspectionFileName} onChange={(v) => set('inspectionFileName', v)} />
          </Field>
        </Row>
      </Group>
    </Form>
  );
}

// primitives (same shape as other wizards)
function Form({ children }: { children: React.ReactNode }) { return <div className="space-y-6">{children}</div>; }
function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <fieldset>
      <legend className="text-[10px] font-sans uppercase tracking-[0.18em] text-neutral-500 mb-2.5">{title}</legend>
      <div className="space-y-3">{children}</div>
    </fieldset>
  );
}
function Row({ children }: { children: React.ReactNode }) { return <div className="grid grid-cols-12 gap-4">{children}</div>; }
function Field({ label, required, span, children }: { label: string; required?: boolean; span: 3 | 4 | 5 | 6 | 8 | 12; children: React.ReactNode }) {
  const map: Record<number, string> = {3:'col-span-12 md:col-span-3',4:'col-span-12 md:col-span-4',5:'col-span-12 md:col-span-5',6:'col-span-12 md:col-span-6',8:'col-span-12 md:col-span-8',12:'col-span-12'};
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
          mono && 'font-mono', suffix && 'pr-24')} />
      {suffix && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10.5px] font-mono text-neutral-500 pointer-events-none">{suffix}</span>}
    </div>
  );
}
function Select({ value, onChange, options, placeholder }: { value: string; onChange: (v: string) => void; options: { value: string; label: string }[]; placeholder?: string }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)}
      className="w-full px-3 py-2 text-[13px] bg-white border border-neutral-200 rounded-md focus:outline-none focus:border-action-orange focus:ring-2 focus:ring-action-orange/20 transition">
      <option value="" disabled>{placeholder ?? 'Select…'}</option>
      {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
}
function FilePicker({ fileName, onChange }: { fileName: string; onChange: (v: string) => void }) {
  return (
    <label className="flex items-center gap-2 cursor-pointer">
      <span className="px-3 py-2 rounded-md border border-neutral-200 bg-white text-[12px] font-semibold text-ink-950 hover:bg-neutral-50">Choose file</span>
      <span className="text-[12px] text-neutral-500 flex-1 truncate">{fileName || 'No file selected'}</span>
      <input type="file" accept=".pdf,.png,.jpg,.jpeg,.docx" className="sr-only"
        onChange={(e) => onChange(e.target.files?.[0]?.name ?? '')} />
    </label>
  );
}
function CheckIcon() { return <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>; }
