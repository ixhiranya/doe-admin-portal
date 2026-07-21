import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMasterData } from '../../../../../store/masterData';
import { Breadcrumb } from '../../../../../components/masterdata/Chrome';
import { FormField, TextInput, SelectInput, CheckboxInput, FormPageShell } from '../../../../../components/masterdata/FormPrimitives';

export function RegionFormPage({ mode }: { mode: 'create' | 'edit' }) {
  const navigate = useNavigate();
  const { id } = useParams();
  const { regions, saveRegion } = useMasterData();
  const existing = mode === 'edit' ? regions.find((r) => r.id === id) : undefined;

  const [code, setCode] = useState(existing?.code ?? '');
  const [name, setName] = useState(existing?.name ?? '');
  const [parentRegionId, setParentRegionId] = useState(existing?.parentRegionId ?? '');
  const [isActive, setIsActive] = useState(existing?.isActive ?? true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const codeError = useMemo(() => {
    if (!code.trim()) return 'Code is required.';
    const dup = regions.some((r) => r.code.toLowerCase() === code.trim().toLowerCase() && r.id !== existing?.id);
    if (dup) return 'A region with this code already exists.';
    return undefined;
  }, [code, regions, existing?.id]);

  const parentOptions = useMemo(
    () => [{ value: '', label: 'None (top-level)' }, ...regions.filter((r) => r.id !== existing?.id).map((r) => ({ value: r.id, label: `${r.name} (${r.code})` }))],
    [regions, existing?.id],
  );

  const canSubmit = !codeError && name.trim().length > 0;

  if (mode === 'edit' && !existing) {
    return <NotFound onBack={() => navigate('/admin/master-data/regions')} />;
  }

  function submit() {
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    try {
      saveRegion({ id: existing?.id, code: code.trim().toUpperCase(), name: name.trim(), parentRegionId: parentRegionId || null, isActive });
      navigate('/admin/master-data/regions');
    } catch (e: any) {
      setError(e?.message ?? 'Could not save this region.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <FormPageShell
      breadcrumb={<Breadcrumb items={[{ label: 'Home', to: '/pps-dashboard' }, { label: 'Master Data', to: '/admin/master-data' }, { label: 'Regions', to: '/admin/master-data/regions' }, { label: mode === 'create' ? 'New' : 'Edit' }]} tag="Table 6 · REGION" />}
      badge="RG" badgeBg="#22A745"
      title={mode === 'create' ? 'Add a new Region' : `Edit ${existing?.name}`}
      subtitle="Regions feed the region breakdown blocks on product submission forms."
      onCancel={() => navigate('/admin/master-data/regions')}
      onSubmit={submit}
      canSubmit={canSubmit}
      submitting={submitting}
      formError={error}
      submitLabel={mode === 'create' ? 'Create Region' : 'Save Changes'}
    >
      <FormField label="Code" required error={codeError} helper="Short region code.">
        <TextInput value={code} onChange={setCode} placeholder="AUH" mono error={codeError} />
      </FormField>
      <FormField label="Name" required helper="Region name.">
        <TextInput value={name} onChange={setName} placeholder="Abu Dhabi City" />
      </FormField>
      <FormField label="Parent Region" helper="A bigger region this one sits inside (self-link). Leave blank if none.">
        <SelectInput value={parentRegionId} onChange={setParentRegionId} options={parentOptions} />
      </FormField>
      <div className="flex items-center">
        <CheckboxInput checked={isActive} onChange={setIsActive} label="Active" helper="Inactive regions are hidden from submission forms." />
      </div>
    </FormPageShell>
  );
}

function NotFound({ onBack }: { onBack: () => void }) {
  return (
    <div className="max-w-[900px] mx-auto px-6 pt-10 pb-10 text-center">
      <div className="text-4xl mb-2">🔍</div>
      <div className="font-display font-bold text-[16px] text-ink-950">Region not found</div>
      <button onClick={onBack} className="btn-secondary text-[12.5px] mt-4">Back to Regions</button>
    </div>
  );
}
