import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  PERMIT_HOLDERS, CATEGORIES, categoryUsesEid, categoryById,
  ECONOMIC_ACTIVITIES,
  type CustomerCategory,
} from '../../services/gasRegister/customers';
import { GAS_TYPES as GAS_TYPE_DEFS, type GasTypeId } from '../../services/gasRegister/technical';
import { cn } from '../../lib/utils';

// =============================================================================
// Customer Master · Add New Customer (BN 1 of the Gas Register SDD).
// 4-step wizard:
//   1. Category & Building Type   (determines EID vs CN/MC flow)
//   2. Identification              (EID-flow OR CN/MC-flow fields)
//   3. Location & Capacity         (address, coordinates, gas allocations)
//   4. Contract & Submit           (date of contract, expiry of gas-sales contract)
// =============================================================================

type GasRow = { id: number; gasType: GasTypeId | ''; capacityLiters: string };

interface Draft {
  // Step 1
  category: CustomerCategory | '';
  buildingType: string;
  // Step 2 (one or the other based on category)
  emiratesId: string;
  accountOwnerName: string;
  endUserName: string;
  nationality: string;
  tradeLicenceNumber: string;
  commercialName: string;
  licenceAuthority: string;
  economicActivity: string;
  accountId: string;
  permitHolderId: string;
  // Step 2 common
  buildingName: string;
  ownerOrFmName: string;
  ownerOrFmContact: string;
  ownerOrFmEmail: string;
  // Step 3
  detailedAddress: string;
  city: 'Abu Dhabi' | 'Al Ain' | 'Al Dhafra' | '';
  area: string;
  sectorNo: string;
  plotNo: string;
  lat: string;
  lng: string;
  gasAllocations: GasRow[];
  // Step 4
  dateOfContract: string;
  expiryOfGasSalesContract: string;
  contractFileName: string;
}

const EMPTY: Draft = {
  category: '', buildingType: '',
  emiratesId: '', accountOwnerName: '', endUserName: '', nationality: '',
  tradeLicenceNumber: '', commercialName: '', licenceAuthority: '', economicActivity: '',
  accountId: '', permitHolderId: '',
  buildingName: '', ownerOrFmName: '', ownerOrFmContact: '', ownerOrFmEmail: '',
  detailedAddress: '', city: '', area: '', sectorNo: '', plotNo: '', lat: '', lng: '',
  gasAllocations: [{ id: 1, gasType: '', capacityLiters: '' }],
  dateOfContract: '', expiryOfGasSalesContract: '', contractFileName: '',
};

const STEP_TITLES = [
  '1. Category & Building',
  '2. Identification',
  '3. Location & Capacity',
  '4. Contract & Submit',
] as const;

export function CustomerCreatePage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState<Draft>(EMPTY);

  const usesEid = draft.category ? categoryUsesEid(draft.category) : false;
  const categoryDef = draft.category ? categoryById(draft.category) : undefined;

  const totalCapacity = useMemo(
    () => draft.gasAllocations.reduce((s, g) => s + (parseInt(g.capacityLiters, 10) || 0), 0),
    [draft.gasAllocations],
  );

  function update<K extends keyof Draft>(key: K, value: Draft[K]) {
    setDraft((d) => ({ ...d, [key]: value }));
  }
  function updateGasRow(rowId: number, patch: Partial<GasRow>) {
    setDraft((d) => ({ ...d, gasAllocations: d.gasAllocations.map((r) => r.id === rowId ? { ...r, ...patch } : r) }));
  }

  const canAdvance = (() => {
    if (step === 0) return !!draft.category && !!draft.buildingType;
    if (step === 1) {
      if (!draft.buildingName || !draft.ownerOrFmName || !draft.ownerOrFmContact || !draft.ownerOrFmEmail || !draft.permitHolderId || !draft.accountId) return false;
      if (usesEid) return !!draft.emiratesId && !!draft.accountOwnerName;
      return !!draft.tradeLicenceNumber && !!draft.commercialName;
    }
    if (step === 2) {
      return !!draft.detailedAddress && !!draft.city && !!draft.area
        && draft.gasAllocations.some((g) => g.gasType && parseInt(g.capacityLiters, 10) > 0);
    }
    if (step === 3) return !!draft.dateOfContract;
    return false;
  })();

  function submit() {
    // Prototype only — in a real app this POSTS to the platform.
    // For demo, navigate back to the list.
    alert(`Customer "${draft.buildingName}" captured.\nProduction would post to the platform and assign a CUST_ id.`);
    navigate('/gas-register/customers');
  }

  return (
    <div className="min-h-screen bg-neutral-25">
      {/* Breadcrumb */}
      <div className="border-b border-neutral-100 bg-white">
        <div className="max-w-[1100px] mx-auto px-6 py-3 flex items-center justify-between text-[12px]">
          <nav className="text-neutral-500">
            <Link to="/pps-dashboard" className="hover:text-doe-red">Home</Link>
            <span className="mx-2 text-neutral-300">›</span>
            <span>Gas Register</span>
            <span className="mx-2 text-neutral-300">›</span>
            <Link to="/gas-register/customers" className="hover:text-doe-red">Customer Master</Link>
            <span className="mx-2 text-neutral-300">›</span>
            <span className="text-ink-950 font-semibold">Add New Customer</span>
          </nav>
        </div>
      </div>

      <div className="max-w-[1100px] mx-auto px-6 py-7">
        <div className="mb-5">
          <div className="text-[10px] font-sans uppercase tracking-[0.22em] text-neutral-500 mb-2">BN 1 · Gas Register SDD</div>
          <h1 className="font-display font-extrabold text-[24px] text-ink-950">Add New Customer</h1>
          <p className="text-[12.5px] text-neutral-500 mt-1 max-w-prose">
            The form below dynamically renders the identification fields based on the chosen Category.
            <strong className="text-ink-950"> EID flow</strong> applies to Residential Buildings and Villas Palaces;
            every other category uses the <strong className="text-ink-950">Trade Licence (CN/MC) flow</strong>.
          </p>
        </div>

        {/* Stepper */}
        <div className="mb-6">
          <div className="grid grid-cols-4 gap-2">
            {STEP_TITLES.map((title, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => idx <= step && setStep(idx)}
                disabled={idx > step}
                className={cn(
                  'rounded-lg border px-3 py-2 text-left transition',
                  idx === step ? 'border-action-orange bg-action-orange-soft' :
                  idx < step  ? 'border-emerald-200 bg-emerald-50 cursor-pointer hover:border-emerald-300' :
                  'border-neutral-200 bg-white opacity-60 cursor-not-allowed',
                )}
              >
                <div className={cn('text-[9.5px] font-sans uppercase tracking-[0.16em]',
                  idx === step ? 'text-action-orange-deep' :
                  idx < step  ? 'text-emerald-700' : 'text-neutral-500')}>
                  Step {idx + 1}
                </div>
                <div className={cn('text-[12px] font-semibold mt-0.5',
                  idx === step ? 'text-ink-950' :
                  idx < step  ? 'text-emerald-700' : 'text-neutral-500')}>
                  {title.split('. ')[1]}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Step content */}
        <div className="card p-5">
          {step === 0 && (
            <div className="space-y-5">
              <SectionLabel>Category &amp; Building Type</SectionLabel>
              <div className="grid grid-cols-2 gap-4">
                <FormField label="Category" required>
                  <Select
                    value={draft.category}
                    onChange={(v) => { update('category', v as CustomerCategory); update('buildingType', ''); }}
                    options={[{ value: '', label: 'Select a category…' }, ...CATEGORIES.map((c) => ({ value: c.id, label: c.label }))]}
                  />
                  {draft.category && (
                    <div className={cn('mt-1.5 text-[10.5px] font-mono inline-flex items-center px-1.5 h-4 rounded',
                      usesEid ? 'bg-info-soft text-info-500' : 'bg-action-orange-soft text-action-orange-deep')}>
                      {usesEid ? 'EID Flow' : 'Trade Licence (CN/MC) Flow'}
                    </div>
                  )}
                </FormField>
                <FormField label="Building Type" required>
                  <Select
                    value={draft.buildingType}
                    onChange={(v) => update('buildingType', v)}
                    options={[{ value: '', label: draft.category ? 'Select a building type…' : 'Pick a category first' }, ...(categoryDef?.buildingTypes ?? []).map((b) => ({ value: b, label: b }))]}
                    disabled={!draft.category}
                  />
                </FormField>
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-5">
              <SectionLabel>Holder Identification</SectionLabel>
              <div className="grid grid-cols-2 gap-4">
                <FormField label="Permit Holder" required>
                  <Select
                    value={draft.permitHolderId}
                    onChange={(v) => update('permitHolderId', v)}
                    options={[{ value: '', label: 'Select…' }, ...PERMIT_HOLDERS.map((p) => ({ value: p.id, label: p.name }))]}
                  />
                </FormField>
                <FormField label="Account ID" required>
                  <Input value={draft.accountId} onChange={(v) => update('accountId', v)} placeholder="Gas account / meter reference" />
                </FormField>

                {usesEid ? (
                  <>
                    <FormField label="Emirates ID" required helper="On Fetch (production), holder details are retrieved from the EID integration.">
                      <Input value={draft.emiratesId} onChange={(v) => update('emiratesId', v)} placeholder="784-XXXX-XXXXXXX-X" mono />
                    </FormField>
                    <FormField label="Account Owner Full Name" required>
                      <Input value={draft.accountOwnerName} onChange={(v) => update('accountOwnerName', v)} placeholder="Pre-populated from EID integration" />
                    </FormField>
                    <FormField label="End User Name">
                      <Input value={draft.endUserName} onChange={(v) => update('endUserName', v)} placeholder="If different from account owner" />
                    </FormField>
                    <FormField label="Nationality">
                      <Input value={draft.nationality} onChange={(v) => update('nationality', v)} placeholder="Pre-populated from EID" />
                    </FormField>
                  </>
                ) : (
                  <>
                    <FormField label="Trade Licence Number" required helper="On Fetch (production), company details are retrieved from the DED integration.">
                      <Input value={draft.tradeLicenceNumber} onChange={(v) => update('tradeLicenceNumber', v)} placeholder="CN-XXXXXXXX" mono />
                    </FormField>
                    <FormField label="Commercial Name" required>
                      <Input value={draft.commercialName} onChange={(v) => update('commercialName', v)} placeholder="Pre-populated from DED" />
                    </FormField>
                    <FormField label="Licence Authority">
                      <Input value={draft.licenceAuthority} onChange={(v) => update('licenceAuthority', v)} placeholder="ADDED · GAC · ADEK …" />
                    </FormField>
                    <FormField label="Business / Economic Activity">
                      <Select
                        value={draft.economicActivity}
                        onChange={(v) => update('economicActivity', v)}
                        options={[{ value: '', label: 'Select…' }, ...ECONOMIC_ACTIVITIES.map((e) => ({ value: e, label: e }))]}
                      />
                    </FormField>
                  </>
                )}

                <FormField label="Building Name" required>
                  <Input value={draft.buildingName} onChange={(v) => update('buildingName', v)} />
                </FormField>
                <FormField label="Owner / Facility Management Name" required>
                  <Input value={draft.ownerOrFmName} onChange={(v) => update('ownerOrFmName', v)} />
                </FormField>
                <FormField label="Owner / FM Contact Number" required>
                  <Input value={draft.ownerOrFmContact} onChange={(v) => update('ownerOrFmContact', v)} placeholder="+971 ..." mono />
                </FormField>
                <FormField label="Owner / FM Email" required>
                  <Input value={draft.ownerOrFmEmail} onChange={(v) => update('ownerOrFmEmail', v)} placeholder="contact@example.ae" mono />
                </FormField>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-5">
              <SectionLabel>Location</SectionLabel>
              <div className="grid grid-cols-2 gap-4">
                <FormField label="Detailed Address" required>
                  <Input value={draft.detailedAddress} onChange={(v) => update('detailedAddress', v)} />
                </FormField>
                <FormField label="City" required>
                  <Select
                    value={draft.city}
                    onChange={(v) => update('city', v as Draft['city'])}
                    options={[{ value: '', label: 'Select…' }, { value: 'Abu Dhabi', label: 'Abu Dhabi' }, { value: 'Al Ain', label: 'Al Ain' }, { value: 'Al Dhafra', label: 'Al Dhafra' }]}
                  />
                </FormField>
                <FormField label="Area" required>
                  <Input value={draft.area} onChange={(v) => update('area', v)} />
                </FormField>
                <FormField label="Sector No.">
                  <Input value={draft.sectorNo} onChange={(v) => update('sectorNo', v)} mono />
                </FormField>
                <FormField label="Plot No.">
                  <Input value={draft.plotNo} onChange={(v) => update('plotNo', v)} mono />
                </FormField>
                <div className="grid grid-cols-2 gap-3">
                  <FormField label="Latitude">
                    <Input value={draft.lat} onChange={(v) => update('lat', v)} placeholder="24.450" mono />
                  </FormField>
                  <FormField label="Longitude">
                    <Input value={draft.lng} onChange={(v) => update('lng', v)} placeholder="54.402" mono />
                  </FormField>
                </div>
              </div>

              <SectionLabel>Gas Allocations</SectionLabel>
              <div className="text-[11.5px] text-neutral-500">
                Total capacity is the sum of per-gas-type allocations. Both Litres and SCM are displayed
                throughout the platform per SDD §3.8.3.
              </div>
              <div className="space-y-2">
                {draft.gasAllocations.map((g, idx) => (
                  <div key={g.id} className="grid grid-cols-[1fr_180px_44px] gap-2 items-center">
                    <Select
                      value={g.gasType}
                      onChange={(v) => updateGasRow(g.id, { gasType: v as GasTypeId })}
                      options={[{ value: '', label: 'Type of Gas…' }, ...GAS_TYPE_DEFS.map((t) => ({ value: t.id, label: t.label }))]}
                    />
                    <Input value={g.capacityLiters} onChange={(v) => updateGasRow(g.id, { capacityLiters: v.replace(/[^0-9]/g, '') })} placeholder="Capacity (L)" mono />
                    {idx === draft.gasAllocations.length - 1 ? (
                      <button type="button" onClick={() => update('gasAllocations', [...draft.gasAllocations, { id: Date.now(), gasType: '', capacityLiters: '' }])} className="h-9 px-2 rounded bg-action-orange-soft text-action-orange-deep font-bold">+</button>
                    ) : (
                      <button type="button" onClick={() => update('gasAllocations', draft.gasAllocations.filter((r) => r.id !== g.id))} className="h-9 px-2 rounded bg-rose-50 text-doe-red">×</button>
                    )}
                  </div>
                ))}
                <div className="text-[11.5px] text-neutral-500 mt-1">
                  Total: <span className="font-semibold text-ink-950 tabular-nums">{totalCapacity.toLocaleString()} L</span>
                </div>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-5">
              <SectionLabel>Contract</SectionLabel>
              <div className="grid grid-cols-2 gap-4">
                <FormField label="Date of Contract" required>
                  <Input type="date" value={draft.dateOfContract} onChange={(v) => update('dateOfContract', v)} />
                </FormField>
                <FormField label="Expiry of Gas Sales Contract" helper="New field per SDD §3.1.2 — system flags expiring contracts on the Dashboard.">
                  <Input type="date" value={draft.expiryOfGasSalesContract} onChange={(v) => update('expiryOfGasSalesContract', v)} />
                </FormField>
                <FormField label="Contract Document">
                  <Input value={draft.contractFileName} onChange={(v) => update('contractFileName', v)} placeholder="contract.pdf — uploaded via the file picker (production)" />
                </FormField>
              </div>

              <SectionLabel>Summary</SectionLabel>
              <div className="card p-4 bg-neutral-25 border border-neutral-100 grid grid-cols-2 gap-x-6 gap-y-2 text-[12px]">
                <SummaryLine label="Category"      value={categoryDef?.label ?? '—'} />
                <SummaryLine label="Building Type" value={draft.buildingType || '—'} />
                <SummaryLine label="Flow"          value={draft.category ? (usesEid ? 'EID' : 'Trade Licence (CN/MC)') : '—'} />
                <SummaryLine label="Identifier"    value={usesEid ? draft.emiratesId || '—' : draft.tradeLicenceNumber || '—'} mono />
                <SummaryLine label="Building"      value={draft.buildingName || '—'} />
                <SummaryLine label="Owner / FM"    value={draft.ownerOrFmName || '—'} />
                <SummaryLine label="Location"      value={[draft.area, draft.city].filter(Boolean).join(', ') || '—'} />
                <SummaryLine label="Total Capacity" value={`${totalCapacity.toLocaleString()} L`} mono />
              </div>

              <div className="rounded-lg border border-info-500/30 bg-info-soft/40 p-3 text-[11.5px] text-info-500">
                <strong className="uppercase tracking-wider mr-1">Compliance ·</strong>
                Once the customer is created, the 4-cert validity panel (ISTIFAA · DOE NOC · AMC Gas · GAS TPI COC)
                becomes editable from the detail page. The Compliance Rate is then auto-computed per SDD §3.14.
              </div>
            </div>
          )}
        </div>

        {/* Footer buttons */}
        <div className="mt-6 flex items-center justify-between">
          <Link to="/gas-register/customers" className="text-[12px] text-neutral-500 hover:text-doe-red">Cancel</Link>
          <div className="flex items-center gap-2">
            {step > 0 && (
              <button type="button" onClick={() => setStep((s) => s - 1)} className="btn-secondary">‹ Back</button>
            )}
            {step < 3 ? (
              <button type="button" disabled={!canAdvance} onClick={() => setStep((s) => s + 1)}
                className={cn('btn-primary', !canAdvance && 'opacity-50 cursor-not-allowed')}>Next ›</button>
            ) : (
              <button type="button" disabled={!canAdvance} onClick={submit}
                className={cn('btn-primary', !canAdvance && 'opacity-50 cursor-not-allowed')}>Submit Customer</button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================
function SectionLabel({ children }: { children: React.ReactNode }) {
  return <div className="text-[10.5px] font-sans uppercase tracking-[0.18em] text-neutral-500">{children}</div>;
}

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

function Input({ value, onChange, placeholder, type = 'text', mono }: { value: string; onChange: (v: string) => void; placeholder?: string; type?: string; mono?: boolean }) {
  return (
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      type={type}
      placeholder={placeholder}
      className={cn('w-full px-3 h-9 border border-neutral-200 rounded-md text-[12.5px] focus:outline-none focus:border-action-orange', mono && 'font-mono')}
    />
  );
}

function Select({ value, onChange, options, disabled }: { value: string; onChange: (v: string) => void; options: { value: string; label: string }[]; disabled?: boolean }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      className="w-full px-2 h-9 border border-neutral-200 rounded-md text-[12.5px] focus:outline-none focus:border-action-orange disabled:bg-neutral-50 disabled:text-neutral-400"
    >
      {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
}

function SummaryLine({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-baseline gap-2">
      <span className="text-[10px] font-sans uppercase tracking-wider text-neutral-500 w-32 flex-shrink-0">{label}</span>
      <span className={cn('text-[12px] text-ink-950', mono && 'font-mono')}>{value}</span>
    </div>
  );
}
