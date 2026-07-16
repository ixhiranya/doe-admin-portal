import { useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Tooltip, useMap } from 'react-leaflet';
import L from 'leaflet';
import { Link } from 'react-router-dom';
import { type GasAsset, sourceLabel, formatLiters } from '../../services/gasRegister/assets';

// Asset map — same UAE bounds + resize handler pattern as BuildingMap, but
// with simpler markers (no popups; clicking a marker jumps to the detail page).

const UAE_BOUNDS: [[number, number], [number, number]] = [
  [22.5, 51.0],
  [26.3, 56.6],
];

const SOURCE_COLOR: Record<GasAsset['source'], string> = {
  asateel:          '#0E76A8',
  petroleum_permit: '#E89B4C',
  manual:           '#93938B',
};

function pinIcon(color: string, count: number) {
  return L.divIcon({
    className: 'asset-pin',
    html: `<div style="
      position:relative;width:30px;height:30px;
      ">
      <div style="
        width:30px;height:30px;border-radius:50%;
        background:#fff;box-shadow:0 4px 10px rgba(0,0,0,0.18);
        border:3px solid ${color};
        display:grid;place-items:center;
        font-family:'Inter Tight',Inter,sans-serif;
        font-weight:800;font-size:11px;color:${color};
        ">${count}</div>
    </div>`,
    iconSize: [30, 30],
    iconAnchor: [15, 15],
    tooltipAnchor: [15, 0],
  });
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
    return () => { timers.forEach(clearTimeout); ro.disconnect(); };
  }, [map, initialBounds]);
  return null;
}

export function AssetMap({ assets, height = 560 }: { assets: GasAsset[]; height?: number }) {
  // Group by permit holder so colours cluster well at low zoom
  const total = assets.length;
  const totalCapacity = useMemo(() => assets.reduce((s, a) => s + a.totalCapacityLiters, 0), [assets]);

  return (
    <div className="relative rounded-xl overflow-hidden border border-neutral-100 shadow-doe-sm bg-white" style={{ height, width: '100%' }}>
      <MapContainer
        bounds={UAE_BOUNDS}
        scrollWheelZoom={false}
        zoomControl
        style={{ width: '100%', height: '100%' }}
        maxBounds={[[20.5, 49.0], [27.5, 58.5]]}
        minZoom={7}
        maxZoom={17}
      >
        <TileLayer
          attribution='&copy; OpenStreetMap'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          keepBuffer={4}
        />
        <ResizeHandler initialBounds={UAE_BOUNDS} />
        {assets.map((a) => (
          <Marker
            key={a.id}
            position={[a.coordinates.lat, a.coordinates.lng]}
            icon={pinIcon(SOURCE_COLOR[a.source], a.storageMethods.length)}
            eventHandlers={{
              click: () => { window.location.href = `/gas-register/assets/${a.id}`; },
            }}
          >
            <Tooltip direction="top" offset={[0, -10]} opacity={1} className="asset-tooltip">
              <div style={{ minWidth: 220, padding: 2 }}>
                <div style={{ fontSize: 9, letterSpacing: 2, textTransform: 'uppercase', color: '#6B7280', fontWeight: 600 }}>
                  {a.permitHolderName}
                </div>
                <div style={{ fontSize: 13, fontWeight: 800, color: '#2E2A22', marginTop: 2, lineHeight: 1.25 }}>{a.facilityName}</div>
                <div style={{ fontSize: 11, color: '#6B7280', marginTop: 3, fontFamily: 'JetBrains Mono, monospace' }}>{a.id} · {a.area}, {a.city}</div>
                <div style={{ marginTop: 6, fontSize: 11.5, color: '#2E2A22' }}>
                  <strong>{formatLiters(a.totalCapacityLiters)}</strong> · {sourceLabel(a.source)}
                </div>
                <div style={{ marginTop: 6, fontSize: 10, color: '#6B7280', fontStyle: 'italic' }}>Click marker to open →</div>
              </div>
            </Tooltip>
          </Marker>
        ))}
      </MapContainer>

      {/* Legend + summary */}
      <div className="absolute bottom-4 right-4 bg-white/95 backdrop-blur rounded-lg shadow-doe-md border border-neutral-100 p-3 z-[1000] min-w-[200px]">
        <div className="text-[9.5px] font-sans uppercase tracking-[0.18em] text-neutral-500 mb-2">Asset distribution</div>
        <div className="space-y-1.5 text-[11px]">
          <LegendRow color={SOURCE_COLOR.asateel}          label="Asateel"          count={assets.filter((a) => a.source === 'asateel').length} />
          <LegendRow color={SOURCE_COLOR.petroleum_permit} label="Petroleum permit" count={assets.filter((a) => a.source === 'petroleum_permit').length} />
          <LegendRow color={SOURCE_COLOR.manual}           label="Manual entry"     count={assets.filter((a) => a.source === 'manual').length} />
        </div>
        <div className="mt-2 pt-2 border-t border-neutral-100 text-[10.5px] text-neutral-500">
          <span className="font-mono">{total}</span> assets · <span className="font-mono">{formatLiters(totalCapacity)}</span>
        </div>
      </div>

      {/* Hidden link target for click navigation — react-leaflet's `eventHandlers.click`
          uses location.href, which forces a full reload. Use Link instead for SPA nav
          via document delegation: a single hidden link rendered for each asset. */}
      <div style={{ display: 'none' }}>
        {assets.map((a) => <Link key={a.id} to={`/gas-register/assets/${a.id}`}>{a.id}</Link>)}
      </div>
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
