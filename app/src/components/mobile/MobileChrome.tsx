import { type ReactNode, useState, useRef, useEffect } from 'react';
import { useNavigate, NavLink } from 'react-router-dom';
import { motion } from 'framer-motion';
import { cn } from '../../lib/utils';

// ============================================================================
// Native-feeling mobile chrome primitives — large-title nav, frosted tab bar,
// segmented control, grouped list, sectioned scroll, sheet header.
//
// Visual language: iOS systemGrouped (#F2F2F7) background, white cards with
// 14px rounded corners, SF-style typography (Inter Tight as display), tight
// letter-spacing on large titles, restrained colour use, status dots over
// coloured backgrounds, ring-1 hairlines instead of borders.
// ============================================================================

// ----------------------------------------------------------------------------
// MobileScreen — root container for every mobile-app page.
//
//   <MobileScreen
//     title="Today"
//     subtitle="Plan & inspections"
//     largeTitle      // iOS "Large Title" — collapses to small on scroll
//     trailing={<SomeIcon/>}
//     leading="back"  // "back" | <Custom/> | undefined
//     tabBar          // show bottom tab bar (default true)
//   >
//     <Section>…</Section>
//   </MobileScreen>
//
// The scrolling region tracks scrollY so the large title can shrink into a
// compact bar (animation done in CSS via the scroll y value).
// ----------------------------------------------------------------------------

interface MobileScreenProps {
  title?: string;
  subtitle?: string;
  largeTitle?: boolean;
  leading?: 'back' | ReactNode;
  trailing?: ReactNode;
  tabBar?: boolean;
  /** @deprecated use `tabBar={false}` instead. Kept for older screens. */
  hideTabBar?: boolean;
  children: ReactNode;
  /** Background tone — defaults to iOS systemGrouped */
  bg?: 'system' | 'plain';
}

export function MobileScreen({
  title,
  subtitle,
  largeTitle,
  leading,
  trailing,
  tabBar,
  hideTabBar,
  children,
  bg = 'system',
}: MobileScreenProps) {
  // Resolve tab-bar visibility from either the new `tabBar` or the legacy
  // `hideTabBar` prop. The new prop wins when both are passed.
  const showTabBar = tabBar !== undefined ? tabBar : !hideTabBar;
  const navigate = useNavigate();
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const [scrolled, setScrolled] = useState(0);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const onScroll = () => setScrolled(el.scrollTop);
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll);
  }, []);

  // Threshold where the large title disappears and the inline title fades in
  const collapsed = scrolled > 28;

  const bgClass = bg === 'system' ? 'bg-[#F2F2F7]' : 'bg-white';

  return (
    <div className={cn('h-full flex flex-col', bgClass)}>
      {/* Compact nav bar (always present, becomes solid as scroll grows).
          Note: avoid backdrop-filter — it composites incorrectly when an
          ancestor (the device frame) is transformed (Chromium issue). */}
      <div className={cn(
        'sticky top-0 z-30 px-4 py-2.5 flex items-center gap-2 transition-all',
        collapsed ? 'bg-white shadow-[0_0.5px_0_rgba(0,0,0,0.08)]' : bg === 'system' ? 'bg-[#F2F2F7]' : 'bg-white',
      )}>
        {leading === 'back' ? (
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-0.5 -ml-1 text-doe-red text-[15px] font-medium"
            aria-label="Back"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
          </button>
        ) : leading ?? <span className="w-7" />}
        <div className="flex-1 text-center min-w-0">
          {title && (
            <div className={cn(
              'text-[15px] font-bold text-ink-950 truncate transition-opacity',
              collapsed ? 'opacity-100' : 'opacity-0',
            )}>{title}</div>
          )}
        </div>
        {trailing ?? <span className="w-7" />}
      </div>

      {/* Scroll surface */}
      <div ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto">
        {largeTitle && title && (
          <div className="px-5 pt-1 pb-3">
            <motion.h1
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-[34px] font-bold text-ink-950 leading-tight tracking-[-0.03em]"
              style={{ fontFamily: 'var(--font-display, "Inter Tight")' }}
            >
              {title}
            </motion.h1>
            {subtitle && <div className="text-[13.5px] text-neutral-500 mt-0.5">{subtitle}</div>}
          </div>
        )}
        {children}
      </div>

      {showTabBar && <MobileTabBar />}
    </div>
  );
}

// ----------------------------------------------------------------------------
// MobileTabBar — frosted, hairline divider, active indicator
// ----------------------------------------------------------------------------

export function MobileTabBar() {
  const tabs = [
    { to: '/mobile/home',    label: 'Today',   icon: HomeIcon },
    { to: '/mobile/map',     label: 'Map',     icon: MapIcon },
    { to: '/mobile/route',   label: 'Route',   icon: RouteIcon },
    { to: '/mobile/history', label: 'History', icon: HistoryIcon },
    { to: '/mobile/me',      label: 'Me',      icon: UserIcon },
  ];
  return (
    <div className="relative bg-white border-t border-black/[0.06]">
      <div className="flex items-stretch justify-around px-2 pt-1.5 pb-2">
        {tabs.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) => cn(
              'flex-1 flex flex-col items-center gap-0.5 py-1 relative transition',
              isActive ? 'text-doe-red' : 'text-neutral-500',
            )}
          >
            {({ isActive }) => (
              <>
                <Icon active={isActive} />
                <span className={cn('text-[10px] font-semibold leading-none', isActive && 'font-bold')}>{label}</span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </div>
  );
}

// ----------------------------------------------------------------------------
// Section — iOS-style grouped section with optional title above the card
// ----------------------------------------------------------------------------

interface SectionProps {
  title?: string;
  trailing?: ReactNode;
  children: ReactNode;
  inset?: boolean;
  /** When true, the card itself is omitted — children handle their own layout */
  bare?: boolean;
}
export function Section({ title, trailing, children, inset = true, bare = false }: SectionProps) {
  return (
    <div className={cn('mt-5', inset && 'px-4')}>
      {title && (
        <div className="flex items-center justify-between px-1.5 mb-2">
          <div className="text-[12.5px] font-bold text-neutral-500 uppercase tracking-[0.04em]">{title}</div>
          {trailing}
        </div>
      )}
      {bare ? children : (
        <div className="bg-white rounded-[16px] overflow-hidden shadow-[0_1px_2px_rgba(0,0,0,0.04),0_4px_12px_rgba(0,0,0,0.04)]">
          {children}
        </div>
      )}
    </div>
  );
}

// ----------------------------------------------------------------------------
// Row — list row inside Section. Optional leading icon, value on right.
// ----------------------------------------------------------------------------

interface RowProps {
  leading?: ReactNode;
  title: ReactNode;
  subtitle?: ReactNode;
  value?: ReactNode;
  trailing?: ReactNode;
  onClick?: () => void;
  to?: string;
  /** Compact: less vertical padding */
  compact?: boolean;
  className?: string;
}
export function Row({ leading, title, subtitle, value, trailing, onClick, to, compact, className }: RowProps) {
  const navigate = useNavigate();
  const onActivate = () => { if (onClick) onClick(); else if (to) navigate(to); };
  const interactive = !!(onClick || to);
  const Component: any = interactive ? 'button' : 'div';
  return (
    <Component
      onClick={interactive ? onActivate : undefined}
      className={cn(
        'w-full flex items-center gap-3 px-4 transition relative text-left',
        compact ? 'py-2.5' : 'py-3.5',
        interactive && 'active:bg-neutral-100',
        className,
      )}
    >
      {leading && <span className="shrink-0">{leading}</span>}
      <div className="flex-1 min-w-0">
        <div className="text-[15px] font-semibold text-ink-950 leading-tight truncate">{title}</div>
        {subtitle && <div className="text-[12.5px] text-neutral-500 leading-tight mt-0.5 truncate">{subtitle}</div>}
      </div>
      {value && <div className="text-[14px] font-medium text-neutral-500 shrink-0 max-w-[40%] truncate text-right">{value}</div>}
      {trailing ?? (interactive && <ChevronIcon />)}
    </Component>
  );
}

export function RowSeparator() {
  return <div className="ml-[68px] h-px bg-black/[0.06]" />;
}

// ----------------------------------------------------------------------------
// SegmentedControl — iOS-style filter switcher
// ----------------------------------------------------------------------------

interface SegmentedControlProps<T extends string> {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}
export function SegmentedControl<T extends string>({ options, value, onChange }: SegmentedControlProps<T>) {
  return (
    <div className="inline-flex w-full p-0.5 rounded-[10px] bg-black/[0.06]">
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          className={cn(
            'flex-1 h-8 px-3 rounded-lg text-[12.5px] font-semibold transition relative',
            value === o.value
              ? 'bg-white text-ink-950 shadow-[0_2px_6px_rgba(0,0,0,0.08)]'
              : 'text-neutral-700 hover:text-ink-950',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

// ----------------------------------------------------------------------------
// StatusDot — coloured pulse for live state
// ----------------------------------------------------------------------------

export function StatusDot({ tone = 'green' }: { tone?: 'green' | 'amber' | 'red' | 'blue' | 'grey' }) {
  const toneCls = {
    green: 'bg-success-500', amber: 'bg-warning-500',
    red: 'bg-doe-red', blue: 'bg-info-500', grey: 'bg-neutral-400',
  }[tone];
  return (
    <span className="relative inline-flex w-2 h-2">
      {tone !== 'grey' && <span className={cn('absolute inset-0 rounded-full opacity-50 animate-ping', toneCls)} />}
      <span className={cn('relative w-2 h-2 rounded-full', toneCls)} />
    </span>
  );
}

// ----------------------------------------------------------------------------
// IconTile — coloured rounded square with an icon (used on row leading)
// ----------------------------------------------------------------------------

interface IconTileProps {
  tone: 'orange' | 'red' | 'green' | 'amber' | 'blue' | 'purple' | 'ink' | 'grey';
  size?: 'sm' | 'md' | 'lg';
  children: ReactNode;
}
export function IconTile({ tone, size = 'md', children }: IconTileProps) {
  const toneCls: Record<IconTileProps['tone'], string> = {
    orange: 'bg-gradient-to-br from-[#FFB36B] to-[#E89B4C] text-white',
    red:    'bg-gradient-to-br from-[#F0445D] to-[#C8102E] text-white',
    green:  'bg-gradient-to-br from-[#36C66B] to-[#22A745] text-white',
    amber:  'bg-gradient-to-br from-[#F4B042] to-[#D97706] text-white',
    blue:   'bg-gradient-to-br from-[#3D9ED1] to-[#0E76A8] text-white',
    purple: 'bg-gradient-to-br from-[#A06CE0] to-[#7B3FE4] text-white',
    ink:    'bg-gradient-to-br from-[#4A5260] to-[#2C2C2C] text-white',
    grey:   'bg-neutral-100 text-neutral-700',
  };
  const sizeCls = { sm: 'w-7 h-7 rounded-lg', md: 'w-9 h-9 rounded-[10px]', lg: 'w-11 h-11 rounded-xl' }[size];
  return <span className={cn('inline-grid place-items-center shrink-0', toneCls[tone], sizeCls)}>{children}</span>;
}

// ----------------------------------------------------------------------------
// MobileBadge — small inline pill
// ----------------------------------------------------------------------------

interface BadgeProps {
  tone: 'green' | 'amber' | 'red' | 'blue' | 'grey' | 'orange';
  size?: 'sm' | 'md';
  children: ReactNode;
}
export function MobileBadge({ tone, size = 'sm', children }: BadgeProps) {
  const tones: Record<BadgeProps['tone'], string> = {
    green:  'bg-success-soft text-success-500',
    amber:  'bg-warning-soft text-warning-500',
    red:    'bg-doe-red-soft text-doe-red',
    blue:   'bg-info-soft text-info-500',
    grey:   'bg-neutral-100 text-neutral-600',
    orange: 'bg-action-orange-soft text-action-orange-deep',
  };
  return (
    <span className={cn(
      'inline-flex items-center rounded-md font-semibold whitespace-nowrap',
      size === 'sm' ? 'px-1.5 py-0.5 text-[10px]' : 'px-2 py-1 text-[11px]',
      tones[tone],
    )}>
      {children}
    </span>
  );
}

// ----------------------------------------------------------------------------
// MobileButton — iOS-style primary / secondary / tinted buttons
// ----------------------------------------------------------------------------

interface MobileButtonProps {
  variant?: 'primary' | 'secondary' | 'tinted' | 'danger' | 'ghost' | 'success';
  size?: 'md' | 'lg';
  disabled?: boolean;
  onClick?: () => void;
  type?: 'button' | 'submit';
  children: ReactNode;
  block?: boolean;
  leading?: ReactNode;
  trailing?: ReactNode;
}
export function MobileButton({
  variant = 'primary', size = 'md', disabled, onClick, children, block, type = 'button', leading, trailing,
}: MobileButtonProps) {
  const variants: Record<NonNullable<MobileButtonProps['variant']>, string> = {
    primary:   'bg-doe-red text-white active:bg-doe-red-dark disabled:bg-neutral-300 disabled:text-neutral-500',
    secondary: 'bg-white text-ink-950 border border-neutral-200 active:bg-neutral-50',
    tinted:    'bg-doe-red-soft text-doe-red active:bg-doe-red-soft/70',
    danger:    'bg-action-orange text-white active:bg-action-orange-deep',
    ghost:     'bg-transparent text-doe-red active:bg-doe-red-soft',
    success:   'bg-success-500 text-white active:bg-success-500/90',
  };
  const sizes: Record<NonNullable<MobileButtonProps['size']>, string> = {
    md: 'h-11 px-4 text-[14px] rounded-xl',
    lg: 'h-[52px] px-5 text-[15.5px] rounded-2xl',
  };
  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        'font-bold transition inline-flex items-center justify-center gap-2 active:scale-[0.98]',
        variants[variant], sizes[size], block && 'w-full',
      )}
    >
      {leading}{children}{trailing}
    </button>
  );
}

// ----------------------------------------------------------------------------
// MobileHeader — fallback for screens that need a custom non-collapsing header
// ----------------------------------------------------------------------------

interface MobileHeaderProps {
  title: string;
  subtitle?: string;
  back?: boolean | string;
  right?: ReactNode;
  variant?: 'default' | 'red';
}
export function MobileHeader({ title, subtitle, back, right, variant = 'default' }: MobileHeaderProps) {
  const navigate = useNavigate();
  return (
    <div className={cn(
      'sticky top-0 z-20 px-4 py-3 flex items-center gap-2',
      variant === 'red' ? 'bg-doe-red text-white' : 'bg-white border-b border-black/[0.06] text-ink-950',
    )}>
      {back && (
        <button
          onClick={() => (typeof back === 'string' ? navigate(back) : navigate(-1))}
          className={cn(
            'flex items-center -ml-1 active:scale-95 transition',
            variant === 'red' ? 'text-white' : 'text-doe-red',
          )}
          aria-label="Back"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
        </button>
      )}
      <div className="flex-1 min-w-0 text-center">
        <div className="text-[15px] font-bold leading-tight truncate">{title}</div>
        {subtitle && (
          <div className={cn('text-[11px] truncate font-medium', variant === 'red' ? 'text-white/80' : 'text-neutral-500')}>{subtitle}</div>
        )}
      </div>
      {right ?? <span className="w-6" />}
    </div>
  );
}

// ----------------------------------------------------------------------------
// Icons (SF Symbols-style, filled when active)
// ----------------------------------------------------------------------------

function ChevronIcon() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" className="text-neutral-300"><polyline points="9 6 15 12 9 18"/></svg>;
}

function HomeIcon({ active }: { active: boolean }) {
  return active
    ? <svg width="23" height="23" viewBox="0 0 24 24" fill="currentColor"><path d="M3 11.5L12 4l9 7.5V20a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1z"/></svg>
    : <svg width="23" height="23" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>;
}
function MapIcon({ active }: { active: boolean }) {
  return active
    ? <svg width="23" height="23" viewBox="0 0 24 24" fill="currentColor"><polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2"/></svg>
    : <svg width="23" height="23" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"/><line x1="8" y1="2" x2="8" y2="18"/><line x1="16" y1="6" x2="16" y2="22"/></svg>;
}
function RouteIcon({ active }: { active: boolean }) {
  return active
    ? <svg width="23" height="23" viewBox="0 0 24 24" fill="currentColor"><circle cx="6" cy="19" r="3"/><circle cx="18" cy="5" r="3"/><path d="M9 19h4.5a3.5 3.5 0 0 0 0-7h-3a3.5 3.5 0 0 1 0-7H15" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round"/></svg>
    : <svg width="23" height="23" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="6" cy="19" r="3"/><path d="M9 19h4.5a3.5 3.5 0 0 0 0-7h-3a3.5 3.5 0 0 1 0-7H15"/><circle cx="18" cy="5" r="3"/></svg>;
}
function HistoryIcon({ active }: { active: boolean }) {
  return active
    ? <svg width="23" height="23" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a10 10 0 1 0 7.07 17.07 1 1 0 0 0-1.41-1.42A8 8 0 1 1 12 4v5l4 2-1 1.7-5-2.5V2z"/></svg>
    : <svg width="23" height="23" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3v5h5"/><path d="M3.05 13A9 9 0 1 0 6 5.3L3 8"/><polyline points="12 7 12 12 15 14"/></svg>;
}
function UserIcon({ active }: { active: boolean }) {
  return active
    ? <svg width="23" height="23" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0z"/></svg>
    : <svg width="23" height="23" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>;
}
