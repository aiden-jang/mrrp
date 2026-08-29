import type { Action, Cat, Clock, Mood, RoomView } from "./types.js";

const TOKEN_KEY = "mrrp:me";

// Matched by App to show the room-is-gone screen. A deleted room answers 410 on every route, and the
// thing it must never do is look like an ordinary failure the client would retry into.
export const GONE = "mrrp: this room is gone";

// `undoUntil` is set only for the one who deleted it, and only until the week runs out. Everyone else
// gets null, because for them the room is simply gone.
export class GoneError extends Error {
  constructor(readonly undoUntil: number | null) {
    super(GONE);
  }
}

async function goneFrom(r: Response): Promise<GoneError> {
  const body = (await r.json().catch(() => null)) as { undoUntil?: number | null } | null;
  return new GoneError(body?.undoUntil ?? null);
}

export function myToken(): string {
  let t = localStorage.getItem(TOKEN_KEY);
  if (!t) {
    t = crypto.randomUUID().replace(/-/g, "");
    localStorage.setItem(TOKEN_KEY, t);
  }
  return t;
}

// A brand new identity for this browser. Only used by the way back after leaving: her old token is
// barred by the room on purpose, so coming back has to be a new one rather than an unbarring, which
// would make the bar meaningless.
export function forgetMe(): void {
  localStorage.removeItem(TOKEN_KEY);
}

export interface SignedInAs {
  signedIn: boolean;
  name: string | null;
}

/** Never throws: not knowing is the same as signed out, and the room works either way. */
export async function whoAmI(): Promise<SignedInAs> {
  try {
    const r = await fetch("/api/me");
    if (!r.ok) return { signedIn: false, name: null };
    return (await r.json()) as SignedInAs;
  } catch {
    return { signedIn: false, name: null };
  }
}

export function adoptSeat(seat: string | null): void {
  if (seat && seat !== localStorage.getItem(TOKEN_KEY)) localStorage.setItem(TOKEN_KEY, seat);
}

/*
 * One place where a dead connection becomes the app's own words.
 *
 * Every one of these used to call fetch directly, so a train tunnel gave the room "Failed to fetch"
 * or "Load failed" in a panel that otherwise speaks like a person. `fetchRoom` had its own handling
 * for this and none of the actions did.
 */
// One place where a dead connection becomes the app's own words. Eighteen actions called fetch
// directly, so a tunnel gave the room "Failed to fetch" in a panel that otherwise talks like a person.
async function send(path: string, body: unknown): Promise<Response> {
  try {
    return await fetch(path, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch {
    throw new Error("That didn't reach the room. Try it again.");
  }
}

export async function doLink(id: string, on: boolean): Promise<void> {
  const r = await send(`/api/room/${id}/link`, { me: myToken(), on });
  if (r.status === 401) throw new Error("Sign in first.");
  if (r.status === 409) throw new Error("That account already has a seat in this room.");
  if (!r.ok) throw new Error("Couldn't do that.");
}

export const lastRoom = {
  get: () => localStorage.getItem("mrrp:room"),
  set: (id: string) => localStorage.setItem("mrrp:room", id),
};

// Called when a room turns out to be gone. Without it the landing page keeps offering "back to the
// room" and the door keeps drawing a cat that no longer exists, both of which lead to the same dead
// end. The seat token stays: it is this browser's name, not this room's.
// Called when a room turns out to be gone. Without it the landing page keeps offering "back to the
// room" and the door keeps drawing a cat that no longer exists.
export function forgetRoom(id: string): void {
  try {
    if (localStorage.getItem("mrrp:room") === id) localStorage.removeItem("mrrp:room");
    localStorage.removeItem(`mrrp:cat:${id}`);
    localStorage.removeItem(`mrrp:mine:${id}`);
  } catch {
    // Private mode. Nothing was stored to forget.
  }
}

/*
 * Whether this browser has been inside this particular room before.
 *
 * The name is remembered per device, not per room, so without this check a link opened on a phone
 * that has ever used mrrp seats you silently under that old name. The mark is set two ways: making
 * a room, and any successful load of one. `lastRoom` cannot stand in for it, because App writes
 * that for whatever id is in the path, including a link you have never opened.
 */
export function beenHere(id: string): boolean {
  try {
    return localStorage.getItem(`mrrp:mine:${id}`) !== null || localStorage.getItem(`mrrp:cat:${id}`) !== null;
  } catch {
    return false;
  }
}

export function markMine(id: string): void {
  try {
    localStorage.setItem(`mrrp:mine:${id}`, "1");
  } catch {
    // Private mode. They get asked their name again, which is the safe way to be wrong.
  }
}

export const myName = {
  get: () => localStorage.getItem("mrrp:name"),
  set: (n: string) => localStorage.setItem("mrrp:name", n),
};

export const lastCat = {
  get: (id: string): Cat | null => {
    try {
      const raw = JSON.parse(localStorage.getItem(`mrrp:cat:${id}`) ?? "null") as Partial<Cat> | null;
      if (!raw || typeof raw.name !== "string" || typeof raw.fur !== "string") return null;
      return raw as Cat;
    } catch {
      return null;
    }
  },
  set: (id: string, cat: Cat) => {
    try {
      localStorage.setItem(`mrrp:cat:${id}`, JSON.stringify(cat));
    } catch {
      // Private mode. The write just does not survive a reload.
    }
  },
};

export function roomFromPath(): string | null {
  const m = location.pathname.match(/^\/r\/([a-z0-9]{6,24})$/);
  return m ? m[1]! : null;
}

export const newRoomId = () =>
  Array.from(crypto.getRandomValues(new Uint8Array(8)))
    .map((b) => "abcdefghijkmnpqrstuvwxyz23456789"[b % 32])
    .join("");

export async function fetchRoom(id: string, name?: string | null): Promise<RoomView> {
  const q = new URLSearchParams({ me: myToken() });
  if (name) q.set("name", name);
  let r: Response;
  try {
    r = await fetch(`/api/room/${id}?${q}`);
  } catch {
    throw new Error("Can't reach the room. Still trying.");
  }
  if (r.status === 410) throw await goneFrom(r);
  if (!r.ok) throw new Error("Could not find her.");
  return r.json() as Promise<RoomView>;
}

export async function doAct(id: string, action: Action): Promise<RoomView> {
  const r = await send(`/api/room/${id}/act`, { me: myToken(), action });
  if (!r.ok) throw new Error("That didn't work.");
  return r.json() as Promise<RoomView>;
}

export async function doTell(id: string, mood: Mood): Promise<RoomView> {
  const r = await send(`/api/room/${id}/tell`, { me: myToken(), mood });
  if (!r.ok) throw new Error("Couldn't reach her just now.");
  return r.json() as Promise<RoomView>;
}

export async function doDress(id: string, cat: Partial<Cat>): Promise<void> {
  const r = await send(`/api/room/${id}/dress`, { me: myToken(), ...cat });
  if (!r.ok) throw new Error("Couldn't save how she looks.");
}

export async function doClock(id: string, clock: Partial<Clock>): Promise<void> {
  const r = await send(`/api/room/${id}/clock`, { me: myToken(), ...clock });
  if (!r.ok) throw new Error("Couldn't save her hours.");
}

export async function doRelease(id: string): Promise<void> {
  const r = await send(`/api/room/${id}/release`, { me: myToken() });
  if (!r.ok) throw new Error("Couldn't free her seat.");
}

// His. The cat's name is typed rather than confirmed, because a room is both of their years and a
// confirm dialog is one mis-tap away from gone.
export async function doDelete(id: string, name: string): Promise<number> {
  const r = await send(`/api/room/${id}/delete`, { me: myToken(), name });
  if (r.status === 410) throw await goneFrom(r);
  if (r.status === 403) throw new Error("That is not her name.");
  if (!r.ok) throw new Error("Couldn't delete the room.");
  return ((await r.json()) as { undoUntil: number }).undoUntil;
}

export async function doUnleave(id: string): Promise<void> {
  const r = await send(`/api/room/${id}/unleave`, { me: myToken() });
  if (!r.ok) throw new Error("The seat has been taken, so there is nothing to come back to.");
}

export async function doUndelete(id: string): Promise<void> {
  const r = await send(`/api/room/${id}/undelete`, { me: myToken() });
  if (!r.ok) throw new Error("The week is up, so there is nothing to put back.");
}

// Hers. Takes her side with her and leaves his room standing.
export async function doLeave(id: string): Promise<void> {
  const r = await send(`/api/room/${id}/leave`, { me: myToken() });
  if (r.status === 410) throw await goneFrom(r);
  if (!r.ok) throw new Error("Couldn't leave the room.");
}

export async function doNotes(id: string, notes: string[]): Promise<void> {
  const r = await send(`/api/room/${id}/notes`, { me: myToken(), notes });
  if (!r.ok) throw new Error("Couldn't save the notes.");
}

export async function doRecover(id: string, code: string): Promise<void> {
  const r = await send(`/api/room/${id}/recover`, { me: myToken(), code });
  if (!r.ok) throw new Error("That code doesn't match this room.");
}

export async function doTidy(id: string): Promise<{ again: boolean }> {
  const r = await send(`/api/room/${id}/shelf`, { me: myToken() });
  if (!r.ok) throw new Error("Couldn't reach the shelf.");
  return (await r.json()) as { again: boolean };
}

export async function doWindowLight(id: string): Promise<RoomView> {
  const r = await send(`/api/room/${id}/window-light`, { me: myToken() });
  if (!r.ok) throw new Error("Couldn't reach the window.");
  return r.json() as Promise<RoomView>;
}

export async function doOurDay(
  id: string,
  day: { month: number; day: number; label: string } | null,
): Promise<void> {
  const r = await send(`/api/room/${id}/ourday`, { me: myToken(), ...(day ?? { label: "" }) });
  if (!r.ok) throw new Error("Couldn't set that day.");
}

export async function doDraw(id: string, cells: string): Promise<RoomView> {
  const r = await send(`/api/room/${id}/draw`, { me: myToken(), cells });
  if (!r.ok) throw new Error("Couldn't hang that up.");
  return r.json() as Promise<RoomView>;
}

export async function doSay(id: string, text: string): Promise<RoomView> {
  const r = await send(`/api/room/${id}/say`, { me: myToken(), text });
  if (!r.ok) throw new Error("Couldn't leave that.");
  return r.json() as Promise<RoomView>;
}

export async function doBlanket(id: string, key: string, stripe: boolean): Promise<RoomView> {
  const r = await send(`/api/room/${id}/blanket`, { me: myToken(), key, stripe });
  if (r.status === 410) throw await goneFrom(r);
  if (!r.ok) throw new Error("Couldn't change her blanket.");
  return fetchRoom(id);
}
