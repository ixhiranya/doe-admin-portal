import { useEffect, useMemo, useRef, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, LayersControl, ZoomControl, ScaleControl, CircleMarker, useMap } from 'react-leaflet';
import L from 'leaflet';
import { cn } from '../../lib/utils';
import { SITES_BY_PRODUCT } from '../../data/uaeEmirates';

// Loose marker shape so the map can render either the built-in product sites or
// a caller-supplied list (e.g. the Gasoline Infrastructure inventory). The popup
// shows whichever fields are present.
export interface MapMarker {
  name: string;
  coordinates: [number, number];   // [lon, lat]
  color: string;
  type?: string;
  emirate?: string;                 // location
  operator?: string;                // company
  status?: string;                  // operational status
  capacityKt?: number;
}

// Pan to + open the externally-selected marker so the table and map stay synced.
function SelectionSync({ index, sites, markerRefs }: { index: number | null | undefined; sites: MapMarker[]; markerRefs: React.MutableRefObject<Record<number, L.Marker>> }) {
  const map = useMap();
  useEffect(() => {
    if (index == null) return;
    const m = sites[index];
    if (!m) return;
    map.panTo([m.coordinates[1], m.coordinates[0]], { animate: true });
    setTimeout(() => markerRefs.current[index]?.openPopup(), 120);
  }, [index, sites, map, markerRefs]);
  return null;
}

function ResizeHandler({ initialBounds }: { initialBounds: [[number, number], [number, number]] }) {
  const map = useMap();
  useEffect(() => {
    let fitted = false;
    const tick = () => {
      map.invalidateSize();
      if (!fitted) {
        const size = map.getSize();
        if (size.x > 80 && size.y > 80) {
          map.fitBounds(initialBounds, { animate: false });
          fitted = true;
        }
      }
    };
    tick();
    const timers = [60, 240, 600, 1200, 2400].map((d) => setTimeout(tick, d));
    const ro = new ResizeObserver(() => map.invalidateSize());
    ro.observe(map.getContainer());
    return () => {
      timers.forEach(clearTimeout);
      ro.disconnect();
    };
  }, [map, initialBounds]);
  return null;
}

// Re-measure the map whenever it toggles between embedded and full-screen so the
// SAME Leaflet instance fills the new container size (preserving center / zoom /
// selected marker — nothing is remounted).
function InvalidateOnToggle({ token }: { token: unknown }) {
  const map = useMap();
  useEffect(() => {
    const t = setTimeout(() => map.invalidateSize(), 60);
    return () => clearTimeout(t);
  }, [map, token]);
  return null;
}

// ============================================================================
// Real tile-based UAE map (react-leaflet + OpenStreetMap / Esri tiles).
// Native zoom in/out, pan-by-drag, Streets / Satellite layer switcher, scale
// bar, marker clustering halos and rich popups — plus a full-screen overlay
// (the SAME instance is reused, so state is preserved on minimize).
// ============================================================================

function siteIcon(color: string, isHighlighted = false) {
  const size = isHighlighted ? 32 : 26;
  const ring = isHighlighted ? 4 : 3;
  return L.divIcon({
    className: 'pps-site-marker',
    html: `<div style="
      width:${size}px;height:${size}px;border-radius:50%;
      background:#fff;box-shadow:0 2px 6px rgba(0,0,0,0.20);
      display:grid;place-items:center;border:${ring}px solid ${color};
      "><div style="width:${size / 2.6}px;height:${size / 2.6}px;border-radius:50%;background:${color};"></div></div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -size / 2],
  });
}

const ABU_DHABI_BOUNDS: [[number, number], [number, number]] = [
  [22.2, 51.0],
  [26.3, 56.6],
];

// Legend swatches (colours unchanged — mirror the dashboard legend exactly).
const LEGEND: { color: string; label: string }[] = [
  { color: '#3D7A8C', label: 'ADNOC Distribution' },
  { color: '#E89B4C', label: 'ENOC / Emarat' },
  { color: '#10b981', label: 'Independent / TPI' },
  { color: '#0B0E12', label: 'Terminal / Depot' },
];

export function InfrastructureMap({ productLabel, height = 540, markers: markersProp, selectedIndex, onMarkerSelect }: { productLabel: string; height?: number; markers?: MapMarker[]; selectedIndex?: number | null; onMarkerSelect?: (i: number) => void }) {
  const markers = useMemo<MapMarker[]>(() => markersProp ?? SITES_BY_PRODUCT[productLabel] ?? SITES_BY_PRODUCT.Diesel, [markersProp, productLabel]);

  // Full-screen state: `expanded` controls the DOM/positioning, `shown` drives the
  // enter/exit transition (250–300ms). Two-phase so we animate in AND out.
  const [expanded, setExpanded] = useState(false);
  const [shown, setShown] = useState(false);
  const closeTimer = useRef<number | null>(null);

  // Marker pinning: hover opens a popup; clicking pins it open until another
  // marker is clicked. Refs let us close the previously-pinned popup imperatively.
  const markerRefs = useRef<Record<number, L.Marker>>({});
  const pinnedRef = useRef<number | null>(null);

  // Last-refreshed stamp for the full-screen header (set once on mount).
  const [refreshedAt] = useState(() =>
    new Date().toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
  );

  function open() {
    if (closeTimer.current) { clearTimeout(closeTimer.current); closeTimer.current = null; }
    setExpanded(true);
    requestAnimationFrame(() => requestAnimationFrame(() => setShown(true)));
  }
  function close() {
    setShown(false);
    closeTimer.current = window.setTimeout(() => setExpanded(false), 280);
  }

  // ESC closes the full-screen overlay.
  useEffect(() => {
    if (!expanded) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [expanded]);

  const markerHandlers = (i: number) => ({
    mouseover: () => markerRefs.current[i]?.openPopup(),
    mouseout: () => { if (pinnedRef.current !== i) markerRefs.current[i]?.closePopup(); },
    click: () => {
      const prev = pinnedRef.current;
      if (prev != null && prev !== i) markerRefs.current[prev]?.closePopup();
      pinnedRef.current = i;
      markerRefs.current[i]?.openPopup();
      onMarkerSelect?.(i);   // sync the table selection
    },
  });

  return (
    <>
      {/* Placeholder keeps the dashboard layout height while the map is lifted out. */}
      {expanded && <div style={{ height }} className="rounded-lg border border-neutral-100 bg-neutral-50/60" aria-hidden />}

      {/* Dimmed backdrop (below the app header). */}
      {expanded && (
        <div
          onClick={close}
          className={cn('fixed left-0 right-0 bottom-0 top-16 z-[1000] bg-ink-950/40 transition-opacity duration-[270ms] ease-out', shown ? 'opacity-100' : 'opacity-0')}
        />
      )}

      {/* The map shell — the SAME node toggles between embedded and full-screen so
          the Leaflet instance (and its zoom / center / selected marker) survives. */}
      <div
        className={cn(
          'flex flex-col bg-white',
          expanded
            ? cn('fixed left-4 right-4 top-20 bottom-4 z-[1001] rounded-2xl shadow-doe-xl border border-neutral-200 overflow-hidden transition-[opacity,transform] duration-[270ms] ease-out',
                shown ? 'opacity-100 scale-100' : 'opacity-0 scale-[0.985]')
            : 'rounded-lg overflow-hidden border border-neutral-100 relative',
        )}
        style={expanded ? undefined : { height }}
      >
        {/* Full-screen header: title · sites badge · last refreshed · minimise. */}
        {expanded && (
          <div className="flex items-center justify-between gap-4 px-5 py-3.5 border-b border-neutral-100 flex-shrink-0">
            <div className="flex items-center gap-3 flex-wrap">
              <h3 className="font-display text-[16px] font-bold text-ink-950">{productLabel} Infrastructure</h3>
              <span className="inline-flex items-center h-6 px-2.5 rounded-full text-[11px] font-semibold bg-[#3D7A8C]/12 text-[#2C5C6B] tabular-nums">{markers.length} Sites</span>
              <span className="text-[11.5px] text-neutral-500">Last refreshed <strong className="text-neutral-700 font-medium">{refreshedAt}</strong></span>
            </div>
            <button
              onClick={close}
              className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-lg border border-neutral-200 text-[12.5px] font-semibold text-neutral-700 hover:bg-neutral-50 transition"
            >
              <MinimizeIcon /> Minimize
            </button>
          </div>
        )}

        {/* Full-screen legend row (kept at the top). */}
        {expanded && (
          <div className="flex items-center gap-4 px-5 py-2.5 border-b border-neutral-100 flex-shrink-0 flex-wrap text-[11px] text-neutral-600">
            {LEGEND.map((l) => (
              <span key={l.label} className="inline-flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full" style={{ background: l.color }} />
                {l.label}
              </span>
            ))}
          </div>
        )}

        {/* Map area — fills whatever space the shell provides. */}
        <div className="relative flex-1 min-h-0">
          {!expanded && (
            <button
              onClick={open}
              title="Expand to full screen"
              aria-label="Expand map to full screen"
              className="absolute top-3 right-[52px] z-[1000] w-9 h-9 rounded-lg bg-white/95 border border-neutral-200 shadow-doe-sm grid place-items-center text-neutral-600 hover:text-ink-950 hover:bg-white transition"
            >
              <ExpandIcon />
            </button>
          )}

          <MapContainer
            bounds={ABU_DHABI_BOUNDS}
            scrollWheelZoom={!expanded ? false : true}
            zoomControl={false}
            style={{ width: '100%', height: '100%' }}
            maxBounds={[[20.5, 49.0], [27.5, 58.5]]}
            minZoom={6}
            maxZoom={14}
          >
            <LayersControl position="topright">
              <LayersControl.BaseLayer checked name="Streets">
                <TileLayer attribution="&copy; OpenStreetMap" url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
              </LayersControl.BaseLayer>
              <LayersControl.BaseLayer name="Satellite">
                <TileLayer attribution="Tiles &copy; Esri" url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}" />
              </LayersControl.BaseLayer>
              <LayersControl.BaseLayer name="Light">
                <TileLayer attribution="&copy; CARTO &copy; OpenStreetMap" url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png" subdomains="abcd" />
              </LayersControl.BaseLayer>
            </LayersControl>

            <ZoomControl position="topleft" />
            <ScaleControl position="bottomleft" imperial={false} />
            <ResizeHandler initialBounds={ABU_DHABI_BOUNDS} />
            <InvalidateOnToggle token={`${expanded}-${shown}`} />
            <SelectionSync index={selectedIndex} sites={markers} markerRefs={markerRefs} />

            {markers.map((m, i) => (
              <Marker
                key={i}
                position={[m.coordinates[1], m.coordinates[0]]}
                icon={siteIcon(m.color, selectedIndex === i)}
                zIndexOffset={selectedIndex === i ? 1000 : 0}
                ref={(ref) => { if (ref) markerRefs.current[i] = ref; }}
                eventHandlers={markerHandlers(i)}
              >
                <Popup autoClose={false} closeOnClick={false}>
                  <SitePopup marker={m} />
                </Popup>
              </Marker>
            ))}

            {/* Soft halo behind each marker for added visual weight at low zoom */}
            {markers.map((m, i) => (
              <CircleMarker
                key={`halo-${i}`}
                center={[m.coordinates[1], m.coordinates[0]]}
                radius={14}
                pathOptions={{ color: m.color, weight: 0, fillColor: m.color, fillOpacity: 0.08 }}
                interactive={false}
              />
            ))}
          </MapContainer>
        </div>
      </div>
    </>
  );
}

function SitePopup({ marker }: { marker: MapMarker }) {
  return (
    <div style={{ minWidth: 200 }}>
      <div style={{ fontWeight: 600, fontSize: 13.5 }}>{marker.name}</div>
      <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 9.5, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgba(255,255,255,0.6)', marginTop: 2 }}>
        {marker.type}{marker.emirate ? ` · ${marker.emirate}` : ''}
      </div>
      <div style={{ marginTop: 8, lineHeight: 1.5 }}>
        {marker.operator && <div><span style={{ color: 'rgba(255,255,255,0.5)' }}>Company:</span> {marker.operator}</div>}
        {marker.status && <div><span style={{ color: 'rgba(255,255,255,0.5)' }}>Status:</span> {marker.status}</div>}
        {marker.capacityKt != null && (
          <div><span style={{ color: 'rgba(255,255,255,0.5)' }}>Capacity:</span> {marker.capacityKt.toLocaleString()} <span style={{ color: 'rgba(255,255,255,0.5)' }}>kt/yr</span></div>
        )}
        <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10.5, marginTop: 2, color: 'rgba(255,255,255,0.7)' }}>
          {marker.coordinates[1].toFixed(3)}° N · {marker.coordinates[0].toFixed(3)}° E
        </div>
      </div>
    </div>
  );
}

function ExpandIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="15 3 21 3 21 9" /><polyline points="9 21 3 21 3 15" /><line x1="21" y1="3" x2="14" y2="10" /><line x1="3" y1="21" x2="10" y2="14" />
    </svg>
  );
}
function MinimizeIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="4 14 10 14 10 20" /><polyline points="20 10 14 10 14 4" /><line x1="14" y1="10" x2="21" y2="3" /><line x1="3" y1="21" x2="10" y2="14" />
    </svg>
  );
}
