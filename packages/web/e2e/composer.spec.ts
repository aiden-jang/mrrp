import { test, expect } from "@playwright/test";

test("a long reply keeps its actions reachable on a short phone", async ({ page, browser }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await page.getByPlaceholder("your name").fill("River");
  await page.getByRole("button", { name: "Make a room", exact: true }).click();
  await expect(page.getByRole("heading", { level: 1 })).toContainText("room");
  const guest = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: "reduce" });
  try {
    const her = await guest.newPage();
    await her.goto(page.url());
    await her.getByRole("button", { name: "Go in", exact: true }).click();
    await her.getByRole("button", { name: /Say something back/ }).click();
    const input = her.getByLabel("Your answer", { exact: true });
    const message = "괜찮아 🌱\n".repeat(20).trim();
    await input.fill(message);
    expect((await input.boundingBox())!.height).toBeLessThanOrEqual(240);
    await her.setViewportSize({ width: 390, height: 420 });
    const save = her.getByRole("button", { name: "Leave it", exact: true });
    await save.scrollIntoViewIfNeeded();
    await expect(input).toBeInViewport({ ratio: 1 });
    await expect(save).toBeInViewport({ ratio: 1 });
    await expect(input).toHaveValue(message);
    expect(await her.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await her.screenshot({ path: test.info().outputPath("reply-short-phone.png"), animations: "disabled" });
    await her.setViewportSize({ width: 1440, height: 900 });
    await save.scrollIntoViewIfNeeded();
    await her.screenshot({ path: test.info().outputPath("reply-desktop.png"), animations: "disabled" });
    await her.route("**/api/room/*/say", (route) => route.fulfill({ status: 503, body: "unavailable" }));
    await save.click();
    await expect(her.getByRole("alert")).toContainText("Couldn't leave that.");
    await expect(input).toHaveValue(message);
    await her.unroute("**/api/room/*/say");
    await save.click();
    await expect(input).toHaveCount(0);
    await expect(her.getByText(message, { exact: true })).toBeVisible();
  } finally {
    await guest.close();
  }
});
