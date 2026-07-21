import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMasterData } from '../../../../../store/masterData';
import { Breadcrumb } from '../../../../../components/masterdata/Chrome';
import { FormField, TextInput, CheckboxInput, FormPageShell } from '../../../../../components/masterdata/FormPrimitives';

export function SegmentFormPage({ mode }: { mode: 'create' | 'edit' }) {
  const navigate = useNavigate();
  const { id } = useParams();
  const { segments, saveSegment } = useMasterData();
  const existing = mode === 'edit' ? segments.find((s) => s.id === id) : undefined;
  const knownGroups = useMemo(() => Array.from(new Set(segments.map((s) => s.segmentGroup))).sort(), [segments]);

  const [code, setCode] = useState(existing?.code ?? '');
  const [name, setName] = useState(existing?.name ?? '');
  const [segmentGroup, setSegmentGroup] = useState(existing?.segmentGroup ?? '');
  const [isActive, setIsActive] = useState(existing?.isActive ?? true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const codeError = useMemo(() => {
    if (!code.trim()) return 'Code is required.';
    const dup = segments.some((s) => s.code.toLowerCase() === code.trim().toLowerCase() && s.id !== existing?.id);
    if (dup) return 'A segment with this code already exists.';
    return undefined;
  }, [code, segments, existing?.id]);

  const canSubmit = !codeError && name.trim().length > 0 && segmentGroup.trim().length > 0;

  if (mode === 'edit' && !existing) {
    return <NotFound onBack={() => navigate('/admin/master-data/segments')} />;
  }

  function submit() {
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    try {
      saveSegment({ id: existing?.id, code: code.trim().toUpperCase(), name: name.trim(), segmentGroup: segmentGroup.trim(), isActive });
      navigate('/admin/master-data/segments');
    } catch (e: any) {
      setError(e?.message ?? 'Could not save this segment.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <FormPageShell
      breadcrumb={<Breadcrumb items={[{ label: 'Home', to: '/pps-dashboard' }, { label: 'Master Data', to: '/admin/master-data' }, { label: 'Segments', to: '/admin/master-data/segments' }, { label: mode === 'create' ? 'New' : 'Edit' }]} tag="Table 7 · SEGMENT" />}
      badge="SG" badgeBg="#DC2626"
      title={mode === 'create' ? 'Add a new Segment' : `Edit ${existing?.name}`}
      subtitle="Segments feed the customer/sales-segment breakdown blocks on product submission forms."
      onCancel={() => navigate('/admin/master-data/segments')}
      onSubmit={submit}
      canSubmit={canSubmit}
      submitting={submitting}
      formError={error}
      submitLabel={mode === 'create' ? 'Create Segment' : 'Save Changes'}
    >
      <FormField label="Code" required error={codeError} helper="Short segment code.">
        <TextInput value={code} onChange={setCode} placeholder="RES" mono error={codeError} />
      </FormField>
      <FormField label="Name" required helper="Segment name shown on the form.">
        <TextInput value={name} onChange={setName} placeholder="Residential" />
      </FormField>
      <div className="sm:col-span-2">
        <FormField label="Segment Group" required helper='A wider grouping, e.g. "End-use sector" or "Channel".'>
          <input
            list="segment-group-options"
            value={segmentGroup}
            onChange={(e) => setSegmentGroup(e.target.value)}
            placeholder="End-use sector"
            className="field-input"
          />
          <datalist id="segment-group-options">
            {knownGroups.map((g) => <option key={g} value={g} />)}
          </datalist>
        </FormField>
      </div>
      <div className="flex items-center">
        <CheckboxInput checked={isActive} onChange={setIsActive} label="Active" helper="Inactive segments are hidden from submission forms." />
      </div>
    </FormPageShell>
  );
}

function NotFound({ onBack }: { onBack: () => void }) {
  return (
    <div className="max-w-[900px] mx-auto px-6 pt-10 pb-10 text-center">
      <div className="text-4xl mb-2">🔍</div>
      <div className="font-display font-bold text-[16px] text-ink-950">Segment not found</div>
      <button onClick={onBack} className="btn-secondary text-[12.5px] mt-4">Back to Segments</button>
    </div>
  );
}
