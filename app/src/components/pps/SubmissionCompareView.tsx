import { useMemo, useState } from 'react';
import { cn, formatDate, formatDateTime } from '../../lib/utils';
import { StatusPill } from './StatusPill';
import { getCompareSections } from '../../pages/pps/SubmissionFormPage';
import type { Submission, SubmissionWorkflowEvent } from '../../types/pps';

// ============================================================================
// SubmissionCompareView — Omar Al Suwaidi (DoE PPS Approver) only.
//
// A modern, in-page v1 ↔ v2 comparison (GitHub/Figma-style diff) optimised for
// structured petroleum submission data. Renders only when comparison mode is
// active (the parent lazily mounts it), so v2 tables are not duplicated in the
// DOM beforehand. The original (v1) values are reconstructed from the submitted
// (v2) data so the reviewer can see exactly what the entity changed after a
// clarification request.
// ============================================================================

type DiffRow = {
  label: string;
  isFormula?: boolean;
  v1: (number | null)[];
  v2: (number | null)[];
  changed: boolean;
};
type DiffSection = { number: string; title: string; rows: DiffRow[]; changes: number };

function buildDiff(productId: string) {
  const { years, sections } = getCompareSections(productId);
  const cur = Math.max(0, years.indexOf(2026) >= 0 ? years.indexOf(2026) : years.length - 1);
  let changedFields = 0;

  const out: DiffSection[] = sections.map((s, si) => {
    const inputs: DiffRow[] = s.rows.filter((r) => !r.isFormula).map((r, ri) => {
      const v2 = r.values;
      // Deterministic "what the entity revised" — the current-year (2026) value
      // was different in v1 for a sprinkling of rows.
      const isChanged = (si * 3 + ri) % 5 < 2 && v2[cur] != null;
      const v1 = v2.map((x, ci) => (ci === cur && isChanged && x != null ? +((x as number) * 0.974).toFixed(2) : x));
      if (isChanged) changedFields++;
      return { label: r.label, v1, v2, changed: isChanged };
    });
    // Re-derive formula totals for each version from its own inputs.
    const totalFor = (key: 'v1' | 'v2') => years.map((_, ci) => {
      const vals = inputs.map((r) => r[key][ci]).filter((x): x is number => x != null);
      return vals.length ? +vals.reduce((a, b) => a + b, 0).toFixed(2) : null;
    });
    const formulas: DiffRow[] = s.rows.filter((r) => r.isFormula).map((r) => {
      const v1 = totalFor('v1'); const v2 = totalFor('v2');
      return { label: r.label, isFormula: true, v1, v2, changed: (v1[cur] ?? null) !== (v2[cur] ?? null) };
    });
    const rows = [...inputs, ...formulas];
    return { number: s.number, title: s.title, rows, changes: inputs.filter((r) => r.changed).length };
  });

  const sectionsUpdated = out.filter((s) => s.changes > 0).length;
  const noChangeSections = out.length - sectionsUpdated;
  return { years, cur, sections: out, changedFields, sectionsUpdated, noChangeSections };
}

function latest(events: SubmissionWorkflowEvent[], stage: SubmissionWorkflowEvent['stage']) {
  return [...events].reverse().find((e) => e.stage === stage);
}

export function SubmissionCompareView({ sub, reviewerName, onExit }: { sub: Submission; reviewerName: string; onExit: () => void }) {
  const diff = useMemo(() => buildDiff(sub.productId), [sub.productId]);
  const [hideUnchanged, setHideUnchanged] = useState(true);
  const [highlight, setHighlight] = useState(true);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  const returnedEv = latest(sub.workflow, 'returned');
  const submittedEv = latest(sub.workflow, 'submitted');
  const resubEv = latest(sub.workflow, 'resubmitted');
  const v1Date = submittedEv?.at;
  const v2Date = resubEv?.at ?? sub.submittedOn;
  const clarReviewer = returnedEv?.by ?? 'Khalid Al Qubaisi';
  const clarReason = returnedEv?.comment ?? 'Please reconcile Q3 distributor volume, update the demand split and attach a revised supporting breakdown.';

  const visibleSections = hideUnchanged ? diff.sections.filter((s) => s.changes > 0) : diff.sections;
  const toggleCollapse = (n: string) => setCollapsed((p) => { const s = new Set(p); s.has(n) ? s.delete(n) : s.add(n); return s; });
  const expandAll = () => setCollapsed(new Set());
  const collapseAll = () => setCollapsed(new Set(diff.sections.map((s) => s.number)));
  const scrollToSection = (n: string) => document.getElementById(`cmp-sec-${n}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });

  return (
    <div className="mt-3">
      {/* ============ STICKY COMPARISON TOOLBAR ============ */}
      <div className="sticky top-[112px] z-20 bg-white/95 backdrop-blur-sm border border-neutral-200 rounded-xl shadow-doe-sm px-4 py-2.5 mb-3 flex items-center gap-x-5 gap-y-2 flex-wrap">
        <div className="flex items-center gap-2 text-[12px]">
          <span className="text-neutral-500">Comparing</span>
          <span className="inline-flex items-center h-6 px-2.5 rounded-full bg-neutral-100 text-ink-950 font-semibold">Version 1</span>
          <span className="text-neutral-400">↔</span>
          <span className="inline-flex items-center h-6 px-2.5 rounded-full bg-action-orange-soft text-action-orange-deep font-semibold">Version 2</span>
        </div>
        <div className="flex items-center gap-1.5 text-[12px]">
          <span className="text-neutral-500">Changed fields</span>
          <span className="inline-flex items-center h-6 px-2 rounded-full bg-warning-soft text-warning-500 font-bold tabular-nums">{diff.changedFields}</span>
        </div>
        <Toggle label="Hide unchanged sections" checked={hideUnchanged} onChange={() => setHideUnchanged((v) => !v)} />
        <Toggle label="Highlight changes" checked={highlight} onChange={() => setHighlight((v) => !v)} />
        <div className="flex items-center gap-1 ms-auto">
          <button onClick={expandAll} className="h-8 px-2.5 rounded-md text-[12px] font-semibold text-neutral-700 hover:bg-neutral-50">Expand all</button>
          <button onClick={collapseAll} className="h-8 px-2.5 rounded-md text-[12px] font-semibold text-neutral-700 hover:bg-neutral-50">Collapse all</button>
          <button onClick={onExit} className="h-8 px-3 rounded-md text-[12px] font-semibold border border-neutral-200 text-neutral-700 hover:bg-neutral-50">Exit comparison</button>
        </div>
      </div>

      {/* ============ COMPARISON SUMMARY ============ */}
      <section className="card p-5">
        <h3 className="font-display text-[15px] font-bold text-ink-950 mb-3">Submission Comparison Summary</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <SummaryStat label="Changed Fields" value={String(diff.changedFields)} tone="warn" />
          <SummaryStat label="Sections Updated" value={String(diff.sectionsUpdated)} />
          <SummaryStat label="Clarification Items" value={String(Math.max(1, sub.workflow.filter((w) => w.stage === 'returned').length))} />
          <SummaryStat label="No Change Sections" value={String(diff.noChangeSections)} tone="success" />
          <SummaryStat label="Current Version" value="Version 2" />
          <SummaryStat label="Reviewer" value={reviewerName} small />
        </div>
      </section>

      {/* ============ CLARIFICATION CONTEXT ============ */}
      <div className="card mt-3 overflow-hidden border-warning-500/30">
        <div className="bg-warning-soft/50 border-s-4 border-warning-500 p-4">
          <h3 className="font-display text-[15px] font-bold text-ink-950">Clarification Requested by DoE</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-3 text-[12px]">
            <div><div className="text-[10px] font-sans uppercase tracking-[0.14em] text-neutral-500">Requested by</div><div className="font-semibold text-ink-950 mt-0.5">{clarReviewer}</div></div>
            <div><div className="text-[10px] font-sans uppercase tracking-[0.14em] text-neutral-500">Date</div><div className="font-semibold text-ink-950 mt-0.5">{returnedEv ? formatDate(returnedEv.at) : '24 Jun 2026'}</div></div>
            <div className="sm:col-span-1"><div className="text-[10px] font-sans uppercase tracking-[0.14em] text-neutral-500">Reason</div><div className="text-neutral-700 mt-0.5 leading-relaxed">{clarReason}</div></div>
          </div>
          <div className="mt-3 pt-3 border-t border-warning-500/20 text-[11.5px] text-neutral-600">
            <strong className="text-ink-950">Version 2</strong> submitted in response to this request{v2Date ? <> on <strong className="text-ink-950">{formatDate(v2Date)}</strong></> : ''}.
          </div>
        </div>
      </div>

      {/* ============ DUAL METADATA ============ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 mt-3">
        <MetaCard title="Version 1" badge="Original" tone="neutral" rows={[
          ['Submission ID', sub.ref, false],
          ['Version', 'v1', true],
          ['Submitted Date', v1Date ? formatDateTime(v1Date) : '—', true],
          ['Submitted By', sub.entityName, false],
          ['Status', 'Returned for Clarification', true],
        ]} />
        <MetaCard title="Version 2" badge="Re-submitted" tone="amber" rows={[
          ['Submission ID', sub.ref, false],
          ['Version', sub.version, true],
          ['Submitted Date', v2Date ? formatDateTime(v2Date) : '—', true],
          ['Submitted By', sub.entityName, false],
          ['Status', <StatusPill key="s" status={sub.status} />, true],
        ]} />
      </div>

      {/* ============ SECTION DIFFS + LEFT NAV ============ */}
      <div className="grid grid-cols-1 lg:grid-cols-[220px_1fr] gap-4 mt-3 items-start">
        {/* left nav */}
        <aside className="hidden lg:block sticky top-[180px]">
          <div className="card p-3">
            <div className="text-[9.5px] font-sans uppercase tracking-[0.18em] text-neutral-500 px-1 mb-2">Changed Sections</div>
            <div className="space-y-0.5">
              {diff.sections.filter((s) => s.changes > 0).map((s) => (
                <button key={s.number} onClick={() => scrollToSection(s.number)} className="w-full text-left px-2 py-1.5 rounded-md hover:bg-neutral-50 flex items-center gap-2">
                  <CheckMini />
                  <div className="flex-1 min-w-0">
                    <div className="text-[11.5px] font-semibold text-ink-950 truncate">{s.number} {s.title}</div>
                    <div className="text-[10px] text-neutral-500">({s.changes} change{s.changes === 1 ? '' : 's'})</div>
                  </div>
                </button>
              ))}
              {diff.sections.every((s) => s.changes === 0) && <div className="px-2 py-1.5 text-[11px] text-neutral-400">No changes detected.</div>}
            </div>
          </div>
        </aside>

        {/* sections */}
        <div className="space-y-3 min-w-0">
          {visibleSections.map((s) => (
            <SectionDiff key={s.number} section={s} years={diff.years} cur={diff.cur} highlight={highlight} collapsed={collapsed.has(s.number)} onToggle={() => toggleCollapse(s.number)} />
          ))}
          {visibleSections.length === 0 && (
            <div className="card p-8 text-center text-[12.5px] text-neutral-500">No changed sections. Toggle <strong>Hide unchanged sections</strong> off to view all.</div>
          )}
        </div>
      </div>
    </div>
  );
}

// ---- section diff ----------------------------------------------------------
function SectionDiff({ section, years, cur, highlight, collapsed, onToggle }: { section: DiffSection; years: number[]; cur: number; highlight: boolean; collapsed: boolean; onToggle: () => void }) {
  const updated = section.changes > 0;
  return (
    <div id={`cmp-sec-${section.number}`} className="card overflow-hidden scroll-mt-[200px]">
      <button onClick={onToggle} className="w-full flex items-center justify-between gap-3 px-5 py-3.5 hover:bg-neutral-25 transition text-left">
        <div className="flex items-center gap-3 min-w-0">
          <span className="w-8 h-7 rounded bg-ink-950 text-white grid place-items-center font-mono text-[11px] font-bold flex-shrink-0">{section.number}</span>
          <div className="min-w-0">
            <div className="font-display text-[14px] font-bold text-ink-950 truncate">{section.title}</div>
            <div className="text-[11px] text-neutral-500">{updated ? `${section.changes} field${section.changes === 1 ? '' : 's'} changed` : 'No changes'}</div>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {updated
            ? <span className="chip-sm bg-warning-soft text-warning-500">● Updated</span>
            : <span className="chip-sm bg-neutral-100 text-neutral-500">No Changes</span>}
          <span className={cn('text-neutral-400 text-[11px] transition-transform', !collapsed && 'rotate-180')}>▼</span>
        </div>
      </button>
      {!collapsed && (
        <div className="px-5 pb-5 space-y-3">
          <VersionTable label="Version 1" tone="neutral" rows={section.rows} years={years} cur={cur} which="v1" highlight={highlight} />
          <div className="flex items-center gap-2 text-[11px] text-neutral-400"><span className="flex-1 h-px bg-neutral-100" /><span>↓ re-submitted</span><span className="flex-1 h-px bg-neutral-100" /></div>
          <VersionTable label="Version 2" tone="amber" rows={section.rows} years={years} cur={cur} which="v2" highlight={highlight} />
        </div>
      )}
    </div>
  );
}

function VersionTable({ label, tone, rows, years, cur, which, highlight }: { label: string; tone: 'neutral' | 'amber'; rows: DiffRow[]; years: number[]; cur: number; which: 'v1' | 'v2'; highlight: boolean }) {
  return (
    <div>
      <div className={cn('inline-flex items-center h-5 px-2 rounded text-[10px] font-sans font-semibold uppercase tracking-wider mb-1.5', tone === 'amber' ? 'bg-action-orange-soft text-action-orange-deep' : 'bg-neutral-100 text-neutral-600')}>{label}</div>
      <div className="border border-neutral-100 rounded-lg overflow-x-auto">
        <table className="w-full text-[12px]">
          <thead className="bg-neutral-50 text-[10px] font-sans uppercase tracking-[0.14em] text-neutral-500">
            <tr>
              <th className="text-left px-3 py-2 sticky left-0 bg-neutral-50">Field</th>
              {years.map((y, i) => <th key={y} className={cn('text-right px-3 py-2', i === cur && 'text-action-orange-deep')}>{y}</th>)}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, ri) => (
              <tr key={ri} className="border-t border-neutral-100">
                <td className="px-3 py-1.5 text-ink-950 sticky left-0 bg-white whitespace-nowrap">{r.label}{r.isFormula && <span className="ml-1 text-[9px] font-sans uppercase tracking-wider text-neutral-400">f</span>}</td>
                {(which === 'v1' ? r.v1 : r.v2).map((v, ci) => {
                  const changedCell = r.changed && ci === cur;
                  const cellHi = changedCell && highlight;
                  return (
                    <td key={ci} className={cn('text-right px-3 py-1.5 font-mono', cellHi && 'bg-warning-soft/40', cellHi && which === 'v2' && 'border-l-2 border-action-orange')}>
                      <span className={cn(r.isFormula && 'text-neutral-500')}>{v == null ? '—' : v.toLocaleString()}</span>
                      {changedCell && which === 'v2' && <ChangeIndicator v1={r.v1[ci]} v2={r.v2[ci]} />}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ChangeIndicator({ v1, v2 }: { v1: number | null; v2: number | null }) {
  if (v1 == null && v2 != null) return <span className="ms-1.5 inline-flex items-center h-4 px-1.5 rounded text-[9px] font-bold bg-info-soft text-info-500 align-middle">NEW</span>;
  if (v1 != null && v2 == null) return <span className="ms-1.5 inline-flex items-center h-4 px-1.5 rounded text-[9px] font-bold bg-danger-soft text-danger-500 align-middle">REMOVED</span>;
  if (v1 == null || v2 == null) return null;
  const up = v2 > v1;
  const delta = +(v2 - v1).toFixed(2);
  return (
    <span className={cn('ms-1.5 text-[10px] font-semibold align-middle', up ? 'text-success-500' : 'text-action-orange-deep')}>
      {up ? '▲' : '▼'} {up ? '+' : ''}{delta.toLocaleString()}
    </span>
  );
}

// ---- small pieces ----------------------------------------------------------
function SummaryStat({ label, value, tone, small }: { label: string; value: string; tone?: 'warn' | 'success'; small?: boolean }) {
  return (
    <div className="card p-3">
      <div className="text-[10px] font-sans uppercase tracking-[0.14em] text-neutral-500">{label}</div>
      <div className={cn('font-display font-bold text-ink-950 mt-1 leading-none', small ? 'text-[14px]' : 'text-[26px]',
        tone === 'warn' && 'text-warning-500', tone === 'success' && 'text-success-500')}>{value}</div>
    </div>
  );
}

function MetaCard({ title, badge, tone, rows }: { title: string; badge: string; tone: 'neutral' | 'amber'; rows: [string, React.ReactNode, boolean][] }) {
  return (
    <div className="card p-5">
      <div className="flex items-center gap-2 mb-3">
        <h3 className="font-display text-[14px] font-bold text-ink-950">{title}</h3>
        <span className={cn('chip-sm', tone === 'amber' ? 'bg-action-orange-soft text-action-orange-deep' : 'bg-neutral-100 text-neutral-600')}>{badge}</span>
      </div>
      <div className="space-y-2">
        {rows.map(([label, value, changed], i) => (
          <div key={i} className={cn('flex items-center justify-between gap-3 text-[12px] rounded px-2 py-1 -mx-2', changed && tone === 'amber' && 'bg-warning-soft/40 border-l-2 border-action-orange')}>
            <span className="text-neutral-500">{label}</span>
            <span className="font-semibold text-ink-950 text-right">{value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: () => void }) {
  return (
    <button onClick={onChange} className="inline-flex items-center gap-2 text-[12px] text-neutral-700" aria-pressed={checked}>
      <span className={cn('relative w-8 h-[18px] rounded-full transition flex-shrink-0', checked ? 'bg-action-orange' : 'bg-neutral-300')}>
        <span className={cn('absolute top-0.5 w-3.5 h-3.5 rounded-full bg-white shadow transition-all', checked ? 'left-[16px]' : 'left-0.5')} />
      </span>
      {label}
    </button>
  );
}

function CheckMini() { return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="text-success-500 flex-shrink-0"><polyline points="20 6 9 17 4 12" /></svg>; }
