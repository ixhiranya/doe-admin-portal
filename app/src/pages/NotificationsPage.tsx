import { useState } from 'react';
import { useApps } from '../store/apps';
import { useAuth } from '../store/auth';
import { PageHeader } from '../components/PageHeader';
import { formatDateTime } from '../lib/utils';
import { cn } from '../lib/utils';
import { useNavigate } from 'react-router-dom';

export function NotificationsPage() {
  const notifs = useApps((s) => s.notifs);
  const apps = useApps((s) => s.apps);
  const user = useAuth((s) => s.user)!;
  const navigate = useNavigate();
  const [filter, setFilter] = useState<'all' | 'email' | 'sms' | 'mine'>('all');

  const filtered = notifs
    .slice()
    .reverse()
    .filter((n) => {
      if (filter === 'email') return n.channel === 'email';
      if (filter === 'sms') return n.channel === 'sms';
      if (filter === 'mine') return n.toUserId === user.role || n.toUserId === user.id;
      return true;
    });

  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: 'PPS', to: '/pps-dashboard' }, { label: 'Notifications Inbox' }]}
        title="Notifications Inbox"
        subtitle="Simulated emails and SMS dispatched by the workflow engine. In production these route through SMTP and the SMS gateway."
        actions={
          <div className="flex gap-1 bg-neutral-50 rounded-md p-1">
            {(['all', 'mine', 'email', 'sms'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={cn('px-3 py-1 text-[11.5px] font-semibold uppercase tracking-wider rounded',
                  filter === f ? 'bg-white shadow-doe-xs text-ink-950' : 'text-neutral-500')}
              >
                {f}
              </button>
            ))}
          </div>
        }
      />

      <div className="max-w-[1280px] mx-auto px-6 pb-10">
        {filtered.length === 0 ? (
          <div className="card p-12 text-center">
            <div className="text-[24px]">📭</div>
            <div className="text-[14px] font-semibold mt-2">No notifications yet</div>
            <div className="text-[12.5px] text-neutral-500 mt-1">Submit an application or run a workflow action to trigger emails and SMS.</div>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((n) => {
              const app = apps.find((a) => a.id === n.applicationId);
              return (
                <div key={n.id} className="card p-4 hover:border-action-orange cursor-pointer" onClick={() => app && navigate(`/app/${app.id}`)}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={cn('chip', n.channel === 'email' ? 'bg-info-soft text-info-500' : 'bg-action-orange-soft text-action-orange-deep')}>
                          {n.channel.toUpperCase()}
                        </span>
                        <span className="chip bg-neutral-100 text-neutral-700">to: {n.toUserId}</span>
                        {app && <span className="text-[11px] font-mono text-neutral-500">{app.applicationNumber} · {app.company.name}</span>}
                      </div>
                      <div className="font-semibold text-[13.5px] text-ink-950">{n.subject}</div>
                    </div>
                    <div className="text-[11px] font-mono text-neutral-500 whitespace-nowrap">{formatDateTime(n.at)}</div>
                  </div>
                  <pre className="text-[12px] text-neutral-700 whitespace-pre-wrap font-sans mt-2 pl-2 border-l-2 border-neutral-100">{n.body}</pre>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}
