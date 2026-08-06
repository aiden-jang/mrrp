import { Hono } from "hono";
import type { Action, Mood } from "./types.js";
import type { Env } from "./env.js";

export { Room } from "./room.js";

const app = new Hono<{ Bindings: Env }>();
const ROOM_RE = /^[a-z0-9]{6,24}$/;
const VALID: Action[] = ["pet", "brush", "bring", "sit", "photo"];
const VALID_MOODS: Mood[] = ["good", "tired", "stressed", "sad", "lonely", "bored", "feral", "done", "horny"];

const room = (env: Env, id: string) => env.ROOM.get(env.ROOM.idFromName(id));

app.get("/api/health", (c) => c.json({ ok: true }));

/** Read the room. `me` is a token the browser keeps; it is the whole notion of identity here. */
app.get("/api/room/:id", async (c) => {
  const id = c.req.param("id");
  const me = c.req.query("me") ?? "";
  if (!ROOM_RE.test(id) || me.length < 8) return c.json({ error: "bad request" }, 400);
  return c.json(await room(c.env, id).view(me, c.req.query("name") ?? null));
});

app.post("/api/room/:id/act", async (c) => {
  const id = c.req.param("id");
  const body = (await c.req.json().catch(() => null)) as { me?: string; action?: Action } | null;
  if (!ROOM_RE.test(id) || !body?.me || !VALID.includes(body.action as Action)) {
    return c.json({ error: "bad request" }, 400);
  }
  return c.json(await room(c.env, id).act(body.me, body.action as Action));
});

/** Tell the cat how you are. Validated against the fixed set; anything else is a 400, not a new mood. */
app.post("/api/room/:id/tell", async (c) => {
  const id = c.req.param("id");
  const body = (await c.req.json().catch(() => null)) as { me?: string; mood?: Mood } | null;
  if (!ROOM_RE.test(id) || !body?.me || !VALID_MOODS.includes(body.mood as Mood)) {
    return c.json({ error: "bad request" }, 400);
  }
  return c.json(await room(c.env, id).tell(body.me, body.mood as Mood));
});

/** Leave him a line. Hers to write; the Room re-checks the seat. Empty text clears it. */
app.post("/api/room/:id/say", async (c) => {
  const id = c.req.param("id");
  const body = (await c.req.json().catch(() => null)) as { me?: string; text?: unknown } | null;
  if (!ROOM_RE.test(id) || !body?.me || typeof body.text !== "string") {
    return c.json({ error: "bad request" }, 400);
  }
  return c.json(await room(c.env, id).say(body.me, body.text));
});

/** Set her name and colours. His to set, and the Room re-checks that. */
app.post("/api/room/:id/dress", async (c) => {
  const id = c.req.param("id");
  if (!ROOM_RE.test(id)) return c.json({ error: "bad request" }, 400);
  const body = (await c.req.json().catch(() => ({}))) as Record<string, unknown>;
  const me = typeof body.me === "string" ? body.me : "";
  if (me.length < 8) return c.json({ error: "bad request" }, 400);
  const pick = <T>(k: string, ok: (v: unknown) => boolean): T | undefined =>
    ok(body[k]) ? (body[k] as T) : undefined;
  const hex = (v: unknown) => typeof v === "string" && /^#[0-9a-f]{6}$/i.test(v);
  const ok = await room(c.env, id).dress(me, {
    name: pick<string>("name", (v) => typeof v === "string" && (v as string).length <= 24),
    fur: pick<string>("fur", hex),
    furDk: pick<string>("furDk", hex),
    belly: pick<string>("belly", hex),
    eyes: pick<string>("eyes", hex),
    tabby: pick<boolean>("tabby", (v) => typeof v === "boolean"),
  });
  return ok ? c.json({ ok: true }) : c.json({ error: "not yours to set" }, 403);
});

/**
 * Replace this room's notes. His only.
 *
 * One per entry, trimmed and capped in the Durable Object. An empty list means "use the defaults".
 */
app.post("/api/room/:id/notes", async (c) => {
  const id = c.req.param("id");
  if (!ROOM_RE.test(id)) return c.json({ error: "bad request" }, 400);
  const body = (await c.req.json().catch(() => ({}))) as { me?: unknown; notes?: unknown };
  const me = typeof body.me === "string" ? body.me : "";
  if (me.length < 8) return c.json({ error: "bad request" }, 400);
  if (!Array.isArray(body.notes) || body.notes.some((n) => typeof n !== "string")) {
    return c.json({ error: "bad request" }, 400);
  }
  const ok = await room(c.env, id).setNotes(me, body.notes as string[]);
  return ok ? c.json({ ok: true }) : c.json({ error: "not yours to set" }, 403);
});

/**
 * Free her seat, so a new phone can be her.
 *
 * The only recovery this app has. A seat is a random token in localStorage, so clearing browser data
 * or changing device otherwise loses it forever, and with two seats and no way to release one the room
 * would be permanently stuck with nobody able to be the cat.
 *
 * His to call, checked in the Durable Object rather than here.
 */
app.post("/api/room/:id/release", async (c) => {
  const id = c.req.param("id");
  if (!ROOM_RE.test(id)) return c.json({ error: "bad request" }, 400);
  const body = (await c.req.json().catch(() => ({}))) as { me?: unknown };
  const me = typeof body.me === "string" ? body.me : "";
  if (me.length < 8) return c.json({ error: "bad request" }, 400);
  const ok = await room(c.env, id).releaseHerSeat(me);
  return ok ? c.json({ ok: true }) : c.json({ error: "not yours to release" }, 403);
});

/**
 * Whose day the room runs on. Validated here rather than trusted: an unchecked timezone string
 * reaches Intl.DateTimeFormat inside the DO, where it throws and takes the whole room down.
 */
app.post("/api/room/:id/clock", async (c) => {
  const id = c.req.param("id");
  if (!ROOM_RE.test(id)) return c.json({ error: "bad request" }, 400);
  const body = (await c.req.json().catch(() => ({}))) as { me?: unknown; tz?: unknown; homeHour?: unknown };
  const me = typeof body.me === "string" ? body.me : "";
  if (me.length < 8) return c.json({ error: "bad request" }, 400);

  let tz: string | undefined;
  if (typeof body.tz === "string") {
    try {
      new Intl.DateTimeFormat("en-CA", { timeZone: body.tz });
      tz = body.tz;
    } catch {
      return c.json({ error: "unknown timezone" }, 400);
    }
  }
  const homeHour =
    typeof body.homeHour === "number" && Number.isInteger(body.homeHour) && body.homeHour >= 0 && body.homeHour <= 23
      ? body.homeHour
      : undefined;

  if (tz === undefined && homeHour === undefined) return c.json({ error: "nothing to set" }, 400);
  const ok = await room(c.env, id).setClock(me, { tz, homeHour });
  return ok ? c.json({ ok: true }) : c.json({ error: "not yours to set" }, 403);
});

/**
 * Room links are client-side routes (/r/<id>), so no file exists at that path. Assets are matched
 * first and miss, then this hands back index.html. Using not_found_handling = "single-page-application"
 * instead would swallow /api/* before the Worker ever saw it.
 */
app.get("/r/:id", (c) => c.env.ASSETS.fetch(new Request(new URL("/", c.req.url))));

export default { fetch: app.fetch } satisfies ExportedHandler<Env>;
