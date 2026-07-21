import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTemplates } from '../../store/templates';
import { useAuth } from '../../store/auth';
import type { SubmissionTemplate, TemplateStatus } from '../../types/templates';
import { cn } from '../../lib/utils';

type StatusFilter = 'all' | TemplateStatus;
type VersionFilter = 'all' | 'latest';
type SortBy = 'newest-version' | 'name' | 'last-modified';

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}
function fmtDateTime(iso: string) {
  const d = new Date(iso);
  return `${d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })} · ${d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`;
}
function fmtRelative(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffH = diffMs / 3600000;
  if (diffH < 24 && d.toDateString() === now.toDateString()) {
    return `Today ${d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`;
  }
  const yesterday = new Date(now); yesterday.setDate(now.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) {
    return `Yesterday ${d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`;
  }
  const diffDays = Math.floor(diffH / 24);
  if (diffDays < 7) return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;
  return fmtDate(iso);
}

const STATUS_TONE: Record<TemplateStatus, string> = {
  Published: 'bg-success-soft text-success-500',
  Draft: 'bg-warning-soft text-warning-500',
  Archived: 'bg-neutral-100 text-neutral-500',
};

export function TemplateManagementPage() {
  const templates = useTemplates((s) => s.templates);
  const duplicateTemplate = useTemplates((s) => s.duplicateTemplate);
  const archiveTemplate = useTemplates((s) => s.archiveTemplate);
  const publishVersion = useTemplates((s) => s.publishVersion);
  const getFamily = useTemplates((s) => s.getFamily);
  const user = useAuth((s) => s.user);
  const navigate = useNavigate();

  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<StatusFilter>('all');
  const [versionFilter, setVersionFilter] = useState<VersionFilter>('all');
  const [sortBy, setSortBy] = useState<SortBy>('newest-version');
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [historyFor, setHistoryFor] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  const isLatest = (t: SubmissionTemplate) => {
    const family = templates.filter((x) => x.familyId === t.familyId);
    return t.version === Math.max(...family.map((x) => x.version));
  };

  const kpis = useMemo(() => {
    const total = templates.length;
    const published = templates.filter((t) => t.status === 'Published').length;
    const draft = templates.filter((t) => t.status === 'Draft').length;
    const archived = templates.filter((t) => t.status === 'Archived').length;
    const latest = [...templates].sort((a, b) => b.version - a.version || b.lastModified.localeCompare(a.lastModified))[0];
    return { total, published, draft, archived, latest };
  }, [templates]);

  const visible = useMemo(() => {
    let rows = templates.filter((t) => {
      if (status !== 'all' && t.status !== status) return false;
      if (versionFilter === 'latest' && !isLatest(t)) return false;
      if (search) {
        const q = search.toLowerCase();
        const hay = [t.id, t.name, t.code, t.product, t.company].join(' ').toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
    rows = [...rows].sort((a, b) => {
      if (sortBy === 'name') return a.name.localeCompare(b.name);
      if (sortBy === 'last-modified') return b.lastModified.localeCompare(a.lastModified);
      return b.version - a.version;
    });
    return rows;
  }, [templates, status, versionFilter, search, sortBy]);

  const totalPages = Math.max(1, Math.ceil(visible.length / rowsPerPage));
  const pageRows = visible.slice((page - 1) * rowsPerPage, page * rowsPerPage);

  function handleView(t: SubmissionTemplate) {
    // Drafts open straight into the editable builder; Published/Archived
    // rows open read-only (the builder itself offers "Edit"/"New Version"
    // from there when appropriate).
    if (t.status === 'Draft') navigate(`/admin/template-management/${t.id}/builder`);
    else navigate(`/admin/template-management/${t.id}/builder?mode=view`);
  }
  function handleDuplicate(t: SubmissionTemplate) {
    const clone = duplicateTemplate(t.id, user?.name ?? 'DoE Admin');
    navigate(`/admin/template-management/${clone.id}/builder`);
  }
  function handleArchive(t: SubmissionTemplate) {
    if (t.status === 'Archived') {
      // Republishing an archived row directly: it becomes the family's
      // current Published version again, and everything else in the
      // family (including whatever is currently Published) gets archived.
      if (confirm(`Publish "${t.name}" (v${t.version}) again? This becomes the active version — any other version currently published will be archived.`)) {
        publishVersion(t.id);
      }
      return;
    }
    const msg = t.status === 'Published'
      ? `Archive "${t.name}"? This unpublishes it — it will no longer be assignable to new submissions.`
      : `Archive "${t.name}"?`;
    if (confirm(msg)) archiveTemplate(t.id);
  }

  return (
    <div className="max-w-[1500px] mx-auto px-6 pt-5 pb-10">
      {/* Breadcrumb */}
      <nav className="text-[12px] text-neutral-500 mb-4">
        <Link to="/pps-dashboard" className="hover:text-doe-red">Home</Link>
        <span className="mx-2 text-neutral-300">›</span>
        <span className="text-ink-950 font-semibold">Template Management</span>
      </nav>

      {/* Header */}
      <div className="flex items-start justify-between mb-5">
        <div>
          <h1 className="font-display font-bold text-[26px] text-ink-950">Template Management</h1>
          <p className="text-[13px] text-neutral-500 mt-1">Manage all submission templates. Create, edit, clone and publish templates.</p>
        </div>
        <button className="btn-primary" onClick={() => setShowCreate(true)}>
          <PlusIcon /> Create Template
        </button>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-5">
        <Kpi label="Total Templates" value={kpis.total} sub="Across all products & entities" icon={<DocIcon />} tone="bg-info-soft text-info-500" />
        <Kpi label="Published Templates" value={kpis.published} sub="Available for assignment" icon={<CheckIcon />} tone="bg-success-soft text-success-500" />
        <Kpi label="Draft Templates" value={kpis.draft} sub="In progress" icon={<EditIcon />} tone="bg-warning-soft text-warning-500" />
        <Kpi label="Archived Templates" value={kpis.archived} sub="Not assignable" icon={<ArchiveIcon />} tone="bg-danger-soft text-danger-500" />
        {/* <Kpi
          label="Latest Version"
          value={kpis.latest ? `v${kpis.latest.version}` : '—'}
          sub={kpis.latest ? `${kpis.latest.product} · ${kpis.latest.company}` : ''}
          icon={<StarIcon />}
          tone="bg-lavender text-[#7B3FE4]"
        /> */}
      </div>

      {/* Filter bar */}
      <div className="card p-3 mb-4 flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[220px]">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400"><SearchIcon /></span>
          <input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search templates by name or code..."
            className="w-full h-9 pl-9 pr-3 bg-white border border-neutral-200 rounded-md text-[13px] placeholder-neutral-400 focus:outline-none focus:border-action-orange focus:ring-2 focus:ring-action-orange/15 transition"
          />
        </div>
        <FilterSelect label="Status" value={status} onChange={(v) => { setStatus(v as StatusFilter); setPage(1); }}
          options={[['all', 'All'], ['Published', 'Published'], ['Draft', 'Draft'], ['Archived', 'Archived']]} />
        <FilterSelect label="Version" value={versionFilter} onChange={(v) => { setVersionFilter(v as VersionFilter); setPage(1); }}
          options={[['all', 'All'], ['latest', 'Latest only']]} />
        <FilterSelect label="Sort By" value={sortBy} onChange={(v) => setSortBy(v as SortBy)}
          options={[['newest-version', 'Newest Version'], ['name', 'Name'], ['last-modified', 'Last Modified']]} />
        <button
          className="btn-secondary h-9"
          onClick={() => { setSearch(''); setStatus('all'); setVersionFilter('all'); setSortBy('newest-version'); setPage(1); }}
        >
          <ResetIcon /> Reset Filters
        </button>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-[12.5px]">
            <thead>
              <tr className="border-b border-neutral-100 text-left text-neutral-500 text-[11px] uppercase tracking-wider">
                <th className="px-4 py-3 font-semibold">Template ID</th>
                <th className="px-4 py-3 font-semibold">Template Name</th>
                <th className="px-4 py-3 font-semibold">Template Code</th>
                <th className="px-4 py-3 font-semibold">Current Version</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold">Created By</th>
                <th className="px-4 py-3 font-semibold">Created Date</th>
                <th className="px-4 py-3 font-semibold">Last Modified</th>
                <th className="px-4 py-3 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {pageRows.map((t) => (
                <tr key={t.id} className="border-b border-neutral-50 last:border-0 hover:bg-neutral-25 transition">
                  <td className="px-4 py-3 font-mono text-neutral-700">{t.id}</td>
                  <td className="px-4 py-3">
                    <button onClick={() => handleView(t)} className="font-semibold text-ink-950 hover:text-doe-red text-left">{t.name}</button>
                  </td>
                  <td className="px-4 py-3 font-mono text-neutral-600">{t.code}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 whitespace-nowrap">
                      <span className="chip-sm bg-info-soft text-info-500 normal-case">v{t.version}</span>
                      {isLatest(t) && <span className="chip-sm bg-lavender text-[#7B3FE4] normal-case">latest</span>}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={cn('chip-sm normal-case', STATUS_TONE[t.status])}>
                      {t.status === 'Published' && '✓ '}{t.status === 'Draft' && '● '}{t.status === 'Archived' && '● '}{t.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-neutral-700">{t.createdBy}</td>
                  <td className="px-4 py-3 text-neutral-500">{fmtDate(t.createdDate)}</td>
                  <td className="px-4 py-3 text-neutral-500">{fmtRelative(t.lastModified)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1 relative">
                      <IconBtn title="View" onClick={() => handleView(t)}><EyeIcon /></IconBtn>
                      <IconBtn title="Clone" onClick={() => handleDuplicate(t)}><CopyIcon /></IconBtn>
                      <IconBtn title="Version history" onClick={() => setHistoryFor(historyFor === t.id ? null : t.id)}><ClockIcon /></IconBtn>
                      <button
                        className={cn('h-7 px-2.5 rounded-md text-[11px] font-semibold border transition ml-1', t.status === 'Archived' ? 'border-success-500 text-success-500 hover:bg-success-soft' : 'border-warning-500 text-warning-500 hover:bg-warning-soft')}
                        onClick={() => handleArchive(t)}
                      >
                        {t.status === 'Archived' ? 'Publish' : 'Archive'}
                      </button>

                      {historyFor === t.id && (
                        <div className="absolute right-0 top-full mt-1 w-[300px] bg-white border border-neutral-100 rounded-xl shadow-doe-lg p-2 z-20 text-left">
                          <div className="px-2 py-1.5 text-[9.5px] font-sans uppercase tracking-[0.18em] text-neutral-500">Version history · {t.code}</div>
                          {getFamily(t.familyId).map((v) => (
                            <button
                              key={v.id}
                              onClick={() => { setHistoryFor(null); handleView(v); }}
                              className="w-full flex items-center justify-between px-2.5 py-2 rounded-md hover:bg-neutral-50 text-left"
                            >
                              <span className="flex items-center gap-2">
                                <span className="chip-sm bg-info-soft text-info-500 normal-case">v{v.version}</span>
                                <span className="text-[12px] text-ink-950 font-medium">{fmtDateTime(v.lastModified)}</span>
                              </span>
                              <span className={cn('chip-sm normal-case', STATUS_TONE[v.status])}>{v.status}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {pageRows.length === 0 && (
                <tr><td colSpan={9} className="px-4 py-10 text-center text-neutral-500">No templates match your filters.</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-neutral-100 text-[12px] text-neutral-500">
          <span>Showing {pageRows.length === 0 ? 0 : (page - 1) * rowsPerPage + 1} to {(page - 1) * rowsPerPage + pageRows.length} of {visible.length} templates</span>
          <div className="flex items-center gap-3">
            <FilterSelect label="Rows per page" value={String(rowsPerPage)} onChange={(v) => { setRowsPerPage(Number(v)); setPage(1); }}
              options={[['5', '5'], ['10', '10'], ['25', '25'], ['50', '50']]} compact />
            <div className="flex items-center gap-1">
              <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="w-7 h-7 grid place-items-center rounded-md border border-neutral-200 disabled:opacity-40 hover:bg-neutral-50">‹</button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).slice(0, 6).map((p) => (
                <button key={p} onClick={() => setPage(p)} className={cn('w-7 h-7 grid place-items-center rounded-md text-[12px] font-semibold', p === page ? 'bg-ink-950 text-white' : 'border border-neutral-200 hover:bg-neutral-50')}>{p}</button>
              ))}
              <button disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)} className="w-7 h-7 grid place-items-center rounded-md border border-neutral-200 disabled:opacity-40 hover:bg-neutral-50">›</button>
            </div>
          </div>
        </div>
      </div>

      {showCreate && (
        <CreateTemplateModal
          onClose={() => setShowCreate(false)}
          onCreate={(input) => {
            const t = useTemplates.getState().createTemplate({ ...input, createdBy: user?.name ?? 'DoE Admin' });
            setShowCreate(false);
            navigate(`/admin/template-management/${t.id}/builder`);
          }}
        />
      )}
    </div>
  );
}

// ============================================================ Create modal

function CreateTemplateModal({ onClose, onCreate }: { onClose: () => void; onCreate: (input: { name: string; code: string }) => void }) {
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const valid = name.trim() && code.trim();

  return (
    <div className="fixed inset-0 z-[100] bg-ink-950/40 grid place-items-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-doe-xl max-w-[440px] w-full overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="px-5 py-4 border-b border-neutral-100 flex items-center justify-between">
          <h3 className="font-display text-[16px] font-bold text-ink-950">Create Template</h3>
          <button onClick={onClose} className="w-8 h-8 grid place-items-center rounded-md text-neutral-500 hover:text-ink-950 hover:bg-neutral-50">✕</button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="field-label">Template Name *</label>
            <input autoFocus value={name} onChange={(e) => setName(e.target.value)} className="field-input" placeholder="e.g. SAF - ADNOC Template" />
          </div>
          <div>
            <label className="field-label">Template Code *</label>
            <input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} className="field-input font-mono" placeholder="e.g. SAF-ADNOC" />
          </div>
          <p className="text-[11.5px] text-neutral-500">Starts as <b>v1 · Draft</b> with the default 7-section layout (General Information pre-filled). You'll be taken straight to the builder.</p>
        </div>
        <div className="px-5 py-4 border-t border-neutral-100 flex justify-end gap-2">
          <button className="btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn-primary" disabled={!valid} onClick={() => onCreate({ name, code })}>Create & Open Builder</button>
        </div>
      </div>
    </div>
  );
}

// ============================================================ small pieces

function Kpi({ label, value, sub, icon, tone }: { label: string; value: string | number; sub: string; icon: React.ReactNode; tone: string }) {
  return (
    <div className="card p-4 flex items-start justify-between">
      <div>
        <div className="text-[12px] text-neutral-500 font-medium">{label}</div>
        <div className="font-display font-bold text-[26px] text-ink-950 mt-1">{value}</div>
        <div className="text-[11px] text-neutral-400 mt-1">{sub}</div>
      </div>
      <div className={cn('w-10 h-10 rounded-lg grid place-items-center flex-shrink-0', tone)}>{icon}</div>
    </div>
  );
}

function FilterSelect({ label, value, onChange, options, compact }: { label: string; value: string; onChange: (v: string) => void; options: [string, string][]; compact?: boolean }) {
  return (
    <label className={cn('flex items-center gap-2 h-9 px-3 border border-neutral-200 rounded-md bg-white text-[12.5px]', compact && 'h-8 px-2')}>
      <span className="text-neutral-500 font-medium whitespace-nowrap">{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)} className="bg-transparent outline-none font-semibold text-ink-950 cursor-pointer">
        {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
      </select>
    </label>
  );
}

function IconBtn({ children, onClick, title, tone, disabled }: { children: React.ReactNode; onClick: () => void; title: string; tone?: 'danger' | 'warning'; disabled?: boolean }) {
  return (
    <button
      title={title}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        'w-7 h-7 grid place-items-center rounded-md transition disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent',
        tone === 'danger' ? 'text-danger-500 hover:bg-danger-soft' :
        tone === 'warning' ? 'text-warning-500 hover:bg-warning-soft' :
        'text-neutral-500 hover:bg-neutral-100 hover:text-ink-950',
      )}
    >
      {children}
    </button>
  );
}

// ============================================================ icons
function PlusIcon() { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>; }
function SearchIcon() { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" /></svg>; }
function ResetIcon() { return <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10" /><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" /></svg>; }
function EyeIcon() { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8Z" /><circle cx="12" cy="12" r="3" /></svg>; }
function CopyIcon() { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></svg>; }
function ClockIcon() { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>; }
function DocIcon() { return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" /><polyline points="14 2 14 8 20 8" /></svg>; }
function CheckIcon() { return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>; }
function EditIcon() { return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4Z" /></svg>; }
function ArchiveIcon() { return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="21 8 21 21 3 21 3 8" /><rect x="1" y="3" width="22" height="5" /><line x1="10" y1="12" x2="14" y2="12" /></svg>; }
function StarIcon() { return <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26" /></svg>; }
