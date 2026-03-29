import type { ConversationInList } from '@/features/chatInbox/chatInboxSlice';

export type ChatSurfacePlatform = 'whatsapp' | 'instagram' | 'telegram' | 'website';

const ALLOWED: ChatSurfacePlatform[] = ['whatsapp', 'instagram', 'telegram', 'website'];

/** Platform for inbox chrome / bubbles: prefer platformInfo.platform, else source (realtime payloads often set only source). */
export function getConversationUiPlatform(convo: ConversationInList | null | undefined): ChatSurfacePlatform {
  if (!convo) return 'website';
  const raw = String(convo.platformInfo?.platform || convo.source || 'website')
    .toLowerCase()
    .trim();
  return (ALLOWED as readonly string[]).includes(raw) ? (raw as ChatSurfacePlatform) : 'website';
}

/**
 * Ensures platformInfo.platform is set from source when missing — fixes WhatsApp styling until full refetch.
 */
export function normalizeConversationPlatformFields(c: ConversationInList): ConversationInList {
  const platform = getConversationUiPlatform(c);
  return {
    ...c,
    platformInfo: {
      ...c.platformInfo,
      platform,
      connectionId: c.platformInfo?.connectionId ?? '',
      platformUserId: c.platformInfo?.platformUserId ?? '',
      platformUserName: c.platformInfo?.platformUserName,
      platformUserAvatar: c.platformInfo?.platformUserAvatar,
    },
  };
}

type SocketHints = { topLevelSource?: string; metadata?: Record<string, unknown> | null };

/**
 * When the conversation list row was created without platform (e.g. DashboardLayout addNewCustomer stub),
 * infer WhatsApp/IG/Telegram from socket newMessage `source` or message metadata (chat JID, etc.).
 */
export function mergeConversationWithSocketHints(
  conv: ConversationInList,
  hints: SocketHints
): ConversationInList {
  const meta = hints.metadata || {};
  const top = String(hints.topLevelSource || '').toLowerCase().trim();
  const metaPlat = String((meta as { platform?: string }).platform || (meta as { source?: string }).source || '')
    .toLowerCase()
    .trim();
  const chatId = String((meta as { chatId?: string }).chatId || '');
  const looksWaJid = /@(s\.)?whatsapp\.net/i.test(chatId);

  let inferred: ChatSurfacePlatform | null = null;
  if (top === 'whatsapp' || top === 'instagram' || top === 'telegram') inferred = top;
  else if (metaPlat === 'whatsapp' || metaPlat === 'instagram' || metaPlat === 'telegram') inferred = metaPlat as ChatSurfacePlatform;
  else if (looksWaJid) inferred = 'whatsapp';

  if (!inferred) return conv;

  const connectionId = String((meta as { connectionId?: string }).connectionId || conv.platformInfo?.connectionId || '').trim();

  return normalizeConversationPlatformFields({
    ...conv,
    source: conv.source || inferred,
    platformInfo: {
      ...conv.platformInfo,
      platform: inferred,
      connectionId: connectionId || conv.platformInfo?.connectionId || '',
      platformUserId: conv.platformInfo?.platformUserId ?? '',
      platformUserName: conv.platformInfo?.platformUserName,
      platformUserAvatar: conv.platformInfo?.platformUserAvatar,
    },
  });
}
