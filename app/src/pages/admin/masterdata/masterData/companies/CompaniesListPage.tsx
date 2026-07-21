import { useNavigate } from 'react-router-dom';
import { useMasterData } from '../../../../../store/masterData';
import { MasterListPage, type MasterListColumn, type MasterListFilter } from '../../../../../components/masterdata/MasterListPage';
import type { MdCompany } from '../../../../../types/masterData';

export function CompaniesListPage () {
  const navigate = useNavigate();
  const { companies, entityTypes, deleteCompany } = useMasterData();
  const typeName = (id: string) => entityTypes.find((t) => t.id === id)?.name ?? '—';
  const parentName = (id: string | null) => (id ? companies.find((c) => c.id === id)?.name ?? '—' : '—');

  const columns: MasterListColumn<MdCompany>[] = [
    { id: 'code', label: 'Code', width: '110px', sortAccessor: (r) => r.code, cell: (r) => <span className="font-mono text-[11.5px]">{r.code}</span> },
    { id: 'name', label: 'Name', sortAccessor: (r) => r.name, cell: (r) => (
      <div>
        <div className="font-semibold text-ink-950">{r.name}</div>
        {r.isAggregate && <div className="text-[10px] text-amber-700 mt-0.5">Aggregate bucket</div>}
      </div>
    ) },
    { id: 'type', label: 'Entity Type', width: '140px', sortAccessor: (r) => typeName(r.entityTypeId), cell: (r) => typeName(r.entityTypeId) },
    { id: 'parent', label: 'Parent Company', width: '170px', sortAccessor: (r) => parentName(r.parentCompanyId), cell: (r) => parentName(r.parentCompanyId) },
    { id: 'status', label: 'Status', align: 'center', width: '100px', sortAccessor: (r) => (r.isActive ? 1 : 0), cell: (r) => (
      <span className={`chip-sm ${r.isActive ? 'bg-success-soft text-success-500' : 'bg-neutral-100 text-neutral-500'}`}>{r.isActive ? 'Active' : 'Inactive'}</span>
    ) },
  ];

  const filters: MasterListFilter<MdCompany>[] = [
    { id: 'type', label: 'Entity Type', options: [{ value: '', label: 'All types' }, ...entityTypes.map((t) => ({ value: t.id, label: t.name }))], predicate: (r, v) => r.entityTypeId === v },
    { id: 'aggregate', label: 'Kind', options: [{ value: '', label: 'All' }, { value: 'aggregate', label: 'Aggregate only' }, { value: 'single', label: 'Single company' }], predicate: (r, v) => (v === 'aggregate' ? r.isAggregate : !r.isAggregate) },
    { id: 'status', label: 'Status', options: [{ value: '', label: 'All' }, { value: 'active', label: 'Active' }, { value: 'inactive', label: 'Inactive' }], predicate: (r, v) => (v === 'active' ? r.isActive : !r.isActive) },
  ];

  return (
    <MasterListPage
      breadcrumb={[{ label: 'Home', to: '/pps-dashboard' }, { label: 'Master Data', to: '/admin/master-data' }, { label: 'Companies' }]}
      tag="Table 2 · COMPANY"
      badge="CO" badgeBg="#B86E25"
      eyebrow="Master Data · Companies"
      title="Reporting Entities Registry"
      subtitle="The entities (companies) that submit PPS data, including parent groups (EMSTEEL, ADNOC) and aggregate buckets (Grey Market, Direct Importers)."
      kpis={[
        { label: 'Total companies', value: companies.length },
        { label: 'Aggregate buckets', value: companies.filter((c) => c.isAggregate).length, tone: 'warning' },
        { label: 'With parent group', value: companies.filter((c) => c.parentCompanyId).length, tone: 'info' },
        { label: 'Active', value: companies.filter((c) => c.isActive).length, tone: 'success' },
      ]}
      rows={companies}
      searchableText={(r) => `${r.code} ${r.name}`}
      searchPlaceholder="Search by code or name…"
      filters={filters}
      columns={columns}
      defaultSortId="name"
      rowTo={(r) => `/admin/master-data/companies/${r.id}`}
      onCreate={() => navigate('/admin/master-data/companies/new')}
      createLabel="Add Company"
      onDeleteConfirm={(r) => deleteCompany(r.id)}
      deleteTitle={(r) => `Delete "${r.name}"?`}
      deleteMessage={(r) => <>This removes <strong>{r.name}</strong> ({r.code}) from the Companies registry. This cannot be undone.</>}
      emptyIcon="🏢"
      emptyTitle="No matching companies"
      emptyMessage="Adjust your search or filters, or add a new company."
    />
  );
}
