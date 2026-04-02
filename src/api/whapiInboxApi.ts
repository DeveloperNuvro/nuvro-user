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

export type WhapiMessageLatencyStats = {
  sampleSize: number;
  avgMs: number | null;
  medianMs: number | null;
  p90Ms: number | null;
};

export type WhapiConnectionMessageAnalyticsPayload = {
  connectionId: string;
  connectionName?: string;
  timezone?: string;
  period: { since: string; until: string; days: number };
  totals: {
    all: number;
    customer: number;
    automated: number;
    humanAgent: number;
    workflowTaggedOutbound: number;
    internalNotes: number;
  };
  mix: {
    customerPct: number | null;
    automatedPct: number | null;
    humanAgentPct: number | null;
  };
  activity: {
    distinctConversations: number;
    distinctCustomers: number;
    avgMessagesPerConversation: number | null;
  };
  peakHour: {
    bucketStart: string;
    total: number;
    customer: number;
    automated: number;
    humanAgent: number;
  } | null;
  byWeekday?: Array<{
    dayOfWeek: number;
    label: string;
    total: number;
    customer: number;
    automated: number;
    humanAgent: number;
  }>;
  traffic?: {
    inbound: number;
    outbound: number;
    inboundPct: number | null;
    outboundPct: number | null;
  };
  content?: {
    text: number;
    media: number;
    textPct: number | null;
    mediaPct: number | null;
  };
  slaNoReplyWithinWindow?: {
    slaHours: number;
    sampledCustomerMessages: number;
    breaches: number;
    breachRate: number | null;
  };
  rates: {
    messagesPerHour: number;
    avgSecondsBetweenCustomerMessages: number | null;
    avgSecondsBetweenAutomatedOutbound: number | null;
    avgSecondsBetweenHumanAgentOutbound: number | null;
  };
  firstResponseAfterCustomerMessage: {
    automated: WhapiMessageLatencyStats;
    humanAgent: WhapiMessageLatencyStats;
    workflowOutbound: WhapiMessageLatencyStats;
  };
  hourly: Array<{
    bucketStart: string;
    total: number;
    customer: number;
    automated: number;
    humanAgent: number;
  }>;
  daily: Array<{
    day: string;
    total: number;
    customer: number;
    automated: number;
    humanAgent: number;
  }>;
  messageTypeBreakdown: Record<string, number>;
  dataSource: { collection: string; whapiProviderNote: string };
};

export async function getWhapiConnectionMessageAnalytics(
  connectionId: string,
  days = 30,
  opts?: { timezone?: string; slaHours?: number }
): Promise<WhapiConnectionMessageAnalyticsPayload | null> {
  const safeDays = Math.min(366, Math.max(1, Number(days) || 30));
  const slaH = Number(opts?.slaHours);
  const safeSla = Number.isFinite(slaH) ? Math.min(168, Math.max(1, Math.floor(slaH))) : undefined;
  const res = await api.get(`/api/v1/whapi/connections/${connectionId}/message-analytics`, {
    params: {
      days: safeDays,
      ...(opts?.timezone?.trim() ? { timezone: opts.timezone.trim() } : {}),
      ...(safeSla != null ? { slaHours: safeSla } : {}),
    },
  });
  return (res.data?.data ?? res.data ?? null) as WhapiConnectionMessageAnalyticsPayload | null;
}
