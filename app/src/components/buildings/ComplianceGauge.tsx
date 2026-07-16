import type { Building360 } from '../../services/buildings';

const COLOR: Record<Building360['complianceLevel'], string> = {
  green: '#22A745',
  amber: '#D97706',
  red:   '#C8102E',
};

const TRACK: Record<Building360['complianceLevel'], string> = {
  green: '#D4F4DD',
  amber: '#FEF3CD',
  red:   '#FCEAEC',
};

// A 3/4-circle gauge (270° arc). Reads like an automotive speedometer — open
// at the bottom, with tick marks at the ends. Far more characterful than a
// plain text "0/100" and informative at a glance.
export function ComplianceGauge({ score, level, size = 124 }: { score: number; level: Building360['complianceLevel']; size?: number }) {
  const stroke = 12;
  const r = (size - stroke) / 2;
  const c = size / 2;
  // 270° sweep, starting at 135° (south-west), ending at 405° (south-east)
  const startAngle = 135;
  const sweep = 270;
  const radians = (deg: number) => (deg * Math.PI) / 180;
  const arcPoint = (angle: number, radius = r) => ({
    x: c + radius * Math.cos(radians(angle)),
    y: c + radius * Math.sin(radians(angle)),
  });
  const trackEnd = arcPoint(startAngle + sweep);
  const trackStart = arcPoint(startAngle);
  const fillEnd = arcPoint(startAngle + (sweep * score) / 100);

  // SVG large-arc flag = 1 if arc > 180°, sweep-flag = 1 for clockwise
  const trackPath = `M ${trackStart.x} ${trackStart.y} A ${r} ${r} 0 1 1 ${trackEnd.x} ${trackEnd.y}`;
  const largeArc = score > 50 ? 1 : 0;
  const fillPath = score > 0
    ? `M ${trackStart.x} ${trackStart.y} A ${r} ${r} 0 ${largeArc} 1 ${fillEnd.x} ${fillEnd.y}`
    : null;

  return (
    <div className="relative grid place-items-center shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="absolute inset-0">
        <path d={trackPath} stroke={TRACK[level]} strokeWidth={stroke} fill="none" strokeLinecap="round" />
        {fillPath && (
          <path d={fillPath} stroke={COLOR[level]} strokeWidth={stroke} fill="none" strokeLinecap="round" />
        )}
        {/* End-of-track tick marks */}
        <circle cx={trackStart.x} cy={trackStart.y} r={stroke / 4} fill={COLOR[level]} opacity={0.6} />
        <circle cx={trackEnd.x}   cy={trackEnd.y}   r={stroke / 4} fill={TRACK[level]} />
      </svg>
      <div className="relative grid place-items-center text-center">
        <div className="font-display font-extrabold leading-none tracking-tight" style={{ fontSize: size * 0.32, color: COLOR[level] }}>
          {score}
        </div>
        <div className="text-[9px] font-sans uppercase tracking-[0.22em] text-neutral-400 mt-1">/ 100</div>
      </div>
    </div>
  );
}
