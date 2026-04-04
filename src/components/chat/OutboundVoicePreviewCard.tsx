import { useCallback, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Mic, Pause, Play } from 'lucide-react';
import { cn } from '@/lib/utils';

export type OutboundVoicePreviewCardProps = {
  src: string;
  /** Pre-formatted duration, e.g. "0:08" */
  durationHint?: string | null;
  /** Kept for screen readers only; not shown in the UI */
  fileName?: string;
  className?: string;
};

/**
 * Polished outbound voice preview after recording — matches chat bubble styling (purple play, dark-friendly native bar).
 */
export function OutboundVoicePreviewCard({
  src,
  durationHint,
  fileName,
  className,
}: OutboundVoicePreviewCardProps) {
  const { t } = useTranslation();
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);

  const togglePlay = useCallback(() => {
    const el = audioRef.current;
    if (!el?.src) return;
    if (el.paused) void el.play().catch(() => {});
    else el.pause();
  }, []);

  return (
    <div
      className={cn(
        'w-full max-w-[min(100%,340px)] overflow-hidden rounded-2xl border border-purple-200/55 bg-gradient-to-br from-purple-50/95 via-background to-violet-50/60 shadow-md ring-1 ring-purple-500/[0.12] dark:border-purple-800/50 dark:from-purple-950/40 dark:via-card dark:to-violet-950/30 dark:ring-purple-400/10',
        '[color-scheme:dark]',
        className
      )}
    >
      {fileName ? <span className="sr-only">{fileName}</span> : null}
      <div className="flex items-center justify-between gap-2 border-b border-purple-200/35 px-3 py-2.5 dark:border-purple-800/35">
        <div className="flex min-w-0 flex-1 items-center gap-2.5">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-purple-600 text-white shadow-md dark:bg-purple-500">
            <Mic className="h-4 w-4" aria-hidden />
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-foreground">
              {t('chatInbox.voicePreviewTitle', 'Voice message')}
            </p>
            <p className="truncate text-xs text-muted-foreground">
              {t('chatInbox.voicePreviewHint', 'Preview before sending')}
            </p>
          </div>
        </div>
        {durationHint ? (
          <span className="shrink-0 rounded-full bg-purple-600/14 px-2.5 py-1 text-xs font-semibold tabular-nums text-purple-800 dark:bg-purple-400/15 dark:text-purple-100">
            {durationHint}
          </span>
        ) : null}
      </div>
      <div className="flex items-center gap-3 p-3 sm:p-4">
        <button
          type="button"
          onClick={togglePlay}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-purple-600 text-white shadow-md hover:bg-purple-700 dark:bg-purple-500 dark:hover:bg-purple-600"
          aria-label={playing ? t('chatInbox.voicePreviewPause', 'Pause preview') : t('chatInbox.voicePreviewPlay', 'Play preview')}
        >
          {playing ? <Pause className="h-5 w-5" aria-hidden /> : <Play className="ml-0.5 h-5 w-5" aria-hidden />}
        </button>
        <audio
          ref={audioRef}
          src={src}
          controls
          preload="metadata"
          className="h-11 min-w-0 flex-1 rounded-md bg-black/5 dark:bg-white/10"
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
          onEnded={() => setPlaying(false)}
        />
      </div>
    </div>
  );
}
