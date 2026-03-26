import { api } from './axios';

export type WhapiGateHealth = { ok?: boolean; [key: string]: unknown };
export type WhapiWorkflowVariantAnalyticsRow = {
  variantId: string;
  variantKind: string;
  sentCount: number;
  uniqueConversations: number;
  repliedConversations: number;
  replyRate: number;
};

export async function getWhapiGateHealth(connectionId: string): Promise<WhapiGateHealth | null> {
  const res = await api.get(`/api/v1/whapi/connections/${connectionId}/gate-health`);
  return res.data?.data ?? res.data ?? null;
}

export async function getWhapiInboxCapabilities(connectionId: string): Promise<Record<string, unknown> | null> {
  const res = await api.get(`/api/v1/whapi/connections/${connectionId}/inbox-capabilities`);
  return res.data?.data ?? res.data ?? null;
}

export async function getWhapiWorkflowVariantAnalytics(
  connectionId: string,
  days = 14
): Promise<{
  connectionId?: string;
  days?: number;
  since?: string;
  variants?: WhapiWorkflowVariantAnalyticsRow[];
} | null> {
  const safeDays = Math.min(90, Math.max(1, Number(days) || 14));
  const res = await api.get(`/api/v1/whapi/connections/${connectionId}/workflow-variant-analytics`, {
    params: { days: safeDays },
  });
  return res.data?.data ?? res.data ?? null;
}

export async function putWhapiMyPresence(
  connectionId: string,
  presence: 'available' | 'unavailable' | 'offline' | 'online'
): Promise<unknown> {
  const body =
    presence === 'online'
      ? { presence: 'available' }
      : presence === 'offline'
        ? { presence: 'offline' }
        : { presence };
  const res = await api.put(`/api/v1/whapi/connections/${connectionId}/presences/me`, body);
  return res.data?.data ?? res.data;
}

export async function getWhapiContactPresence(
  connectionId: string,
  params: { phone?: string; chatId?: string }
): Promise<{ entryId?: string; presence?: unknown } | null> {
  const res = await api.get(`/api/v1/whapi/connections/${connectionId}/contact-presence`, {
    params: {
      ...(params.phone ? { phone: params.phone } : {}),
      ...(params.chatId ? { chatId: params.chatId } : {}),
    },
  });
  return res.data?.data ?? res.data ?? null;
}

export async function putWhapiMessageReaction(
  connectionId: string,
  messageId: string,
  emoji: string
): Promise<unknown> {
  const res = await api.put(`/api/v1/whapi/connections/${connectionId}/messages/${encodeURIComponent(messageId)}/reaction`, {
    emoji,
  });
  return res.data?.data ?? res.data;
}

export async function putWhapiMessageRead(connectionId: string, messageId: string): Promise<unknown> {
  const res = await api.put(`/api/v1/whapi/connections/${connectionId}/messages/${encodeURIComponent(messageId)}/read`, {});
  return res.data?.data ?? res.data;
}
