// =============================================================================
// Gas Register · BN 1 — Customer Detail
// -----------------------------------------------------------------------------
// Migrated to the shared ModuleDetailLayout. Preserves all BN 1 features:
//   • EID flow vs CN/MC flow identity card per SDD §3.1.2
//   • 4-cert compliance table per SDD §3.14 with live computation
//   • Gas allocations (dual L + SCM)
//   • Map of premises
//   • Contract expiry tracking
// =============================================================================
import { useEffect, useMemo, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, useMap } from 'react-leaflet';
import L from 'leaflet';
import {
  getCustomer, sourceLabel, categoryLabel, categoryUsesEid,
  customerIdentifier, customerCompliance, contractExpiringSoon, contractExpired,
} from '../../services/gasRegister/customers';
import { CERTS, bandTone } from '../../services/gasRegister/compliance';
import { formatVolumeDual, gasTypeById, type GasTypeId } from '../../services/gasRegister/technical';
import { ModuleDetailLayout, DetailCard, Field, FieldGrid } from './ModuleDetailLayout';
import { cn } from '../../lib/utils';

export function CustomerDetailPage() {
  const { customerId } = useParams<{ customerId: string }>();
  const c = useMemo(() => customerId ? getCustomer(customerId) : undefined, [customerId]);
  const navigate = useNavigate();

  if (!c) {
    return (
      <div className="min-h-screen bg-neutral-25 grid place-items-center">
        <div className="card p-10 text-center">
          <div className="text-4xl mb-2">🔎</div>
          <div className="font-display font-bold text-[15px] text-ink-950">Customer not found</div>
          <button onClick={() => navigate('/gas-register/customers')} className="mt-4 btn-primary">Back to customers</button>
        </div>
      </div>
    );
  }

  const ageDays = Math.floor((Date.now() - new Date(c.dateOfContract).getTime()) / 86_400_000);
  const ageLabel = ageDays >= 365 ? `${(ageDays / 365).toFixed(1)} yrs` : `${ageDays} d`;
  const usesEid = categoryUsesEid(c.category);
  const compliance = customerCompliance(c);
  const tone = bandTone(compliance.band);
  const expiringContract = contractExpiringSoon(c);
  const expiredContract  = contractExpired(c);

  const statusTone: 'success' | 'danger' | 'warning' | 'neutral' =
    c.connectionStatus === 'Active' ? 'success' :
    c.connectionStatus === 'Disconnected' ? 'danger' :
    c.connectionStatus === 'Suspended' ? 'warning' : 'neutral';

  const complianceKpiTone: 'success' | 'warning' | 'danger' | 'info' =
    compliance.band === 'Fully Compliant' ? 'success' :
    compliance.band === 'Minor Gap' ? 'warning' :
    compliance.band === 'At Risk' ? 'warning' : 'danger';

  return (
    <ModuleDetailLayout
      parentLabel="Customer Master" parentHref="/gas-register/customers"
      current={c.buildingName} sddRef="BN 1 · Gas Register SDD"
      iconText={initials(c.buildingName)} iconAccent="#22A745"
      eyebrow={`${categoryLabel(c.category)} · ${c.buildingType}`}
      title={c.buildingName}
      subtitle={`${c.permitHolderName} · Account ${c.accountId} · ${c.area}, ${c.city}`}
      status={{ label: c.connectionStatus, tone: statusTone }}
      meta={
        <>
          <span className="font-mono text-white/70">{c.id}</span>
          <span className="text-white/40">·</span>
          <span className="text-white/70">{sourceLabel(c.source)}</span>
        </>
      }
      kpis={[
        { label: 'Total capacity',  value: formatVolumeDual(c.totalCapacityLiters, 'L', c.gasTypes[0] as GasTypeId), tone: 'info' },
        { label: 'Gas types',       value: `${c.gasTypes.length} · ${c.gasTypes.map((g) => gasTypeById(g)?.shortLabel ?? g).join(' / ')}`, tone: 'ink' },
        { label: 'Contract',        value: ageLabel, tone: expiredContract ? 'danger' : expiringContract ? 'warning' : 'ink' },
        { label: 'Compliance rate', value: `${compliance.rate}% · ${compliance.band}`, tone: complianceKpiTone },
      ]}
    >
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-4">
        {/* MAIN COLUMN */}
        <div className="space-y-4">
          {/* Identity card — EID vs CN/MC */}
          <DetailCard title={usesEid ? 'Holder Identification (EID Flow)' : 'Holder Identification (Trade Licence Flow)'}>
            <FieldGrid>
              {usesEid ? (
                <>
                  <Field label="Emirates ID"        value={customerIdentifier(c)} mono />
                  <Field label="Account Owner Name" value={c.accountOwnerName ?? '—'} />
                  <Field label="End User Name"      value={c.endUserName ?? '—'} />
                  <Field label="Nationality"        value={c.nationality ?? '—'} />
                  <Field label="Account ID"         value={c.accountId} mono />
                </>
              ) : (
                <>
                  <Field label="Trade Licence No."   value={c.tradeLicenceNumber ?? '—'} mono />
                  <Field label="Commercial Name"     value={c.commercialName ?? '—'} />
                  <Field label="Licence Authority"   value={c.licenceAuthority ?? '—'} />
                  <Field label="Business Activity"   value={c.economicActivity ?? '—'} />
                  <Field label="Account ID"          value={c.accountId} mono />
                </>
              )}
            </FieldGrid>
            {c.incompleteFromPermit && (
              <div className="mt-3 inline-flex items-center gap-1.5 px-2 h-5 rounded bg-amber-50 text-amber-700 text-[10px] font-semibold uppercase tracking-wider">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                Incomplete data from Petroleum Permit
              </div>
            )}
          </DetailCard>

          {/* Compliance — 4 certs per SDD §3.14 */}
          <DetailCard title="Certificate Compliance" subtitle="Live computation per SDD §3.14 · Compliance Rate = Σ V_i / N × 100">
            <div className="flex items-center gap-3 mb-3 flex-wrap">
              <span className={cn('inline-flex items-center gap-1.5 px-3 h-7 rounded-full text-[12px] font-semibold', tone.pill)}>
                <span className={cn('w-2 h-2 rounded-full', tone.dot)} />
                {compliance.rate}% · {compliance.band}
              </span>
              <span className="text-[11px] text-neutral-500">
                {compliance.validCount} of {compliance.applicableCount} certificates valid
              </span>
              {compliance.anyExpiringSoon && <span className="inline-flex items-center px-1.5 h-5 rounded text-[10px] font-semibold bg-amber-50 text-amber-700">Expiring Soon</span>}
              {compliance.anyExpired     && <span className="inline-flex items-center px-1.5 h-5 rounded text-[10px] font-semibold bg-rose-50 text-doe-red">Expired</span>}
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-[11.5px] min-w-[480px]">
                <thead className="text-[9.5px] font-sans uppercase tracking-wider text-neutral-500 border-b border-neutral-100">
                  <tr>
                    <th className="text-left py-2 px-2">Certificate</th>
                    <th className="text-left py-2 px-2">Source</th>
                    <th className="text-center py-2 px-2">Status</th>
                    <th className="text-right py-2 px-2 whitespace-nowrap">Expiry</th>
                    <th className="text-right py-2 px-2">Validity</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {CERTS.map((cert) => {
                    const state = c.certificates[cert.id];
                    const evaluation = compliance.evaluations.find((e) => e.slot === cert.id)!;
                    return (
                      <tr key={cert.id}>
                        <td className="py-2 px-2 font-semibold text-ink-950 whitespace-nowrap">{cert.label}</td>
                        <td className="py-2 px-2 text-neutral-500">{cert.source}</td>
                        <td className="py-2 px-2 text-center">
                          <span className={cn('inline-flex items-center px-1.5 h-5 rounded text-[10px] font-semibold',
                            state.status === 'YES' ? 'bg-emerald-50 text-emerald-700' :
                            state.status === 'NO'  ? 'bg-neutral-100 text-neutral-600' :
                            'bg-neutral-100 text-neutral-400')}>
                            {state.status ?? '—'}
                          </span>
                        </td>
                        <td className="py-2 px-2 text-right font-mono text-[11px] whitespace-nowrap">{state.expiryDate ? formatDate(state.expiryDate) : '—'}</td>
                        <td className="py-2 px-2 text-right">
                          {evaluation.valid === 1 ? (
                            <span className="inline-flex items-center gap-1 text-[10.5px] text-emerald-700 font-semibold whitespace-nowrap">
                              ✓ Valid {evaluation.daysToExpiry != null && evaluation.daysToExpiry <= 30 ? `· ${evaluation.daysToExpiry}d left` : ''}
                            </span>
                          ) : evaluation.expired ? (
                            <span className="inline-flex items-center gap-1 text-[10.5px] text-doe-red font-semibold whitespace-nowrap">✗ Expired</span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[10.5px] text-neutral-500 whitespace-nowrap">— Not on file</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </DetailCard>

          {/* Gas allocations */}
          <DetailCard title="Gas Allocations">
            {c.gasAllocations.length === 0 ? (
              <div className="text-[12px] text-neutral-500">No allocation breakdown captured.</div>
            ) : (
              <div className="space-y-1.5">
                {c.gasAllocations.map((a) => (
                  <div key={a.id} className="flex items-center justify-between gap-3 text-[12px] border border-neutral-100 rounded-md px-3 py-2 bg-neutral-25">
                    <span className="text-ink-950 font-semibold truncate">{gasTypeById(a.gasType as GasTypeId)?.label ?? a.gasType}</span>
                    <span className="font-mono text-[11.5px] text-neutral-700 tabular-nums whitespace-nowrap">{formatVolumeDual(a.capacityLiters, 'L', a.gasType as GasTypeId)}</span>
                  </div>
                ))}
              </div>
            )}
          </DetailCard>

          {/* Contract */}
          <DetailCard title="Gas Sales Contract">
            <FieldGrid>
              <Field label="Date of Contract"            value={formatDate(c.dateOfContract)} />
              <Field label="Expiry of Gas Sales Contract"
                value={c.expiryOfGasSalesContract ? formatDate(c.expiryOfGasSalesContract) : '—'}
                tone={expiredContract ? 'danger' : expiringContract ? 'warning' : undefined} />
              <Field label="Contract Document" value={c.contractDocument?.fileName ?? '—'} mono />
              <Field label="Connection Status" value={c.connectionStatus} />
            </FieldGrid>
          </DetailCard>
        </div>

        {/* SIDEBAR */}
        <div className="space-y-4">
          {/* Map */}
          <div className="card overflow-hidden">
            <div className="px-4 py-2.5 border-b border-neutral-100">
              <div className="text-[10.5px] font-sans uppercase tracking-[0.18em] text-neutral-500">Location</div>
            </div>
            <div style={{ height: 220 }}>
              <MapContainer center={[c.coordinates.lat, c.coordinates.lng]} zoom={13} scrollWheelZoom={false} style={{ height: '100%', width: '100%' }}>
                <TileLayer attribution='© OpenStreetMap' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                <Marker position={[c.coordinates.lat, c.coordinates.lng]} icon={dotIcon} />
                <FitSize />
              </MapContainer>
            </div>
            <div className="px-4 py-2.5 border-t border-neutral-100 text-[11.5px] text-neutral-600 leading-snug">
              {c.detailedAddress}
            </div>
          </div>

          <DetailCard title="Owner / FM Contact">
            <FieldGrid cols={1}>
              <Field label="Name"  value={c.ownerOrFmName} />
              <Field label="Phone" value={c.ownerOrFmContact} mono />
              <Field label="Email" value={c.ownerOrFmEmail} mono />
            </FieldGrid>
          </DetailCard>

          <DetailCard title="Record info">
            <FieldGrid cols={1}>
              <Field label="Customer ID" value={c.id} mono />
              <Field label="Source"      value={sourceLabel(c.source)} />
              <Field label="Created"     value={new Date(c.createdAt).toLocaleString('en-GB')} />
              <Field label="Updated"     value={new Date(c.updatedAt).toLocaleString('en-GB')} />
            </FieldGrid>
          </DetailCard>
        </div>
      </div>
    </ModuleDetailLayout>
  );
}

function initials(name: string): string {
  const parts = name.replace(/[^A-Za-z ]/g, '').trim().split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0]?.toUpperCase() ?? '').join('') || 'CU';
}

const dotIcon = new L.DivIcon({
  className: 'gas-customer-marker',
  html: `<div style="width: 14px; height: 14px; border-radius: 50%; background: #E89B4C; border: 3px solid white; box-shadow: 0 0 0 2px #E89B4C;"></div>`,
  iconSize: [14, 14],
  iconAnchor: [7, 7],
});

function FitSize() {
  const map = useMap();
  const fired = useRef(false);
  useEffect(() => {
    if (fired.current) return;
    fired.current = true;
    setTimeout(() => map.invalidateSize(), 100);
  }, [map]);
  return null;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}
