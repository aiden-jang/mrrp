import type { Action, RoomView } from "./types.js";

/**
 * Identity is a random token in localStorage, nothing more. No accounts, no email, no password:
 * the room link plus this token is the whole notion of "who am I", which keeps a gift frictionless.
 */
const TOKEN_KEY = "sunspot:me";

export function myToken(): string {
  let t = localStorage.getItem(TOKEN_KEY);
  if (!t) {
    t = crypto.randomUUID().replace(/-/g, "");
    localStorage.setItem(TOKEN_KEY, t);
  }
  return t;
}

export const myName = {
  get: () => localStorage.getItem("sunspot:name"),
  set: (n: string) => localStorage.setItem("sunspot:name", n),
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
  const r = await fetch(`/api/room/${id}?${q}`);
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

export async function dress(id: string, cat: Record<string, unknown>): Promise<void> {
  await fetch(`/api/room/${id}/dress`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(cat),
  });
}
