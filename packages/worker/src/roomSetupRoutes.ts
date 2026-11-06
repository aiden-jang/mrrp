import { Hono } from "hono";
import { isRoomDecor } from "./decor.js";
import type { Env } from "./env.js";
import { isSeatToken, ROOM_RE } from "./seatToken.js";
import type { Untrusted } from "./types.js";

export const roomSetupRoutes = new Hono<{ Bindings: Env }>();
const room = (env: Env, id: string) => env.ROOM.get(env.ROOM.idFromName(id));
const hex = (value: unknown) => typeof value === "string" && /^#[0-9a-f]{6}$/i.test(value);
const isHomeHour = (value: unknown): value is number =>
  typeof value === "number" && Number.isInteger(value) && value >= 0 && value <= 23;

function isTimeZone(value: unknown): value is string {
  if (typeof value !== "string") return false;
  try {
    new Intl.DateTimeFormat("en-CA", { timeZone: value });
    return true;
  } catch {
    return false;
  }
}

roomSetupRoutes.post("/api/room/:id/dress", async (c) => {
  const id = c.req.param("id");
  if (!ROOM_RE.test(id)) return c.json({ error: "bad request" }, 400);
  const body = ((await c.req.json().catch(() => null)) ?? {}) as Untrusted<"dress">;
  const me = typeof body.me === "string" ? body.me : "";
  if (!isSeatToken(me)) return c.json({ error: "bad request" }, 400);
  // Keyed off the body's own field names, so a typo here is a build error and not a silent skip.
  const pick = <T>(k: keyof Untrusted<"dress">, ok: (v: unknown) => boolean): T | undefined =>
    ok(body[k]) ? (body[k] as T) : undefined;
  if (body.decor !== undefined && !isRoomDecor(body.decor)) return c.json({ error: "bad room decor" }, 400);
  const ok = await room(c.env, id).saveSetup(me, {
    cat: {
      name: pick<string>("name", (v) => typeof v === "string" && v.length <= 24),
      fur: pick<string>("fur", hex),
      furDk: pick<string>("furDk", hex),
      belly: pick<string>("belly", hex),
      eyes: pick<string>("eyes", hex),
      tabby: pick<boolean>("tabby", (v) => typeof v === "boolean"),
    },
    decor: body.decor,
  });
  return ok ? c.json({ ok: true }) : c.json({ error: "not yours to set" }, 403);
});

roomSetupRoutes.post("/api/room/:id/notes", async (c) => {
  const id = c.req.param("id");
  if (!ROOM_RE.test(id)) return c.json({ error: "bad request" }, 400);
  const body = ((await c.req.json().catch(() => null)) ?? {}) as Untrusted<"notes">;
  const me = typeof body.me === "string" ? body.me : "";
  if (!isSeatToken(me)) return c.json({ error: "bad request" }, 400);
  if (!Array.isArray(body.notes) || body.notes.some((n) => typeof n !== "string")) {
    return c.json({ error: "bad request" }, 400);
  }
  const ok = await room(c.env, id).saveSetup(me, { notes: body.notes });
  return ok ? c.json({ ok: true }) : c.json({ error: "not yours to set" }, 403);
});

roomSetupRoutes.post("/api/room/:id/setup", async (c) => {
  const id = c.req.param("id");
  const { me, cat, decor, clock, notes } = ((await c.req.json().catch(() => null)) ??
    {}) as Untrusted<"setup">;
  if (!ROOM_RE.test(id) || !isSeatToken(me)) return c.json({ error: "bad request" }, 400);
  if (
    !cat ||
    typeof cat.name !== "string" ||
    !cat.name.trim() ||
    cat.name.length > 24 ||
    ![cat.fur, cat.furDk, cat.belly, cat.eyes].every(hex) ||
    typeof cat.tabby !== "boolean" ||
    !isRoomDecor(decor) ||
    !clock ||
    !isTimeZone(clock.tz) ||
    !isHomeHour(clock.homeHour) ||
    !Array.isArray(notes) ||
    notes.some((note) => typeof note !== "string")
  ) {
    return c.json({ error: "bad room settings" }, 400);
  }
  const { name, fur, furDk, belly, eyes, tabby } = cat;
  const ok = await room(c.env, id).saveSetup(me, {
    cat: { name, fur, furDk, belly, eyes, tabby },
    decor,
    clock: { tz: clock.tz, homeHour: clock.homeHour },
    notes,
  });
  return ok ? c.json({ ok: true }) : c.json({ error: "not yours to set" }, 403);
});

roomSetupRoutes.post("/api/room/:id/clock", async (c) => {
  const id = c.req.param("id");
  if (!ROOM_RE.test(id)) return c.json({ error: "bad request" }, 400);
  const body = ((await c.req.json().catch(() => null)) ?? {}) as Untrusted<"clock">;
  const me = typeof body.me === "string" ? body.me : "";
  if (!isSeatToken(me)) return c.json({ error: "bad request" }, 400);

  const tz = typeof body.tz === "string" ? body.tz : undefined;
  if (tz !== undefined && !isTimeZone(tz)) return c.json({ error: "unknown timezone" }, 400);
  const homeHour = isHomeHour(body.homeHour) ? body.homeHour : undefined;

  if (tz === undefined && homeHour === undefined) return c.json({ error: "nothing to set" }, 400);
  const ok = await room(c.env, id).saveSetup(me, { clock: { tz, homeHour } });
  return ok ? c.json({ ok: true }) : c.json({ error: "not yours to set" }, 403);
});
