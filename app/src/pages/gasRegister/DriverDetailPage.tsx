import { useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getDriver, driverCompliance } from '../../services/gasRegister/drivers';
import { ModuleDetailLayout, DetailCard, Field, FieldGrid } from './ModuleDetailLayout';
import { cn } from '../../lib/utils';

export function DriverDetailPage() {
  const { driverId } = useParams<{ driverId: string }>();
  const d = useMemo(() => driverId ? getDriver(driverId) : undefined, [driverId]);
  const navigate = useNavigate();

  if (!d) {
    return (
      <div className="min-h-screen bg-neutral-25 grid place-items-center">
        <div className="card p-10 text-center">
          <div className="text-4xl mb-2">🔎</div>
          <div className="font-display font-bold text-[15px] text-ink-950">Driver not found</div>
          <button onClick={() => navigate('/gas-register/drivers')} className="mt-4 btn-primary">Back to drivers</button>
        </div>
      </div>
    );
  }

  const compliance = driverCompliance(d);
  const today = new Date().toISOString().slice(0, 10);
  const licDaysLeft = Math.round((new Date(d.licenseExpiryDate).getTime() - Date.now()) / 86400000);
  const certDaysLeft = d.certificateExpiryDate ? Math.round((new Date(d.certificateExpiryDate).getTime() - Date.now()) / 86400000) : null;

  return (
    <ModuleDetailLayout
      parentLabel="Drivers Master" parentHref="/gas-register/drivers"
      current={d.driverName} sddRef="BN 6 · Gas Register SDD"
      iconText={initials(d.driverName)} iconAccent="#3B82F6"
      eyebrow="Driver"
      title={d.driverName}
      subtitle={`${d.permitHolderName} · ${d.nationality} · License ${d.licenseType}`}
      status={{ label: compliance, tone: compliance === 'Compliant' ? 'success' : 'danger' }}
      meta={
        <>
          <span className="font-mono text-white/70">{d.id}</span>
          <span className="text-white/40">·</span>
          <span className="text-white/70">Fetched from ASATEEL</span>
        </>
      }
      kpis={[
        { label: 'License expires in', value: licDaysLeft >= 0 ? `${licDaysLeft} days` : 'Expired',
          tone: licDaysLeft < 0 ? 'danger' : licDaysLeft <= 30 ? 'warning' : 'success' },
        { label: 'ADCDA training', value: d.adcdaTrainingStatus,
          tone: d.adcdaTrainingStatus === 'Valid' ? 'success' : 'danger' },
        { label: 'Cert expires in', value: certDaysLeft === null ? '—' : certDaysLeft >= 0 ? `${certDaysLeft} days` : 'Expired',
          tone: certDaysLeft === null ? 'ink' : certDaysLeft < 0 ? 'danger' : certDaysLeft <= 30 ? 'warning' : 'success' },
        { label: 'Linked vehicles', value: d.linkedVehicles.length, tone: 'info' },
      ]}
    >
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <DetailCard title="Driver Identity">
          <FieldGrid>
            <Field label="Driver ID" value={d.id} mono />
            <Field label="Emirates ID" value={d.idNumber} mono />
            <Field label="Driver Name" value={d.driverName} />
            <Field label="Nationality" value={d.nationality} />
            <Field label="Mobile" value={d.mobile} mono />
            {d.email && <Field label="Email" value={d.email} mono />}
          </FieldGrid>
        </DetailCard>

        <DetailCard title="Permit & Source">
          <FieldGrid>
            <Field label="Permit Holder" value={d.permitHolderName} />
            <Field label="Source System" value="ASATEEL" />
          </FieldGrid>
          <div className="mt-3 inline-flex items-center gap-1.5 px-2 h-5 rounded bg-info-soft text-info-500 text-[10px] font-semibold uppercase tracking-wider">
            <span className="w-1.5 h-1.5 rounded-full bg-info-500" />
            Read-only — fetched from ASATEEL per SDD §3.6
          </div>
        </DetailCard>

        <DetailCard title="Driving License">
          <FieldGrid>
            <Field label="License Type" value={d.licenseType} />
            <Field label="License Number" value={d.licenseNumber} mono />
            <Field label="Expiry Date" value={formatDate(d.licenseExpiryDate)}
              tone={d.licenseExpiryDate < today ? 'danger' : licDaysLeft <= 30 ? 'warning' : undefined} />
            <Field label="Status" value={d.licenseExpiryDate < today ? 'Expired' : 'Valid'}
              tone={d.licenseExpiryDate < today ? 'danger' : 'success'} />
          </FieldGrid>
        </DetailCard>

        <DetailCard title="ADCDA Training (Hazardous Materials)">
          <FieldGrid>
            <Field label="Training Status" value={d.adcdaTrainingStatus}
              tone={d.adcdaTrainingStatus === 'Valid' ? 'success' : 'danger'} />
            <Field label="Certificate Expiry" value={d.certificateExpiryDate ? formatDate(d.certificateExpiryDate) : '—'}
              tone={d.certificateExpiryDate && d.certificateExpiryDate < today ? 'danger' : undefined} />
          </FieldGrid>
        </DetailCard>

        <DetailCard title="Linked Vehicles" className="lg:col-span-2">
          {d.linkedVehicles.length === 0 ? (
            <div className="text-[12px] text-neutral-500">No vehicles linked.</div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {d.linkedVehicles.map((v) => (
                <span key={v} className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-neutral-25 border border-neutral-100">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-neutral-500">Plate</span>
                  <span className="text-[12.5px] font-mono font-semibold text-ink-950">{v}</span>
                </span>
              ))}
            </div>
          )}
        </DetailCard>
      </div>
    </ModuleDetailLayout>
  );
}

function initials(name: string): string {
  return name.split(/\s+/).map((p) => p[0]).filter(Boolean).slice(0, 2).join('').toUpperCase();
}
function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}
void cn;
