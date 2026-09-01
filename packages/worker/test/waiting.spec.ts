import { describe, expect, it } from "vitest";
import { harness, HER, HIM, STRANGER } from "./harness.js";

const { id, post, seat, view } = harness("waitingroom");

describe("waiting by the door", () => {
  it("is hers to start, and he sees it", async () => {
    await seat();
    await post("wait", { me: HER, on: true });

    expect((await view(HER)).waitingAtDoor).toBe(true);
  });

  it("is over the moment he comes in, because that is what she was waiting for", async () => {
    await seat();
    await post("wait", { me: HER, on: true });

    // His own look in is the door opening.
    expect((await view(HIM)).waitingAtDoor).toBe(false);
    expect((await view(HER)).waitingAtDoor).toBe(false);
  });

  it("she can come away from it herself", async () => {
    await seat();
    await post("wait", { me: HER, on: true });
    await post("wait", { me: HER, on: false });

    expect((await view(HER)).waitingAtDoor).toBe(false);
  });

  it("is hers, not his", async () => {
    await seat();
    await post("wait", { me: HIM, on: true });
    expect((await view(HER)).waitingAtDoor).toBe(false);
  });

  it("does not show to somebody who only has the link", async () => {
    await seat();
    await post("wait", { me: HER, on: true });
    expect((await view(STRANGER)).waitingAtDoor).toBe(false);
  });
});
