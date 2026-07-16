// =============================================================================
// BN 12 — Company Registration · Notifications & Permit-Renewal Reminders
// SDD §3.12 / §3.12.1
// -----------------------------------------------------------------------------
// Three panes:
//   1. Live Reminders   — derived from PermitRecords using the 60/30/7d window.
//   2. DED Notifications — audit log of permit issuance / renewal / expiry /
//      cancellation events emitted to the Department of Economic Development.
//   3. Email Template Preview — the SDD §3.12.1 renewal email rendered with
//      the selected reminder's placeholders substituted.
// =============================================================================
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  listReminders, listDedNotifications, notificationSummary, renderRenewalEmail,
  reminderKindLabel, TRADE_LICENCE_EXPIRED_WARNING,
  type Reminder, type ReminderKind,
} from '../../services/gasRegister/notifications';
import { cn } from '../../lib/utils';

type Pane = 'reminders' | 'ded' | 'template';

export function NotificationsPage() {
  const reminders = useMemo(() => listReminders(), []);
  const dedLog    = useMemo(() => listDedNotifications(), []);
  const summary   = useMemo(() => notificationSummary(), []);

  const [pane, setPane]               = useState<Pane>('reminders');
  const [kindFilter, setKindFilter]   = useState<'all' | ReminderKind>('all');
  const [selectedId, setSelectedId]   = useState<string>(reminders[0]?.id ?? '');

  const filtered = useMemo(() =>
    reminders.filter((r) => kindFilter === 'all' ? true : r.kind === kindFilter),
  [reminders, kindFilter]);

  const selected = reminders.find((r) => r.id === selectedId) ?? reminders[0];
  const email = selected ? renderRenewalEmail(selected) : null;

  return (
    <div className="max-w-[1400px] mx-auto px-6 pt-5 pb-10">
      {/* Breadcrumb */}
      <nav className="text-[12px] text-neutral-500 mb-5">
        <Link to="/pps-dashboard" className="hover:text-doe-red">Home</Link>
        <span className="mx-2 text-neutral-300">›</span>
        <span>Gas Register</span>
        <span className="mx-2 text-neutral-300">›</span>
        <span className="text-ink-950 font-semibold">Notifications & Reminders</span>
      </nav>

      {/* Hero */}
      <div className="card overflow-hidden mb-6">
        <div className="relative px-6 py-6 bg-gradient-to-br from-[#1E2128] via-[#262A33] to-[#1E2128] text-white">
          <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 20% 30%, #E89B4C 0%, transparent 50%), radial-gradient(circle at 80% 70%, #0E76A8 0%, transparent 50%)' }} />
          <div className="relative flex items-center gap-6">
            <div className="w-14 h-14 rounded-xl bg-action-orange/90 grid place-items-center shadow-doe-md">
              <BellIcon />
            </div>
            <div className="flex-1">
              <div className="text-[10px] font-sans uppercase tracking-[0.22em] text-action-orange-soft">Gas Register · Company Registration · BN 12</div>
              <h1 className="font-display font-bold text-[24px] leading-tight mt-1">Notifications & permit-renewal reminders.</h1>
              <p className="text-[12.5px] text-white/70 mt-1 max-w-[720px]">
                Cron-derived reminders sent to permit holders at 60 / 30 / 7 days before expiry, audit log of DED-bound notifications, and the SDD-mandated email template (§3.12.1).
              </p>
            </div>
          </div>
        </div>

        {/* KPI strip */}
        <div className="grid grid-cols-2 lg:grid-cols-6 divide-x divide-neutral-100 border-t border-neutral-100 bg-white">
          <Kpi value={summary.totalReminders}     label="Active reminders" tone="info" />
          <Kpi value={summary.expiringIn60Days}   label="60d" tone="info" />
          <Kpi value={summary.expiringIn30Days}   label="30d" tone="warning" />
          <Kpi value={summary.expiringIn7Days}    label="7d" tone="danger" />
          <Kpi value={summary.expiredPermits}     label="Expired permits" tone="danger" />
          <Kpi value={summary.dedNotificationsSent} label="DED notifications" tone="ink" />
        </div>
      </div>

      {/* Tabs */}
      <div className="card mb-4 overflow-hidden">
        <div className="px-2 border-b border-neutral-100 flex items-center">
          {([
            { id: 'reminders' as const, label: 'Live Reminders', count: reminders.length },
            { id: 'ded'       as const, label: 'DED Notifications', count: dedLog.length },
            { id: 'template'  as const, label: 'Email Template (§3.12.1)' },
          ]).map((t) => (
            <button key={t.id} onClick={() => setPane(t.id)}
              className={cn('relative px-4 py-3 text-[12.5px] font-semibold transition',
                pane === t.id ? 'text-action-orange-deep' : 'text-neutral-500 hover:text-ink-950')}>
              {t.label}{t.count !== undefined && <span className="ml-2 text-[10.5px] font-mono text-neutral-400">({t.count})</span>}
              {pane === t.id && <span className="absolute inset-x-2 -bottom-px h-[2px] bg-action-orange" />}
            </button>
          ))}
        </div>
      </div>

      {pane === 'reminders' && (
        <div className="space-y-3">
          {/* Filter pills */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {([
              { id: 'all', label: 'All' },
              { id: 'permit_renewal_60d', label: '60-day' },
              { id: 'permit_renewal_30d', label: '30-day' },
              { id: 'permit_renewal_7d',  label: '7-day' },
              { id: 'permit_expired',     label: 'Expired' },
              { id: 'trade_licence_expired', label: 'Trade Licence expired (blocked)' },
            ] as { id: 'all' | ReminderKind; label: string }[]).map((p) => (
              <button key={p.id} onClick={() => setKindFilter(p.id)}
                className={cn('px-3 py-1.5 rounded-md text-[11.5px] font-semibold transition border',
                  kindFilter === p.id ? 'bg-action-orange text-white border-action-orange shadow-doe-sm' : 'bg-white text-ink-950 border-neutral-200 hover:border-action-orange')}>
                {p.label}
              </button>
            ))}
          </div>

          <div className="card overflow-hidden">
            {filtered.length === 0 ? (
              <div className="px-6 py-12 text-center text-[12.5px] text-neutral-500">No reminders match this filter.</div>
            ) : (
              <table className="w-full">
                <thead className="bg-neutral-25 text-[10px] uppercase tracking-[0.16em] text-neutral-500 border-b border-neutral-100">
                  <tr>
                    <th className="text-left px-4 py-2.5">Permit holder</th>
                    <th className="text-left px-4 py-2.5">Reminder</th>
                    <th className="text-left px-4 py-2.5">Permit · Trade Licence</th>
                    <th className="text-right px-4 py-2.5">Days to expiry</th>
                    <th className="text-left px-4 py-2.5">Status</th>
                    <th className="text-right px-4 py-2.5">Preview email</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((r) => (
                    <tr key={r.id}
                      className={cn('border-b border-neutral-100 last:border-b-0 transition cursor-pointer',
                        r.id === selectedId ? 'bg-action-orange-soft/50' : 'hover:bg-neutral-25')}
                      onClick={() => { setSelectedId(r.id); setPane('template'); }}>
                      <td className="px-4 py-3">
                        <div className="text-[12.5px] font-semibold text-ink-950 leading-tight">{r.permitHolderName}</div>
                        <div className="text-[10.5px] font-mono text-neutral-500 mt-0.5">{r.permitHolderId} · {r.recipient}</div>
                      </td>
                      <td className="px-4 py-3 text-[12px]">
                        <SeverityPill severity={r.severity} label={reminderKindLabel(r.kind)} />
                      </td>
                      <td className="px-4 py-3 text-[12px]">
                        <div className="font-mono text-ink-950">{r.permitNumber}</div>
                        <div className="font-mono text-[10.5px] text-neutral-500 mt-0.5">{r.tradeLicenceNumber}</div>
                      </td>
                      <td className={cn('px-4 py-3 text-right font-mono font-semibold tabular-nums',
                        r.daysToExpiry < 0 ? 'text-doe-red' : r.daysToExpiry <= 7 ? 'text-doe-red' : r.daysToExpiry <= 30 ? 'text-amber-700' : 'text-ink-950')}>
                        {r.daysToExpiry < 0 ? `${Math.abs(r.daysToExpiry)}d ago` : `${r.daysToExpiry}d`}
                      </td>
                      <td className="px-4 py-3 text-[11.5px]">
                        {r.blocked ? (
                          <span className="inline-flex items-center gap-1.5 text-doe-red font-semibold">
                            <span className="w-1.5 h-1.5 rounded-full bg-doe-red animate-pulse" />
                            Renewal blocked
                          </span>
                        ) : (
                          <span className="text-emerald-700">Reminder queued</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button className="text-[11.5px] text-action-orange-deep font-semibold hover:underline">
                          Preview →
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Blocked-renewal warning per SDD §3.12 */}
          {filtered.some((r) => r.blocked) && (
            <div className="rounded-md border border-doe-red bg-rose-50 px-4 py-3 flex items-start gap-2.5">
              <span className="text-[16px] leading-none">⚠️</span>
              <div>
                <div className="text-[12.5px] font-semibold text-doe-red">On-screen warning shown to the Permit Holder:</div>
                <div className="text-[12px] text-ink-950 mt-1 italic">"{TRADE_LICENCE_EXPIRED_WARNING}"</div>
              </div>
            </div>
          )}
        </div>
      )}

      {pane === 'ded' && (
        <div className="card overflow-hidden">
          <div className="px-5 py-3 border-b border-neutral-100">
            <div className="text-[11px] font-sans uppercase tracking-[0.18em] text-neutral-500">DED Notification Audit Log · SDD §3.12</div>
            <div className="text-[11.5px] text-neutral-500 mt-0.5">Permit issuance / renewal / expiry / cancellation events emitted to the Department of Economic Development.</div>
          </div>
          <table className="w-full">
            <thead className="bg-neutral-25 text-[10px] uppercase tracking-[0.16em] text-neutral-500 border-b border-neutral-100">
              <tr>
                <th className="text-left px-5 py-2.5">ID</th>
                <th className="text-left px-5 py-2.5">Event</th>
                <th className="text-left px-5 py-2.5">Permit holder</th>
                <th className="text-left px-5 py-2.5">Permit</th>
                <th className="text-left px-5 py-2.5">Emitted</th>
                <th className="text-left px-5 py-2.5">DED ack</th>
                <th className="text-left px-5 py-2.5">Payload</th>
              </tr>
            </thead>
            <tbody>
              {dedLog.map((n) => (
                <tr key={n.id} className="border-b border-neutral-100 last:border-b-0 hover:bg-neutral-25">
                  <td className="px-5 py-3 font-mono text-[11.5px] text-neutral-500">{n.id}</td>
                  <td className="px-5 py-3">
                    <DedEventPill kind={n.kind} />
                  </td>
                  <td className="px-5 py-3 text-[12.5px] text-ink-950">{n.permitHolderName}</td>
                  <td className="px-5 py-3 font-mono text-[12px] text-ink-950">{n.permitNumber}</td>
                  <td className="px-5 py-3 font-mono text-[11.5px] text-neutral-500">{new Date(n.emittedAt).toLocaleString('en-GB')}</td>
                  <td className="px-5 py-3 font-mono text-[11.5px]">
                    {n.acknowledgedAt
                      ? <span className="text-emerald-700">{new Date(n.acknowledgedAt).toLocaleString('en-GB')}</span>
                      : <span className="text-amber-700">Pending</span>}
                  </td>
                  <td className="px-5 py-3 text-[11.5px] text-neutral-700">{n.payloadPreview}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {pane === 'template' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-1 card overflow-hidden">
            <div className="px-4 py-3 border-b border-neutral-100">
              <div className="text-[11px] font-sans uppercase tracking-[0.18em] text-neutral-500">Pick a reminder</div>
            </div>
            <div className="max-h-[600px] overflow-auto">
              {reminders.map((r) => (
                <button key={r.id} onClick={() => setSelectedId(r.id)}
                  className={cn('block w-full text-left px-4 py-3 border-b border-neutral-100 last:border-b-0 transition',
                    r.id === selectedId ? 'bg-action-orange-soft/50' : 'hover:bg-neutral-25')}>
                  <div className="flex items-center justify-between gap-2 mb-0.5">
                    <span className="text-[12px] font-semibold text-ink-950 truncate">{r.permitHolderName}</span>
                    <SeverityDot severity={r.severity} />
                  </div>
                  <div className="font-mono text-[10.5px] text-neutral-500">{r.permitNumber}</div>
                  <div className="text-[10.5px] text-neutral-500 mt-0.5">{reminderKindLabel(r.kind)}</div>
                </button>
              ))}
            </div>
          </div>

          <div className="lg:col-span-2 card overflow-hidden">
            {email && selected ? (
              <>
                <div className="px-5 py-3 border-b border-neutral-100 flex items-center justify-between">
                  <div>
                    <div className="text-[11px] font-sans uppercase tracking-[0.18em] text-neutral-500">Renewal email · SDD §3.12.1 template</div>
                    <div className="text-[11.5px] text-neutral-500 mt-0.5">Substituted with %PermitNumber% and %ExpiryDate% placeholders for {selected.permitHolderName}.</div>
                  </div>
                  <button className="px-3 py-1.5 rounded-md text-[11.5px] font-semibold bg-action-orange text-white shadow-doe-sm hover:bg-action-orange-dark">
                    Send now
                  </button>
                </div>
                <div className="p-5">
                  <div className="grid grid-cols-[80px_1fr] gap-2 text-[12px] mb-4 pb-3 border-b border-neutral-100">
                    <div className="text-neutral-500 font-sans uppercase tracking-wider text-[10px]">To</div>
                    <div className="font-mono text-ink-950">{email.to}</div>
                    <div className="text-neutral-500 font-sans uppercase tracking-wider text-[10px]">cc</div>
                    <div className="font-mono text-ink-950">{email.cc}</div>
                    <div className="text-neutral-500 font-sans uppercase tracking-wider text-[10px]">Subject</div>
                    <div className="text-ink-950 font-semibold">{email.subject}</div>
                  </div>
                  <pre className="whitespace-pre-wrap text-[12.5px] text-ink-950 font-sans leading-relaxed">{email.body}</pre>

                  {selected.blocked && (
                    <div className="mt-5 rounded-md border border-doe-red bg-rose-50 px-3 py-2.5">
                      <div className="text-[11px] font-sans uppercase tracking-[0.18em] text-doe-red mb-1">Renewal blocked · on-screen warning</div>
                      <div className="text-[12px] text-ink-950 italic">"{TRADE_LICENCE_EXPIRED_WARNING}"</div>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="px-6 py-16 text-center text-[12.5px] text-neutral-500">Pick a reminder to preview its email.</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Atoms
// ============================================================================
function Kpi({ value, label, tone }: { value: number | string; label: string; tone: 'ink' | 'info' | 'warning' | 'danger' }) {
  const map = {
    ink:     'text-ink-950',
    info:    'text-info-500',
    warning: 'text-amber-700',
    danger:  'text-doe-red',
  } as const;
  return (
    <div className="px-4 py-3 text-center">
      <div className={cn('font-display font-bold text-[22px] tabular-nums leading-none', map[tone])}>{value}</div>
      <div className="text-[10px] font-sans uppercase tracking-[0.16em] text-neutral-500 mt-1">{label}</div>
    </div>
  );
}

function SeverityPill({ severity, label }: { severity: 'info' | 'warning' | 'danger'; label: string }) {
  const map = {
    info:    'bg-info-soft text-info-500 ring-info-500/30',
    warning: 'bg-amber-50  text-amber-700 ring-amber-500/40',
    danger:  'bg-rose-50   text-doe-red   ring-doe-red/40',
  } as const;
  return (
    <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-[10.5px] font-semibold uppercase tracking-wide ring-1', map[severity])}>
      {label}
    </span>
  );
}

function SeverityDot({ severity }: { severity: 'info' | 'warning' | 'danger' }) {
  const map = { info: 'bg-info-500', warning: 'bg-amber-500', danger: 'bg-doe-red' } as const;
  return <span className={cn('w-2 h-2 rounded-full shrink-0', map[severity])} />;
}

function DedEventPill({ kind }: { kind: 'permit_issued' | 'permit_renewed' | 'permit_expired' | 'permit_cancelled' }) {
  const map = {
    permit_issued:    { label: 'Issued',    cls: 'bg-emerald-50 text-emerald-700 ring-emerald-500/30' },
    permit_renewed:   { label: 'Renewed',   cls: 'bg-info-soft text-info-500 ring-info-500/30' },
    permit_expired:   { label: 'Expired',   cls: 'bg-rose-50 text-doe-red ring-doe-red/40' },
    permit_cancelled: { label: 'Cancelled', cls: 'bg-neutral-100 text-neutral-600 ring-neutral-300' },
  } as const;
  const m = map[kind];
  return (
    <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-[10.5px] font-semibold uppercase tracking-wide ring-1', m.cls)}>
      {m.label}
    </span>
  );
}

function BellIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  );
}
