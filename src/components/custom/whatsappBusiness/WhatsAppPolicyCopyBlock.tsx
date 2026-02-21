/**
 * Fetches and displays WhatsApp policy copy (opt-in + content responsibility) for Integrations / Help.
 * Use in Integrations → WhatsApp tab or Help/Policy page to show Meta policy alignment (for review/appeal).
 */

import { useEffect, useState } from 'react';
import { getWhatsAppPolicyCopy } from '@/api/chatApi';

export interface PolicyCopyData {
  optInShort: string;
  optInFull: string;
  contentShort: string;
  contentFull: string;
  reviewSummary?: string;
}

interface WhatsAppPolicyCopyBlockProps {
  /** Show full text (optInFull, contentFull) or short only (optInShort, contentShort) */
  variant?: 'short' | 'full';
  className?: string;
}

export const WhatsAppPolicyCopyBlock = ({
  variant = 'short',
  className = '',
}: WhatsAppPolicyCopyBlockProps) => {
  const [copy, setCopy] = useState<PolicyCopyData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getWhatsAppPolicyCopy()
      .then(setCopy)
      .catch((e) => setError(e?.message ?? 'Failed to load'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className={`text-sm text-muted-foreground ${className}`}>
        Loading policy information…
      </div>
    );
  }
  if (error) {
    return (
      <div className={`text-sm text-destructive ${className}`}>
        Could not load policy copy: {error}
      </div>
    );
  }
  if (!copy) return null;

  return (
    <div
      className={`rounded-lg border border-border bg-muted/30 p-4 text-sm ${className}`}
    >
      <h3 className="mb-2 font-semibold text-foreground">
        WhatsApp Business – Policy (Meta)
      </h3>
      <div className="space-y-3">
        <div>
          <h4 className="font-medium text-foreground">Opt-in</h4>
          <p className="mt-1 text-muted-foreground">
            {variant === 'full' ? copy.optInFull : copy.optInShort}
          </p>
        </div>
        <div>
          <h4 className="font-medium text-foreground">Content & commerce</h4>
          <p className="mt-1 text-muted-foreground">
            {variant === 'full' ? copy.contentFull : copy.contentShort}
          </p>
        </div>
      </div>
    </div>
  );
};

export default WhatsAppPolicyCopyBlock;
