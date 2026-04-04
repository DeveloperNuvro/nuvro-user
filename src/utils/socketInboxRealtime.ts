import type { ConversationInList } from '@/features/chatInbox/chatInboxSlice';
import { mergeConversationWithSocketHints, normalizeConversationPlatformFields } from './conversationUiPlatform';

function normWaProv(p: unknown): 'whapi' | 'unipile' | 'meta' | undefined {
  const s = String(p ?? '').toLowerCase();
  if (s === 'whapi' || s === 'unipile' || s === 'meta') return s;
  return undefined;
}

function mapWhatsappConnection(raw: unknown): ConversationInList['whatsappConnection'] | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const o = raw as Record<string, unknown>;
  const id = String(o.id ?? '').trim();
  if (!id) return undefined;
  const prov = normWaProv(o.provider);
  return {
    id,
    displayName: (o.displayName as string | null | undefined) ?? null,
    ...(prov ? { provider: prov } : {}),
  };
}

function ensurePlatformInfo(base: ConversationInList): void {
  if (base.platformInfo?.platform) return;
  const plat = String(base.platformInfo?.platform || base.source || 'website').toLowerCase();
  const allowed = ['whatsapp', 'instagram', 'telegram', 'email', 'website'] as const;
  const platform = (allowed as readonly string[]).includes(plat) ? plat : 'website';
  base.platformInfo = {
    ...(base.platformInfo || {}),
    platform: platform as (typeof allowed)[number],
    connectionId: base.platformInfo?.connectionId ?? '',
    platformUserId: base.platformInfo?.platformUserId ?? '',
    platformUserName: base.platformInfo?.platformUserName,
    platformUserAvatar: base.platformInfo?.platformUserAvatar,
  };
}

/** List row from enriched business-room `newMessage` when the conversation is not in Redux yet. */
export function conversationRowFromBusinessNewMessageSocket(
  data: Record<string, unknown>,
  opts: {
    conversationId: string;
    customerId: string;
    customerName: string;
    preview: string;
    unknownCustomerLabel: string;
  }
): ConversationInList {
  const { conversationId, customerId, customerName, preview, unknownCustomerLabel } = opts;
  const statusRaw = data.status;
  const status: ConversationInList['status'] =
    statusRaw === 'live' || statusRaw === 'ticket' || statusRaw === 'ai_only' || statusRaw === 'closed'
      ? statusRaw
      : 'ai_only';

  const base: ConversationInList = {
    id: conversationId,
    customer: { id: customerId, name: customerName || unknownCustomerLabel },
    preview: String(data.preview ?? preview).slice(0, 200),
    latestMessageTimestamp: (data.latestMessageTimestamp ??
      data.time ??
      data.timestamp ??
      data.createdAt ??
      new Date().toISOString()) as string,
    status,
    assignedAgentId:
      data.assignedAgentId != null && String(data.assignedAgentId) !== ''
        ? String(data.assignedAgentId)
        : undefined,
    unreadCount: typeof data.unreadCount === 'number' ? data.unreadCount : 1,
    priority: (data.priority as ConversationInList['priority']) || 'normal',
    tags: Array.isArray(data.tags) ? (data.tags as string[]) : [],
    notes: (data.notes as string) || '',
    platformInfo: data.platformInfo as ConversationInList['platformInfo'],
    source: typeof data.source === 'string' ? data.source : undefined,
    whatsappConnection: mapWhatsappConnection(data.whatsappConnection),
    country: (data.country as ConversationInList['country']) ?? null,
    firstResponseAt: (data.firstResponseAt as string | null) ?? null,
    createdAt: data.createdAt as string | undefined,
    channelId: data.channelId != null ? String(data.channelId) : undefined,
    aiReplyDisabled: data.aiReplyDisabled as boolean | undefined,
  };

  ensurePlatformInfo(base);

  return normalizeConversationPlatformFields(
    mergeConversationWithSocketHints(base, {
      topLevelSource: base.source,
      metadata: (data.metadata as Record<string, unknown>) ?? undefined,
    })
  );
}

/** Map `newConversation` socket payload → list row (matches enriched backend payload). */
export function conversationRowFromNewConversationSocket(
  data: Record<string, unknown>,
  unknownCustomerLabel: string
): ConversationInList | null {
  const id = String(data.id ?? data.conversationId ?? '').trim();
  const custId = String(data.customer && typeof data.customer === 'object' && (data.customer as any).id != null
    ? (data.customer as any).id
    : data.customerId ?? '').trim();
  if (!id || !custId) return null;

  const cust =
    data.customer && typeof data.customer === 'object'
      ? (data.customer as { id?: string; name?: string })
      : null;
  const customerName = cust?.name ?? (data.customerName as string) ?? unknownCustomerLabel;

  const statusRaw = data.status;
  const status: ConversationInList['status'] =
    statusRaw === 'closed'
      ? 'closed'
      : statusRaw === 'live' || statusRaw === 'ticket' || statusRaw === 'ai_only'
        ? statusRaw
        : 'ai_only';

  const base: ConversationInList = {
    id,
    customer: { id: custId, name: customerName },
    preview: String(data.preview ?? data.latestMessage ?? '').slice(0, 200),
    latestMessageTimestamp: (data.latestMessageTimestamp ?? data.time ?? new Date().toISOString()) as string,
    status,
    assignedAgentId: data.assignedAgentId != null ? String(data.assignedAgentId) : undefined,
    unreadCount: typeof data.unreadCount === 'number' ? data.unreadCount : 0,
    priority: (data.priority as ConversationInList['priority']) || 'normal',
    tags: Array.isArray(data.tags) ? (data.tags as string[]) : [],
    notes: (data.notes as string) || '',
    platformInfo: data.platformInfo as ConversationInList['platformInfo'],
    source: typeof data.source === 'string' ? data.source : undefined,
    whatsappConnection: mapWhatsappConnection(data.whatsappConnection),
    country: (data.country as ConversationInList['country']) ?? null,
    firstResponseAt: (data.firstResponseAt as string | null) ?? null,
    createdAt: data.createdAt as string | undefined,
    channelId: data.channelId != null ? String(data.channelId) : undefined,
    aiReplyDisabled: data.aiReplyDisabled as boolean | undefined,
  };

  ensurePlatformInfo(base);

  return normalizeConversationPlatformFields(
    mergeConversationWithSocketHints(base, {
      topLevelSource: typeof data.source === 'string' ? data.source : undefined,
      metadata: (data.metadata as Record<string, unknown>) ?? undefined,
    })
  );
}

/** Merge onto an existing list row when `newMessage` carries connection/country (business inbox). */
export function inboxListPatchFromSocketMessage(
  data: Record<string, unknown>
): Partial<Pick<ConversationInList, 'whatsappConnection' | 'country' | 'platformInfo' | 'source'>> | undefined {
  const wa = mapWhatsappConnection(data.whatsappConnection);
  const src = typeof data.source === 'string' && data.source.trim() ? data.source.trim() : undefined;
  const pi = data.platformInfo;
  const hasPlatform = pi && typeof pi === 'object';
  if (!wa && data.country === undefined && !hasPlatform && !src) return undefined;
  const patch: Partial<Pick<ConversationInList, 'whatsappConnection' | 'country' | 'platformInfo' | 'source'>> = {};
  if (wa) patch.whatsappConnection = wa;
  if (data.country !== undefined) patch.country = data.country as ConversationInList['country'];
  if (hasPlatform) patch.platformInfo = pi as ConversationInList['platformInfo'];
  if (src) patch.source = src;
  return patch;
}
