import { useCallback, useEffect, useRef, useState } from 'react';

function extForMime(mime: string): string {
  const m = mime.toLowerCase();
  if (m.includes('mp4') || m.includes('m4a')) return 'm4a';
  if (m.includes('ogg')) return 'ogg';
  if (m.includes('webm')) return 'webm';
  return 'webm';
}

function isAppleTouchDevice(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent;
  if (/iPhone|iPad|iPod/i.test(ua)) return true;
  return navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1;
}

function isDesktopSafari(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent;
  return /Safari/i.test(ua) && !/Chrome|Chromium|Edg|CriOS|FxiOS|OPR|Opera|Brave/i.test(ua);
}

function pickMime(): { mime: string; ext: string } {
  const preferMp4First = isAppleTouchDevice() || isDesktopSafari();
  const list = preferMp4First
    ? [
        'audio/mp4;codecs=mp4a.40.2',
        'audio/mp4',
        'audio/webm;codecs=opus',
        'audio/webm',
        'audio/ogg;codecs=opus',
      ]
    : [
        'audio/webm;codecs=opus',
        'audio/webm',
        'audio/ogg;codecs=opus',
        'audio/mp4;codecs=mp4a.40.2',
        'audio/mp4',
      ];
  if (typeof MediaRecorder === 'undefined') {
    return { mime: '', ext: 'webm' };
  }
  for (const m of list) {
    if (MediaRecorder.isTypeSupported(m)) {
      return {
        mime: m,
        ext: m.includes('mp4') ? 'm4a' : m.includes('ogg') ? 'ogg' : 'webm',
      };
    }
  }
  return { mime: '', ext: 'webm' };
}

/** WebM/Opus: no timeslice → one final blob (best integrity on Chromium). MP4/AAC: periodic chunks for Safari/iOS. */
function recorderStartArgs(mime: string): [] | [number] {
  const m = mime.toLowerCase();
  if (m.includes('webm') || m.includes('ogg')) {
    return [];
  }
  return [200];
}

export function formatVoiceDuration(totalSec: number): string {
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function getAudioContextCtor(): (typeof AudioContext) | null {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as { webkitAudioContext?: typeof AudioContext };
  return window.AudioContext ?? w.webkitAudioContext ?? null;
}

/**
 * Tap mic through AudioContext → MediaStreamDestination so MediaRecorder sees a stable, clocked stream (fewer drops/glitches).
 */
async function buildRecordingStream(
  rawStream: MediaStream
): Promise<{ recordStream: MediaStream; teardown: () => void }> {
  const AC = getAudioContextCtor();
  if (!AC) {
    return {
      recordStream: rawStream,
      teardown: () => {},
    };
  }
  const ctx = new AC({ latencyHint: 'interactive' });
  const source = ctx.createMediaStreamSource(rawStream);
  const gain = ctx.createGain();
  gain.gain.value = 1;
  const dest = ctx.createMediaStreamDestination();
  source.connect(gain);
  gain.connect(dest);
  try {
    await ctx.resume();
  } catch {
    /* still try recording */
  }
  const teardown = () => {
    try {
      source.disconnect();
      gain.disconnect();
      dest.disconnect();
    } catch {
      /* ignore */
    }
    void ctx.close().catch(() => {});
  };
  return { recordStream: dest.stream, teardown };
}

/**
 * Sample-accurate duration when decode succeeds; otherwise HTMLAudioElement metadata + seek.
 */
export async function probeBlobDurationSeconds(blob: Blob): Promise<number | null> {
  try {
    const raw = await blob.arrayBuffer();
    const copy = raw.slice(0);
    const AC = getAudioContextCtor();
    if (AC) {
      const ctx = new AC();
      try {
        const buf = await ctx.decodeAudioData(copy);
        const d = buf.duration;
        await ctx.close();
        if (Number.isFinite(d) && d > 0) {
          return d;
        }
      } catch {
        try {
          await ctx.close();
        } catch {
          /* ignore */
        }
      }
    }
  } catch {
    /* fall through */
  }
  return probeBlobDurationSecondsAudioElement(blob);
}

function probeBlobDurationSecondsAudioElement(blob: Blob): Promise<number | null> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(blob);
    const audio = document.createElement('audio');
    audio.preload = 'metadata';
    let settled = false;
    /** DOM timer id — with @types/node, `setTimeout` is typed as NodeJS.Timeout; use window + number. */
    let failSafe = 0;
    const finish = (sec: number | null) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(failSafe);
      URL.revokeObjectURL(url);
      audio.removeAttribute('src');
      resolve(sec);
    };
    failSafe = window.setTimeout(() => finish(null), 4000) as number;

    const readDuration = (): number | null => {
      const d = audio.duration;
      if (Number.isFinite(d) && d > 0 && d !== Infinity) {
        return d;
      }
      return null;
    };

    audio.onloadedmetadata = () => {
      const direct = readDuration();
      if (direct != null) {
        finish(direct);
        return;
      }
      const onSeeked = () => {
        audio.removeEventListener('seeked', onSeeked);
        finish(readDuration());
      };
      audio.addEventListener('seeked', onSeeked);
      try {
        audio.currentTime = Number.MAX_SAFE_INTEGER;
      } catch {
        finish(null);
      }
    };
    audio.onerror = () => finish(null);
    audio.src = url;
  });
}

/**
 * Prefer sample-accurate decode; fall back to wall-clock active time if decode fails (rare containers).
 */
export async function resolveVoiceAttachmentDurationSeconds(
  file: File,
  activeDurationSec: number
): Promise<number> {
  const decoded = await probeBlobDurationSeconds(file);
  if (decoded != null && Number.isFinite(decoded) && decoded >= 0.08) {
    return Math.max(0, Math.round(decoded));
  }
  return Math.max(0, Math.round(activeDurationSec));
}

export type VoiceRecordingStopResult = { file: File | null; activeDurationSec: number };

/** True when `MediaRecorder.pause()` / `resume()` are available (Chrome, Firefox, Safari 14.3+). */
export const MEDIA_RECORDER_PAUSE_SUPPORTED =
  typeof MediaRecorder !== 'undefined' && typeof MediaRecorder.prototype.pause === 'function';

function createMediaRecorder(stream: MediaStream, mime: string): MediaRecorder {
  const tryOptions = (opts: MediaRecorderOptions): MediaRecorder | null => {
    try {
      return new MediaRecorder(stream, opts);
    } catch {
      return null;
    }
  };
  if (mime) {
    const withBitrate = tryOptions({ mimeType: mime, audioBitsPerSecond: 192000 });
    if (withBitrate) return withBitrate;
    const basic = tryOptions({ mimeType: mime });
    if (basic) return basic;
  }
  const fallbackBitrate = tryOptions({ audioBitsPerSecond: 192000 });
  if (fallbackBitrate) return fallbackBitrate;
  return new MediaRecorder(stream);
}

/**
 * Mic → (optional) AudioContext tap → MediaRecorder. Pause-aware wall clock; platform-tuned codec and timeslice.
 */
export function useVoiceRecorder() {
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const durationRafRef = useRef<number | null>(null);
  const cancelledRef = useRef(false);
  const stopResolverRef = useRef<((result: VoiceRecordingStopResult) => void) | null>(null);
  const chosenExtRef = useRef('webm');
  const accumulatedActiveMsRef = useRef(0);
  const segmentStartMsRef = useRef(0);
  const activeSecAtStopRequestRef = useRef(0);
  const lastRenderedSecRef = useRef(-1);
  const graphTeardownRef = useRef<(() => void) | null>(null);

  const runGraphTeardown = () => {
    try {
      graphTeardownRef.current?.();
    } catch {
      /* ignore */
    }
    graphTeardownRef.current = null;
  };

  const cancelDurationLoop = () => {
    if (durationRafRef.current != null) {
      cancelAnimationFrame(durationRafRef.current);
      durationRafRef.current = null;
    }
  };

  const runDurationLoop = () => {
    cancelDurationLoop();
    lastRenderedSecRef.current = -1;
    const tick = () => {
      const r = recorderRef.current;
      if (!r || cancelledRef.current) {
        durationRafRef.current = null;
        return;
      }
      if (r.state !== 'recording' && r.state !== 'paused') {
        durationRafRef.current = null;
        return;
      }
      const now = performance.now();
      let activeMs = accumulatedActiveMsRef.current;
      if (r.state === 'recording') {
        activeMs += now - segmentStartMsRef.current;
      }
      const secs = Math.floor(activeMs / 1000);
      if (secs !== lastRenderedSecRef.current) {
        lastRenderedSecRef.current = secs;
        setRecordingSeconds(secs);
      }
      durationRafRef.current = requestAnimationFrame(tick);
    };
    durationRafRef.current = requestAnimationFrame(tick);
  };

  const stopTracks = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  };

  useEffect(() => {
    return () => {
      cancelledRef.current = true;
      stopResolverRef.current = null;
      const r = recorderRef.current;
      if (r && (r.state === 'recording' || r.state === 'paused')) {
        try {
          r.stop();
        } catch {
          /* ignore */
        }
      }
      cancelDurationLoop();
      runGraphTeardown();
      stopTracks();
      recorderRef.current = null;
      chunksRef.current = [];
    };
  }, []);

  const cancelRecording = useCallback(() => {
    cancelledRef.current = true;
    const r = recorderRef.current;
    if (r && (r.state === 'recording' || r.state === 'paused')) {
      r.stop();
    } else {
      cancelDurationLoop();
      runGraphTeardown();
      stopTracks();
      recorderRef.current = null;
      chunksRef.current = [];
      setIsRecording(false);
      setIsPaused(false);
      setRecordingSeconds(0);
      accumulatedActiveMsRef.current = 0;
    }
  }, []);

  const pauseRecording = useCallback(() => {
    const r = recorderRef.current;
    if (!MEDIA_RECORDER_PAUSE_SUPPORTED || !r || r.state !== 'recording') return;
    try {
      accumulatedActiveMsRef.current += performance.now() - segmentStartMsRef.current;
      r.pause();
      setIsPaused(true);
    } catch {
      /* ignore */
    }
  }, []);

  const resumeRecording = useCallback(() => {
    const r = recorderRef.current;
    if (!r || r.state !== 'paused') return;
    try {
      segmentStartMsRef.current = performance.now();
      r.resume();
      setIsPaused(false);
    } catch {
      /* ignore */
    }
  }, []);

  const startRecording = useCallback(async () => {
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      throw new Error('VOICE_NOT_SUPPORTED');
    }
    if (recorderRef.current?.state === 'recording' || recorderRef.current?.state === 'paused') return;

    const { mime, ext } = pickMime();
    chosenExtRef.current = ext;

    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: { ideal: true },
        noiseSuppression: { ideal: true },
        autoGainControl: { ideal: true },
        channelCount: { ideal: 1 },
        sampleRate: { ideal: 48000 },
      },
    });

    cancelledRef.current = false;
    chunksRef.current = [];
    streamRef.current = stream;
    accumulatedActiveMsRef.current = 0;
    runGraphTeardown();

    let recordStream: MediaStream = stream;
    try {
      const built = await buildRecordingStream(stream);
      graphTeardownRef.current = built.teardown;
      recordStream = built.recordStream;
    } catch {
      graphTeardownRef.current = null;
      recordStream = stream;
    }

    const rec = createMediaRecorder(recordStream, mime);
    recorderRef.current = rec;

    rec.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };

    rec.onstop = () => {
      const wasCancelled = cancelledRef.current;
      cancelledRef.current = false;
      const parts = chunksRef.current;
      chunksRef.current = [];
      const outMime = rec.mimeType || mime || 'audio/webm';
      cancelDurationLoop();
      runGraphTeardown();
      stopTracks();
      recorderRef.current = null;
      setIsRecording(false);
      setIsPaused(false);
      setRecordingSeconds(0);
      accumulatedActiveMsRef.current = 0;

      const resolve = stopResolverRef.current;
      stopResolverRef.current = null;
      const activeSec = wasCancelled ? 0 : activeSecAtStopRequestRef.current;
      activeSecAtStopRequestRef.current = 0;

      if (wasCancelled) {
        resolve?.({ file: null, activeDurationSec: 0 });
        return;
      }
      const blob = new Blob(parts, { type: outMime });
      if (blob.size < 80) {
        resolve?.({ file: null, activeDurationSec: activeSec });
        return;
      }
      const extOut = extForMime(outMime) || chosenExtRef.current;
      const file = new File([blob], `voice-${Date.now()}.${extOut}`, { type: outMime });
      resolve?.({ file, activeDurationSec: activeSec });
    };

    await new Promise<void>((resolve) => {
      requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
    });

    const startArgs = recorderStartArgs(mime);
    if (startArgs.length === 0) {
      rec.start();
    } else {
      rec.start(startArgs[0]);
    }

    segmentStartMsRef.current = performance.now();
    setIsPaused(false);
    setIsRecording(true);
    setRecordingSeconds(0);
    runDurationLoop();
  }, []);

  const stopRecording = useCallback((): Promise<VoiceRecordingStopResult> => {
    return new Promise((resolve) => {
      const r = recorderRef.current;
      if (!r || (r.state !== 'recording' && r.state !== 'paused')) {
        resolve({ file: null, activeDurationSec: 0 });
        return;
      }
      let activeMs = accumulatedActiveMsRef.current;
      if (r.state === 'recording') {
        activeMs += performance.now() - segmentStartMsRef.current;
      }
      const activeDurationSec = Math.max(0, activeMs / 1000);
      activeSecAtStopRequestRef.current = activeDurationSec;

      cancelledRef.current = false;
      stopResolverRef.current = resolve;
      try {
        r.stop();
      } catch {
        stopResolverRef.current = null;
        resolve({ file: null, activeDurationSec: 0 });
      }
    });
  }, []);

  return {
    isRecording,
    isPaused,
    recordingSeconds,
    supportsPause: MEDIA_RECORDER_PAUSE_SUPPORTED,
    startRecording,
    stopRecording,
    cancelRecording,
    pauseRecording,
    resumeRecording,
  };
}
