import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { noticed, resetSessionCache } from "./discoveries.js";

/*
 * The reporter is called from inside the canvas animation loop, so the only behaviour that really
 * matters is that it stays quiet. A secret whose visual lasts six seconds is being re-triggered on
 * every frame it is checked, and one request per frame would be a few hundred posts for one piano.
 */

const ROOM = "abcdef";
const ME = "me-token";

let fetchMock: ReturnType<typeof vi.fn>;

/*
 * A localStorage of our own.
 *
 * These tests run in node, where there is no DOM, and the rest of this package's suite is pure logic
 * so there is no jsdom to lean on. Pulling one in for a nine-line stub would be the wrong trade: the
 * only browser API this module touches is get/set on one key.
 */
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

beforeEach(() => {
  resetSessionCache();
  vi.stubGlobal("localStorage", fakeStorage());
  fetchMock = vi.fn(async () => new Response("{}", { status: 200 }));
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("reporting a discovery", () => {
  it("posts the key to the room", async () => {
    noticed(ROOM, ME, "piano");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe(`/api/room/${ROOM}/found`);
    expect(JSON.parse(String((init as RequestInit).body))).toEqual({ me: ME, key: "piano" });
  });

  it("sends each secret exactly once, however many times it fires", () => {
    for (let i = 0; i < 200; i++) noticed(ROOM, ME, "piano");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("still reports a different secret", () => {
    noticed(ROOM, ME, "piano");
    noticed(ROOM, ME, "mouse");
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("stays quiet across a reload, because the device remembers", () => {
    noticed(ROOM, ME, "piano");
    resetSessionCache(); // a fresh page, same localStorage
    noticed(ROOM, ME, "piano");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("does nothing outside a room", () => {
    noticed(null, ME, "piano");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("uses keepalive, since finding something is often the last thing you do before closing the tab", () => {
    noticed(ROOM, ME, "piano");
    expect((fetchMock.mock.calls[0]![1] as RequestInit).keepalive).toBe(true);
  });

  it("swallows a failed request instead of surfacing it", async () => {
    fetchMock.mockImplementation(async () => {
      throw new Error("offline");
    });
    // Nothing a person could do with "we could not record that you found the mouse", and it must not
    // become an unhandled rejection either.
    expect(() => noticed(ROOM, ME, "mouse")).not.toThrow();
    await Promise.resolve();
  });

  it("survives storage being unavailable, and just reports again next time", () => {
    const boom = (): never => {
      throw new Error("private mode");
    };
    vi.stubGlobal("localStorage", fakeStorage({ getItem: boom, setItem: boom }));

    // Private-mode Safari throws rather than no-ops. Losing the dedupe is acceptable; losing the
    // secret is not.
    expect(() => noticed(ROOM, ME, "yarn")).not.toThrow();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("ignores junk left in its storage key", () => {
    localStorage.setItem("mrrp:found", "not json at all");
    expect(() => noticed(ROOM, ME, "treat")).not.toThrow();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
