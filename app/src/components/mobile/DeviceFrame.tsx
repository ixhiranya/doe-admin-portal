import { type ReactNode, useState, useLayoutEffect, useRef } from 'react';
import { cn } from '../../lib/utils';

// ============================================================================
// DeviceFrame — wraps the mobile inspection app inside a realistic device
// bezel (notch, status bar, home indicator) so the demo audience experiences
// the field-app the way an inspector would.
//
// The simulator chrome around the device frame lets the user toggle device
// preset (iPhone 14, iPhone SE, iPad Mini, iPad Pro), orientation, and a
// "scaling" mode for very tall windows. The frame is intentionally CSS-only
// so we don't pull in any react-device-frame library.
// ============================================================================

export type DevicePreset = 'iphone17' | 'iphone14' | 'iphoneSE' | 'ipadMini' | 'ipadPro11' | 'ipadPro13';
export type Orientation = 'portrait' | 'landscape';

interface PresetSpec {
  id: DevicePreset;
  label: string;
  shortLabel: string;
  // Logical pixel dimensions (portrait — landscape swaps).
  width: number;
  height: number;
  bezel: number;
  radius: number;
  hasNotch: boolean;        // legacy notch
  hasDynamicIsland: boolean;
  category: 'mobile' | 'tablet';
}

export const PRESETS: PresetSpec[] = [
  // iPhone 17 Pro — Dynamic Island, edge-to-edge, 6.3" display (2026 flagship)
  { id: 'iphone17',  label: 'iPhone 17 Pro',  shortLabel: '17 Pro', width: 402, height: 874,  bezel: 12, radius: 54, hasNotch: false, hasDynamicIsland: true,  category: 'mobile' },
  // iPhone 14 Pro — kept as reference
  { id: 'iphone14',  label: 'iPhone 14 Pro',  shortLabel: '14 Pro', width: 393, height: 852,  bezel: 14, radius: 50, hasNotch: false, hasDynamicIsland: true,  category: 'mobile' },
  // iPhone SE — compact, has Home button + Touch ID
  { id: 'iphoneSE',  label: 'iPhone SE',      shortLabel: 'SE',     width: 375, height: 667,  bezel: 16, radius: 32, hasNotch: false, hasDynamicIsland: false, category: 'mobile' },
  // iPad mini 6th gen
  { id: 'ipadMini',  label: 'iPad mini',      shortLabel: 'mini',   width: 744, height: 1133, bezel: 18, radius: 38, hasNotch: false, hasDynamicIsland: false, category: 'tablet' },
  // iPad Pro 11" M4
  { id: 'ipadPro11', label: 'iPad Pro 11"',   shortLabel: 'Pro 11', width: 834, height: 1194, bezel: 18, radius: 34, hasNotch: false, hasDynamicIsland: false, category: 'tablet' },
  // iPad Pro 12.9" M4 — largest field-team tablet
  { id: 'ipadPro13', label: 'iPad Pro 13"',   shortLabel: 'Pro 13', width: 1024,height: 1366, bezel: 18, radius: 34, hasNotch: false, hasDynamicIsland: false, category: 'tablet' },
];

export function getPreset(id: DevicePreset): PresetSpec {
  return PRESETS.find((p) => p.id === id) ?? PRESETS[0];
}

interface DeviceFrameProps {
  preset: DevicePreset;
  orientation: Orientation;
  carrierLabel?: string;
  children: ReactNode;
}

export function DeviceFrame({ preset, orientation, carrierLabel = 'DoE PPS', children }: DeviceFrameProps) {
  const spec = getPreset(preset);
  const portrait = orientation === 'portrait';
  const w = portrait ? spec.width : spec.height;
  const h = portrait ? spec.height : spec.width;
  const isMobile = spec.category === 'mobile';

  // Determine if we need to scale down so the device fits the available
  // viewport. We measure the surrounding container after mount and on every
  // resize, then derive the scale from those dimensions. We start at scale=1
  // and reduce only when needed so the device never renders at scale=0.
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [scale, setScale] = useState(1);

  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const compute = () => {
      const cw = el.clientWidth;
      const ch = el.clientHeight;
      if (!cw || !ch) return;
      const frameW = w + spec.bezel * 2;
      const frameH = h + spec.bezel * 2;
      const s = Math.min(1, (cw - 32) / frameW, (ch - 32) / frameH);
      setScale(s > 0 ? s : 1);
    };
    compute();
    const ro = new ResizeObserver(compute);
    ro.observe(el);
    return () => ro.disconnect();
  }, [w, h, spec.bezel]);

  const time = formatClock(new Date());

  // iPhone SE uses the legacy Home button layout — larger top/bottom bezels,
  // round Home button, no Dynamic Island.
  const hasHomeButton = spec.id === 'iphoneSE';
  // Modern devices need extra space at the top for the Dynamic Island.
  const statusBarHeight = isMobile ? (spec.hasDynamicIsland ? 52 : hasHomeButton ? 24 : 44) : 28;
  const homeIndicatorHeight = isMobile && !hasHomeButton ? 24 : 0;
  const homeButtonHeight = hasHomeButton ? 0 : 0; // home button is OUTSIDE the screen, in bezel

  return (
    <div ref={containerRef} className="w-full h-full grid place-items-center p-5 overflow-auto">
      <div
        className="relative"
        style={{
          width: w + spec.bezel * 2,
          height: h + spec.bezel * 2 + (hasHomeButton ? 56 : 0),
          transform: `scale(${scale})`,
          transformOrigin: 'center center',
        }}
      >
        {/* Side buttons (volume, power) — pure decoration */}
        {isMobile && !hasHomeButton && (
          <>
            <span className="absolute -left-[3px] top-[110px] w-[3px] h-[30px] bg-[#2A2E37] rounded-l" />
            <span className="absolute -left-[3px] top-[160px] w-[3px] h-[58px] bg-[#2A2E37] rounded-l" />
            <span className="absolute -left-[3px] top-[228px] w-[3px] h-[58px] bg-[#2A2E37] rounded-l" />
            <span className="absolute -right-[3px] top-[180px] w-[3px] h-[92px] bg-[#2A2E37] rounded-r" />
          </>
        )}
        {/* Device chassis */}
        <div
          className="relative"
          style={{
            width: w + spec.bezel * 2,
            height: h + spec.bezel * 2,
            borderRadius: spec.radius + spec.bezel,
            padding: spec.bezel,
            background: 'linear-gradient(160deg, #2A2E37 0%, #14161B 35%, #0A0B0F 100%)',
            boxShadow: '0 38px 80px rgba(15,23,42,0.45), 0 12px 24px rgba(15,23,42,0.25), inset 0 0 0 1px rgba(255,255,255,0.04)',
          }}
        >
          {/* Inner brushed-aluminum ring */}
          <div
            className="absolute pointer-events-none"
            style={{
              inset: spec.bezel * 0.4,
              borderRadius: spec.radius + spec.bezel * 0.6,
              boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.08), inset 0 1px 0 rgba(255,255,255,0.05)',
            }}
          />
          {/* Screen */}
          <div
            className="relative overflow-hidden bg-white"
            style={{ width: w, height: h, borderRadius: spec.radius }}
          >
            {/* Status bar */}
            <div
              className={cn(
                'absolute inset-x-0 top-0 z-30 flex items-center justify-between text-[12.5px] font-semibold text-ink-950 pointer-events-none',
              )}
              style={{
                paddingLeft: spec.hasDynamicIsland ? 28 : isMobile ? 22 : 18,
                paddingRight: spec.hasDynamicIsland ? 28 : isMobile ? 22 : 18,
                height: statusBarHeight,
                paddingTop: spec.hasDynamicIsland ? 14 : 4,
              }}
            >
              <div className="flex items-center gap-1.5">
                <span style={{ letterSpacing: '-0.3px' }}>{time}</span>
              </div>
              <div className="flex items-center gap-1.5 text-ink-950">
                <SignalIcon />
                <WifiIcon />
                <BatteryIcon />
              </div>
            </div>

            {/* Dynamic Island (iPhone 14/17 Pro) */}
            {spec.hasDynamicIsland && (
              <div
                className="absolute left-1/2 -translate-x-1/2 z-40 bg-black rounded-full flex items-center justify-end"
                style={{ top: 11, width: 124, height: 36, paddingRight: 8 }}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-[#3a3a3a]" />
              </div>
            )}
            {/* Legacy notch (kept for compatibility if ever toggled) */}
            {spec.hasNotch && (
              <div
                className="absolute left-1/2 -translate-x-1/2 top-0 bg-black rounded-b-2xl z-40"
                style={{ width: 156, height: 28 }}
              />
            )}

            {/* Scrollable screen content */}
            <div
              className="absolute inset-0 overflow-hidden flex flex-col"
              style={{
                paddingTop: statusBarHeight,
                paddingBottom: homeIndicatorHeight,
              }}
            >
              <div className="flex-1 min-h-0 overflow-y-auto bg-[#F5F6FA]">
                {children}
              </div>
            </div>

            {/* Home indicator (iOS, modern) */}
            {isMobile && !hasHomeButton && (
              <div
                className="absolute left-1/2 -translate-x-1/2 bg-ink-950/85 rounded-full z-30"
                style={{ bottom: 8, width: 134, height: 5 }}
              />
            )}
          </div>
        </div>

        {/* Home button on the chassis (iPhone SE only) */}
        {hasHomeButton && (
          <div className="absolute left-1/2 -translate-x-1/2" style={{ bottom: 8 }}>
            <span
              className="block rounded-full"
              style={{
                width: 42,
                height: 42,
                background: 'radial-gradient(circle at 35% 30%, #3a3e47 0%, #1d2027 70%)',
                boxShadow: 'inset 0 0 0 2px rgba(255,255,255,0.08), inset 0 0 12px rgba(0,0,0,0.6)',
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
}

function formatClock(d: Date): string {
  const hh = d.getHours();
  const mm = d.getMinutes();
  return `${hh}:${String(mm).padStart(2, '0')}`;
}

function SignalIcon() {
  return (
    <svg width="14" height="10" viewBox="0 0 18 12" fill="currentColor">
      <rect x="0"  y="8" width="3" height="4" rx="0.5" />
      <rect x="5"  y="6" width="3" height="6" rx="0.5" />
      <rect x="10" y="3" width="3" height="9" rx="0.5" />
      <rect x="15" y="0" width="3" height="12" rx="0.5" />
    </svg>
  );
}
function WifiIcon() {
  return (
    <svg width="14" height="10" viewBox="0 0 20 14" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
      <path d="M2 5a12 12 0 0 1 16 0" /> <path d="M5 8.5a8 8 0 0 1 10 0" /> <path d="M8 12a4 4 0 0 1 4 0" />
    </svg>
  );
}
function BatteryIcon() {
  return (
    <svg width="22" height="10" viewBox="0 0 26 12" fill="none">
      <rect x="0.5" y="0.5" width="22" height="11" rx="2.5" stroke="currentColor" />
      <rect x="2"   y="2"   width="14" height="8"  rx="1" fill="currentColor" />
      <rect x="23"  y="4"   width="2"  height="4"  rx="0.5" fill="currentColor" />
    </svg>
  );
}
