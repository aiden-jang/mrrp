import { env, runInDurableObject, SELF } from "cloudflare:test";
import { expect, it } from "vitest";
import { harness, HIM, HER, STRANGER } from "./harness.js";
import {
  WINDOW_BATCH_MAX,
  WINDOW_POINTS_MAX,
  WINDOW_STROKES_MAX,
  WINDOW_TOTAL_POINTS_MAX,
  type WindowStroke,
} from "../src/types.js";

const h = harness("windowdrawingroom");
const stroke = (ink: WindowStroke["ink"] = "ink"): WindowStroke => ({
  id: crypto.randomUUID(),
  ink,
  points: [
    [1, 2],
    [3, 4],
  ],
});
const save = (me: string, strokes: WindowStroke[]) => h.post("window-drawing", { me, strokes });

it("starts empty and keeps both seats’ additions across reads without touching the frame or notes", async () => {
  await h.seat();
  const frame = "1".repeat(135);
  await h.post("draw", { me: HIM, cells: frame });
  const before = await h.view(HER);
  expect(before.windowDrawing).toEqual({ revision: 0, strokes: [] });
  const his = stroke(),
    hers = stroke("rose");
  const responses = await Promise.all([save(HIM, [his]), save(HER, [hers])]);
  expect(responses.map((r) => r.status)).toEqual([200, 200]);
  const first = (await h.view(HIM)).windowDrawing!;
  expect(first.revision).toBe(2);
  expect(first.strokes).toHaveLength(2);
  expect(first.strokes).toEqual(expect.arrayContaining([his, hers]));
  const after = await h.view(HER);
  expect(after.windowDrawing).toEqual(first);
  expect(after.doodle?.cells).toBe(frame);
  expect(after.note?.text).toBe(before.note?.text);
  expect((await h.view(STRANGER)).windowDrawing).toBeNull();
  expect(JSON.stringify(first)).not.toContain(HIM);
  expect(JSON.stringify(first)).not.toContain(HER);
  const exported = await SELF.fetch(`https://x/api/room/${h.id}/export?me=${HIM}`);
  expect(exported.status).toBe(200);
  expect(((await exported.json()) as { windowDrawing: unknown }).windowDrawing).toEqual(first);
  await runInDurableObject(env.ROOM.get(env.ROOM.idFromName(h.id)), async (_instance, state) => {
    expect((await state.storage.get<{ strokes: unknown[] }>("windowDrawing"))?.strokes).toHaveLength(2);
  });
});

it("retries an accepted batch once and rejects changed or stolen IDs atomically", async () => {
  await h.seat();
  const first = stroke();
  expect((await save(HIM, [first])).status).toBe(200);
  expect((await save(HIM, [first])).status).toBe(200);
  expect((await h.view(HIM)).windowDrawing).toEqual({ revision: 1, strokes: [first] });
  expect((await save(HIM, [stroke(), { ...first, ink: "leaf" }])).status).toBe(409);
  expect((await save(HER, [first])).status).toBe(409);
  expect((await h.view(HIM)).windowDrawing).toEqual({ revision: 1, strokes: [first] });
});

it("rejects unseated writers and malformed or oversized batches", async () => {
  await h.seat();
  expect((await save(STRANGER, [stroke()])).status).toBe(403);
  const valid = stroke();
  const invalid = [
    [],
    null,
    [null],
    [{ ...valid, ink: "neon" }],
    [{ ...valid, id: "invalid" }],
    [{ ...valid, points: [[64, 1]] }],
    [{ ...valid, points: [[1, 40]] }],
    [{ ...valid, points: [[1.2, 2]] }],
    [{ ...valid, points: [] }],
    [{ ...valid, points: Array(WINDOW_POINTS_MAX + 1).fill([1, 2]) }],
    Array.from({ length: WINDOW_BATCH_MAX + 1 }, () => stroke()),
    [valid, valid],
  ];
  for (const strokes of invalid)
    expect((await h.post("window-drawing", { me: HIM, strokes })).status).toBe(400);
  expect((await h.view(HIM)).windowDrawing?.strokes).toEqual([]);
});

it.each(["strokes", "points"])(
  "keeps the saved drawing unchanged when its %s limit is reached",
  async (limit) => {
    await h.seat();
    await runInDurableObject(env.ROOM.get(env.ROOM.idFromName(h.id)), async (_instance, state) => {
      const strokes = Array.from(
        { length: limit === "strokes" ? WINDOW_STROKES_MAX : WINDOW_TOTAL_POINTS_MAX / WINDOW_POINTS_MAX },
        () => ({
          ...stroke(),
          by: HIM,
          points: Array.from({ length: limit === "points" ? WINDOW_POINTS_MAX : 1 }, () => [1, 2]),
        }),
      );
      await state.storage.put("windowDrawing", { revision: 10, strokes });
    });
    const before = (await h.view(HIM)).windowDrawing;
    const response = await save(HER, [stroke()]);
    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({ error: "window full" });
    expect((await h.view(HIM)).windowDrawing).toEqual(before);
  },
);

it("rotates stroke ownership and removes only her marks on seat release", async () => {
  await h.seat();
  const his = stroke(),
    hers = stroke("leaf");
  await save(HIM, [his]);
  await save(HER, [hers]);
  const next = "replacementherkey";
  await h.post("rotate", { me: HER, next });
  expect((await save(next, [hers])).status).toBe(200);
  expect((await save(HER, [stroke()])).status).toBe(403);
  await h.post("release", { me: HIM });
  expect((await h.view(HIM)).windowDrawing?.strokes).toEqual([his]);
  expect((await h.view(STRANGER)).windowDrawing?.strokes).toEqual([his]);
});

it("keeps strokes through time and clock changes and refuses writes after deletion", async () => {
  await h.seat();
  const mark = stroke();
  await save(HER, [mark]);
  h.away(24);
  await h.post("clock", { me: HIM, tz: "UTC" });
  expect((await h.view(HIM)).windowDrawing?.strokes).toEqual([mark]);
  const view = await h.view(HIM);
  expect((await h.post("delete", { me: HIM, name: view.you })).status).toBe(200);
  expect((await save(HIM, [stroke()])).status).toBe(410);
});

it("restores her marks on undo leave without replacing what he drew while she was away", async () => {
  await h.seat();
  const his = stroke(),
    hers = stroke("rose"),
    later = stroke("leaf");
  await save(HIM, [his]);
  await save(HER, [hers]);
  await h.post("leave", { me: HER });
  expect((await h.view(HIM)).windowDrawing?.strokes).toEqual([his]);
  await save(HIM, [later]);
  expect((await h.post("unleave", { me: HER })).status).toBe(200);
  expect((await h.view(HER)).windowDrawing?.strokes).toEqual([his, later, hers]);
});
