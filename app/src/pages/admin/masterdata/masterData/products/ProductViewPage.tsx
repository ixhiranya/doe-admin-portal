import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMasterData } from '../../../../../store/masterData';
import { Breadcrumb, DeleteConfirmModal } from '../../../../../components/masterdata/Chrome';
import { ViewPageShell, ViewField } from '../../../../../components/masterdata/FormPrimitives';
import { formatDateTime } from '../../../../../lib/utils';

export function ProductViewPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { products, uoms, deleteProduct } = useMasterData();
  const product = products.find((p) => p.id === id);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!product) {
    return (
      <div className="max-w-[900px] mx-auto px-6 pt-10 pb-10 text-center">
        <div className="text-4xl mb-2">🔍</div>
        <div className="font-display font-bold text-[16px] text-ink-950">Product not found</div>
        <button onClick={() => navigate('/admin/master-data/products')} className="btn-secondary text-[12.5px] mt-4">Back to Products</button>
      </div>
    );
  }

  const uom = uoms.find((u) => u.id === product.defaultUomId);

  function handleDelete() {
    const res = deleteProduct(product!.id);
    if (!res.ok) { setError(res.error ?? 'Unable to delete.'); return; }
    navigate('/admin/master-data/products');
  }

  return (
    <ViewPageShell
      breadcrumb={<Breadcrumb items={[{ label: 'Home', to: '/pps-dashboard' }, { label: 'Master Data', to: '/admin/master-data' }, { label: 'Products', to: '/admin/master-data/products' }, { label: product.name }]} tag="Table 1 · PRODUCT" />}
      badge="PR" badgeBg="#0E76A8"
      title={product.name}
      subtitle={`Code: ${product.code}`}
      actions={
        <>
          <button onClick={() => navigate(`/admin/master-data/products/${product.id}/edit`)} className="btn-secondary text-[12px]">Edit</button>
          <button onClick={() => setConfirmOpen(true)} className="btn-danger text-[12px]">Delete</button>
        </>
      }
    >
      <ViewField label="Code"><span className="font-mono">{product.code}</span></ViewField>
      <ViewField label="Name">{product.name}</ViewField>
      <ViewField label="Default UOM">{uom ? `${uom.name} (${uom.code})` : '—'}</ViewField>
      <ViewField label="Requires TPI">
        <span className={`chip-sm ${product.hasTpi ? 'bg-warning-soft text-warning-500' : 'bg-neutral-100 text-neutral-500'}`}>{product.hasTpi ? 'Yes' : 'No'}</span>
      </ViewField>
      <ViewField label="Status">
        <span className={`chip-sm ${product.isActive ? 'bg-success-soft text-success-500' : 'bg-neutral-100 text-neutral-500'}`}>{product.isActive ? 'Active' : 'Inactive'}</span>
      </ViewField>
      <ViewField label="Last Updated">{formatDateTime(product.updatedAt)}</ViewField>

      <DeleteConfirmModal
        open={confirmOpen}
        title={`Delete "${product.name}"?`}
        message={<>{error ? <span className="text-doe-red font-semibold">{error}</span> : <>This removes <strong>{product.name}</strong> from the Master Data registry. This cannot be undone.</>}</>}
        onCancel={() => { setConfirmOpen(false); setError(null); }}
        onConfirm={handleDelete}
      />
    </ViewPageShell>
  );
}
