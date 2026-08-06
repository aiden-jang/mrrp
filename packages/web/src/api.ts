import type { Action, Cat, Clock, Mood, RoomView } from "./types.js";

/**
 * Identity is a random token in localStorage, nothing more. No accounts, no email, no password:
 * the room link plus this token is the whole notion of "who am I", which keeps a gift frictionless.
 */
const TOKEN_KEY = "mrrp:me";

export function myToken(): string {
  let t = localStorage.getItem(TOKEN_KEY);
  if (!t) {
    t = crypto.randomUUID().replace(/-/g, "");
    localStorage.setItem(TOKEN_KEY, t);
  }
  return t;
}

/**
 * The last room this device was in.
 *
 * A static manifest cannot have a per-room start_url, so the home screen icon resolves to "/", which
 * is the make-a-room page. Adding the app to her home screen from her room and then being shown a name
 * box and a "Make her a room" button the next day is the worst possible outcome for the one flow this
 * app exists for. This is how the front door knows where she was.
 */
export const lastRoom = {
  get: () => localStorage.getItem("mrrp:room"),
  set: (id: string) => localStorage.setItem("mrrp:room", id),
};

export const myName = {
  get: () => localStorage.getItem("mrrp:name"),
  set: (n: string) => localStorage.setItem("mrrp:name", n),
};

/** Room ids live in the path (/r/<id>) so the link is the only thing you have to send. */
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
    // A dead connection throws a TypeError whose message is "Failed to fetch", and that string was
    // going straight to the screen. The service worker means the app itself still opens on a bad
    // connection, so this line is what she actually reads when it does.
    throw new Error("Can't reach the room. Still trying.");
  }
  if (!r.ok) throw new Error("Could not find her.");
  return r.json() as Promise<RoomView>;
}

export async function doAct(id: string, action: Action): Promise<RoomView> {
  const r = await fetch(`/api/room/${id}/act`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ me: myToken(), action }),
  });
  if (!r.ok) throw new Error("That didn't work.");
  return r.json() as Promise<RoomView>;
}

/** Tell the cat how you are. Returns the room as it now looks to you. */
export async function doTell(id: string, mood: Mood): Promise<RoomView> {
  const r = await fetch(`/api/room/${id}/tell`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ me: myToken(), mood }),
  });
  if (!r.ok) throw new Error("Couldn't reach her just now.");
  return r.json() as Promise<RoomView>;
}

/** Dress the cat. His only; the Worker returns 403 from the other seat. */
export async function doDress(id: string, cat: Partial<Cat>): Promise<void> {
  const r = await fetch(`/api/room/${id}/dress`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ me: myToken(), ...cat }),
  });
  if (!r.ok) throw new Error("Couldn't save how she looks.");
}

/** Set whose day the room runs on. His only, same as dress. */
export async function doClock(id: string, clock: Partial<Clock>): Promise<void> {
  const r = await fetch(`/api/room/${id}/clock`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ me: myToken(), ...clock }),
  });
  if (!r.ok) throw new Error("Couldn't save her hours.");
}

/**
 * Free her seat so a new device can claim it. His only.
 *
 * The one recovery path in an app with no accounts: a seat is the token below, and a cleared browser
 * or a new phone otherwise loses it for good.
 */
export async function doRelease(id: string): Promise<void> {
  const r = await fetch(`/api/room/${id}/release`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ me: myToken() }),
  });
  if (!r.ok) throw new Error("Couldn't free her seat.");
}

/** Replace this room's notes, one per entry. His only; an empty list restores the defaults. */
export async function doNotes(id: string, notes: string[]): Promise<void> {
  const r = await fetch(`/api/room/${id}/notes`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ me: myToken(), notes }),
  });
  if (!r.ok) throw new Error("Couldn't save the notes.");
}

/** Take his seat back on a new device. The only way he can be restored. */
export async function doRecover(id: string, code: string): Promise<void> {
  const r = await fetch(`/api/room/${id}/recover`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ me: myToken(), code }),
  });
  if (!r.ok) throw new Error("That code doesn't match this room.");
}

/** Leave him a line. Hers only; empty text clears it. */
export async function doSay(id: string, text: string): Promise<RoomView> {
  const r = await fetch(`/api/room/${id}/say`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ me: myToken(), text }),
  });
  if (!r.ok) throw new Error("Couldn't leave that.");
  return r.json() as Promise<RoomView>;
}
