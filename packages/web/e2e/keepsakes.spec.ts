import { expect, test } from "@playwright/test";

test("both revisit kept gifts with their original words and can retry a failed read", async ({
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
    const words = her.getByLabel("Something to say with the thing you leave him", { exact: true });
    await words.fill("The first leaf was for your desk.");
    await her.getByRole("button", { name: "a leaf", exact: true }).click();
    await page.getByRole("button", { name: "Keep the leaf", exact: true }).click();
    await expect(page.getByRole("button", { name: "Kept", exact: true })).toBeVisible();
    await words.fill("This one is for your pocket.");
    await her.getByRole("button", { name: "a leaf", exact: true }).click();
    await page.getByRole("button", { name: "Keep the leaf", exact: true }).click();
    await page.reload();
    await page.route("**/keepsakes?*", (route) => route.abort());
    await page.getByRole("button", { name: "Kept gifts", exact: true }).click();
    const panel = page.getByRole("region", { name: "Kept gifts", exact: true });
    await expect(panel.getByRole("alert")).toContainText("Couldn’t open the kept gifts.");
    await expect(panel.getByText("Gifts will be here after you keep them.")).toHaveCount(0);
    await page.unroute("**/keepsakes?*");
    await panel.getByRole("button", { name: "Try again", exact: true }).click();
    await expect(panel.getByText("The first leaf was for your desk.", { exact: true })).toBeVisible();
    await expect(panel.getByText("This one is for your pocket.", { exact: true })).toBeVisible();
    await panel.getByRole("button", { name: "Close kept gifts", exact: true }).click();
    await expect(page.getByRole("button", { name: "Kept gifts", exact: true })).toBeFocused();
    await her.getByRole("button", { name: "Kept gifts", exact: true }).click();
    await expect(
      her
        .getByRole("region", { name: "Kept gifts", exact: true })
        .getByText("The first leaf was for your desk.", { exact: true }),
    ).toBeVisible();
  } finally {
    await context.close();
  }
});
