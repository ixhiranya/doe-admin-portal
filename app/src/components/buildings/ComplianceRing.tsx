import { cn } from '../../lib/utils';

interface Props {
  score: number;            // 0-100
  level: 'green' | 'amber' | 'red';
  size?: number;
  thickness?: number;
  label?: string;
}

const LEVEL_COLOR: Record<Props['level'], string> = {
  green: '#22A745',
  amber: '#D97706',
  red:   '#DC2626',
};

const LEVEL_TRACK: Record<Props['level'], string> = {
  green: '#D4F4DD',
  amber: '#FEF3CD',
  red:   '#FEE2E2',
};

export function ComplianceRing({ score, level, size = 64, thickness = 7, label }: Props) {
  const radius = (size - thickness) / 2;
  const circumference = 2 * Math.PI * radius;
  const dash = (score / 100) * circumference;

  return (
    <div className="relative grid place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90 absolute inset-0">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={LEVEL_TRACK[level]} strokeWidth={thickness} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={LEVEL_COLOR[level]}
          strokeWidth={thickness}
          strokeLinecap="round"
          strokeDasharray={`${dash} ${circumference - dash}`}
        />
      </svg>
      <div className="relative text-center leading-none">
        <div className={cn('font-display font-bold')} style={{ color: LEVEL_COLOR[level], fontSize: size / 3.6 }}>
          {score}
        </div>
        {label && <div className="text-[9px] uppercase tracking-wider text-neutral-500 mt-0.5">{label}</div>}
      </div>
    </div>
  );
}
