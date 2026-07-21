import { useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useMasterData } from '../../../../../store/masterData';
import { Breadcrumb, DeleteConfirmModal } from '../../../../../components/masterdata/Chrome';
import { ViewPageShell, ViewField } from '../../../../../components/masterdata/FormPrimitives';
import { formatDateTime } from '../../../../../lib/utils';

export function EntityGroupMemberViewPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { entityGroupMembers, entityGroups, companies, deleteEntityGroupMember } = useMasterData();
  const member = entityGroupMembers.find((m) => m.id === id);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!member) {
    return (
      <div className="max-w-[900px] mx-auto px-6 pt-10 pb-10 text-center">
        <div className="text-4xl mb-2">🔍</div>
        <div className="font-display font-bold text-[16px] text-ink-950">Membership not found</div>
        <button onClick={() => navigate('/admin/master-data/entity-group-members')} className="btn-secondary text-[12.5px] mt-4">Back to Entity Group Members</button>
      </div>
    );
  }

  const group = entityGroups.find((g) => g.id === member.groupId);
  const company = companies.find((c) => c.id === member.companyId);

  function handleDelete() {
    const res = deleteEntityGroupMember(member!.id);
    if (!res.ok) { setError(res.error ?? 'Unable to delete.'); return; }
    navigate('/admin/master-data/entity-group-members');
  }

  return (
    <ViewPageShell
      breadcrumb={<Breadcrumb items={[{ label: 'Home', to: '/pps-dashboard' }, { label: 'Master Data', to: '/admin/master-data' }, { label: 'Entity Group Members', to: '/admin/master-data/entity-group-members' }, { label: company?.name ?? 'Membership' }]} tag="Table 22 · ENTITY_GROUP_MEMBER" />}
      badge="GM" badgeBg="#475569"
      title={`${company?.name ?? 'Unknown company'} → ${group?.name ?? 'Unknown group'}`}
      subtitle="Entity Group membership"
      actions={
        <>
          <button onClick={() => navigate(`/admin/master-data/entity-group-members/${member.id}/edit`)} className="btn-secondary text-[12px]">Edit</button>
          <button onClick={() => setConfirmOpen(true)} className="btn-danger text-[12px]">Delete</button>
        </>
      }
    >
      <ViewField label="Entity Group">
        {group ? <Link to={`/admin/master-data/entity-groups/${group.id}`} className="text-info-500 hover:underline">{group.name}</Link> : '—'}
      </ViewField>
      <ViewField label="Company">
        {company ? <Link to={`/admin/master-data/companies/${company.id}`} className="text-info-500 hover:underline">{company.name}</Link> : '—'}
      </ViewField>
      <ViewField label="Added">{formatDateTime(member.createdAt)}</ViewField>

      <DeleteConfirmModal
        open={confirmOpen}
        title="Remove this membership?"
        message={<>{error ? <span className="text-doe-red font-semibold">{error}</span> : <>This removes <strong>{company?.name}</strong> from <strong>{group?.name}</strong>. This cannot be undone.</>}</>}
        onCancel={() => { setConfirmOpen(false); setError(null); }}
        onConfirm={handleDelete}
      />
    </ViewPageShell>
  );
}
