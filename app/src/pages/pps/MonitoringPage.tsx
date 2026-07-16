import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../store/auth';
import { usePpsSubmissions } from '../../store/ppsSubmissions';
import { PPS_PRODUCTS } from '../../data/pps';
import { cn } from '../../lib/utils';
import { formatDate } from '../../lib/utils';
import { STATUS_META } from '../../components/pps/workflow';

// ============================================================================
// MonitoringPage — DoE PPS internal view (regulator-only) showing:
//   • Product × Entity submission status grid
//   • Delayed submissions report
//   • Compliance summary per entity
// ============================================================================

// Demo entity roster — in production this would come from the trade-license
// registry as described in §3.9 of the process flow doc.
const ENTITIES = [
  { id: 'adnoc-dist',   name: 'ADNOC Distribution',  products: ['gasoline_98','diesel','cng','lpg'] },
  { id: 'enoc',         name: 'ENOC',                products: ['gasoline_98','diesel'] },
  { id: 'grey',         name: 'Grey market',         products: ['diesel'] },
  { id: 'adnoc-gas',    name: 'ADNOC Gas',           products: ['natural_gas','lng'] },
  { id: 'dolphin',      name: 'Dolphin Energy',      products: ['natural_gas'] },
  { id: 'cloudenergi',  name: 'CloudEnergi',         products: ['cng'] },
  { id: 'neutral',      name: 'Neutral Fuels',       products: ['biodiesel'] },
  { id: 'al-fanar',     name: 'Al Fanar',            products: ['lpg'] },
  { id: 'sergas',       name: 'Sergas',              products: ['lpg'] },
  { id: 'monjasa',      name: 'Monjasa',             products: ['fuel_oil'] },
  { id: 'petrochem',    name: 'Petrochem',           products: ['ethanol','naphtha'] },
] as const;

type CellStatus = 'approved' | 'in_review' | 'submitted' | 'returned' | 'draft' | 'overdue' | 'not_started';

export function PpsMonitoringPage() {
  const navigate = useNavigate();
  const user = useAuth((s) => s.user);
  const subs = usePpsSubmissions((s) => s.submissions);
  const [cycle, setCycle] = useState<number>(2025);
  const [view, setView] = useState<'grid' | 'delays' | 'compliance'>('grid');

  if (user?.role !== 'pps_reviewer' && user?.role !== 'pps_approver') {
    return <div className="max-w-[1100px] mx-auto p-6 text-[13px] text-danger-500">Access denied — DoE PPS internal users only.</div>;
  }

  const dueDate = '2026-04-30';

  // Build a lookup: entityId → productId → cellState
  const cellLookup = useMemo(() => {
    const map = new Map<string, Map<string, { status: CellStatus; sub?: typeof subs[0] }>>();
    for (const e of ENTITIES) map.set(e.id, new Map());
    for (const s of subs) {
      if (s.cycleYear !== cycle) continue;
      const inner = map.get(s.entityId) ?? new Map();
      const cellStatus: CellStatus =
        s.status === 'approved'   ? 'approved' :
        s.status === 'in_review'  ? 'in_review' :
        s.status === 'submitted' || s.status === 'resubmitted' ? 'submitted' :
        s.status === 'returned'   ? 'returned' :
        s.status === 'draft'      ? 'draft' :
        'not_started';
      inner.set(s.productId, { status: cellStatus, sub: s });
      map.set(s.entityId, inner);
    }
    return map;
  }, [subs, cycle]);

  function cellFor(entityId: string, productId: string): { status: CellStatus; sub?: typeof subs[0] } | null {
    const ent = ENTITIES.find((e) => e.id === entityId);
    if (!ent) return null;
    if (!(ent.products as readonly string[]).includes(productId)) return null;
    const found = cellLookup.get(entityId)?.get(productId);
    if (found) return found;
    // Required but missing → overdue or not_started
    const overdue = new Date() > new Date(dueDate);
    return { status: overdue ? 'overdue' : 'not_started' };
  }

  // Delayed list
  const delayed = useMemo(() => {
    const out: { entity: string; product: string; productLabel: string; dueDate: string; daysOverdue: number; remindersSent: number; status: string }[] = [];
    for (const e of ENTITIES) {
      for (const pId of e.products) {
        const c = cellFor(e.id, pId);
        if (!c) continue;
        if (c.status === 'overdue' || c.status === 'draft') {
          const days = Math.max(0, Math.floor((Date.now() - new Date(dueDate).getTime()) / 86400000));
          out.push({
            entity: e.name,
            product: pId,
            productLabel: PPS_PRODUCTS.find((p) => p.id === pId)?.label ?? pId,
            dueDate,
            daysOverdue: days,
            remindersSent: days > 0 ? Math.min(3, Math.floor(days / 3) + 1) : 0,
            status: c.status,
          });
        }
      }
    }
    return out;
  }, [cellLookup]);

  // Compliance summary
  const compliance = useMemo(() => ENTITIES.map((e) => {
    const required = e.products.length;
    let submitted = 0, approved = 0, overdue = 0;
    for (const pId of e.products) {
      const c = cellFor(e.id, pId);
      if (!c) continue;
      if (c.status === 'approved') approved++;
      if (['approved','in_review','submitted','returned'].includes(c.status)) submitted++;
      if (c.status === 'overdue') overdue++;
    }
    return { entity: e.name, required, submitted, approved, overdue, onTimePct: required ? Math.round((approved / required) * 100) : 0 };
  }), [cellLookup]);

  return (
    <div className="max-w-[1400px] mx-auto px-6 pt-5 pb-12 bg-neutral-25 min-h-screen">
      <div className="text-[10.5px] font-sans uppercase tracking-[0.18em] text-neutral-500 mb-2">DoE PPS · Internal monitoring</div>
      <div className="flex items-start justify-between gap-6 flex-wrap mb-4">
        <div>
          <h1 className="font-display text-[28px] font-bold text-charcoal-900 leading-tight">Submission monitoring</h1>
          <p className="text-[12.5px] text-neutral-700 mt-2 max-w-[760px]">
            Oversight of the entire data-collection cycle across all 12 products and licensed entities. Each cell shows the current state of an entity's submission for that product.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select value={cycle} onChange={(e) => setCycle(Number(e.target.value))} className="h-10 px-3 rounded-md border border-neutral-200 bg-white text-[13px] font-semibold">
            <option value={2025}>Cycle · 2025 annual</option>
            <option value={2024}>Cycle · 2024 annual</option>
          </select>
          <button className="btn-secondary h-10"><DownloadIcon /> Delay report</button>
        </div>
      </div>

      {/* ============== KPI STRIP ============== */}
      <div className="grid grid-cols-4 gap-3 mb-4">
        <KpiCard label="Total entities" value={String(ENTITIES.length)} sub={`${ENTITIES.reduce((s, e) => s + e.products.length, 0)} entity-product forms required`} tone="info" />
        <KpiCard label="Submitted on time" value={String(compliance.reduce((s, e) => s + e.approved, 0))} sub={`of ${ENTITIES.reduce((s, e) => s + e.products.length, 0)} required submissions`} tone="success" />
        <KpiCard label="Delayed" value={String(delayed.length)} sub={delayed.length ? `Avg ${Math.round(delayed.reduce((s, d) => s + d.daysOverdue, 0) / delayed.length)} days overdue` : 'No delays'} tone="warn" />
        <KpiCard label="Awaiting review" value={String(subs.filter((s) => s.cycleYear === cycle && (s.status === 'submitted' || s.status === 'in_review' || s.status === 'resubmitted')).length)} sub="Open in review queue" tone="info" />
      </div>

      {/* ============== TAB SWITCHER ============== */}
      <div className="card overflow-hidden">
        <div className="border-b border-neutral-100 px-2 pt-2 flex items-center gap-1">
          {([
            { id: 'grid' as const,       label: 'Product × Entity status' },
            { id: 'delays' as const,     label: `Delays (${delayed.length})` },
            { id: 'compliance' as const, label: 'Entity compliance' },
          ]).map((t) => (
            <button key={t.id} onClick={() => setView(t.id)} className={cn('px-3 py-2 text-[12.5px] font-semibold rounded-t-md', view === t.id ? 'bg-white border-x border-t border-neutral-100 text-ink-950 -mb-px' : 'text-neutral-500 hover:text-ink-950')}>{t.label}</button>
          ))}
        </div>

        {view === 'grid' && (
          <div className="overflow-x-auto">
            <table className="w-full text-[12px]">
              <thead className="bg-neutral-50 text-[10px] font-sans uppercase tracking-[0.14em] text-neutral-500">
                <tr>
                  <th className="text-left px-3 py-2.5 sticky left-0 bg-neutral-50 z-10 min-w-[180px]">Entity</th>
                  {PPS_PRODUCTS.map((p) => (
                    <th key={p.id} className="text-center px-2 py-2.5 min-w-[78px]">{p.label.slice(0, 10)}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {ENTITIES.map((e) => (
                  <tr key={e.id} className="border-t border-neutral-100">
                    <td className="px-3 py-2.5 sticky left-0 bg-white z-10 font-semibold text-ink-950">{e.name}</td>
                    {PPS_PRODUCTS.map((p) => {
                      const c = cellFor(e.id, p.id);
                      if (!c) return <td key={p.id} className="px-2 py-2.5 text-center text-neutral-300">—</td>;
                      return (
                        <td key={p.id} className="px-2 py-2.5 text-center">
                          <button
                            onClick={() => c.sub && navigate(`/pps/submissions/${c.sub.id}`)}
                            disabled={!c.sub}
                            className={cn('inline-flex items-center justify-center w-8 h-8 rounded-md transition', c.sub && 'hover:scale-110')}
                            title={`${e.name} · ${p.label} · ${cellLabel(c.status)}`}
                          >
                            <StatusDot status={c.status} />
                          </button>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="px-3 py-2.5 border-t border-neutral-100 flex items-center gap-3 text-[10.5px] text-neutral-500 flex-wrap">
              <Legend status="approved"    label="Approved" />
              <Legend status="in_review"   label="In review" />
              <Legend status="submitted"   label="Submitted" />
              <Legend status="returned"    label="Returned" />
              <Legend status="draft"       label="Draft" />
              <Legend status="overdue"     label="Overdue" />
              <Legend status="not_started" label="Not started" />
            </div>
          </div>
        )}

        {view === 'delays' && (
          <table className="w-full text-[12.5px]">
            <thead className="bg-neutral-50 text-[10px] font-sans uppercase tracking-[0.14em] text-neutral-500 border-b border-neutral-100">
              <tr>
                <th className="text-left px-4 py-2.5">Entity</th>
                <th className="text-left px-4 py-2.5">Product</th>
                <th className="text-left px-4 py-2.5">Due date</th>
                <th className="text-left px-4 py-2.5">Days overdue</th>
                <th className="text-left px-4 py-2.5">Reminders sent</th>
                <th className="text-left px-4 py-2.5">Action</th>
              </tr>
            </thead>
            <tbody>
              {delayed.map((d, i) => (
                <tr key={i} className="border-t border-neutral-100">
                  <td className="px-4 py-2.5 text-ink-950 font-semibold">{d.entity}</td>
                  <td className="px-4 py-2.5 text-neutral-700">{d.productLabel}</td>
                  <td className="px-4 py-2.5 font-mono text-neutral-700">{formatDate(d.dueDate)}</td>
                  <td className="px-4 py-2.5"><span className="chip-sm bg-danger-soft text-danger-500">{d.daysOverdue} days</span></td>
                  <td className="px-4 py-2.5 font-mono text-neutral-700">{d.remindersSent}</td>
                  <td className="px-4 py-2.5">
                    <button className="text-[11.5px] text-info-500 font-semibold hover:underline">Send escalation →</button>
                  </td>
                </tr>
              ))}
              {!delayed.length && (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-[12.5px] text-neutral-500">No overdue submissions for cycle {cycle}. 🎉</td></tr>
              )}
            </tbody>
          </table>
        )}

        {view === 'compliance' && (
          <table className="w-full text-[12.5px]">
            <thead className="bg-neutral-50 text-[10px] font-sans uppercase tracking-[0.14em] text-neutral-500 border-b border-neutral-100">
              <tr>
                <th className="text-left px-4 py-2.5">Entity</th>
                <th className="text-right px-4 py-2.5">Required</th>
                <th className="text-right px-4 py-2.5">Submitted</th>
                <th className="text-right px-4 py-2.5">Approved</th>
                <th className="text-right px-4 py-2.5">Overdue</th>
                <th className="text-right px-4 py-2.5">Compliance</th>
              </tr>
            </thead>
            <tbody>
              {compliance.map((c, i) => (
                <tr key={i} className="border-t border-neutral-100">
                  <td className="px-4 py-2.5 text-ink-950 font-semibold">{c.entity}</td>
                  <td className="px-4 py-2.5 text-right font-mono">{c.required}</td>
                  <td className="px-4 py-2.5 text-right font-mono">{c.submitted}</td>
                  <td className="px-4 py-2.5 text-right font-mono text-success-500 font-semibold">{c.approved}</td>
                  <td className="px-4 py-2.5 text-right font-mono">{c.overdue > 0 ? <span className="text-danger-500 font-semibold">{c.overdue}</span> : c.overdue}</td>
                  <td className="px-4 py-2.5 text-right">
                    <div className="inline-flex items-center gap-2">
                      <div className="w-20 h-1.5 rounded-full bg-neutral-100 overflow-hidden">
                        <div className={cn('h-full', c.onTimePct >= 80 ? 'bg-success-500' : c.onTimePct >= 50 ? 'bg-warning-500' : 'bg-danger-500')} style={{ width: `${c.onTimePct}%` }} />
                      </div>
                      <span className="font-mono text-[11.5px] font-semibold w-9 text-right">{c.onTimePct}%</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function StatusDot({ status }: { status: CellStatus }) {
  const meta = cellStatusMeta(status);
  return (
    <span className={cn('inline-grid place-items-center w-7 h-7 rounded-full text-[11px] font-bold', meta.bg)}>
      {meta.glyph}
    </span>
  );
}

function Legend({ status, label }: { status: CellStatus; label: string }) {
  return <span className="inline-flex items-center gap-1.5"><StatusDot status={status} /> {label}</span>;
}

function cellLabel(status: CellStatus): string {
  // Defer to the canonical labels for the matching SubmissionStatus where one
  // exists, with monitoring-only states (overdue, not_started) handled here.
  if (status === 'overdue')     return 'Overdue';
  if (status === 'not_started') return 'Not started';
  return STATUS_META[status as keyof typeof STATUS_META].label;
}

function cellStatusMeta(status: CellStatus) {
  // Pull the visual classes from the canonical SubmissionStatus meta when
  // possible so all pages agree on colours; monitoring-only cells override.
  if (status === 'overdue')     return { bg: 'bg-danger-500 text-white',  glyph: '!' };
  if (status === 'not_started') return { bg: 'bg-neutral-100 text-neutral-400 border border-neutral-200', glyph: '·' };
  const m = STATUS_META[status as keyof typeof STATUS_META];
  return { bg: m.monitoringDot, glyph: m.monitoringGlyph };
}

function KpiCard({ label, value, sub, tone }: { label: string; value: string; sub: string; tone: 'info' | 'success' | 'warn' }) {
  const tint = tone === 'success' ? 'bg-success-soft text-success-500' : tone === 'warn' ? 'bg-warning-soft text-warning-500' : 'bg-info-soft text-info-500';
  return (
    <div className="card p-4">
      <div className="flex items-center justify-between">
        <div className="text-[10px] font-sans uppercase tracking-[0.16em] text-neutral-500">{label}</div>
        <div className={cn('w-6 h-6 rounded-md grid place-items-center text-[11px] font-bold', tint)}>●</div>
      </div>
      <div className="font-display text-[28px] font-bold text-ink-950 leading-none mt-1">{value}</div>
      <div className="text-[11px] text-neutral-500 mt-1.5">{sub}</div>
    </div>
  );
}

function DownloadIcon() { return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>; }
