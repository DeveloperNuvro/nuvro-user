import type { AssignmentDailyRow, UserPerformanceAgentRow } from '@/features/reporting/reportingSlice';

/** Richer, print-friendly palette tuned for light + dark UI. */
export const REPORT_CHART_COLORS = {
  ai: '#8b5cf6',
  manual: '#10b981',
  system: '#94a3b8',
  /** Lighter slate for bar gradients (system / workflow). */
  systemSoft: '#cbd5e1',
  primary: '#e11d8c',
  primarySoft: '#f472b6',
  messages: '#2563eb',
  closed: '#0d9488',
  contacts: '#ea580c',
} as const;

/** Pivot assignment daily rows into one object per calendar day for Recharts. */
export function pivotAssignmentsByDay(daily: AssignmentDailyRow[]) {
  const byDate = new Map<string, { date: string; ai: number; manual: number; system: number }>();
  for (const row of daily || []) {
    const d = row.date;
    if (!byDate.has(d)) byDate.set(d, { date: d, ai: 0, manual: 0, system: 0 });
    const bucket = byDate.get(d)!;
    if (row.assignedByType === 'ai') bucket.ai += row.count;
    else if (row.assignedByType === 'manual') bucket.manual += row.count;
    else bucket.system += row.count;
  }
  return Array.from(byDate.values()).sort((a, b) => a.date.localeCompare(b.date));
}

export function agentBarChartData(agents: UserPerformanceAgentRow[]) {
  return (agents || []).map((a) => ({
    name: a.user.length > 18 ? `${a.user.slice(0, 16)}…` : a.user,
    fullName: a.user,
    messages: a.messagesSent,
    assigned: a.conversationsAssigned,
    closed: a.conversationsClosed,
    contacts: a.uniqueContacts,
  }));
}

export function formatChartDateLabel(isoDate: string) {
  const [y, m, d] = isoDate.split('-').map(Number);
  if (!y || !m || !d) return isoDate;
  return `${m}/${d}`;
}
