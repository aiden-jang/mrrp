import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test("blocked storage has a readable recovery screen and can be retried", async ({ page }) => {
  await page.addInitScript(() => {
    const write = Storage.prototype.setItem;
    Storage.prototype.setItem = () => {
      throw new DOMException("Blocked", "SecurityError");
    };
    Object.assign(window, {
      restoreSeatStorage: () => {
        Storage.prototype.setItem = write;
      },
    });
  });
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "This browser can’t keep your seat yet." })).toBeVisible();
  for (const width of [320, 1440]) {
    await page.setViewportSize({ width, height: 844 });
    expect(
      (await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze()).violations,
    ).toEqual([]);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: test.info().outputPath(`storage-${width}.png`), animations: "disabled" });
  }
  await page.evaluate(() => (window as unknown as { restoreSeatStorage: () => void }).restoreSeatStorage());
  await page.getByRole("button", { name: "Try again" }).click();
  await expect(page.getByRole("button", { name: "Make a room" })).toBeVisible();
});

test("offline connection and action feedback stay separately readable", async ({
  page,
  browser,
  context,
}) => {
  await page.goto("/");
  await page.getByLabel("Your name", { exact: true }).fill("Review companion");
  await page.getByRole("button", { name: "Make a room" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toContainText("room");
  const other = await browser.newContext({ serviceWorkers: "block" });
  try {
    const her = await other.newPage();
    await her.goto(page.url());
    await her.getByRole("button", { name: "Go in", exact: true }).click();
    await page.getByRole("button", { name: "Pet her", exact: true }).waitFor();
    await context.setOffline(true);
    await page.getByRole("button", { name: "Pet her", exact: true }).click();
    const connection = page.getByRole("status").filter({ hasText: "You’re offline" });
    const action = page.getByText("That didn't reach her. Try it again.", { exact: true });
    await expect(connection).toBeVisible();
    await expect(action).toBeVisible();
    for (const width of [320, 1440]) {
      await page.setViewportSize({ width, height: 844 });
      const a = await connection.boundingBox();
      const b = await action.boundingBox();
      expect(a!.y + a!.height <= b!.y || b!.y + b!.height <= a!.y).toBe(true);
      await page.screenshot({
        path: test.info().outputPath(`offline-feedback-${width}.png`),
        animations: "disabled",
      });
    }
  } finally {
    await context.setOffline(false);
    await other.close();
  }
});
