// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from "vitest";

beforeEach(() => {
  localStorage.clear();
  vi.resetModules();
});
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

it("persists a replacement before posting, keeps other rooms intact and routes writes by room", async () => {
  const api = await import("./api.js");
  const original = api.myToken();
  const fetch = vi.fn(async (_path: string, init?: RequestInit) => {
    const body = JSON.parse(init?.body as string) as { me: string; next: string };
    if (body.next) {
      expect(api.myToken("abc123")).toBe(body.next);
      expect(localStorage.getItem("mrrp:access:abc123")).toContain(body.next);
      expect(body.me).toBe(original);
    }
    return Response.json({ ok: true });
  });
  vi.stubGlobal("fetch", fetch);
  await api.doRotate("abc123");
  const next = api.myToken("abc123");
  expect(next).not.toBe(original);
  expect(api.myToken("def456")).toBe(original);
  expect(localStorage.getItem("mrrp:access:abc123")).toBeNull();
  await api.doAct("abc123", "brush");
  expect(JSON.parse(fetch.mock.calls.at(-1)![1]?.body as string).me).toBe(next);
  await api.doAct("def456", "brush");
  expect(JSON.parse(fetch.mock.calls.at(-1)![1]?.body as string).me).toBe(original);
});

it("finishes the exact same replacement after a lost reply and a page reload", async () => {
  const api = await import("./api.js");
  const fetch = vi.fn().mockRejectedValueOnce(new TypeError("lost reply"));
  vi.stubGlobal("fetch", fetch);
  await expect(api.doRotate("abc123")).rejects.toThrow("Try it again");
  const first = JSON.parse(fetch.mock.calls[0]![1].body as string);
  expect(api.myToken("abc123")).toBe(first.next);
  vi.resetModules();
  const refreshed = await import("./api.js");
  fetch.mockResolvedValueOnce(Response.json({ ok: true }));
  fetch.mockResolvedValueOnce(Response.json({ seat: first.next }));
  const view = await refreshed.fetchRoom("abc123");
  expect(JSON.parse(fetch.mock.calls[1]![1].body as string)).toEqual(first);
  expect(view.seat).toBe(first.next);
  expect(localStorage.getItem("mrrp:access:abc123")).toBeNull();
});

it("does not contact the server if a replacement cannot be kept on this device", async () => {
  const api = await import("./api.js");
  const original = api.myToken();
  const fetch = vi.fn();
  vi.stubGlobal("fetch", fetch);
  const setItem = Storage.prototype.setItem;
  vi.spyOn(Storage.prototype, "setItem").mockImplementation(function (this: Storage, key, value) {
    if (key.startsWith("mrrp:seat:")) throw new DOMException("full", "QuotaExceededError");
    setItem.call(this, key, value);
  });
  await expect(api.doRotate("abc123")).rejects.toThrow("Nothing has been revoked");
  expect(fetch).not.toHaveBeenCalled();
  expect(api.myToken("abc123")).toBe(original);
});

it("rolls back a denied change without discarding the current room identity", async () => {
  const api = await import("./api.js");
  const original = api.myToken();
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({}, { status: 403 })));
  await expect(api.doRotate("abc123")).rejects.toThrow("not accepted");
  expect(api.myToken("abc123")).toBe(original);
  expect(localStorage.getItem("mrrp:access:abc123")).toBeNull();
});

it("keeps recovery and account adoption local to one room", async () => {
  const api = await import("./api.js");
  const original = api.myToken();
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({ ok: true })));
  await api.doRecover("abc123", "aaaa-bbbb-cccc");
  expect(api.myToken("abc123")).not.toBe(original);
  expect(api.myToken("def456")).toBe(original);
  await api.adoptSeat("accountseat1234", "abc123");
  expect(api.myToken("abc123")).toBe("accountseat1234");
  expect(api.myToken("def456")).toBe(original);
  api.forgetMe("abc123");
  expect(api.myToken("abc123")).not.toBe("accountseat1234");
  expect(api.myToken("def456")).toBe(original);
});

it("a stale read cannot put an old key back after another tab replaces it", async () => {
  const api = await import("./api.js");
  const original = api.myToken();
  await api.adoptSeat("newfromanothertab", "abc123");
  expect(await api.adoptSeat(original, "abc123", original)).toBe(false);
  expect(api.myToken("abc123")).toBe("newfromanothertab");
  expect(await api.adoptSeat("newfromanothertab", "abc123", original)).toBe(true);
});

it("finishes a pending replacement before sending another room action", async () => {
  const api = await import("./api.js");
  const fetch = vi.fn().mockRejectedValueOnce(new TypeError("lost reply"));
  vi.stubGlobal("fetch", fetch);
  await expect(api.doRotate("abc123")).rejects.toThrow();
  fetch.mockResolvedValue(Response.json({ ok: true }));
  await api.doAct("abc123", "brush");
  expect(fetch.mock.calls.slice(1).map((call) => call[0])).toEqual([
    "/api/room/abc123/rotate",
    "/api/room/abc123/act",
  ]);
  expect(JSON.parse(fetch.mock.calls[1]![1].body).next).toBe(JSON.parse(fetch.mock.calls[2]![1].body).me);
});

it("keeps the owner's deletion Undo available during an unfinished replacement", async () => {
  const api = await import("./api.js");
  const original = api.myToken();
  const fetch = vi.fn().mockRejectedValueOnce(new TypeError("request lost before commit"));
  vi.stubGlobal("fetch", fetch);
  await expect(api.doRotate("abc123")).rejects.toThrow();
  fetch.mockImplementation(async (path: string) =>
    Response.json({ undoUntil: path.includes(original) ? 12345 : null }, { status: 410 }),
  );
  expect(await api.roomDeletion("abc123")).toEqual({ undoUntil: 12345 });
  fetch.mockImplementation(async (_path: string, init?: RequestInit) =>
    Response.json({}, { status: JSON.parse(init?.body as string).me === original ? 200 : 403 }),
  );
  await expect(api.doUndelete("abc123")).resolves.toBeUndefined();
});
