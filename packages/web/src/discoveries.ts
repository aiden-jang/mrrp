/* Fired from the animation loop: must never send twice, or holding a piano key posts a request per
 * frame. Failures are swallowed, since nobody can act on "could not record that you found the mouse". */

/** Mirrors the worker's allowlist, which is the one that actually decides. An array, not just a union,
 *  so the keys exist at runtime. */
export const DISCOVERY_KEYS = [
  "constellation",
  "roomTour",
  "piano",
  "bubbles",
  "aurora",
  "mrrp",
  "summon",
  "herName",
  "box",
  "yarn",
  "treat",
  "catnip",
  "music",
  "mouse",
] as const;

export type DiscoveryKey = (typeof DISCOVERY_KEYS)[number];

const STORAGE_KEY = "mrrp:found";

/**
 * Reported keys, remembered per device rather than asked of the server.
 *
 * A round trip to find out whether to make a round trip is worse than the duplicate it prevents, and
 * the DO already treats a repeat as fine. This is only here to keep the canvas from shouting.
 */
function alreadySent(): Set<string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return new Set(Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === "string") : []);
  } catch {
    // Private mode, or somebody put junk in the key. Re-reporting is harmless.
    return new Set();
  }
}

function remember(sent: Set<string>): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...sent]));
  } catch {
    // Storage unavailable, so this device will report again next visit. Still harmless.
  }
}

/** In-memory guard as well, so a burst inside one session cannot outrun the localStorage write. */
const sentThisSession = new Set<string>();

/** What this device has found, for anything that may only mention secrets the viewer already knows. */
export function foundKeys(): DiscoveryKey[] {
  return [...alreadySent()].filter((key): key is DiscoveryKey =>
    (DISCOVERY_KEYS as readonly string[]).includes(key),
  );
}

/** At most once ever. Not async from the caller's side: the canvas calls this mid-frame. */
export function noticed(roomId: string | null, me: string, key: DiscoveryKey): void {
  if (!roomId) return;
  if (sentThisSession.has(key)) return;
  const sent = alreadySent();
  if (sent.has(key)) {
    sentThisSession.add(key);
    return;
  }
  sentThisSession.add(key);
  sent.add(key);
  remember(sent);

  void fetch(`/api/room/${roomId}/found`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ me, key }),
    // The tab is often closing right after a secret fires (found it, screenshotted it, left).
    keepalive: true,
  }).catch(() => {
    // Bookkeeping about a nice moment. Losing it costs the other person one late notification.
  });
}

/** Test seam: forget what this session has sent. */
export function resetSessionCache(): void {
  sentThisSession.clear();
}
