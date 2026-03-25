import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { Reply } from 'lucide-react';

type Props = {
  metadata?: Record<string, unknown> | null;
  /** WhatsApp-style tint for the quote bar */
  variant?: 'whatsapp' | 'default';
  className?: string;
};

export default function MessageQuotedPreview({ metadata, variant = 'default', className }: Props) {
  const { t } = useTranslation();
  const m = metadata || {};
  const quotedId =
    (typeof m.quotedWhapiMessageId === 'string' && m.quotedWhapiMessageId.trim()) ||
    (typeof m.quotedMessageId === 'string' && m.quotedMessageId.trim()) ||
    '';
  const preview =
    (typeof m.quotedPreviewText === 'string' && m.quotedPreviewText.trim()) ||
    (typeof m.quotedBody === 'string' && m.quotedBody.trim()) ||
    '';

  if (!quotedId && !preview) return null;

  const borderClass =
    variant === 'whatsapp'
      ? 'border-l-[#25D366]/80 bg-[#25D366]/[0.08] dark:bg-[#25D366]/[0.12]'
      : 'border-l-primary/60 bg-muted/50';

  return (
    <div
      className={cn(
        'mb-1 max-w-[min(100%,20rem)] rounded-md border-l-[3px] px-2 py-1.5 text-left shadow-sm',
        borderClass,
        className
      )}
    >
      <div className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
        <Reply className="h-3 w-3 shrink-0 opacity-80" />
        {t('chatInbox.quotedReplyLabel')}
      </div>
      <p className="mt-0.5 line-clamp-3 break-words text-xs text-foreground/90">
        {preview || t('chatInbox.quotedReplyNoPreview')}
      </p>
    </div>
  );
}
