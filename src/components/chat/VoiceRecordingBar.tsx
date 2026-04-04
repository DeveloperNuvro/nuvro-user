import { Mic, Pause, Play, Check, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { formatVoiceDuration } from '@/hooks/useVoiceRecorder';

type VoiceRecordingBarProps = {
  recordingSeconds: number;
  isPaused: boolean;
  supportsPause: boolean;
  /** WhatsApp-style green accent when true */
  variant?: 'default' | 'whatsapp';
  onPause: () => void;
  onResume: () => void;
  onCancel: () => void;
  onDone: () => void | Promise<void>;
};

function WaveBars({ active, accentClass }: { active: boolean; accentClass: string }) {
  const heights = [32, 52, 72, 48, 64, 40, 56];
  return (
    <div
      className="flex h-10 sm:h-11 w-full max-w-[200px] sm:max-w-[240px] items-end justify-center gap-[3px] sm:gap-1 px-1"
      aria-hidden
    >
      {heights.map((pct, i) => (
        <span
          key={i}
          className={cn(
            'w-[3px] sm:w-1 rounded-full transition-all duration-300',
            accentClass,
            active && 'voice-rec-wave__bar',
            active ? 'opacity-95' : 'opacity-30'
          )}
          style={{
            height: active ? `${pct}%` : '18%',
            animationDelay: active ? `${i * 0.08}s` : undefined,
          }}
        />
      ))}
    </div>
  );
}

export function VoiceRecordingBar({
  recordingSeconds,
  isPaused,
  supportsPause,
  variant = 'default',
  onPause,
  onResume,
  onCancel,
  onDone,
}: VoiceRecordingBarProps) {
  const { t } = useTranslation();
  const isWa = variant === 'whatsapp';
  const live = !isPaused;

  return (
    <div
      className={cn(
        'mb-3 w-full overflow-hidden rounded-2xl border shadow-sm backdrop-blur-sm transition-shadow',
        isWa
          ? 'border-emerald-500/25 bg-gradient-to-br from-emerald-500/[0.09] via-background/90 to-teal-600/[0.06] dark:from-emerald-500/15 dark:via-card/90 dark:to-teal-500/10'
          : 'border-border/80 bg-gradient-to-br from-muted/80 via-background/95 to-muted/50 dark:from-muted/40 dark:via-card/95 dark:to-muted/30'
      )}
      role="status"
      aria-live="polite"
      aria-label={t('chatInbox.voiceAriaLabel', 'Voice message recording')}
    >
      <div className="flex flex-col gap-3 p-3 sm:p-4 sm:flex-row sm:items-center sm:gap-4">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <div
            className={cn(
              'relative flex h-12 w-12 shrink-0 items-center justify-center rounded-full border-2 shadow-inner sm:h-14 sm:w-14',
              isWa
                ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                : 'border-primary/25 bg-primary/5 text-primary',
              live && 'ring-2 ring-offset-2 ring-offset-background',
              live && (isWa ? 'ring-emerald-500/50 animate-pulse' : 'ring-primary/40')
            )}
          >
            <Mic className="h-5 w-5 sm:h-6 sm:w-6" strokeWidth={2} />
          </div>

          <div className="min-w-0 flex-1 space-y-1">
            <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
              <span
                className={cn(
                  'font-mono text-2xl font-semibold tabular-nums tracking-tight sm:text-3xl',
                  isWa ? 'text-emerald-700 dark:text-emerald-300' : 'text-foreground'
                )}
              >
                {formatVoiceDuration(recordingSeconds)}
              </span>
              <span
                className={cn(
                  'inline-flex items-center gap-1.5 text-xs font-medium sm:text-sm',
                  live ? 'text-red-600 dark:text-red-400' : 'text-amber-600 dark:text-amber-400'
                )}
              >
                <span
                  className={cn(
                    'h-2 w-2 rounded-full',
                    live ? 'animate-pulse bg-red-500' : 'bg-amber-500'
                  )}
                />
                {live
                  ? t('chatInbox.voiceRecording', 'Recording')
                  : t('chatInbox.voicePaused', 'Paused')}
              </span>
            </div>
            <p className="text-xs leading-snug text-muted-foreground sm:text-sm">
              {t(
                'chatInbox.voiceRecordingHint',
                'Speak clearly. Tap Done to preview and send, or Cancel to discard.'
              )}
            </p>
            <div className="pt-1 sm:hidden">
              <WaveBars active={live} accentClass={isWa ? 'bg-emerald-500' : 'bg-primary'} />
            </div>
          </div>
        </div>

        <div className="hidden sm:block shrink-0">
          <WaveBars active={live} accentClass={isWa ? 'bg-emerald-500' : 'bg-primary'} />
        </div>

        <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:justify-end sm:gap-2">
          {supportsPause && (
            <Button
              type="button"
              variant="outline"
              size="default"
              className={cn(
                'min-h-11 touch-manipulation active:scale-[0.98] sm:min-h-10',
                isWa && 'border-emerald-500/30 hover:bg-emerald-500/10'
              )}
              onClick={live ? onPause : onResume}
              title={live ? t('chatInbox.voicePause', 'Pause') : t('chatInbox.voiceResume', 'Resume')}
            >
              {live ? (
                <>
                  <Pause className="mr-2 h-4 w-4 shrink-0" />
                  {t('chatInbox.voicePause', 'Pause')}
                </>
              ) : (
                <>
                  <Play className="mr-2 h-4 w-4 shrink-0" />
                  {t('chatInbox.voiceResume', 'Resume')}
                </>
              )}
            </Button>
          )}
          <Button
            type="button"
            variant="outline"
            size="default"
            className="min-h-11 touch-manipulation active:scale-[0.98] sm:min-h-10"
            onClick={onCancel}
          >
            <X className="mr-2 h-4 w-4 shrink-0" />
            {t('chatInbox.voiceCancel', 'Cancel')}
          </Button>
          <Button
            type="button"
            size="default"
            className={cn(
              'min-h-11 touch-manipulation active:scale-[0.98] sm:min-h-10',
              supportsPause ? 'col-span-2 sm:col-span-1' : 'col-span-1',
              isWa
                ? 'bg-[#25D366] text-white hover:bg-[#20bd5a] border-0'
                : 'bg-primary text-primary-foreground hover:bg-primary/90'
            )}
            onClick={() => void onDone()}
          >
            <Check className="mr-2 h-4 w-4 shrink-0" />
            {t('chatInbox.voiceDone', 'Done')}
          </Button>
        </div>
      </div>
    </div>
  );
}
