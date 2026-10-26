import { expect, test } from "@playwright/test";

test("a prepared postcard shares from its own click and cancellation does not download twice", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page.getByLabel("Your name", { exact: true }).fill("Review companion");
  await page.getByRole("button", { name: "Make a room" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toContainText("room");
  await page.evaluate(() => {
    Object.defineProperty(navigator, "canShare", { configurable: true, value: () => true });
    Object.defineProperty(navigator, "share", {
      configurable: true,
      value: (data: ShareData) => {
        Object.assign(window, {
          postcardShare: { active: navigator.userActivation.isActive, files: data.files?.length },
        });
        return Promise.reject(new DOMException("Cancelled", "AbortError"));
      },
    });
  });
  let downloads = 0;
  page.on("download", () => {
    downloads += 1;
  });
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Make a postcard", exact: true }).click();
  expect((await download).suggestedFilename()).toMatch(/\.png$/);
  const share = page.getByRole("button", { name: "Share postcard", exact: true });
  await share.click();
  await expect(share).toBeEnabled();
  expect(await page.evaluate(() => (window as unknown as { postcardShare: unknown }).postcardShare)).toEqual({
    active: true,
    files: 1,
  });
  expect(downloads).toBe(1);
  await expect(page.getByRole("alert")).toHaveCount(0);
  await page.screenshot({ path: test.info().outputPath("postcard-ready-390.png"), animations: "disabled" });
});
