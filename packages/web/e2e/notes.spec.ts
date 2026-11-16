import { expect, test } from "@playwright/test";

test("she unfolds a note, returns to it, and keeps a reply through folding and live edits", async ({
  page,
  browser,
}) => {
  await page.goto("/");
  await page.getByPlaceholder("your name").fill("Review companion");
  await page.getByRole("button", { name: "Make a room", exact: true }).click();
  await page.getByRole("button", { name: "Write her notes", exact: true }).click();
  await page.getByLabel("Note for day 1", { exact: true }).fill("A tiny note for your afternoon.");
  await page.getByRole("button", { name: "Save notes", exact: true }).click();
  const context = await browser.newContext({ serviceWorkers: "block" });
  try {
    const her = await context.newPage();
    await her.goto(page.url());
    await her.getByRole("button", { name: "Go in", exact: true }).click();
    const original = her.getByText("A tiny note for your afternoon.", { exact: true });
    await expect(original).toHaveCount(1);
    await expect(original).toBeHidden();
    await her.locator("summary").filter({ hasText: "Open your note" }).focus();
    await her.locator("summary").filter({ hasText: "Open your note" }).press("Enter");
    await expect(original).toBeVisible();
    const room = new URL(her.url()).pathname.split("/").at(-1)!;
    await expect
      .poll(() => her.evaluate((id) => localStorage.getItem(`mrrp:opened-note:${id}`), room))
      .toMatch(/^[a-f0-9]{64}$/);
    await her.reload();
    await expect(original).toBeVisible();
    const reply = her.getByRole("button", { name: "Say something back", exact: true });
    await reply.click();
    const draft = her.getByLabel("Your answer", { exact: true });
    await draft.fill("Keeping these words while I think.");
    await her.getByText("Fold your note", { exact: true }).click();
    await expect(draft).toHaveValue("Keeping these words while I think.");
    await page.getByRole("button", { name: "Write her notes", exact: true }).click();
    await page.getByLabel("Note for day 1", { exact: true }).fill("A fresh note, still just for you.");
    await page.getByRole("button", { name: "Save notes", exact: true }).click();
    const updated = her.getByText("A fresh note, still just for you.", { exact: true });
    await expect(updated).toHaveCount(1);
    await expect(updated).toBeHidden();
    await expect(draft).toHaveValue("Keeping these words while I think.");
    await her.getByRole("button", { name: "Never mind", exact: true }).click();
    const fold = her.locator("summary").filter({ hasText: "Open your note" });
    await expect(fold).toBeFocused();
    await fold.press("Enter");
    await reply.click();
    await draft.fill("A tiny answer for you too.");
    await her.route("**/say", (route) => route.abort());
    await her.getByRole("button", { name: "Leave it", exact: true }).click();
    await expect(draft).toHaveValue("A tiny answer for you too.");
    await expect(her.getByRole("button", { name: "Leave it", exact: true })).toBeEnabled();
    await her.unroute("**/say");
    await her.getByRole("button", { name: "Leave it", exact: true }).click();
    await expect(reply).toBeFocused();
    await expect(page.getByText("A tiny answer for you too.", { exact: true })).toBeVisible();
  } finally {
    await context.close();
  }
});
