// A Wallet Standard test wallet injected into the page. The private key never enters the page: signing is exposed from Node.
import type { Page } from "@playwright/test";
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";
import { Transaction } from "@mysten/sui/transactions";
import { SuiGraphQLClient } from "@mysten/sui/graphql";

export async function installTestWallet(page: Page, kp: Ed25519Keypair, base: string) {
  const client = new SuiGraphQLClient({ url: `${base}/api/sui`, network: "mainnet" });
  await page.exposeFunction("__signPersonal", async (b64: string) => (await kp.signPersonalMessage(Uint8Array.from(Buffer.from(b64, "base64")))).signature);
  await page.exposeFunction("__signTx", async (json: string) => {
    const tx = Transaction.from(json);
    const bytes = await tx.build({ client });
    return { bytes: Buffer.from(bytes).toString("base64"), signature: (await kp.signTransaction(bytes)).signature };
  });
  const address = kp.toSuiAddress(), pub = Array.from(kp.getPublicKey().toSuiBytes().slice(1));
  await page.addInitScript(({ address, pub }) => {
    const account = { address, publicKey: new Uint8Array(pub), chains: ["sui:mainnet"], features: ["sui:signTransaction", "sui:signPersonalMessage"], label: "Eranos test wallet" };
    const b64 = (u: Uint8Array) => btoa(String.fromCharCode(...u));
    const listeners: Record<string, ((p: unknown) => void)[]> = {};
    const wallet = {
      version: "1.0.0", name: "Eranos Test Wallet", icon: "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCI+PGNpcmNsZSBjeD0iMTIiIGN5PSIxMiIgcj0iMTAiIGZpbGw9IiM1QjNERjUiLz48L3N2Zz4=",
      chains: ["sui:mainnet"], accounts: [] as unknown[],
      features: {
        "standard:connect": { version: "1.0.0", connect: async () => { wallet.accounts = [account]; return { accounts: [account] }; } },
        "standard:disconnect": { version: "1.0.0", disconnect: async () => { wallet.accounts = []; } },
        "standard:events": { version: "1.0.0", on: (e: string, f: (p: unknown) => void) => { (listeners[e] ??= []).push(f); return () => {}; } },
        "sui:signPersonalMessage": { version: "1.1.0", signPersonalMessage: async (i: { message: Uint8Array }) => { const signature = await (window as never as { __signPersonal: (s: string) => Promise<string> }).__signPersonal(b64(i.message)); return { bytes: b64(i.message), signature }; } },
        "sui:signTransaction": { version: "2.0.0", signTransaction: async (i: { transaction: { toJSON(): Promise<string> } }) => { const json = await i.transaction.toJSON(); return await (window as never as { __signTx: (j: string) => Promise<{ bytes: string; signature: string }> }).__signTx(json); } },
      },
    };
    const register = (api: { register: (w: unknown) => void }) => api.register(wallet);
    window.dispatchEvent(new CustomEvent("wallet-standard:register-wallet", { detail: register }));
    window.addEventListener("wallet-standard:app-ready", (e) => register((e as CustomEvent).detail));
  }, { address, pub });
  return address;
}
