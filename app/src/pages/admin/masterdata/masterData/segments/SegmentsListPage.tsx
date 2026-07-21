import { useNavigate } from 'react-router-dom';
import { useMasterData } from '../../../../../store/masterData';
import { MasterListPage, type MasterListColumn, type MasterListFilter } from '../../../../../components/masterdata/MasterListPage';
import type { MdSegment } from '../../../../../types/masterData';

export function SegmentsListPage() {
  const navigate = useNavigate();
  const { segments, deleteSegment } = useMasterData();
  const groups = Array.from(new Set(segments.map((s) => s.segmentGroup))).sort();

  const columns: MasterListColumn<MdSegment>[] = [
    { id: 'code', label: 'Code', width: '100px', sortAccessor: (r) => r.code, cell: (r) => <span className="font-mono text-[11.5px]">{r.code}</span> },
    { id: 'name', label: 'Name', sortAccessor: (r) => r.name, cell: (r) => <span className="font-semibold text-ink-950">{r.name}</span> },
    { id: 'group', label: 'Segment Group', width: '160px', sortAccessor: (r) => r.segmentGroup, cell: (r) => <span className="chip-sm bg-lavender text-neutral-700">{r.segmentGroup}</span> },
    { id: 'status', label: 'Status', align: 'center', width: '100px', sortAccessor: (r) => (r.isActive ? 1 : 0), cell: (r) => (
      <span className={`chip-sm ${r.isActive ? 'bg-success-soft text-success-500' : 'bg-neutral-100 text-neutral-500'}`}>{r.isActive ? 'Active' : 'Inactive'}</span>
    ) },
  ];

  const filters: MasterListFilter<MdSegment>[] = [
    { id: 'group', label: 'Group', options: [{ value: '', label: 'All groups' }, ...groups.map((g) => ({ value: g, label: g }))], predicate: (r, v) => r.segmentGroup === v },
  ];

  return (
    <MasterListPage
      breadcrumb={[{ label: 'Home', to: '/pps-dashboard' }, { label: 'Master Data', to: '/admin/master-data' }, { label: 'Segments' }]}
      tag="Table 7 · SEGMENT"
      badge="SG" badgeBg="#DC2626"
      eyebrow="Master Data · Segments"
      title="Segments Registry"
      subtitle="Customer / sales segments demand is broken down by. Each product form picks its own subset (e.g. Gasoline uses B2C/B2B; Diesel uses Commercial/Construction)."
      kpis={[
        { label: 'Total segments', value: segments.length },
        { label: 'Groups', value: groups.length, tone: 'info' },
        { label: 'Active', value: segments.filter((s) => s.isActive).length, tone: 'success' },
      ]}
      rows={segments}
      searchableText={(r) => `${r.code} ${r.name} ${r.segmentGroup}`}
      searchPlaceholder="Search by code, name or group…"
      filters={filters}
      columns={columns}
      defaultSortId="name"
      rowTo={(r) => `/admin/master-data/segments/${r.id}`}
      onCreate={() => navigate('/admin/master-data/segments/new')}
      createLabel="Add Segment"
      onDeleteConfirm={(r) => deleteSegment(r.id)}
      deleteTitle={(r) => `Delete "${r.name}"?`}
      deleteMessage={(r) => <>This removes <strong>{r.name}</strong> ({r.code}) from the Segments registry. This cannot be undone.</>}
      emptyIcon="📊"
      emptyTitle="No matching segments"
      emptyMessage="Adjust your search or filters, or add a new segment."
    />
  );
}
