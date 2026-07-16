import type { CertSummary } from '../../services/buildings';

// Horizontal timeline bar showing a certificate's lifecycle. Issue date at
// the left, expiry at the right, current position marked with a vertical
// indicator. Renders something sensible for every status — even "Not on
// File" gets a dashed track with an "Awaiting issuance" caption.
//
// This is the small piece of visualisation that turns the cert card from
// a text block into a quick-glance "case file" entry.

export function CertLifeline({ cert }: { cert: CertSummary }) {
  const tone =
    cert.status === 'active'   ? '#22A745' :
    cert.status === 'expiring' ? '#D97706' :
    cert.status === 'pending'  ? '#0E76A8' :
    cert.status === 'expired'  ? '#C8102E' :
    cert.status === 'rejected' ? '#C8102E' :
    cert.status === 'cancelled'? '#93938B' :
                                  '#B8B8B0';

  // No issue date — render a dashed "awaiting" lane
  if (!cert.issuedAt) {
    return (
      <div className="mt-3">
        <div className="relative h-1.5 rounded-full border border-dashed border-neutral-300" />
        <div className="flex justify-between items-center mt-1 text-[9.5px] font-sans uppercase tracking-[0.16em] text-neutral-400">
          <span>Awaiting issuance</span>
          <span>—</span>
        </div>
      </div>
    );
  }

  const issued = new Date(cert.issuedAt).getTime();
  const expires = cert.expiresAt ? new Date(cert.expiresAt).getTime() : null;
  const now = Date.now();

  // For non-expiring certs (e.g. COC, AMC cancellations) we just show a stamp
  // at the issue date with the rest of the line "settled" — no progress fill.
  const total = expires ? expires - issued : 0;
  const progress = expires ? Math.max(0, Math.min(1, (now - issued) / total)) : 1;

  return (
    <div className="mt-3">
      <div className="relative h-1.5 rounded-full bg-neutral-100 overflow-hidden">
        <div
          className="absolute inset-y-0 left-0 rounded-full"
          style={{
            width: `${progress * 100}%`,
            background: tone,
            opacity: 0.85,
          }}
        />
        {/* Current-time marker */}
        {expires && now < expires && (
          <div
            className="absolute top-1/2 -translate-y-1/2 w-2 h-2 rounded-full ring-2 ring-white"
            style={{ left: `calc(${progress * 100}% - 4px)`, background: tone, boxShadow: `0 0 0 2px ${tone}33` }}
          />
        )}
      </div>
      <div className="flex justify-between items-center mt-1 text-[9.5px] font-sans uppercase tracking-[0.16em] text-neutral-500">
        <span title={cert.issuedAt}>{shortDate(cert.issuedAt)}</span>
        {expires ? (
          <span title={cert.expiresAt}>{shortDate(cert.expiresAt!)}</span>
        ) : (
          <span className="text-neutral-300">no expiry</span>
        )}
      </div>
    </div>
  );
}

function shortDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', year: '2-digit' }).toUpperCase();
}
