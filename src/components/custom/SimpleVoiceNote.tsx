import { useEffect, useState, useRef, useCallback } from 'react';
import { toCloudinaryMp3Url } from '@/lib/utils';
import { api } from '@/api/axios';
import { Play, Pause, Loader2 } from 'lucide-react';

function pickSrc(audioUrl?: string | null, cloudinaryUrl?: string | null): string | null {
  if (audioUrl && audioUrl.startsWith('http')) return audioUrl;
  if (cloudinaryUrl?.startsWith('http')) {
    return toCloudinaryMp3Url(cloudinaryUrl) || cloudinaryUrl;
  }
  return null;
}

async function fetchPlayUrl(messageId: string): Promise<string | null> {
  try {
    const res = await api.get('/api/v1/customer/audio-play-url', {
      params: { chatMessageId: messageId },
    });
    const d = res?.data;
    const url = d?.data?.url ?? d?.url ?? (d?.data && typeof d.data === 'object' ? (d.data as any).url : null);
    if (typeof url !== 'string' || !url.trim()) return null;
    const u = url.trim();
    if (u.startsWith('http')) return u;
    const base = (import.meta.env.VITE_API_BASE_URL as string)?.replace(/\/$/, '') || '';
    if (base && u.startsWith('/')) return `${base}${u}`;
    return u;
  } catch {
    try {
      const res2 = await api.get('/api/v1/chat-inbox/audio-play-url', {
        params: { chatMessageId: messageId },
      });
      const d2 = res2?.data;
      const url2 = d2?.data?.url ?? d2?.url;
      if (typeof url2 === 'string' && url2.startsWith('http')) return url2;
    } catch {
      /* ignore */
    }
    return null;
  }
}

/**
 * WhatsApp voice — visible Play + native audio bar (min width so controls never collapse).
 */
export default function SimpleVoiceNote({
  messageId,
  audioUrl,
  cloudinaryUrl,
}: {
  messageId: string;
  audioUrl?: string | null;
  cloudinaryUrl?: string | null;
}) {
  const [src, setSrc] = useState<string | null>(() => pickSrc(audioUrl, cloudinaryUrl));
  const [loading, setLoading] = useState(!pickSrc(audioUrl, cloudinaryUrl));
  const [failed, setFailed] = useState(false);
  const [playing, setPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    const next = pickSrc(audioUrl, cloudinaryUrl);
    setSrc(next);
    setLoading(!next);
    setFailed(false);
  }, [audioUrl, cloudinaryUrl]);

  const loadUrl = useCallback(async () => {
    if (src?.startsWith('http')) return;
    setLoading(true);
    setFailed(false);
    const u = await fetchPlayUrl(messageId);
    if (u?.startsWith('http')) {
      setSrc(u);
      setFailed(false);
    } else {
      setFailed(true);
    }
    setLoading(false);
  }, [messageId, src]);

  useEffect(() => {
    if (src?.startsWith('http')) return;
    loadUrl();
  }, [messageId, src, loadUrl]);

  const togglePlay = useCallback(() => {
    const el = audioRef.current;
    if (!el?.src) return;
    if (el.paused) {
      void el.play().catch(() => setFailed(true));
    } else {
      el.pause();
    }
  }, []);

  if (loading) {
    return (
      <div className="flex min-w-[220px] items-center gap-2 py-2 text-sm text-foreground">
        <Loader2 className="h-5 w-5 shrink-0 animate-spin text-purple-500" aria-hidden />
        <span>Loading voice…</span>
      </div>
    );
  }

  if (failed || !src?.startsWith('http')) {
    return (
      <div className="min-w-[220px] py-2 text-sm text-amber-600 dark:text-amber-400">
        Voice message unavailable.{' '}
        <button type="button" className="underline font-medium" onClick={() => loadUrl()}>
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="flex w-full min-w-[260px] max-w-full flex-col gap-2 sm:flex-row sm:items-center">
      <button
        type="button"
        onClick={togglePlay}
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-purple-600 text-white shadow-md hover:bg-purple-700 dark:bg-purple-500 dark:hover:bg-purple-600"
        aria-label={playing ? 'Pause' : 'Play voice message'}
      >
        {playing ? <Pause className="h-5 w-5" /> : <Play className="ml-0.5 h-5 w-5" />}
      </button>
      <audio
        ref={audioRef}
        src={src}
        controls
        className="h-11 w-full min-w-[200px] flex-1 rounded-md bg-black/5 dark:bg-white/10"
        preload="metadata"
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => setPlaying(false)}
        onError={() => setFailed(true)}
      />
    </div>
  );
}
