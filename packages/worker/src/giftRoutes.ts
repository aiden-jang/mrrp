import { isKeepsakeCursor } from "./keepsakes.js";
import { Hono } from "hono";
import type { Env } from "./env.js";
import { isGiftId } from "./gifts.js";
import { isSeatToken, ROOM_RE } from "./seatToken.js";
import { GIFTS, type Gift, type Untrusted } from "./types.js";

export const giftRoutes = new Hono<{ Bindings: Env }>();
const room = (env: Env, id: string) => env.ROOM.get(env.ROOM.idFromName(id));

giftRoutes.post("/api/room/:id/gift", async (c) => {
  const id = c.req.param("id");
  const body = (await c.req.json().catch(() => null)) as Untrusted<"gift"> | null;
  if (!ROOM_RE.test(id) || !isSeatToken(body?.me) || !GIFTS.some((g) => g.id === body.gift)) {
    return c.json({ error: "bad request" }, 400);
  }
  const words = typeof body.text === "string" ? body.text : "";
  return c.json(await room(c.env, id).leaveGift(body.me, body.gift as Gift, words));
});

giftRoutes.post("/api/room/:id/keepgift", async (c) => {
  const id = c.req.param("id");
  const body = (await c.req.json().catch(() => null)) as Untrusted<"keepgift"> | null;
  if (!ROOM_RE.test(id) || !isSeatToken(body?.me) || !isGiftId(body.giftId)) {
    return c.json({ error: "bad request" }, 400);
  }
  const ok = await room(c.env, id).keepGift(body.me, body.giftId);
  return ok ? c.json({ ok: true }) : c.json({ error: "gift changed" }, 409);
});

giftRoutes.get("/api/room/:id/keepsakes", async (c) => {
  const id = c.req.param("id"),
    me = c.req.query("me"),
    before = c.req.query("before");
  if (!ROOM_RE.test(id) || !isSeatToken(me) || (before !== undefined && !isKeepsakeCursor(before)))
    return c.json({ error: "bad request" }, 400);
  const page = await room(c.env, id).keepsakesFor(me, before);
  return page ? c.json(page) : c.json({ error: "not yours" }, 403);
});
