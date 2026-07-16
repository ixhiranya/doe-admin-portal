import { useState } from 'react';
import { cn, formatDate } from '../../lib/utils';
import type { Submission } from '../../types/pps';

// ============================================================================
// SendReminderModal — DoE PPS Approver (Omar Al Suwaidi) only. A focused
// "send a reminder to the submitting entity" dialog, distinct from the entity
// submitter's Configure-Reminder popup (which is left untouched). Reuses the
// shared overlay language: fixed inset-0 · bg-ink-950/40 · white rounded-xl ·
// shadow-doe-lg. On send it records to the submission's reminder audit trail.
// ============================================================================

type Channel = 'email' | 'inapp' | 'both';
const CHANNEL_LABEL: Record<Channel, string> = { email: 'Email', inapp: 'In-app', both: 'Email + In-app' };

function fmtDateTime(iso: string) {
  const d = new Date(iso);
  return `${formatDate(iso)} • ${d.toLocaleString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })}`;
}

export function SendReminderModal({
  open, submission, recipientName, onClose, onSend,
}: {
  open: boolean;
  submission: Submission;
  recipientName: string;
  onClose: () => void;
  onSend: (payload: { channel: string; note?: string }) => void;
}) {
  const [channel, setChannel] = useState<Channel>('both');
  const [note, setNote] = useState('');
  const [sent, setSent] = useState(false);

  if (!open) return null;

  const history = submission.reminders ?? [];
  const statusLabel =
    submission.status === 'submitted' ? 'Awaiting DoE review' :
    submission.status === 'resubmitted' ? 'Re-submitted after clarification' :
    submission.status === 'in_review' ? 'In DoE review' : submission.status;

  function send() {
    onSend({ channel: CHANNEL_LABEL[channel], note: note.trim() || undefined });
    setSent(true);
    setTimeout(onClose, 950);
  }

  return (
    <div className="fixed inset-0 bg-ink-950/40 z-50 grid place-items-center p-4" onClick={onClose}>
      <div
        className="bg-white rounded-xl shadow-doe-lg w-[460px] max-w-full max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Send Reminder"
      >
        {/* header */}
        <div className="px-6 pt-5 pb-4 border-b border-neutral-100 flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <span className="h-9 w-9 rounded-lg bg-info-soft text-info-500 grid place-items-center flex-shrink-0">
              <BellIcon />
            </span>
            <div>
              <h3 className="font-display text-[16px] font-bold text-ink-950">Send Reminder</h3>
              <p className="text-[12px] text-neutral-600 mt-0.5 leading-relaxed">
                Notify the entity that this submission is awaiting their attention.
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-neutral-400 hover:text-ink-950 text-[15px] leading-none mt-0.5" aria-label="Close">✕</button>
        </div>

        {/* body */}
        <div className="px-6 py-5 overflow-y-auto flex-1 space-y-5">
          {/* application details */}
          <div className="rounded-lg border border-neutral-100 bg-neutral-25 p-3 grid grid-cols-2 gap-x-4 gap-y-2.5">
            <Detail label="Submission ID" value={submission.ref} mono />
            <Detail label="Product" value={submission.productLabel} />
            <Detail label="Entity" value={submission.entityName} />
            <Detail label="Period" value={`${submission.cycleYear} · Annual`} />
            <Detail label="Current status" value={statusLabel} tone="info" />
            {submission.submittedOn && <Detail label="Submitted" value={formatDate(submission.submittedOn)} />}
          </div>

          {/* recipient */}
          <section>
            <SectionLabel>Reminder recipient</SectionLabel>
            <div className="flex items-center gap-2.5 rounded-lg border border-neutral-100 px-3 h-11">
              <span className="h-7 w-7 rounded-full bg-action-orange-soft text-action-orange-deep grid place-items-center text-[10px] font-mono font-bold">
                {recipientName.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase()}
              </span>
              <div className="leading-tight">
                <div className="text-[12.5px] font-semibold text-ink-950">{recipientName}</div>
                <div className="text-[10.5px] text-neutral-500">{submission.entityName} · Entity Submitter</div>
              </div>
            </div>
          </section>

          {/* channel */}
          <section>
            <SectionLabel>Notification channel</SectionLabel>
            <div className="grid grid-cols-3 gap-1.5 rounded-lg bg-neutral-50 p-1">
              {(['email', 'inapp', 'both'] as Channel[]).map((c) => (
                <button
                  key={c}
                  onClick={() => setChannel(c)}
                  className={cn('h-8 rounded-md text-[12px] font-semibold transition',
                    channel === c ? 'bg-white text-ink-950 shadow-sm' : 'text-neutral-500 hover:text-ink-950')}
                >
                  {CHANNEL_LABEL[c]}
                </button>
              ))}
            </div>
          </section>

          {/* optional message */}
          <section>
            <SectionLabel>Message <span className="text-neutral-400 font-normal normal-case tracking-normal">(optional)</span></SectionLabel>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              placeholder="Add an optional note for the entity, e.g. “Please action your pending submission at the earliest.”"
              className="w-full rounded-md border border-neutral-200 bg-white px-3 py-2 text-[12.5px] leading-relaxed resize-none focus:outline-none focus:border-action-orange focus:ring-2 focus:ring-action-orange/15"
            />
          </section>

          {/* reminder history */}
          {history.length > 0 && (
            <section>
              <SectionLabel>Previous reminders ({history.length})</SectionLabel>
              <ol className="space-y-2">
                {history.slice().reverse().map((r, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-[11.5px]">
                    <span className="mt-1 w-1.5 h-1.5 rounded-full bg-info-500 flex-shrink-0" />
                    <div className="leading-tight">
                      <div className="text-ink-950 font-medium">Reminder sent by {r.by}</div>
                      <div className="text-neutral-500 mt-0.5 font-mono text-[10.5px]">{fmtDateTime(r.at)}</div>
                      <div className="text-neutral-500">{r.channel} sent to {r.toName}</div>
                    </div>
                  </li>
                ))}
              </ol>
            </section>
          )}
        </div>

        {/* footer */}
        <div className="px-6 py-4 border-t border-neutral-100 flex items-center justify-end gap-2">
          <button onClick={onClose} className="btn-secondary h-9 text-[12.5px] px-4">Cancel</button>
          <button
            onClick={send}
            disabled={sent}
            className={cn('btn-primary h-9 text-[12.5px] px-4 inline-flex items-center gap-1.5', sent && 'opacity-80')}
          >
            {sent ? (<><CheckIcon /> Reminder sent</>) : (<><BellIcon /> Send reminder</>)}
          </button>
        </div>
      </div>
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <div className="text-[10px] font-sans uppercase tracking-[0.16em] text-neutral-500 mb-2">{children}</div>;
}

function Detail({ label, value, mono, tone }: { label: string; value: string; mono?: boolean; tone?: 'info' }) {
  return (
    <div>
      <div className="text-[9.5px] font-sans uppercase tracking-[0.14em] text-neutral-400">{label}</div>
      <div className={cn('text-[12px] mt-0.5', mono && 'font-mono', tone === 'info' ? 'text-info-500 font-semibold' : 'text-ink-950 font-medium')}>{value}</div>
    </div>
  );
}

function BellIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  );
}
function CheckIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
  );
}
