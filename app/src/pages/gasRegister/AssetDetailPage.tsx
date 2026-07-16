// =============================================================================
// Gas Register · BN 3 — Asset Detail
// -----------------------------------------------------------------------------
// Migrated to the shared ModuleDetailLayout. Preserves all BN 3 detail:
//   • 4 KPI tiles (Total capacity · Storage methods · Gas types · Last inspected)
//   • Gas types list
//   • Safety measures bulleted list
//   • Storage methods table (dual L + SCM not in seed yet but room left)
//   • Owner + Operator stakeholders with role-coloured side accent
//   • Inspection panel (authority, last, next due)
//   • Map of premises
// =============================================================================
import { useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, useMap } from 'react-leaflet';
import L from 'leaflet';
import {
  getAsset, sourceLabel, storageTypeLabel, formatLiters,
  type Person,
} from '../../services/gasRegister/assets';
import { ModuleDetailLayout, DetailCard, Field, FieldGrid } from './ModuleDetailLayout';
import { cn } from '../../lib/utils';

export function AssetDetailPage() {
  const { assetId } = useParams<{ assetId: string }>();
  const a = useMemo(() => assetId ? getAsset(assetId) : undefined, [assetId]);
  const navigate = useNavigate();

  if (!a) {
    return (
      <div className="min-h-screen bg-neutral-25 grid place-items-center">
        <div className="card p-10 text-center">
          <div className="text-4xl mb-2">🔎</div>
          <div className="font-display font-bold text-[15px] text-ink-950">Asset not found</div>
          <button onClick={() => navigate('/gas-register/assets')} className="mt-4 btn-primary">Back to register</button>
        </div>
      </div>
    );
  }

  const daysSinceIns = Math.floor((Date.now() - new Date(a.dateOfInspection).getTime()) / 86_400_000);
  const nextIns = new Date(new Date(a.dateOfInspection).getTime() + 365 * 86_400_000);
  const sameStakeholder = a.owner.emiratesId === a.operator.emiratesId;
  const inspectionTone: 'ink' | 'warning' | 'danger' =
    daysSinceIns > 365 ? 'danger' : daysSinceIns > 300 ? 'warning' : 'ink';

  return (
    <ModuleDetailLayout
      parentLabel="Asset Master" parentHref="/gas-register/assets"
      current={a.facilityName} sddRef="BN 3 · Gas Register SDD"
      iconText={initials(a.facilityName)} iconAccent="#7B3FE4"
      eyebrow={`${a.permitHolderName} · Storage facility`}
      title={a.facilityName}
      subtitle={`${a.detailedAddress} · ${a.area}, ${a.city}`}
      status={{ label: sourceLabel(a.source), tone: a.source === 'asateel' ? 'info' : a.source === 'petroleum_permit' ? 'warning' : 'neutral' }}
      meta={
        <>
          <span className="font-mono text-white/70">{a.id}</span>
          <span className="text-white/40">·</span>
          <span className="text-white/70">{a.coordinates.lat.toFixed(3)}°N · {a.coordinates.lng.toFixed(3)}°E</span>
        </>
      }
      kpis={[
        { label: 'Total capacity',  value: formatLiters(a.totalCapacityLiters),               tone: 'info' },
        { label: 'Storage methods', value: a.storageMethods.length.toString(),                tone: 'ink' },
        { label: 'Gas types',       value: a.gasTypes.length.toString(),                      tone: 'ink' },
        { label: 'Last inspected',  value: `${formatDate(a.dateOfInspection)} · ${daysSinceIns}d ago`, tone: inspectionTone },
      ]}
    >
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-4">
        {/* MAIN COLUMN */}
        <div className="space-y-4">
          <DetailCard title="Gas Types on File" subtitle={`${a.gasTypes.length} type${a.gasTypes.length === 1 ? '' : 's'}`}>
            {a.gasTypes.length === 0 ? (
              <div className="text-[12px] text-neutral-500">No gas types declared.</div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {a.gasTypes.map((g) => (
                  <span key={g} className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-neutral-25 border border-neutral-100 text-[12.5px] text-ink-950">
                    <span className="w-1.5 h-1.5 rounded-full bg-violet-500" /> {g}
                  </span>
                ))}
              </div>
            )}
          </DetailCard>

          <DetailCard title="Safety Measures" subtitle="On-site protections recorded with the register">
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2">
              {a.safetyMeasures.split(/,(?![^()]*\))/).map((s) => s.trim()).filter(Boolean).map((it, i) => (
                <li key={i} className="flex items-start gap-2 text-[12.5px] text-ink-950 leading-snug">
                  <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-action-orange shrink-0" />
                  <span className="capitalize">{it}</span>
                </li>
              ))}
            </ul>
          </DetailCard>

          <DetailCard title="Storage Methods" subtitle={`${a.storageMethods.length} on site · ${formatLiters(a.totalCapacityLiters)} combined`}>
            <div className="overflow-x-auto -mx-4">
              <table className="w-full min-w-[640px]">
                <thead className="bg-neutral-25 text-[10px] uppercase tracking-[0.16em] text-neutral-500 border-y border-neutral-100">
                  <tr>
                    <th className="text-left px-4 py-2.5">Name</th>
                    <th className="text-left px-4 py-2.5">Type</th>
                    <th className="text-right px-4 py-2.5 whitespace-nowrap">Area</th>
                    <th className="text-right px-4 py-2.5 whitespace-nowrap">Capacity</th>
                    <th className="text-left px-4 py-2.5">Products stored</th>
                  </tr>
                </thead>
                <tbody>
                  {a.storageMethods.map((m) => (
                    <tr key={m.id} className="border-b border-neutral-100 last:border-b-0 align-top">
                      <td className="px-4 py-3 text-[13px] font-semibold text-ink-950 whitespace-nowrap">{m.name}</td>
                      <td className="px-4 py-3 text-[12px] text-neutral-700 whitespace-nowrap">{storageTypeLabel(m.type)}</td>
                      <td className="px-4 py-3 font-mono text-[12px] text-ink-950 text-right tabular-nums whitespace-nowrap">{m.areaSqM.toLocaleString()} m²</td>
                      <td className="px-4 py-3 font-mono text-[12px] text-ink-950 text-right tabular-nums whitespace-nowrap">{formatLiters(m.capacityLiters)}</td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {m.productsStored.map((p) => (
                            <span key={p} className="inline-flex items-center px-1.5 h-5 rounded text-[10.5px] font-semibold ring-1 ring-neutral-200 bg-neutral-50 text-ink-950">{p}</span>
                          ))}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </DetailCard>

          <DetailCard title="Inspection">
            <FieldGrid>
              <Field label="Authority"        value={a.inspectionAuthority} />
              <Field label="Last inspection"  value={`${formatDate(a.dateOfInspection)} · ${daysSinceIns}d ago`} tone={inspectionTone === 'danger' ? 'danger' : inspectionTone === 'warning' ? 'warning' : undefined} />
              <Field label="Next due (annual)" value={formatDate(nextIns.toISOString())} />
              <Field label="Source"            value={sourceLabel(a.source)} />
            </FieldGrid>
          </DetailCard>

          <DetailCard title="Stakeholders">
            <div className="space-y-3">
              <PersonRow role="owner" sub={a.ownership === 'owned' ? 'Owned by permit holder' : 'Rented'} p={a.owner} />
              {sameStakeholder ? (
                <div className="rounded-lg border border-dashed border-neutral-200 px-3.5 py-2.5">
                  <div className="flex items-center gap-2 text-[10px] font-sans uppercase tracking-[0.18em] text-action-orange-deep mb-0.5">
                    <OperatorIcon />
                    Operator
                  </div>
                  <div className="text-[12px] text-neutral-600">Same person as the owner.</div>
                </div>
              ) : (
                <PersonRow role="operator" sub={a.operatedBy === 'self' ? 'Operated by permit holder' : 'Operated by third party'} p={a.operator} />
              )}
            </div>
          </DetailCard>
        </div>

        {/* SIDEBAR */}
        <div className="space-y-4">
          {/* Map */}
          <div className="card overflow-hidden">
            <div className="px-4 py-2.5 border-b border-neutral-100">
              <div className="text-[10.5px] font-sans uppercase tracking-[0.18em] text-neutral-500">Location</div>
              <div className="text-[12px] text-ink-950 mt-0.5 leading-snug">{a.detailedAddress}</div>
            </div>
            <div style={{ height: 240 }}>
              <MapContainer
                center={[a.coordinates.lat, a.coordinates.lng]}
                zoom={14}
                scrollWheelZoom={false}
                style={{ width: '100%', height: '100%' }}
              >
                <TileLayer attribution='&copy; OpenStreetMap' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" keepBuffer={4} />
                <Marker position={[a.coordinates.lat, a.coordinates.lng]} icon={facilityPin()} />
                <MiniMapResize center={[a.coordinates.lat, a.coordinates.lng]} zoom={14} />
              </MapContainer>
            </div>
            <div className="px-4 py-2.5 border-t border-neutral-100 text-[10.5px] font-mono text-neutral-500">
              {a.coordinates.lat.toFixed(5)}°N · {a.coordinates.lng.toFixed(5)}°E
            </div>
          </div>

          <DetailCard title="Record info">
            <FieldGrid cols={1}>
              <Field label="Serial number" value={a.id}                                            mono />
              <Field label="Source"        value={sourceLabel(a.source)} />
              <Field label="Permit holder" value={a.permitHolderName} />
              <Field label="Created"       value={new Date(a.createdAt).toLocaleString('en-GB')} />
              <Field label="Last updated"  value={new Date(a.updatedAt).toLocaleString('en-GB')} />
            </FieldGrid>
          </DetailCard>
        </div>
      </div>
    </ModuleDetailLayout>
  );
}

// ============================================================
// Helpers
// ============================================================
function PersonRow({ role, sub, p }: { role: 'owner' | 'operator'; sub: string; p: Person }) {
  const theme = role === 'owner'
    ? { bar: 'bg-info-500',          text: 'text-info-500',          bg: 'bg-info-soft/60',          icon: <OwnerIcon /> }
    : { bar: 'bg-action-orange',     text: 'text-action-orange-deep', bg: 'bg-action-orange-soft/60', icon: <OperatorIcon /> };
  return (
    <div className={cn('relative rounded-lg pl-4 pr-3.5 py-3', theme.bg)}>
      <span className={cn('absolute left-0 top-2 bottom-2 w-[3px] rounded-full', theme.bar)} />
      <div className={cn('flex items-center gap-2 text-[10px] font-sans uppercase tracking-[0.18em] mb-0.5 flex-wrap', theme.text)}>
        {theme.icon}
        {role === 'owner' ? 'Owner' : 'Operator'}
        <span className="text-neutral-400">·</span>
        <span className="text-neutral-500 normal-case tracking-normal font-sans font-medium">{sub}</span>
      </div>
      <div className="font-display font-bold text-[14px] text-ink-950">{p.fullName}</div>
      <dl className="mt-2 grid grid-cols-[90px_1fr] gap-y-1 text-[12px]">
        <dt className="text-neutral-500">Emirates ID</dt>
        <dd className="font-mono text-ink-950 break-all">{p.emiratesId}</dd>
        <dt className="text-neutral-500">Email</dt>
        <dd className="text-ink-950 break-all">{p.email}</dd>
        <dt className="text-neutral-500">Mobile</dt>
        <dd className="font-mono text-ink-950">{p.mobile}</dd>
      </dl>
    </div>
  );
}

function OwnerIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="8" cy="15" r="4" />
      <path d="M10.85 12.15 19 4" />
      <path d="m18 5 2 2" />
      <path d="m15 8 2 2" />
    </svg>
  );
}

function OperatorIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
    </svg>
  );
}

function facilityPin() {
  return L.divIcon({
    className: '',
    html: `<div style="width:30px;height:30px;border-radius:50%;background:#fff;border:3px solid #E89B4C;box-shadow:0 4px 14px rgba(0,0,0,0.25);display:grid;place-items:center;">
      <div style="width:10px;height:10px;border-radius:50%;background:#E89B4C;"></div>
    </div>`,
    iconSize: [30, 30],
    iconAnchor: [15, 15],
  });
}

function MiniMapResize({ center, zoom }: { center: [number, number]; zoom: number }) {
  const map = useMap();
  useEffect(() => {
    let recentered = false;
    const tick = () => {
      map.invalidateSize();
      if (!recentered) {
        const size = map.getSize();
        if (size.x > 80 && size.y > 80) {
          map.setView(center, zoom, { animate: false });
          recentered = true;
        }
      }
    };
    tick();
    const timers = [60, 240, 600, 1200, 2400].map((d) => setTimeout(tick, d));
    const ro = new ResizeObserver(() => map.invalidateSize());
    ro.observe(map.getContainer());
    return () => { timers.forEach(clearTimeout); ro.disconnect(); };
  }, [map, center, zoom]);
  return null;
}

function initials(name: string): string {
  const parts = name.replace(/[^A-Za-z ]/g, '').trim().split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0]?.toUpperCase() ?? '').join('') || 'AS';
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}
