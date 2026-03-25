/** Avoid showing raw Mongo ObjectId in the UI badge. */
function looksLikeMongoObjectId(s: string): boolean {
  return /^[a-f0-9]{24}$/i.test(s.trim());
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
