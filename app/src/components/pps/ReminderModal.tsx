import { useState } from 'react';
import { cn } from '../../lib/utils';
import type { SubmissionTask } from '../../types/pps';

// ============================================================================
// Configure Reminder modal — Ahmed Al Mazrouei only, opened from the bell icon
// on an "Action Required" card. Reuses the SuccessModal overlay language
// (fixed inset-0 · bg-ink-950/40 · white rounded-xl · shadow-doe-lg). No new
// global patterns; all controls are local to this component.
// ============================================================================

type ReminderType = 'one_time' | 'recurring';
type Frequency = 'daily' | 'every_2' | 'weekly' | 'custom';
type StartWhen = 'immediately' | 'custom';
type EndWhen = 'on_complete' | 'on_date';
type EscalateAfter = '3' | '5' | '10';

interface HistoryItem { label: string; date: string; escalation?: boolean }

function dayMath(dueIso: string) {
  const ms = new Date(dueIso).getTime() - Date.now();
  const days = Math.round(ms / (24 * 3600 * 1000));
  return days;
}
function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function ReminderModal({
  open, task, submissionRef, recipientName, configured, onClose, onSave,
}: {
  open: boolean;
  task: SubmissionTask;
  submissionRef: string;
  recipientName: string;
  configured: boolean;
  onClose: () => void;
  onSave: () => void;
}) {
  const overdue = task.status === 'overdue';
  const days = dayMath(task.dueOn);

  // ---- form state (sensible demo defaults) --------------------------------
  const [reminderType, setReminderType] = useState<ReminderType>('recurring');
  const [frequency, setFrequency] = useState<Frequency>('daily');
  const [startWhen, setStartWhen] = useState<StartWhen>('immediately');
  const [endWhen, setEndWhen] = useState<EndWhen>('on_complete');
  const [timing, setTiming] = useState<Record<string, boolean>>({ d7: true, d3: true, due: true, after: overdue });
  const [channels, setChannels] = useState({ inapp: true, email: true });
  const [extraEmails, setExtraEmails] = useState<string[]>([]);
  const [emailDraft, setEmailDraft] = useState('');
  const [escalate, setEscalate] = useState(overdue);
  const [escalateAfter, setEscalateAfter] = useState<EscalateAfter>('5');
  const [notify, setNotify] = useState({ admin: false, manager: false });
  const [notes, setNotes] = useState('');

  if (!open) return null;

  const history: HistoryItem[] = overdue
    ? [
        { label: 'Reminder sent', date: '23 Apr 2026' },
        { label: 'Reminder sent', date: '28 Apr 2026' },
        { label: 'Escalation reminder sent', date: '1 May 2026', escalation: true },
      ]
    : [{ label: 'Clarification request sent', date: '20 Jun 2026' }];

  const toggleTiming = (k: string) => setTiming((t) => ({ ...t, [k]: !t[k] }));
  const addEmail = () => {
    const v = emailDraft.trim();
    if (v && /\S+@\S+\.\S+/.test(v) && !extraEmails.includes(v)) {
      setExtraEmails((e) => [...e, v]);
      setEmailDraft('');
    }
  };

  const TIMING_OPTIONS: { k: string; label: string }[] = [
    { k: 'd14', label: '14 days before due date' },
    { k: 'd7', label: '7 days before due date' },
    { k: 'd3', label: '3 days before due date' },
    { k: 'd1', label: '1 day before due date' },
    { k: 'due', label: 'On due date' },
    { k: 'after', label: 'Every day after due date until completed' },
  ];

  return (
    <div className="fixed inset-0 bg-ink-950/40 z-50 grid place-items-center p-4" onClick={onClose}>
      <div
        className="bg-white rounded-xl shadow-doe-lg w-[560px] max-w-full max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Configure Reminder"
      >
        {/* ---- header (sticky) ---- */}
        <div className="px-6 pt-5 pb-4 border-b border-neutral-100 flex items-start justify-between gap-4">
          <div>
            <h3 className="font-display text-[17px] font-bold text-ink-950">Configure Reminder</h3>
            <p className="text-[12px] text-neutral-600 mt-1 leading-relaxed">
              Configure reminder notifications for this application so you don’t miss important deadlines or follow-up actions.
            </p>
          </div>
          <button onClick={onClose} className="text-neutral-400 hover:text-ink-950 text-[15px] leading-none mt-0.5" aria-label="Close">✕</button>
        </div>

        {/* ---- scrollable body ---- */}
        <div className="px-6 py-5 overflow-y-auto flex-1 space-y-6">
          {/* Application details (read-only) */}
          <section>
            <SectionLabel>Application details</SectionLabel>
            <div className="rounded-lg border border-neutral-100 bg-neutral-25 p-3 grid grid-cols-2 gap-x-4 gap-y-2.5">
              <Detail label="Submission ID" value={submissionRef} mono />
              <Detail label="Product" value={task.productLabel} />
              <Detail label="Submission period" value={`${task.cycleYear} · Annual`} />
              <Detail label="Current status" value={overdue ? 'Overdue' : 'Returned for Clarification'} tone={overdue ? 'danger' : 'warning'} />
              <Detail label="Due date" value={formatDate(task.dueOn)} />
              <Detail
                label={days < 0 ? 'Days overdue' : 'Days remaining'}
                value={days < 0 ? `${Math.abs(days)} days` : `${days} days`}
                tone={days < 0 ? 'danger' : undefined}
              />
            </div>
          </section>

          {/* Reminder schedule */}
          <section>
            <SectionLabel>Reminder schedule</SectionLabel>
            <FieldLabel>Reminder type</FieldLabel>
            <Segmented
              options={[{ v: 'one_time', label: 'One-time' }, { v: 'recurring', label: 'Recurring' }]}
              value={reminderType}
              onChange={(v) => setReminderType(v as ReminderType)}
            />
            {reminderType === 'recurring' && (
              <div className="mt-3 space-y-3 rounded-lg border border-neutral-100 bg-neutral-25 p-3">
                <div>
                  <FieldLabel>Frequency</FieldLabel>
                  <Segmented
                    options={[
                      { v: 'daily', label: 'Daily' },
                      { v: 'every_2', label: 'Every 2 days' },
                      { v: 'weekly', label: 'Weekly' },
                      { v: 'custom', label: 'Custom' },
                    ]}
                    value={frequency}
                    onChange={(v) => setFrequency(v as Frequency)}
                  />
                </div>
                <div>
                  <FieldLabel>Start reminder</FieldLabel>
                  <Segmented
                    options={[{ v: 'immediately', label: 'Immediately' }, { v: 'custom', label: 'Custom date & time' }]}
                    value={startWhen}
                    onChange={(v) => setStartWhen(v as StartWhen)}
                  />
                  {startWhen === 'custom' && (
                    <input type="datetime-local" className="mt-2 w-full h-9 px-2.5 rounded-md border border-neutral-200 bg-white text-[12.5px]" />
                  )}
                </div>
                <div>
                  <FieldLabel>End reminder</FieldLabel>
                  <Segmented
                    options={[{ v: 'on_complete', label: 'When submission is completed' }, { v: 'on_date', label: 'On selected date' }]}
                    value={endWhen}
                    onChange={(v) => setEndWhen(v as EndWhen)}
                  />
                  {endWhen === 'on_date' && (
                    <input type="date" className="mt-2 w-full h-9 px-2.5 rounded-md border border-neutral-200 bg-white text-[12.5px]" />
                  )}
                </div>
              </div>
            )}
          </section>

          {/* Notification timing */}
          <section>
            <SectionLabel>Notification timing</SectionLabel>
            <div className="space-y-1.5">
              {TIMING_OPTIONS.map((o) => (
                <CheckRow key={o.k} checked={!!timing[o.k]} onChange={() => toggleTiming(o.k)} label={o.label} />
              ))}
            </div>
          </section>

          {/* Notification channels */}
          <section>
            <SectionLabel>Notification channels</SectionLabel>
            <div className="space-y-1.5">
              <CheckRow checked={channels.inapp} onChange={() => setChannels((c) => ({ ...c, inapp: !c.inapp }))} label="In-app notification" />
              <CheckRow checked={channels.email} onChange={() => setChannels((c) => ({ ...c, email: !c.email }))} label="Email notification" />
            </div>
          </section>

          {/* Recipients */}
          <section>
            <SectionLabel>Reminder recipients</SectionLabel>
            <div className="flex flex-wrap gap-2 mb-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-action-orange-soft text-action-orange-deep text-[11.5px] font-semibold px-2.5 h-7">
                {recipientName}
                <span className="text-[9px] uppercase tracking-wide bg-white/60 rounded px-1 py-0.5">You</span>
              </span>
              {extraEmails.map((em) => (
                <span key={em} className="inline-flex items-center gap-1.5 rounded-full bg-neutral-100 text-neutral-700 text-[11.5px] px-2.5 h-7">
                  {em}
                  <button onClick={() => setExtraEmails((e) => e.filter((x) => x !== em))} className="text-neutral-400 hover:text-danger-500" aria-label={`Remove ${em}`}>✕</button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                value={emailDraft}
                onChange={(e) => setEmailDraft(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addEmail(); } }}
                placeholder="Add additional email recipient…"
                className="flex-1 h-9 px-2.5 rounded-md border border-neutral-200 bg-white text-[12.5px] focus:outline-none focus:border-action-orange focus:ring-1 focus:ring-action-orange/20"
              />
              <button onClick={addEmail} className="h-9 px-3 rounded-md border border-neutral-200 text-[12.5px] font-semibold text-neutral-700 hover:bg-neutral-50">Add</button>
            </div>
          </section>

          {/* Escalation */}
          <section>
            <div className="flex items-center justify-between">
              <SectionLabel className="mb-0">Escalation</SectionLabel>
              <Toggle checked={escalate} onChange={() => setEscalate((v) => !v)} />
            </div>
            <p className="text-[11.5px] text-neutral-500 mt-1">Escalate if no action is taken.</p>
            {escalate && (
              <div className="mt-3 space-y-3 rounded-lg border border-neutral-100 bg-neutral-25 p-3">
                <div>
                  <FieldLabel>Escalate after</FieldLabel>
                  <Segmented
                    options={[{ v: '3', label: '3 days' }, { v: '5', label: '5 days' }, { v: '10', label: '10 days' }]}
                    value={escalateAfter}
                    onChange={(v) => setEscalateAfter(v as EscalateAfter)}
                  />
                </div>
                <div>
                  <FieldLabel>Notify</FieldLabel>
                  <div className="space-y-1.5">
                    <CheckRow checked={notify.admin} onChange={() => setNotify((n) => ({ ...n, admin: !n.admin }))} label="Entity Administrator" />
                    <CheckRow checked={notify.manager} onChange={() => setNotify((n) => ({ ...n, manager: !n.manager }))} label="Reporting Manager" />
                  </div>
                </div>
              </div>
            )}
          </section>

          {/* Notes */}
          <section>
            <SectionLabel>Notes <span className="text-neutral-400 normal-case tracking-normal font-normal">(optional)</span></SectionLabel>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="e.g. Follow up with finance team before responding."
              className="w-full px-2.5 py-2 rounded-md border border-neutral-200 bg-white text-[12.5px] resize-none focus:outline-none focus:border-action-orange focus:ring-1 focus:ring-action-orange/20"
            />
          </section>

          {/* Reminder history */}
          <section>
            <SectionLabel>Reminder history</SectionLabel>
            <div className="space-y-1.5">
              {history.map((h, i) => (
                <div key={i} className="flex items-center gap-2 text-[12px] text-neutral-700">
                  <span className={cn('w-1.5 h-1.5 rounded-full flex-shrink-0', h.escalation ? 'bg-danger-500' : 'bg-success-500')} />
                  <span className={cn(h.escalation && 'text-danger-500 font-medium')}>{h.label}</span>
                  <span className="text-neutral-400">—</span>
                  <span className="text-neutral-500">{h.date}</span>
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* ---- footer (sticky) ---- */}
        <div className="px-6 py-4 border-t border-neutral-100 flex items-center justify-end gap-2">
          <button onClick={onClose} className="btn-secondary text-[13px] h-10 px-4">Cancel</button>
          <button onClick={onSave} className="btn-primary text-[13px] h-10 px-4">
            {configured ? 'Update Reminder' : 'Save Reminder'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ----- small building blocks ------------------------------------------------

function SectionLabel({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn('text-[10.5px] font-sans uppercase tracking-[0.16em] text-neutral-500 mb-2', className)}>{children}</div>;
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <div className="text-[11.5px] font-medium text-neutral-700 mb-1.5">{children}</div>;
}

function Detail({ label, value, mono, tone }: { label: string; value: string; mono?: boolean; tone?: 'danger' | 'warning' }) {
  return (
    <div>
      <div className="text-[9.5px] font-sans uppercase tracking-[0.14em] text-neutral-500">{label}</div>
      <div className={cn('text-[12.5px] font-semibold mt-0.5',
        mono && 'font-mono text-[11.5px]',
        tone === 'danger' ? 'text-danger-500' : tone === 'warning' ? 'text-warning-500' : 'text-ink-950')}>{value}</div>
    </div>
  );
}

function Segmented({ options, value, onChange }: { options: { v: string; label: string }[]; value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((o) => (
        <button
          key={o.v}
          type="button"
          onClick={() => onChange(o.v)}
          className={cn('h-8 px-3 rounded-md border text-[12px] font-medium transition',
            value === o.v
              ? 'border-action-orange bg-action-orange-soft text-action-orange-deep'
              : 'border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50')}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function CheckRow({ checked, onChange, label }: { checked: boolean; onChange: () => void; label: string }) {
  return (
    <button type="button" onClick={onChange} className="flex items-center gap-2.5 w-full text-left group">
      <span className={cn('w-4 h-4 rounded grid place-items-center border flex-shrink-0 transition',
        checked ? 'bg-action-orange border-action-orange text-white' : 'bg-white border-neutral-300 group-hover:border-neutral-400')}>
        {checked && <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>}
      </span>
      <span className="text-[12.5px] text-ink-950">{label}</span>
    </button>
  );
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <button
      type="button"
      onClick={onChange}
      aria-pressed={checked}
      className={cn('relative w-10 h-6 rounded-full transition flex-shrink-0', checked ? 'bg-action-orange' : 'bg-neutral-300')}
    >
      <span className={cn('absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all', checked ? 'left-[18px]' : 'left-0.5')} />
    </button>
  );
}
