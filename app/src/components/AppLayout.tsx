import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../store/auth';
import { useApps } from '../store/apps';
import { cn, ppsLandingPath, AHMED_ID, OMAR_ID } from '../lib/utils';
import { listServices, listServicesByModule } from '../services/registry';
import { roleLabel } from '../engine/workflow';
import { useState, useRef, useEffect, useMemo } from 'react';
import { SEED_USERS, LOGIN_VISIBLE_USER_IDS } from '../store/seed';
import { useLocale } from '../store/locale';

export function AppLayout() {
  const user = useAuth((s) => s.user);
  const logout = useAuth((s) => s.logout);
  const switchTo = useAuth((s) => s.switchTo);
  const notifs = useApps((s) => s.notifs);
  const apps = useApps((s) => s.apps);
  const [appGridOpen, setAppGridOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [switcherOpen, setSwitcherOpen] = useState(false);
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const menuRef = useRef<HTMLDivElement | null>(null);

  // Close menus on outside click
  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (!menuRef.current?.contains(e.target as Node)) setOpenMenu(null);
    }
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  if (!user) return null;
  const myNotifs = notifs.filter((n) => n.toUserId === user.role || n.toUserId === user.id);

  return (
    <div className="min-h-screen flex flex-col bg-neutral-25">
      {/* ============== TOP BRAND BAR (light) ============== */}
      <header className="bg-white border-b border-neutral-100 sticky top-0 z-50">
        <div className="h-16 px-5 flex items-center gap-4">
          {/* App grid */}
          <button
            onClick={() => setAppGridOpen((v) => !v)}
            className={cn(
              'w-9 h-9 rounded-md grid place-items-center text-neutral-700 hover:bg-neutral-100',
              appGridOpen && 'bg-action-orange-soft text-ink-950',
            )}
            aria-label="Open services menu"
            title="Services menu"
          >
            <AppGridIcon />
          </button>

          {/* DoE logo */}
          <button onClick={() => navigate(ppsLandingPath(user.id))} className="flex items-center" aria-label="Home">
            <img src="/doe-logo.png" alt="Department of Energy — Abu Dhabi" className="h-12 w-auto" />
          </button>

          <div className="flex-1" />

          {/* Reset Demo */}
          <button
            onClick={() => {
              if (confirm('Reset all demo data? This will clear users, applications, and notifications and reseed.')) {
                Object.keys(localStorage)
                  .filter((k) => k.startsWith('doe.pps.'))
                  .forEach((k) => localStorage.removeItem(k));
                window.location.href = '/login';
              }
            }}
            className="px-2.5 py-1.5 rounded border border-neutral-200 text-[11.5px] font-semibold text-neutral-700 hover:bg-neutral-50 flex items-center gap-1.5"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>
            Reset Demo
          </button>

          {/* Lang toggle */}
          <LangToggle />

          {/* Notification bell */}
          <button
            onClick={() => navigate('/notifications')}
            className="relative w-9 h-9 rounded-md grid place-items-center text-neutral-700 hover:bg-neutral-100"
            aria-label="Notifications"
          >
            <BellIcon />
            {myNotifs.length > 0 && <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-doe-red" />}
          </button>

          {/* Help */}
          <button className="w-9 h-9 rounded-md grid place-items-center text-neutral-700 hover:bg-neutral-100" aria-label="Help">
            <HelpIcon />
          </button>

          {/* User chip */}
          <div className="relative">
            <button
              onClick={() => setProfileOpen((v) => !v)}
              className="flex items-center gap-2.5 pl-1 pr-3 py-1 rounded-md border border-neutral-200 hover:bg-neutral-50"
            >
              <div className="w-7 h-7 rounded-full bg-info-soft text-info-500 grid place-items-center font-bold text-[10px]">
                {user.initials ?? user.name.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase()}
              </div>
              <div className="text-left leading-tight">
                <div className="text-[12.5px] font-semibold text-ink-950">{user.name}</div>
                <div className="text-[10px] text-neutral-500">
                  {user.userType === 'external' ? 'TSME' : user.modules.map((m) => m.toUpperCase()).join('·')}
                  &nbsp;·&nbsp;{roleLabel(user.role).replace('PPS ', '')}
                </div>
              </div>
            </button>
            {profileOpen && (
              <div className="absolute right-0 top-full mt-2 w-[260px] bg-white border border-neutral-100 rounded-xl shadow-doe-lg p-2 z-50">
                <div className="p-3">
                  <div className="text-[13px] font-semibold text-ink-950">{user.name}</div>
                  <div className="text-[11.5px] text-neutral-500">{user.email}</div>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {user.modules.map((m) => (
                      <span key={m} className="chip bg-neutral-100 text-neutral-700">{m.toUpperCase()}</span>
                    ))}
                  </div>
                </div>
                <button
                  onClick={() => { setProfileOpen(false); setSwitcherOpen(true); }}
                  className="w-full text-left p-2.5 rounded-md hover:bg-neutral-50 text-[12.5px]"
                >
                  Switch demo user…
                </button>
                <button
                  onClick={() => { logout(); navigate('/login'); }}
                  className="w-full text-left p-2.5 rounded-md hover:bg-danger-soft text-danger-500 text-[12.5px] font-semibold"
                >
                  Sign out
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* ============== DARK MODULE NAV ============== */}
      <nav className="bg-[#1E2128] text-white/85 sticky top-16 z-40" ref={menuRef}>
        <div className="px-5 flex items-center gap-1 h-12 relative">
          {user.id === AHMED_ID ? (
            // Ahmed Al Mazrouei: single static nav item (no dropdown / popover /
            // nested items) that navigates straight to the submissions landing.
            <NavLink
              to="/pps/submissions"
              className={({ isActive }) => cn(
                'h-12 px-4 flex items-center text-[13px] font-semibold transition border-b-2',
                isActive
                  ? 'border-action-orange text-white bg-white/5'
                  : 'border-transparent text-white/85 hover:text-white hover:bg-white/5',
              )}
            >
              Petroleum Products Submissions
            </NavLink>
          ) : user.id === OMAR_ID ? (
            <>
              {[
                { to: '/pps/dashboard', label: 'PPS Dashboard' },
                { to: '/pps/submissions', label: 'Submissions' },
                { to: '/pps/monitoring', label: 'Submission Monitoring' },
              ].map((it) => (
                <NavLink
                  key={it.to}
                  to={it.to}
                  end={it.to === '/pps/dashboard'}
                  className={({ isActive }) => cn(
                    'h-12 px-4 flex items-center text-[13px] font-semibold transition border-b-2',
                    isActive
                      ? 'border-action-orange text-white bg-white/5'
                      : 'border-transparent text-white/85 hover:text-white hover:bg-white/5',
                  )}
                >
                  {it.label}
                </NavLink>
              ))}
          
              {/* Admin Modules — reuse the generic dropdown machinery for this one group */}
              {(() => {
                const adminGroup = MODULE_GROUPS.find((g) => g.id === 'admin-modules')!;
                return (
                  <div className="relative">
                    <ModuleNavItem
                      group={adminGroup}
                      open={openMenu === adminGroup.id}
                      onToggle={() => setOpenMenu(openMenu === adminGroup.id ? null : adminGroup.id)}
                      onClose={() => setOpenMenu(null)}
                      userModules={user.modules}
                    />
                    {openMenu === adminGroup.id && (
                      <div className="absolute top-full left-0 z-40">
                        <CompactDropdown groupId={adminGroup.id} onClose={() => setOpenMenu(null)} userModules={user.modules} />
                      </div>
                    )}
                  </div>
                );
              })()}
            </>
          ) : (
            MODULE_GROUPS.map((g) => (
              <div key={g.id} className="relative">
                <ModuleNavItem
                  group={g}
                  open={openMenu === g.id}
                  onToggle={() => setOpenMenu(openMenu === g.id ? null : g.id)}
                  onClose={() => setOpenMenu(null)}
                  userModules={user.modules}
                />
                {openMenu === g.id && (
                  <div className="absolute top-full left-0 z-40">
                    <CompactDropdown groupId={openMenu} onClose={() => setOpenMenu(null)} userModules={user.modules} />
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </nav>

      {/* ============== APP GRID drawer ============== */}
      {appGridOpen && (
        <div
          className="fixed inset-0 z-[60] bg-ink-950/30"
          onClick={() => setAppGridOpen(false)}
        >
          <div className="absolute left-0 top-0 h-full w-[360px] bg-white border-r border-neutral-100 shadow-doe-xl p-5" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <div className="text-[11px] font-sans uppercase tracking-wider text-neutral-500">DoE Services</div>
              <button onClick={() => setAppGridOpen(false)} className="text-neutral-500 hover:text-ink-950">✕</button>
            </div>
            <div className="space-y-1">
              {listServices().map((svc) => (
                <NavLink
                  key={svc.id}
                  to={`/module/${svc.module}/${svc.action}`}
                  onClick={() => setAppGridOpen(false)}
                  className="flex items-center gap-3 p-2.5 rounded-md hover:bg-neutral-50"
                >
                  <div className="w-9 h-9 rounded-md bg-action-orange-soft text-action-orange-deep grid place-items-center font-mono font-bold text-[10px]">
                    {svc.action.toUpperCase().slice(0, 3)}
                  </div>
                  <div>
                    <div className="text-[13px] font-semibold text-ink-950">{svc.shortTitle}</div>
                    <div className="text-[11px] text-neutral-500">{svc.module.toUpperCase()} · {svc.action}</div>
                  </div>
                </NavLink>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ============== Switcher modal ============== */}
      {switcherOpen && (
        <SwitcherModal
          currentUserId={user.id}
          onPick={(uid) => { switchTo(uid); setSwitcherOpen(false); navigate(ppsLandingPath(uid)); }}
          onClose={() => setSwitcherOpen(false)}
        />
      )}

      <main className="flex-1">
        <Outlet />
      </main>

      <footer className="bg-white border-t border-neutral-100">
        <div className="max-w-[1400px] mx-auto px-6 py-2.5 text-[10.5px] font-sans tracking-wider uppercase text-neutral-400 flex justify-between">
          <span>DoE PPS · Unified Service Portal · v0.1 prototype</span>
          <span>{apps.length} apps · password is "manage"</span>
        </div>
      </footer>
    </div>
  );
}

// ============================================================ Module nav

interface ModuleGroup {
  id: string;
  label: string;
  hasMenu: boolean;
  href?: string;  // when set on a hasMenu:false group, the nav item navigates directly
  modules?: ('gas' | 'hoe' | 'noc' | 'amc' | 'coc' | 'maes')[]; // which workflow modules show under this group
  staticItems?: { label: string; description: string; href?: string; tag?: string; sectionStart?: string }[];
}

// Top-level nav order, left → right.
// 1. PPS Dashboard — single click into the centralized landing
// 2. Petroleum Products — submissions, monitoring, PPS data dashboard
// 3. Gas Services — accordion with all six gas-domain modules:
//      Gas Registration · HoE · NOC · AMC · COC · MAES
// 4. Building 360 — direct link
// 5. Gas Register — Master Data + Gas Flow accordion
const MODULE_GROUPS: ModuleGroup[] = [
  {
    id: 'pps-dashboard',
    label: 'PPS Dashboard',
    hasMenu: false,
    href: '/pps-dashboard',
  },
  {
    id: 'petroleum',
    label: 'Petroleum Products',
    hasMenu: true,
    staticItems: [
      { label: 'PPS Dashboard',           description: 'Sector-wide supply, demand, infrastructure & KPIs across 12 fuels.',            tag: 'REGULATOR · DOE',       href: '/pps/dashboard' },
      { label: 'Submissions',             description: 'Entity submission queue; DoE review queue for reviewers/approvers.',           tag: 'ENTITY + REGULATOR',    href: '/pps/submissions' },
      { label: 'Submission monitoring',   description: 'Product × Entity grid · delay report · entity compliance summary.',            tag: 'REGULATOR · INTERNAL',  href: '/pps/monitoring' },
      { label: 'LPG · 2024 submission',   description: 'Approved & published submission with workflow timeline + audit trail.',        tag: 'READ-ONLY',             href: '/pps/submissions/sub-lpg-2024' },
      { label: 'LPG · 2025 draft form',   description: 'Editable Bulk + Cylinder split, 12 year-cols, validation & variance flags.',   tag: 'ENTITY · FORM',         href: '/pps/submissions/sub-lpg-2025-draft/edit' },
    ],
  },
  {
    id: 'gas',
    label: 'Gas Services',
    hasMenu: true,
    modules: ['gas', 'hoe', 'noc', 'amc', 'coc', 'maes'],
  },
  {
    id: 'buildings',
    label: 'Building 360',
    hasMenu: false,
    href: '/buildings',
  },
  {
    id: 'gas-register',
    label: 'Gas Register',
    hasMenu: true,
    // Items live inside GasRegisterDropdown so the accordion can group Master
    // Data and Gas Flow the same way Gas Services groups its modules.
  },
  {
    id: 'compliance',
    label: 'Compliance & Enforcement',
    hasMenu: true,
    staticItems: [
      { label: 'Dashboard',            description: 'Live KPIs, score-distribution histogram, Critical-violation heat-map and top repeat offenders.', tag: 'OVERVIEW',          href: '/compliance/dashboard' },
      { label: 'Violations Register',  description: 'Single canonical register fed by Mobile Inspection, TPI, Sampling Fails, Incidents (SDD §4).',     tag: 'INTERNAL · DOE',    href: '/compliance/violations' },
      { label: 'VAP Committee',        description: 'Schedule meetings, prepare agendas, record in-meeting votes & generate bilingual minutes (SDD §5.3).', tag: 'COMMITTEE',     href: '/compliance/vap' },
    ],
  },
  {
    id: 'mobile-inspection',
    label: 'Mobile Inspection',
    hasMenu: true,
    staticItems: [
      { label: 'Open Mobile Simulator',  description: 'Device-frame simulator (iPhone / iPad) for the DoE PPS field-inspection app (Doc 2 SDD).', tag: 'FIELD · INSPECTOR',  href: '/mobile' },
      { label: 'Inspection Submissions', description: 'Web review queue — co-sign Critical findings, return for clarification, approve, escalate to VAP.', tag: 'WEB · REVIEW',       href: '/inspections' },
    ],
  },
  // Add this object into the MODULE_GROUPS array, e.g. after the 'mobile-inspection' group
{
  id: 'admin-modules',
  label: 'Admin Modules',
  hasMenu: true,
  staticItems: [
    { label: 'Master Data',            description: 'Central reference data shared across all services and modules.',        tag: 'ADMIN', href: '/admin/master-data' },
    { label: 'Configuration',          description: 'System-wide settings, toggles, and environment configuration.',          tag: 'ADMIN', href: '/admin/configuration' },
    { label: 'Template Management',    description: 'Build & version submission templates — drag-and-drop section/field editor.', tag: 'ADMIN', href: '/admin/template-management' },
    { label: 'Formula Configuration',  description: 'Define and manage calculation formulas used across compliance & PPS.',    tag: 'ADMIN', href: '/admin/formula-configuration' },
  ],
},
];

function ModuleNavItem({
  group, open, onToggle, userModules,
}: {
  group: ModuleGroup; open: boolean; onToggle: () => void; onClose: () => void; userModules: string[];
}) {
  const location = useLocation();
  const navigate = useNavigate();
  let isActive = false;
  // Gas Services is active on any of the 6 module routes or any open application
  if (group.id === 'gas') {
    isActive =
      location.pathname.startsWith('/module/gas')  ||
      location.pathname.startsWith('/module/hoe')  ||
      location.pathname.startsWith('/module/noc')  ||
      location.pathname.startsWith('/module/amc')  ||
      location.pathname.startsWith('/module/coc')  ||
      location.pathname.startsWith('/module/maes') ||
      location.pathname.startsWith('/app/');
  }
  if (group.id === 'petroleum' && (location.pathname.startsWith('/petroleum') || location.pathname.startsWith('/pps/'))) isActive = true;
  if (group.id === 'buildings' && location.pathname.startsWith('/buildings')) isActive = true;
  if (group.id === 'pps-dashboard' && location.pathname.startsWith('/pps-dashboard')) isActive = true;
  if (group.id === 'gas-register' && location.pathname.startsWith('/gas-register')) isActive = true;
  if (group.id === 'compliance' && location.pathname.startsWith('/compliance')) isActive = true;
  if (group.id === 'mobile-inspection' && (location.pathname.startsWith('/inspections') || location.pathname.startsWith('/mobile'))) isActive = true;
  if (group.id === 'admin-modules' && location.pathname.startsWith('/admin')) isActive = true;

  return (
    <button
      onClick={() => {
        if (group.hasMenu) onToggle();
        else if (group.href) navigate(group.href);
      }}
      className={cn(
        'h-12 px-4 flex items-center gap-1.5 text-[13px] font-semibold transition border-b-2',
        isActive || open
          ? 'border-action-orange text-white bg-white/5'
          : 'border-transparent text-white/85 hover:text-white hover:bg-white/5',
      )}
    >
      {group.label}
      {group.hasMenu && (
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className={cn('transition-transform', open && 'rotate-180')}>
          <polyline points="6 9 12 15 18 9" />
        </svg>
      )}
    </button>
  );
}

function CompactDropdown({ groupId, onClose, userModules }: { groupId: string; onClose: () => void; userModules: string[] }) {
  const group = MODULE_GROUPS.find((g) => g.id === groupId)!;
  const location = useLocation();

  if (group.id === 'gas') {
    return <GasDropdown onClose={onClose} userModules={userModules} currentPath={location.pathname} />;
  }

  if (group.id === 'gas-register') {
    return <GasRegisterDropdown onClose={onClose} currentPath={location.pathname} />;
  }

  return (
    <div className="w-[460px] bg-white border border-neutral-100 rounded-xl shadow-doe-lg p-2 mt-1">
      <div className="px-3 py-2 text-[9.5px] font-sans uppercase tracking-[0.22em] text-neutral-500">
        {group.label} · prototype
      </div>
      <div className="space-y-0.5">
        {(group.staticItems || []).map((it, i) => {
          const disabled = it.tag === 'PLACEHOLDER';
          const node = (
            <>
              <div className="w-9 h-9 rounded-md bg-info-soft text-info-500 grid place-items-center font-mono font-bold text-[10px] flex-shrink-0">
                {it.label.split(' ').map((w) => w[0]).slice(0, 3).join('').toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[13px] font-semibold text-ink-950">{it.label}</div>
                <div className="text-[11.5px] text-neutral-500 leading-tight mt-0.5 line-clamp-2">{it.description}</div>
                {it.tag && <div className="text-[9.5px] font-sans tracking-[0.06em] text-neutral-400 mt-1 uppercase">{it.tag}</div>}
              </div>
            </>
          );
          const cls = cn(
            'flex items-start gap-3 p-2.5 rounded-md transition',
            disabled ? 'opacity-60 cursor-not-allowed' : 'hover:bg-neutral-50 cursor-pointer',
          );
          // Optional section heading shown above this item
          const heading = it.sectionStart && (
            <div key={`sec-${i}`} className={cn('px-3 text-[9.5px] font-sans uppercase tracking-[0.18em] text-neutral-400',
              i === 0 ? 'pt-1 pb-1' : 'pt-3 pb-1 border-t border-neutral-100 mt-1.5')}>
              {it.sectionStart}
            </div>
          );
          if (it.href && !disabled) {
            return (
              <div key={i}>
                {heading}
                <NavLink to={it.href} onClick={onClose} className={cls}>
                  {node}
                </NavLink>
              </div>
            );
          }
          return (
            <div key={i}>
              {heading}
              <div
                onClick={() => !disabled && onClose()}
                className={cls}
              >
              <div className="w-9 h-9 rounded-md bg-info-soft text-info-500 grid place-items-center font-mono font-bold text-[10px] flex-shrink-0">
                {it.label.split(' ').map((w) => w[0]).slice(0, 3).join('').toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[13px] font-semibold text-ink-950">{it.label}</div>
                <div className="text-[11.5px] text-neutral-500 leading-tight mt-0.5 line-clamp-2">{it.description}</div>
                {it.tag && <div className="text-[9.5px] font-sans tracking-[0.06em] text-neutral-400 mt-1 uppercase">{it.tag}</div>}
              </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function GasDropdown({ onClose, userModules, currentPath }: { onClose: () => void; userModules: string[]; currentPath: string }) {
  // All six gas-domain modules surface under "Gas Services". Each parent row
  // is collapsible to reveal its lifecycle actions (issue / renew / modify /
  // cancel / revoke). Modules where the user has no access are hidden.
  const accessible = (['gas', 'hoe', 'noc', 'amc', 'coc', 'maes'] as const).filter((m) => userModules.includes(m));

  // Auto-expand the module the user is currently inside.
  const currentMatch = (['gas', 'hoe', 'noc', 'amc', 'coc', 'maes'] as const).find((m) => currentPath.startsWith(`/module/${m}`));
  const [expanded, setExpanded] = useState<ServiceModule | null>(
    currentMatch && accessible.includes(currentMatch) ? currentMatch : accessible[0] ?? null,
  );

  return (
    <div className="w-[560px] bg-white border border-neutral-100 rounded-xl shadow-doe-lg p-2 mt-1 max-h-[calc(100vh-160px)] overflow-y-auto">
      <div className="px-3 py-2 text-[9.5px] font-sans uppercase tracking-[0.22em] text-neutral-500">
        Gas Services · prototype
      </div>

      {accessible.map((m) => {
        const meta = MODULE_META[m];
        const isOpen = expanded === m;
        const definedServices = new Set(listServicesByModule(m).map((s) => s.action));

        return (
          <div key={m} className="mb-1 last:mb-0">
            {/* Parent row */}
            <button
              type="button"
              onClick={() => setExpanded(isOpen ? null : m)}
              aria-expanded={isOpen}
              className={cn(
                'w-full flex items-start gap-3 px-3 py-2.5 rounded-lg text-left transition',
                isOpen ? 'bg-neutral-50' : 'hover:bg-neutral-50',
              )}
            >
              <div className={cn('w-9 h-9 rounded-md grid place-items-center font-mono font-bold text-[10px] flex-shrink-0', meta.badgeCls)}>
                {meta.badgeText}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[13px] font-semibold text-ink-950">{meta.title}</div>
                <div className="text-[11.5px] text-neutral-500 leading-tight mt-0.5 line-clamp-2">{meta.description}</div>
              </div>
              <svg
                className={cn('w-3.5 h-3.5 text-neutral-400 transition-transform mt-1', isOpen && 'rotate-180')}
                viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"
              >
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>

            {/* Children */}
            {isOpen && (
              <div className="relative ml-[28px] mt-0.5 mb-1">
                {/* Vertical dashed guide line */}
                <div className="absolute left-0 top-2 bottom-2 border-l border-dashed border-neutral-200" />
                <div className="pl-3 space-y-0.5">
                  {ACTIONS.map((a) => {
                    const path = `/module/${m}/${a.id}`;
                    const active = currentPath === path || currentPath.startsWith(path + '/');
                    const enabled = definedServices.has(a.id);
                    return (
                      <NavLink
                        key={a.id}
                        to={enabled ? path : '#'}
                        onClick={(e) => {
                          if (!enabled) { e.preventDefault(); return; }
                          onClose();
                        }}
                        className={cn(
                          'flex items-start gap-3 p-2 rounded-md transition relative',
                          active ? 'bg-action-orange-soft' :
                          enabled ? 'hover:bg-neutral-50' : 'opacity-50 cursor-not-allowed',
                        )}
                      >
                        <div className={cn('w-8 h-8 rounded-md grid place-items-center font-mono font-bold text-[9.5px] flex-shrink-0', a.badgeCls)}>
                          {a.badge}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-[12.5px] font-semibold text-ink-950">{a.label}</span>
                            {!enabled && (
                              <span className="inline-flex items-center h-4 px-1.5 rounded-full bg-neutral-100 text-neutral-500 text-[9px] font-semibold uppercase tracking-wider">
                                Soon
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-neutral-500 leading-tight mt-0.5 line-clamp-1">{a.description}</div>
                        </div>
                        {active && (
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-action-orange shadow-[0_0_0_3px_rgba(232,155,76,0.22)]" />
                        )}
                      </NavLink>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ============================================================ Gas Register accordion menu
// Mirrors the Gas Services dropdown: expandable parent rows with badge +
// description + chevron, children indented behind a dashed vertical guide.

type GasRegisterGroup = 'master' | 'flow' | 'operations';

// Dashboard is a single direct link at the top of the dropdown — sibling to
// the Master Data / Gas Flow / Operations accordions, not wrapped in its own
// collapsible section.
const GAS_REGISTER_DASHBOARD = {
  id: 'dashboard',
  label: 'Gas Register Dashboard',
  description: 'KPIs · inflow vs outflow · top-10 · compliance heatmap · certificate expiry (BN 17).',
  href: '/gas-register/dashboard',
  badge: 'DA',
  badgeCls: 'bg-action-orange-soft text-action-orange-deep',
} as const;

const GAS_REGISTER_GROUPS: Record<GasRegisterGroup, { title: string; description: string; badgeText: string; badgeCls: string; items: { id: string; label: string; description: string; href: string; badge: string; badgeCls: string }[] }> = {
  master: {
    title: 'Master Data',
    description: 'Core registers of customers, suppliers, assets, fleet, employees, drivers and engineers.',
    badgeText: 'MD',
    badgeCls: 'bg-info-soft text-info-500',
    items: [
      { id: 'customers', label: 'Customer Master', description: '10 SDD categories · EID + Trade-Licence flows · live compliance tracking (BN 1).', href: '/gas-register/customers', badge: 'CU', badgeCls: 'bg-action-orange-soft text-action-orange-deep' },
      { id: 'suppliers', label: 'Supplier Master', description: 'Trade-licenced gas suppliers contracted with permit holders (BN 2).',               href: '/gas-register/suppliers', badge: 'SU', badgeCls: 'bg-success-soft text-success-500' },
      { id: 'assets',    label: 'Asset Master',    description: 'Bulk tanks, cylinder banks, pipeline manifolds & inert-gas bullets on file (BN 3).', href: '/gas-register/assets',    badge: 'AS', badgeCls: 'bg-info-soft text-info-500' },
      { id: 'fleet',     label: 'Fleet Master',    description: 'Tankers, cylinder carriers & transport vehicles, fetched from ASATEEL (BN 4).',     href: '/gas-register/fleet',     badge: 'FL', badgeCls: 'bg-doe-red-soft text-doe-red' },
      { id: 'employees', label: 'Employee Master', description: 'Permit-holder personnel with gas-handling training & credentials (BN 5).',          href: '/gas-register/employees', badge: 'EM', badgeCls: 'bg-lavender text-[#7B3FE4]' },
      { id: 'drivers',   label: 'Drivers Master',  description: 'Drivers from ASATEEL · licence + ADCDA training + linked vehicles (BN 6).',          href: '/gas-register/drivers',   badge: 'DR', badgeCls: 'bg-blue-50 text-blue-700' },
      { id: 'engineers', label: 'Engineers Master', description: 'Engineers from ASATEEL / DOE Eng-Reg · ADQCC + conformity tracking (BN 7).',       href: '/gas-register/engineers', badge: 'EN', badgeCls: 'bg-violet-50 text-violet-700' },
      { id: 'technical', label: 'Technical Master Data', description: 'Type of Gas · Product Type · Unit of Measurement · cert validity windows (BN 8).', href: '/gas-register/technical-master-data', badge: 'TM', badgeCls: 'bg-amber-50 text-amber-700' },
    ],
  },
  flow: {
    title: 'Gas Flow',
    description: 'Monthly inflow & outflow submissions and aggregated gas-flow reports.',
    badgeText: 'GF',
    badgeCls: 'bg-[#CCFBF1] text-[#0F766E]',
    items: [
      { id: 'inflow',  label: 'Monthly Inflow',  description: 'Daily inflow records submitted by Gas System Companies (BN 9).',                 href: '/gas-register/inflow',           badge: 'IN',  badgeCls: 'bg-action-orange-soft text-action-orange-deep' },
      { id: 'outflow', label: 'Monthly Outflow', description: 'Daily outflow records delivered to residential & commercial customers (BN 10).', href: '/gas-register/outflow',          badge: 'OUT', badgeCls: 'bg-doe-red-soft text-doe-red' },
      { id: 'reports', label: 'Reports',         description: 'Gas Flow Summary · Uses by Licensee · Customer/Supply · Inventory (BN 16).',     href: '/gas-register/gas-flow/reports', badge: 'RP',  badgeCls: 'bg-info-soft text-info-500' },
    ],
  },
  operations: {
    title: 'Operations & Compliance',
    description: 'Fleet movement, connection / disconnection log and maintenance records.',
    badgeText: 'OC',
    badgeCls: 'bg-rose-50 text-doe-red',
    items: [
      { id: 'fleet-movement', label: 'Fleet Movement',             description: 'ASATEEL-driven movement log + post-trip submission with gas quantity (BN 11).', href: '/gas-register/fleet-movement', badge: 'FM',  badgeCls: 'bg-teal-50 text-teal-700' },
      { id: 'connection',     label: 'Connection & Disconnection', description: 'Connect / Disconnect / Reconnect / Suspend log per customer (BN 13).',         href: '/gas-register/connection',     badge: 'CXN', badgeCls: 'bg-rose-50 text-doe-red' },
      { id: 'maintenance',    label: 'Maintenance Records',        description: 'System mods · material changes · gas-detector & sensor calibration (BN 15).',  href: '/gas-register/maintenance',    badge: 'MR',  badgeCls: 'bg-indigo-50 text-indigo-700' },
      { id: 'notifications',  label: 'Notifications & Reminders',  description: 'Permit-renewal reminders + DED notification audit log + email template (BN 12).', href: '/gas-register/notifications', badge: 'BN12', badgeCls: 'bg-amber-50 text-amber-700' },
    ],
  },
};

function GasRegisterDropdown({ onClose, currentPath }: { onClose: () => void; currentPath: string }) {
  // Auto-expand the group that contains the current URL — fall back to Master.
  const initialGroup: GasRegisterGroup =
    currentPath.startsWith('/gas-register/gas-flow') ||
    currentPath.startsWith('/gas-register/inflow') ||
    currentPath.startsWith('/gas-register/outflow') ? 'flow' :
    currentPath.startsWith('/gas-register/fleet-movement') ||
    currentPath.startsWith('/gas-register/connection') ||
    currentPath.startsWith('/gas-register/maintenance') ||
    currentPath.startsWith('/gas-register/notifications') ? 'operations' :
    'master';
  const [expanded, setExpanded] = useState<GasRegisterGroup | null>(initialGroup);

  const dashboardActive = currentPath === GAS_REGISTER_DASHBOARD.href || currentPath.startsWith(GAS_REGISTER_DASHBOARD.href + '/');

  return (
    <div className="w-[560px] bg-white border border-neutral-100 rounded-xl shadow-doe-lg p-2 mt-1">
      <div className="px-3 py-2 text-[9.5px] font-sans uppercase tracking-[0.22em] text-neutral-500">
        Gas Register · prototype
      </div>

      {/* ── Dashboard · single direct link (sibling to Master Data + Gas Flow) ── */}
      <NavLink
        to={GAS_REGISTER_DASHBOARD.href}
        onClick={onClose}
        className={cn(
          'flex items-start gap-3 px-3 py-2.5 rounded-lg text-left transition relative',
          dashboardActive ? 'bg-action-orange-soft' : 'hover:bg-neutral-50',
        )}
      >
        <div className={cn('w-9 h-9 rounded-md grid place-items-center font-mono font-bold text-[10px] flex-shrink-0', GAS_REGISTER_DASHBOARD.badgeCls)}>
          {GAS_REGISTER_DASHBOARD.badge}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[13px] font-semibold text-ink-950">{GAS_REGISTER_DASHBOARD.label}</div>
          <div className="text-[11.5px] text-neutral-500 leading-tight mt-0.5 line-clamp-2">{GAS_REGISTER_DASHBOARD.description}</div>
        </div>
        {dashboardActive && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-action-orange shadow-[0_0_0_3px_rgba(232,155,76,0.22)]" />
        )}
      </NavLink>

      {/* Section divider */}
      <div className="my-1 mx-3 border-t border-neutral-100" />

      {/* ── Master Data + Gas Flow + Operations & Compliance · expandable accordions ── */}
      {(['master', 'flow', 'operations'] as GasRegisterGroup[]).map((g) => {
        const meta = GAS_REGISTER_GROUPS[g];
        const isOpen = expanded === g;
        return (
          <div key={g} className="mb-1 last:mb-0">
            <button
              type="button"
              onClick={() => setExpanded(isOpen ? null : g)}
              aria-expanded={isOpen}
              className={cn(
                'w-full flex items-start gap-3 px-3 py-2.5 rounded-lg text-left transition',
                isOpen ? 'bg-neutral-50' : 'hover:bg-neutral-50',
              )}
            >
              <div className={cn('w-9 h-9 rounded-md grid place-items-center font-mono font-bold text-[10px] flex-shrink-0', meta.badgeCls)}>
                {meta.badgeText}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[13px] font-semibold text-ink-950">{meta.title}</div>
                <div className="text-[11.5px] text-neutral-500 leading-tight mt-0.5 line-clamp-2">{meta.description}</div>
              </div>
              <svg
                className={cn('w-3.5 h-3.5 text-neutral-400 transition-transform mt-1', isOpen && 'rotate-180')}
                viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"
              >
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>

            {isOpen && (
              <div className="relative ml-[28px] mt-0.5 mb-1">
                <div className="absolute left-0 top-2 bottom-2 border-l border-dashed border-neutral-200" />
                <div className="pl-3 space-y-0.5">
                  {meta.items.map((it) => {
                    const active = currentPath === it.href || currentPath.startsWith(it.href + '/');
                    return (
                      <NavLink
                        key={it.id}
                        to={it.href}
                        onClick={onClose}
                        className={cn(
                          'flex items-start gap-3 p-2 rounded-md transition relative',
                          active ? 'bg-action-orange-soft' : 'hover:bg-neutral-50',
                        )}
                      >
                        <div className={cn('w-8 h-8 rounded-md grid place-items-center font-mono font-bold text-[9.5px] flex-shrink-0', it.badgeCls)}>
                          {it.badge}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-[12.5px] font-semibold text-ink-950">{it.label}</div>
                          <div className="text-[11px] text-neutral-500 leading-tight mt-0.5 line-clamp-1">{it.description}</div>
                        </div>
                        {active && (
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-action-orange shadow-[0_0_0_3px_rgba(232,155,76,0.22)]" />
                        )}
                      </NavLink>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ============================================================ Gas Services accordion menu

type ServiceModule = 'gas' | 'hoe' | 'noc' | 'amc' | 'coc' | 'maes';
type ServiceAction = 'issue' | 'renew' | 'modify' | 'cancel' | 'revoke';

const MODULE_META: Record<ServiceModule, { title: string; description: string; badgeText: string; badgeCls: string }> = {
  gas:  {
    title: 'Gas System Company Registration',
    description: 'TSME / company-level registrations, renewals, and regulator actions.',
    badgeText: 'GSO',
    badgeCls: 'bg-[#CCFBF1] text-[#0F766E]',
  },
  hoe:  {
    title: 'House of Expertise Registration',
    description: 'Consultancy / expert-house registrations, renewals, and regulator actions.',
    badgeText: 'HOE',
    badgeCls: 'bg-lavender text-[#7B3FE4]',
  },
  noc:  {
    title: 'No Objection Certificate',
    description: 'NOC to operate gas systems at premises · renew, cancel, regulator revoke.',
    badgeText: 'NOC',
    badgeCls: 'bg-teal-50 text-teal-700',
  },
  amc:  {
    title: 'Annual Maintenance Contract',
    description: 'AMC issuance & lifecycle for gas-system maintenance contracts.',
    badgeText: 'AMC',
    badgeCls: 'bg-blue-50 text-blue-700',
  },
  coc:  {
    title: 'Certificate of Completion',
    description: 'Project Certificate of Completion · modification & cancellation flows.',
    badgeText: 'COC',
    badgeCls: 'bg-emerald-50 text-emerald-700',
  },
  maes: {
    title: 'Material & Equipment Approval (MAES)',
    description: 'Per-material approval system · Agent / Manufacturer / Distributor.',
    badgeText: 'MAES',
    badgeCls: 'bg-violet-50 text-violet-700',
  },
};

const ACTIONS: { id: ServiceAction; label: string; description: string; meta: string; badge: string; badgeCls: string }[] = [
  { id: 'issue',  label: 'Issue',  description: 'Issue new gas system company registrations and track SLA.',         meta: 'ENTITY · TSME',     badge: 'ISS', badgeCls: 'bg-[#CCFBF1] text-[#0F766E]' },
  { id: 'renew',  label: 'Renew',  description: 'Renew existing registrations before expiry.',                       meta: 'ENTITY · TSME',     badge: 'RNW', badgeCls: 'bg-mint text-success-500' },
  { id: 'modify', label: 'Modify', description: 'Modify scope, category, or staff on an active registration.',       meta: 'ENTITY · TSME',     badge: 'MOD', badgeCls: 'bg-lavender text-[#7B3FE4]' },
  { id: 'cancel', label: 'Cancel', description: 'Cancel an active registration with reason and attachments.',        meta: 'ENTITY · TSME',     badge: 'CAN', badgeCls: 'bg-peach text-action-orange-deep' },
  { id: 'revoke', label: 'Revoke by DOE', description: 'Regulator-initiated revocations and compliance actions.',    meta: 'REGULATOR · DOE',   badge: 'REV', badgeCls: 'bg-info-soft text-info-500' },
];


// ============================================================ Icons

function AppGridIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><circle cx="5" cy="5" r="1.5"/><circle cx="12" cy="5" r="1.5"/><circle cx="19" cy="5" r="1.5"/><circle cx="5" cy="12" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="19" cy="12" r="1.5"/><circle cx="5" cy="19" r="1.5"/><circle cx="12" cy="19" r="1.5"/><circle cx="19" cy="19" r="1.5"/></svg>
  );
}
function BellIcon() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>;
}
function HelpIcon() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>;
}

// =============================================================================
// Switch demo user — searchable, grouped (internal / external) modal
// =============================================================================
function SwitcherModal({ currentUserId, onPick, onClose }: {
  currentUserId: string;
  onPick: (uid: string) => void;
  onClose: () => void;
}) {
  const [q, setQ] = useState('');
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  const visibleUsers = useMemo(() => SEED_USERS.filter((u) => LOGIN_VISIBLE_USER_IDS.includes(u.id)), []);
  const matches = useMemo(() => {
    const query = q.trim().toLowerCase();
    if (!query) return visibleUsers;
    return visibleUsers.filter((u) => {
      const hay = [
        u.id,
        u.name,
        u.role,
        u.email ?? '',
        ...(u.modules ?? []),
        u.userType,
        u.userType === 'external' && u.company ? u.company.name : '',
      ].join(' ').toLowerCase();
      return query.split(/\s+/).every((tok) => hay.includes(tok));
    });
  }, [q]);

  const internal = matches.filter((u) => u.userType === 'internal');
  const external = matches.filter((u) => u.userType === 'external');

  return (
    <div className="fixed inset-0 z-[100] bg-ink-950/40 grid place-items-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-doe-xl max-w-[520px] w-full overflow-hidden" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="px-5 py-3 border-b border-neutral-100 flex items-center justify-between">
          <div>
            <h3 className="font-display text-[16px] font-bold text-ink-950">Switch demo user</h3>
            <p className="text-[11.5px] text-neutral-500 mt-0.5">{visibleUsers.length} accounts on file · password is <span className="font-mono font-semibold">manage</span></p>
          </div>
          <button onClick={onClose} aria-label="Close" className="w-8 h-8 grid place-items-center rounded-md text-neutral-500 hover:text-ink-950 hover:bg-neutral-50">✕</button>
        </div>

        {/* Search */}
        <div className="px-4 py-2.5 border-b border-neutral-100">
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none">
              <SearchIcon />
            </span>
            <input
              ref={inputRef}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search by name, role, module, ID, or company…"
              className="w-full h-10 pl-9 pr-3 bg-white border border-neutral-200 rounded-md text-[13px] text-ink-950 placeholder-neutral-400 focus:outline-none focus:border-action-orange focus:ring-2 focus:ring-action-orange/15 transition"
            />
          </div>
        </div>

        {/* Results — grouped */}
        <div className="max-h-[440px] overflow-y-auto px-2 py-2">
          {matches.length === 0 ? (
            <div className="p-6 text-center text-[12.5px] text-neutral-500">
              No user matches “<span className="text-ink-950 font-semibold">{q}</span>”.
            </div>
          ) : (
            <>
              {internal.length > 0 && (
                <UserGroup label="Internal staff" count={internal.length}>
                  {internal.map((u) => (
                    <UserOption key={u.id} u={u} current={u.id === currentUserId} onPick={() => onPick(u.id)} />
                  ))}
                </UserGroup>
              )}
              {external.length > 0 && (
                <UserGroup label="External partners" count={external.length}>
                  {external.map((u) => (
                    <UserOption key={u.id} u={u} current={u.id === currentUserId} onPick={() => onPick(u.id)} />
                  ))}
                </UserGroup>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function UserGroup({ label, count, children }: { label: string; count: number; children: React.ReactNode }) {
  return (
    <div className="mb-1.5 last:mb-0">
      <div className="px-2 py-1.5 text-[9.5px] font-sans uppercase tracking-[0.18em] text-neutral-500 flex items-center justify-between">
        <span>{label}</span>
        <span className="font-mono text-neutral-400 normal-case tracking-normal">{count}</span>
      </div>
      <div className="space-y-0.5">{children}</div>
    </div>
  );
}

function UserOption({ u, current, onPick }: { u: typeof SEED_USERS[number]; current: boolean; onPick: () => void }) {
  return (
    <button
      onClick={onPick}
      className={cn(
        'w-full flex items-center gap-3 text-left px-2 py-2 rounded-md transition',
        current ? 'bg-action-orange-soft' : 'hover:bg-neutral-50',
      )}
    >
      {/* Initials avatar — fixed width, role-toned */}
      <div className={cn(
        'w-9 h-9 rounded-md grid place-items-center font-display font-bold text-[13px] shrink-0',
        switcherRoleTone(u.role),
      )}>
        {u.initials ?? switcherInitials(u.name)}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2">
          <span className="text-[13px] font-semibold text-ink-950 truncate">{u.name}</span>
          {current && (
            <span className="text-[9.5px] font-sans uppercase tracking-[0.16em] text-action-orange-deep font-semibold shrink-0">Current</span>
          )}
        </div>
        <div className="flex items-center gap-1.5 mt-0.5 min-w-0">
          <span className="text-[11px] font-mono text-neutral-500 shrink-0">{u.id}</span>
          <span className="text-neutral-300 text-[10px]">·</span>
          <span className="text-[11px] text-neutral-600 capitalize truncate">{roleLabel(u.role)}</span>
          {u.userType === 'external' && u.company && (
            <>
              <span className="text-neutral-300 text-[10px]">·</span>
              <span className="text-[11px] text-neutral-600 truncate">{u.company.name}</span>
            </>
          )}
        </div>
        {(u.modules ?? []).length > 0 && (
          <div className="flex flex-wrap items-center gap-0.5 mt-1">
            {(u.modules ?? []).map((m) => (
              <span key={m} className="inline-flex items-center px-1.5 h-4 rounded bg-neutral-100 text-neutral-700 text-[9px] font-mono font-semibold tracking-wide uppercase">{m}</span>
            ))}
          </div>
        )}
      </div>
    </button>
  );
}

function switcherInitials(name: string): string {
  const cleaned = name.replace(/^(eng\.?|dr\.?|mr\.?|mrs\.?|ms\.?)\s+/i, '').trim();
  const parts = cleaned.split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0]?.toUpperCase() ?? '').join('') || '?';
}

function switcherRoleTone(role: string): string {
  switch (role) {
    case 'engineer':      return 'bg-info-soft text-info-500';
    case 'section_head':  return 'bg-action-orange-soft text-action-orange-deep';
    case 'director':      return 'bg-doe-red-soft text-doe-red';
    case 'pps_reviewer':  return 'bg-lavender text-[#7B3FE4]';
    case 'pps_approver':  return 'bg-doe-red-soft text-doe-red';
    case 'pps_entity':    return 'bg-warning-soft text-warning-500';
    default:              return 'bg-success-soft text-success-500';
  }
}

function SearchIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="7" />
      <path d="m21 21-4.3-4.3" />
    </svg>
  );
}

// =============================================================================
// Language toggle — segmented EN / AR control in the top bar
// =============================================================================
function LangToggle() {
  const locale = useLocale((s) => s.locale);
  const setLocale = useLocale((s) => s.setLocale);
  return (
    <div className="inline-flex p-0.5 rounded border border-neutral-200 bg-white text-[10.5px] font-semibold">
      <button
        type="button"
        onClick={() => setLocale('en')}
        className={cn(
          'px-2 h-6 rounded transition',
          locale === 'en' ? 'bg-ink-950 text-white' : 'text-neutral-500 hover:text-ink-950',
        )}
      >EN</button>
      <button
        type="button"
        onClick={() => setLocale('ar')}
        className={cn(
          'px-2 h-6 rounded transition',
          locale === 'ar' ? 'bg-ink-950 text-white' : 'text-neutral-500 hover:text-ink-950',
        )}
      >عربي</button>
    </div>
  );
}
