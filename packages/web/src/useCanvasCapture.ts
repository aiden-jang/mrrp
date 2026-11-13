import { useCallback, useEffect, useRef, type RefObject } from "react";

export function useCanvasCapture(
  canvas: RefObject<HTMLCanvasElement>,
  onCapture?: (capture: () => Promise<Blob | null>) => void,
) {
  const ready = useRef(false);
  const alive = useRef(false);
  const waiting = useRef<((blob: Blob | null) => void)[]>([]);
  const flush = useCallback(() => {
    if (!ready.current || !waiting.current.length) return;
    const requests = waiting.current.splice(0);
    const target = canvas.current;
    if (!target) {
      for (const resolve of requests) resolve(null);
      return;
    }
    target.toBlob((blob) => requests.forEach((resolve) => resolve(blob)), "image/png");
  }, [canvas]);

  useEffect(() => {
    const requests = waiting.current;
    alive.current = true;
    onCapture?.(
      () =>
        new Promise((resolve) => {
          if (!alive.current) return resolve(null);
          waiting.current.push(resolve);
          flush();
        }),
    );
    return () => {
      alive.current = false;
      ready.current = false;
      for (const resolve of requests.splice(0)) resolve(null);
    };
  }, [flush, onCapture]);

  const invalidate = useCallback(() => {
    ready.current = false;
  }, []);
  const painted = useCallback(() => {
    ready.current = true;
    flush();
  }, [flush]);
  return { invalidate, painted };
}
