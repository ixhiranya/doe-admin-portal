import { useNavigate } from 'react-router-dom';
import { useMasterData } from '../../../../../store/masterData';
import { MasterListPage, type MasterListColumn, type MasterListFilter } from '../../../../../components/masterdata/MasterListPage';
import type { MdProduct } from '../../../../../types/masterData';

export function ProductsListPage() {
  const navigate = useNavigate();
  const { products, uoms, deleteProduct } = useMasterData();
  const uomName = (id: string) => uoms.find((u) => u.id === id)?.name ?? '—';

  const columns: MasterListColumn<MdProduct>[] = [
    { id: 'code', label: 'Code', width: '140px', sortAccessor: (r) => r.code, cell: (r) => <span className="font-mono text-[11.5px]">{r.code}</span> },
    { id: 'name', label: 'Name', sortAccessor: (r) => r.name, cell: (r) => <span className="font-semibold text-ink-950">{r.name}</span> },
    { id: 'uom', label: 'Default UOM', width: '160px', sortAccessor: (r) => uomName(r.defaultUomId), cell: (r) => uomName(r.defaultUomId) },
    { id: 'tpi', label: 'TPI Required', align: 'center', width: '120px', sortAccessor: (r) => (r.hasTpi ? 1 : 0), cell: (r) => (
      <span className={`chip-sm ${r.hasTpi ? 'bg-warning-soft text-warning-500' : 'bg-neutral-100 text-neutral-500'}`}>{r.hasTpi ? 'Yes' : 'No'}</span>
    ) },
    { id: 'status', label: 'Status', align: 'center', width: '100px', sortAccessor: (r) => (r.isActive ? 1 : 0), cell: (r) => (
      <span className={`chip-sm ${r.isActive ? 'bg-success-soft text-success-500' : 'bg-neutral-100 text-neutral-500'}`}>{r.isActive ? 'Active' : 'Inactive'}</span>
    ) },
  ];

  const filters: MasterListFilter<MdProduct>[] = [
    { id: 'uom', label: 'UOM', options: [{ value: '', label: 'All UOMs' }, ...uoms.map((u) => ({ value: u.id, label: u.name }))], predicate: (r, v) => r.defaultUomId === v },
    { id: 'tpi', label: 'TPI', options: [{ value: '', label: 'All' }, { value: 'yes', label: 'Requires TPI' }, { value: 'no', label: 'No TPI' }], predicate: (r, v) => (v === 'yes' ? r.hasTpi : !r.hasTpi) },
    { id: 'status', label: 'Status', options: [{ value: '', label: 'All' }, { value: 'active', label: 'Active' }, { value: 'inactive', label: 'Inactive' }], predicate: (r, v) => (v === 'active' ? r.isActive : !r.isActive) },
  ];

  return (
    <MasterListPage
      breadcrumb={[{ label: 'Home', to: '/pps-dashboard' }, { label: 'Master Data', to: '/admin/master-data' }, { label: 'Products' }]}
      tag="Table 1 · PRODUCT"
      badge="PR" badgeBg="#0E76A8"
      eyebrow="Master Data · Products"
      title="Petroleum Products Registry"
      subtitle="The 12 products companies report on across the PPS module (BRD §1), each with its default unit of measure and Third-Party Inspection flag."
      kpis={[
        { label: 'Total products', value: products.length },
        { label: 'Requires TPI', value: products.filter((p) => p.hasTpi).length, tone: 'warning' },
        { label: 'Active', value: products.filter((p) => p.isActive).length, tone: 'success' },
      ]}
      rows={products}
      searchableText={(r) => `${r.code} ${r.name}`}
      searchPlaceholder="Search by code or name…"
      filters={filters}
      columns={columns}
      defaultSortId="name"
      rowTo={(r) => `/admin/master-data/products/${r.id}`}
      onCreate={() => navigate('/admin/master-data/products/new')}
      createLabel="Add Product"
      onDeleteConfirm={(r) => deleteProduct(r.id)}
      deleteTitle={(r) => `Delete "${r.name}"?`}
      deleteMessage={(r) => <>This removes the product <strong>{r.name}</strong> ({r.code}) from the Master Data registry. This cannot be undone.</>}
      emptyIcon="🛢️"
      emptyTitle="No matching products"
      emptyMessage="Adjust your search or filters, or add a new product."
    />
  );
}
