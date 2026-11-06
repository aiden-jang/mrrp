import type { Action, Bodies, Cat, CatAct, Gift, Mood, RoomView, SaidSoFar, Treat } from "./types.js";

import {
  myToken,
  adoptSeat,
  forgetMe,
  changeRoomAccess,
  accessTokens,
  AccessDenied,
  deletionForRoomKeys,
} from "./seatIdentity.js";
export { myToken, adoptSeat, forgetMe };

// App matches on this to show the room-is-gone screen. A deleted room answers 410 everywhere, and
// must never look like an ordinary failure.
export const GONE = "mrrp: this room is gone";

export class GoneError extends Error {
  constructor(readonly undoUntil: number | null) {
    super(GONE);
  }
}

async function goneFrom(r: Response): Promise<GoneError> {
  const body = (await r.json().catch(() => null)) as { undoUntil?: number | null } | null;
  return new GoneError(body?.undoUntil ?? null);
}

export interface SignedInAs {
  signedIn: boolean;
  name: string | null;
}

export async function whoAmI(): Promise<SignedInAs> {
  try {
    const r = await timed("/api/me");
    if (!r.ok) return { signedIn: false, name: null };
    return (await r.json()) as SignedInAs;
  } catch {
    return { signedIn: false, name: null };
  }
}

/* A hang settles nothing, so no catch runs and a stale room sits on screen looking live. Under the
   shortest poll gap, so a timed-out read cannot overlap the next one. */
const REQUEST_TIMEOUT_MS = 10_000;

async function timed(path: string, init?: RequestInit): Promise<Response> {
  try {
    return await fetch(path, { ...init, signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) });
  } catch (e) {
    // The abort reads as "signal timed out", which is not a sentence to hand somebody here.
    if (e instanceof DOMException && e.name === "TimeoutError") throw new Error("That took too long.");
    throw e;
  }
}

/* Typed per endpoint, so a misspelled field stops the build instead of being dropped in flight. */
async function send<K extends keyof Bodies>(
  path: `/api/room/${string}/${K}`,
  body: Bodies[K],
): Promise<Response> {
  try {
    const kind = path.slice(path.lastIndexOf("/") + 1);
    if (!["rotate", "recover", "undelete"].includes(kind)) {
      const id = path.split("/")[3]!;
      await changeRoomAccess(id, null, (pending) => submitAccess(id, pending));
    }
    return await timed(path, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch {
    throw new Error("That didn't reach the room. Try it again.");
  }
}

export async function doLink(id: string, on: boolean): Promise<void> {
  const r = await send(`/api/room/${id}/link`, { me: myToken(id), on });
  if (r.status === 401) throw new Error("Sign in first.");
  // Not "sign in first": she may well be signed in, and we could not reach the service to ask.
  if (r.status === 503) throw new Error("Sign-in is having a moment. Try again in a bit.");
  if (r.status === 409) throw new Error("That account already has a seat in this room.");
  if (!r.ok) throw new Error("Couldn't do that.");
}

export const lastRoom = {
  get: () => localStorage.getItem("mrrp:room"),
  set: (id: string) => localStorage.setItem("mrrp:room", id),
};

// Call when a room turns out to be gone, or the landing page keeps offering "back to the room". Keep
// the seat token: it is the same browser and it may still have another room.
export function forgetRoom(id: string): void {
  try {
    if (localStorage.getItem("mrrp:room") === id) localStorage.removeItem("mrrp:room");
    localStorage.removeItem(`mrrp:cat:${id}`);
    localStorage.removeItem(`mrrp:mine:${id}`);
  } catch {
    // Private mode. Nothing was stored to forget.
  }
}

// Without this, a link opened on a phone that has used mrrp before seats you silently under the
// remembered name.
export function beenHere(id: string): boolean {
  try {
    return (
      localStorage.getItem(`mrrp:mine:${id}`) !== null || localStorage.getItem(`mrrp:cat:${id}`) !== null
    );
  } catch {
    return false;
  }
}

export function markMine(id: string): void {
  try {
    localStorage.setItem(`mrrp:mine:${id}`, "1");
  } catch {
    // Private mode. The write just does not survive a reload.
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
  try {
    await changeRoomAccess(id, null, (p) => submitAccess(id, p));
  } catch (error) {
    if (error instanceof GoneError)
      throw new GoneError((await roomDeletion(id))?.undoUntil ?? error.undoUntil);
    if (!(error instanceof AccessDenied)) throw error;
  }
  const q = new URLSearchParams({ me: myToken(id) });
  if (name) q.set("name", name);
  let r: Response;
  try {
    r = await timed(`/api/room/${id}?${q}`);
  } catch {
    throw new Error("Can't reach the room. Still trying.");
  }
  if (r.status === 410)
    throw new GoneError((await roomDeletion(id))?.undoUntil ?? (await goneFrom(r)).undoUntil);
  if (!r.ok) throw new Error("Could not find her.");
  return r.json() as Promise<RoomView>;
}

export async function doAct(id: string, action: Action): Promise<RoomView> {
  const r = await send(`/api/room/${id}/act`, { me: myToken(id), action });
  if (!r.ok) throw new Error("That didn't work.");
  return r.json() as Promise<RoomView>;
}

export async function doTell(id: string, mood: Mood): Promise<RoomView> {
  const r = await send(`/api/room/${id}/tell`, { me: myToken(id), mood });
  if (!r.ok) throw new Error("Couldn't reach her just now.");
  return r.json() as Promise<RoomView>;
}

export async function saveCatSetup(id: string, setup: Omit<Bodies["setup"], "me">): Promise<void> {
  const r = await send(`/api/room/${id}/setup`, { ...setup, me: myToken(id) });
  if (!r.ok) throw new Error("Couldn't save the room settings. Try again.");
}

export async function doRelease(id: string): Promise<void> {
  const r = await send(`/api/room/${id}/release`, { me: myToken(id) });
  if (!r.ok) throw new Error("Couldn't free her seat.");
}

// His. Typing the cat's name beats a confirm dialog: the room is both of their years, and a dialog is
// one mis-tap from gone.
export async function doDelete(id: string, name: string): Promise<number> {
  const r = await send(`/api/room/${id}/delete`, { me: myToken(id), name });
  if (r.status === 410) throw await goneFrom(r);
  if (r.status === 403) throw new Error("That is not her name.");
  if (!r.ok) throw new Error("Couldn't delete the room.");
  return ((await r.json()) as { undoUntil: number }).undoUntil;
}

export async function doUnleave(id: string): Promise<void> {
  const r = await send(`/api/room/${id}/unleave`, { me: myToken(id) });
  if (!r.ok) throw new Error("The seat has been taken, so there is nothing to come back to.");
}

export async function doUndelete(id: string): Promise<void> {
  for (const me of accessTokens(id)) {
    const r = await send(`/api/room/${id}/undelete`, { me });
    if (r.ok) return;
    if (r.status !== 403) break;
  }
  throw new Error("The week is up, so there is nothing to put back.");
}

export async function doLeave(id: string): Promise<void> {
  const r = await send(`/api/room/${id}/leave`, { me: myToken(id) });
  if (r.status === 410) throw await goneFrom(r);
  if (!r.ok) throw new Error("Couldn't leave the room.");
}

async function submitAccess(
  id: string,
  pending: { kind: "rotate" | "recover"; from: string; to: string; code?: string },
): Promise<void> {
  const r =
    pending.kind === "rotate"
      ? await send(`/api/room/${id}/rotate`, { me: pending.from, next: pending.to })
      : await send(`/api/room/${id}/recover`, { me: pending.to, code: pending.code! });
  if (r.status === 410) throw await goneFrom(r);
  if (r.status === 400 || r.status === 403)
    throw new AccessDenied(
      "That access change was not accepted. Your existing recovery code is still available.",
    );
  if (!r.ok) throw new Error("Couldn't reach the room. Try again to finish the access change.");
}

export async function doRecover(id: string, code: string): Promise<void> {
  await changeRoomAccess(id, { kind: "recover", code }, (p) => submitAccess(id, p));
}

export async function doRotate(id: string): Promise<void> {
  await changeRoomAccess(id, { kind: "rotate" }, (p) => submitAccess(id, p));
}

export async function doTidy(id: string): Promise<{ again: boolean }> {
  const r = await send(`/api/room/${id}/shelf`, { me: myToken(id) });
  if (!r.ok) throw new Error("Couldn't reach the shelf.");
  return (await r.json()) as { again: boolean };
}

export async function doWindowLight(id: string): Promise<RoomView> {
  const r = await send(`/api/room/${id}/window-light`, { me: myToken(id) });
  if (!r.ok) throw new Error("Couldn't reach the window.");
  return r.json() as Promise<RoomView>;
}

export async function doOurDay(
  id: string,
  day: { month: number; day: number; label: string } | null,
): Promise<void> {
  const r = await send(`/api/room/${id}/ourday`, { me: myToken(id), ...(day ?? { label: "" }) });
  if (!r.ok) throw new Error("Couldn't set that day.");
}

export async function doDraw(id: string, cells: string): Promise<RoomView> {
  const r = await send(`/api/room/${id}/draw`, { me: myToken(id), cells });
  if (!r.ok) throw new Error("Couldn't hang that up.");
  return r.json() as Promise<RoomView>;
}

export async function doCatAct(id: string, act: CatAct): Promise<RoomView> {
  const r = await send(`/api/room/${id}/heract`, { me: myToken(id), act });
  if (!r.ok) throw new Error("Couldn't do that.");
  return r.json() as Promise<RoomView>;
}

/*
 * Fire and forget, and it must stay that way. It fires on every press and release of the cat, and a
 * dropped one costs a hand she does not see. Not worth a red bar across a room somebody is petting a
 * cat in.
 */
export function doHold(id: string, on: boolean): void {
  void send(`/api/room/${id}/hold`, { me: myToken(id), on }).catch(() => {});
}

export async function doSit(id: string, on: boolean): Promise<RoomView> {
  const r = await send(`/api/room/${id}/sit`, { me: myToken(id), on });
  if (!r.ok) throw new Error("Couldn't do that.");
  return r.json() as Promise<RoomView>;
}

export async function doSettle(id: string, on: boolean): Promise<RoomView> {
  const r = await send(`/api/room/${id}/settle`, { me: myToken(id), on });
  if (!r.ok) throw new Error("Couldn't do that.");
  return r.json() as Promise<RoomView>;
}

// Takes back one thing she said, leaving everything else where it is.
export async function doUnsay(id: string, at: number): Promise<RoomView> {
  const r = await send(`/api/room/${id}/unsay`, { me: myToken(id), at });
  if (!r.ok) throw new Error("Couldn't take that back.");
  return r.json() as Promise<RoomView>;
}

export async function doWait(id: string, on: boolean): Promise<RoomView> {
  const r = await send(`/api/room/${id}/wait`, { me: myToken(id), on });
  if (!r.ok) throw new Error("Couldn't do that.");
  return r.json() as Promise<RoomView>;
}

export function doPoke(id: string, what: string): void {
  void send(`/api/room/${id}/poke`, { me: myToken(id), what }).catch(() => {});
}

// Ask at the door without taking a seat. A known seat may receive its deletion Undo deadline.
export async function roomDeletion(id: string): Promise<{ undoUntil: number | null } | null> {
  return deletionForRoomKeys(id, (me) => timed(`/api/room/${id}/alive?me=${encodeURIComponent(me)}`));
}

export async function fetchNotes(id: string): Promise<string[]> {
  const r = await timed(`/api/room/${id}/notes?me=${encodeURIComponent(myToken(id))}`);
  if (!r.ok) throw new Error("Couldn't get your notes.");
  return (await r.json()).notes as string[];
}

export async function fetchSaid(id: string): Promise<SaidSoFar> {
  const r = await timed(`/api/room/${id}/said?me=${encodeURIComponent(myToken(id))}`);
  if (!r.ok) throw new Error("Couldn't get that.");
  return (await r.json()) as SaidSoFar;
}

export async function doBoxOut(id: string, on = true): Promise<RoomView> {
  const r = await send(`/api/room/${id}/boxout`, { me: myToken(id), on });
  if (!r.ok) throw new Error("Couldn't put the box out.");
  return r.json() as Promise<RoomView>;
}

export async function doLeaveOut(id: string, treat: Treat): Promise<RoomView> {
  const r = await send(`/api/room/${id}/leaveout`, { me: myToken(id), treat });
  if (!r.ok) throw new Error("Couldn't leave that out.");
  return r.json() as Promise<RoomView>;
}

export async function doLeaveGift(id: string, gift: Gift, text = ""): Promise<RoomView> {
  const r = await send(`/api/room/${id}/gift`, { me: myToken(id), gift, text });
  if (!r.ok) throw new Error("Couldn't leave that.");
  return r.json() as Promise<RoomView>;
}

export async function doSay(id: string, text: string, aboutDay?: number): Promise<RoomView> {
  const r = await send(`/api/room/${id}/say`, { me: myToken(id), text, aboutDay });
  if (!r.ok) throw new Error("Couldn't leave that.");
  return r.json() as Promise<RoomView>;
}

export async function doBlanket(id: string, key: string, stripe: boolean): Promise<RoomView> {
  const r = await send(`/api/room/${id}/blanket`, { me: myToken(id), key, stripe });
  if (r.status === 410) throw await goneFrom(r);
  if (!r.ok) throw new Error("Couldn't change your blanket.");
  return fetchRoom(id);
}
