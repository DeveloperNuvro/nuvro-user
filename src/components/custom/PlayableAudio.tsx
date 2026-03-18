import { useState, useEffect, useRef, useMemo } from 'react';
import { api, baseURL, getApiBaseUrl, absolutizeApiUrl } from '@/api/axios';

function hasPlayToken(url: string): boolean {
  return /[?&]playToken=/.test(url);
}

function isUnipileAttachmentPath(url: string): boolean {
  const u = url.trim();
  if (baseURL && u.startsWith(baseURL)) return true;
  return u.includes('/api/v1/unipile/attachments/') || u.includes('/unipile/attachments/');
}

function axiosPathForUrl(url: string): string {
  const u = url.trim();
  if (u.startsWith('http://') || u.startsWith('https://')) {
    const b = (baseURL || getApiBaseUrl()).replace(/\/$/, '');
    if (b && u.startsWith(b)) return u.slice(b.length) || '/';
    return u;
  }
  return u.startsWith('/') ? u : `/${u}`;
}

interface PlayableAudioProps {
  url: string | null;
  fallbackUrls?: (string | null | undefined)[];
  className?: string;
  preload?: 'none' | 'metadata' | 'auto';
  onError?: () => void;
}

/**
 * Unipile / WhatsApp voice: playToken URLs play via <audio src={absolute}> (no auth header).
 * Proxy without playToken: axios + Bearer → blob.
 */
export default function PlayableAudio({
  url,
  fallbackUrls = [],
  className = 'w-full h-10',
  preload = 'metadata',
  onError,
}: PlayableAudioProps) {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [candidateIndex, setCandidateIndex] = useState(0);
  const blobRef = useRef<string | null>(null);
  const revokedRef = useRef(false);

  const candidates = useMemo(() => {
    const list: string[] = [];
    const add = (u: string | null | undefined) => {
      if (!u || typeof u !== 'string') return;
      const t = u.trim();
      if (!t || t.startsWith('att://')) return;
      if (!list.includes(t)) list.push(t);
    };
    add(url);
    fallbackUrls.forEach(add);
    return list;
  }, [url, fallbackUrls]);
  const candidatesRef = useRef(candidates);
  candidatesRef.current = candidates;

  const activeUrl = candidates[candidateIndex] || null;
  const needsBlob =
    !!activeUrl && isUnipileAttachmentPath(activeUrl) && !hasPlayToken(activeUrl);
  const directSrc = activeUrl
    ? needsBlob
      ? blobUrl || null
      : hasPlayToken(activeUrl)
        ? absolutizeApiUrl(activeUrl)
        : activeUrl.startsWith('http')
          ? activeUrl
          : absolutizeApiUrl(activeUrl) || activeUrl
    : null;

  useEffect(() => {
    setCandidateIndex(0);
  }, [url]);

  useEffect(() => {
    if (!activeUrl || !needsBlob) {
      setBlobUrl(null);
      setLoading(false);
      return;
    }
    revokedRef.current = false;
    setLoading(true);
    setBlobUrl(null);
    const controller = new AbortController();
    const path = axiosPathForUrl(activeUrl);

    api
      .get(path, { responseType: 'blob', signal: controller.signal })
      .then((res) => {
        if (revokedRef.current) return;
        const next = URL.createObjectURL(res.data as Blob);
        blobRef.current = next;
        setBlobUrl(next);
        setLoading(false);
      })
      .catch(() => {
        if (revokedRef.current) return;
        setLoading(false);
        setCandidateIndex((i) => {
          const n = candidatesRef.current.length;
          if (i + 1 < n) return i + 1;
          onError?.();
          return i;
        });
      });

    return () => {
      revokedRef.current = true;
      controller.abort();
      if (blobRef.current) {
        URL.revokeObjectURL(blobRef.current);
        blobRef.current = null;
      }
      setBlobUrl(null);
    };
  }, [activeUrl, needsBlob]);

  const handleError = () => {
    if (candidateIndex + 1 < candidates.length) {
      setBlobUrl(null);
      setCandidateIndex((i) => i + 1);
    } else {
      onError?.();
    }
  };

  if (candidates.length === 0) {
    return (
      <div className="text-xs text-muted-foreground py-2 min-h-[40px] flex items-center" role="status">
        Audio unavailable
      </div>
    );
  }

  return (
    <div className="min-h-[40px] flex flex-col gap-1 w-full">
      {loading && needsBlob && <div className="text-xs text-muted-foreground">Loading audio…</div>}
      <audio
        key={`${candidateIndex}-${(directSrc || '').slice(0, 100)}`}
        src={directSrc || undefined}
        controls
        className={className}
        preload={preload}
        onError={handleError}
        style={{ minHeight: 40, display: 'block', width: '100%' }}
      >
        Your browser does not support the audio tag.
      </audio>
    </div>
  );
}
