import { describe, expect, it } from "vitest";
import { harness, HER, HIM } from "./harness.js";

const { post, seat, view } = harness("badinputroom");

/*
 * The room checks who you are and not what you sent: `leaveGift` stores the gift it is handed
 * without looking at it. These lists are the only thing between a seat and anything it likes.
 */
describe("what the routes will not pass on", () => {
  it("refuses a gift that is not one of the things she brings", async () => {
    await seat();
    expect((await post("gift", { me: HER, gift: "a car" })).status).toBe(400);
    expect((await post("gift", { me: HER, gift: 7 })).status).toBe(400);
    expect((await view(HIM)).gift, "nothing on the shelf").toBeNull();

    expect((await post("gift", { me: HER, gift: "moth" })).status, "a real one gets through").toBe(200);
  });

  it("refuses a treat that is not one of the things he leaves out", async () => {
    await seat();
    expect((await post("leaveout", { me: HIM, treat: "steak" })).status).toBe(400);
    expect((await view(HER)).forHer).toBeNull();

    expect((await post("leaveout", { me: HIM, treat: "catnip" })).status).toBe(200);
  });

  it("refuses something the cat cannot do", async () => {
    await seat();
    expect((await post("heract", { me: HER, act: "fly" })).status).toBe(400);
    expect((await post("heract", { me: HER, act: null })).status).toBe(400);

    expect((await post("heract", { me: HER, act: "shelf" })).status).toBe(200);
  });

  it("refuses a line that is not text", async () => {
    await seat();
    expect((await post("say", { me: HER, text: 12 })).status).toBe(400);
    expect((await post("say", { me: HER })).status).toBe(400);
  });

  it("refuses a switch that is not on or off", async () => {
    await seat();
    for (const path of ["hold", "sit", "settle", "wait"]) {
      expect((await post(path, { me: HIM, on: "yes" })).status, path).toBe(400);
      expect((await post(path, { me: HIM })).status, `${path} with nothing`).toBe(400);
    }
  });

  it("refuses taking back a line at a moment that is not a moment", async () => {
    await seat();
    expect((await post("unsay", { me: HER, at: "yesterday" })).status).toBe(400);
    expect((await post("unsay", { me: HER, at: Infinity })).status).toBe(400);
  });

  /*
   * Only the routes that hand a token to something expensive check its length: a socket to hold open,
   * an account to tie. Everywhere else a short token is just a token nobody is sitting on, and the
   * room turns it away for the same reason it turns away any stranger.
   */
  it("does nothing for a seat token too short to be one", async () => {
    await seat();
    expect((await post("act", { me: "xx", action: "brush" })).status).toBe(200);
    expect((await view(HIM)).brushed, "the room is untouched").toBe(false);
  });
});
