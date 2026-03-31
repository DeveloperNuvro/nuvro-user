import React, { useMemo } from 'react';
import { useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { Bot, MessageSquare, BrainCircuit, UserPlus, TrendingUp, PieChartIcon, Server, Sparkles, Users, GitBranch } from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

import { RootState } from '@/app/store';
import ReportStatCard from './ReportStatCard';
import ReportChartCard from './ReportChartCard';
import ReportEmptyChart from './ReportEmptyChart';
import { pivotAssignmentsByDay, formatChartDateLabel, REPORT_CHART_COLORS } from './reportingUtils';
import { REPORT_CHART_TOOLTIP, REPORT_AXIS_TICK, REPORT_LEGEND_WRAPPER, REPORT_SLICE_STROKE } from './reportingVisual';
import { renderReportingPieLabel } from './reportingPieLabel';

const WORKFLOW_SURFACE_CHART_COLORS: Record<string, string> = {
  widget: REPORT_CHART_COLORS.messages,
  whatsapp_meta: REPORT_CHART_COLORS.primary,
  unipile_whatsapp: REPORT_CHART_COLORS.ai,
  whapi_whatsapp: REPORT_CHART_COLORS.closed,
  unipile_other: REPORT_CHART_COLORS.contacts,
  unknown: REPORT_CHART_COLORS.system,
};

const ReportingAiReport: React.FC = () => {
  const { t } = useTranslation();
  const reporting = useSelector((state: RootState) => state.reporting);

  const defs = useMemo(
    () => ({
      aiMessages: t('reporting.def.aiMessages', 'Count of messages sent by the AI (sender = ai) within the selected date range.'),
      aiConversations: t('reporting.def.aiConversations', 'Number of distinct conversations where the AI sent at least one message in the selected date range.'),
      aiAssignments: t('reporting.def.aiAssignments', 'Count of assignment actions created automatically by AI escalation/transfer (not the number of messages).'),
      manualAssignments: t('reporting.def.manualAssignments', 'Count of assignment actions triggered manually by a user (business/agent) when assigning/transferring a conversation.'),
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

  const shareData = useMemo(
    () => [
      { name: 'AI', value: totalsByType.ai, color: REPORT_CHART_COLORS.ai },
      { name: t('reporting.manualShort', 'Manual'), value: totalsByType.manual, color: REPORT_CHART_COLORS.manual },
      { name: t('reporting.systemShort', 'System'), value: totalsByType.system, color: REPORT_CHART_COLORS.system },
    ].filter((d) => d.value > 0),
    [totalsByType, t]
  );

  const aiDaily = useMemo(() => {
    const rows = pivotAssignmentsByDay(reporting.assignments?.daily || []);
    return rows.map((r) => ({
      ...r,
      label: formatChartDateLabel(r.date),
    }));
  }, [reporting.assignments?.daily]);

  const hasAiActivity = aiDaily.some((d) => d.ai > 0);

  const wf = reporting.workflowAnalytics;
  const wfTotals = wf?.totals;

  const talkWithAiPie = useMemo(() => {
    const rows = wf?.bySurface || [];
    return rows
      .filter((r) => Number(r.count) > 0)
      .map((r) => ({
        key: r.inboundSurface,
        name: t(`reporting.workflowSurface.${r.inboundSurface}`, r.inboundSurface),
        value: Number(r.count) || 0,
        color: WORKFLOW_SURFACE_CHART_COLORS[r.inboundSurface] || REPORT_CHART_COLORS.systemSoft,
      }));
  }, [wf?.bySurface, t]);

  const talkWithAiDaily = useMemo(() => {
    const rows = wf?.daily || [];
    return rows.map((r) => ({
      ...r,
      count: Number(r.count) || 0,
      label: formatChartDateLabel(r.date),
    }));
  }, [wf?.daily]);

  const hasTalkWithAiTrend = talkWithAiDaily.some((d) => d.count > 0);

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

      <div className="grid gap-6 lg:grid-cols-2">
        <ReportChartCard
          accent="violet"
          chartHeightClass="min-h-[280px] h-[320px]"
          icon={<TrendingUp className="h-4 w-4" />}
          title={t('reporting.ai.aiAssignmentsTrend', 'AI assignment events over time')}
          description={t('reporting.ai.aiAssignmentsTrendHint', 'Daily count of assignments initiated by AI.')}
        >
          {!hasAiActivity ? (
            <ReportEmptyChart message={t('reporting.noData', 'No data')} />
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={aiDaily} margin={{ top: 12, right: 12, left: 4, bottom: 4 }}>
                <defs>
                  <linearGradient id="aiAreaGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={REPORT_CHART_COLORS.ai} stopOpacity={0.45} />
                    <stop offset="100%" stopColor={REPORT_CHART_COLORS.ai} stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="4 8" stroke="var(--border)" vertical={false} opacity={0.65} />
                <XAxis dataKey="label" tick={REPORT_AXIS_TICK} axisLine={false} tickLine={false} dy={6} />
                <YAxis allowDecimals={false} tick={REPORT_AXIS_TICK} axisLine={false} tickLine={false} width={36} />
                <Tooltip {...REPORT_CHART_TOOLTIP} labelFormatter={(_, p) => (p?.[0]?.payload?.date as string) || ''} />
                <Legend wrapperStyle={REPORT_LEGEND_WRAPPER} />
                <Area
                  type="monotone"
                  dataKey="ai"
                  name={t('reporting.aiAssignments', 'AI Assignments')}
                  stroke={REPORT_CHART_COLORS.ai}
                  strokeWidth={2.5}
                  fill="url(#aiAreaGrad)"
                  dot={{ r: 3, strokeWidth: 2, stroke: 'var(--background)', fill: REPORT_CHART_COLORS.ai }}
                  activeDot={{ r: 5 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </ReportChartCard>

        <ReportChartCard
          accent="rose"
          chartHeightClass="min-h-[280px] h-[320px]"
          icon={<PieChartIcon className="h-4 w-4" />}
          title={t('reporting.ai.routingMix', 'AI vs human routing')}
          description={t('reporting.ai.routingMixHint', 'Assignment mix helps you see how often AI escalates vs manual handoff.')}
        >
          {shareData.length === 0 ? (
            <ReportEmptyChart message={t('reporting.noData', 'No data')} />
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={shareData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={56}
                  outerRadius={92}
                  paddingAngle={3}
                  stroke={REPORT_SLICE_STROKE}
                  strokeWidth={2}
                  label={renderReportingPieLabel}
                  labelLine={{ stroke: 'var(--muted-foreground)', strokeOpacity: 0.45 }}
                >
                  {shareData.map((entry) => (
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

      <div className="border-t border-border pt-10">
        <h2 className="mb-1 text-lg font-semibold tracking-tight text-foreground">
          {t('reporting.ai.workflowTalkWithAiTitle', 'Workflow: Talk with AI')}
        </h2>
        <p className="mb-6 max-w-3xl text-sm text-muted-foreground">
          {t(
            'reporting.ai.workflowTalkWithAiIntro',
            'When customers pick “Talk with AI” in your chat workflow, we record it by channel (website widget, WhatsApp, and other linked entry points). Total events counts every choice; unique customers and conversations show how many distinct people chose this path.'
          )}
        </p>
        <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <ReportStatCard
            variant="violet"
            title={t('reporting.ai.talkWithAiEvents', 'Talk with AI — events')}
            value={wfTotals?.totalEvents ?? 0}
            icon={<Sparkles className="h-6 w-6" />}
            description={t('reporting.ai.talkWithAiEventsDesc', 'Times users selected this workflow option')}
            helpText={t(
              'reporting.def.talkWithAiEvents',
              'Each time a user confirms “Talk with AI” in the workflow (same user can count more than once).'
            )}
          />
          <ReportStatCard
            variant="sky"
            title={t('reporting.ai.talkWithAiUniqueCustomers', 'Unique customers')}
            value={wfTotals?.uniqueCustomers ?? 0}
            icon={<Users className="h-6 w-6" />}
            description={t('reporting.ai.talkWithAiUniqueCustomersDesc', 'Distinct customers who chose Talk with AI')}
            helpText={t(
              'reporting.def.talkWithAiUniqueCustomers',
              'Number of different customers who picked “Talk with AI” at least once in the range.'
            )}
          />
          <ReportStatCard
            variant="emerald"
            title={t('reporting.ai.talkWithAiUniqueConversations', 'Unique conversations')}
            value={wfTotals?.uniqueConversations ?? 0}
            icon={<GitBranch className="h-6 w-6" />}
            description={t('reporting.ai.talkWithAiUniqueConversationsDesc', 'Distinct chats where this option was used')}
            helpText={t(
              'reporting.def.talkWithAiUniqueConversations',
              'Number of different conversations that had at least one “Talk with AI” workflow choice in the range.'
            )}
          />
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <ReportChartCard
            accent="violet"
            chartHeightClass="min-h-[280px] h-[320px]"
            icon={<PieChartIcon className="h-4 w-4" />}
            title={t('reporting.ai.talkWithAiByChannel', 'Talk with AI by channel')}
            description={t('reporting.ai.talkWithAiByChannelHint', 'Website widget compared with WhatsApp and other linked entry points.')}
          >
            {talkWithAiPie.length === 0 ? (
              <ReportEmptyChart message={t('reporting.noData', 'No data')} />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={talkWithAiPie}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={52}
                    outerRadius={88}
                    paddingAngle={2}
                    stroke={REPORT_SLICE_STROKE}
                    strokeWidth={2}
                    label={renderReportingPieLabel}
                    labelLine={{ stroke: 'var(--muted-foreground)', strokeOpacity: 0.45 }}
                  >
                    {talkWithAiPie.map((entry) => (
                      <Cell key={entry.key} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip {...REPORT_CHART_TOOLTIP} />
                  <Legend wrapperStyle={REPORT_LEGEND_WRAPPER} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </ReportChartCard>

          <ReportChartCard
            accent="sky"
            chartHeightClass="min-h-[280px] h-[320px]"
            icon={<TrendingUp className="h-4 w-4" />}
            title={t('reporting.ai.talkWithAiDaily', 'Talk with AI over time')}
            description={t('reporting.ai.talkWithAiDailyHint', 'Daily count of workflow “Talk with AI” selections.')}
          >
            {!hasTalkWithAiTrend ? (
              <ReportEmptyChart message={t('reporting.noData', 'No data')} />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={talkWithAiDaily} margin={{ top: 12, right: 12, left: 4, bottom: 4 }}>
                  <defs>
                    <linearGradient id="twaiAreaGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={REPORT_CHART_COLORS.primary} stopOpacity={0.4} />
                      <stop offset="100%" stopColor={REPORT_CHART_COLORS.primary} stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="4 8" stroke="var(--border)" vertical={false} opacity={0.65} />
                  <XAxis dataKey="label" tick={REPORT_AXIS_TICK} axisLine={false} tickLine={false} dy={6} />
                  <YAxis allowDecimals={false} tick={REPORT_AXIS_TICK} axisLine={false} tickLine={false} width={36} />
                  <Tooltip {...REPORT_CHART_TOOLTIP} labelFormatter={(_, p) => (p?.[0]?.payload?.date as string) || ''} />
                  <Legend wrapperStyle={REPORT_LEGEND_WRAPPER} />
                  <Area
                    type="monotone"
                    dataKey="count"
                    name={t('reporting.ai.talkWithAiEvents', 'Talk with AI — events')}
                    stroke={REPORT_CHART_COLORS.primary}
                    strokeWidth={2.5}
                    fill="url(#twaiAreaGrad)"
                    dot={{ r: 3, strokeWidth: 2, stroke: 'var(--background)', fill: REPORT_CHART_COLORS.primary }}
                    activeDot={{ r: 5 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </ReportChartCard>
        </div>
      </div>
    </div>
  );
};

export default ReportingAiReport;
