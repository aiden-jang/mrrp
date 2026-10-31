import { mkdir } from "node:fs/promises";
import { expect, test, type Page } from "@playwright/test";

async function makeRoom(page: Page) {
  await page.goto("/");
  await page.getByLabel("Your name", { exact: true }).fill("Undo owner");
  await page.getByRole("button", { name: "Make a room" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toContainText("room");
  return page.url();
}

async function deleteRoom(page: Page) {
  await page.getByText("Room & account", { exact: false }).click();
  await page.getByText("delete this room", { exact: true }).click();
  await page.getByLabel("Type Undo owner to confirm deleting this room").fill("Undo owner");
  await page.getByRole("button", { name: "Delete this room for both of us" }).click();
  await expect(page.getByRole("heading", { name: "you deleted this room" })).toBeVisible();
}

for (const width of [390, 1440]) {
  test(`the owner can undo deletion after repeated reloads at ${width}px`, async ({ page, browser }) => {
    await page.setViewportSize({ width, height: width === 390 ? 844 : 900 });
    const url = await makeRoom(page);
    const visitor = await browser.newContext();
    try {
      const door = await visitor.newPage();
      await door.goto(url);
      await expect(door.getByRole("button", { name: "Go in", exact: true })).toBeVisible();
      await deleteRoom(page);

      for (let reload = 0; reload < 2; reload++) {
        await page.reload();
        await expect(page.getByRole("heading", { name: "you deleted this room" })).toBeVisible();
        await expect(page.getByRole("button", { name: "Put the room back" })).toBeEnabled();
      }
      if (process.env.MRRP_UNDO_QA) {
        await mkdir(process.env.MRRP_UNDO_QA, { recursive: true });
        await page.screenshot({ path: `${process.env.MRRP_UNDO_QA}/undo-${width}.png` });
      }
      await door.reload();
      await expect(door.getByRole("heading", { name: "this room is gone" })).toBeVisible();
      await expect(door.getByRole("button", { name: "Put the room back" })).toHaveCount(0);

      await page.getByRole("button", { name: "Put the room back" }).click();
      await expect(page.getByRole("button", { name: /Write her notes/ })).toBeVisible();
      await expect(page.getByRole("button", { name: "Go in", exact: true })).toHaveCount(0);
      await door.reload();
      await expect(door.getByRole("button", { name: "Go in", exact: true })).toBeVisible();
    } finally {
      await visitor.close();
    }
  });
}

test("another owner tab gets the authoritative deletion recovery deadline", async ({ page, context }) => {
  const url = await makeRoom(page);
  const other = await context.newPage();
  let liveReady = false;
  other.on("websocket", (socket) => socket.on("framereceived", () => (liveReady = true)));
  await other.goto(url);
  await expect(other.getByRole("heading", { level: 1 })).toContainText("room");
  await expect.poll(() => liveReady).toBe(true);
  await deleteRoom(page);
  await expect(other.getByRole("heading", { name: "you deleted this room" })).toBeVisible();
  await other.reload();
  await expect(other.getByRole("button", { name: "Put the room back" })).toBeEnabled();
  await other.getByRole("button", { name: "Put the room back" }).click();
  await expect(other.getByRole("button", { name: /Write her notes/ })).toBeVisible();
});
