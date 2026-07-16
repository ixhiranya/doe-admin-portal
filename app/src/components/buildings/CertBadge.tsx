import { Link } from 'react-router-dom';
import { cn } from '../../lib/utils';
import { CERT_META, STATUS_TONE, type CertSummary } from '../../services/buildings';

export function CertChip({ cert, compact = false, noLink = false }: { cert: CertSummary; compact?: boolean; noLink?: boolean }) {
  const meta = CERT_META[cert.module];
  const tone = STATUS_TONE[cert.status];
  const dotColor =
    cert.status === 'active'   ? 'bg-success-500' :
    cert.status === 'expiring' ? 'bg-warning-500' :
    cert.status === 'pending'  ? 'bg-info-500' :
    cert.status === 'expired'  ? 'bg-danger-500' :
    cert.status === 'rejected' ? 'bg-danger-500' :
    cert.status === 'cancelled'? 'bg-neutral-400' :
    'bg-neutral-300';

  const content = (
    <div className={cn(
      'flex items-center gap-2 px-2.5 py-1.5 rounded-md border ring-1',
      tone.bg, tone.ring,
      compact ? 'text-[10.5px]' : 'text-[11.5px]',
      'border-transparent',
    )}>
      <span className={cn('w-1.5 h-1.5 rounded-full', dotColor)} />
      <span className={cn('font-sans font-semibold uppercase tracking-wider', meta.iconText)}>{meta.shortLabel}</span>
      <span className={cn('font-semibold', tone.fg)}>{cert.statusLabel}</span>
      {cert.inFlight && (
        <span className="ml-1 text-[9px] font-sans uppercase tracking-wider text-action-orange-deep">↻ open</span>
      )}
    </div>
  );

  if (cert.applicationId && !noLink) {
    return <Link to={`/app/${cert.applicationId}`} className="hover:opacity-80 transition" onClick={(e) => e.stopPropagation()}>{content}</Link>;
  }
  return content;
}

export function CertTriad({ coc, noc, amc, compact = false, noLink = false }: { coc: CertSummary; noc: CertSummary; amc: CertSummary; compact?: boolean; noLink?: boolean }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      <CertChip cert={coc} compact={compact} noLink={noLink} />
      <CertChip cert={noc} compact={compact} noLink={noLink} />
      <CertChip cert={amc} compact={compact} noLink={noLink} />
    </div>
  );
}
