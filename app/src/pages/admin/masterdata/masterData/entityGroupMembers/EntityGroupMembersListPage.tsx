import { useNavigate } from 'react-router-dom';
import { useMasterData } from '../../../../../store/masterData';
import { MasterListPage, type MasterListColumn, type MasterListFilter } from '../../../../../components/masterdata/MasterListPage';
import type { MdEntityGroupMember } from '../../../../../types/masterData';
import { formatDate } from '../../../../../lib/utils';

export function EntityGroupMembersListPage() {
  const navigate = useNavigate();
  const { entityGroupMembers, entityGroups, companies, deleteEntityGroupMember } = useMasterData();
  const groupName = (id: string) => entityGroups.find((g) => g.id === id)?.name ?? '—';
  const companyName = (id: string) => companies.find((c) => c.id === id)?.name ?? '—';

  const columns: MasterListColumn<MdEntityGroupMember>[] = [
    { id: 'group', label: 'Entity Group', sortAccessor: (r) => groupName(r.groupId), cell: (r) => <span className="font-semibold text-ink-950">{groupName(r.groupId)}</span> },
    { id: 'company', label: 'Company (Member)', sortAccessor: (r) => companyName(r.companyId), cell: (r) => companyName(r.companyId) },
    { id: 'created', label: 'Added', width: '140px', sortAccessor: (r) => r.createdAt, cell: (r) => formatDate(r.createdAt) },
  ];

  const filters: MasterListFilter<MdEntityGroupMember>[] = [
    { id: 'group', label: 'Entity Group', options: [{ value: '', label: 'All groups' }, ...entityGroups.map((g) => ({ value: g.id, label: g.name }))], predicate: (r, v) => r.groupId === v },
  ];

  return (
    <MasterListPage
      breadcrumb={[{ label: 'Home', to: '/pps-dashboard' }, { label: 'Master Data', to: '/admin/master-data' }, { label: 'Entity Group Members' }]}
      tag="Table 22 · ENTITY_GROUP_MEMBER"
      badge="GM" badgeBg="#475569"
      eyebrow="Master Data · Entity Group Members"
      title="Entity Group Members Registry"
      subtitle="Which companies belong to which Entity Group, one row per company — drives the Tier-2 consolidation SUM in CONSOLIDATION_RULE."
      kpis={[
        { label: 'Total memberships', value: entityGroupMembers.length },
        { label: 'Groups with members', value: new Set(entityGroupMembers.map((m) => m.groupId)).size, tone: 'info' },
      ]}
      rows={entityGroupMembers}
      searchableText={(r) => `${groupName(r.groupId)} ${companyName(r.companyId)}`}
      searchPlaceholder="Search by group or company…"
      filters={filters}
      columns={columns}
      defaultSortId="group"
      rowTo={(r) => `/admin/master-data/entity-group-members/${r.id}`}
      onCreate={() => navigate('/admin/master-data/entity-group-members/new')}
      createLabel="Add Member"
      onDeleteConfirm={(r) => deleteEntityGroupMember(r.id)}
      deleteTitle={() => `Remove this membership?`}
      deleteMessage={(r) => <>This removes <strong>{companyName(r.companyId)}</strong> from <strong>{groupName(r.groupId)}</strong>. This cannot be undone.</>}
      emptyIcon="👥"
      emptyTitle="No matching memberships"
      emptyMessage="Adjust your search or filters, or add a new member."
    />
  );
}
