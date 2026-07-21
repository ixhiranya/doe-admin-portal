import { useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useMasterData } from '../../../../../store/masterData';
import { Breadcrumb, DeleteConfirmModal } from '../../../../../components/masterdata/Chrome';
import { ViewPageShell, ViewField } from '../../../../../components/masterdata/FormPrimitives';
import { formatDateTime } from '../../../../../lib/utils';

export function RegionViewPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { regions, deleteRegion } = useMasterData();
  const region = regions.find((r) => r.id === id);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!region) {
    return (
      <div className="max-w-[900px] mx-auto px-6 pt-10 pb-10 text-center">
        <div className="text-4xl mb-2">🔍</div>
        <div className="font-display font-bold text-[16px] text-ink-950">Region not found</div>
        <button onClick={() => navigate('/admin/master-data/regions')} className="btn-secondary text-[12.5px] mt-4">Back to Regions</button>
      </div>
    );
  }

  const parent = region.parentRegionId ? regions.find((r) => r.id === region.parentRegionId) : undefined;
  const children = regions.filter((r) => r.parentRegionId === region.id);

  function handleDelete() {
    const res = deleteRegion(region!.id);
    if (!res.ok) { setError(res.error ?? 'Unable to delete.'); return; }
    navigate('/admin/master-data/regions');
  }

  return (
    <ViewPageShell
      breadcrumb={<Breadcrumb items={[{ label: 'Home', to: '/pps-dashboard' }, { label: 'Master Data', to: '/admin/master-data' }, { label: 'Regions', to: '/admin/master-data/regions' }, { label: region.name }]} tag="Table 6 · REGION" />}
      badge="RG" badgeBg="#22A745"
      title={region.name}
      subtitle={`Code: ${region.code}`}
      actions={
        <>
          <button onClick={() => navigate(`/admin/master-data/regions/${region.id}/edit`)} className="btn-secondary text-[12px]">Edit</button>
          <button onClick={() => setConfirmOpen(true)} className="btn-danger text-[12px]">Delete</button>
        </>
      }
    >
      <ViewField label="Code"><span className="font-mono">{region.code}</span></ViewField>
      <ViewField label="Name">{region.name}</ViewField>
      <ViewField label="Parent Region">
        {parent ? <Link to={`/admin/master-data/regions/${parent.id}`} className="text-info-500 hover:underline">{parent.name}</Link> : '—'}
      </ViewField>
      <ViewField label="Status">
        <span className={`chip-sm ${region.isActive ? 'bg-success-soft text-success-500' : 'bg-neutral-100 text-neutral-500'}`}>{region.isActive ? 'Active' : 'Inactive'}</span>
      </ViewField>
      <ViewField label="Child Regions">
        {children.length === 0 ? '—' : (
          <div className="flex flex-wrap gap-1.5">
            {children.map((c) => <Link key={c.id} to={`/admin/master-data/regions/${c.id}`} className="chip-sm bg-neutral-100 text-neutral-700 hover:bg-neutral-200">{c.name}</Link>)}
          </div>
        )}
      </ViewField>
      <ViewField label="Last Updated">{formatDateTime(region.updatedAt)}</ViewField>

      <DeleteConfirmModal
        open={confirmOpen}
        title={`Delete "${region.name}"?`}
        message={<>{error ? <span className="text-doe-red font-semibold">{error}</span> : <>This removes <strong>{region.name}</strong> from the Regions registry. This cannot be undone.</>}</>}
        onCancel={() => { setConfirmOpen(false); setError(null); }}
        onConfirm={handleDelete}
      />
    </ViewPageShell>
  );
}
