import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMasterData } from '../../../../../store/masterData';
import { Breadcrumb } from '../../../../../components/masterdata/Chrome';
import { FormField, TextInput, TextArea, CheckboxInput, FormPageShell } from '../../../../../components/masterdata/FormPrimitives';

export function EntityTypeFormPage({ mode }: { mode: 'create' | 'edit' }) {
  const navigate = useNavigate();
  const { id } = useParams();
  const { entityTypes, saveEntityType } = useMasterData();
  const existing = mode === 'edit' ? entityTypes.find((t) => t.id === id) : undefined;

  const [code, setCode] = useState(existing?.code ?? '');
  const [name, setName] = useState(existing?.name ?? '');
  const [description, setDescription] = useState(existing?.description ?? '');
  const [isActive, setIsActive] = useState(existing?.isActive ?? true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const codeError = useMemo(() => {
    if (!code.trim()) return 'Code is required.';
    const dup = entityTypes.some((t) => t.code.toLowerCase() === code.trim().toLowerCase() && t.id !== existing?.id);
    if (dup) return 'An entity type with this code already exists.';
    return undefined;
  }, [code, entityTypes, existing?.id]);

  const canSubmit = !codeError && name.trim().length > 0;

  if (mode === 'edit' && !existing) {
    return <NotFound onBack={() => navigate('/admin/master-data/entity-types')} />;
  }

  function submit() {
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    try {
      saveEntityType({ id: existing?.id, code: code.trim().toUpperCase(), name: name.trim(), description: description.trim(), isActive });
      navigate('/admin/master-data/entity-types');
    } catch (e: any) {
      setError(e?.message ?? 'Could not save this entity type.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <FormPageShell
      breadcrumb={<Breadcrumb items={[{ label: 'Home', to: '/pps-dashboard' }, { label: 'Master Data', to: '/admin/master-data' }, { label: 'Entity Types', to: '/admin/master-data/entity-types' }, { label: mode === 'create' ? 'New' : 'Edit' }]} tag="Normalized · COMPANY.entity_type" />}
      badge="ET" badgeBg="#7C3AED"
      title={mode === 'create' ? 'Add a new Entity Type' : `Edit ${existing?.name}`}
      subtitle="Entity Types feed the Entity Type dropdown on the Companies form."
      onCancel={() => navigate('/admin/master-data/entity-types')}
      onSubmit={submit}
      canSubmit={canSubmit}
      submitting={submitting}
      formError={error}
      submitLabel={mode === 'create' ? 'Create Entity Type' : 'Save Changes'}
    >
      <FormField label="Code" required error={codeError} helper="Short code for the entity type.">
        <TextInput value={code} onChange={setCode} placeholder="DISTRIBUTOR" mono error={codeError} />
      </FormField>
      <FormField label="Name" required helper="Full name shown in dropdowns.">
        <TextInput value={name} onChange={setName} placeholder="Distributor" />
      </FormField>
      <div className="sm:col-span-2">
        <FormField label="Description" helper="Explains what this role means.">
          <TextArea value={description} onChange={setDescription} placeholder="Distributes/sells the product to end customers." />
        </FormField>
      </div>
      <div className="flex items-center">
        <CheckboxInput checked={isActive} onChange={setIsActive} label="Active" helper="Inactive types are hidden from the Companies form." />
      </div>
    </FormPageShell>
  );
}

function NotFound({ onBack }: { onBack: () => void }) {
  return (
    <div className="max-w-[900px] mx-auto px-6 pt-10 pb-10 text-center">
      <div className="text-4xl mb-2">🔍</div>
      <div className="font-display font-bold text-[16px] text-ink-950">Entity type not found</div>
      <button onClick={onBack} className="btn-secondary text-[12.5px] mt-4">Back to Entity Types</button>
    </div>
  );
}
