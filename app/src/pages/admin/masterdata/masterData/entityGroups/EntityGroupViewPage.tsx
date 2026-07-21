import { useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useMasterData } from '../../../../../store/masterData';
import { Breadcrumb, DeleteConfirmModal } from '../../../../../components/masterdata/Chrome';
import { ViewPageShell, ViewField } from '../../../../../components/masterdata/FormPrimitives';
import { formatDateTime } from '../../../../../lib/utils';

export function EntityGroupViewPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { entityGroups, entityGroupMembers, companies, deleteEntityGroup } = useMasterData();
  const group = entityGroups.find((g) => g.id === id);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!group) {
    return (
      <div className="max-w-[900px] mx-auto px-6 pt-10 pb-10 text-center">
        <div className="text-4xl mb-2">🔍</div>
        <div className="font-display font-bold text-[16px] text-ink-950">Entity group not found</div>
        <button onClick={() => navigate('/admin/master-data/entity-groups')} className="btn-secondary text-[12.5px] mt-4">Back to Entity Groups</button>
      </div>
    );
  }

  const members = entityGroupMembers.filter((m) => m.groupId === group.id).map((m) => ({ m, company: companies.find((c) => c.id === m.companyId) }));

  function handleDelete() {
    const res = deleteEntityGroup(group!.id);
    if (!res.ok) { setError(res.error ?? 'Unable to delete.'); return; }
    navigate('/admin/master-data/entity-groups');
  }

  return (
    <ViewPageShell
      breadcrumb={<Breadcrumb items={[{ label: 'Home', to: '/pps-dashboard' }, { label: 'Master Data', to: '/admin/master-data' }, { label: 'Entity Groups', to: '/admin/master-data/entity-groups' }, { label: group.name }]} tag="Table 21 · ENTITY_GROUP" />}
      badge="EG" badgeBg="#0891B2"
      title={group.name}
      subtitle={`Code: ${group.code}`}
      actions={
        <>
          <button onClick={() => navigate(`/admin/master-data/entity-groups/${group.id}/edit`)} className="btn-secondary text-[12px]">Edit</button>
          <button onClick={() => setConfirmOpen(true)} className="btn-danger text-[12px]">Delete</button>
        </>
      }
    >
      <ViewField label="Code"><span className="font-mono">{group.code}</span></ViewField>
      <ViewField label="Name">{group.name}</ViewField>
      <ViewField label="Status">
        <span className={`chip-sm ${group.isActive ? 'bg-success-soft text-success-500' : 'bg-neutral-100 text-neutral-500'}`}>{group.isActive ? 'Active' : 'Inactive'}</span>
      </ViewField>
      <ViewField label="Last Updated">{formatDateTime(group.updatedAt)}</ViewField>
      <div className="sm:col-span-2">
        <ViewField label={`Members (${members.length})`}>
          {members.length === 0 ? (
            <span className="text-neutral-500">
              No members yet. Add some from{' '}
              <Link to="/admin/master-data/entity-group-members/new" className="text-info-500 hover:underline">Entity Group Members</Link>.
            </span>
          ) : (
            <div className="flex flex-wrap gap-1.5 mt-1">
              {members.map(({ m, company }) => (
                <Link key={m.id} to={`/admin/master-data/companies/${company?.id}`} className="chip-sm bg-info-soft text-info-500 hover:opacity-80">
                  {company?.name ?? 'Unknown company'}
                </Link>
              ))}
            </div>
          )}
        </ViewField>
      </div>

      <DeleteConfirmModal
        open={confirmOpen}
        title={`Delete "${group.name}"?`}
        message={<>{error ? <span className="text-doe-red font-semibold">{error}</span> : <>This removes <strong>{group.name}</strong> from the Entity Groups registry. This cannot be undone.</>}</>}
        onCancel={() => { setConfirmOpen(false); setError(null); }}
        onConfirm={handleDelete}
      />
    </ViewPageShell>
  );
}
