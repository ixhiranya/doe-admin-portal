import { cn } from '../../lib/utils';

// =============================================================================
// PPS · Master Data — shared form primitives. Styling matches the existing
// `.field-input` / `.field-label` utility classes (src/styles/globals.css)
// used throughout the rest of the app (application forms, gas register forms).
// =============================================================================

export function FormField({ label, required, helper, error, children }: {
  label: string; required?: boolean; helper?: string; error?: string; children: React.ReactNode;
}) {
  return (
    <div>
      <label className="field-label">
        {label}{required && <span className="text-doe-red ml-0.5">*</span>}
      </label>
      {children}
      {error ? (
        <div className="text-[11px] text-doe-red mt-1">{error}</div>
      ) : helper ? (
        <div className="text-[11px] text-neutral-500 mt-1">{helper}</div>
      ) : null}
    </div>
  );
}

export function TextInput({ value, onChange, placeholder, mono, disabled, error }: {
  value: string; onChange: (v: string) => void; placeholder?: string; mono?: boolean; disabled?: boolean; error?: string;
}) {
  return (
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      disabled={disabled}
      className={cn('field-input', mono && 'font-mono', error && 'border-doe-red focus:border-doe-red')}
    />
  );
}

export function NumberInput({ value, onChange, placeholder, step = 'any', error }: {
  value: string; onChange: (v: string) => void; placeholder?: string; step?: string; error?: string;
}) {
  return (
    <input
      type="number"
      step={step}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className={cn('field-input font-mono', error && 'border-doe-red focus:border-doe-red')}
    />
  );
}

export function TextArea({ value, onChange, placeholder, rows = 3 }: { value: string; onChange: (v: string) => void; placeholder?: string; rows?: number }) {
  return (
    <textarea value={value} onChange={(e) => onChange(e.target.value)} rows={rows} placeholder={placeholder} className="field-input resize-none" />
  );
}

export function SelectInput({ value, onChange, options, error }: {
  value: string; onChange: (v: string) => void; options: { value: string; label: string }[]; error?: string;
}) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} className={cn('field-input', error && 'border-doe-red focus:border-doe-red')}>
      {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
}

export function CheckboxInput({ checked, onChange, label, helper }: { checked: boolean; onChange: (v: boolean) => void; label: string; helper?: string }) {
  return (
    <label className="flex items-start gap-2.5 py-1 cursor-pointer select-none">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="mt-0.5 w-4 h-4 rounded border-neutral-300 text-action-orange focus:ring-action-orange/30" />
      <span>
        <span className="text-[13px] text-ink-950 font-medium">{label}</span>
        {helper && <span className="block text-[11px] text-neutral-500 mt-0.5">{helper}</span>}
      </span>
    </label>
  );
}

export function FormPageShell({
  breadcrumb, badge, badgeBg = '#E89B4C', title, subtitle, children, onCancel, onSubmit, submitLabel = 'Save', canSubmit = true, submitting, formError,
}: {
  breadcrumb: React.ReactNode;
  badge: string;
  badgeBg?: string;
  title: string;
  subtitle: string;
  children: React.ReactNode;
  onCancel: () => void;
  onSubmit: () => void;
  submitLabel?: string;
  canSubmit?: boolean;
  submitting?: boolean;
  formError?: string | null;
}) {
  return (
    <div className="max-w-[900px] mx-auto px-6 pt-5 pb-10">
      {breadcrumb}
      <div className="card overflow-hidden">
        <div className="px-6 py-4 border-b border-neutral-100 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg grid place-items-center font-mono font-bold text-[11px] flex-shrink-0" style={{ background: badgeBg, color: '#fff' }}>{badge}</div>
          <div>
            <h1 className="font-display font-bold text-[17px] text-ink-950 leading-tight">{title}</h1>
            <p className="text-[12px] text-neutral-500 mt-0.5">{subtitle}</p>
          </div>
        </div>
        <div className="px-6 py-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
          {children}
        </div>
        {formError && (
          <div className="mx-6 mb-4 px-3 py-2 rounded-md bg-danger-soft text-doe-red text-[12px]">{formError}</div>
        )}
        <div className="px-6 py-3.5 border-t border-neutral-100 bg-neutral-25/60 flex items-center justify-end gap-2">
          <button onClick={onCancel} className="btn-secondary text-[12.5px]" disabled={submitting}>Cancel</button>
          <button onClick={onSubmit} className={cn('btn-primary text-[12.5px]', !canSubmit && 'opacity-50 cursor-not-allowed')} disabled={!canSubmit || submitting}>
            {submitting ? 'Saving…' : submitLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

export function ViewPageShell({
  breadcrumb, badge, badgeBg = '#E89B4C', title, subtitle, actions, children,
}: {
  breadcrumb: React.ReactNode;
  badge: string;
  badgeBg?: string;
  title: string;
  subtitle: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="max-w-[900px] mx-auto px-6 pt-5 pb-10">
      {breadcrumb}
      <div className="card overflow-hidden">
        <div className="px-6 py-4 border-b border-neutral-100 flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg grid place-items-center font-mono font-bold text-[11px] flex-shrink-0" style={{ background: badgeBg, color: '#fff' }}>{badge}</div>
            <div>
              <h1 className="font-display font-bold text-[17px] text-ink-950 leading-tight">{title}</h1>
              <p className="text-[12px] text-neutral-500 mt-0.5">{subtitle}</p>
            </div>
          </div>
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </div>
        <div className="px-6 py-5 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
          {children}
        </div>
      </div>
    </div>
  );
}

export function ViewField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="field-label">{label}</div>
      <div className="text-[13.5px] text-ink-950 min-h-[22px]">{children}</div>
    </div>
  );
}
