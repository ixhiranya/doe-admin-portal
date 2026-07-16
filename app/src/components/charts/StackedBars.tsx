// Tiny inline-SVG stacked-bar chart used on the PPS Dashboard.
// Designed to match the prototype reference visuals — no chart library.

export interface StackedBar {
  /** Label under the bar (e.g. "19", "20", or month name) */
  label: string;
  /** Stacked segments, rendered bottom-to-top */
  segments: number[];
}

export function StackedBars({
  bars,
  segmentColors,
  unit = '',
  height = 260,
  ticks = 4,
  showValuesOnTop = false,
  formatTotal = (n) => n.toFixed(2),
}: {
  bars: StackedBar[];
  segmentColors: string[];
  unit?: string;
  height?: number;
  ticks?: number;
  showValuesOnTop?: boolean;
  formatTotal?: (n: number) => string;
}) {
  const padding = { top: 24, right: 8, bottom: 28, left: 36 };
  const max = Math.max(...bars.map((b) => b.segments.reduce((s, v) => s + v, 0))) || 1;
  const niceMax = Math.ceil(max / 0.3) * 0.3 || max;
  const width = Math.max(420, bars.length * 60 + padding.left + padding.right);
  const chartH = height - padding.top - padding.bottom;
  const barW = ((width - padding.left - padding.right) / bars.length) * 0.7;
  const slot = (width - padding.left - padding.right) / bars.length;
  const yScale = (v: number) => padding.top + chartH - (v / niceMax) * chartH;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full">
      {/* Grid + axis ticks */}
      {Array.from({ length: ticks + 1 }, (_, i) => {
        const v = (niceMax / ticks) * (ticks - i);
        return (
          <g key={i}>
            <line x1={padding.left} x2={width - padding.right} y1={yScale(v)} y2={yScale(v)} stroke="#EDEDE8" strokeWidth={1} />
            <text x={padding.left - 6} y={yScale(v) + 3} fontSize={9} textAnchor="end" fill="#93938B" fontFamily="JetBrains Mono, monospace">{formatTotal(v)}</text>
          </g>
        );
      })}
      <text x={padding.left} y={padding.top - 8} fontSize={9} fill="#93938B" fontFamily="JetBrains Mono, monospace">{unit}</text>

      {/* Bars */}
      {bars.map((bar, i) => {
        const x = padding.left + i * slot + (slot - barW) / 2;
        let yCursor = yScale(0);
        const total = bar.segments.reduce((s, v) => s + v, 0);
        return (
          <g key={i}>
            {bar.segments.map((seg, si) => {
              const h = (seg / niceMax) * chartH;
              yCursor -= h;
              return (
                <rect
                  key={si}
                  x={x}
                  y={yCursor}
                  width={barW}
                  height={Math.max(0, h)}
                  fill={segmentColors[si] || '#999'}
                />
              );
            })}
            {showValuesOnTop && (
              <text x={x + barW / 2} y={yScale(total) - 6} fontSize={10} textAnchor="middle" fill="#1F2937" fontFamily="JetBrains Mono, monospace">
                {formatTotal(total)}
              </text>
            )}
            <text x={x + barW / 2} y={height - 8} fontSize={9.5} textAnchor="middle" fill="#6B7280" fontFamily="JetBrains Mono, monospace">{bar.label}</text>
          </g>
        );
      })}
    </svg>
  );
}
