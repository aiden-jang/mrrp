import { useCallback, useEffect, useRef, useState } from "react";
import { fetchKeepsakes } from "./keepsakesApi.js";
import type { KeepsakePage } from "./types.js";

export function useKeepsakes(id: string | null, stamp: number | undefined) {
  const [open, setOpen] = useState(false);
  const [page, setPage] = useState<KeepsakePage | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const generation = useRef(0);
  const shown = useRef(false);
  const pending = useRef(false);
  const failedBefore = useRef<string | undefined>();
  const load = useCallback(
    async (before?: string) => {
      if (!id) return;
      const request = ++generation.current;
      pending.current = true;
      setLoading(true);
      setError(null);
      try {
        const next = await fetchKeepsakes(id, before);
        if (shown.current && request === generation.current)
          setPage((current) =>
            before && current ? { items: [...current.items, ...next.items], next: next.next } : next,
          );
      } catch {
        if (shown.current && request === generation.current) {
          failedBefore.current = before;
          setError("Couldn’t open the kept gifts. Try again.");
        }
      } finally {
        if (shown.current && request === generation.current) {
          pending.current = false;
          setLoading(false);
        }
      }
    },
    [id],
  );
  useEffect(() => {
    shown.current = open;
    if (open) void load();
    return () => {
      shown.current = false;
      generation.current += 1;
    };
  }, [open, stamp, load]);
  return {
    open,
    page,
    loading,
    error,
    show: () => {
      if (open) return;
      setPage(null);
      setError(null);
      setOpen(true);
    },
    close: () => setOpen(false),
    retry: () => {
      if (!pending.current) void load(failedBefore.current);
    },
    earlier: () => {
      if (!pending.current && page?.next) void load(page.next);
    },
  };
}
