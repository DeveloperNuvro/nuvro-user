/** Shared Recharts styling. Theme tokens are oklch — use var(--token), never hsl(var(--token)). */

export const REPORT_CHART_TOOLTIP = {
  contentStyle: {
    backgroundColor: 'var(--card)',
    border: '1px solid var(--border)',
    borderRadius: '12px',
    boxShadow: '0 12px 40px -12px color-mix(in oklch, var(--foreground) 25%, transparent)',
    padding: '10px 14px',
  },
  labelStyle: { fontWeight: 600, marginBottom: 4, color: 'var(--foreground)' },
  itemStyle: { paddingTop: 2, color: 'var(--foreground)' },
} as const;

export const REPORT_AXIS_TICK = { fill: 'var(--muted-foreground)', fontSize: 11 };

export const REPORT_LEGEND_WRAPPER = {
  paddingTop: 16,
  fontSize: '12px',
  color: 'var(--foreground)',
} as const;

/** Pie / bar slice separation */
export const REPORT_SLICE_STROKE = 'var(--background)';
