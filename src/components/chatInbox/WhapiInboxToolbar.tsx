import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Loader2, Radio, RefreshCw, Wifi, WifiOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  getWhapiGateHealth,
  getWhapiInboxCapabilities,
  getWhapiContactPresence,
  putWhapiMyPresence,
} from '@/api/whapiInboxApi';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

type Props = {
  connectionId: string;
  /** E.164 or local digits — passed as `phone` query to contact presence */
  customerPhone?: string | null;
  /** WhatsApp JID if known (from message metadata) */
  chatId?: string | null;
  className?: string;
};

function summarizePresence(p: unknown): string {
  if (p == null) return '';
  if (typeof p === 'string') return p;
  if (typeof p === 'object') {
    const o = p as Record<string, unknown>;
    const last = o.lastSeen ?? o.last_seen ?? o.LastSeen;
    const status = o.status ?? o.presence ?? o.state;
    const parts = [typeof status === 'string' ? status : '', typeof last === 'string' || typeof last === 'number' ? String(last) : ''].filter(
      Boolean
    );
    return parts.join(' · ') || JSON.stringify(o).slice(0, 120);
  }
  return String(p);
}

export default function WhapiInboxToolbar({ connectionId, customerPhone, chatId, className }: Props) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [healthOk, setHealthOk] = useState<boolean | null>(null);
  const [capsLoaded, setCapsLoaded] = useState(false);
  const [presenceHint, setPresenceHint] = useState<string>('');
  const [myPresence, setMyPresence] = useState<'available' | 'offline'>('available');

  const refresh = useCallback(async () => {
    if (!connectionId) return;
    setLoading(true);
    try {
      const [health, caps, contact] = await Promise.all([
        getWhapiGateHealth(connectionId).catch(() => null),
        getWhapiInboxCapabilities(connectionId).catch(() => null),
        (customerPhone || chatId
          ? getWhapiContactPresence(connectionId, {
              ...(customerPhone ? { phone: customerPhone } : {}),
              ...(chatId ? { chatId } : {}),
            })
          : Promise.resolve(null)
        ).catch(() => null),
      ]);
      const h = health as { ok?: boolean; status?: string } | null;
      setHealthOk(typeof h?.ok === 'boolean' ? h.ok : h?.status === 'ok' || h?.status === 'healthy');
      setCapsLoaded(!!caps);
      if (contact?.presence != null) {
        setPresenceHint(summarizePresence(contact.presence));
      } else {
        setPresenceHint('');
      }
    } finally {
      setLoading(false);
    }
  }, [connectionId, customerPhone, chatId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const setOnlineState = async (online: boolean) => {
    setMyPresence(online ? 'available' : 'offline');
    try {
      await putWhapiMyPresence(connectionId, online ? 'online' : 'offline');
    } catch {
      setMyPresence((p) => p);
    }
  };

  return (
    <div
      className={cn(
        'flex flex-wrap items-center gap-2 px-3 py-2 border-b bg-emerald-950/[0.04] dark:bg-emerald-500/[0.06]',
        className
      )}
    >
      <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-600/30 bg-emerald-500/10 px-2.5 py-0.5 text-xs font-medium text-emerald-800 dark:text-emerald-200">
        <Radio className="h-3 w-3" />
        {t('chatInbox.whapi.badge')}
      </span>

      <Tooltip>
        <TooltipTrigger asChild>
          <span
            className={cn(
              'inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs',
              healthOk === true && 'text-emerald-700 dark:text-emerald-300',
              healthOk === false && 'text-amber-700 dark:text-amber-300',
              healthOk === null && 'text-muted-foreground'
            )}
          >
            {healthOk === true ? <Wifi className="h-3.5 w-3.5" /> : healthOk === false ? <WifiOff className="h-3.5 w-3.5" /> : null}
            {healthOk === true
              ? t('chatInbox.whapi.gateOk')
              : healthOk === false
                ? t('chatInbox.whapi.gateIssue')
                : t('chatInbox.whapi.gateUnknown')}
          </span>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-xs">
          {capsLoaded ? t('chatInbox.whapi.capabilitiesHint') : t('chatInbox.whapi.refreshHint')}
        </TooltipContent>
      </Tooltip>

      <div className="flex items-center gap-1 rounded-lg border bg-background/80 p-0.5">
        <Button
          type="button"
          variant={myPresence === 'available' ? 'secondary' : 'ghost'}
          size="sm"
          className="h-7 px-2 text-xs"
          onClick={() => void setOnlineState(true)}
        >
          {t('chatInbox.whapi.showOnline')}
        </Button>
        <Button
          type="button"
          variant={myPresence === 'offline' ? 'secondary' : 'ghost'}
          size="sm"
          className="h-7 px-2 text-xs"
          onClick={() => void setOnlineState(false)}
        >
          {t('chatInbox.whapi.showOffline')}
        </Button>
      </div>

      {(customerPhone || chatId) && (
        <span className="max-w-[min(100%,14rem)] truncate text-xs text-muted-foreground" title={presenceHint}>
          {presenceHint ? t('chatInbox.whapi.contactPresence', { hint: presenceHint }) : t('chatInbox.whapi.contactPresenceUnknown')}
        </span>
      )}

      <Button type="button" variant="outline" size="sm" className="h-7 gap-1 text-xs ml-auto" onClick={() => void refresh()} disabled={loading}>
        {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
        {t('chatInbox.whapi.refresh')}
      </Button>
    </div>
  );
}
