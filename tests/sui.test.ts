import { describe, it, expect } from "vitest";
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";
import type { Transaction } from "@mysten/sui/transactions";
import { stewardsKey, stewardAddress, verifyPartial, combine, txDigest } from "@/lib/sui/multisig";
import { buildJoinTx, buildLeaveTx, buildStartCycleTx, buildContributeForTx, buildCreateMemoryAccountTx, buildPayoutTx } from "@/lib/sui/ptb";
import { reserveGas, MemoryCapStore, SponsorCapError } from "@/lib/sui/sponsor";
import { MEMWAL_PKG } from "@/lib/config";
import { normalizeSuiAddress } from "@mysten/sui/utils";

const ks = [1, 2, 3].map((i) => Ed25519Keypair.fromSecretKey(new Uint8Array(32).fill(40 + i)));
const pubs = ks.map((k) => k.getPublicKey().toBase64());
const addr = stewardAddress(pubs);
const PKG = "0x" + "ab".repeat(32);
const OBJ = "0x" + "cd".repeat(32);

describe("steward multisig", () => {
  it("address is stable and order-sensitive", () => {
    expect(stewardAddress(pubs)).toBe(addr);
    expect(stewardAddress([...pubs].reverse())).not.toBe(addr);
    expect(() => stewardsKey(pubs.slice(0, 2))).toThrow();
  });
  it("verifies partials, rejects outsiders, enforces threshold and distinctness", async () => {
    const bytes = new TextEncoder().encode("not a real tx but signable"); // signTransaction signs any bytes with the TransactionData intent
    const s = await Promise.all(ks.map(async (k) => (await k.signTransaction(bytes)).signature));
    const outsider = Ed25519Keypair.fromSecretKey(new Uint8Array(32).fill(99));
    const bad = (await outsider.signTransaction(bytes)).signature;
    expect((await verifyPartial(bytes, s[1], pubs)).stewardIndex).toBe(1);
    await expect(verifyPartial(bytes, bad, pubs)).rejects.toThrow(/steward/);
    await expect(combine(bytes, { 0: s[0] }, pubs)).rejects.toThrow(/need 2/);
    await expect(combine(bytes, { 0: s[0], 1: s[0] }, pubs)).rejects.toThrow(/need 2/);
    const combined = await combine(bytes, { 0: s[0], 2: s[2] }, pubs);
    expect(typeof combined).toBe("string");
    expect(combined.length).toBeGreaterThan(100);
  });
  it("digest is deterministic base58", () => {
    const d = txDigest(new Uint8Array([1, 2, 3]));
    expect(d).toBe(txDigest(new Uint8Array([1, 2, 3])));
    expect(d).toMatch(/^[1-9A-HJ-NP-Za-km-z]{43,44}$/);
  });
});

const calls = (tx: Transaction) => tx.getData().commands.filter((c) => c.$kind === "MoveCall").map((c) => (c as { MoveCall: { package: string; module: string; function: string } }).MoveCall);

describe("ptb builders", () => {
  const base = { eranosPkg: PKG, stewards: addr, circleId: OBJ, memoryAccountId: OBJ, member: "0x" + "11".repeat(32), memberKey: new Uint8Array(32).fill(5) };
  it("join is one PTB with add_delegate_key then admit", () => {
    const c = calls(buildJoinTx({ ...base, label: "member-1" }));
    expect(c.map((x) => `${x.module}::${x.function}`)).toEqual(["account::add_delegate_key", "circle::admit"]);
    expect(c[0].package).toBe(normalizeSuiAddress(MEMWAL_PKG));
    expect(c[1].package).toBe(normalizeSuiAddress(PKG));
  });
  it("leave is one PTB with remove_delegate_key then remove", () => {
    expect(calls(buildLeaveTx(base)).map((x) => `${x.module}::${x.function}`)).toEqual(["account::remove_delegate_key", "circle::remove"]);
  });
  it("start cycle, contribute_for, payout target the circle module", () => {
    expect(calls(buildStartCycleTx({ eranosPkg: PKG, stewards: addr, circleId: OBJ, order: [base.member] }))[0].function).toBe("start_cycle");
    expect(calls(buildContributeForTx({ eranosPkg: PKG, sender: base.member, circleId: OBJ, round: 1, member: base.member, amount: 500000n })).pop()!.function).toBe("contribute_for");
    expect(calls(buildPayoutTx({ eranosPkg: PKG, sender: base.member, circleId: OBJ, round: 1 }))[0].function).toBe("payout");
  });
});

describe("sponsor cap", () => {
  it("allows up to the cap per member per round, then refuses", async () => {
    const store = new MemoryCapStore();
    const p = { circle: "c", cycle: 1, round: 1, member: "m", budgetMist: 10_000_000, capMist: 20_000_000 };
    await reserveGas(store, p); await reserveGas(store, p);
    await expect(reserveGas(store, p)).rejects.toThrow(SponsorCapError);
    await reserveGas(store, { ...p, member: "other" });
    await reserveGas(store, { ...p, round: 2 });
  });
});
