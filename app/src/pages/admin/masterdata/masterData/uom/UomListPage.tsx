import { useNavigate } from 'react-router-dom';
import { useMasterData } from '../../../../../store/masterData';
import { MasterListPage, type MasterListColumn, type MasterListFilter } from '../../../../../components/masterdata/MasterListPage';
import type { MdUom } from '../../../../../types/masterData';

const DIMENSION_LABEL: Record<string, string> = { mass: 'Mass', volume: 'Volume', energy: 'Energy', percent: 'Percent' };

export function UomListPage() {
  const navigate = useNavigate();
  const { uoms, deleteUom } = useMasterData();
  const baseUomName = (id: string | null) => (id ? uoms.find((u) => u.id === id)?.name ?? '—' : '—');

  const columns: MasterListColumn<MdUom>[] = [
    { id: 'code', label: 'Code', width: '100px', sortAccessor: (r) => r.code, cell: (r) => <span className="font-mono text-[11.5px]">{r.code}</span> },
    { id: 'name', label: 'Name', sortAccessor: (r) => r.name, cell: (r) => <span className="font-semibold text-ink-950">{r.name}</span> },
    { id: 'dimension', label: 'Dimension', width: '110px', sortAccessor: (r) => r.dimension, cell: (r) => <span className="capitalize">{DIMENSION_LABEL[r.dimension]}</span> },
    { id: 'base', label: 'Base Unit', width: '140px', sortAccessor: (r) => baseUomName(r.baseUomId), cell: (r) => baseUomName(r.baseUomId) },
    { id: 'factor', label: '1 unit = X base', align: 'right', width: '150px', sortAccessor: (r) => r.conversionFactor, cell: (r) => <span className="font-mono">{r.conversionFactor}</span> },
    { id: 'status', label: 'Status', align: 'center', width: '90px', sortAccessor: (r) => (r.isActive ? 1 : 0), cell: (r) => (
      <span className={`chip-sm ${r.isActive ? 'bg-success-soft text-success-500' : 'bg-neutral-100 text-neutral-500'}`}>{r.isActive ? 'Active' : 'Inactive'}</span>
    ) },
  ];

  const filters: MasterListFilter<MdUom>[] = [
    { id: 'dimension', label: 'Dimension', options: [{ value: '', label: 'All dimensions' }, ...Object.entries(DIMENSION_LABEL).map(([value, label]) => ({ value, label }))], predicate: (r, v) => r.dimension === v },
  ];

  return (
    <MasterListPage
      breadcrumb={[{ label: 'Home', to: '/pps-dashboard' }, { label: 'Master Data', to: '/admin/master-data' }, { label: 'UOM' }]}
      tag="Table 4 · UOM"
      badge="UM" badgeBg="#D97706"
      eyebrow="Master Data · Units of Measure"
      title="Units of Measure Registry"
      subtitle="Units used across product forms (kt, Tonnes, Billion btu, Liters) with same-dimension conversion factors. Cross-dimension conversion is product-specific and lives in PRODUCT_UNIT_FACTOR (out of scope for this screen)."
      kpis={[
        { label: 'Total units', value: uoms.length },
        { label: 'Mass', value: uoms.filter((u) => u.dimension === 'mass').length, tone: 'info' },
        { label: 'Volume', value: uoms.filter((u) => u.dimension === 'volume').length, tone: 'info' },
        { label: 'Energy', value: uoms.filter((u) => u.dimension === 'energy').length, tone: 'info' },
      ]}
      rows={uoms}
      searchableText={(r) => `${r.code} ${r.name}`}
      searchPlaceholder="Search by code or name…"
      filters={filters}
      columns={columns}
      defaultSortId="name"
      rowTo={(r) => `/admin/master-data/uom/${r.id}`}
      onCreate={() => navigate('/admin/master-data/uom/new')}
      createLabel="Add UOM"
      onDeleteConfirm={(r) => deleteUom(r.id)}
      deleteTitle={(r) => `Delete "${r.name}"?`}
      deleteMessage={(r) => <>This removes <strong>{r.name}</strong> ({r.code}) from the UOM registry. This cannot be undone.</>}
      emptyIcon="📏"
      emptyTitle="No matching units"
      emptyMessage="Adjust your search or filters, or add a new unit."
    />
  );
}
