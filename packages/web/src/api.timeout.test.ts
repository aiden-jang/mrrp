// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchRoom, fetchSaid, roomIsGone } from "./api";

afterEach(() => vi.unstubAllGlobals());

/**
 * What a bounded request does when it gives up.
 *
 * The bound itself is the platform's; what is worth pinning is that timing out is handled like a
 * dropped connection rather than escaping as "signal timed out" or reading as a deleted room.
 */
function timesOut(): void {
  vi.stubGlobal("fetch", () => Promise.reject(new DOMException("signal timed out", "TimeoutError")));
}

describe("a request that gives up", () => {
  it("tells the room screen to keep trying", async () => {
    timesOut();
    await expect(fetchRoom("abc123")).rejects.toThrow("Can't reach the room. Still trying.");
  });

  it("does not look like a deleted room", async () => {
    timesOut();
    expect(await roomIsGone("abc123")).toBe(false);
  });

  it("reaches a caller as a sentence, not as an abort", async () => {
    timesOut();
    await expect(fetchSaid("abc123")).rejects.toThrow("That took too long.");
  });
});
