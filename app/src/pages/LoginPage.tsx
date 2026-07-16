import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../store/auth';
import { SEED_USERS, LOGIN_VISIBLE_USER_IDS } from '../store/seed';
import type { User } from '../types';
import { CitySkyline } from '../components/CitySkyline';
import { cn, ppsLandingPath } from '../lib/utils';
import { roleLabel } from '../engine/workflow';
import { useT } from '../i18n';
import { useLocale } from '../store/locale';

// ============================================================================
// Login screen — matches DoE Abu Dhabi reference design.
//   • Sepia/khaki upper hero with cityscape silhouette
//   • Cream lower section with stat cards & partner logos
//   • Floating white login card spanning the two zones (right-aligned column)
//   • Dark navy footer band
//   • Real DoE horizontal logo (public/doe-logo.png)
// ============================================================================

const HERO_HEIGHT = 360;

export function LoginPage() {
  const navigate = useNavigate();
  const login = useAuth((s) => s.login);
  const t = useT();
  const toggleLocale = useLocale((s) => s.toggle);
  const [tab, setTab] = useState<'internal' | 'external'>('internal');
  const [userId, setUserId] = useState('');
  const [password, setPassword] = useState('');
  const [keep, setKeep] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [slide, setSlide] = useState(0);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const result = login(userId, password, tab);
    if (!result.ok) { setError(result.error || 'Unable to sign in.'); return; }
    navigate(ppsLandingPath(useAuth.getState().user?.id));
  }

  // Picking a known account from the combobox auto-fills the demo password
  // and clears stale errors. Free-text usernames still work — they just
  // require the operator to type the password themselves.
  function pickDemo(u: User) {
    setUserId(u.id);
    setPassword('manage');
    setError(null);
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: '#F2EBDC' }}>
      {/* ============== Single relative content container ============== */}
      <div className="relative flex-1">
        {/* ----- Sepia hero backdrop (occupies top HERO_HEIGHT px) ----- */}
        <div
          className="absolute inset-x-0 top-0 overflow-hidden"
          style={{
            height: HERO_HEIGHT,
            background: 'linear-gradient(180deg, #A89A82 0%, #9C9286 55%, #8E8A7E 100%)',
          }}
        >
          <CitySkyline className="absolute inset-x-0 bottom-0 w-full h-[80%]" />
          <div className="absolute inset-0 pointer-events-none" style={{ background: 'linear-gradient(180deg, rgba(168,154,130,0) 60%, rgba(168,154,130,0.15) 100%)' }} />
        </div>

        {/* ----- Grid container — header + hero + lower share same column system ----- */}
        <div className="relative max-w-[1340px] mx-auto px-8">
          {/* HEADER (logo left, nav right) */}
          <header className="pt-5 flex items-center justify-between relative z-10">
            <img
              src="/doe-logo.png"
              alt="Department of Energy — Abu Dhabi"
              className="h-14 w-auto"
              style={{ filter: 'drop-shadow(0 1px 2px rgba(31,41,55,0.15))' }}
            />
            <nav className="flex items-center gap-6 text-[11.5px] text-white/95">
              <HeaderLink icon={<InfoIcon />} label={t('login.faq')} />
              <HeaderLink icon={<BookIcon />} label={t('login.guide')} />
              <HeaderLink icon={<BellIcon />} label={t('login.notices')} />
              <HeaderLink icon={<ListIcon />} label={t('login.register')} />
              <button onClick={toggleLocale} className="text-white/95 font-semibold hover:text-white" aria-label="Toggle language">
                {t('lang.toggle')}
              </button>
            </nav>
          </header>

          {/* TWO COLUMN BODY: hero+content on left, login card on right (spans both zones) */}
          <div className="grid grid-cols-12 gap-10 relative z-10">
            {/* ===== LEFT COLUMN ===== */}
            <div className="col-span-7">
              {/* Hero copy */}
              <div style={{ paddingTop: 56, paddingBottom: 100 }}>
                <div className="text-[10.5px] font-sans tracking-[0.24em] uppercase text-doe-red mb-5 flex items-center gap-2">
                  <span className="inline-block w-7 h-px bg-doe-red" />
                  {t('login.eyebrow')}
                </div>
                <h1
                  className="font-display font-bold text-white leading-[1.05]"
                  style={{ fontSize: '40px', letterSpacing: '-0.018em' }}
                >
                  {t('login.titleLine1')}<br />
                  {t('login.titleLine2')}<span className="text-action-orange">.</span>
                </h1>
                <p className="text-white/85 text-[13px] mt-3.5 max-w-[480px]">
                  {t('login.lede')}
                </p>
              </div>

              {/* Lower content — body + slider + insights + partners */}
              <div className="pb-16">
                <p className="text-ink-950/75 text-[12.5px] max-w-[540px] leading-relaxed">
                  {t('login.bodyParagraph')}
                </p>

                {/* Carousel indicator dots */}
                <div className="flex items-center gap-1.5 mt-6">
                  {[0, 1, 2, 3, 4].map((i) => (
                    <button
                      key={i}
                      onClick={() => setSlide(i)}
                      className={cn(
                        'h-1 rounded-full transition-all',
                        slide === i ? 'w-6 bg-ink-950/80' : 'w-3 bg-ink-950/20',
                      )}
                      aria-label={`Slide ${i + 1}`}
                    />
                  ))}
                </div>

                {/* Energy sector insights */}
                <div className="mt-8">
                  <SectionLabel label={t('login.insights')} />
                  <div className="grid grid-cols-3 gap-3 mt-3 max-w-[760px]">
                    <StatCard icon={<GlobeIcon />} value={t('login.stat.energy')}   label={t('login.stat.energyLabel')} />
                    <StatCard icon={<WaterDropIcon />} value={t('login.stat.water')}  label={t('login.stat.waterLabel')} />
                    <StatCard icon={<BoltIcon />} value={t('login.stat.capacity')} label={t('login.stat.capacityLabel')} />
                  </div>
                </div>

                {/* Partners */}
                <div className="mt-8">
                  <SectionLabel label={t('login.partners')} />
                  <div className="flex items-center gap-3 mt-3">
                    <PartnerLogo><AdqMark /></PartnerLogo>
                    <PartnerLogo><TammMark /></PartnerLogo>
                    <PartnerLogo><EnvelopeMark /></PartnerLogo>
                  </div>
                </div>
              </div>
            </div>

            {/* ===== RIGHT COLUMN — login card ===== */}
            <div className="col-span-5">
              <div className="pt-12">
                <div
                  className="bg-white rounded-2xl border border-white max-w-[440px] ml-auto px-7 py-7"
                  style={{ boxShadow: '0 24px 48px rgba(31,41,55,0.14), 0 8px 16px rgba(31,41,55,0.08)' }}
                >
                  {/* SECURE PORTAL · ACTIVE pill — outline style, sits at top */}
                  <div className="flex items-center justify-start mb-5">
                    <span className="inline-flex items-center gap-2 px-3 h-7 rounded-full bg-white border border-neutral-200 text-[10.5px] font-semibold uppercase tracking-[0.16em] text-neutral-700">
                      <span className="inline-block w-2 h-2 rounded-full bg-success-dot" />
                      {t('login.securePortal')}
                    </span>
                  </div>

                  <h2 className="font-display text-[26px] font-bold text-ink-950 leading-tight" style={{ letterSpacing: '-0.01em' }}>
                    {t('login.welcomeBack')}
                  </h2>
                  <p className="text-neutral-500 text-[13px] mt-1 mb-5">{t('login.welcomeSubtitle')}</p>

                  {/* Tabs */}
                  <div className="grid grid-cols-2 gap-2 mb-4">
                    <TabButton active={tab === 'internal'} onClick={() => setTab('internal')}>
                      <ShieldIcon /> {t('login.internalStaff')}
                    </TabButton>
                    <TabButton active={tab === 'external'} onClick={() => setTab('external')}>
                      <UsersIcon /> {t('login.externalPartner')}
                    </TabButton>
                  </div>

                  <form onSubmit={submit} className="space-y-2.5">
                    <UsernameCombobox
                      tab={tab}
                      value={userId}
                      onChange={setUserId}
                      onPick={pickDemo}
                      placeholder={t('login.userNamePlaceholder')}
                    />
                    <InputWithIcon icon={<LockIcon />} placeholder={t('login.passwordPlaceholder')} value={password} onChange={setPassword} type="password" autoComplete="current-password" />

                    <div className="flex items-center justify-between text-[12px] pt-1">
                      <label className="flex items-center gap-2 text-neutral-700 cursor-pointer">
                        <input type="checkbox" checked={keep} onChange={(e) => setKeep(e.target.checked)} className="w-3.5 h-3.5" />
                        {t('login.keepSignedIn')}
                      </label>
                      <a className="text-doe-red font-semibold hover:underline cursor-pointer">{t('login.forgotPassword')}</a>
                    </div>

                    {error && (
                      <div className="bg-danger-soft text-danger-500 border border-danger-500/30 rounded-md p-2.5 text-[12px]">
                        {error}
                      </div>
                    )}

                    <button
                      type="submit"
                      className="w-full mt-1 h-11 rounded-md bg-action-orange hover:bg-action-orange-dark text-white font-semibold text-[13.5px] shadow-doe-sm transition"
                    >
                      {t('common.signIn')}
                    </button>

                    <div className="flex items-center gap-3 py-0.5">
                      <div className="flex-1 h-px bg-neutral-200" />
                      <span className="text-[11px] text-neutral-400">{t('login.or')}</span>
                      <div className="flex-1 h-px bg-neutral-200" />
                    </div>

                    <button
                      type="button"
                      className="w-full h-11 rounded-md bg-ink-950 hover:bg-charcoal-900 text-white font-semibold text-[13.5px] flex items-center justify-center gap-2"
                    >
                      <FingerprintIcon />
                      {t('login.signInWithUaePass')}
                    </button>
                  </form>

                  <div className="text-[10.5px] text-neutral-400 mt-4 text-center">
                    {t('login.itSupport')}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ============== Dark navy footer ============== */}
      <footer style={{ backgroundColor: '#3F5566' }} className="text-white/85">
        <div className="max-w-[1340px] mx-auto px-8 py-3 text-center text-[11.5px]">
          © {new Date().getFullYear()} Department of Energy, Abu Dhabi · UAE Government
        </div>
      </footer>
    </div>
  );
}

// ============================================================ Sub-components

function HeaderLink({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <a className="flex items-center gap-1.5 hover:text-white cursor-pointer">
      <span className="opacity-80">{icon}</span>
      <span>{label}</span>
    </a>
  );
}

function SectionLabel({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2 text-[10.5px] font-sans tracking-[0.24em] uppercase text-ink-950/55">
      <span>{label}</span>
      <span className="flex-1 h-px bg-action-orange/40 max-w-[280px]" />
    </div>
  );
}

function StatCard({ icon, value, label }: { icon: React.ReactNode; value: string; label: string }) {
  return (
    <div className="bg-white/60 border border-neutral-200 rounded-lg px-4 py-3 flex items-center gap-3">
      <div className="w-9 h-9 rounded-md bg-white border border-neutral-100 grid place-items-center text-ink-950/70 flex-shrink-0">
        {icon}
      </div>
      <div className="min-w-0">
        <div className="font-display text-[14px] font-bold text-ink-950 leading-tight">{value}</div>
        <div className="text-[9px] font-sans tracking-[0.16em] uppercase text-ink-950/55 mt-0.5">{label}</div>
      </div>
    </div>
  );
}

function PartnerLogo({ children }: { children: React.ReactNode }) {
  return (
    <div className="w-[88px] h-[42px] bg-white border border-neutral-200 rounded-md grid place-items-center">
      {children}
    </div>
  );
}

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'h-10 rounded-md flex items-center justify-center gap-1.5 text-[12.5px] font-semibold transition',
        active ? 'bg-[#4E89A6] text-white shadow-doe-sm' : 'bg-neutral-100 text-neutral-500 hover:bg-neutral-200',
      )}
    >
      {children}
    </button>
  );
}

function InputWithIcon({
  icon, placeholder, value, onChange, type = 'text', autoComplete,
}: {
  icon: React.ReactNode; placeholder: string; value: string; onChange: (v: string) => void; type?: string; autoComplete?: string;
}) {
  return (
    <div className="relative">
      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none">{icon}</span>
      <input
        className="w-full h-11 pl-9 pr-3 bg-white border border-neutral-200 rounded-md text-[13px] text-ink-950 placeholder-neutral-400 focus:outline-none focus:border-action-orange focus:ring-2 focus:ring-action-orange/15 transition"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        type={type}
        autoComplete={autoComplete}
      />
    </div>
  );
}

// =============================================================================
// Username combobox — free-text input with searchable, autocompleting list of
// known demo accounts filtered by the active tab. Replaces the old "Demo
// accounts" accordion that lived below the card.
// =============================================================================
function UsernameCombobox({ tab, value, onChange, onPick, placeholder }: {
  tab: 'internal' | 'external';
  value: string;
  onChange: (v: string) => void;
  onPick: (u: User) => void;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const [activeIdx, setActiveIdx] = useState(0);
  const wrapRef = useRef<HTMLDivElement | null>(null);

  // Pool filtered by tab; the active row search query is the input value.
  const pool = useMemo(
    () => SEED_USERS.filter((u) => LOGIN_VISIBLE_USER_IDS.includes(u.id) && (tab === 'internal' ? u.userType === 'internal' : u.userType === 'external')),
    [tab],
  );

  // Tokenised case-insensitive match across id, name, role, modules, company.
  const matches = useMemo(() => {
    const q = value.trim().toLowerCase();
    if (!q) return pool;
    return pool.filter((u) => {
      const hay = [
        u.id,
        u.name,
        u.role,
        u.email ?? '',
        ...(u.modules ?? []),
        u.userType === 'external' && u.company ? u.company.name : '',
      ].join(' ').toLowerCase();
      return q.split(/\s+/).every((tok) => hay.includes(tok));
    });
  }, [pool, value]);

  // Close on outside click.
  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, []);

  // Reset highlight when the visible matches change.
  useEffect(() => { setActiveIdx(0); }, [value, tab]);

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { setOpen(true); e.preventDefault(); }
      return;
    }
    if (e.key === 'ArrowDown') { setActiveIdx((i) => Math.min(matches.length - 1, i + 1)); e.preventDefault(); }
    else if (e.key === 'ArrowUp')   { setActiveIdx((i) => Math.max(0, i - 1)); e.preventDefault(); }
    else if (e.key === 'Enter' && matches[activeIdx]) {
      onPick(matches[activeIdx]);
      setOpen(false);
      e.preventDefault();
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  };

  // Exact match means the typed value IS a known user id — nothing more to suggest.
  const exact = matches.length === 1 && matches[0].id.toLowerCase() === value.toLowerCase();

  return (
    <div ref={wrapRef} className="relative">
      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none">
        <UserIcon />
      </span>
      <input
        type="text"
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={open}
        autoComplete="username"
        spellCheck={false}
        className="w-full h-11 pl-9 pr-9 bg-white border border-neutral-200 rounded-md text-[13px] text-ink-950 placeholder-neutral-400 focus:outline-none focus:border-action-orange focus:ring-2 focus:ring-action-orange/15 transition"
        placeholder={placeholder ?? 'User Name'}
        value={value}
        onChange={(e) => { onChange(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKeyDown}
      />
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        tabIndex={-1}
        aria-label="Toggle account suggestions"
        className="absolute right-1.5 top-1/2 -translate-y-1/2 w-7 h-7 grid place-items-center text-neutral-400 hover:text-ink-950 rounded transition"
      >
        <ChevronIcon className={cn('transition-transform', open && 'rotate-180')} />
      </button>

      {open && !exact && (
        <div className="absolute z-30 mt-1 w-full bg-white border border-neutral-100 rounded-md shadow-doe-lg max-h-[260px] overflow-y-auto">
          <div className="px-3 py-1.5 border-b border-neutral-100 bg-neutral-25/60 flex items-center justify-between text-[10.5px] text-neutral-500">
            <span>
              {value.trim() ? `${matches.length} match${matches.length === 1 ? '' : 'es'}` : `${pool.length} ${tab === 'internal' ? 'internal' : 'external'} account${pool.length === 1 ? '' : 's'}`}
            </span>
            <span className="font-sans">Password: <span className="font-semibold text-ink-950">manage</span></span>
          </div>
          {matches.length === 0 ? (
            <div className="px-3 py-4 text-[12px] text-neutral-500 text-center">
              No account matches “<span className="text-ink-950 font-semibold">{value}</span>”.<br />
              You can still type your own User ID and continue.
            </div>
          ) : (
            <ul role="listbox">
              {matches.map((u, i) => (
                <li key={u.id}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={i === activeIdx}
                    onMouseEnter={() => setActiveIdx(i)}
                    onClick={() => { onPick(u); setOpen(false); }}
                    className={cn(
                      'w-full flex items-center gap-2.5 text-left px-2.5 py-2 transition',
                      i === activeIdx ? 'bg-action-orange-soft/70' : 'hover:bg-neutral-50',
                    )}
                  >
                    {/* Fixed-width initials avatar — coloured by role so the
                        row keeps a stable visual rhythm regardless of how many
                        modules the user belongs to. */}
                    <div className={cn(
                      'w-8 h-8 rounded-md grid place-items-center font-display font-bold text-[12px] shrink-0',
                      roleTone(u.role),
                    )}>
                      {u.initials ?? initialsOf(u.name)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline gap-2">
                        <span className="text-[12.5px] font-semibold text-ink-950 truncate">{u.name}</span>
                        <span className="text-[10px] font-mono text-neutral-400 shrink-0">{u.id}</span>
                      </div>
                      <div className="flex items-center gap-1.5 mt-0.5 min-w-0">
                        <span className="text-[10.5px] text-neutral-500 capitalize truncate">{roleLabel(u.role)}</span>
                        {u.userType === 'external' && u.company && (
                          <>
                            <span className="text-neutral-300 text-[10px]">·</span>
                            <span className="text-[10.5px] text-neutral-500 truncate">{u.company.name}</span>
                          </>
                        )}
                        {(u.modules ?? []).length > 0 && (
                          <>
                            <span className="text-neutral-300 text-[10px]">·</span>
                            <div className="flex items-center gap-0.5 shrink-0">
                              {(u.modules ?? []).map((m) => (
                                <span key={m} className="inline-flex items-center px-1 h-4 rounded bg-neutral-100 text-neutral-700 text-[9px] font-mono font-semibold tracking-wide uppercase">{m}</span>
                              ))}
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                    <span className={cn(
                      'text-[10px] font-mono uppercase tracking-wider shrink-0 transition',
                      i === activeIdx ? 'text-action-orange-deep font-semibold' : 'text-neutral-300',
                    )}>↵</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

// Extract initials from a display name, stripping honorifics like "Eng.", "Dr."
function initialsOf(name: string): string {
  const cleaned = name.replace(/^(eng\.?|dr\.?|mr\.?|mrs\.?|ms\.?)\s+/i, '').trim();
  const parts = cleaned.split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0]?.toUpperCase() ?? '').join('') || '?';
}

function roleTone(role: string): string {
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

function ChevronIcon({ className }: { className?: string }) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}

// ------------------------------------------------------- Icons (inline SVG)

function InfoIcon() {
  return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>;
}
function BookIcon() {
  return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>;
}
function BellIcon() {
  return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>;
}
function ListIcon() {
  return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>;
}
function ShieldIcon() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>;
}
function UsersIcon() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>;
}
function UserIcon() {
  return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-7 8-7s8 3 8 7"/></svg>;
}
function LockIcon() {
  return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="10" width="16" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></svg>;
}
function FingerprintIcon() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M12 11v3"/><path d="M8 11a4 4 0 0 1 8 0v3a8 8 0 0 1-1 4"/><path d="M5 13a7 7 0 0 1 14 0c0 3.5-1 6-2 7.5"/><path d="M9 21c1-2 1-4 1-7"/><path d="M3 16c0-5 4-9 9-9s9 4 9 9"/></svg>;
}
function GlobeIcon() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><circle cx="12" cy="12" r="9"/><ellipse cx="12" cy="12" rx="4" ry="9"/><line x1="3" y1="12" x2="21" y2="12"/></svg>;
}
function WaterDropIcon() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3 C8 9 5 12 5 16 a7 7 0 0 0 14 0 c0-4-3-7-7-13z"/></svg>;
}
function BoltIcon() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 4 14 11 14 10 22 20 10 13 10"/></svg>;
}

function AdqMark() {
  return (
    <svg width="56" height="22" viewBox="0 0 80 32" fill="none">
      <g stroke="#1F2937" strokeWidth="1.5">
        <line x1="6" y1="22" x2="12" y2="10" />
        <line x1="14" y1="22" x2="22" y2="8" />
        <line x1="24" y1="22" x2="32" y2="6" />
        <line x1="34" y1="22" x2="44" y2="4" />
      </g>
      <text x="50" y="20" fontFamily="Inter, system-ui" fontWeight="700" fontSize="9" fill="#1F2937">adq</text>
    </svg>
  );
}
function TammMark() {
  return (
    <svg width="60" height="22" viewBox="0 0 90 32" fill="none">
      <path d="M14 16 Q10 8 18 6 Q22 10 20 18 Q14 22 14 16Z" fill="#7AB54A" />
      <path d="M22 16 Q18 8 26 6 Q30 10 28 18 Q22 22 22 16Z" fill="#48B85C" />
      <text x="36" y="22" fontFamily="Inter, system-ui" fontWeight="800" fontSize="13" fill="#1F2937">TAMM</text>
    </svg>
  );
}
function EnvelopeMark() {
  return (
    <svg width="36" height="22" viewBox="0 0 40 32" fill="none" stroke="#1F2937" strokeWidth="1.6">
      <rect x="6" y="9" width="28" height="18" rx="2" />
      <path d="M6 11l14 9 14-9" />
    </svg>
  );
}
