import { test, expect } from "@playwright/test";
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";
import { installTestWallet } from "./test-wallet";

const CIRCLE = process.env.DEMO_CIRCLE_ID ?? "0xd50b0e10438c1fe18bc1f9896788080fc7662de94954da7ddfa1209ae13c4475";
const memberKey = process.env.E2E_MEMBER_KEY;
test.skip(!memberKey, "E2E_MEMBER_KEY not set");

test("connect, derive memory key, disconnect with the power icon", async ({ page, baseURL }) => {
  const kp = Ed25519Keypair.fromSecretKey(memberKey!);
  const address = await installTestWallet(page, kp, baseURL!);
  await page.goto(`/c/${CIRCLE}/join`, { waitUntil: "networkidle" });
  await page.getByTestId("connect").click();
  await page.getByTestId("wallet-Eranos Test Wallet").click();
  await expect(page.getByTestId("account-address")).toContainText(address.slice(0, 6));
  await expect(page.getByTestId("account-usdc")).toBeVisible({ timeout: 20_000 });
  await page.getByTestId("make-key").click();
  await expect(page.getByText(/public key [0-9a-f]{20}/)).toBeVisible();
  await page.getByTestId("disconnect").click();
  await expect(page.getByTestId("connect")).toBeVisible();
});

test("member pays their round through the UI (sponsored gas, x402, verified)", async ({ page, baseURL }) => {
  const kp = Ed25519Keypair.fromSecretKey(memberKey!);
  await installTestWallet(page, kp, baseURL!);
  await page.goto(`/c/${CIRCLE}`, { waitUntil: "networkidle" });
  await page.getByTestId("connect").click();
  await page.getByTestId("wallet-Eranos Test Wallet").click();
  const pay = page.getByTestId("pay");
  await expect(pay.or(page.getByTestId("paid-ok"))).toBeVisible({ timeout: 30_000 });
  if (await pay.isVisible()) {
    await pay.click();
    await expect(page.getByTestId("pay-digest")).toBeVisible({ timeout: 90_000 });
    console.log("UI payment:", await page.getByTestId("pay-digest").innerText());
  }
  await expect(page.getByTestId("paid-ok")).toBeVisible({ timeout: 60_000 });
});

test("a wallet that is not a member is told so", async ({ page, baseURL }) => {
  const kp = Ed25519Keypair.generate();
  await installTestWallet(page, kp, baseURL!);
  await page.goto(`/c/${CIRCLE}`, { waitUntil: "networkidle" });
  await page.getByTestId("connect").click();
  await page.getByTestId("wallet-Eranos Test Wallet").click();
  await expect(page.getByTestId("not-member")).toBeVisible();
});
