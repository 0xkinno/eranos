// Visual and geometry inspection with headless Chromium. Usage: node scripts/inspect-ui.mjs <baseUrl> <outDir>
import { chromium } from "playwright";
import { writeFileSync } from "node:fs";
const base = process.argv[2] ?? "http://localhost:3111", out = process.argv[3] ?? "/tmp/shots";
const CIRCLE = process.env.DEMO_CIRCLE_ID;
const pages = [["landing", "/"], ["app", "/app"], ["circle", `/c/${CIRCLE}`], ["memory", `/c/${CIRCLE}/memory`], ["join", `/c/${CIRCLE}/join`], ["stewards", `/c/${CIRCLE}/stewards`], ["proof", "/proof"], ["judge", "/judge"]];
const sizes = [["desktop", 1440, 900], ["mobile", 390, 844]];
const report = [];
const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium", args: ["--no-sandbox"] });
for (const [sn, w, h] of sizes) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: sn === "desktop" ? 1 : 2 });
  const page = await ctx.newPage();
  for (const [name, path] of pages) {
    await page.goto(base + path, { waitUntil: "networkidle" });
    await page.evaluate(async () => { await document.fonts.ready; for (let y = 0; y < document.body.scrollHeight; y += 350) { window.scrollTo(0, y); await new Promise((r) => setTimeout(r, 140)); } window.scrollTo(0, document.body.scrollHeight); await new Promise((r) => setTimeout(r, 700)); window.scrollTo(0, 0); await new Promise((r) => setTimeout(r, 900)); });
    const a = await page.evaluate(() => {
      const fams = ["Bricolage", "Instrument Serif", "Hanken", "JetBrains Mono"];
      const fonts = Object.fromEntries(fams.map((f) => [f, [...document.fonts].some((x) => x.family.replace(/"/g, "") === f && x.status === "loaded")]));
      const vw = document.documentElement.clientWidth;
      const svgs = [...document.querySelectorAll("svg[role=img], svg.orn")].map((s) => { const r = s.getBoundingClientRect(); return { label: (s.getAttribute("aria-label") ?? "ornament").slice(0, 40), x: Math.round(r.x), y: Math.round(r.y + scrollY), w: Math.round(r.width), h: Math.round(r.height), inside: r.x >= -1 && r.x + r.width <= vw + 1 }; });
      const wide = [...document.querySelectorAll("body *")].filter((e) => { const r = e.getBoundingClientRect(); return r.width > 0 && r.right > vw + 1 && !e.closest(".marquee") && !e.closest(".scroll-x") && getComputedStyle(e).position !== "fixed"; }).slice(0, 5).map((e) => e.className?.toString().slice(0, 40) || e.tagName);
      const h1 = document.querySelector("h1"); const hr = h1?.getBoundingClientRect();
      const scene = document.querySelector("[data-testid=hero-scene]")?.getBoundingClientRect();
      const overlap = hr && scene ? !(hr.bottom <= scene.top + 1 || hr.right <= scene.left + 1 || scene.right <= hr.left + 1) : null;
      const h1font = h1 ? getComputedStyle(h1).fontFamily.split(",")[0] : null; const bodyfont = getComputedStyle(document.body).fontFamily.split(",")[0];
      const imgsBroken = [...document.images].filter((i) => !i.complete || i.naturalWidth === 0).length;
      return { fonts, svgs, wide, overlap, h1font, bodyfont, imgsBroken, scrollW: document.documentElement.scrollWidth, vw, height: document.documentElement.scrollHeight };
    });
    report.push({ page: name, size: sn, ...a });
    await page.screenshot({ path: `${out}/${name}-${sn}.png`, fullPage: true });
  }
  await ctx.close();
}
await browser.close();
writeFileSync(`${out}/report.json`, JSON.stringify(report, null, 1));
for (const r of report) console.log(r.size.padEnd(8), r.page.padEnd(9), "h", String(r.height).padStart(5), "fonts", Object.values(r.fonts).every(Boolean) ? "ok" : JSON.stringify(r.fonts), "h1:", r.h1font, "body:", r.bodyfont, "overflow:", r.scrollW - r.vw, "wide:", r.wide.length, "svgInside:", r.svgs.every((s) => s.inside), "heroOverlap:", r.overlap, "brokenImgs:", r.imgsBroken);
