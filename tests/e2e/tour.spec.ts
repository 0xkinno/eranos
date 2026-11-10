import { test, expect } from "@playwright/test";
test("guided tour opens, advances with the keyboard and closes with Escape", async ({ page }) => {
  await page.goto("/", { waitUntil: "networkidle" });
  await page.getByTestId("tour-start").click();
  const card = page.getByTestId("tour-card");
  await expect(card).toContainText("Step 1 of 7");
  await page.keyboard.press("ArrowRight");
  await expect(card).toContainText("Step 2 of 7");
  await page.keyboard.press("ArrowLeft");
  await expect(card).toContainText("Step 1 of 7");
  await page.keyboard.press("Escape");
  await expect(card).toBeHidden();
});
test("landing page loads the circle data and the memory switch changes the reminder times", async ({ page }) => {
  await page.goto("/", { waitUntil: "networkidle" });
  await expect(page.getByTestId("latest-strip")).toContainText(/round|Round/);
  await expect(page.getByTestId("roll")).toContainText("agree");
  const times = page.getByTestId("reminder-times");
  await expect(times).toBeVisible({ timeout: 60_000 });
  const on = await times.innerText();
  await page.getByTestId("memory-switch").click();
  await expect.poll(async () => times.innerText()).not.toBe(on);
});
