import { Hono } from "hono";
import type { Env } from "./env.js";
import type { Untrusted } from "./types.js";
import { isSeatToken, ROOM_RE } from "./seatToken.js";

export const seatRoutes = new Hono<{ Bindings: Env }>();

seatRoutes.post("/api/room/:id/recover", async (c) => {
  const id = c.req.param("id");
  const body = ((await c.req.json().catch(() => null)) ?? {}) as Untrusted<"recover">;
  if (
    !ROOM_RE.test(id) ||
    !isSeatToken(body.me) ||
    typeof body.code !== "string" ||
    body.code.length < 8 ||
    body.code.length > 64
  ) {
    return c.json({ error: "bad request" }, 400);
  }
  const ok = await c.env.ROOM.get(c.env.ROOM.idFromName(id)).recoverSeat(body.me, body.code);
  return ok ? c.json({ ok: true }) : c.json({ error: "that code does not match" }, 403);
});

seatRoutes.post("/api/room/:id/rotate", async (c) => {
  const id = c.req.param("id");
  const body = ((await c.req.json().catch(() => null)) ?? {}) as Untrusted<"rotate">;
  if (!ROOM_RE.test(id) || !isSeatToken(body.me) || !isSeatToken(body.next)) {
    return c.json({ error: "bad request" }, 400);
  }
  const ok = await c.env.ROOM.get(c.env.ROOM.idFromName(id)).rotateSeat(body.me, body.next);
  return ok ? c.json({ ok: true }) : c.json({ error: "not your seat" }, 403);
});
