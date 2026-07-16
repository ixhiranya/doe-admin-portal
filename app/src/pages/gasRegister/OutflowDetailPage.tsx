// =============================================================================
// Gas Register · BN 10 — Daily Outflow Detail
// -----------------------------------------------------------------------------
// Migrated to the shared ModuleDetailLayout for consistency with the rest of
// the Gas Register view pages.
// =============================================================================
import { useMemo } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { getOutflow, formatLiters } from '../../services/gasRegister/gasFlow';
import { ModuleDetailLayout, DetailCard, Field, FieldGrid } from './ModuleDetailLayout';

export function OutflowDetailPage() {
  const { outflowId } = useParams<{ outflowId: string }>();
  const r = useMemo(() => outflowId ? getOutflow(outflowId) : undefined, [outflowId]);
  const navigate = useNavigate();

  if (!r) {
    return (
      <div className="min-h-screen bg-neutral-25 grid place-items-center">
        <div className="card p-10 text-center">
          <div className="text-4xl mb-2">🔎</div>
          <div className="font-display font-bold text-[15px] text-ink-950">Outflow record not found</div>
          <button onClick={() => navigate('/gas-register/outflow')} className="mt-4 btn-primary">Back to outflow</button>
        </div>
      </div>
    );
  }

  return (
    <ModuleDetailLayout
      parentLabel="Daily Outflow" parentHref="/gas-register/outflow"
      current={r.id} sddRef="BN 10 · Gas Register SDD"
      iconText="OUT" iconAccent="#D08338"
      eyebrow="Daily Outflow Submission"
      title={`${formatLiters(r.quantityLiters)} delivered`}
      subtitle={`${r.permitHolderName} · ${r.gasType} · delivered to ${r.customerName}`}
      status={{ label: r.customerType, tone: r.customerType === 'Residential' ? 'info' : 'warning' }}
      meta={
        <>
          <span className="font-mono text-white/70">{r.id}</span>
          <span className="text-white/40">·</span>
          <span className="text-white/70">{formatDate(r.date)}</span>
        </>
      }
      kpis={[
        { label: 'Quantity',      value: formatLiters(r.quantityLiters), tone: 'warning' },
        { label: 'Gas type',      value: r.gasType,                       tone: 'ink' },
        { label: 'Date',          value: formatDate(r.date),              tone: 'ink' },
        { label: 'Customer type', value: r.customerType,                  tone: r.customerType === 'Residential' ? 'info' : 'warning' },
      ]}
    >
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          <DetailCard title="Submission Details">
            <FieldGrid>
              <Field label="Date"               value={formatDate(r.date)} />
              <Field label="Quantity"           value={`${r.quantityLiters.toLocaleString()} L · ${formatLiters(r.quantityLiters)}`} mono />
              <Field label="Customer type"      value={r.customerType} />
              <Field label="Type of gas"        value={r.gasType} />
              <Field label="Permit holder"      value={r.permitHolderName} />
            </FieldGrid>
          </DetailCard>

          <DetailCard title="Linkage" subtitle="Cross-references to the Customer and Asset masters.">
            <FieldGrid>
              <Field label="Customer"
                value={<Link to={`/gas-register/customers/${r.customerId}`} className="text-info-500 hover:underline">{r.customerName}</Link>} />
              <Field label="Source asset"
                value={<Link to={`/gas-register/assets/${r.assetId}`} className="text-info-500 hover:underline">{r.assetName}</Link>} />
              <Field label="Customer ID" value={r.customerId} mono />
              <Field label="Asset ID"    value={r.assetId} mono />
            </FieldGrid>
          </DetailCard>
        </div>

        <DetailCard title="Record info">
          <FieldGrid cols={1}>
            <Field label="Submission ID"     value={r.id}                                          mono />
            <Field label="Created"           value={new Date(r.createdAt).toLocaleString('en-GB')} />
            <Field label="Permit holder ID"  value={r.permitHolderId}                              mono />
          </FieldGrid>
        </DetailCard>
      </div>
    </ModuleDetailLayout>
  );
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}
