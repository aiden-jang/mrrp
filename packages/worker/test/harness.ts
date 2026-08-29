import { env, runInDurableObject, SELF } from "cloudflare:test";
import { afterEach, beforeEach, expect, vi } from "vitest";
import type { RoomView } from "../src/types.js";

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
  tick: (ms?: number) => Promise<void>;
  seat: (tz?: string) => Promise<void>;
}

/*
 * One room per file, wiped between tests.
 *
 * Requests get slower the more the worker has served, so one big file is quadratic in its own length:
 * sixty reads cost 76ms at the start and 3402ms after four hundred. Each file gets its own worker and
 * its own counter, so splitting them is what took this suite from two minutes to four seconds. Do not
 * merge these files back together.
 */
export function harness(room: string): Harness {
  const id = room;

  // Both of these are set here, not read from `.dev.vars`: that file is gitignored, so tests that
  // needed it passed here and failed on a fresh clone. WEATHER_URL points at a port that refuses so
  // no test ever calls the real forecast.
  beforeEach(() => {
    env.DEV_TOOLS = "on";
    env.WEATHER_URL = "http://127.0.0.1:1";
  });

  afterEach(async () => {
    vi.useRealTimers();
    await runInDurableObject(env.ROOM.get(env.ROOM.idFromName(id)), async (_instance, state) => {
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

  // "What arrived since your last visit" is `at > since`, both from Date.now(). A test that reads,
  // acts and reads again inside one millisecond correctly gets nothing. People cannot do that over a
  // network; this suite can, now that it is fast.
  async function tick(ms = 10): Promise<void> {
    if (vi.isFakeTimers()) vi.setSystemTime(new Date(Date.now() + ms));
    else await new Promise((resolve) => setTimeout(resolve, ms));
  }

  // Pass `tz` to set the clock BEFORE her first read. Her day is recorded from whatever zone is in
  // force the first time she looks, which the note tests depend on.
  async function seat(tz?: string) {
    await view(HIM, "Aiden");
    if (tz) await post("clock", { me: HIM, tz });
    await view(HER, "Sofia");
  }

  return { id, view, post, away, tick, seat };
}
