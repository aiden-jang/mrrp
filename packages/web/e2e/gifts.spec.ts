import { expect, test } from "@playwright/test";

test("a gift stays through petting and is explicitly kept with a shared receipt", async ({
  page,
  browser,
}) => {
  await page.goto("/");
  await page.getByPlaceholder("your name").fill("Review companion");
  await page.getByRole("button", { name: "Make a room", exact: true }).click();
  const context = await browser.newContext({ serviceWorkers: "block" });
  try {
    const her = await context.newPage();
    await her.goto(page.url());
    await her.getByRole("button", { name: "Go in", exact: true }).click();
    await her
      .getByRole("textbox", { name: "Something to say with the thing you leave him" })
      .fill("found it for you");
    await her.getByRole("button", { name: "a leaf", exact: true }).click();
    const keep = page.getByRole("button", { name: "Keep the leaf", exact: true });
    await expect(keep).toBeVisible();
    await page.getByRole("button", { name: "Pet her", exact: true }).click();
    await expect(keep).toBeVisible();
    await page.route("**/keepgift", (route) => route.abort());
    await keep.focus();
    await keep.press("Enter");
    await expect(page.getByRole("alert")).toContainText("Couldn’t keep that. Try again.");
    await expect(keep).toBeEnabled();
    await expect(her.getByText(/kept your leaf/)).toHaveCount(0);
    await page.unroute("**/keepgift");
    await keep.press("Enter");
    const kept = page.getByRole("button", { name: "Kept", exact: true });
    await expect(kept).toBeDisabled();
    await expect(kept).toBeFocused();
    await expect(her.getByRole("status").filter({ hasText: "kept your leaf." })).toBeVisible();
    await expect(page.getByText("found it for you", { exact: true })).toBeVisible();
    await page.reload();
    await expect(page.getByRole("status").filter({ hasText: "You kept her leaf." })).toBeVisible();

    await her.getByRole("button", { name: "a leaf", exact: true }).click();
    await expect(keep).toBeEnabled();
    await page.route("**/keepgift", async (route) => {
      await her.getByRole("button", { name: "a leaf", exact: true }).click();
      await route.continue();
    });
    await keep.focus();
    await keep.press("Enter");
    await expect(page.getByRole("alert")).toContainText("That gift changed. Check what’s here now.");
    await expect(keep).toBeEnabled();
    await page.unroute("**/keepgift");
  } finally {
    await context.close();
  }
});
