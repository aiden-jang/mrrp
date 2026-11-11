import { isSeatToken } from "./seatToken.js";
import type { Visit } from "./types.js";
import type { FoundLedger } from "./discoveries.js";
import type { OurDay } from "./remembers.js";

export const HER_DAY = "herDay";
export interface SeatDay {
  owner: string;
  day: OurDay;
}

export async function readHerDay(storage: DurableObjectStorage, seat: string | null): Promise<OurDay | null> {
  const day = await storage.get<SeatDay>(HER_DAY);
  if (day && !day.owner) {
    // An unowned date may already have outlasted its original seat.
    await storage.transaction(async (txn) => {
      const saved = await txn.get<SeatDay>(HER_DAY);
      if (saved && !saved.owner) await txn.delete(HER_DAY);
    });
  }
  return day?.owner === seat ? day.day : null;
}

export interface SeatPerson {
  name: string;
  firstSeen: number;
  lastSeen: number;
  visits: number;
  account?: string;
  seatOrder?: number;
}

export function seatRoles(people: Record<string, SeatPerson>): { him: string | null; her: string | null } {
  const ids = Object.keys(people).sort(
    (a, b) =>
      people[a]!.firstSeen - people[b]!.firstSeen ||
      (people[a]!.seatOrder ?? 0) - (people[b]!.seatOrder ?? 0),
  );
  return { him: ids[0] ?? null, her: ids[1] ?? null };
}

async function fingerprint(token: string): Promise<string> {
  const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token));
  return [...new Uint8Array(bytes)].map((n) => n.toString(16).padStart(2, "0")).join("");
}

export async function touchSeat(
  storage: DurableObjectStorage,
  requested: string,
  name: string | null,
  account?: string | null,
) {
  const key = `revoked:${await fingerprint(requested)}`;
  return storage.transaction(async (transaction) => {
    const people = (await transaction.get<Record<string, SeatPerson>>("people")) ?? {};
    const bound = account ? Object.keys(people).find((t) => people[t]?.account === account) : undefined;
    const me = bound ?? requested;
    const lastVisit = people[me]?.lastSeen;
    const blocked =
      !bound &&
      ((await transaction.get(key)) !== undefined ||
        ((await transaction.get<string[]>("left")) ?? []).includes(me));
    const now = Date.now();
    if (!people[me] && !blocked && Object.keys(people).length < 2) {
      const firstSeen = Math.max(now, ...Object.values(people).map((p) => p.firstSeen + 1));
      if (Object.keys(people).length === 1) await transaction.delete("leftSide");
      people[me] = { name: name?.trim().slice(0, 24) || "Someone", firstSeen, lastSeen: now, visits: 0 };
    }
    if (people[me]) {
      people[me].lastSeen = now;
      people[me].visits += 1;
      await transaction.put("people", people);
    }
    return { people, me, lastVisit };
  });
}

// The destination is saved by the browser before sending. The hashed receipt makes a lost reply
// retryable without revealing the replacement credential to somebody holding only the old one.
export async function replaceSeat(ctx: DurableObjectState, from: string, to: string): Promise<boolean> {
  if (!isSeatToken(from) || !isSeatToken(to) || from === to) return false;
  const sourceKey = `revoked:${await fingerprint(from)}`;
  const targetHash = await fingerprint(to);
  const moved = await ctx.storage.transaction(async (storage) => {
    const people = (await storage.get<Record<string, SeatPerson>>("people")) ?? {};
    if (!people[from]) return (await storage.get(sourceKey)) === targetHash;
    if (people[to] || (await storage.get(`revoked:${targetHash}`)) !== undefined) return false;
    const old = people[from]!;
    const roles = seatRoles(people);
    if (roles.him) people[roles.him]!.seatOrder = 0;
    if (roles.her) people[roles.her]!.seatOrder = 1;
    delete people[from];
    people[to] = { ...old, lastSeen: Date.now() };
    await storage.put({ people, [sourceKey]: targetHash });

    const moods = (await storage.get<Record<string, unknown>>("moods")) ?? {};
    if (Object.hasOwn(moods, from)) {
      moods[to] = moods[from];
      delete moods[from];
      await storage.put("moods", moods);
    }
    const date = await storage.get<SeatDay>(HER_DAY);
    if (date?.owner === from) await storage.put<SeatDay>(HER_DAY, { ...date, owner: to });
    const log = await storage.get<Visit[]>("log");
    if (log)
      await storage.put(
        "log",
        log.map((v) => (v.who === from ? { ...v, who: to } : v)),
      );
    const found = await storage.get<FoundLedger>("found");
    if (found) {
      for (const seats of Object.values(found)) {
        if (Object.hasOwn(seats, from)) {
          seats[to] = seats[from]!;
          delete seats[from];
        }
      }
      await storage.put("found", found);
    }
    for (const [key, field] of [
      ["windowLight", "from"],
      ["held", "who"],
      ["sitting", "who"],
      ["settled", "who"],
      ["waiting", "who"],
      ["poke", "who"],
      ["doodle", "by"],
      ["undrawn", "by"],
    ] as const) {
      const value = await storage.get<Record<string, unknown>>(key);
      if (value?.[field] === from) await storage.put(key, { ...value, [field]: to });
    }
    if ((await storage.get("handover")) === from) await storage.put("handover", to);
    return true;
  });
  if (moved) {
    for (const socket of ctx.getWebSockets()) {
      const held = socket.deserializeAttachment() as { me?: string } | null;
      if (held?.me !== from) continue;
      socket.serializeAttachment(null);
      socket.close(1008, "This seat's browser key was replaced. Use your account or recovery code.");
    }
  }
  return moved;
}
