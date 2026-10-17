import { DISCOVERY_KEYS, type DiscoveryKey } from "@mrrp/shared";
export { type DiscoveryKey } from "@mrrp/shared";

const STORAGE_KEY = "mrrp:found";

function alreadySent(): Set<string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return new Set(Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === "string") : []);
  } catch {
    return new Set();
  }
}

function remember(sent: Set<string>): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...sent]));
  } catch {
    // Private mode. The write just does not survive a reload.
  }
}

const sentThisSession = new Set<string>();

export function foundKeys(): DiscoveryKey[] {
  return [...alreadySent()].filter((key): key is DiscoveryKey =>
    (DISCOVERY_KEYS as readonly string[]).includes(key),
  );
}

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
    keepalive: true,
  }).catch(() => {});
}

export function resetSessionCache(): void {
  sentThisSession.clear();
}
