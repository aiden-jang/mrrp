// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchRoom, fetchSaid, roomDeletion } from "./api";

afterEach(() => vi.unstubAllGlobals());

/* The bound itself is the platform's. What is worth pinning is that a timeout is handled like a
   dropped connection rather than escaping raw or reading as a deleted room. */
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
    expect(await roomDeletion("abc123")).toBeNull();
  });

  it("reaches a caller as a sentence, not as an abort", async () => {
    timesOut();
    await expect(fetchSaid("abc123")).rejects.toThrow("That took too long.");
  });
});
