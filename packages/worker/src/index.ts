import { Hono } from "hono";
import { getSessionUser } from "@aidenjang/auth-client";
import type { Action, Mood } from "./types.js";
import type { Tally } from "./remembers.js";
import type { Env } from "./env.js";

export { Room } from "./room.js";

const app = new Hono<{ Bindings: Env }>();
const ROOM_RE = /^[a-z0-9]{6,24}$/;
const DOODLE_RE = /^[0-4]{35}$/;
const VALID: Action[] = ["pet", "brush", "bring", "sit", "photo"];
const VALID_MOODS: Mood[] = ["good", "tired", "stressed", "sad", "lonely", "bored", "feral", "done", "horny"];

const room = (env: Env, id: string) => env.ROOM.get(env.ROOM.idFromName(id));

// Forwarded, not parsed: this Worker never holds the session secret. An outage means "not signed
// in", which is a state the whole app works in.
async function accountOf(request: Request, env: Env): Promise<string | null> {
  try {
    const user = await getSessionUser(request, env.AUTH_URL);
    return user?.id ?? null;
  } catch {
    return null;
  }
}

app.get("/api/health", (c) => c.json({ ok: true }));

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

app.post("/api/room/:id/tell", async (c) => {
  const id = c.req.param("id");
  const body = (await c.req.json().catch(() => null)) as { me?: string; mood?: Mood } | null;
  if (!ROOM_RE.test(id) || !body?.me || !VALID_MOODS.includes(body.mood as Mood)) {
    return c.json({ error: "bad request" }, 400);
  }
  return c.json(await room(c.env, id).tell(body.me, body.mood as Mood));
});

app.post("/api/room/:id/say", async (c) => {
  const id = c.req.param("id");
  const body = (await c.req.json().catch(() => null)) as { me?: string; text?: unknown } | null;
  if (!ROOM_RE.test(id) || !body?.me || typeof body.text !== "string") {
    return c.json({ error: "bad request" }, 400);
  }
  return c.json(await room(c.env, id).say(body.me, body.text));
});

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

// Dev only. DEV_TOOLS lives in `.dev.vars`, which `wrangler deploy` never uploads. Do not gate this
// on the hostname: `wrangler dev` rewrites the URL to the configured route, so local looks exactly
// like production. Holding a seat is checked again inside the room.
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

app.post("/api/room/:id/draw", async (c) => {
  const id = c.req.param("id");
  const body = (await c.req.json().catch(() => null)) as { me?: string; cells?: unknown } | null;
  const cells = body?.cells;
  if (!ROOM_RE.test(id) || !body?.me || typeof cells !== "string" || !DOODLE_RE.test(cells)) {
    return c.json({ error: "bad request" }, 400);
  }
  return c.json(await room(c.env, id).draw(body.me, cells));
});

app.post("/api/room/:id/ourday", async (c) => {
  const id = c.req.param("id");
  if (!ROOM_RE.test(id)) return c.json({ error: "bad request" }, 400);
  const body = (await c.req.json().catch(() => ({}))) as Record<string, unknown>;
  const me = typeof body.me === "string" ? body.me : "";
  if (me.length < 8) return c.json({ error: "bad request" }, 400);

  const label = typeof body.label === "string" ? body.label.trim().slice(0, 32) : "";
  const month = typeof body.month === "number" ? Math.trunc(body.month) : 0;
  const day = typeof body.day === "number" ? Math.trunc(body.day) : 0;
  const DAYS = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  const real = month >= 1 && month <= 12 && day >= 1 && day <= DAYS[month - 1]!;
  if (label && !real) return c.json({ error: "bad request" }, 400);

  const ok = await room(c.env, id).setOurDay(me, label ? { month, day, label } : null);
  return ok ? c.json({ ok: true }) : c.json({ error: "not yours to set" }, 403);
});

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

app.post("/api/room/:id/found", async (c) => {
  const id = c.req.param("id");
  const body = (await c.req.json().catch(() => null)) as { me?: string; key?: unknown } | null;
  if (!ROOM_RE.test(id) || !body?.me) return c.json({ error: "bad request" }, 400);
  const ok = await room(c.env, id).noticed(body.me, body.key);
  return ok ? c.json({ ok: true }) : c.json({ error: "bad request" }, 400);
});

app.post("/api/room/:id/shelf", async (c) => {
  const id = c.req.param("id");
  if (!ROOM_RE.test(id)) return c.json({ error: "bad request" }, 400);
  const body = (await c.req.json().catch(() => ({}))) as { me?: unknown };
  const me = typeof body.me === "string" ? body.me : "";
  if (me.length < 8) return c.json({ error: "bad request" }, 400);
  const done = await room(c.env, id).putBack(me);
  return done ? c.json({ ok: true, again: done === "again" }) : c.json({ error: "not yours to tidy" }, 403);
});

app.post("/api/room/:id/window-light", async (c) => {
  const id = c.req.param("id");
  if (!ROOM_RE.test(id)) return c.json({ error: "bad request" }, 400);
  const body = (await c.req.json().catch(() => ({}))) as { me?: unknown };
  const me = typeof body.me === "string" ? body.me : "";
  if (me.length < 8) return c.json({ error: "bad request" }, 400);
  const next = await room(c.env, id).touchWindowLight(me);
  return next ? c.json(next) : c.json({ error: "not your room" }, 403);
});

app.post("/api/room/:id/release", async (c) => {
  const id = c.req.param("id");
  if (!ROOM_RE.test(id)) return c.json({ error: "bad request" }, 400);
  const body = (await c.req.json().catch(() => ({}))) as { me?: unknown };
  const me = typeof body.me === "string" ? body.me : "";
  if (me.length < 8) return c.json({ error: "bad request" }, 400);
  const ok = await room(c.env, id).releaseHerSeat(me);
  return ok ? c.json({ ok: true }) : c.json({ error: "not yours to release" }, 403);
});

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

app.get("/r/:id", (c) => c.env.ASSETS.fetch(new Request(new URL("/", c.req.url))));

export default { fetch: app.fetch } satisfies ExportedHandler<Env>;
