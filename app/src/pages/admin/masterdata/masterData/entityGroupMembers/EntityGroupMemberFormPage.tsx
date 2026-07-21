import { useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useMasterData } from '../../../../../store/masterData';
import { Breadcrumb } from '../../../../../components/masterdata/Chrome';
import { FormField, SelectInput, FormPageShell } from '../../../../../components/masterdata/FormPrimitives';

export function EntityGroupMemberFormPage({ mode }: { mode: 'create' | 'edit' }) {
  const navigate = useNavigate();
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const { entityGroupMembers, entityGroups, companies, saveEntityGroupMember } = useMasterData();
  const existing = mode === 'edit' ? entityGroupMembers.find((m) => m.id === id) : undefined;

  const [groupId, setGroupId] = useState(existing?.groupId ?? searchParams.get('groupId') ?? entityGroups[0]?.id ?? '');
  const [companyId, setCompanyId] = useState(existing?.companyId ?? companies[0]?.id ?? '');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const dupError = useMemo(() => {
    if (!groupId || !companyId) return undefined;
    const dup = entityGroupMembers.some((m) => m.groupId === groupId && m.companyId === companyId && m.id !== existing?.id);
    return dup ? 'This company is already a member of the selected group.' : undefined;
  }, [entityGroupMembers, groupId, companyId, existing?.id]);

  const canSubmit = !!groupId && !!companyId && !dupError;

  if (mode === 'edit' && !existing) {
    return <NotFound onBack={() => navigate('/admin/master-data/entity-group-members')} />;
  }

  function submit() {
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    const res = saveEntityGroupMember({ id: existing?.id, groupId, companyId });
    setSubmitting(false);
    if (!res.ok) { setError(res.error ?? 'Could not save this membership.'); return; }
    navigate('/admin/master-data/entity-group-members');
  }

  return (
    <FormPageShell
      breadcrumb={<Breadcrumb items={[{ label: 'Home', to: '/pps-dashboard' }, { label: 'Master Data', to: '/admin/master-data' }, { label: 'Entity Group Members', to: '/admin/master-data/entity-group-members' }, { label: mode === 'create' ? 'New' : 'Edit' }]} tag="Table 22 · ENTITY_GROUP_MEMBER" />}
      badge="GM" badgeBg="#475569"
      title={mode === 'create' ? 'Add a Group Member' : 'Edit Membership'}
      subtitle="Adds one company to one Entity Group. Consolidation rules read this to know which companies to sum."
      onCancel={() => navigate('/admin/master-data/entity-group-members')}
      onSubmit={submit}
      canSubmit={canSubmit}
      submitting={submitting}
      formError={error ?? dupError ?? null}
      submitLabel={mode === 'create' ? 'Add Member' : 'Save Changes'}
    >
      <FormField label="Entity Group" required helper="The group this company belongs to.">
        <SelectInput value={groupId} onChange={setGroupId} options={entityGroups.map((g) => ({ value: g.id, label: g.name }))} />
      </FormField>
      <FormField label="Company" required error={dupError} helper="The company that is a member of the group.">
        <SelectInput value={companyId} onChange={setCompanyId} options={companies.map((c) => ({ value: c.id, label: `${c.name} (${c.code})` }))} error={dupError} />
      </FormField>
    </FormPageShell>
  );
}

function NotFound({ onBack }: { onBack: () => void }) {
  return (
    <div className="max-w-[900px] mx-auto px-6 pt-10 pb-10 text-center">
      <div className="text-4xl mb-2">🔍</div>
      <div className="font-display font-bold text-[16px] text-ink-950">Membership not found</div>
      <button onClick={onBack} className="btn-secondary text-[12.5px] mt-4">Back to Entity Group Members</button>
    </div>
  );
}
