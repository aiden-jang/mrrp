import { expect, test } from "@playwright/test";

test("two seats hide and search with keyboard and touch, recover failures, and remember a round", async ({
  page,
  browser,
}) => {
  await page.goto("/");
  await page.getByPlaceholder("your name").fill("Review companion");
  await page.getByRole("button", { name: "Make a room", exact: true }).click();
  const other = await browser.newContext({
    serviceWorkers: "block",
    hasTouch: true,
    reducedMotion: "reduce",
  });
  try {
    const her = await other.newPage();
    await her.goto(page.url());
    await her.getByRole("button", { name: "Go in", exact: true }).click();
    await her.getByText("Hide-and-seek", { exact: true }).click();
    const hide = her.getByRole("button", { name: "Hide behind the cushion", exact: true });
    await her.route("**/seek", (route) => route.abort());
    await hide.focus();
    await hide.press("Enter");
    await expect(her.getByRole("alert")).toContainText("Try again");
    await expect(page.getByRole("group", { name: "Look for her" })).toHaveCount(0);
    await expect(hide).toBeFocused();
    await her.unroute("**/seek");
    await hide.press("Enter");
    await expect(hide).toBeFocused();
    await expect(hide).toBeDisabled();
    await expect(page.getByText("Bean is hiding. Where could she be?", { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Pet her", exact: true })).toBeDisabled();
    await expect(page.locator("canvas")).toHaveAccessibleName(/She’s hiding/);
    const wrong = page.getByRole("button", { name: "Look behind the curtain", exact: true });
    await page.route("**/seek", (route) => route.abort());
    await wrong.focus();
    await wrong.press("Enter");
    await expect(page.getByRole("alert")).toContainText("Try again");
    await expect(wrong).toHaveAttribute("aria-pressed", "false");
    await page.unroute("**/seek");
    await wrong.press("Enter");
    await expect(page.getByText("Not behind the curtain. Try another place.", { exact: true })).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Look behind the curtain · checked", exact: true }),
    ).toBeFocused();
    await page.reload();
    await expect(
      page.getByRole("button", { name: "Look behind the curtain · checked", exact: true }),
    ).toBeDisabled();
    await her.reload();
    await expect(
      her.getByText("You’re hiding behind the cushion. He can look for you.", { exact: true }),
    ).toBeVisible();
    await page.getByText("Things in the room", { exact: true }).click();
    const bed = page.getByRole("button", { name: "the bed", exact: true });
    await bed.focus();
    await bed.press("Enter");
    await expect(page.getByText("Found behind the cushion! There you are.", { exact: true })).toBeVisible();
    await expect(bed).toBeFocused();
    await expect(her.getByText("Found behind the cushion! There you are.", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "End hide-and-seek", exact: true }).click();
    await expect(page.getByRole("group", { name: "Look for her" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Pet her", exact: true })).toBeEnabled();
    await expect(her.getByRole("button", { name: "Hide behind the cabinet", exact: true })).toBeEnabled();
    await her.getByRole("button", { name: "Hide behind the cabinet", exact: true }).tap();
    const cabinet = page.getByRole("button", { name: "Look behind the cabinet", exact: true });
    await expect(cabinet).toBeVisible();
    await cabinet.click();
    await expect(page.getByText("Found behind the cabinet! There you are.", { exact: true })).toBeVisible();
    await her.getByRole("button", { name: "End hide-and-seek", exact: true }).tap();
    await expect(page.getByRole("group", { name: "Look for her" })).toHaveCount(0);
  } finally {
    await other.close();
  }
});
