import { useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getEngineer, engineerCompliance } from '../../services/gasRegister/engineers';
import { ModuleDetailLayout, DetailCard, Field, FieldGrid } from './ModuleDetailLayout';
import { cn } from '../../lib/utils';

export function EngineerDetailPage() {
  const { engineerId } = useParams<{ engineerId: string }>();
  const e = useMemo(() => engineerId ? getEngineer(engineerId) : undefined, [engineerId]);
  const navigate = useNavigate();

  if (!e) {
    return (
      <div className="min-h-screen bg-neutral-25 grid place-items-center">
        <div className="card p-10 text-center">
          <div className="text-4xl mb-2">🔎</div>
          <div className="font-display font-bold text-[15px] text-ink-950">Engineer not found</div>
          <button onClick={() => navigate('/gas-register/engineers')} className="mt-4 btn-primary">Back to engineers</button>
        </div>
      </div>
    );
  }

  const compliance = engineerCompliance(e);
  const today = new Date().toISOString().slice(0, 10);
  const certDaysLeft = e.certificateExpiryDate ? Math.round((new Date(e.certificateExpiryDate).getTime() - Date.now()) / 86400000) : null;

  return (
    <ModuleDetailLayout
      parentLabel="Engineers Master" parentHref="/gas-register/engineers"
      current={e.name} sddRef="BN 7 · Gas Register SDD"
      iconText={initials(e.name)} iconAccent="#7B3FE4"
      eyebrow="Engineer"
      title={e.name}
      subtitle={`${e.permitHolderName} · ${e.profession} · ${e.qualification}`}
      status={{ label: compliance, tone: compliance === 'Compliant' ? 'success' : 'danger' }}
      meta={
        <>
          <span className="font-mono text-white/70">{e.id}</span>
          <span className="text-white/40">·</span>
          <span className="text-white/70">{e.source === 'asateel' ? 'Fetched from ASATEEL' : 'DOE Engineer Registration'}</span>
        </>
      }
      kpis={[
        { label: 'ADQCC status', value: e.adqccStatus, tone: e.adqccStatus === 'Valid' ? 'success' : 'danger' },
        { label: 'Cert expires in', value: certDaysLeft === null ? '—' : certDaysLeft >= 0 ? `${certDaysLeft} days` : 'Expired',
          tone: certDaysLeft === null ? 'ink' : certDaysLeft < 0 ? 'danger' : certDaysLeft <= 30 ? 'warning' : 'success' },
        { label: 'Gov conformity', value: e.govEntityConformity, tone: e.govEntityConformity === 'Not Verified' ? 'warning' : 'info' },
        { label: 'Linked facilities', value: e.linkedFacilities.length, tone: 'info' },
      ]}
    >
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <DetailCard title="Engineer Identity">
          <FieldGrid>
            <Field label="Engineer ID" value={e.id} mono />
            <Field label="Emirates ID" value={e.idNumber} mono />
            <Field label="Name" value={e.name} />
            <Field label="Source" value={e.source === 'asateel' ? 'ASATEEL' : 'DOE Engineer Registration'} />
            {e.mobile && <Field label="Mobile" value={e.mobile} mono />}
            {e.email && <Field label="Email" value={e.email} mono />}
          </FieldGrid>
        </DetailCard>

        <DetailCard title="Profession & Qualification">
          <FieldGrid>
            <Field label="Profession" value={e.profession} />
            <Field label="Qualification" value={e.qualification} />
          </FieldGrid>
        </DetailCard>

        <DetailCard title="ADQCC Certification">
          <FieldGrid>
            <Field label="Status" value={e.adqccStatus} tone={e.adqccStatus === 'Valid' ? 'success' : 'danger'} />
            <Field label="Certificate Expiry" value={e.certificateExpiryDate ? formatDate(e.certificateExpiryDate) : '—'}
              tone={e.certificateExpiryDate && e.certificateExpiryDate < today ? 'danger' : undefined} />
          </FieldGrid>
        </DetailCard>

        <DetailCard title="Government Entity Conformity">
          <FieldGrid>
            <Field label="Conformity" value={e.govEntityConformity}
              tone={e.govEntityConformity === 'Not Verified' ? 'warning' : undefined} />
          </FieldGrid>
        </DetailCard>

        <DetailCard title="Linked Facilities / Projects" className="lg:col-span-2">
          {e.linkedFacilities.length === 0 ? (
            <div className="text-[12px] text-neutral-500">No facilities linked.</div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {e.linkedFacilities.map((f) => (
                <span key={f} className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-neutral-25 border border-neutral-100 text-[12.5px] text-ink-950">
                  <span className="w-1.5 h-1.5 rounded-full bg-violet-500" /> {f}
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
  return name.replace(/^(Eng\.|Dr\.|Mr\.|Ms\.)\s+/, '').split(/\s+/).map((p) => p[0]).filter(Boolean).slice(0, 2).join('').toUpperCase();
}
function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}
void cn;
