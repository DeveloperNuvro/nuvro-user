import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import {
  getWhapiConnectionMessageAnalytics,
  type WhapiConnectionMessageAnalyticsPayload,
  type WhapiMessageLatencyStats,
} from '@/api/whapiInboxApi';
import type { WhapiConnectionRow } from '@/features/whapi/whapiSlice';
import toast from 'react-hot-toast';

dayjs.extend(utc);

function formatHourlyBucketLabel(bucketStart: string, tz: string | undefined): string {
  const zone = tz || 'UTC';
  if (zone === 'UTC') {
    const s = bucketStart.endsWith('Z') ? bucketStart : `${bucketStart}Z`;
    return dayjs.utc(s).format('MMM D HH:mm');
  }
  return bucketStart.replace('T', ' ').slice(0, 13);
}

function formatLatencyMs(ms: number | null | undefined): string {
  if (ms == null || !Number.isFinite(ms)) return '—';
  if (ms < 1000) return `${Math.round(ms)} ms`;
  if (ms < 60_000) return `${(ms / 1000).toFixed(1)} s`;
  return `${(ms / 60_000).toFixed(1)} min`;
}

function LatencyRow({
  label,
  stats,
}: {
  label: string;
  stats: WhapiMessageLatencyStats;
}) {
  return (
    <tr className="border-t border-border/50">
      <td className="px-2 py-1.5 text-muted-foreground">{label}</td>
      <td className="px-2 py-1.5 text-right tabular-nums">{stats.sampleSize}</td>
      <td className="px-2 py-1.5 text-right tabular-nums">{formatLatencyMs(stats.medianMs)}</td>
      <td className="px-2 py-1.5 text-right tabular-nums">{formatLatencyMs(stats.avgMs)}</td>
      <td className="px-2 py-1.5 text-right tabular-nums">{formatLatencyMs(stats.p90Ms)}</td>
    </tr>
  );
}

export type WhapiMessageAnalyticsDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  connection: WhapiConnectionRow | null;
};

export default function WhapiMessageAnalyticsDialog({
  open,
  onOpenChange,
  connection,
}: WhapiMessageAnalyticsDialogProps) {
  const { t } = useTranslation();
  const [days, setDays] = useState(30);
  const [timezone, setTimezone] = useState('');
  const [slaHours, setSlaHours] = useState(24);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<WhapiConnectionMessageAnalyticsPayload | null>(null);

  const load = useCallback(async () => {
    if (!connection) return;
    setLoading(true);
    try {
      const payload = await getWhapiConnectionMessageAnalytics(connection.id, days, {
        timezone: timezone.trim() || undefined,
        slaHours,
      });
      setData(payload);
      if (!payload) {
        toast.error(t('integrationsPage.whapi.messageAnalyticsError', 'Could not load message analytics'));
      }
    } catch {
      setData(null);
      toast.error(t('integrationsPage.whapi.messageAnalyticsError', 'Could not load message analytics'));
    } finally {
      setLoading(false);
    }
  }, [connection, days, slaHours, timezone, t]);

  useEffect(() => {
    if (!open) setData(null);
  }, [open]);

  useEffect(() => {
    if (open && connection) void load();
  }, [open, connection?.id, load]);

  const chartRows = useMemo(() => {
    const rows = data?.hourly ?? [];
    const tz = data?.timezone ?? 'UTC';
    return rows.map((h) => ({
      ...h,
      label: formatHourlyBucketLabel(h.bucketStart, tz),
    }));
  }, [data?.hourly, data?.timezone]);

  const kp = (v: number | null | undefined, suffix = '') =>
    v == null || !Number.isFinite(v) ? '—' : `${typeof v === 'number' && v % 1 !== 0 ? v.toFixed(2) : v}${suffix}`;

  const pct = (v: number | null | undefined) =>
    v == null || !Number.isFinite(v) ? '—' : `${v}%`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl lg:max-w-4xl">
        <DialogHeader>
          <DialogTitle>
            {t('integrationsPage.whapi.messageAnalyticsTitle', 'WhatsApp message analytics')}
          </DialogTitle>
          <DialogDescription>
            {connection
              ? t('integrationsPage.whapi.messageAnalyticsHint', {
                  name: connection.connectionName,
                  defaultValue:
                    'Volume, pacing, and first-reply times for {{name}} (from your Nuvro message history).',
                })
              : null}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-end gap-2">
            <div className="grid gap-1">
              <Label className="text-xs text-muted-foreground">{t('integrationsPage.whapi.lastDays', 'Last days')}</Label>
              <Input
                type="number"
                min={1}
                max={366}
                value={days}
                onChange={(e) => setDays(Math.min(366, Math.max(1, Number(e.target.value) || 30)))}
                className="w-24 h-9"
              />
            </div>
            <div className="grid gap-1 min-w-[140px] flex-1 max-w-xs">
              <Label className="text-xs text-muted-foreground">
                {t('integrationsPage.whapi.maTimezone', 'Timezone (IANA)')}
              </Label>
              <Input
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                placeholder={t('integrationsPage.whapi.maTimezonePh', 'e.g. Asia/Dhaka or UTC')}
                className="h-9"
                spellCheck={false}
              />
            </div>
            <div className="grid gap-1">
              <Label className="text-xs text-muted-foreground">{t('integrationsPage.whapi.maSlaHours', 'SLA hours')}</Label>
              <Input
                type="number"
                min={1}
                max={168}
                value={slaHours}
                onChange={(e) => setSlaHours(Math.min(168, Math.max(1, Number(e.target.value) || 24)))}
                className="w-20 h-9"
              />
            </div>
            <Button
              variant="outline"
              size="sm"
              className="h-9"
              disabled={!connection || loading}
              onClick={() => void load()}
            >
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {t('integrationsPage.whapi.refreshAnalytics', 'Refresh')}
            </Button>
          </div>
          {data?.timezone ? (
            <p className="text-[11px] text-muted-foreground">
              {t('integrationsPage.whapi.maAppliedTz', {
                tz: data.timezone,
                defaultValue: 'Charts & day buckets use: {{tz}}',
              })}
            </p>
          ) : null}
        </div>

        {loading && !data ? (
          <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground justify-center">
            <Loader2 className="h-5 w-5 animate-spin" />
            {t('integrationsPage.whapi.loadingMessageAnalytics', 'Loading…')}
          </div>
        ) : data ? (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
              <div className="rounded-lg border border-border/60 bg-muted/30 px-3 py-2">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                  {t('integrationsPage.whapi.maTotalMessages', 'Total messages')}
                </p>
                <p className="text-xl font-semibold tabular-nums">{data.totals.all}</p>
              </div>
              <div className="rounded-lg border border-border/60 bg-muted/30 px-3 py-2">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                  {t('integrationsPage.whapi.maPerHour', 'Avg / hour')}
                </p>
                <p className="text-xl font-semibold tabular-nums">{kp(data.rates.messagesPerHour)}</p>
              </div>
              <div className="rounded-lg border border-border/60 bg-muted/30 px-3 py-2">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                  {t('integrationsPage.whapi.maCustomer', 'Customer')}
                </p>
                <p className="text-xl font-semibold tabular-nums">{data.totals.customer}</p>
              </div>
              <div className="rounded-lg border border-border/60 bg-muted/30 px-3 py-2">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                  {t('integrationsPage.whapi.maAutomated', 'Automated')}
                </p>
                <p className="text-xl font-semibold tabular-nums">{data.totals.automated}</p>
              </div>
              <div className="rounded-lg border border-border/60 bg-muted/30 px-3 py-2">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                  {t('integrationsPage.whapi.maHuman', 'Human agent')}
                </p>
                <p className="text-xl font-semibold tabular-nums">{data.totals.humanAgent}</p>
              </div>
              <div className="rounded-lg border border-border/60 bg-muted/30 px-3 py-2">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                  {t('integrationsPage.whapi.maWorkflowTagged', 'Workflow-tagged')}
                </p>
                <p className="text-xl font-semibold tabular-nums">{data.totals.workflowTaggedOutbound}</p>
              </div>
              <div className="rounded-lg border border-border/60 bg-muted/30 px-3 py-2">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                  {t('integrationsPage.whapi.maInternalNotes', 'Internal notes')}
                </p>
                <p className="text-xl font-semibold tabular-nums">{data.totals.internalNotes ?? 0}</p>
              </div>
            </div>

            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-lg border border-border/60 bg-muted/20 px-3 py-2 text-xs">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                  {t('integrationsPage.whapi.maDistinctConvos', 'Active conversations')}
                </p>
                <p className="text-lg font-semibold tabular-nums">{data.activity?.distinctConversations ?? '—'}</p>
              </div>
              <div className="rounded-lg border border-border/60 bg-muted/20 px-3 py-2 text-xs">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                  {t('integrationsPage.whapi.maDistinctCustomers', 'Distinct customers')}
                </p>
                <p className="text-lg font-semibold tabular-nums">{data.activity?.distinctCustomers ?? '—'}</p>
              </div>
              <div className="rounded-lg border border-border/60 bg-muted/20 px-3 py-2 text-xs">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                  {t('integrationsPage.whapi.maAvgPerConvo', 'Avg msgs / conversation')}
                </p>
                <p className="text-lg font-semibold tabular-nums">{kp(data.activity?.avgMessagesPerConversation ?? null)}</p>
              </div>
              <div className="rounded-lg border border-border/60 bg-muted/20 px-3 py-2 text-xs">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                  {t('integrationsPage.whapi.maPeakHour', 'Peak hour')}
                </p>
                {data.peakHour ? (
                  <>
                    <p className="text-sm font-semibold tabular-nums leading-tight">
                      {formatHourlyBucketLabel(data.peakHour.bucketStart, data.timezone)}
                    </p>
                    <p className="text-[10px] text-muted-foreground truncate" title={data.timezone}>
                      {data.timezone ?? 'UTC'}
                    </p>
                    <p className="text-[11px] text-muted-foreground tabular-nums">
                      {t('integrationsPage.whapi.maPeakHourTotal', {
                        count: data.peakHour.total,
                        defaultValue: '{{count}} messages',
                      })}
                    </p>
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">—</p>
                )}
              </div>
            </div>

            <div className="rounded-md border border-border/50 bg-muted/15 px-3 py-2 text-xs">
              <span className="font-medium text-muted-foreground">
                {t('integrationsPage.whapi.maMixLabel', 'Mix (share of all messages)')}
                {': '}
              </span>
              <span className="tabular-nums">
                {t('integrationsPage.whapi.maMixCustomerShort', 'Customer')} {pct(data.mix?.customerPct ?? null)}
                {' · '}
                {t('integrationsPage.whapi.maMixAutoShort', 'Automated')} {pct(data.mix?.automatedPct ?? null)}
                {' · '}
                {t('integrationsPage.whapi.maMixHumanShort', 'Human')} {pct(data.mix?.humanAgentPct ?? null)}
              </span>
            </div>

            <div className="rounded-md border border-border/50 bg-muted/15 px-3 py-2 text-xs space-y-1">
              <p className="font-medium text-muted-foreground">{t('integrationsPage.whapi.maTrafficTitle', 'Inbound vs outbound')}</p>
              <p className="tabular-nums">
                {t('integrationsPage.whapi.maInbound', 'Inbound')}{' '}
                {data.traffic?.inbound ?? '—'} ({pct(data.traffic?.inboundPct ?? null)}) ·{' '}
                {t('integrationsPage.whapi.maOutbound', 'Outbound')}{' '}
                {data.traffic?.outbound ?? '—'} ({pct(data.traffic?.outboundPct ?? null)})
              </p>
            </div>

            <div className="rounded-md border border-border/50 bg-muted/15 px-3 py-2 text-xs space-y-1">
              <p className="font-medium text-muted-foreground">{t('integrationsPage.whapi.maContentTitle', 'Text vs media')}</p>
              <p className="tabular-nums">
                {t('integrationsPage.whapi.maText', 'Text')}{' '}
                {data.content?.text ?? '—'} ({pct(data.content?.textPct ?? null)}) ·{' '}
                {t('integrationsPage.whapi.maMedia', 'Media / other')}{' '}
                {data.content?.media ?? '—'} ({pct(data.content?.mediaPct ?? null)})
              </p>
            </div>

            {(data.byWeekday?.length ?? 0) > 0 ? (
              <div>
                <p className="mb-2 text-sm font-medium">
                  {t('integrationsPage.whapi.maWeekdayTitle', 'By weekday (Sun–Sat)')}
                </p>
                <div className="overflow-x-auto rounded-lg border border-border/60">
                  <table className="w-full text-xs">
                    <thead className="bg-muted/50">
                      <tr>
                        <th className="px-2 py-1.5 text-left font-medium">{t('integrationsPage.whapi.maWeekdayCol', 'Day')}</th>
                        <th className="px-2 py-1.5 text-right font-medium">{t('integrationsPage.whapi.maSeriesTotal', 'Total')}</th>
                        <th className="px-2 py-1.5 text-right font-medium hidden sm:table-cell">{t('integrationsPage.whapi.maSeriesCustomer', 'Customer')}</th>
                        <th className="px-2 py-1.5 text-right font-medium hidden sm:table-cell">{t('integrationsPage.whapi.maSeriesAuto', 'Automated')}</th>
                        <th className="px-2 py-1.5 text-right font-medium hidden sm:table-cell">{t('integrationsPage.whapi.maSeriesHuman', 'Human')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(data.byWeekday ?? []).map((w) => (
                        <tr key={w.dayOfWeek} className="border-t border-border/40">
                          <td className="px-2 py-1">{w.label}</td>
                          <td className="px-2 py-1 text-right tabular-nums">{w.total}</td>
                          <td className="px-2 py-1 text-right tabular-nums hidden sm:table-cell">{w.customer}</td>
                          <td className="px-2 py-1 text-right tabular-nums hidden sm:table-cell">{w.automated}</td>
                          <td className="px-2 py-1 text-right tabular-nums hidden sm:table-cell">{w.humanAgent}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : null}

            {data.slaNoReplyWithinWindow && data.slaNoReplyWithinWindow.sampledCustomerMessages > 0 ? (
              <div className="rounded-md border border-border/50 bg-muted/15 px-3 py-2 text-xs space-y-1">
                <p className="font-medium text-muted-foreground">
                  {t('integrationsPage.whapi.maSlaTitle', 'SLA window (sampled)')}
                </p>
                <p className="tabular-nums">
                  {t('integrationsPage.whapi.maSlaLine', {
                    hours: data.slaNoReplyWithinWindow.slaHours,
                    sampled: data.slaNoReplyWithinWindow.sampledCustomerMessages,
                    breaches: data.slaNoReplyWithinWindow.breaches,
                    rate:
                      data.slaNoReplyWithinWindow.breachRate != null
                        ? (data.slaNoReplyWithinWindow.breachRate * 100).toFixed(1)
                        : '—',
                    defaultValue:
                      'No business reply within {{hours}}h — {{breaches}} / {{sampled}} ({{rate}}% breach rate, latest customer messages)',
                  })}
                </p>
                <p className="text-[11px] text-muted-foreground leading-snug">
                  {t(
                    'integrationsPage.whapi.maSlaHint',
                    'Uses the latest customer messages in the period. A breach means no ai/human/system/agent reply in that window (conversation may still be open).'
                  )}
                </p>
              </div>
            ) : null}

            {(data.daily?.length ?? 0) > 0 ? (
              <div>
                <p className="mb-2 text-sm font-medium">
                  {t('integrationsPage.whapi.maDailyTitle', {
                    tz: data.timezone ?? 'UTC',
                    defaultValue: 'Messages by day ({{tz}})',
                  })}
                </p>
                <div className="max-h-[200px] overflow-auto rounded-lg border border-border/60">
                  <table className="w-full text-xs">
                    <thead className="sticky top-0 bg-muted/80 backdrop-blur-sm">
                      <tr>
                        <th className="px-2 py-1.5 text-left font-medium">{t('integrationsPage.whapi.maDailyColDay', 'Day')}</th>
                        <th className="px-2 py-1.5 text-right font-medium">{t('integrationsPage.whapi.maSeriesTotal', 'Total')}</th>
                        <th className="px-2 py-1.5 text-right font-medium hidden sm:table-cell">{t('integrationsPage.whapi.maSeriesCustomer', 'Customer')}</th>
                        <th className="px-2 py-1.5 text-right font-medium hidden sm:table-cell">{t('integrationsPage.whapi.maSeriesAuto', 'Automated')}</th>
                        <th className="px-2 py-1.5 text-right font-medium hidden sm:table-cell">{t('integrationsPage.whapi.maSeriesHuman', 'Human')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(data.daily ?? []).map((d) => (
                        <tr key={d.day} className="border-t border-border/40">
                          <td className="px-2 py-1 tabular-nums">{d.day}</td>
                          <td className="px-2 py-1 text-right tabular-nums">{d.total}</td>
                          <td className="px-2 py-1 text-right tabular-nums hidden sm:table-cell">{d.customer}</td>
                          <td className="px-2 py-1 text-right tabular-nums hidden sm:table-cell">{d.automated}</td>
                          <td className="px-2 py-1 text-right tabular-nums hidden sm:table-cell">{d.humanAgent}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : null}

            <div className="grid gap-3 sm:grid-cols-3 text-xs">
              <div className="rounded-md border border-border/50 px-2.5 py-2">
                <span className="text-muted-foreground">
                  {t('integrationsPage.whapi.maGapCustomer', 'Avg gap (customer → customer)')}
                </span>
                <div className="font-medium tabular-nums">{kp(data.rates.avgSecondsBetweenCustomerMessages, ' s')}</div>
              </div>
              <div className="rounded-md border border-border/50 px-2.5 py-2">
                <span className="text-muted-foreground">
                  {t('integrationsPage.whapi.maGapAuto', 'Avg gap (automated sends)')}
                </span>
                <div className="font-medium tabular-nums">{kp(data.rates.avgSecondsBetweenAutomatedOutbound, ' s')}</div>
              </div>
              <div className="rounded-md border border-border/50 px-2.5 py-2">
                <span className="text-muted-foreground">
                  {t('integrationsPage.whapi.maGapHuman', 'Avg gap (human sends)')}
                </span>
                <div className="font-medium tabular-nums">{kp(data.rates.avgSecondsBetweenHumanAgentOutbound, ' s')}</div>
              </div>
            </div>

            <div>
              <p className="mb-2 text-sm font-medium">
                {t('integrationsPage.whapi.maChartTitle', {
                  tz: data.timezone ?? 'UTC',
                  defaultValue: 'Messages per hour ({{tz}})',
                })}
              </p>
              {chartRows.length === 0 ? (
                <p className="text-sm text-muted-foreground py-6 text-center border rounded-lg border-dashed">
                  {t('integrationsPage.whapi.maNoHourly', 'No hourly data in this range.')}
                </p>
              ) : (
                <div className="h-[280px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartRows} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border/60" />
                      <XAxis dataKey="label" tick={{ fontSize: 10 }} interval="preserveStartEnd" className="text-muted-foreground" />
                      <YAxis tick={{ fontSize: 11 }} width={40} allowDecimals={false} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'hsl(var(--card))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px',
                          fontSize: 12,
                        }}
                      />
                      <Legend wrapperStyle={{ fontSize: 12 }} />
                      <Line type="monotone" dataKey="total" name={t('integrationsPage.whapi.maSeriesTotal', 'Total')} stroke="hsl(var(--primary))" dot={false} strokeWidth={2} />
                      <Line type="monotone" dataKey="customer" name={t('integrationsPage.whapi.maSeriesCustomer', 'Customer')} stroke="#22c55e" dot={false} strokeWidth={1.5} />
                      <Line type="monotone" dataKey="automated" name={t('integrationsPage.whapi.maSeriesAuto', 'Automated')} stroke="#3b82f6" dot={false} strokeWidth={1.5} />
                      <Line type="monotone" dataKey="humanAgent" name={t('integrationsPage.whapi.maSeriesHuman', 'Human')} stroke="#f97316" dot={false} strokeWidth={1.5} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>

            <div>
              <p className="mb-2 text-sm font-medium">
                {t(
                  'integrationsPage.whapi.maFirstReplyTitle',
                  'First reply after a customer message (sampled)'
                )}
              </p>
              <div className="overflow-x-auto rounded-lg border border-border/60">
                <table className="w-full text-xs sm:text-sm">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="px-2 py-2 text-left font-medium">{t('integrationsPage.whapi.maColKind', 'Channel')}</th>
                      <th className="px-2 py-2 text-right font-medium">{t('integrationsPage.whapi.maColN', 'N')}</th>
                      <th className="px-2 py-2 text-right font-medium">{t('integrationsPage.whapi.maColMedian', 'Median')}</th>
                      <th className="px-2 py-2 text-right font-medium">{t('integrationsPage.whapi.maColAvg', 'Avg')}</th>
                      <th className="px-2 py-2 text-right font-medium">{t('integrationsPage.whapi.maColP90', 'P90')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    <LatencyRow
                      label={t('integrationsPage.whapi.maAutoReply', 'Automated (AI / system)')}
                      stats={data.firstResponseAfterCustomerMessage.automated}
                    />
                    <LatencyRow
                      label={t('integrationsPage.whapi.maHumanReply', 'Human agent')}
                      stats={data.firstResponseAfterCustomerMessage.humanAgent}
                    />
                    <LatencyRow
                      label={t('integrationsPage.whapi.maWorkflowReply', 'Workflow-tagged outbound')}
                      stats={data.firstResponseAfterCustomerMessage.workflowOutbound}
                    />
                  </tbody>
                </table>
              </div>
            </div>

            {Object.keys(data.messageTypeBreakdown).length > 0 ? (
              <div>
                <p className="mb-2 text-sm font-medium">
                  {t('integrationsPage.whapi.maMessageTypes', 'Message types')}
                </p>
                <ul className="flex flex-wrap gap-2 text-xs">
                  {Object.entries(data.messageTypeBreakdown).map(([k, v]) => (
                    <li
                      key={k}
                      className="rounded-md border border-border/50 bg-muted/20 px-2 py-1 tabular-nums"
                    >
                      <span className="text-muted-foreground">{k}</span>: <span className="font-medium">{v}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            <p className="text-[11px] leading-relaxed text-muted-foreground border-t border-border/40 pt-3">
              {data.dataSource.whapiProviderNote}
            </p>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground py-4">
            {t('integrationsPage.whapi.messageAnalyticsEmpty', 'No data.')}
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
}
