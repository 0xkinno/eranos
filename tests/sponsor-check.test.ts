import { describe, it, expect } from "vitest";
import { Transaction } from "@mysten/sui/transactions";
import { checkSponsorable } from "@/lib/x402/sponsor-check";

const KEEPER = "0x" + "aa".repeat(32), MEMBER = "0x" + "bb".repeat(32), PKG = "0x" + "cc".repeat(32);
const ref = (b: string) => ({ objectId: "0x" + b.repeat(32), version: "5", digest: "11111111111111111111111111111111" });
const policy = { keeper: KEEPER, target: `${PKG}::circle::contribute_for`, maxBudget: 20_000_000n };

async function build(f: (tx: Transaction) => void, over: { owner?: string; budget?: number; sender?: string } = {}) {
  const tx = new Transaction();
  tx.setSender(over.sender ?? MEMBER); tx.setGasOwner(over.owner ?? KEEPER);
  tx.setGasPayment([ref("dd")]); tx.setGasBudget(over.budget ?? 10_000_000); tx.setGasPrice(1000);
  f(tx);
  return tx.build();
}
const contribute = (tx: Transaction, fn = "contribute_for") => {
  const [coin] = tx.splitCoins(tx.objectRef(ref("ee")), [100000]);
  tx.moveCall({ target: `${PKG}::circle::${fn}`, typeArguments: ["0x2::sui::SUI"], arguments: [tx.objectRef(ref("11")), tx.pure.u64(0), tx.pure.address(MEMBER), coin] });
};

describe("sponsor check", () => {
  it("accepts a plain contribution", async () => { expect(checkSponsorable(await build(contribute), policy)).toEqual({ ok: true, sender: MEMBER }); });
  it("allows the sender's own coin redeem and change return, nothing else from 0x2", async () => {
    const ok = await build((tx) => { tx.moveCall({ target: "0x2::coin::redeem_funds", typeArguments: ["0x2::sui::SUI"], arguments: [tx.pure.u64(1)] }); contribute(tx); });
    expect(checkSponsorable(ok, policy)).toMatchObject({ ok: true });
    const bad = await build((tx) => { tx.moveCall({ target: "0x2::coin::burn", typeArguments: ["0x2::sui::SUI"], arguments: [tx.pure.u64(1)] }); contribute(tx); });
    expect(checkSponsorable(bad, policy)).toMatchObject({ ok: false });
  });
  it("refuses a different function", async () => { expect(checkSponsorable(await build((t) => contribute(t, "payout")), policy)).toMatchObject({ ok: false }); });
  it("refuses when the keeper is not the gas owner or is the sender", async () => {
    expect(checkSponsorable(await build(contribute, { owner: MEMBER }), policy)).toMatchObject({ ok: false, why: /gas owner/ });
    expect(checkSponsorable(await build(contribute, { sender: KEEPER }), policy)).toMatchObject({ ok: false, why: /sender/ });
  });
  it("refuses a budget above the cap", async () => { expect(checkSponsorable(await build(contribute, { budget: 50_000_000 }), policy)).toMatchObject({ ok: false, why: /cap/ }); });
  it("refuses using the gas coin as the payment coin", async () => {
    const b = await build((tx) => { const [c] = tx.splitCoins(tx.gas, [100000]); tx.moveCall({ target: `${PKG}::circle::contribute_for`, typeArguments: ["0x2::sui::SUI"], arguments: [tx.objectRef(ref("11")), tx.pure.u64(0), tx.pure.address(MEMBER), c] }); });
    expect(checkSponsorable(b, policy)).toMatchObject({ ok: false, why: /gas coin/ });
  });
  it("refuses a transfer of the gas coin and any extra command kind", async () => {
    const b = await build((tx) => { contribute(tx); tx.transferObjects([tx.gas], tx.pure.address(MEMBER)); });
    expect(checkSponsorable(b, policy)).toMatchObject({ ok: false });
  });
  it("refuses two calls and junk bytes", async () => {
    expect(checkSponsorable(await build((t) => { contribute(t); contribute(t); }), policy)).toMatchObject({ ok: false, why: /exactly one/ });
    expect(checkSponsorable(new Uint8Array([1, 2, 3]), policy)).toMatchObject({ ok: false });
  });
});
