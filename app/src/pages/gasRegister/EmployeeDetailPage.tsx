// =============================================================================
// Gas Register · BN 5 — Employee Detail
// -----------------------------------------------------------------------------
// Migrated to the shared ModuleDetailLayout. Per SDD §3.5 employees are read-
// only from ASATEEL — the hero status chip surfaces this source.
// =============================================================================
import { useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getEmployee, employeeSourceLabel } from '../../services/gasRegister/employees';
import { ModuleDetailLayout, DetailCard, Field, FieldGrid } from './ModuleDetailLayout';

export function EmployeeDetailPage() {
  const { employeeId } = useParams<{ employeeId: string }>();
  const e = useMemo(() => employeeId ? getEmployee(employeeId) : undefined, [employeeId]);
  const navigate = useNavigate();

  if (!e) {
    return (
      <div className="min-h-screen bg-neutral-25 grid place-items-center">
        <div className="card p-10 text-center">
          <div className="text-4xl mb-2">🔎</div>
          <div className="font-display font-bold text-[15px] text-ink-950">Employee not found</div>
          <button onClick={() => navigate('/gas-register/employees')} className="mt-4 btn-primary">Back to employees</button>
        </div>
      </div>
    );
  }

  const ageYears    = Math.floor((Date.now() - new Date(e.dateOfBirth).getTime()) / (86_400_000 * 365.25));
  const tenureYears = (Date.now() - new Date(e.dateOfHiring).getTime()) / (86_400_000 * 365.25);
  const tenureLabel = tenureYears >= 1 ? `${tenureYears.toFixed(1)} yrs` : `${Math.floor(tenureYears * 12)} mo`;
  const certDays = Math.floor((new Date(e.certificateExpiryDate).getTime() - Date.now()) / 86_400_000);
  const certTone: 'success' | 'warning' | 'danger' =
    certDays < 0 ? 'danger' : certDays < 90 ? 'warning' : 'success';
  const certStatus = certDays < 0 ? 'Expired' : certDays < 90 ? 'Expiring soon' : 'Current';

  return (
    <ModuleDetailLayout
      parentLabel="Employee Master" parentHref="/gas-register/employees"
      current={e.name} sddRef="BN 5 · Gas Register SDD"
      iconText={initials(e.name)} iconAccent="#0E76A8"
      eyebrow="Employee · Read-only from ASATEEL"
      title={e.name}
      subtitle={`${e.permitHolderName} · Job ${e.jobId} · ${e.section}`}
      status={{ label: employeeSourceLabel(e.source), tone: 'info' }}
      meta={
        <>
          <span className="font-mono text-white/70">{e.id}</span>
          <span className="text-white/40">·</span>
          <span className="text-white/70">{e.professionInDetail}</span>
        </>
      }
      kpis={[
        { label: 'Age',           value: `${ageYears} yrs`,                                                              tone: 'ink' },
        { label: 'Tenure',        value: tenureLabel,                                                                    tone: 'info' },
        { label: 'Monthly hours', value: `${e.monthlyWorkingHours} h`,                                                   tone: 'ink' },
        { label: 'Cert. expiry',  value: `${formatDate(e.certificateExpiryDate)} · ${certStatus}`,                       tone: certTone },
      ]}
    >
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          <DetailCard title="Identity">
            <FieldGrid>
              <Field label="Job ID"      value={e.jobId} mono />
              <Field label="Emirates ID" value={e.emiratesId} mono />
              <Field label="Gender"      value={e.gender} />
              <Field label="Date of birth" value={formatDate(e.dateOfBirth)} />
              <Field label="Mobile"      value={e.mobile} mono />
              <Field label="Email"       value={e.email} mono />
            </FieldGrid>
          </DetailCard>

          <DetailCard title="Role">
            <FieldGrid>
              <Field label="Section"        value={e.section} />
              <Field label="Profession"     value={e.professionInDetail} />
              <Field label="Qualification"  value={e.qualification} />
              <Field label="Permit holder"  value={e.permitHolderName} />
              <Field label="Date of hiring" value={formatDate(e.dateOfHiring)} />
              <Field label="Tenure"         value={tenureLabel} />
            </FieldGrid>
          </DetailCard>

          <DetailCard title="Gas Training & Certification" subtitle="Recorded training (per SDD §3.5.1) + ADQCC certificate status">
            <FieldGrid cols={1}>
              <Field label="Training received in the field of gas" value={e.trainingInGas} />
            </FieldGrid>
            <div className="mt-4">
              <FieldGrid>
                <Field label="Monthly working hours" value={`${e.monthlyWorkingHours} h`} />
                <Field label="ADQCC certificate expiry"   value={formatDate(e.certificateExpiryDate)} mono tone={certTone} />
                <Field label="Status"                value={certStatus} tone={certTone} />
              </FieldGrid>
            </div>
          </DetailCard>

          <DetailCard title="Attachments" subtitle={`${e.attachments.length} document${e.attachments.length === 1 ? '' : 's'} on file`}>
            {e.attachments.length === 0 ? (
              <div className="text-[12.5px] text-neutral-500">No documents uploaded yet.</div>
            ) : (
              <FieldGrid>
                {e.attachments.map((a, i) => (
                  <Field key={i} label={a.name}
                    value={
                      <span className="block">
                        <span className="font-mono">{a.fileName}</span>
                        <span className="block text-[10.5px] text-neutral-500 mt-0.5">Uploaded {formatDate(a.uploadedAt)}</span>
                      </span>
                    } />
                ))}
              </FieldGrid>
            )}
          </DetailCard>
        </div>

        <DetailCard title="Record info">
          <FieldGrid cols={1}>
            <Field label="Employee ID"   value={e.id} mono />
            <Field label="Source"        value={employeeSourceLabel(e.source)} />
            <Field label="Created"       value={new Date(e.createdAt).toLocaleString('en-GB')} />
            <Field label="Last updated"  value={new Date(e.updatedAt).toLocaleString('en-GB')} />
          </FieldGrid>
        </DetailCard>
      </div>
    </ModuleDetailLayout>
  );
}

function initials(name: string): string {
  const parts = name.replace(/^(eng\.?|dr\.?|mr\.?|mrs\.?|ms\.?)\s+/i, '').trim().split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0]?.toUpperCase() ?? '').join('') || '?';
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}
