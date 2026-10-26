import { isSeatToken } from "./seatToken.js";
import { accountOf } from "./accountOf.js";
import { handleAnalytics } from "../../../analytics/worker.js";
import { isRoomDecor } from "./decor.js";
import { Hono, type Context, type Next } from "hono";
import { resolveSession } from "@aidenjang/auth-client";
import type { Action, CatAct, Gift, Mood, Treat, Untrusted } from "./types.js";
import { ACTIONS, GIFTS, TREATS } from "./types.js";
import type { Tally, TallyKey } from "./remembers.js";
import type { Env } from "./env.js";
import { ROOM_GONE } from "./room.js";
import { privateResponses } from "./privateResponses.js";

export { Room } from "./room.js";

const app = new Hono<{ Bindings: Env }>();
app.use("/api/*", privateResponses);
const ROOM_RE = /^[a-z0-9]{6,24}$/;
const DOODLE_RE = /^[0-4]{135}$/;
const VALID: Action[] = ACTIONS.map((a) => a.id);
// Gifts carry her words through their own endpoint, never the wordless act route.
const VALID_CAT_ACTS: CatAct[] = ["shelf", "box"];
const VALID_GIFTS: Gift[] = GIFTS.map((g) => g.id);
const VALID_TREATS: Treat[] = TREATS.map((t) => t.id);
// Unknown touch targets must be rejected, not become new props.
const VALID_POKES = ["window", "frame", "shelf", "door", "plant", "bed", "box", "floor"];
const TALLY_KEYS: TallyKey[] = ["pet", "brush", "sit", "photo", "leaveout"];
const VALID_MOODS: Mood[] = ["good", "tired", "stressed", "sad", "lonely", "bored", "feral", "done", "horny"];

const room = (env: Env, id: string) => env.ROOM.get(env.ROOM.idFromName(id));

// One place, so a deleted room answers the same way on every route rather than each one remembering.
app.onError((err, c) => {
  if (err.message === ROOM_GONE) return c.json({ error: "gone" }, 410);
  throw err;
});

app.all("/api/analytics", (c) => handleAnalytics(c.req.raw, c.env));

app.get("/api/health", (c) => c.json({ ok: true }));

// Same-origin on purpose: only this Worker may forward the auth cookie.
app.get("/api/me", async (c) => {
  // An outage reads as signed out here on purpose: the anonymous app is the honest degraded
  // state. Linking a seat is the route that has to tell them apart.
  const session = await resolveSession(c.req.raw, c.env.AUTH_URL);
  const user = session.state === "signed-in" ? session.user : null;
  return c.json({ signedIn: !!user, name: user?.displayName ?? null });
});

// Pass socket upgrades through to the Durable Object without rebuilding the 101 response.
app.get("/api/room/:id/live", async (c) => {
  const id = c.req.param("id");
  const me = c.req.query("me") ?? "";
  if (!ROOM_RE.test(id) || !isSeatToken(me)) return c.json({ error: "bad request" }, 400);
  if (c.req.header("upgrade")?.toLowerCase() !== "websocket") {
    return c.json({ error: "expected websocket" }, 426);
  }
  return room(c.env, id).fetch(c.req.raw);
});

const pushAfter = async (c: Context<{ Bindings: Env }>, next: Next) => {
  await next();
  const id = c.req.param("id") ?? "";
  if (!ROOM_RE.test(id) || c.res.status >= 400) return;
  // Swallowed on purpose: a push that fails must not turn a write that worked into an error.
  c.executionCtx.waitUntil(
    room(c.env, id)
      .notify()
      .catch(() => {}),
  );
};

// Named exactly rather than with a wildcard. `/live` hands back a socket and has already broadcast.
app.on(["GET"], "/api/room/:id", pushAfter);
app.on(["POST"], "/api/room/:id/*", pushAfter);

// Whether the room is still there, for the door screen, which must not seat anybody to find out.
app.get("/api/room/:id/alive", async (c) => {
  const id = c.req.param("id");
  if (!ROOM_RE.test(id)) return c.json({ error: "bad request" }, 400);
  return c.json(await room(c.env, id).alive());
});

app.get("/api/room/:id/notes", async (c) => {
  const id = c.req.param("id");
  const me = c.req.query("me") ?? "";
  if (!ROOM_RE.test(id) || !isSeatToken(me)) return c.json({ error: "bad request" }, 400);
  const notes = await room(c.env, id).notesFor(me);
  if (!notes) return c.json({ error: "not yours" }, 403);
  return c.json({ notes });
});

app.get("/api/room/:id/said", async (c) => {
  const id = c.req.param("id");
  const me = c.req.query("me") ?? "";
  if (!ROOM_RE.test(id) || !isSeatToken(me)) return c.json({ error: "bad request" }, 400);
  const said = await room(c.env, id).saidSoFar(me);
  if (!said) return c.json({ error: "not yours" }, 403);
  return c.json(said);
});

app.get("/api/room/:id", async (c) => {
  const id = c.req.param("id");
  const me = c.req.query("me") ?? "";
  if (!ROOM_RE.test(id) || !isSeatToken(me)) return c.json({ error: "bad request" }, 400);
  const account = await accountOf(c.req.raw, c.env);
  try {
    const who = account.state === "signed-in" ? account.id : null;
    return c.json(await room(c.env, id).view(me, c.req.query("name") ?? null, who));
  } catch (e) {
    // Not the shared gone-handler below: this is the one route that says more than "gone", because
    // whoever deleted the room can still put it back.
    if ((e as Error).message !== ROOM_GONE) throw e;
    return c.json({ error: "gone", undoUntil: await room(c.env, id).undoUntil(me) }, 410);
  }
});

app.post("/api/room/:id/act", async (c) => {
  const id = c.req.param("id");
  const body = (await c.req.json().catch(() => null)) as Untrusted<"act"> | null;
  if (!ROOM_RE.test(id) || !isSeatToken(body?.me) || !VALID.includes(body.action as Action)) {
    return c.json({ error: "bad request" }, 400);
  }
  return c.json(await room(c.env, id).act(body.me, body.action as Action));
});

app.post("/api/room/:id/heract", async (c) => {
  const id = c.req.param("id");
  const body = (await c.req.json().catch(() => null)) as Untrusted<"heract"> | null;
  if (!ROOM_RE.test(id) || !isSeatToken(body?.me) || !VALID_CAT_ACTS.includes(body.act as CatAct)) {
    return c.json({ error: "bad request" }, 400);
  }
  return c.json(await room(c.env, id).herAct(body.me, body.act as CatAct));
});

app.post("/api/room/:id/poke", async (c) => {
  const id = c.req.param("id");
  const body = (await c.req.json().catch(() => null)) as Untrusted<"poke"> | null;
  if (!ROOM_RE.test(id) || !isSeatToken(body?.me) || !VALID_POKES.includes(body.what ?? "")) {
    return c.json({ error: "bad request" }, 400);
  }
  return c.json(await room(c.env, id).poke(body.me, body.what!));
});

app.post("/api/room/:id/wait", async (c) => {
  const id = c.req.param("id");
  const body = (await c.req.json().catch(() => null)) as Untrusted<"wait"> | null;
  if (!ROOM_RE.test(id) || !isSeatToken(body?.me) || typeof body.on !== "boolean") {
    return c.json({ error: "bad request" }, 400);
  }
  return c.json(await room(c.env, id).waitAtDoor(body.me, body.on));
});

app.post("/api/room/:id/unsay", async (c) => {
  const id = c.req.param("id");
  const body = (await c.req.json().catch(() => null)) as Untrusted<"unsay"> | null;
  if (!ROOM_RE.test(id) || !isSeatToken(body?.me) || !Number.isFinite(body.at)) {
    return c.json({ error: "bad request" }, 400);
  }
  return c.json(await room(c.env, id).unsay(body.me, body.at!));
});

app.post("/api/room/:id/settle", async (c) => {
  const id = c.req.param("id");
  const body = (await c.req.json().catch(() => null)) as Untrusted<"settle"> | null;
  if (!ROOM_RE.test(id) || !isSeatToken(body?.me) || typeof body.on !== "boolean") {
    return c.json({ error: "bad request" }, 400);
  }
  return c.json(await room(c.env, id).settle(body.me, body.on));
});

app.post("/api/room/:id/sit", async (c) => {
  const id = c.req.param("id");
  const body = (await c.req.json().catch(() => null)) as Untrusted<"sit"> | null;
  if (!ROOM_RE.test(id) || !isSeatToken(body?.me) || typeof body.on !== "boolean") {
    return c.json({ error: "bad request" }, 400);
  }
  return c.json(await room(c.env, id).sitWith(body.me, body.on));
});

app.post("/api/room/:id/hold", async (c) => {
  const id = c.req.param("id");
  const body = (await c.req.json().catch(() => null)) as Untrusted<"hold"> | null;
  if (!ROOM_RE.test(id) || !isSeatToken(body?.me) || typeof body.on !== "boolean") {
    return c.json({ error: "bad request" }, 400);
  }
  return c.json(await room(c.env, id).hold(body.me, body.on));
});

app.post("/api/room/:id/boxout", async (c) => {
  const id = c.req.param("id");
  const body = (await c.req.json().catch(() => null)) as Untrusted<"boxout"> | null;
  if (!ROOM_RE.test(id) || !isSeatToken(body?.me)) return c.json({ error: "bad request" }, 400);
  // Defaults to putting one out, so an older client that sends no `on` still works.
  return c.json(await room(c.env, id).putBoxOut(body.me, body.on ?? true));
});

app.post("/api/room/:id/leaveout", async (c) => {
  const id = c.req.param("id");
  const body = (await c.req.json().catch(() => null)) as Untrusted<"leaveout"> | null;
  if (!ROOM_RE.test(id) || !isSeatToken(body?.me) || !VALID_TREATS.includes(body.treat as Treat)) {
    return c.json({ error: "bad request" }, 400);
  }
  return c.json(await room(c.env, id).leaveOut(body.me, body.treat as Treat));
});

app.post("/api/room/:id/gift", async (c) => {
  const id = c.req.param("id");
  const body = (await c.req.json().catch(() => null)) as Untrusted<"gift"> | null;
  if (!ROOM_RE.test(id) || !isSeatToken(body?.me) || !VALID_GIFTS.includes(body.gift as Gift)) {
    return c.json({ error: "bad request" }, 400);
  }
  const words = typeof body.text === "string" ? body.text : "";
  return c.json(await room(c.env, id).leaveGift(body.me, body.gift as Gift, words));
});

app.post("/api/room/:id/tell", async (c) => {
  const id = c.req.param("id");
  const body = (await c.req.json().catch(() => null)) as Untrusted<"tell"> | null;
  if (!ROOM_RE.test(id) || !isSeatToken(body?.me) || !VALID_MOODS.includes(body.mood as Mood)) {
    return c.json({ error: "bad request" }, 400);
  }
  return c.json(await room(c.env, id).tell(body.me, body.mood as Mood));
});

app.post("/api/room/:id/say", async (c) => {
  const id = c.req.param("id");
  const body = (await c.req.json().catch(() => null)) as Untrusted<"say"> | null;
  if (!ROOM_RE.test(id) || !isSeatToken(body?.me) || typeof body.text !== "string") {
    return c.json({ error: "bad request" }, 400);
  }
  const day =
    typeof body.aboutDay === "number" && Number.isInteger(body.aboutDay) && body.aboutDay >= 0
      ? body.aboutDay
      : undefined;
  return c.json(await room(c.env, id).say(body.me, body.text, day));
});

app.post("/api/room/:id/link", async (c) => {
  const id = c.req.param("id");
  const body = ((await c.req.json().catch(() => null)) ?? {}) as Untrusted<"link">;
  const me = typeof body.me === "string" ? body.me : "";
  if (!ROOM_RE.test(id) || !isSeatToken(me)) return c.json({ error: "bad request" }, 400);

  const account = await accountOf(c.req.raw, c.env);
  if (account.state === "unavailable") {
    return c.json({ error: "sign-in is having a moment. try again in a bit." }, 503, {
      "Retry-After": "30",
    });
  }
  if (account.state === "signed-out") return c.json({ error: "not signed in" }, 401);

  const ok = await room(c.env, id).linkAccount(me, account.id, body.on !== false);
  return ok ? c.json({ ok: true }) : c.json({ error: "that account already has a seat here" }, 409);
});

// Gate on the local binding, not the hostname: Wrangler rewrites local request URLs.
app.post("/api/room/:id/age", async (c) => {
  if (c.env.DEV_TOOLS !== "on") return c.json({ error: "not found" }, 404);

  const id = c.req.param("id");
  if (!ROOM_RE.test(id)) return c.json({ error: "bad request" }, 400);
  const body = ((await c.req.json().catch(() => null)) ?? {}) as Record<string, unknown>;
  const me = typeof body.me === "string" ? body.me : "";
  if (!isSeatToken(me)) return c.json({ error: "bad request" }, 400);

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
  const body = (await c.req.json().catch(() => null)) as Untrusted<"draw"> | null;
  const cells = body?.cells;
  if (!ROOM_RE.test(id) || !isSeatToken(body?.me) || typeof cells !== "string" || !DOODLE_RE.test(cells)) {
    return c.json({ error: "bad request" }, 400);
  }
  return c.json(await room(c.env, id).draw(body.me, cells));
});

app.post("/api/room/:id/ourday", async (c) => {
  const id = c.req.param("id");
  if (!ROOM_RE.test(id)) return c.json({ error: "bad request" }, 400);
  const body = ((await c.req.json().catch(() => null)) ?? {}) as Untrusted<"ourday">;
  const me = typeof body.me === "string" ? body.me : "";
  if (!isSeatToken(me)) return c.json({ error: "bad request" }, 400);

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
  const body = ((await c.req.json().catch(() => null)) ?? {}) as Untrusted<"dress">;
  const me = typeof body.me === "string" ? body.me : "";
  if (!isSeatToken(me)) return c.json({ error: "bad request" }, 400);
  // Keyed off the body's own field names, so a typo here is a build error and not a silent skip.
  const pick = <T>(k: keyof Untrusted<"dress">, ok: (v: unknown) => boolean): T | undefined =>
    ok(body[k]) ? (body[k] as T) : undefined;
  const hex = (v: unknown) => typeof v === "string" && /^#[0-9a-f]{6}$/i.test(v);
  if (body.decor !== undefined && !isRoomDecor(body.decor)) return c.json({ error: "bad room decor" }, 400);
  const ok = await room(c.env, id).dress(
    me,
    {
      name: pick<string>("name", (v) => typeof v === "string" && (v as string).length <= 24),
      fur: pick<string>("fur", hex),
      furDk: pick<string>("furDk", hex),
      belly: pick<string>("belly", hex),
      eyes: pick<string>("eyes", hex),
      tabby: pick<boolean>("tabby", (v) => typeof v === "boolean"),
    },
    body.decor as import("./types.js").RoomDecor | undefined,
  );
  return ok ? c.json({ ok: true }) : c.json({ error: "not yours to set" }, 403);
});

app.post("/api/room/:id/notes", async (c) => {
  const id = c.req.param("id");
  if (!ROOM_RE.test(id)) return c.json({ error: "bad request" }, 400);
  const body = ((await c.req.json().catch(() => null)) ?? {}) as Untrusted<"notes">;
  const me = typeof body.me === "string" ? body.me : "";
  if (!isSeatToken(me)) return c.json({ error: "bad request" }, 400);
  if (!Array.isArray(body.notes) || body.notes.some((n) => typeof n !== "string")) {
    return c.json({ error: "bad request" }, 400);
  }
  const ok = await room(c.env, id).setNotes(me, body.notes as string[]);
  return ok ? c.json({ ok: true }) : c.json({ error: "not yours to set" }, 403);
});

app.post("/api/room/:id/recover", async (c) => {
  const id = c.req.param("id");
  if (!ROOM_RE.test(id)) return c.json({ error: "bad request" }, 400);
  const body = ((await c.req.json().catch(() => null)) ?? {}) as Untrusted<"recover">;
  const me = typeof body.me === "string" ? body.me : "";
  const code = typeof body.code === "string" ? body.code : "";
  if (!isSeatToken(me) || code.length < 8) return c.json({ error: "bad request" }, 400);
  const ok = await room(c.env, id).recoverSeat(me, code);
  return ok ? c.json({ ok: true }) : c.json({ error: "that code does not match" }, 403);
});

app.post("/api/room/:id/found", async (c) => {
  const id = c.req.param("id");
  const body = (await c.req.json().catch(() => null)) as Untrusted<"found"> | null;
  if (!ROOM_RE.test(id) || !isSeatToken(body?.me)) return c.json({ error: "bad request" }, 400);
  const ok = await room(c.env, id).noticed(body.me, body.key);
  return ok ? c.json({ ok: true }) : c.json({ error: "bad request" }, 400);
});

app.post("/api/room/:id/shelf", async (c) => {
  const id = c.req.param("id");
  if (!ROOM_RE.test(id)) return c.json({ error: "bad request" }, 400);
  const body = ((await c.req.json().catch(() => null)) ?? {}) as Untrusted<"shelf">;
  const me = typeof body.me === "string" ? body.me : "";
  if (!isSeatToken(me)) return c.json({ error: "bad request" }, 400);
  const done = await room(c.env, id).putBack(me);
  return done ? c.json({ ok: true, again: done === "again" }) : c.json({ error: "not yours to tidy" }, 403);
});

app.post("/api/room/:id/window-light", async (c) => {
  const id = c.req.param("id");
  if (!ROOM_RE.test(id)) return c.json({ error: "bad request" }, 400);
  const body = ((await c.req.json().catch(() => null)) ?? {}) as Untrusted<"window-light">;
  const me = typeof body.me === "string" ? body.me : "";
  if (!isSeatToken(me)) return c.json({ error: "bad request" }, 400);
  const next = await room(c.env, id).touchWindowLight(me);
  return next ? c.json(next) : c.json({ error: "not your room" }, 403);
});

app.post("/api/room/:id/release", async (c) => {
  const id = c.req.param("id");
  if (!ROOM_RE.test(id)) return c.json({ error: "bad request" }, 400);
  const body = ((await c.req.json().catch(() => null)) ?? {}) as Untrusted<"release">;
  const me = typeof body.me === "string" ? body.me : "";
  if (!isSeatToken(me)) return c.json({ error: "bad request" }, 400);
  const ok = await room(c.env, id).releaseHerSeat(me);
  return ok ? c.json({ ok: true }) : c.json({ error: "not yours to release" }, 403);
});

app.post("/api/room/:id/delete", async (c) => {
  const id = c.req.param("id");
  if (!ROOM_RE.test(id)) return c.json({ error: "bad request" }, 400);
  const body = ((await c.req.json().catch(() => null)) ?? {}) as Untrusted<"delete">;
  const me = typeof body.me === "string" ? body.me : "";
  const name = typeof body.name === "string" ? body.name : "";
  if (!isSeatToken(me) || !name) return c.json({ error: "bad request" }, 400);
  const erasesAt = await room(c.env, id).deleteRoom(me, name);
  return erasesAt ? c.json({ ok: true, undoUntil: erasesAt }) : c.json({ error: "not yours to delete" }, 403);
});

app.get("/api/room/:id/export", async (c) => {
  const id = c.req.param("id");
  const me = c.req.query("me") ?? "";
  if (!ROOM_RE.test(id) || !isSeatToken(me)) return c.json({ error: "bad request" }, 400);

  const copy = await room(c.env, id).exportFor(me);
  if (!copy) return c.json({ error: "not your room to copy" }, 403);

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
  const body = ((await c.req.json().catch(() => null)) ?? {}) as Untrusted<"blanket">;
  const me = typeof body.me === "string" ? body.me : "";
  if (!isSeatToken(me)) return c.json({ error: "bad request" }, 400);
  const ok = await room(c.env, id).setBlanket(me, body.key, body.stripe);
  return ok ? c.json({ ok: true }) : c.json({ error: "not hers to change, or not a blanket" }, 403);
});

app.post("/api/room/:id/unleave", async (c) => {
  const id = c.req.param("id");
  if (!ROOM_RE.test(id)) return c.json({ error: "bad request" }, 400);
  const body = ((await c.req.json().catch(() => null)) ?? {}) as Untrusted<"unleave">;
  const me = typeof body.me === "string" ? body.me : "";
  if (!isSeatToken(me)) return c.json({ error: "bad request" }, 400);
  const ok = await room(c.env, id).unleave(me);
  return ok ? c.json({ ok: true }) : c.json({ error: "too late, or the seat is taken" }, 403);
});

app.post("/api/room/:id/undelete", async (c) => {
  const id = c.req.param("id");
  if (!ROOM_RE.test(id)) return c.json({ error: "bad request" }, 400);
  const body = ((await c.req.json().catch(() => null)) ?? {}) as Untrusted<"undelete">;
  const me = typeof body.me === "string" ? body.me : "";
  if (!isSeatToken(me)) return c.json({ error: "bad request" }, 400);
  const ok = await room(c.env, id).undelete(me);
  return ok ? c.json({ ok: true }) : c.json({ error: "too late, or not yours" }, 403);
});

app.post("/api/room/:id/leave", async (c) => {
  const id = c.req.param("id");
  if (!ROOM_RE.test(id)) return c.json({ error: "bad request" }, 400);
  const body = ((await c.req.json().catch(() => null)) ?? {}) as Untrusted<"leave">;
  const me = typeof body.me === "string" ? body.me : "";
  if (!isSeatToken(me)) return c.json({ error: "bad request" }, 400);
  const ok = await room(c.env, id).leaveRoom(me);
  return ok ? c.json({ ok: true }) : c.json({ error: "not your seat to leave" }, 403);
});

app.post("/api/room/:id/clock", async (c) => {
  const id = c.req.param("id");
  if (!ROOM_RE.test(id)) return c.json({ error: "bad request" }, 400);
  const body = ((await c.req.json().catch(() => null)) ?? {}) as Untrusted<"clock">;
  const me = typeof body.me === "string" ? body.me : "";
  if (!isSeatToken(me)) return c.json({ error: "bad request" }, 400);

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
