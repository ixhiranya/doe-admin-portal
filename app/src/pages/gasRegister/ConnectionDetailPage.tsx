import { useMemo } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { getConnectionEvent, eventsForCustomer, type ConnectionAction } from '../../services/gasRegister/connection';
import { ModuleDetailLayout, DetailCard, Field, FieldGrid } from './ModuleDetailLayout';
import { cn } from '../../lib/utils';

export function ConnectionDetailPage() {
  const { eventId } = useParams<{ eventId: string }>();
  const e = useMemo(() => eventId ? getConnectionEvent(eventId) : undefined, [eventId]);
  const navigate = useNavigate();

  if (!e) {
    return (
      <div className="min-h-screen bg-neutral-25 grid place-items-center">
        <div className="card p-10 text-center">
          <div className="text-4xl mb-2">🔎</div>
          <div className="font-display font-bold text-[15px] text-ink-950">Event not found</div>
          <button onClick={() => navigate('/gas-register/connection')} className="mt-4 btn-primary">Back to events</button>
        </div>
      </div>
    );
  }

  const history = eventsForCustomer(e.customerId);
  const tone = actionTone(e.action);

  return (
    <ModuleDetailLayout
      parentLabel="Connection & Disconnection" parentHref="/gas-register/connection"
      current={`${e.action} · ${e.customerName}`} sddRef="BN 13 · Gas Register SDD"
      iconText={e.action.slice(0, 3).toUpperCase()} iconAccent={ACTION_COLORS[e.action]}
      eyebrow="Supply State Change"
      title={`${e.action} · ${e.customerName}`}
      subtitle={`${e.permitHolderName} · ${e.reason}${e.reasonNotes ? ' — ' + e.reasonNotes : ''}`}
      status={{ label: e.action, tone }}
      meta={
        <>
          <span className="font-mono text-white/70">{e.id}</span>
          <span className="text-white/40">·</span>
          <span className="text-white/70">Effective {formatDate(e.effectiveDate)}</span>
        </>
      }
      kpis={[
        { label: 'Action', value: e.action, tone: tone === 'success' ? 'success' : tone === 'danger' ? 'danger' : tone === 'warning' ? 'warning' : 'info' },
        { label: 'Effective Date', value: formatDate(e.effectiveDate), tone: 'ink' },
        { label: 'Meter (Litres)', value: e.meterReadingLiters !== undefined ? e.meterReadingLiters.toLocaleString() : '—', tone: 'ink' },
        { label: 'Meter (SCM)',    value: e.meterReadingScm !== undefined    ? e.meterReadingScm.toLocaleString()    : '—', tone: 'ink' },
      ]}
    >
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          <DetailCard title="Event Details">
            <FieldGrid>
              <Field label="Action" value={e.action} />
              <Field label="Effective Date" value={formatDate(e.effectiveDate)} />
              <Field label="Reason" value={e.reason} />
              {e.reasonNotes && <Field label="Notes" value={e.reasonNotes} />}
              <Field label="Performed By" value={e.performedBy} />
              <Field label="Logged At" value={new Date(e.createdAt).toLocaleString('en-GB')} />
            </FieldGrid>
          </DetailCard>

          <DetailCard title="Meter Reading & Asset Linkage">
            <FieldGrid>
              <Field label="Linked Asset / Storage" value={e.linkedAssetName ?? '—'} />
              <Field label="Supporting Document" value={e.supportingDocument?.fileName ?? '—'} mono />
              <Field label="Meter Reading · Litres" value={e.meterReadingLiters !== undefined ? `${e.meterReadingLiters.toLocaleString()} L` : '—'} mono />
              <Field label="Meter Reading · SCM" value={e.meterReadingScm !== undefined ? `${e.meterReadingScm.toLocaleString()} SCM` : '—'} mono />
            </FieldGrid>
          </DetailCard>
        </div>

        {/* Customer timeline — proper vertical spine with dot nodes */}
        <DetailCard title="Customer Event Timeline" subtitle={`${history.length} event${history.length === 1 ? '' : 's'} on file · most recent first`}>
          {history.length === 0 ? (
            <div className="text-[11.5px] text-neutral-500">No prior events.</div>
          ) : (
            <div className="relative pl-6 pt-1">
              {/* Vertical spine */}
              <div className="absolute left-[10px] top-1 bottom-1 w-px bg-neutral-200" />
              <ol className="space-y-4">
                {history.map((h, i) => {
                  const isCurrent = h.id === e.id;
                  const isLast = i === history.length - 1;
                  const dotColor = ACTION_COLORS[h.action];
                  return (
                    <li key={h.id} className="relative">
                      {/* Node dot on the spine */}
                      <span
                        className={cn(
                          'absolute -left-[18px] top-0.5 inline-flex items-center justify-center w-[10px] h-[10px] rounded-full ring-4 ring-white',
                          isCurrent ? 'shadow-[0_0_0_3px_rgba(232,155,76,0.35)]' : '',
                        )}
                        style={{ background: dotColor }}
                      />
                      {/* Date + action chip inline (no card chrome) */}
                      <Link
                        to={`/gas-register/connection/${h.id}`}
                        className={cn(
                          'block transition rounded-md -ml-1 px-2 py-1',
                          isCurrent ? 'bg-action-orange-soft' : 'hover:bg-neutral-25',
                        )}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <span className={cn('inline-flex items-center px-1.5 h-4 rounded text-[9.5px] font-semibold uppercase tracking-wider', actionPillCls(h.action))}>
                            {h.action}
                          </span>
                          <span className="text-[10.5px] font-mono text-neutral-500">{formatDate(h.effectiveDate)}</span>
                          {isCurrent && (
                            <span className="ml-auto text-[9px] font-sans uppercase tracking-[0.16em] text-action-orange-deep font-semibold">Viewing</span>
                          )}
                        </div>
                        <div className="text-[12px] text-ink-950 font-semibold leading-tight">{h.reason}</div>
                        {h.reasonNotes && (
                          <div className="text-[10.5px] text-neutral-500 mt-0.5 leading-snug line-clamp-2">{h.reasonNotes}</div>
                        )}
                        <div className="text-[10px] text-neutral-400 mt-1">By {h.performedBy}</div>
                      </Link>
                      {/* Spacer to give breathing room before next node */}
                      {!isLast && <div className="h-1" />}
                    </li>
                  );
                })}
              </ol>
            </div>
          )}
        </DetailCard>
      </div>
    </ModuleDetailLayout>
  );
}

const ACTION_COLORS: Record<ConnectionAction, string> = {
  'Connect':    '#10B981',
  'Disconnect': '#E11D48',
  'Reconnect':  '#3B82F6',
  'Suspend':    '#F59E0B',
};

function actionTone(a: ConnectionAction): 'success' | 'danger' | 'warning' | 'info' {
  if (a === 'Connect') return 'success';
  if (a === 'Disconnect') return 'danger';
  if (a === 'Suspend') return 'warning';
  return 'info';
}
function actionPillCls(a: ConnectionAction): string {
  if (a === 'Connect')    return 'bg-emerald-50 text-emerald-700';
  if (a === 'Disconnect') return 'bg-rose-50 text-doe-red';
  if (a === 'Suspend')    return 'bg-amber-50 text-amber-700';
  return 'bg-info-soft text-info-500';
}
function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}
