import { Hono } from "hono";
import type { Env } from "./env.js";
import { isSeatToken, ROOM_RE } from "./seatToken.js";
import { isSeekCommand } from "./hideSeek.js";
import type { Untrusted } from "./types.js";

// Unknown touch targets must be rejected, not become new props.
const VALID_POKES = ["window", "frame", "shelf", "door", "plant", "bed", "box", "floor"];

export const touchRoutes = new Hono<{ Bindings: Env }>();
touchRoutes.post("/api/room/:id/seek", async (c) => {
  const id = c.req.param("id");
  const body = (await c.req.json().catch(() => null)) as Untrusted<"seek"> | null;
  if (!ROOM_RE.test(id) || !isSeatToken(body?.me) || !isSeekCommand(body.command))
    return c.json({ error: "bad request" }, 400);
  const room = c.env.ROOM.get(c.env.ROOM.idFromName(id));
  if (!(await room.seek(body.me, body.command))) return c.json({ error: "round changed" }, 409);
  return c.json({ ok: true });
});

touchRoutes.post("/api/room/:id/poke", async (c) => {
  const id = c.req.param("id");
  const body = (await c.req.json().catch(() => null)) as Untrusted<"poke"> | null;
  if (!ROOM_RE.test(id) || !isSeatToken(body?.me) || !VALID_POKES.includes(body.what ?? "")) {
    return c.json({ error: "bad request" }, 400);
  }
  return c.json(await c.env.ROOM.get(c.env.ROOM.idFromName(id)).poke(body.me, body.what!));
});
