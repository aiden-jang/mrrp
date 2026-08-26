export const CONSTELLATION_KEYS = ["window", "frame", "shelf", "door", "plant", "bed"] as const;
export type ConstellationKey = (typeof CONSTELLATION_KEYS)[number];

export interface ConstellationProgress {
  found: ConstellationKey[];
  complete: boolean;
}

interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

const storageKey = (roomKey: string) => `mrrp:constellation:${roomKey}`;

function validKeys(value: unknown): ConstellationKey[] {
  if (!Array.isArray(value)) return [];
  const allowed = new Set<string>(CONSTELLATION_KEYS);
  return [
    ...new Set(
      value.filter((item): item is ConstellationKey => typeof item === "string" && allowed.has(item)),
    ),
  ];
}

/** Local-only progress: a room keeps its discoveries without adding identity or server state. */
export function constellationProgress(
  roomKey: string,
  storage: StorageLike = localStorage,
): ConstellationProgress {
  try {
    const parsed = JSON.parse(storage.getItem(storageKey(roomKey)) ?? "null") as { found?: unknown } | null;
    const found = validKeys(parsed?.found);
    return { found, complete: found.length === CONSTELLATION_KEYS.length };
  } catch {
    return { found: [], complete: false };
  }
}

export function collectConstellationStar(
  roomKey: string,
  detail: ConstellationKey,
  storage: StorageLike = localStorage,
): ConstellationProgress & { discovered: boolean; justCompleted: boolean } {
  const before = constellationProgress(roomKey, storage);
  if (before.found.includes(detail)) {
    return { ...before, discovered: false, justCompleted: false };
  }
  const found = [...before.found, detail];
  const complete = found.length === CONSTELLATION_KEYS.length;
  try {
    storage.setItem(storageKey(roomKey), JSON.stringify({ version: 1, found }));
  } catch {
    // Private browsing and full storage should not break an otherwise ephemeral room interaction.
  }
  return { found, complete, discovered: true, justCompleted: complete && !before.complete };
}
