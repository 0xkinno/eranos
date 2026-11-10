import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "tests/e2e", timeout: 180_000, retries: 0, workers: 1, reporter: [["list"]],
  use: { baseURL: process.env.E2E_BASE ?? "https://eranos.vercel.app", headless: true, launchOptions: { executablePath: process.env.PW_CHROMIUM ?? "/opt/pw-browsers/chromium", args: ["--no-sandbox"] } },
});
