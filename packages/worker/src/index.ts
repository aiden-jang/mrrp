import { Hono } from "hono";
import type { Action } from "./types.js";
import type { Env } from "./env.js";

export { Room } from "./room.js";

const app = new Hono<{ Bindings: Env }>();
const ROOM_RE = /^[a-z0-9]{6,24}$/;
const VALID: Action[] = ["pet", "brush", "feed", "sit"];

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

/** Set her name and colours. Called once, when you first make the room. */
app.post("/api/room/:id/dress", async (c) => {
  const id = c.req.param("id");
  if (!ROOM_RE.test(id)) return c.json({ error: "bad request" }, 400);
  const body = (await c.req.json().catch(() => ({}))) as Record<string, unknown>;
  const pick = <T>(k: string, ok: (v: unknown) => boolean): T | undefined =>
    ok(body[k]) ? (body[k] as T) : undefined;
  const hex = (v: unknown) => typeof v === "string" && /^#[0-9a-f]{6}$/i.test(v);
  await room(c.env, id).dress({
    name: pick<string>("name", (v) => typeof v === "string" && (v as string).length <= 24),
    fur: pick<string>("fur", hex),
    furDk: pick<string>("furDk", hex),
    belly: pick<string>("belly", hex),
    eyes: pick<string>("eyes", hex),
    tabby: pick<boolean>("tabby", (v) => typeof v === "boolean"),
  });
  return c.json({ ok: true });
});

/**
 * Whose day the room runs on. Validated here rather than trusted: an unchecked timezone string
 * reaches Intl.DateTimeFormat inside the DO, where it throws and takes the whole room down.
 */
app.post("/api/room/:id/clock", async (c) => {
  const id = c.req.param("id");
  if (!ROOM_RE.test(id)) return c.json({ error: "bad request" }, 400);
  const body = (await c.req.json().catch(() => ({}))) as { tz?: unknown; homeHour?: unknown };

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
  await room(c.env, id).setClock({ tz, homeHour });
  return c.json({ ok: true });
});

/**
 * Room links are client-side routes (/r/<id>), so no file exists at that path. Assets are matched
 * first and miss, then this hands back index.html. Using not_found_handling = "single-page-application"
 * instead would swallow /api/* before the Worker ever saw it.
 */
app.get("/r/:id", (c) => c.env.ASSETS.fetch(new Request(new URL("/", c.req.url))));

export default { fetch: app.fetch } satisfies ExportedHandler<Env>;
