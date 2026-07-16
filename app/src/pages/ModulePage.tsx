import { useNavigate, useParams } from 'react-router-dom';
import { listServicesByModule, MODULES } from '../services/registry';
import { PageHeader } from '../components/PageHeader';
import { useAuth } from '../store/auth';
import type { Module } from '../types';

export function ModulePage() {
  const { module } = useParams<{ module: Module }>();
  const navigate = useNavigate();
  const user = useAuth((s) => s.user)!;
  const mod = MODULES.find((m) => m.id === module);
  if (!mod) return <div className="p-6">Module not found.</div>;
  const services = listServicesByModule(mod.id);
  const canAccess = user.modules.includes(mod.id);

  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: 'PPS', to: '/pps-dashboard' }, { label: mod.label }]}
        title={mod.label}
        subtitle={mod.tagline}
      />
      <div className="max-w-[1280px] mx-auto px-6 pb-10">
        {!canAccess && (
          <div className="card p-5 mb-4 bg-warning-soft border-warning-500/30">
            <strong>Restricted:</strong> Your account does not have access to the {mod.label} module.
          </div>
        )}

        <div className="grid grid-cols-3 gap-4">
          {services.map((svc) => (
            <button
              key={svc.id}
              onClick={() => navigate(`/module/${svc.module}/${svc.action}`)}
              className="card p-5 text-left hover:border-action-orange hover:shadow-doe-md transition"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-md bg-action-orange-soft text-action-orange-deep grid place-items-center font-mono font-bold text-[12px]">
                  {svc.action.toUpperCase().slice(0, 3)}
                </div>
                <div>
                  <div className="font-display font-bold text-[15px] text-ink-950">{svc.shortTitle}</div>
                  <div className="text-[10.5px] font-sans uppercase tracking-wider text-neutral-500">{svc.id}</div>
                </div>
              </div>
              <p className="text-[12.5px] text-neutral-500 mt-3">{svc.description}</p>
              <div className="mt-4 flex items-center gap-2 text-[11.5px] text-neutral-500">
                <span className="chip bg-neutral-100 text-neutral-700">{svc.states.length} states</span>
                <span className="chip bg-neutral-100 text-neutral-700">{svc.transitions.length} actions</span>
                <span className="chip bg-neutral-100 text-neutral-700">{svc.sla.length} SLA stages</span>
              </div>
            </button>
          ))}
          {services.length === 0 && (
            <div className="col-span-3 card p-10 text-center">
              <div className="text-[14px] font-semibold text-neutral-700">No services defined yet for {mod.label}</div>
              <div className="text-[12.5px] text-neutral-500 mt-1">
                Drop the next BRD and we'll add it as a new service definition file.
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
