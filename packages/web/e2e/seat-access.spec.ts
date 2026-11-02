import { mkdir } from "node:fs/promises";
import { test, expect, type Page } from "@playwright/test";

async function makeRoom(page: Page) {
  await page.goto("/");
  await page.getByLabel("Your name", { exact: true }).fill("Access owner");
  await page.getByRole("button", { name: "Make a room" }).click();
  await expect(page.getByRole("button", { name: /Write her notes/ })).toBeVisible();
  return { url: page.url(), id: page.url().split("/r/")[1]! };
}

async function token(page: Page, id: string) {
  return page.evaluate(
    (id) => localStorage.getItem(`mrrp:seat:${id}`) ?? localStorage.getItem("mrrp:me"),
    id,
  );
}

for (const width of [390, 1440]) {
  test(`replacing access preserves both people, another room and reload recovery at ${width}px`, async ({
    page,
    browser,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    const first = await makeRoom(page),
      other = await makeRoom(page);
    const original = await token(page, first.id),
      otherKey = await token(page, other.id);
    const guest = await browser.newContext();
    try {
      const her = await guest.newPage();
      await her.goto(first.url);
      await her.getByRole("button", { name: "Go in", exact: true }).click();
      await expect(her.getByRole("button", { name: /Say something back/ })).toBeVisible();
      const herKey = await token(her, first.id);
      await page.goto(first.url, { waitUntil: "domcontentloaded" });
      await expect(page.getByRole("button", { name: /Write her notes/ })).toBeVisible();
      const before = await (await page.request.get(`/api/room/${first.id}?me=${original}`)).json();
      await page.getByText("Room & account", { exact: true }).click();
      await page.getByText("refresh room access", { exact: true }).click();
      if (process.env.MRRP_ACCESS_QA) {
        await mkdir(process.env.MRRP_ACCESS_QA, { recursive: true });
        await page.screenshot({ path: `${process.env.MRRP_ACCESS_QA}/access-${width}.png`, fullPage: true });
      }
      let interrupted = false;
      await page.route(`**/api/room/${first.id}/rotate`, async (route) => {
        if (!interrupted) {
          interrupted = true;
          await route.fetch();
          await route.abort("failed");
        } else await route.continue();
      });
      await page.getByRole("button", { name: "Replace my key", exact: true }).click();
      await expect(page.getByRole("alert")).toContainText("Try it again");
      const next = await token(page, first.id);
      expect(next).not.toBe(original);
      await page.reload();
      await expect(page.getByRole("button", { name: /Write her notes/ })).toBeVisible();
      const after = await (await page.request.get(`/api/room/${first.id}?me=${next}`)).json();
      expect(after.recoveryCode).toBe(before.recoveryCode);
      expect(after.youAreHer).toBe(false);
      const old = await (await page.request.get(`/api/room/${first.id}?me=${original}`)).json();
      expect(old.seat).toBeNull();
      await her.reload();
      await expect(her.getByRole("button", { name: /Say something back/ })).toBeVisible();
      expect(await token(her, first.id)).toBe(herKey);
      await page.goto(other.url);
      await expect(page.getByRole("button", { name: /Write her notes/ })).toBeVisible();
      expect(await token(page, other.id)).toBe(otherKey);
    } finally {
      await guest.close();
    }
  });
}
