import { useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getFleetMovement } from '../../services/gasRegister/fleetMovement';
import { gasTypeById, productTypeById, formatVolumeDual } from '../../services/gasRegister/technical';
import { ModuleDetailLayout, DetailCard, Field, FieldGrid } from './ModuleDetailLayout';

export function FleetMovementDetailPage() {
  const { movementId } = useParams<{ movementId: string }>();
  const m = useMemo(() => movementId ? getFleetMovement(movementId) : undefined, [movementId]);
  const navigate = useNavigate();

  if (!m) {
    return (
      <div className="min-h-screen bg-neutral-25 grid place-items-center">
        <div className="card p-10 text-center">
          <div className="text-4xl mb-2">🔎</div>
          <div className="font-display font-bold text-[15px] text-ink-950">Movement not found</div>
          <button onClick={() => navigate('/gas-register/fleet-movement')} className="mt-4 btn-primary">Back to movements</button>
        </div>
      </div>
    );
  }

  const gas = gasTypeById(m.gasType);
  const product = productTypeById(m.productType);
  const statusTone = m.status === 'Delivered' ? 'success' : m.status === 'In Transit' ? 'info' : 'warning';

  return (
    <ModuleDetailLayout
      parentLabel="Fleet Movement" parentHref="/gas-register/fleet-movement"
      current={m.trafficId} sddRef="BN 11 · Gas Register SDD"
      iconText="FM" iconAccent="#0F766E"
      eyebrow="Fleet Movement"
      title={`Movement ${m.trafficId}`}
      subtitle={`${m.permitHolderName} · Permission ${m.permissionNumber} · Route ${m.routeReference}`}
      status={{ label: m.status, tone: statusTone }}
      meta={
        <>
          <span className="font-mono text-white/70">{m.id}</span>
          <span className="text-white/40">·</span>
          <span className="text-white/70">{new Date(m.movementDateTime).toLocaleString('en-GB')}</span>
        </>
      }
      kpis={[
        { label: 'Quantity transferred', value: formatVolumeDual(m.quantity, m.unit, m.gasType), tone: 'info' },
        { label: 'Type of Gas',          value: gas?.shortLabel ?? m.gasType, tone: 'ink' },
        { label: 'Product Type',         value: product?.label ?? m.productType, tone: 'ink' },
        { label: 'Status',               value: m.status, tone: statusTone === 'success' ? 'success' : statusTone === 'warning' ? 'warning' : 'info' },
      ]}
    >
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <DetailCard title="ASATEEL Identifiers" subtitle="Read-only · fetched from the ASATEEL system">
          <FieldGrid>
            <Field label="Traffic ID" value={m.trafficId} mono />
            <Field label="Permission Number" value={m.permissionNumber} mono />
            <Field label="Route Reference" value={m.routeReference} mono />
            <Field label="Movement Date / Time" value={new Date(m.movementDateTime).toLocaleString('en-GB')} />
          </FieldGrid>
        </DetailCard>

        <DetailCard title="Driver · Operator · Vehicle">
          <FieldGrid>
            <Field label="Driver" value={m.driverName} />
            <Field label="Operator" value={m.operatorName} />
            <Field label="Vehicle Plate" value={m.vehiclePlate} mono />
            <Field label="Permit Holder" value={m.permitHolderName} />
          </FieldGrid>
        </DetailCard>

        <DetailCard title="Gas Specifics" subtitle="Captured by the Gas System Company at trip submission time">
          <FieldGrid>
            <Field label="Quantity" value={formatVolumeDual(m.quantity, m.unit, m.gasType)} mono />
            <Field label="Unit Selected" value={m.unit} mono />
            <Field label="Type of Gas" value={gas?.label ?? m.gasType} />
            <Field label="Product Type" value={product?.label ?? m.productType} />
          </FieldGrid>
        </DetailCard>

        <DetailCard title="Endpoints">
          <FieldGrid cols={1}>
            <Field label="Origin Facility" value={m.originFacilityName} />
            <Field label="Destination" value={m.destinationName} />
          </FieldGrid>
          <div className="mt-3 p-3 rounded-md bg-neutral-25 border border-neutral-100 flex items-center gap-2 text-[12px]">
            <span className="text-teal-700 font-semibold">{m.originFacilityName}</span>
            <span className="text-neutral-400">→</span>
            <span className="text-doe-red font-semibold">{m.destinationName}</span>
          </div>
        </DetailCard>
      </div>
    </ModuleDetailLayout>
  );
}
