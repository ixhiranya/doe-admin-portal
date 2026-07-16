import type { Building360 } from '../../services/buildings';

const STAMP: Record<Building360['complianceLevel'], { label: string; color: string; tint: string }> = {
  green: { label: 'VERIFIED',     color: '#22A745', tint: 'rgba(34,167,69,0.04)' },
  amber: { label: 'IN PROGRESS',  color: '#D08338', tint: 'rgba(232,155,76,0.04)' },
  red:   { label: 'ACTION REQ.',  color: '#C8102E', tint: 'rgba(200,16,46,0.04)' },
};

// A decorative "rubber stamp" graphic — slightly rotated, distressed double-
// ring with a date band, status word, and an issuing-authority footer. Purely
// decorative; reads like an actual paper-document stamp.
export function ComplianceStamp({ level, dateLabel = 'DOE-PPS' }: { level: Building360['complianceLevel']; dateLabel?: string }) {
  const s = STAMP[level];
  const today = new Date().toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase();

  return (
    <div
      className="select-none pointer-events-none"
      style={{
        transform: 'rotate(-6deg)',
        color: s.color,
      }}
    >
      <div
        className="relative grid place-items-center rounded-full"
        style={{
          width: 132,
          height: 132,
          border: `2.5px solid ${s.color}`,
          background: s.tint,
          boxShadow: `inset 0 0 0 5px ${s.tint}, inset 0 0 0 6px ${s.color}40`,
        }}
      >
        {/* Inner ring */}
        <div
          className="absolute rounded-full"
          style={{
            inset: 6,
            border: `1px dashed ${s.color}80`,
          }}
        />

        {/* Centre content */}
        <div className="relative text-center" style={{ width: 110 }}>
          <div className="font-mono font-bold" style={{ fontSize: 8.5, letterSpacing: 1.4, opacity: 0.8 }}>
            ★ {dateLabel} ★
          </div>
          <div
            className="font-display font-black"
            style={{ fontSize: 18, letterSpacing: 1.5, lineHeight: 1, marginTop: 4, marginBottom: 4 }}
          >
            {s.label}
          </div>
          <div className="font-mono font-bold" style={{ fontSize: 8, letterSpacing: 1.2, opacity: 0.7 }}>
            {today}
          </div>
        </div>
      </div>
    </div>
  );
}
