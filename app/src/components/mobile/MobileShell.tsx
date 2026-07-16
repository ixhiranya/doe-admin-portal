import { type ReactNode, useState, createContext, useContext, useMemo, useRef } from 'react';
import { useNavigate, useLocation, NavLink } from 'react-router-dom';
import { useAuth } from '../../store/auth';
import { cn } from '../../lib/utils';
import { DeviceFrame, PRESETS, getPreset, type DevicePreset, type Orientation } from './DeviceFrame';
import { SEED_USERS } from '../../store/seed';

// ============================================================================
// MobileShell — simulator chrome surrounding the device frame. Provides:
//   • device preset switcher (mobile / tablet variants)
//   • orientation toggle
//   • user-switcher dropdown (inspector vs senior inspector vs regulation)
//   • offline / online toggle (simulated)
//   • back-to-web button
//   • mobile-internal "history stack" via the actual react-router history
// ============================================================================

interface SimContext {
  preset: DevicePreset;
  setPreset: (p: DevicePreset) => void;
  orientation: Orientation;
  setOrientation: (o: Orientation) => void;
  offline: boolean;
  setOffline: (v: boolean) => void;
  /** Derived: 'mobile' (iPhones) or 'tablet' (iPads). Screens use this to
      switch between phone single-column and tablet multi-column layouts. */
  category: 'mobile' | 'tablet';
  /** Derived: true when the device is an iPad (in either orientation). */
  isTablet: boolean;
  /** Derived: effective viewport width (portrait→width, landscape→height). */
  deviceWidth: number;
  /** Derived: true only when the device is wide enough (>= ~1000px) to
      actually benefit from a multi-column dashboard. iPad mini portrait
      and iPad Pro 11 portrait return false; everything wider returns true. */
  isWideEnoughForGrid: boolean;
}

const Ctx = createContext<SimContext | null>(null);

export function useMobileSim() {
  const v = useContext(Ctx);
  if (!v) throw new Error('useMobileSim must be used under <MobileShell>');
  return v;
}

interface MobileShellProps {
  children: ReactNode;
}

export function MobileShell({ children }: MobileShellProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const user = useAuth((s) => s.user);
  const switchTo = useAuth((s) => s.switchTo);

  const [preset, setPreset] = useState<DevicePreset>('iphone17');
  const [orientation, setOrientation] = useState<Orientation>('portrait');
  const [offline, setOffline] = useState(false);
  const [userSwitcherOpen, setUserSwitcherOpen] = useState(false);
  // When true, the simulator header + footer collapse out of the way so the
  // device frame can take the full viewport. Toggled with a double-tap on
  // the device frame area.
  const [chromeHidden, setChromeHidden] = useState(false);
  const lastTapRef = useRef<number>(0);
  const toggleChrome = () => setChromeHidden((v) => !v);
  // Double-click anywhere in the backdrop area toggles the chrome. We use
  // React's onDoubleClick (browser dblclick) which is more reliable than a
  // hand-rolled timer. The handler doesn't filter by target because the user
  // expects the toggle to fire whether they tap the dark backdrop area or
  // even the device frame's outer bezel.
  const handleBackdropDoubleClick = () => toggleChrome();
  // Manual two-tap detector — covers touch devices that don't synthesise a
  // dblclick. Limited to the backdrop area only (e.target === e.currentTarget)
  // so taps inside the simulated app don't accidentally hide the chrome.
  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target !== e.currentTarget) return;
    const now = Date.now();
    if (now - lastTapRef.current < 500) {
      toggleChrome();
      lastTapRef.current = 0;
    } else {
      lastTapRef.current = now;
    }
  };

  const inspectorUsers = useMemo(() =>
    SEED_USERS.filter((u) => ['inspector', 'senior_inspector', 'section_head', 'regulation_team', 'director'].includes(u.role)),
  []);

  const spec = getPreset(preset);
  const category = spec.category;
  // Effective device width — width when portrait, swapped when landscape.
  const deviceWidth = orientation === 'portrait' ? spec.width : spec.height;
  const ctx: SimContext = {
    preset, setPreset, orientation, setOrientation, offline, setOffline,
    category, isTablet: category === 'tablet',
    deviceWidth,
    // 2-column dashboards make sense only above ~1000px effective width.
    // Anything narrower (iPad mini portrait, iPad Pro 11 portrait) reads
    // better as a single centered column.
    isWideEnoughForGrid: deviceWidth >= 1000,
  };

  // Build the URL-stem for screens inside the simulator. Everything under
  // /mobile/* is rendered inside the device frame.
  const onMobileRoute = location.pathname.startsWith('/mobile');

  const activePreset = PRESETS.find((p) => p.id === preset)!;
  const mobiles = PRESETS.filter((p) => p.category === 'mobile');
  const tablets = PRESETS.filter((p) => p.category === 'tablet');

  return (
    <Ctx.Provider value={ctx}>
      <div className="h-screen overflow-hidden bg-gradient-to-br from-[#0B0D12] via-[#11141B] to-[#0B0D12] flex flex-col text-white">
        {/* ── Simulator top bar ── (hidden when chrome is collapsed) */}
        <div className={cn(
          'overflow-hidden transition-all duration-300',
          chromeHidden ? 'max-h-0 opacity-0 pointer-events-none' : 'max-h-[200px] opacity-100',
        )}>
        <div className="px-4 py-2.5 flex items-center justify-between gap-3 bg-[#15181F]/95 backdrop-blur border-b border-white/5 flex-wrap">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => navigate('/pps-dashboard')}
              className="text-[12px] text-white/70 hover:text-white inline-flex items-center gap-1.5 px-2 py-1 rounded-md hover:bg-white/5 transition whitespace-nowrap"
            >
              <BackIcon /> Back to web
            </button>
            <div className="h-6 w-px bg-white/10" />
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-7 h-7 rounded-md bg-doe-red grid place-items-center shrink-0">
                <img src="/doe-logo.png" alt="DoE" className="w-5 h-5 object-contain" />
              </div>
              <div className="min-w-0 hidden sm:block">
                <div className="text-[9.5px] uppercase tracking-[0.18em] text-white/55 leading-tight whitespace-nowrap">Mobile Simulator</div>
                <div className="font-display font-bold text-[13px] leading-tight whitespace-nowrap">DoE PPS · Inspection</div>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {/* Device preset segmented control */}
            <div className="flex items-center gap-1 bg-white/5 rounded-lg p-1 ring-1 ring-white/5">
              <div className="px-1.5 text-[9.5px] uppercase tracking-wider text-white/40 font-semibold border-r border-white/10">📱</div>
              {mobiles.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setPreset(p.id)}
                  title={`${p.label} · ${p.width}×${p.height}`}
                  className={cn(
                    'h-7 px-2.5 rounded text-[11px] font-semibold transition',
                    preset === p.id ? 'bg-white text-ink-950 shadow' : 'text-white/70 hover:text-white hover:bg-white/5',
                  )}
                >
                  {p.shortLabel}
                </button>
              ))}
              <div className="px-1.5 text-[9.5px] uppercase tracking-wider text-white/40 font-semibold border-l border-white/10">▢</div>
              {tablets.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setPreset(p.id)}
                  title={`${p.label} · ${p.width}×${p.height}`}
                  className={cn(
                    'h-7 px-2.5 rounded text-[11px] font-semibold transition',
                    preset === p.id ? 'bg-white text-ink-950 shadow' : 'text-white/70 hover:text-white hover:bg-white/5',
                  )}
                >
                  {p.shortLabel}
                </button>
              ))}
            </div>
            {/* Orientation toggle */}
            <button
              onClick={() => setOrientation(orientation === 'portrait' ? 'landscape' : 'portrait')}
              className="h-8 px-2.5 rounded-lg text-[11px] font-semibold bg-white/5 text-white/80 hover:bg-white/10 transition flex items-center gap-1.5 ring-1 ring-white/5"
              title="Toggle orientation"
            >
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>
              {orientation === 'portrait' ? 'Landscape' : 'Portrait'}
            </button>
            {/* Offline simulator */}
            <button
              onClick={() => setOffline(!offline)}
              className={cn(
                'h-8 px-2.5 rounded-lg text-[11px] font-semibold transition flex items-center gap-1.5 ring-1',
                offline ? 'bg-warning-500 text-white ring-warning-500' : 'bg-white/5 text-white/80 hover:bg-white/10 ring-white/5',
              )}
              title="Toggle offline mode"
            >
              <span className={cn('w-1.5 h-1.5 rounded-full', offline ? 'bg-white' : 'bg-success-500')} />
              {offline ? 'Offline · outbox' : 'Online · live sync'}
            </button>
            {/* Device user switcher */}
            <div className="relative">
              <button
                onClick={() => setUserSwitcherOpen(!userSwitcherOpen)}
                className="h-8 px-2.5 rounded-lg text-[11px] font-semibold bg-white/5 text-white/80 hover:bg-white/10 flex items-center gap-2 ring-1 ring-white/5"
              >
                <span className="w-5 h-5 rounded bg-info-soft text-info-500 grid place-items-center text-[9px] font-bold">
                  {user?.name?.split(' ').map((p) => p[0]).slice(0, 2).join('') ?? '··'}
                </span>
                <span className="truncate max-w-[120px]">{user?.name ?? 'No user'}</span>
                <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
              </button>
              {userSwitcherOpen && (
                <div className="absolute right-0 top-full mt-1.5 w-[280px] bg-white border border-neutral-100 rounded-xl shadow-doe-xl p-1.5 z-50 text-ink-950">
                  <div className="px-2 py-1.5 text-[10px] uppercase tracking-wider text-neutral-500">Switch simulator user</div>
                  {inspectorUsers.map((u) => (
                    <button
                      key={u.id}
                      onClick={() => {
                        switchTo(u.id);
                        setUserSwitcherOpen(false);
                        navigate('/mobile');
                      }}
                      className={cn(
                        'w-full text-left flex items-center gap-2.5 px-2 py-2 rounded-lg hover:bg-neutral-50',
                        user?.id === u.id && 'bg-action-orange-soft',
                      )}
                    >
                      <div className="w-8 h-8 rounded-lg bg-info-soft text-info-500 grid place-items-center text-[10px] font-bold">
                        {u.name.split(' ').map((p) => p[0]).slice(0, 2).join('')}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-[12px] font-semibold truncate">{u.name}</div>
                        <div className="text-[10px] text-neutral-500 capitalize">{u.role.replace(/_/g, ' ')}</div>
                      </div>
                      <span className="text-[9.5px] font-mono text-neutral-400">{u.id}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
        </div>

        {/* ── Device area ── (double-tap the backdrop toggles the chrome) */}
        <div
          className="flex-1 min-h-0 relative"
          onClick={handleBackdropClick}
          onDoubleClick={handleBackdropDoubleClick}
        >
          {/* Backdrop pattern */}
          <div
            className="absolute inset-0 pointer-events-none opacity-[0.04]"
            style={{ backgroundImage: 'radial-gradient(circle at 25% 30%, #E89B4C 0%, transparent 50%), radial-gradient(circle at 75% 70%, #0E76A8 0%, transparent 50%)' }}
          />
          <DeviceFrame preset={preset} orientation={orientation}>
            {onMobileRoute ? children : (
              <DefaultEntryScreen onEnter={() => navigate('/mobile')} />
            )}
          </DeviceFrame>
        </div>

        {/* ── Simulator footer ── (hidden when chrome is collapsed) */}
        <div className={cn(
          'overflow-hidden transition-all duration-300',
          chromeHidden ? 'max-h-0 opacity-0 pointer-events-none' : 'max-h-[40px] opacity-100',
        )}>
        <div className="h-9 px-4 flex items-center justify-between text-[10px] uppercase tracking-[0.14em] text-white/45 bg-[#15181F] border-t border-white/5">
          <span>DoE PPS · Field Inspection &amp; Enforcement Simulator</span>
          <span>
            {activePreset.label} · {orientation === 'portrait' ? `${activePreset.width}×${activePreset.height}` : `${activePreset.height}×${activePreset.width}`} · {offline ? 'OUTBOX queueing' : 'real-time sync'}
          </span>
        </div>
        </div>

        {/* Hint pill — only visible when chrome is hidden, lets the user
            recover the simulator controls without remembering the gesture. */}
        {chromeHidden && (
          <button
            onClick={() => setChromeHidden(false)}
            className="fixed top-2 left-1/2 -translate-x-1/2 z-50 px-2.5 py-1 rounded-full bg-white/10 backdrop-blur ring-1 ring-white/15 text-[10px] uppercase tracking-[0.14em] text-white/65 hover:text-white"
            title="Double-tap the backdrop or click here"
          >
            ▲ Show simulator
          </button>
        )}
      </div>
    </Ctx.Provider>
  );
}

function DefaultEntryScreen({ onEnter }: { onEnter: () => void }) {
  return (
    <div className="h-full grid place-items-center p-6 text-center">
      <button onClick={onEnter} className="px-4 py-2 rounded-lg bg-doe-red text-white font-semibold text-[13px]">
        Open DoE PPS Inspection
      </button>
    </div>
  );
}

function BackIcon() {
  return <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5"/><polyline points="12 19 5 12 12 5"/></svg>;
}
