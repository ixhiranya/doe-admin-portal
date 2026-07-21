import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMasterData } from '../../../../../store/masterData';
import { Breadcrumb } from '../../../../../components/masterdata/Chrome';
import { FormField, TextInput, SelectInput, CheckboxInput, FormPageShell } from '../../../../../components/masterdata/FormPrimitives';

export function ProductFormPage({ mode }: { mode: 'create' | 'edit' }) {
  const navigate = useNavigate();
  const { id } = useParams();
  const { products, uoms, saveProduct } = useMasterData();
  const existing = mode === 'edit' ? products.find((p) => p.id === id) : undefined;

  const [code, setCode] = useState(existing?.code ?? '');
  const [name, setName] = useState(existing?.name ?? '');
  const [defaultUomId, setDefaultUomId] = useState(existing?.defaultUomId ?? uoms[0]?.id ?? '');
  const [hasTpi, setHasTpi] = useState(existing?.hasTpi ?? false);
  const [isActive, setIsActive] = useState(existing?.isActive ?? true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const codeError = useMemo(() => {
    if (!code.trim()) return 'Code is required.';
    const dup = products.some((p) => p.code.toLowerCase() === code.trim().toLowerCase() && p.id !== existing?.id);
    if (dup) return 'A product with this code already exists.';
    return undefined;
  }, [code, products, existing?.id]);

  const canSubmit = !codeError && name.trim().length > 0 && !!defaultUomId;

  if (mode === 'edit' && !existing) {
    return <NotFound onBack={() => navigate('/admin/master-data/products')} />;
  }

  function submit() {
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    try {
      saveProduct({ id: existing?.id, code: code.trim().toLowerCase().replace(/[^a-z0-9_]/g, '_'), name: name.trim(), defaultUomId, hasTpi, isActive });
      navigate('/admin/master-data/products');
    } catch (e: any) {
      setError(e?.message ?? 'Could not save this product.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <FormPageShell
      breadcrumb={<Breadcrumb items={[{ label: 'Home', to: '/pps-dashboard' }, { label: 'Master Data', to: '/admin/master-data' }, { label: 'Products', to: '/admin/master-data/products' }, { label: mode === 'create' ? 'New' : 'Edit' }]} tag="Table 1 · PRODUCT" />}
      badge="PR" badgeBg="#0E76A8"
      title={mode === 'create' ? 'Add a new Product' : `Edit ${existing?.name}`}
      subtitle="Products feed the dropdowns used by Form Templates, Submissions and the dashboard's default unit display."
      onCancel={() => navigate('/admin/master-data/products')}
      onSubmit={submit}
      canSubmit={canSubmit}
      submitting={submitting}
      formError={error}
      submitLabel={mode === 'create' ? 'Create Product' : 'Save Changes'}
    >
      <FormField label="Code" required error={codeError} helper="Short machine-friendly name, e.g. diesel.">
        <TextInput value={code} onChange={setCode} placeholder="diesel" mono error={codeError} />
      </FormField>
      <FormField label="Name" required helper="Full product name shown to users.">
        <TextInput value={name} onChange={setName} placeholder="Diesel" />
      </FormField>
      <FormField label="Default UOM" required helper="The normal unit this product is measured in.">
        <SelectInput value={defaultUomId} onChange={setDefaultUomId} options={uoms.map((u) => ({ value: u.id, label: `${u.name} (${u.code})` }))} />
      </FormField>
      <div className="flex flex-col gap-2 justify-center">
        <CheckboxInput checked={hasTpi} onChange={setHasTpi} label="Requires Third-Party Inspection (TPI)" helper="True for Diesel & LPG per the BRD." />
        <CheckboxInput checked={isActive} onChange={setIsActive} label="Active" helper="Inactive products are hidden from new submission forms." />
      </div>
    </FormPageShell>
  );
}

function NotFound({ onBack }: { onBack: () => void }) {
  return (
    <div className="max-w-[900px] mx-auto px-6 pt-10 pb-10 text-center">
      <div className="text-4xl mb-2">🔍</div>
      <div className="font-display font-bold text-[16px] text-ink-950">Product not found</div>
      <button onClick={onBack} className="btn-secondary text-[12.5px] mt-4">Back to Products</button>
    </div>
  );
}
