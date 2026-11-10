import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const CIRCLE = process.env.DEMO_CIRCLE_ID ?? "0xd50b0e10438c1fe18bc1f9896788080fc7662de94954da7ddfa1209ae13c4475";
const VIEWPORTS = [[375, 812], [390, 844], [412, 915], [768, 1024], [1024, 768], [1440, 900], [1920, 1080]] as const;
const PAGES = ["/", "/app", "/judge", "/proof", `/c/${CIRCLE}`, `/c/${CIRCLE}/memory`, `/c/${CIRCLE}/join`, `/c/${CIRCLE}/stewards`];

for (const [w, h] of VIEWPORTS) {
  for (const path of PAGES) {
    test(`${w}x${h} ${path.replace(CIRCLE, "[id]")}`, async ({ page }) => {
      const errors: string[] = [];
      page.on("console", (m) => { if (m.type() === "error" && !/favicon|Failed to load resource.*(404|502)/.test(m.text())) errors.push(m.text()); });
      page.on("pageerror", (e) => errors.push(e.message));
      await page.setViewportSize({ width: w, height: h });
      await page.goto(path, { waitUntil: "networkidle" });
      await expect(page.locator("main")).toBeVisible();
      // no horizontal scroll
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(overflow, "horizontal overflow in px").toBeLessThanOrEqual(1);
      // navbar fits
      const nav = await page.locator("nav.nav").boundingBox();
      expect(nav!.x).toBeGreaterThanOrEqual(0); expect(nav!.x + nav!.width).toBeLessThanOrEqual(w + 1);
      // touch targets
      if (w <= 1024) {
        const small = await page.evaluate(() => [...document.querySelectorAll("button, .btn")].filter((e) => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 && r.height < 43.5 && !e.closest(".nav .iconbtn"); }).map((e) => (e.textContent ?? "").trim().slice(0, 30)));
        expect(small, "buttons under 44px").toEqual([]);
      }
      // hero headline never overlaps the ring
      if (path === "/") {
        const a = await page.locator(".hero h1").boundingBox(); const b = await page.locator(".hero .art svg").boundingBox();
        if (a && b) expect(a.y + a.height <= b.y + 1 || a.x + a.width <= b.x + 1 || b.x + b.width <= a.x + 1, "headline overlaps ring").toBeTruthy();
      }
      const axe = await new AxeBuilder({ page: page as never }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze();
      expect(axe.violations.map((v) => `${v.id}: ${v.nodes.length}`), "axe violations").toEqual([]);
      expect(errors, "console errors").toEqual([]);
    });
  }
}
test("reduced motion renders", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/", { waitUntil: "networkidle" });
  await expect(page.locator(".hero h1")).toContainText("Save together");
});
