import React, { useMemo } from 'react';
import { useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { BrainCircuit, Users, BarChart3, Ticket, Server } from 'lucide-react';
import { ResponsiveContainer, BarChart as RBarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, PieChart, Pie, Cell } from 'recharts';

import { RootState } from '@/app/store';
import ReportStatCard from './ReportStatCard';
import ReportChartCard from './ReportChartCard';
import ReportEmptyChart from './ReportEmptyChart';
import { REPORT_CHART_COLORS } from './reportingUtils';
import { REPORT_CHART_TOOLTIP, REPORT_AXIS_TICK, REPORT_LEGEND_WRAPPER, REPORT_SLICE_STROKE } from './reportingVisual';
import { renderReportingPieLabel } from './reportingPieLabel';

const ReportingTicketsReport: React.FC = () => {
  const { t } = useTranslation();
  const reporting = useSelector((state: RootState) => state.reporting);

  const defs = useMemo(
    () => ({
      aiTickets: t('reporting.def.aiTickets', 'Tickets created automatically by AI escalation in the selected date range.'),
      humanTickets: t('reporting.def.humanTickets', 'Tickets created manually by a human (dashboard/user) in the selected date range.'),
      systemTickets: t(
        'reporting.def.systemTickets',
        'Tickets created by automated flows (e.g. chat workflow handoff to queue) in the selected date range.'
      ),
    }),
    [t]
  );

  const ticketTotals = reporting.tickets?.totals || { ai: 0, human: 0, system: 0, total: 0 };

  const barData = useMemo(
    () => [
      { key: 'ai' as const, name: 'AI', value: ticketTotals.ai, fill: REPORT_CHART_COLORS.ai },
      { key: 'human' as const, name: t('reporting.humanShort', 'Human'), value: ticketTotals.human, fill: REPORT_CHART_COLORS.primary },
      { key: 'system' as const, name: t('reporting.systemShort', 'System'), value: ticketTotals.system, fill: REPORT_CHART_COLORS.system },
    ],
    [ticketTotals, t]
  );

  const pieData = useMemo(() => barData.filter((d) => d.value > 0), [barData]);

  return (
    <div className="space-y-10">
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
          icon={<Ticket className="h-6 w-6" />}
          description={t('reporting.totalTicketsDesc', 'Total tickets created in selected range')}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <ReportChartCard
          accent="sunset"
          icon={<BarChart3 className="h-4 w-4" />}
          title={t('reporting.tickets.barTitle', 'Tickets by creator type')}
          description={t('reporting.tickets.barHint', 'Absolute counts in the selected date range.')}
        >
          {ticketTotals.total === 0 ? (
            <ReportEmptyChart message={t('reporting.noData', 'No data')} />
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <RBarChart data={barData} margin={{ top: 12, right: 12, left: 4, bottom: 8 }}>
                <defs>
                  <linearGradient id="tixHumanBar" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={REPORT_CHART_COLORS.primary} stopOpacity={1} />
                    <stop offset="100%" stopColor={REPORT_CHART_COLORS.primarySoft} stopOpacity={0.65} />
                  </linearGradient>
                  <linearGradient id="tixSystemBar" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={REPORT_CHART_COLORS.system} stopOpacity={1} />
                    <stop offset="100%" stopColor={REPORT_CHART_COLORS.systemSoft} stopOpacity={0.7} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="4 8" stroke="var(--border)" vertical={false} opacity={0.65} />
                <XAxis dataKey="name" tick={REPORT_AXIS_TICK} axisLine={false} tickLine={false} dy={6} />
                <YAxis allowDecimals={false} tick={REPORT_AXIS_TICK} axisLine={false} tickLine={false} width={36} />
                <Tooltip {...REPORT_CHART_TOOLTIP} />
                <Legend wrapperStyle={REPORT_LEGEND_WRAPPER} />
                <Bar dataKey="value" name={t('reporting.tickets.count', 'Tickets')} radius={[10, 10, 4, 4]} maxBarSize={72}>
                  {barData.map((e) => (
                    <Cell
                      key={e.key}
                      fill={
                        e.key === 'human' ? 'url(#tixHumanBar)' : e.key === 'system' ? 'url(#tixSystemBar)' : e.fill
                      }
                    />
                  ))}
                </Bar>
              </RBarChart>
            </ResponsiveContainer>
          )}
        </ReportChartCard>

        <ReportChartCard
          accent="violet"
          icon={<Ticket className="h-4 w-4" />}
          title={t('reporting.tickets.pieTitle', 'Distribution')}
          description={t('reporting.tickets.pieHint', 'Proportional view of ticket sources.')}
        >
          {pieData.length === 0 ? (
            <ReportEmptyChart message={t('reporting.noData', 'No data')} />
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={48}
                  outerRadius={96}
                  paddingAngle={3}
                  stroke={REPORT_SLICE_STROKE}
                  strokeWidth={2}
                  label={renderReportingPieLabel}
                  labelLine={{ stroke: 'var(--muted-foreground)', strokeOpacity: 0.45 }}
                >
                  {pieData.map((entry) => (
                    <Cell key={entry.name} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip {...REPORT_CHART_TOOLTIP} />
                <Legend wrapperStyle={REPORT_LEGEND_WRAPPER} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </ReportChartCard>
      </div>
    </div>
  );
};

export default ReportingTicketsReport;
