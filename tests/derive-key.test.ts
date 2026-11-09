import { describe, it, expect } from "vitest";
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";
import { deriveMemberKey, derivationMessage, keyFromSignature } from "@/lib/memory/derive-key";

const kp = Ed25519Keypair.fromSecretKey(new Uint8Array(32).fill(7));
const sign = async (m: Uint8Array) => ({ signature: (await kp.signPersonalMessage(m)).signature });

describe("derive member key", () => {
  it("is deterministic for the same wallet and circle", async () => {
    const a = await deriveMemberKey(sign, "0xcircle1");
    const b = await deriveMemberKey(sign, "0xcircle1");
    expect(a.privateKeyHex).toBe(b.privateKeyHex);
    expect(a.privateKeyHex).toHaveLength(64);
  });
  it("differs per circle and per wallet", async () => {
    const a = await deriveMemberKey(sign, "0xcircle1");
    const b = await deriveMemberKey(sign, "0xcircle2");
    const kp2 = Ed25519Keypair.fromSecretKey(new Uint8Array(32).fill(9));
    const c = await deriveMemberKey(async (m) => ({ signature: (await kp2.signPersonalMessage(m)).signature }), "0xcircle1");
    expect(a.privateKeyHex).not.toBe(b.privateKeyHex);
    expect(a.privateKeyHex).not.toBe(c.privateKeyHex);
  });
  it("message is stable and says it moves no money", () => {
    expect(new TextDecoder().decode(derivationMessage("0xc"))).toContain("moves no money");
  });
  it("rejects non-ed25519 signatures", () => {
    const bad = btoa(String.fromCharCode(1, ...new Array(96).fill(1)));
    expect(() => keyFromSignature(bad, "0xc")).toThrow(/Ed25519/);
  });
});
