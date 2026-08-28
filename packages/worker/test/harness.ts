import { env, runInDurableObject, SELF } from "cloudflare:test";
import { afterEach, beforeEach, expect, vi } from "vitest";
import type { RoomView } from "../src/types.js";

/*
 * The shared setup for the worker tests, and the reason they are split across several files.
 *
 * Cost per request grows with how many requests the worker process has already served, so a suite in
 * one file is quadratic in its own length. Measured inside a single room, with no new Durable Objects
 * at all: sixty reads cost 76ms at the start of a file and 3402ms once four hundred had gone before
 * them. Splitting the same tests across files divides that by the number of files and then runs them
 * at the same time, because each file gets its own worker and its own counter.
 *
 * So: one file per area, each with its own room. Do not merge them back into one.
 */
export const BEHIND = "Etc/GMT+12";
export const AHEAD = "Pacific/Kiritimati";

export const HIM = "himhimhimhim";
export const HER = "herherherher";
export const STRANGER = "strangerstranger";

export interface Harness {
  id: string;
  view: (me: string, name?: string) => Promise<RoomView>;
  post: (path: string, body: unknown) => Promise<Response>;
  away: (hours: number) => void;
  seat: (tz?: string) => Promise<void>;
}

/**
 * One room per file, wiped between tests rather than a fresh id each time.
 *
 * The file boundary is a real one: storage and `env` are both per file, so two files using the same
 * room id do not see each other, and one file taking DEV_TOOLS away does not disturb the rest. Both
 * checked, rather than assumed. The ids differ anyway because it makes a failure easier to place, and
 * because the room id has to be six characters or the router rejects it, which cost twenty-four tests
 * once already.
 */
export function harness(room: string): Harness {
  const id = room;

  // DEV_TOOLS is set here and not read from `.dev.vars`, which is gitignored: the fast-forward tests
  // passed on my machine and failed on a fresh clone. The closed-door test takes it away itself.
  beforeEach(() => {
    env.DEV_TOOLS = "on";
  });

  afterEach(async () => {
    // Real timers first. Wiping storage is a round trip, and it hangs under fake ones.
    //
    // `away()` moves the system clock, so putting it back also matters for every later test, which
    // would otherwise inherit the jump.
    vi.useRealTimers();
    await runInDurableObject(env.ROOM.get(env.ROOM.idFromName(id)), async (_instance, state) => {
      // The alarm is not a key, so deleteAll does not take it. Left behind, a delete scheduled by one
      // test fires in the middle of another one.
      await state.storage.deleteAlarm();
      await state.storage.deleteAll();
    });
  });

  const view = async (me: string, name?: string): Promise<RoomView> => {
    const q = new URLSearchParams({ me });
    if (name) q.set("name", name);
    const r = await SELF.fetch(`https://x/api/room/${id}?${q}`);
    expect(r.status).toBe(200);
    return r.json();
  };

  const post = (path: string, body: unknown) =>
    SELF.fetch(`https://x/api/room/${id}/${path}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });

  function away(hours: number): void {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.setSystemTime(new Date(Date.now() + hours * 60 * 60 * 1000));
  }

  // Seat both people. Pass `tz` to pin the room's clock BEFORE her first read, which the note tests
  // depend on: her day is recorded from whatever zone is in force the first time she reads. The two
  // zones above differ from each other always; that says nothing about the one the room starts on.
  async function seat(tz?: string) {
    await view(HIM, "Aiden");
    if (tz) await post("clock", { me: HIM, tz });
    await view(HER, "Sofia");
  }

  return { id, view, post, away, seat };
}
