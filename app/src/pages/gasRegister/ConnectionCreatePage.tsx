import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { listCustomers } from '../../services/gasRegister/customers';
import { listAssets } from '../../services/gasRegister/assets';
import type { ConnectionAction, ConnectionReason } from '../../services/gasRegister/connection';
import { cn } from '../../lib/utils';

const ACTIONS: ConnectionAction[] = ['Connect', 'Disconnect', 'Reconnect', 'Suspend'];
const REASONS: ConnectionReason[] = ['End of contract', 'Non-payment', 'Safety', 'Customer request', 'Regulatory order', 'Other'];

export function ConnectionCreatePage() {
  const navigate = useNavigate();
  const customers = useMemo(() => listCustomers(), []);
  const assets = useMemo(() => listAssets(), []);
  const [customerId, setCustomerId] = useState('');
  const [action, setAction] = useState<ConnectionAction>('Connect');
  const [effectiveDate, setEffectiveDate] = useState('');
  const [reason, setReason] = useState<ConnectionReason>('Customer request');
  const [reasonNotes, setReasonNotes] = useState('');
  const [supportingDoc, setSupportingDoc] = useState('');
  const [assetId, setAssetId] = useState('');
  const [meterL, setMeterL] = useState('');
  const [meterScm, setMeterScm] = useState('');

  const supportingDocRequired = action === 'Disconnect' || action === 'Suspend';
  const canSubmit = !!customerId && !!action && !!effectiveDate && !!reason && (!supportingDocRequired || !!supportingDoc);

  function submit() {
    alert(`Connection event captured: ${action} for ${customers.find((c) => c.id === customerId)?.buildingName}.`);
    navigate('/gas-register/connection');
  }

  return (
    <div className="min-h-screen bg-neutral-25">
      <div className="border-b border-neutral-100 bg-white">
        <div className="max-w-[900px] mx-auto px-6 py-3 text-[12px]">
          <nav className="text-neutral-500">
            <Link to="/pps-dashboard" className="hover:text-doe-red">Home</Link>
            <span className="mx-2 text-neutral-300">›</span>
            <span>Gas Register</span>
            <span className="mx-2 text-neutral-300">›</span>
            <Link to="/gas-register/connection" className="hover:text-doe-red">Connection & Disconnection</Link>
            <span className="mx-2 text-neutral-300">›</span>
            <span className="text-ink-950 font-semibold">New Action</span>
          </nav>
        </div>
      </div>

      <div className="max-w-[900px] mx-auto px-6 py-7">
        <div className="mb-5">
          <div className="text-[10px] font-sans uppercase tracking-[0.22em] text-neutral-500 mb-1">BN 13 · Gas Register SDD</div>
          <h1 className="font-display font-extrabold text-[24px] text-ink-950">Connection / Disconnection Action</h1>
          <p className="text-[12.5px] text-neutral-500 mt-1">
            Raise a state change for a customer. Disconnect / Suspend require a supporting document and final meter reading per SDD §3.13.
          </p>
        </div>

        <div className="card p-5 space-y-5">
          <FormField label="Customer" required>
            <select value={customerId} onChange={(e) => setCustomerId(e.target.value)}
              className="w-full px-2 h-9 border border-neutral-200 rounded-md text-[12.5px] focus:outline-none focus:border-action-orange">
              <option value="">Select customer…</option>
              {customers.map((c) => <option key={c.id} value={c.id}>{c.buildingName} · {c.permitHolderName}</option>)}
            </select>
          </FormField>

          <div className="grid grid-cols-2 gap-4">
            <FormField label="Action" required>
              <select value={action} onChange={(e) => setAction(e.target.value as ConnectionAction)}
                className="w-full px-2 h-9 border border-neutral-200 rounded-md text-[12.5px] focus:outline-none focus:border-action-orange">
                {ACTIONS.map((a) => <option key={a} value={a}>{a}</option>)}
              </select>
            </FormField>
            <FormField label="Effective Date" required>
              <input type="date" value={effectiveDate} onChange={(e) => setEffectiveDate(e.target.value)}
                className="w-full px-2 h-9 border border-neutral-200 rounded-md text-[12.5px] focus:outline-none focus:border-action-orange" />
            </FormField>
            <FormField label="Reason" required>
              <select value={reason} onChange={(e) => setReason(e.target.value as ConnectionReason)}
                className="w-full px-2 h-9 border border-neutral-200 rounded-md text-[12.5px] focus:outline-none focus:border-action-orange">
                {REASONS.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
            </FormField>
            <FormField label="Linked Asset / Storage">
              <select value={assetId} onChange={(e) => setAssetId(e.target.value)}
                className="w-full px-2 h-9 border border-neutral-200 rounded-md text-[12.5px] focus:outline-none focus:border-action-orange">
                <option value="">None</option>
                {assets.map((a) => <option key={a.id} value={a.id}>{a.facilityName}</option>)}
              </select>
            </FormField>
            <FormField label="Meter Reading (Litres)">
              <input value={meterL} onChange={(e) => setMeterL(e.target.value.replace(/[^0-9]/g, ''))}
                className="w-full px-2 h-9 border border-neutral-200 rounded-md text-[12.5px] font-mono focus:outline-none focus:border-action-orange" placeholder="0" />
            </FormField>
            <FormField label="Meter Reading (SCM, auto-calc)">
              <input value={meterScm} onChange={(e) => setMeterScm(e.target.value.replace(/[^0-9]/g, ''))}
                className="w-full px-2 h-9 border border-neutral-200 rounded-md text-[12.5px] font-mono focus:outline-none focus:border-action-orange" placeholder="0" />
            </FormField>
          </div>

          <FormField label="Reason Notes (optional)">
            <textarea value={reasonNotes} onChange={(e) => setReasonNotes(e.target.value)}
              className="w-full px-2 py-1.5 border border-neutral-200 rounded-md text-[12.5px] focus:outline-none focus:border-action-orange" rows={2} />
          </FormField>

          <FormField label={`Supporting Document${supportingDocRequired ? ' *' : ' (optional)'}`}
            helper={supportingDocRequired ? 'Required for Disconnect and Suspend per SDD §3.13.' : undefined}>
            <input value={supportingDoc} onChange={(e) => setSupportingDoc(e.target.value)}
              className="w-full px-2 h-9 border border-neutral-200 rounded-md text-[12.5px] focus:outline-none focus:border-action-orange"
              placeholder="contract-termination.pdf — uploaded via file picker (production)" />
          </FormField>
        </div>

        <div className="mt-5 flex items-center justify-between">
          <Link to="/gas-register/connection" className="text-[12px] text-neutral-500 hover:text-doe-red">Cancel</Link>
          <button onClick={submit} disabled={!canSubmit}
            className={cn('btn-primary', !canSubmit && 'opacity-50 cursor-not-allowed')}>Submit Action</button>
        </div>
      </div>
    </div>
  );
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
