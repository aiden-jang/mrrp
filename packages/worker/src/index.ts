import { Hono, type Context, type Next } from "hono";
import { getSessionUser } from "@aidenjang/auth-client";
import type { Action, CatAct, Gift, Mood, Treat } from "./types.js";
import type { Tally, TallyKey } from "./remembers.js";
import type { Env } from "./env.js";
import { ROOM_GONE } from "./room.js";

export { Room } from "./room.js";

const app = new Hono<{ Bindings: Env }>();
const ROOM_RE = /^[a-z0-9]{6,24}$/;
// Fifteen by nine. The room checks the same thing again; this is the cheap gate at the door.
const DOODLE_RE = /^[0-4]{135}$/;
const VALID: Action[] = ["pet", "brush", "sit", "photo"];
const VALID_CAT_ACTS: CatAct[] = ["shelf", "box"];
const VALID_GIFTS: Gift[] = ["leaf", "cap", "moth"];
const VALID_TREATS: Treat[] = ["yarn", "treat", "catnip"];
// The things in the room you can touch. An unknown key is a 400, not a new prop, for the same reason
// `found` refuses one: the client does not get to invent room furniture.
const VALID_POKES = ["window", "frame", "shelf", "door", "plant", "bed", "box", "floor"];
const TALLY_KEYS: TallyKey[] = ["pet", "brush", "sit", "photo", "leaveout"];
const VALID_MOODS: Mood[] = ["good", "tired", "stressed", "sad", "lonely", "bored", "feral", "done", "horny"];

const room = (env: Env, id: string) => env.ROOM.get(env.ROOM.idFromName(id));

// Forward, never parse: this Worker must not hold the session secret. An outage reads as "not
// signed in", which the whole app works in.
async function accountOf(request: Request, env: Env): Promise<string | null> {
  try {
    const user = await getSessionUser(request, env.AUTH_URL);
    return user?.id ?? null;
  } catch {
    return null;
  }
}

// One place, so a deleted room answers the same way on every route rather than each one remembering.
app.onError((err, c) => {
  if (err.message === ROOM_GONE) return c.json({ error: "gone" }, 410);
  throw err;
});

app.get("/api/health", (c) => c.json({ ok: true }));

// Same-origin on purpose: only this Worker may forward the auth cookie.
app.get("/api/me", async (c) => {
  const user = await getSessionUser(c.req.raw, c.env.AUTH_URL).catch(() => null);
  return c.json({ signedIn: !!user, name: user?.displayName ?? null });
});

/*
 * The live channel, one socket per open tab.
 *
 * The only route that hands the raw request to the Durable Object: a 101 upgrade cannot come back
 * through RPC. The room re-checks the seat, so nothing here is the last line.
 */
app.get("/api/room/:id/live", async (c) => {
  const id = c.req.param("id");
  const me = c.req.query("me") ?? "";
  if (!ROOM_RE.test(id) || me.length < 8) return c.json({ error: "bad request" }, 400);
  if (c.req.header("upgrade")?.toLowerCase() !== "websocket") {
    return c.json({ error: "expected websocket" }, 426);
  }
  return room(c.env, id).fetch(c.req.raw);
});

/*
 * Push the room to both tabs after anything that changed it.
 *
 * One place, not a broadcast at the end of each of the twenty-odd methods that write: that list is
 * complete on the day it is written. The plain GET is in here too and has to be, because reading the
 * room spends what he left out, which is the moment he most wants to see.
 */
const pushAfter = async (c: Context<{ Bindings: Env }>, next: Next) => {
  await next();
  const id = c.req.param("id") ?? "";
  if (!ROOM_RE.test(id) || c.res.status >= 400) return;
  // Swallowed on purpose: a push that fails must not turn a write that worked into an error, and
  // the one failure that matters, a room deleted mid-request, closes the sockets on its way out.
  c.executionCtx.waitUntil(
    room(c.env, id)
      .notify()
      .catch(() => {}),
  );
};

// Named exactly rather than with a wildcard. `/live` hands back a socket and has already broadcast,
// and the notes fetch changes nothing, so neither should wake the other tab.
app.on(["GET"], "/api/room/:id", pushAfter);
app.on(["POST"], "/api/room/:id/*", pushAfter);

// His notes, for the panel that edits them. Not in RoomView: see `notesFor`.
app.get("/api/room/:id/notes", async (c) => {
  const id = c.req.param("id");
  const me = c.req.query("me") ?? "";
  if (!ROOM_RE.test(id) || me.length < 8) return c.json({ error: "bad request" }, 400);
  const notes = await room(c.env, id).notesFor(me);
  if (!notes) return c.json({ error: "not yours" }, 403);
  return c.json({ notes });
});

app.get("/api/room/:id", async (c) => {
  const id = c.req.param("id");
  const me = c.req.query("me") ?? "";
  if (!ROOM_RE.test(id) || me.length < 8) return c.json({ error: "bad request" }, 400);
  const account = await accountOf(c.req.raw, c.env);
  try {
    return c.json(await room(c.env, id).view(me, c.req.query("name") ?? null, account));
  } catch (e) {
    // Not the shared gone-handler below: this is the one route that says more than "gone", because
    // whoever deleted the room can still put it back and lands here when he did not mean it.
    if ((e as Error).message !== ROOM_GONE) throw e;
    return c.json({ error: "gone", undoUntil: await room(c.env, id).undoUntil(me) }, 410);
  }
});

app.post("/api/room/:id/act", async (c) => {
  const id = c.req.param("id");
  const body = (await c.req.json().catch(() => null)) as { me?: string; action?: Action } | null;
  if (!ROOM_RE.test(id) || !body?.me || !VALID.includes(body.action as Action)) {
    return c.json({ error: "bad request" }, 400);
  }
  return c.json(await room(c.env, id).act(body.me, body.action as Action));
});

app.post("/api/room/:id/heract", async (c) => {
  const id = c.req.param("id");
  const body = (await c.req.json().catch(() => null)) as { me?: string; act?: CatAct } | null;
  if (!ROOM_RE.test(id) || !body?.me || !VALID_CAT_ACTS.includes(body.act as CatAct)) {
    return c.json({ error: "bad request" }, 400);
  }
  return c.json(await room(c.env, id).herAct(body.me, body.act as CatAct));
});

app.post("/api/room/:id/poke", async (c) => {
  const id = c.req.param("id");
  const body = (await c.req.json().catch(() => null)) as { me?: string; what?: string } | null;
  if (!ROOM_RE.test(id) || !body?.me || !VALID_POKES.includes(body.what ?? "")) {
    return c.json({ error: "bad request" }, 400);
  }
  return c.json(await room(c.env, id).poke(body.me, body.what!));
});

app.post("/api/room/:id/hold", async (c) => {
  const id = c.req.param("id");
  const body = (await c.req.json().catch(() => null)) as { me?: string; on?: boolean } | null;
  if (!ROOM_RE.test(id) || !body?.me || typeof body.on !== "boolean") {
    return c.json({ error: "bad request" }, 400);
  }
  return c.json(await room(c.env, id).hold(body.me, body.on));
});

app.post("/api/room/:id/boxout", async (c) => {
  const id = c.req.param("id");
  const body = (await c.req.json().catch(() => null)) as { me?: string; on?: boolean } | null;
  if (!ROOM_RE.test(id) || !body?.me) return c.json({ error: "bad request" }, 400);
  // Defaults to putting one out, so an older client that sends no `on` still works.
  return c.json(await room(c.env, id).putBoxOut(body.me, body.on ?? true));
});

app.post("/api/room/:id/leaveout", async (c) => {
  const id = c.req.param("id");
  const body = (await c.req.json().catch(() => null)) as { me?: string; treat?: Treat } | null;
  if (!ROOM_RE.test(id) || !body?.me || !VALID_TREATS.includes(body.treat as Treat)) {
    return c.json({ error: "bad request" }, 400);
  }
  return c.json(await room(c.env, id).leaveOut(body.me, body.treat as Treat));
});

app.post("/api/room/:id/gift", async (c) => {
  const id = c.req.param("id");
  const body = (await c.req.json().catch(() => null)) as { me?: string; gift?: Gift } | null;
  if (!ROOM_RE.test(id) || !body?.me || !VALID_GIFTS.includes(body.gift as Gift)) {
    return c.json({ error: "bad request" }, 400);
  }
  return c.json(await room(c.env, id).leaveGift(body.me, body.gift as Gift));
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

// Dev only, gated on DEV_TOOLS in `.dev.vars`, which `wrangler deploy` never uploads. Don't gate
// on hostname: `wrangler dev` rewrites the URL to the configured route, so local looks like prod.
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
        // The tally keys, not the buttons: "leaveout" is what "fed" is made of and is not an action.
        TALLY_KEYS.filter((key) => count(rawTally[key]) !== undefined).map((key) => [
          key,
          Math.floor(rawTally[key] as number),
        ]),
      )
    : undefined;

  return c.json(
    await room(c.env, id).age(me, {
      days: count(body.days),
      homing:
        typeof body.homingHour === "number"
          ? {
              hour: Math.max(0, Math.min(24, body.homingHour)),
              days: Math.max(1, Math.min(400, count(body.homingDays) ?? 20)),
              lastDay: 0,
            }
          : undefined,
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

app.post("/api/room/:id/delete", async (c) => {
  const id = c.req.param("id");
  if (!ROOM_RE.test(id)) return c.json({ error: "bad request" }, 400);
  const body = (await c.req.json().catch(() => ({}))) as { me?: unknown; name?: unknown };
  const me = typeof body.me === "string" ? body.me : "";
  const name = typeof body.name === "string" ? body.name : "";
  if (me.length < 8 || !name) return c.json({ error: "bad request" }, 400);
  const erasesAt = await room(c.env, id).deleteRoom(me, name);
  return erasesAt ? c.json({ ok: true, undoUntil: erasesAt }) : c.json({ error: "not yours to delete" }, 403);
});

app.get("/api/room/:id/export", async (c) => {
  const id = c.req.param("id");
  const me = c.req.query("me") ?? "";
  if (!ROOM_RE.test(id) || me.length < 8) return c.json({ error: "bad request" }, 400);

  const copy = await room(c.env, id).exportFor(me);
  if (!copy) return c.json({ error: "not your room to copy" }, 403);

  // Name it for the room and date it: this lands in a downloads folder next to everything else.
  const day = new Date().toISOString().slice(0, 10);
  return new Response(JSON.stringify(copy, null, 2), {
    headers: {
      "content-type": "application/json; charset=utf-8",
      "content-disposition": `attachment; filename="mrrp-${id}-${day}.json"`,
    },
  });
});

app.post("/api/room/:id/blanket", async (c) => {
  const id = c.req.param("id");
  if (!ROOM_RE.test(id)) return c.json({ error: "bad request" }, 400);
  const body = (await c.req.json().catch(() => ({}))) as { me?: unknown; key?: unknown; stripe?: unknown };
  const me = typeof body.me === "string" ? body.me : "";
  if (me.length < 8) return c.json({ error: "bad request" }, 400);
  const ok = await room(c.env, id).setBlanket(me, body.key, body.stripe);
  return ok ? c.json({ ok: true }) : c.json({ error: "not hers to change, or not a blanket" }, 403);
});

app.post("/api/room/:id/unleave", async (c) => {
  const id = c.req.param("id");
  if (!ROOM_RE.test(id)) return c.json({ error: "bad request" }, 400);
  const body = (await c.req.json().catch(() => ({}))) as { me?: unknown };
  const me = typeof body.me === "string" ? body.me : "";
  if (me.length < 8) return c.json({ error: "bad request" }, 400);
  const ok = await room(c.env, id).unleave(me);
  return ok ? c.json({ ok: true }) : c.json({ error: "too late, or the seat is taken" }, 403);
});

app.post("/api/room/:id/undelete", async (c) => {
  const id = c.req.param("id");
  if (!ROOM_RE.test(id)) return c.json({ error: "bad request" }, 400);
  const body = (await c.req.json().catch(() => ({}))) as { me?: unknown };
  const me = typeof body.me === "string" ? body.me : "";
  if (me.length < 8) return c.json({ error: "bad request" }, 400);
  const ok = await room(c.env, id).undelete(me);
  return ok ? c.json({ ok: true }) : c.json({ error: "too late, or not yours" }, 403);
});

app.post("/api/room/:id/leave", async (c) => {
  const id = c.req.param("id");
  if (!ROOM_RE.test(id)) return c.json({ error: "bad request" }, 400);
  const body = (await c.req.json().catch(() => ({}))) as { me?: unknown };
  const me = typeof body.me === "string" ? body.me : "";
  if (me.length < 8) return c.json({ error: "bad request" }, 400);
  const ok = await room(c.env, id).leaveRoom(me);
  return ok ? c.json({ ok: true }) : c.json({ error: "not your seat to leave" }, 403);
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
