import { useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, LayersControl, ZoomControl, ScaleControl, Marker, Popup, Tooltip, useMap } from 'react-leaflet';
import L from 'leaflet';
import { Link } from 'react-router-dom';
import type { Building360 } from '../../services/buildings';
import { CertTriad } from './CertBadge';

const ABU_DHABI_BOUNDS: [[number, number], [number, number]] = [
  [22.5, 51.0],
  [26.3, 56.6],
];

const LEVEL_COLOR: Record<Building360['complianceLevel'], string> = {
  green: '#22A745',
  amber: '#D97706',
  red:   '#DC2626',
};

function buildingIcon(level: Building360['complianceLevel'], score: number, highlighted = false) {
  const color = LEVEL_COLOR[level];
  const size = highlighted ? 40 : 34;
  return L.divIcon({
    className: 'b360-marker',
    html: `<div style="
      position:relative;width:${size}px;height:${size}px;
    ">
      <div style="
        position:absolute;inset:0;border-radius:50%;
        background:#fff;box-shadow:0 4px 10px rgba(0,0,0,0.18);
        border:3px solid ${color};
        display:grid;place-items:center;
        font-family:'Inter Tight',Inter,sans-serif;
        font-weight:800;font-size:${size / 3}px;color:${color};
        ">${score}</div>
      <div style="
        position:absolute;left:50%;top:100%;transform:translateX(-50%);
        width:0;height:0;
        border-left:6px solid transparent;border-right:6px solid transparent;
        border-top:8px solid ${color};
        "></div>
    </div>`,
    iconSize: [size, size + 8],
    iconAnchor: [size / 2, size + 8],
    popupAnchor: [0, -size],
    tooltipAnchor: [size / 2 + 4, -size / 2],
  });
}

// Resize handler — invalidates size and re-fits initialBounds once the
// container has real dimensions. Without the refit, a map that mounted
// inside a hidden/zero-size container stays zoomed to that ghost size, so
// only a tiny patch of tiles loads in the corner even after resizing.
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

export function BuildingMap({ buildings, height = 560 }: { buildings: Building360[]; height?: number }) {
  const located = useMemo(() => buildings.filter((b) => b.coordinates), [buildings]);
  const counts = useMemo(() => ({
    green: buildings.filter((b) => b.complianceLevel === 'green').length,
    amber: buildings.filter((b) => b.complianceLevel === 'amber').length,
    red:   buildings.filter((b) => b.complianceLevel === 'red').length,
  }), [buildings]);

  return (
    <div className="rounded-xl overflow-hidden border border-neutral-100 shadow-doe-sm relative bg-white" style={{ height, width: '100%' }}>
      <MapContainer
        bounds={ABU_DHABI_BOUNDS}
        scrollWheelZoom={false}
        zoomControl={false}
        style={{ width: '100%', height: '100%' }}
        maxBounds={[[20.5, 49.0], [27.5, 58.5]]}
        minZoom={7}
        maxZoom={17}
        worldCopyJump={false}
      >
        <LayersControl position="topright">
          <LayersControl.BaseLayer checked name="Map">
            <TileLayer
              attribution='&copy; OpenStreetMap'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              keepBuffer={4}
            />
          </LayersControl.BaseLayer>
          <LayersControl.BaseLayer name="Satellite">
            <TileLayer
              attribution='Tiles &copy; Esri'
              url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
              keepBuffer={4}
            />
          </LayersControl.BaseLayer>
          <LayersControl.BaseLayer name="Voyager">
            <TileLayer
              attribution='&copy; CARTO &copy; OpenStreetMap'
              url="https://{s}.basemaps.cartocdn.com/voyager/{z}/{x}/{y}{r}.png"
              subdomains="abcd"
              keepBuffer={4}
            />
          </LayersControl.BaseLayer>
          <LayersControl.BaseLayer name="Light">
            <TileLayer
              attribution='&copy; CARTO &copy; OpenStreetMap'
              url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
              subdomains="abcd"
              keepBuffer={4}
            />
          </LayersControl.BaseLayer>
        </LayersControl>

        <ZoomControl position="topleft" />
        <ScaleControl position="bottomleft" imperial={false} />
        <ResizeHandler initialBounds={ABU_DHABI_BOUNDS} />

        {located.map((b) => (
          <Marker
            key={b.id}
            position={[b.coordinates!.lat, b.coordinates!.lng]}
            icon={buildingIcon(b.complianceLevel, b.complianceScore)}
          >
            <Tooltip
              direction="top"
              offset={[0, -40]}
              opacity={1}
              className="b360-tooltip"
              sticky={false}
            >
              <HoverCard b={b} />
            </Tooltip>
            <Popup minWidth={300} closeButton={false} className="b360-popup-wrap">
              <div className="font-sans">
                <div className="text-[9.5px] font-sans uppercase tracking-[0.18em] text-neutral-500">
                  {b.premisesType ?? 'Premises'} · {b.city}
                </div>
                <div className="font-display font-bold text-[14px] text-ink-950 leading-snug mt-0.5">{b.name}</div>
                <div className="text-[11px] text-neutral-500 mt-0.5 font-mono">{b.premisesNumber}</div>
                <div className="mt-2">
                  <CertTriad coc={b.coc} noc={b.noc} amc={b.amc} compact />
                </div>
                {b.gasInstallContractor && (
                  <div className="mt-2 text-[11px] text-neutral-700">
                    <span className="text-neutral-500">Installer: </span>{b.gasInstallContractor}
                  </div>
                )}
                {b.gasAmcContractor && (
                  <div className="text-[11px] text-neutral-700">
                    <span className="text-neutral-500">AMC: </span>{b.gasAmcContractor}
                  </div>
                )}
                <Link
                  to={`/buildings/${b.id}`}
                  className="inline-flex items-center gap-1 mt-2.5 px-3 py-1.5 rounded-md bg-doe-red text-white text-[11.5px] font-semibold hover:bg-doe-red-dark"
                >
                  Open Building 360 →
                </Link>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>

      {/* Legend overlay */}
      <div className="absolute bottom-4 right-4 bg-white/95 backdrop-blur rounded-lg shadow-doe-md border border-neutral-100 p-3 z-[1000]">
        <div className="text-[9.5px] font-sans uppercase tracking-[0.18em] text-neutral-500 mb-2">Compliance Snapshot</div>
        <div className="space-y-1.5 text-[11.5px]">
          <LegendRow color="#22A745" label="Fully compliant" count={counts.green} />
          <LegendRow color="#D97706" label="Partial coverage" count={counts.amber} />
          <LegendRow color="#DC2626" label="Action required" count={counts.red} />
        </div>
        <div className="mt-2 pt-2 border-t border-neutral-100 text-[10px] text-neutral-500">
          {located.length} of {buildings.length} located
        </div>
      </div>
    </div>
  );
}

// Compact hover card content. Rendered inside a Leaflet Tooltip — uses a
// minimum of layout fanciness because Leaflet renders the tooltip in a
// floating popper.
function HoverCard({ b }: { b: Building360 }) {
  const levelDot = LEVEL_COLOR[b.complianceLevel];
  const levelLabel =
    b.complianceLevel === 'green' ? 'Fully Compliant' :
    b.complianceLevel === 'amber' ? 'Partial Coverage' :
                                     'Action Required';
  return (
    <div className="b360-hover-card" style={{ minWidth: 240, padding: 0 }}>
      <div style={{ fontSize: 9, letterSpacing: 2, textTransform: 'uppercase', color: '#6B7280', fontWeight: 600 }}>
        {b.premisesType ?? 'Premises'} · {b.city ?? '—'}
      </div>
      <div style={{ fontSize: 13.5, fontWeight: 800, color: '#2E2A22', marginTop: 2, lineHeight: 1.25 }}>{b.name}</div>
      <div style={{ fontSize: 10.5, color: '#6B7280', marginTop: 2, fontFamily: 'JetBrains Mono, monospace' }}>{b.premisesNumber}</div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8 }}>
        <span style={{ width: 8, height: 8, borderRadius: 999, background: levelDot, display: 'inline-block' }} />
        <span style={{ fontSize: 11, fontWeight: 700, color: levelDot }}>{b.complianceScore} · {levelLabel}</span>
      </div>

      <div style={{ marginTop: 8, display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 4 }}>
        <CertMini cert={b.coc} />
        <CertMini cert={b.noc} />
        <CertMini cert={b.amc} />
      </div>

      <div style={{ marginTop: 8, fontSize: 10.5, color: '#6B7280', fontStyle: 'italic' }}>Click marker for details →</div>
    </div>
  );
}

function CertMini({ cert }: { cert: Building360['coc'] }) {
  const color =
    cert.status === 'active'   ? '#22A745' :
    cert.status === 'expiring' ? '#D97706' :
    cert.status === 'pending'  ? '#0E76A8' :
    cert.status === 'expired'  ? '#DC2626' :
    cert.status === 'rejected' ? '#DC2626' :
    cert.status === 'cancelled'? '#93938B' :
                                  '#B8B8B0';
  const label =
    cert.status === 'active'   ? 'Active' :
    cert.status === 'expiring' ? 'Expiring' :
    cert.status === 'pending'  ? 'Pending' :
    cert.status === 'expired'  ? 'Expired' :
    cert.status === 'rejected' ? 'Rejected' :
    cert.status === 'cancelled'? 'Cancelled' :
                                  'None';
  return (
    <div style={{ padding: '4px 6px', borderRadius: 4, border: `1px solid ${color}33`, background: `${color}10` }}>
      <div style={{ fontSize: 8.5, letterSpacing: 1, fontWeight: 800, color, fontFamily: 'JetBrains Mono, monospace' }}>
        {cert.module.toUpperCase()}
      </div>
      <div style={{ fontSize: 10, fontWeight: 600, color: '#2E2A22', marginTop: 1 }}>{label}</div>
    </div>
  );
}

function LegendRow({ color, label, count }: { color: string; label: string; count: number }) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="w-3 h-3 rounded-full border-2" style={{ borderColor: color, background: '#fff' }} />
      <span className="flex-1 text-ink-950">{label}</span>
      <span className="font-mono font-bold text-ink-950">{count}</span>
    </div>
  );
}
