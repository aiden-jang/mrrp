import { expect, test, type Locator } from "@playwright/test";

async function keyboardStroke(surface: Locator) {
  await surface.focus();
  await surface.press("Enter");
  await surface.press("ArrowRight");
  await surface.press("ArrowRight");
  await surface.press("ArrowDown");
  await surface.press("Enter");
}

test("both draw independently, retry without duplicates, and keep drafts through live edits", async ({
  page,
  browser,
}) => {
  await page.goto("/");
  await page.getByPlaceholder("your name").fill("Review companion");
  await page.getByRole("button", { name: "Make a room", exact: true }).click();
  const context = await browser.newContext({
    viewport: { width: 320, height: 850 },
    hasTouch: true,
    serviceWorkers: "block",
  });
  try {
    const her = await context.newPage();
    await her.goto(page.url());
    await her.getByRole("button", { name: "Go in", exact: true }).click();
    const hisSummary = page.getByText("Draw on the window", { exact: true });
    const herSummary = her.getByText("Draw on the window", { exact: true });
    await hisSummary.click();
    await herSummary.click();
    const hisSurface = page.getByRole("application", { name: "Shared window drawing" });
    const herSurface = her.getByRole("application", { name: "Shared window drawing" });
    await keyboardStroke(hisSurface);
    await her.getByRole("button", { name: "Rose", exact: true }).click();
    await keyboardStroke(herSurface);
    const saveHim = page.getByRole("button", { name: "Save strokes", exact: true });
    const saveHer = her.getByRole("button", { name: "Save strokes", exact: true });
    const ids: string[][] = [];
    await her.route("**/window-drawing", (route) => {
      ids.push(
        (route.request().postDataJSON() as { strokes: { id: string }[] }).strokes.map((stroke) => stroke.id),
      );
      return route.abort();
    });
    await saveHer.click();
    await expect(her.getByRole("alert")).toContainText("They’re still here. Try again.");
    await expect(herSurface.locator("polyline")).toHaveCount(1);
    await saveHim.click();
    await expect(herSurface.locator("polyline")).toHaveCount(2);
    await expect(saveHer).toBeEnabled();
    await herSummary.click();
    await herSummary.click();
    await expect(herSurface.locator("polyline")).toHaveCount(2);
    await her.unroute("**/window-drawing");
    const retry = her.waitForRequest("**/window-drawing");
    await saveHer.click();
    const body = (await retry).postDataJSON() as { strokes: { id: string }[] };
    expect(body.strokes.map((stroke) => stroke.id)).toEqual(ids[0]);
    await expect(hisSurface.locator("polyline")).toHaveCount(2);
    await expect(her.getByRole("alert")).toHaveCount(0);
    await expect(saveHer).toBeDisabled();
    await page.reload();
    await her.reload();
    await hisSummary.click();
    await herSummary.click();
    await expect(hisSurface.locator("polyline")).toHaveCount(2);
    await expect(herSurface.locator("polyline")).toHaveCount(2);
    await keyboardStroke(hisSurface);
    await page.getByRole("button", { name: "Undo unsaved stroke", exact: true }).click();
    await expect(hisSurface.locator("polyline")).toHaveCount(2);
    await herSurface.tap({ position: { x: 40, y: 45 } });
    await expect(herSurface.locator("circle[fill]")).toHaveCount(1);
    await saveHer.click();
    await expect(hisSurface.locator("circle[fill]")).toHaveCount(1);

    await expect(herSurface).toHaveAttribute("aria-disabled", "false");
    await keyboardStroke(herSurface);
    await expect(saveHer).toBeEnabled();
    await herSummary.click();
    await her.route("/", (route) =>
      route.fulfill({
        contentType: "text/html",
        body: '<script type="module" src="/assets/next.js"></script>',
      }),
    );
    const checked = her.waitForResponse((response) => new URL(response.url()).pathname === "/");
    await her.evaluate(() => window.dispatchEvent(new Event("focus")));
    await checked;
    const reload = her.getByRole("button", { name: "Reload app", exact: true });
    await expect(reload).toHaveCount(0);
    await herSummary.click();
    await expect(herSurface.locator("polyline")).toHaveCount(3);
    await saveHer.click();
    await expect(saveHer).toBeDisabled();
    await herSummary.click();
    await expect(reload).toBeVisible();
  } finally {
    await context.close();
  }
});
