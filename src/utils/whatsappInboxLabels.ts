/** Avoid showing raw Mongo ObjectId in the UI badge. */
function looksLikeMongoObjectId(s: string): boolean {
  return /^[a-f0-9]{24}$/i.test(s.trim());
}

export type WhatsappConnectionInboxInfo = {
  id?: string | null;
  displayName?: string | null;
  provider?: string | null;
};

/** True when inbox should show Whapi-only tools (presence, reply-by-Whapi-id, reactions). */
export function isWhapiLinkedWhatsApp(conn?: WhatsappConnectionInboxInfo | null): boolean {
  return String(conn?.provider ?? '').toLowerCase() === 'whapi' && !!String(conn?.id ?? '').trim();
}

/** External WhatsApp message id for quote / reactions (Whapi stores id in metadata like Unipile). */
export function whapiQuoteMessageIdFromMessage(msg: { metadata?: Record<string, unknown> } | null | undefined): string | null {
  const m = msg?.metadata;
  if (!m) return null;
  for (const k of ['unipileMessageId', 'whapiMessageId', 'whatsappMessageId'] as const) {
    const v = m[k];
    if (typeof v === 'string' && v.trim()) return v.trim();
  }
  return null;
}

/**
 * Label for WhatsApp row badge: prefer API connection name, avoid duplicate "WhatsApp" and raw _id.
 */
export function whatsappConnectionBadgeLabel(
  conn?: { displayName?: string | null; id?: string | null } | null
): string | undefined {
  if (!conn) return undefined;
  const dn = String(conn.displayName ?? '').trim();
  const id = String(conn.id ?? '').trim();
  if (dn && dn.toLowerCase() !== 'whatsapp') return dn;
  // Never use Mongo _id as the visible label (e.g. 6961fc99…); fall back to generic badge text.
  if (id && !looksLikeMongoObjectId(id)) return id;
  return undefined;
}
