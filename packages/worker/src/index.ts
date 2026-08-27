import { Hono } from "hono";
import { getSessionUser } from "@aidenjang/auth-client";
import type { Action, Mood } from "./types.js";
import type { Tally } from "./remembers.js";
import type { Env } from "./env.js";

export { Room } from "./room.js";

const app = new Hono<{ Bindings: Env }>();
const ROOM_RE = /^[a-z0-9]{6,24}$/;
/** Seven by five cells, each an index into a five-colour palette. Nothing else is a drawing. */
const DOODLE_RE = /^[0-4]{35}$/;
const VALID: Action[] = ["pet", "brush", "bring", "sit", "photo"];
const VALID_MOODS: Mood[] = ["good", "tired", "stressed", "sad", "lonely", "bored", "feral", "done", "horny"];

const room = (env: Env, id: string) => env.ROOM.get(env.ROOM.idFromName(id));

/**
 * Who is signed in, if anybody.
 *
 * The cookie is forwarded to the auth service rather than parsed here, which is the point of the
 * shared session: this Worker never holds the secret and cannot be the thing that leaks it. An
 * outage returns null, which this app treats as "not signed in" rather than as an error, because a
 * room has never needed an account and must keep working without one.
 */
async function accountOf(request: Request, env: Env): Promise<string | null> {
  try {
    const user = await getSessionUser(request, env.AUTH_URL);
    return user?.id ?? null;
  } catch {
    return null;
  }
}

app.get("/api/health", (c) => c.json({ ok: true }));

/** Read the room. `me` is a token the browser keeps; it is the whole notion of identity here. */
app.get("/api/room/:id", async (c) => {
  const id = c.req.param("id");
  const me = c.req.query("me") ?? "";
  if (!ROOM_RE.test(id) || me.length < 8) return c.json({ error: "bad request" }, 400);
  const account = await accountOf(c.req.raw, c.env);
  return c.json(await room(c.env, id).view(me, c.req.query("name") ?? null, account));
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

/**
 * Tie the seat you are holding to the account you are signed into, or let it go.
 *
 * Optional, and never a step on the way in: the link still works with no account at all. What it buys
 * is one thing, which is that a new phone can be handed this seat's token after signing in, instead
 * of needing the recovery code typed in.
 */
app.post("/api/room/:id/link", async (c) => {
  const id = c.req.param("id");
  const body = (await c.req.json().catch(() => ({}))) as { me?: unknown; on?: unknown };
  const me = typeof body.me === "string" ? body.me : "";
  if (!ROOM_RE.test(id) || me.length < 8) return c.json({ error: "bad request" }, 400);

  const account = await accountOf(c.req.raw, c.env);
  if (!account) return c.json({ error: "not signed in" }, 401);

  const ok = await room(c.env, id).linkAccount(me, account, body.on !== false);
  return ok ? c.json({ ok: true }) : c.json({ error: "that account already has a seat here" }, 409);
});

/**
 * Fast-forward a room, so the states that take months can be looked at in a minute.
 *
 * Gated on DEV_TOOLS, which lives in `.dev.vars`: read by `wrangler dev`, never uploaded by
 * `wrangler deploy`, and already gitignored. The first attempt checked the hostname instead, on the
 * reasoning that this Worker has one custom-domain route and no workers.dev address. That gate does
 * not work: `wrangler dev` rewrites the request URL to the configured route, so the local Worker sees
 * mrrp.aidenjang.com exactly as production does and the check cannot tell them apart.
 *
 * Holding a seat is required on top of that, inside the Durable Object. Everything it writes is
 * reachable by ordinary use given enough months; nothing here puts a room into a state a real room
 * could not be in.
 */
app.post("/api/room/:id/age", async (c) => {
  if (c.env.DEV_TOOLS !== "on") return c.json({ error: "not found" }, 404);

  const id = c.req.param("id");
  if (!ROOM_RE.test(id)) return c.json({ error: "bad request" }, 400);
  const body = (await c.req.json().catch(() => ({}))) as Record<string, unknown>;
  const me = typeof body.me === "string" ? body.me : "";
  if (me.length < 8) return c.json({ error: "bad request" }, 400);

  const count = (v: unknown) => (typeof v === "number" && Number.isFinite(v) && v >= 0 ? v : undefined);
  const rawTally = (body.tally ?? null) as Record<string, unknown> | null;
  const tally: Tally | undefined = rawTally
    ? Object.fromEntries(
        VALID.filter((action) => count(rawTally[action]) !== undefined).map((action) => [
          action,
          Math.floor(rawTally[action] as number),
        ]),
      )
    : undefined;

  return c.json(
    await room(c.env, id).age(me, {
      days: count(body.days),
      tally,
      noteIdx: count(body.noteIdx),
      awayHours: count(body.awayHours),
    }),
  );
});

/**
 * Put a drawing in the frame. Either seat.
 *
 * The shape is checked here and again in the Room. Thirty-five characters of "0" to "4" is the whole
 * grammar, so anything that is not exactly that never reaches storage and never reaches a canvas.
 */
app.post("/api/room/:id/draw", async (c) => {
  const id = c.req.param("id");
  const body = (await c.req.json().catch(() => null)) as { me?: string; cells?: unknown } | null;
  const cells = body?.cells;
  if (!ROOM_RE.test(id) || !body?.me || typeof cells !== "string" || !DOODLE_RE.test(cells)) {
    return c.json({ error: "bad request" }, 400);
  }
  return c.json(await room(c.env, id).draw(body.me, cells));
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
 * Take a seat back on a new device, with that seat's recovery code.
 *
 * One box for both of them. His was always the only code, on the reasoning that she could be restored
 * because he can free her seat: true, but it left her needing him to notice, and left her with nothing
 * at all if he is the one who is away. The Room decides which seat a code belongs to.
 */
app.post("/api/room/:id/recover", async (c) => {
  const id = c.req.param("id");
  if (!ROOM_RE.test(id)) return c.json({ error: "bad request" }, 400);
  const body = (await c.req.json().catch(() => ({}))) as { me?: unknown; code?: unknown };
  const me = typeof body.me === "string" ? body.me : "";
  const code = typeof body.code === "string" ? body.code : "";
  if (me.length < 8 || code.length < 8) return c.json({ error: "bad request" }, 400);
  const ok = await room(c.env, id).recoverSeat(me, code);
  return ok ? c.json({ ok: true }) : c.json({ error: "that code does not match" }, 403);
});

/*
 * "I found the thing." Reported by the client the first time a secret fires on that device, so it is
 * chatty by nature: the DO answers ok for a key it already knew rather than making the client track
 * what the server has. Unknown keys are refused, since the allowlist lives on this side.
 */
app.post("/api/room/:id/found", async (c) => {
  const id = c.req.param("id");
  const body = (await c.req.json().catch(() => null)) as { me?: string; key?: unknown } | null;
  if (!ROOM_RE.test(id) || !body?.me) return c.json({ error: "bad request" }, 400);
  const ok = await room(c.env, id).noticed(body.me, body.key);
  return ok ? c.json({ ok: true }) : c.json({ error: "bad request" }, 400);
});

/** Put the thing she knocked off back on the shelf. Either seat; the Room re-checks. */
app.post("/api/room/:id/shelf", async (c) => {
  const id = c.req.param("id");
  if (!ROOM_RE.test(id)) return c.json({ error: "bad request" }, 400);
  const body = (await c.req.json().catch(() => ({}))) as { me?: unknown };
  const me = typeof body.me === "string" ? body.me : "";
  if (me.length < 8) return c.json({ error: "bad request" }, 400);
  const done = await room(c.env, id).putBack(me);
  // `again` means she was watching you do it. The client waits a beat and then plays it.
  return done ? c.json({ ok: true, again: done === "again" }) : c.json({ error: "not yours to tidy" }, 403);
});

/** Leave a light in the window, or collect the one the other person left. Either seat, never a spectator. */
app.post("/api/room/:id/window-light", async (c) => {
  const id = c.req.param("id");
  if (!ROOM_RE.test(id)) return c.json({ error: "bad request" }, 400);
  const body = (await c.req.json().catch(() => ({}))) as { me?: unknown };
  const me = typeof body.me === "string" ? body.me : "";
  if (me.length < 8) return c.json({ error: "bad request" }, 400);
  const next = await room(c.env, id).touchWindowLight(me);
  return next ? c.json(next) : c.json({ error: "not your room" }, 403);
});

/**
 * Free her seat, so a new phone can be her. A seat is a random token in localStorage, so clearing
 * browser data otherwise loses it forever and leaves the room with nobody able to be the cat.
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
    typeof body.homeHour === "number" &&
    Number.isInteger(body.homeHour) &&
    body.homeHour >= 0 &&
    body.homeHour <= 23
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
