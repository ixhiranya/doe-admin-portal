// Small area + line chart used for the Seasonality panel.

export function AreaLine({
  points,
  xLabels,
  highlightIdx,
  fill = '#FAE5C8',
  stroke = '#E89B4C',
  height = 220,
}: {
  points: number[];
  xLabels: string[];
  highlightIdx?: number;
  fill?: string;
  stroke?: string;
  height?: number;
}) {
  const padding = { top: 16, right: 16, bottom: 22, left: 36 };
  const width = 640;
  const chartH = height - padding.top - padding.bottom;
  const chartW = width - padding.left - padding.right;
  const min = Math.min(...points);
  const max = Math.max(...points);
  const yMin = Math.floor(min / 10) * 10 - 10;
  const yMax = Math.ceil(max / 10) * 10 + 10;

  const xAt = (i: number) => padding.left + (i / (points.length - 1)) * chartW;
  const yAt = (v: number) => padding.top + chartH - ((v - yMin) / (yMax - yMin)) * chartH;
  const line = points.map((v, i) => `${i === 0 ? 'M' : 'L'} ${xAt(i)} ${yAt(v)}`).join(' ');
  const area = `${line} L ${xAt(points.length - 1)} ${padding.top + chartH} L ${xAt(0)} ${padding.top + chartH} Z`;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full">
      {/* Axis ticks (3 lines) */}
      {[yMin, Math.round((yMin + yMax) / 2), yMax].map((v, i) => (
        <g key={i}>
          <line x1={padding.left} x2={width - padding.right} y1={yAt(v)} y2={yAt(v)} stroke="#EDEDE8" />
          <text x={padding.left - 6} y={yAt(v) + 3} fontSize={9} textAnchor="end" fill="#93938B" fontFamily="JetBrains Mono, monospace">{v}</text>
        </g>
      ))}
      <path d={area} fill={fill} fillOpacity={0.7} />
      <path d={line} fill="none" stroke={stroke} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      {/* Highlight dot */}
      {highlightIdx != null && (
        <circle cx={xAt(highlightIdx)} cy={yAt(points[highlightIdx])} r={5} fill="#1F2937" stroke="#fff" strokeWidth={2} />
      )}
      {/* X labels */}
      {xLabels.map((lab, i) => (
        <text key={i} x={xAt(i)} y={height - 6} fontSize={9.5} textAnchor="middle" fill="#6B7280" fontFamily="JetBrains Mono, monospace">{lab}</text>
      ))}
    </svg>
  );
}
