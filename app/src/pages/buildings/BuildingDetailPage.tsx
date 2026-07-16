import { useEffect, useMemo } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { useApps } from '../../store/apps';
import { deriveBuildings, type Building360, type CertSummary } from '../../services/buildings';
import { buildingTypeLabel } from '../../components/buildings/BuildingTypeIcon';
import { ComplianceGauge } from '../../components/buildings/ComplianceGauge';
import { CertLifeline } from '../../components/buildings/CertLifeline';
import { getService } from '../../services/registry';
import { cn, formatDate } from '../../lib/utils';
import { MapContainer, TileLayer, Marker, useMap } from 'react-leaflet';
import L from 'leaflet';
import type { Application } from '../../types';

// ============================================================================
// Building 360 — Building Detail (redesigned)
//
// Editorial / property-dossier style. No hero gradient, no glass cards, no
// emoji watermarks. The hierarchy is content-driven: identity at top, then
// a clean summary strip, then a two-column body where the left column is
// the "case file" (certificates, applications, location) and the right is a
// sticky metadata sidebar (key facts, stakeholders, gas system).
// ============================================================================

const SIDEMAP_ICON = L.divIcon({
  className: 'b360-sm',
  html: `<div style="width:18px;height:18px;border-radius:50%;background:#fff;border:4px solid #C8102E;box-shadow:0 4px 10px rgba(200,16,46,0.4);"></div>`,
  iconSize: [18, 18],
  iconAnchor: [9, 9],
});

const LEVEL_TONE: Record<Building360['complianceLevel'], { dot: string; text: string; bg: string; ring: string; label: string }> = {
  green: { dot: 'bg-success-500',  text: 'text-success-500',       bg: 'bg-success-soft/70',       ring: 'ring-success-500/20',  label: 'Compliant' },
  amber: { dot: 'bg-action-orange', text: 'text-action-orange-deep', bg: 'bg-action-orange-soft/70', ring: 'ring-action-orange/20', label: 'Partial Coverage' },
  red:   { dot: 'bg-doe-red',      text: 'text-doe-red',           bg: 'bg-doe-red-soft/60',       ring: 'ring-doe-red/15',       label: 'At Risk' },
};

export function BuildingDetailPage() {
  const { buildingId } = useParams<{ buildingId: string }>();
  const apps = useApps((s) => s.apps);
  const navigate = useNavigate();
  const buildings = useMemo(() => deriveBuildings(apps), [apps]);
  const b = buildings.find((x) => x.id === buildingId);

  if (!b) {
    return (
      <div className="max-w-[1100px] mx-auto px-6 py-10">
        <div className="bg-white border border-neutral-100 rounded-xl p-8 text-center">
          <div className="font-display font-bold text-[16px] text-ink-950">Building not found</div>
          <div className="text-[12.5px] text-neutral-500 mt-1">This premises has no COC, NOC or AMC records on file.</div>
          <button onClick={() => navigate('/buildings')} className="mt-4 px-4 py-2 rounded-md bg-ink-950 text-white text-[12.5px] font-semibold hover:bg-charcoal-800">
            Back to Building 360
          </button>
        </div>
      </div>
    );
  }

  const tone = LEVEL_TONE[b.complianceLevel];
  const company = b.fmCompany ?? b.gasAmcContractor ?? b.gasInstallContractor;
  const activeCount = [b.coc, b.noc, b.amc].filter((c) => c.status === 'active' || c.status === 'expiring').length;
  const openWorkflows = [b.coc, b.noc, b.amc].filter((c) => c.inFlight || c.status === 'pending').length;

  return (
    <div className="min-h-screen bg-neutral-25">
      {/* ============================================================
          Breadcrumb bar
          ============================================================ */}
      <div className="border-b border-neutral-100 bg-white">
        <div className="max-w-[1280px] mx-auto px-6 py-3 flex items-center justify-between text-[12px]">
          <nav className="text-neutral-500">
            <Link to="/pps-dashboard" className="hover:text-doe-red">Home</Link>
            <span className="mx-2 text-neutral-300">›</span>
            <Link to="/buildings" className="hover:text-doe-red">Building 360</Link>
            <span className="mx-2 text-neutral-300">›</span>
            <span className="text-ink-950 font-semibold">{b.name}</span>
          </nav>
          <button onClick={() => navigate('/buildings')} className="text-[11px] text-neutral-500 hover:text-doe-red flex items-center gap-1">
            <span>‹</span> Back
          </button>
        </div>
      </div>

      <div className="max-w-[1280px] mx-auto px-6 py-8">
        {/* ============================================================
            Identity row — name on the left, Compliance Score Card on right
            ============================================================ */}
        <header className="pb-6 border-b border-neutral-100">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-5">
            {/* Identity */}
            <div className="flex-1 min-w-0">
              <div className="text-[10px] font-sans uppercase tracking-[0.22em] text-neutral-500 mb-2">
                {buildingTypeLabel(b.premisesType)} · {b.city ?? '—'}{b.area ? ` · ${b.area}` : ''}
              </div>
              <h1 className="font-display font-extrabold text-[30px] md:text-[36px] text-ink-950 leading-[1.05] tracking-tight">
                {b.name}
              </h1>
              <div className={cn('h-[3px] w-16 mt-3 rounded-full', tone.dot)} />
              <div className="flex items-center gap-3 mt-3 text-[12.5px] flex-wrap">
                <span className="font-mono text-[11px] text-neutral-500 tracking-wider">{b.premisesNumber}</span>
                {company && (
                  <>
                    <span className="text-neutral-300">·</span>
                    <span className="text-neutral-600">Managed by <span className="text-ink-950 font-semibold">{company}</span></span>
                  </>
                )}
              </div>
            </div>

            {/* Compliance Score Card (replaces the stamp) */}
            <ComplianceScoreCard b={b} />
          </div>
        </header>

        {/* ============================================================
            Vital stats strip
            ============================================================ */}
        <div className="grid grid-cols-2 md:grid-cols-4 mt-6 bg-white rounded-xl border border-neutral-100 divide-x divide-neutral-100 overflow-hidden">
          <Stat label="Active Certificates"  value={<span className="font-display font-extrabold text-[24px] leading-none text-ink-950">{activeCount} <span className="text-neutral-400 text-[14px] font-mono">/ 3</span></span>} />
          <Stat label="Open Workflows"       value={<span className="font-display font-extrabold text-[24px] leading-none text-ink-950">{openWorkflows}</span>} />
          <Stat label="Applications on File" value={<span className="font-display font-extrabold text-[24px] leading-none text-ink-950">{b.applications.length}</span>} />
          <Stat label="Last Activity"        value={<span className="font-display font-bold text-[14px] text-ink-950">{b.lastActivityAt ? formatRelative(b.lastActivityAt) : '—'}</span>} />
        </div>

        {/* ============================================================
            Main body — two-column
            ============================================================ */}
        <div className="grid grid-cols-12 gap-6 mt-6">
          {/* LEFT — case file */}
          <main className="col-span-12 lg:col-span-8 space-y-6">
            <CertificatesSection b={b} />
            <ApplicationHistory applications={b.applications} />
            {b.coordinates && <LocationSection lat={b.coordinates.lat} lng={b.coordinates.lng} label={b.name} />}
          </main>

          {/* RIGHT — sticky metadata */}
          <aside className="col-span-12 lg:col-span-4 space-y-6">
            <PropertyCard b={b} />
            <StakeholdersCard b={b} />
            <GasSystemCard b={b} />
          </aside>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Sub-components
// ============================================================================

function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="px-5 py-4">
      <div className="text-[9.5px] font-sans uppercase tracking-[0.2em] text-neutral-400">{label}</div>
      <div className="mt-1.5">{value}</div>
    </div>
  );
}

// =============================================================================
// ComplianceScoreCard — sits in the top-right of the page header. Pairs the
// arc gauge with the level word and a short explanation so the building's
// compliance state reads instantly alongside its name.
// =============================================================================
function ComplianceScoreCard({ b }: { b: Building360 }) {
  const tone = LEVEL_TONE[b.complianceLevel];
  const explainer =
    b.complianceLevel === 'green' ? 'All three certificates are active and on file.' :
    b.complianceLevel === 'amber' ? 'Some coverage gaps or in-flight workflows.' :
                                     'Expired, cancelled, or revoked certificates detected.';
  return (
    <div className={cn('rounded-xl ring-1 px-4 py-3.5 flex items-center gap-4 shrink-0 md:w-[320px]', tone.bg, tone.ring)}>
      <ComplianceGauge score={b.complianceScore} level={b.complianceLevel} size={88} />
      <div className="min-w-0">
        <div className="text-[9.5px] font-sans uppercase tracking-[0.2em] text-neutral-500">Compliance Score</div>
        <div className={cn('font-display font-bold text-[15px] mt-0.5', tone.text)}>{tone.label}</div>
        <div className="text-[11px] text-neutral-600 mt-1 leading-snug">{explainer}</div>
      </div>
    </div>
  );
}

function SectionHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between mb-3">
      <div>
        <h2 className="font-display font-bold text-[13px] text-ink-950 uppercase tracking-[0.18em]">{title}</h2>
        {subtitle && <p className="text-[11px] text-neutral-500 mt-0.5">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

// ============================================================
// Certificates section — three large tinted rows with rich data
// ============================================================
function CertificatesSection({ b }: { b: Building360 }) {
  return (
    <section>
      <SectionHeader
        title="Certificate Status"
        subtitle="Operational certificates required for this building"
      />
      <div className="space-y-2">
        <CertCard cert={b.amc} module="AMC" fullName="Annual Maintenance Contract" purpose="Required for ongoing maintenance with a registered contractor." />
        <CertCard cert={b.noc} module="NOC" fullName="No Objection Certificate"   purpose="DOE permission to operate the gas system at this premises." />
        <CertCard cert={b.coc} module="COC" fullName="Certificate of Completion"   purpose="Sign-off of gas-system construction and installation." />
      </div>
    </section>
  );
}

function CertCard({ cert, module, fullName, purpose }: { cert: CertSummary; module: string; fullName: string; purpose: string }) {
  const tone = certTone(cert.status);
  const expiry = formatExpiry(cert);

  return (
    <div className={cn('rounded-xl ring-1 overflow-hidden', tone.bg, tone.ring)}>
      <div className="grid grid-cols-12 gap-3 px-5 py-4 items-start">
        {/* Module identifier */}
        <div className="col-span-12 md:col-span-3">
          <div className={cn('inline-block font-mono font-extrabold text-[15px] tracking-[0.2em]', tone.heading)}>
            {module}
          </div>
          <div className="text-[12px] text-ink-950 font-semibold mt-0.5 leading-tight">{fullName}</div>
          <div className="text-[10.5px] text-neutral-600 mt-1 leading-snug">{purpose}</div>
        </div>

        {/* Status word, secondary info, and lifeline visual */}
        <div className="col-span-12 md:col-span-6">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={cn('w-2 h-2 rounded-full', tone.dot, cert.status === 'pending' && 'animate-pulse')} />
            <span className={cn('font-display font-bold text-[15px]', tone.text)}>
              {primaryStatus(cert)}
            </span>
            {cert.inFlight && (
              <span className="text-[9px] font-sans font-bold uppercase tracking-[0.16em] text-action-orange-deep bg-white px-1.5 py-0.5 rounded ring-1 ring-action-orange/30">
                ↻ Workflow open
              </span>
            )}
          </div>
          <div className="text-[11.5px] text-neutral-600 mt-1">{expiry.short}</div>
          {cert.certificateNumber && (
            <div className="text-[10.5px] font-mono text-neutral-500 mt-1">{cert.certificateNumber}</div>
          )}

          {/* Lifeline timeline — the creative bit */}
          <CertLifeline cert={cert} />
        </div>

        {/* Action — open underlying application */}
        <div className="col-span-12 md:col-span-3 flex md:justify-end">
          {cert.applicationId ? (
            <Link
              to={`/app/${cert.applicationId}`}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-white text-ink-950 text-[11.5px] font-semibold ring-1 ring-neutral-100 hover:ring-doe-red/30 hover:text-doe-red transition"
            >
              <span className="font-mono text-[10px] text-neutral-500">{cert.applicationNumber}</span>
              <span>Open</span>
              <span className="text-neutral-300 group-hover:text-doe-red">›</span>
            </Link>
          ) : (
            <span className="text-[10.5px] text-neutral-400 italic">No application on file</span>
          )}
        </div>
      </div>
    </div>
  );
}

function certTone(status: CertSummary['status']) {
  switch (status) {
    case 'active':
      return { bg: 'bg-success-soft/70', ring: 'ring-success-500/20', dot: 'bg-success-500', text: 'text-success-500',          heading: 'text-success-500' };
    case 'expiring':
    case 'pending':
      return { bg: 'bg-action-orange-soft/70', ring: 'ring-action-orange/20', dot: status === 'pending' ? 'bg-info-500' : 'bg-action-orange', text: 'text-action-orange-deep', heading: 'text-action-orange-deep' };
    case 'expired':
    case 'rejected':
    case 'cancelled':
      return { bg: 'bg-doe-red-soft/60', ring: 'ring-doe-red/15', dot: status === 'cancelled' ? 'bg-neutral-400' : 'bg-doe-red', text: 'text-doe-red', heading: 'text-doe-red' };
    default:
      return { bg: 'bg-doe-red-soft/40', ring: 'ring-doe-red/10', dot: 'bg-neutral-300', text: 'text-neutral-500', heading: 'text-doe-red/70' };
  }
}

function primaryStatus(c: CertSummary): string {
  switch (c.status) {
    case 'active':    return 'Active';
    case 'expiring':  return 'Expiring Soon';
    case 'pending':   return 'In Review';
    case 'expired':   return 'Expired';
    case 'rejected':  return 'Rejected';
    case 'cancelled': return 'Cancelled';
    default:          return 'Not on File';
  }
}

function formatExpiry(c: CertSummary): { short: string; full?: string } {
  if (c.status === 'active' && c.expiresAt) {
    const days = Math.round((new Date(c.expiresAt).getTime() - Date.now()) / (24 * 3600 * 1000));
    return { short: `Valid until ${formatFullDate(c.expiresAt)} · ${days}d remaining` };
  }
  if (c.status === 'expiring' && c.expiresAt) {
    const days = Math.round((new Date(c.expiresAt).getTime() - Date.now()) / (24 * 3600 * 1000));
    return { short: `${days} days remaining · renew soon · expires ${formatFullDate(c.expiresAt)}` };
  }
  if (c.status === 'pending')   return { short: c.applicationNumber ? `Pending DOE review · ${c.applicationNumber}` : 'Pending DOE review' };
  if (c.status === 'expired')   return { short: c.expiresAt ? `Lapsed on ${formatFullDate(c.expiresAt)}` : 'Expired' };
  if (c.status === 'rejected')  return { short: 'Last application was rejected' };
  if (c.status === 'cancelled') return { short: 'Cancelled — no longer valid' };
  return { short: 'No certificate on record for this building' };
}

// ============================================================
// Application History — chronological list
// ============================================================
function ApplicationHistory({ applications }: { applications: Application[] }) {
  return (
    <section>
      <SectionHeader
        title="Application History"
        subtitle={`${applications.length} record${applications.length === 1 ? '' : 's'} across COC, NOC and AMC`}
      />
      <div className="bg-white rounded-xl border border-neutral-100 overflow-hidden">
        {applications.length === 0 && (
          <div className="p-6 text-center text-[12.5px] text-neutral-500">No applications on file.</div>
        )}
        {applications.map((a, i) => {
          const svc = getService(a.serviceId);
          const isLast = i === applications.length - 1;
          const stTone = appStateTone(a.state);
          const modCls =
            a.module === 'coc' ? 'bg-action-orange-soft text-action-orange-deep' :
            a.module === 'noc' ? 'bg-info-soft text-info-500' :
                                  'bg-lavender text-[#7B3FE4]';
          return (
            <Link
              key={a.id}
              to={`/app/${a.id}`}
              className={cn(
                'grid grid-cols-[auto_1fr_auto_auto] gap-3 items-center px-5 py-3 hover:bg-neutral-25 transition group',
                !isLast && 'border-b border-neutral-100',
              )}
            >
              <div className={cn('w-9 h-9 rounded-md grid place-items-center font-mono font-bold text-[10px]', modCls)}>
                {a.module.toUpperCase()}
              </div>
              <div className="min-w-0">
                <div className="flex items-baseline gap-2">
                  <span className="font-mono text-[11.5px] font-bold text-ink-950 group-hover:text-doe-red">{a.applicationNumber}</span>
                  <span className="text-[11px] text-neutral-500 capitalize">{svc?.action} · {svc?.shortTitle}</span>
                </div>
                <div className="text-[10.5px] text-neutral-500 mt-0.5">
                  {a.submittedOn && <>Submitted {formatDate(a.submittedOn)}</>}
                </div>
              </div>
              <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold', stTone.bg, stTone.text)}>
                <span className={cn('w-1 h-1 rounded-full', stTone.dot)} />
                {stateLabel(a)}
              </span>
              <span className="text-neutral-300 group-hover:text-doe-red transition text-[14px]">›</span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

function appStateTone(state: string) {
  if (state === 'issued')                              return { bg: 'bg-success-soft', text: 'text-success-500', dot: 'bg-success-500' };
  if (state === 'rejected')                            return { bg: 'bg-doe-red-soft', text: 'text-doe-red',     dot: 'bg-doe-red' };
  if (state === 'cancelled')                           return { bg: 'bg-neutral-100',  text: 'text-neutral-500', dot: 'bg-neutral-400' };
  if (/pending|returned|fee_pending/.test(state))      return { bg: 'bg-info-soft',    text: 'text-info-500',    dot: 'bg-info-500' };
  return                                                       { bg: 'bg-neutral-50',   text: 'text-neutral-500', dot: 'bg-neutral-300' };
}

function stateLabel(a: Application): string {
  const svc = getService(a.serviceId);
  return svc?.states.find((s) => s.id === a.state)?.label ?? a.state;
}

// ============================================================
// Location section
// ============================================================
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

function LocationSection({ lat, lng, label }: { lat: number; lng: number; label: string }) {
  return (
    <section>
      <SectionHeader title="Location" subtitle={`${lat.toFixed(4)}°N · ${lng.toFixed(4)}°E`} />
      <div className="rounded-xl overflow-hidden border border-neutral-100" style={{ height: 320, width: '100%' }}>
        <MapContainer
          center={[lat, lng]}
          zoom={14}
          scrollWheelZoom={false}
          style={{ width: '100%', height: '100%' }}
        >
          <TileLayer
            attribution='&copy; OpenStreetMap'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            keepBuffer={4}
          />
          <Marker position={[lat, lng]} icon={SIDEMAP_ICON} title={label} />
          <MiniMapResize center={[lat, lng]} zoom={14} />
        </MapContainer>
      </div>
    </section>
  );
}

// ============================================================
// Sidebar — Property facts
// ============================================================
function PropertyCard({ b }: { b: Building360 }) {
  const rows: Array<{ label: string; value?: string }> = [
    { label: 'Premises Type',  value: buildingTypeLabel(b.premisesType) },
    { label: 'Emirate',        value: b.emirate },
    { label: 'City',           value: b.city },
    { label: 'Area',           value: b.area },
    { label: 'Sector',         value: b.sector },
    { label: 'Plot Number',    value: b.plotNumber },
    { label: 'DMT MePs Ref',   value: b.dmtMepsRef },
    { label: 'Premises Number', value: b.premisesNumber },
  ].filter((r) => r.value);

  return (
    <section className="bg-white rounded-xl border border-neutral-100">
      <div className="px-4 py-3 border-b border-neutral-100">
        <h2 className="font-display font-bold text-[12px] text-ink-950 uppercase tracking-[0.18em]">Property Facts</h2>
      </div>
      <dl className="divide-y divide-neutral-100">
        {rows.map((r) => (
          <div key={r.label} className="flex items-baseline justify-between gap-3 px-4 py-2.5">
            <dt className="text-[10.5px] font-sans uppercase tracking-[0.16em] text-neutral-400">{r.label}</dt>
            <dd className="text-[12px] text-ink-950 font-semibold text-right truncate" title={r.value}>{r.value}</dd>
          </div>
        ))}
      </dl>
      {b.detailedAddress && (
        <div className="px-4 py-3 bg-neutral-25/60 border-t border-neutral-100">
          <div className="text-[9.5px] font-sans uppercase tracking-[0.16em] text-neutral-400 mb-1">Full Address</div>
          <div className="text-[11.5px] text-ink-950 leading-relaxed">{b.detailedAddress}</div>
        </div>
      )}
    </section>
  );
}

function StakeholdersCard({ b }: { b: Building360 }) {
  const rows: Array<{ label: string; value?: string; sub?: string }> = [
    { label: 'Premises Owner',     value: b.ownerName,            sub: b.ownerContact },
    { label: 'Project Consultant', value: b.projectConsultant },
    { label: 'FM Company',         value: b.fmCompany,            sub: b.fmContact },
    { label: 'Gas Installer',      value: b.gasInstallContractor },
    { label: 'AMC Contractor',     value: b.gasAmcContractor },
    { label: 'TPI Company',        value: b.tpiCompany,           sub: b.tpiCocRef ? `TPI CoC: ${b.tpiCocRef}` : undefined },
    { label: 'Gas Supply',         value: b.gasSupplyCompany },
  ].filter((r) => r.value);
  if (rows.length === 0) return null;

  return (
    <section className="bg-white rounded-xl border border-neutral-100">
      <div className="px-4 py-3 border-b border-neutral-100">
        <h2 className="font-display font-bold text-[12px] text-ink-950 uppercase tracking-[0.18em]">Stakeholders</h2>
        <div className="text-[10.5px] text-neutral-500 mt-0.5">{rows.length} entities on file</div>
      </div>
      <div className="divide-y divide-neutral-100">
        {rows.map((r) => (
          <div key={r.label} className="px-4 py-3">
            <div className="text-[9.5px] font-sans uppercase tracking-[0.16em] text-neutral-400">{r.label}</div>
            <div className="text-[12px] text-ink-950 font-semibold mt-0.5" title={r.value}>{r.value}</div>
            {r.sub && <div className="text-[10.5px] text-neutral-500 mt-0.5">{r.sub}</div>}
          </div>
        ))}
      </div>
    </section>
  );
}

function GasSystemCard({ b }: { b: Building360 }) {
  if (!b.gasSystemType && !b.gasMedium && !b.gasSupplyCompany) return null;
  return (
    <section className="bg-white rounded-xl border border-neutral-100">
      <div className="px-4 py-3 border-b border-neutral-100">
        <h2 className="font-display font-bold text-[12px] text-ink-950 uppercase tracking-[0.18em]">Gas System</h2>
      </div>
      <dl className="divide-y divide-neutral-100">
        {b.gasSystemType && (
          <Row label="System Type"     value={b.gasSystemType} />
        )}
        {b.gasMedium && (
          <Row label="Medium"          value={b.gasMedium} />
        )}
        {b.gasSupplyCompany && (
          <Row label="Supply Company"  value={b.gasSupplyCompany} />
        )}
      </dl>
    </section>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 px-4 py-2.5">
      <dt className="text-[10.5px] font-sans uppercase tracking-[0.16em] text-neutral-400">{label}</dt>
      <dd className="text-[12px] text-ink-950 font-semibold text-right">{value}</dd>
    </div>
  );
}

function formatFullDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatRelative(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const d = Math.floor(ms / (24 * 3600 * 1000));
  if (d <= 0) return 'Today';
  if (d === 1) return 'Yesterday';
  if (d < 30) return `${d} days ago`;
  const m = Math.floor(d / 30);
  if (m < 12) return `${m} mo ago`;
  return `${Math.floor(m / 12)} yr ago`;
}
