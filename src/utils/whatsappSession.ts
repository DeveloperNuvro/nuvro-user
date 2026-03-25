/**
 * Meta WhatsApp Cloud API uses 24h window + templates + opt-in in our UI.
 * Linked-device providers (Unipile, Whapi) should not show that Meta-only UI.
 */
export type WhatsAppSessionSource = 'meta' | 'unipile' | 'whapi';

export function isMetaWhatsAppCloudApiSession(source: WhatsAppSessionSource | undefined | null): boolean {
  return source === 'meta';
}
