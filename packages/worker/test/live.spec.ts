import { SELF } from "cloudflare:test";
import { describe, expect, it } from "vitest";
import { harness, HER, HIM, STRANGER } from "./harness.js";
import type { RoomView } from "../src/types.js";

const h = harness("liveroom");

interface Pushed {
  type: string;
  view?: RoomView;
}

/** Opens a socket and returns it with a queue of everything it has been sent. */
async function connect(id: string, me: string): Promise<{ ws: WebSocket; got: Pushed[] }> {
  const r = await SELF.fetch(`https://x/api/room/${id}/live?me=${me}`, {
    headers: { upgrade: "websocket" },
  });
  expect(r.status, "upgrade").toBe(101);
  const ws = r.webSocket!;
  const got: Pushed[] = [];
  ws.accept();
  ws.addEventListener("message", (e) => {
    if (typeof e.data === "string" && e.data !== "pong") got.push(JSON.parse(e.data) as Pushed);
  });
  return { ws, got };
}

/* Sixty was enough alone and flaked under a full-suite run. */
/*
 * A fixed sleep raced the push and went red about one full-suite run in four. Wait for the thing
 * itself. Counting turns rather than watching the clock, because `away()` fakes the clock.
 */
const settle = () => new Promise((r) => setTimeout(r, 140));

const until = async (ready: () => boolean, what: string, turns = 400): Promise<void> => {
  for (let i = 0; i < turns; i++) {
    if (ready()) return;
    await new Promise((r) => setTimeout(r, 5));
  }
  throw new Error(`waited for ${what} and it never happened`);
};

describe("the live channel", () => {
  it("sends the room on connect and again on every write", async () => {
    await h.seat();
    const her = await connect(h.id, HER);
    await settle();
    expect(her.got.length, "one view on connect").toBe(1);

    expect((await h.post("act", { me: HIM, action: "brush" })).status).toBe(200);
    await settle();
    expect(her.got.length).toBeGreaterThan(1);
    expect(her.got.at(-1)!.view!.brushed).toBe(true);
    her.ws.close();
  });

  it("builds a separate view per socket, so neither seat is handed the other's", async () => {
    await h.seat();
    const him = await connect(h.id, HIM);
    const her = await connect(h.id, HER);
    await settle();

    expect((await h.post("tell", { me: HER, mood: "sad" })).status).toBe(200);
    await settle();

    const toHim = him.got.at(-1)!.view!;
    const toHer = her.got.at(-1)!.view!;
    expect(toHim.youAreHer).toBe(false);
    expect(toHer.youAreHer).toBe(true);
    // Her note is hers alone. One shared payload would have put it on his screen.
    expect(toHer.note).not.toBeNull();
    expect(toHim.note).toBeNull();
    him.ws.close();
    her.ws.close();
  });

  it("does not spend what he left out just because her tab is open", async () => {
    await h.seat();
    const her = await connect(h.id, HER);
    expect((await h.post("leaveout", { me: HIM, treat: "yarn" })).status).toBe(200);
    await settle();

    expect(her.got.at(-1)!.view!.forHer, "pushed to her").toBe("yarn");
    // A push is not a visit. It is still there when she actually opens the room.
    expect((await h.view(HER)).forHer).toBe("yarn");
    expect((await h.view(HER)).forHer, "spent by the read, not the push").toBeNull();
    her.ws.close();
  });

  it("counts an open socket as being here, with no request needed", async () => {
    await h.seat();
    h.away(1);
    // Both are now an hour past HERE_NOW_MS, so lastSeen alone says nobody is in.
    expect((await h.view(HIM)).bothHereNow).toBe(false);

    const her = await connect(h.id, HER);
    const him = await connect(h.id, HIM);
    await until(() => him.got.at(-1)?.view?.bothHereNow === true, "her socket to count as her being here");

    her.ws.close();
    await until(() => him.got.at(-1)?.view?.bothHereNow === false, "closing it to count as her leaving");
    him.ws.close();
  });

  it("refuses a seatless token and a room that is gone", async () => {
    await h.seat();
    const short = await SELF.fetch(`https://x/api/room/${h.id}/live?me=xx`, {
      headers: { upgrade: "websocket" },
    });
    expect(short.status).toBe(400);

    const noUpgrade = await SELF.fetch(`https://x/api/room/${h.id}/live?me=${HIM}`);
    expect(noUpgrade.status).toBe(426);

    // A stranger gets a socket, because the room seats nobody new here; what matters is that the
    // view it pushes is the stranger's, which carries no note, no mood and no recovery code.
    const other = await connect(h.id, STRANGER);
    await settle();
    const v = other.got.at(-1)!.view!;
    expect(v.note).toBeNull();
    expect(v.recoveryCode).toBeNull();
    expect(v.theirRecent).toEqual([]);
    other.ws.close();

    expect((await h.post("delete", { me: HIM, name: "Aiden" })).status).toBe(200);
    const gone = await SELF.fetch(`https://x/api/room/${h.id}/live?me=${HIM}`, {
      headers: { upgrade: "websocket" },
    });
    expect(gone.status).toBe(410);
  });

  it("tells open tabs the room is gone rather than pushing them an empty one", async () => {
    await h.seat();
    const her = await connect(h.id, HER);
    await settle();
    expect((await h.post("delete", { me: HIM, name: "Aiden" })).status).toBe(200);
    await settle();

    expect(her.got.at(-1)!.type, "gone, not a view of a fresh room").toBe("gone");
  });
});

describe("presence", () => {
  it("never says both are here while also saying the other one has gone", async () => {
    await h.seat();
    h.away(1);
    const her = await connect(h.id, HER);
    await settle();

    const v = await h.view(HIM);
    expect(v.bothHereNow, "his socket is this request, hers is open").toBe(true);
    // These are the same question. They disagreed once, and the room said both things at once.
    expect(v.themHereNow).toBe(v.bothHereNow);
    her.ws.close();
  });
});

describe("her opening the room", () => {
  it("tells his tab she found what he left out, without him asking", async () => {
    await h.seat();
    const him = await connect(h.id, HIM);
    expect((await h.post("leaveout", { me: HIM, treat: "catnip" })).status).toBe(200);
    await settle();
    expect(him.got.at(-1)!.view!.forHer, "still waiting for her").toBe("catnip");

    // Her ordinary read. It is what spends the treat, and it is not a write, so nothing about it
    // looks like something that should reach him.
    await h.view(HER);
    await settle();
    expect(him.got.at(-1)!.view!.forHer, "she has been in and found it").toBeNull();
    him.ws.close();
  });
});

describe("him holding on to her", () => {
  it("reaches her while it is happening, and stops when he lets go", async () => {
    await h.seat();
    const her = await connect(h.id, HER);
    await settle();
    expect(her.got.at(-1)!.view!.heldByThem).toBe(false);

    expect((await h.post("hold", { me: HIM, on: true })).status).toBe(200);
    await settle();
    expect(her.got.at(-1)!.view!.heldByThem, "his hand, on her screen").toBe(true);

    expect((await h.post("hold", { me: HIM, on: false })).status).toBe(200);
    await settle();
    expect(her.got.at(-1)!.view!.heldByThem).toBe(false);
    her.ws.close();
  });

  it("is never his own hand reported back at him", async () => {
    await h.seat();
    await h.post("hold", { me: HIM, on: true });
    // Rule 3. He is doing it; there is nothing for him to be told.
    expect((await h.view(HIM)).heldByThem).toBe(false);
    expect((await h.view(HER)).heldByThem).toBe(true);
  });

  it("lets go when his tab closes, rather than leaving a hand on her", async () => {
    await h.seat();
    const him = await connect(h.id, HIM);
    const her = await connect(h.id, HER);
    await settle();
    await h.post("hold", { me: HIM, on: true });
    await settle();
    expect(her.got.at(-1)!.view!.heldByThem).toBe(true);

    him.ws.close();
    await settle();
    expect(her.got.at(-1)!.view!.heldByThem, "his tab went, so did the hand").toBe(false);
    her.ws.close();
  });

  it("lapses on its own if nothing ever says he let go", async () => {
    await h.seat();
    await h.post("hold", { me: HIM, on: true });
    expect((await h.view(HER)).heldByThem).toBe(true);
    // A hold is seconds. A minute later it is a tab that died without its socket noticing.
    h.away(1);
    expect((await h.view(HER)).heldByThem).toBe(false);
  });

  it("is his to do, not hers", async () => {
    await h.seat();
    await h.post("hold", { me: HER, on: true });
    expect((await h.view(HIM)).heldByThem).toBe(false);
    expect((await h.view(HER)).heldByThem).toBe(false);
  });
});

describe("touching something in the room", () => {
  it("reaches the other one and not the person who did it", async () => {
    await h.seat();
    const her = await connect(h.id, HER);
    await settle();
    expect((await h.post("poke", { me: HIM, what: "plant" })).status).toBe(200);
    await settle();

    expect(her.got.at(-1)!.view!.pokedByThem?.what).toBe("plant");
    // His own tap already moved his own room. Sent back, it would play the wobble twice.
    expect((await h.view(HIM)).pokedByThem).toBeNull();
    her.ws.close();
  });

  it("goes on its own, so a reload does not replay it", async () => {
    await h.seat();
    await h.post("poke", { me: HIM, what: "door" });
    expect((await h.view(HER)).pokedByThem?.what).toBe("door");
    h.away(1);
    expect((await h.view(HER)).pokedByThem).toBeNull();
  });

  it("refuses furniture the room does not have", async () => {
    await h.seat();
    expect((await h.post("poke", { me: HIM, what: "chandelier" })).status).toBe(400);
    expect((await h.view(HER)).pokedByThem).toBeNull();
  });

  it("is private to the two seats", async () => {
    await h.seat();
    await h.post("poke", { me: HIM, what: "shelf" });
    expect((await h.view(STRANGER)).pokedByThem).toBeNull();
    expect((await h.post("poke", { me: STRANGER, what: "shelf" })).status).toBe(200);
    // The stranger's tap reached nobody: hers still shows his, not theirs.
    expect((await h.view(HER)).pokedByThem?.what).toBe("shelf");
  });

  it("stays out of the log, because it is not something you did for them", async () => {
    await h.seat();
    await h.post("poke", { me: HER, what: "bed" });
    expect((await h.view(HIM)).theirRecent).toEqual([]);
  });
});

describe("both reaching for the same thing", () => {
  it("is the one moment that goes to both of them", async () => {
    await h.seat();
    await h.post("poke", { me: HIM, what: "plant" });
    await h.tick(20);
    await h.post("poke", { me: HER, what: "plant" });

    // Everything else in the room is one of them doing something to the other. This is neither.
    expect((await h.view(HIM)).reachedTogether?.what).toBe("plant");
    expect((await h.view(HER)).reachedTogether?.what).toBe("plant");
  });

  it("needs the same thing, not just the same moment", async () => {
    await h.seat();
    await h.post("poke", { me: HIM, what: "plant" });
    await h.tick(20);
    await h.post("poke", { me: HER, what: "door" });
    expect((await h.view(HIM)).reachedTogether).toBeNull();
  });

  it("needs two of you, so drumming on it alone is not a moment", async () => {
    await h.seat();
    await h.post("poke", { me: HIM, what: "bed" });
    await h.tick(20);
    await h.post("poke", { me: HIM, what: "bed" });
    expect((await h.view(HER)).reachedTogether).toBeNull();
  });

  it("needs the same moment, not the same thing an hour apart", async () => {
    await h.seat();
    await h.post("poke", { me: HIM, what: "shelf" });
    h.away(1);
    await h.post("poke", { me: HER, what: "shelf" });
    expect((await h.view(HIM)).reachedTogether).toBeNull();
  });

  it("is not something a stranger can be half of", async () => {
    await h.seat();
    await h.post("poke", { me: HIM, what: "window" });
    await h.tick(20);
    await h.post("poke", { me: STRANGER, what: "window" });
    expect((await h.view(HIM)).reachedTogether).toBeNull();
  });
});
