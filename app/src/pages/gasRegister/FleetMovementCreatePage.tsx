import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { listFleet } from '../../services/gasRegister/fleet';
import { listDrivers } from '../../services/gasRegister/drivers';
import { listAssets, PERMIT_HOLDERS } from '../../services/gasRegister/assets';
import { listCustomers } from '../../services/gasRegister/customers';
import { GAS_TYPES, PRODUCT_TYPES, type GasTypeId, type ProductTypeId, type Unit } from '../../services/gasRegister/technical';
import { cn } from '../../lib/utils';

// =============================================================================
// Submit Fleet Movement Report — BN 11 of the Gas Register SDD.
// Form supports multi-line items. ASATEEL identifiers are surfaced as read-only
// rails; the Gas System Company submits the gas-specific quantity (Unit + value)
// + gas type + product type + endpoints.
// =============================================================================

type Row = {
  id: number;
  trafficId: string;
  driverId: string;
  vehiclePlate: string;
  unit: Unit;
  quantity: string;
  gasType: GasTypeId | '';
  productType: ProductTypeId | '';
  originFacilityId: string;
  destinationCustomerId: string;
};

const emptyRow = (id = Date.now()): Row => ({
  id, trafficId: '', driverId: '', vehiclePlate: '', unit: 'L', quantity: '',
  gasType: '', productType: '', originFacilityId: '', destinationCustomerId: '',
});

export function FleetMovementCreatePage() {
  const navigate = useNavigate();
  const fleet = listFleet();
  const drivers = listDrivers();
  const assets = listAssets();
  const customers = listCustomers().filter((c) => c.connectionStatus === 'Active');
  const [permitHolderId, setPermitHolderId] = useState('');
  const [rows, setRows] = useState<Row[]>([emptyRow(1)]);

  function update(rowId: number, patch: Partial<Row>) {
    setRows((rs) => rs.map((r) => r.id === rowId ? { ...r, ...patch } : r));
  }

  const canSubmit = !!permitHolderId && rows.every((r) =>
    r.unit && r.quantity && r.gasType && r.productType && r.originFacilityId && r.destinationCustomerId);

  function submit() {
    alert(`${rows.length} fleet movement record(s) captured.\nProduction would persist to the platform.`);
    navigate('/gas-register/fleet-movement');
  }

  return (
    <div className="min-h-screen bg-neutral-25">
      <div className="border-b border-neutral-100 bg-white">
        <div className="max-w-[1200px] mx-auto px-6 py-3 text-[12px]">
          <nav className="text-neutral-500">
            <Link to="/pps-dashboard" className="hover:text-doe-red">Home</Link>
            <span className="mx-2 text-neutral-300">›</span>
            <span>Gas Register</span>
            <span className="mx-2 text-neutral-300">›</span>
            <Link to="/gas-register/fleet-movement" className="hover:text-doe-red">Fleet Movement</Link>
            <span className="mx-2 text-neutral-300">›</span>
            <span className="text-ink-950 font-semibold">Submit Movement Report</span>
          </nav>
        </div>
      </div>

      <div className="max-w-[1200px] mx-auto px-6 py-7">
        <div className="mb-5">
          <div className="text-[10px] font-sans uppercase tracking-[0.22em] text-neutral-500 mb-1">BN 11 · Gas Register SDD</div>
          <h1 className="font-display font-extrabold text-[24px] text-ink-950">Submit Fleet Movement Report</h1>
          <p className="text-[12.5px] text-neutral-500 mt-1">
            Add one or more line items to record gas-specific quantities for completed routes.
            ASATEEL identifiers are picked from the dropdowns; per the SDD, no manual driver / vehicle entry.
          </p>
        </div>

        <div className="card p-4 mb-4">
          <Label>Permit Holder *</Label>
          <select value={permitHolderId} onChange={(e) => setPermitHolderId(e.target.value)}
            className="w-full px-2 h-9 border border-neutral-200 rounded-md text-[12.5px] focus:outline-none focus:border-action-orange">
            <option value="">Select…</option>
            {PERMIT_HOLDERS.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>

        <div className="card p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="text-[10.5px] font-sans uppercase tracking-[0.18em] text-neutral-500">Movement line items</div>
            <button onClick={() => setRows((rs) => [...rs, emptyRow()])} className="btn-secondary text-[11.5px]">+ Add line</button>
          </div>
          <div className="space-y-3">
            {rows.map((r, i) => (
              <div key={r.id} className="border border-neutral-200 rounded-lg p-3 bg-neutral-25">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-[10.5px] font-mono uppercase tracking-wider text-neutral-500">Line {i + 1}</div>
                  {rows.length > 1 && <button onClick={() => setRows((rs) => rs.filter((x) => x.id !== r.id))} className="text-doe-red text-[11px] font-semibold">Remove</button>}
                </div>
                <div className="grid grid-cols-4 gap-3">
                  <Field label="Traffic ID (ASATEEL)">
                    <Input value={r.trafficId} onChange={(v) => update(r.id, { trafficId: v })} mono placeholder="TID-XXXXX" />
                  </Field>
                  <Field label="Driver">
                    <Select value={r.driverId} onChange={(v) => update(r.id, { driverId: v })}
                      options={[{ value: '', label: 'Pick driver…' }, ...drivers.map((d) => ({ value: d.id, label: d.driverName }))]} />
                  </Field>
                  <Field label="Vehicle Plate">
                    <Select value={r.vehiclePlate} onChange={(v) => update(r.id, { vehiclePlate: v })}
                      options={[{ value: '', label: 'Pick vehicle…' }, ...fleet.map((f) => ({ value: f.plateNumber ?? f.id, label: f.plateNumber ?? f.id }))]} />
                  </Field>
                  <Field label="Origin Facility">
                    <Select value={r.originFacilityId} onChange={(v) => update(r.id, { originFacilityId: v })}
                      options={[{ value: '', label: 'Pick origin…' }, ...assets.map((a) => ({ value: a.id, label: a.facilityName }))]} />
                  </Field>
                  <Field label="Destination Customer">
                    <Select value={r.destinationCustomerId} onChange={(v) => update(r.id, { destinationCustomerId: v })}
                      options={[{ value: '', label: 'Pick destination…' }, ...customers.map((c) => ({ value: c.id, label: c.buildingName }))]} />
                  </Field>
                  <Field label="Unit (radio)">
                    <RadioPair value={r.unit} onChange={(v) => update(r.id, { unit: v as Unit })} options={[{ value: 'L', label: 'Litres' }, { value: 'SCM', label: 'SCM' }]} />
                  </Field>
                  <Field label={`Quantity (${r.unit})`}>
                    <Input value={r.quantity} onChange={(v) => update(r.id, { quantity: v.replace(/[^0-9]/g, '') })} mono placeholder="0" />
                  </Field>
                  <Field label="Type of Gas">
                    <Select value={r.gasType} onChange={(v) => update(r.id, { gasType: v as GasTypeId })}
                      options={[{ value: '', label: 'Pick gas type…' }, ...GAS_TYPES.map((g) => ({ value: g.id, label: g.shortLabel }))]} />
                  </Field>
                  <Field label="Product Type">
                    <Select value={r.productType} onChange={(v) => update(r.id, { productType: v as ProductTypeId })}
                      options={[{ value: '', label: 'Pick product…' }, ...PRODUCT_TYPES.map((p) => ({ value: p.id, label: p.label }))]} />
                  </Field>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-5 flex items-center justify-between">
          <Link to="/gas-register/fleet-movement" className="text-[12px] text-neutral-500 hover:text-doe-red">Cancel</Link>
          <button onClick={submit} disabled={!canSubmit}
            className={cn('btn-primary', !canSubmit && 'opacity-50 cursor-not-allowed')}>Submit Movement Report</button>
        </div>
      </div>
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) { return <div className="text-[10.5px] font-sans uppercase tracking-wider text-neutral-500 mb-1">{children}</div>; }
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><div className="text-[10px] font-sans uppercase tracking-wider text-neutral-500 mb-0.5">{label}</div>{children}</div>;
}
function Input({ value, onChange, placeholder, mono }: { value: string; onChange: (v: string) => void; placeholder?: string; mono?: boolean }) {
  return <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
    className={cn('w-full px-2 h-9 border border-neutral-200 rounded-md text-[12px] focus:outline-none focus:border-action-orange', mono && 'font-mono')} />;
}
function Select({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: { value: string; label: string }[] }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)}
      className="w-full px-2 h-9 border border-neutral-200 rounded-md text-[12px] focus:outline-none focus:border-action-orange">
      {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
}
function RadioPair({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: { value: string; label: string }[] }) {
  return (
    <div className="flex items-center gap-1 p-0.5 rounded-md border border-neutral-200 bg-white h-9">
      {options.map((o) => (
        <button key={o.value} onClick={() => onChange(o.value)}
          className={cn('flex-1 h-8 rounded text-[11.5px] font-semibold transition',
            value === o.value ? 'bg-action-orange text-white' : 'text-neutral-600 hover:text-ink-950')}>
          {o.label}
        </button>
      ))}
    </div>
  );
}
