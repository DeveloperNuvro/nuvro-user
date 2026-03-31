import React from 'react';

/** Recharts pie `label` — string labels ignore theme; this uses CSS variables for dark/light. */
export function renderReportingPieLabel(props: {
  name?: string;
  percent?: number;
  x?: number;
  y?: number;
  textAnchor?: 'start' | 'middle' | 'end' | 'inherit';
  dominantBaseline?: React.SVGTextElementAttributes<SVGTextElement>['dominantBaseline'];
}) {
  const { name, percent, x, y, textAnchor, dominantBaseline } = props;
  if (x == null || y == null || name == null) return null;
  const pct = Math.round((percent ?? 0) * 100);
  return (
    <text
      x={x}
      y={y}
      textAnchor={textAnchor ?? 'middle'}
      dominantBaseline={dominantBaseline ?? 'central'}
      fill="var(--foreground)"
      fontSize={11}
      fontWeight={600}
      style={{ paintOrder: 'stroke fill', stroke: 'var(--background)', strokeWidth: 2.5, strokeLinejoin: 'round' }}
    >
      {`${name} ${pct}%`}
    </text>
  );
}
