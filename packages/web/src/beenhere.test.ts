import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { beenHere, forgetRoom, markMine } from "./api.js";

const ROOM = "abcdef";

function fakeStorage(overrides: Partial<Storage> = {}): Storage {
  const map = new Map<string, string>();
  return {
    getItem: (k: string) => map.get(k) ?? null,
    setItem: (k: string, v: string) => void map.set(k, v),
    removeItem: (k: string) => void map.delete(k),
    clear: () => map.clear(),
    key: (i: number) => [...map.keys()][i] ?? null,
    get length() {
      return map.size;
    },
    ...overrides,
  } as Storage;
}

beforeEach(() => vi.stubGlobal("localStorage", fakeStorage()));
afterEach(() => vi.unstubAllGlobals());

describe("has this browser been in this room", () => {
  it("says no for a room it has never opened", () => {
    expect(beenHere(ROOM)).toBe(false);
  });

  it("says yes for a room it made", () => {
    markMine(ROOM);
    expect(beenHere(ROOM)).toBe(true);
  });

  it("says yes once a room has loaded, which is what existing rooms rely on", () => {
    // `lastCat` predates this check, so nobody already in a room gets asked again when it ships.
    localStorage.setItem(`mrrp:cat:${ROOM}`, JSON.stringify({ name: "Bean" }));
    expect(beenHere(ROOM)).toBe(true);
  });

  it("keeps rooms apart", () => {
    markMine(ROOM);
    expect(beenHere("zxcvbn")).toBe(false);
  });

  it("forgets the room when the room is forgotten", () => {
    markMine(ROOM);
    localStorage.setItem(`mrrp:cat:${ROOM}`, "{}");
    forgetRoom(ROOM);
    expect(beenHere(ROOM)).toBe(false);
  });

  it("says no rather than throwing in private mode", () => {
    const boom = (): never => {
      throw new Error("private mode");
    };
    vi.stubGlobal("localStorage", fakeStorage({ getItem: boom, setItem: boom }));
    expect(() => markMine(ROOM)).not.toThrow();
    expect(beenHere(ROOM)).toBe(false);
  });
});
