import { useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useMasterData } from '../../../../../store/masterData';
import { Breadcrumb, DeleteConfirmModal } from '../../../../../components/masterdata/Chrome';
import { ViewPageShell, ViewField } from '../../../../../components/masterdata/FormPrimitives';
import { formatDateTime } from '../../../../../lib/utils';

export function EntityTypeViewPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { entityTypes, companies, deleteEntityType } = useMasterData();
  const entityType = entityTypes.find((t) => t.id === id);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!entityType) {
    return (
      <div className="max-w-[900px] mx-auto px-6 pt-10 pb-10 text-center">
        <div className="text-4xl mb-2">🔍</div>
        <div className="font-display font-bold text-[16px] text-ink-950">Entity type not found</div>
        <button onClick={() => navigate('/admin/master-data/entity-types')} className="btn-secondary text-[12.5px] mt-4">Back to Entity Types</button>
      </div>
    );
  }

  const usedByCompanies = companies.filter((c) => c.entityTypeId === entityType.id);

  function handleDelete() {
    const res = deleteEntityType(entityType!.id);
    if (!res.ok) { setError(res.error ?? 'Unable to delete.'); return; }
    navigate('/admin/master-data/entity-types');
  }

  return (
    <ViewPageShell
      breadcrumb={<Breadcrumb items={[{ label: 'Home', to: '/pps-dashboard' }, { label: 'Master Data', to: '/admin/master-data' }, { label: 'Entity Types', to: '/admin/master-data/entity-types' }, { label: entityType.name }]} tag="Normalized · COMPANY.entity_type" />}
      badge="ET" badgeBg="#7C3AED"
      title={entityType.name}
      subtitle={`Code: ${entityType.code}`}
      actions={
        <>
          <button onClick={() => navigate(`/admin/master-data/entity-types/${entityType.id}/edit`)} className="btn-secondary text-[12px]">Edit</button>
          <button onClick={() => setConfirmOpen(true)} className="btn-danger text-[12px]">Delete</button>
        </>
      }
    >
      <ViewField label="Code"><span className="font-mono">{entityType.code}</span></ViewField>
      <ViewField label="Name">{entityType.name}</ViewField>
      <div className="sm:col-span-2">
        <ViewField label="Description">{entityType.description || '—'}</ViewField>
      </div>
      <ViewField label="Status">
        <span className={`chip-sm ${entityType.isActive ? 'bg-success-soft text-success-500' : 'bg-neutral-100 text-neutral-500'}`}>{entityType.isActive ? 'Active' : 'Inactive'}</span>
      </ViewField>
      <ViewField label="Companies using this type">
        {usedByCompanies.length === 0 ? '—' : (
          <div className="flex flex-wrap gap-1.5">
            {usedByCompanies.map((c) => <Link key={c.id} to={`/admin/master-data/companies/${c.id}`} className="chip-sm bg-neutral-100 text-neutral-700 hover:bg-neutral-200">{c.name}</Link>)}
          </div>
        )}
      </ViewField>
      <ViewField label="Last Updated">{formatDateTime(entityType.updatedAt)}</ViewField>

      <DeleteConfirmModal
        open={confirmOpen}
        title={`Delete "${entityType.name}"?`}
        message={<>{error ? <span className="text-doe-red font-semibold">{error}</span> : <>This removes <strong>{entityType.name}</strong> from the Entity Types registry. This cannot be undone.</>}</>}
        onCancel={() => { setConfirmOpen(false); setError(null); }}
        onConfirm={handleDelete}
      />
    </ViewPageShell>
  );
}
