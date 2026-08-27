import { describe, expect, it } from "vitest";
import {
  arrivalsFor,
  bothFound,
  DISCOVERY_KEYS,
  foundCount,
  isDiscoveryKey,
  recordFound,
  type FoundLedger,
} from "./discoveries.js";

const HIM = "him-token";
const HER = "her-token";

describe("the allowlist", () => {
  it("accepts the keys the room actually has", () => {
    for (const key of DISCOVERY_KEYS) expect(isDiscoveryKey(key)).toBe(true);
  });

  it("refuses anything else, because the client is not the authority", () => {
    for (const junk of ["", "PIANO", "piano ", "__proto__", "constructor", 7, null, undefined, {}]) {
      expect(isDiscoveryKey(junk)).toBe(false);
    }
  });
});

describe("recording a find", () => {
  it("keeps the first time somebody noticed, not the latest", () => {
    let ledger: FoundLedger = {};
    ledger = recordFound(ledger, "piano", HIM, 1000).ledger;
    const second = recordFound(ledger, "piano", HIM, 5000);

    expect(second.isNew).toBe(false);
    expect(second.ledger.piano?.[HIM]).toBe(1000);
  });

  it("does not resurface an old find as new", () => {
    let ledger: FoundLedger = {};
    ledger = recordFound(ledger, "piano", HIM, 1000).ledger;
    ledger = recordFound(ledger, "piano", HIM, 9000).ledger;
    expect(arrivalsFor(ledger, HER, HIM, 5000)).toEqual([]);
  });

  it("tracks the two seats separately", () => {
    let ledger: FoundLedger = {};
    ledger = recordFound(ledger, "piano", HIM, 1000).ledger;
    const hers = recordFound(ledger, "piano", HER, 2000);
    expect(hers.isNew).toBe(true);
    expect(Object.keys(hers.ledger.piano ?? {})).toHaveLength(2);
  });

  it("does not mutate the ledger it was given", () => {
    const before: FoundLedger = { piano: { [HIM]: 1000 } };
    const snapshot = JSON.stringify(before);
    recordFound(before, "mouse", HER, 2000);
    expect(JSON.stringify(before)).toBe(snapshot);
  });
});

describe("the count", () => {
  it("counts things noticed, not times noticed", () => {
    let ledger: FoundLedger = {};
    ledger = recordFound(ledger, "piano", HIM, 1).ledger;
    ledger = recordFound(ledger, "piano", HER, 2).ledger;
    ledger = recordFound(ledger, "mouse", HER, 3).ledger;
    expect(foundCount(ledger)).toBe(2);
  });

  it("is zero on a room nobody has poked at", () => {
    expect(foundCount({})).toBe(0);
  });

  it("ignores a key that was recorded but has no finders", () => {
    expect(foundCount({ piano: {} })).toBe(0);
  });
});

describe("telling you what the other one found", () => {
  it("reports their find and leaves it unnamed when you have not found it", () => {
    const ledger: FoundLedger = { piano: { [HER]: 5000 } };
    const [arrival] = arrivalsFor(ledger, HIM, HER, 1000);
    expect(arrival).toMatchObject({ key: "piano", at: 5000, mutual: false });
  });

  it("marks it mutual once you have found it too", () => {
    const ledger: FoundLedger = { piano: { [HER]: 5000, [HIM]: 200 } };
    expect(arrivalsFor(ledger, HIM, HER, 1000)[0]?.mutual).toBe(true);
  });

  it("says nothing about what you found yourself", () => {
    const ledger: FoundLedger = { piano: { [HIM]: 5000 } };
    expect(arrivalsFor(ledger, HIM, HER, 1000)).toEqual([]);
  });

  it("only covers what happened since you last looked", () => {
    const ledger: FoundLedger = { piano: { [HER]: 500 }, mouse: { [HER]: 5000 } };
    const keys = arrivalsFor(ledger, HIM, HER, 1000).map((a) => a.key);
    expect(keys).toEqual(["mouse"]);
  });

  it("puts the newest first and caps the list", () => {
    const ledger: FoundLedger = {
      piano: { [HER]: 2000 },
      mouse: { [HER]: 3000 },
      catnip: { [HER]: 4000 },
      yarn: { [HER]: 5000 },
      treat: { [HER]: 6000 },
    };
    const arrivals = arrivalsFor(ledger, HIM, HER, 1000);
    expect(arrivals).toHaveLength(3);
    expect(arrivals.map((a) => a.key)).toEqual(["treat", "yarn", "catnip"]);
  });

  it("skips a stored key that is no longer in the allowlist", () => {
    const ledger: FoundLedger = { retiredThing: { [HER]: 5000 }, piano: { [HER]: 6000 } };
    expect(arrivalsFor(ledger, HIM, HER, 1000).map((a) => a.key)).toEqual(["piano"]);
  });

  it("is empty on a room where nothing has been found", () => {
    expect(arrivalsFor({}, HIM, HER, 0)).toEqual([]);
  });
});

describe("what both of them found", () => {
  it("is true only when each seat has it", () => {
    const ledger = { herName: { him: 1, her: 2 }, piano: { him: 1 } };
    expect(bothFound(ledger, "herName", "him", "her")).toBe(true);
    expect(bothFound(ledger, "piano", "him", "her")).toBe(false);
  });

  it("is false for a secret nobody has found", () => {
    expect(bothFound({}, "herName", "him", "her")).toBe(false);
  });

  it("does not count one seat twice", () => {
    expect(bothFound({ herName: { him: 1 } }, "herName", "him", "him")).toBe(true);
    expect(bothFound({ herName: { him: 1 } }, "herName", "him", "her")).toBe(false);
  });
});
