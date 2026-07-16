import { type ReactNode, useState, useRef, useEffect } from 'react';
import { useNavigate, NavLink } from 'react-router-dom';
import { useT } from '../../i18n';
import { useLocale } from '../../store/locale';
import { cn } from '../../lib/utils';

// ============================================================================
// TAMM-style mobile design system for the DoE PPS inspection app.
//
// Visual language (drawn from TAMM, the UAE government services app):
//   • Cream/sand background (#F4EDDE) with white cards on top
//   • IBM Plex Sans (Latin) + IBM Plex Sans Arabic (Arabic) — matched pair
//   • Service-tile pattern: coloured icon square + bold label below
//   • Generous rounded corners (18-22px) and soft warm shadows
//   • Bold display titles with tight letter-spacing
//   • DoE red + action orange as the only saturated colours
//
// Every mobile screen composes its UI out of these primitives so visual
// consistency holds across Splash, Sign-in, Home, Map, Quick-Look, History,
// Profile, Route, Wizard and Submitted.
// ============================================================================

// ----------------------------------------------------------------------------
// TammScreen — root container for every page. Wraps a sticky compact nav
// (with a back link, large-title heading and trailing slot) above a scrollable
// body. The body uses the cream page background; cards live on top.
// ----------------------------------------------------------------------------

interface TammScreenProps {
  title?: string;
  largeTitle?: boolean;
  leading?: 'back' | 'home' | ReactNode;
  trailing?: ReactNode;
  tabBar?: boolean;
  children: ReactNode;
  /** Bare = the body doesn't get the standard cream background (used by
      full-bleed gradient screens like Splash). */
  bare?: boolean;
}

export function TammScreen({
  title,
  largeTitle,
  leading,
  trailing,
  tabBar = true,
  children,
  bare = false,
}: TammScreenProps) {
  const navigate = useNavigate();
  const t = useT();
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const [scrolled, setScrolled] = useState(0);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const onScroll = () => setScrolled(el.scrollTop);
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll);
  }, []);

  const collapsed = scrolled > 24;

  const leadingNode =
    leading === 'back' ? (
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-1 -ms-1 text-tamm-brand font-semibold text-[14.5px] active:opacity-70"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" className="rtl-mirror"><polyline points="15 18 9 12 15 6"/></svg>
        {t('m.common.back')}
      </button>
    ) : leading === 'home' ? (
      <button
        onClick={() => navigate('/mobile/home')}
        className="flex items-center gap-1 -ms-1 text-tamm-brand font-semibold text-[14.5px] active:opacity-70"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" className="rtl-mirror"><polyline points="15 18 9 12 15 6"/></svg>
        {t('m.common.home')}
      </button>
    ) : leading;

  return (
    <div className={cn('h-full flex flex-col', bare ? '' : 'bg-tamm-bg')}>
      {/* Compact top bar — title fades in once the user scrolls past the
          large-title hero. Padding scales up on tablet so the layout adapts
          to the device width instead of locking to a phone column. */}
      <div className={cn(
        'sticky top-0 z-30 px-5 sm:px-7 md:px-9 pt-3 pb-2.5 flex items-center gap-3 transition-colors',
        collapsed ? 'bg-tamm-bg/95 shadow-[0_0.5px_0_rgba(0,0,0,0.06)]' : '',
      )}>
        {leadingNode ?? <span className="w-6" />}
        <div className="flex-1 text-center min-w-0">
          {title && (
            <div className={cn(
              'text-[15px] font-semibold text-tamm-ink truncate transition-opacity font-display',
              collapsed ? 'opacity-100' : 'opacity-0',
            )}>{title}</div>
          )}
        </div>
        {trailing ?? <span className="w-6" />}
      </div>

      {/* Scrollable body — uses the full device width and lets individual
          sections grow naturally on tablet frames. Horizontal overflow is
          clipped so swipe-out animations (cards translating off-screen)
          can't bleed into a horizontal scroll. */}
      <div ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden">
        {largeTitle && title && (
          <div className="px-5 sm:px-7 md:px-9 pt-1 pb-3">
            <h1
              className="text-[30px] sm:text-[34px] font-bold text-tamm-ink leading-[1.1] tracking-[-0.02em]"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              {title}
            </h1>
          </div>
        )}
        {children}
      </div>

      {tabBar && <TammTabBar />}
    </div>
  );
}

// ----------------------------------------------------------------------------
// TammTabBar — sand-bg friendly bottom bar with a top hairline divider.
// Uses heavier filled icons for the active tab to match the TAMM feel.
// ----------------------------------------------------------------------------

export function TammTabBar() {
  const t = useT();
  const tabs = [
    { to: '/mobile/home',    label: t('m.tab.today'),   Icon: HomeIcon },
    { to: '/mobile/map',     label: t('m.tab.map'),     Icon: MapIcon },
    { to: '/mobile/route',   label: t('m.tab.route'),   Icon: RouteIcon },
    { to: '/mobile/history', label: t('m.tab.history'), Icon: HistoryIcon },
    { to: '/mobile/me',      label: t('m.tab.me'),      Icon: UserIcon },
  ];
  return (
    <div className="relative bg-tamm-surface border-t border-tamm-line">
      <div className="flex items-stretch justify-around px-1 sm:px-6 pt-2 pb-2.5">
        {tabs.map(({ to, label, Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) => cn(
              'flex-1 flex flex-col items-center gap-1 py-0.5',
              isActive ? 'text-tamm-brand' : 'text-tamm-subtle',
            )}
          >
            {({ isActive }) => (
              <>
                <Icon active={isActive} />
                <span className="text-[10.5px] font-semibold leading-none">{label}</span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </div>
  );
}

// ----------------------------------------------------------------------------
// TammHero — the cream-card hero block at the top of most screens. Shows a
// large display title and optional kicker / subtitle. Children render below
// the title (e.g. a stat strip or a primary action).
// ----------------------------------------------------------------------------

interface TammHeroProps {
  kicker?: string;
  title: string;
  subtitle?: ReactNode;
  children?: ReactNode;
  variant?: 'plain' | 'brand' | 'ink';
  /** When true, the hero takes the cream background instead of a card. */
  inline?: boolean;
}

export function TammHero({ kicker, title, subtitle, children, variant = 'plain', inline }: TammHeroProps) {
  const isBrand = variant === 'brand';
  const isInk = variant === 'ink';
  const tone =
    isBrand ? 'bg-tamm-brand text-white' :
    isInk   ? 'bg-tamm-ink text-white'  :
    'bg-tamm-surface text-tamm-ink';
  const kickerCls = isBrand || isInk ? 'text-white/75' : 'text-tamm-subtle';
  const subtitleCls = isBrand || isInk ? 'text-white/85' : 'text-tamm-subtle';
  if (inline) {
    return (
      <div className="px-5 pt-1 pb-3">
        {kicker && <div className={cn('text-[10.5px] font-semibold uppercase tracking-[0.16em]', kickerCls)}>{kicker}</div>}
        <h1
          className="text-[30px] font-bold leading-[1.08] tracking-[-0.02em] mt-1.5"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          {title}
        </h1>
        {subtitle && <div className={cn('text-[14px] mt-2 leading-relaxed', subtitleCls)}>{subtitle}</div>}
        {children && <div className="mt-4">{children}</div>}
      </div>
    );
  }
  return (
    <div className={cn('mx-5 mt-2 rounded-[20px] p-5 relative overflow-hidden', tone)}>
      {kicker && <div className={cn('text-[10.5px] font-semibold uppercase tracking-[0.16em]', kickerCls)}>{kicker}</div>}
      <h1
        className="text-[26px] font-bold leading-[1.1] tracking-[-0.018em] mt-1.5"
        style={{ fontFamily: 'var(--font-display)' }}
      >
        {title}
      </h1>
      {subtitle && <div className={cn('text-[13.5px] mt-2 leading-relaxed', subtitleCls)}>{subtitle}</div>}
      {children && <div className="mt-4">{children}</div>}
    </div>
  );
}

// ----------------------------------------------------------------------------
// TammCard — the standard surface for grouping content. Renders a white card
// with the TAMM warm shadow and a thin hairline. Pass `title` for a small
// uppercase section heading, `trailing` for a top-right action.
// ----------------------------------------------------------------------------

interface TammCardProps {
  title?: string;
  trailing?: ReactNode;
  children: ReactNode;
  /** Increase / decrease horizontal padding inside the card */
  padding?: 'sm' | 'md' | 'lg' | 'none';
  className?: string;
}

export function TammCard({ title, trailing, children, padding = 'md', className }: TammCardProps) {
  const pad = padding === 'none' ? '' : padding === 'sm' ? 'p-3' : padding === 'lg' ? 'p-5' : 'p-4';
  return (
    <div className="px-5 mt-5">
      {(title || trailing) && (
        <div className="flex items-center justify-between mb-2 px-0.5">
          {title && <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-tamm-subtle">{title}</div>}
          {trailing}
        </div>
      )}
      <div className={cn(
        'rounded-[20px] bg-tamm-surface ring-1 ring-tamm-line shadow-[0_1px_2px_rgba(11,14,18,0.04),0_8px_24px_rgba(11,14,18,0.04)]',
        pad,
        className,
      )}>
        {children}
      </div>
    </div>
  );
}

// ----------------------------------------------------------------------------
// TammRow — list row inside a TammCard. Supports leading tile, title,
// subtitle, trailing value/widget, optional tap target (`onClick` or `to`).
// Use <TammDivider/> between consecutive rows to draw the hairline separator.
// ----------------------------------------------------------------------------

interface TammRowProps {
  leading?: ReactNode;
  title: ReactNode;
  subtitle?: ReactNode;
  value?: ReactNode;
  trailing?: ReactNode;
  onClick?: () => void;
  to?: string;
  /** Drop the right chevron even when interactive */
  hideChevron?: boolean;
  className?: string;
}

export function TammRow({ leading, title, subtitle, value, trailing, onClick, to, hideChevron, className }: TammRowProps) {
  const navigate = useNavigate();
  const onActivate = () => { if (onClick) onClick(); else if (to) navigate(to); };
  const interactive = !!(onClick || to);
  const Component: any = interactive ? 'button' : 'div';
  return (
    <Component
      onClick={interactive ? onActivate : undefined}
      className={cn(
        'w-full flex items-center gap-3 py-3 text-start transition relative',
        interactive && 'active:bg-tamm-field rounded-xl',
        className,
      )}
    >
      {leading && <span className="shrink-0">{leading}</span>}
      <div className="flex-1 min-w-0">
        <div className="text-[14.5px] font-semibold text-tamm-ink leading-tight truncate">{title}</div>
        {subtitle && <div className="text-[12px] text-tamm-subtle leading-tight mt-0.5 truncate">{subtitle}</div>}
      </div>
      {value && <div className="text-[13.5px] font-medium text-tamm-subtle shrink-0 max-w-[45%] truncate text-end">{value}</div>}
      {trailing ?? (interactive && !hideChevron && (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" className="text-tamm-line shrink-0 rtl-mirror"><polyline points="9 6 15 12 9 18"/></svg>
      ))}
    </Component>
  );
}

export function TammDivider({ inset = true }: { inset?: boolean }) {
  return <div className={cn('h-px bg-tamm-line', inset && 'ms-[60px]')} />;
}

// ----------------------------------------------------------------------------
// TammTile — the signature TAMM "service tile". Coloured rounded square with
// an icon, label below. Used in 3- or 4-column grids on the Home screen.
// ----------------------------------------------------------------------------

interface TammTileProps {
  tone: 'orange' | 'red' | 'green' | 'amber' | 'blue' | 'ink' | 'sand';
  icon: ReactNode;
  label: string;
  sublabel?: string;
  onClick?: () => void;
  to?: string;
  /** Make the tile visibly highlighted (selected). */
  active?: boolean;
}

export function TammTile({ tone, icon, label, sublabel, onClick, to, active }: TammTileProps) {
  const navigate = useNavigate();
  const tones: Record<TammTileProps['tone'], string> = {
    orange: 'bg-tamm-tintSoft text-tamm-tint',
    red:    'bg-tamm-brandSoft text-tamm-brand',
    green:  'bg-tamm-greenSoft text-tamm-green',
    amber:  'bg-tamm-amberSoft text-tamm-amber',
    blue:   'bg-tamm-infoSoft text-tamm-info',
    ink:    'bg-[#EFEAE0] text-tamm-ink',
    sand:   'bg-tamm-field text-tamm-ink',
  };
  const handle = () => { if (onClick) onClick(); else if (to) navigate(to); };
  return (
    <button
      onClick={handle}
      className={cn(
        'group flex flex-col items-center text-center gap-2 active:scale-[0.97] transition rounded-2xl py-2.5',
        active && 'bg-tamm-field ring-1 ring-tamm-line',
      )}
    >
      <span className={cn('w-12 h-12 rounded-[14px] grid place-items-center', tones[tone])}>
        {icon}
      </span>
      <span className="text-[11.5px] font-semibold text-tamm-ink leading-tight max-w-[80px] line-clamp-2">{label}</span>
      {sublabel && <span className="text-[10px] text-tamm-subtle leading-none">{sublabel}</span>}
    </button>
  );
}

// ----------------------------------------------------------------------------
// TammButton — primary / secondary / tinted / ghost button.
// ----------------------------------------------------------------------------

interface TammButtonProps {
  variant?: 'primary' | 'secondary' | 'tinted' | 'ghost' | 'ink' | 'success';
  size?: 'md' | 'lg';
  disabled?: boolean;
  onClick?: () => void;
  type?: 'button' | 'submit';
  children: ReactNode;
  block?: boolean;
  leading?: ReactNode;
  trailing?: ReactNode;
}

export function TammButton({
  variant = 'primary', size = 'md', disabled, onClick, children, block, type = 'button', leading, trailing,
}: TammButtonProps) {
  const variants: Record<NonNullable<TammButtonProps['variant']>, string> = {
    primary:   'bg-tamm-brand text-white active:bg-tamm-brand/90 disabled:bg-tamm-line disabled:text-tamm-subtle',
    secondary: 'bg-tamm-surface text-tamm-ink border border-tamm-line active:bg-tamm-field',
    tinted:    'bg-tamm-brandSoft text-tamm-brand active:bg-tamm-brandSoft/70',
    ghost:     'bg-transparent text-tamm-brand active:bg-tamm-brandSoft',
    ink:       'bg-tamm-ink text-white active:bg-tamm-ink/90',
    success:   'bg-tamm-green text-white active:bg-tamm-green/90',
  };
  const sizes: Record<NonNullable<TammButtonProps['size']>, string> = {
    md: 'h-11 px-4 text-[14px] rounded-xl',
    lg: 'h-[52px] px-5 text-[15.5px] rounded-2xl',
  };
  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        'font-semibold transition inline-flex items-center justify-center gap-2 active:scale-[0.98]',
        variants[variant], sizes[size], block && 'w-full',
      )}
    >
      {leading}{children}{trailing}
    </button>
  );
}

// ----------------------------------------------------------------------------
// TammBadge — compact pill for status / count / tag indicators.
// ----------------------------------------------------------------------------

interface TammBadgeProps {
  tone: 'red' | 'green' | 'amber' | 'blue' | 'orange' | 'grey';
  size?: 'sm' | 'md';
  children: ReactNode;
}

export function TammBadge({ tone, size = 'sm', children }: TammBadgeProps) {
  const tones: Record<TammBadgeProps['tone'], string> = {
    red:    'bg-tamm-brandSoft text-tamm-brand',
    green:  'bg-tamm-greenSoft text-tamm-green',
    amber:  'bg-tamm-amberSoft text-tamm-amber',
    blue:   'bg-tamm-infoSoft text-tamm-info',
    orange: 'bg-tamm-tintSoft text-tamm-tint',
    grey:   'bg-tamm-field text-tamm-subtle',
  };
  return (
    <span className={cn(
      'inline-flex items-center rounded-md font-semibold whitespace-nowrap',
      size === 'sm' ? 'px-1.5 py-0.5 text-[10.5px]' : 'px-2 py-1 text-[11.5px]',
      tones[tone],
    )}>
      {children}
    </span>
  );
}

// ----------------------------------------------------------------------------
// TammStat — compact KPI tile (label above, big number below). Used in the
// hero stats row on the Home page.
// ----------------------------------------------------------------------------

export function TammStat({
  value, label, tone = 'plain',
}: { value: string | number; label: string; tone?: 'plain' | 'brand' | 'tint' | 'green' | 'amber' }) {
  const tones = {
    plain: 'bg-tamm-surface text-tamm-ink',
    brand: 'bg-tamm-brandSoft text-tamm-brand',
    tint:  'bg-tamm-tintSoft text-tamm-tint',
    green: 'bg-tamm-greenSoft text-tamm-green',
    amber: 'bg-tamm-amberSoft text-tamm-amber',
  };
  return (
    <div className={cn(
      'rounded-[14px] p-3.5 ring-1 ring-tamm-line shadow-[0_1px_2px_rgba(11,14,18,0.04)]',
      tones[tone],
    )}>
      <div className="text-[10.5px] font-semibold uppercase tracking-[0.1em] opacity-80">{label}</div>
      <div className="text-[24px] font-bold leading-none mt-1.5 tracking-tight tabular-nums" style={{ fontFamily: 'var(--font-display)' }}>
        {value}
      </div>
    </div>
  );
}

// ----------------------------------------------------------------------------
// TammSectionTitle — uppercase label above grouped content.
// ----------------------------------------------------------------------------

export function TammSectionTitle({ title, trailing }: { title: string; trailing?: ReactNode }) {
  return (
    <div className="flex items-center justify-between px-5 pt-5 pb-2">
      <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-tamm-subtle">{title}</div>
      {trailing}
    </div>
  );
}

// ----------------------------------------------------------------------------
// TammLangPill — small inline EN/AR toggle. Placed on the Splash / Sign-in
// screens so users can flip locale before they sign in.
// ----------------------------------------------------------------------------

export function TammLangPill() {
  const locale = useLocale((s) => s.locale);
  const setLocale = useLocale((s) => s.setLocale);
  return (
    <button
      onClick={() => setLocale(locale === 'en' ? 'ar' : 'en')}
      className="h-7 px-3 rounded-full bg-tamm-field text-tamm-ink text-[11px] font-semibold ring-1 ring-tamm-line active:scale-95 transition"
    >
      {locale === 'en' ? 'عربي' : 'EN'}
    </button>
  );
}

// ============================================================================
// Icons used by the tab bar (filled when active)
// ============================================================================

function HomeIcon({ active }: { active: boolean }) {
  return active
    ? <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M3 11.5L12 4l9 7.5V20a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1z"/></svg>
    : <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>;
}
function MapIcon({ active }: { active: boolean }) {
  return active
    ? <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2"/></svg>
    : <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"/><line x1="8" y1="2" x2="8" y2="18"/><line x1="16" y1="6" x2="16" y2="22"/></svg>;
}
function RouteIcon({ active }: { active: boolean }) {
  return active
    ? <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><circle cx="6" cy="19" r="3"/><circle cx="18" cy="5" r="3"/><path d="M9 19h4.5a3.5 3.5 0 0 0 0-7h-3a3.5 3.5 0 0 1 0-7H15" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round"/></svg>
    : <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="6" cy="19" r="3"/><path d="M9 19h4.5a3.5 3.5 0 0 0 0-7h-3a3.5 3.5 0 0 1 0-7H15"/><circle cx="18" cy="5" r="3"/></svg>;
}
function HistoryIcon({ active }: { active: boolean }) {
  return active
    ? <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a10 10 0 1 0 7.07 17.07 1 1 0 0 0-1.41-1.42A8 8 0 1 1 12 4v5l4 2-1 1.7-5-2.5V2z"/></svg>
    : <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3v5h5"/><path d="M3.05 13A9 9 0 1 0 6 5.3L3 8"/><polyline points="12 7 12 12 15 14"/></svg>;
}
function UserIcon({ active }: { active: boolean }) {
  return active
    ? <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0z"/></svg>
    : <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>;
}
