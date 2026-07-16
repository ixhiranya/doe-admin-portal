// =============================================================================
// Gas Register · BN 4 — Fleet Detail
// -----------------------------------------------------------------------------
// Migrated to the shared ModuleDetailLayout. Per SDD §3.4 every fleet record
// is fetched from ASATEEL — surfaced explicitly on the hero subtitle and
// status chip.
// =============================================================================
import { useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getFleet, sourceLabel, formatLiters } from '../../services/gasRegister/fleet';
import { ModuleDetailLayout, DetailCard, Field, FieldGrid } from './ModuleDetailLayout';

export function FleetDetailPage() {
  const { fleetId } = useParams<{ fleetId: string }>();
  const f = useMemo(() => fleetId ? getFleet(fleetId) : undefined, [fleetId]);
  const navigate = useNavigate();

  if (!f) {
    return (
      <div className="min-h-screen bg-neutral-25 grid place-items-center">
        <div className="card p-10 text-center">
          <div className="text-4xl mb-2">🔎</div>
          <div className="font-display font-bold text-[15px] text-ink-950">Vehicle not found</div>
          <button onClick={() => navigate('/gas-register/fleet')} className="mt-4 btn-primary">Back to fleet</button>
        </div>
      </div>
    );
  }

  const days = Math.floor((Date.now() - new Date(f.dateOfInspection).getTime()) / 86_400_000);
  const insLabel  = days < 0 ? `in ${Math.abs(days)} d` : days < 30 ? `${days} d ago` : days < 365 ? `${days} d ago` : `${(days / 365).toFixed(1)} yrs ago`;
  const insTone: 'ink' | 'warning' | 'danger' = days > 365 ? 'danger' : days > 300 ? 'warning' : 'ink';

  return (
    <ModuleDetailLayout
      parentLabel="Fleet Master" parentHref="/gas-register/fleet"
      current={f.plateNumber} sddRef="BN 4 · Gas Register SDD"
      iconText="FL" iconAccent="#E89B4C"
      eyebrow="Vehicle · Read-only from ASATEEL"
      title={`${f.plateNumber} · ${f.typeOfVehicle}`}
      subtitle={`${f.permitHolderName} · ${f.unitType} · Traffic ID ${f.trafficId}`}
      status={{ label: 'Fetched from ASATEEL', tone: 'info' }}
      meta={
        <>
          <span className="font-mono text-white/70">{f.id}</span>
          <span className="text-white/40">·</span>
          <span className="text-white/70">{sourceLabel(f.source)}</span>
        </>
      }
      kpis={[
        { label: 'Plate',           value: f.plateNumber,                                            tone: 'ink' },
        { label: 'Designation cap', value: f.vehicleDesignationCapacityLiters > 0 ? formatLiters(f.vehicleDesignationCapacityLiters) : '—', tone: 'info' },
        { label: 'CDC number',      value: f.civilDefenceCertificateNumber,                          tone: 'ink' },
        { label: 'Last inspection', value: `${formatDate(f.dateOfInspection)} · ${insLabel}`,        tone: insTone },
      ]}
    >
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          <DetailCard title="ASATEEL Identifiers" subtitle="Read-only · synced from the ASATEEL system">
            <FieldGrid>
              <Field label="Traffic ID"          value={f.trafficId} mono />
              <Field label="Plate number"        value={f.plateNumber} mono />
              <Field label="Type of vehicle"     value={f.typeOfVehicle} />
              <Field label="Unit type"           value={f.unitType} />
            </FieldGrid>
          </DetailCard>

          <DetailCard title="Civil Defence Certification">
            <FieldGrid>
              <Field label="Civil Defence cert. #" value={f.civilDefenceCertificateNumber} mono />
              <Field label="Date of inspection"    value={formatDate(f.dateOfInspection)} tone={insTone === 'danger' ? 'danger' : insTone === 'warning' ? 'warning' : undefined} />
            </FieldGrid>
          </DetailCard>

          <DetailCard title="Capacity & Owner">
            <FieldGrid>
              <Field label="Designation capacity (Litres)"
                value={f.vehicleDesignationCapacityLiters > 0 ? `${f.vehicleDesignationCapacityLiters.toLocaleString()} L` : '—'}
                mono />
              <Field label="Designation capacity (display)"
                value={f.vehicleDesignationCapacityLiters > 0 ? formatLiters(f.vehicleDesignationCapacityLiters) : '—'} />
              <Field label="Permit holder" value={f.permitHolderName} />
              <Field label="Source"        value={sourceLabel(f.source)} />
            </FieldGrid>
          </DetailCard>

          <DetailCard title="Attachments" subtitle={`${f.attachments.length} document slot${f.attachments.length === 1 ? '' : 's'}`}>
            <FieldGrid>
              {f.attachments.map((a, i) => (
                <Field key={i} label={a.name}
                  value={a.fileName ? a.fileName : <span className="text-neutral-400 italic">No attachment</span>}
                  mono={!!a.fileName} />
              ))}
            </FieldGrid>
          </DetailCard>
        </div>

        <DetailCard title="Record info">
          <FieldGrid cols={1}>
            <Field label="Vehicle ID"    value={f.id} mono />
            <Field label="Source"        value={sourceLabel(f.source)} />
            <Field label="Created"       value={new Date(f.createdAt).toLocaleString('en-GB')} />
            <Field label="Last updated"  value={new Date(f.updatedAt).toLocaleString('en-GB')} />
          </FieldGrid>
        </DetailCard>
      </div>
    </ModuleDetailLayout>
  );
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}
