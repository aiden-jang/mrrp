import { runInDurableObject, env, SELF } from "cloudflare:test";
import { describe, expect, it } from "vitest";
import type { SaidSoFar } from "../src/types.js";
import { harness, HER, HIM, STRANGER } from "./harness.js";

const { id, post, seat, view } = harness("saidroom");

const said = async (me: string) => {
  const r = await SELF.fetch(`https://x/api/room/${id}/said?me=${me}`);
  return { status: r.status, body: (await r.json()) as SaidSoFar };
};

/** Hand her further along without waiting for real days to pass. */
const handHer = async (upTo: number) => {
  const stub = env.ROOM.get(env.ROOM.idFromName(id));
  await runInDurableObject(stub, async (_i, state) => {
    await state.storage.put("noteIdx", upTo);
  });
};

describe("looking back at what has passed between them", () => {
  it("stops at the note the room has handed her, for him as well as her", async () => {
    await seat();
    await post("notes", { me: HIM, notes: ["one", "two", "three", "four"] });
    await handHer(1);

    for (const who of [HIM, HER]) {
      const { body } = await said(who);
      expect(body.notes.map((n) => n.text)).toEqual(["one", "two"]);
    }
  });

  it("numbers them the way the room does, from day one", async () => {
    await seat();
    await post("notes", { me: HIM, notes: ["one", "two"] });
    await handHer(1);
    expect((await said(HER)).body.notes.map((n) => n.day)).toEqual([1, 2]);
  });

  it("puts her answer under the note it answers", async () => {
    await seat();
    await post("notes", { me: HIM, notes: ["one", "two"] });
    await handHer(1);
    await post("say", { me: HER, text: "this one", aboutDay: 1 });

    const { body } = await said(HIM);
    expect(body.notes[0]!.answers).toEqual([]);
    expect(body.notes[1]!.answers.map((a) => a.text)).toEqual(["this one"]);
  });

  it("keeps a line that answers nothing out of the notes, with the thing it came with", async () => {
    await seat();
    await post("say", { me: HER, text: "just saying" });
    await post("gift", { me: HER, gift: "moth", text: "he was on the window" });
    // An answer belongs under its note and nowhere else. Without one here the split goes untested.
    await post("say", { me: HER, text: "answering day one", aboutDay: 0 });

    const { body } = await said(HER);
    expect(body.notes.flatMap((n) => n.answers).map((a) => a.text)).toEqual(["answering day one"]);
    expect(body.lines.map((l) => [l.text, l.gift ?? null])).toEqual([
      ["he was on the window", "moth"],
      ["just saying", null],
    ]);
  });

  it("never hangs her answer off a note he rewrote after she wrote it", async () => {
    await seat();
    await post("notes", { me: HIM, notes: ["the good mug is yours now", "second"] });
    await post("say", { me: HER, text: "it made me laugh", aboutDay: 0 });
    await post("notes", { me: HIM, notes: ["I am selling the car", "second"] });

    const { body } = await said(HIM);
    expect(body.notes[0]!.text).toBe("I am selling the car");
    expect(body.notes[0]!.answers).toEqual([]);
    // It is still hers and still readable, beside the note it actually answered.
    expect(body.lines.map((l) => [l.text, l.about])).toEqual([
      ["it made me laugh", "the good mug is yours now"],
    ]);
  });

  it("keeps the answer in place when he edits a different note", async () => {
    await seat();
    await post("notes", { me: HIM, notes: ["the good mug is yours now", "second"] });
    await post("say", { me: HER, text: "it made me laugh", aboutDay: 0 });
    await post("notes", { me: HIM, notes: ["the good mug is yours now", "rewritten"] });

    const { body } = await said(HIM);
    expect(body.notes[0]!.answers.map((a) => a.text)).toEqual(["it made me laugh"]);
    expect(body.lines).toEqual([]);
  });

  it("is not something a stranger with the link can read", async () => {
    await seat();
    await view(STRANGER);
    await post("say", { me: HER, text: "for him only" });

    const r = await said(STRANGER);
    expect(r.status).toBe(403);
    const body = await (await SELF.fetch(`https://x/api/room/${id}/said?me=${STRANGER}`)).text();
    expect(body).not.toContain("for him only");
  });
});
