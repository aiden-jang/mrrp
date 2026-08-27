import type { Action, Cat, Clock, Mood, RoomView } from "./types.js";

const TOKEN_KEY = "mrrp:me";

export function myToken(): string {
  let t = localStorage.getItem(TOKEN_KEY);
  if (!t) {
    t = crypto.randomUUID().replace(/-/g, "");
    localStorage.setItem(TOKEN_KEY, t);
  }
  return t;
}

export function adoptSeat(seat: string | null): void {
  if (seat && seat !== localStorage.getItem(TOKEN_KEY)) localStorage.setItem(TOKEN_KEY, seat);
}

export async function doLink(id: string, on: boolean): Promise<void> {
  const r = await fetch(`/api/room/${id}/link`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ me: myToken(), on }),
  });
  if (r.status === 401) throw new Error("Sign in first.");
  if (r.status === 409) throw new Error("That account already has a seat in this room.");
  if (!r.ok) throw new Error("Couldn't do that.");
}

export const lastRoom = {
  get: () => localStorage.getItem("mrrp:room"),
  set: (id: string) => localStorage.setItem("mrrp:room", id),
};

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

export async function doTell(id: string, mood: Mood): Promise<RoomView> {
  const r = await fetch(`/api/room/${id}/tell`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ me: myToken(), mood }),
  });
  if (!r.ok) throw new Error("Couldn't reach her just now.");
  return r.json() as Promise<RoomView>;
}

export async function doDress(id: string, cat: Partial<Cat>): Promise<void> {
  const r = await fetch(`/api/room/${id}/dress`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ me: myToken(), ...cat }),
  });
  if (!r.ok) throw new Error("Couldn't save how she looks.");
}

export async function doClock(id: string, clock: Partial<Clock>): Promise<void> {
  const r = await fetch(`/api/room/${id}/clock`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ me: myToken(), ...clock }),
  });
  if (!r.ok) throw new Error("Couldn't save her hours.");
}

export async function doRelease(id: string): Promise<void> {
  const r = await fetch(`/api/room/${id}/release`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ me: myToken() }),
  });
  if (!r.ok) throw new Error("Couldn't free her seat.");
}

export async function doNotes(id: string, notes: string[]): Promise<void> {
  const r = await fetch(`/api/room/${id}/notes`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ me: myToken(), notes }),
  });
  if (!r.ok) throw new Error("Couldn't save the notes.");
}

export async function doRecover(id: string, code: string): Promise<void> {
  const r = await fetch(`/api/room/${id}/recover`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ me: myToken(), code }),
  });
  if (!r.ok) throw new Error("That code doesn't match this room.");
}

export async function doTidy(id: string): Promise<{ again: boolean }> {
  const r = await fetch(`/api/room/${id}/shelf`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ me: myToken() }),
  });
  if (!r.ok) throw new Error("Couldn't reach the shelf.");
  return (await r.json()) as { again: boolean };
}

export async function doWindowLight(id: string): Promise<RoomView> {
  const r = await fetch(`/api/room/${id}/window-light`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ me: myToken() }),
  });
  if (!r.ok) throw new Error("Couldn't reach the window.");
  return r.json() as Promise<RoomView>;
}

export async function doOurDay(
  id: string,
  day: { month: number; day: number; label: string } | null,
): Promise<void> {
  const r = await fetch(`/api/room/${id}/ourday`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ me: myToken(), ...(day ?? { label: "" }) }),
  });
  if (!r.ok) throw new Error("Couldn't set that day.");
}

export async function doDraw(id: string, cells: string): Promise<RoomView> {
  const r = await fetch(`/api/room/${id}/draw`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ me: myToken(), cells }),
  });
  if (!r.ok) throw new Error("Couldn't hang that up.");
  return r.json() as Promise<RoomView>;
}

export async function doSay(id: string, text: string): Promise<RoomView> {
  const r = await fetch(`/api/room/${id}/say`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ me: myToken(), text }),
  });
  if (!r.ok) throw new Error("Couldn't leave that.");
  return r.json() as Promise<RoomView>;
}
