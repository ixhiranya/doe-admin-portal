import { useNavigate } from 'react-router-dom';
import { useMasterData } from '../../../../../store/masterData';
import { MasterListPage, type MasterListColumn, type MasterListFilter } from '../../../../../components/masterdata/MasterListPage';
import type { MdEntityType } from '../../../../../types/masterData';

export function EntityTypesListPage() {
  const navigate = useNavigate();
  const { entityTypes, companies, deleteEntityType } = useMasterData();
  const usageCount = (id: string) => companies.filter((c) => c.entityTypeId === id).length;

  const columns: MasterListColumn<MdEntityType>[] = [
    { id: 'code', label: 'Code', width: '130px', sortAccessor: (r) => r.code, cell: (r) => <span className="font-mono text-[11.5px]">{r.code}</span> },
    { id: 'name', label: 'Name', sortAccessor: (r) => r.name, cell: (r) => <span className="font-semibold text-ink-950">{r.name}</span> },
    { id: 'description', label: 'Description', cell: (r) => <span className="text-neutral-600">{r.description}</span> },
    { id: 'usage', label: 'Companies', align: 'right', width: '100px', sortAccessor: (r) => usageCount(r.id), cell: (r) => <span className="font-mono">{usageCount(r.id)}</span> },
    { id: 'status', label: 'Status', align: 'center', width: '90px', sortAccessor: (r) => (r.isActive ? 1 : 0), cell: (r) => (
      <span className={`chip-sm ${r.isActive ? 'bg-success-soft text-success-500' : 'bg-neutral-100 text-neutral-500'}`}>{r.isActive ? 'Active' : 'Inactive'}</span>
    ) },
  ];

  const filters: MasterListFilter<MdEntityType>[] = [
    { id: 'status', label: 'Status', options: [{ value: '', label: 'All' }, { value: 'active', label: 'Active' }, { value: 'inactive', label: 'Inactive' }], predicate: (r, v) => (v === 'active' ? r.isActive : !r.isActive) },
  ];

  return (
    <MasterListPage
      breadcrumb={[{ label: 'Home', to: '/pps-dashboard' }, { label: 'Master Data', to: '/admin/master-data' }, { label: 'Entity Types' }]}
      tag="Normalized · COMPANY.entity_type"
      badge="ET" badgeBg="#7C3AED"
      eyebrow="Master Data · Entity Types"
      title="Entity Types Registry"
      subtitle="The roles a company can play — Producer, Distributor, Importer, Consumer, Aggregator. Normalized here from the free-text entity_type column on COMPANY."
      kpis={[
        { label: 'Total types', value: entityTypes.length },
        { label: 'In use', value: entityTypes.filter((t) => usageCount(t.id) > 0).length, tone: 'info' },
        { label: 'Active', value: entityTypes.filter((t) => t.isActive).length, tone: 'success' },
      ]}
      rows={entityTypes}
      searchableText={(r) => `${r.code} ${r.name} ${r.description}`}
      searchPlaceholder="Search by code, name or description…"
      filters={filters}
      columns={columns}
      defaultSortId="name"
      rowTo={(r) => `/admin/master-data/entity-types/${r.id}`}
      onCreate={() => navigate('/admin/master-data/entity-types/new')}
      createLabel="Add Entity Type"
      onDeleteConfirm={(r) => deleteEntityType(r.id)}
      deleteTitle={(r) => `Delete "${r.name}"?`}
      deleteMessage={(r) => <>This removes <strong>{r.name}</strong> from the Entity Types registry. This cannot be undone.</>}
      emptyIcon="🏷️"
      emptyTitle="No matching entity types"
      emptyMessage="Adjust your search or filters, or add a new entity type."
    />
  );
}
