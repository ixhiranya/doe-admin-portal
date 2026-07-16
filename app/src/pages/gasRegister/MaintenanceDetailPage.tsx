import { useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getMaintenance, maintenanceForFacility } from '../../services/gasRegister/maintenance';
import { ModuleDetailLayout, DetailCard, Field, FieldGrid } from './ModuleDetailLayout';
import { cn } from '../../lib/utils';

export function MaintenanceDetailPage() {
  const { recordId } = useParams<{ recordId: string }>();
  const r = useMemo(() => recordId ? getMaintenance(recordId) : undefined, [recordId]);
  const navigate = useNavigate();

  if (!r) {
    return (
      <div className="min-h-screen bg-neutral-25 grid place-items-center">
        <div className="card p-10 text-center">
          <div className="text-4xl mb-2">🔎</div>
          <div className="font-display font-bold text-[15px] text-ink-950">Record not found</div>
          <button onClick={() => navigate('/gas-register/maintenance')} className="mt-4 btn-primary">Back to records</button>
        </div>
      </div>
    );
  }

  const today = new Date().toISOString().slice(0, 10);
  const overdue = r.nextDueDate && r.nextDueDate < today;
  const facilityHistory = maintenanceForFacility(r.facilityId);

  return (
    <ModuleDetailLayout
      parentLabel="Maintenance Records" parentHref="/gas-register/maintenance"
      current={r.id} sddRef="BN 15 · Gas Register SDD"
      iconText="MR" iconAccent="#6366F1"
      eyebrow={r.activityType}
      title={`${r.activityType} · ${r.facilityName}`}
      subtitle={`Performed by ${r.performedByName} (${r.performedByRole}) on ${formatDate(r.activityDate)}`}
      status={r.calibrationResult ? {
        label: r.calibrationResult,
        tone: r.calibrationResult === 'Pass' ? 'success' :
              r.calibrationResult === 'Pass with Notes' ? 'warning' :
              r.calibrationResult === 'Fail' ? 'danger' : 'neutral',
      } : undefined}
      meta={
        <>
          <span className="font-mono text-white/70">{r.id}</span>
          <span className="text-white/40">·</span>
          <span className="text-white/70">{r.permitHolderName}</span>
        </>
      }
      kpis={[
        { label: 'Activity', value: r.activityType, tone: 'ink' },
        { label: 'Activity Date', value: formatDate(r.activityDate), tone: 'ink' },
        { label: 'Calibration', value: r.calibrationResult ?? '—',
          tone: r.calibrationResult === 'Pass' ? 'success' :
                r.calibrationResult === 'Fail' ? 'danger' :
                r.calibrationResult === 'Pass with Notes' ? 'warning' : 'ink' },
        { label: 'Next Due', value: r.nextDueDate ? formatDate(r.nextDueDate) : '—',
          tone: overdue ? 'danger' : r.nextDueDate ? 'info' : 'ink' },
      ]}
    >
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          <DetailCard title="Activity">
            <FieldGrid>
              <Field label="Activity Type" value={r.activityType} />
              <Field label="Activity Date" value={formatDate(r.activityDate)} />
              <Field label="Performed By" value={`${r.performedByName} (${r.performedByRole})`} />
              {r.calibrationResult && <Field label="Calibration Result" value={r.calibrationResult}
                tone={r.calibrationResult === 'Pass' ? 'success' :
                      r.calibrationResult === 'Fail' ? 'danger' :
                      r.calibrationResult === 'Pass with Notes' ? 'warning' : undefined} />}
              {r.nextDueDate && <Field label="Next Due Date" value={formatDate(r.nextDueDate)} tone={overdue ? 'danger' : undefined} />}
            </FieldGrid>
          </DetailCard>

          <DetailCard title="Linkage">
            <FieldGrid>
              <Field label="Facility" value={r.facilityName} />
              <Field label="Linked Asset" value={r.linkedAssetName ?? '—'} />
              <Field label="Supporting Document" value={r.supportingDocument?.fileName ?? '—'} mono />
              <Field label="Permit Holder" value={r.permitHolderName} />
            </FieldGrid>
          </DetailCard>

          <DetailCard title="Description">
            <div className="text-[12.5px] text-ink-950 leading-relaxed whitespace-pre-wrap">{r.description}</div>
          </DetailCard>
        </div>

        {/* Facility history sidebar */}
        <DetailCard title="Facility Activity Log" subtitle={`${facilityHistory.length} records for ${r.facilityName}`}>
          {facilityHistory.length === 0 ? (
            <div className="text-[11.5px] text-neutral-500">No prior records.</div>
          ) : (
            <div className="space-y-2">
              {facilityHistory.map((h) => (
                <button key={h.id} onClick={() => navigate(`/gas-register/maintenance/${h.id}`)}
                  className={cn('block w-full text-left rounded-md border px-3 py-2 transition',
                    h.id === r.id ? 'border-action-orange bg-action-orange-soft' : 'border-neutral-100 hover:border-neutral-300')}>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11.5px] font-semibold text-ink-950 truncate">{h.activityType}</span>
                    <span className="text-[10.5px] font-mono text-neutral-500">{formatDate(h.activityDate)}</span>
                  </div>
                  <div className="text-[10.5px] text-neutral-500 mt-0.5 truncate">{h.performedByName} · {h.performedByRole}</div>
                </button>
              ))}
            </div>
          )}
        </DetailCard>
      </div>
    </ModuleDetailLayout>
  );
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}
