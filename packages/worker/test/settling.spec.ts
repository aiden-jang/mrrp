import { describe, expect, it } from "vitest";
import { harness, HER, HIM, STRANGER } from "./harness.js";

const { post, seat, view } = harness("settlingroom");

describe("settling against him", () => {
  it("is only there once he has actually sat down", async () => {
    await seat();
    await post("settle", { me: HER, on: true });
    expect((await view(HER)).settled).toBe(false);

    await post("sit", { me: HIM, on: true });
    await post("settle", { me: HER, on: true });
    expect((await view(HER)).settled).toBe(true);
    expect((await view(HIM)).settled).toBe(true);
  });

  it("ends when he gets up, without her having to do anything", async () => {
    await seat();
    await post("sit", { me: HIM, on: true });
    await post("settle", { me: HER, on: true });
    await post("sit", { me: HIM, on: false });

    expect((await view(HER)).settled).toBe(false);
  });

  it("does not lie in wait for him to sit down", async () => {
    await seat();
    await post("settle", { me: HER, on: true });
    await post("sit", { me: HIM, on: true });

    // The view hides it while nobody is sat there, so this is about what got written down.
    expect((await view(HER)).settled).toBe(false);
  });

  it("does not come back on its own when he sits down again later", async () => {
    await seat();
    await post("sit", { me: HIM, on: true });
    await post("settle", { me: HER, on: true });
    await post("sit", { me: HIM, on: false });
    await post("sit", { me: HIM, on: true });

    // She settled against that time he sat down, not against the chair.
    expect((await view(HER)).settled).toBe(false);
  });

  it("is hers, not his", async () => {
    await seat();
    await post("sit", { me: HIM, on: true });
    await post("settle", { me: HIM, on: true });
    expect((await view(HIM)).settled).toBe(false);
  });

  it("she can shift off it again while he is still there", async () => {
    await seat();
    await post("sit", { me: HIM, on: true });
    await post("settle", { me: HER, on: true });
    await post("settle", { me: HER, on: false });

    expect((await view(HER)).settled).toBe(false);
    expect((await view(HER)).sittingWithYou).toBe(true);
  });

  it("is not something a stranger can see or do", async () => {
    await seat();
    await post("sit", { me: HIM, on: true });
    await post("settle", { me: HER, on: true });

    await view(STRANGER);
    await post("settle", { me: STRANGER, on: false });
    expect((await view(STRANGER)).settled).toBe(false);
    expect((await view(HER)).settled).toBe(true);
  });

  it("tells the room the first time it happens", async () => {
    await seat();
    await view(HIM);
    await post("sit", { me: HIM, on: true });
    await post("settle", { me: HER, on: true });

    const firsts = (await view(HIM)).arrivals.filter((a) => a.kind === "first");
    expect(firsts.map((f) => (f.kind === "first" ? f.what : ""))).toContain("settled");
  });
});
