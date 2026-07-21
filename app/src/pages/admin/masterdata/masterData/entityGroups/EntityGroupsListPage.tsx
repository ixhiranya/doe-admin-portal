import { useNavigate } from 'react-router-dom';
import { useMasterData } from '../../../../../store/masterData';
import { MasterListPage, type MasterListColumn, type MasterListFilter } from '../../../../../components/masterdata/MasterListPage';
import type { MdEntityGroup } from '../../../../../types/masterData';

export function EntityGroupsListPage() {
  const navigate = useNavigate();
  const { entityGroups, entityGroupMembers, deleteEntityGroup } = useMasterData();
  const memberCount = (id: string) => entityGroupMembers.filter((m) => m.groupId === id).length;

  const columns: MasterListColumn<MdEntityGroup>[] = [
    { id: 'code', label: 'Code', width: '190px', sortAccessor: (r) => r.code, cell: (r) => <span className="font-mono text-[11.5px]">{r.code}</span> },
    { id: 'name', label: 'Name', sortAccessor: (r) => r.name, cell: (r) => <span className="font-semibold text-ink-950">{r.name}</span> },
    { id: 'members', label: 'Members', align: 'right', width: '100px', sortAccessor: (r) => memberCount(r.id), cell: (r) => <span className="font-mono">{memberCount(r.id)}</span> },
    { id: 'status', label: 'Status', align: 'center', width: '100px', sortAccessor: (r) => (r.isActive ? 1 : 0), cell: (r) => (
      <span className={`chip-sm ${r.isActive ? 'bg-success-soft text-success-500' : 'bg-neutral-100 text-neutral-500'}`}>{r.isActive ? 'Active' : 'Inactive'}</span>
    ) },
  ];

  const filters: MasterListFilter<MdEntityGroup>[] = [
    { id: 'status', label: 'Status', options: [{ value: '', label: 'All' }, { value: 'active', label: 'Active' }, { value: 'inactive', label: 'Inactive' }], predicate: (r, v) => (v === 'active' ? r.isActive : !r.isActive) },
  ];

  return (
    <MasterListPage
      breadcrumb={[{ label: 'Home', to: '/pps-dashboard' }, { label: 'Master Data', to: '/admin/master-data' }, { label: 'Entity Groups' }]}
      tag="Table 21 · ENTITY_GROUP"
      badge="EG" badgeBg="#0891B2"
      eyebrow="Master Data · Entity Groups"
      title="Entity Groups Registry"
      subtitle="Names a group of companies whose figures are added together for Tier-2 consolidation (e.g. the 5 consumers supplied by ADNOC Gas)."
      kpis={[
        { label: 'Total groups', value: entityGroups.length },
        { label: 'Active', value: entityGroups.filter((g) => g.isActive).length, tone: 'success' },
      ]}
      rows={entityGroups}
      searchableText={(r) => `${r.code} ${r.name}`}
      searchPlaceholder="Search by code or name…"
      filters={filters}
      columns={columns}
      defaultSortId="name"
      rowTo={(r) => `/admin/master-data/entity-groups/${r.id}`}
      onCreate={() => navigate('/admin/master-data/entity-groups/new')}
      createLabel="Add Entity Group"
      onDeleteConfirm={(r) => deleteEntityGroup(r.id)}
      deleteTitle={(r) => `Delete "${r.name}"?`}
      deleteMessage={(r) => <>This removes <strong>{r.name}</strong> ({r.code}) from the Entity Groups registry. This cannot be undone.</>}
      emptyIcon="🔗"
      emptyTitle="No matching entity groups"
      emptyMessage="Adjust your search or filters, or add a new entity group."
    />
  );
}
