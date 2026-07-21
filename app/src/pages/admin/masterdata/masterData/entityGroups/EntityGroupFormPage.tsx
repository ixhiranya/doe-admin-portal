import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMasterData } from '../../../../../store/masterData';
import { Breadcrumb } from '../../../../../components/masterdata/Chrome';
import { FormField, TextInput, CheckboxInput, FormPageShell } from '../../../../../components/masterdata/FormPrimitives';

export function EntityGroupFormPage({ mode }: { mode: 'create' | 'edit' }) {
  const navigate = useNavigate();
  const { id } = useParams();
  const { entityGroups, saveEntityGroup } = useMasterData();
  const existing = mode === 'edit' ? entityGroups.find((g) => g.id === id) : undefined;

  const [code, setCode] = useState(existing?.code ?? '');
  const [name, setName] = useState(existing?.name ?? '');
  const [isActive, setIsActive] = useState(existing?.isActive ?? true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const codeError = useMemo(() => {
    if (!code.trim()) return 'Code is required.';
    const dup = entityGroups.some((g) => g.code.toLowerCase() === code.trim().toLowerCase() && g.id !== existing?.id);
    if (dup) return 'An entity group with this code already exists.';
    return undefined;
  }, [code, entityGroups, existing?.id]);

  const canSubmit = !codeError && name.trim().length > 0;

  if (mode === 'edit' && !existing) {
    return <NotFound onBack={() => navigate('/admin/master-data/entity-groups')} />;
  }

  function submit() {
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    try {
      saveEntityGroup({ id: existing?.id, code: code.trim().toUpperCase(), name: name.trim(), isActive });
      navigate('/admin/master-data/entity-groups');
    } catch (e: any) {
      setError(e?.message ?? 'Could not save this entity group.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <FormPageShell
      breadcrumb={<Breadcrumb items={[{ label: 'Home', to: '/pps-dashboard' }, { label: 'Master Data', to: '/admin/master-data' }, { label: 'Entity Groups', to: '/admin/master-data/entity-groups' }, { label: mode === 'create' ? 'New' : 'Edit' }]} tag="Table 21 · ENTITY_GROUP" />}
      badge="EG" badgeBg="#0891B2"
      title={mode === 'create' ? 'Add a new Entity Group' : `Edit ${existing?.name}`}
      subtitle="Add members from the Entity Group Members screen once this group is created."
      onCancel={() => navigate('/admin/master-data/entity-groups')}
      onSubmit={submit}
      canSubmit={canSubmit}
      submitting={submitting}
      formError={error}
      submitLabel={mode === 'create' ? 'Create Entity Group' : 'Save Changes'}
    >
      <FormField label="Code" required error={codeError} helper="Short code for the group.">
        <TextInput value={code} onChange={setCode} placeholder="ADNOCGAS_CONS" mono error={codeError} />
      </FormField>
      <FormField label="Name" required helper="Plain-English name of the group.">
        <TextInput value={name} onChange={setName} placeholder="ADNOC Gas supplied consumers" />
      </FormField>
      <div className="flex items-center">
        <CheckboxInput checked={isActive} onChange={setIsActive} label="Active" helper="Inactive groups are excluded from consolidation rules." />
      </div>
    </FormPageShell>
  );
}

function NotFound({ onBack }: { onBack: () => void }) {
  return (
    <div className="max-w-[900px] mx-auto px-6 pt-10 pb-10 text-center">
      <div className="text-4xl mb-2">🔍</div>
      <div className="font-display font-bold text-[16px] text-ink-950">Entity group not found</div>
      <button onClick={onBack} className="btn-secondary text-[12.5px] mt-4">Back to Entity Groups</button>
    </div>
  );
}
