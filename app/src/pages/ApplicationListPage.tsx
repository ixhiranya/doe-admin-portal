import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../store/auth';
import { useApps } from '../store/apps';
import { getService } from '../services/registry';
import { getState, roleLabel, userCanSeeApplication } from '../engine/workflow';
import { StatusBadge } from '../components/StatusBadge';
import { cn, formatDate } from '../lib/utils';
import type { Application, Module, ServiceAction, StateDef } from '../types';

export function ApplicationListPage() {
  const { module, action } = useParams<{ module: Module; action: ServiceAction }>();
  const navigate = useNavigate();
  const user = useAuth((s) => s.user)!;
  const apps = useApps((s) => s.apps);

  const svc = getService(`${module}.${action}` as any);

  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('');
  const [yearFilter, setYearFilter] = useState<string>(String(new Date().getFullYear()));
  const [submittedByMe, setSubmittedByMe] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [kpiFilter, setKpiFilter] = useState<'total' | 'approved' | 'inReview' | 'returned' | 'payment'>('total');

  const allForSvc = useMemo(
    () => apps.filter((a) => a.serviceId === `${module}.${action}`).filter((a) => userCanSeeApplication(a, user)),
    [apps, module, action, user],
  );

  const visible = useMemo(() => {
    return allForSvc
      .filter((a) => {
        if (kpiFilter === 'total') return true;
        const st = svc ? getState(svc, a.state) : undefined;
        if (!st) return false;
        if (kpiFilter === 'approved') return st.category === 'approved' || st.category === 'issued';
        if (kpiFilter === 'inReview') return st.category === 'pending';
        if (kpiFilter === 'returned') return st.category === 'returned';
        if (kpiFilter === 'payment') return st.category === 'payment';
        return true;
      })
      .filter((a) => !categoryFilter || a.category === categoryFilter)
      .filter((a) => !statusFilter || a.state === statusFilter)
      .filter((a) => !submittedByMe || a.applicantUserId === user.id)
      .filter((a) => {
        if (!yearFilter) return true;
        const d = a.submittedOn ?? a.createdAt;
        return new Date(d).getFullYear() === Number(yearFilter);
      })
      .filter((a) => {
        if (!search) return true;
        const q = search.toLowerCase();
        return (
          a.applicationNumber.toLowerCase().includes(q) ||
          a.company.name.toLowerCase().includes(q) ||
          a.company.tradePermitNumber.toLowerCase().includes(q)
        );
      });
  }, [allForSvc, kpiFilter, svc, categoryFilter, statusFilter, submittedByMe, yearFilter, search, user.id]);

  // ---- KPIs ----
  const kpis = useMemo(() => {
    const counts = { total: allForSvc.length, approved: 0, inReview: 0, returned: 0, queuedForPayment: 0, slaWarn: 0, outstandingFee: 0 };
    if (!svc) return counts;
    for (const a of allForSvc) {
      const s = getState(svc, a.state);
      if (!s) continue;
      if (s.category === 'approved' || s.category === 'issued') counts.approved++;
      if (s.category === 'pending') counts.inReview++;
      if (s.category === 'returned') counts.returned++;
      if (s.category === 'payment') {
        counts.queuedForPayment++;
        counts.outstandingFee += svc.feeAmount ?? 0;
      }
      // SLA: due within 5 days
      if (a.slaDueDate) {
        const days = (new Date(a.slaDueDate).getTime() - Date.now()) / (24 * 3600 * 1000);
        if (days < 5 && s.category === 'pending') counts.slaWarn++;
      }
    }
    return counts;
  }, [allForSvc, svc]);

  const awaitingActionCount = useMemo(() => {
    if (!svc) return 0;
    return allForSvc.filter((a) => {
      const s = getState(svc, a.state);
      if (!s) return false;
      if (user.userType === 'external' && user.id !== a.applicantUserId) return false;
      if (user.userType === 'internal' && s.ownerRole !== user.role) return false;
      if (user.userType === 'external' && s.ownerRole !== 'applicant') return false;
      return true;
    }).length;
  }, [allForSvc, svc, user]);

  if (!svc) {
    return (
      <div className="max-w-[1400px] mx-auto px-6 py-10 text-[14px] text-neutral-500">
        Service definition for <code>{module}.{action}</code> is not yet wired in.
      </div>
    );
  }

  const canCreate = user.userType === 'external' && user.modules.includes(svc.module);

  return (
    <div className="max-w-[1400px] mx-auto px-6 pt-5 pb-10">
      {/* ============== Breadcrumbs row ============== */}
      <div className="flex items-center justify-between text-[12px] mb-5">
        <nav className="text-neutral-500">
          <Link to="/pps-dashboard" className="hover:text-doe-red">Home</Link>
          <span className="mx-2 text-neutral-300">›</span>
          <Link to={`/module/${svc.module}`} className="hover:text-doe-red">
            {moduleNav(svc.module)}
          </Link>
          <span className="mx-2 text-neutral-300">›</span>
          <span className="text-ink-950 font-semibold">{moduleTitle(svc.module)}</span>
        </nav>
        <div className="font-sans text-[11px] tracking-wider text-neutral-500 uppercase">
          Service cycle {new Date().getFullYear()} · {modulePrefix(svc.module)}
        </div>
      </div>

      {/* ============== Page header ============== */}
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2 text-[10.5px] font-sans uppercase tracking-[0.18em] text-doe-red mb-2">
            <span>{moduleNav(svc.module)}</span>
            <span className="text-neutral-300">·</span>
            <span>{modulePrefix(svc.module)} Registration</span>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="font-display text-[26px] font-bold text-ink-950 leading-tight">
              {moduleTitle(svc.module)}
              <span className="text-neutral-400 font-normal"> — {capitalize(svc.action)}</span>
            </h1>
            {awaitingActionCount > 0 && (
              <span className="chip bg-lavender text-[#7B3FE4] border border-[#7B3FE4]/20 text-[10.5px]">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#7B3FE4]" />
                {awaitingActionCount} awaiting your action
              </span>
            )}
          </div>
          <p className="text-neutral-500 text-[13px] mt-2 max-w-[760px]">
            Submit and manage registrations to handle gas systems — new establishments, building installation, maintenance and operation.
            Track SLA, approvals and renewals across all companies linked to your commercial permit.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button className="btn-secondary">
            <DownloadIcon /> Export
          </button>
        </div>
      </div>

      {/* ============== KPI Cards (click to filter) ============== */}
      <div className="grid grid-cols-5 gap-3 mb-6">
        <KpiCard
          label="Total Submissions"
          value={kpis.total}
          subline="+3 vs last cycle"
          subTint="success"
          icon={<FileIcon />}
          active={kpiFilter === 'total'}
          onClick={() => setKpiFilter('total')}
        />
        <KpiCard
          label="Approved"
          value={kpis.approved}
          subline="60% approval rate · avg 4.2 days"
          icon={<CheckIcon />}
          active={kpiFilter === 'approved'}
          onClick={() => setKpiFilter(kpiFilter === 'approved' ? 'total' : 'approved')}
        />
        <KpiCard
          label="In Review"
          value={kpis.inReview}
          subline={kpis.slaWarn > 0 ? `${kpis.slaWarn} nearing SLA` : 'All within SLA'}
          subTint={kpis.slaWarn > 0 ? 'warn' : 'muted'}
          icon={<ClockIcon />}
          active={kpiFilter === 'inReview'}
          onClick={() => setKpiFilter(kpiFilter === 'inReview' ? 'total' : 'inReview')}
        />
        <KpiCard
          label="Returned"
          value={kpis.returned}
          subline="Awaiting your re-submission"
          icon={<ReturnIcon />}
          active={kpiFilter === 'returned'}
          onClick={() => setKpiFilter(kpiFilter === 'returned' ? 'total' : 'returned')}
        />
        <KpiCard
          label="Queued for Payment"
          value={kpis.queuedForPayment}
          subline={kpis.outstandingFee > 0 ? `AED ${kpis.outstandingFee.toLocaleString()} outstanding` : 'No outstanding fees'}
          icon={<WalletIcon />}
          active={kpiFilter === 'payment'}
          onClick={() => setKpiFilter(kpiFilter === 'payment' ? 'total' : 'payment')}
        />
      </div>

      {/* ============== Filters bar ============== */}
      <div className="card p-3 mb-3 flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[280px] max-w-[520px]">
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none w-4 h-4 grid place-items-center">
            <SearchIcon />
          </div>
          <input
            placeholder="Search by company, GSO ID, permit, category…"
            className="w-full bg-white border border-neutral-200 rounded-md text-[13px] text-ink-950 placeholder-neutral-400 focus:outline-none focus:border-action-orange focus:ring-2 focus:ring-action-orange/15 transition h-9"
            style={{ paddingLeft: 34, paddingRight: 48 }}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-mono text-neutral-400 bg-neutral-100 rounded px-1.5 py-0.5 pointer-events-none">⌘K</span>
        </div>

        <FilterSelect label="Category" value={categoryFilter} onChange={setCategoryFilter}>
          <option value="">All</option>
          <option value="A">Category A</option>
          <option value="B">Category B</option>
          <option value="C">Category C</option>
          <option value="D">Category D</option>
        </FilterSelect>

        <FilterSelect label="Submitted on" value={yearFilter} onChange={setYearFilter}>
          {[2024, 2025, 2026].map((y) => <option key={y} value={String(y)}>{y}</option>)}
        </FilterSelect>

        <button
          onClick={() => setSubmittedByMe((v) => !v)}
          className={cn(
            'h-9 px-3 rounded-md text-[12px] border flex items-center gap-1.5 transition',
            submittedByMe
              ? 'bg-action-orange-soft text-action-orange-deep border-action-orange/40'
              : 'bg-white text-neutral-700 border-neutral-200 hover:bg-neutral-50',
          )}
        >
          <span className="text-[10px] font-sans uppercase tracking-wider opacity-70">
            {user.userType === 'internal' ? 'Assigned to' : 'Submitted by'}
          </span>
          <strong>{submittedByMe ? 'Me' : 'Anyone'}</strong>
        </button>

        <FilterSelect label="Status" value={statusFilter} onChange={setStatusFilter}>
          <option value="">All</option>
          {svc.states.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
        </FilterSelect>

        <button className="h-9 px-3 rounded-md text-[12px] border bg-white text-neutral-700 border-neutral-200 hover:bg-neutral-50 flex items-center gap-1.5">
          <FilterIcon /> More filters
        </button>
      </div>

      {/* ============== Table ============== */}
      <div className="card overflow-hidden">
        <table className="w-full">
          <thead className="bg-neutral-50 text-[10.5px] uppercase tracking-wider text-neutral-500 border-b border-neutral-100">
            <tr>
              <th className="text-left px-5 py-2.5 w-12">#</th>
              <th className="text-left px-5 py-2.5">{svc.module === 'noc' ? 'Premises Name' : 'Company Name'}</th>
              <th className="text-left px-5 py-2.5">{svc.module === 'noc' ? 'Building No.' : 'Commercial Permit'}</th>
              <th className="text-left px-5 py-2.5">{svc.module === 'noc' ? 'NOC Type · City' : 'Registration Category'}</th>
              <th className="text-left px-5 py-2.5">SLA · Due</th>
              <th className="text-left px-5 py-2.5">Submitted By</th>
              <th className="text-left px-5 py-2.5">Submitted On</th>
              <th className="text-left px-5 py-2.5">Status</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((app, i) => {
              const state = getState(svc, app.state);
              const isMine =
                user.userType === 'external'
                  ? app.applicantUserId === user.id
                  : state?.ownerRole === user.role;
              return (
                <Row
                  key={app.id}
                  index={i + 1}
                  app={app}
                  state={state}
                  isMine={isMine}
                  currentUserId={user.id}
                  onClick={() => navigate(`/app/${app.id}`)}
                />
              );
            })}
            {visible.length === 0 && (
              <tr>
                <td colSpan={8} className="px-5 py-16 text-center">
                  <div className="text-[24px]">🔍</div>
                  <div className="text-[13px] font-semibold text-neutral-700 mt-2">No applications match these filters</div>
                  <div className="text-[12px] text-neutral-500 mt-1">Try clearing filters or change the cycle year.</div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
        {visible.length > 0 && (
          <div className="bg-neutral-25 border-t border-neutral-100 px-5 py-2 flex items-center justify-between text-[11.5px] text-neutral-500">
            <span>Showing {visible.length} of {allForSvc.length}</span>
            <div className="flex items-center gap-1">
              <button className="px-2 py-1 rounded hover:bg-neutral-100 disabled:opacity-40" disabled>←</button>
              <span className="px-2 font-mono">1</span>
              <button className="px-2 py-1 rounded hover:bg-neutral-100 disabled:opacity-40" disabled>→</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================ Pieces

function KpiCard({
  label, value, subline, icon, subTint = 'muted', active = false, onClick,
}: {
  label: string; value: number; subline: string; icon: React.ReactNode; subTint?: 'success' | 'warn' | 'muted'; active?: boolean; onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'card px-3.5 py-2.5 text-left transition focus:outline-none w-full',
        active
          ? 'ring-2 ring-action-orange border-action-orange bg-action-orange-soft/30'
          : 'hover:border-neutral-200 hover:shadow-doe-md',
      )}
    >
      <div className="flex items-center justify-between mb-0.5">
        <div className={cn('text-[9.5px] font-sans uppercase tracking-[0.14em]', active ? 'text-action-orange-deep' : 'text-neutral-500')}>{label}</div>
        <div className={cn('w-5 h-5 rounded-md grid place-items-center', active ? 'bg-action-orange text-white' : 'bg-neutral-100 text-neutral-500')}>{icon}</div>
      </div>
      <div className="font-display text-[22px] font-bold text-ink-950 leading-none mt-1.5">{value}</div>
      <div className={cn(
        'text-[10.5px] mt-1.5 flex items-center gap-1.5 leading-tight',
        subTint === 'success' && 'text-success-500',
        subTint === 'warn' && 'text-action-orange-deep',
        subTint === 'muted' && 'text-neutral-500',
      )}>
        {subTint === 'success' && (
          <span className="inline-flex items-center px-1.5 h-4 rounded-full bg-success-soft text-success-500 text-[9px] font-semibold uppercase tracking-wider leading-none">+3</span>
        )}
        {subTint !== 'success' && subline.includes('nearing SLA') && (
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-action-orange" />
        )}
        <span className="truncate">{subline}</span>
      </div>
    </button>
  );
}

function FilterSelect({ label, value, onChange, children }: { label: string; value: string; onChange: (v: string) => void; children: React.ReactNode }) {
  return (
    <div className="h-9 bg-white border border-neutral-200 hover:bg-neutral-50 rounded-md flex items-center pl-3 pr-1.5 gap-2 text-[12px]">
      <span className="text-[10px] font-sans uppercase tracking-wider text-neutral-400">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="appearance-none bg-transparent border-0 outline-none cursor-pointer pr-5 text-ink-950 font-semibold"
        style={{ backgroundImage: 'url("data:image/svg+xml;utf8,<svg xmlns=\'http://www.w3.org/2000/svg\' width=\'12\' height=\'12\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'%236B7280\' stroke-width=\'2\'><polyline points=\'6 9 12 15 18 9\'/></svg>")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right center' }}
      >
        {children}
      </select>
    </div>
  );
}

function Row({ index, app, state, isMine, currentUserId, onClick }: {
  index: number; app: Application; state?: StateDef; isMine: boolean; currentUserId: string; onClick: () => void;
}) {
  const svc = app.serviceId;
  const isRenewal = svc.endsWith('.renew');
  const isModify = svc.endsWith('.modify');
  const isCancel = svc.endsWith('.cancel');
  const submitter = app.timeline.find((t) => t.byUserRole === 'applicant') ?? app.timeline[0];
  const submittedByCurrent = submitter?.byUserId === currentUserId || app.applicantUserId === currentUserId;

  // Badge precedence: MINE > action type
  const badge = submittedByCurrent
    ? { label: 'MINE', cls: 'bg-action-orange-soft text-action-orange-deep' }
    : isRenewal ? { label: 'RENEWAL', cls: 'bg-info-soft text-info-500' }
    : isModify  ? { label: 'MODIFY',  cls: 'bg-action-orange-soft text-action-orange-deep' }
    : isCancel  ? { label: 'CANCEL',  cls: 'bg-danger-soft text-danger-500' }
    : { label: 'NEW', cls: 'bg-success-soft text-success-500' };

  return (
    <tr
      onClick={onClick}
      className={cn(
        'border-t border-neutral-100 hover:bg-neutral-25 cursor-pointer relative',
        isMine && 'bg-action-orange-soft/20',
      )}
      style={isMine ? { boxShadow: 'inset 3px 0 0 #E89B4C' } : undefined}
    >
      <td className="px-5 py-3 font-mono text-[11.5px] text-neutral-500">{String(index).padStart(2, '0')}</td>
      <td className="px-5 py-3">
        <div className="flex items-center gap-2">
          <span className="text-[13px] font-semibold text-ink-950">
            {app.module === 'noc' ? (app.fieldValues?.premisesName || app.company.name) : app.company.name}
          </span>
          <span className={cn(
            'inline-flex items-center gap-0.5 px-1.5 py-0 h-4 rounded-full text-[9px] font-semibold uppercase tracking-wider leading-none',
            badge.cls,
          )}>
            {badge.label === 'MINE' && <span className="inline-block w-1 h-1 rounded-full bg-action-orange-deep" />}
            {badge.label}
          </span>
        </div>
        <div className="font-mono text-[11px] text-doe-red mt-0.5">{app.applicationNumber}</div>
        {app.module === 'noc' && (
          <div className="text-[10.5px] text-neutral-500 mt-0.5 truncate max-w-[280px]">
            Operator: {app.company.name}
          </div>
        )}
      </td>
      <td className="px-5 py-3 font-mono text-[12px] text-neutral-700">
        {app.module === 'noc' ? (app.fieldValues?.buildingNo || '—') : app.company.tradePermitNumber}
      </td>
      <td className="px-5 py-3">
        {app.module === 'noc' ? (
          <>
            <div className="text-[12.5px] text-ink-950">{app.fieldValues?.nocType || '—'}</div>
            <div className="text-[11px] text-neutral-500 line-clamp-1 max-w-[260px]">
              {[app.fieldValues?.premisesType, app.fieldValues?.city].filter(Boolean).join(' · ')}
            </div>
          </>
        ) : (
          <>
            <div className="text-[12.5px] text-ink-950">{registrationCategoryLabel(app.category)}</div>
            <div className="text-[11px] text-neutral-500 line-clamp-1 max-w-[260px]">
              {registrationCategorySubline(app.category)}
            </div>
          </>
        )}
      </td>
      <td className="px-5 py-3"><SlaCell app={app} state={state} /></td>
      <td className="px-5 py-3">
        <SubmitterCell submitter={submitter} isCurrentUser={submittedByCurrent} />
      </td>
      <td className="px-5 py-3">
        <div className="text-[12.5px] text-ink-950">{formatDate(app.submittedOn ?? app.createdAt)}</div>
        <div className="text-[10.5px] text-neutral-500">{relativeTime(app.submittedOn ?? app.createdAt)}</div>
      </td>
      <td className="px-5 py-3">{state && <StatusBadge state={state} />}</td>
    </tr>
  );
}

function SubmitterCell({ submitter, isCurrentUser }: { submitter?: Application['timeline'][number]; isCurrentUser: boolean }) {
  const name = submitter?.byUserName ?? 'Unknown';
  const initials = name.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase();
  return (
    <div className="flex items-center gap-2">
      <div className={cn(
        'w-7 h-7 rounded-full grid place-items-center font-bold text-[10px]',
        isCurrentUser ? 'bg-action-orange-soft text-action-orange-deep' : 'bg-info-soft text-info-500',
      )}>
        {initials}
      </div>
      <div className="text-[12.5px] text-ink-950 max-w-[140px] leading-tight">{name}</div>
    </div>
  );
}

function SlaCell({ app, state }: { app: Application; state?: StateDef }) {
  if (!state) return <span className="text-neutral-400">—</span>;
  if (state.category === 'returned') {
    return <span className="chip bg-warning-soft text-warning-500 text-[10.5px] px-2.5 py-1">Paused</span>;
  }
  if (state.category === 'approved' || state.category === 'issued' || state.category === 'cancelled' || state.category === 'rejected') {
    return <span className="text-neutral-400">—</span>;
  }
  if (!app.slaDueDate) return <span className="text-neutral-400">—</span>;

  const totalDays = 22; // engineer (15d) + section head (5d) + director (2d)
  const remaining = Math.round((new Date(app.slaDueDate).getTime() - Date.now()) / (24 * 3600 * 1000));
  const used = Math.max(0, totalDays - remaining);
  const pct = Math.min(100, Math.max(4, (used / totalDays) * 100));
  const tint = remaining < 0 ? 'danger' : remaining < 5 ? 'warn' : 'ok';
  const barClass = tint === 'danger' ? 'bg-danger-500' : tint === 'warn' ? 'bg-action-orange' : 'bg-success-500';
  const chipBg = tint === 'danger' ? 'bg-danger-soft text-danger-500' : tint === 'warn' ? 'bg-action-orange-soft text-action-orange-deep' : 'bg-success-soft text-success-500';

  return (
    <div className="flex items-center gap-2.5">
      <div className="w-[68px] h-1.5 rounded-full bg-neutral-100 overflow-hidden shrink-0">
        <div className={cn('h-full rounded-full transition-all', barClass)} style={{ width: `${pct}%` }} />
      </div>
      <span className={cn('inline-flex items-center justify-center min-w-[28px] h-5 rounded-md text-[10.5px] font-semibold px-1.5', chipBg)}>
        {remaining < 0 ? `+${Math.abs(remaining)}d` : `${remaining}d`}
      </span>
    </div>
  );
}

function registrationCategorySubline(cat?: string) {
  switch (cat) {
    case 'A': return 'Gas in building installation, maintenance and operations including filling and decanting operations';
    case 'B': return 'Gas in building installation, maintenance and operations including filling operations';
    case 'C': return 'Gas in building installation and maintenance';
    case 'D': return 'New Establishments — Gas in building installation and maintenance (cylinder systems only)';
    default:  return 'Gas in building installation, maintenance & operations';
  }
}

function capitalize(s: string) { return s.charAt(0).toUpperCase() + s.slice(1); }

function moduleTitle(m: Module): string {
  switch (m) {
    case 'gas': return 'Gas System Company Registration';
    case 'hoe': return 'House Of Expertise Registration';
    case 'noc': return 'No Objection Certificate (NOC)';
    case 'pps': return 'Petroleum Products Submissions';
    case 'amc': return 'Annual Maintenance Contract (Gas Systems)';
    case 'coc': return 'Certificate of Completion (Gas Systems)';
    case 'maes': return 'Material & Equipment Approval (MAES)';
  }
}
function moduleNav(m: Module): string {
  switch (m) {
    case 'gas': return 'Gas Services';
    case 'hoe': return 'House of Expertise';
    case 'noc': return 'NOC';
    case 'pps': return 'Petroleum Products';
    case 'amc': return 'AMC';
    case 'coc': return 'COC';
    case 'maes': return 'MAES';
  }
}
function modulePrefix(m: Module): string {
  switch (m) {
    case 'gas': return 'GSO';
    case 'hoe': return 'HOE';
    case 'noc': return 'NOC';
    case 'pps': return 'PPS';
    case 'amc': return 'AMC';
    case 'coc': return 'COC';
    case 'maes': return 'MAES';
  }
}

function registrationCategoryLabel(cat?: string) {
  switch (cat) {
    case 'A': return 'Category A — Installation, maintenance & operations (filling + decanting)';
    case 'B': return 'Category B — Installation, maintenance & operations (filling)';
    case 'C': return 'Category C — Installation & maintenance';
    case 'D': return 'Category D — New Establishments (cylinder systems only)';
    default:  return '—';
  }
}

function relativeTime(iso: string) {
  const diffMs = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diffMs / (24 * 3600 * 1000));
  if (days < 1) return 'today';
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days/7)}w ago`;
  return `${Math.floor(days/30)}mo ago`;
}

// ============================================================ Icons

function DownloadIcon() {
  return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>;
}
function PlusIcon() {
  return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>;
}
function FileIcon() {
  return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>;
}
function CheckIcon() {
  return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>;
}
function ClockIcon() {
  return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>;
}
function ReturnIcon() {
  return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 14 4 9 9 4"/><path d="M20 20v-7a4 4 0 0 0-4-4H4"/></svg>;
}
function WalletIcon() {
  return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="6" width="20" height="14" rx="2"/><path d="M16 12h4"/><path d="M2 10h20"/></svg>;
}
function SearchIcon() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>;
}
function FilterIcon() {
  return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>;
}
