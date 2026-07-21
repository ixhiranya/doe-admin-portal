import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { cn } from '../../lib/utils';
import {
  Breadcrumb, HeroHeader, EmptyState, LoadingState, DeleteConfirmModal,
  SearchInput, FilterSelect, SortIcon, Pagination, type Crumb,
} from './Chrome';

// =============================================================================
// PPS · Master Data — generic list page. One reusable engine (search, filter,
// sort, paginate, row-click-to-view, create, delete-with-confirm) driven by a
// per-entity column/filter config, so every one of the 8 master screens gets
// identical, production-grade list behaviour without re-implementing it 8x.
// =============================================================================

export interface MasterListColumn<T> {
  id: string;
  label: string;
  align?: 'left' | 'right' | 'center';
  width?: string;
  sortAccessor?: (row: T) => string | number;
  cell: (row: T) => React.ReactNode;
}

export interface MasterListFilter<T> {
  id: string;
  label: string;
  options: { value: string; label: string }[];
  predicate: (row: T, value: string) => boolean;
}

export interface MasterListKpi { label: string; value: string | number; tone?: 'ink' | 'info' | 'success' | 'warning' | 'danger' }

export function MasterListPage<T extends { id: string }>({
  breadcrumb, tag, badge, badgeBg, eyebrow, title, subtitle, kpis,
  rows, loading, searchableText, searchPlaceholder, filters, columns,
  defaultSortId, rowTo, onCreate, createLabel = 'Add New',
  onDeleteConfirm, deleteTitle, deleteMessage,
  emptyIcon, emptyTitle, emptyMessage,
  sectionLabel = 'Current entries',
}: {
  breadcrumb: Crumb[];
  tag?: string;
  badge: string;
  badgeBg?: string;
  eyebrow: string;
  title: string;
  subtitle: string;
  kpis?: MasterListKpi[];
  rows: T[];
  loading?: boolean;
  searchableText: (row: T) => string;
  searchPlaceholder?: string;
  filters?: MasterListFilter<T>[];
  columns: MasterListColumn<T>[];
  defaultSortId?: string;
  rowTo: (row: T) => string;
  onCreate: () => void;
  createLabel?: string;
  onDeleteConfirm: (row: T) => { ok: boolean; error?: string };
  deleteTitle: (row: T) => string;
  deleteMessage: (row: T) => React.ReactNode;
  emptyIcon?: string;
  emptyTitle: string;
  emptyMessage: string;
  sectionLabel?: string;
}) {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [filterValues, setFilterValues] = useState<Record<string, string>>({});
  const [sort, setSort] = useState<{ id: string; dir: 'asc' | 'desc' }>({ id: defaultSortId ?? columns[0]?.id, dir: 'asc' });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [confirmTarget, setConfirmTarget] = useState<T | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const filtered = useMemo(() => {
    let list = rows.slice();
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter((r) => searchableText(r).toLowerCase().includes(q));
    }
    if (filters) {
      for (const f of filters) {
        const v = filterValues[f.id] ?? '';
        if (v) list = list.filter((r) => f.predicate(r, v));
      }
    }
    const col = columns.find((c) => c.id === sort.id);
    if (col?.sortAccessor) {
      list.sort((a, b) => {
        const av = col.sortAccessor!(a);
        const bv = col.sortAccessor!(b);
        const cmp = typeof av === 'number' && typeof bv === 'number' ? av - bv : String(av).localeCompare(String(bv));
        return sort.dir === 'asc' ? cmp : -cmp;
      });
    }
    return list;
  }, [rows, search, filterValues, sort, columns, searchableText, filters]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const clampedPage = Math.min(page, totalPages);
  const pageRows = filtered.slice((clampedPage - 1) * pageSize, clampedPage * pageSize);

  function toggleSort(colId: string) {
    setSort((s) => (s.id === colId ? { id: colId, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { id: colId, dir: 'asc' }));
  }

  function handleConfirmDelete() {
    if (!confirmTarget) return;
    setDeleting(true);
    const res = onDeleteConfirm(confirmTarget);
    setDeleting(false);
    if (!res.ok) {
      setDeleteError(res.error ?? 'Unable to delete this record.');
      return;
    }
    setConfirmTarget(null);
    setDeleteError(null);
  }

  return (
    <div className="max-w-[1400px] mx-auto px-6 pt-5 pb-10">
      <Breadcrumb items={breadcrumb} tag={tag} />
      <HeroHeader
        badge={badge} badgeBg={badgeBg} eyebrow={eyebrow} title={title} subtitle={subtitle} kpis={kpis}
        actions={
          <button onClick={onCreate} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-action-orange text-white font-semibold text-[11.5px] hover:bg-action-orange-dark shadow-doe-sm transition whitespace-nowrap">
            <PlusIcon /> {createLabel}
          </button>
        }
      />

      {/* Filters bar */}
      <div className="card p-3 mb-5 flex flex-wrap items-center gap-3">
        <SearchInput value={search} onChange={(v) => { setSearch(v); setPage(1); }} placeholder={searchPlaceholder} />
        {filters?.map((f) => (
          <FilterSelect
            key={f.id}
            label={f.label}
            value={filterValues[f.id] ?? ''}
            onChange={(v) => { setFilterValues((prev) => ({ ...prev, [f.id]: v })); setPage(1); }}
            options={f.options}
          />
        ))}
      </div>

      {loading ? (
        <LoadingState />
      ) : filtered.length === 0 ? (
        <EmptyState icon={emptyIcon} title={emptyTitle} message={emptyMessage} actionLabel={createLabel} onAction={onCreate} />
      ) : (
        <div className="bg-white rounded-xl border border-neutral-100 shadow-doe-xs overflow-hidden">
          <div className="px-4 py-2 border-b border-neutral-100 bg-neutral-25/60 flex items-center justify-between">
            <div className="text-[10.5px] font-sans uppercase tracking-[0.18em] text-neutral-500">{sectionLabel}</div>
            <div className="text-[11px] text-neutral-500">{filtered.length} of {rows.length}</div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-[12px]">
              <thead className="text-[9.5px] font-sans uppercase tracking-[0.16em] text-neutral-500 border-b border-neutral-100 bg-white">
                <tr>
                  {columns.map((col) => (
                    <th
                      key={col.id}
                      style={{ width: col.width }}
                      className={cn(
                        'px-4 py-2 font-semibold whitespace-nowrap',
                        col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left',
                        col.sortAccessor && 'cursor-pointer select-none hover:text-ink-950',
                      )}
                      onClick={() => col.sortAccessor && toggleSort(col.id)}
                    >
                      {col.label}
                      {col.sortAccessor && <SortIcon dir={sort.id === col.id ? sort.dir : null} />}
                    </th>
                  ))}
                  <th className="px-4 py-2 w-[110px] text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {pageRows.map((r) => (
                  <tr key={r.id} className="hover:bg-neutral-25 transition cursor-pointer" onClick={() => navigate(rowTo(r))}>
                    {columns.map((col) => (
                      <td key={col.id} className={cn('px-4 py-2.5 align-top', col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left')}>
                        {col.cell(r)}
                      </td>
                    ))}
                    <td className="px-4 py-2.5 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1">
                        <button
                          title="Edit"
                          onClick={() => navigate(`${rowTo(r)}/edit`)}
                          className="w-7 h-7 grid place-items-center rounded-md text-neutral-500 hover:text-ink-950 hover:bg-neutral-100 transition"
                        >
                          <EditIcon />
                        </button>
                        <button
                          title="Delete"
                          onClick={() => { setConfirmTarget(r); setDeleteError(null); }}
                          className="w-7 h-7 grid place-items-center rounded-md text-neutral-500 hover:text-doe-red hover:bg-danger-soft transition"
                        >
                          <TrashIcon />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination page={clampedPage} pageSize={pageSize} total={filtered.length} onPageChange={setPage} onPageSizeChange={(n) => { setPageSize(n); setPage(1); }} />
        </div>
      )}

      <DeleteConfirmModal
        open={!!confirmTarget}
        title={confirmTarget ? deleteTitle(confirmTarget) : ''}
        message={
          <>
            {confirmTarget ? deleteMessage(confirmTarget) : null}
            {deleteError && <div className="mt-3 text-doe-red font-semibold">{deleteError}</div>}
          </>
        }
        busy={deleting}
        onCancel={() => { setConfirmTarget(null); setDeleteError(null); }}
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
}

function PlusIcon() {
  return <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>;
}
function EditIcon() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4Z" /></svg>;
}
function TrashIcon() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /><path d="M10 11v6M14 11v6" /><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" /></svg>;
}
