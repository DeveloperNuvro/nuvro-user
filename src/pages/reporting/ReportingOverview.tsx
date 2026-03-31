import React, { useMemo } from 'react';
import { useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { Bot, MessageSquare, BrainCircuit, UserPlus, Users, BarChart3, PieChartIcon, Activity, Server } from 'lucide-react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts';

import { RootState } from '@/app/store';
import ReportStatCard from './ReportStatCard';
import ReportChartCard from './ReportChartCard';
import ReportEmptyChart from './ReportEmptyChart';
import { pivotAssignmentsByDay, formatChartDateLabel, REPORT_CHART_COLORS } from './reportingUtils';
import { REPORT_CHART_TOOLTIP, REPORT_AXIS_TICK, REPORT_LEGEND_WRAPPER, REPORT_SLICE_STROKE } from './reportingVisual';
import { renderReportingPieLabel } from './reportingPieLabel';

const ReportingOverview: React.FC = () => {
  const { t } = useTranslation();
  const reporting = useSelector((state: RootState) => state.reporting);

  const defs = useMemo(
    () => ({
      aiMessages: t('reporting.def.aiMessages', 'Count of messages sent by the AI (sender = ai) within the selected date range.'),
      aiConversations: t('reporting.def.aiConversations', 'Number of distinct conversations where the AI sent at least one message in the selected date range.'),
      aiAssignments: t('reporting.def.aiAssignments', 'Count of assignment actions created automatically by AI escalation/transfer (not the number of messages).'),
      manualAssignments: t('reporting.def.manualAssignments', 'Count of assignment actions triggered manually by a user (business/agent) when assigning/transferring a conversation.'),
      aiTickets: t('reporting.def.aiTickets', 'Tickets created automatically by AI escalation in the selected date range.'),
      humanTickets: t('reporting.def.humanTickets', 'Tickets created manually by a human (dashboard/user) in the selected date range.'),
      systemTickets: t(
        'reporting.def.systemTickets',
        'Tickets created by automated flows (e.g. chat workflow handoff to queue) in the selected date range.'
      ),
      systemAssignments: t(
        'reporting.def.systemAssignments',
        'Assignment actions recorded as system (e.g. workflow assign_to when an agent is connected, or legacy normalized events).'
      ),
    }),
    [t]
  );

  const totalsByType = useMemo(() => {
    const totals = reporting.assignments?.totals || [];
    const get = (type: 'ai' | 'manual' | 'system') => totals.find((r) => r.assignedByType === type)?.count ?? 0;
    return { ai: get('ai'), manual: get('manual'), system: get('system') };
  }, [reporting.assignments]);

  const ticketTotals = reporting.tickets?.totals || { ai: 0, human: 0, system: 0, total: 0 };

  const assignmentPieData = useMemo(
    () => [
      { name: 'AI', value: totalsByType.ai, color: REPORT_CHART_COLORS.ai },
      { name: t('reporting.manualShort', 'Manual'), value: totalsByType.manual, color: REPORT_CHART_COLORS.manual },
      { name: t('reporting.systemShort', 'System'), value: totalsByType.system, color: REPORT_CHART_COLORS.system },
    ].filter((d) => d.value > 0),
    [totalsByType, t]
  );

  const ticketPieData = useMemo(
    () => [
      { name: 'AI', value: ticketTotals.ai, color: REPORT_CHART_COLORS.ai },
      { name: t('reporting.humanShort', 'Human'), value: ticketTotals.human, color: REPORT_CHART_COLORS.primary },
      { name: t('reporting.systemShort', 'System'), value: ticketTotals.system, color: REPORT_CHART_COLORS.system },
    ].filter((d) => d.value > 0),
    [ticketTotals, t]
  );

  const dailyTotals = useMemo(() => {
    const rows = pivotAssignmentsByDay(reporting.assignments?.daily || []);
    return rows.map((r) => ({
      ...r,
      label: formatChartDateLabel(r.date),
      total: r.ai + r.manual + r.system,
    }));
  }, [reporting.assignments?.daily]);

  return (
    <div className="space-y-10">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        <ReportStatCard
          variant="violet"
          title={t('reporting.aiMessages', 'AI Messages')}
          value={reporting.userPerformance?.ai.messages ?? 0}
          icon={<Bot className="h-6 w-6" />}
          description={t('reporting.aiMessagesDesc', 'Messages sent by AI in selected range')}
          helpText={defs.aiMessages}
        />
        <ReportStatCard
          variant="sky"
          title={t('reporting.aiConversations', 'AI Conversations')}
          value={reporting.userPerformance?.ai.conversations ?? 0}
          icon={<MessageSquare className="h-6 w-6" />}
          description={t('reporting.aiConversationsDesc', 'Distinct conversations AI replied to')}
          helpText={defs.aiConversations}
        />
        <ReportStatCard
          variant="rose"
          title={t('reporting.aiAssignments', 'AI Assignments')}
          value={totalsByType.ai}
          icon={<BrainCircuit className="h-6 w-6" />}
          description={t('reporting.aiAssignmentsDesc', 'Contacts assigned by AI')}
          helpText={defs.aiAssignments}
        />
        <ReportStatCard
          variant="emerald"
          title={t('reporting.manualAssignments', 'Manual Assignments')}
          value={totalsByType.manual}
          icon={<UserPlus className="h-6 w-6" />}
          description={t('reporting.manualAssignmentsDesc', 'Contacts assigned manually')}
          helpText={defs.manualAssignments}
        />
        <ReportStatCard
          variant="default"
          title={t('reporting.systemAssignments', 'System assignments')}
          value={totalsByType.system}
          icon={<Server className="h-6 w-6" />}
          description={t('reporting.systemAssignmentsDesc', 'Workflow and automated routing')}
          helpText={defs.systemAssignments}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <ReportStatCard
          variant="rose"
          title={t('reporting.aiTickets', 'AI Tickets Created')}
          value={ticketTotals.ai}
          icon={<BrainCircuit className="h-6 w-6" />}
          description={t('reporting.aiTicketsDesc', 'Tickets created by AI escalation')}
          helpText={defs.aiTickets}
        />
        <ReportStatCard
          variant="amber"
          title={t('reporting.humanTickets', 'Human Tickets Created')}
          value={ticketTotals.human}
          icon={<Users className="h-6 w-6" />}
          description={t('reporting.humanTicketsDesc', 'Tickets created manually by a human')}
          helpText={defs.humanTickets}
        />
        <ReportStatCard
          variant="default"
          title={t('reporting.systemTickets', 'Workflow / system tickets')}
          value={ticketTotals.system}
          icon={<Server className="h-6 w-6" />}
          description={t('reporting.systemTicketsDesc', 'Tickets created by automated workflow handoff')}
          helpText={defs.systemTickets}
        />
        <ReportStatCard
          variant="default"
          title={t('reporting.totalTickets', 'Total Tickets')}
          value={ticketTotals.total}
          icon={<BarChart3 className="h-6 w-6" />}
          description={t('reporting.totalTicketsDesc', 'Total tickets created in selected range')}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <ReportChartCard
          accent="violet"
          icon={<PieChartIcon className="h-4 w-4" />}
          title={t('reporting.charts.assignmentsSplit', 'Assignments by source')}
          description={t('reporting.charts.assignmentsSplitHint', 'Share of AI vs manual vs system assignment events.')}
        >
          {assignmentPieData.length === 0 ? (
            <ReportEmptyChart message={t('reporting.noData', 'No data')} />
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={assignmentPieData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={52}
                  outerRadius={88}
                  paddingAngle={3}
                  stroke={REPORT_SLICE_STROKE}
                  strokeWidth={2}
                  label={renderReportingPieLabel}
                  labelLine={{ stroke: 'var(--muted-foreground)', strokeOpacity: 0.45 }}
                >
                  {assignmentPieData.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip {...REPORT_CHART_TOOLTIP} />
                <Legend wrapperStyle={REPORT_LEGEND_WRAPPER} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </ReportChartCard>

        <ReportChartCard
          accent="sunset"
          icon={<PieChartIcon className="h-4 w-4" />}
          title={t('reporting.charts.ticketsSplit', 'Tickets by creator type')}
          description={t('reporting.charts.ticketsSplitHint', 'How tickets were created in the selected range.')}
        >
          {ticketPieData.length === 0 ? (
            <ReportEmptyChart message={t('reporting.noData', 'No data')} />
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={ticketPieData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={52}
                  outerRadius={88}
                  paddingAngle={3}
                  stroke={REPORT_SLICE_STROKE}
                  strokeWidth={2}
                  label={renderReportingPieLabel}
                  labelLine={{ stroke: 'var(--muted-foreground)', strokeOpacity: 0.45 }}
                >
                  {ticketPieData.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip {...REPORT_CHART_TOOLTIP} />
                <Legend wrapperStyle={REPORT_LEGEND_WRAPPER} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </ReportChartCard>
      </div>

      <ReportChartCard
        accent="ocean"
        chartHeightClass="min-h-[300px] h-[340px]"
        icon={<Activity className="h-4 w-4" />}
        title={t('reporting.charts.assignmentVolume', 'Assignment volume over time')}
        description={t('reporting.charts.assignmentVolumeHint', 'Total assignment events per day (all sources).')}
      >
        {dailyTotals.length === 0 ? (
          <ReportEmptyChart message={t('reporting.noData', 'No data')} />
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={dailyTotals} margin={{ top: 12, right: 12, left: 4, bottom: 4 }}>
              <defs>
                <linearGradient id="reportLineGrad" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor={REPORT_CHART_COLORS.primary} />
                  <stop offset="100%" stopColor={REPORT_CHART_COLORS.ai} />
                </linearGradient>
                <filter id="reportLineGlow" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="2" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>
              <CartesianGrid strokeDasharray="4 8" stroke="var(--border)" vertical={false} opacity={0.65} />
              <XAxis dataKey="label" tick={REPORT_AXIS_TICK} axisLine={false} tickLine={false} dy={6} />
              <YAxis allowDecimals={false} tick={REPORT_AXIS_TICK} axisLine={false} tickLine={false} width={36} />
              <Tooltip {...REPORT_CHART_TOOLTIP} labelFormatter={(_, p) => (p?.[0]?.payload?.date as string) || ''} />
              <Line
                type="monotone"
                dataKey="total"
                name={t('reporting.charts.assignments', 'Assignments')}
                stroke="url(#reportLineGrad)"
                strokeWidth={3}
                filter="url(#reportLineGlow)"
                dot={{
                  r: 5,
                  strokeWidth: 2,
                  stroke: 'var(--background)',
                  fill: REPORT_CHART_COLORS.primary,
                }}
                activeDot={{ r: 7, strokeWidth: 2, stroke: 'var(--background)' }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </ReportChartCard>
    </div>
  );
};

export default ReportingOverview;
