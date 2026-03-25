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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Plus, Trash2, RefreshCw, QrCode, Settings, Pencil, Link2 } from 'lucide-react';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '@/app/store';
import {
  fetchWhapiConnections,
  fetchWhapiPartnerProjects,
  createWhapiConnectionThunk,
  deleteWhapiConnectionThunk,
  updateWhapiConnectionNameThunk,
  updateWhapiChannelConfigThunk,
  syncWhapiWebhooksThunk,
  clearWhapiError,
  type WhapiConnectionRow,
} from '@/features/whapi/whapiSlice';
import { fetchWorkflows } from '@/features/workflow/workflowSlice';
import { fetchAiIntregationByBusinessId } from '@/features/business/businessSlice';
import type { ChannelMode, ChannelFallbackBehavior } from '@/features/unipile/unipileSlice';
import { isAxiosError } from 'axios';
import { api } from '@/api/axios';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';

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
  const workflows = useSelector((s: RootState) => s.workflow?.workflows ?? []);
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

  const [configOpen, setConfigOpen] = useState(false);
  const [configConn, setConfigConn] = useState<WhapiConnectionRow | null>(null);
  const [configMode, setConfigMode] = useState<ChannelMode>('hybrid');
  const [configFallback, setConfigFallback] = useState<ChannelFallbackBehavior>('route_to_ai');
  const [configFlowId, setConfigFlowId] = useState<string | null>(null);
  const [configSaving, setConfigSaving] = useState(false);

  const agentIdString = agentId ? String(agentId) : undefined;

  const filteredConnections = useMemo(() => {
    if (!agentIdString) return connections;
    return connections.filter((c) => (c.agentId ? String(c.agentId) : '') === agentIdString);
  }, [connections, agentIdString]);

  useEffect(() => {
    dispatch(fetchWhapiConnections());
    dispatch(fetchWhapiPartnerProjects());
    if (businessId) dispatch(fetchWorkflows({ businessId }));
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

  const handleSaveConfig = async () => {
    if (!configConn) return;
    setConfigSaving(true);
    try {
      await dispatch(
        updateWhapiChannelConfigThunk({
          connectionId: configConn.id,
          mode: configMode,
          defaultFlowId: configFlowId,
          fallbackBehavior: configFallback,
        })
      ).unwrap();
      toast.success(t('channelSettings.saved'));
      setConfigOpen(false);
      setConfigConn(null);
      dispatch(fetchWhapiConnections());
    } catch (e: unknown) {
      toast.error(
        typeof e === 'string' ? e : t('channelSettings.saveError', 'Failed to save settings')
      );
    } finally {
      setConfigSaving(false);
    }
  };

  const webhookUrlDisplay = publicWebhookUrlHint();

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Link2 className="h-5 w-5" />
            {t('integrationsPage.whapi.title', 'WhatsApp (linked device — Whapi)')}
          </CardTitle>
          <CardDescription>
            {t(
              'integrationsPage.whapi.subtitle',
              'Create a Whapi channel, scan the QR from your phone, and link inbound/outbound to Nuvro. Uses the same inbox and workflows as the API.'
            )}
          </CardDescription>
          {webhookUrlDisplay && (
            <p className="text-xs text-muted-foreground mt-2 break-all">
              {t('integrationsPage.whapi.webhookHint', 'Webhook URL (registered by backend):')}{' '}
              <code className="rounded bg-muted px-1 py-0.5">{webhookUrlDisplay}</code>
            </p>
          )}
          {webhookUrlDisplay && /localhost|127\.0\.0\.1/i.test(webhookUrlDisplay) ? (
            <p className="text-xs text-amber-600 dark:text-amber-500 mt-1.5">
              {t(
                'integrationsPage.whapi.webhookLocalhostWarn',
                'Whapi’s cloud cannot call localhost, so “connected” in the panel may not update here until we poll the gate—or set API_BASE_URL to a public URL (e.g. ngrok), restart the API, and use Sync webhooks so inbound messages work.'
              )}
            </p>
          ) : null}
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                {t('integrationsPage.whapi.addConnection', 'Add Whapi connection')}
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>{t('integrationsPage.whapi.createTitle', 'New Whapi channel')}</DialogTitle>
                <DialogDescription>
                  {t(
                    'integrationsPage.whapi.createHint',
                    'A channel is created in Whapi; scan the QR to connect WhatsApp on this device.'
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
                  <Label>{t('integrationsPage.whapi.projectOptional', 'Whapi project (optional)')}</Label>
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
                      'Whapi API: optional. If set, digits only (7–15).'
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
                      await dispatch(
                        createWhapiConnectionThunk({
                          name: createName.trim(),
                          projectId: projectId || undefined,
                          agentId: agentIdString,
                          phone: createPhone.trim() || undefined,
                        })
                      ).unwrap();
                      toast.success(t('integrationsPage.whapi.created', 'Channel created. Open QR to scan.'));
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
        </CardContent>
      </Card>

      {status === 'loading' && filteredConnections.length === 0 ? (
        <div className="flex items-center gap-2 text-muted-foreground text-sm">
          <Loader2 className="h-4 w-4 animate-spin" /> {t('integrationsPage.whapi.loading', 'Loading connections…')}
        </div>
      ) : null}

      <div className="grid gap-4">
        {filteredConnections.map((c) => (
          <Card key={c.id}>
            <CardHeader className="pb-2">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <CardTitle className="text-lg">{c.connectionName}</CardTitle>
                  <CardDescription className="font-mono text-xs mt-1">
                    {t('integrationsPage.whapi.channelId', 'Whapi channel')}: {c.whapiChannelId}
                  </CardDescription>
                </div>
                <Badge variant={c.status === 'connected' || c.status === 'active' ? 'default' : 'secondary'}>
                  {c.status}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={() => openQr(c)}>
                <QrCode className="h-4 w-4 mr-1" />
                {t('integrationsPage.whapi.showQr', 'Show QR')}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={async () => {
                  try {
                    await dispatch(syncWhapiWebhooksThunk(c.id)).unwrap();
                    toast.success(t('integrationsPage.whapi.webhooksSynced', 'Webhooks updated'));
                    await dispatch(fetchWhapiConnections());
                  } catch (e: unknown) {
                    toast.error(typeof e === 'string' ? e : 'Sync failed');
                  }
                }}
              >
                <RefreshCw className="h-4 w-4 mr-1" />
                {t('integrationsPage.whapi.syncWebhooks', 'Sync webhooks')}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setRenameConn(c);
                  setRenameValue(c.connectionName);
                  setRenameOpen(true);
                }}
              >
                <Pencil className="h-4 w-4 mr-1" />
                {t('integrationsPage.whapi.rename', 'Rename')}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setConfigConn(c);
                  setConfigMode((c.mode as ChannelMode) || 'hybrid');
                  setConfigFallback(c.fallbackBehavior || 'route_to_ai');
                  setConfigFlowId(c.defaultFlowId ?? null);
                  setConfigOpen(true);
                }}
              >
                <Settings className="h-4 w-4 mr-1" />
                {t('channelSettings.title', 'Channel settings')}
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={async () => {
                  if (!window.confirm(t('integrationsPage.whapi.confirmDelete', 'Delete this Whapi connection?'))) return;
                  try {
                    await dispatch(deleteWhapiConnectionThunk(c.id)).unwrap();
                    toast.success(t('integrationsPage.whapi.deleted', 'Connection removed'));
                    await dispatch(fetchWhapiConnections());
                  } catch (e: unknown) {
                    toast.error(typeof e === 'string' ? e : 'Delete failed');
                  }
                }}
              >
                <Trash2 className="h-4 w-4 mr-1" />
                {t('integrationsPage.whapi.delete', 'Delete')}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredConnections.length === 0 && status !== 'loading' ? (
        <p className="text-sm text-muted-foreground">{t('integrationsPage.whapi.empty', 'No Whapi connections yet.')}</p>
      ) : null}

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
                  'Loading QR from your server… Whapi may need up to about 2 minutes right after a channel is created (spinner is normal).'
                )}
              </p>
            ) : null}
          </DialogHeader>
          <div className="flex flex-col items-center gap-3 py-2">
            {qrLoading || !qrObjectUrl ? (
              <Loader2 className="h-10 w-10 animate-spin text-muted-foreground" />
            ) : (
              <img src={qrObjectUrl} alt="Whapi QR" className="max-w-[280px] rounded border bg-white p-2" />
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

      <Dialog
        open={configOpen}
        onOpenChange={(open) => {
          setConfigOpen(open);
          if (!open) setConfigConn(null);
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{t('channelSettings.title', 'Channel settings')}</DialogTitle>
            <DialogDescription>{t('channelSettings.intro', '')}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label>{t('channelSettings.modeLabel', 'Mode')}</Label>
              <Select value={configMode} onValueChange={(v) => setConfigMode(v as ChannelMode)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="human_only">{t('channelSettings.modeHumanOnly')}</SelectItem>
                  <SelectItem value="hybrid">{t('channelSettings.modeHybrid')}</SelectItem>
                  <SelectItem value="ai_only">{t('channelSettings.modeAiOnly')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>{t('channelSettings.fallbackLabel', 'Fallback')}</Label>
              <Select value={configFallback} onValueChange={(v) => setConfigFallback(v as ChannelFallbackBehavior)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="route_to_ai">{t('channelSettings.fallbackRouteToAi')}</SelectItem>
                  <SelectItem value="assign_to_human">{t('channelSettings.fallbackAssignToHuman')}</SelectItem>
                  <SelectItem value="create_ticket">{t('channelSettings.fallbackCreateTicket')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>{t('channelSettings.workflowLabel', 'Default workflow')}</Label>
              <Select
                value={configFlowId ?? 'none'}
                onValueChange={(v) => setConfigFlowId(v === 'none' ? null : v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">{t('channelSettings.workflowNone')}</SelectItem>
                  {workflows.filter((w) => w.active).map((w) => (
                    <SelectItem key={w._id} value={w._id}>
                      {w.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfigOpen(false)}>
              {t('channelSettings.cancel', 'Cancel')}
            </Button>
            <Button onClick={handleSaveConfig} disabled={configSaving}>
              {configSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {t('channelSettings.save', 'Save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function publicWebhookUrlHint(): string {
  const base = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/+$/, '') || '';
  if (!base) return '';
  return `${base}/api/v1/whapi/webhook`;
}
