import React, { useMemo } from 'react';
import { useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { Users, Info, BarChart3 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

import { RootState } from '@/app/store';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tooltip as UITooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import ReportChartCard from './ReportChartCard';
import ReportSurfaceCard from './ReportSurfaceCard';
import ReportEmptyChart from './ReportEmptyChart';
import { agentBarChartData, REPORT_CHART_COLORS } from './reportingUtils';
import { REPORT_CHART_TOOLTIP, REPORT_AXIS_TICK, REPORT_LEGEND_WRAPPER } from './reportingVisual';

const ReportingAgentsReport: React.FC = () => {
  const { t } = useTranslation();
  const reporting = useSelector((state: RootState) => state.reporting);

  const defs = useMemo(
    () => ({
      team: t('reporting.def.team', 'Agent team is inferred from their channel membership (first channel name shown).'),
      conversationsAssigned: t('reporting.def.conversationsAssigned', 'Number of distinct conversations assigned to this agent in the selected range (based on assignment events).'),
      conversationsClosed: t('reporting.def.conversationsClosed', 'Number of conversations that ended with status = closed during the selected range (best-effort; based on conversation updatedAt).'),
      uniqueContacts: t('reporting.def.uniqueContacts', 'Distinct customers this agent replied to (based on messages sent by agent/human in the selected range).'),
      messagesSent: t('reporting.def.messagesSent', 'Total messages sent by this agent (sender = agent/human) in the selected range.'),
    }),
    [t]
  );

  const agents = reporting.userPerformance?.agents || [];
  const barData = useMemo(() => agentBarChartData(agents), [agents]);

  const ThWithHelp = ({ label, help }: { label: string; help: string }) => (
    <div className="inline-flex items-center gap-2 justify-end w-full">
      <span>{label}</span>
      <UITooltip>
        <TooltipTrigger asChild>
          <button type="button" className="inline-flex rounded-md p-0.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
            <Info className="h-4 w-4" />
          </button>
        </TooltipTrigger>
        <TooltipContent sideOffset={6} className="max-w-[360px] text-sm leading-relaxed shadow-lg">
          {help}
        </TooltipContent>
      </UITooltip>
    </div>
  );

  return (
    <div className="space-y-10">
      <ReportChartCard
        accent="ocean"
        chartHeightClass="min-h-[320px] h-[380px]"
        icon={<BarChart3 className="h-4 w-4" />}
        title={t('reporting.agents.chartTitle', 'Messages sent by agent')}
        description={t('reporting.agents.chartHint', 'Compare outbound human/agent message volume in the selected range.')}
      >
        {barData.length === 0 ? (
          <ReportEmptyChart message={t('reporting.noData', 'No data')} />
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={barData} margin={{ top: 12, right: 12, left: 4, bottom: 72 }}>
              <defs>
                <linearGradient id="agentMsgBar" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={REPORT_CHART_COLORS.messages} stopOpacity={1} />
                  <stop offset="100%" stopColor={REPORT_CHART_COLORS.messages} stopOpacity={0.55} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="4 8" stroke="var(--border)" vertical={false} opacity={0.65} />
              <XAxis dataKey="name" interval={0} angle={-28} textAnchor="end" height={76} tick={REPORT_AXIS_TICK} axisLine={false} tickLine={false} />
              <YAxis allowDecimals={false} tick={REPORT_AXIS_TICK} axisLine={false} tickLine={false} width={40} />
              <Tooltip
                {...REPORT_CHART_TOOLTIP}
                formatter={(value: number) => [value, t('reporting.agents.messages', 'Messages')]}
                labelFormatter={(_, p) => (p?.[0]?.payload?.fullName as string) || ''}
              />
              <Legend wrapperStyle={REPORT_LEGEND_WRAPPER} />
              <Bar dataKey="messages" name={t('reporting.agents.messages', 'Messages')} fill="url(#agentMsgBar)" radius={[8, 8, 4, 4]} maxBarSize={48} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </ReportChartCard>

      <ReportSurfaceCard
        accent="violet"
        icon={<Users className="h-4 w-4" />}
        title={t('reporting.userPerformance', 'User Performance')}
        description={t('reporting.userPerformanceHint', 'These metrics are computed from messages + assignment events within the selected date range. Hover the ⓘ icons for exact definitions.')}
        contentClassName="overflow-x-auto px-2 sm:px-6"
      >
        <div className="rounded-xl border border-border/60 bg-muted/30 dark:border-white/10 dark:bg-white/[0.04]">
          <Table>
            <TableHeader>
              <TableRow className="border-border/60 hover:bg-transparent dark:border-white/10">
                <TableHead className="font-semibold text-foreground">{t('user', 'User')}</TableHead>
                <TableHead className="font-semibold text-foreground">
                  <div className="inline-flex items-center gap-2">
                    <span>{t('team', 'Team')}</span>
                    <UITooltip>
                      <TooltipTrigger asChild>
                        <button type="button" className="inline-flex rounded-md p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground">
                          <Info className="h-3.5 w-3.5" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent sideOffset={6} className="max-w-[360px]">
                        {defs.team}
                      </TooltipContent>
                    </UITooltip>
                  </div>
                </TableHead>
                <TableHead className="text-right font-semibold text-foreground">
                  <ThWithHelp label={t('conversationsAssigned', 'Conversations Assigned')} help={defs.conversationsAssigned} />
                </TableHead>
                <TableHead className="text-right font-semibold text-foreground">
                  <ThWithHelp label={t('conversationsClosed', 'Conversations Closed')} help={defs.conversationsClosed} />
                </TableHead>
                <TableHead className="text-right font-semibold text-foreground">
                  <ThWithHelp label={t('uniqueContacts', 'Unique Contacts')} help={defs.uniqueContacts} />
                </TableHead>
                <TableHead className="text-right font-semibold text-foreground">
                  <ThWithHelp label={t('messagesSent', 'Messages Sent')} help={defs.messagesSent} />
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {agents.map((row) => (
                <TableRow
                  key={row.agentId}
                  className="border-border/40 transition-colors hover:bg-primary/[0.04] dark:hover:bg-white/[0.04]"
                >
                  <TableCell className="font-medium">{row.user}</TableCell>
                  <TableCell className="text-muted-foreground dark:text-neutral-400">{row.team}</TableCell>
                  <TableCell className="text-right tabular-nums">{row.conversationsAssigned}</TableCell>
                  <TableCell className="text-right tabular-nums">{row.conversationsClosed}</TableCell>
                  <TableCell className="text-right tabular-nums">{row.uniqueContacts}</TableCell>
                  <TableCell className="text-right tabular-nums font-medium text-foreground">{row.messagesSent}</TableCell>
                </TableRow>
              ))}
              {agents.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="h-32 text-center text-sm text-muted-foreground">
                    {t('reporting.noData', 'No data')}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </ReportSurfaceCard>

      <ReportChartCard
        accent="forest"
        chartHeightClass="min-h-[340px] h-[400px]"
        icon={<BarChart3 className="h-4 w-4" />}
        title={t('reporting.agents.groupedTitle', 'Workload breakdown')}
        description={t('reporting.agents.groupedHint', 'Assigned conversations, closed conversations, and unique contacts side by side.')}
      >
        {barData.length === 0 ? (
          <ReportEmptyChart message={t('reporting.noData', 'No data')} />
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={barData} margin={{ top: 12, right: 12, left: 4, bottom: 72 }}>
              <CartesianGrid strokeDasharray="4 8" stroke="var(--border)" vertical={false} opacity={0.65} />
              <XAxis dataKey="name" interval={0} angle={-28} textAnchor="end" height={76} tick={REPORT_AXIS_TICK} axisLine={false} tickLine={false} />
              <YAxis allowDecimals={false} tick={REPORT_AXIS_TICK} axisLine={false} tickLine={false} width={40} />
              <Tooltip {...REPORT_CHART_TOOLTIP} labelFormatter={(_, p) => (p?.[0]?.payload?.fullName as string) || ''} />
              <Legend wrapperStyle={REPORT_LEGEND_WRAPPER} />
              <Bar dataKey="assigned" name={t('conversationsAssigned', 'Assigned')} stackId="a" fill={REPORT_CHART_COLORS.ai} radius={[0, 0, 0, 0]} maxBarSize={56} />
              <Bar dataKey="closed" name={t('conversationsClosed', 'Closed')} stackId="a" fill={REPORT_CHART_COLORS.closed} radius={[0, 0, 0, 0]} maxBarSize={56} />
              <Bar dataKey="contacts" name={t('uniqueContacts', 'Contacts')} stackId="a" fill={REPORT_CHART_COLORS.contacts} radius={[6, 6, 0, 0]} maxBarSize={56} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </ReportChartCard>
    </div>
  );
};

export default ReportingAgentsReport;
