import { useNavigate } from 'react-router-dom';
import { useAuth } from '../store/auth';
import { useApps } from '../store/apps';
import { listServicesByModule, MODULES } from '../services/registry';
import { getService } from '../services/registry';
import { getState, isInQueueFor, roleLabel } from '../engine/workflow';
import { PageHeader } from '../components/PageHeader';
import { StatusBadge } from '../components/StatusBadge';
import { formatDate } from '../lib/utils';
import { useT } from '../i18n';

export function DashboardPage() {
  const user = useAuth((s) => s.user)!;
  const apps = useApps((s) => s.apps);
  const notifs = useApps((s) => s.notifs);
  const navigate = useNavigate();
  const t = useT();

  const myApps = apps.filter((a) => {
    if (user.userType === 'internal') return user.modules.includes(a.module);
    return a.applicantUserId === user.id;
  });

  const inMyQueue = myApps.filter((a) => {
    const svc = getService(a.serviceId);
    if (!svc) return false;
    return isInQueueFor(a, user, svc);
  });

  const byStatus = myApps.reduce<Record<string, number>>((acc, a) => {
    const svc = getService(a.serviceId);
    const state = svc ? getState(svc, a.state) : undefined;
    const k = state?.category || 'other';
    acc[k] = (acc[k] || 0) + 1;
    return acc;
  }, {});

  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: 'PPS · Petroleum Products Sector' }, { label: t('dashboard.breadcrumbDashboard') }]}
        title={t('dashboard.welcome', { name: user.name.split(' ')[0] })}
        subtitle={t('dashboard.welcomeRole', { role: roleLabel(user.role), modules: user.modules.map((m) => MODULES.find((mm) => mm.id === m)?.label ?? m).join(' · ') })}
      />

      <div className="max-w-[1280px] mx-auto px-6 pb-10 space-y-6">
        {/* ---- KPI strip ---- */}
        <div className="grid grid-cols-4 gap-4">
          <Kpi label={t('dashboard.inYourQueue')}    value={inMyQueue.length}                                     accent="orange" hint={t('dashboard.awaitingAction')} />
          <Kpi label={t('dashboard.pendingReviews')} value={byStatus.pending || 0}                                accent="info"   hint={t('dashboard.currentApplications')} />
          <Kpi label="Approved"                       value={(byStatus.approved || 0) + (byStatus.issued || 0)}    accent="success" hint="Including issued certificates" />
          <Kpi label={t('dashboard.notifications')}  value={notifs.length}                                       accent="red"    hint={t('dashboard.simulatedLog')} />
        </div>

        {/* ---- Modules + services ---- */}
        <div className="grid grid-cols-2 gap-4">
          {MODULES.filter((m) => user.modules.includes(m.id)).map((mod) => {
            const services = listServicesByModule(mod.id);
            return (
              <div key={mod.id} className="card p-5">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <div className="text-[10px] font-sans tracking-[0.2em] uppercase text-neutral-500">Module</div>
                    <h3 className="font-display text-[18px] font-bold text-ink-950">{mod.label}</h3>
                    <div className="text-[12px] text-neutral-500">{mod.tagline}</div>
                  </div>
                  <button
                    onClick={() => navigate(`/module/${mod.id}`)}
                    className="btn-ghost text-[12px]"
                  >
                    Open module →
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {services.length === 0 && (
                    <div className="col-span-2 text-[12.5px] text-neutral-400 italic bg-neutral-50 rounded-md p-3 text-center">
                      Services for this module will appear here once the corresponding BRDs are wired in.
                    </div>
                  )}
                  {services.map((svc) => (
                    <button
                      key={svc.id}
                      onClick={() => navigate(`/module/${svc.module}/${svc.action}`)}
                      className="flex items-start gap-2.5 p-3 rounded-md border border-neutral-100 hover:border-action-orange hover:bg-action-orange-soft/30 text-left transition"
                    >
                      <div className="w-8 h-8 rounded-md bg-action-orange-soft text-action-orange-deep grid place-items-center font-mono font-bold text-[10px]">
                        {svc.action.toUpperCase().slice(0, 3)}
                      </div>
                      <div>
                        <div className="text-[13px] font-semibold text-ink-950">{svc.shortTitle}</div>
                        <div className="text-[11px] text-neutral-500">{svc.action}</div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* ---- Queue table ---- */}
        <div className="card overflow-hidden">
          <div className="px-5 py-3.5 border-b border-neutral-100 flex items-center justify-between">
            <div>
              <h3 className="font-display text-[16px] font-bold text-ink-950">
                {user.role === 'applicant' ? 'Your applications' : 'In your queue'}
              </h3>
              <div className="text-[11.5px] text-neutral-500">
                {user.role === 'applicant'
                  ? 'Drafts, in-flight reviews and approved registrations.'
                  : 'Applications awaiting your action.'}
              </div>
            </div>
          </div>
          {inMyQueue.length === 0 && myApps.length === 0 ? (
            <EmptyState role={user.role} />
          ) : (
            <table className="w-full">
              <thead className="bg-neutral-50 text-[10.5px] uppercase tracking-wider text-neutral-500">
                <tr>
                  <th className="text-left px-5 py-2.5">Application No.</th>
                  <th className="text-left px-5 py-2.5">Company</th>
                  <th className="text-left px-5 py-2.5">Service</th>
                  <th className="text-left px-5 py-2.5">Category</th>
                  <th className="text-left px-5 py-2.5">Status</th>
                  <th className="text-left px-5 py-2.5">SLA Due</th>
                  <th className="px-3"></th>
                </tr>
              </thead>
              <tbody>
                {(inMyQueue.length > 0 ? inMyQueue : myApps).map((app) => {
                  const svc = getService(app.serviceId);
                  const state = svc ? getState(svc, app.state) : undefined;
                  return (
                    <tr key={app.id} className="border-t border-neutral-100 hover:bg-neutral-25 cursor-pointer" onClick={() => navigate(`/app/${app.id}`)}>
                      <td className="px-5 py-3 font-mono text-[12px] text-ink-950">{app.applicationNumber}</td>
                      <td className="px-5 py-3 text-[12.5px] text-neutral-700">{app.company.name}</td>
                      <td className="px-5 py-3 text-[12.5px] text-neutral-700">{svc?.shortTitle ?? app.serviceId}</td>
                      <td className="px-5 py-3 text-[12.5px] text-neutral-700">{app.category ? `Category ${app.category}` : '—'}</td>
                      <td className="px-5 py-3">{state ? <StatusBadge state={state} /> : <span>—</span>}</td>
                      <td className="px-5 py-3 text-[12px] text-neutral-700">{formatDate(app.slaDueDate)}</td>
                      <td className="px-3 py-3 text-right text-action-orange">→</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </>
  );
}

function Kpi({ label, value, hint, accent }: { label: string; value: number; hint: string; accent: 'orange' | 'info' | 'success' | 'red' }) {
  const ringMap = {
    orange: 'bg-action-orange-soft text-action-orange-deep',
    info: 'bg-info-soft text-info-500',
    success: 'bg-success-soft text-success-500',
    red: 'bg-doe-red-soft text-doe-red',
  };
  return (
    <div className="card p-4">
      <div className="flex items-start justify-between">
        <div className="text-[10.5px] font-sans uppercase tracking-wider text-neutral-500">{label}</div>
        <div className={`w-6 h-6 rounded-md ${ringMap[accent]} grid place-items-center text-[11px] font-bold`}>•</div>
      </div>
      <div className="font-display text-[32px] font-bold text-ink-950 leading-none mt-3">{value}</div>
      <div className="text-[11.5px] text-neutral-500 mt-1">{hint}</div>
    </div>
  );
}

function EmptyState({ role }: { role: string }) {
  return (
    <div className="px-8 py-12 text-center">
      <div className="text-[24px]">🎉</div>
      <div className="text-[14px] text-neutral-700 font-semibold mt-2">
        {role === 'applicant' ? 'No applications yet' : 'Inbox zero — nothing in your queue'}
      </div>
      <div className="text-[12.5px] text-neutral-500 mt-1">
        {role === 'applicant'
          ? 'Start a new application from a module above.'
          : 'New submissions and re-submissions assigned to you will appear here.'}
      </div>
    </div>
  );
}
