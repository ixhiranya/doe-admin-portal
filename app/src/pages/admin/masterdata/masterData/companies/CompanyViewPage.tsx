import { useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useMasterData } from '../../../../../store/masterData';
import { Breadcrumb, DeleteConfirmModal } from '../../../../../components/masterdata/Chrome';
import { ViewPageShell, ViewField } from '../../../../../components/masterdata/FormPrimitives';
import { formatDateTime } from '../../../../../lib/utils';

export function CompanyViewPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { companies, entityTypes, entityGroups, entityGroupMembers, deleteCompany } = useMasterData();
  const company = companies.find((c) => c.id === id);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!company) {
    return (
      <div className="max-w-[900px] mx-auto px-6 pt-10 pb-10 text-center">
        <div className="text-4xl mb-2">🔍</div>
        <div className="font-display font-bold text-[16px] text-ink-950">Company not found</div>
        <button onClick={() => navigate('/admin/master-data/companies')} className="btn-secondary text-[12.5px] mt-4">Back to Companies</button>
      </div>
    );
  }

  const entityType = entityTypes.find((t) => t.id === company.entityTypeId);
  const parent = company.parentCompanyId ? companies.find((c) => c.id === company.parentCompanyId) : undefined;
  const children = companies.filter((c) => c.parentCompanyId === company.id);
  const memberships = entityGroupMembers.filter((m) => m.companyId === company.id).map((m) => entityGroups.find((g) => g.id === m.groupId)).filter(Boolean);

  function handleDelete() {
    const res = deleteCompany(company!.id);
    if (!res.ok) { setError(res.error ?? 'Unable to delete.'); return; }
    navigate('/admin/master-data/companies');
  }

  return (
    <ViewPageShell
      breadcrumb={<Breadcrumb items={[{ label: 'Home', to: '/pps-dashboard' }, { label: 'Master Data', to: '/admin/master-data' }, { label: 'Companies', to: '/admin/master-data/companies' }, { label: company.name }]} tag="Table 2 · COMPANY" />}
      badge="CO" badgeBg="#B86E25"
      title={company.name}
      subtitle={`Code: ${company.code}`}
      actions={
        <>
          <button onClick={() => navigate(`/admin/master-data/companies/${company.id}/edit`)} className="btn-secondary text-[12px]">Edit</button>
          <button onClick={() => setConfirmOpen(true)} className="btn-danger text-[12px]">Delete</button>
        </>
      }
    >
      <ViewField label="Code"><span className="font-mono">{company.code}</span></ViewField>
      <ViewField label="Name">{company.name}</ViewField>
      <ViewField label="Entity Type">{entityType?.name ?? '—'}</ViewField>
      <ViewField label="Parent Company">
        {parent ? <Link to={`/admin/master-data/companies/${parent.id}`} className="text-info-500 hover:underline">{parent.name}</Link> : '—'}
      </ViewField>
      <ViewField label="Is Aggregate">
        <span className={`chip-sm ${company.isAggregate ? 'bg-warning-soft text-warning-500' : 'bg-neutral-100 text-neutral-500'}`}>{company.isAggregate ? 'Yes' : 'No'}</span>
      </ViewField>
      <ViewField label="Status">
        <span className={`chip-sm ${company.isActive ? 'bg-success-soft text-success-500' : 'bg-neutral-100 text-neutral-500'}`}>{company.isActive ? 'Active' : 'Inactive'}</span>
      </ViewField>
      <ViewField label="Child Companies">
        {children.length === 0 ? '—' : (
          <div className="flex flex-wrap gap-1.5">
            {children.map((ch) => <Link key={ch.id} to={`/admin/master-data/companies/${ch.id}`} className="chip-sm bg-neutral-100 text-neutral-700 hover:bg-neutral-200">{ch.name}</Link>)}
          </div>
        )}
      </ViewField>
      <ViewField label="Entity Group Membership">
        {memberships.length === 0 ? '—' : (
          <div className="flex flex-wrap gap-1.5">
            {memberships.map((g) => <Link key={g!.id} to={`/admin/master-data/entity-groups/${g!.id}`} className="chip-sm bg-info-soft text-info-500 hover:opacity-80">{g!.name}</Link>)}
          </div>
        )}
      </ViewField>
      <ViewField label="Last Updated">{formatDateTime(company.updatedAt)}</ViewField>

      <DeleteConfirmModal
        open={confirmOpen}
        title={`Delete "${company.name}"?`}
        message={<>{error ? <span className="text-doe-red font-semibold">{error}</span> : <>This removes <strong>{company.name}</strong> from the Companies registry. This cannot be undone.</>}</>}
        onCancel={() => { setConfirmOpen(false); setError(null); }}
        onConfirm={handleDelete}
      />
    </ViewPageShell>
  );
}
