import { ReactNode, useState } from 'react';
import { Link } from 'react-router-dom';
import { cn } from '../../../lib/utils';

// =============================================================================
// Shared chrome for each Technical Master Data sub-section:
//   Breadcrumb · hero card · stats · list table · "Add new" form modal.
// Each sub-page passes:
//   • title / subtitle / badge / sdd reference
//   • the table columns + rows
//   • the create-form fields (renders a stacked form inside the modal)
// =============================================================================

interface TechnicalSectionLayoutProps {
  // Page metadata
  title: string;
  subtitle: string;
  sddRef: string;
  badge: string;
  badgeCls: string;
  iconBg: string;     // bg gradient color tone (e.g. #F59E0B)
  // Optional KPI strip values
  kpis?: { label: string; value: string | number; tone?: 'ink' | 'info' | 'success' | 'warning' }[];
  // Table
  columns: { id: string; label: string; align?: 'left' | 'right' | 'center'; width?: string }[];
  rows: { id: string; cells: ReactNode[] }[];
  emptyText?: string;
  // Form
  createTitle: string;
  createDescription: string;
  createForm: ReactNode;             // form fields
  canSubmit: boolean;
  onSubmit: () => void;
}

export function TechnicalSectionLayout({
  title, subtitle, sddRef, badge, badgeCls, iconBg,
  kpis, columns, rows, emptyText,
  createTitle, createDescription, createForm, canSubmit, onSubmit,
}: TechnicalSectionLayoutProps) {
  const [showForm, setShowForm] = useState(false);

  function handleSubmit() {
    onSubmit();
    setShowForm(false);
  }

  return (
    <div className="max-w-[1400px] mx-auto px-6 pt-5 pb-10">
      {/* Breadcrumb */}
      <div className="flex items-center justify-between text-[12px] mb-5">
        <nav className="text-neutral-500">
          <Link to="/pps-dashboard" className="hover:text-doe-red">Home</Link>
          <span className="mx-2 text-neutral-300">›</span>
          <span>Gas Register</span>
          <span className="mx-2 text-neutral-300">›</span>
          <Link to="/gas-register/technical-master-data" className="hover:text-doe-red">Technical Master Data</Link>
          <span className="mx-2 text-neutral-300">›</span>
          <span className="text-ink-950 font-semibold">{title}</span>
        </nav>
        <div className="font-sans text-[11px] tracking-wider text-neutral-500 uppercase">{sddRef}</div>
      </div>

      {/* Hero */}
      <div className="card overflow-hidden mb-6">
        <div className="relative px-6 py-5 bg-gradient-to-br from-[#1E2128] via-[#262A33] to-[#1E2128] text-white">
          <div className="absolute inset-0 opacity-10" style={{ backgroundImage: `radial-gradient(circle at 80% 30%, ${iconBg} 0%, transparent 50%)` }} />
          <div className="relative flex items-center gap-6">
            <div className="w-12 h-12 rounded-xl grid place-items-center shadow-doe-md font-mono font-bold text-[14px]" style={{ background: iconBg, color: '#fff' }}>{badge}</div>
            <div className="flex-1">
              <div className="text-[10px] font-sans uppercase tracking-[0.22em]" style={{ color: iconBg }}>{sddRef}</div>
              <h1 className="font-display font-bold text-[22px] leading-tight mt-1">{title}</h1>
              <p className="text-[12.5px] text-white/70 mt-1 max-w-[640px]">{subtitle}</p>
            </div>
            <button onClick={() => setShowForm(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-action-orange text-white font-semibold text-[11.5px] hover:bg-action-orange-dark shadow-doe-sm transition">
              <PlusIcon /> Add new
            </button>
          </div>
        </div>
        {kpis && kpis.length > 0 && (
          <div className="grid divide-x divide-neutral-100 border-t border-neutral-100 bg-white" style={{ gridTemplateColumns: `repeat(${kpis.length}, minmax(0, 1fr))` }}>
            {kpis.map((k, i) => {
              const tone =
                k.tone === 'success' ? 'text-emerald-600' :
                k.tone === 'warning' ? 'text-amber-700' :
                k.tone === 'info' ? 'text-info-500' :
                'text-ink-950';
              return (
                <div key={i} className="px-4 py-3">
                  <div className="text-[9.5px] font-sans uppercase tracking-[0.18em] text-neutral-500">{k.label}</div>
                  <div className={cn('font-display font-bold text-[20px] mt-0.5 tabular-nums', tone)}>{k.value}</div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* List table */}
      <div className="bg-white rounded-xl border border-neutral-100 shadow-doe-xs overflow-hidden">
        <div className="px-4 py-2 border-b border-neutral-100 bg-neutral-25/60 flex items-center justify-between">
          <div className="text-[10.5px] font-sans uppercase tracking-[0.18em] text-neutral-500">Current entries</div>
          <div className="text-[11px] text-neutral-500">{rows.length} on file</div>
        </div>
        {rows.length === 0 ? (
          <div className="px-4 py-10 text-center text-[12px] text-neutral-500">{emptyText ?? 'No entries yet.'}</div>
        ) : (
          <table className="w-full text-[12px]">
            <thead className="text-[9.5px] font-sans uppercase tracking-[0.16em] text-neutral-500 border-b border-neutral-100 bg-white">
              <tr>
                {columns.map((c) => (
                  <th key={c.id} style={{ width: c.width }}
                    className={cn('px-4 py-2 font-semibold',
                      c.align === 'right' ? 'text-right' : c.align === 'center' ? 'text-center' : 'text-left')}>
                    {c.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {rows.map((r) => (
                <tr key={r.id} className="hover:bg-neutral-25 transition">
                  {r.cells.map((cell, i) => (
                    <td key={i} className={cn('px-4 py-2.5 align-top',
                      columns[i]?.align === 'right' ? 'text-right' : columns[i]?.align === 'center' ? 'text-center' : 'text-left')}>
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Create form modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 bg-ink-950/50 grid place-items-center px-4" onClick={() => setShowForm(false)}>
          <div className="bg-white rounded-xl shadow-doe-lg max-w-[640px] w-full max-h-[90vh] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}>
            <div className="px-5 py-3 border-b border-neutral-100 flex items-center justify-between">
              <div>
                <div className="text-[10px] font-sans uppercase tracking-[0.18em] text-neutral-500">{sddRef}</div>
                <div className="text-[15px] font-display font-bold text-ink-950 mt-0.5">{createTitle}</div>
                <div className="text-[11px] text-neutral-500 mt-0.5">{createDescription}</div>
              </div>
              <button onClick={() => setShowForm(false)} className="w-8 h-8 grid place-items-center text-neutral-500 hover:text-ink-950">✕</button>
            </div>
            <div className="px-5 py-4 overflow-y-auto flex-1">
              {createForm}
            </div>
            <div className="px-5 py-3 border-t border-neutral-100 flex items-center justify-end gap-2">
              <button onClick={() => setShowForm(false)} className="btn-secondary text-[12px]">Cancel</button>
              <button onClick={handleSubmit} disabled={!canSubmit}
                className={cn('btn-primary text-[12px]', !canSubmit && 'opacity-50 cursor-not-allowed')}>Submit</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Small primitives reused by every sub-page form ───
export function FormField({ label, required, helper, children }: { label: string; required?: boolean; helper?: string; children: ReactNode }) {
  return (
    <div className="mb-3.5 last:mb-0">
      <label className="block text-[10.5px] font-sans uppercase tracking-wider text-neutral-500 mb-1">
        {label}{required && <span className="text-doe-red ml-0.5">*</span>}
      </label>
      {children}
      {helper && <div className="text-[10.5px] text-neutral-500 mt-1">{helper}</div>}
    </div>
  );
}

export function Input({ value, onChange, placeholder, type = 'text', mono }: { value: string; onChange: (v: string) => void; placeholder?: string; type?: string; mono?: boolean }) {
  return (
    <input value={value} onChange={(e) => onChange(e.target.value)} type={type} placeholder={placeholder}
      className={cn('w-full px-3 h-9 border border-neutral-200 rounded-md text-[12.5px] focus:outline-none focus:border-action-orange', mono && 'font-mono')} />
  );
}

export function TextArea({ value, onChange, placeholder, rows = 3 }: { value: string; onChange: (v: string) => void; placeholder?: string; rows?: number }) {
  return (
    <textarea value={value} onChange={(e) => onChange(e.target.value)} rows={rows} placeholder={placeholder}
      className="w-full px-3 py-1.5 border border-neutral-200 rounded-md text-[12.5px] focus:outline-none focus:border-action-orange" />
  );
}

export function Select({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: { value: string; label: string }[] }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)}
      className="w-full px-2 h-9 border border-neutral-200 rounded-md text-[12.5px] focus:outline-none focus:border-action-orange">
      {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
}

function PlusIcon() {
  return <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>;
}
