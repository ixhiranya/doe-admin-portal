import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { PERMIT_HOLDERS, SECTIONS, QUALIFICATIONS, type Gender } from '../../services/gasRegister/employees';
import { cn } from '../../lib/utils';

type Draft = {
  // step 1 — identity
  jobId: string;
  name: string;
  emiratesId: string;
  gender: Gender | '';
  mobile: string;
  email: string;
  dateOfBirth: string;
  // step 2 — role
  permitHolderId: string;
  dateOfHiring: string;
  section: string;
  professionInDetail: string;
  qualification: string;
  monthlyWorkingHours: string;
  // step 3 — training
  trainingInGas: string;
  certificateExpiryDate: string;
  attachmentFileName: string;
};

const EMPTY: Draft = {
  jobId: '', name: '', emiratesId: '', gender: '', mobile: '', email: '', dateOfBirth: '',
  permitHolderId: '', dateOfHiring: '', section: '', professionInDetail: '', qualification: '',
  monthlyWorkingHours: '',
  trainingInGas: '', certificateExpiryDate: '', attachmentFileName: '',
};

const STEPS: { id: 1 | 2 | 3; label: string; hint: string }[] = [
  { id: 1, label: 'Identity',  hint: 'Personal & contact details' },
  { id: 2, label: 'Role',      hint: 'Permit holder, section & qualification' },
  { id: 3, label: 'Training',  hint: 'Gas training & certificate' },
];

export function EmployeeCreatePage() {
  const navigate = useNavigate();
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [maxReached, setMaxReached] = useState<1 | 2 | 3>(1);

  const stepValid = useMemo(() => ({
    1: validateStep1(draft),
    2: validateStep2(draft),
    3: validateStep3(draft),
  }), [draft]);

  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setDraft((d) => ({ ...d, [k]: v }));
  const goTo = (target: 1 | 2 | 3) => { if (target <= maxReached) setStep(target); };
  const next = () => {
    if (!stepValid[step]) return;
    const n = (step + 1) as 1 | 2 | 3;
    setStep(n);
    if (n > maxReached) setMaxReached(n);
  };
  const prev = () => { if (step > 1) setStep((step - 1) as 1 | 2 | 3); };
  const submit = () => navigate('/gas-register/employees?created=' + encodeURIComponent(draft.name));

  return (
    <div className="min-h-screen bg-neutral-25">
      <div className="border-b border-neutral-100 bg-white">
        <div className="max-w-[1100px] mx-auto px-6 py-3 flex items-center justify-between text-[12px]">
          <nav className="text-neutral-500">
            <Link to="/pps-dashboard" className="hover:text-doe-red">Home</Link>
            <span className="mx-2 text-neutral-300">›</span>
            <span>Gas Register</span>
            <span className="mx-2 text-neutral-300">›</span>
            <Link to="/gas-register/employees" className="hover:text-doe-red">Employee Master</Link>
            <span className="mx-2 text-neutral-300">›</span>
            <span className="text-ink-950 font-semibold">New employee</span>
          </nav>
          <button type="button" onClick={() => navigate('/gas-register/employees')} className="text-[11px] text-neutral-500 hover:text-doe-red flex items-center gap-1">
            <span>‹</span> Back to employees
          </button>
        </div>
      </div>

      <div className="max-w-[1100px] mx-auto px-6 py-8">
        <div className="mb-6">
          <h1 className="font-display font-extrabold text-[28px] text-ink-950 leading-tight">Register a new employee</h1>
          <p className="text-[12.5px] text-neutral-500 mt-1.5">Capture the employee's identity, role within the permit holder, and their gas-handling training.</p>
        </div>

        <Stepper step={step} maxReached={maxReached} stepValid={stepValid} onGoTo={goTo} />

        <div className="card mt-4 overflow-hidden">
          <div className="px-6 py-6">
            {step === 1 && <Step1 draft={draft} set={set} />}
            {step === 2 && <Step2 draft={draft} set={set} />}
            {step === 3 && <Step3 draft={draft} set={set} />}
          </div>
          <div className="px-6 py-3 border-t border-neutral-100 flex items-center justify-between bg-neutral-25/60">
            <button type="button" onClick={prev} disabled={step === 1}
              className="px-4 py-2 rounded-md text-[12.5px] font-semibold text-neutral-700 hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed">← Previous</button>
            {step < 3 ? (
              <button type="button" onClick={next} disabled={!stepValid[step]}
                className={cn('px-4 py-2 rounded-md text-[12.5px] font-semibold shadow-doe-sm transition',
                  stepValid[step] ? 'bg-action-orange text-white hover:bg-action-orange-dark' : 'bg-neutral-200 text-neutral-500 cursor-not-allowed')}>Next →</button>
            ) : (
              <button type="button" onClick={submit} disabled={!stepValid[3]}
                className={cn('px-4 py-2 rounded-md text-[12.5px] font-semibold shadow-doe-sm transition',
                  stepValid[3] ? 'bg-success-500 text-white hover:opacity-90' : 'bg-neutral-200 text-neutral-500 cursor-not-allowed')}>Submit employee</button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Stepper({ step, maxReached, stepValid, onGoTo }: {
  step: 1 | 2 | 3; maxReached: 1 | 2 | 3;
  stepValid: Record<1 | 2 | 3, boolean>;
  onGoTo: (s: 1 | 2 | 3) => void;
}) {
  const progressPct = ((step - 1) / (STEPS.length - 1)) * 100;
  return (
    <div className="card p-4">
      <div className="relative h-[2px] bg-neutral-100 rounded-full mx-5 mb-3">
        <div className="absolute inset-y-0 left-0 bg-action-orange rounded-full transition-all" style={{ width: `${progressPct}%` }} />
      </div>
      <ol className="grid grid-cols-3 gap-2">
        {STEPS.map((s) => {
          const active = step === s.id;
          const reached = s.id <= maxReached;
          const done = reached && stepValid[s.id] && s.id < step;
          return (
            <li key={s.id}>
              <button type="button" onClick={() => onGoTo(s.id)} disabled={!reached}
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
  );
}

function Step1({ draft, set }: { draft: Draft; set: <K extends keyof Draft>(k: K, v: Draft[K]) => void }) {
  return (
    <Form>
      <Group title="Personal details">
        <Row>
          <Field label="Job ID" required span={3}>
            <Input value={draft.jobId} onChange={(v) => set('jobId', v)} placeholder="e.g. 24155" mono />
          </Field>
          <Field label="Full name" required span={6}>
            <Input value={draft.name} onChange={(v) => set('name', v)} placeholder="Full legal name" />
          </Field>
          <Field label="Gender" required span={3}>
            <SegmentedControl value={draft.gender} onChange={(v) => set('gender', v as Gender)}
              options={[{ value: 'Male', label: 'Male' }, { value: 'Female', label: 'Female' }]} />
          </Field>
        </Row>
        <Row>
          <Field label="Emirates ID" required span={4}>
            <Input value={draft.emiratesId} onChange={(v) => set('emiratesId', formatEid(v))} placeholder="784-XXXX-XXXXXXX-X" mono />
          </Field>
          <Field label="Date of birth" required span={4}>
            <Input value={draft.dateOfBirth} onChange={(v) => set('dateOfBirth', v)} type="date" />
          </Field>
          <Field label="Mobile" span={4}>
            <Input value={draft.mobile} onChange={(v) => set('mobile', v)} placeholder="+971 50 000 0000" mono />
          </Field>
        </Row>
        <Row>
          <Field label="Email" span={12}>
            <Input value={draft.email} onChange={(v) => set('email', v)} placeholder="name@company.ae" type="email" />
          </Field>
        </Row>
      </Group>
    </Form>
  );
}

function Step2({ draft, set }: { draft: Draft; set: <K extends keyof Draft>(k: K, v: Draft[K]) => void }) {
  return (
    <Form>
      <Group title="Employment">
        <Row>
          <Field label="Permit holder" required span={8}>
            <Select value={draft.permitHolderId} onChange={(v) => set('permitHolderId', v)}
              options={PERMIT_HOLDERS.map((p) => ({ value: p.id, label: p.name }))} placeholder="Select permit holder…" />
          </Field>
          <Field label="Date of hiring" required span={4}>
            <Input value={draft.dateOfHiring} onChange={(v) => set('dateOfHiring', v)} type="date" />
          </Field>
        </Row>
        <Row>
          <Field label="Section" required span={6}>
            <Select value={draft.section} onChange={(v) => set('section', v)}
              options={SECTIONS.map((s) => ({ value: s, label: s }))} placeholder="Select section…" />
          </Field>
          <Field label="Qualification" required span={3}>
            <Select value={draft.qualification} onChange={(v) => set('qualification', v)}
              options={QUALIFICATIONS.map((q) => ({ value: q, label: q }))} placeholder="Select…" />
          </Field>
          <Field label="Monthly hours" required span={3}>
            <Input value={draft.monthlyWorkingHours} onChange={(v) => set('monthlyWorkingHours', v.replace(/[^0-9]/g, ''))} placeholder="160" mono suffix="hours" />
          </Field>
        </Row>
        <Row>
          <Field label="Profession in detail" required span={12}>
            <Input value={draft.professionInDetail} onChange={(v) => set('professionInDetail', v)} placeholder="e.g. Assistant Manager, Commercial" />
          </Field>
        </Row>
      </Group>
    </Form>
  );
}

function Step3({ draft, set }: { draft: Draft; set: <K extends keyof Draft>(k: K, v: Draft[K]) => void }) {
  return (
    <Form>
      <Group title="Gas training">
        <Row>
          <Field label="Training received in the field of gas" required span={12}>
            <Textarea value={draft.trainingInGas} onChange={(v) => set('trainingInGas', v)}
              placeholder="Describe training programmes attended, certifying body, and topics covered." />
          </Field>
        </Row>
        <Row>
          <Field label="Certificate expiry date" required span={5}>
            <Input value={draft.certificateExpiryDate} onChange={(v) => set('certificateExpiryDate', v)} type="date" />
          </Field>
          <Field label="Training certificate" span={7}>
            <FilePicker fileName={draft.attachmentFileName} onChange={(v) => set('attachmentFileName', v)} />
          </Field>
        </Row>
      </Group>
    </Form>
  );
}

// validation
function validateStep1(d: Draft): boolean {
  return !!d.jobId.trim() && !!d.name.trim() && /^784/.test(d.emiratesId) && d.emiratesId.length >= 15
    && !!d.gender && !!d.dateOfBirth;
}
function validateStep2(d: Draft): boolean {
  return !!d.permitHolderId && !!d.dateOfHiring && !!d.section && !!d.qualification
    && !!d.professionInDetail.trim() && !!d.monthlyWorkingHours;
}
function validateStep3(d: Draft): boolean {
  return !!d.trainingInGas.trim() && !!d.certificateExpiryDate;
}

function formatEid(v: string) {
  const d = v.replace(/[^0-9]/g, '').slice(0, 15);
  return [d.slice(0,3), d.slice(3,7), d.slice(7,14), d.slice(14,15)].filter(Boolean).join('-');
}

// primitives
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
function Field({ label, required, span, children }: { label: string; required?: boolean; span: 3 | 4 | 5 | 6 | 7 | 8 | 12; children: React.ReactNode }) {
  const map: Record<number, string> = {3:'col-span-12 md:col-span-3',4:'col-span-12 md:col-span-4',5:'col-span-12 md:col-span-5',6:'col-span-12 md:col-span-6',7:'col-span-12 md:col-span-7',8:'col-span-12 md:col-span-8',12:'col-span-12'};
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
          mono && 'font-mono', suffix && 'pr-20')} />
      {suffix && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10.5px] font-mono text-neutral-500 pointer-events-none">{suffix}</span>}
    </div>
  );
}
function Textarea({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <textarea value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} rows={3}
      className="w-full px-3 py-2 text-[13px] bg-white border border-neutral-200 rounded-md placeholder-neutral-400 focus:outline-none focus:border-action-orange focus:ring-2 focus:ring-action-orange/20 transition" />
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
function SegmentedControl({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: { value: string; label: string }[] }) {
  return (
    <div className="inline-flex p-0.5 rounded-md bg-neutral-50 border border-neutral-100">
      {options.map((o) => (
        <button key={o.value} type="button" onClick={() => onChange(o.value)}
          className={cn('h-9 px-4 rounded text-[12.5px] font-semibold transition',
            value === o.value ? 'bg-white shadow-doe-xs text-ink-950' : 'text-neutral-500 hover:text-ink-950')}>{o.label}</button>
      ))}
    </div>
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
