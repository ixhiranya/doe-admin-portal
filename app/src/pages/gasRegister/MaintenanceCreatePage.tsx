import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { listAssets } from '../../services/gasRegister/assets';
import { listEngineers } from '../../services/gasRegister/engineers';
import { listDrivers } from '../../services/gasRegister/drivers';
import type { MaintenanceActivityType, CalibrationResult } from '../../services/gasRegister/maintenance';
import { cn } from '../../lib/utils';

const ACTIVITIES: MaintenanceActivityType[] = [
  'System Modification', 'Material Change',
  'Gas Detector Calibration', 'Sensor Calibration',
  'Preventive Maintenance', 'Corrective Maintenance', 'Other',
];
const CALIBRATION_RESULTS: CalibrationResult[] = ['Pass', 'Pass with Notes', 'Fail', 'N/A'];

export function MaintenanceCreatePage() {
  const navigate = useNavigate();
  const assets = useMemo(() => listAssets(), []);
  const engineers = useMemo(() => listEngineers(), []);
  const drivers = useMemo(() => listDrivers(), []);
  const [facilityId, setFacilityId] = useState('');
  const [activityType, setActivityType] = useState<MaintenanceActivityType>('Preventive Maintenance');
  const [activityDate, setActivityDate] = useState('');
  const [performedById, setPerformedById] = useState('');
  const [description, setDescription] = useState('');
  const [calibrationResult, setCalibrationResult] = useState<CalibrationResult>('N/A');
  const [nextDueDate, setNextDueDate] = useState('');
  const [supportingDoc, setSupportingDoc] = useState('');

  const isCalibration = activityType === 'Gas Detector Calibration' || activityType === 'Sensor Calibration';
  const canSubmit = !!facilityId && !!activityType && !!activityDate && !!performedById && !!description && !!supportingDoc && (!isCalibration || !!calibrationResult);

  const performers = [
    ...engineers.map((e) => ({ id: e.id, label: `${e.name} (Engineer)` })),
    ...drivers.map((d) => ({ id: d.id, label: `${d.driverName} (Driver)` })),
  ];

  function submit() {
    alert('Maintenance record captured. Production would persist to the platform.');
    navigate('/gas-register/maintenance');
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
            <Link to="/gas-register/maintenance" className="hover:text-doe-red">Maintenance Records</Link>
            <span className="mx-2 text-neutral-300">›</span>
            <span className="text-ink-950 font-semibold">Submit Maintenance Record</span>
          </nav>
        </div>
      </div>

      <div className="max-w-[900px] mx-auto px-6 py-7">
        <div className="mb-5">
          <div className="text-[10px] font-sans uppercase tracking-[0.22em] text-neutral-500 mb-1">BN 15 · Gas Register SDD</div>
          <h1 className="font-display font-extrabold text-[24px] text-ink-950">Submit Maintenance Record</h1>
        </div>

        <div className="card p-5 space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Facility" required>
              <select value={facilityId} onChange={(e) => setFacilityId(e.target.value)}
                className="w-full px-2 h-9 border border-neutral-200 rounded-md text-[12.5px] focus:outline-none focus:border-action-orange">
                <option value="">Select facility…</option>
                {assets.map((a) => <option key={a.id} value={a.id}>{a.facilityName}</option>)}
              </select>
            </FormField>
            <FormField label="Activity Type" required>
              <select value={activityType} onChange={(e) => setActivityType(e.target.value as MaintenanceActivityType)}
                className="w-full px-2 h-9 border border-neutral-200 rounded-md text-[12.5px] focus:outline-none focus:border-action-orange">
                {ACTIVITIES.map((a) => <option key={a} value={a}>{a}</option>)}
              </select>
            </FormField>
            <FormField label="Activity Date" required>
              <input type="date" value={activityDate} onChange={(e) => setActivityDate(e.target.value)}
                className="w-full px-2 h-9 border border-neutral-200 rounded-md text-[12.5px] focus:outline-none focus:border-action-orange" />
            </FormField>
            <FormField label="Performed By" required>
              <select value={performedById} onChange={(e) => setPerformedById(e.target.value)}
                className="w-full px-2 h-9 border border-neutral-200 rounded-md text-[12.5px] focus:outline-none focus:border-action-orange">
                <option value="">Select person…</option>
                {performers.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
              </select>
            </FormField>
            {isCalibration && (
              <>
                <FormField label="Calibration Result" required>
                  <select value={calibrationResult} onChange={(e) => setCalibrationResult(e.target.value as CalibrationResult)}
                    className="w-full px-2 h-9 border border-neutral-200 rounded-md text-[12.5px] focus:outline-none focus:border-action-orange">
                    {CALIBRATION_RESULTS.map((r) => <option key={r} value={r}>{r}</option>)}
                  </select>
                </FormField>
                <FormField label="Next Due Date">
                  <input type="date" value={nextDueDate} onChange={(e) => setNextDueDate(e.target.value)}
                    className="w-full px-2 h-9 border border-neutral-200 rounded-md text-[12.5px] focus:outline-none focus:border-action-orange" />
                </FormField>
              </>
            )}
          </div>

          <FormField label="Description" required>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)}
              className="w-full px-2 py-1.5 border border-neutral-200 rounded-md text-[12.5px] focus:outline-none focus:border-action-orange" rows={3}
              placeholder="Describe the activity — scope, equipment, findings, follow-ups." />
          </FormField>

          <FormField label="Supporting Document" required>
            <input value={supportingDoc} onChange={(e) => setSupportingDoc(e.target.value)}
              className="w-full px-2 h-9 border border-neutral-200 rounded-md text-[12.5px] focus:outline-none focus:border-action-orange"
              placeholder="maintenance-report.pdf — uploaded via file picker (production)" />
          </FormField>
        </div>

        <div className="mt-5 flex items-center justify-between">
          <Link to="/gas-register/maintenance" className="text-[12px] text-neutral-500 hover:text-doe-red">Cancel</Link>
          <button onClick={submit} disabled={!canSubmit}
            className={cn('btn-primary', !canSubmit && 'opacity-50 cursor-not-allowed')}>Submit Record</button>
        </div>
      </div>
    </div>
  );
}

function FormField({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[10.5px] font-sans uppercase tracking-wider text-neutral-500 mb-1">
        {label}{required && <span className="text-doe-red ml-0.5">*</span>}
      </label>
      {children}
    </div>
  );
}
