import { describe, it, expect } from "vitest";
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";
import { rejectMessage, verifyReject, confirmMessage, promoteHeard, PolicyError, decisionMemories } from "@/lib/memory/policy";
import type { StoredMemory } from "@/lib/memory/format";

const lucia = Ed25519Keypair.fromSecretKey(new Uint8Array(32).fill(1));
const mallory = Ed25519Keypair.fromSecretKey(new Uint8Array(32).fill(2));
const heard: StoredMemory = { id: "h1", type: "heard", date: "2026-11-10", attrs: { about: lucia.toSuiAddress(), from: "chat", payday: "5" }, text: "Lucia can only pay after the 5th" };

describe("heard to known policy", () => {
  it("promotes with the subject's signature", async () => {
    const { signature } = await lucia.signPersonalMessage(confirmMessage("0xc", "h1", heard.text));
    const k = await promoteHeard({ circleId: "0xc", heard, signatureB64: signature, today: "2026-11-11" });
    expect(k.type).toBe("fact");
    expect(k.attrs.confirmed).toMatch(/^sig#[0-9a-f]{8}$/);
    expect(k.attrs.payday).toBe("5");
  });
  it("refuses another member's signature", async () => {
    const { signature } = await mallory.signPersonalMessage(confirmMessage("0xc", "h1", heard.text));
    await expect(promoteHeard({ circleId: "0xc", heard, signatureB64: signature, today: "2026-11-11" })).rejects.toThrow(PolicyError);
  });
  it("refuses a signature over different text or circle", async () => {
    const { signature } = await lucia.signPersonalMessage(confirmMessage("0xc", "h1", "something else"));
    await expect(promoteHeard({ circleId: "0xc", heard, signatureB64: signature, today: "2026-11-11" })).rejects.toThrow();
    const s2 = await lucia.signPersonalMessage(confirmMessage("0xother", "h1", heard.text));
    await expect(promoteHeard({ circleId: "0xc", heard, signatureB64: s2.signature, today: "2026-11-11" })).rejects.toThrow();
  });
  it("edited text drops structured attrs unless re-parsed, and must be signed as edited", async () => {
    const { signature } = await lucia.signPersonalMessage(confirmMessage("0xc", "h1", "Lucia pays after the 6th"));
    const k = await promoteHeard({ circleId: "0xc", heard, signatureB64: signature, today: "2026-11-11", editedText: "Lucia pays after the 6th" });
    expect(k.attrs.payday).toBeUndefined();
  });
  it("reject needs the subject's own signature", async () => {
    const good = (await lucia.signPersonalMessage(rejectMessage("0xc", "h1"))).signature;
    const bad = (await mallory.signPersonalMessage(rejectMessage("0xc", "h1"))).signature;
    expect(await verifyReject({ circleId: "0xc", heard, signatureB64: good })).toBe(true);
    expect(await verifyReject({ circleId: "0xc", heard, signatureB64: bad })).toBe(false);
  });
  it("decisions never read heard or unconfirmed facts", () => {
    const items: StoredMemory[] = [heard, { ...heard, id: "f", type: "fact" }, { ...heard, id: "g", type: "fact", attrs: { ...heard.attrs, confirmed: "sig#1" } }];
    expect(decisionMemories(items).map((i) => i.id)).toEqual(["g"]);
  });
});
