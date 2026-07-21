import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMasterData } from '../../../../../store/masterData';
import { Breadcrumb } from '../../../../../components/masterdata/Chrome';
import { FormField, TextInput, SelectInput, NumberInput, CheckboxInput, FormPageShell } from '../../../../../components/masterdata/FormPrimitives';
import type { MdUomDimension } from '../../../../../types/masterData';

const DIMENSIONS: { value: MdUomDimension; label: string }[] = [
  { value: 'mass', label: 'Mass' }, { value: 'volume', label: 'Volume' }, { value: 'energy', label: 'Energy' }, { value: 'percent', label: 'Percent' },
];

export function UomFormPage({ mode }: { mode: 'create' | 'edit' }) {
  const navigate = useNavigate();
  const { id } = useParams();
  const { uoms, saveUom } = useMasterData();
  const existing = mode === 'edit' ? uoms.find((u) => u.id === id) : undefined;

  const [code, setCode] = useState(existing?.code ?? '');
  const [name, setName] = useState(existing?.name ?? '');
  const [dimension, setDimension] = useState<MdUomDimension>(existing?.dimension ?? 'mass');
  const [baseUomId, setBaseUomId] = useState(existing?.baseUomId ?? '');
  const [conversionFactor, setConversionFactor] = useState(String(existing?.conversionFactor ?? 1));
  const [isActive, setIsActive] = useState(existing?.isActive ?? true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const codeError = useMemo(() => {
    if (!code.trim()) return 'Code is required.';
    const dup = uoms.some((u) => u.code.toLowerCase() === code.trim().toLowerCase() && u.id !== existing?.id);
    if (dup) return 'A unit with this code already exists.';
    return undefined;
  }, [code, uoms, existing?.id]);

  const baseOptions = useMemo(
    () => [{ value: '', label: 'None (this is a base unit)' }, ...uoms.filter((u) => u.id !== existing?.id && u.dimension === dimension).map((u) => ({ value: u.id, label: `${u.name} (${u.code})` }))],
    [uoms, existing?.id, dimension],
  );

  const factorNum = Number(conversionFactor);
  const factorError = conversionFactor.trim() === '' || Number.isNaN(factorNum) || factorNum <= 0 ? 'Enter a positive number.' : undefined;
  const canSubmit = !codeError && name.trim().length > 0 && !factorError;

  if (mode === 'edit' && !existing) {
    return <NotFound onBack={() => navigate('/admin/master-data/uom')} />;
  }

  function submit() {
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    try {
      saveUom({ id: existing?.id, code: code.trim(), name: name.trim(), dimension, baseUomId: baseUomId || null, conversionFactor: factorNum, isActive });
      navigate('/admin/master-data/uom');
    } catch (e: any) {
      setError(e?.message ?? 'Could not save this unit.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <FormPageShell
      breadcrumb={<Breadcrumb items={[{ label: 'Home', to: '/pps-dashboard' }, { label: 'Master Data', to: '/admin/master-data' }, { label: 'UOM', to: '/admin/master-data/uom' }, { label: mode === 'create' ? 'New' : 'Edit' }]} tag="Table 4 · UOM" />}
      badge="UM" badgeBg="#D97706"
      title={mode === 'create' ? 'Add a new Unit of Measure' : `Edit ${existing?.name}`}
      subtitle="Same-dimension conversion only (e.g. kt ↔ Tonnes). Cross-dimension conversion is product-specific (PRODUCT_UNIT_FACTOR, out of scope)."
      onCancel={() => navigate('/admin/master-data/uom')}
      onSubmit={submit}
      canSubmit={canSubmit}
      submitting={submitting}
      formError={error}
      submitLabel={mode === 'create' ? 'Create Unit' : 'Save Changes'}
    >
      <FormField label="Code" required error={codeError} helper="Short unit code.">
        <TextInput value={code} onChange={setCode} placeholder="Tonnes" mono error={codeError} />
      </FormField>
      <FormField label="Name" required helper="Full unit name.">
        <TextInput value={name} onChange={setName} placeholder="Tonnes" />
      </FormField>
      <FormField label="Dimension" required helper="The kind of quantity: mass, volume, energy or percent.">
        <SelectInput value={dimension} onChange={(v) => { setDimension(v as MdUomDimension); setBaseUomId(''); }} options={DIMENSIONS} />
      </FormField>
      <FormField label="Base Unit" helper="Points to the base unit of the same kind, for same-type conversions.">
        <SelectInput value={baseUomId} onChange={setBaseUomId} options={baseOptions} />
      </FormField>
      <FormField label="Conversion Factor" required error={factorError} helper="How many base units are in one of this unit.">
        <NumberInput value={conversionFactor} onChange={setConversionFactor} placeholder="0.001" error={factorError} />
      </FormField>
      <div className="flex items-center">
        <CheckboxInput checked={isActive} onChange={setIsActive} label="Active" helper="Inactive units are hidden from dropdowns." />
      </div>
    </FormPageShell>
  );
}

function NotFound({ onBack }: { onBack: () => void }) {
  return (
    <div className="max-w-[900px] mx-auto px-6 pt-10 pb-10 text-center">
      <div className="text-4xl mb-2">🔍</div>
      <div className="font-display font-bold text-[16px] text-ink-950">Unit not found</div>
      <button onClick={onBack} className="btn-secondary text-[12.5px] mt-4">Back to UOM</button>
    </div>
  );
}
