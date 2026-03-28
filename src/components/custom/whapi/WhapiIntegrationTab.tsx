import { useCallback, useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Loader2,
  Plus,
  Trash2,
  RefreshCw,
  QrCode,
  Pencil,
  Link2,
  BarChart3,
  AlertTriangle,
} from 'lucide-react';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '@/app/store';
import {
  fetchWhapiConnections,
  fetchWhapiPartnerProjects,
  createWhapiConnectionThunk,
  deleteWhapiConnectionThunk,
  updateWhapiConnectionNameThunk,
  syncWhapiWebhooksThunk,
  clearWhapiError,
  type WhapiConnectionRow,
} from '@/features/whapi/whapiSlice';
import { fetchAiIntregationByBusinessId } from '@/features/business/businessSlice';
import { isAxiosError } from 'axios';
import { api } from '@/api/axios';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { getWhapiWorkflowVariantAnalytics, type WhapiWorkflowVariantAnalyticsRow } from '@/api/whapiInboxApi';

interface WhapiIntegrationTabProps {
  agentId?: string;
}

async function describeQrLoadFailure(err: unknown): Promise<string> {
  if (isAxiosError(err) && !err.response) {
    const msg = err.message || '';
    if (/network|cors|failed to fetch/i.test(msg)) {
      return 'Network/CORS — set VITE_API_BASE_URL to your API and ensure cookies/auth work.';
    }
    return msg || 'No response from server.';
  }
  if (isAxiosError(err)) {
    const status = err.response?.status;
    const data = err.response?.data;
    if (data instanceof Blob) {
      try {
        const text = await data.text();
        try {
          const j = JSON.parse(text) as { message?: string; error?: string };
          const m = j.message || j.error;
          if (m) return `${m}${status ? ` (${status})` : ''}`;
        } catch {
          if (text && text.length < 400) return `${text}${status ? ` (${status})` : ''}`;
        }
      } catch {
        /* ignore */
      }
    }
    if (typeof data === 'object' && data !== null && 'message' in data) {
      return String((data as { message: string }).message);
    }
    if (status === 401) {
      return 'Session expired — sign in again and retry.';
    }
    if (status) return `Request failed (${status})`;
  }
  if (err instanceof Error) return err.message;
  return String(err);
}

export default function WhapiIntegrationTab({ agentId }: WhapiIntegrationTabProps) {
  const { t } = useTranslation();
  const dispatch = useDispatch<AppDispatch>();
  const { connections, status, error, projects, projectsStatus } = useSelector((s: RootState) => s.whapi);
  const user = useSelector((s: RootState) => s.auth.user);
  const businessId = user?.businessId ?? '';

  const [createOpen, setCreateOpen] = useState(false);
  const [createName, setCreateName] = useState('');
  const [projectId, setProjectId] = useState<string>('');
  const [createPhone, setCreatePhone] = useState('');
  const [creating, setCreating] = useState(false);

  const [qrOpen, setQrOpen] = useState(false);
  const [qrFor, setQrFor] = useState<WhapiConnectionRow | null>(null);
  const [qrObjectUrl, setQrObjectUrl] = useState<string | null>(null);
  const [qrLoading, setQrLoading] = useState(false);

  const [renameOpen, setRenameOpen] = useState(false);
  const [renameConn, setRenameConn] = useState<WhapiConnectionRow | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [renameSaving, setRenameSaving] = useState(false);

  const [analyticsOpen, setAnalyticsOpen] = useState(false);
  const [analyticsConn, setAnalyticsConn] = useState<WhapiConnectionRow | null>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [analyticsDays, setAnalyticsDays] = useState(14);
  const [analyticsRows, setAnalyticsRows] = useState<WhapiWorkflowVariantAnalyticsRow[]>([]);

  const [deleteConfirmConn, setDeleteConfirmConn] = useState<WhapiConnectionRow | null>(null);
  const [deleteDeleting, setDeleteDeleting] = useState(false);

  const agentIdString = agentId ? String(agentId) : undefined;

  const filteredConnections = useMemo(() => {
    if (!agentIdString) return connections;
    return connections.filter((c) => (c.agentId ? String(c.agentId) : '') === agentIdString);
  }, [connections, agentIdString]);

  useEffect(() => {
    dispatch(fetchWhapiConnections());
    dispatch(fetchWhapiPartnerProjects());
  }, [dispatch, businessId]);

  useEffect(() => {
    if (businessId) dispatch(fetchAiIntregationByBusinessId(businessId));
  }, [dispatch, businessId]);

  useEffect(() => {
    if (error) {
      toast.error(error);
      dispatch(clearWhapiError());
    }
  }, [error, dispatch]);

  const loadQr = useCallback(async (conn: WhapiConnectionRow) => {
    setQrLoading(true);
    try {
      const res = await api.get(`/api/v1/whapi/connections/${encodeURIComponent(conn.id)}/qr-image`, {
        responseType: 'blob',
        // Backend may retry Whapi provisioning for up to ~2 minutes
        timeout: 240_000,
      });
      const raw = res.data as Blob;
      const buf = await raw.arrayBuffer();
      const u8 = new Uint8Array(buf);
      // PNG magic; ngrok free may return HTML interstitial without ngrok-skip-browser-warning header
      const isPng =
        u8.length >= 8 && u8[0] === 0x89 && u8[1] === 0x50 && u8[2] === 0x4e && u8[3] === 0x47;
      if (!isPng) {
        const text = new TextDecoder().decode(u8.slice(0, 600));
        throw new Error(
          text.includes('<!DOCTYPE') || text.includes('<html')
            ? 'ngrok returned an HTML page instead of the QR image. Ensure VITE_API_BASE_URL uses ngrok and restart the app (axios sends ngrok-skip-browser-warning).'
            : text.slice(0, 280)
        );
      }
      const pngBlob = new Blob([buf], { type: 'image/png' });
      const url = URL.createObjectURL(pngBlob);
      setQrObjectUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return url;
      });
    } catch (err: unknown) {
      const detail = await describeQrLoadFailure(err);
      toast.error(
        `${t('integrationsPage.whapi.qrError', 'Could not load QR.')} ${detail}`
      );
      setQrOpen(false);
      setQrFor(null);
    } finally {
      setQrLoading(false);
    }
  }, [t]);

  useEffect(() => {
    return () => {
      if (qrObjectUrl) URL.revokeObjectURL(qrObjectUrl);
    };
  }, [qrObjectUrl]);

  const openQr = (conn: WhapiConnectionRow) => {
    setQrFor(conn);
    setQrOpen(true);
    void loadQr(conn);
  };

  const loadVariantAnalytics = useCallback(async (conn: WhapiConnectionRow, days = analyticsDays) => {
    setAnalyticsLoading(true);
    try {
      const data = await getWhapiWorkflowVariantAnalytics(conn.id, days);
      setAnalyticsRows(Array.isArray(data?.variants) ? data.variants : []);
    } catch (e: unknown) {
      toast.error(typeof e === 'string' ? e : t('integrationsPage.whapi.analyticsError', 'Failed to load variant analytics'));
      setAnalyticsRows([]);
    } finally {
      setAnalyticsLoading(false);
    }
  }, [analyticsDays, t]);

  const statusLabel = (s: string | undefined) => {
    const v = (s || '').toLowerCase();
    if (v === 'connected' || v === 'active') return t('integrationsPage.whapi.statusConnected', 'Connected');
    if (v === 'pending') return t('integrationsPage.whapi.statusPending', 'Pending');
    if (v === 'disconnected' || v === 'inactive') return t('integrationsPage.whapi.statusDisconnected', 'Disconnected');
    return s || '—';
  };

  return (
    <div className="space-y-4 sm:space-y-5">
      <Card className="overflow-hidden rounded-xl border border-border/50 bg-card shadow-sm ring-1 ring-black/[0.03] dark:border-border/40 dark:bg-card/90 dark:ring-white/[0.04]">
        <CardHeader className="space-y-0 p-3 sm:p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
            <div className="flex min-w-0 gap-3">
              <div
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary ring-1 ring-primary/15 sm:h-10 sm:w-10 sm:rounded-xl"
                aria-hidden
              >
                <Link2 className="h-4 w-4 sm:h-[18px] sm:w-[18px]" strokeWidth={2} />
              </div>
              <div className="min-w-0 space-y-1">
                <CardTitle className="text-base font-semibold tracking-tight sm:text-lg">
                  {t('integrationsPage.whapi.title', 'WhatsApp')}
                </CardTitle>
                <CardDescription className="text-xs leading-snug text-muted-foreground sm:text-sm sm:leading-relaxed max-w-xl line-clamp-2">
                  {t(
                    'integrationsPage.whapi.subtitle',
                    'Scan the QR code with your phone to link WhatsApp. Customer messages will appear in your team inbox like your other channels.'
                  )}
                </CardDescription>
              </div>
            </div>
            <div className="shrink-0 sm:pl-1">
              <Dialog open={createOpen} onOpenChange={setCreateOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" className="h-9 w-full rounded-lg px-4 shadow-none sm:w-auto sm:min-w-[9.5rem]">
                    <Plus className="mr-1.5 h-3.5 w-3.5" />
                    {t('integrationsPage.whapi.addConnection', 'Add WhatsApp')}
                  </Button>
                </DialogTrigger>
            <DialogContent className="gap-4 sm:max-w-md">
              <DialogHeader>
                <DialogTitle>{t('integrationsPage.whapi.createTitle', 'Connect WhatsApp')}</DialogTitle>
                <DialogDescription>
                  {t(
                    'integrationsPage.whapi.createHint',
                    'We will prepare a QR code. Scan it with WhatsApp on your phone to finish linking.'
                  )}
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-3 py-2">
                <div className="grid gap-2">
                  <Label>{t('integrationsPage.whapi.displayName', 'Display name')}</Label>
                  <Input
                    value={createName}
                    onChange={(e) => setCreateName(e.target.value)}
                    placeholder={t('integrationsPage.whapi.displayNamePlaceholder', 'e.g. Support WhatsApp')}
                  />
                </div>
                <div className="grid gap-2">
                  <Label>{t('integrationsPage.whapi.projectOptional', 'Project (optional)')}</Label>
                  <Select
                    value={projectId || 'none'}
                    onValueChange={(v) => setProjectId(v === 'none' ? '' : v)}
                    disabled={projectsStatus === 'loading'}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={t('integrationsPage.whapi.projectPlaceholder', 'Default project')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">{t('integrationsPage.whapi.defaultProject', 'Default')}</SelectItem>
                      {projects.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.name || p.id}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label>
                    {t('integrationsPage.whapi.phoneOptional', 'Phone number (optional)')}
                  </Label>
                  <Input
                    value={createPhone}
                    onChange={(e) => setCreatePhone(e.target.value)}
                    placeholder={t(
                      'integrationsPage.whapi.phonePlaceholder',
                      '7–15 digits, country code without +'
                    )}
                    inputMode="tel"
                    autoComplete="tel"
                  />
                  <p className="text-xs text-muted-foreground">
                    {t(
                      'integrationsPage.whapi.phoneHint',
                      'Optional. Digits only, 7–15 with country code (no +).'
                    )}
                  </p>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setCreateOpen(false)}>
                  {t('channelSettings.cancel', 'Cancel')}
                </Button>
                <Button
                  disabled={creating || !createName.trim()}
                  onClick={async () => {
                    setCreating(true);
                    try {
                      const created = (await dispatch(
                        createWhapiConnectionThunk({
                          name: createName.trim(),
                          projectId: projectId || undefined,
                          agentId: agentIdString,
                          phone: createPhone.trim() || undefined,
                        })
                      ).unwrap()) as Record<string, unknown>;
                      toast.success(t('integrationsPage.whapi.created', 'Ready. Open QR to scan with your phone.'));
                      const liveWarn =
                        typeof created?.liveModeWarning === 'string' ? created.liveModeWarning.trim() : '';
                      if (liveWarn) {
                        toast.error(liveWarn, { duration: 12000 });
                      }
                      setCreateOpen(false);
                      setCreateName('');
                      setProjectId('');
                      setCreatePhone('');
                      await dispatch(fetchWhapiConnections());
                    } catch (e: unknown) {
                      toast.error(typeof e === 'string' ? e : 'Failed');
                    } finally {
                      setCreating(false);
                    }
                  }}
                >
                  {creating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  {t('integrationsPage.whapi.create', 'Create')}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
            </div>
          </div>
        </CardHeader>
      </Card>

      {status === 'loading' && filteredConnections.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border/60 bg-muted/15 px-4 py-8 text-center sm:py-9">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" aria-hidden />
          <p className="text-xs text-muted-foreground sm:text-sm">
            {t('integrationsPage.whapi.loading', 'Loading connections…')}
          </p>
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-3 sm:gap-3.5">
        {filteredConnections.map((c) => {
          const isLive =
            c.status === 'connected' || c.status === 'active' || String(c.status).toLowerCase() === 'connected';
          const daysHint = t(
            'integrationsPage.whapi.partnerDaysHint',
            'Time added from this dashboard vs. time still available on the line.'
          );
          const btnClass =
            'h-8 w-full justify-center gap-1 rounded-md px-2 text-[11px] font-medium sm:h-8 sm:text-xs';
          return (
            <Card
              key={c.id}
              className="group overflow-hidden rounded-xl border border-border/50 bg-card shadow-sm ring-1 ring-black/[0.02] transition-[border-color,box-shadow] hover:border-border/70 hover:shadow-md dark:border-border/40 dark:bg-card/90 dark:ring-white/[0.03] dark:hover:border-border/55"
            >
              <div className="p-3 sm:p-3.5">
                <div className="flex min-w-0 flex-col gap-2.5 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
                  <div className="flex min-w-0 flex-1 gap-2.5">
                    <div
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ring-1 sm:h-9 sm:w-9 ${
                        isLive
                          ? 'bg-emerald-500/10 text-emerald-700 ring-emerald-500/20 dark:text-emerald-400'
                          : 'bg-muted/50 text-muted-foreground ring-border/60'
                      }`}
                      aria-hidden
                    >
                      <Link2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" strokeWidth={2} />
                    </div>
                    <div className="min-w-0 flex-1 space-y-1.5">
                      <div className="flex flex-wrap items-center gap-1.5 gap-y-1">
                        <CardTitle className="truncate text-sm font-semibold leading-tight tracking-tight sm:text-[0.9375rem]">
                          {c.connectionName}
                        </CardTitle>
                        <Badge
                          variant={isLive ? 'default' : 'secondary'}
                          className="h-5 shrink-0 px-1.5 py-0 text-[10px] font-medium capitalize leading-none"
                        >
                          {statusLabel(c.status)}
                        </Badge>
                      </div>
                      <p
                        className="truncate font-mono text-[10px] leading-tight text-muted-foreground sm:text-[11px]"
                        title={c.whapiChannelId}
                      >
                        <span className="mr-1 text-[9px] font-sans font-medium uppercase tracking-wide text-muted-foreground/80">
                          {t('integrationsPage.whapi.channelId', 'Reference')}
                        </span>
                        {c.whapiChannelId}
                      </p>
                      <div className="flex flex-wrap gap-1" title={daysHint}>
                        <Badge
                          variant="secondary"
                          className="h-5 border-0 bg-muted/80 px-1.5 py-0 text-[10px] font-medium tabular-nums shadow-none dark:bg-muted/40"
                        >
                          {c.partnerDaysAllocatedTotal != null
                            ? t('integrationsPage.whapi.partnerDaysAllocated', '{{count}} d · added', {
                                count: c.partnerDaysAllocatedTotal,
                              })
                            : t('integrationsPage.whapi.partnerDaysAllocatedUnknown', 'Allocated: —')}
                        </Badge>
                        <Badge
                          variant="outline"
                          className={`h-5 px-1.5 py-0 text-[10px] font-medium tabular-nums ${
                            c.partnerDaysRemaining === 0
                              ? 'border-destructive/40 bg-destructive/5 text-destructive'
                              : 'border-border/60'
                          }`}
                        >
                          {c.partnerDaysRemaining == null
                            ? t('integrationsPage.whapi.partnerDaysRemainingUnknown', 'Remaining: —')
                            : c.partnerDaysRemaining === 0
                              ? t('integrationsPage.whapi.partnerDaysRemainingExpired', 'Expired')
                              : t('integrationsPage.whapi.partnerDaysRemaining', '{{count}} d left', {
                                  count: c.partnerDaysRemaining,
                                })}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </div>
                {c.whapiLiveModePending ? (
                  <p
                    className="mt-2.5 rounded-md border border-amber-500/30 bg-amber-500/[0.07] px-2.5 py-1.5 text-[11px] leading-snug text-amber-950 dark:border-amber-500/25 dark:bg-amber-500/10 dark:text-amber-100/95 sm:text-xs"
                    role="status"
                  >
                    {t(
                      'integrationsPage.whapi.liveModePendingBanner',
                      'Paid time is still activating. If messages do not sync, use Refresh connection or contact support.'
                    )}
                  </p>
                ) : null}
                <div className="mt-3 border-t border-border/40 pt-3 dark:border-border/30">
                  <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground/90">
                    {t('integrationsPage.whapi.actionsHeading', 'Actions')}
                  </p>
                  <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4 lg:grid-cols-4 xl:grid-cols-5">
                    <Button variant="outline" size="sm" className={btnClass} onClick={() => openQr(c)}>
                      <QrCode className="h-3.5 w-3.5 shrink-0 opacity-80" />
                      <span className="truncate">{t('integrationsPage.whapi.showQr', 'Show QR')}</span>
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className={btnClass}
                      onClick={async () => {
                        try {
                          await dispatch(syncWhapiWebhooksThunk(c.id)).unwrap();
                          toast.success(t('integrationsPage.whapi.webhooksSynced', 'Connection refreshed'));
                          await dispatch(fetchWhapiConnections());
                        } catch (e: unknown) {
                          toast.error(typeof e === 'string' ? e : 'Sync failed');
                        }
                      }}
                    >
                      <RefreshCw className="h-3.5 w-3.5 shrink-0 opacity-80" />
                      <span className="truncate">{t('integrationsPage.whapi.syncWebhooks', 'Refresh connection')}</span>
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className={btnClass}
                      onClick={() => {
                        setRenameConn(c);
                        setRenameValue(c.connectionName);
                        setRenameOpen(true);
                      }}
                    >
                      <Pencil className="h-3.5 w-3.5 shrink-0 opacity-80" />
                      <span className="truncate">{t('integrationsPage.whapi.rename', 'Rename')}</span>
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className={btnClass}
                      onClick={() => {
                        setAnalyticsConn(c);
                        setAnalyticsOpen(true);
                        void loadVariantAnalytics(c, analyticsDays);
                      }}
                    >
                      <BarChart3 className="h-3.5 w-3.5 shrink-0 opacity-80" />
                      <span className="truncate">{t('integrationsPage.whapi.variantAnalytics', 'Variant analytics')}</span>
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      className={`${btnClass} col-span-2 border-destructive/25 bg-destructive/5 hover:bg-destructive/15 sm:col-span-2 lg:col-span-2 xl:col-span-1`}
                      onClick={() => setDeleteConfirmConn(c)}
                    >
                      <Trash2 className="h-3.5 w-3.5 shrink-0" />
                      <span className="truncate">{t('integrationsPage.whapi.delete', 'Delete')}</span>
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {filteredConnections.length === 0 && status !== 'loading' ? (
        <Card className="rounded-xl border-dashed border-border/60 bg-muted/10 shadow-none dark:border-border/50 dark:bg-muted/5">
          <CardContent className="flex flex-col items-center justify-center gap-2 px-4 py-8 text-center sm:py-9">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted/50 text-muted-foreground ring-1 ring-border/40 dark:bg-muted/30">
              <Link2 className="h-5 w-5 opacity-85" strokeWidth={1.75} />
            </div>
            <p className="max-w-xs text-xs leading-relaxed text-muted-foreground sm:text-sm">
              {t('integrationsPage.whapi.empty', 'No WhatsApp connections yet.')}
            </p>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="mt-0.5 h-8 rounded-md text-xs"
              onClick={() => setCreateOpen(true)}
            >
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              {t('integrationsPage.whapi.addConnection', 'Add WhatsApp')}
            </Button>
          </CardContent>
        </Card>
      ) : null}

      <AlertDialog
        open={deleteConfirmConn !== null}
        onOpenChange={(open) => {
          if (!open) {
            if (deleteDeleting) return;
            setDeleteConfirmConn(null);
          }
        }}
      >
        <AlertDialogContent className="sm:max-w-[440px] border-destructive/20 shadow-lg">
          <div className="flex gap-4">
            <div
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-destructive/10 ring-1 ring-destructive/15"
              aria-hidden
            >
              <AlertTriangle className="h-6 w-6 text-destructive" strokeWidth={2} />
            </div>
            <AlertDialogHeader className="flex-1 space-y-2 text-left sm:text-left">
              <AlertDialogTitle className="text-xl font-semibold tracking-tight pr-2 leading-snug">
                {t('integrationsPage.whapi.deleteModalTitle', 'Remove this WhatsApp connection?')}
              </AlertDialogTitle>
              {deleteConfirmConn ? (
                <AlertDialogDescription asChild>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {t(
                      'integrationsPage.whapi.deleteModalLead',
                      '{{name}} will be disconnected from this dashboard.',
                      { name: deleteConfirmConn.connectionName }
                    )}
                  </p>
                </AlertDialogDescription>
              ) : (
                <AlertDialogDescription className="sr-only">
                  {t('integrationsPage.whapi.confirmDelete', 'Remove this connection?')}
                </AlertDialogDescription>
              )}
            </AlertDialogHeader>
          </div>
          {deleteConfirmConn ? (
            <div className="rounded-lg border border-border/80 bg-muted/50 px-3 py-2.5 text-xs font-mono text-muted-foreground break-all shadow-inner">
              {deleteConfirmConn.whapiChannelId}
            </div>
          ) : null}
          {deleteConfirmConn ? (
            <p className="text-sm text-muted-foreground leading-relaxed border-l-2 border-amber-500/60 pl-3 py-0.5">
              {t(
                'integrationsPage.whapi.deleteModalBody',
                'Customers will no longer reach you through this linked number here. This cannot be undone. Any unused prepaid time may be credited according to your plan.'
              )}
            </p>
          ) : null}
          <AlertDialogFooter className="gap-2 sm:gap-2 pt-2">
            <AlertDialogCancel disabled={deleteDeleting} className="mt-0">
              {t('integrationsPage.whapi.deleteModalCancel', 'Cancel')}
            </AlertDialogCancel>
            <Button
              variant="destructive"
              disabled={deleteDeleting}
              className="gap-2"
              onClick={async () => {
                if (!deleteConfirmConn) return;
                setDeleteDeleting(true);
                try {
                  const del = await dispatch(deleteWhapiConnectionThunk(deleteConfirmConn.id)).unwrap();
                  toast.success(t('integrationsPage.whapi.deleted', 'Connection removed'));
                  if (del.partnerBalanceNote) {
                    toast(del.partnerBalanceNote, { duration: 8000 });
                  }
                  setDeleteConfirmConn(null);
                  await dispatch(fetchWhapiConnections());
                } catch (e: unknown) {
                  toast.error(typeof e === 'string' ? e : t('integrationsPage.whapi.deleteError', 'Delete failed'));
                } finally {
                  setDeleteDeleting(false);
                }
              }}
            >
              {deleteDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
              {t('integrationsPage.whapi.deleteModalConfirm', 'Delete connection')}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog
        open={qrOpen}
        onOpenChange={(open) => {
          setQrOpen(open);
          if (!open) {
            setQrFor(null);
            if (qrObjectUrl) {
              URL.revokeObjectURL(qrObjectUrl);
              setQrObjectUrl(null);
            }
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t('integrationsPage.whapi.qrTitle', 'Scan QR with WhatsApp')}</DialogTitle>
            <DialogDescription>
              {t(
                'integrationsPage.whapi.qrHint',
                'WhatsApp → Linked devices → Link a device. If login fails, wait ~90s after creating the channel and try again.'
              )}
            </DialogDescription>
            {qrLoading ? (
              <p className="text-sm text-muted-foreground text-center">
                {t(
                  'integrationsPage.whapi.qrLoadingDetail',
                  'Loading QR code… This can take up to a couple of minutes right after setup (this is normal).'
                )}
              </p>
            ) : null}
          </DialogHeader>
          <div className="flex flex-col items-center gap-3 py-2">
            {qrLoading || !qrObjectUrl ? (
              <Loader2 className="h-10 w-10 animate-spin text-muted-foreground" />
            ) : (
              <img
                src={qrObjectUrl}
                alt={t('integrationsPage.whapi.qrImageAlt', 'QR code to link WhatsApp')}
                className="max-w-[280px] rounded border bg-white p-2"
              />
            )}
            {qrFor ? (
              <p className="text-xs text-muted-foreground text-center max-w-full">
                {t(
                  'integrationsPage.whapi.qrPathNote',
                  'The image is loaded with your login (not by opening this URL in a new tab).'
                )}
              </p>
            ) : null}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={analyticsOpen}
        onOpenChange={(open) => {
          setAnalyticsOpen(open);
          if (!open) {
            setAnalyticsConn(null);
            setAnalyticsRows([]);
          }
        }}
      >
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{t('integrationsPage.whapi.variantAnalyticsTitle', 'Workflow variant analytics')}</DialogTitle>
            <DialogDescription>
              {t('integrationsPage.whapi.variantAnalyticsHint', 'Compare first-message variants by reply rate and conversations.')}
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center gap-2">
            <Label className="text-sm">{t('integrationsPage.whapi.lastDays', 'Last days')}</Label>
            <Input
              type="number"
              min={1}
              max={90}
              value={analyticsDays}
              onChange={(e) => setAnalyticsDays(Math.min(90, Math.max(1, Number(e.target.value) || 14)))}
              className="w-24"
            />
            <Button
              variant="outline"
              size="sm"
              disabled={!analyticsConn || analyticsLoading}
              onClick={() => analyticsConn && void loadVariantAnalytics(analyticsConn, analyticsDays)}
            >
              {analyticsLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {t('integrationsPage.whapi.refreshAnalytics', 'Refresh')}
            </Button>
          </div>
          <div className="max-h-[360px] overflow-auto rounded border">
            {analyticsLoading ? (
              <div className="p-6 text-sm text-muted-foreground flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                {t('integrationsPage.whapi.loadingAnalytics', 'Loading analytics...')}
              </div>
            ) : analyticsRows.length === 0 ? (
              <div className="p-6 text-sm text-muted-foreground">
                {t('integrationsPage.whapi.noAnalytics', 'No workflow variant data found for this period.')}
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="px-3 py-2 text-left">Variant</th>
                    <th className="px-3 py-2 text-left">Kind</th>
                    <th className="px-3 py-2 text-right">Sent</th>
                    <th className="px-3 py-2 text-right">Conversations</th>
                    <th className="px-3 py-2 text-right">Replies</th>
                    <th className="px-3 py-2 text-right">Reply Rate</th>
                  </tr>
                </thead>
                <tbody>
                  {analyticsRows.map((row) => (
                    <tr key={`${row.variantId}:${row.variantKind}`} className="border-t">
                      <td className="px-3 py-2 font-mono text-xs">{row.variantId}</td>
                      <td className="px-3 py-2">{row.variantKind}</td>
                      <td className="px-3 py-2 text-right">{row.sentCount}</td>
                      <td className="px-3 py-2 text-right">{row.uniqueConversations}</td>
                      <td className="px-3 py-2 text-right">{row.repliedConversations}</td>
                      <td className="px-3 py-2 text-right">{(row.replyRate * 100).toFixed(1)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={renameOpen}
        onOpenChange={(open) => {
          setRenameOpen(open);
          if (!open) {
            setRenameConn(null);
            setRenameValue('');
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('integrationsPage.whapi.renameTitle', 'Rename connection')}</DialogTitle>
          </DialogHeader>
          <Input value={renameValue} onChange={(e) => setRenameValue(e.target.value)} maxLength={150} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenameOpen(false)}>
              {t('channelSettings.cancel', 'Cancel')}
            </Button>
            <Button
              disabled={renameSaving || !renameValue.trim()}
              onClick={async () => {
                if (!renameConn) return;
                setRenameSaving(true);
                try {
                  await dispatch(
                    updateWhapiConnectionNameThunk({ id: renameConn.id, name: renameValue.trim() })
                  ).unwrap();
                  toast.success(t('integrationsPage.whapi.renamed', 'Name updated'));
                  setRenameOpen(false);
                  await dispatch(fetchWhapiConnections());
                } catch (e: unknown) {
                  toast.error(typeof e === 'string' ? e : 'Failed');
                } finally {
                  setRenameSaving(false);
                }
              }}
            >
              {renameSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {t('channelSettings.save', 'Save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
