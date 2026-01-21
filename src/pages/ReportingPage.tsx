import React, { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '@/app/store';
import { useTranslation } from 'react-i18next';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

import {
  Users,
  Bot,
  MessageSquare,
  BrainCircuit,
  UserPlus,
  BarChart,
  Calendar,
  Info,
} from 'lucide-react';

import { fetchAssignmentReport, fetchUserPerformanceReport } from '@/features/reporting/reportingSlice';
import { fetchTicketReport } from '@/features/reporting/reportingSlice';

// Lightweight stat card (keeps page independent from OverviewPage implementation)
const StatCard = ({
  title,
  value,
  icon,
  description,
  helpText,
}: {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  description: string;
  helpText?: string;
}) => (
  <Card className="relative overflow-hidden border border-gray-200 dark:border-gray-800 transition-all duration-300 dark:bg-gradient-to-br dark:from-[#1B1B20] dark:to-[#252530] bg-white py-6">
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <CardTitle className="text-sm font-semibold text-gray-600 dark:text-gray-300 flex items-center gap-2">
        <span>{title}</span>
        {helpText ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <button type="button" className="inline-flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                <Info className="h-4 w-4" />
              </button>
            </TooltipTrigger>
            <TooltipContent sideOffset={6} className="max-w-[320px]">
              {helpText}
            </TooltipContent>
          </Tooltip>
        ) : null}
      </CardTitle>
      <div className="bg-gray-100 dark:bg-gray-900/30 p-3 rounded-xl">
        <div className="text-gray-700 dark:text-gray-200">{icon}</div>
      </div>
    </CardHeader>
    <CardContent>
      <div className="text-4xl font-bold text-gray-900 dark:text-gray-100 mb-1">{value}</div>
      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{description}</p>
    </CardContent>
  </Card>
);

const ReportingPage: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { t, i18n } = useTranslation();

  const { user } = useSelector((state: RootState) => state.auth);
  const reporting = useSelector((state: RootState) => state.reporting);

  const businessId = user?.businessId;

  const [start, setStart] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() - 14);
    return d.toISOString().split('T')[0];
  });
  const [end, setEnd] = useState<string>(() => new Date().toISOString().split('T')[0]);

  useEffect(() => {
    if (!businessId) return;
    dispatch(fetchUserPerformanceReport({ businessId, start, end }));
    dispatch(fetchAssignmentReport({ businessId, start, end }));
    dispatch(fetchTicketReport({ businessId, start, end }));
  }, [dispatch, businessId, start, end]);

  const totalsByType = useMemo(() => {
    const totals = reporting.assignments?.totals || [];
    const get = (type: 'ai' | 'manual' | 'system') => totals.find(r => r.assignedByType === type)?.count ?? 0;
    return { ai: get('ai'), manual: get('manual'), system: get('system') };
  }, [reporting.assignments]);

  const ticketTotals = useMemo(() => {
    return reporting.tickets?.totals || { ai: 0, human: 0, system: 0, total: 0 };
  }, [reporting.tickets]);

  // Definitions (kept in-code so meaning is always clear even without translations)
  const defs = useMemo(() => {
    return {
      aiMessages: t('reporting.def.aiMessages', 'Count of messages sent by the AI (sender = ai) within the selected date range.'),
      aiConversations: t('reporting.def.aiConversations', 'Number of distinct conversations where the AI sent at least one message in the selected date range.'),
      aiAssignments: t('reporting.def.aiAssignments', 'Count of assignment actions created automatically by AI escalation/transfer (not the number of messages).'),
      manualAssignments: t('reporting.def.manualAssignments', 'Count of assignment actions triggered manually by a user (business/agent) when assigning/transferring a conversation.'),
      conversationsAssigned: t('reporting.def.conversationsAssigned', 'Number of distinct conversations assigned to this agent in the selected range (based on assignment events).'),
      conversationsClosed: t('reporting.def.conversationsClosed', 'Number of conversations that ended with status = closed during the selected range (best-effort; based on conversation updatedAt).'),
      uniqueContacts: t('reporting.def.uniqueContacts', 'Distinct customers this agent replied to (based on messages sent by agent/human in the selected range).'),
      messagesSent: t('reporting.def.messagesSent', 'Total messages sent by this agent (sender = agent/human) in the selected range.'),
      team: t('reporting.def.team', 'Agent team is inferred from their channel membership (first channel name shown).'),
      aiTickets: t('reporting.def.aiTickets', 'Tickets created automatically by AI escalation in the selected date range.'),
      humanTickets: t('reporting.def.humanTickets', 'Tickets created manually by a human (dashboard/user) in the selected date range.'),
    };
  }, [t]);

  const ThWithHelp = ({ label, help }: { label: string; help: string }) => (
    <div className="inline-flex items-center gap-2 justify-end w-full">
      <span>{label}</span>
      <Tooltip>
        <TooltipTrigger asChild>
          <button type="button" className="inline-flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
            <Info className="h-4 w-4" />
          </button>
        </TooltipTrigger>
        <TooltipContent sideOffset={6} className="max-w-[360px]">
          {help}
        </TooltipContent>
      </Tooltip>
    </div>
  );

  return (
    <div className="flex-1 space-y-8 p-4 md:p-8 pt-6 bg-gradient-to-br from-gray-50 via-white to-gray-50 dark:from-[#0F0F12] dark:via-[#151519] dark:to-[#0F0F12] min-h-screen">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-gray-900 dark:text-gray-100 mb-2">
            {t('reporting.pageTitle', 'Reporting')}
          </h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm md:text-base">
            {t('reporting.pageSubtitle', 'AI vs Agent replies and assignment activity for your business.')}
          </p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-[#1B1B20] rounded-lg border border-gray-200 dark:border-gray-800">
          <Calendar className="h-4 w-4 text-gray-400" />
          <span className="text-sm text-gray-600 dark:text-gray-300">
            {new Date().toLocaleDateString(i18n.language, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </span>
        </div>
      </div>

      {/* Date range */}
      <Card className="border border-gray-200 dark:border-gray-800 dark:bg-[#1B1B20]">
        <CardHeader>
          <CardTitle className="text-lg">{t('reporting.filters', 'Filters')}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col sm:flex-row gap-2 sm:items-center">
          <Input type="date" value={start} onChange={(e) => setStart(e.target.value)} className="w-full sm:w-[170px]" />
          <Input type="date" value={end} onChange={(e) => setEnd(e.target.value)} className="w-full sm:w-[170px]" />
          <Button
            variant="outline"
            onClick={() => {
              if (!businessId) return;
              dispatch(fetchUserPerformanceReport({ businessId, start, end }));
              dispatch(fetchAssignmentReport({ businessId, start, end }));
            }}
            className="w-full sm:w-auto"
          >
            {t('apply', 'Apply')}
          </Button>
        </CardContent>
      </Card>

      {/* Quick totals */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title={t('reporting.aiMessages', 'AI Messages')}
          value={reporting.userPerformance?.ai.messages ?? 0}
          icon={<Bot className="h-6 w-6" />}
          description={t('reporting.aiMessagesDesc', 'Messages sent by AI in selected range')}
          helpText={defs.aiMessages}
        />
        <StatCard
          title={t('reporting.aiConversations', 'AI Conversations')}
          value={reporting.userPerformance?.ai.conversations ?? 0}
          icon={<MessageSquare className="h-6 w-6" />}
          description={t('reporting.aiConversationsDesc', 'Distinct conversations AI replied to')}
          helpText={defs.aiConversations}
        />
        <StatCard
          title={t('reporting.aiAssignments', 'AI Assignments')}
          value={totalsByType.ai}
          icon={<BrainCircuit className="h-6 w-6" />}
          description={t('reporting.aiAssignmentsDesc', 'Contacts assigned by AI')}
          helpText={defs.aiAssignments}
        />
        <StatCard
          title={t('reporting.manualAssignments', 'Manual Assignments')}
          value={totalsByType.manual}
          icon={<UserPlus className="h-6 w-6" />}
          description={t('reporting.manualAssignmentsDesc', 'Contacts assigned manually')}
          helpText={defs.manualAssignments}
        />
      </div>

      {/* Ticket totals */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <StatCard
          title={t('reporting.aiTickets', 'AI Tickets Created')}
          value={ticketTotals.ai}
          icon={<BrainCircuit className="h-6 w-6" />}
          description={t('reporting.aiTicketsDesc', 'Tickets created by AI escalation')}
          helpText={defs.aiTickets}
        />
        <StatCard
          title={t('reporting.humanTickets', 'Human Tickets Created')}
          value={ticketTotals.human}
          icon={<Users className="h-6 w-6" />}
          description={t('reporting.humanTicketsDesc', 'Tickets created manually by a human')}
          helpText={defs.humanTickets}
        />
        <StatCard
          title={t('reporting.totalTickets', 'Total Tickets')}
          value={ticketTotals.total}
          icon={<BarChart className="h-6 w-6" />}
          description={t('reporting.totalTicketsDesc', 'Total tickets created in selected range')}
        />
      </div>

      {/* User Performance */}
      <Card className="border border-gray-200 dark:border-gray-800 dark:bg-[#1B1B20]">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Users className="h-5 w-5" />
            {t('reporting.userPerformance', 'User Performance')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-3 text-sm text-gray-500 dark:text-gray-400">
            {t(
              'reporting.userPerformanceHint',
              'These metrics are computed from messages + assignment events within the selected date range. Hover the ⓘ icons for exact definitions.'
            )}
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('user', 'User')}</TableHead>
                <TableHead>
                  <div className="inline-flex items-center gap-2">
                    <span>{t('team', 'Team')}</span>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button type="button" className="inline-flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                          <Info className="h-4 w-4" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent sideOffset={6} className="max-w-[360px]">
                        {defs.team}
                      </TooltipContent>
                    </Tooltip>
                  </div>
                </TableHead>
                <TableHead className="text-right">
                  <ThWithHelp label={t('conversationsAssigned', 'Conversations Assigned')} help={defs.conversationsAssigned} />
                </TableHead>
                <TableHead className="text-right">
                  <ThWithHelp label={t('conversationsClosed', 'Conversations Closed')} help={defs.conversationsClosed} />
                </TableHead>
                <TableHead className="text-right">
                  <ThWithHelp label={t('uniqueContacts', 'Unique Contacts')} help={defs.uniqueContacts} />
                </TableHead>
                <TableHead className="text-right">
                  <ThWithHelp label={t('messagesSent', 'Messages Sent')} help={defs.messagesSent} />
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(reporting.userPerformance?.agents || []).map((row) => (
                <TableRow key={row.agentId}>
                  <TableCell className="font-medium">{row.user}</TableCell>
                  <TableCell>{row.team}</TableCell>
                  <TableCell className="text-right">{row.conversationsAssigned}</TableCell>
                  <TableCell className="text-right">{row.conversationsClosed}</TableCell>
                  <TableCell className="text-right">{row.uniqueContacts}</TableCell>
                  <TableCell className="text-right">{row.messagesSent}</TableCell>
                </TableRow>
              ))}
              {(!reporting.userPerformance?.agents || reporting.userPerformance.agents.length === 0) && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-sm text-gray-500 dark:text-gray-400">
                    {t('reporting.noData', 'No data')}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Assignment summary */}
      <Card className="border border-gray-200 dark:border-gray-800 dark:bg-[#1B1B20]">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <BarChart className="h-5 w-5" />
            {t('reporting.assignmentReport', 'Assignment Report')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {(reporting.assignments?.totals || []).map((r) => (
              <Badge key={r.assignedByType} variant="secondary">
                {r.assignedByType.toUpperCase()}: {r.count}
              </Badge>
            ))}
          </div>
          <div className="text-sm text-gray-500 dark:text-gray-400 space-y-1">
            <div>
              <span className="font-medium text-gray-700 dark:text-gray-200">{t('reporting.legend', 'Legend')}:</span>{' '}
              {t('reporting.legendText', 'AI = assignment created by AI escalation/transfer, Manual = assigned by a user, System = internal/system-generated.')}
            </div>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {t(
              'reporting.assignmentHint',
              'Counts reflect assignment actions recorded by the system (AI escalation/transfer and manual transfers).'
            )}
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default ReportingPage;

