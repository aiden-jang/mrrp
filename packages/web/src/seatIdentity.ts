const TOKEN_KEY = "mrrp:me";
const roomKey = (id: string) => `mrrp:seat:${id}`;
const pendingKey = (id: string) => `mrrp:access:${id}`;
const freshToken = () => crypto.randomUUID().replace(/-/g, "");

export function myToken(id?: string): string {
  if (id) {
    const saved = localStorage.getItem(roomKey(id));
    if (saved) return saved;
  }
  let token = localStorage.getItem(TOKEN_KEY);
  if (!token) {
    token = freshToken();
    localStorage.setItem(TOKEN_KEY, token);
  }
  return token;
}

export async function adoptSeat(seat: string | null, id?: string, requested?: string): Promise<boolean> {
  const adopt = () => {
    const current = myToken(id);
    if (requested && current !== requested && current !== seat) return false;
    const key = id ? roomKey(id) : TOKEN_KEY;
    if (seat && seat !== localStorage.getItem(key)) localStorage.setItem(key, seat);
    return true;
  };
  if (id && navigator.locks) return navigator.locks.request(`mrrp:access:${id}`, adopt);
  return adopt();
}

export function forgetMe(id?: string): void {
  if (id) {
    localStorage.setItem(roomKey(id), freshToken());
    localStorage.removeItem(pendingKey(id));
  } else localStorage.removeItem(TOKEN_KEY);
}

type Operation = { kind: "rotate" } | { kind: "recover"; code: string };
type PendingAccess = Operation & { from: string; to: string };
type Submit = (pending: PendingAccess) => Promise<void>;
const inFlight = new Map<string, Promise<void>>();

export class AccessDenied extends Error {}

function pendingAccess(id: string): PendingAccess | null {
  const raw = localStorage.getItem(pendingKey(id));
  if (!raw) return null;
  try {
    const value = JSON.parse(raw) as Partial<PendingAccess>;
    const token = (v: unknown) => typeof v === "string" && /^[A-Za-z0-9_-]{8,128}$/.test(v);
    if (
      token(value.from) &&
      token(value.to) &&
      (value.kind === "rotate" ||
        (value.kind === "recover" && typeof value.code === "string" && value.code.length <= 64))
    )
      return value as PendingAccess;
  } catch {
    /* A damaged device copy cannot authorize an access change. */
  }
  throw new Error(
    "The saved access change could not be read. Your recovery code still works in another browser.",
  );
}

export function accessTokens(id: string): string[] {
  const pending = pendingAccess(id);
  return [...new Set([myToken(id), ...(pending ? [pending.from] : [])])];
}

export async function deletionForRoomKeys(
  id: string,
  read: (token: string) => Promise<Response>,
): Promise<{ undoUntil: number | null } | null> {
  let deleted: { undoUntil: number | null } | null = null;
  try {
    for (const me of accessTokens(id)) {
      const response = await read(me);
      if (response.status !== 410) return null;
      const body = (await response.json().catch(() => null)) as { undoUntil?: number | null } | null;
      deleted = { undoUntil: body?.undoUntil ?? null };
      if (deleted.undoUntil !== null) return deleted;
    }
  } catch {
    /* A pending replacement must not hide a known owner's Undo. */
  }
  return deleted;
}

// Persist both credentials before contacting the room. A lost reply or a reload can retry the
// same operation; a quota/storage error must happen before the server revokes anything.
export function changeRoomAccess(id: string, operation: Operation | null, submit: Submit): Promise<void> {
  const current = inFlight.get(id);
  if (current) return current;
  if (!operation && !pendingAccess(id)) return Promise.resolve();
  const run = async () => {
    const pending =
      pendingAccess(id) ?? (operation ? { ...operation, from: myToken(id), to: freshToken() } : null);
    if (!pending) return;
    const body = JSON.stringify(pending);
    try {
      localStorage.setItem(pendingKey(id), body);
      localStorage.setItem(roomKey(id), pending.to);
      if (localStorage.getItem(pendingKey(id)) !== body || localStorage.getItem(roomKey(id)) !== pending.to)
        throw new Error();
    } catch {
      throw new Error("Allow browser storage before changing access. Nothing has been revoked.");
    }
    try {
      await submit(pending);
    } catch (error) {
      if (error instanceof AccessDenied) {
        localStorage.setItem(roomKey(id), pending.from);
        localStorage.removeItem(pendingKey(id));
      }
      throw error;
    }
    try {
      localStorage.removeItem(pendingKey(id));
    } catch {
      /* Replaying the receipt is safe. */
    }
  };
  const operationRequest = (async () => {
    if (navigator.locks) await navigator.locks.request(`mrrp:access:${id}`, run);
    else await run();
  })();
  const request = operationRequest.finally(() => {
    inFlight.delete(id);
  });
  inFlight.set(id, request);
  return request;
}
