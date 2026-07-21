import { useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useMasterData } from '../../../../../store/masterData';
import { Breadcrumb, DeleteConfirmModal } from '../../../../../components/masterdata/Chrome';
import { ViewPageShell, ViewField } from '../../../../../components/masterdata/FormPrimitives';
import { formatDateTime } from '../../../../../lib/utils';

export function UomViewPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { uoms, products, deleteUom } = useMasterData();
  const uom = uoms.find((u) => u.id === id);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!uom) {
    return (
      <div className="max-w-[900px] mx-auto px-6 pt-10 pb-10 text-center">
        <div className="text-4xl mb-2">🔍</div>
        <div className="font-display font-bold text-[16px] text-ink-950">Unit not found</div>
        <button onClick={() => navigate('/admin/master-data/uom')} className="btn-secondary text-[12.5px] mt-4">Back to UOM</button>
      </div>
    );
  }

  const base = uom.baseUomId ? uoms.find((u) => u.id === uom.baseUomId) : undefined;
  const usedByProducts = products.filter((p) => p.defaultUomId === uom.id);

  function handleDelete() {
    const res = deleteUom(uom!.id);
    if (!res.ok) { setError(res.error ?? 'Unable to delete.'); return; }
    navigate('/admin/master-data/uom');
  }

  return (
    <ViewPageShell
      breadcrumb={<Breadcrumb items={[{ label: 'Home', to: '/pps-dashboard' }, { label: 'Master Data', to: '/admin/master-data' }, { label: 'UOM', to: '/admin/master-data/uom' }, { label: uom.name }]} tag="Table 4 · UOM" />}
      badge="UM" badgeBg="#D97706"
      title={uom.name}
      subtitle={`Code: ${uom.code}`}
      actions={
        <>
          <button onClick={() => navigate(`/admin/master-data/uom/${uom.id}/edit`)} className="btn-secondary text-[12px]">Edit</button>
          <button onClick={() => setConfirmOpen(true)} className="btn-danger text-[12px]">Delete</button>
        </>
      }
    >
      <ViewField label="Code"><span className="font-mono">{uom.code}</span></ViewField>
      <ViewField label="Name">{uom.name}</ViewField>
      <ViewField label="Dimension"><span className="capitalize">{uom.dimension}</span></ViewField>
      <ViewField label="Base Unit">{base ? `${base.name} (${base.code})` : '— (this is a base unit)'}</ViewField>
      <ViewField label="Conversion Factor"><span className="font-mono">{uom.conversionFactor}</span></ViewField>
      <ViewField label="Status">
        <span className={`chip-sm ${uom.isActive ? 'bg-success-soft text-success-500' : 'bg-neutral-100 text-neutral-500'}`}>{uom.isActive ? 'Active' : 'Inactive'}</span>
      </ViewField>
      <ViewField label="Used as default by Products">
        {usedByProducts.length === 0 ? '—' : (
          <div className="flex flex-wrap gap-1.5">
            {usedByProducts.map((p) => <Link key={p.id} to={`/admin/master-data/products/${p.id}`} className="chip-sm bg-neutral-100 text-neutral-700 hover:bg-neutral-200">{p.name}</Link>)}
          </div>
        )}
      </ViewField>
      <ViewField label="Last Updated">{formatDateTime(uom.updatedAt)}</ViewField>

      <DeleteConfirmModal
        open={confirmOpen}
        title={`Delete "${uom.name}"?`}
        message={<>{error ? <span className="text-doe-red font-semibold">{error}</span> : <>This removes <strong>{uom.name}</strong> from the UOM registry. This cannot be undone.</>}</>}
        onCancel={() => { setConfirmOpen(false); setError(null); }}
        onConfirm={handleDelete}
      />
    </ViewPageShell>
  );
}
