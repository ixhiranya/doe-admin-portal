// =============================================================================
// Gas Register · BN 9 — Daily Inflow Detail
// -----------------------------------------------------------------------------
// Migrated to use the shared ModuleDetailLayout so every Gas Register view page
// shares the same hero + KPI + body chrome (per the unification rule applied
// to the 5 newer modules: Driver / Engineer / Fleet Movement / Connection /
// Maintenance).
// =============================================================================
import { useMemo } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { getInflow, formatLiters } from '../../services/gasRegister/gasFlow';
import { ModuleDetailLayout, DetailCard, Field, FieldGrid } from './ModuleDetailLayout';

export function InflowDetailPage() {
  const { inflowId } = useParams<{ inflowId: string }>();
  const r = useMemo(() => inflowId ? getInflow(inflowId) : undefined, [inflowId]);
  const navigate = useNavigate();

  if (!r) {
    return (
      <div className="min-h-screen bg-neutral-25 grid place-items-center">
        <div className="card p-10 text-center">
          <div className="text-4xl mb-2">🔎</div>
          <div className="font-display font-bold text-[15px] text-ink-950">Inflow record not found</div>
          <button onClick={() => navigate('/gas-register/inflow')} className="mt-4 btn-primary">Back to inflow</button>
        </div>
      </div>
    );
  }

  return (
    <ModuleDetailLayout
      parentLabel="Daily Inflow" parentHref="/gas-register/inflow"
      current={r.id} sddRef="BN 9 · Gas Register SDD"
      iconText="IN" iconAccent="#5089A0"
      eyebrow="Daily Inflow Submission"
      title={`${formatLiters(r.volumeLiters)} received`}
      subtitle={`${r.permitHolderName} · ${r.gasType} · sourced from ${r.supplierName}`}
      meta={
        <>
          <span className="font-mono text-white/70">{r.id}</span>
          <span className="text-white/40">·</span>
          <span className="text-white/70">{formatDate(r.date)}</span>
        </>
      }
      kpis={[
        { label: 'Volume',        value: formatLiters(r.volumeLiters), tone: 'info' },
        { label: 'Gas type',      value: r.gasType,                    tone: 'ink' },
        { label: 'Submission',    value: formatDate(r.date),           tone: 'ink' },
        { label: 'Permit holder', value: r.permitHolderName,           tone: 'ink' },
      ]}
    >
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          <DetailCard title="Submission Details">
            <FieldGrid>
              <Field label="Date"                      value={formatDate(r.date)} />
              <Field label="Volume purchased"          value={`${r.volumeLiters.toLocaleString()} L · ${formatLiters(r.volumeLiters)}`} mono />
              <Field label="Type of gas"               value={r.gasType} />
              <Field label="Permit holder"             value={r.permitHolderName} />
            </FieldGrid>
          </DetailCard>

          <DetailCard title="Linkage" subtitle="Cross-references to the Supplier and Asset masters.">
            <FieldGrid>
              <Field label="Product source (supplier)"
                value={<Link to={`/gas-register/suppliers/${r.supplierId}`} className="text-info-500 hover:underline">{r.supplierName}</Link>} />
              <Field label="Gas storage (asset)"
                value={<Link to={`/gas-register/assets/${r.assetId}`} className="text-info-500 hover:underline">{r.assetName}</Link>} />
              <Field label="Supplier ID" value={r.supplierId} mono />
              <Field label="Asset ID"    value={r.assetId} mono />
            </FieldGrid>
          </DetailCard>
        </div>

        <DetailCard title="Record info">
          <FieldGrid cols={1}>
            <Field label="Submission ID" value={r.id}                              mono />
            <Field label="Created"       value={new Date(r.createdAt).toLocaleString('en-GB')} />
            <Field label="Permit holder ID" value={r.permitHolderId}               mono />
          </FieldGrid>
        </DetailCard>
      </div>
    </ModuleDetailLayout>
  );
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}
