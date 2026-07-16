// =============================================================================
// Gas Register · BN 2 — Supplier Detail
// -----------------------------------------------------------------------------
// Migrated to the shared ModuleDetailLayout. The Product Source (ADNOC family
// + Others per SDD §3.2.1) is surfaced on the hero, and Gas Types are rendered
// as chips inside a DetailCard.
// =============================================================================
import { useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  getSupplier, sourceLabel, supplierProductSource,
} from '../../services/gasRegister/suppliers';
import { ModuleDetailLayout, DetailCard, Field, FieldGrid } from './ModuleDetailLayout';

export function SupplierDetailPage() {
  const { supplierId } = useParams<{ supplierId: string }>();
  const s = useMemo(() => supplierId ? getSupplier(supplierId) : undefined, [supplierId]);
  const navigate = useNavigate();

  if (!s) {
    return (
      <div className="min-h-screen bg-neutral-25 grid place-items-center">
        <div className="card p-10 text-center">
          <div className="text-4xl mb-2">🔎</div>
          <div className="font-display font-bold text-[15px] text-ink-950">Supplier not found</div>
          <button onClick={() => navigate('/gas-register/suppliers')} className="mt-4 btn-primary">Back to suppliers</button>
        </div>
      </div>
    );
  }

  const ageDays = Math.floor((Date.now() - new Date(s.dateOfContract).getTime()) / 86_400_000);
  const ageLabel = ageDays >= 365 ? `${(ageDays / 365).toFixed(1)} yrs on contract`
                  : ageDays >= 0  ? `${ageDays} days on contract`
                                  : `starts in ${Math.abs(ageDays)} days`;
  const productSource = supplierProductSource(s);

  return (
    <ModuleDetailLayout
      parentLabel="Supplier Master" parentHref="/gas-register/suppliers"
      current={s.name} sddRef="BN 2 · Gas Register SDD"
      iconText="SP" iconAccent="#0E76A8"
      eyebrow="Supplier · Product Source"
      title={s.name}
      subtitle={`${s.permitHolderName} · Trade licence ${s.tradeLicenceNumber} · ${s.area}, ${s.city}`}
      status={{ label: productSource.label, tone: productSource.isOthers ? 'neutral' : 'info' }}
      meta={
        <>
          <span className="font-mono text-white/70">{s.id}</span>
          <span className="text-white/40">·</span>
          <span className="text-white/70">{sourceLabel(s.source)}</span>
        </>
      }
      kpis={[
        { label: 'Product source', value: productSource.label,             tone: productSource.isOthers ? 'ink' : 'info' },
        { label: 'Gas types',       value: s.gasTypes.length.toString(),    tone: 'ink' },
        { label: 'Date of contract', value: formatDate(s.dateOfContract),   tone: 'ink' },
        { label: 'On contract',     value: ageLabel,                        tone: 'ink' },
      ]}
    >
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          <DetailCard title="Supplier Identity">
            <FieldGrid>
              <Field label="Product Source"     value={productSource.label} />
              <Field label="Supplier Name"      value={s.name} />
              <Field label="Trade Licence"      value={s.tradeLicenceNumber} mono />
              <Field label="Permit Holder"      value={s.permitHolderName} />
            </FieldGrid>
          </DetailCard>

          <DetailCard title="Gas Types Supplied" subtitle={`${s.gasTypes.length} type${s.gasTypes.length === 1 ? '' : 's'} on contract`}>
            {s.gasTypes.length === 0 ? (
              <div className="text-[12px] text-neutral-500">No gas types declared.</div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {s.gasTypes.map((g) => (
                  <span key={g} className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-neutral-25 border border-neutral-100 text-[12.5px] text-ink-950">
                    <span className="w-1.5 h-1.5 rounded-full bg-info-500" /> {g}
                  </span>
                ))}
              </div>
            )}
          </DetailCard>

          <DetailCard title="Contact">
            <FieldGrid>
              <Field label="Detailed address" value={s.detailedAddress} />
              <Field label="Email"            value={s.email} mono />
              <Field label="Mobile"           value={s.mobile} mono />
              <Field label="City"             value={`${s.area}, ${s.city}`} />
            </FieldGrid>
          </DetailCard>

          <DetailCard title="Contract Document">
            {s.contractDocument ? (
              <FieldGrid>
                <Field label="File name"   value={s.contractDocument.fileName} mono />
                <Field label="Uploaded on" value={formatDate(s.contractDocument.uploadedAt)} />
              </FieldGrid>
            ) : (
              <div className="text-[12.5px] text-neutral-500">No contract document on file.</div>
            )}
          </DetailCard>
        </div>

        <DetailCard title="Record info">
          <FieldGrid cols={1}>
            <Field label="Supplier ID"   value={s.id}                                            mono />
            <Field label="Permit holder" value={s.permitHolderName} />
            <Field label="Source"        value={sourceLabel(s.source)} />
            <Field label="Created"       value={new Date(s.createdAt).toLocaleString('en-GB')} />
            <Field label="Last updated"  value={new Date(s.updatedAt).toLocaleString('en-GB')} />
          </FieldGrid>
        </DetailCard>
      </div>
    </ModuleDetailLayout>
  );
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}
