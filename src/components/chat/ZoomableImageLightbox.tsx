import { useCallback, useEffect, useRef, useState } from 'react';
import { ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const MIN_SCALE = 1;
const MAX_SCALE = 5;
const clampScale = (s: number) => Math.min(Math.max(s, MIN_SCALE), MAX_SCALE);

type Props = {
  children: React.ReactNode;
  className?: string;
  hint?: string;
};

/**
 * Image viewer: toolbar in-flow above image, wheel / pinch zoom, drag when zoomed.
 * Dialog parent should use `!flex flex-col` so layout and wheel target work reliably.
 */
export function ZoomableImageLightbox({ children, className, hint }: Props) {
  const [scale, setScale] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const scaleRef = useRef(1);
  scaleRef.current = scale;

  const dragging = useRef(false);
  const lastPointer = useRef({ x: 0, y: 0 });
  const pinchRef = useRef<{ dist: number; baseScale: number } | null>(null);

  const viewportRef = useRef<HTMLDivElement>(null);
  const transformRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scale <= MIN_SCALE) {
      setPan({ x: 0, y: 0 });
    }
  }, [scale]);

  const applyWheelZoom = useCallback((e: globalThis.WheelEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // Trackpads often use small deltas; mouse wheel uses larger steps
    const dy = e.deltaY;
    const factor = dy < 0 ? 1.0 + Math.min(0.15, Math.abs(dy) * 0.002) : 1.0 / (1.0 + Math.min(0.15, Math.abs(dy) * 0.002));
    setScale((s) => clampScale(s * factor));
  }, []);

  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    el.addEventListener('wheel', applyWheelZoom, { passive: false, capture: true });
    return () => el.removeEventListener('wheel', applyWheelZoom, true);
  }, [applyWheelZoom]);

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    if (scaleRef.current <= MIN_SCALE) return;
    if (e.button !== 0) return;
    dragging.current = true;
    lastPointer.current = { x: e.clientX, y: e.clientY };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  }, []);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragging.current) return;
    const dx = e.clientX - lastPointer.current.x;
    const dy = e.clientY - lastPointer.current.y;
    lastPointer.current = { x: e.clientX, y: e.clientY };
    setPan((p) => ({ x: p.x + dx, y: p.y + dy }));
  }, []);

  const endDrag = useCallback(() => {
    dragging.current = false;
  }, []);

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      const a = e.touches[0];
      const b = e.touches[1];
      const dist = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
      pinchRef.current = { dist, baseScale: scaleRef.current };
    }
  }, []);

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2 && pinchRef.current) {
      e.preventDefault();
      const a = e.touches[0];
      const b = e.touches[1];
      const dist = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
      const ratio = dist / pinchRef.current.dist;
      setScale(clampScale(pinchRef.current.baseScale * ratio));
    }
  }, []);

  const onTouchEnd = useCallback((e: React.TouchEvent) => {
    if (e.touches.length < 2) pinchRef.current = null;
  }, []);

  const reset = useCallback(() => {
    setScale(1);
    setPan({ x: 0, y: 0 });
  }, []);

  const zoomIn = useCallback(() => setScale((s) => clampScale(s * 1.35)), []);
  const zoomOut = useCallback(() => setScale((s) => clampScale(s / 1.35)), []);

  return (
    <div
      className={cn(
        'flex min-h-0 w-full flex-1 flex-col items-stretch overflow-hidden',
        className
      )}
    >
      {/* In-flow toolbar so controls stay above the image (not detached in dialog corner) */}
      <div className="z-[60] flex shrink-0 items-center justify-center gap-1.5 border-b border-white/10 bg-black/80 px-2 py-2 sm:gap-2 sm:px-3">
        <Button
          type="button"
          size="icon"
          variant="secondary"
          className="h-9 w-9 bg-zinc-800 text-white hover:bg-zinc-700"
          onClick={(e) => {
            e.stopPropagation();
            zoomOut();
          }}
          aria-label="Zoom out"
        >
          <ZoomOut className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          size="icon"
          variant="secondary"
          className="h-9 w-9 bg-zinc-800 text-white hover:bg-zinc-700"
          onClick={(e) => {
            e.stopPropagation();
            zoomIn();
          }}
          aria-label="Zoom in"
        >
          <ZoomIn className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          size="icon"
          variant="secondary"
          className="h-9 w-9 bg-zinc-800 text-white hover:bg-zinc-700"
          onClick={(e) => {
            e.stopPropagation();
            reset();
          }}
          aria-label="Reset zoom"
        >
          <RotateCcw className="h-4 w-4" />
        </Button>
        <span className="ml-1 min-w-[3rem] text-center text-xs tabular-nums text-white/80">
          {Math.round(scale * 100)}%
        </span>
      </div>

      <div
        ref={viewportRef}
        className={cn(
          'relative min-h-0 min-w-0 w-full flex-1 overflow-hidden bg-black/40 select-none',
          'min-h-[min(55vh,420px)]',
          scale > MIN_SCALE ? 'cursor-grab active:cursor-grabbing' : 'cursor-zoom-in'
        )}
        style={{ touchAction: 'none' }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        role="presentation"
      >
        <div
          ref={transformRef}
          className="flex h-full min-h-0 w-full min-w-0 items-center justify-center p-2 sm:p-4"
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${scale})`,
            transformOrigin: 'center center',
            willChange: 'transform',
          }}
        >
          {/* Grid + place-items-center: wide/tall images both shrink to fit (no vw caps — those clipped the right side). */}
          <div className="grid h-full w-full min-w-0 place-items-center [&_img]:box-border [&_img]:max-h-full [&_img]:max-w-full [&_img]:object-contain [&_img]:object-center [&_img]:pointer-events-none">
            {children}
          </div>
        </div>
      </div>

      {hint ? (
        <p className="shrink-0 border-t border-white/5 px-3 py-2 text-center text-[11px] text-white/60 sm:text-xs">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
