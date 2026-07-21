import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMasterData } from '../../../../../store/masterData';
import { Breadcrumb } from '../../../../../components/masterdata/Chrome';
import { FormField, TextInput, SelectInput, CheckboxInput, FormPageShell } from '../../../../../components/masterdata/FormPrimitives';

export function CompanyFormPage({ mode }: { mode: 'create' | 'edit' }) {
  const navigate = useNavigate();
  const { id } = useParams();
  const { companies, entityTypes, saveCompany } = useMasterData();
  const existing = mode === 'edit' ? companies.find((c) => c.id === id) : undefined;

  const [code, setCode] = useState(existing?.code ?? '');
  const [name, setName] = useState(existing?.name ?? '');
  const [entityTypeId, setEntityTypeId] = useState(existing?.entityTypeId ?? entityTypes[0]?.id ?? '');
  const [parentCompanyId, setParentCompanyId] = useState(existing?.parentCompanyId ?? '');
  const [isAggregate, setIsAggregate] = useState(existing?.isAggregate ?? false);
  const [isActive, setIsActive] = useState(existing?.isActive ?? true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const codeError = useMemo(() => {
    if (!code.trim()) return 'Code is required.';
    const dup = companies.some((c) => c.code.toLowerCase() === code.trim().toLowerCase() && c.id !== existing?.id);
    if (dup) return 'A company with this code already exists.';
    return undefined;
  }, [code, companies, existing?.id]);

  // A company cannot be its own parent, nor its own descendant's parent.
  const parentOptions = useMemo(() => {
    const excluded = new Set<string>();
    if (existing?.id) {
      excluded.add(existing.id);
      const collectDescendants = (pid: string) => {
        companies.filter((c) => c.parentCompanyId === pid).forEach((c) => { excluded.add(c.id); collectDescendants(c.id); });
      };
      collectDescendants(existing.id);
    }
    return [{ value: '', label: 'None (top-level)' }, ...companies.filter((c) => !excluded.has(c.id)).map((c) => ({ value: c.id, label: `${c.name} (${c.code})` }))];
  }, [companies, existing?.id]);

  const canSubmit = !codeError && name.trim().length > 0 && !!entityTypeId;

  if (mode === 'edit' && !existing) {
    return <NotFound onBack={() => navigate('/admin/master-data/companies')} />;
  }

  function submit() {
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    try {
      saveCompany({
        id: existing?.id,
        code: code.trim().toUpperCase(),
        name: name.trim(),
        entityTypeId,
        parentCompanyId: parentCompanyId || null,
        isAggregate,
        isActive,
      });
      navigate('/admin/master-data/companies');
    } catch (e: any) {
      setError(e?.message ?? 'Could not save this company.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <FormPageShell
      breadcrumb={<Breadcrumb items={[{ label: 'Home', to: '/pps-dashboard' }, { label: 'Master Data', to: '/admin/master-data' }, { label: 'Companies', to: '/admin/master-data/companies' }, { label: mode === 'create' ? 'New' : 'Edit' }]} tag="Table 2 · COMPANY" />}
      badge="CO" badgeBg="#B86E25"
      title={mode === 'create' ? 'Add a new Company' : `Edit ${existing?.name}`}
      subtitle="Companies drive the submitter dropdown, the parent/aggregate rollups, and Entity Group membership."
      onCancel={() => navigate('/admin/master-data/companies')}
      onSubmit={submit}
      canSubmit={canSubmit}
      submitting={submitting}
      formError={error}
      submitLabel={mode === 'create' ? 'Create Company' : 'Save Changes'}
    >
      <FormField label="Code" required error={codeError} helper="Short code for the company.">
        <TextInput value={code} onChange={setCode} placeholder="ADNOCD" mono error={codeError} />
      </FormField>
      <FormField label="Name" required helper="Full company name.">
        <TextInput value={name} onChange={setName} placeholder="ADNOC Distribution" />
      </FormField>
      <FormField label="Entity Type" required helper="The role this company plays.">
        <SelectInput value={entityTypeId} onChange={setEntityTypeId} options={entityTypes.map((t) => ({ value: t.id, label: t.name }))} />
      </FormField>
      <FormField label="Parent Company" helper="The group this company belongs to (self-link). Leave blank if none.">
        <SelectInput value={parentCompanyId} onChange={setParentCompanyId} options={parentOptions} />
      </FormField>
      <div className="flex flex-col gap-2 justify-center sm:col-span-2">
        <CheckboxInput checked={isAggregate} onChange={setIsAggregate} label="Is Aggregate" helper='True if this one row stands for many small un-listed companies (e.g. "Grey Market").' />
        <CheckboxInput checked={isActive} onChange={setIsActive} label="Active" helper="Inactive companies are hidden from new submission forms." />
      </div>
    </FormPageShell>
  );
}

function NotFound({ onBack }: { onBack: () => void }) {
  return (
    <div className="max-w-[900px] mx-auto px-6 pt-10 pb-10 text-center">
      <div className="text-4xl mb-2">🔍</div>
      <div className="font-display font-bold text-[16px] text-ink-950">Company not found</div>
      <button onClick={onBack} className="btn-secondary text-[12.5px] mt-4">Back to Companies</button>
    </div>
  );
}
