import { useNavigate } from 'react-router-dom';
import { useMasterData } from '../../../../../store/masterData';
import { MasterListPage, type MasterListColumn, type MasterListFilter } from '../../../../../components/masterdata/MasterListPage';
import type { MdRegion } from '../../../../../types/masterData';

export function RegionsListPage() {
  const navigate = useNavigate();
  const { regions, deleteRegion } = useMasterData();
  const parentName = (pid: string | null) => (pid ? regions.find((r) => r.id === pid)?.name ?? '—' : '—');

  const columns: MasterListColumn<MdRegion>[] = [
    { id: 'code', label: 'Code', width: '100px', sortAccessor: (r) => r.code, cell: (r) => <span className="font-mono text-[11.5px]">{r.code}</span> },
    { id: 'name', label: 'Name', sortAccessor: (r) => r.name, cell: (r) => <span className="font-semibold text-ink-950">{r.name}</span> },
    { id: 'parent', label: 'Parent Region', width: '160px', sortAccessor: (r) => parentName(r.parentRegionId), cell: (r) => parentName(r.parentRegionId) },
    { id: 'status', label: 'Status', align: 'center', width: '100px', sortAccessor: (r) => (r.isActive ? 1 : 0), cell: (r) => (
      <span className={`chip-sm ${r.isActive ? 'bg-success-soft text-success-500' : 'bg-neutral-100 text-neutral-500'}`}>{r.isActive ? 'Active' : 'Inactive'}</span>
    ) },
  ];

  const filters: MasterListFilter<MdRegion>[] = [
    { id: 'status', label: 'Status', options: [{ value: '', label: 'All' }, { value: 'active', label: 'Active' }, { value: 'inactive', label: 'Inactive' }], predicate: (r, v) => (v === 'active' ? r.isActive : !r.isActive) },
  ];

  return (
    <MasterListPage
      breadcrumb={[{ label: 'Home', to: '/pps-dashboard' }, { label: 'Master Data', to: '/admin/master-data' }, { label: 'Regions' }]}
      tag="Table 6 · REGION"
      badge="RG" badgeBg="#22A745"
      eyebrow="Master Data · Regions"
      title="Regions Registry"
      subtitle="The 3 Emirate of Abu Dhabi regions almost every form splits demand by: Abu Dhabi City, Al Ain, Al Dhafra."
      kpis={[
        { label: 'Total regions', value: regions.length },
        { label: 'Active', value: regions.filter((r) => r.isActive).length, tone: 'success' },
      ]}
      rows={regions}
      searchableText={(r) => `${r.code} ${r.name}`}
      searchPlaceholder="Search by code or name…"
      filters={filters}
      columns={columns}
      defaultSortId="name"
      rowTo={(r) => `/admin/master-data/regions/${r.id}`}
      onCreate={() => navigate('/admin/master-data/regions/new')}
      createLabel="Add Region"
      onDeleteConfirm={(r) => deleteRegion(r.id)}
      deleteTitle={(r) => `Delete "${r.name}"?`}
      deleteMessage={(r) => <>This removes <strong>{r.name}</strong> ({r.code}) from the Regions registry. This cannot be undone.</>}
      emptyIcon="🗺️"
      emptyTitle="No matching regions"
      emptyMessage="Adjust your search or filters, or add a new region."
    />
  );
}
