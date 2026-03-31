import React, { useMemo } from 'react';
import { useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { GitBranch, BarChart3 } from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, AreaChart, Area } from 'recharts';

import { RootState } from '@/app/store';
import { Badge } from '@/components/ui/badge';
import ReportChartCard from './ReportChartCard';
import ReportSurfaceCard from './ReportSurfaceCard';
import ReportEmptyChart from './ReportEmptyChart';
import { pivotAssignmentsByDay, formatChartDateLabel, REPORT_CHART_COLORS } from './reportingUtils';
import { REPORT_CHART_TOOLTIP, REPORT_AXIS_TICK, REPORT_LEGEND_WRAPPER } from './reportingVisual';

const ReportingAssignmentsReport: React.FC = () => {
  const { t } = useTranslation();
  const reporting = useSelector((state: RootState) => state.reporting);

  const assignments = reporting.assignments;
  const agents = reporting.userPerformance?.agents || [];

  const idToName = useMemo(() => new Map(agents.map((a) => [a.agentId, a.user])), [agents]);

  const byAgentChart = useMemo(() => {
    const rows = (assignments?.byAgent || [])
      .map((b) => ({
        name: (idToName.get(b.agentId) || t('reporting.assignments.unknownAgent', 'Unknown')).slice(0, 20),
        fullName: idToName.get(b.agentId) || t('reporting.assignments.unknownAgent', 'Unknown'),
        count: b.count,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 15);
    return rows;
  }, [assignments?.byAgent, idToName, t]);

  const stackedDaily = useMemo(() => {
    const rows = pivotAssignmentsByDay(assignments?.daily || []);
    return rows.map((r) => ({ ...r, label: formatChartDateLabel(r.date) }));
  }, [assignments?.daily]);

  const badgeFor = (type: string) => {
    const map: Record<string, string> = {
      ai: 'border-violet-500/30 bg-violet-500/10 text-violet-700 dark:text-violet-200',
      manual: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-800 dark:text-emerald-200',
      system: 'border-slate-500/30 bg-slate-500/10 text-slate-700 dark:text-slate-200',
    };
    return map[type] || 'border-border bg-muted/50';
  };

  return (
    <div className="space-y-10">
      <ReportSurfaceCard
        accent="violet"
        icon={<GitBranch className="h-4 w-4" />}
        title={t('reporting.assignmentReport', 'Assignment Report')}
        description={t(
          'reporting.assignmentHint',
          'Counts reflect assignment events: AI escalation/transfer, manual inbox transfers, and workflow/system routing (e.g. assign_to).'
        )}
        headerAction={
          <div className="flex flex-wrap justify-end gap-2">
            {(assignments?.totals || []).map((r) => (
              <Badge
                key={r.assignedByType}
                variant="outline"
                className={`text-xs font-semibold shadow-sm ${badgeFor(r.assignedByType)}`}
              >
                {r.assignedByType.toUpperCase()}: {r.count}
                <span className="ml-1.5 font-normal opacity-80">({r.uniqueConversations} conv.)</span>
              </Badge>
            ))}
          </div>
        }
        contentClassName="space-y-3"
      >
        <p className="text-sm leading-relaxed text-muted-foreground dark:text-neutral-400">
          <span className="font-semibold text-foreground">{t('reporting.legend', 'Legend')}:</span>{' '}
          {t(
            'reporting.legendText',
            'AI = AI escalation/transfer, Manual = assigned by a user in the inbox, System = workflow/automation (e.g. assign_to) and other system-recorded events.'
          )}
        </p>
      </ReportSurfaceCard>

      <ReportChartCard
        accent="ocean"
        chartHeightClass="min-h-[300px] h-[360px]"
        icon={<GitBranch className="h-4 w-4" />}
        title={t('reporting.assignments.stackedTitle', 'Assignment flow by day')}
        description={t('reporting.assignments.stackedHint', 'Stacked AI, manual, and system assignment events.')}
      >
        {stackedDaily.length === 0 ? (
          <ReportEmptyChart message={t('reporting.noData', 'No data')} />
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={stackedDaily} margin={{ top: 12, right: 12, left: 4, bottom: 4 }}>
              <defs>
                <linearGradient id="stackAi" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={REPORT_CHART_COLORS.ai} stopOpacity={0.9} />
                  <stop offset="100%" stopColor={REPORT_CHART_COLORS.ai} stopOpacity={0.35} />
                </linearGradient>
                <linearGradient id="stackMan" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={REPORT_CHART_COLORS.manual} stopOpacity={0.9} />
                  <stop offset="100%" stopColor={REPORT_CHART_COLORS.manual} stopOpacity={0.35} />
                </linearGradient>
                <linearGradient id="stackSys" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={REPORT_CHART_COLORS.system} stopOpacity={0.85} />
                  <stop offset="100%" stopColor={REPORT_CHART_COLORS.system} stopOpacity={0.3} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="4 8" stroke="var(--border)" vertical={false} opacity={0.65} />
              <XAxis dataKey="label" tick={REPORT_AXIS_TICK} axisLine={false} tickLine={false} dy={6} />
              <YAxis allowDecimals={false} tick={REPORT_AXIS_TICK} axisLine={false} tickLine={false} width={36} />
              <Tooltip {...REPORT_CHART_TOOLTIP} labelFormatter={(_, p) => (p?.[0]?.payload?.date as string) || ''} />
              <Legend wrapperStyle={REPORT_LEGEND_WRAPPER} />
              <Area type="monotone" stackId="1" dataKey="ai" name="AI" stroke={REPORT_CHART_COLORS.ai} strokeWidth={1} fill="url(#stackAi)" />
              <Area
                type="monotone"
                stackId="1"
                dataKey="manual"
                name={t('reporting.manualShort', 'Manual')}
                stroke={REPORT_CHART_COLORS.manual}
                strokeWidth={1}
                fill="url(#stackMan)"
              />
              <Area
                type="monotone"
                stackId="1"
                dataKey="system"
                name={t('reporting.systemShort', 'System')}
                stroke={REPORT_CHART_COLORS.system}
                strokeWidth={1}
                fill="url(#stackSys)"
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </ReportChartCard>

      <ReportChartCard
        accent="rose"
        chartHeightClass="min-h-[360px] h-[420px]"
        icon={<BarChart3 className="h-4 w-4" />}
        title={t('reporting.assignments.byAgentTitle', 'Assignments landing on agents')}
        description={t('reporting.assignments.byAgentHint', 'Top agents by count of assignment events in the range.')}
      >
        {byAgentChart.length === 0 ? (
          <ReportEmptyChart message={t('reporting.noData', 'No data')} />
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={byAgentChart} layout="vertical" margin={{ top: 8, right: 20, left: 4, bottom: 8 }}>
              <defs>
                <linearGradient id="agentAssignBar" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor={REPORT_CHART_COLORS.primarySoft} stopOpacity={0.9} />
                  <stop offset="100%" stopColor={REPORT_CHART_COLORS.primary} stopOpacity={1} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="4 8" stroke="var(--border)" horizontal={false} opacity={0.5} />
              <XAxis type="number" allowDecimals={false} tick={REPORT_AXIS_TICK} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="name" width={112} tick={REPORT_AXIS_TICK} axisLine={false} tickLine={false} />
              <Tooltip
                {...REPORT_CHART_TOOLTIP}
                formatter={(v: number) => [v, t('reporting.assignments.events', 'Events')]}
                labelFormatter={(_, p) => (p?.[0]?.payload?.fullName as string) || ''}
              />
              <Legend wrapperStyle={REPORT_LEGEND_WRAPPER} />
              <Bar
                dataKey="count"
                name={t('reporting.assignments.events', 'Assignment events')}
                fill="url(#agentAssignBar)"
                radius={[0, 8, 8, 0]}
                maxBarSize={22}
              />
            </BarChart>
          </ResponsiveContainer>
        )}
      </ReportChartCard>
    </div>
  );
};

export default ReportingAssignmentsReport;
